/**
 * "AI fills the rest" for the admin package editor (server-side only).
 *
 * Staff fill only the MAIN fields (name, destination, nights, price, photo, day-by-day, stay, reviews).
 * Claude then writes everything else — overview, highlights, inclusions/exclusions, FAQs, why-book, tags and
 * SEO — built on what staff entered and deliberately different from our other packages for that destination
 * (near-duplicate pages are not indexed). Main fields are never changed; empty day descriptions/activities and
 * empty stay details are filled in. Returns a patch for the form — nothing is saved here.
 */
import { askJson, S } from '@/lib/planner/ai'
import { mostSimilar, similarityLabel, SIMILAR_AT, type SimilarityHit } from '@/lib/seo/similarity'
import { itineraryRows, itineraryString, packagesForDestination, toNum, uniqueSlug } from '@/components/admin/catalog/packageUtils'
import type { DestinationRecord, ItineraryDay, PackageDraft } from '@/components/admin/catalog/types'
import { AiCreateError, loadCatalog } from './aiCreate'

/** Fields staff fill themselves. AI never overwrites these (it only fills empty day text / stay details). */
export const MAIN_FIELDS = [
  'Destination_Name',
  'Duration_Nights',
  'Price_Min_INR',
  'Primary_Image_URL',
  'Day_Wise_Itinerary_Details',
  'Star_Category',
  'Meal_Plan',
  'Hotel_Examples',
  'Location_Breakup',
  'Guest_Reviews',
] as const

/** Fields the AI writes. With `overwrite` these are rewritten; otherwise only empty ones are filled. */
export const AI_FIELDS = [
  'Overview',
  'Highlights',
  'Inclusions',
  'Exclusions',
  'FAQ_Items',
  'Why_Book_With_Us',
  'Occasion',
  'Travel_Type',
  'Mood',
  'Theme',
  'Budget_Category',
  'Adventure_Level',
  'Stay_Type',
  'Seasonality',
  'Ideal_Traveler_Persona',
  'Group_Size',
  'Airport_Code',
  'Transfer_Type',
  'SEO_Title',
  'SEO_Description',
  'SEO_Keywords',
  'Image_Alt_Text',
  'Slug',
] as const

export interface AiCompleteInput {
  draft: PackageDraft & { id?: string }
  destinationId?: string
  /** Rewrite AI fields that already have text (main fields are still never touched) */
  overwrite?: boolean
}

export interface AiCompleteResult {
  patch: PackageDraft
  /** Field names the AI filled */
  filled: string[]
  similarity: { max: number; label: string; top: SimilarityHit[] }
  checks: string[]
}

const isEmpty = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.filter((x) => x && (typeof x !== 'string' || x.trim())).length === 0)

const clip = (s: unknown, n: number) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

const OCCASIONS = ['Honeymoon', 'Anniversary', 'Babymoon', 'Proposal', 'Birthday', 'Couple Getaway', 'Family Vacation']

