/**
 * Pure game logic: vibes, answers → prefs, the live "trips still in the game" count, seasons and the
 * playful data-driven reactions. No React here.
 */
import { bestMonthsFor, scorePackages, type CatalogPackage, type TravellerPrefs } from '@/lib/planner/scoring'
import { BUDGETS, MONTH_LONG, MONTH_SHORT, occasionLabel, shortINR, type BudgetKey } from '../smart/shared'
import { MUST_HAVES } from './mustHaves'
import type { GameData, GameDestination, GamePackage } from './types'

/* ────────────────────────────── answers & steps ────────────────────────────── */

export type StepId = 'intro' | 'occasion' | 'vibe' | 'destination' | 'month' | 'nights' | 'budget' | 'extras' | 'reveal'

export interface Answers {
  occasion: string | null
  vibe: string | null
  /** chosen destination names; [] = any destination of the vibe (or anywhere for "surprise") */
  destinations: string[]
  month: number | null
  nights: number | null
  budget: BudgetKey | null
  stars: number[]
  mustHaves: string[] // MUST_HAVES ids
}

export const EMPTY_ANSWERS: Answers = {
  occasion: null,
  vibe: null,
  destinations: [],
  month: null,
  nights: null,
  budget: null,
  stars: [],
  mustHaves: [],
}

export const GAME_OCCASIONS = [
  { id: 'honeymoon', label: 'Honeymoon', emoji: '💍', sub: 'Just married!' },
  { id: 'anniversary', label: 'Anniversary', emoji: '🥂', sub: 'Years of love' },
  { id: 'birthday', label: 'Birthday', emoji: '🎂', sub: 'Their special day' },
  { id: 'proposal', label: 'Proposal', emoji: '💌', sub: 'Popping the question' },
  { id: 'babymoon', label: 'Babymoon', emoji: '👶', sub: 'Before the little one' },
  { id: 'getaway', label: 'Just because', emoji: '🌴', sub: 'We need a break' },
] as const

/* ────────────────────────────── vibes ────────────────────────────── */

export interface Vibe {
  id: string
  label: string
  emoji: string
  re: RegExp | null // null = everything (surprise)
}

export const VIBES: Vibe[] = [
  { id: 'beach', label: 'Beaches & islands', emoji: '🏝️', re: /bali|andaman|nicobar|phuket|krabi|thailand|maldives|goa|mauritius|seychelles|langkawi|lakshadweep|island|beach|phi phi|boracay/ },
  { id: 'snow', label: 'Snow & mountains', emoji: '🏔️', re: /kashmir|gulmarg|manali|shimla|himachal|ladakh|leh|sikkim|darjeeling|switzerland|swiss|nepal|bhutan|iceland|norway|alps/ },
  { id: 'royal', label: 'Royal palaces', emoji: '🏰', re: /rajasthan|jaipur|udaipur|jodhpur|jaisalmer|agra|heritage|palace/ },
  { id: 'green', label: 'Backwaters & greenery', emoji: '🌿', re: /kerala|munnar|alleppey|coorg|wayanad|ooty|meghalaya|sri lanka|backwater/ },
  { id: 'city', label: 'City lights', emoji: '🌃', re: /singapore|baku|azerbaijan|dubai|abu dhabi|hong kong|kuala|tokyo|istanbul|paris|london|europe|city/ },
  { id: 'surprise', label: 'Surprise me', emoji: '🎲', re: null },
]

const destKey = (d: { name: string; slug?: string; country?: string }) => `${d.name} ${d.slug || ''} ${d.country || ''}`.toLowerCase()

/** Destinations per vibe. A destination matching no vibe only shows under "Surprise me". */
export function vibeDestinations(data: GameData | null): Record<string, GameDestination[]> {
  const out: Record<string, GameDestination[]> = {}
  for (const v of VIBES) out[v.id] = []
  for (const d of data?.destinations || []) {
    out.surprise.push(d)
    const v = VIBES.find((x) => x.re && x.re.test(destKey(d)))
    if (v) out[v.id].push(d)
  }
  return out
}

export const vibeById = (id?: string | null) => VIBES.find((v) => v.id === id) || null

/** Destinations the answers point at ([] = anywhere). */
export function targetDestinations(a: Answers, data: GameData | null): string[] {
  if (a.destinations.length) return a.destinations
  if (!a.vibe || a.vibe === 'surprise') return []
  return vibeDestinations(data)[a.vibe]?.map((d) => d.name) || []
}

/* ────────────────────────────── prefs & live count ────────────────────────────── */

export const budgetMax = (k: BudgetKey | null) => (k ? BUDGETS.find((b) => b.id === k)?.max ?? null : null)

