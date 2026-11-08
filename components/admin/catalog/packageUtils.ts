/**
 * Pure helpers for the package editor: auto-derived fields, normalisation, validation,
 * Firestore payload building and public URLs. Kept free of React so pages and the import
 * modal share exactly the same rules.
 */
import { deleteField } from 'firebase/firestore'
import type { DestinationRecord, ItineraryDay, PackageDraft, PackageRecord } from './types'

export const slugify = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

/** Sanitise while typing (keeps a trailing dash so "bali-" can become "bali-escape"). */
export const slugTyping = (s: string) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')

export const toNum =(v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

export const formatIN = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

/** "5N / 6D" — the site parses nights with /(\d+)\s*N/i, so keep this shape. */
export const durationLabel = (nights: number) => `${nights}N / ${nights + 1}D`

export function nightsFrom(p: PackageDraft): number | undefined {
  const n = toNum(p.Duration_Nights)
  if (n !== undefined) return n
  const d = String(p.Duration || '')
  const m = d.match(/(\d+)\s*N/i) || d.match(/(\d+)\s*Night/i)
  if (m) return Number(m[1])
  const days = toNum(p.Duration_Days)
  return days ? Math.max(days - 1, 0) : undefined
}

/** First number in a price string, e.g. "₹95,000 – ₹1,10,000" → 95000 */
export function firstPrice(v: unknown): number | undefined {
  if (typeof v === 'number') return v
  const m = String(v || '').match(/\d[\d,]*/)
  if (!m) return undefined
  const n = Number(m[0].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * The public site strips every non-digit from Price_Range_INR and shows the result as "₹X",
 * so a range like "₹50,000 – ₹70,000" renders as a garbage number. Always store the "from" price only.
 */
export function priceRangeLabel(min?: number, max?: number) {
  const v = min ?? max
  return v ? formatIN(v) : ''
}

// ---------- list <-> string helpers ----------

export const splitList = (v: unknown, sep: RegExp = /\r?\n|,/): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  return String(v || '')
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean)
}

export function itineraryString(days: ItineraryDay[]) {
  return days
    .filter((d) => d.title?.trim())
    .map((d, i) => `Day ${i + 1}: ${d.title.trim()}`)
    .join(' | ')
}

export function parseItineraryString(s: string): ItineraryDay[] {
  if (!s?.trim()) return []
  return s
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((item, i) => {
      const m = item.match(/Day\s*\d+\s*[:\-–]\s*(.+)/i)
      return { day: i + 1, title: (m ? m[1] : item).trim(), description: '', activities: [] }
    })
}

/** Days shown in the itinerary editor (structured list wins; falls back to the old "Day 1: … | Day 2: …" text). */
export function itineraryRows(p: PackageDraft): ItineraryDay[] {
  const details = Array.isArray(p.Day_Wise_Itinerary_Details) ? p.Day_Wise_Itinerary_Details : []
  if (details.length) {
    return details.map((d: any, i) => ({
      day: i + 1,
      title: String(d.title ?? d.Title ?? d.Day_Title ?? ''),
      description: String(d.description ?? d.Description ?? ''),
      activities: Array.isArray(d.activities) ? d.activities.map(String) : splitList(d.activities ?? d.Activities, /\r?\n/),
    }))
  }
  return parseItineraryString(String(p.Day_Wise_Itinerary || ''))
}

// ---------- tags ----------

export type TagField = 'Mood' | 'Occasion' | 'Travel_Type' | 'Theme' | 'Budget_Category' | 'Adventure_Level' | 'Star_Category' | 'Meal_Plan' | 'Stay_Type'

export interface TagConfig {
  field: TagField
  label: string
  hint?: string
  multi: boolean
  /** How multiple values are joined in Firestore (the site splits on this) */
  joiner: string
  splitter: RegExp
  defaults: string[]
}

export const TAGS: Record<TagField, TagConfig> = {
  Mood: { field: 'Mood', label: 'Mood', multi: false, joiner: '', splitter: /$^/, defaults: ['Romantic', 'Relax', 'Explore', 'Adventure', 'Luxury'] },
  Occasion: { field: 'Occasion', label: 'Occasion', hint: 'Drives the homepage occasion rails (Honeymoon, Anniversary…)', multi: true, joiner: ', ', splitter: /\s*,\s*/, defaults: ['Honeymoon', 'Anniversary', 'Babymoon', 'Proposal', 'Birthday', 'Family Vacation'] },
  Travel_Type: { field: 'Travel_Type', label: 'Travel type', multi: true, joiner: ' / ', splitter: /\s*\/\s*/, defaults: ['Couple', 'Family', 'Friends', 'Solo', 'Small Group'] },
  Theme: { field: 'Theme', label: 'Theme', multi: true, joiner: ' / ', splitter: /\s*\/\s*/, defaults: ['Beach', 'Culture', 'Nature', 'Mountains', 'Wildlife', 'City', 'Relax'] },
  Budget_Category: { field: 'Budget_Category', label: 'Budget', multi: false, joiner: '', splitter: /$^/, defaults: ['Economy', 'Mid', 'Premium', 'Luxury'] },
  Adventure_Level: { field: 'Adventure_Level', label: 'Adventure level', multi: false, joiner: '', splitter: /$^/, defaults: ['Light', 'Moderate', 'High'] },
  Star_Category: { field: 'Star_Category', label: 'Hotel category', multi: false, joiner: '', splitter: /$^/, defaults: ['3-Star', '4-Star', '5-Star'] },
  Meal_Plan: { field: 'Meal_Plan', label: 'Meal plan', multi: false, joiner: '', splitter: /$^/, defaults: ['Breakfast Only', 'Half Board', 'Full Board', 'All Inclusive'] },
  Stay_Type: { field: 'Stay_Type', label: 'Stay type', multi: false, joiner: '', splitter: /$^/, defaults: ['Hotel', 'Resort', 'Villa', 'Houseboat', 'Homestay'] },
}

export function tagValues(cfg: TagConfig, v: unknown): string[] {
  const s = String(v ?? '').trim()
  if (!s) return []
  return cfg.multi ? s.split(cfg.splitter).map((x) => x.trim()).filter(Boolean) : [s]
}

export type TagSuggestions = Partial<Record<TagField, string[]>>

/** Values that already exist in the data (most used first), merged with sensible defaults. */
export function computeSuggestions(pkgs: PackageDraft[]): TagSuggestions {
  const out: TagSuggestions = {}
  ;(Object.keys(TAGS) as TagField[]).forEach((f) => {
    const cfg = TAGS[f]
    const counts = new Map<string, { label: string; n: number }>()
    pkgs.forEach((p) =>
      tagValues(cfg, p[f]).forEach((v) => {
        const key = v.toLowerCase()
        const cur = counts.get(key)
        if (cur) cur.n++
        else counts.set(key, { label: v, n: 1 })
      }),
    )
    const fromData = Array.from(counts.values()).sort((a, b) => b.n - a.n).map((x) => x.label)
    const seen = new Set(fromData.map((x) => x.toLowerCase()))
    out[f] = [...fromData, ...cfg.defaults.filter((d) => !seen.has(d.toLowerCase()))].slice(0, 24)
  })
  return out
}

// ---------- derive on change ----------

/** Apply a patch and recompute fields that are derived from it. */
export function applyDerived(prev: PackageDraft, patch: PackageDraft): PackageDraft {
  const next: PackageDraft = { ...prev, ...patch }
  if ('Duration_Nights' in patch) {
    const n = toNum(patch.Duration_Nights)
    if (n !== undefined) {
      next.Duration_Nights = n
      next.Duration_Days = n + 1
      next.Duration = durationLabel(n)
    } else {
      delete next.Duration_Nights
    }
  }
  if ('Price_Min_INR' in patch || 'Price_Max_INR' in patch) {
    const min = toNum(next.Price_Min_INR)
    const max = toNum(next.Price_Max_INR)
    next.Price_Range_INR = priceRangeLabel(min, max)
  }
  if ('Day_Wise_Itinerary_Details' in patch) {
    next.Day_Wise_Itinerary = itineraryString(patch.Day_Wise_Itinerary_Details || [])
  }
  return next
}

/** Clean up a Firestore doc for the editor (numbers as numbers, trimmed tags, prices pre-filled). */
export function normalizeForEdit(p: PackageDraft): PackageDraft {
  const out: PackageDraft = { ...p }
  ;(['Price_Min_INR', 'Price_Max_INR', 'Duration_Nights', 'Duration_Days'] as const).forEach((k) => {
    const n = toNum(out[k])
    if (n === undefined) delete out[k]
    else out[k] = n
  })
  if (out.Duration_Nights === undefined) {
    const n = nightsFrom(out)
    if (n !== undefined) out.Duration_Nights = n
  }
  if (out.Price_Min_INR === undefined) {
    const n = firstPrice(out.Price_Range_INR)
    if (n !== undefined) out.Price_Min_INR = n
  }
  ;(Object.keys(TAGS) as TagField[]).forEach((f) => {
    if (typeof out[f] === 'string') (out as any)[f] = (out[f] as string).trim()
  })
  return out
}

// ---------- validation ----------

export type FormErrors = Partial<Record<keyof PackageRecord | '_destination', string>>

export function validatePackage(
  p: PackageDraft,
  others: Array<Pick<PackageDraft, 'id' | 'Destination_ID' | 'Slug'>> = [],
): FormErrors {
  const e: FormErrors = {}
  if (!String(p.Destination_Name || '').trim()) e.Destination_Name = 'Give the package a name — this is the title customers see.'
  const code = String(p.Destination_ID || '').trim()
  if (!code) e.Destination_ID = 'A package code is needed (e.g. BAL_007). Pick a destination to generate one.'
  else if (/\s/.test(code)) e.Destination_ID = 'The package code cannot contain spaces — use underscores, e.g. BAL_007.'
  else if (others.some((o) => o.id !== p.id && String(o.Destination_ID || '').toLowerCase() === code.toLowerCase()))
    e.Destination_ID = `Another package already uses the code "${code}".`
  const nights = toNum(p.Duration_Nights)
  if (nights === undefined || nights < 1) e.Duration_Nights = 'How many nights is the trip?'
  const min = toNum(p.Price_Min_INR)
  const max = toNum(p.Price_Max_INR)
  if (min === undefined && !String(p.Price_Range_INR || '').trim()) e.Price_Min_INR = 'Add a starting price so the site can show "From ₹…".'
  if (min !== undefined && max !== undefined && max < min) e.Price_Max_INR = '"Price up to" should be higher than the starting price.'
  if (!String(p.Primary_Image_URL || '').trim()) e.Primary_Image_URL = 'Add a main photo — packages without one look broken on the site.'
  const slug = String(p.Slug || '').trim()
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) e.Slug = 'Use only lowercase letters, numbers and dashes.'
  else if (slug && others.some((o) => o.id !== p.id && String(o.Slug || '').toLowerCase() === slug))
    e.Slug = 'Another package already uses this web address.'
  return e
}

