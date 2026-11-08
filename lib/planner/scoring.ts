/**
 * Pure AI Planner matching engine — types, seasonality and deterministic scoring.
 * No Firebase / server imports: safe to use in the browser (the trip game counts matches live with it).
 * lib/planner/catalog.ts re-exports everything here, so server code keeps importing from there.
 */

export interface CatalogPackage {
  id: string // Firestore doc id
  code: string // Destination_ID, e.g. BAL_005
  slug: string
  name: string
  destination: string // canonical destination name ("Bali")
  destinationSlug: string // e.g. bali-packages
  country: string
  nights: number
  days: number
  pricePerPerson: number // INR
  stars: number // 3 | 4 | 5 (0 = unknown / no hotel)
  starLabel: string
  occasions: string[] // ["Honeymoon", "Birthday Getaway"]
  mood: string
  mealPlan: string
  image: string
  overview: string
  inclusions: string[]
  exclusions: string[]
  dayTitles: string[] // "Day 1: Arrival …"
  searchText: string // lowercase blob used for keyword / must-have matching
  url: string // public package page
}

export interface TravellerPrefs {
  destinations?: string[]
  nights?: number | null
  budgetPerPerson?: number | null // max INR per person
  month?: number | null // 1-12
  stars?: number[] // e.g. [4, 5]
  occasion?: string | null // honeymoon | anniversary | birthday | proposal | babymoon | getaway
  mustHaves?: string[] // "private pool villa", "candlelight dinner", "snorkelling"
  adults?: number | null
}

export interface ScoredPackage extends CatalogPackage {
  score: number // 0-100
  reasons: string[] // positive, factual bullet points
  notes: string[] // honest caveats ("1 night longer than you asked")
}

