/**
 * "Compare my itinerary": types, structured-output schemas and prompts.
 *
 * Flow (see app/api/planner/itinerary/analyze/route.ts):
 *   A. extract  — read the traveller's PDF / photo / pasted text into `ItineraryExtraction` (only what is written)
 *   B. match    — score our catalog against the extraction (lib/planner/catalog.ts), keep the top 3
 *   C. compare  — Claude picks the best package and classifies EVERY extracted item as included / similar / not_included
 *
 * Types in this file are safe to import from client components (`import type`).
 */
import { S } from './ai'

// ---------------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------------

export type YesNoUnknown = 'yes' | 'no' | 'unknown'

export interface ExtractedHotel {
  city: string | null
  name: string | null
  stars: number | null
  nights: number | null
  roomType: string | null
  mealPlan: string | null
}

export interface ExtractedDay {
  day: number
  title: string
  items: string[]
}

export interface ItineraryExtraction {
  isItinerary: boolean
  notItineraryReason: string | null
  confidence: 'low' | 'medium' | 'high'
  title: string | null
  agency: string | null
  customerName: string | null
  destinations: string[]
  /** Which Travelzada destinations (from the list we pass) this trip covers */
  catalogDestinations: string[]
  country: string | null
  nights: number | null
  daysCount: number | null
  startDate: string | null
  endDate: string | null
  travelDatesText: string | null
  adults: number | null
  children: number | null
  travellersText: string | null
  occasion: string | null
  price: {
    total: number | null
    perPerson: number | null
    currency: string | null
    text: string | null
  }
  hotels: ExtractedHotel[]
  days: ExtractedDay[]
  inclusions: string[]
  exclusions: string[]
  flightsIncluded: YesNoUnknown
  visaIncluded: YesNoUnknown
  notes: string[]
}

export type ItemKind = 'day' | 'hotel' | 'inclusion' | 'flight' | 'visa'
export type ItemStatus = 'included' | 'similar' | 'not_included'

/** One thing from their itinerary that we compare against our package */
export interface CompareItem {
  id: string
  kind: ItemKind
  day: number | null
  label: string
}

export interface ClassifiedItem extends CompareItem {
  status: ItemStatus
  /** included → where our package has it; similar → what we offer instead; not_included → null or a short hint */
  ourOffer: string | null
  /** Only when obvious, e.g. "Usually ₹2,000–3,000 per person". Never invented. */
  estimatedExtras: string | null
}

export type CompareStatus = 'match' | 'partial' | 'no_match'

export interface ItineraryComparison {
  status: CompareStatus
  bestPackageId: string | null
  matchPercent: number
  summary: string
  highlights: string[]
  items: ClassifiedItem[]
  alternativesNote: string | null
  alternativeIds: string[]
}

export interface PackageLite {
  id: string
  name: string
  destination: string
  nights: number
  pricePerPerson: number
  starLabel: string
  image: string
  url: string
  score?: number
}

export interface AnalyzeResponse {
  activityId: string | null
  extraction: ItineraryExtraction
  comparison: ItineraryComparison
  bestPackage: PackageLite | null
  alternatives: PackageLite[]
  fileUrl: string | null
}

export interface Addition {
  id: string
  item: string
  kind: ItemKind
  day: number | null
  status: ItemStatus
  ourOffer: string | null
}

// ---------------------------------------------------------------------------------------------------------------------
// Schemas (structured outputs: every object lists all keys as required, no extra keys)
// ---------------------------------------------------------------------------------------------------------------------

const yesNo = (d: string) => S.enum(['yes', 'no', 'unknown'], d)

/**
 * Structured outputs allow only 16 nullable (union-typed) fields per schema, so the extraction schema uses
 * "" / 0 for "not written" and `normaliseExtraction` turns those back into null.
 */
const U = {
  str: (d?: string) => S.str(`${d ? d + '. ' : ''}Empty string "" if not written.`),
  num: (d?: string) => S.num(`${d ? d + '. ' : ''}0 if not written.`),
}

const nStr = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
  return s && !/^(null|n\/a|na|none|unknown|-)$/i.test(s) ? s : null
}
const nNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}
const nArr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : [])
const nYes = (v: unknown): YesNoUnknown => (v === 'yes' || v === 'no' ? v : 'unknown')

