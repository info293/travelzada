'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export interface PackageItem {
  id: string
  Destination_Name: string
  Duration: string
  Price_Range_INR: string | number
  Primary_Image_URL: string
  Star_Category?: string
  Travel_Type?: string
  Occasion?: string
  Destination_ID?: string
  destinationSlug: string
  packageId: string
}

const TRIP_TYPES = [
  { key: 'all',         label: 'All Trips' },
  { key: 'honeymoon',   label: 'Honeymoon' },
  { key: 'anniversary', label: 'Anniversary' },
  { key: 'birthday',    label: 'Birthday' },
  { key: 'weekend',     label: 'Romantic Weekend' },
]

const BUDGET_TIERS = [
  { key: 'all',     label: 'All Budgets',       range: '',           min: 0,      max: Infinity },
  { key: 'budget',  label: 'Budget-Friendly',   range: 'Under ₹30k', min: 0,      max: 30000 },
  { key: 'value',   label: 'Best Value',         range: '₹30k–₹70k', min: 30000,  max: 70000 },
  { key: 'premium', label: 'Premium',            range: '₹70k–₹1.5L',min: 70000,  max: 150000 },
  { key: 'luxury',  label: 'Luxury',             range: '₹1.5L+',    min: 150000, max: Infinity },
]

const REGION_TABS = [
  { key: 'all',           label: 'All' },
  { key: 'india',         label: 'India' },
  { key: 'international', label: 'International' },
]

const INDIA_KEYWORDS = [
  'india', 'goa', 'kerala', 'rajasthan', 'himachal', 'kashmir', 'ladakh',
  'andaman', 'uttarakhand', 'manali', 'shimla', 'jaipur', 'udaipur',
  'delhi', 'agra', 'sikkim', 'darjeeling', 'rishikesh', 'munnar', 'ooty',
  'kodaikanal', 'coorg', 'spiti', 'leh', 'auli', 'jim corbett', 'ranthambore',
]

