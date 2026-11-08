/**
 * SEO & GEO rewrite of one package page (server-side only — calls Claude, GPT-4o fallback via lib/planner/ai).
 *
 * Flow: facts of the package + short summaries of its 3 most similar packages → Claude writes new
 * title/description/keywords/overview/highlights/day texts/FAQs/why-book/alt text that must read clearly
 * different from those siblings. Then, on the server:
 *   - only whitelisted text fields are kept (SEO_FIELDS); day count + day numbers are forced to the original,
 *   - a fact check flags prices / nights / star category / meal plans that don't match the package,
 *   - similarity vs every other package is measured; if still ≥ SIMILAR_AT (or facts are off) it retries once,
 *     telling the model which package it resembles and which phrases are shared,
 *   - fields that still fail the fact check are dropped from the patch (listed in `warnings`).
 * Nothing is written to Firestore here — the admin reviews and saves.
 */
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { askJson, S } from '@/lib/planner/ai'
import { SIMILAR_AT, mostSimilar, packageText, shingles } from './similarity'
import { auditPackage, daysOf, nightsOf, placeWords } from './packageAudit'
import { SEO_FIELDS, type OptimizeResult, type SeoPatch } from './types'

type Pkg = Record<string, any> & { id?: string }

const SYSTEM = `You are the senior SEO and GEO (generative-engine optimisation) copywriter for Travelzada, an Indian travel company selling holiday packages mostly to Indian couples and families.
You rewrite the text of ONE package page so that it is (1) clearly unique versus our other package pages — many are currently left out of Google's index as duplicates, (2) easy for Google and for AI answer engines (ChatGPT, Gemini, Perplexity, Google AI Overviews) to quote, and (3) accurate.

HARD RULES — breaking any of these makes the output unusable:
- Use ONLY facts given in PACKAGE FACTS. Never invent hotels, hotel names, activities, sightseeing, meals, inclusions, upgrades, offers, discounts, prices, ratings, awards, visa rules or flight details.
- Never change: price, number of nights/days, hotel star category, meal plan, inclusions/exclusions, hotel names, package name, slug or code. If you mention them, state them exactly as given.
- Day-wise plan: return exactly the same number of days with the same day numbers, the same places and the same activities/sightseeing as the original day. Rewrite the title and description in fresh, specific words; you may add useful context about the places already listed (what they are known for, travel time feel, what the day is like) but never add new sightseeing stops, activities or meals. Optional activities stay "optional".
- Prices: write the price only as given (e.g. "from ₹27,000 per person") and only if a price is given. Do not quote other prices or price ranges.
- If something (best season, visa, flights, hotel names) is not in the facts, either leave it out or phrase it as general destination knowledge without promises (e.g. "October to March is generally the most pleasant time in Kerala") — never as a package promise.
- No superlatives or claims you cannot back up ("best", "No.1", "cheapest", "guaranteed", "world-class"). No fluff, no clichés ("nestled", "tapestry", "embark", "unforgettable journey", "hidden gem", "paradise on earth"), no emojis.

UNIQUENESS:
- SIMILAR PACKAGES lists our pages that this one currently resembles. Write with a clearly different angle, structure, sentence openings and vocabulary from them. Do not reuse their sentences or 5-word phrases. Lead with what is genuinely different about THIS package (route order, number of nights per place, hotel category, meal plan, theme/occasion, price point, pace).
- The SEO title must not repeat any title listed under OTHER TITLES.

GEO / SEO WRITING:
- Overview: 180–260 words, 2–3 short paragraphs, natural Indian English for Indian travellers. The FIRST sentence is a one-sentence factual answer naming the entities: nights, places, hotel category, meal plan, transfers, price — e.g. "A 5-night Bali honeymoon covering Ubud and Seminyak with 4-star stays, daily breakfast and private transfers, from ₹43,000 per person." Then who it suits, how the route flows, what each stop is like.
- SEO_Title: 50–60 characters, includes the destination and the duration (e.g. 4N/5D) or theme; may end with "| Travelzada" only if it fits in 60 characters.
- SEO_Description: 140–160 characters, factual, includes duration, key places and one concrete benefit; no clickbait.
- SEO_Keywords: 6–10 comma-separated search phrases Indians actually type, specific to this package (route, duration, theme), not generic.
- Highlights: 5–8 short, specific bullets (max ~14 words each) drawn from the facts.
- FAQ_Items: exactly 6 questions a buyer of THIS package asks (what is included, hotel category/where you stay, who it is ideal for, best time to go, how the route/transfers work, can it be customised; visa/flights only if the facts mention them). Each answer starts with a direct one-sentence answer, then 1–2 sentences of detail. 40–80 words per answer. Use the package's own facts (nights, places, inclusions) so the FAQs differ from other packages.
- Why_Book_With_Us: exactly 4 points specific to this package (label 2–5 words, description 1–2 sentences), based on the facts (e.g. private transfers with driver-guide, route planned to avoid backtracking, tolls/parking included). No invented guarantees.
- Image_Alt_Text: one descriptive sentence (8–16 words) of a photo typical for this package's main place, mentioning the place.
- notes: one or two sentences for the admin on what you changed and anything they should check.`