/** Raw model output ("" / 0 = not written) → clean `ItineraryExtraction` with nulls */
export function normaliseExtraction(raw: any): ItineraryExtraction {
  const r = raw && typeof raw === 'object' ? raw : {}
  const p = r.price && typeof r.price === 'object' ? r.price : {}
  const date = (v: unknown) => {
    const s = nStr(v)
    return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
  }
  return {
    isItinerary: r.isItinerary !== false,
    notItineraryReason: nStr(r.notItineraryReason),
    confidence: r.confidence === 'low' || r.confidence === 'high' ? r.confidence : 'medium',
    title: nStr(r.title),
    agency: nStr(r.agency),
    customerName: nStr(r.customerName),
    destinations: nArr(r.destinations).slice(0, 12),
    catalogDestinations: nArr(r.catalogDestinations).slice(0, 4),
    country: nStr(r.country),
    nights: nNum(r.nights),
    daysCount: nNum(r.daysCount),
    startDate: date(r.startDate),
    endDate: date(r.endDate),
    travelDatesText: nStr(r.travelDatesText),
    adults: nNum(r.adults),
    children: nNum(r.children),
    travellersText: nStr(r.travellersText),
    occasion: nStr(r.occasion),
    price: { total: nNum(p.total), perPerson: nNum(p.perPerson), currency: nStr(p.currency)?.toUpperCase() || null, text: nStr(p.text) },
    hotels: (Array.isArray(r.hotels) ? r.hotels : []).slice(0, 12).map((h: any) => ({
      city: nStr(h?.city), name: nStr(h?.name), stars: nNum(h?.stars), nights: nNum(h?.nights), roomType: nStr(h?.roomType), mealPlan: nStr(h?.mealPlan),
    })).filter((h: ExtractedHotel) => h.name || h.city),
    days: (Array.isArray(r.days) ? r.days : []).slice(0, 20).map((d: any, i: number) => ({
      day: nNum(d?.day) || i + 1,
      title: nStr(d?.title) || `Day ${i + 1}`,
      items: nArr(d?.items).slice(0, 15),
    })),
    inclusions: nArr(r.inclusions).slice(0, 30),
    exclusions: nArr(r.exclusions).slice(0, 30),
    flightsIncluded: nYes(r.flightsIncluded),
    visaIncluded: nYes(r.visaIncluded),
    notes: nArr(r.notes).slice(0, 5),
  }
}

export const EXTRACTION_SCHEMA = S.obj({
  isItinerary: S.bool('true only if this is a travel itinerary / holiday quote / tour plan'),
  notItineraryReason: U.str('If isItinerary is false: one short, friendly sentence on what the file seems to be.'),
  confidence: S.enum(['low', 'medium', 'high'], 'How clearly the document could be read'),
  title: U.str('Package / quote title as written'),
  agency: U.str('Travel agency or sender name if visible (logo, footer, signature)'),
  customerName: U.str('Traveller name if written, e.g. "Mr. Sharma"'),
  destinations: S.arr(S.str(), 'Cities / places visited, in order, as written'),
  catalogDestinations: S.arr(S.str(), 'Which of the given Travelzada destinations this trip covers (exact names from the list). Empty if none.'),
  country: U.str(),
  nights: U.num('Total nights'),
  daysCount: U.num('Total days'),
  startDate: U.str('YYYY-MM-DD if a full date is written'),
  endDate: U.str('YYYY-MM-DD if a full date is written'),
  travelDatesText: U.str('Travel dates exactly as written, e.g. "1 March 2026"'),
  adults: U.num(),
  children: U.num(),
  travellersText: U.str('Travellers as written, e.g. "2 Adults"'),
  occasion: U.str('honeymoon / anniversary / birthday etc. only if written'),
  price: S.obj({
    total: U.num('Total quoted price as a plain number'),
    perPerson: U.num('Per-person price as a plain number'),
    currency: U.str('ISO code, e.g. INR, USD, AED'),
    text: U.str('Price exactly as written, including taxes notes'),
  }),
  hotels: S.arr(
    S.obj({
      city: U.str(),
      name: U.str(),
      stars: U.num(),
      nights: U.num(),
      roomType: U.str(),
      mealPlan: U.str('e.g. Breakfast, Half board, All meals'),
    }),
  ),
  days: S.arr(
    S.obj({
      day: S.num(),
      title: S.str('Short day title'),
      items: S.arr(S.str(), 'Each activity / sightseeing / transfer / meal as its own short item (max ~10 words)'),
    }),
  ),
  inclusions: S.arr(S.str(), 'Inclusions as listed, one per item, short'),
  exclusions: S.arr(S.str(), 'Exclusions as listed, one per item, short'),
  flightsIncluded: yesNo('Are flights included in the price?'),
  visaIncluded: yesNo('Is the visa included in the price?'),
  notes: S.arr(S.str(), 'Other important terms (cancellation, validity, payment), max 5'),
})

