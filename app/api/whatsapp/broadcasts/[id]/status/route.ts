export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, updateDoc, where, type DocumentReference } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getGetGabsMessageStatus, isGetGabsConfigured } from '@/lib/getgabs'
import { classifyGetGabsError, getGabsErrorHint } from '@/lib/whatsappDiagnostics'
import { DELIVERY_WINDOW_MS, STATUS_BATCH_SIZE, countDelta, type BroadcastCounts, type RecipientStatus } from '@/lib/whatsapp/broadcasts'
import { bumpCounts, jsonError, loadBroadcast, nextCheckFor, recipientsCol, staffOr, type RecipientDoc } from '../../_lib/server'

/**
 * POST /api/whatsapp/broadcasts/:id/status   (staff: admin, "whatsapp" or "leads")
 *
 * GetGabs has no delivery webhook for API sends, so the broadcast page calls this every ~30 s while open.
 * Takes up to STATUS_BATCH_SIZE recipients whose `nextCheckAt` is due and:
 *  - delivery: polls GetGabs `getmessgageinfobyid` (sent → delivered → read, or failed + reason), for 3 days;
 *  - replies: counts the person as replied when `whatsapp_chats/{phone}` shows an inbound message on the GetGabs
 *    number after their `sentAt` (watched for 7 days).
 * The matching `whatsapp_messages` record gets the same status so the inbox ticks update too.
 * → { checked, updated }
 */

const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 }

/** When the customer last wrote to the GetGabs number (ISO), from their chat doc */
function lastInboundOnGetGabs(chat: Record<string, any> | undefined): string | undefined {
  if (!chat) return undefined
  if (chat.lastInboundAtGetgabs) return String(chat.lastInboundAtGetgabs)
  const ch = chat.lastInboundChannel || chat.channel
  return ch === 'getgabs' && chat.lastInboundAt ? String(chat.lastInboundAt) : undefined
}

async function inChunks<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await staffOr(req)
  if (user instanceof Response) return user
  const b = await loadBroadcast(params.id)
  if (!b) return jsonError(404, 'Broadcast not found.')

  // One checker at a time (several people may have the page open) so a change is never counted twice
  const gotLease = await runTransaction(db, async (tx) => {
    const s = await tx.get(b.ref)
    if ((Number(s.data()?.statusLockUntil) || 0) > Date.now()) return false
    tx.update(b.ref, { statusLockUntil: Date.now() + 50_000 })
    return true
  })
  if (!gotLease) return NextResponse.json({ checked: 0, updated: 0, busy: true })
  try {
    return await check(b.ref, params.id)
  } finally {
    await updateDoc(b.ref, { statusLockUntil: 0 }).catch(() => {})
  }
}

async function check(ref: DocumentReference, id: string) {
  const nowIso = new Date().toISOString()
  const due = await getDocs(query(recipientsCol(id), where('nextCheckAt', '<=', nowIso), orderBy('nextCheckAt'), limit(STATUS_BATCH_SIZE)))
  if (due.empty) return NextResponse.json({ checked: 0, updated: 0 })

  // Chat docs for reply detection (one read per distinct number)
  const phones = Array.from(new Set(due.docs.map((d) => String((d.data() as RecipientDoc).phone || '')).filter(Boolean)))
  const chats = new Map<string, Record<string, any> | undefined>()
  await inChunks(phones, 10, async (p) => {
    const s = await getDoc(doc(db, 'whatsapp_chats', p)).catch(() => null)
    chats.set(p, s?.exists() ? (s.data() as Record<string, any>) : undefined)
  })

  const total: Partial<BroadcastCounts> = {}
  const addDelta = (d: Partial<BroadcastCounts>) => {
    for (const [k, v] of Object.entries(d)) total[k as keyof BroadcastCounts] = (total[k as keyof BroadcastCounts] || 0) + (v || 0)
  }
  let updated = 0
  const canPoll = isGetGabsConfigured()

  await inChunks(due.docs, 5, async (d) => {
    const r = d.data() as RecipientDoc
    const patch: Record<string, any> = {}
    let status = r.status as RecipientStatus
    const sentMs = Date.parse(r.sentAt || '') || 0
    const wamid = String(r.messageId || '')

    // ── Delivery
    if (canPoll && (status === 'sent' || status === 'delivered') && wamid.startsWith('wamid') && Date.now() - sentMs < DELIVERY_WINDOW_MS) {
      try {
        const s = await getGetGabsMessageStatus(wamid)
        if (s.status === 'failed') {
          const kind = classifyGetGabsError(s.errorMessage)
          Object.assign(patch, { status: 'failed', error: s.errorMessage || 'Not delivered', errorKind: kind, errorHint: getGabsErrorHint(kind) || null })
          addDelta(countDelta(status, 'failed'))
          status = 'failed'
        } else if ((RANK[s.status] || 0) > (RANK[status] || 0)) {
          addDelta(countDelta(status, s.status))
          if (s.status === 'delivered' || s.status === 'read') patch.deliveredAt = r.deliveredAt || nowIso
          if (s.status === 'read') patch.readAt = nowIso
          patch.status = s.status
          status = s.status
        }
        if (patch.status && r.messageDocId) {
          await updateDoc(doc(db, 'whatsapp_messages', r.messageDocId), {
            status: patch.status,
            statusCheckedAt: nowIso,
            statusSource: 'getgabs_poll',
            ...(patch.status === 'failed' ? { errorTitle: patch.error, errorKind: patch.errorKind, errorHint: patch.errorHint } : {}),
            updatedAt: serverTimestamp(),
          }).catch(() => {})
        }
      } catch (err: any) {
        console.error('[Broadcast status] poll failed:', d.id, err?.message)
      }
    }

    // ── Reply
    if (!r.repliedAt && sentMs) {
      const last = lastInboundOnGetGabs(chats.get(r.phone))
      if (last && Date.parse(last) > sentMs) {
        patch.repliedAt = last
        addDelta({ replied: 1 })
      }
    }

    const needsDelivery = (status === 'sent' || status === 'delivered') && wamid.startsWith('wamid')
    const needsReply = !(patch.repliedAt || r.repliedAt) && status !== 'failed'
    patch.nextCheckAt = nextCheckFor(r.sentAt, { needsDelivery, needsReply })
    if (patch.status || patch.repliedAt) updated++
    await updateDoc(d.ref, patch)
  })

  if (Object.values(total).some(Boolean)) await bumpCounts(ref, total)
  return NextResponse.json({ checked: due.size, updated })
}
