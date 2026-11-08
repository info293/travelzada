/**
 * POST /api/tailored-travel/smart-search
 * "Describe your trip" → parsed preferences → deterministic scoring → friendly one-liners for the top 3.
 *
 * Body: { query: string, sessionId?: string, honeypot?: string, prefs?: TravellerPrefs (refine: skip parsing) }
 * Reply: { understood, prefs, results: PlannerMatch[], unsupportedDestination, activityId }
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { askJson, S } from '@/lib/planner/ai'
import { loadCatalog, matchesDestination, scorePackages, type CatalogPackage, type TravellerPrefs } from '@/lib/planner/catalog'
import { clientIp, logPlannerActivity } from '@/lib/planner/records'
import { isRateLimited } from '@/lib/spamGuard'
import { OCCASION_IDS, diversify, reasonsLine, sanitisePrefs, toLite, understoodLine, writeFitLines } from '../_lib/plannerServer'

const RESULT_LIMIT = 9

interface ParsedQuery {
  destinations: string[]
  unsupportedDestination: string | null
  similarDestinations: string[]
  nights: number | null
  budgetPerPerson: number | null
  totalBudget: number | null
  travellers: number | null
  month: number | null
  rawMonth: string | null
  stars: number[]
  occasion: string
  mustHaves: string[]
}

const PARSE_SCHEMA = S.obj({
  destinations: S.arr(S.str(), 'Destinations from the SOLD list only, exactly as written there. Empty if none/any.'),
  unsupportedDestination: S.strOrNull('Place the traveller named that we do NOT sell (e.g. "Maldives"), else null'),
  similarDestinations: S.arr(S.str(), 'Only when unsupportedDestination is set: 1-3 SOLD destinations most like it'),
  nights: S.numOrNull('Number of nights. "6 days" = 5 nights. "a week" = 6 nights. null if not said'),
  budgetPerPerson: S.numOrNull('Budget per person in INR when they said each / per person / pp'),
  totalBudget: S.numOrNull('Total budget in INR when they said total / for both / for two / overall'),
  travellers: S.numOrNull('Number of adults travelling if said, else null'),
  month: S.numOrNull('Travel month 1-12, else null'),
  rawMonth: S.strOrNull('The words they used for timing, e.g. "December", "this winter", "next month"'),
  stars: S.arr(S.num(), 'Hotel star categories wanted: any of 3, 4, 5. "luxury" = [5], "budget" = [3]'),
  occasion: S.enum([...OCCASION_IDS, 'none'], 'Trip occasion'),
  mustHaves: S.arr(S.str(), 'Specific wishes, short phrases, e.g. "private pool villa", "candlelight dinner", "snorkelling"'),
})

function systemPrompt(sold: string[]) {
  const now = new Date()
  return `You turn a traveller's message into search filters for Travelzada, which sells romantic trips for Indian couples.
Today is ${now.toDateString()} (month ${now.getMonth() + 1}).

Destinations we SELL (use these exact names): ${sold.join(', ')}.

Map synonyms to the SOLD names:
- Thailand, Phuket, Krabi, Pattaya → the Phuket/Krabi/Thailand destination
- Andaman, Havelock, Port Blair, Neil Island → Andaman & Nicobar
- Kashmir, Srinagar, Gulmarg, Pahalgam, "snow", "snowy", "mountains with snow" → Kashmir
- Jaipur, Udaipur, Jodhpur, Jaisalmer, "palaces", "forts" → Rajasthan
- Munnar, Alleppey, Kochi, "backwaters", "houseboat" → Kerala
- Azerbaijan → Baku
- Ubud, Seminyak, Nusa Penida → Bali
- "beach", "island", "sea" with no place → every SOLD beach destination (Bali, Andaman & Nicobar, Phuket/Krabi, Maldives if sold)
- "abroad", "international" with no place → leave destinations empty
If they name a place we do not sell (e.g. Maldives when not in the list, Switzerland, Goa, Dubai), put it in unsupportedDestination and pick 1-3 similar SOLD destinations in similarDestinations; keep destinations empty.

Money: "60k" = 60000, "1.5 lakh" / "1.5L" = 150000, "1 lac" = 100000. Decide per person vs total from words like each / per person / pp vs total / for both / for two. If unclear, treat amounts above 1 lakh as total and smaller ones as per person.
Occasion: honeymoon, anniversary, birthday (incl. "wife's/husband's birthday"), proposal, babymoon (pregnant / before baby), getaway (any other couple trip); "none" if not mentioned.
Month: a named month → that month. "this winter" → 12, "next month" → next month number. Otherwise null.
Never guess values the traveller did not imply.`
}

/* ────────────────────────── deterministic fallback parser (used when AI is down) ────────────────────────── */

