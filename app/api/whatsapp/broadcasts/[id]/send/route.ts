export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getCountFromServer, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { businessNumberFor, getGabsMessageId, isGetGabsConfigured, sendGetGabsTemplate, GetGabsApiError } from '@/lib/getgabs'
import { classifyGetGabsError, getGabsErrorHint } from '@/lib/whatsappDiagnostics'
import {
  RATE_LIMIT_BACKOFF_MS,
  SEND_BATCH_SIZE,
  SEND_CALL_BUDGET_MS,
  SEND_GAP_MS,
  countDelta,
  countRecipients,
  fillComponents,
  fillTokens,
  mappingFallbacks,
  type BroadcastStatus,
} from '@/lib/whatsapp/broadcasts'
import {
  bumpCounts,
  isOptedOut,
  jsonError,
  loadBroadcast,
  nextCheckFor,
  recordFailedMessage,
  recordSentMessage,
  recipientsCol,
  staffOr,
  type BroadcastDoc,
  type RecipientDoc,
} from '../../_lib/server'

/**
 * POST /api/whatsapp/broadcasts/:id/send   (staff: admin, "whatsapp" or "leads")   { runId }
 *
 * Sends the next batch (≤ SEND_BATCH_SIZE people, ~1 message / second, ≤ ~40 s) of a broadcast whose status is
 * "sending". The admin page calls this again and again while it is open — there is no background worker.
 *
 * Never double-sends:
 *  - each recipient is claimed in a transaction (pending → sending) before the API call; anyone already claimed
 *    or with a message id is skipped;
 *  - a recipient left in "sending" (tab closed / crash mid-call) is marked failed + `interrupted` and is never
 *    retried automatically, because we can't tell whether WhatsApp got it;
 *  - one runner at a time per broadcast (a short lease: `lockBy` / `lockUntil`).
 *
 * → { status, processed, sent, failed, skipped, remaining, done, backoffMs?, error?, hint? }
 */

