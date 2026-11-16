/**
 * Uploaded contact lists for WhatsApp broadcasts ("Upload a list (Excel / CSV)").
 *
 * Staff upload a sheet of NEW people (names + mobile numbers). The browser parses it (xlsx) with the helpers
 * below; the server re-validates every row with the SAME helpers (`cleanUploadContacts`) — numbers from the
 * browser are never trusted as-is.
 *
 * Firestore
 *   whatsapp_contact_lists/{listId}                     { name, fileName, uploadedBy, createdAt, counts, columns }
 *   whatsapp_contact_lists/{listId}/contacts/{contactId} { order, name, phone, destination?, travelDate?, extra?, source: 'upload',
 *                                                          lastBroadcastId?, lastBroadcastAt? }
 *   `phone` is server-written and never returned to non-admins.
 *
 * Pure + client-safe (no Firebase imports).
 */
import { COLUMN_KEY_RE, cleanName, dedupeKey, type AudienceMember } from './broadcasts'

/* ------------------------------------------------------------------------------------------------
 * Limits
 * ---------------------------------------------------------------------------------------------- */

export const CONTACT_LISTS_COLLECTION = 'whatsapp_contact_lists'
export const CONTACTS_SUBCOLLECTION = 'contacts'
/** Biggest sheet accepted */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
/** Most data rows read from a sheet */
export const MAX_UPLOAD_ROWS = 5000
/**
 * Daily safety cap: people who have NEVER messaged our WhatsApp number that broadcasts from uploaded lists may
 * reach per day (all staff together). WhatsApp lowers the number's quality rating / limits it when many cold
 * recipients block or report.
 */
export const MAX_NEW_CONTACTS_PER_DAY = 250
/** Extra (custom) columns kept per row */
export const MAX_EXTRA_COLUMNS = 15
const MAX_EXTRA_VALUE = 200

/* ------------------------------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------------------------- */

/** One person from a sheet, cleaned */
export interface UploadContact {
  name: string
  /** Normalised WhatsApp number, e.g. "919876543210" */
  phone: string
  destination?: string
  travelDate?: string
  /** Extra columns: column key → text */
  extra?: Record<string, string>
}

export interface SheetColumn {
  /** Slug used in templates, e.g. "notes" */
  key: string
  /** Header as written in the sheet, e.g. "Notes" */
  label: string
}

/** Which sheet header holds each known field ('' = none) */
export interface ColumnMapping {
  name: string
  phone: string
  destination: string
  travelDate: string
}

export interface UploadProblem {
  /** Row number as Excel shows it (header = row 1) */
  row: number
  reason: string
}

export interface UploadParseResult {
  contacts: UploadContact[]
  /** Sheet row number of each contact (same order) */
  rowNumbers: number[]
  problems: UploadProblem[]
  counts: { rows: number; valid: number; invalid: number; noNumber: number; duplicates: number }
  /** Extra columns kept as custom fields */
  columns: SheetColumn[]
  /** Headers ignored because they look like contact details (second phone, email…) */
  ignoredColumns: string[]
}

/* ------------------------------------------------------------------------------------------------
 * Phone numbers
 * ---------------------------------------------------------------------------------------------- */

export type PhoneCheck = { ok: true; phone: string } | { ok: false; reason: string; empty?: boolean }