export function mustHavePhrase(id: string, data: GameData | null) {
  return data?.mustHaves.find((m) => m.id === id)?.phrase || MUST_HAVES.find((m) => m.id === id)?.aliases[0] || id
}

/** What we send to /api/tailored-travel/smart-search (and score locally) */
export function prefsFrom(a: Answers, data: GameData | null): TravellerPrefs {
  return {
    destinations: targetDestinations(a, data).slice(0, 4),
    nights: a.nights,
    budgetPerPerson: budgetMax(a.budget),
    month: a.month,
    stars: a.stars,
    occasion: a.occasion,
    mustHaves: a.mustHaves.map((id) => mustHavePhrase(id, data)),
    adults: 2,
  }
}

/** Rebuild just enough of a CatalogPackage for the pure scorer. searchText = the must-have phrases it includes. */
export function toCatalog(data: GameData): CatalogPackage[] {
  return data.packages.map((p: GamePackage) => ({
    id: p.id,
    code: '',
    slug: '',
    name: p.name,
    destination: p.destination,
    destinationSlug: p.slug,
    country: p.country,
    nights: p.nights,
    days: p.nights + 1,
    pricePerPerson: p.pricePerPerson,
    stars: p.stars,
    starLabel: p.stars ? `${p.stars}-Star` : '',
    occasions: p.occasions,
    mood: '',
    mealPlan: '',
    image: p.image,
    overview: '',
    inclusions: [],
    exclusions: [],
    dayTitles: p.days,
    searchText: p.kw.map((id) => mustHavePhrase(id, data)).join(' | '),
    url: '',
  }))
}

/** A trip is "still in the game" when it scores at least this much */
export const IN_GAME_SCORE = 70

export interface LiveCount {
  /** what the HUD shows */
  shown: number
  /** true when nothing strictly matches and we're showing the closest few */
  closest: boolean
  strict: number
}

export function liveCount(catalog: CatalogPackage[], prefs: TravellerPrefs): LiveCount {
  const scored = scorePackages(catalog, prefs)
  const strict = scored.filter((s) => s.score >= IN_GAME_SCORE).length
  if (strict > 0) return { shown: strict, closest: false, strict }
  // never hit 0: the scorer always ranks something; fall back to the whole catalog if the destination is empty
  const pool = scored.length || catalog.length
  return { shown: Math.min(3, pool), closest: true, strict }
}

/* ────────────────────────────── seasons ────────────────────────────── */

export type Season = 'great' | 'snow' | 'hot' | 'rain' | 'unknown'

export function seasonFor(dest: { name: string; slug?: string; country?: string }, month: number): Season {
  const key = destKey(dest)
  if (/kashmir|gulmarg|manali|shimla|ladakh/.test(key) && [12, 1, 2].includes(month)) return 'snow'
  const best = bestMonthsFor({ destination: dest.name, destinationSlug: dest.slug || '', country: dest.country || '' } as CatalogPackage)
  if (!best) return 'unknown'
  if (best.includes(month)) return 'great'
  if (/rajasthan|jaipur|udaipur|dubai/.test(key) && [4, 5, 6].includes(month)) return 'hot'
  return 'rain'
}

export const SEASON_ICON: Record<Season, string> = { great: '☀️', snow: '❄️', hot: '🔥', rain: '🌧️', unknown: '🗓️' }

/** One icon + a tiny label for a month tile across the destinations in play */
export function monthBadge(dests: GameDestination[], month: number): { icon: string; label: string; tone: 'good' | 'mixed' | 'off' } {
  if (!dests.length) return { icon: '🗓️', label: '', tone: 'mixed' }
  const s = dests.map((d) => seasonFor(d, month))
  const good = s.filter((x) => x === 'great' || x === 'snow').length
  if (s.every((x) => x === 'snow')) return { icon: '❄️', label: 'Snow!', tone: 'good' }
  if (good === s.length) return { icon: s.includes('snow') ? '❄️' : '☀️', label: 'Peak season', tone: 'good' }
  if (good > 0) return { icon: '🌤️', label: dests.length > 1 ? `${good} of ${dests.length} shine` : 'Good', tone: 'mixed' }
  if (s.includes('hot')) return { icon: '🔥', label: 'Hot · deals', tone: 'off' }
  return { icon: '🌧️', label: 'Off-season', tone: 'off' }
}

/* ────────────────────────────── nights & budget labels ────────────────────────────── */

export const NIGHT_OPTIONS = [3, 4, 5, 6, 7, 8, 9]
export const nightsLabel = (n: number) => (n <= 4 ? 'Quick escape' : n <= 6 ? 'Perfect getaway' : 'Grand adventure')
export const nightsEmoji = (n: number) => (n <= 4 ? '⚡' : n <= 6 ? '😍' : '🗺️')