/** Best months to visit (1-12), from general travel knowledge — used when packages don't carry seasonality. */
export const BEST_MONTHS: Record<string, number[]> = {
  bali: [4, 5, 6, 7, 8, 9, 10],
  singapore: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  thailand: [11, 12, 1, 2, 3, 4],
  'phuket-krabi': [11, 12, 1, 2, 3, 4],
  andaman: [10, 11, 12, 1, 2, 3, 4, 5],
  'andaman & nicobar': [10, 11, 12, 1, 2, 3, 4, 5],
  kashmir: [3, 4, 5, 6, 7, 8, 9, 10, 12, 1],
  kerala: [9, 10, 11, 12, 1, 2, 3],
  rajasthan: [10, 11, 12, 1, 2, 3],
  baku: [4, 5, 6, 9, 10],
  maldives: [11, 12, 1, 2, 3, 4],
  dubai: [11, 12, 1, 2, 3],
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthName = (m?: number | null) => (m && m >= 1 && m <= 12 ? MONTHS[m - 1] : '')

/** British ↔ American spellings seen in package text, folded to one form so matching doesn't miss them */
const SPELLINGS: Array<[RegExp, string]> = [
  [/snorkell/g, 'snorkel'],
  [/travell/g, 'travel'],
  [/jewell/g, 'jewel'],
  [/centre/g, 'center'],
  [/theatre/g, 'theater'],
  [/colour/g, 'color'],
]

export const norm = (s: string) => {
  let t = s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  for (const [re, to] of SPELLINGS) t = t.replace(re, to)
  return t
}

/** "villas" ~ "villa", "dinners" ~ "dinner" */
const stem = (w: string) => (w.length > 4 ? w.replace(/e?s$/, '') : w)

/**
 * True when every word of `phrase` appears in `text` as a whole word, in order, at most 2 words apart.
 * "pool villa" matches "private pool villa"; "water villa" does NOT match "water sports … pool villa".
 */
export function mentions(text: string, phrase: string): boolean {
  const want = norm(phrase).split(' ').filter(Boolean).map(stem)
  if (!want.length) return false
  const words = norm(text).split(' ').map(stem)
  for (let i = 0; i < words.length; i++) {
    if (words[i] !== want[0]) continue
    let pos = i
    let ok = true
    for (let k = 1; k < want.length && ok; k++) {
      const next = words.slice(pos + 1, pos + 4).indexOf(want[k])
      if (next === -1) ok = false
      else pos += next + 1
    }
    if (ok) return true
  }
  // "candlelight dinner" vs "candle light dinner"
  return want.length > 1 && norm(text).replace(/ /g, '').includes(want.join(''))
}

/** Does a requested destination ("thailand", "phuket", "andaman") refer to this package? */
export function matchesDestination(pkg: CatalogPackage, wanted: string): boolean {
  const w = norm(wanted)
  if (!w) return false
  const hay = norm(`${pkg.destination} ${pkg.destinationSlug.replace(/-/g, ' ')} ${pkg.name} ${pkg.country}`)
  return w.split(' ').some((tok) => tok.length > 2 && hay.includes(tok))
}

export function bestMonthsFor(pkg: CatalogPackage): number[] | null {
  const keys = [pkg.destination, pkg.destinationSlug.replace(/-packages$/, ''), pkg.country].map((k) => k.toLowerCase())
  for (const k of keys) if (BEST_MONTHS[k]) return BEST_MONTHS[k]
  for (const [k, v] of Object.entries(BEST_MONTHS)) if (keys.some((x) => x.includes(k))) return v
  return null
}

export const OCCASION_WORDS: Record<string, RegExp> = {
  honeymoon: /honeymoon/i,
  anniversary: /anniversar/i,
  birthday: /birthday/i,
  proposal: /propos/i,
  babymoon: /babymoon|honeymoon|couple/i,
  getaway: /getaway|couple|honeymoon/i,
}

/**
 * Score every package against the traveller's preferences. Hard filter: destination (if given).
 * Everything else is a soft score so there are always useful results.
 */
export function scorePackages(packages: CatalogPackage[], prefs: TravellerPrefs): ScoredPackage[] {
  const wantedDest = (prefs.destinations || []).filter(Boolean)
  const pool = wantedDest.length ? packages.filter((p) => wantedDest.some((d) => matchesDestination(p, d))) : packages

  return pool
    .map((pkg) => {
      let score = 100
      const reasons: string[] = []
      const notes: string[] = []

      // Duration
      if (prefs.nights && pkg.nights) {
        const diff = Math.abs(pkg.nights - prefs.nights)
        if (diff === 0) reasons.push(`${pkg.nights} nights, just as you planned`)
        else {
          score -= diff === 1 ? 6 : Math.min(30, diff * 8)
          notes.push(`${pkg.nights} nights (you asked for ${prefs.nights}) — we can adjust it`)
        }
      }

      // Budget (per person)
      if (prefs.budgetPerPerson && pkg.pricePerPerson) {
        const ratio = pkg.pricePerPerson / prefs.budgetPerPerson
        if (ratio <= 1) reasons.push(`₹${pkg.pricePerPerson.toLocaleString('en-IN')} per person — within your budget`)
        else if (ratio <= 1.1) {
          score -= 8
          notes.push(`Slightly above budget (₹${pkg.pricePerPerson.toLocaleString('en-IN')} pp)`)
        } else {
          score -= Math.min(40, Math.round((ratio - 1) * 100))
          notes.push(`₹${pkg.pricePerPerson.toLocaleString('en-IN')} pp — above your budget`)
        }
      }

      // Hotel category
      if (prefs.stars?.length && pkg.stars) {
        if (prefs.stars.includes(pkg.stars)) reasons.push(`${pkg.starLabel || pkg.stars + '-Star'} hotels`)
        else {
          score -= 10
          notes.push(`${pkg.starLabel || pkg.stars + '-Star'} hotels (you preferred ${prefs.stars.join('/')}-Star)`)
        }
      }

      // Occasion
      if (prefs.occasion) {
        const re = OCCASION_WORDS[prefs.occasion] || new RegExp(prefs.occasion, 'i')
        if (pkg.occasions.some((o) => re.test(o)) || re.test(pkg.name)) reasons.push(`Designed for a ${prefs.occasion}`)
        else score -= 4
      }

      // Season
      if (prefs.month) {
        const best = bestMonthsFor(pkg)
        if (best?.includes(prefs.month)) reasons.push(`${monthName(prefs.month)} is a lovely time for ${pkg.destination}`)
        else if (best) {
          score -= 8
          notes.push(`${monthName(prefs.month)} is off-season for ${pkg.destination} (better prices, some weather risk)`)
        }
      }

      // Must-haves: only claim "Includes X" when the phrase is really in the package (whole words, in order,
      // at most 2 words apart) — never from scattered words like "water sports" + "pool villa".
      for (const m of prefs.mustHaves || []) {
        if (!norm(m)) continue
        if (mentions(pkg.searchText, m)) reasons.push(`${m.charAt(0).toUpperCase()}${m.slice(1)} is part of this trip`)
        else {
          score -= 3
          notes.push(`${m} can be added on request`)
        }
      }

      return { ...pkg, score: Math.max(1, Math.min(100, score)), reasons: reasons.slice(0, 5), notes: notes.slice(0, 3) }
    })
    .sort((a, b) => b.score - a.score || a.pricePerPerson - b.pricePerPerson)
}
