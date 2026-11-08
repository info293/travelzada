'use client'

import { Check, Info, MessageCircle, Moon, Star, ExternalLink, Sparkles } from 'lucide-react'
import { formatINR, totalFor, travellersLabel, type PlannerMatch } from './shared'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop&auto=format'

interface MatchCardProps {
  pkg: PlannerMatch
  rank: number // 0-based
  adults?: number | null
  onLead: (pkg: PlannerMatch) => void
  /** Smaller horizontal row for "More options" */
  compact?: boolean
  /** Highlight (e.g. currently selected on the results page) */
  active?: boolean
  onSelect?: (pkg: PlannerMatch) => void
}

export default function MatchCard({ pkg, rank, adults, onLead, compact, active, onSelect }: MatchCardProps) {
  const price = pkg.pricePerPerson
  const best = rank === 0
  const stars = pkg.stars || parseInt(pkg.starLabel?.match(/\d/)?.[0] || '0', 10)

  if (compact) {
    return (
      <div
        className={`flex gap-3 rounded-2xl border bg-white p-2.5 transition-shadow hover:shadow-md ${active ? 'border-bordeaux-400 ring-2 ring-bordeaux-100' : 'border-gray-200'} ${onSelect ? 'cursor-pointer' : ''}`}
        onClick={() => onSelect?.(pkg)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pkg.image || FALLBACK_IMG} alt={pkg.name} loading="lazy" className="w-24 h-24 sm:w-28 sm:h-24 rounded-xl object-cover shrink-0 bg-gray-100" />
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{pkg.name}</h4>
            <span className="shrink-0 text-[11px] font-semibold text-green-700 bg-green-50 rounded-full px-2 py-0.5">{pkg.score}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {pkg.nights}N{stars ? ` · ${stars}★ hotels` : ''} · {pkg.destination}
          </p>
          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
            <div>
              <p className="text-sm font-bold text-gray-900">{formatINR(price)} <span className="text-[11px] font-normal text-gray-500">pp</span></p>
              {price > 0 && <p className="text-[11px] text-gray-500">{formatINR(totalFor(price, adults))} {travellersLabel(adults)}</p>}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLead(pkg)
              }}
              className="text-xs font-semibold text-bordeaux-600 hover:text-bordeaux-800 inline-flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Get plan
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl bg-white border shadow-sm hover:shadow-xl transition-all ${active ? 'border-bordeaux-400 ring-2 ring-bordeaux-100' : best ? 'border-bordeaux-200' : 'border-gray-200'} ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(pkg)}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pkg.image || FALLBACK_IMG} alt={pkg.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          {best ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-bordeaux-600 text-white text-[11px] font-semibold px-2.5 py-1 shadow">
              <Sparkles className="w-3 h-3" /> Best match
            </span>
          ) : (
            <span />
          )}
          <span className="rounded-full bg-white/95 text-gray-900 text-[11px] font-bold px-2.5 py-1 shadow">{pkg.score}% match</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-[11px] uppercase tracking-wider opacity-90">{pkg.destination}</p>
          <h3 className="font-semibold text-base sm:text-lg leading-snug line-clamp-2 drop-shadow">{pkg.name}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Moon className="w-3.5 h-3.5" /> {pkg.nights} nights
          </span>
          {stars > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {stars}-Star hotels
            </span>
          )}
          {pkg.mealPlan && <span className="truncate">{pkg.mealPlan}</span>}
        </div>

        <div className="mt-3">
          <p className="text-xl font-bold text-gray-900">
            {formatINR(price)} <span className="text-xs font-normal text-gray-500">per person</span>
          </p>
          {price > 0 && (
            <p className="text-xs text-gray-500">
              {formatINR(totalFor(price, adults))} {travellersLabel(adults)}
            </p>
          )}
        </div>

        {pkg.whyForYou && <p className="mt-3 text-sm text-gray-700 leading-relaxed">{pkg.whyForYou}</p>}

        <ul className="mt-3 space-y-1.5">
          {pkg.reasons.slice(0, 3).map((r) => (
            <li key={r} className="flex items-start gap-2 text-[13px] text-gray-700">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> <span>{r}</span>
            </li>
          ))}
          {pkg.notes[0] && (
            <li className="flex items-start gap-2 text-[12px] text-gray-500">
              <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> <span>{pkg.notes[0]}</span>
            </li>
          )}
        </ul>

        <div className="mt-auto pt-4 flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLead(pkg)
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-bordeaux-600 hover:bg-bordeaux-700 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            <MessageCircle className="w-4 h-4" /> Get this plan on WhatsApp
          </button>
          <a
            href={pkg.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            View trip <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  )
}
