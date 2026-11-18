/**
 * WhatsApp broadcasts: one approved template sent from +91 88900 59568 (GetGabs) to a list of customers,
 * one message at a time THROUGH OUR SERVER so every message is tracked in Firestore and shows in the inbox.
 *
 * Why not GetGabs' own campaign API (`/partners/broadcast/campaignmanage/campaignSubmit`,
 * `/partners/api/broadcast/send`)? They only answer `{ status, message: "Campaign submitted" }` — no
 * per-recipient message ids — so delivery / read / reply tracking per customer would be impossible.
 *
 * Firestore
 *   whatsapp_broadcasts/{id}                 (no phone numbers in here — safe for any staff screen)
 *   whatsapp_broadcasts/{id}/recipients/{id} (`phone` is server-written and NEVER returned to non-admins)
 *   whatsapp_optouts/{phone}                 (people who replied STOP; never included in a broadcast)
 *
 * This module is safe to import from client components (pure helpers + types). The only Firestore code
 * (`handleOptOutReply`) imports Firebase lazily and is meant for server routes (the inbound webhook).
 */

/* ------------------------------------------------------------------------------------------------
 * Limits / policy
 * ---------------------------------------------------------------------------------------------- */

/** Most people one broadcast may go to (policy guard; raise carefully — WhatsApp quality rating suffers) */
export const MAX_BROADCAST_RECIPIENTS = 1000
/** Recipients processed per send call (the open admin tab calls again until done) */
export const SEND_BATCH_SIZE = 20
/** Minimum gap between two messages (~1 msg / second) */
export const SEND_GAP_MS = 1000
/** Stop a send call after this long so it never hits the function time limit */
export const SEND_CALL_BUDGET_MS = 40_000
/** How long the client waits before continuing after GetGabs said "too many requests" */
export const RATE_LIMIT_BACKOFF_MS = 60_000
/** Status poll: recipients checked per call */
export const STATUS_BATCH_SIZE = 50
/** Delivery status is polled for this long after sending; replies are watched for REPLY_WINDOW_MS */
export const DELIVERY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000
export const REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export const BROADCASTS_COLLECTION = 'whatsapp_broadcasts'
export const RECIPIENTS_SUBCOLLECTION = 'recipients'
export const OPTOUTS_COLLECTION = 'whatsapp_optouts'

/* ------------------------------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------------------------- */

export type BroadcastStatus = 'draft' | 'sending' | 'paused' | 'done' | 'cancelled'
export type RecipientStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped'

export interface BroadcastCounts {
  total: number
  sent: number
  delivered: number
  read: number
  failed: number
  replied: number
  skipped: number
}

export const emptyCounts = (): BroadcastCounts => ({ total: 0, sent: 0, delivered: 0, read: 0, failed: 0, replied: 0, skipped: 0 })

/** Per-recipient data a template variable can be filled from */
export type RecipientSource = 'first_name' | 'full_name' | 'destination' | 'package' | 'travel_date'

export const RECIPIENT_SOURCES: { id: RecipientSource; label: string; help: string; fallback: string }[] = [
  { id: 'first_name', label: "Customer's first name", help: 'From their name (e.g. "Priya")', fallback: 'there' },
  { id: 'full_name', label: "Customer's full name", help: 'Their name as saved (e.g. "Priya Sharma")', fallback: 'there' },
  { id: 'destination', label: 'Destination', help: 'The place they asked about or booked (e.g. "Bali")', fallback: 'your trip' },
  { id: 'package', label: 'Package', help: 'Package / quote name, if any', fallback: 'your package' },
  { id: 'travel_date', label: 'Travel date', help: 'Their travel date, if saved (e.g. "12 Dec 2026")', fallback: 'soon' },
]

export const sourceInfo = (id?: string) => RECIPIENT_SOURCES.find((s) => s.id === id)

/** How one template variable is filled */
export type VariableMapping =
  | { mode: 'fixed'; text: string }
  | { mode: 'source'; source: RecipientSource; fallback?: string }
  /** Uploaded lists only: any extra column of the sheet ("Notes", "Budget"…), by its column key */
  | { mode: 'column'; column: string; label?: string; fallback?: string }

/** Values a recipient can contribute to the template */
export interface RecipientFields {
  name: string
  destination?: string
  package?: string
  travelDate?: string
  /** Uploaded lists only: extra sheet columns (column key → text) */
  extra?: Record<string, string>
}

