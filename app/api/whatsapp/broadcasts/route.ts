export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import {
  BROADCASTS_COLLECTION,
  RECIPIENTS_SUBCOLLECTION,
  MAX_BROADCAST_RECIPIENTS,
  cleanFilters,
  cleanMappings,
  describeAudience,
  emptyCounts,
  isListSegment,
  isSegmentId,
  type AudienceMember,
  type BroadcastHeaderMedia,
} from '@/lib/whatsapp/broadcasts'
import { MAX_NEW_CONTACTS_PER_DAY, capDay } from '@/lib/whatsapp/contactLists'
import { AudienceError, checkTemplate, jsonError, loadAudience, loadUploadAudience, staffOr, type AudienceResult, type BroadcastDoc, type RecipientDoc } from './_lib/server'
import { dailyCapInfo, markContactsQueued, saveContactList } from './_lib/lists'

/**
 * POST /api/whatsapp/broadcasts   (staff: admin, "whatsapp" or "leads") — create a broadcast (status "draft").
 * {
 *   name, segment, filters,
 *   excludeKeys?: string[]           // ADMINS only: people to leave out (source record paths / list keys from the preview)
 *   templateName, language?, templateTitle?,
 *   variables: { [key]: { mode:'fixed', text } | { mode:'source', source, fallback? } | { mode:'column', column, fallback? } },
 *   componentsTemplate: [...],       // send components with {{tz:source}} / {{tzc:column}} tokens for per-recipient values
 *   previewTemplate: string,         // inbox preview text with the same tokens
 *   headerMedia?: { kind, link, filename? },
 *   scheduledAt?: ISO, marketingConsent?: boolean,
 *   // uploaded lists (segment "upload" / "saved_list"):
 *   contacts?: [{ name, phone, destination?, travelDate?, extra? }], columns?: [{ key, label }], fileName?,   // "upload" only
 *   listConsent: true,               // "everyone on this list agreed to receive WhatsApp messages from Travelzada"
 *   acceptDailyCap?: boolean         // send only to the first people allowed today (see MAX_NEW_CONTACTS_PER_DAY)
 * }
 * The audience is rebuilt on the server. For "upload" the numbers necessarily come from the browser (the sheet); they
 * are validated + normalised again here, de-duplicated and checked against opt-outs, and the list is saved to
 * whatsapp_contact_lists for reuse.
 * → { id, total, heldBack?, listId? }   or 409 { code: 'daily_cap', cap, usedToday, left, newInAudience, wouldSend }
 */