const SCHEMA = S.obj({
  SEO_Title: S.str(),
  SEO_Description: S.str(),
  SEO_Keywords: S.str('comma-separated'),
  Overview: S.str('180–260 words, paragraphs separated by a blank line'),
  Highlights: S.arr(S.str()),
  Day_Wise_Itinerary_Details: S.arr(
    S.obj({ day: S.num(), title: S.str(), description: S.str('60–120 words'), activities: S.arr(S.str(), 'same activities as the original day, reworded') }),
  ),
  FAQ_Items: S.arr(S.obj({ question: S.str(), answer: S.str() })),
  Why_Book_With_Us: S.arr(S.obj({ label: S.str(), description: S.str() })),
  Image_Alt_Text: S.str(),
  notes: S.str(),
})

interface ModelOut {
  SEO_Title: string
  SEO_Description: string
  SEO_Keywords: string
  Overview: string
  Highlights: string[]
  Day_Wise_Itinerary_Details: Array<{ day: number; title: string; description: string; activities: string[] }>
  FAQ_Items: Array<{ question: string; answer: string }>
  Why_Book_With_Us: Array<{ label: string; description: string }>
  Image_Alt_Text: string
  notes: string
}

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : String(v || '').split(/\r?\n|,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean)
const clip = (s: unknown, n: number) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function facts(p: Pkg) {
  const nights = nightsOf(p)
  const f: Record<string, unknown> = {
    package_name: p.Destination_Name,
    destination_and_places: placeWords(p),
    nights,
    days: nights ? nights + 1 : num(p.Duration_Days) || undefined,
    nights_per_place: p.Location_Breakup || undefined,
    price_from_INR_per_person: num(p.Price_Min_INR) || num(p.Price_Range_INR) || 'not given — do not mention a price',
    hotel_star_category: p.Star_Category || 'not given — do not mention stars',
    stay_type: p.Stay_Type || undefined,
    example_hotels: p.Hotel_Examples || 'not given — do not name hotels',
    meal_plan: p.Meal_Plan || 'not given — do not mention meals',
    transfers: p.Transfer_Type || undefined,
    inclusions: list(p.Inclusions),
    exclusions: list(p.Exclusions),
    occasion: p.Occasion || undefined,
    travel_type: p.Travel_Type || undefined,
    theme: p.Theme || undefined,
    mood: p.Mood || undefined,
    adventure_level: p.Adventure_Level || undefined,
    season: p.Seasonality || undefined,
    ideal_for: p.Ideal_Traveler_Persona || undefined,
    child_friendly: p.Child_Friendly || undefined,
    elderly_friendly: p.Elderly_Friendly || undefined,
    nearest_airport: p.Airport_Code || undefined,
    booking_policies: p.Booking_Policies && typeof p.Booking_Policies === 'object' ? p.Booking_Policies : undefined,
    day_plan: daysOf(p).map((d) => ({ day: d.day, title: d.title, description: d.description, activities: d.activities })),
    current_overview: p.Overview || '',
    current_highlights: Array.isArray(p.Highlights) ? p.Highlights : [],
    current_faqs: Array.isArray(p.FAQ_Items) ? p.FAQ_Items : [],
    current_why_book: Array.isArray(p.Why_Book_With_Us) ? p.Why_Book_With_Us : [],
    current_seo_title: p.SEO_Title || '',
    current_seo_description: p.SEO_Description || '',
  }
  Object.keys(f).forEach((k) => f[k] === undefined && delete f[k])
  return f
}

const sibling = (o: Pkg, score: number) => ({
  name: o.Destination_Name,
  similarity: `${Math.round(score * 100)}%`,
  seo_title: o.SEO_Title || '',
  overview: clip(o.Overview, 700),
  highlights: (Array.isArray(o.Highlights) ? o.Highlights : []).slice(0, 8),
  day_titles: daysOf(o).map((d) => `Day ${d.day}: ${clip(d.title, 90)}`),
  day_descriptions_start: daysOf(o).map((d) => clip(d.description, 140)).filter(Boolean),
  faq_questions: (Array.isArray(o.FAQ_Items) ? o.FAQ_Items : []).map((x: any) => x?.question).filter(Boolean),
})

