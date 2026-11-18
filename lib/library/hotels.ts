/**
 * Hotels library — `hotels/{id}`.
 *
 * Every hotel typed into a quote (/admin/itinerary) is captured here automatically (source 'quote'); staff can also
 * add / edit hotels in /admin/hotels (source 'admin') or import them from packages (source 'package').
 * The quote builder searches this list to fill hotel rows. Later the publishable ones can become public pages
 * (that's why each hotel has a unique `slug` and an empty `seo` block) — not built yet.
 *
 * De-dup: `normalizedKey` = normalised name + "|" + normalised city. `nameKeys` holds every normalised name this
 * hotel is known by (its own + names of hotels merged into it), so quotes typed with an old spelling still land here.
 * Staff-only fields (never for public pages): notes, supplier, typicalPricePerNight.
 */
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  fillBlank, matchesWords, normaliseText, nowIso, pushRecent, slugify, stripUndefined, tidy, titleCase,
  unionImages, unionStrings, type LibraryImage, type LibrarySource, type QuoteContext,
} from './common'

export const HOTELS_COLLECTION = 'hotels'

export interface HotelSupplier {
  name: string
  phone: string
  email: string
}

export interface HotelPrice {
  min: number | null
  max: number | null
  currency: 'INR'
  note: string
}

export interface LibraryHotel {
  id: string
  name: string
  slug: string
  city: string
  destination: string
  country: string
  starRating: number | null
  category: string
  address?: string
  area?: string
  description?: string
  roomTypes: string[]
  mealPlans: string[]
  amenities: string[]
  highlights: string[]
  images: LibraryImage[]
  website?: string
  googleMapsUrl?: string
  /** Staff only */
  notes?: string
  /** Staff only (supplier / hotel sales contact — not customer data) */
  supplier?: HotelSupplier
  /** Staff only */
  typicalPricePerNight?: HotelPrice | null
  tags: string[]
  publishable: boolean
  seo: { title: string; description: string }
  usageCount: number
  lastUsedAt: string
  quoteIds: string[]
  quoteRefs: string[]
  source: LibrarySource
  createdBy: string
  createdAt: string
  updatedAt: string
  updatedBy?: string
  /** Set when a staff member saves the hotel from the admin form — quote capture then only fills blanks */
  staffEditedAt?: string
  normalizedKey: string
  nameKeys: string[]
}

export type HotelDraft = Omit<LibraryHotel, 'id' | 'usageCount' | 'lastUsedAt' | 'quoteIds' | 'quoteRefs' | 'createdAt' | 'updatedAt' | 'createdBy' | 'normalizedKey' | 'nameKeys' | 'slug'> & { slug?: string }

/* ------------------------------------------------------------------ keys & parsing */

/** Words that don't help tell hotels apart ("Hotel Taj" = "Taj Hotel") */
const NOISE = new Set(['the', 'hotel', 'hotels', 'and', 'by', 'a', 'an', 'or', 'similar'])

export function hotelNameKey(name: string): string {
  return normaliseText(name).split(' ').filter((w) => w && !NOISE.has(w)).join(' ')
}

export function hotelKey(name: string, city: string): string {
  return `${hotelNameKey(name)}|${normaliseText(city)}`
}

/** "4-Star" / "4 star" / "4★" / 4 → 4; anything else → null */
export function parseStars(v: unknown): number | null {
  if (typeof v === 'number') return v >= 1 && v <= 7 ? Math.round(v) : null
  const m = String(v ?? '').match(/([1-7])\s*(?:-|\s)?\s*(?:star|★|\*)/i)
  return m ? Number(m[1]) : null
}

