/**
 * Server helpers shared by the consumer AI Planner routes (smart search + wizard find-packages).
 * Scoring is deterministic (lib/planner/catalog); Claude only writes the friendly one-liners on top.
 */
import { askJson, S } from '@/lib/planner/ai'
import { monthName, packageBrief, type ScoredPackage, type TravellerPrefs } from '@/lib/planner/catalog'

export const OCCASION_IDS = ['honeymoon', 'anniversary', 'birthday', 'proposal', 'babymoon', 'getaway'] as const

const OCCASION_LABEL: Record<string, string> = {
  honeymoon: 'Honeymoon',
  anniversary: 'Anniversary',
  birthday: 'Birthday',
  proposal: 'Proposal',
  babymoon: 'Babymoon',
  getaway: 'Couple getaway',
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Make untrusted prefs (from the browser or the model) safe and well-typed */
export function sanitisePrefs(input: any): TravellerPrefs {
  const p = input && typeof input === 'object' ? input : {}
  const nights = num(p.nights)
  const month = num(p.month)
  const budget = num(p.budgetPerPerson)
  const adults = num(p.adults)
  const occasion = typeof p.occasion === 'string' && (OCCASION_IDS as readonly string[]).includes(p.occasion) ? p.occasion : null
  return {
    destinations: Array.isArray(p.destinations) ? p.destinations.map((d: unknown) => String(d).trim()).filter(Boolean).slice(0, 4) : [],
    nights: nights ? Math.min(20, Math.round(nights)) : null,
    budgetPerPerson: budget ? Math.round(budget) : null,
    month: month && month >= 1 && month <= 12 ? Math.round(month) : null,
    stars: Array.isArray(p.stars) ? Array.from(new Set(p.stars.map(Number).filter((s: number) => s >= 3 && s <= 5))) : [],
    occasion,
    mustHaves: Array.isArray(p.mustHaves) ? p.mustHaves.map((m: unknown) => String(m).trim()).filter(Boolean).slice(0, 5) : [],
    adults: adults ? Math.min(20, Math.round(adults)) : null,
  }
}

const shortINR = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `₹${Math.round(n / 1000)}k`)

/** "Honeymoon · Bali · Dec · 6 nights · up to ₹60k pp" */
export function understoodLine(prefs: TravellerPrefs): string {
  const parts: string[] = []
  if (prefs.occasion) parts.push(OCCASION_LABEL[prefs.occasion] || prefs.occasion)
  parts.push(prefs.destinations?.length ? prefs.destinations.join(' / ') : 'Any destination')
  if (prefs.month) parts.push(monthName(prefs.month).slice(0, 3))
  if (prefs.nights) parts.push(`${prefs.nights} nights`)
  if (prefs.stars?.length) parts.push(`${[...prefs.stars].sort().join('/')}-Star`)
  if (prefs.budgetPerPerson) parts.push(`up to ${shortINR(prefs.budgetPerPerson)} pp`)
  if (prefs.adults && prefs.adults !== 2) parts.push(`${prefs.adults} travellers`)
  return parts.join(' · ')
}

/** The lite package shape the UI renders */
export function toLite(p: ScoredPackage, whyForYou?: string | null) {
  return {
    id: p.id,
    name: p.name,
    destination: p.destination,
    nights: p.nights,
    days: p.days,
    pricePerPerson: p.pricePerPerson,
    stars: p.stars,
    starLabel: p.starLabel,
    mealPlan: p.mealPlan,
    image: p.image,
    url: p.url,
    score: p.score,
    reasons: p.reasons,
    notes: p.notes,
    whyForYou: whyForYou || null,
  }
}

/** When no destination was asked for: best package per destination first, then fill with the next best. */
export function diversify(scored: ScoredPackage[], limit: number): ScoredPackage[] {
  const byDest = new Map<string, ScoredPackage[]>()
  for (const p of scored) {
    const k = p.destination.toLowerCase()
    if (!byDest.has(k)) byDest.set(k, [])
    byDest.get(k)!.push(p)
  }
  const out: ScoredPackage[] = []
  for (let round = 0; out.length < limit; round++) {
    const batch = Array.from(byDest.values())
      .map((list) => list[round])
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.pricePerPerson - b.pricePerPerson)
    if (!batch.length) break
    out.push(...batch.slice(0, limit - out.length))
  }
  return out
}

/**
 * One warm, positive sentence per package (top few only). Uses only the facts we pass in.
 * Returns {} when AI is unavailable — callers fall back to the deterministic `reasons`.
 */
export async function writeFitLines(top: ScoredPackage[], prefs: TravellerPrefs, query?: string): Promise<Record<string, string>> {
  if (!top.length) return {}
  try {
    const res = await askJson<{ items: Array<{ id: string; line: string }> }>({
      label: 'planner-fit-lines',
      effort: 'low',
      maxTokens: 1200,
      system: `You write short, warm recommendation lines for Travelzada, which sells romantic trips to Indian couples.
For each package write ONE sentence (max 25 words) telling the couple why it suits them.
Rules:
- Use ONLY the facts given (destination, nights, hotels, meals, inclusions, price, "reasons"). Never invent inclusions, hotels, activities or prices.
- "whatTheyWant" is only context. Mention something they asked for (e.g. a water villa, scuba, candlelight dinner) ONLY if that exact thing appears in that package's inclusions or reasons — otherwise leave it out.
- Positive only: never mention anything missing, off-season, over budget or different from what they asked.
- Simple, friendly English. No emojis, no exclamation marks, no quotes.
- Speak to the couple ("you two", "your"), and make each line different.`,
      content: JSON.stringify({
        whatTheyWant: { ...prefs, month: prefs.month ? monthName(prefs.month) : null, request: query || null },
        packages: top.map((p) => ({ ...packageBrief(p), reasons: p.reasons })),
      }),
      schema: S.obj({ items: S.arr(S.obj({ id: S.str('package id'), line: S.str('one sentence') })) }),
    })
    const out: Record<string, string> = {}
    for (const it of res.items || []) if (it?.id && it?.line) out[it.id] = String(it.line).trim()
    return out
  } catch {
    return {}
  }
}

/** Deterministic fallback line from the scorer's reasons */
export const reasonsLine = (p: ScoredPackage) =>
  p.reasons.length ? p.reasons.slice(0, 3).join(' · ') : `${p.nights} nights in ${p.destination}${p.starLabel ? ` with ${p.starLabel} hotels` : ''}`