/** Phrases (5-word shingles) the draft shares with another package — fed back to the model on retry */
function sharedPhrases(a: Pkg, b: Pkg, max = 20): string[] {
  const sb = shingles(packageText(b))
  return Array.from(shingles(packageText(a))).filter((x) => sb.has(x)).slice(0, max)
}

// ---------- fact check ----------

function factCheck(patch: SeoPatch, p: Pkg): Array<{ field: string; index?: number; problem: string }> {
  const out: Array<{ field: string; index?: number; problem: string }> = []
  const nights = nightsOf(p)
  const prices = new Set<number>([num(p.Price_Min_INR), num(p.Price_Max_INR), ...(String(p.Price_Range_INR || '').match(/\d[\d,]*/g) || []).map((s) => num(s))].filter(Boolean))
  const stars = new Set((String(p.Star_Category || '').match(/\d/g) || []).map(Number))
  const mealSource = `${p.Meal_Plan || ''} ${list(p.Inclusions).join(' ')}`.toLowerCase()

  const check = (field: string, text: string, index?: number, durationToo = true) => {
    const t = String(text || '')
    for (const m of Array.from(t.matchAll(/(?:₹|\bINR|\bRs\.?)\s*([\d][\d,]*(?:\.\d+)?)\s*(lakh|k\b)?/gi))) {
      let v = num(m[1])
      if (/lakh/i.test(m[2] || '')) v *= 100000
      if (/k/i.test(m[2] || '')) v *= 1000
      if (v && !prices.has(v)) out.push({ field, index, problem: `mentions price ₹${v.toLocaleString('en-IN')} (package price is ${prices.size ? Array.from(prices).map((x) => '₹' + x.toLocaleString('en-IN')).join(' / ') : 'not set'})` })
    }
    for (const m of Array.from(t.matchAll(/\b(\d)\s*[- ]?\s*star\b/gi))) {
      if (!stars.has(Number(m[1]))) out.push({ field, index, problem: `mentions ${m[1]}-star hotels (package is ${p.Star_Category || 'not set'})` })
    }
    if (durationToo && nights) {
      for (const m of Array.from(t.matchAll(/\b(\d+)\s*[- ]?\s*(?:N\b|nights?\b)/gi))) if (Number(m[1]) > nights) out.push({ field, index, problem: `mentions ${m[1]} nights (package is ${nights} nights)` })
      for (const m of Array.from(t.matchAll(/\b(\d+)\s*[- ]?\s*(?:D\b|days?\b)(?!\s+(?:before|prior|in advance|of|after|from))/gi))) if (Number(m[1]) > nights + 1) out.push({ field, index, problem: `mentions ${m[1]} days (package is ${nights + 1} days)` })
    }
    const meal = t.match(/\b(all meals|full board|half board|all-inclusive|dinners? (?:is |are )?included|lunch(?:es)? (?:is |are )?included|breakfast and dinner|MAPAI)\b/i)
    if (meal && !mealSource.includes(meal[1].toLowerCase().split(' ')[0])) out.push({ field, index, problem: `mentions “${meal[1]}” (meal plan is ${p.Meal_Plan || 'not set'})` })
  }

  check('SEO_Title', patch.SEO_Title)
  check('SEO_Description', patch.SEO_Description)
  check('SEO_Keywords', patch.SEO_Keywords)
  check('Overview', patch.Overview)
  check('Image_Alt_Text', patch.Image_Alt_Text)
  ;(patch.Highlights || []).forEach((h: string, i: number) => check('Highlights', h, i))
  ;(patch.Day_Wise_Itinerary_Details || []).forEach((d: any, i: number) => check('Day_Wise_Itinerary_Details', `${d.title} ${d.description} ${(d.activities || []).join(' ')}`, i, false))
  ;(patch.FAQ_Items || []).forEach((f: any, i: number) => check('FAQ_Items', `${f.question} ${f.answer}`, i, false))
  ;(patch.Why_Book_With_Us || []).forEach((w: any, i: number) => check('Why_Book_With_Us', `${w.label} ${w.description}`, i, false))
  return out
}

