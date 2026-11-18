/**
 * Shared helpers for the Hotels & Flights library (client-safe, no Firestore here).
 * Collections: `hotels` (lib/library/hotels.ts) and `flights` (lib/library/flights.ts).
 */

export type LibrarySource = 'quote' | 'admin' | 'package'

export interface LibraryImage {
  url: string
  caption?: string
}

/** Lowercase, strip accents + punctuation, collapse spaces: "Le Méridien, Kochi!" → "le meridien kochi" */
export function normaliseText(s: unknown): string {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Tidy spacing / capitalisation of a free-typed name without changing the words */
export function tidy(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim()
}

/** "kashmir valley" → "Kashmir Valley" (only used when the input is all lower case) */
export function titleCase(s: string): string {
  const t = tidy(s)
  if (!t || t !== t.toLowerCase()) return t
  return t.replace(/\b([a-z])/g, (m) => m.toUpperCase())
}

export function slugify(s: string): string {
  return normaliseText(s).replace(/\s+/g, '-').slice(0, 80) || 'item'
}

/** Case-insensitive union that keeps the first spelling seen and drops blanks */
export function unionStrings(a: unknown, b: unknown, max = 50): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const t = tidy(v)
    const k = normaliseText(t)
    if (!t || !k || seen.has(k)) continue
    seen.add(k)
    out.push(t)
    if (out.length >= max) break
  }
  return out
}

/** Union of images by URL; drops data: URLs (never stored in Firestore) */
export function unionImages(a: unknown, b: unknown, max = 24): LibraryImage[] {
  const out: LibraryImage[] = []
  const seen = new Set<string>()
  for (const raw of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const url = tidy(typeof raw === 'string' ? raw : (raw as any)?.url)
    if (!url || url.startsWith('data:') || seen.has(url)) continue
    seen.add(url)
    const caption = tidy((raw as any)?.caption)
    out.push(caption ? { url, caption } : { url })
    if (out.length >= max) break
  }
  return out
}

/** Keep the most recent `max` ids, newest last, without duplicates */
export function pushRecent(list: unknown, id: string, max = 20): string[] {
  const arr = (Array.isArray(list) ? list : []).map(String).filter((x) => x && x !== id)
  if (id) arr.push(id)
  return arr.slice(-max)
}

/** Use `next` only when `current` is blank (never overwrite what staff typed with an emptier / different value) */
export function fillBlank<T>(current: T, next: T): T {
  const blank = current === undefined || current === null || (typeof current === 'string' && !current.trim())
  const nextBlank = next === undefined || next === null || (typeof next === 'string' && !String(next).trim())
  return blank && !nextBlank ? next : current
}

/** Firestore rejects `undefined`: drop undefined keys (shallow + nested plain objects) */
export function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map((v) => stripUndefined(v)) as any
  if (obj && typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype) {
    const out: any = {}
    for (const [k, v] of Object.entries(obj as any)) if (v !== undefined) out[k] = stripUndefined(v)
    return out
  }
  return obj
}

export const nowIso = () => new Date().toISOString()

/** Simple scored search: every query word must appear somewhere in the haystack */
export function matchesWords(haystack: string, query: string): boolean {
  const words = normaliseText(query).split(' ').filter(Boolean)
  if (!words.length) return true
  const h = ' ' + normaliseText(haystack) + ' '
  return words.every((w) => h.includes(w))
}

export interface QuoteContext {
  quoteId: string
  quoteRef: string
  by: string
  /** Library ids this quote already counted (customer_itineraries.libraryLinks) — re-saves don't double count */
  linkedIds?: string[]
}