/** A number cell as digits: handles numeric cells, "9876543210.0" and scientific notation ("9.87654321E+09") */
function phoneDigits(raw: unknown): { digits: string; error?: string } {
  if (raw === null || raw === undefined) return { digits: '' }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return { digits: '', error: 'Not a phone number' }
    // Numbers stored as numbers: 919876543210, 9876543210 (no exponent below 1e21)
    return { digits: Math.round(raw).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 }) }
  }
  let s = String(raw).trim()
  if (!s) return { digits: '' }
  // Scientific notation from Excel ("9.87654321E+09"). If Excel rounded it ("9.88E+09") the number is lost.
  const sci = s.replace(/\s/g, '').match(/^\+?(\d+)(?:\.(\d+))?e\+?(\d{1,2})$/i)
  if (sci) {
    const sig = (sci[1] + (sci[2] || '')).replace(/^0+/, '').replace(/0+$/, '').length
    const n = Number(s.replace(/\s/g, ''))
    const total = Number.isFinite(n) ? Math.round(n).toString().length : 0
    if (!total || sig < total - 1) return { digits: '', error: 'Excel shortened this number (scientific notation like 9.88E+09) — format the column as Text and type it again' }
    return { digits: Math.round(n).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 }) }
  }
  // "9876543210.0" (numeric cell exported as text)
  if (/^\+?\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '')
  // Several numbers in one cell ("98765 43210 / 91234 56789"): take the first
  if (/[,;/|]/.test(s)) s = s.split(/[,;/|]/)[0]
  // Letters (other than an "ext"/"x" suffix) → not a number
  const stripped = s.replace(/[\s+\-().]/g, '')
  if (/[a-z]/i.test(stripped)) return { digits: '', error: 'Not a phone number' }
  return { digits: stripped.replace(/\D/g, '') }
}

/**
 * Clean one mobile number from a sheet:
 *  - strip spaces, +, -, (, ), dots; numeric cells and scientific notation handled
 *  - 10 digits starting 6–9 → Indian mobile, "91" added
 *  - 11 digits starting 0 → drop the 0, then as above
 *  - 12 digits starting 91 → kept (must be a 6–9 mobile after the 91)
 *  - "00" international prefix dropped; other international numbers allowed when 11–15 digits
 *  - everything else is invalid (with a reason)
 */
export function cleanUploadPhone(raw: unknown): PhoneCheck {
  const { digits, error } = phoneDigits(raw)
  if (error) return { ok: false, reason: error }
  let d = digits
  if (!d) return { ok: false, reason: 'No mobile number', empty: true }
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  if (d.length === 10) {
    if (!/^[6-9]/.test(d)) return { ok: false, reason: 'Indian mobile numbers start with 6, 7, 8 or 9' }
    d = `91${d}`
  } else if (d.length === 12 && d.startsWith('91')) {
    if (!/^[6-9]/.test(d.slice(2))) return { ok: false, reason: 'Indian mobile numbers start with 6, 7, 8 or 9 after +91' }
  } else if (d.length === 11 && d.startsWith('91')) {
    return { ok: false, reason: 'Looks like an Indian number with a digit missing' }
  } else if (d.length < 11 || d.length > 15) {
    return { ok: false, reason: d.length < 10 ? 'Too short for a mobile number' : 'Wrong number of digits' }
  } else if (d.startsWith('0')) {
    return { ok: false, reason: 'Wrong number of digits' }
  }
  if (/^(\d)\1+$/.test(d.slice(-10))) return { ok: false, reason: 'Not a real number (repeated digits)' }
  return { ok: true, phone: d }
}

/* ------------------------------------------------------------------------------------------------
 * Columns
 * ---------------------------------------------------------------------------------------------- */

const norm = (h: string) => String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const NAME_RE = /^(name|full name|customer|customer name|client|client name|guest|guest name|contact name|person|traveller|traveler|first name|lead name)$/
const NAME_LOOSE_RE = /\b(name|customer|client|guest)\b/
const PHONE_RE = /^(mobile|mobile no|mobile number|phone|phone no|phone number|whatsapp|whatsapp no|whatsapp number|contact|contact no|contact number|number|cell|cell no|mob|mob no|ph|ph no|tel|telephone)$/
const PHONE_LOOSE_RE = /\b(mobile|phone|whatsapp|contact|number|cell|mob|tel)\b/
const DEST_RE = /\b(destination|destinations|place|city|country|location|trip to|going to)\b/
const DATE_RE = /\b(travel date|travel dates|date of travel|trip date|departure|departure date|travel|check in|start date|date)\b/
/** Extra columns that would carry contact details (never kept as custom fields) */
const CONTACT_DETAIL_RE = /\b(mobile|phone|whatsapp|contact|number|cell|tel|email|e mail|mail|address|aadhaar|aadhar|pan|passport)\b/