/** Fallback texts by token key: a RecipientSource id, or `col:<column key>` */
export type TokenFallbacks = Record<string, string | undefined>

export interface BroadcastHeaderMedia {
  kind: 'image' | 'document' | 'video'
  link: string
  filename?: string
}

/* ------------------------------------------------------------------------------------------------
 * Audience segments
 * ---------------------------------------------------------------------------------------------- */

export type SegmentId =
  | 'website_leads'
  | 'ai_planner_leads'
  | 'meta_leads'
  | 'quotes_not_booked'
  | 'upcoming_trips'
  | 'past_customers'
  | 'whatsapp_contacts'
  | 'contact_form'
  /** A sheet uploaded in the wizard (numbers come from the browser, re-checked on the server) */
  | 'upload'
  /** A list uploaded earlier (whatsapp_contact_lists/{listId}) */
  | 'saved_list'

export interface AudienceFilters {
  /** website_leads: new | contacted | quoted | follow-up (empty = all open) */
  statuses?: string[]
  /** website_leads / ai_planner_leads / contact_form / meta_leads: created in the last N days (0 = any time) */
  createdWithinDays?: number
  /** website_leads / contact_form: destination contains (case-insensitive) */
  destination?: string
  /** meta_leads: CRM stages */
  stages?: string[]
  /** quotes_not_booked: sent at least N days ago … */
  minAgeDays?: number
  /** … and at most N days ago */
  maxAgeDays?: number
  /** upcoming_trips: travelling in the next N days */
  nextDays?: number
  /** whatsapp_contacts: messaged us in the last N days */
  lastDays?: number
  /** saved_list: whatsapp_contact_lists/{listId} */
  listId?: string
  /** saved_list: only people on the list who were never sent a broadcast from it */
  notSentOnly?: boolean
}