const SYNONYMS: Array<[RegExp, string]> = [
  [/thailand|phuket|krabi|pattaya/, 'phuket'],
  [/andaman|havelock|port blair|neil/, 'andaman'],
  [/kashmir|srinagar|gulmarg|pahalgam|snow/, 'kashmir'],
  [/rajasthan|jaipur|udaipur|jodhpur|jaisalmer/, 'rajasthan'],
  [/kerala|munnar|alleppey|alappuzha|kochi|backwater/, 'kerala'],
  [/baku|azerbaijan/, 'baku'],
  [/bali|ubud|seminyak/, 'bali'],
  [/singapore/, 'singapore'],
]
const MONTH_RE = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function fallbackParse(query: string, sold: string[]): ParsedQuery {
  const q = query.toLowerCase()
  const destinations: string[] = []
  for (const [re, key] of SYNONYMS) {
    if (!re.test(q)) continue
    const name = sold.find((s) => s.toLowerCase().includes(key))
    if (name && !destinations.includes(name)) destinations.push(name)
  }
  for (const s of sold) if (q.includes(s.toLowerCase()) && !destinations.includes(s)) destinations.push(s)

  let nights: number | null = null
  const n = q.match(/(\d{1,2})\s*(?:n\b|nights?)/)
  const d = q.match(/(\d{1,2})\s*days?/)
  if (n) nights = +n[1]
  else if (d) nights = Math.max(1, +d[1] - 1)
  else if (/\bweek\b/.test(q)) nights = 6

  let month: number | null = null
  const m = q.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b/)
  if (m) month = MONTH_RE.indexOf(m[1].slice(0, 3)) + 1

  let budgetPerPerson: number | null = null
  let totalBudget: number | null = null
  const money = q.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|l)\b/) || q.match(/(?:₹|rs\.?|inr)\s*([\d,]{4,})/)
  if (money) {
    const unit = money[2] || ''
    const base = parseFloat(money[1].replace(/,/g, ''))
    const amount = unit.startsWith('l') ? base * 100000 : unit === 'k' || unit === 'thousand' ? base * 1000 : base
    const isTotal = /total|both|for two|for 2|overall/.test(q) || (!/each|per person|pp|per head/.test(q) && amount > 100000)
    if (isTotal) totalBudget = amount
    else budgetPerPerson = amount
  }

  const stars = Array.from(new Set(Array.from(q.matchAll(/([345])\s*-?\s*star/g)).map((x) => +x[1])))
  if (!stars.length && /luxury|luxurious/.test(q)) stars.push(5)

  const occasion = /honeymoon/.test(q)
    ? 'honeymoon'
    : /anniversar/.test(q)
      ? 'anniversary'
      : /birthday|bday/.test(q)
        ? 'birthday'
        : /propos/.test(q)
          ? 'proposal'
          : /babymoon|pregnan/.test(q)
            ? 'babymoon'
            : /getaway|trip|holiday|vacation/.test(q)
              ? 'getaway'
              : 'none'

  const people = q.match(/(\d+)\s*(?:people|adults|persons|pax|of us)/)
  return {
    destinations,
    unsupportedDestination: null,
    similarDestinations: [],
    nights,
    budgetPerPerson,
    totalBudget,
    travellers: people ? +people[1] : null,
    month,
    rawMonth: null,
    stars,
    occasion,
    mustHaves: [],
  }
}

