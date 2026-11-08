'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Search, Sparkles, X } from 'lucide-react'
import { HONEYPOT_FIELD } from '@/lib/spamGuard'
import MatchReveal from '../game/MatchReveal'
import LeadSheet from './LeadSheet'
import { getPlannerSessionId, shortINR, type PlannerMatch, type PlannerPrefs } from './shared'

const PLACEHOLDERS = [
  'Honeymoon in Bali in December, 6 nights, under ₹60k each',
  'Anniversary trip somewhere snowy in January',
  "5-star beach trip for my wife's birthday, budget 1.5 lakh total",
  'Kerala backwaters with a houseboat, 5 nights, March',
  'Romantic Thailand trip, 4-star hotels, around ₹40k per person',
]

const EXAMPLES = [
  { label: '💍 Bali honeymoon, Dec', query: 'Honeymoon in Bali in December, 6 nights, under ₹60k each' },
  { label: '❄️ Snowy anniversary', query: 'Anniversary trip somewhere snowy in January' },
  { label: '🎂 Beach birthday, 5★', query: "5-star beach trip for my wife's birthday, budget 1.5 lakh total" },
  { label: '🏝️ Andaman under ₹35k', query: 'Andaman honeymoon, 5 nights, under 35k per person' },
  { label: '🌴 Thailand 4N', query: 'Romantic Thailand trip for 4 nights, 4-star hotels' },
]

const LOADING_LINES = ['Reading your wishes…', 'Checking 80+ couple trips…', 'Matching hotels, nights and budget…', 'Picking the best ones for you two…']

interface SearchResponse {
  understood: string
  prefs: PlannerPrefs
  results: PlannerMatch[]
  unsupportedDestination?: string | null
  activityId?: string | null
}