export async function POST(req: NextRequest) {
  const user = await staffOr(req)
  if (user instanceof Response) return user

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON body.')
  }

  const name = String(body?.name || '').trim().slice(0, 80)
  if (!name) return jsonError(400, 'Give the broadcast a name.')
  if (!isSegmentId(body?.segment)) return jsonError(400, 'Pick who should get the message.')
  const segment = body.segment
  const isList = isListSegment(segment)
  const filters = cleanFilters(body?.filters)
  const componentsTemplate = Array.isArray(body?.componentsTemplate) ? body.componentsTemplate : []
  const previewTemplate = String(body?.previewTemplate || '').slice(0, 4000)
  const variables = cleanMappings(body?.variables)
  if (JSON.stringify(componentsTemplate).length > 20_000) return jsonError(400, 'The template fields are too long.')
  if (isList && body?.listConsent !== true) {
    return jsonError(400, 'Please confirm that everyone on this list agreed to receive WhatsApp messages from Travelzada.')
  }

  let scheduledAt: string | null = null
  if (body?.scheduledAt) {
    const t = Date.parse(String(body.scheduledAt))
    if (Number.isNaN(t)) return jsonError(400, 'The schedule date is not valid.')
    if (t > Date.now() + 60_000) scheduledAt = new Date(t).toISOString()
  }

  const headerMedia: BroadcastHeaderMedia | null =
    body?.headerMedia && typeof body.headerMedia === 'object' && /^https:\/\//i.test(String(body.headerMedia.link || ''))
      ? {
          kind: ['image', 'document', 'video'].includes(body.headerMedia.kind) ? body.headerMedia.kind : 'image',
          link: String(body.headerMedia.link).slice(0, 1000),
          ...(body.headerMedia.filename ? { filename: String(body.headerMedia.filename).slice(0, 200) } : {}),
        }
      : null

  // ── Template policy: approved, not AUTHENTICATION, variables match
  const check = await checkTemplate(String(body?.templateName || ''), body?.language ? String(body.language) : undefined, componentsTemplate)
  if (!check.ok) return jsonError(check.status, check.error, check.hint ? { hint: check.hint } : {})
  if (check.row.category === 'MARKETING' && body?.marketingConsent !== true) {
    return jsonError(400, 'Please confirm these people agreed to hear from us (marketing template).')
  }

  // ── Audience, rebuilt server-side
  let audience: AudienceResult
  let upload: Awaited<ReturnType<typeof loadUploadAudience>> | null = null
  const fileName = String(body?.fileName || '').replace(/[\\/]/g, ' ').trim().slice(0, 120) || 'Uploaded list'
  try {
    if (segment === 'upload') {
      upload = await loadUploadAudience(body?.contacts, body?.columns)
      audience = upload
    } else {
      audience = await loadAudience(segment, filters)
    }
  } catch (err: any) {
    if (err instanceof AudienceError) return jsonError(400, err.message)
    console.error('[Broadcast create] audience failed:', err)
    return jsonError(500, 'Could not load the audience. Please try again.')
  }

  // Keep each member with its admin-removal key and (uploads) its index in the cleaned contacts
  type Entry = { m: AudienceMember; key: string; ci: number }
  const exclude = new Set<string>(user.isAdmin && Array.isArray(body?.excludeKeys) ? body.excludeKeys.map(String).slice(0, 5000) : [])
  const all: Entry[] = audience.members.map((m, i) => ({ m, key: audience.keys?.[i] || m.refPath, ci: upload ? upload.memberIndex[i] : -1 }))
  let entries = all.filter((e) => !e.key || !exclude.has(e.key))
  const removed = all.length - entries.length
  if (!entries.length) {
    return jsonError(400, isList ? 'Nobody to send to — no one on this list has a valid WhatsApp number that has not opted out.' : 'Nobody to send to — this audience has no one with a valid WhatsApp number.')
  }
  if (segment === 'upload' && entries.length > MAX_BROADCAST_RECIPIENTS) {
    return jsonError(400, `This sheet has ${entries.length.toLocaleString('en-IN')} people. One broadcast can go to at most ${MAX_BROADCAST_RECIPIENTS.toLocaleString('en-IN')} — split the sheet into smaller files and upload them one at a time.`)
  }

  // ── Daily safety cap for numbers that have never messaged us (uploaded lists)
  let newContacts = 0
  let heldBack = 0
  let known = new Set<string>()
  if (isList) {
    let cap
    try {
      cap = await dailyCapInfo(entries.map((e) => e.m.phone))
    } catch (err: any) {
      console.error('[Broadcast create] daily cap check failed:', err)
      return jsonError(500, 'Could not check today’s limit for new contacts. Please try again.')
    }
    known = cap.known
    if (cap.newInAudience > cap.left) {
      const knownCount = entries.length - cap.newInAudience
      const wouldSend = knownCount + cap.left
      if (body?.acceptDailyCap !== true || wouldSend === 0) {
        return jsonError(
          409,
          cap.left === 0
            ? `Today’s limit of ${MAX_NEW_CONTACTS_PER_DAY} new contacts is used up. ${segment === 'upload' ? 'Your list will be kept — ' : ''}send it tomorrow (pick “A list you uploaded before”).`
            : `Only ${cap.left} more new contacts can be messaged today (safety limit ${MAX_NEW_CONTACTS_PER_DAY}/day for people who never messaged us; ${cap.usedToday} used). This list has ${cap.newInAudience} new people.`,
          { code: 'daily_cap', cap: cap.cap, usedToday: cap.usedToday, left: cap.left, newInAudience: cap.newInAudience, wouldSend }
        )
      }
      let allowance = cap.left
      entries = entries.filter((e) => known.has(e.m.phone) || allowance-- > 0)
      heldBack = cap.newInAudience - cap.left
    }
    newContacts = entries.filter((e) => !known.has(e.m.phone)).length
  }
  if (entries.length > MAX_BROADCAST_RECIPIENTS) {
    return jsonError(400, `Too many people (${entries.length}). One broadcast can go to at most ${MAX_BROADCAST_RECIPIENTS} — narrow the filters.`)
  }

  // ── Save an uploaded sheet as a reusable list (all of it — people held back by the cap stay there for tomorrow)
  let listId = isList && segment === 'saved_list' ? audience.list?.id || '' : ''
  let listName = audience.list?.name || ''
  if (upload) {
    try {
      listName = fileName.replace(/\.(xlsx|xls|csv)$/i, '')
      const saved = await saveContactList({
        name: listName,
        fileName,
        user: { uid: user.uid, email: user.email },
        contacts: upload.contacts,
        columns: upload.columns,
        counts: { rows: Array.isArray(body?.contacts) ? body.contacts.length : upload.contacts.length, invalid: upload.invalid, duplicates: upload.duplicates },
      })
      listId = saved.id
      for (const e of entries) e.m.contactId = saved.contactIds[e.ci]
    } catch (err: any) {
      console.error('[Broadcast create] could not save the list:', err)
      return jsonError(500, `Could not save the uploaded list (${err?.message || 'error'}).`)
    }
  }

  const members = entries.map((e) => e.m)
  const nowIso = new Date().toISOString()
  const counts = { ...emptyCounts(), total: members.length }
  let description = describeAudience(segment, filters)
  if (isList) {
    description = `Uploaded list “${listName}”`
    if (segment === 'saved_list' && filters.notSentOnly) description += ' · only people not messaged from it yet'
    if (heldBack) description += ` · ${heldBack} new people held back by the daily limit`
  }
  const data: BroadcastDoc & Record<string, any> = {
    name,
    templateName: check.row.name,
    ...(body?.templateTitle ? { templateTitle: String(body.templateTitle).slice(0, 120) } : {}),
    language: check.row.language,
    category: check.row.category,
    variables,
    componentsTemplate,
    previewTemplate: previewTemplate || `[Template: ${check.row.name}]`,
    headerMedia,
    audience: {
      segment,
      filters: JSON.parse(JSON.stringify(isList && listId ? { ...filters, listId } : filters)),
      description,
      skipped: audience.skipped,
      removed,
      ...(listId ? { listId, listName } : {}),
      ...(heldBack ? { heldBack } : {}),
    },
    createdBy: { uid: user.uid, email: user.email },
    createdAt: nowIso,
    createdAtTs: serverTimestamp(),
    scheduledAt,
    status: 'draft',
    counts,
    marketingConsent: body?.marketingConsent === true,
    ...(isList ? { consentConfirmedBy: { uid: user.uid, email: user.email }, consentConfirmedAt: nowIso, newContacts, capDay: capDay() } : {}),
    preparing: true,
  }

  let id = ''
  try {
    const ref = await addDoc(collection(db, BROADCASTS_COLLECTION), data)
    id = ref.id
    for (let i = 0; i < members.length; i += 400) {
      const batch = writeBatch(db)
      members.slice(i, i + 400).forEach((m, j) => {
        const r: RecipientDoc = {
          order: i + j,
          name: m.name,
          refPath: m.refPath,
          phone: m.phone,
          ...(m.destination ? { destination: m.destination } : {}),
          ...(m.package ? { package: m.package } : {}),
          ...(m.travelDate ? { travelDate: m.travelDate } : {}),
          ...(m.extra && Object.keys(m.extra).length ? { extra: m.extra } : {}),
          ...(m.contactId ? { contactId: m.contactId } : {}),
          ...(isList ? { newContact: !known.has(m.phone) } : {}),
          status: 'pending',
          messageId: null,
        }
        batch.set(doc(collection(db, BROADCASTS_COLLECTION, id, RECIPIENTS_SUBCOLLECTION)), r)
      })
      await batch.commit()
    }
    await updateDoc(ref, { preparing: false })
    if (listId) {
      await markContactsQueued(listId, members.map((m) => m.contactId || ''), id).catch((e) => console.error('[Broadcast create] could not mark list contacts:', e))
    }
    return NextResponse.json({ id, total: members.length, ...(heldBack ? { heldBack } : {}), ...(listId ? { listId } : {}) })
  } catch (err: any) {
    console.error('[Broadcast create] failed:', err)
    if (id) await updateDoc(doc(db, BROADCASTS_COLLECTION, id), { status: 'cancelled', preparing: false, pausedReason: 'Could not save the recipient list.' }).catch(() => {})
    return jsonError(500, `Could not save the broadcast (${err?.message || 'error'}).`)
  }
}