export function forTwoLabel(k: BudgetKey): string {
  const b = BUDGETS.find((x) => x.id === k)
  if (!b) return ''
  if (k === 'flexible') return 'Best value wins'
  if (!b.max) return `≈ ${shortINR(b.min * 2)}+ for two`
  if (!b.min) return `≈ under ${shortINR(b.max * 2)} for two`
  return `≈ ${shortINR(b.min * 2)}–${shortINR(b.max * 2)} for two`
}

export const BUDGET_EMOJI: Record<BudgetKey, string> = { u25: '🪙', '25-40': '💰', '40-60': '💸', '60+': '💎', flexible: '🤷' }

/* ────────────────────────────── summary & DNA ────────────────────────────── */

export function summaryQuery(a: Answers, data: GameData | null): string {
  const dests = targetDestinations(a, data)
  const parts: string[] = []
  const occ = a.occasion === 'getaway' ? 'Couple getaway' : occasionLabel(a.occasion) || 'Couple trip'
  parts.push(`${occ} ${dests.length ? `in ${dests.join(' or ')}` : 'anywhere'}`)
  if (a.month) parts.push(`in ${MONTH_LONG[a.month - 1]}`)
  if (a.nights) parts.push(`${a.nights} nights`)
  const max = budgetMax(a.budget)
  if (max) parts.push(`under ${shortINR(max)} per person`)
  if (a.stars.length) parts.push(`${a.stars.join('/')}-star hotels`)
  if (a.mustHaves.length) parts.push(`with ${a.mustHaves.map((id) => MUST_HAVES.find((m) => m.id === id)?.label.toLowerCase() || id).join(', ')}`)
  return parts.join(', ')
}

export function tripDna(a: Answers): string[] {
  const out: string[] = []
  const occ = GAME_OCCASIONS.find((o) => o.id === a.occasion)
  if (occ) out.push(`${occ.emoji} ${occ.label}`)
  const v = vibeById(a.vibe)
  if (a.destinations.length === 1) out.push(`📍 ${a.destinations[0]}`)
  else if (v) out.push(`${v.emoji} ${v.label}`)
  if (a.month) out.push(`🗓️ ${MONTH_SHORT[a.month - 1]}`)
  if (a.nights) out.push(`🌙 ${a.nights} nights`)
  if (a.budget) out.push(`${BUDGET_EMOJI[a.budget]} ${BUDGETS.find((b) => b.id === a.budget)?.label}`)
  if (a.stars.length === 1) out.push(`🏨 ${a.stars[0]}★ hotels`)
  return out
}

/* ────────────────────────────── reactions ────────────────────────────── */

export interface Reaction {
  emoji: string
  text: string
}

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length]