export const SEGMENTS: { id: SegmentId; label: string; description: string; defaults: AudienceFilters }[] = [
  { id: 'website_leads', label: 'Website leads', description: 'People who sent an enquiry on the website', defaults: { statuses: ['new', 'contacted', 'quoted', 'follow-up'], createdWithinDays: 90 } },
  { id: 'ai_planner_leads', label: 'AI planner leads', description: 'People who left their number in the AI trip planner', defaults: { createdWithinDays: 90 } },
  { id: 'meta_leads', label: 'Meta leads', description: 'Facebook / Instagram leads being worked in the CRM', defaults: { stages: ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation'], createdWithinDays: 0 } },
  { id: 'quotes_not_booked', label: 'Sent quotes not booked', description: 'Customers we sent a quote to who have not booked yet', defaults: { minAgeDays: 2, maxAgeDays: 60 } },
  { id: 'upcoming_trips', label: 'Customers with upcoming trips', description: 'Confirmed bookings travelling soon', defaults: { nextDays: 30 } },
  { id: 'past_customers', label: 'Past customers', description: 'Customers whose trip is completed or already over', defaults: {} },
  { id: 'whatsapp_contacts', label: 'People who messaged us on WhatsApp', description: 'Anyone who wrote to our WhatsApp number recently', defaults: { lastDays: 30 } },
  { id: 'contact_form', label: 'Contact form (real, not spam)', description: 'Contact Us messages, with bot spam filtered out', defaults: { createdWithinDays: 90 } },
  { id: 'upload', label: 'Upload a list (Excel / CSV)', description: 'New people from a sheet of names and mobile numbers', defaults: {} },
  { id: 'saved_list', label: 'A list you uploaded before', description: 'A sheet uploaded earlier — e.g. the rest of yesterday’s list', defaults: { notSentOnly: true } },
]

/** Segments whose people come from an uploaded sheet (cold numbers: extra safety rules apply) */
export const isListSegment = (s?: string): s is 'upload' | 'saved_list' => s === 'upload' || s === 'saved_list'

export const segmentInfo = (id?: string) => SEGMENTS.find((s) => s.id === id)

export const WEBSITE_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quote sent' },
  { value: 'follow-up', label: 'Follow-up' },
]

export const META_STAGE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

/** Plain-language summary of a segment + filters, stored on the broadcast ("Website leads · New, Contacted · last 90 days") */
export function describeAudience(segment: SegmentId, f: AudienceFilters = {}): string {
  const parts: string[] = [segmentInfo(segment)?.label || segment]
  const label = (opts: { value: string; label: string }[], v: string) => opts.find((o) => o.value === v)?.label || v
  if (segment === 'website_leads' && f.statuses?.length) parts.push(f.statuses.map((s) => label(WEBSITE_STATUS_OPTIONS, s)).join(', '))
  if (segment === 'meta_leads' && f.stages?.length) parts.push(f.stages.map((s) => label(META_STAGE_OPTIONS, s)).join(', '))
  if (['website_leads', 'ai_planner_leads', 'meta_leads', 'contact_form'].includes(segment) && f.createdWithinDays) parts.push(`last ${f.createdWithinDays} days`)
  if (f.destination && ['website_leads', 'contact_form'].includes(segment)) parts.push(`destination contains "${f.destination}"`)
  if (segment === 'quotes_not_booked') parts.push(`sent ${f.minAgeDays || 0}–${f.maxAgeDays || 365} days ago`)
  if (segment === 'upcoming_trips') parts.push(`travelling in the next ${f.nextDays || 30} days`)
  if (segment === 'whatsapp_contacts') parts.push(`messaged in the last ${f.lastDays || 30} days`)
  if (segment === 'saved_list' && f.notSentOnly) parts.push('only people not messaged from this list yet')
  return parts.join(' · ')
}

/** Keep only known filter keys with sane values (request bodies are untrusted) */
export function cleanFilters(raw: any): AudienceFilters {
  const f = raw && typeof raw === 'object' ? raw : {}
  const num = (v: any, min: number, max: number) => {
    const n = Math.round(Number(v))
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined
  }
  const list = (v: any, allowed: string[]) => (Array.isArray(v) ? v.filter((x) => allowed.includes(String(x))).map(String) : undefined)
  return {
    statuses: list(f.statuses, WEBSITE_STATUS_OPTIONS.map((o) => o.value)),
    stages: list(f.stages, META_STAGE_OPTIONS.map((o) => o.value)),
    createdWithinDays: num(f.createdWithinDays, 0, 3650),
    destination: typeof f.destination === 'string' ? f.destination.trim().slice(0, 60) : undefined,
    minAgeDays: num(f.minAgeDays, 0, 3650),
    maxAgeDays: num(f.maxAgeDays, 0, 3650),
    nextDays: num(f.nextDays, 1, 365),
    lastDays: num(f.lastDays, 1, 3650),
    listId: typeof f.listId === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(f.listId) ? f.listId : undefined,
    notSentOnly: f.notSentOnly === true ? true : undefined,
  }
}

export const isSegmentId = (s: any): s is SegmentId => SEGMENTS.some((x) => x.id === s)

/* ------------------------------------------------------------------------------------------------
 * Phone numbers / de-duplication
 * ---------------------------------------------------------------------------------------------- */

/**
 * Inbox chat id for a number ("+91 98765-43210" → "919876543210"), or '' when it can't be a WhatsApp number.
 * Same normalisation as `normalizeWhatsAppNumber` in lib/whatsapp.ts (kept here so this module stays client-safe).
 */
export function broadcastPhone(raw?: unknown): string {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  if (d.length === 10) d = `91${d}`
  if (d.length < 11 || d.length > 15) return ''
  // Indian mobiles start with 6-9; reject obvious junk like 910000000000 / repeated digits
  if (d.startsWith('91') && d.length === 12 && !/^[6-9]/.test(d.slice(2))) return ''
  if (/^(\d)\1+$/.test(d.slice(-10))) return ''
  return d
}

/** Last 10 digits: the same person across sources */
export const dedupeKey = (phone: string) => phone.replace(/\D/g, '').slice(-10)

export interface AudienceCandidate extends RecipientFields {
  /** Firestore path of the source record, e.g. "leads/abc123" */
  refPath: string
  /** Raw phone as stored on the record */
  rawPhone?: unknown
  /** Sort key: newer first (ms) */
  sortAt?: number
}

export interface AudienceMember extends RecipientFields {
  /** Source record path; '' for uploaded lists (their contacts are not resolvable by resolveRefPhone) */
  refPath: string
  /** Normalised chat id ("91…") — server only */
  phone: string
  /** Uploaded lists: whatsapp_contact_lists/{listId}/contacts/{contactId} */
  contactId?: string
}

export interface AudienceSkipped {
  noNumber: number
  invalid: number
  duplicates: number
  optedOut: number
}

/**
 * Normalise, drop invalid / opted-out numbers and de-duplicate by the last 10 digits (newest record wins;
 * a missing name is filled from an older duplicate).
 */
export function dedupeAudience(candidates: AudienceCandidate[], optedOut: Set<string> = new Set()): { members: AudienceMember[]; skipped: AudienceSkipped } {
  const skipped: AudienceSkipped = { noNumber: 0, invalid: 0, duplicates: 0, optedOut: 0 }
  const byKey = new Map<string, AudienceMember>()
  const sorted = [...candidates].sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
  for (const c of sorted) {
    const rawDigits = String(c.rawPhone ?? '').replace(/\D/g, '')
    if (!rawDigits) {
      skipped.noNumber++
      continue
    }
    const phone = broadcastPhone(c.rawPhone)
    if (!phone) {
      skipped.invalid++
      continue
    }
    const key = dedupeKey(phone)
    if (optedOut.has(key)) {
      skipped.optedOut++
      continue
    }
    const existing = byKey.get(key)
    if (existing) {
      skipped.duplicates++
      if (!existing.name && c.name) existing.name = c.name
      if (!existing.destination && c.destination) existing.destination = c.destination
      if (!existing.package && c.package) existing.package = c.package
      if (!existing.travelDate && c.travelDate) existing.travelDate = c.travelDate
      continue
    }
    byKey.set(key, {
      refPath: c.refPath,
      phone,
      name: cleanName(c.name),
      ...(c.destination ? { destination: String(c.destination).slice(0, 80) } : {}),
      ...(c.package ? { package: String(c.package).slice(0, 120) } : {}),
      ...(c.travelDate ? { travelDate: String(c.travelDate).slice(0, 40) } : {}),
    })
  }
  return { members: Array.from(byKey.values()), skipped }
}

/** Names that are really phone numbers / emails are dropped */
export function cleanName(name?: unknown): string {
  const s = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
  if (!s || (!/[a-z]/i.test(s) && s.replace(/\D/g, '').length >= 6) || /@/.test(s)) return ''
  return s
}

export const firstName = (name?: string) => {
  const f = cleanName(name).split(' ')[0] || ''
  return f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : ''
}

/* ------------------------------------------------------------------------------------------------
 * Template variables → per-recipient values
 * ---------------------------------------------------------------------------------------------- */

/** Token placed in a variable's value when it is filled per recipient; replaced server-side before sending */
export const sourceToken = (source: RecipientSource) => `{{tz:${source}}}`
/** Token for an extra sheet column (uploaded lists) */
export const columnToken = (column: string) => `{{tzc:${column}}}`
const TOKEN_RE = /\{\{tz(c?):([a-z0-9_]+)\}\}/g
/** Keys of extra sheet columns: lowercase slugs */
export const COLUMN_KEY_RE = /^[a-z0-9_]{1,40}$/

/** "12 Dec 2026" from "2026-12-12" (anything else is returned as-is) */
export function prettyDate(v?: string) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(`${v.slice(0, 10)}T00:00:00`)
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return v
}

