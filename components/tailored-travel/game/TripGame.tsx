'use client'

/**
 * "Find your perfect trip" — the AI Planner as a game.
 * One question per screen → a live "trips still in the game" counter (scored in the browser with the same pure
 * scorer the server uses) → shuffle → ONE winning package flips over (from /api/tailored-travel/smart-search).
 *
 * Dev-only QA: ?qa=intro|occasion|vibe|destination|month|nights|budget|extras|shuffle|reveal
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import LeadSheet from '../smart/LeadSheet'
import { getPlannerSessionId, type PlannerMatch } from '../smart/shared'
import type { BudgetKey } from '../smart/shared'
import { JourneyPath, TripCounter } from './Hud'
import ReactionBubble from './ReactionBubble'
import MatchReveal from './MatchReveal'
import { focusRing } from './Cards'
import {
  BudgetScreen,
  DestinationScreen,
  ExtrasScreen,
  IntroScreen,
  MonthScreen,
  NightsScreen,
  OccasionScreen,
  VibeScreen,
  type KeyMap,
} from './Screens'
import {
  EMPTY_ANSWERS,
  liveCount,
  prefsFrom,
  reactionFor,
  summaryQuery,
  targetDestinations,
  toCatalog,
  tripDna,
  vibeDestinations,
  type Answers,
  type Reaction,
  type StepId,
} from './logic'
import type { GameData } from './types'

const QUESTION_STEPS: StepId[] = ['occasion', 'vibe', 'destination', 'month', 'nights', 'budget', 'extras']
const ADVANCE_MS = 350

/** The preset QA answers: Bali honeymoon, December, 6 nights, ₹60k, 4★ */
const QA_PRESET: Answers = {
  occasion: 'honeymoon',
  vibe: 'beach',
  destinations: ['Bali'],
  month: 12,
  nights: 6,
  budget: '40-60',
  stars: [4],
  mustHaves: [],
}

interface SearchState {
  loading: boolean
  results: PlannerMatch[] | null
  error: string | null
  activityId: string | null
  query: string
}

const IDLE_SEARCH: SearchState = { loading: false, results: null, error: null, activityId: null, query: '' }

