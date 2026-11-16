/**
 * Server-only helpers for the WhatsApp broadcast routes (Firestore reads/writes, audience loading,
 * recording sent messages in the inbox). Never import from client components.
 */
import { db } from '@/lib/firebase'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentReference,
} from 'firebase/firestore'
import { NextResponse } from 'next/server'
import { authErrorResponse, requireStaff, type StaffUser } from '@/lib/admin/serverAuth'
import {
  BROADCASTS_COLLECTION,
  OPTOUTS_COLLECTION,
  RECIPIENTS_SUBCOLLECTION,
  dedupeAudience,
  type AudienceFilters,
  type AudienceMember,
  type AudienceSkipped,
  type BroadcastCounts,
  type BroadcastHeaderMedia,
  type BroadcastStatus,
  type RecipientStatus,
  type SegmentId,
  type VariableMapping,
} from '@/lib/whatsapp/broadcasts'
import { candidatesFor, ms, SEGMENT_COLLECTIONS, type RawRow } from './audience'
import { MAX_UPLOAD_ROWS, cleanColumns, cleanUploadContacts, listMembers, type SheetColumn, type UploadContact } from '@/lib/whatsapp/contactLists'
import { loadContactList } from './lists'
import { getGetGabsTemplate, listGetGabsTemplates, GetGabsApiError } from '@/lib/getgabs'
import { isHttpsUrl, type GetGabsTemplateListItem, type GetGabsTemplateSummary } from '@/lib/getgabsTemplates'

export const BROADCAST_PERMS = ['whatsapp', 'leads']

/** requireStaff wrapper: returns the user, or a Response to return as-is */
export async function staffOr(req: Request): Promise<StaffUser | Response> {
  try {
    return await requireStaff(req, BROADCAST_PERMS)
  } catch (err) {
    return authErrorResponse(err) || NextResponse.json({ error: 'Could not check your login.' }, { status: 500 })
  }
}

export const jsonError = (status: number, error: string, extra: Record<string, any> = {}) => NextResponse.json({ error, ...extra }, { status })

/* ------------------------------------------------------------------------------------------------
 * Documents
 * ---------------------------------------------------------------------------------------------- */

export interface BroadcastDoc {
  name: string
  templateName: string
  templateTitle?: string
  language: string
  category: string
  /** Variable key (as used by the template form) → fixed text or per-recipient source */
  variables: Record<string, VariableMapping>
  /** Components with {{tz:source}} tokens, filled per recipient */
  componentsTemplate: any[]
  /** Inbox preview text with {{tz:source}} tokens */
  previewTemplate: string
  headerMedia?: BroadcastHeaderMedia | null
  audience: {
    segment: SegmentId
    filters: AudienceFilters
    description: string
    skipped: AudienceSkipped
    removed: number
    /** Uploaded lists: whatsapp_contact_lists/{listId} */
    listId?: string
    listName?: string
    /** Uploaded lists: people left for another day by the daily new-contact cap */
    heldBack?: number
  }
  /** Uploaded lists: who ticked "everyone on this list agreed to receive WhatsApp messages" */
  consentConfirmedBy?: { uid: string; email: string } | null
  consentConfirmedAt?: string | null
  /** Uploaded lists: recipients who had never messaged us (counted against MAX_NEW_CONTACTS_PER_DAY on `capDay`) */
  newContacts?: number
  capDay?: string
  createdBy: { uid: string; email: string }
  createdAt: string
  scheduledAt?: string | null
  status: BroadcastStatus
  counts: BroadcastCounts
  startedAt?: string | null
  finishedAt?: string | null
  pausedReason?: string | null
  lockBy?: string | null
  lockUntil?: number | null
  marketingConsent?: boolean
}

