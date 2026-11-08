'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { RefreshCw, RotateCcw } from 'lucide-react'
import WinnerCard from './WinnerCard'
import type { PlannerMatch } from '../smart/shared'

const BRAND_CONFETTI = ['#651926', '#C9A0AC', '#E2DDE3', '#D4AF37']

/** Brand-patterned face-down card */
export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-[3px] border-[#D4AF37]/70 shadow-2xl shadow-black/40 ${className}`}
      style={{
        backgroundColor: '#4C111C',
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(212,175,55,0.18) 0 2px, transparent 2.5px), repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px), linear-gradient(160deg, #852233, #2A0910)',
        backgroundSize: '18px 18px, auto, auto, auto',
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-2.5 rounded-2xl border border-[#D4AF37]/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="w-16 h-16 rounded-full bg-bordeaux-950/70 border-2 border-[#D4AF37]/80 flex items-center justify-center font-display text-2xl font-semibold text-[#D4AF37]">
          TZ
        </span>
        <span className="mt-2 text-lg">❤</span>
      </div>
    </div>
  )
}

const SLOTS = [-1, 0, 1]

function Shuffle({ lines }: { lines: string[] }) {
  const reduce = useReducedMotion()
  const [order, setOrder] = useState([0, 1, 2]) // order[cardIdx] = slot index
  const [line, setLine] = useState(0)

  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => {
      setOrder((o) => {
        // swap two random cards so it reads as a real shuffle
        const n = [...o]
        const a = Math.floor(Math.random() * 3)
        const b = (a + 1 + Math.floor(Math.random() * 2)) % 3
        ;[n[a], n[b]] = [n[b], n[a]]
        return n
      })
    }, 420)
    return () => clearInterval(t)
  }, [reduce])

  useEffect(() => {
    const t = setInterval(() => setLine((i) => (i + 1) % lines.length), 900)
    return () => clearInterval(t)
  }, [lines.length])

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-60 sm:h-72 w-full max-w-sm" style={{ perspective: 1000 }}>
        {[0, 1, 2].map((card) => {
          const slot = SLOTS[order[card]]
          return (
            <motion.div
              key={card}
              className="absolute left-1/2 top-1/2 w-36 h-52 sm:w-44 sm:h-64 -ml-[72px] -mt-[104px] sm:-ml-[88px] sm:-mt-[128px]"
              initial={{ y: 60, opacity: 0 }}
              animate={{ x: slot * 92, y: slot === 0 ? -10 : 6, rotate: slot * 9, opacity: 1, zIndex: slot === 0 ? 3 : 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <CardBack className="w-full h-full" />
            </motion.div>
          )
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mt-4 text-base sm:text-lg font-semibold text-current"
          aria-live="polite"
        >
          {lines[line]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

async function fireConfetti() {
  try {
    const confetti = (await import('canvas-confetti')).default
    const base = { colors: BRAND_CONFETTI, zIndex: 150, disableForReducedMotion: true, ticks: 220 }
    confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 45, origin: { x: 0.5, y: 0.55 } })
    setTimeout(() => {
      confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } })
      confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } })
    }, 220)
  } catch {
    /* confetti is decoration only */
  }
}

export interface MatchRevealProps {
  loading: boolean
  results: PlannerMatch[] | null
  error?: string | null
  onRetry?: () => void
  adults?: number | null
  dna?: string[]
  daysFor?: (id: string) => string[] | undefined
  onLead: (pkg: PlannerMatch) => void
  /** shown after the last option (and in the empty state) */
  onChangeAnswers?: () => void
  changeLabel?: string
  onPlayAgain?: () => void
  /** how many options "Show me another" can flip through */
  maxOptions?: number
  minShuffleMs?: number
  lines?: string[]
  tone?: 'dark' | 'light'
  /** don't leave the shuffle (QA) */
  holdShuffle?: boolean
}

/**
 * The climax: face-down cards shuffle while we search, then the winner flips over with confetti.
 * Only ONE package is visible at a time; "Show me another" flips to the next best.
 */