const SCHEMA = S.obj({
  overview: S.str('180–260 words, 2–3 paragraphs separated by a blank line. First sentence: a direct factual summary (nights, places, who it is for, hotel category).'),
  highlights: S.arr(S.str(), '6–8 specific highlights of THIS itinerary'),
  days: S.arr(
    S.obj({
      title: S.str('Keep the given title exactly when one was given; otherwise a specific 4–10 word title'),
      description: S.str('Keep the given description when one was given; otherwise 60–110 words on what happens that day'),
      activities: S.arr(S.str(), 'Keep the given activities when given; otherwise 3–5 short activities'),
    }),
    'One entry per day, same order and count as given (nights+1 when no days were given).',
  ),
  stay: S.obj({
    star_category: S.enum(['3-Star', '4-Star', '5-Star'], 'Keep the given one when given'),
    meal_plan: S.enum(['Breakfast Only', 'Half Board', 'Full Board', 'All Inclusive'], 'Keep the given one when given'),
    stay_type: S.enum(['Hotel', 'Resort', 'Villa', 'Houseboat', 'Homestay', 'Camp']),
    hotel_examples: S.str('Keep the given text when given; otherwise hotels per stop — real properties only when confident, else generic like "4-star resort in Pahalgam"'),
    location_breakup: S.str('Keep the given text when given; otherwise route and nights split like "Srinagar: 2 Nights, Pahalgam: 2 Nights"'),
  }),
  inclusions: S.arr(S.str(), '7–10 short inclusions consistent with the itinerary and stay'),
  exclusions: S.arr(S.str(), '5–8 short exclusions'),
  faqs: S.arr(S.obj({ question: S.str(), answer: S.str('40–80 words, specific and factual') }), 'Exactly 6 FAQs specific to this itinerary'),
  why_book: S.arr(S.obj({ label: S.str('2–5 words'), description: S.str('1 sentence') }), 'Exactly 4 reasons tied to this package'),
  tags: S.obj({
    occasions: S.arr(S.enum(OCCASIONS), '1–3 occasions this package suits'),
    travel_type: S.enum(['Couple', 'Family', 'Friends', 'Solo', 'Small Group']),
    group_size: S.str('e.g. "2 Adults"'),
    mood: S.enum(['Romantic', 'Relax', 'Explore', 'Adventure', 'Luxury']),
    themes: S.arr(S.str(), '1–3 of: Beach, Culture, Nature, Mountains, Wildlife, City, Relax, Adventure, Heritage, Wellness, Offbeat'),
    budget_category: S.enum(['Economy', 'Mid', 'Premium', 'Luxury']),
    adventure_level: S.enum(['Light', 'Moderate', 'High']),
    best_months: S.str('e.g. "April–October"'),
    ideal_traveller: S.str('One line persona'),
    airport_code: S.str('IATA code of the arrival airport'),
    transfers: S.enum(['Private', 'Shared']),
  }),
  seo: S.obj({
    seo_title: S.str('50–60 characters, destination + nights + main keyword, unique'),
    seo_description: S.str('140–160 characters, specific, with a call to action'),
    keywords: S.arr(S.str(), '6–10 long-tail search keywords, lowercase'),
    image_alt_text: S.str('Alt text for the cover photo, naming a real place from this itinerary'),
    slug: S.str('URL slug, lowercase-with-dashes, 3–8 words, include destination and nights like "5n6d"'),
  }),
  checks: S.arr(S.str(), '1–4 short things staff should double-check (price, seasonal closures, permits, hotel names)'),
})

interface AiOut {
  overview: string
  highlights: string[]
  days: Array<{ title: string; description: string; activities: string[] }>
  stay: { star_category: string; meal_plan: string; stay_type: string; hotel_examples: string; location_breakup: string }
  inclusions: string[]
  exclusions: string[]
  faqs: Array<{ question: string; answer: string }>
  why_book: Array<{ label: string; description: string }>
  tags: {
    occasions: string[]
    travel_type: string
    group_size: string
    mood: string
    themes: string[]
    budget_category: string
    adventure_level: string
    best_months: string
    ideal_traveller: string
    airport_code: string
    transfers: string
  }
  seo: { seo_title: string; seo_description: string; keywords: string[]; image_alt_text: string; slug: string }
  checks: string[]
}

const SYSTEM = `You are the senior content writer at Travelzada, an Indian travel company selling trips mostly to Indian couples and families.
Our sales team has entered the core facts of a package (name, destination, nights, price, day-by-day plan, stay). You write the rest of the package page.

Rules:
- Build on the facts given. Never change the package name, nights or price. Keep every day title, description, activity and stay detail that was given exactly as given; only fill in what is empty.
- The page must read clearly DIFFERENT from our other packages for this destination (listed below) — Google does not index near-duplicate pages. Use original wording; do not reuse their phrases.
- Realistic geography and timings. Only real places and experiences. Name hotels only when confident they exist in that category.
- Overview is GEO-friendly: the first sentence is a direct factual summary an AI answer engine could quote. Plain text, no markdown, no emojis.
- Indian travellers: mention vegetarian/Indian food where relevant; Indian-passport visa facts for international trips (state them carefully); INR.
- Clear, warm British/Indian English. No clichés like "nestled", "breathtaking", "paradise on earth", "unforgettable memories".`

