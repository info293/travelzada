'use client'

import { useEffect, useMemo, useState, type MutableRefObject, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Play } from 'lucide-react'
import { BUDGETS, nextMonths, shortINR, type BudgetKey } from '../smart/shared'
import { Chip, EmojiCard, PhotoTile, focusRing } from './Cards'
import { MUST_HAVES } from './mustHaves'
import {
  BUDGET_EMOJI,
  GAME_OCCASIONS,
  NIGHT_OPTIONS,
  VIBES,
  forTwoLabel,
  monthBadge,
  nightsEmoji,
  nightsLabel,
  targetDestinations,
  type Answers,
} from './logic'
import type { GameData, GameDestination } from './types'

/** Which destination photo best represents each vibe tile (first match with a photo wins) */
const VIBE_PHOTO_ORDER: Record<string, RegExp[]> = {
  beach: [/andaman/i, /maldives/i, /bali/i, /phuket|krabi/i],
  city: [/singapore/i, /dubai/i, /baku/i],
}

/** Number keys 1-9 → options[i]; Enter → enter() */
export interface KeyMap {
  options: Array<() => void>
  enter?: () => void
}
type Keys = MutableRefObject<KeyMap>

function useKeys(keys: Keys, map: KeyMap) {
  useEffect(() => {
    keys.current = map
  })
}

export function ScreenTitle({ title, sub, id }: { title: ReactNode; sub?: ReactNode; id: string }) {
  return (
    <div className="text-center mb-5 sm:mb-7">
      <h2 id={id} tabIndex={-1} className="font-display text-[32px] leading-[1.05] sm:text-5xl font-semibold text-white outline-none">
        {title}
      </h2>
      {sub && <p className="mt-2 text-sm sm:text-base text-white/70">{sub}</p>}
    </div>
  )
}

const trips = (n: number) => `${n} trip${n === 1 ? '' : 's'}`

/* ─────────────────────────────── 0 · Intro ─────────────────────────────── */

export function IntroScreen({ data, onPlay, keys }: { data: GameData | null; onPlay: () => void; keys: Keys }) {
  const reduce = useReducedMotion()
  useKeys(keys, { options: [], enter: onPlay })

  // one photo per destination, up to 5
  const photos = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of data?.packages || []) {
      if (!p.image || seen.has(p.destination)) continue
      seen.add(p.destination)
      out.push(p.image)
      if (out.length === 5) break
    }
    return out
  }, [data])
  const fan = photos.length ? photos : [null, null, null, null, null]
  const mid = (fan.length - 1) / 2

  return (
    <div className="flex flex-col items-center text-center pt-2 sm:pt-6">
      {/* fanned stack of real trip photos */}
      <div className="relative h-44 sm:h-60 w-full max-w-md" aria-hidden="true">
        {fan.map((src, i) => {
          const off = i - mid
          return (
            <motion.div
              key={i}
              className="absolute left-1/2 bottom-0 w-28 h-40 sm:w-40 sm:h-56 -ml-14 sm:-ml-20 origin-bottom rounded-2xl overflow-hidden border-[3px] border-white shadow-2xl shadow-black/40 bg-bordeaux-700"
              initial={reduce ? false : { rotate: 0, x: 0, y: 40, opacity: 0 }}
              animate={{ rotate: off * 11, x: off * 46, y: Math.abs(off) * 10, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.1 + i * 0.07 }}
              whileHover={reduce ? undefined : { y: Math.abs(off) * 10 - 16 }}
              style={{ zIndex: 10 - Math.abs(off) }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="w-full h-full object-cover" loading="eager" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-bordeaux-500 to-bordeaux-800 animate-pulse" />
              )}
            </motion.div>
          )
        })}
        {!reduce && (
          <motion.span
            className="absolute -top-2 right-6 sm:right-2 text-3xl"
            animate={{ y: [0, -8, 0], rotate: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            ✈️
          </motion.span>
        )}
      </div>

      <span className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-[#E9D48B]">
        ✨ AI Trip Planner for couples
      </span>
      <h1 className="mt-3 font-display text-[40px] leading-[1.02] sm:text-6xl font-semibold text-white max-w-2xl">
        Let&apos;s find your perfect trip <span className="italic text-[#E9D48B]">in 60 seconds</span>
      </h1>
      <p className="mt-3 text-white/75 text-sm sm:text-base max-w-md">
        Answer a few fun questions. We&apos;ll shuffle {data?.packages.length || 'our'} couple trips and reveal the one made for you two.
      </p>

      <motion.button
        type="button"
        onClick={onPlay}
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.04 }}
        animate={reduce ? undefined : { boxShadow: ['0 0 0 0 rgba(212,175,55,0.55)', '0 0 0 18px rgba(212,175,55,0)'] }}
        transition={reduce ? undefined : { repeat: Infinity, duration: 1.8 }}
        className={`mt-7 inline-flex min-h-[60px] items-center gap-3 rounded-full bg-[#D4AF37] hover:bg-[#dfbd4c] text-bordeaux-950 font-bold text-lg px-9 ${focusRing}`}
      >
        <span className="w-9 h-9 rounded-full bg-bordeaux-900 text-[#D4AF37] flex items-center justify-center">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </span>
        Let&apos;s play
      </motion.button>
      <p className="mt-4 text-xs sm:text-sm text-white/60">6 quick taps · no forms · 100% free</p>
    </div>
  )
}

