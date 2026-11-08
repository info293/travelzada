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
import { type CatalogPackage } from './scoring'

export {
  BEST_MONTHS,
  OCCASION_WORDS,
  bestMonthsFor,
  matchesDestination,
  mentions,
  monthName,
  norm,
  scorePackages,
} from './scoring'
export type { CatalogPackage, ScoredPackage, TravellerPrefs } from './scoring'

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