/** The value a recipient gives for a source ('' when they don't have it) */
export function recipientValue(source: RecipientSource, r: RecipientFields): string {
  switch (source) {
    case 'first_name':
      return firstName(r.name)
    case 'full_name':
      return cleanName(r.name)
    case 'destination':
      return String(r.destination || '').trim()
    case 'package':
      return String(r.package || '').trim()
    case 'travel_date':
      return prettyDate(r.travelDate)
  }
}

/** An extra sheet column's value for a recipient ('' when missing) */
export const columnValue = (column: string, r: RecipientFields) => String(r.extra?.[column] ?? '').trim()

/** Fill one variable for one recipient */
export function resolveMapping(m: VariableMapping | undefined, r: RecipientFields): string {
  if (!m) return ''
  if (m.mode === 'fixed') return m.text
  if (m.mode === 'column') return columnValue(m.column, r) || (m.fallback ?? '')
  return recipientValue(m.source, r) || (m.fallback ?? sourceInfo(m.source)?.fallback ?? '')
}

/** Value to put in the template form for a mapping (fixed text, or the source / column token) */
export const mappingFormValue = (m: VariableMapping) => (m.mode === 'fixed' ? m.text : m.mode === 'column' ? columnToken(m.column) : sourceToken(m.source))

/** Replace every {{tz:source}} / {{tzc:column}} token in a string with the recipient's value (or the mapping's fallback) */
export function fillTokens(text: string, r: RecipientFields, fallbacks: TokenFallbacks = {}): string {
  return text.replace(TOKEN_RE, (_, isCol: string, key: string) => {
    if (isCol) return columnValue(key, r) || fallbacks[`col:${key}`] || ''
    const source = key as RecipientSource
    if (!sourceInfo(source)) return ''
    return recipientValue(source, r) || fallbacks[source] || sourceInfo(source)!.fallback
  })
}