export default function SmartSearch() {
  const [query, setQuery] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [leadPkg, setLeadPkg] = useState<PlannerMatch | null>(null)
  const [leadOpen, setLeadOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query) return
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3200)
    return () => clearInterval(t)
  }, [query])

  const run = async (opts: { q?: string; prefs?: PlannerPrefs }) => {
    const q = (opts.q ?? lastQuery).trim()
    if (!q && !opts.prefs) return
    setLoading(true)
    setError(null)
    if (!opts.prefs) setLastQuery(q)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    try {
      const res = await fetch('/api/tailored-travel/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          prefs: opts.prefs,
          unsupportedDestination: opts.prefs ? data?.unsupportedDestination : undefined,
          sessionId: getPlannerSessionId(),
          honeypot,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Something went wrong. Please try again.')
      setData(json as SearchResponse)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    run({ q: query })
  }

  const refine = (patch: Partial<PlannerPrefs>) => data && run({ prefs: { ...data.prefs, ...patch } })

  const openLead = (pkg: PlannerMatch | null) => {
    setLeadPkg(pkg)
    setLeadOpen(true)
  }

  const prefs = data?.prefs || {}
  const closeLead = useCallback(() => setLeadOpen(false), [])

  const focusSearch = () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  return (
    <section id="describe-your-trip" className="w-full max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
      {/* ── Heading ── */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bordeaux-50 text-bordeaux-700 text-xs font-semibold px-3 py-1">
          <Sparkles className="w-3.5 h-3.5" /> Prefer to type?
        </span>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
          Describe your trip. <span className="text-bordeaux-600">We&apos;ll find the one.</span>
        </h2>
        <p className="mt-1.5 text-gray-600 text-sm sm:text-base">Write it the way you&apos;d tell a friend — place, month, nights, budget, occasion.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 max-w-3xl mx-auto">
        <div className="relative flex items-center rounded-2xl sm:rounded-full bg-white border-2 border-gray-200 focus-within:border-bordeaux-400 focus-within:ring-4 focus-within:ring-bordeaux-50 shadow-lg shadow-gray-200/60 transition">
          <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            aria-label="Describe your trip"
            maxLength={500}
            className="w-full bg-transparent pl-12 pr-[7.5rem] sm:pr-36 py-4 sm:py-5 text-base sm:text-lg text-gray-900 placeholder-gray-400 outline-none rounded-full"
          />
          {query && (
            <button type="button" aria-label="Clear" onClick={() => setQuery('')} className="absolute right-[6.6rem] sm:right-[8.4rem] p-1.5 text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 inline-flex items-center gap-1.5 rounded-xl sm:rounded-full bg-bordeaux-600 hover:bg-bordeaux-700 disabled:opacity-60 text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Find trips
          </button>
          <input
            type="text"
            name={HONEYPOT_FIELD}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] w-px h-px opacity-0"
          />
        </div>
      </form>

      <div className="mt-4 max-w-3xl mx-auto flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-auto sm:px-0 sm:flex-wrap sm:justify-center scrollbar-hide">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => {
              setQuery(ex.query)
              run({ q: ex.query })
            }}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 hover:border-bordeaux-300 hover:text-bordeaux-700 transition"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* ── Results ── */}
      <div ref={resultsRef} className="scroll-mt-24">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6">
              <MatchReveal loading results={null} onLead={openLead} tone="light" lines={LOADING_LINES} holdShuffle />
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-xl mx-auto text-center rounded-2xl bg-white border border-gray-200 p-6">
              <p className="text-gray-800 font-medium">{error}</p>
              <button onClick={() => run({ q: lastQuery || query })} className="mt-3 text-sm font-semibold text-bordeaux-600">
                Try again
              </button>
            </motion.div>
          ) : data ? (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
              {/* What we understood + refine chips */}
              <div className="rounded-2xl bg-white border border-gray-200 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">We understood</p>
                <p className="mt-1 text-gray-900 font-semibold">{data.understood || 'Your romantic trip'}</p>
                {data.unsupportedDestination && (
                  <p className="mt-2 text-sm text-gray-700 bg-bordeaux-50 border border-bordeaux-100 rounded-xl px-3 py-2">
                    We don't have <b>{data.unsupportedDestination}</b> trips yet — here are similar romantic trips you'll love.
                  </p>
                )}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                  {[40000, 60000].map((b) => (
                    <RefineChip key={b} active={prefs.budgetPerPerson === b} onClick={() => refine({ budgetPerPerson: b })}>
                      Under {shortINR(b)} pp
                    </RefineChip>
                  ))}
                  {prefs.budgetPerPerson ? <RefineChip onClick={() => refine({ budgetPerPerson: null })}>Any budget</RefineChip> : null}
                  <Divider />
                  {[4, 5, 6, 7].map((n) => (
                    <RefineChip key={n} active={prefs.nights === n} onClick={() => refine({ nights: n })}>
                      {n} nights
                    </RefineChip>
                  ))}
                  <Divider />
                  {[4, 5].map((s) => (
                    <RefineChip key={s} active={prefs.stars?.length === 1 && prefs.stars[0] === s} onClick={() => refine({ stars: [s] })}>
                      {s}-Star
                    </RefineChip>
                  ))}
                  {prefs.stars?.length ? <RefineChip onClick={() => refine({ stars: [] })}>Any hotel</RefineChip> : null}
                  {prefs.destinations?.length ? (
                    <>
                      <Divider />
                      <RefineChip onClick={() => refine({ destinations: [] })}>Show all destinations</RefineChip>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="mt-6">
                <MatchReveal
                  loading={false}
                  results={data.results}
                  adults={prefs.adults}
                  onLead={openLead}
                  maxOptions={data.results.length}
                  minShuffleMs={0}
                  tone="light"
                  changeLabel="Try a different search"
                  onChangeAnswers={focusSearch}
                />
              </div>
              <p className="mt-6 text-center text-sm text-gray-600">
                Not quite right?{' '}
                <button onClick={() => openLead(null)} className="font-semibold text-bordeaux-600 hover:underline">
                  Ask a trip expert to customise it
                </button>
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <LeadSheet
        open={leadOpen}
        onClose={closeLead}
        pkg={leadPkg}
        prefs={data?.prefs}
        query={lastQuery}
        activityId={data?.activityId}
        shownMatches={data?.results.map((r) => ({ id: r.id, name: r.name, score: r.score }))}
        source="AI Planner – Smart search"
      />
    </section>
  )
}

function RefineChip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium border transition ${
        active ? 'bg-bordeaux-600 border-bordeaux-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-bordeaux-300'
      }`}
    >
      {children}
    </button>
  )
}

const Divider = () => <span className="shrink-0 w-px self-stretch bg-gray-200 mx-0.5" aria-hidden="true" />