function extractPrice(raw: string | number): number {
  const s = String(raw).replace(/[₹,\s]/g, '').replace(/INR/i, '')
  const m = s.match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

function getImageUrl(url: string | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'
  return url.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
}

function isIndia(pkg: PackageItem) {
  const name = (pkg.Destination_Name || '').toLowerCase()
  const id = (pkg.Destination_ID || '').toLowerCase()
  return INDIA_KEYWORDS.some((k) => name.includes(k) || id.includes(k))
}

function matchesType(pkg: PackageItem, type: string) {
  if (type === 'all') return true
  const occasion = (pkg.Occasion || '').toLowerCase()
  const travel = (pkg.Travel_Type || '').toLowerCase()
  const name = (pkg.Destination_Name || '').toLowerCase()
  // map weekend → short duration (≤ 4 nights)
  if (type === 'weekend') {
    const dur = (pkg.Duration || '').toLowerCase()
    const nights = parseInt(dur) || 0
    return nights <= 4 || dur.includes('weekend') || occasion.includes('weekend')
  }
  return occasion.includes(type) || travel.includes(type)
}

function formatPrice(raw: string | number): string {
  const s = String(raw)
  if (s.includes('₹')) return s
  const n = extractPrice(raw)
  if (!n) return 'On Request'
  return `₹${n.toLocaleString('en-IN')}`
}

interface Props {
  allPackages: PackageItem[]
  initialType: string
  initialBudget: string
}

export default function PackagesClient({ allPackages, initialType, initialBudget }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [type, setType] = useState(initialType)
  const [budget, setBudget] = useState(initialBudget)
  const [region, setRegion] = useState('all')
  const [search, setSearch] = useState('')

  // Sync filters → URL
  useEffect(() => {
    const p = new URLSearchParams()
    if (type !== 'all') p.set('type', type)
    if (budget !== 'all') p.set('budget', budget)
    router.replace(`/packages${p.toString() ? '?' + p.toString() : ''}`, { scroll: false })
  }, [type, budget, router])

  const filtered = useMemo(() => {
    const budgetTier = BUDGET_TIERS.find((b) => b.key === budget) ?? BUDGET_TIERS[0]
    return allPackages.filter((pkg) => {
      if (!matchesType(pkg, type)) return false
      const price = extractPrice(pkg.Price_Range_INR)
      if (price && (price < budgetTier.min || price > budgetTier.max)) return false
      if (region === 'india' && !isIndia(pkg)) return false
      if (region === 'international' && isIndia(pkg)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(pkg.Destination_Name || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allPackages, type, budget, region, search])

  const activeTypeLabel = TRIP_TYPES.find((t) => t.key === type)?.label ?? 'All Trips'

  return (
    <div>
      {/* ── Filter bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e9e5dd', position: 'sticky', top: 64, zIndex: 30, padding: '0 0' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">

          {/* Trip type tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {TRIP_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className="text-sm font-semibold px-4 py-2 rounded-full transition-all"
                style={{
                  background: type === t.key ? 'linear-gradient(135deg,#9333ea,#4f46e5)' : 'transparent',
                  color: type === t.key ? '#fff' : '#6b6b76',
                  border: type === t.key ? 'none' : '1px solid #e9e5dd',
                  boxShadow: type === t.key ? '0 6px 18px rgba(79,70,229,.28)' : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 w-full md:w-56" style={{ background: '#faf8f5', border: '1px solid #e9e5dd' }}>
            <svg className="w-4 h-4 flex-none" style={{ color: '#9a9aa5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search destination…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: '#1a1a24' }}
            />
          </div>
        </div>

        {/* Budget + Region sub-row */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Budget pills */}
          <div className="flex gap-1.5 flex-wrap">
            {BUDGET_TIERS.map((b) => (
              <button
                key={b.key}
                onClick={() => setBudget(b.key)}
                className="text-xs font-semibold transition-all flex flex-col items-center"
                style={{
                  padding: b.range ? '6px 14px' : '6px 16px',
                  borderRadius: 7,
                  background: budget === b.key ? 'linear-gradient(135deg,#9333ea,#4f46e5)' : 'transparent',
                  color: budget === b.key ? '#fff' : '#1a1a24',
                  border: budget === b.key ? 'none' : '1px solid #e9e5dd',
                }}
              >
                <span>{b.label}</span>
                {b.range && <span style={{ fontSize: 10, opacity: budget === b.key ? .8 : .55 }}>{b.range}</span>}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 mx-1" style={{ background: '#e9e5dd' }} />

          {/* Region tabs */}
          <div className="flex gap-1.5">
            {REGION_TABS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRegion(r.key)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: region === r.key ? '#1a1a24' : 'transparent',
                  color: region === r.key ? '#fff' : '#6b6b76',
                  border: region === r.key ? 'none' : '1px solid #e9e5dd',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results header ── */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <p style={{ fontSize: 14, color: '#6b6b76' }}>
          <strong style={{ color: '#1a1a24' }}>{filtered.length}</strong>{' '}
          {activeTypeLabel} packages found
          {budget !== 'all' && <> · {BUDGET_TIERS.find((b) => b.key === budget)?.label}</>}
          {region !== 'all' && <> · {REGION_TABS.find((r) => r.key === region)?.label}</>}
        </p>
        <Link
          href="/tailored-travel"
          className="text-sm font-semibold text-white px-4 py-2 rounded-lg hidden md:inline-flex items-center gap-1.5"
          style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)' }}
        >
          Build Custom Trip
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      {/* ── Package grid ── */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🌍</div>
            <h3 style={{ fontSize: 22, fontFamily: "'Playfair Display', serif", color: '#1a1a24', marginBottom: 10 }}>
              No packages match your filters
            </h3>
            <p style={{ color: '#6b6b76', marginBottom: 24 }}>Try adjusting the trip type, budget, or region.</p>
            <button
              onClick={() => { setType('all'); setBudget('all'); setRegion('all'); setSearch('') }}
              className="text-sm font-semibold px-6 py-3 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)' }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map((pkg) => {
              const imgUrl = getImageUrl(pkg.Primary_Image_URL)
              const price = formatPrice(pkg.Price_Range_INR)
              const badge = pkg.Occasion || pkg.Travel_Type || pkg.Star_Category

              return (
                <Link
                  key={pkg.id}
                  href={`/destinations/${encodeURIComponent(pkg.destinationSlug)}/${encodeURIComponent(pkg.packageId)}`}
                  className="group flex flex-col"
                  style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 24px rgba(26,26,36,.08)', background: '#fff', border: '1px solid #e9e5dd', transition: 'box-shadow .25s, transform .25s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(26,26,36,.14)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(26,26,36,.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden" style={{ height: 220 }}>
                    <Image
                      src={imgUrl}
                      alt={pkg.Destination_Name}
                      fill
                      sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={() => {}}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,9,16,.5), transparent 50%)' }} />
                    {badge && (
                      <span
                        className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-sm"
                        style={{ background: 'rgba(255,255,255,.92)', color: '#1a1a24', letterSpacing: '.06em', textTransform: 'uppercase', fontSize: 10 }}
                      >
                        {badge}
                      </span>
                    )}
                    {pkg.Duration && (
                      <span className="absolute bottom-3 left-3 text-white text-xs font-semibold flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                        {pkg.Duration}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 p-5">
                    <h3
                      className="mb-1 line-clamp-1"
                      style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: '#1a1a24' }}
                    >
                      {pkg.Destination_Name}
                    </h3>
                    <p className="text-xs mb-4" style={{ color: '#9a9aa5', letterSpacing: '.03em' }}>
                      {isIndia(pkg) ? 'India' : 'International'} · {pkg.Star_Category ? `${pkg.Star_Category}★ hotels` : 'Curated stay'}
                    </p>

                    <div className="mt-auto pt-4 flex items-end justify-between" style={{ borderTop: '1px solid #e9e5dd' }}>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#1a1a24' }}>{price}</div>
                        <div style={{ fontSize: 11, color: '#9a9aa5', marginTop: 2 }}>per person</div>
                      </div>
                      <span className="text-sm font-bold flex items-center gap-1" style={{ color: '#4f46e5' }}>
                        View itinerary <span>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* CTA banner */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div
          className="rounded-2xl p-8 md:p-12 text-center text-white"
          style={{ background: 'linear-gradient(135deg,#1a1a24 0%,#2d2050 100%)' }}
        >
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 600, marginBottom: 12 }}>
            Can&apos;t find what you&apos;re looking for?
          </h3>
          <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 16, marginBottom: 28 }}>
            Tell us your dream trip — our AI builds a personalized itinerary in 60 seconds, refined by a real planner.
          </p>
          <Link
            href="/tailored-travel"
            className="inline-flex items-center gap-2 font-semibold text-white rounded-full px-8 py-4"
            style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)', boxShadow: '0 12px 32px rgba(79,70,229,.4)' }}
          >
            Plan My Custom Trip
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