/* ─────────────────────────────────────────────── route ─────────────────────────────────────────────── */

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const query = String(body?.query || '').trim().slice(0, 500)
  const sessionId = body?.sessionId ? String(body.sessionId).slice(0, 80) : null
  const ip = clientIp(req)

  // Bots fill hidden fields — pretend nothing matched
  if (body?.honeypot && String(body.honeypot).trim()) {
    return NextResponse.json({ understood: '', prefs: {}, results: [], unsupportedDestination: null, activityId: null })
  }
  if (isRateLimited(`smart-search:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'You are searching very fast — please wait a minute and try again.' }, { status: 429 })
  }
  if (!query && !body?.prefs) {
    return NextResponse.json({ error: 'Tell us a little about the trip you have in mind.' }, { status: 400 })
  }

  try {
    const { packages } = await loadCatalog()
    const sold = Array.from(new Set(packages.map((p) => p.destination).filter(Boolean)))

    let prefs: TravellerPrefs
    let unsupportedDestination: string | null = null
    let aiParsed = false

    if (body?.prefs && typeof body.prefs === 'object') {
      // Refine chip: the browser sends back the prefs we gave it, with one thing changed
      prefs = sanitisePrefs(body.prefs)
      unsupportedDestination = body?.unsupportedDestination ? String(body.unsupportedDestination).slice(0, 60) : null
    } else {
      let parsed: ParsedQuery
      try {
        parsed = await askJson<ParsedQuery>({
          label: 'smart-search-parse',
          effort: 'low',
          maxTokens: 800,
          system: systemPrompt(sold),
          content: query,
          schema: PARSE_SCHEMA,
        })
        aiParsed = true
      } catch {
        parsed = fallbackParse(query, sold)
      }

      const known = (d: string) => packages.some((p: CatalogPackage) => matchesDestination(p, d))
      let destinations = (parsed.destinations || []).filter(known)
      unsupportedDestination = parsed.unsupportedDestination?.trim() || null
      // Model returned a destination we can't match → treat it as unsupported
      if (!unsupportedDestination && parsed.destinations?.length && !destinations.length) unsupportedDestination = parsed.destinations[0]
      if (unsupportedDestination && known(unsupportedDestination)) {
        destinations = Array.from(new Set([...destinations, unsupportedDestination]))
        unsupportedDestination = null
      }
      if (unsupportedDestination && !destinations.length) destinations = (parsed.similarDestinations || []).filter(known).slice(0, 3)

      const adults = parsed.travellers && parsed.travellers > 0 ? parsed.travellers : 2
      let budgetPerPerson = parsed.budgetPerPerson
      if (!budgetPerPerson && parsed.totalBudget) budgetPerPerson = Math.round(parsed.totalBudget / adults)

      prefs = sanitisePrefs({
        destinations,
        nights: parsed.nights,
        budgetPerPerson,
        month: parsed.month,
        stars: parsed.stars,
        occasion: parsed.occasion === 'none' ? null : parsed.occasion,
        mustHaves: parsed.mustHaves,
        adults,
      })
    }

    const scored = scorePackages(packages, prefs)
    const picked = prefs.destinations?.length ? scored.slice(0, RESULT_LIMIT) : diversify(scored, RESULT_LIMIT)

    const lines = await writeFitLines(picked.slice(0, 3), prefs, query)
    // No AI line → the card still shows the scorer's reasons as ticks (only fall back to text when there are none)
    const results = picked.map((p, i) => toLite(p, i < 3 ? lines[p.id] || (p.reasons.length ? null : reasonsLine(p)) : null))
    const understood = understoodLine(prefs)

    const activityId = await logPlannerActivity({
      type: 'smart_search',
      summary: query || `Refined: ${understood}`,
      details: { query, prefs, understood, unsupportedDestination, aiParsed, refined: !!body?.prefs },
      matches: results.map((r) => ({ id: r.id, name: r.name, score: r.score })),
      sessionId,
      ip,
      userAgent: req.headers.get('user-agent') || null,
    })

    return NextResponse.json({ understood, prefs, results, unsupportedDestination, activityId })
  } catch (err) {
    console.error('[smart-search] failed:', (err as Error)?.message)
    return NextResponse.json({ error: 'We could not search right now. Please try again in a moment.' }, { status: 500 })
  }
}