export interface RecipientDoc {
  order: number
  name: string
  refPath: string
  /** Server-only. Never send to non-admins. */
  phone: string
  destination?: string
  package?: string
  travelDate?: string
  /** Uploaded lists: extra sheet columns for {{tzc:column}} variables */
  extra?: Record<string, string>
  /** Uploaded lists: contact doc id in whatsapp_contact_lists/{listId}/contacts */
  contactId?: string
  /** Uploaded lists: the number had never messaged us when the broadcast was made */
  newContact?: boolean
  status: RecipientStatus
  messageId?: string | null
  messageDocId?: string | null
  error?: string | null
  errorKind?: string | null
  errorHint?: string | null
  /** Interrupted mid-send: we can't tell whether it went out, so it is never retried automatically */
  interrupted?: boolean
  claimedAt?: string | null
  sentAt?: string | null
  deliveredAt?: string | null
  readAt?: string | null
  repliedAt?: string | null
  /** Status / reply poll: next time this recipient should be checked (ISO). Absent = nothing left to check. */
  nextCheckAt?: string | null
  skipReason?: string | null
}

export const broadcastRef = (id: string) => doc(db, BROADCASTS_COLLECTION, id)
export const recipientsCol = (id: string) => collection(db, BROADCASTS_COLLECTION, id, RECIPIENTS_SUBCOLLECTION)
export const recipientRef = (id: string, rid: string) => doc(db, BROADCASTS_COLLECTION, id, RECIPIENTS_SUBCOLLECTION, rid)

export const validId = (id?: string | null) => !!id && /^[A-Za-z0-9_-]{6,64}$/.test(id)

export async function loadBroadcast(id: string): Promise<{ ref: DocumentReference; data: BroadcastDoc } | null> {
  if (!validId(id)) return null
  const ref = broadcastRef(id)
  const snap = await getDoc(ref)
  return snap.exists() ? { ref, data: snap.data() as BroadcastDoc } : null
}

/** Apply count changes with atomic increments */
export async function bumpCounts(ref: DocumentReference, delta: Partial<BroadcastCounts>, extra: Record<string, any> = {}) {
  const patch: Record<string, any> = { ...extra }
  for (const [k, v] of Object.entries(delta)) if (v) patch[`counts.${k}`] = increment(v)
  if (Object.keys(patch).length) await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() })
}

/** Strip server-only fields for the browser. Admins also get the number. */
export function publicRecipient(id: string, r: RecipientDoc, isAdmin: boolean) {
  return {
    id,
    order: r.order,
    name: r.name || '',
    // whatsapp_chats ids are phone numbers: never hand those to non-admins (they'd end up in URLs)
    refPath: isAdmin || !r.refPath.startsWith('whatsapp_chats/') ? r.refPath : null,
    status: r.status,
    ...(isAdmin ? { phone: r.phone } : {}),
    // A WhatsApp message id ("wamid.…") encodes the number, so only admins get it
    ...(isAdmin ? { messageId: r.messageId || null } : {}),
    hasMessage: !!r.messageId && !String(r.messageId).startsWith('outbound_'),
    error: r.error || null,
    errorKind: r.errorKind || null,
    errorHint: r.errorHint || null,
    interrupted: !!r.interrupted,
    skipReason: r.skipReason || null,
    sentAt: r.sentAt || null,
    deliveredAt: r.deliveredAt || null,
    readAt: r.readAt || null,
    repliedAt: r.repliedAt || null,
    destination: r.destination || null,
  }
}

/* ------------------------------------------------------------------------------------------------
 * Audience
 * ---------------------------------------------------------------------------------------------- */

/** Last-10-digit keys of everyone who opted out */
export async function loadOptOuts(): Promise<Set<string>> {
  const snap = await getDocs(collection(db, OPTOUTS_COLLECTION))
  return new Set(snap.docs.map((d) => d.id.replace(/\D/g, '').slice(-10)).filter(Boolean))
}

export async function isOptedOut(phone: string): Promise<boolean> {
  const key = phone.replace(/\D/g, '').slice(-10)
  if (!key) return false
  return (await getDoc(doc(db, OPTOUTS_COLLECTION, key))).exists()
}

