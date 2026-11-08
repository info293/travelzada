/**
 * AI Planner catalog + matching engine (server-side).
 *
 * The catalog is small (≈100 packages), so we load it once (5-min cache), normalise every package into a
 * compact shape, and score it deterministically against what the traveller asked for. Scoring is instant,
 * explainable and never hallucinates; Claude is only used to understand free text and to write the
 * friendly "why this fits you" line on top.
 */
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { packageSiteUrl } from '@/components/admin/catalog/packageUtils'

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

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://www.travelzada.com'

const toNumber = (v: unknown) => {
  if (typeof v === 'number') return v
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

const splitList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  const s = String(v ?? '').trim()
  if (!s) return []
  return (s.includes('\n') ? s.split('\n') : s.split(/,(?![^(]*\))/)).map((x) => x.trim()).filter(Boolean)
}

let cache: { at: number; packages: CatalogPackage[]; destinations: string[] } | null = null
const TTL = 5 * 60 * 1000

/** All packages, normalised. Cached in memory for 5 minutes per server instance. */
export async function loadCatalog(force = false): Promise<{ packages: CatalogPackage[]; destinations: string[] }> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache
  const [pkgSnap, destSnap] = await Promise.all([getDocs(collection(db, 'packages')), getDocs(collection(db, 'destinations'))])

  const dests = destSnap.docs.map((d) => d.data() as any)
  const destByCode = new Map<string, any>()
  dests.forEach((d) => (d.packageIds || []).forEach((code: string) => destByCode.set(String(code), d)))

  const packages: CatalogPackage[] = pkgSnap.docs.map((doc) => {
    const p = doc.data() as any
    const name = String(p.Destination_Name || '')
    const code = String(p.Destination_ID || '')
    const dest =
      destByCode.get(code) ||
      dests.find((d) => d.name && name.toLowerCase().includes(String(d.name).toLowerCase().split(/[\s&-]/)[0])) ||
      null
    const destination = dest?.name || String(p.Location_Breakup || name).split(',')[0].trim()
    const nights = toNumber(p.Duration_Nights) || toNumber(String(p.Duration || '').match(/(\d+)\s*N/i)?.[1])
    const starMatch = String(p.Star_Category || '').match(/(\d)/)
    const dayTitles = Array.isArray(p.Day_Wise_Itinerary_Details) && p.Day_Wise_Itinerary_Details.length
      ? p.Day_Wise_Itinerary_Details.map((d: any, i: number) => `Day ${d.day || i + 1}: ${d.title || ''}${d.description ? ' — ' + String(d.description).slice(0, 160) : ''}`)
      : String(p.Day_Wise_Itinerary || '').split('|').map((s: string) => s.trim()).filter(Boolean)
    const inclusions = splitList(p.Inclusions)
    const exclusions = splitList(p.Exclusions)
    const destinationSlug = dest?.slug || ''
    const url = SITE + packageSiteUrl({ ...p, id: doc.id } as any)
    return {
      id: doc.id,
      code,
      slug: String(p.Slug || ''),
      name,
      destination,
      destinationSlug,
      country: dest?.country || String(p.Location_Breakup || '').split(',').pop()?.trim() || '',
      nights,
      days: toNumber(p.Duration_Days) || (nights ? nights + 1 : 0),
      pricePerPerson: toNumber(p.Price_Min_INR) || toNumber(p.Price_Range_INR),
      stars: starMatch ? Number(starMatch[1]) : 0,
      starLabel: String(p.Star_Category || ''),
      occasions: splitList(p.Occasion),
      mood: String(p.Mood || ''),
      mealPlan: String(p.Meal_Plan || ''),
      image: String(p.Primary_Image_URL || ''),
      overview: String(p.Overview || ''),
      inclusions,
      exclusions,
      dayTitles,
      searchText: [name, destination, p.Overview, p.Inclusions, p.Day_Wise_Itinerary, p.Hotel_Examples, p.Theme, p.Mood, p.Occasion, ...(p.Highlights || [])]
        .join(' ')
        .toLowerCase(),
      url,
    }
  })

  const destinations = Array.from(new Set(dests.map((d) => String(d.name)).filter(Boolean)))
  cache = { at: Date.now(), packages, destinations }
  return cache
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

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

function bestMonthsFor(pkg: CatalogPackage): number[] | null {
  const keys = [pkg.destination, pkg.destinationSlug.replace(/-packages$/, ''), pkg.country].map((k) => k.toLowerCase())
  for (const k of keys) if (BEST_MONTHS[k]) return BEST_MONTHS[k]
  for (const [k, v] of Object.entries(BEST_MONTHS)) if (keys.some((x) => x.includes(k))) return v
  return null
}

const OCCASION_WORDS: Record<string, RegExp> = {
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

/** Short JSON-friendly view of a package for prompts (keeps token use low). */
export function packageBrief(p: CatalogPackage, withDays = false) {
  return {
    id: p.id,
    name: p.name,
    destination: p.destination,
    nights: p.nights,
    pricePerPersonINR: p.pricePerPerson,
    hotels: p.starLabel,
    meals: p.mealPlan,
    occasions: p.occasions,
    inclusions: p.inclusions.slice(0, 15),
    exclusions: p.exclusions.slice(0, 10),
    ...(withDays ? { days: p.dayTitles } : {}),
  }
}
