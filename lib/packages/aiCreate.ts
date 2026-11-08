/**
 * "Create with AI" for the admin package editor (server-side only).
 *
 * Claude designs a new couple package for one destination that is deliberately DIFFERENT from the packages we
 * already sell there (theme, route, day-by-day experiences, wording) — near-duplicate pages are not indexed by
 * Google. After generation the draft is compared with every package (5-word shingles, lib/seo/similarity); if it
 * is still too similar we regenerate once with feedback. The draft is returned to the form — never saved here.
 */
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { askJson, S } from '@/lib/planner/ai'
import { mostSimilar, similarityLabel, SIMILAR_AT, type SimilarityHit } from '@/lib/seo/similarity'
import {
  durationLabel,
  firstPrice,
  itineraryString,
  nextPackageCode,
  packagesForDestination,
  prefixForDestination,
  priceRangeLabel,
  toNum,
  uniqueSlug,
} from '@/components/admin/catalog/packageUtils'
import type { DestinationRecord, PackageDraft } from '@/components/admin/catalog/types'

export const OCCASIONS = ['Honeymoon', 'Anniversary', 'Birthday', 'Proposal', 'Babymoon', 'Couple getaway'] as const
export type Occasion = (typeof OCCASIONS)[number]

export interface AiCreateInput {
  /** Firestore id of the destination record (preferred) */
  destinationId?: string
  /** Destination name — used when there is no destination record */
  destinationName?: string
  nights: number
  occasion: Occasion
  stars: 3 | 4 | 5
  /** Optional target price per person (INR) */
  targetPrice?: number
  /** Optional angle / must-include note */
  angle?: string
}

export interface AiCreateResult {
  draft: PackageDraft
  /** Firestore id of the destination the package should be linked to ('' if none) */
  destinationId: string
  destinationName: string
  similarity: { max: number; label: string; top: SimilarityHit[] }
  attempts: number
  /** One line: how this package differs from the existing ones */
  differentiator: string
  /** Notes for the admin to double-check (prices, hotels, seasonal closures…) */
  checks: string[]
  /** Existing packages considered for this destination */
  existing: Array<{ id: string; code: string; title: string; nights?: number }>
}

export class AiCreateError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

type Pkg = PackageDraft & { id: string }

export async function loadCatalog(): Promise<{ packages: Pkg[]; destinations: DestinationRecord[] }> {
  const [ps, ds] = await Promise.all([getDocs(collection(db, 'packages')), getDocs(collection(db, 'destinations'))])
  return {
    packages: ps.docs.map((d) => ({ id: d.id, ...(d.data() as PackageDraft) })),
    destinations: ds.docs.map((d) => ({ id: d.id, ...(d.data() as DestinationRecord) })),
  }
}

export function validateInput(raw: any): AiCreateInput {
  const nights = Math.round(Number(raw?.nights))
  if (!Number.isFinite(nights) || nights < 3 || nights > 9) throw new AiCreateError('Pick 3 to 9 nights.')
  const occasion = OCCASIONS.find((o) => o.toLowerCase() === String(raw?.occasion || '').toLowerCase())
  if (!occasion) throw new AiCreateError('Pick an occasion.')
  const stars = Number(raw?.stars)
  if (![3, 4, 5].includes(stars)) throw new AiCreateError('Pick a hotel category (3, 4 or 5 star).')
  const destinationId = String(raw?.destinationId || '').trim().slice(0, 64)
  const destinationName = String(raw?.destinationName || '').trim().slice(0, 80)
  if (!destinationId && !destinationName) throw new AiCreateError('Pick a destination.')
  const tp = toNum(raw?.targetPrice)
  return {
    destinationId: destinationId || undefined,
    destinationName: destinationName || undefined,
    nights,
    occasion,
    stars: stars as 3 | 4 | 5,
    targetPrice: tp && tp >= 3000 && tp <= 2_000_000 ? Math.round(tp) : undefined,
    angle: String(raw?.angle || '').trim().slice(0, 400) || undefined,
  }
}

