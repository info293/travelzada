'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnalyzeResponse, ClassifiedItem, ItemStatus, PackageLite } from '@/lib/planner/itinerary'
import {
  Approximately, ArrowRight, BadgeCheck, Building2, CalendarDays, Check, Heart, Hotel, MapPin, Plane, Plus, RotateCcw, Sparkles, Users, Wallet, X,
} from './icons'
import { STATUS_META, cx, inr, priceText } from './utils'

type Filter = 'all' | ItemStatus

export default function ResultsView({
  data, added, onToggle, onRestart,
}: {
  data: AnalyzeResponse
  added: Set<string>
  onToggle: (item: ClassifiedItem) => void
  onRestart: () => void
}) {
  const { extraction: x, comparison: c, bestPackage, alternatives } = data
  const [filter, setFilter] = useState<Filter>('all')
  const byId = useMemo(() => new Map(c.items.map((i) => [i.id, i])), [c.items])
  const counts = useMemo(() => {
    const o = { included: 0, similar: 0, not_included: 0 }
    c.items.forEach((i) => o[i.status]++)
    return o
  }, [c.items])
  const hasCompare = c.items.length > 0
  const travellers = x.adults || 2
  const show = (i?: ClassifiedItem) => !!i && (filter === 'all' || i.status === filter)

  const extras = c.items.filter((i) => i.kind !== 'day' && i.kind !== 'hotel')
  const hotels = c.items.filter((i) => i.kind === 'hotel')

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-gray-900 sm:text-3xl">Your itinerary, compared</h1>
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-white">
          <RotateCcw className="h-4 w-4" /> New
        </button>
      </div>

      {/* (a) What we read */}
      <Section delay={0}>
        <p className="text-xs font-semibold uppercase tracking-widest text-bordeaux-600">Here&apos;s what we read</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">{x.title || x.destinations.slice(0, 3).join(' · ') || 'Your trip'}</h2>
        {x.confidence === 'low' && <p className="mt-1 text-xs text-amber-700">Parts of the file were hard to read — our travel designer will double-check.</p>}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Fact icon={<MapPin className="h-4 w-4" />} label="Destination" value={x.destinations.join(', ') || x.country} />
          <Fact icon={<CalendarDays className="h-4 w-4" />} label="Length" value={[x.nights && `${x.nights} nights`, x.daysCount && `${x.daysCount} days`].filter(Boolean).join(' / ')} />
          <Fact icon={<CalendarDays className="h-4 w-4" />} label="Dates" value={x.travelDatesText || x.startDate} />
          <Fact icon={<Users className="h-4 w-4" />} label="Travellers" value={x.travellersText || (x.adults ? `${x.adults} adults` : null)} />
          <Fact icon={<Wallet className="h-4 w-4" />} label="Price you were quoted" value={priceText(x.price)} strong />
          <Fact icon={<Building2 className="h-4 w-4" />} label="From" value={x.agency} />
        </dl>
        {x.hotels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {x.hotels.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                <Hotel className="h-3.5 w-3.5 text-gray-500" />
                {h.name || 'Hotel'}{h.city ? `, ${h.city}` : ''}{h.stars ? ` · ${h.stars}★` : ''}{h.nights ? ` · ${h.nights}N` : ''}
              </span>
            ))}
          </div>
        )}
        {(x.flightsIncluded !== 'unknown' || x.visaIncluded !== 'unknown') && (
          <p className="mt-3 text-xs text-gray-500">
            {x.flightsIncluded !== 'unknown' && <>Flights {x.flightsIncluded === 'yes' ? 'included' : 'not included'}. </>}
            {x.visaIncluded !== 'unknown' && <>Visa {x.visaIncluded === 'yes' ? 'included' : 'not included'}.</>}
          </p>
        )}
      </Section>

      {/* (b) Best match / (e) no match */}
      {bestPackage && c.status !== 'no_match' ? (
        <Section delay={0.05} padded={false}>
          <PackageHero pkg={bestPackage} matchPercent={c.matchPercent} travellers={travellers} theirPrice={x.price.currency === 'INR' || !x.price.currency ? x.price.total : null} />
        </Section>
      ) : (
        <Section delay={0.05}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bordeaux-50 text-bordeaux-600"><Heart className="h-5 w-5" /></span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">We don&apos;t have a ready trip for {x.destinations[0] || x.country || 'this destination'} yet</h2>
              <p className="mt-1 text-sm text-gray-600">{c.summary}</p>
              {c.alternativesNote && <p className="mt-2 text-sm text-gray-600">{c.alternativesNote}</p>}
              <p className="mt-2 text-sm text-gray-600">You can still send us your request — our travel designer will tell you honestly if we can plan it.</p>
            </div>
          </div>
          {alternatives.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {alternatives.map((p) => <MiniPackage key={p.id} pkg={p} />)}
            </div>
          )}
        </Section>
      )}

      {/* (d) Honest take */}
      {c.status !== 'no_match' && (c.summary || c.highlights.length > 0) && (
        <Section delay={0.1}>
          <p className="text-xs font-semibold uppercase tracking-widest text-bordeaux-600">Our honest take</p>
          {c.summary && <p className="mt-2 text-[15px] leading-relaxed text-gray-700">{c.summary}</p>}
          {c.highlights.length > 0 && (
            <div className="mt-4 rounded-2xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><Sparkles className="h-4 w-4" /> What we add that yours doesn&apos;t</p>
              <ul className="mt-2 space-y-1.5">
                {c.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm text-emerald-900"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{h}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* (c) Comparison */}
      {hasCompare ? (
        <Section delay={0.15} padded={false}>
          <div className="p-5 pb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-bordeaux-600">Day by day</p>
            <p className="mt-1 text-sm text-gray-600">Tap <span className="font-semibold text-bordeaux-700">Add to my trip</span> on anything you&apos;d like us to include.</p>
            <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {([
                ['all', `All ${c.items.length}`],
                ['not_included', `Not in ours ${counts.not_included}`],
                ['similar', `Similar ${counts.similar}`],
                ['included', `Included ${counts.included}`],
              ] as Array<[Filter, string]>).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFilter(v)}
                  className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors', filter === v ? 'bg-bordeaux-600 text-white ring-bordeaux-600' : 'bg-white text-gray-700 ring-gray-200 hover:ring-bordeaux-300')}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {x.days.map((d, di) => {
              const rows = d.items.map((_, ii) => byId.get(`d${di}-${ii}`)).filter(show) as ClassifiedItem[]
              if (!rows.length) return null
              return (
                <div key={di} className="px-5 py-4">
                  <p className="text-sm font-bold text-gray-900">
                    <span className="mr-2 inline-flex h-6 min-w-[3rem] items-center justify-center rounded-full bg-bordeaux-600 px-2 text-[11px] font-bold text-white">Day {d.day}</span>
                    {d.title}
                  </p>
                  <ul className="mt-2 space-y-2">{rows.map((i) => <ItemRow key={i.id} item={i} added={added.has(i.id)} onToggle={onToggle} />)}</ul>
                </div>
              )
            })}
            {hotels.some(show) && (
              <div className="px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-bold text-gray-900"><Hotel className="h-4 w-4 text-bordeaux-600" /> Hotels</p>
                <ul className="mt-2 space-y-2">{hotels.filter(show).map((i) => <ItemRow key={i.id} item={i} added={added.has(i.id)} onToggle={onToggle} />)}</ul>
              </div>
            )}
            {extras.some(show) && (
              <div className="px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-bold text-gray-900"><Plane className="h-4 w-4 text-bordeaux-600" /> Inclusions &amp; more</p>
                <ul className="mt-2 space-y-2">{extras.filter(show).map((i) => <ItemRow key={i.id} item={i} added={added.has(i.id)} onToggle={onToggle} />)}</ul>
              </div>
            )}
          </div>
        </Section>
      ) : (
        x.days.length > 0 && (
          <Section delay={0.15}>
            <p className="text-xs font-semibold uppercase tracking-widest text-bordeaux-600">Their plan, day by day</p>
            {c.status !== 'no_match' && <p className="mt-1 text-sm text-gray-600">Our travel designer will check each of these against our trip for you.</p>}
            <div className="mt-3 space-y-3">
              {x.days.map((d, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-gray-900">Day {d.day}: {d.title}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-gray-600">{d.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
                </div>
              ))}
            </div>
          </Section>
        )
      )}

      {/* Other options */}
      {c.status !== 'no_match' && alternatives.length > 0 && (
        <Section delay={0.2}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Other trips that could work</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{alternatives.map((p) => <MiniPackage key={p.id} pkg={p} />)}</div>
        </Section>
      )}

      <p className="px-2 text-center text-xs text-gray-400">
        Comparison made by AI from your file and checked against our real package details. Final inclusions and prices are confirmed by our travel designer.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------------

function Section({ children, delay = 0, padded = true }: { children: React.ReactNode; delay?: number; padded?: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cx('overflow-hidden rounded-3xl bg-white shadow-[0_4px_20px_rgba(101,25,38,0.05)] ring-1 ring-gray-200/80', padded && 'p-5')}
    >
      {children}
    </motion.section>
  )
}

function Fact({ icon, label, value, strong }: { icon: React.ReactNode; label: string; value?: string | number | null; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-gray-500">{icon}{label}</dt>
      <dd className={cx('mt-0.5 text-sm', value ? 'text-gray-900' : 'text-gray-400', strong && !!value && 'font-bold')}>{value || 'Not mentioned'}</dd>
    </div>
  )
}

function StatusChip({ status }: { status: ItemStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', m.chip)}>
      {status === 'included' ? <Check className="h-3 w-3" /> : status === 'similar' ? <Approximately className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {m.label}
    </span>
  )
}

function ItemRow({ item, added, onToggle }: { item: ClassifiedItem; added: boolean; onToggle: (i: ClassifiedItem) => void }) {
  const canAdd = item.status !== 'included'
  return (
    <li className={cx('rounded-2xl p-3 ring-1 transition-colors', added ? 'bg-bordeaux-50/70 ring-bordeaux-200' : 'bg-gray-50/60 ring-gray-100')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{item.label}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusChip status={item.status} />
            {item.ourOffer && (
              <span className="text-xs text-gray-600">
                {item.status === 'included' ? 'In ours: ' : 'We offer: '}
                <span className="font-medium text-gray-800">{item.ourOffer}</span>
              </span>
            )}
          </div>
          {item.estimatedExtras && <p className="mt-1 text-xs text-gray-500">{item.estimatedExtras}</p>}
        </div>
        {canAdd && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onToggle(item)}
            aria-pressed={added}
            className={cx(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              added ? 'bg-bordeaux-600 text-white shadow-sm shadow-bordeaux-600/30' : 'border border-bordeaux-300 bg-white text-bordeaux-700 hover:bg-bordeaux-50',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={added ? 'y' : 'n'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="inline-flex items-center gap-1">
                {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {added ? 'Added' : 'Add to my trip'}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )}
      </div>
    </li>
  )
}

function PackageHero({ pkg, matchPercent, travellers, theirPrice }: { pkg: PackageLite; matchPercent: number; travellers: number; theirPrice: number | null }) {
  const total = pkg.pricePerPerson ? pkg.pricePerPerson * travellers : 0
  return (
    <div>
      <div className="relative aspect-[16/9] w-full bg-bordeaux-100 sm:aspect-[21/9]">
        {pkg.image && <img src={pkg.image} alt={pkg.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-bordeaux-700 shadow">
          <BadgeCheck className="h-3.5 w-3.5" /> Our best match
        </span>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <p className="text-xs font-medium opacity-90">{pkg.destination} · {pkg.nights} nights{pkg.starLabel ? ` · ${pkg.starLabel}` : ''}</p>
          <h3 className="mt-0.5 text-xl font-bold leading-snug sm:text-2xl">{pkg.name}</h3>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <MatchRing value={matchPercent} />
          <div>
            <p className="text-xs text-gray-500">From</p>
            <p className="text-xl font-bold text-gray-900">{inr(pkg.pricePerPerson)}<span className="text-sm font-medium text-gray-500"> / person</span></p>
            {total > 0 && <p className="text-xs text-gray-500">≈ {inr(total)} for {travellers} {travellers === 1 ? 'person' : 'people'}{theirPrice ? ` · yours: ${inr(theirPrice)}` : ''}</p>}
          </div>
        </div>
        <a href={pkg.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-bordeaux-200 px-4 py-2 text-sm font-semibold text-bordeaux-700 hover:bg-bordeaux-50">
          View trip <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}

function MatchRing({ value }: { value: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  return (
    <div className="relative h-14 w-14 shrink-0" title="How much of your itinerary our trip covers">
      <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90">
        <circle cx="26" cy="26" r={r} className="fill-none stroke-gray-100" strokeWidth="5" />
        <motion.circle
          cx="26" cy="26" r={r} className="fill-none stroke-bordeaux-600" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - value / 100) }} transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold text-gray-900">{value}%</span>
        <span className="text-[9px] text-gray-500">match</span>
      </span>
    </div>
  )
}

function MiniPackage({ pkg }: { pkg: PackageLite }) {
  return (
    <a href={pkg.url} target="_blank" rel="noopener noreferrer" className="group flex gap-3 rounded-2xl p-2 ring-1 ring-gray-200 transition-all hover:ring-bordeaux-300">
      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-bordeaux-100">
        {pkg.image && <img src={pkg.image} alt={pkg.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />}
      </div>
      <div className="min-w-0 py-0.5">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900">{pkg.name}</p>
        <p className="mt-0.5 text-xs text-gray-500">{pkg.destination} · {pkg.nights}N</p>
        <p className="mt-1 text-sm font-bold text-bordeaux-700">{inr(pkg.pricePerPerson)} <span className="text-xs font-medium text-gray-500">/ person</span></p>
      </div>
    </a>
  )
}