async function rowsFor(segment: SegmentId, f: AudienceFilters): Promise<RawRow[]> {
  const col = collection(db, SEGMENT_COLLECTIONS[segment])
  // Narrow the read where a single-field range is safe (no composite index needed)
  let snap
  if (segment === 'whatsapp_contacts') {
    snap = await getDocs(query(col, where('lastInboundAt', '>=', new Date(Date.now() - (f.lastDays || 30) * 86400000).toISOString())))
  } else {
    snap = await getDocs(col)
  }
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, any> }))
}

export interface AudienceResult {
  members: AudienceMember[]
  skipped: AudienceSkipped
  /** People found before cleaning */
  found: number
  /** Uploaded lists */
  list?: { id: string; name: string; fileName: string; columns: SheetColumn[]; alreadyMessaged: number; createdAt: string }
  /** Uploaded lists: admin removal key per member (same order); other segments use refPath */
  keys?: string[]
  /** Upload preview: request indexes of contacts that opted out */
  optedOutIndex?: number[]
  /** Upload preview: request indexes the server found invalid */
  invalidIndex?: number[]
}

/** A friendly audience problem (400) rather than a crash */
export class AudienceError extends Error {}

/** saved_list: people on an uploaded list, minus opt-outs (and, with notSentOnly, minus people already messaged from it) */
export async function loadListAudience(filters: AudienceFilters): Promise<AudienceResult> {
  if (!filters.listId) throw new AudienceError('Pick one of your uploaded lists.')
  const [loaded, optOuts] = await Promise.all([loadContactList(filters.listId, { notSentOnly: filters.notSentOnly }), loadOptOuts()])
  if (!loaded) throw new AudienceError('That list was not found — it may have been deleted.')
  const { members, optedOut } = listMembers(loaded.contacts, optOuts)
  return {
    members,
    keys: members.map((m) => `c:${m.contactId}`),
    skipped: { noNumber: 0, invalid: 0, duplicates: 0, optedOut },
    found: loaded.contacts.length,
    list: {
      id: filters.listId,
      name: loaded.list.name,
      fileName: loaded.list.fileName,
      columns: loaded.list.columns,
      alreadyMessaged: loaded.alreadyMessaged,
      createdAt: loaded.list.createdAt,
    },
  }
}

/** upload: contacts sent by the browser, re-validated with the same rules, de-duplicated, minus opt-outs */
export async function loadUploadAudience(rawContacts: unknown, rawColumns: unknown): Promise<
  AudienceResult & {
    contacts: UploadContact[]
    /** Index into `contacts` of each member (same order as members) */
    memberIndex: number[]
    columns: SheetColumn[]
    invalid: number
    duplicates: number
  }
> {
  if (!Array.isArray(rawContacts) || !rawContacts.length) throw new AudienceError('Upload a sheet with at least one mobile number.')
  if (rawContacts.length > MAX_UPLOAD_ROWS) throw new AudienceError(`The sheet has more than ${MAX_UPLOAD_ROWS.toLocaleString('en-IN')} rows — split it into smaller sheets.`)
  const columns = cleanColumns(rawColumns)
  const cleaned = cleanUploadContacts(rawContacts, columns)
  const optOuts = await loadOptOuts()
  const { members, optedOutIndex } = listMembers(cleaned.contacts, optOuts)
  const out = new Set(optedOutIndex)
  return {
    members,
    memberIndex: cleaned.contacts.map((_, i) => i).filter((i) => !out.has(i)),
    // Admins remove people by the row's index in the request (the same contacts array is sent on create)
    keys: cleaned.sourceIndex.filter((_, i) => !out.has(i)).map((i) => `u:${i}`),
    skipped: { noNumber: 0, invalid: cleaned.invalid, duplicates: cleaned.duplicates, optedOut: optedOutIndex.length },
    found: rawContacts.length,
    contacts: cleaned.contacts,
    columns,
    invalid: cleaned.invalid,
    duplicates: cleaned.duplicates,
    optedOutIndex: optedOutIndex.map((i) => cleaned.sourceIndex[i]),
    invalidIndex: cleaned.invalidIndex,
  }
}

