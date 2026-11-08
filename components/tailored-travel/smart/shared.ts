/**
 * Client-side helpers shared by the AI Planner UI (smart search, wizard, results page).
 * Keep this file free of server-only imports.
 */

/** A package as the planner UI shows it (lite version of the server's ScoredPackage) */
export interface PlannerMatch {
  id: string
  name: string
  destination: string
  nights: number
  days?: number
  pricePerPerson: number
  stars?: number
  starLabel: string
  mealPlan?: string
  image: string
  url: string
  score: number
  reasons: string[]
  notes: string[]
  whyForYou?: string | null
}

/** Preferences as the planner sends them around (mirrors lib/planner/catalog TravellerPrefs) */
export interface PlannerPrefs {
  destinations?: string[]
  nights?: number | null
  budgetPerPerson?: number | null
  month?: number | null
  stars?: number[]
  occasion?: string | null
  mustHaves?: string[]
  adults?: number | null
}

export const WHATSAPP_NUMBER = '919929962350'
export const whatsappLink = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`

export const formatINR = (n?: number | null) => (n ? '₹' + Math.round(n).toLocaleString('en-IN') : 'Price on request')

/** ₹60k / ₹1.5L style */
export function shortINR(n?: number | null): string {
  if (!n) return ''
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`
  return `₹${n}`
}

export const travellersLabel = (adults?: number | null) => {
  const n = adults && adults > 0 ? adults : 2
  return n === 2 ? 'for two' : n === 1 ? 'for one' : `for ${n}`
}

export const totalFor = (pricePerPerson: number, adults?: number | null) => pricePerPerson * (adults && adults > 0 ? adults : 2)

export const OCCASIONS = [
  { id: 'honeymoon', label: 'Honeymoon', icon: '💍' },
  { id: 'anniversary', label: 'Anniversary', icon: '🥂' },
  { id: 'birthday', label: 'Birthday', icon: '🎂' },
  { id: 'proposal', label: 'Proposal', icon: '💌' },
  { id: 'babymoon', label: 'Babymoon', icon: '👶' },
  { id: 'getaway', label: 'Just a getaway', icon: '🌴' },
] as const

export const occasionLabel = (id?: string | null) => OCCASIONS.find((o) => o.id === id)?.label || ''

/** Budget per person buckets. `max` feeds the scorer; min/max drive client-side filters. */
export const BUDGETS = [
  { id: 'u25', label: 'Under ₹25k', min: 0, max: 25000 },
  { id: '25-40', label: '₹25–40k', min: 25000, max: 40000 },
  { id: '40-60', label: '₹40–60k', min: 40000, max: 60000 },
  { id: '60+', label: '₹60k+', min: 60000, max: null },
  { id: 'flexible', label: 'Flexible', min: 0, max: null },
] as const

export type BudgetKey = (typeof BUDGETS)[number]['id']

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The next 12 months starting with the current one: [{ month: 1-12, year, label: "Dec '26" }] */
export function nextMonths(count = 12) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: `${MONTH_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` }
  })
}

/** Stable random id per browser tab, sent with searches and leads so sales can join them up. */
export function getPlannerSessionId(): string {
  if (typeof window === 'undefined') return ''
  const KEY = 'tz_planner_session'
  try {
    let id = sessionStorage.getItem(KEY)
    if (!id) {
      id = (crypto as any)?.randomUUID?.() || `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(KEY, id as string)
    }
    return id as string
  } catch {
    return ''
  }
}
