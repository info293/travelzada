export const dynamic = 'force-dynamic'

import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { businessNumberFor, parseGetGabsWebhook, type GetGabsWebhookEvent } from '@/lib/getgabs'
import { markWhatsAppReply } from '@/lib/leadAutomation'

/**
 * GetGabs inbound webhook (GetGabs → Settings → Developer Tools → "Webhook URL for All Chats"):
 *   https://<site>/api/whatsapp/getgabs-webhook?secret=<GETGABS_WEBHOOK_SECRET>
 *
 * GetGabs posts one flat JSON per message and does not sign it, so the URL carries a secret.
 * Inbound messages → `whatsapp_messages` (channel "getgabs") + `whatsapp_chats/{phone}`, linked to the Meta CRM lead.
 * Outbound/status events update the status of a message we already have; anything else is ignored.
 * Always answers 200 quickly once authenticated (GetGabs treats non-200 as failure).
 */

function secretOk(req: NextRequest) {
  const expected = process.env.GETGABS_WEBHOOK_SECRET || ''
  const given = req.nextUrl.searchParams.get('secret') || req.headers.get('x-webhook-secret') || ''
  if (!expected || !given) return false
  // Hash both so the comparison is constant-time regardless of length
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

export async function GET(req: NextRequest) {
  if (!secretOk(req)) return unauthorized()
  return NextResponse.json({ ok: true })
}

/** Firestore-safe doc id for an inbound WhatsApp message id (makes re-deliveries idempotent) */
const inboundDocId = (wamid: string) => `gg_${wamid.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 300)}`

const DELIVERY = ['sent', 'delivered', 'read', 'failed'] as const
const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 }

async function readBody(req: NextRequest): Promise<any> {
  const raw = await req.text()
  try {
    return JSON.parse(raw)
  } catch {
    // Some BSPs post form-encoded bodies
    const params = new URLSearchParams(raw)
    const obj: Record<string, string> = {}
    params.forEach((v, k) => (obj[k] = v))
    return Object.keys(obj).length ? obj : null
  }
}

async function handleInbound(ev: GetGabsWebhookEvent) {
  const msgRef = doc(db, 'whatsapp_messages', inboundDocId(ev.messageId))
  if ((await getDoc(msgRef)).exists()) return 'duplicate'

  const businessNumber = businessNumberFor('getgabs')
  await setDoc(msgRef, {
    whatsappMessageId: ev.messageId,
    senderPhone: ev.from,
    senderName: ev.profileName || ev.from,
    direction: 'inbound',
    type: ev.type,
    ...(ev.subType ? { subType: ev.subType } : {}),
    text: ev.text,
    mediaUrl: ev.mediaUrl,
    status: 'received',
    timestamp: ev.timestamp,
    channel: 'getgabs',
    businessNumber,
    ...(ev.replyToId ? { replyToId: ev.replyToId } : {}),
    ...(ev.replyToText ? { replyToText: ev.replyToText } : {}),
    ...(ev.buttonPayload ? { buttonPayload: ev.buttonPayload } : {}),
    ...(ev.agentId ? { getGabsAgentId: ev.agentId } : {}),
    ...(ev.referralSourceType ? { referralSourceType: ev.referralSourceType } : {}),
    ...(ev.referralSourceDomain ? { referralSourceDomain: ev.referralSourceDomain } : {}),
    createdAt: serverTimestamp(),
  })

  const chatRef = doc(db, 'whatsapp_chats', ev.from)
  const chat = await getDoc(chatRef)
  const existingName = String(chat.exists() ? chat.data()?.customerName || '' : '')
  const nameMissing = !existingName || (!/[a-z]/i.test(existingName) && existingName.replace(/\D/g, '').length >= 7)
  await setDoc(
    chatRef,
    {
      phone: ev.from,
      ...(ev.profileName && nameMissing ? { customerName: ev.profileName } : {}),
      lastMessage: ev.text,
      lastMessageTimestamp: ev.timestamp,
      lastDirection: 'inbound',
      lastInboundAt: ev.timestamp,
      lastInboundAtGetgabs: ev.timestamp,
      channel: 'getgabs',
      businessNumber,
      ...(ev.agentId ? { assignedGetGabsAgent: ev.agentId } : {}),
      unreadCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  // Same as the Meta webhook: link the reply to the CRM lead with this phone number
  await markWhatsAppReply(ev.from, ev.text, ev.timestamp).catch((e) => console.error('[CRM] Could not link GetGabs reply:', e))
  // NOTE: Meta-template button automation (handleWhatsAppButton) is intentionally NOT run here: it replies through
  // the Meta Cloud API number, not GetGabs.
  return 'stored'
}

/** Outbound / status events: only update a message we already know; ignore the rest */
async function handleOutbound(ev: GetGabsWebhookEvent) {
  const status = DELIVERY.find((s) => ev.status === s || (s === 'delivered' && ev.status === 'deliver'))
  if (!status) return 'ignored'
  const snap = await getDocs(query(collection(db, 'whatsapp_messages'), where('whatsappMessageId', '==', ev.messageId), limit(3)))
  if (snap.empty) return 'ignored'
  await Promise.all(
    snap.docs.map((d) => {
      const cur = String(d.data().status || '')
      if (cur === 'failed' || (status !== 'failed' && (RANK[cur] || 0) >= (RANK[status] || 0))) return null
      return updateDoc(d.ref, { status, statusSource: 'getgabs_webhook', updatedAt: serverTimestamp() })
    })
  )
  return 'status'
}

export async function POST(req: NextRequest) {
  if (!secretOk(req)) return unauthorized()

  let results: string[] = []
  try {
    const body = await readBody(req)
    const items: any[] = Array.isArray(body) ? body.slice(0, 50) : Array.isArray(body?.data) ? body.data.slice(0, 50) : [body]
    for (const item of items) {
      const ev = parseGetGabsWebhook(item)
      if (!ev) {
        results.push('ignored')
        continue
      }
      results.push(ev.direction === 'inbound' ? await handleInbound(ev) : await handleOutbound(ev))
    }
  } catch (err: any) {
    // Still 200: a retry would hit the same error; the message id dedupe makes real retries harmless anyway
    console.error('[GetGabs Webhook] failed:', err)
    results = [...results, 'error']
  }
  return NextResponse.json({ ok: true, results })
}