/** Deep-copy a components array (or any JSON) replacing tokens in every string */
export function fillComponents<T>(value: T, r: RecipientFields, fallbacks: TokenFallbacks = {}, key = ''): T {
  if (typeof value === 'string') {
    const filled = fillTokens(value, r, fallbacks)
    // Meta rejects empty text params
    return (key === 'text' && !filled.trim() ? '-' : filled) as unknown as T
  }
  if (Array.isArray(value)) return value.map((v) => fillComponents(v, r, fallbacks, key)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value as Record<string, any>)) out[k] = fillComponents(v, r, fallbacks, k)
    return out as T
  }
  return value
}

/** Fallback text per source from the mappings (when two variables use the same source, the first wins) */
export function mappingFallbacks(mappings: Record<string, VariableMapping>): TokenFallbacks {
  const out: TokenFallbacks = {}
  for (const m of Object.values(mappings || {})) {
    if (m.mode === 'source' && m.fallback && !out[m.source]) out[m.source] = m.fallback
    if (m.mode === 'column' && m.fallback && !out[`col:${m.column}`]) out[`col:${m.column}`] = m.fallback
  }
  return out
}

/** Sources a set of mappings uses */
export const usedSources = (mappings: Record<string, VariableMapping>) =>
  Array.from(new Set(Object.values(mappings || {}).flatMap((m) => (m.mode === 'source' ? [m.source] : []))))

/** Do any strings of `value` still contain an unreplaced token? */
export const hasTokens = (value: unknown) => /\{\{tzc?:/.test(JSON.stringify(value ?? ''))

/** Validate mappings from an untrusted body */
export function cleanMappings(raw: any): Record<string, VariableMapping> {
  const out: Record<string, VariableMapping> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw as Record<string, any>)) {
    if (!/^[\w.-]{1,40}$/.test(k) || !v || typeof v !== 'object') continue
    if (v.mode === 'source' && sourceInfo(v.source)) {
      out[k] = { mode: 'source', source: v.source, ...(typeof v.fallback === 'string' ? { fallback: v.fallback.slice(0, 60) } : {}) }
    } else if (v.mode === 'column' && typeof v.column === 'string' && COLUMN_KEY_RE.test(v.column)) {
      out[k] = {
        mode: 'column',
        column: v.column,
        ...(typeof v.label === 'string' ? { label: v.label.slice(0, 60) } : {}),
        ...(typeof v.fallback === 'string' ? { fallback: v.fallback.slice(0, 60) } : {}),
      }
    } else if (v.mode === 'fixed') {
      out[k] = { mode: 'fixed', text: String(v.text ?? '').slice(0, 1000) }
    }
  }
  return out
}

/* ------------------------------------------------------------------------------------------------
 * Status helpers
 * ---------------------------------------------------------------------------------------------- */

const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 }

/**
 * Count changes for a recipient moving from one status to another. Counts are cumulative:
 * `sent` includes delivered/read, `delivered` includes read. A failure after GetGabs accepted the message
 * moves it from `sent` to `failed`.
 */
export function countDelta(from: RecipientStatus, to: RecipientStatus): Partial<BroadcastCounts> {
  const d: Partial<BroadcastCounts> = {}
  const add = (k: keyof BroadcastCounts, n: number) => (d[k] = (d[k] || 0) + n)
  const fr = RANK[from] || 0
  const tr = RANK[to] || 0
  if (to === 'failed') {
    if (from === 'failed') return d
    if (fr >= 1) add('sent', -1)
    if (fr >= 2) add('delivered', -1)
    if (fr >= 3) add('read', -1)
    add('failed', 1)
    return d
  }
  if (to === 'skipped') {
    if (from !== 'skipped') add('skipped', 1)
    if (from === 'failed') add('failed', -1)
    return d
  }
  if (from === 'failed') add('failed', -1)
  if (from === 'skipped') add('skipped', -1)
  if (tr >= 1 && fr < 1) add('sent', 1)
  if (tr >= 2 && fr < 2) add('delivered', 1)
  if (tr >= 3 && fr < 3) add('read', 1)
  return d
}

