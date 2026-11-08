'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check, ExternalLink, Info, MessageCircle, Moon, Star, Utensils } from 'lucide-react'
import { formatINR, totalFor, travellersLabel, type PlannerMatch } from '../smart/shared'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1000&h=700&fit=crop&auto=format'

/** Animated "92% match" ring */
export function MatchRing({ score, size = 56 }: { score: number; size?: number }) {
  const reduce = useReducedMotion()
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div className="relative shrink-0 rounded-full bg-white shadow-lg" style={{ width: size, height: size }} aria-label={`${pct}% match`} role="img">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F5E6E9" strokeWidth={5} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#651926"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct / 100) : c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.35 }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[15px] font-bold text-bordeaux-900 tabular-nums">{pct}%</span>
        <span className="text-[8px] font-semibold uppercase tracking-wide text-gray-500 mt-0.5">match</span>
      </span>
    </div>
  )
}

interface WinnerCardProps {
  pkg: PlannerMatch
  rank: number
  adults?: number | null
  dna?: string[]
  days?: string[]
  onLead: (pkg: PlannerMatch) => void
}

export default function WinnerCard({ pkg, rank, adults, dna, days, onLead }: WinnerCardProps) {
  const stars = pkg.stars || parseInt(pkg.starLabel?.match(/\d/)?.[0] || '0', 10)
  const price = pkg.pricePerPerson
  const why = pkg.whyForYou || (pkg.reasons.length ? null : `${pkg.nights} nights in ${pkg.destination}`)
  const ticks = pkg.reasons.slice(0, 4)

  return (
    <article className="w-full overflow-hidden rounded-[28px] bg-white text-gray-900 shadow-2xl shadow-black/30 md:grid md:grid-cols-[1.05fr_1fr]">
      {/* Photo */}
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-full bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pkg.image || FALLBACK_IMG} alt={pkg.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <motion.span
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 20 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF37] text-bordeaux-950 text-xs font-bold px-3 py-1.5 shadow-lg"
          >
            {rank === 0 ? '🏆 Your perfect match' : `✨ Option #${rank + 1}`}
          </motion.span>
          <MatchRing score={pkg.score} />
        </div>
        <div className="absolute bottom-3 left-4 right-4 text-white md:hidden">
          <p className="text-[11px] uppercase tracking-[0.18em] opacity-90">📍 {pkg.destination}</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 sm:p-6 flex flex-col">
        <p className="hidden md:block text-[11px] uppercase tracking-[0.18em] text-bordeaux-600 font-semibold">📍 {pkg.destination}</p>
        <h3 className="font-display text-[26px] sm:text-3xl leading-[1.1] font-semibold text-gray-950 md:mt-1">{pkg.name}</h3>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Moon className="w-3.5 h-3.5" /> {pkg.nights} nights{pkg.days ? ` / ${pkg.days} days` : ''}
          </span>
          {stars > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {stars}-Star hotels
            </span>
          )}
          {pkg.mealPlan && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <Utensils className="w-3.5 h-3.5 shrink-0" /> <span className="truncate max-w-[180px]">{pkg.mealPlan}</span>
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl bg-bordeaux-50 px-4 py-3">
          <div>
            <p className="text-2xl font-bold text-bordeaux-900 leading-none">
              {formatINR(price)} <span className="text-xs font-medium text-gray-500">per person</span>
            </p>
            {price > 0 && (
              <p className="mt-1 text-xs text-gray-600">
                {formatINR(totalFor(price, adults))} {travellersLabel(adults)}
              </p>
            )}
          </div>
          <span className="text-2xl" aria-hidden="true">
            💑
          </span>
        </div>

        {why && (
          <p className="mt-4 text-[15px] text-gray-800 leading-relaxed">
            <span aria-hidden="true">✨ </span>
            {why}
          </p>
        )}

        {ticks.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {ticks.map((r, i) => (
              <motion.li
                key={r}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.08 }}
                className="flex items-start gap-2 text-[13px] text-gray-700"
              >
                <span className="mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span>{r}</span>
              </motion.li>
            ))}
          </ul>
        )}
        {pkg.notes[0] && (
          <p className="mt-2 flex items-start gap-1.5 text-[12px] text-gray-500">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {pkg.notes[0]}
          </p>
        )}

        {days && days.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">Sneak peek</p>
            <ol className="mt-1.5 space-y-1">
              {days.slice(0, 3).map((d, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-gray-700">
                  <span className="shrink-0 font-semibold text-bordeaux-600">Day {i + 1}</span>
                  <span className="truncate">{d}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {dna && dna.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">Your trip DNA</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {dna.map((c) => (
                <span key={c} className="rounded-full bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 md:mt-auto md:pt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onLead(pkg)}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#1fb857] text-white font-semibold text-base shadow-lg shadow-green-600/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300"
          >
            <MessageCircle className="w-5 h-5" /> Get this trip on WhatsApp
          </button>
          <a
            href={pkg.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bordeaux-200"
          >
            See full trip <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  )
}
