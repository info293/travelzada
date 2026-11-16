export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDocs, orderBy, query, runTransaction, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { countDelta } from '@/lib/whatsapp/broadcasts'
import {
  bumpCounts,
  checkTemplate,
  jsonError,
  loadBroadcast,
  publicRecipient,
  recipientRef,
  recipientsCol,
  staffOr,
  type RecipientDoc,
} from '../_lib/server'
import { unmarkContacts } from '../_lib/lists'

/**
 * GET  /api/whatsapp/broadcasts/:id   (staff) → { broadcast, recipients, isAdmin }
 *      Recipients never include phone numbers for non-admins.
 * POST /api/whatsapp/broadcasts/:id   (staff) { action, ... }
 *      start { confirmCount }  draft → sending (confirmCount must equal the number of people to message)
 *      pause | resume | cancel
 *      retry_failed            failed recipients back to the queue (never ones that were interrupted mid-send,
 *                              or whose number can't get WhatsApp); broadcast → paused, press Resume to send
 *      remove_recipient { recipientId }   ADMINS only, while the person is still waiting
 */

type Ctx = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await staffOr(req)
  if (user instanceof Response) return user
  const b = await loadBroadcast(params.id)
  if (!b) return jsonError(404, 'Broadcast not found.')
  const snap = await getDocs(query(recipientsCol(params.id), orderBy('order')))
  const { lockBy, componentsTemplate, ...broadcast } = b.data as any
  return NextResponse.json({
    broadcast: { id: params.id, ...broadcast, createdAtTs: undefined, updatedAt: undefined },
    recipients: snap.docs.map((d) => publicRecipient(d.id, d.data() as RecipientDoc, user.isAdmin)),
    isAdmin: user.isAdmin,
  })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await staffOr(req)
  if (user instanceof Response) return user
  const b = await loadBroadcast(params.id)
  if (!b) return jsonError(404, 'Broadcast not found.')
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON body.')
  }
  const action = String(body?.action || '')
  const { ref, data } = b
  const nowIso = new Date().toISOString()
  const toSend = (data.counts?.total || 0) - (data.counts?.skipped || 0)

  switch (action) {
    case 'start': {
      if (data.status !== 'draft') return jsonError(409, 'This broadcast has already been started.')
      if ((data as any).preparing) return jsonError(409, 'The recipient list is still being saved — try again in a moment.')
      if (Number(body?.confirmCount) !== toSend) return jsonError(400, `Type ${toSend} to confirm.`)
      // Re-check the template right before sending (it may have been paused / deleted since the draft)
      const check = await checkTemplate(data.templateName, data.language, data.componentsTemplate, { fresh: true })
      if (!check.ok) return jsonError(check.status, check.error, check.hint ? { hint: check.hint } : {})
      await updateDoc(ref, { status: 'sending', startedAt: nowIso, startedBy: { uid: user.uid, email: user.email }, pausedReason: null, updatedAt: serverTimestamp() })
      return NextResponse.json({ ok: true, status: 'sending' })
    }
    case 'pause': {
      if (data.status !== 'sending') return jsonError(409, 'Only a broadcast that is sending can be paused.')
      await updateDoc(ref, { status: 'paused', pausedReason: `Paused by ${user.email || 'staff'}`, lockUntil: 0, updatedAt: serverTimestamp() })
      return NextResponse.json({ ok: true, status: 'paused' })
    }
    case 'resume': {
      if (data.status !== 'paused') return jsonError(409, 'Only a paused broadcast can be resumed.')
      await updateDoc(ref, { status: 'sending', pausedReason: null, finishedAt: null, updatedAt: serverTimestamp() })
      return NextResponse.json({ ok: true, status: 'sending' })
    }
    case 'cancel': {
      if (!['draft', 'sending', 'paused'].includes(data.status)) return jsonError(409, 'This broadcast is already finished.')
      await updateDoc(ref, { status: 'cancelled', cancelledAt: nowIso, cancelledBy: user.email || user.uid, lockUntil: 0, updatedAt: serverTimestamp() })
      // Uploaded list: people who were never messaged become "not messaged yet" on the list again
      if (data.audience?.listId) {
        try {
          const waiting = await getDocs(query(recipientsCol(params.id), where('status', '==', 'pending')))
          const ids = waiting.docs.map((d) => (d.data() as RecipientDoc).contactId || '').filter(Boolean)
          await unmarkContacts(data.audience.listId, ids, params.id)
        } catch (e) {
          console.error('[Broadcast cancel] could not update the uploaded list:', e)
        }
      }
      return NextResponse.json({ ok: true, status: 'cancelled' })
    }
    case 'retry_failed': {
      if (data.status === 'sending') return jsonError(409, 'Pause the broadcast first.')
      if (data.status === 'draft') return jsonError(409, 'This broadcast has not been sent yet.')
      const snap = await getDocs(query(recipientsCol(params.id), where('status', '==', 'failed')))
      const retry = snap.docs.filter((d) => {
        const r = d.data() as RecipientDoc
        return !r.interrupted && r.errorKind !== 'invalid_number'
      })
      if (!retry.length) return jsonError(400, 'Nothing to retry (numbers that are not on WhatsApp, or messages that may already have gone out, are never retried).')
      for (let i = 0; i < retry.length; i += 400) {
        const batch = writeBatch(db)
        retry.slice(i, i + 400).forEach((d) =>
          batch.update(d.ref, { status: 'pending', messageId: null, error: null, errorKind: null, errorHint: null, claimedAt: null, nextCheckAt: null, retriedAt: nowIso })
        )
        await batch.commit()
      }
      await bumpCounts(ref, { failed: -retry.length }, { status: 'paused', pausedReason: `${retry.length} failed message(s) queued again — press Resume to send.`, finishedAt: null })
      return NextResponse.json({ ok: true, status: 'paused', requeued: retry.length })
    }
    case 'remove_recipient': {
      if (!user.isAdmin) return jsonError(403, 'Only admins can remove people from a broadcast.')
      const rid = String(body?.recipientId || '')
      if (!/^[A-Za-z0-9]{10,40}$/.test(rid)) return jsonError(400, 'Invalid recipient.')
      if (!['draft', 'paused', 'sending'].includes(data.status)) return jsonError(409, 'This broadcast is finished.')
      const rRef = recipientRef(params.id, rid)
      // Transaction: the send loop may be claiming this person at the same moment
      const outcome = await runTransaction(db, async (tx) => {
        const rs = await tx.get(rRef)
        if (!rs.exists()) return 'missing'
        if ((rs.data() as RecipientDoc).status !== 'pending') return 'taken'
        tx.update(rRef, { status: 'skipped', skipReason: `Removed by ${user.email || 'admin'}` })
        return 'ok'
      })
      if (outcome === 'missing') return jsonError(404, 'Recipient not found.')
      if (outcome === 'taken') return jsonError(409, 'This person has already been messaged.')
      await bumpCounts(ref, countDelta('pending', 'skipped'))
      return NextResponse.json({ ok: true })
    }
    default:
      return jsonError(400, 'Unknown action.')
  }
}