/** Guess which header holds name / phone / destination / travel date */
export function detectColumns(headers: string[]): ColumnMapping {
  const hs = headers.map((h) => String(h ?? ''))
  const used = new Set<string>()
  const pick = (strict: RegExp, loose?: RegExp, not?: RegExp) => {
    const tryRe = (re: RegExp) => hs.find((h) => h && !used.has(h) && re.test(norm(h)) && !(not && not.test(norm(h))))
    const found = tryRe(strict) || (loose ? tryRe(loose) : undefined) || ''
    if (found) used.add(found)
    return found
  }
  const phone = pick(PHONE_RE, PHONE_LOOSE_RE, /\b(name|email|alternate|alt|second|landline)\b/)
  const name = pick(NAME_RE, NAME_LOOSE_RE, /\b(company|file|user ?name)\b/)
  const destination = pick(DEST_RE)
  const travelDate = pick(DATE_RE, undefined, /\b(created|added|submitted|enquiry|enquired|birth|dob)\b/)
  return { name, phone, destination, travelDate }
}

/** "Budget (₹)" → "budget"; unique within the list */
export function columnKey(label: string, taken: Set<string> = new Set()): string {
  const base = norm(label).replace(/\s+/g, '_').slice(0, 32) || 'column'
  let key = base
  for (let i = 2; taken.has(key); i++) key = `${base}_${i}`.slice(0, 40)
  taken.add(key)
  return key
}

/** True when a value is (or contains) a phone number / email — never kept in custom fields */
export const looksLikeContactDetail = (v: string) => /\S@\S/.test(v) || (!/[a-z]{3,}/i.test(v) && v.replace(/\D/g, '').length >= 10)

/** Custom columns to keep: every header not mapped, not empty and not contact details */
export function customColumns(headers: string[], mapping: ColumnMapping, rows: Record<string, unknown>[] = []): { columns: (SheetColumn & { header: string })[]; ignored: string[] } {
  const mapped = new Set([mapping.name, mapping.phone, mapping.destination, mapping.travelDate].filter(Boolean))
  const taken = new Set<string>()
  const columns: (SheetColumn & { header: string })[] = []
  const ignored: string[] = []
  for (const h of headers) {
    if (!h || mapped.has(h) || /^__EMPTY/.test(h)) continue
    const sample = rows.slice(0, 200).map((r) => cellText(r[h])).filter(Boolean)
    const contactish = sample.length > 0 && sample.filter(looksLikeContactDetail).length / sample.length >= 0.5
    if (CONTACT_DETAIL_RE.test(norm(h)) || contactish) {
      ignored.push(h)
      continue
    }
    if (!sample.length) continue
    if (columns.length >= MAX_EXTRA_COLUMNS) {
      ignored.push(h)
      continue
    }
    columns.push({ key: columnKey(h, taken), label: String(h).trim().slice(0, 60), header: h })
  }
  return { columns, ignored }
}

/* ------------------------------------------------------------------------------------------------
 * Cells
 * ---------------------------------------------------------------------------------------------- */

const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** Cell → trimmed text (Dates as YYYY-MM-DD) */
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : isoDay(v)
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  return String(v).replace(/\s+/g, ' ').trim()
}