/* ─────────────────────────────── 1 · Occasion ─────────────────────────────── */

export function OccasionScreen({ answers, onPick, keys }: { answers: Answers; onPick: (id: string) => void; keys: Keys }) {
  useKeys(keys, { options: GAME_OCCASIONS.map((o) => () => onPick(o.id)) })
  return (
    <>
      <ScreenTitle id="game-title" title="What are we celebrating?" sub="Every great trip starts with a reason 💕" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
        {GAME_OCCASIONS.map((o, i) => (
          <EmojiCard key={o.id} emoji={o.emoji} label={o.label} sub={o.sub} selected={answers.occasion === o.id} onClick={() => onPick(o.id)} n={i + 1} />
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────────── 2 · Vibe ─────────────────────────────── */

export function VibeScreen({
  answers,
  data,
  byVibe,
  onPick,
  keys,
}: {
  answers: Answers
  data: GameData | null
  byVibe: Record<string, GameDestination[]>
  onPick: (id: string) => void
  keys: Keys
}) {
  // hide vibes with no destinations (except "surprise")
  const vibes = VIBES.filter((v) => v.id === 'surprise' || byVibe[v.id]?.length)
  useKeys(keys, { options: vibes.map((v) => () => onPick(v.id)) })
  const countFor = (id: string) => {
    const names = new Set(byVibe[id]?.map((d) => d.name))
    return (data?.packages || []).filter((p) => id === 'surprise' || names.has(p.destination)).length
  }
  const imageFor = (id: string) => {
    const list = byVibe[id] || []
    if (id === 'surprise') return undefined
    // Show the most "on-theme" destination first (e.g. a real beach for Beaches & islands, not a temple)
    const preferred = VIBE_PHOTO_ORDER[id]?.map((re) => list.find((d) => re.test(d.name) && d.image)).find(Boolean)
    return preferred?.image || list[0]?.image || data?.packages.find((p) => list.some((d) => d.name === p.destination) && p.image)?.image
  }
  return (
    <>
      <ScreenTitle id="game-title" title="Pick your vibe" sub="Where does your heart want to wake up?" />
      {!data ? (
        <LoadingGrid />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {vibes.map((v, i) => (
            <PhotoTile
              key={v.id}
              image={imageFor(v.id)}
              emoji={v.emoji}
              label={v.label}
              sub={v.id === 'surprise' ? `All ${trips(countFor(v.id))}` : `${trips(countFor(v.id))} · ${byVibe[v.id].map((d) => d.name).join(', ')}`}
              selected={answers.vibe === v.id}
              onClick={() => onPick(v.id)}
              n={i + 1}
              eager
              className="aspect-[4/3] sm:aspect-[16/10]"
            />
          ))}
        </div>
      )}
    </>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="aspect-[4/3] sm:aspect-[16/10] rounded-3xl bg-white/10 animate-pulse" />
      ))}
    </div>
  )
}

/* ─────────────────────────────── 3 · Destination ─────────────────────────────── */

export function DestinationScreen({
  answers,
  dests,
  onPick,
  keys,
}: {
  answers: Answers
  dests: GameDestination[]
  onPick: (name: string | null) => void
  keys: Keys
}) {
  useKeys(keys, { options: [...dests.map((d) => () => onPick(d.name)), () => onPick(null)] })
  return (
    <>
      <ScreenTitle id="game-title" title="Choose your paradise" sub="Tap one — or keep them all in the game" />
      <div className={`grid gap-3 sm:gap-4 max-w-4xl mx-auto ${dests.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
        {dests.map((d, i) => (
          <PhotoTile
            key={d.name}
            image={d.image}
            label={d.name}
            sub={trips(d.packageCount)}
            badge={d.priceFrom ? `from ${shortINR(d.priceFrom)} pp` : undefined}
            selected={answers.destinations.length === 1 && answers.destinations[0] === d.name}
            onClick={() => onPick(d.name)}
            n={i + 1}
            eager
            className={dests.length <= 2 ? 'aspect-[16/9]' : 'aspect-[4/5] sm:aspect-[4/3]'}
          />
        ))}
        <EmojiCard
          emoji="✨"
          label="Any of these"
          sub={`Keep all ${dests.length} in the game`}
          selected={!!answers.vibe && answers.destinations.length === 0}
          onClick={() => onPick(null)}
          n={dests.length + 1}
          className={dests.length % 2 === 0 ? 'col-span-2 lg:col-span-1' : ''}
        />
      </div>
    </>
  )
}

/* ─────────────────────────────── 4 · Month ─────────────────────────────── */

export function MonthScreen({
  answers,
  dests,
  onPick,
  keys,
  monthTouched,
}: {
  answers: Answers
  dests: GameDestination[]
  onPick: (m: number | null) => void
  keys: Keys
  monthTouched: boolean
}) {
  const months = useMemo(() => nextMonths(12), [])
  useKeys(keys, { options: months.slice(0, 9).map((m) => () => onPick(m.month)) })
  const where = dests.length === 1 ? dests[0].name : dests.length ? 'your picks' : 'our destinations'
  return (
    <>
      <ScreenTitle id="game-title" title="When are you going?" sub={<>We&apos;ll show the weather in {where} ☀️</>} />
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3 max-w-4xl mx-auto">
        {months.map((m, i) => {
          const b = monthBadge(dests, m.month)
          return (
            <EmojiCard
              key={`${m.year}-${m.month}`}
              emoji={b.icon}
              label={m.label}
              sub={b.label || undefined}
              selected={answers.month === m.month}
              onClick={() => onPick(m.month)}
              n={i < 9 ? i + 1 : undefined}
              className="!py-3"
            />
          )
        })}
      </div>
      <div className="mt-3 max-w-4xl mx-auto">
        <Chip selected={monthTouched && answers.month === null} onClick={() => onPick(null)} className="w-full">
          🤷 Not sure yet
        </Chip>
      </div>
    </>
  )
}

/* ─────────────────────────────── 5 · Nights ─────────────────────────────── */

export function NightsScreen({
  answers,
  data,
  targets,
  onPick,
  keys,
}: {
  answers: Answers
  data: GameData | null
  targets: string[]
  onPick: (n: number) => void
  keys: Keys
}) {
  useKeys(keys, { options: NIGHT_OPTIONS.map((n) => () => onPick(n)) })
  const countFor = (n: number) =>
    (data?.packages || []).filter((p) => p.nights === n && (!targets.length || targets.includes(p.destination))).length
  const groups = [
    { label: 'Quick escape', nights: [3, 4] },
    { label: 'Perfect getaway', nights: [5, 6] },
    { label: 'Grand adventure', nights: [7, 8, 9] },
  ]
  let k = 0
  return (
    <>
      <ScreenTitle id="game-title" title="How many nights?" sub="Most couples love 5–6 nights 😍" />
      <div className="max-w-3xl mx-auto space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
              {nightsEmoji(g.nights[0])} {g.label}
            </p>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {g.nights.map((n) => {
                const c = countFor(n)
                const idx = ++k
                return (
                  <EmojiCard
                    key={n}
                    emoji={String(n)}
                    label="nights"
                    sub={c ? trips(c) : nightsLabel(n)}
                    selected={answers.nights === n}
                    onClick={() => onPick(n)}
                    n={idx}
                    className="!py-3 font-display"
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────────── 6 · Budget ─────────────────────────────── */

export function BudgetScreen({ answers, onPick, keys }: { answers: Answers; onPick: (k: BudgetKey) => void; keys: Keys }) {
  const reduce = useReducedMotion()
  const [burst, setBurst] = useState<{ id: BudgetKey; n: number } | null>(null)
  const pickBudget = (id: BudgetKey) => {
    setBurst({ id, n: Date.now() })
    onPick(id)
  }
  useKeys(keys, { options: BUDGETS.map((b) => () => pickBudget(b.id)) })
  return (
    <>
      <ScreenTitle id="game-title" title="Budget per person?" sub="For the whole trip — we’ll show the total for two 💑" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
        {BUDGETS.map((b, i) => (
          <div key={b.id} className={`relative ${b.id === 'flexible' ? 'col-span-2 sm:col-span-1' : ''}`}>
            <EmojiCard emoji={BUDGET_EMOJI[b.id]} label={b.label} sub={forTwoLabel(b.id)} selected={answers.budget === b.id} onClick={() => pickBudget(b.id)} n={i + 1} />
            <AnimatePresence>
              {!reduce && burst?.id === b.id && (
                <div key={burst.n} className="pointer-events-none absolute inset-0" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((c) => (
                    <motion.span
                      key={c}
                      className="absolute left-1/2 top-1/3 text-xl"
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                      animate={{ x: (c - 2) * 26, y: -70 - (c % 2) * 24, opacity: 0, scale: 1.2, rotate: (c - 2) * 40 }}
                      transition={{ duration: 0.75, ease: 'easeOut', delay: c * 0.03 }}
                    >
                      🪙
                    </motion.span>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────────── 7 · Extras ─────────────────────────────── */

const STAR_OPTIONS = [
  { stars: [3], label: 'Cosy 3★', emoji: '🏡' },
  { stars: [4], label: 'Comfy 4★', emoji: '🛎️' },
  { stars: [5], label: 'Luxe 5★', emoji: '✨' },
  { stars: [] as number[], label: 'Any', emoji: '👌' },
]

export function ExtrasScreen({
  answers,
  data,
  starsTouched,
  onStars,
  onToggleMust,
  onReveal,
  keys,
}: {
  answers: Answers
  data: GameData | null
  starsTouched: boolean
  onStars: (s: number[]) => void
  onToggleMust: (id: string) => void
  onReveal: () => void
  keys: Keys
}) {
  const reduce = useReducedMotion()
  // Only offer must-haves that at least one trip in the chosen destinations really has (no "Snow" for Bali)
  const inPlay = targetDestinations(answers, data)
  const musts = MUST_HAVES.filter(
    (m) => !data || data.packages.some((p) => (!inPlay.length || inPlay.includes(p.destination)) && p.kw.includes(m.id)),
  )
  useKeys(keys, {
    options: [...STAR_OPTIONS.map((s) => () => onStars(s.stars)), ...musts.slice(0, 5).map((m) => () => onToggleMust(m.id))],
    enter: onReveal,
  })
  const sameStars = (s: number[]) => s.length === answers.stars.length && s.every((x) => answers.stars.includes(x))
  return (
    <>
      <ScreenTitle id="game-title" title="Last one! Hotel & must-haves" sub="Optional — pick what makes it special" />
      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">🏨 Hotel style</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {STAR_OPTIONS.map((s, i) => (
            <Chip key={s.label} selected={(s.stars.length > 0 || starsTouched) && sameStars(s.stars)} onClick={() => onStars(s.stars)} n={i + 1}>
              <span aria-hidden="true">{s.emoji}</span> {s.label}
            </Chip>
          ))}
        </div>

        {musts.length > 0 && (
          <>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">💝 Must-haves (pick any)</p>
            <div className="flex flex-wrap gap-2.5">
              {musts.map((m, i) => (
                <Chip key={m.id} selected={answers.mustHaves.includes(m.id)} onClick={() => onToggleMust(m.id)} n={i < 5 ? i + 5 : undefined}>
                  <span aria-hidden="true">{m.emoji}</span> {m.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 flex justify-center">
          <motion.button
            type="button"
            onClick={onReveal}
            whileTap={{ scale: 0.93 }}
            whileHover={{ scale: 1.04 }}
            animate={reduce ? undefined : { rotate: [0, -2, 2, -1, 0] }}
            transition={reduce ? undefined : { repeat: Infinity, repeatDelay: 2.2, duration: 0.5 }}
            className={`inline-flex min-h-[60px] items-center gap-2 rounded-full bg-[#D4AF37] hover:bg-[#dfbd4c] text-bordeaux-950 font-bold text-lg px-9 shadow-xl shadow-black/30 ${focusRing}`}
          >
            Reveal my trip <span aria-hidden="true">🎁</span>
          </motion.button>
        </div>
        <p className="mt-3 text-center text-xs text-white/50 hidden md:block">Press Enter to reveal</p>
      </div>
    </>
  )
}