/** Which form tab each error lives on, so the form can jump there. */
export const ERROR_TAB: Partial<Record<string, string>> = {
  Destination_Name: 'basics',
  Destination_ID: 'basics',
  Duration_Nights: 'basics',
  Price_Min_INR: 'basics',
  Price_Max_INR: 'basics',
  Primary_Image_URL: 'basics',
  Slug: 'seo',
}

// ---------- save ----------

const hasText = (d: ItineraryDay) => !!(d.description?.trim() || d.activities?.some((a) => a.trim()))

/**
 * Build the Firestore payload. Writes the same field names the site reads, fills auto fields
 * (Duration, Price_Range_INR, Day_Wise_Itinerary text, SEO defaults, Meta image, Last_Updated, Created_By).
 */
export function buildPackagePayload(
  draft: PackageDraft,
  opts: { isNew: boolean; userEmail?: string | null; original?: PackageDraft | null },
): Record<string, any> {
  const { id: _id, ...rest } = draft as any
  const p: Record<string, any> = { ...rest }

  p.Destination_ID = String(p.Destination_ID || '').trim()
  p.Destination_Name = String(p.Destination_Name || '').trim()

  // Duration
  const nights = toNum(p.Duration_Nights)
  if (nights !== undefined) {
    p.Duration_Nights = nights
    p.Duration_Days = nights + 1
    p.Duration = durationLabel(nights)
  }

  // Price
  const min = toNum(p.Price_Min_INR)
  const max = toNum(p.Price_Max_INR)
  if (min !== undefined) p.Price_Min_INR = min
  else if (!opts.isNew) p.Price_Min_INR = deleteField()
  else delete p.Price_Min_INR
  if (max !== undefined) p.Price_Max_INR = max
  else if (!opts.isNew) p.Price_Max_INR = deleteField()
  else delete p.Price_Max_INR
  if (min !== undefined || max !== undefined) p.Price_Range_INR = priceRangeLabel(min, max)

  // Itinerary — one structured list in the editor, both formats on save
  const days = itineraryRows(draft).filter((d) => d.title.trim() || hasText(d))
  if (days.length) {
    p.Day_Wise_Itinerary = itineraryString(days)
    if (days.some(hasText)) {
      p.Day_Wise_Itinerary_Details = days.map((d, i) => ({
        day: i + 1,
        title: d.title.trim(),
        description: d.description.trim(),
        activities: d.activities.map((a) => a.trim()).filter(Boolean),
      }))
    } else if (Array.isArray(opts.original?.Day_Wise_Itinerary_Details) && opts.original!.Day_Wise_Itinerary_Details!.length) {
      p.Day_Wise_Itinerary_Details = []
    } else {
      delete p.Day_Wise_Itinerary_Details
    }
  } else if (Array.isArray(p.Day_Wise_Itinerary_Details)) {
    p.Day_Wise_Itinerary_Details = []
    p.Day_Wise_Itinerary = ''
  }

  // Lists
  if (Array.isArray(p.Highlights)) p.Highlights = p.Highlights.map((x: string) => String(x).trim()).filter(Boolean)
  ;(['Inclusions', 'Exclusions'] as const).forEach((k) => {
    if (Array.isArray(p[k])) {
      const items = p[k].map((x: string) => String(x).trim()).filter(Boolean)
      // The site accepts arrays or comma-strings; keep the original shape (new packages: arrays, so items may contain commas).
      p[k] = opts.isNew || Array.isArray(opts.original?.[k]) ? items : items.join(', ')
    }
  })
  ;(['Guest_Reviews', 'FAQ_Items', 'Why_Book_With_Us'] as const).forEach((k) => {
    if (Array.isArray(p[k])) p[k] = p[k].filter((row: any) => Object.values(row || {}).some((v) => String(v ?? '').trim()))
  })
  if (p.Booking_Policies && typeof p.Booking_Policies === 'object') {
    const bp: Record<string, string[]> = {}
    ;(['booking', 'payment', 'cancellation'] as const).forEach((k) => {
      const items = splitList(p.Booking_Policies[k], /\r?\n/)
      if (items.length) bp[k] = items
    })
    p.Booking_Policies = bp
  }

  // Images & SEO defaults
  if (p.Gallery_Images !== undefined) p.Gallery_Images = cleanGallery(p.Gallery_Images)
  if (p.Primary_Image_URL && !String(p.Meta_Image_URL || '').trim()) p.Meta_Image_URL = p.Primary_Image_URL
  if (opts.isNew && !String(p.Slug || '').trim()) p.Slug = slugify(p.Destination_Name)
  if (!String(p.SEO_Title || '').trim()) p.SEO_Title = suggestSeoTitle(draft)
  if (!String(p.SEO_Description || '').trim() && p.Overview) p.SEO_Description = suggestSeoDescription(draft)

  // Automatic bookkeeping
  p.Last_Updated = new Date().toISOString().split('T')[0]
  p.Created_By = String(opts.original?.Created_By || '') || opts.userEmail || 'Admin'

  Object.keys(p).forEach((k) => {
    if (p[k] === undefined || k.startsWith('_')) delete p[k]
  })
  return p
}