export default function MatchReveal({
  loading,
  results,
  error,
  onRetry,
  adults,
  dna,
  daysFor,
  onLead,
  onChangeAnswers,
  changeLabel = 'Change my answers',
  onPlayAgain,
  maxOptions = 3,
  minShuffleMs = 1800,
  lines = ['Checking 86 trips…', 'Comparing hotels…', 'Asking our travel designers…', 'Matching your vibe…', 'Almost there…'],
  tone = 'dark',
  holdShuffle,
}: MatchRevealProps) {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<'shuffle' | 'back' | 'card'>('shuffle')
  const [index, setIndex] = useState(0)
  const startedAt = useRef(Date.now())
  const topRef = useRef<HTMLDivElement>(null)

  // A new search starts → back to the shuffle
  useEffect(() => {
    if (loading) {
      startedAt.current = Date.now()
      setPhase('shuffle')
      setIndex(0)
    }
  }, [loading])

  // Results arrived → wait out the minimum shuffle, show the back card, then flip
  useEffect(() => {
    if (loading || holdShuffle || phase !== 'shuffle' || (!results && !error)) return
    const wait = Math.max(0, minShuffleMs - (Date.now() - startedAt.current))
    const t1 = setTimeout(() => setPhase(results?.length ? 'back' : 'card'), wait)
    return () => clearTimeout(t1)
  }, [loading, results, error, phase, minShuffleMs, holdShuffle])

  useEffect(() => {
    if (phase !== 'back') return
    const t = setTimeout(() => setPhase('card'), reduce ? 50 : 320)
    return () => clearTimeout(t)
  }, [phase, reduce])

  useEffect(() => {
    if (phase === 'card' && results?.length && !reduce) fireConfetti()
  }, [phase, results, reduce])

  const muted = tone === 'dark' ? 'text-white/75 hover:text-white' : 'text-gray-600 hover:text-gray-900'
  const strong = tone === 'dark' ? 'text-white' : 'text-gray-900'
  const limit = Math.min(maxOptions, results?.length || 0)
  const pkg = results?.[index]

  const another = () => {
    setIndex((i) => i + 1)
    topRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
  }

  return (
    <div ref={topRef} className={`w-full ${strong}`} style={{ perspective: 1400 }}>
      <AnimatePresence mode="wait">
        {phase === 'shuffle' && (
          <motion.div key="shuffle" exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.2 }} className="py-6">
            <Shuffle lines={lines} />
          </motion.div>
        )}

        {phase === 'back' && (
          <motion.div
            key="back"
            className="flex justify-center py-6"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1.08 }}
            exit={{ rotateY: 90, scale: 1.1 }}
            transition={{ duration: 0.28, ease: 'easeIn' }}
          >
            <CardBack className="w-40 h-56 sm:w-48 sm:h-64" />
          </motion.div>
        )}

        {phase === 'card' && error && (
          <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10 max-w-sm mx-auto">
            <p className="text-4xl">😕</p>
            <p className="mt-2 font-semibold text-lg">{error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-4 rounded-2xl bg-white text-bordeaux-900 font-semibold px-5 py-3 shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/70">
                Try again
              </button>
            )}
          </motion.div>
        )}

        {phase === 'card' && !error && !pkg && (
          <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10 max-w-sm mx-auto">
            <p className="text-5xl">🧭</p>
            <p className="mt-3 font-display text-3xl font-semibold">Hmm, nothing fits all of that</p>
            <p className={`mt-2 text-sm ${tone === 'dark' ? 'text-white/75' : 'text-gray-600'}`}>Loosen one answer — budget or nights usually does the trick.</p>
            {onChangeAnswers && (
              <button type="button" onClick={onChangeAnswers} className="mt-5 rounded-2xl bg-white text-bordeaux-900 font-semibold px-5 py-3 shadow-lg border border-gray-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/70">
                {changeLabel}
              </button>
            )}
          </motion.div>
        )}

        {phase === 'card' && !error && pkg && (
          <motion.div
            key={`card-${pkg.id}`}
            initial={reduce ? { opacity: 0 } : { rotateY: -90, scale: 1.04 }}
            animate={reduce ? { opacity: 1 } : { rotateY: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { rotateY: 90, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 170, damping: 20 }}
            style={{ transformStyle: 'preserve-3d' }}
            className="w-full max-w-md md:max-w-4xl mx-auto"
          >
            <WinnerCard pkg={pkg} rank={index} adults={adults} dna={dna} days={daysFor?.(pkg.id)} onLead={onLead} />

            <div className="mt-4 flex flex-col items-center gap-2">
              {index + 1 < limit ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={another}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 font-semibold ${
                    tone === 'dark' ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20' : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
                  } focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/70`}
                >
                  <RefreshCw className="w-4 h-4" /> Show me another 🔄
                  <span className={`text-xs font-medium ${tone === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                    {index + 1}/{limit}
                  </span>
                </motion.button>
              ) : onChangeAnswers ? (
                <button
                  type="button"
                  onClick={onChangeAnswers}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 font-semibold ${
                    tone === 'dark' ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20' : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
                  } focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/70`}
                >
                  ✏️ {changeLabel}
                </button>
              ) : null}
              {index > 0 && (
                <button type="button" onClick={() => setIndex(0)} className={`text-sm font-medium ${muted} focus-visible:outline-none focus-visible:underline`}>
                  ← Back to my perfect match
                </button>
              )}
              {onPlayAgain && (
                <button type="button" onClick={onPlayAgain} className={`inline-flex items-center gap-1.5 text-sm font-medium ${muted} focus-visible:outline-none focus-visible:underline`}>
                  <RotateCcw className="w-3.5 h-3.5" /> Play again
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