/** Category label from stars / name, e.g. "4-star", "Houseboat", "Resort" */
export function guessCategory(name: string, stars: number | null, extra = ''): string {
  const s = normaliseText(`${name} ${extra}`)
  if (/\bhouseboat\b/.test(s)) return 'Houseboat'
  if (/\b(camp|tent|tents|glamping)\b/.test(s)) return 'Camp'
  if (/\bhomestay\b/.test(s)) return 'Homestay'
  if (/\bvilla\b/.test(s) && !stars) return 'Villa'
  if (stars) return `${stars}-star`
  if (/\bresort\b/.test(s)) return 'Resort'
  if (/\bcruise\b/.test(s)) return 'Cruise'
  return ''
}

export function emptyHotelDraft(partial: Partial<HotelDraft> = {}): HotelDraft {
  return {
    name: '', city: '', destination: '', country: '', starRating: null, category: '', address: '', area: '', description: '',
    roomTypes: [], mealPlans: [], amenities: [], highlights: [], images: [], website: '', googleMapsUrl: '', notes: '',
    supplier: { name: '', phone: '', email: '' }, typicalPricePerNight: { min: null, max: null, currency: 'INR', note: '' },
    tags: [], publishable: false, seo: { title: '', description: '' }, source: 'admin', ...partial,
  }
}

/** Normalise a Firestore doc into a complete LibraryHotel (old / partial docs are tolerated) */
export function toHotel(id: string, d: any): LibraryHotel {
  const arr = (v: any) => (Array.isArray(v) ? v.map((x) => tidy(x)).filter(Boolean) : [])
  return {
    id,
    name: tidy(d?.name),
    slug: tidy(d?.slug),
    city: tidy(d?.city),
    destination: tidy(d?.destination),
    country: tidy(d?.country),
    starRating: typeof d?.starRating === 'number' ? d.starRating : parseStars(d?.starRating),
    category: tidy(d?.category),
    address: tidy(d?.address),
    area: tidy(d?.area),
    description: String(d?.description || ''),
    roomTypes: arr(d?.roomTypes),
    mealPlans: arr(d?.mealPlans),
    amenities: arr(d?.amenities),
    highlights: arr(d?.highlights),
    images: unionImages(d?.images, []),
    website: tidy(d?.website),
    googleMapsUrl: tidy(d?.googleMapsUrl),
    notes: String(d?.notes || ''),
    supplier: { name: tidy(d?.supplier?.name), phone: tidy(d?.supplier?.phone), email: tidy(d?.supplier?.email) },
    typicalPricePerNight: d?.typicalPricePerNight
      ? { min: numOrNull(d.typicalPricePerNight.min), max: numOrNull(d.typicalPricePerNight.max), currency: 'INR', note: tidy(d.typicalPricePerNight.note) }
      : null,
    tags: arr(d?.tags),
    publishable: !!d?.publishable,
    seo: { title: tidy(d?.seo?.title), description: String(d?.seo?.description || '') },
    usageCount: Number(d?.usageCount) || 0,
    lastUsedAt: String(d?.lastUsedAt || ''),
    quoteIds: arr(d?.quoteIds),
    quoteRefs: arr(d?.quoteRefs),
    source: (['quote', 'admin', 'package'].includes(d?.source) ? d.source : 'admin') as LibrarySource,
    createdBy: tidy(d?.createdBy),
    createdAt: String(d?.createdAt || ''),
    updatedAt: String(d?.updatedAt || ''),
    updatedBy: tidy(d?.updatedBy),
    staffEditedAt: d?.staffEditedAt ? String(d.staffEditedAt) : undefined,
    normalizedKey: String(d?.normalizedKey || hotelKey(d?.name || '', d?.city || '')),
    nameKeys: arr(d?.nameKeys).length ? arr(d?.nameKeys) : [hotelNameKey(d?.name || '')],
  }
}

function numOrNull(v: any): number | null {
  const n = Number(v)
  return v === '' || v === null || v === undefined || !Number.isFinite(n) ? null : n
}

/* ------------------------------------------------------------------ reads */

export async function loadHotels(): Promise<LibraryHotel[]> {
  const snap = await getDocs(collection(db, HOTELS_COLLECTION))
  return snap.docs.map((d) => toHotel(d.id, d.data()))
}

export interface HotelMatch {
  hotel: LibraryHotel
  score: number
}