function describeOther(p: PackageDraft, i: number) {
  const days = itineraryRows(p).map((d) => d.title).filter(Boolean)
  return [
    `#${i + 1} "${p.Destination_Name}" — ${toNum(p.Duration_Nights) ?? p.Duration ?? '?'} nights, ${p.Star_Category || '?'}`,
    p.Overview ? `   Overview: ${clip(p.Overview, 260)}` : '',
    days.length ? `   Days: ${days.map((t, d) => `D${d + 1} ${clip(t, 50)}`).join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildPrompt(draft: PackageDraft, days: ItineraryDay[], nights: number, destName: string, dest: DestinationRecord | undefined, others: PackageDraft[], feedback?: string) {
  const reviews = (draft.Guest_Reviews || []).filter((r) => r?.content).slice(0, 3)
  return [
    `Destination: ${destName}${dest?.country && dest.country !== destName ? `, ${dest.country}` : ''}`,
    `Package name: ${draft.Destination_Name}`,
    `Nights: ${nights} (${nights + 1} days)`,
    toNum(draft.Price_Min_INR) ? `Price from: ₹${toNum(draft.Price_Min_INR)}` : '',
    `Hotel category: ${draft.Star_Category || '(not given — choose)'}`,
    `Meal plan: ${draft.Meal_Plan || '(not given — choose)'}`,
    `Hotels: ${draft.Hotel_Examples || '(not given — write)'}`,
    `Route / nights split: ${draft.Location_Breakup || '(not given — write)'}`,
    '',
    days.length
      ? `Day-by-day (given — keep what is filled, fill what is empty):\n${days
          .map((d, i) => `Day ${i + 1}: title="${d.title || ''}" description="${clip(d.description, 600)}" activities=${JSON.stringify(d.activities || [])}`)
          .join('\n')}`
      : `Day-by-day: not given — write all ${nights + 1} days.`,
    reviews.length ? `\nGuest reviews (for tone only): ${reviews.map((r) => clip(r.content, 160)).join(' / ')}` : '',
    dest?.bestTimeToVisit ? `\nBest time to visit (our destination page): ${dest.bestTimeToVisit}` : '',
    '',
    others.length ? `Our OTHER ${destName} packages (${others.length}) — write differently from all of them:\n${others.slice(0, 25).map(describeOther).join('\n')}` : `We have no other ${destName} packages.`,
    feedback ? `\nIMPORTANT — your previous version was rejected: ${feedback}` : '',
  ]
    .filter((x) => x !== '')
    .join('\n')
}

export async function completePackage(input: AiCompleteInput): Promise<AiCompleteResult> {
  const draft = input.draft || {}
  const name = String(draft.Destination_Name || '').trim()
  if (!name) throw new AiCreateError('Add the package name first.')
  const given = itineraryRows(draft)
  const nights = toNum(draft.Duration_Nights) || (given.length > 1 ? given.length - 1 : undefined)
  if (!nights || nights < 1 || nights > 30) throw new AiCreateError('Add the number of nights first.')

  const { packages, destinations } = await loadCatalog()
  const selfId = draft.id
  const others = packages.filter((p) => p.id !== selfId)
  const dest = input.destinationId ? destinations.find((d) => d.id === input.destinationId) : undefined
  const destName = dest?.name || String(draft.Destination_Name || '').trim()
  const sameDest = dest ? packagesForDestination(dest, others) : []

  // Days the AI must return: the given rows, or nights+1 empty ones
  const baseDays: ItineraryDay[] = given.length ? given : Array.from({ length: nights + 1 }, (_, i) => ({ day: i + 1, title: '', description: '', activities: [] }))

  let feedback: string | undefined
  let best: { patch: PackageDraft; filled: string[]; top: SimilarityHit[]; checks: string[] } | null = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    const ai = await askJson<AiOut>({
      system: SYSTEM,
      content: buildPrompt(draft, given, nights, destName, dest, sameDest, feedback),
      schema: SCHEMA,
      effort: 'medium',
      maxTokens: 16000,
      label: 'package-ai-complete',
    })
    if (!ai?.overview) throw new AiCreateError('The AI returned an incomplete answer. Please try again.', 502)

    const patch: PackageDraft = {}
    const filled: string[] = []
    const put = (key: string, value: unknown, main = false) => {
      if (isEmpty(value)) return
      const current = (draft as any)[key]
      if (!isEmpty(current) && (main || !input.overwrite)) return
      ;(patch as any)[key] = value
      filled.push(key)
    }

    // Days: keep every given value, fill only the gaps
    const aiDays = ai.days || []
    const days = baseDays.map((d, i) => {
      const a = aiDays[i] || { title: '', description: '', activities: [] }
      return {
        day: i + 1,
        title: String(d.title || '').trim() || String(a.title || '').trim(),
        description: String(d.description || '').trim() || String(a.description || '').trim(),
        activities: d.activities?.length ? d.activities : (a.activities || []).map((x) => String(x).trim()).filter(Boolean),
      }
    })
    const daysChanged = JSON.stringify(days) !== JSON.stringify(given.map((d, i) => ({ day: i + 1, title: d.title || '', description: d.description || '', activities: d.activities || [] })))
    if (daysChanged) {
      patch.Day_Wise_Itinerary_Details = days
      patch.Day_Wise_Itinerary = itineraryString(days)
      filled.push('Day_Wise_Itinerary_Details')
    }

    put('Star_Category', ai.stay?.star_category, true)
    put('Meal_Plan', ai.stay?.meal_plan, true)
    put('Hotel_Examples', ai.stay?.hotel_examples?.trim(), true)
    put('Location_Breakup', ai.stay?.location_breakup?.trim(), true)
    put('Stay_Type', ai.stay?.stay_type)

    put('Overview', ai.overview.trim())
    put('Highlights', (ai.highlights || []).map((h) => h.trim()).filter(Boolean).slice(0, 8))
    put('Inclusions', (ai.inclusions || []).map((x) => x.trim()).filter(Boolean))
    put('Exclusions', (ai.exclusions || []).map((x) => x.trim()).filter(Boolean))
    put('FAQ_Items', (ai.faqs || []).filter((f) => f.question && f.answer).slice(0, 8))
    put('Why_Book_With_Us', (ai.why_book || []).filter((w) => w.label).slice(0, 4))

    const t = ai.tags || ({} as AiOut['tags'])
    put('Occasion', (t.occasions || []).join(', '))
    put('Travel_Type', t.travel_type)
    put('Group_Size', t.group_size)
    put('Mood', t.mood)
    put('Theme', (t.themes || []).slice(0, 3).join(' / '))
    put('Budget_Category', t.budget_category)
    put('Adventure_Level', t.adventure_level)
    put('Seasonality', t.best_months)
    put('Ideal_Traveler_Persona', t.ideal_traveller)
    put('Airport_Code', String(t.airport_code || '').toUpperCase().slice(0, 4))
    put('Transfer_Type', t.transfers)

    const seo = ai.seo || ({} as AiOut['seo'])
    put('SEO_Title', seo.seo_title?.trim())
    put('SEO_Description', seo.seo_description?.trim())
    put('SEO_Keywords', (seo.keywords || []).map((k) => k.trim()).filter(Boolean).join(', '))
    put('Image_Alt_Text', seo.image_alt_text?.trim())
    if (seo.slug) put('Slug', uniqueSlug(seo.slug || `${destName} ${name} ${nights}n${nights + 1}d`, packages, selfId))

    const top = mostSimilar({ ...draft, ...patch }, others, 3)
    if (!best || (top[0]?.score ?? 0) < (best.top[0]?.score ?? 0)) best = { patch, filled, top, checks: ai.checks || [] }
    const max = top[0]?.score ?? 0
    if (max < SIMILAR_AT) break
    feedback = `the page overlaps ${Math.round(max * 100)}% in wording with our package "${top[0].name}". Use completely different wording and angle.`
  }

  const { patch, filled, top, checks } = best!
  const max = top[0]?.score ?? 0
  return { patch, filled, similarity: { max, label: similarityLabel(max), top }, checks }
}