export default function TripGame() {
  const reduce = useReducedMotion()
  const [data, setData] = useState<GameData | null>(null)
  const [dataError, setDataError] = useState(false)
  const [step, setStep] = useState<StepId>('intro')
  const [dir, setDir] = useState(1)
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [touched, setTouched] = useState<{ month: boolean; stars: boolean }>({ month: false, stars: false })
  const [reaction, setReaction] = useState<{ r: Reaction; id: number } | null>(null)
  const [search, setSearch] = useState<SearchState>(IDLE_SEARCH)
  const [holdShuffle, setHoldShuffle] = useState(false)
  const [lead, setLead] = useState<{ open: boolean; pkg: PlannerMatch | null }>({ open: false, pkg: null })
  const keys = useRef<KeyMap>({ options: [] })
  const busy = useRef(false)
  const panelRef = useRef<HTMLElement>(null)
  const qaDone = useRef(false)

  /* ── data ── */
  const loadData = useCallback(() => {
    setDataError(false)
    fetch('/api/planner/game-data')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: GameData) => setData(d))
      .catch(() => setDataError(true))
  }, [])
  useEffect(loadData, [loadData])

  const catalog = useMemo(() => (data ? toCatalog(data) : []), [data])
  const byVibe = useMemo(() => vibeDestinations(data), [data])
  const count = useMemo(() => (data ? liveCount(catalog, prefsFrom(answers, data)) : null), [catalog, answers, data])

  /* ── steps ── */
  const stepsFor = useCallback(
    (a: Answers) => QUESTION_STEPS.filter((s) => s !== 'destination' || (!!a.vibe && a.vibe !== 'surprise' && (byVibe[a.vibe]?.length || 0) > 1)),
    [byVibe]
  )
  const steps = stepsFor(answers)
  const level = Math.max(1, steps.indexOf(step) + 1)

  const scrollToPanel = useCallback(() => {
    const el = panelRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top
    if (top < 0 || top > 120) window.scrollTo({ top: window.scrollY + top - 64, behavior: reduce ? 'auto' : 'smooth' })
  }, [reduce])

  const go = useCallback(
    (to: StepId, direction = 1) => {
      setDir(direction)
      setStep(to)
      busy.current = false
    },
    []
  )

  /* ── search (the reveal) ── */
  const runSearch = useCallback(
    async (a: Answers) => {
      const query = summaryQuery(a, data)
      setSearch({ ...IDLE_SEARCH, loading: true, query })
      try {
        const res = await fetch('/api/tailored-travel/smart-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, prefs: prefsFrom(a, data), sessionId: getPlannerSessionId() }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'We could not find your trip right now.')
        setSearch({ loading: false, results: json.results || [], error: null, activityId: json.activityId || null, query })
      } catch (err) {
        setSearch({ loading: false, results: null, error: (err as Error).message, activityId: null, query })
      }
    },
    [data]
  )

  /* ── answering ── */
  const answer = useCallback(
    (patch: Partial<Answers>, opts: { advance?: boolean; delay?: number } = {}) => {
      if (busy.current) return
      const next = { ...answers, ...patch }
      setAnswers(next)
      if (data) {
        const before = liveCount(catalog, prefsFrom(answers, data))
        const after = liveCount(catalog, prefsFrom(next, data))
        const r = reactionFor(step, next, data, after, before)
        if (r) setReaction({ r, id: Date.now() })
      }
      if (opts.advance === false) return
      busy.current = true
      const list = stepsFor(next)
      const i = list.indexOf(step)
      const to = list[i + 1] || 'reveal'
      setTimeout(() => {
        if (to === 'reveal') runSearch(next)
        go(to, 1)
      }, opts.delay ?? ADVANCE_MS)
    },
    [answers, catalog, data, go, runSearch, step, stepsFor]
  )

  const back = useCallback(() => {
    if (busy.current) return
    const i = steps.indexOf(step)
    go(i <= 0 ? 'intro' : steps[i - 1], -1)
  }, [go, step, steps])

  const skip = useCallback(() => {
    if (busy.current) return
    const patch: Partial<Answers> =
      step === 'occasion' ? { occasion: null } : step === 'nights' ? { nights: null } : step === 'budget' ? { budget: null } : step === 'month' ? { month: null } : {}
    if (step === 'extras') {
      runSearch(answers)
      go('reveal', 1)
      return
    }
    const list = stepsFor({ ...answers, ...patch })
    setAnswers((a) => ({ ...a, ...patch }))
    go(list[list.indexOf(step) + 1] || 'reveal', 1)
  }, [answers, go, runSearch, step, stepsFor])

  const play = useCallback(() => {
    go('occasion', 1)
    scrollToPanel()
  }, [go, scrollToPanel])

  const reveal = useCallback(() => {
    runSearch(answers)
    go('reveal', 1)
    scrollToPanel()
  }, [answers, go, runSearch, scrollToPanel])

  const playAgain = useCallback(() => {
    setAnswers(EMPTY_ANSWERS)
    setTouched({ month: false, stars: false })
    setSearch(IDLE_SEARCH)
    setReaction(null)
    go('intro', -1)
    scrollToPanel()
  }, [go, scrollToPanel])

  const changeAnswers = useCallback(() => {
    setReaction(null)
    go('occasion', -1)
    scrollToPanel()
  }, [go, scrollToPanel])

  /* ── keyboard: 1-9 choose, Enter continue, ← back ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lead.open || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      // only when the game is on screen
      const r = panelRef.current?.getBoundingClientRect()
      if (!r || r.bottom < 80 || r.top > window.innerHeight - 80) return
      if (/^[1-9]$/.test(e.key)) {
        const fn = keys.current.options[Number(e.key) - 1]
        if (fn) {
          e.preventDefault()
          fn()
        }
      } else if (e.key === 'Enter' && keys.current.enter && t?.tagName !== 'BUTTON' && t?.tagName !== 'A') {
        e.preventDefault()
        keys.current.enter()
      } else if (e.key === 'Escape') {
        setReaction(null)
      } else if (e.key === 'ArrowLeft' && step !== 'intro' && step !== 'reveal') {
        back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, lead.open, step])

  // clear stale key handlers on screens that don't register any (reveal)
  useEffect(() => {
    if (step === 'reveal') keys.current = { options: [] }
    // move focus to the new question for screen readers (without scrolling)
    if (step !== 'intro' && step !== 'reveal') {
      const t = setTimeout(() => document.getElementById('game-title')?.focus({ preventScroll: true }), reduce ? 0 : 320)
      return () => clearTimeout(t)
    }
  }, [step, reduce])

  /* ── dev-only QA jump: ?qa=<screen> ── */
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || qaDone.current) return
    const qa = new URLSearchParams(window.location.search).get('qa')
    if (!qa) return
    const target = qa === 'shuffle' ? 'reveal' : (qa as StepId)
    if (!['intro', ...QUESTION_STEPS, 'reveal'].includes(target)) return
    if (target !== 'intro' && target !== 'occasion' && !data) return // wait for data (vibe/destination need it)
    qaDone.current = true
    const upto = target === 'reveal' ? QUESTION_STEPS.length : QUESTION_STEPS.indexOf(target as StepId)
    const preset: Answers = { ...EMPTY_ANSWERS }
    QUESTION_STEPS.slice(0, Math.max(0, upto)).forEach((s) => {
      if (s === 'occasion') preset.occasion = QA_PRESET.occasion
      if (s === 'vibe') preset.vibe = QA_PRESET.vibe
      if (s === 'destination') preset.destinations = [data?.destinations.find((d) => /bali/i.test(d.name))?.name || 'Bali']
      if (s === 'month') preset.month = QA_PRESET.month
      if (s === 'nights') preset.nights = QA_PRESET.nights
      if (s === 'budget') preset.budget = QA_PRESET.budget
      if (s === 'extras') preset.stars = QA_PRESET.stars
    })
    setAnswers(preset)
    setTouched({ month: upto > 3, stars: upto > 6 })
    if (qa === 'shuffle') {
      setHoldShuffle(true)
      setSearch({ ...IDLE_SEARCH, loading: true })
    } else if (qa === 'reveal') runSearch(preset)
    go(target, 1)
  }, [data, go, runSearch])

  const closeLead = useCallback(() => setLead((l) => ({ ...l, open: false })), [])

  /* ── render ── */
  const targets = targetDestinations(answers, data)
  const vibeDests = answers.vibe ? byVibe[answers.vibe] || [] : []
  const monthDests = (data?.destinations || []).filter((d) => targets.includes(d.name))
  const bgImage =
    step === 'intro' || step === 'occasion'
      ? null
      : (targets.length === 1 && data?.destinations.find((d) => d.name === targets[0])?.image) || vibeDests[0]?.image || null
  const daysFor = (id: string) => data?.packages.find((p) => p.id === id)?.days
  const canSkip = step === 'occasion' || step === 'month' || step === 'nights' || step === 'budget' || step === 'extras'

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 60, scale: 0.97 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -60, scale: 0.97 }),
  }

  let screen: React.ReactNode = null
  switch (step) {
    case 'intro':
      screen = <IntroScreen data={data} onPlay={play} keys={keys} />
      break
    case 'occasion':
      screen = <OccasionScreen answers={answers} onPick={(id) => answer({ occasion: id })} keys={keys} />
      break
    case 'vibe':
      screen = dataError ? (
        <DataError onRetry={loadData} />
      ) : (
        <VibeScreen
          answers={answers}
          data={data}
          byVibe={byVibe}
          keys={keys}
          onPick={(id) => {
            const list = byVibe[id] || []
            answer({ vibe: id, destinations: id !== 'surprise' && list.length === 1 ? [list[0].name] : [] })
          }}
        />
      )
      break
    case 'destination':
      screen = <DestinationScreen answers={answers} dests={vibeDests} keys={keys} onPick={(name) => answer({ destinations: name ? [name] : [] })} />
      break
    case 'month':
      screen = (
        <MonthScreen
          answers={answers}
          dests={monthDests}
          keys={keys}
          monthTouched={touched.month}
          onPick={(m) => {
            setTouched((t) => ({ ...t, month: true }))
            answer({ month: m })
          }}
        />
      )
      break
    case 'nights':
      screen = <NightsScreen answers={answers} data={data} targets={targets} keys={keys} onPick={(n) => answer({ nights: n })} />
      break
    case 'budget':
      screen = <BudgetScreen answers={answers} keys={keys} onPick={(k: BudgetKey) => answer({ budget: k }, { delay: reduce ? ADVANCE_MS : 650 })} />
      break
    case 'extras':
      screen = (
        <ExtrasScreen
          answers={answers}
          data={data}
          keys={keys}
          starsTouched={touched.stars}
          onStars={(s) => {
            setTouched((t) => ({ ...t, stars: true }))
            answer({ stars: s }, { advance: false })
          }}
          onToggleMust={(id) =>
            answer({ mustHaves: answers.mustHaves.includes(id) ? answers.mustHaves.filter((m) => m !== id) : [...answers.mustHaves, id] }, { advance: false })
          }
          onReveal={reveal}
        />
      )
      break
    case 'reveal':
      screen = (
        <div className="pt-2">
          {(search.loading || holdShuffle) && (
            <p className="text-center font-display text-3xl sm:text-4xl font-semibold text-white">Finding your perfect match…</p>
          )}
          <MatchReveal
            loading={search.loading}
            results={search.results}
            error={search.error}
            onRetry={() => runSearch(answers)}
            adults={2}
            dna={tripDna(answers)}
            daysFor={daysFor}
            onLead={(pkg) => setLead({ open: true, pkg })}
            onChangeAnswers={changeAnswers}
            onPlayAgain={playAgain}
            lines={[`Checking ${data?.packages.length || 86} trips…`, 'Comparing hotels…', 'Asking our travel designers…', 'Matching your vibe…', 'Almost there…']}
            holdShuffle={holdShuffle}
          />
        </div>
      )
      break
  }

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={panelRef}
        aria-label="Find your perfect trip game"
        className="relative w-full sm:max-w-6xl sm:mx-auto sm:px-6 sm:pt-6 scroll-mt-16"
      >
        <div className="relative overflow-hidden sm:rounded-[36px] bg-bordeaux-950 text-white min-h-[calc(100svh-4rem)] sm:min-h-[680px] flex flex-col shadow-2xl shadow-bordeaux-950/30">
          {/* background: wine glow + the destination in play, softly */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#852233_0%,#4C111C_45%,#1A0509_100%)]" />
            <AnimatePresence>
              {bgImage && (
                <motion.img
                  key={bgImage}
                  src={bgImage}
                  alt=""
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.16 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 w-full h-full object-cover blur-[2px] scale-105"
                />
              )}
            </AnimatePresence>
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#C9A0AC]/10 blur-3xl" />
            <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl" />
          </div>

          {/* HUD */}
          {step !== 'intro' && (
            <div className="relative z-20 flex items-center gap-3 px-4 sm:px-8 pt-4 sm:pt-6">
              <JourneyPath level={level} total={steps.length} done={step === 'reveal'} />
              <TripCounter count={count} loading={!data && !dataError} />
            </div>
          )}

          {/* screen */}
          <div className="relative z-10 flex-1 px-4 sm:px-8 pt-6 sm:pt-8 pb-28">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              >
                {screen}
              </motion.div>
            </AnimatePresence>
          </div>

          <ReactionBubble reaction={reaction?.r || null} id={reaction?.id || 0} onDone={() => setReaction(null)} />

          {/* footer nav */}
          {step !== 'intro' && step !== 'reveal' && (
            <div className="absolute z-20 inset-x-0 bottom-0 px-4 sm:px-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 flex items-center justify-between bg-gradient-to-t from-bordeaux-950 via-bordeaux-950/80 to-transparent">
              <button
                type="button"
                onClick={back}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 ${focusRing}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <span className="hidden md:block text-[11px] text-white/40">Tip: press 1–9 to choose</span>
              {canSkip ? (
                <button
                  type="button"
                  onClick={skip}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 ${focusRing}`}
                >
                  {step === 'extras' ? 'Skip & reveal' : 'Skip'} →
                </button>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>
      </section>

      <LeadSheet
        open={lead.open}
        onClose={closeLead}
        pkg={lead.pkg}
        prefs={prefsFrom(answers, data)}
        query={search.query}
        activityId={search.activityId}
        shownMatches={search.results?.slice(0, 3).map((r) => ({ id: r.id, name: r.name, score: r.score }))}
        source="AI Planner – Game"
      />
    </MotionConfig>
  )
}

function DataError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-4xl">🛰️</p>
      <p className="mt-3 font-semibold text-lg">We couldn&apos;t load the trips.</p>
      <button type="button" onClick={onRetry} className={`mt-4 rounded-2xl bg-white text-bordeaux-900 font-semibold px-5 py-3 ${focusRing}`}>
        Try again
      </button>
    </div>
  )
}