/**
 * In-memory search used by the builder combobox. Prefers the same city / destination, then usage.
 * Every query word must appear in name / city / area / destination.
 */
export function findHotelMatches(list: LibraryHotel[], q: string, ctx: { city?: string; destination?: string } = {}, limit = 8): HotelMatch[] {
  const qn = normaliseText(q)
  if (!qn) return []
  const city = normaliseText(ctx.city)
  const dest = normaliseText(ctx.destination)
  const out: HotelMatch[] = []
  for (const h of list) {
    const hay = `${h.name} ${h.city} ${h.area} ${h.destination} ${h.nameKeys.join(' ')}`
    if (!matchesWords(hay, qn)) continue
    const name = normaliseText(h.name)
    let score = 0
    if (name === qn) score += 100
    else if (name.startsWith(qn)) score += 50
    else if (name.includes(qn)) score += 25
    if (city && normaliseText(h.city) === city) score += 40
    if (dest && normaliseText(h.destination) === dest) score += 20
    score += Math.min(20, h.usageCount * 2)
    out.push({ hotel: h, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Library hotel for a name typed in a quote row (same name key; same city preferred) */
export function findHotelByName(list: LibraryHotel[], name: string, city = ''): LibraryHotel | null {
  const nk = hotelNameKey(name)
  if (!nk) return null
  const c = normaliseText(city)
  const cands = list.filter((h) => h.nameKeys.includes(nk) || hotelNameKey(h.name) === nk)
  return cands.find((h) => normaliseText(h.city) === c) || (!c || cands.length === 1 ? cands[0] || null : null)
}

/* ------------------------------------------------------------------ writes */

async function uniqueSlug(base: string, selfId?: string): Promise<string> {
  const root = slugify(base)
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`
    const snap = await getDocs(query(collection(db, HOTELS_COLLECTION), where('slug', '==', candidate)))
    if (snap.empty || snap.docs.every((d) => d.id === selfId)) return candidate
  }
  return `${root}-${Math.random().toString(36).slice(2, 6)}`
}

/** Look up an existing hotel for (name, city): same name key + same city, or a lone same-name hotel with a blank city */
async function findExistingHotel(name: string, city: string): Promise<LibraryHotel | null> {
  const nk = hotelNameKey(name)
  if (!nk) return null
  const snap = await getDocs(query(collection(db, HOTELS_COLLECTION), where('nameKeys', 'array-contains', nk)))
  const cands = snap.docs.map((d) => toHotel(d.id, d.data()))
  const c = normaliseText(city)
  const exact = cands.find((h) => normaliseText(h.city) === c)
  if (exact) return exact
  if (cands.length === 1 && (!c || !normaliseText(cands[0].city))) return cands[0]
  return null
}

/** What a quote knows about one hotel */
export interface QuoteHotelInput {
  name: string
  city: string
  destination: string
  starRating?: number | null
  location?: string
  roomTypes?: string[]
  mealPlans?: string[]
  highlights?: string[]
  amenities?: string[]
  images?: LibraryImage[]
  description?: string
}

/**
 * Merge quote data into an existing hotel: union lists, fill blanks, keep the richer description unless staff edited
 * it. Increments usage only once per quote (quoteIds / the quote's own libraryLinks).
 */
export function mergeQuoteIntoHotel(h: LibraryHotel, inp: QuoteHotelInput, ctx: QuoteContext): Partial<LibraryHotel> {
  const already = h.quoteIds.includes(ctx.quoteId) || (ctx.linkedIds || []).includes(h.id)
  const staff = !!h.staffEditedAt
  const desc = tidy(inp.description)
  const patch: Partial<LibraryHotel> = {
    city: fillBlank(h.city, titleCase(inp.city)),
    destination: fillBlank(h.destination, titleCase(inp.destination)),
    area: fillBlank(h.area || '', tidy(inp.location)),
    starRating: h.starRating ?? (inp.starRating || null),
    category: fillBlank(h.category, guessCategory(h.name, h.starRating ?? (inp.starRating || null), (inp.roomTypes || []).join(' '))),
    roomTypes: unionStrings(h.roomTypes, inp.roomTypes || []),
    mealPlans: unionStrings(h.mealPlans, inp.mealPlans || []),
    highlights: unionStrings(h.highlights, inp.highlights || [], 30),
    amenities: unionStrings(h.amenities, inp.amenities || [], 40),
    images: unionImages(h.images, inp.images || [], 24),
    description: !h.description ? desc : !staff && desc.length > (h.description || '').length ? desc : h.description,
    quoteIds: pushRecent(h.quoteIds, ctx.quoteId),
    quoteRefs: pushRecent(h.quoteRefs, ctx.quoteRef),
    updatedAt: nowIso(),
  }
  if (!already) {
    patch.usageCount = (h.usageCount || 0) + 1
    patch.lastUsedAt = nowIso()
  }
  return patch
}

/** Create or merge one hotel from a quote. Returns the hotel id ('' when the name is blank). */
export async function upsertHotelFromQuote(inp: QuoteHotelInput, ctx: QuoteContext): Promise<string> {
  const name = titleCase(inp.name)
  if (!hotelNameKey(name)) return ''
  const existing = await findExistingHotel(name, inp.city)
  if (existing) {
    const patch = mergeQuoteIntoHotel(existing, inp, ctx)
    if (patch.city && !existing.city) patch.normalizedKey = hotelKey(existing.name, patch.city)
    await updateDoc(doc(db, HOTELS_COLLECTION, existing.id), stripUndefined(patch) as any)
    return existing.id
  }
  const city = titleCase(inp.city)
  const stars = inp.starRating || null
  const now = nowIso()
  const data: Omit<LibraryHotel, 'id'> = {
    ...emptyHotelDraft(),
    name,
    slug: await uniqueSlug(`${name} ${city}`),
    city,
    destination: titleCase(inp.destination),
    starRating: stars,
    category: guessCategory(name, stars, (inp.roomTypes || []).join(' ')),
    area: tidy(inp.location),
    description: tidy(inp.description),
    roomTypes: unionStrings(inp.roomTypes || [], []),
    mealPlans: unionStrings(inp.mealPlans || [], []),
    highlights: unionStrings(inp.highlights || [], [], 30),
    amenities: unionStrings(inp.amenities || [], [], 40),
    images: unionImages(inp.images || [], [], 24),
    typicalPricePerNight: null,
    usageCount: 1,
    lastUsedAt: now,
    quoteIds: [ctx.quoteId],
    quoteRefs: ctx.quoteRef ? [ctx.quoteRef] : [],
    source: 'quote',
    createdBy: ctx.by,
    createdAt: now,
    updatedAt: now,
    normalizedKey: hotelKey(name, city),
    nameKeys: [hotelNameKey(name)],
  }
  const ref = await addDoc(collection(db, HOTELS_COLLECTION), stripUndefined(data))
  return ref.id
}

/** Check for a duplicate before staff create / rename a hotel */
export function findDuplicateHotel(list: LibraryHotel[], name: string, city: string, selfId?: string): LibraryHotel | null {
  const key = hotelKey(name, city)
  const nk = hotelNameKey(name)
  return list.find((h) => h.id !== selfId && (h.normalizedKey === key || (h.nameKeys.includes(nk) && normaliseText(h.city) === normaliseText(city)))) || null
}

function cleanDraft(d: HotelDraft) {
  const price = d.typicalPricePerNight
  return {
    ...d,
    name: tidy(d.name),
    city: tidy(d.city),
    destination: tidy(d.destination),
    country: tidy(d.country),
    category: tidy(d.category) || guessCategory(d.name, d.starRating),
    roomTypes: unionStrings(d.roomTypes, []),
    mealPlans: unionStrings(d.mealPlans, []),
    amenities: unionStrings(d.amenities, []),
    highlights: unionStrings(d.highlights, []),
    tags: unionStrings(d.tags, []),
    images: unionImages(d.images, []),
    typicalPricePerNight: price && (price.min || price.max || price.note) ? { min: numOrNull(price.min), max: numOrNull(price.max), currency: 'INR' as const, note: tidy(price.note) } : null,
  }
}

export async function createHotel(d: HotelDraft, by: string): Promise<string> {
  const now = nowIso()
  const c = cleanDraft(d)
  const data = {
    ...c,
    slug: await uniqueSlug(d.slug || `${c.name} ${c.city}`),
    usageCount: 0,
    lastUsedAt: '',
    quoteIds: [],
    quoteRefs: [],
    source: d.source || 'admin',
    createdBy: by,
    createdAt: now,
    updatedAt: now,
    updatedBy: by,
    staffEditedAt: d.source === 'package' ? undefined : now,
    normalizedKey: hotelKey(c.name, c.city),
    nameKeys: [hotelNameKey(c.name)],
  }
  const ref = await addDoc(collection(db, HOTELS_COLLECTION), stripUndefined(data))
  return ref.id
}

export async function updateHotel(prev: LibraryHotel, d: HotelDraft, by: string): Promise<void> {
  const c = cleanDraft(d)
  const now = nowIso()
  const wantSlug = tidy(d.slug) ? slugify(d.slug!) : prev.slug
  const slug = wantSlug && wantSlug === prev.slug ? prev.slug : await uniqueSlug(wantSlug || `${c.name} ${c.city}`, prev.id)
  const { source: _ignore, ...rest } = c
  await updateDoc(doc(db, HOTELS_COLLECTION, prev.id), stripUndefined({
    ...rest,
    slug,
    updatedAt: now,
    updatedBy: by,
    staffEditedAt: now,
    normalizedKey: hotelKey(c.name, c.city),
    nameKeys: unionStrings([hotelNameKey(c.name)], prev.nameKeys, 20),
  }) as any)
}

export async function deleteHotel(id: string) {
  await deleteDoc(doc(db, HOTELS_COLLECTION, id))
}

/** Merge `drop` into `keep` (union data, move usage + quote links, remember the old name) then delete `drop` */
export async function mergeHotels(keep: LibraryHotel, drop: LibraryHotel, by: string): Promise<void> {
  const fresh = await getDoc(doc(db, HOTELS_COLLECTION, keep.id))
  const k = fresh.exists() ? toHotel(keep.id, fresh.data()) : keep
  const longer = (a?: string, b?: string) => ((b || '').length > (a || '').length ? b || '' : a || '')
  const quoteIds = Array.from(new Set([...k.quoteIds, ...drop.quoteIds])).slice(-20)
  const shared = k.quoteIds.filter((q) => drop.quoteIds.includes(q)).length
  const patch: Partial<LibraryHotel> = {
    city: fillBlank(k.city, drop.city),
    destination: fillBlank(k.destination, drop.destination),
    country: fillBlank(k.country, drop.country),
    starRating: k.starRating ?? drop.starRating,
    category: fillBlank(k.category, drop.category),
    address: fillBlank(k.address || '', drop.address || ''),
    area: fillBlank(k.area || '', drop.area || ''),
    description: k.staffEditedAt && k.description ? k.description : longer(k.description, drop.description),
    roomTypes: unionStrings(k.roomTypes, drop.roomTypes),
    mealPlans: unionStrings(k.mealPlans, drop.mealPlans),
    amenities: unionStrings(k.amenities, drop.amenities),
    highlights: unionStrings(k.highlights, drop.highlights),
    images: unionImages(k.images, drop.images, 30),
    website: fillBlank(k.website || '', drop.website || ''),
    googleMapsUrl: fillBlank(k.googleMapsUrl || '', drop.googleMapsUrl || ''),
    notes: [k.notes, drop.notes].map((s) => tidy(s)).filter(Boolean).filter((s, i, a) => a.indexOf(s) === i).join('\n\n'),
    supplier: k.supplier?.name || k.supplier?.phone || k.supplier?.email ? k.supplier : drop.supplier,
    typicalPricePerNight: k.typicalPricePerNight || drop.typicalPricePerNight || null,
    tags: unionStrings(k.tags, drop.tags),
    publishable: k.publishable || drop.publishable,
    usageCount: Math.max(0, k.usageCount + drop.usageCount - shared),
    lastUsedAt: [k.lastUsedAt, drop.lastUsedAt].sort().pop() || '',
    quoteIds,
    quoteRefs: Array.from(new Set([...k.quoteRefs, ...drop.quoteRefs])).slice(-20),
    nameKeys: unionStrings(k.nameKeys, [...drop.nameKeys, hotelNameKey(drop.name)], 30),
    updatedAt: nowIso(),
    updatedBy: by,
  }
  await updateDoc(doc(db, HOTELS_COLLECTION, k.id), stripUndefined(patch) as any)
  await deleteDoc(doc(db, HOTELS_COLLECTION, drop.id))
}

/* ------------------------------------------------------------------ package import (one-time seed) */

export interface PackageHotelCandidate {
  key: string
  name: string
  city: string
  destination: string
  country: string
  starRating: number | null
  packages: string[]
  exists: boolean
}

/** "2N Alleppey (Houseboat) + 4N Munnar (Resort)" → ["Alleppey", "Munnar"] */
export function citiesFromBreakup(s: unknown): string[] {
  return String(s ?? '')
    .split(/[+,;|/]|\band\b|→|->/i)
    .map((x) => x.replace(/\(.*?\)/g, '').replace(/\b\d+\s*(n|nights?|d|days?)\b/gi, '').replace(/^\s*(n|nights?)\s+/i, '').trim())
    .filter((x) => x && x.length < 40 && !/^\d+$/.test(x))
}

/** Split a package's Hotel_Examples ("Taj Exotica Goa, The Leela Goa or similar") into candidate hotels */
export function hotelsFromPackages(packages: any[], existing: LibraryHotel[], destinationOf: (p: any) => { destination: string; country: string }): PackageHotelCandidate[] {
  const map = new Map<string, PackageHotelCandidate>()
  for (const p of packages) {
    const raw = String(p?.Hotel_Examples || '').trim()
    if (!raw) continue
    const where = destinationOf(p)
    const dest = tidy(where.destination)
    const cities = citiesFromBreakup(p?.Location_Breakup)
    const stars = parseStars(p?.Star_Category)
    const parts = raw.split(/[,;\n|]|\s\/\s|\bor\b/i).map((s) => s.replace(/\b(or similar|similar|etc\.?)\b/gi, '').replace(/^[\s•\-*]+|[\s.]+$/g, '').trim())
    for (let part of parts) {
      if (!part || part.length < 3 || part.length > 80) continue
      let city = ''
      const colon = part.match(/^([^:]{2,30}):\s*(.+)$/) // "Srinagar: Hotel X"
      if (colon) { city = colon[1].trim(); part = colon[2].trim() }
      if (!city) {
        const n = normaliseText(part)
        city = cities.find((c) => n.includes(normaliseText(c))) || (cities.length === 1 ? cities[0] : '')
      }
      const name = titleCase(part)
      const key = hotelKey(name, city)
      const pkgName = tidy(p?.Destination_Name) || tidy(p?.Destination_ID)
      const prev = map.get(key)
      if (prev) { if (!prev.packages.includes(pkgName)) prev.packages.push(pkgName); continue }
      map.set(key, {
        key, name, city: titleCase(city), destination: titleCase(dest), country: tidy(where.country), starRating: stars, packages: [pkgName],
        exists: !!findDuplicateHotel(existing, name, city) || existing.some((h) => h.nameKeys.includes(hotelNameKey(name)) && (!city || !h.city)),
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => Number(a.exists) - Number(b.exists) || a.destination.localeCompare(b.destination) || a.name.localeCompare(b.name))
}