/** A short playful line after an answer. Uses the catalog so it says something true. */
export function reactionFor(step: StepId, a: Answers, data: GameData | null, count: LiveCount, prev: LiveCount | null): Reaction | null {
  if (count.closest && (!prev || !prev.closest)) return { emoji: '🔍', text: "No exact match — we'll find the closest!" }
  const pkgs = data?.packages || []
  const dests = data?.destinations || []
  const inPlay = targetDestinations(a, data)
  const playDests = dests.filter((d) => inPlay.includes(d.name))

  switch (step) {
    case 'occasion': {
      const re: Record<string, RegExp> = { honeymoon: /honeymoon/i, anniversary: /anniversar/i, birthday: /birthday/i, proposal: /propos/i }
      const made = re[a.occasion || ''] ? pkgs.filter((p) => p.occasions.some((o) => re[a.occasion!].test(o)) || re[a.occasion!].test(p.name)).length : 0
      switch (a.occasion) {
        case 'honeymoon':
          return { emoji: '💍', text: made ? `Congrats, newlyweds! ${made} trips are made for honeymooners` : 'Congrats, newlyweds! Let’s make it magical' }
        case 'anniversary':
          return { emoji: '🥂', text: 'Cheers to you two! Time to fall in love all over again' }
        case 'birthday':
          return { emoji: '🎂', text: 'A birthday trip? Best. Gift. Ever.' }
        case 'proposal':
          return { emoji: '💌', text: 'Ooh, big question coming! We’ll keep your secret 🤫' }
        case 'babymoon':
          return { emoji: '👶', text: 'One last trip as two — we’ll keep it easy and relaxed' }
        default:
          return { emoji: '🌴', text: 'No reason needed. You two deserve this!' }
      }
    }
    case 'vibe': {
      const v = vibeById(a.vibe)
      if (!v) return null
      if (v.id === 'surprise') return { emoji: '🎲', text: `Adventurous! All ${pkgs.length} trips are still in play` }
      const n = pkgs.filter((p) => inPlay.includes(p.destination)).length
      const lines: Record<string, string> = {
        beach: `Sand between your toes — ${n} beach trips 🌊`,
        snow: `Cosy & snowy — ${n} mountain trips ☃️`,
        royal: `Feel like royalty — ${n} palace trips 👑`,
        green: `Slow, green and dreamy — ${n} trips 🛶`,
        city: `Bright lights, big city — ${n} trips ✨`,
      }
      return { emoji: v.emoji, text: lines[v.id] || `${n} trips match that vibe` }
    }
    case 'destination': {
      if (a.destinations.length !== 1) return { emoji: '✨', text: `Keeping ${inPlay.length} paradises in play — nice!` }
      const d = dests.find((x) => x.name === a.destinations[0])
      return d ? { emoji: '📍', text: `${d.name}! ${d.packageCount} trips${d.priceFrom ? ` from ${shortINR(d.priceFrom)} pp` : ''}` } : null
    }
    case 'month': {
      if (!a.month) return { emoji: '🤷', text: 'No worries — we’ll suggest the best time too' }
      const m = MONTH_LONG[a.month - 1]
      if (!playDests.length) {
        const shining = dests.filter((d) => ['great', 'snow'].includes(seasonFor(d, a.month!))).map((d) => d.name)
        return shining.length
          ? { emoji: '☀️', text: `${m} is lovely in ${shining.slice(0, 3).join(', ')}${shining.length > 3 ? ' & more' : ''}` }
          : { emoji: '💸', text: `${m} is off-season in most places — great deals though` }
      }
      if (playDests.length === 1) {
        const d = playDests[0]
        const s = seasonFor(d, a.month)
        const beachy = /bali|andaman|phuket|krabi|thailand|maldives/i.test(d.name)
        if (s === 'snow') return { emoji: '❄️', text: `${d.name} in ${m} = snow! Bring gloves` }
        if (s === 'great') return { emoji: beachy ? '☀️' : '🌤️', text: beachy ? `${d.name} in ${m} — sunshine guaranteed` : `${d.name} in ${m} — perfect weather` }
        if (s === 'hot') return { emoji: '🔥', text: `${m} is hot in ${d.name} — quieter palaces & lower prices though 💸` }
        if (s === 'rain') return { emoji: '🌧️', text: `${m} is monsoon-ish in ${d.name} — great deals though 💸` }
        return null
      }
      const good = playDests.filter((d) => ['great', 'snow'].includes(seasonFor(d, a.month!))).map((d) => d.name)
      if (good.length === playDests.length) return { emoji: '☀️', text: `Great pick — ${m} is lovely everywhere on your list` }
      if (good.length) return { emoji: '🌤️', text: `In ${m}, ${good.join(' & ')} shine${good.length === 1 ? 's' : ''} brightest` }
      return { emoji: '💸', text: `${m} is off-season for these — great deals though` }
    }
    case 'nights': {
      if (!a.nights) return { emoji: '👌', text: 'Flexible — we’ll find the sweet spot' }
      const exact = pkgs.filter((p) => p.nights === a.nights && (!inPlay.length || inPlay.includes(p.destination))).length
      const base = a.nights <= 4 ? 'Short & sweet' : a.nights <= 6 ? 'The sweet spot most couples pick' : 'A grand adventure'
      return { emoji: nightsEmoji(a.nights), text: exact ? `${base} — ${exact} trips are exactly ${a.nights} nights` : `${base}! We can tweak nights for you` }
    }
    case 'budget': {
      const b = BUDGETS.find((x) => x.id === a.budget)
      if (!b || a.budget === 'flexible') return { emoji: '🤷', text: 'Flexible! We’ll find the best value for you' }
      if (a.budget === '60+') return { emoji: '💎', text: 'Going all out — love it!' }
      return { emoji: BUDGET_EMOJI[a.budget!], text: pick([`Smart choice — ${forTwoLabel(a.budget!).replace('≈ ', '')}`, `${count.shown} trips fit that wallet`], count.shown) }
    }
    case 'extras': {
      if (a.stars.includes(5) && a.occasion === 'birthday') return { emoji: '🥂', text: 'Ooh, a 5-star birthday — fancy!' }
      if (a.stars.includes(5)) return { emoji: '✨', text: 'Luxe it is — only the finest' }
      if (a.mustHaves.includes('pool')) return { emoji: '🏊', text: 'A pool just for you two? Yes please' }
      if (a.mustHaves.includes('candle')) return { emoji: '🕯️', text: 'Candlelight dinner — so romantic' }
      if (a.stars.includes(3)) return { emoji: '🏡', text: 'Cosy & clever — more to spend on fun' }
      if (a.stars.includes(4)) return { emoji: '🛎️', text: 'Comfy 4-star — the couples’ favourite' }
      return null
    }
    default:
      return null
  }
}