/** Local calendar day of a Date (rounded to the minute: SheetJS dates can be a few seconds off) */
function isoDay(d: Date) {
  const r = new Date(Math.round(d.getTime() / 60000) * 60000)
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}`
}

/**
 * Travel date cell → "YYYY-MM-DD" when we can tell the day for sure, else the text as written ("Dec 2026",
 * "next month"). Day-first like India: 12/11/2026 = 12 Nov 2026. Excel serial numbers are understood.
 */
export function normaliseTravelDate(v: unknown): string {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : isoDay(v)
  if (typeof v === 'number' && v > 30000 && v < 80000) {
    // Excel serial day (1900 system)
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  const s = cellText(v).slice(0, 40)
  if (!s) return ''
  const valid = (y: number, m: number, d: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : ''
  }
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return valid(+m[1], +m[2], +m[3]) || s
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]
    return valid(y, +m[2], +m[1]) || s
  }
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3})[a-z]*[\s,-]+(\d{4})$/i)
  if (m && MONTHS.includes(m[2].toLowerCase())) return valid(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]) || s
  return s
}

const short = (v: string, n: number) => v.replace(/\s+/g, ' ').trim().slice(0, n)

/* ------------------------------------------------------------------------------------------------
 * Rows → contacts
 * ---------------------------------------------------------------------------------------------- */

/**
 * Turn sheet rows (objects keyed by header) into clean contacts. `phoneCells` (optional) are the raw typed
 * values of the phone column (numbers stay numbers) — used in preference to the formatted text.
 * De-duplicates by the last 10 digits (first row wins; a missing name / destination is filled from a duplicate).
 */
export function parseSheetRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
  opts: { headers?: string[]; rawRows?: Record<string, unknown>[]; firstRowNumber?: number } = {}
): UploadParseResult {
  const headers = opts.headers || Object.keys(rows[0] || {})
  const { columns, ignored } = customColumns(headers, mapping, rows)
  const first = opts.firstRowNumber ?? 2
  const problems: UploadProblem[] = []
  const counts = { rows: 0, valid: 0, invalid: 0, noNumber: 0, duplicates: 0 }
  const byKey = new Map<string, number>()
  const contacts: UploadContact[] = []
  const rowNumbers: number[] = []

  rows.slice(0, MAX_UPLOAD_ROWS).forEach((row, i) => {
    const rowNo = first + i
    const raw = opts.rawRows?.[i]
    const values = [...Object.values(row)].map(cellText).filter(Boolean)
    if (!values.length) return // blank line
    counts.rows++
    const phoneCell = mapping.phone ? (raw && typeof raw[mapping.phone] === 'number' ? raw[mapping.phone] : row[mapping.phone]) : undefined
    const check = cleanUploadPhone(phoneCell)
    if (!check.ok) {
      if (check.empty) counts.noNumber++
      else counts.invalid++
      problems.push({ row: rowNo, reason: check.reason })
      return
    }
    const name = mapping.name ? cleanName(cellText(row[mapping.name])) : ''
    const destination = mapping.destination ? short(cellText(row[mapping.destination]), 80) : ''
    const travelDate = mapping.travelDate ? normaliseTravelDate(raw?.[mapping.travelDate] instanceof Date ? raw[mapping.travelDate] : row[mapping.travelDate]) : ''
    const extra: Record<string, string> = {}
    for (const c of columns) {
      const v = short(cellText(row[c.header]), MAX_EXTRA_VALUE)
      if (v && !looksLikeContactDetail(v)) extra[c.key] = v
    }
    const key = dedupeKey(check.phone)
    const at = byKey.get(key)
    if (at !== undefined) {
      counts.duplicates++
      problems.push({ row: rowNo, reason: `Duplicate of row ${rowNumbers[at]} (same number)` })
      const c = contacts[at]
      if (!c.name && name) c.name = name
      if (!c.destination && destination) c.destination = destination
      if (!c.travelDate && travelDate) c.travelDate = travelDate
      return
    }
    byKey.set(key, contacts.length)
    rowNumbers.push(rowNo)
    contacts.push({
      name,
      phone: check.phone,
      ...(destination ? { destination } : {}),
      ...(travelDate ? { travelDate } : {}),
      ...(Object.keys(extra).length ? { extra } : {}),
    })
  })
  if (rows.length > MAX_UPLOAD_ROWS) problems.push({ row: first + MAX_UPLOAD_ROWS, reason: `Only the first ${MAX_UPLOAD_ROWS} rows are read — split the sheet` })
  counts.valid = contacts.length
  return { contacts, rowNumbers, problems, counts, columns: columns.map(({ key, label }) => ({ key, label })), ignoredColumns: ignored }
}

/* ------------------------------------------------------------------------------------------------
 * Server-side re-validation (request bodies are untrusted)
 * ---------------------------------------------------------------------------------------------- */

export interface CleanedUpload {
  contacts: UploadContact[]
  /** Index (in the request) of every accepted contact */
  sourceIndex: number[]
  invalid: number
  duplicates: number
  /** Request indexes that were invalid */
  invalidIndex: number[]
}

/** Validate + normalise contacts sent by the browser with the same rules, and de-duplicate */
export function cleanUploadContacts(raw: unknown, columns: SheetColumn[] = []): CleanedUpload {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_UPLOAD_ROWS) : []
  const allowed = new Set(columns.map((c) => c.key))
  const out: CleanedUpload = { contacts: [], sourceIndex: [], invalid: 0, duplicates: 0, invalidIndex: [] }
  const seen = new Map<string, number>()
  list.forEach((r: any, i) => {
    const check = cleanUploadPhone(r && typeof r === 'object' ? r.phone : undefined)
    if (!check.ok) {
      out.invalid++
      out.invalidIndex.push(i)
      return
    }
    const key = dedupeKey(check.phone)
    const name = cleanName(r.name)
    const destination = typeof r.destination === 'string' ? short(r.destination, 80) : ''
    const travelDate = typeof r.travelDate === 'string' ? normaliseTravelDate(r.travelDate) : ''
    const extra: Record<string, string> = {}
    if (r.extra && typeof r.extra === 'object' && !Array.isArray(r.extra)) {
      for (const [k, v] of Object.entries(r.extra as Record<string, unknown>).slice(0, MAX_EXTRA_COLUMNS)) {
        if (!COLUMN_KEY_RE.test(k) || (allowed.size && !allowed.has(k))) continue
        const t = short(String(v ?? ''), MAX_EXTRA_VALUE)
        if (t && !looksLikeContactDetail(t)) extra[k] = t
      }
    }
    const at = seen.get(key)
    if (at !== undefined) {
      out.duplicates++
      const c = out.contacts[at]
      if (!c.name && name) c.name = name
      return
    }
    seen.set(key, out.contacts.length)
    out.sourceIndex.push(i)
    out.contacts.push({
      name,
      phone: check.phone,
      ...(destination ? { destination } : {}),
      ...(travelDate ? { travelDate } : {}),
      ...(Object.keys(extra).length ? { extra } : {}),
    })
  })
  return out
}

/** Validate the custom column list from a request */
export function cleanColumns(raw: unknown): SheetColumn[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: SheetColumn[] = []
  for (const c of raw.slice(0, MAX_EXTRA_COLUMNS)) {
    const key = String((c as any)?.key || '')
    if (!COLUMN_KEY_RE.test(key) || seen.has(key)) continue
    seen.add(key)
    out.push({ key, label: String((c as any)?.label || key).replace(/\s+/g, ' ').trim().slice(0, 60) })
  }
  return out
}

/** Contacts → broadcast members, dropping opted-out numbers */
export function listMembers(
  contacts: (UploadContact & { contactId?: string })[],
  optedOut: Set<string> = new Set()
): { members: AudienceMember[]; optedOut: number; optedOutIndex: number[] } {
  const members: AudienceMember[] = []
  const optedOutIndex: number[] = []
  contacts.forEach((c, i) => {
    if (optedOut.has(dedupeKey(c.phone))) {
      optedOutIndex.push(i)
      return
    }
    members.push({
      refPath: '',
      phone: c.phone,
      name: c.name || '',
      ...(c.contactId ? { contactId: c.contactId } : {}),
      ...(c.destination ? { destination: c.destination } : {}),
      ...(c.travelDate ? { travelDate: c.travelDate } : {}),
      ...(c.extra && Object.keys(c.extra).length ? { extra: c.extra } : {}),
    })
  })
  return { members, optedOut: optedOutIndex.length, optedOutIndex }
}

/** "2026-11-16" in India time — the day the daily new-contact cap counts against */
export function capDay(now = Date.now()): string {
  return new Date(now + 5.5 * 3600_000).toISOString().slice(0, 10)
}

/** Sample sheet rows for the "Download sample sheet" button (fake numbers) */
export const SAMPLE_SHEET: (string | number)[][] = [
  ['Name', 'Mobile', 'Destination', 'Travel date', 'Notes'],
  ['Priya Sharma', '98765 00001', 'Bali', '12/12/2026', 'Honeymoon, 6 nights'],
  ['Rahul Verma', '+91 98765 00002', 'Dubai', '05/01/2027', 'Family of 4'],
]

/** Rows → CSV text (for the "problems" download) */
export function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n')
}