/** Rebuild counts from recipient rows */
export function countRecipients(rows: { status?: string; repliedAt?: string | null }[]): BroadcastCounts {
  const c = emptyCounts()
  for (const r of rows) {
    c.total++
    const rank = RANK[r.status || ''] || 0
    if (rank >= 1) c.sent++
    if (rank >= 2) c.delivered++
    if (rank >= 3) c.read++
    if (r.status === 'failed') c.failed++
    if (r.status === 'skipped') c.skipped++
    if (r.repliedAt) c.replied++
  }
  return c
}

export const RECIPIENT_STATUS_LABEL: Record<RecipientStatus, string> = {
  pending: 'Waiting',
  sending: 'Sending…',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  skipped: 'Skipped',
}

export const BROADCAST_STATUS_LABEL: Record<BroadcastStatus, string> = {
  draft: 'Ready to send',
  sending: 'Sending',
  paused: 'Paused',
  done: 'Finished',
  cancelled: 'Cancelled',
}

/* ------------------------------------------------------------------------------------------------
 * Opt-outs (STOP / UNSUBSCRIBE replies)
 * ---------------------------------------------------------------------------------------------- */

// "stop promotions" is the text of Meta's built-in opt-out quick-reply button on marketing templates
// "stop messages" is a quick-reply button on our GetGabs lead templates (tz_lead_followup_day5, tz_lead_last_nudge)
const OPT_OUT_WORDS = ['stop', 'unsubscribe', 'stop all', 'stopall', 'stop promotions', 'stop promotion', 'stop messages','opt out', 'optout', 'cancel subscription', 'remove me', 'band karo', 'mat bhejo']
const OPT_IN_WORDS = ['start', 'subscribe', 'unstop', 'resume']

const normalizeReply = (text?: string | null) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** True when an inbound message is ONLY an opt-out keyword ("STOP", "Unsubscribe.", "stop!!") */
export const isOptOutText = (text?: string | null) => OPT_OUT_WORDS.includes(normalizeReply(text))
/** True when an inbound message is ONLY an opt-in keyword ("START") */
export const isOptInText = (text?: string | null) => OPT_IN_WORDS.includes(normalizeReply(text))

/**
 * Server-side, for the inbound webhook: when the customer's message is STOP / UNSUBSCRIBE, add them to
 * `whatsapp_optouts/{phone}` (they are then left out of every future broadcast); START removes them again.
 * Returns what happened. Never throws.
 */
export async function handleOptOutReply(
  phone: string,
  text: string | null | undefined,
  meta: { channel?: string; messageId?: string; timestamp?: string } = {}
): Promise<'opted_out' | 'opted_in' | 'none'> {
  try {
    const p = broadcastPhone(phone)
    if (!p) return 'none'
    const out = isOptOutText(text)
    const back = !out && isOptInText(text)
    if (!out && !back) return 'none'
    const { db } = await import('@/lib/firebase')
    const { doc, setDoc, deleteDoc } = await import('firebase/firestore')
    const ref = doc(db, OPTOUTS_COLLECTION, dedupeKey(p))
    if (back) {
      await deleteDoc(ref)
      return 'opted_in'
    }
    await setDoc(ref, {
      phone: p,
      keyword: String(text || '').slice(0, 40),
      channel: meta.channel || 'getgabs',
      ...(meta.messageId ? { messageId: meta.messageId } : {}),
      optedOutAt: meta.timestamp || new Date().toISOString(),
    })
    return 'opted_out'
  } catch (e) {
    console.error('[Broadcast] opt-out update failed:', e)
    return 'none'
  }
}

/**
 * Server-side: true when this number replied STOP (is in `whatsapp_optouts`). Used to skip automated marketing
 * sends. Returns false when the number is invalid or the lookup fails (logged).
 */
export async function isOptedOut(phone: string): Promise<boolean> {
  try {
    const p = broadcastPhone(phone)
    if (!p) return false
    const { db } = await import('@/lib/firebase')
    const { doc, getDoc } = await import('firebase/firestore')
    return (await getDoc(doc(db, OPTOUTS_COLLECTION, dedupeKey(p)))).exists()
  } catch (e) {
    console.error('[Broadcast] opt-out lookup failed:', e)
    return false
  }
}