export const COMPARISON_SCHEMA = S.obj({
  status: S.enum(['match', 'partial', 'no_match'], 'match: same destination and most things covered; partial: same destination, notable gaps; no_match: we do not sell this destination'),
  bestPackageId: S.strOrNull('id of the best candidate package, null when no_match'),
  matchPercent: S.num('0–100, honest overlap between their itinerary and our best package'),
  summary: S.str('2–3 honest, warm sentences in simple English, addressed to the traveller ("you")'),
  highlights: S.arr(S.str(), 'Up to 5 things our package adds that theirs does not, each short. Empty if none.'),
  items: S.arr(
    S.obj({
      id: S.str('The item id exactly as given'),
      status: S.enum(['included', 'similar', 'not_included']),
      ourOffer: S.strOrNull('included: where we have it (e.g. "Day 2 – Ubud tour"); similar: what we offer instead; not_included: null'),
      estimatedExtras: S.strOrNull('Only for not_included and only if the cost is obvious and well known, e.g. "Usually ₹2,500–3,500 per person". Otherwise null.'),
    }),
  ),
  alternativesNote: S.strOrNull('When no_match: one kind sentence suggesting the closest options we do have. Else null.'),
  alternativeIds: S.arr(S.str(), 'ids of other candidates worth showing (max 2)'),
})

// ---------------------------------------------------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------------------------------------------------

export function extractionSystem(catalogDestinations: string[]): string {
  return `You read travel itineraries and holiday quotes that Indian couples received from other travel agencies or friends, and turn them into clean structured data.

Rules:
- Extract ONLY what is actually written in the document. Never guess, never invent, never fill gaps with typical values. Use null / empty arrays when something is not there.
- Keep every item short and in simple English (translate if the document is in another language).
- For each day, list every activity, sightseeing stop, transfer and meal as a separate short item, e.g. "Desert safari with BBQ dinner", "Airport to hotel transfer (private)", "Burj Khalifa 124th floor entry".
- Prices: plain numbers without commas or symbols. Note the currency. If a price is "per couple", put it in total only if that is the full trip price for the travellers listed.
- Hotels: one entry per hotel stay. Stars only if written or clearly stated ("4*", "4 Star").
- flightsIncluded / visaIncluded: "yes" only if the price clearly includes them, "no" if clearly excluded, otherwise "unknown".
- catalogDestinations: choose from this list of Travelzada destinations ONLY (exact spelling), based on where the trip actually goes: ${catalogDestinations.length ? catalogDestinations.join(', ') : '(none)'}. For example Srinagar / Gulmarg / Pahalgam → Kashmir; Jaipur / Udaipur / Jodhpur → Rajasthan; Port Blair / Havelock → Andaman & Nicobar; Phuket / Krabi → the Thailand / Phuket-Krabi entry. Leave empty if the trip goes somewhere not on the list.
- If the file is not a travel itinerary or quote (e.g. a ticket only, a bill, a random photo), set isItinerary to false, give a friendly notItineraryReason and leave the rest empty/null.`
}

export const COMPARISON_SYSTEM = `You are an honest travel designer at Travelzada, an Indian travel company that plans romantic trips for couples (honeymoons, anniversaries, birthdays).
A traveller has uploaded an itinerary they got from somewhere else. Compare it with our candidate packages and tell them, truthfully, what we have and what we don't.

Rules:
- Pick the single best candidate (bestPackageId). Prefer the same destination, then the closest number of nights, then the most overlap.
- Classify EVERY item id you are given — return exactly one entry per id, using the same id:
  • included — our package clearly has it. ourOffer says where, e.g. "Day 3 – Phi Phi island tour" or "Breakfast daily".
  • similar — we have a comparable alternative (another hotel of the same category, a different but equivalent tour, shared instead of private transfer). ourOffer says what we offer.
  • not_included — our package does not have it. ourOffer null.
- Be strict and truthful. Only mark "included" when our package text supports it. When in doubt between included and similar, choose similar. Never claim we include something we don't.
- Hotels: a different hotel of the same star category is "similar"; the same hotel by name is "included".
- Flights / visa: included only if our inclusions say so.
- estimatedExtras: only when the extra cost is obvious and widely known; otherwise null. Never invent prices.
- matchPercent: honest share of their itinerary that our best package covers (included = 1, similar = 0.5).
- summary: 2–3 warm, honest sentences in simple English to the traveller. Mention the biggest differences (good and bad). No hype words.
- highlights: what our package adds that theirs doesn't (only real things from our package), max 5.
- If none of the candidates is in the same destination, status is "no_match": bestPackageId null, items empty, matchPercent 0, summary says kindly that we don't plan trips to that destination yet, alternativesNote suggests the closest candidates (similar trip style / length), alternativeIds lists them.`

