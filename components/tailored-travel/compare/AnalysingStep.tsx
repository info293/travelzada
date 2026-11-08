'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ListChecks, Loader2, ScanText, Search } from './icons'
import { cx } from './utils'

const STEPS = [
  { label: 'Reading your itinerary', hint: 'Days, hotels, inclusions and price', icon: ScanText, at: 0 },
  { label: 'Finding matching Travelzada trips', hint: 'Checking our romantic trips in the same place', icon: Search, at: 22 },
  { label: 'Comparing day by day', hint: 'Marking what we include, what’s similar and what’s missing', icon: ListChecks, at: 30 },
]

const TIPS = [
  'Tip: you can add anything that’s missing to your trip with one tap.',
  'We never mark something “included” unless our package really has it.',
  'Our travel designers check every quote by hand before sending it.',
  'Couples save the most when hotels and transfers are booked together.',
]

export default function AnalysingStep({ fileName }: { fileName: string | null }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const active = STEPS.reduce((acc, s, i) => (secs >= s.at ? i : acc), 0)
  // Eases towards 95% over ~60s; the real answer finishes it
  const progress = Math.min(95, Math.round(100 * (1 - Math.exp(-secs / 22))))

  return (
    <div className="mx-auto max-w-lg px-4">
      <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(101,25,38,0.08)] ring-1 ring-gray-200/80 sm:p-8">
        <div className="relative mx-auto h-20 w-20">
          <motion.span className="absolute inset-0 rounded-full bg-bordeaux-200" animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-bordeaux-600 text-white shadow-lg shadow-bordeaux-600/30">
            <ScanText className="h-9 w-9" />
          </span>
        </div>
        <h2 className="mt-5 text-center font-serif text-2xl text-gray-900">Comparing your itinerary…</h2>
        {fileName && <p className="mt-1 truncate text-center text-sm text-gray-500">{fileName}</p>}

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-100">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-bordeaux-500 to-bordeaux-700" animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut', duration: 0.8 }} />
        </div>
        <p className="mt-1.5 text-right text-xs tabular-nums text-gray-400">{secs}s · usually 30–60s</p>

        <ol className="mt-4 space-y-3">
          {STEPS.map((s, i) => {
            const done = i < active
            const now = i === active
            const Icon = s.icon
            return (
              <li key={s.label} className={cx('flex items-start gap-3 rounded-2xl p-3 transition-colors', now && 'bg-bordeaux-50')}>
                <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', done ? 'bg-emerald-500 text-white' : now ? 'bg-bordeaux-600 text-white' : 'bg-gray-100 text-gray-400')}>
                  {done ? <Check className="h-4 w-4" /> : now ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className={cx('font-semibold', done || now ? 'text-gray-900' : 'text-gray-400')}>{s.label}</p>
                  <p className={cx('text-sm', now ? 'text-gray-600' : 'text-gray-400')}>{s.hint}</p>
                </div>
              </li>
            )
          })}
        </ol>

        <motion.p key={Math.floor(secs / 8)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-gray-50 px-4 py-3 text-center text-sm text-gray-600">
          {TIPS[Math.floor(secs / 8) % TIPS.length]}
        </motion.p>
      </div>
    </div>
  )
}