/** Turn model output into a safe patch: whitelisted fields only, original day count/numbers/places kept. */
function toPatch(out: ModelOut, p: Pkg): SeoPatch {
  const s = (v: unknown) => String(v ?? '').trim()
  const patch: SeoPatch = {}
  if (s(out.SEO_Title)) patch.SEO_Title = s(out.SEO_Title)
  if (s(out.SEO_Description)) patch.SEO_Description = s(out.SEO_Description)
  if (s(out.SEO_Keywords)) patch.SEO_Keywords = s(out.SEO_Keywords).split(',').map((k) => k.trim()).filter(Boolean).join(', ')
  if (s(out.Overview)) patch.Overview = s(out.Overview)
  const hl = (out.Highlights || []).map(s).filter(Boolean).slice(0, 8)
  if (hl.length) patch.Highlights = hl
  const original = daysOf(p)
  if (original.length && (out.Day_Wise_Itinerary_Details || []).length) {
    const gen = out.Day_Wise_Itinerary_Details
    patch.Day_Wise_Itinerary_Details = original.map((d, i) => {
      const g = gen.find((x) => Number(x?.day) === d.day) || gen[i]
      const acts = (g?.activities || []).map(s).filter(Boolean)
      return {
        day: i + 1,
        title: s(g?.title) || d.title,
        description: s(g?.description) || d.description,
        activities: acts.length ? acts : d.activities,
      }
    })
  }
  const faqs = (out.FAQ_Items || []).map((f) => ({ question: s(f?.question), answer: s(f?.answer) })).filter((f) => f.question && f.answer).slice(0, 8)
  if (faqs.length) patch.FAQ_Items = faqs
  const why = (out.Why_Book_With_Us || []).map((w) => ({ label: s(w?.label), description: s(w?.description) })).filter((w) => w.label).slice(0, 6)
  if (why.length) patch.Why_Book_With_Us = why
  if (s(out.Image_Alt_Text)) patch.Image_Alt_Text = s(out.Image_Alt_Text)
  // Belt and braces: never let anything outside the whitelist through
  Object.keys(patch).forEach((k) => !(SEO_FIELDS as readonly string[]).includes(k) && delete (patch as any)[k])
  return patch
}

/** Remove fields (or list items) that still fail the fact check. */
function dropViolations(patch: SeoPatch, problems: ReturnType<typeof factCheck>): string[] {
  const warnings: string[] = []
  const itemFields = new Set(['Highlights', 'FAQ_Items', 'Why_Book_With_Us'])
  const drop = new Map<string, Set<number>>()
  problems.forEach((v) => {
    if (itemFields.has(v.field) && v.index !== undefined) {
      if (!drop.has(v.field)) drop.set(v.field, new Set())
      drop.get(v.field)!.add(v.index)
      warnings.push(`${v.field} #${v.index + 1} removed: ${v.problem}`)
    } else if ((patch as any)[v.field] !== undefined) {
      delete (patch as any)[v.field]
      warnings.push(`${v.field} not changed: ${v.problem}`)
    }
  })
  drop.forEach((idx, field) => {
    const kept = ((patch as any)[field] as any[]).filter((_, i) => !idx.has(i))
    if (kept.length) (patch as any)[field] = kept
    else delete (patch as any)[field]
  })
  return warnings
}