const LEASE_MS = 75_000
const STALE_SENDING_MS = 3 * 60_000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await staffOr(req)
  if (user instanceof Response) return user
  if (!isGetGabsConfigured()) return jsonError(503, 'WhatsApp (GetGabs) is not configured on this deployment.')

  let runId = ''
  try {
    runId = String((await req.json())?.runId || '').slice(0, 64)
  } catch {
    /* empty body */
  }
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(runId)) return jsonError(400, 'Missing runId.')

  const b = await loadBroadcast(params.id)
  if (!b) return jsonError(404, 'Broadcast not found.')
  const { ref } = b
  const id = params.id

  // ── One runner at a time
  const lock = await runTransaction(db, async (tx) => {
    const s = await tx.get(ref)
    const d = s.data() as BroadcastDoc | undefined
    if (!d) return { ok: false as const, reason: 'missing' }
    if (d.status !== 'sending') return { ok: false as const, reason: 'status', status: d.status }
    if (d.lockBy && d.lockBy !== runId && (d.lockUntil || 0) > Date.now()) return { ok: false as const, reason: 'locked' }
    tx.update(ref, { lockBy: runId, lockUntil: Date.now() + LEASE_MS })
    return { ok: true as const, data: d }
  })
  if (!lock.ok) {
    if (lock.reason === 'locked') return jsonError(409, 'This broadcast is being sent from another tab or by someone else.', { code: 'locked' })
    if (lock.reason === 'status') return NextResponse.json({ status: lock.status, processed: 0, done: lock.status === 'done', stopped: true })
    return jsonError(404, 'Broadcast not found.')
  }
  const data = lock.data
  const release = () => updateDoc(ref, { lockUntil: 0 }).catch(() => {})

  const started = Date.now()
  const businessNumber = businessNumberFor('getgabs')
  const fallbacks = mappingFallbacks(data.variables || {})
  const result = { processed: 0, sent: 0, failed: 0, skipped: 0 }
  let backoffMs: number | undefined
  let stopError: { error: string; hint?: string } | undefined
  let status: BroadcastStatus = 'sending'

  try {
    // ── Recipients stuck in "sending" (an earlier call died mid-send): don't resend, mark interrupted
    const stuck = await getDocs(query(recipientsCol(id), where('status', '==', 'sending'), limit(50)))
    for (const d of stuck.docs) {
      const r = d.data() as RecipientDoc
      if (Date.now() - (Date.parse(r.claimedAt || '') || 0) < STALE_SENDING_MS) continue
      await updateDoc(d.ref, {
        status: 'failed',
        interrupted: true,
        error: 'Sending was interrupted — we could not confirm whether this message went out. Check the inbox before re-sending.',
        errorKind: 'interrupted',
      })
      await bumpCounts(ref, countDelta('sending', 'failed'))
    }

    const pending = await getDocs(query(recipientsCol(id), where('status', '==', 'pending'), limit(SEND_BATCH_SIZE)))
    let consecutiveTemplateErrors = 0
    let lastSendAt = 0

    for (let i = 0; i < pending.docs.length; i++) {
      if (Date.now() - started > SEND_CALL_BUDGET_MS) break
      // Honour Pause / Cancel quickly
      if (i > 0 && i % 5 === 0) {
        const cur = (await getDoc(ref)).data() as BroadcastDoc | undefined
        if (!cur || cur.status !== 'sending') {
          status = (cur?.status as BroadcastStatus) || 'cancelled'
          break
        }
        await updateDoc(ref, { lockUntil: Date.now() + LEASE_MS }).catch(() => {})
      }

      const rRef = pending.docs[i].ref
      // ── Claim (pending → sending) atomically; skip anything already claimed or sent
      const claimed = await runTransaction(db, async (tx) => {
        const s = await tx.get(rRef)
        const r = s.data() as RecipientDoc | undefined
        if (!r || r.status !== 'pending' || r.messageId) return null
        tx.update(rRef, { status: 'sending', claimedAt: new Date().toISOString() })
        return r
      })
      if (!claimed) continue
      result.processed++

      // ── Opted out since the list was made
      if (await isOptedOut(claimed.phone)) {
        await updateDoc(rRef, { status: 'skipped', skipReason: 'Replied STOP (opted out)' })
        await bumpCounts(ref, countDelta('pending', 'skipped'))
        result.skipped++
        continue
      }

      const components = fillComponents(data.componentsTemplate || [], claimed, fallbacks)
      const text = fillTokens(data.previewTemplate || `[Template: ${data.templateName}]`, claimed, fallbacks).slice(0, 4096)

      // ~1 message per second
      const wait = SEND_GAP_MS - (Date.now() - lastSendAt)
      if (wait > 0) await sleep(wait)
      lastSendAt = Date.now()

      try {
        const res = await sendGetGabsTemplate(claimed.phone, data.templateName, components, data.language || 'en')
        const messageId = getGabsMessageId(res) || `outbound_${Date.now()}`
        const sentAt = new Date().toISOString()
        // Recipient first: once a messageId is stored the person can never be sent to again
        await updateDoc(rRef, {
          status: 'sent',
          messageId,
          sentAt,
          error: null,
          errorKind: null,
          errorHint: null,
          nextCheckAt: nextCheckFor(sentAt, { needsDelivery: messageId.startsWith('wamid'), needsReply: true }),
        })
        await bumpCounts(ref, countDelta('pending', 'sent'))
        result.sent++
        consecutiveTemplateErrors = 0
        try {
          const messageDocId = await recordSentMessage({
            phone: claimed.phone,
            name: claimed.name,
            refPath: claimed.refPath,
            whatsappMessageId: messageId,
            text,
            templateName: data.templateName,
            languageCode: data.language || 'en',
            components,
            businessNumber,
            broadcastId: id,
          })
          await updateDoc(rRef, { messageDocId })
        } catch (e) {
          console.error('[Broadcast send] sent, but could not record in the inbox:', e)
        }
      } catch (err: any) {
        const gg = err instanceof GetGabsApiError ? err : undefined
        const kind = gg?.kind || classifyGetGabsError(err?.message)
        // Account-wide problems: put the person back in the queue and stop
        if (kind === 'rate_limit' || kind === 'auth' || kind === 'not_configured') {
          await updateDoc(rRef, { status: 'pending', claimedAt: null })
          result.processed--
          if (kind === 'rate_limit') {
            backoffMs = RATE_LIMIT_BACKOFF_MS
          } else {
            status = 'paused'
            stopError = { error: err?.message || 'GetGabs refused the request.', hint: gg?.hint || getGabsErrorHint(kind) }
            await updateDoc(ref, { status: 'paused', pausedReason: `Stopped automatically: ${stopError.hint || stopError.error}` })
          }
          break
        }
        const hint = gg?.hint || getGabsErrorHint(kind) || null
        await updateDoc(rRef, { status: 'failed', error: String(err?.message || 'Failed to send').slice(0, 500), errorKind: kind, errorHint: hint })
        await bumpCounts(ref, countDelta('pending', 'failed'))
        await recordFailedMessage({
          phone: claimed.phone,
          text,
          templateName: data.templateName,
          languageCode: data.language || 'en',
          components,
          businessNumber,
          broadcastId: id,
          error: String(err?.message || 'Failed to send'),
          errorKind: kind,
          errorHint: hint || undefined,
          errorCode: gg?.metaCode ?? null,
        })
        result.failed++
        // The template itself is being refused: don't burn through the whole list
        if (kind === 'template' && ++consecutiveTemplateErrors >= 3) {
          status = 'paused'
          stopError = { error: 'WhatsApp refused the template 3 times in a row.', hint: hint || undefined }
          await updateDoc(ref, { status: 'paused', pausedReason: `Stopped automatically: WhatsApp refused the template 3 times in a row. ${hint || ''}`.trim() })
          break
        }
      }
    }

    // ── Finished?
    const [left, inFlight] = await Promise.all([
      getCountFromServer(query(recipientsCol(id), where('status', '==', 'pending'))),
      getCountFromServer(query(recipientsCol(id), where('status', '==', 'sending'))),
    ])
    const remaining = left.data().count + inFlight.data().count
    let done = false
    if (status === 'sending' && left.data().count === 0 && inFlight.data().count === 0) {
      const cur = (await getDoc(ref)).data() as BroadcastDoc | undefined
      if (cur?.status === 'sending') {
        // Rebuild the counts from the rows once at the end (fixes any drift from interrupted calls)
        const all = await getDocs(recipientsCol(id))
        const counts = countRecipients(all.docs.map((d) => d.data() as RecipientDoc))
        await updateDoc(ref, { status: 'done', finishedAt: new Date().toISOString(), counts, lockUntil: 0, updatedAt: serverTimestamp() })
        status = 'done'
        done = true
      }
    }
    await release()
    return NextResponse.json({ status, ...result, remaining, done, ...(backoffMs ? { backoffMs } : {}), ...(stopError || {}) })
  } catch (err: any) {
    console.error('[Broadcast send] batch failed:', err)
    await release()
    return jsonError(500, `Sending stopped: ${err?.message || 'unexpected error'}. Press Resume to continue — nobody will get the message twice.`)
  }
}