/** Flatten an extraction into the list of items we compare (stable ids so results map back to the UI). */
export function buildCompareItems(x: ItineraryExtraction): CompareItem[] {
  const items: CompareItem[] = []
  x.days.forEach((d, di) => {
    d.items.forEach((label, ii) => {
      if (label && label.trim()) items.push({ id: `d${di}-${ii}`, kind: 'day', day: d.day || di + 1, label: label.trim() })
    })
  })
  x.hotels.forEach((h, hi) => {
    const label = [h.name || 'Hotel', h.city ? `in ${h.city}` : '', h.stars ? `(${h.stars}★)` : '', h.nights ? `· ${h.nights}N` : '', h.roomType ? `· ${h.roomType}` : '', h.mealPlan ? `· ${h.mealPlan}` : '']
      .filter(Boolean)
      .join(' ')
    items.push({ id: `h${hi}`, kind: 'hotel', day: null, label })
  })
  x.inclusions.forEach((label, i) => {
    if (label && label.trim()) items.push({ id: `i${i}`, kind: 'inclusion', day: null, label: label.trim() })
  })
  if (x.flightsIncluded === 'yes') items.push({ id: 'flights', kind: 'flight', day: null, label: 'Flights included in the price' })
  if (x.visaIncluded === 'yes') items.push({ id: 'visa', kind: 'visa', day: null, label: 'Visa included in the price' })
  return items.slice(0, 120)
}

/** User message for the comparison call */
export function comparisonContent(x: ItineraryExtraction, items: CompareItem[], candidates: unknown[], sameDestination: boolean): string {
  const theirs = {
    destinations: x.destinations,
    country: x.country,
    nights: x.nights,
    travellers: x.travellersText,
    quotedPrice: formatPrice(x.price) || null,
    hotels: x.hotels,
    days: x.days.map((d) => ({ day: d.day, title: d.title })),
    exclusions: x.exclusions,
    flightsIncluded: x.flightsIncluded,
    visaIncluded: x.visaIncluded,
  }
  return [
    `THEIR ITINERARY (from ${x.agency || 'another source'}):`,
    JSON.stringify(theirs),
    '',
    `ITEMS TO CLASSIFY (return one entry per id, ${items.length} in total):`,
    items.map((i) => `${i.id} | ${i.kind}${i.day ? ` day ${i.day}` : ''} | ${i.label}`).join('\n'),
    '',
    sameDestination
      ? 'OUR CANDIDATE PACKAGES (same destination, best first):'
      : 'NOTE: we have NO package in their destination. These are our closest other trips — use status "no_match".\nOUR CANDIDATE PACKAGES:',
    JSON.stringify(candidates),
  ].join('\n')
}

/** Short one-line description of an extraction (for logs / admin) */
export function extractionSummary(x: ItineraryExtraction): string {
  if (!x.isItinerary) return `Not an itinerary${x.notItineraryReason ? ` — ${x.notItineraryReason}` : ''}`
  const where = x.destinations.slice(0, 4).join(', ') || x.country || 'Unknown destination'
  const len = x.nights ? `${x.nights}N` : x.daysCount ? `${x.daysCount}D` : ''
  const price = formatPrice(x.price)
  return [where, len, price ? `quoted ${price}` : '', x.agency ? `by ${x.agency}` : ''].filter(Boolean).join(' · ')
}

export function formatPrice(p: ItineraryExtraction['price'] | null | undefined): string {
  if (!p) return ''
  const cur = (p.currency || 'INR').toUpperCase()
  const fmt = (n: number) => (cur === 'INR' ? '₹' + Math.round(n).toLocaleString('en-IN') : `${cur} ${Math.round(n).toLocaleString('en-IN')}`)
  if (p.total) return `${fmt(p.total)} total${p.perPerson ? ` (${fmt(p.perPerson)} pp)` : ''}`
  if (p.perPerson) return `${fmt(p.perPerson)} per person`
  return p.text || ''
}

export const ACCEPTED_TYPES: Record<string, 'pdf' | 'image'> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
}
export const MAX_FILE_BYTES = 10 * 1024 * 1024
/** Claude's per-image limit (base64 decoded). The page shrinks big photos before upload. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_TEXT_CHARS = 30000