export async function loadAllPackages(): Promise<Pkg[]> {
  const snap = await getDocs(collection(db, 'packages'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
}

export interface OptimizeInput {
  /** The package as currently edited (unsaved changes included). */
  pkg: Pkg
  packageId?: string
  /** All packages (defaults to a fresh Firestore read) */
  allPackages?: Pkg[]
  /** Total time we may spend (the retry is skipped if the first call used more than half) */
  timeBudgetMs?: number
}

export async function optimizePackage({ pkg: input, packageId, allPackages, timeBudgetMs = 110_000 }: OptimizeInput): Promise<OptimizeResult> {
  const started = Date.now()
  const all = allPackages || (await loadAllPackages())
  const id = packageId || input.id
  const pkg: Pkg = { ...input, id }
  const others = all.filter((o) => o.id !== id)

  const audit_before = auditPackage(pkg, others)
  const similarity_before = mostSimilar(pkg, others, 3)
  const byId = new Map(others.map((o) => [String(o.id), o]))
  const siblings = similarity_before.map((h) => sibling(byId.get(h.id)!, h.score))
  const placeSet = placeWords(pkg)
  const otherTitles = others
    .filter((o) => placeWords(o).some((w) => placeSet.includes(w)))
    .map((o) => String(o.SEO_Title || '').trim())
    .filter(Boolean)
    .slice(0, 40)

  const baseContent = [
    `PACKAGE FACTS (the only source of truth):\n${JSON.stringify(facts(pkg), null, 1)}`,
    `SIMILAR PACKAGES (write clearly differently from these):\n${JSON.stringify(siblings, null, 1)}`,
    `OTHER TITLES already used on our site (do not repeat):\n${otherTitles.map((t) => `- ${t}`).join('\n') || '- none'}`,
    `CURRENT PAGE PROBLEMS:\n${audit_before.issues.map((i) => `- ${i.message}`).join('\n') || '- none'}`,
    'Rewrite the page text now. Return JSON only.',
  ].join('\n\n')

  type Attempt = { patch: SeoPatch; problems: ReturnType<typeof factCheck>; sim: ReturnType<typeof mostSimilar>; notes: string; dupTitle: boolean }
  const evaluate = (out: ModelOut): Attempt => {
    const patch = toPatch(out, pkg)
    const merged = { ...pkg, ...patch }
    const t = String(patch.SEO_Title || '').toLowerCase().trim()
    return {
      patch,
      problems: factCheck(patch, pkg),
      sim: mostSimilar(merged, others, 3),
      notes: String(out.notes || '').trim(),
      dupTitle: !!t && others.some((o) => String(o.SEO_Title || '').toLowerCase().trim() === t),
    }
  }
  const bad = (a: Attempt) => a.problems.length > 0 || (a.sim[0]?.score ?? 0) >= SIMILAR_AT || a.dupTitle

  const first = evaluate(await askJson<ModelOut>({ system: SYSTEM, content: baseContent, schema: SCHEMA, effort: 'medium', maxTokens: 12000, label: 'seo-optimize' }))
  let best = first
  let attempts = 1
  const notes: string[] = []
  if (first.notes) notes.push(first.notes)

  if (bad(first)) {
    if (Date.now() - started < timeBudgetMs / 2) {
      const feedback: string[] = []
      const top = first.sim[0]
      if (top && top.score >= SIMILAR_AT) {
        const o = byId.get(top.id)!
        feedback.push(
          `Your draft is still ${Math.round(top.score * 100)}% similar to our package “${top.name}”. Shared phrases include:\n${sharedPhrases({ ...pkg, ...first.patch }, o).map((s) => `- "${s}"`).join('\n')}\nRephrase everything that overlaps (overview, highlights, day titles/descriptions/activities wording, FAQ questions and answers) with different structure and vocabulary, while keeping the same facts.`,
        )
      }
      if (first.problems.length) feedback.push(`These statements break the hard rules — fix them using only the facts:\n${first.problems.map((v) => `- ${v.field}${v.index !== undefined ? ` #${v.index + 1}` : ''}: ${v.problem}`).join('\n')}`)
      if (first.dupTitle) feedback.push('Your SEO_Title is identical to another package’s title — write a different one.')
      const retryOut = await askJson<ModelOut>({
        system: SYSTEM,
        content: `${baseContent}\n\nYOUR PREVIOUS DRAFT:\n${JSON.stringify(first.patch)}\n\nPROBLEMS WITH IT:\n${feedback.join('\n\n')}\n\nReturn the complete corrected JSON.`,
        schema: SCHEMA,
        effort: 'medium',
        maxTokens: 12000,
        label: 'seo-optimize-retry',
      }).catch(() => null)
      const retry = retryOut ? evaluate(retryOut) : null
      attempts = 2
      const rank = (a: Attempt) => a.problems.length * 10 + (a.dupTitle ? 5 : 0) + (a.sim[0]?.score ?? 0)
      if (retry && Object.keys(retry.patch).length && rank(retry) < rank(first)) {
        best = retry
        if (retry.notes) notes.splice(0, notes.length, retry.notes)
      }
    } else {
      notes.push('No time left for a second pass — check the similarity before applying.')
    }
  }

  const patch = { ...best.patch }
  const warnings = dropViolations(patch, best.problems)
  if (best.dupTitle) warnings.push('SEO title is the same as another package — edit it before saving.')
  const merged = { ...pkg, ...patch }
  const similarity_after = mostSimilar(merged, others, 3)
  if ((similarity_after[0]?.score ?? 0) >= SIMILAR_AT) notes.push(`Still ${Math.round(similarity_after[0].score * 100)}% similar to “${similarity_after[0].name}” — that page probably needs rewriting too.`)

  return {
    patch,
    audit_before,
    audit_after_estimate: auditPackage(merged, others),
    similarity_before,
    similarity_after,
    warnings,
    notes,
    attempts,
    ms: Date.now() - started,
  }
}
