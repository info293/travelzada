'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import type { LiveCount } from './logic'

/** Dotted "journey" with a little plane flying from level to level */
export function JourneyPath({ level, total, done }: { level: number; total: number; done?: boolean }) {
  const frac = done ? 1 : total > 1 ? (level - 1) / (total - 1) : 0
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="relative flex-1 h-7 min-w-[90px]" aria-hidden="true">
        {/* dotted track */}
        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/25" />
        {/* travelled part */}
        <motion.div
          className="absolute left-2 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#D4AF37]"
          initial={false}
          animate={{ width: `calc((100% - 1rem) * ${frac})` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {/* stops */}
        {Array.from({ length: total }, (_, i) => {
          const at = total > 1 ? i / (total - 1) : 0
          const reached = done || i < level - 1
          return (
            <span
              key={i}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-colors duration-300 ${
                reached ? 'w-2 h-2 bg-[#D4AF37]' : 'w-1.5 h-1.5 bg-white/35'
              }`}
              style={{ left: `calc(0.5rem + (100% - 1rem) * ${at})` }}
            />
          )
        })}
        {/* destination pin */}
        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-sm">{done ? '🏁' : '📍'}</span>
        {/* plane */}
        <motion.span
          className="absolute top-1/2 text-lg leading-none drop-shadow"
          initial={false}
          animate={{ left: `calc(0.5rem + (100% - 1rem) * ${frac})` }}
          transition={{ type: 'spring', stiffness: 110, damping: 16 }}
          style={{ x: '-50%', y: '-55%' }}
        >
          ✈️
        </motion.span>
      </div>
      <span className="shrink-0 text-[11px] sm:text-xs font-semibold text-white/80 tabular-nums">
        {done ? 'Arrived!' : `Level ${level} of ${total}`}
      </span>
    </div>
  )
}

/** "🎯 N trips still in the game" with a count-down tween + a little pop */
export function TripCounter({ count, loading }: { count: LiveCount | null; loading?: boolean }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(count?.shown ?? 0)
  const [pop, setPop] = useState(0)
  const from = useRef(count?.shown ?? 0)

  useEffect(() => {
    if (!count) return
    const to = count.shown
    if (from.current === to) return
    setPop((p) => p + 1)
    if (reduce) {
      setShown(to)
      from.current = to
      return
    }
    const ctl = animate(from.current, to, {
      duration: Math.min(1.1, 0.35 + Math.abs(to - from.current) * 0.02),
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
    })
    from.current = to
    return () => ctl.stop()
  }, [count, reduce])

  return (
    <motion.div
      key={pop}
      initial={pop ? { scale: 1.12 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs sm:text-sm text-white"
      aria-live="polite"
    >
      <span aria-hidden="true">🎯</span>
      {loading || !count ? (
        <span className="text-white/70">Loading trips…</span>
      ) : (
        <span>
          <b className="text-[#D4AF37] tabular-nums">{shown}</b>{' '}
          <span className="hidden min-[380px]:inline">{count.closest ? 'closest matches' : `trip${shown === 1 ? '' : 's'} still in the game`}</span>
          <span className="min-[380px]:hidden">{count.closest ? 'closest' : 'in the game'}</span>
        </span>
      )}
    </motion.div>
  )
}