/** Gallery URLs as saved: trimmed, http(s) only, no duplicates. */
export function cleanGallery(v: unknown): string[] {
  const list = Array.isArray(v) ? v : splitList(v, /\r?\n/)
  const out: string[] = []
  list.forEach((u) => {
    const url = packageImage(String(u ?? ''))
    if (/^https?:\/\//i.test(url) && !out.includes(url)) out.push(url)
  })
  return out
}

/** `base` made unique against every package's Slug (adds -2, -3 …). */
export function uniqueSlug(base: string, pkgs: Array<Pick<PackageDraft, 'id' | 'Slug'>>, selfId?: string): string {
  const root = slugify(base) || 'package'
  const taken = new Set(pkgs.filter((p) => !selfId || p.id !== selfId).map((p) => String(p.Slug || '').toLowerCase()).filter(Boolean))
  if (!taken.has(root)) return root
  for (let i = 2; i < 500; i++) {
    const s = `${root.slice(0, 76)}-${i}`
    if (!taken.has(s)) return s
  }
  return `${root.slice(0, 70)}-${Date.now().toString(36)}`
}

export function suggestSeoTitle(p: PackageDraft) {
  const n = toNum(p.Duration_Nights) ?? nightsFrom(p)
  const name = String(p.Destination_Name || '').trim()
  if (!name) return ''
  return n ? `${name} | ${n} Nights ${n + 1} Days Package` : `${name} | Travelzada`
}

export function suggestSeoDescription(p: PackageDraft) {
  const s = String(p.Overview || '').replace(/\s+/g, ' ').trim()
  return s.length > 155 ? s.slice(0, 152).replace(/\s+\S*$/, '') + '…' : s
}

// ---------- codes, destinations & URLs ----------

export const codePrefix = (code: string) => String(code || '').split('_')[0].toUpperCase()

export function prefixForDestination(dest: DestinationRecord | undefined, pkgs: PackageDraft[]): string {
  if (!dest) return ''
  const ids = (dest.packageIds || []).length ? dest.packageIds! : pkgs.filter((p) => autoMatches(dest, p)).map((p) => String(p.Destination_ID || ''))
  const counts = new Map<string, number>()
  ids.forEach((id) => {
    const pre = codePrefix(id)
    if (pre) counts.set(pre, (counts.get(pre) || 0) + 1)
  })
  const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]
  if (best) return best[0]
  return String(dest.name || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'PKG'
}

export function nextPackageCode(prefix: string, pkgs: PackageDraft[]): string {
  const pre = prefix.toUpperCase()
  let max = 0
  pkgs.forEach((p) => {
    const id = String(p.Destination_ID || '').toUpperCase()
    if (!id.startsWith(pre + '_')) return
    const m = id.match(/(\d+)\s*$/)
    if (m) max = Math.max(max, Number(m[1]))
  })
  return `${pre}_${String(max + 1).padStart(3, '0')}`
}

/** Mirrors the site's fallback when a destination has no packageIds (app/destinations/[slug]/page.tsx). */
export function autoMatches(dest: DestinationRecord, p: PackageDraft): boolean {
  const key = decodeURIComponent(String(dest.slug || dest.name || '')).toLowerCase()
  if (!key) return false
  const name = String(p.Destination_Name || '').toLowerCase()
  const id = String(p.Destination_ID || '').toLowerCase()
  return (!!name && (name.includes(key) || key.includes(name))) || id.includes(key)
}

/** Packages that the public destination page will list. */
export function packagesForDestination(dest: DestinationRecord, pkgs: PackageDraft[]): PackageDraft[] {
  const ids = dest.packageIds || []
  if (ids.length) return pkgs.filter((p) => ids.includes(String(p.Destination_ID || '')))
  return pkgs.filter((p) => autoMatches(dest, p))
}

/** The destination a package belongs to: explicit link first, then name match. */
export function destinationOf(p: PackageDraft, dests: DestinationRecord[]): DestinationRecord | undefined {
  const code = String(p.Destination_ID || '')
  return dests.find((d) => (d.packageIds || []).includes(code)) || dests.find((d) => !(d.packageIds || []).length && autoMatches(d, p))
}

/** Copy of getCanonicalDestinationSlug in app/destinations/[slug]/[packageId]/page.tsx */
export function canonicalDestinationSlug(p: PackageDraft): string {
  const prefixMap: Record<string, string> = {
    BAL: 'bali-packages', KER: 'kerala-packages', GOA: 'goa-packages', KASH: 'kashmir-packages', RAJ: 'rajasthan-packages',
    THAI: 'thailand-packages', VIET: 'vietnam-packages', DUBAI: 'dubai-packages', MAL: 'maldives-packages', EUR: 'europe-packages',
    LAD: 'ladakh-packages', AND: 'andaman-and-nicobar-packages', BAKU: 'baku-packages', SING: 'singapore-packages',
  }
  const pre = codePrefix(String(p.Destination_ID || ''))
  if (prefixMap[pre]) return prefixMap[pre]
  const base = String(p.Destination_Name || '').toLowerCase().split(' ')[0].replace(/[^a-z0-9-]/g, '')
  if (base === 'andaman') return 'andaman-and-nicobar-packages'
  if (base === 'sri') return 'sri-lanka-packages'
  return base ? `${base}-packages` : 'packages'
}

export function packageSiteUrl(p: PackageDraft): string {
  const last = String(p.Slug || p.Destination_ID || p.id || '')
  return `/destinations/${canonicalDestinationSlug(p)}/${encodeURIComponent(last)}`
}

export function packageImage(url?: string) {
  return String(url || '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
}

/** What still needs doing before a package looks good on the site. */
export function packageGaps(p: PackageDraft): string[] {
  const g: string[] = []
  if (!packageImage(p.Primary_Image_URL)) g.push('photo')
  if (!String(p.Price_Range_INR || '').trim() && toNum(p.Price_Min_INR) === undefined) g.push('price')
  if (!itineraryRows(p).length) g.push('itinerary')
  if (!String(p.Overview || '').trim()) g.push('overview')
  return g
}