const priceOf = (p: PackageDraft) => toNum(p.Price_Min_INR) || firstPrice(p.Price_Range_INR)
const clip = (s: unknown, n: number) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}
const listOf = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : String(v ?? '').split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean)

function dayTitles(p: PackageDraft): string[] {
  if (Array.isArray(p.Day_Wise_Itinerary_Details) && p.Day_Wise_Itinerary_Details.length) return p.Day_Wise_Itinerary_Details.map((d: any) => String(d?.title || '')).filter(Boolean)
  return String(p.Day_Wise_Itinerary || '').split('|').map((x) => x.replace(/^\s*Day\s*\d+\s*[:\-–]\s*/i, '').trim()).filter(Boolean)
}

/** Compact description of an existing package for the prompt (what to avoid). */
function describeExisting(p: PackageDraft, i: number): string {
  return [
    `#${i + 1} "${p.Destination_Name}" (${p.Destination_ID}) — ${toNum(p.Duration_Nights) ?? p.Duration ?? '?'} nights, ${p.Star_Category || '?'}, from ₹${priceOf(p) ?? '?'} pp, occasion: ${p.Occasion || '-'}`,
    p.Location_Breakup ? `   Route: ${clip(p.Location_Breakup, 160)}` : '',
    p.Overview ? `   Overview: ${clip(p.Overview, 320)}` : '',
    dayTitles(p).length ? `   Days: ${dayTitles(p).map((t, d) => `D${d + 1} ${clip(t, 60)}`).join(' | ')}` : '',
    listOf(p.Highlights).length ? `   Highlights: ${listOf(p.Highlights).slice(0, 8).map((h) => clip(h, 60)).join('; ')}` : '',
    p.Hotel_Examples ? `   Hotels: ${clip(p.Hotel_Examples, 160)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

const MEAL_PLANS = ['Breakfast Only', 'Half Board', 'Full Board', 'All Inclusive']
const BUDGETS = ['Economy', 'Mid', 'Premium', 'Luxury']

const SCHEMA = S.obj({
  differentiator: S.str('One sentence: how this package is different from every existing package listed (theme, route, experiences).'),
  title: S.str('Package title customers see, 4–9 words, unique, no nights count, no "Package" word'),
  overview: S.str('180–260 words, 2–3 paragraphs separated by a blank line. First sentence: a direct factual summary (nights, places, who it is for, hotel category).'),
  location_breakup: S.str('Route and nights split, e.g. "Srinagar: 2 Nights, Pahalgam: 2 Nights, Gurez: 1 Night"'),
  price_per_person_inr: S.num('Suggested starting price per person in INR (land package, twin sharing, no flights), rounded to the nearest 500'),
  price_reasoning: S.str('One short line on how the price relates to the existing price points'),
  meal_plan: S.enum(MEAL_PLANS),
  stay_type: S.enum(['Hotel', 'Resort', 'Villa', 'Houseboat', 'Homestay', 'Camp']),
  hotel_examples: S.str('Hotels per stop. Real, well-known properties ONLY if you are confident they exist in that category; otherwise generic like "4-star boutique resort in Ubud". Format: "Srinagar: Hotel X or similar; Pahalgam: …"'),
  highlights: S.arr(S.str(), '6–8 specific highlights unique to THIS itinerary'),
  days: S.arr(
    S.obj({
      title: S.str('Day title, specific, 4–10 words, e.g. "Drive to Gurez via Razdan Pass"'),
      description: S.str('60–110 words: what the couple does, realistic drive times, romantic touches'),
      activities: S.arr(S.str(), '3–5 short activities'),
    }),
    'Exactly nights+1 days. Day 1 arrival, last day departure.',
  ),
  inclusions: S.arr(S.str(), '7–10 inclusions (stays, meals, private transfers, specific experiences, couple surprises)'),
  exclusions: S.arr(S.str(), '5–8 exclusions'),
  faqs: S.arr(S.obj({ question: S.str(), answer: S.str('40–80 words, specific and factual') }), 'Exactly 6 FAQs specific to this itinerary (best time, permits/visa, drive times, weather, what to pack, customisation)'),
  why_book: S.arr(S.obj({ label: S.str('2–5 words'), description: S.str('1 sentence') }), 'Exactly 4 reasons tied to this package'),
  tags: S.obj({
    mood: S.enum(['Romantic', 'Relax', 'Explore', 'Adventure', 'Luxury']),
    themes: S.arr(S.str(), '1–3 of: Beach, Culture, Nature, Mountains, Wildlife, City, Relax, Adventure, Heritage, Wellness, Offbeat'),
    budget_category: S.enum(BUDGETS),
    adventure_level: S.enum(['Light', 'Moderate', 'High']),
    best_months: S.str('Best months, e.g. "April–October"'),
    ideal_traveller: S.str('One line persona'),
    airport_code: S.str('IATA code of the arrival airport'),
  }),
  seo: S.obj({
    seo_title: S.str('50–60 characters, includes destination + nights + occasion keyword, unique'),
    seo_description: S.str('140–160 characters, specific, with a call to action'),
    keywords: S.arr(S.str(), '6–10 long-tail search keywords, lowercase'),
    image_alt_text: S.str('Alt text for the cover photo: couple at a named place from this itinerary'),
    slug: S.str('URL slug, lowercase-with-dashes, 3–8 words, include destination and nights like "5n6d"'),
  }),
  checks: S.arr(S.str(), '2–5 short things the admin must verify (seasonal road closures, permits, hotel availability, price)'),
})

interface AiPackage {
  differentiator: string
  title: string
  overview: string
  location_breakup: string
  price_per_person_inr: number
  price_reasoning: string
  meal_plan: string
  stay_type: string
  hotel_examples: string
  highlights: string[]
  days: Array<{ title: string; description: string; activities: string[] }>
  inclusions: string[]
  exclusions: string[]
  faqs: Array<{ question: string; answer: string }>
  why_book: Array<{ label: string; description: string }>
  tags: { mood: string; themes: string[]; budget_category: string; adventure_level: string; best_months: string; ideal_traveller: string; airport_code: string }
  seo: { seo_title: string; seo_description: string; keywords: string[]; image_alt_text: string; slug: string }
  checks: string[]
}

const SYSTEM = `You are the senior product designer at Travelzada, an Indian travel company selling romantic trips for Indian couples (honeymoon, anniversary, birthday, proposal, babymoon).
You design ONE new land package for a destination. It must be genuinely DIFFERENT from the packages we already sell there — Google does not index near-duplicate pages, so a re-worded copy is worthless.

Rules:
- Different angle/theme, a different route or region within the destination where possible, different day-by-day experiences, a different title and completely original wording. Do not reuse phrases from the existing packages.
- Realistic geography: real drive/ferry/flight times, sensible order of stops, no backtracking, no impossible same-day combinations. Respect seasonal closures and permits (mention them in FAQs/checks).
- Only real, well-known places, experiences and restaurants. Never invent attractions. Name hotels only when you are confident they exist and match the star category; otherwise describe the hotel type ("4-star boutique resort in Ubud").
- The traveller is an Indian couple: mention vegetarian/Indian food availability where relevant, Indian-passport visa facts for international trips (state them carefully), INR prices.
- The price is a land-package price per person on twin sharing (no flights), consistent with the existing price points for that destination and star category, scaled for nights and the experiences included.
- Overview is GEO-friendly: the first sentence is a direct factual summary an AI answer engine could quote (e.g. "This 5-night Kashmir anniversary package takes couples from Srinagar to …, staying in 4-star hotels."). Then what makes it special, then practical facts. Plain text, no markdown, no emojis.
- Inclusion/exclusion items are short phrases. FAQs answer real pre-booking questions specifically for THIS itinerary.
- Write in clear, warm British/Indian English. No clichés like "nestled", "breathtaking", "paradise on earth", "unforgettable memories".`

function buildPrompt(input: AiCreateInput, destName: string, dest: DestinationRecord | undefined, existing: Pkg[], catalogPrices: string[], feedback?: string) {
  const parts = [
    `Destination: ${destName}${dest?.country && dest.country !== destName ? `, ${dest.country}` : ''}`,
    `Nights: ${input.nights} (so ${input.nights + 1} days)`,
    `Occasion: ${input.occasion}`,
    `Hotel category: ${input.stars}-star`,
    input.targetPrice ? `Target price: about ₹${input.targetPrice} per person` : 'Target price: not given — choose a price consistent with the existing price points',
    input.angle ? `Angle / must include (from our team — follow it): ${input.angle}` : 'Angle: your choice — pick a theme/route NOT covered by the existing packages',
    dest?.bestTimeToVisit ? `Best time to visit (our destination page): ${dest.bestTimeToVisit}` : '',
    dest?.highlights?.length ? `Destination highlights (our page): ${dest.highlights.slice(0, 12).join('; ')}` : '',
    '',
    `Existing price points for ${destName} (from price per person): ${catalogPrices.length ? catalogPrices.join(', ') : 'none'}`,
    '',
    existing.length
      ? `Our EXISTING ${destName} packages (${existing.length}) — your package must differ from all of them:\n${existing.map(describeExisting).join('\n')}`
      : `We have no ${destName} packages yet.`,
  ]
  if (feedback) parts.push('', `IMPORTANT — your previous draft was rejected: ${feedback}`)
  parts.push('', `Design the package now. "days" must have exactly ${input.nights + 1} entries.`)
  return parts.filter((x) => x !== '').join('\n')
}

function toDraft(ai: AiPackage, input: AiCreateInput, code: string, slug: string): PackageDraft {
  const nights = input.nights
  const days = (ai.days || []).slice(0, nights + 1).map((d, i) => ({
    day: i + 1,
    title: String(d.title || '').trim(),
    description: String(d.description || '').trim(),
    activities: (d.activities || []).map((a) => String(a).trim()).filter(Boolean),
  }))
  const price = Math.max(0, Math.round((Number(ai.price_per_person_inr) || 0) / 500) * 500) || undefined
  const occasion = input.occasion === 'Couple getaway' ? 'Couple Getaway' : input.occasion
  return {
    Destination_ID: code,
    Destination_Name: ai.title.trim(),
    Overview: ai.overview.trim(),
    Duration_Nights: nights,
    Duration_Days: nights + 1,
    Duration: durationLabel(nights),
    ...(price ? { Price_Min_INR: price, Price_Range_INR: priceRangeLabel(price) } : {}),
    Star_Category: `${input.stars}-Star`,
    Meal_Plan: ai.meal_plan,
    Stay_Type: ai.stay_type,
    Location_Breakup: ai.location_breakup.trim(),
    Hotel_Examples: ai.hotel_examples.trim(),
    Highlights: (ai.highlights || []).map((h) => h.trim()).filter(Boolean).slice(0, 8),
    Day_Wise_Itinerary_Details: days,
    Day_Wise_Itinerary: itineraryString(days),
    Inclusions: (ai.inclusions || []).map((x) => x.trim()).filter(Boolean),
    Exclusions: (ai.exclusions || []).map((x) => x.trim()).filter(Boolean),
    FAQ_Items: (ai.faqs || []).filter((f) => f.question && f.answer).slice(0, 8),
    Why_Book_With_Us: (ai.why_book || []).filter((w) => w.label).slice(0, 4),
    Occasion: occasion,
    Travel_Type: 'Couple',
    Group_Size: '2 Adults',
    Mood: ai.tags.mood,
    Theme: (ai.tags.themes || []).slice(0, 3).join(' / '),
    Budget_Category: ai.tags.budget_category,
    Adventure_Level: ai.tags.adventure_level,
    Seasonality: ai.tags.best_months,
    Ideal_Traveler_Persona: ai.tags.ideal_traveller,
    Airport_Code: String(ai.tags.airport_code || '').toUpperCase().slice(0, 4),
    Transfer_Type: 'Private',
    Child_Friendly: 'No',
    SEO_Title: ai.seo.seo_title.trim(),
    SEO_Description: ai.seo.seo_description.trim(),
    SEO_Keywords: (ai.seo.keywords || []).map((k) => k.trim()).filter(Boolean).join(', '),
    Image_Alt_Text: ai.seo.image_alt_text.trim(),
    Slug: slug,
    Gallery_Images: [],
  }
}

/** Generate a new, unique package draft. Does NOT write to Firestore. */
export async function createPackageDraft(input: AiCreateInput, catalog?: Awaited<ReturnType<typeof loadCatalog>>): Promise<AiCreateResult> {
  const { packages, destinations } = catalog || (await loadCatalog())
  const dest =
    (input.destinationId && destinations.find((d) => d.id === input.destinationId)) ||
    (input.destinationName ? destinations.find((d) => String(d.name).toLowerCase() === input.destinationName!.toLowerCase()) : undefined)
  const destName = dest?.name || input.destinationName || ''
  if (!destName) throw new AiCreateError('Unknown destination.')

  const existing: Pkg[] = dest
    ? (packagesForDestination(dest, packages) as Pkg[])
    : packages.filter((p) => String(p.Destination_Name || '').toLowerCase().includes(destName.toLowerCase()))

  const catalogPrices = existing
    .map((p) => ({ n: toNum(p.Duration_Nights) ?? Number(String(p.Duration || '').match(/(\d+)\s*N/i)?.[1] || 0), s: String(p.Star_Category || '?'), price: priceOf(p) }))
    .filter((x) => x.price)
    .sort((a, b) => a.price! - b.price!)
    .map((x) => `${x.n || '?'}N ${x.s} ₹${x.price}`)

  const prefix = prefixForDestination(dest, packages) || destName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'PKG'
  const code = nextPackageCode(prefix, packages)

  let feedback: string | undefined
  let best: { draft: PackageDraft; ai: AiPackage; top: SimilarityHit[] } | null = null
  let attempts = 0
  for (attempts = 1; attempts <= 2; attempts++) {
    const ai = await askJson<AiPackage>({
      system: SYSTEM,
      content: buildPrompt(input, destName, dest, existing, catalogPrices, feedback),
      schema: SCHEMA,
      effort: 'high',
      maxTokens: 16000,
      label: 'package-ai-create',
    })
    if (!ai?.title || !ai?.overview || !Array.isArray(ai.days) || !ai.days.length) throw new AiCreateError('The AI returned an incomplete package. Please try again.', 502)
    const slug = uniqueSlug(ai.seo?.slug || `${destName} ${ai.title} ${input.nights}n${input.nights + 1}d`, packages)
    const draft = toDraft(ai, input, code, slug)
    const top = mostSimilar(draft, packages, 3)
    if (!best || (top[0]?.score ?? 0) < (best.top[0]?.score ?? 0)) best = { draft, ai, top }
    const maxScore = top[0]?.score ?? 0
    const titleClash = packages.find((p) => String(p.Destination_Name || '').trim().toLowerCase() === draft.Destination_Name!.toLowerCase())
    if (maxScore < SIMILAR_AT && !titleClash) break
    if (attempts < 2) {
      feedback = titleClash
        ? `the title "${draft.Destination_Name}" is already used by another package. Use a new title and also change the angle.`
        : `it overlaps ${Math.round(maxScore * 100)}% in wording with our package "${top[0].name}" (${top[0].id}). Use a different route/theme, different experiences and completely different wording.`
    }
  }

  const { draft, ai, top } = best!
  const max = top[0]?.score ?? 0
  return {
    draft,
    destinationId: dest?.id || '',
    destinationName: destName,
    similarity: { max, label: similarityLabel(max), top },
    attempts: Math.min(attempts, 2),
    differentiator: ai.differentiator,
    checks: [ai.price_reasoning ? `Price: ${ai.price_reasoning}` : '', ...(ai.checks || [])].filter(Boolean),
    existing: existing.map((p) => ({ id: p.id, code: String(p.Destination_ID || ''), title: String(p.Destination_Name || ''), nights: toNum(p.Duration_Nights) })),
  }
}
