export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { requireLeadsAccess } from '@/lib/metaServer'
import { getGetGabsMessageStatus, inboxProvider, isGetGabsConfigured, GetGabsApiError } from '@/lib/getgabs'
import { classifyGetGabsError, getGabsErrorHint } from '@/lib/whatsappDiagnostics'

/**
 * GET  /api/whatsapp/status  (staff only) → { provider }  — which connection the inbox sends from.
 * POST /api/whatsapp/status  (staff only) { ids: ["<whatsapp_messages doc id>", …] } (max 20, all from ONE chat)
 *   GetGabs has no delivery-status webhook for API sends, so the inbox polls this for its recent outbound
 *   messages. Each id is checked with GetGabs `getmessgageinfobyid` and the Firestore message updated
 *   (sent → delivered → read, or failed + reason). → { results: [{ id, status }] }
 */

const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 }
const MIN_RECHECK_MS = 15_000
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const authError = await requireLeadsAccess(req)
  if (authError) return authError
  return NextResponse.json({ provider: inboxProvider(), getgabsConfigured: isGetGabsConfigured() })
}

export async function POST(req: NextRequest) {
  const authError = await requireLeadsAccess(req)
  if (authError) return authError
  if (!isGetGabsConfigured()) return NextResponse.json({ results: [] })

  let ids: string[] = []
  try {
    const body = await req.json()
    ids = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string' && /^[A-Za-z0-9_-]{6,320}$/.test(x)) : []
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  ids = Array.from(new Set(ids))
  if (!ids.length) return NextResponse.json({ results: [] })
  if (ids.length > 20) return NextResponse.json({ error: 'At most 20 message ids per request.' }, { status: 400 })

  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, 'whatsapp_messages', id))))
  const found = snaps.filter((s) => s.exists())
  // All ids must belong to the same conversation (the chat open in the inbox)
  const chats = new Set(found.map((s) => String(s.data()?.senderPhone || '')))
  if (chats.size > 1) return NextResponse.json({ error: 'Message ids must all belong to one chat.' }, { status: 400 })

  const now = Date.now()
  const results = await Promise.all(
    found.map(async (s) => {
      const m = s.data() as Record<string, any>
      const wamid = String(m.whatsappMessageId || '')
      const checkedAt = m.statusCheckedAt ? Date.parse(m.statusCheckedAt) : 0
      const eligible =
        m.direction === 'outbound' &&
        m.channel === 'getgabs' &&
        wamid.startsWith('wamid') &&
        m.status !== 'failed' &&
        m.status !== 'read' &&
        now - (Date.parse(m.timestamp) || 0) < MAX_AGE_MS &&
        now - checkedAt > MIN_RECHECK_MS
      if (!eligible) return { id: s.id, status: m.status, skipped: true }
      try {
        const r = await getGetGabsMessageStatus(wamid)
        const upgrade = r.status === 'failed' || (RANK[r.status] || 0) > (RANK[m.status] || 0)
        if (upgrade) {
          const kind = r.status === 'failed' ? classifyGetGabsError(r.errorMessage) : undefined
          await updateDoc(s.ref, {
            status: r.status,
            statusCheckedAt: new Date().toISOString(),
            statusSource: 'getgabs_poll',
            ...(r.status === 'failed'
              ? {
                  errorCode: null,
                  errorTitle: r.errorMessage || 'Not delivered',
                  errorDetails: null,
                  errorKind: kind,
                  errorHint: getGabsErrorHint(kind) || null,
                }
              : {}),
            updatedAt: serverTimestamp(),
          })
        } else {
          await updateDoc(s.ref, { statusCheckedAt: new Date().toISOString() })
        }
        return { id: s.id, status: upgrade ? r.status : m.status }
      } catch (err: any) {
        console.error('[WhatsApp Status] poll failed:', s.id, err?.message)
        return { id: s.id, status: m.status, error: err instanceof GetGabsApiError ? err.kind : 'error' }
      }
    })
  )
  return NextResponse.json({ results })
}