export async function loadAudience(segment: SegmentId, filters: AudienceFilters): Promise<AudienceResult> {
  if (segment === 'saved_list') return loadListAudience(filters)
  if (segment === 'upload') throw new AudienceError('Upload a sheet first.')
  const [rows, optOuts] = await Promise.all([rowsFor(segment, filters), loadOptOuts()])
  const candidates = candidatesFor(segment, filters, rows)
  const { members, skipped } = dedupeAudience(candidates, optOuts)
  return { members, skipped, found: candidates.length }
}

/* ------------------------------------------------------------------------------------------------
 * Inbox records (same shape as /api/whatsapp/send)
 * ---------------------------------------------------------------------------------------------- */

export async function recordSentMessage(opts: {
  phone: string
  name?: string
  refPath?: string
  whatsappMessageId: string
  text: string
  templateName: string
  languageCode: string
  components: any[]
  businessNumber: string
  broadcastId: string | null
  test?: boolean
}): Promise<string> {
  const nowIso = new Date().toISOString()
  const rec = await addDoc(collection(db, 'whatsapp_messages'), {
    whatsappMessageId: opts.whatsappMessageId,
    senderPhone: opts.phone,
    direction: 'outbound',
    type: 'template',
    text: opts.text,
    templateName: opts.templateName,
    languageCode: opts.languageCode,
    components: opts.components,
    channel: 'getgabs',
    businessNumber: opts.businessNumber,
    ...(opts.broadcastId ? { broadcastId: opts.broadcastId } : {}),
    ...(opts.test ? { broadcastTest: true } : {}),
    status: 'sent',
    timestamp: nowIso,
    createdAt: serverTimestamp(),
  })
  const looksLikePhone = (s?: string) => !!s && !/[a-z]/i.test(s) && s.replace(/\D/g, '').length >= 7
  await setDoc(
    doc(db, 'whatsapp_chats', opts.phone),
    {
      phone: opts.phone,
      ...(opts.name && !looksLikePhone(opts.name) ? { customerName: opts.name } : {}),
      ...(opts.refPath && !opts.refPath.startsWith('whatsapp_chats/') ? { sourceRef: opts.refPath } : {}),
      lastMessage: opts.text,
      lastMessageTimestamp: nowIso,
      lastDirection: 'outbound',
      lastOutboundAt: nowIso,
      channel: 'getgabs',
      businessNumber: opts.businessNumber,
      ...(opts.broadcastId ? { lastBroadcastId: opts.broadcastId } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  return rec.id
}

export async function recordFailedMessage(opts: {
  phone: string
  text: string
  templateName: string
  languageCode: string
  components: any[]
  businessNumber: string
  broadcastId: string
  error: string
  errorKind?: string
  errorHint?: string
  errorCode?: number | null
}) {
  try {
    await addDoc(collection(db, 'whatsapp_messages'), {
      whatsappMessageId: `failed_${Date.now()}`,
      senderPhone: opts.phone,
      direction: 'outbound',
      type: 'template',
      text: opts.text,
      templateName: opts.templateName,
      languageCode: opts.languageCode,
      components: opts.components,
      channel: 'getgabs',
      businessNumber: opts.businessNumber,
      broadcastId: opts.broadcastId,
      status: 'failed',
      errorCode: opts.errorCode ?? null,
      errorTitle: opts.error,
      errorDetails: null,
      ...(opts.errorKind ? { errorKind: opts.errorKind } : {}),
      ...(opts.errorHint ? { errorHint: opts.errorHint } : {}),
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('[Broadcast] could not store failed message record:', e)
  }
}

/** When the next status / reply check is due for a recipient sent at `sentAt` (null = stop checking) */
export function nextCheckFor(sentAt: string | null | undefined, opts: { needsDelivery: boolean; needsReply: boolean }, now = Date.now()): string | null {
  const sent = ms(sentAt)
  if (!sent) return null
  const age = now - sent
  const delivery = opts.needsDelivery && age < 3 * 86400000
  const reply = opts.needsReply && age < 7 * 86400000
  if (!delivery && !reply) return null
  const gap = age < 60 * 60 * 1000 ? 45_000 : age < 86400000 ? 5 * 60_000 : 30 * 60_000
  return new Date(now + gap).toISOString()
}

/* ------------------------------------------------------------------------------------------------
 * Template policy checks
 * ---------------------------------------------------------------------------------------------- */

export type TemplateCheck =
  | { ok: true; row: GetGabsTemplateListItem; summary: GetGabsTemplateSummary }
  | { ok: false; status: number; error: string; hint?: string }

/**
 * The template must exist in GetGabs and be submitted to Meta (GetGabs lists only those with a template id),
 * must not be an AUTHENTICATION (OTP) template, and `components` must have exactly the variables the template
 * expects (body / header params, media header link, link buttons) — otherwise every recipient would fail.
 */
export async function checkTemplate(templateName: string, language: string | undefined, components: any[], opts: { fresh?: boolean } = {}): Promise<TemplateCheck> {
  if (!/^[a-z0-9_]{1,512}$/i.test(templateName || '')) return { ok: false, status: 400, error: 'Pick a template.' }
  let row: GetGabsTemplateListItem | undefined
  let summary: GetGabsTemplateSummary | null = null
  try {
    const list = await listGetGabsTemplates({ fresh: opts.fresh })
    row = list.find((t) => t.name === templateName && (!language || t.language === language)) || list.find((t) => t.name === templateName)
    if (!row) {
      return {
        ok: false,
        status: 400,
        error: `"${templateName}" is not an approved template in GetGabs yet.`,
        hint: 'Only templates submitted to and approved by WhatsApp can be broadcast. Check GetGabs → Templates.',
      }
    }
    if (row.category === 'AUTHENTICATION') return { ok: false, status: 400, error: 'Authentication (OTP) templates cannot be broadcast.' }
    summary = await getGetGabsTemplate(row.name, row.language)
  } catch (err: any) {
    return { ok: false, status: 502, error: `Could not check the template with GetGabs (${err?.message || 'error'}).`, hint: err instanceof GetGabsApiError ? err.hint : undefined }
  }
  if (!summary) return { ok: false, status: 400, error: `Template "${templateName}" was not found in GetGabs.` }
  if (!summary.supported) return { ok: false, status: 400, error: `This template ${summary.unsupportedReason || 'is not supported here'} — it can't be broadcast from the admin.` }

  const comps = Array.isArray(components) ? components : []
  const of = (type: string) => comps.filter((c) => String(c?.type || '').toLowerCase() === type)
  const body = of('body')[0]
  const header = of('header')[0]
  const buttons = of('button')
  const bodyCount = Array.isArray(body?.parameters) ? body.parameters.length : 0
  if (bodyCount !== summary.bodyParams.length) {
    return {
      ok: false,
      status: 400,
      error: `The template needs ${summary.bodyParams.length} message variable(s) but ${bodyCount} were filled in.`,
      hint: 'Fill in every field of the template.',
    }
  }
  if (summary.headerMedia) {
    const p = header?.parameters?.[0]
    const link = p?.[summary.headerMedia]?.link
    if (!isHttpsUrl(link)) return { ok: false, status: 400, error: `This template needs a ${summary.headerMedia} at the top — add a public https:// link.` }
  } else if (summary.headerTextParams.length && (header?.parameters?.length || 0) !== summary.headerTextParams.length) {
    return { ok: false, status: 400, error: 'Fill in the template heading variable.' }
  }
  if (buttons.length !== summary.buttons.length) {
    return { ok: false, status: 400, error: `The template has ${summary.buttons.length} link button(s) that need a value; ${buttons.length} filled in.` }
  }
  return { ok: true, row, summary }
}
