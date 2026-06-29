'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Destination {
  id?: string
  name: string
  country: string
  description?: string
  image?: string
  slug?: string
  region?: string
  featured?: boolean
  packageIds?: string[]
}

// ─── Image map ────────────────────────────────────────────────────────────────

const IMG_MAP: Record<string, string> = {
  bali:       'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=85',
  maldives:   'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=900&q=85',
  kerala:     'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=900&q=85',
  kashmir:    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=85',
  rajasthan:  'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=900&q=85',
  goa:        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&q=85',
  dubai:      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=85',
  thailand:   'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=900&q=85',
  singapore:  'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=900&q=85',
  andaman:    'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=900&q=85',
  manali:     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85',
  shimla:     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85',
  himachal:   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85',
  ladakh:     'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=900&q=85',
  udaipur:    'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=900&q=85',
  jaipur:     'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=900&q=85',
  vietnam:    'https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=900&q=85',
  europe:     'https://images.unsplash.com/photo-1503917988258-f87a78e3c995?w=900&q=85',
  paris:      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=85',
  santorini:  'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=85',
  mauritius:  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=85',
  srilanka:   'https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?w=900&q=85',
}

const FALLBACK = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=85'

function getImage(d: Destination): string {
  if (d.image) return d.image
  const key = d.name.toLowerCase().replace(/\s+/g, '')
  for (const [k, v] of Object.entries(IMG_MAP)) {
    if (key.includes(k)) return v
  }
  return FALLBACK
}

function isIndia(d: Destination): boolean {
  return d.country?.toLowerCase() === 'india'
}

function getRegionLabel(d: Destination): string {
  return isIndia(d) ? (d.region || 'India') : d.country
}

// ─── Hero Card (landscape, first in section) ──────────────────────────────────

function HeroCard({ dest, priority }: { dest: Destination; priority?: boolean }) {
  const slug   = dest.slug || dest.name.toLowerCase().replace(/\s+/g, '-')
  const img    = getImage(dest)
  const pkgCount = dest.packageIds?.length ?? 0

  return (
    <Link
      href={`/destinations/${encodeURIComponent(slug)}`}
      className="group relative block overflow-hidden"
      style={{
        borderRadius: 20,
        textDecoration: 'none',
        height: 'clamp(260px, 32vw, 440px)',
        display: 'block',
      }}
    >
      <Image
        src={img}
        alt={dest.name}
        fill
        sizes="(max-width: 768px) 100vw, 90vw"
        className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
        priority={priority}
      />

      {/* Cinematic gradient */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(10,9,16,.88) 0%, rgba(10,9,16,.5) 50%, rgba(10,9,16,.15) 100%)' }} />

      {/* Hover shimmer */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.15), transparent 60%)' }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <span
            className="text-xs font-bold tracking-[0.16em] uppercase px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.9)' }}
          >
            {getRegionLabel(dest)}
          </span>
          {dest.featured && (
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', boxShadow: '0 4px 14px rgba(79,70,229,.4)' }}
            >
              ✦ Featured
            </span>
          )}
        </div>

        {/* Bottom content */}
        <div className="max-w-lg">
          <h3
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontSize: 'clamp(28px, 4vw, 52px)',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {dest.name}
          </h3>
          {dest.description && (
            <p style={{ margin: '0 0 20px', fontSize: 'clamp(13px, 1.5vw, 15px)', color: 'rgba(255,255,255,.65)', lineHeight: 1.7, maxWidth: 400 }}>
              {dest.description.length > 120 ? dest.description.slice(0, 120) + '…' : dest.description}
            </p>
          )}
          <div className="flex items-center gap-4">
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all duration-300 group-hover:gap-3"
              style={{ background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.25)', color: '#fff', fontSize: 14 }}
            >
              Explore Destination
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            {pkgCount > 0 && (
              <span style={{ fontSize: 13, color: '#c4b5fd', fontWeight: 600 }}>
                {pkgCount} package{pkgCount !== 1 ? 's' : ''} available
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Portrait Card ────────────────────────────────────────────────────────────

function DestCard({ dest }: { dest: Destination }) {
  const slug = dest.slug || dest.name.toLowerCase().replace(/\s+/g, '-')
  const img  = getImage(dest)
  const pkgCount = dest.packageIds?.length ?? 0

  return (
    <Link
      href={`/destinations/${encodeURIComponent(slug)}`}
      className="group relative block overflow-hidden"
      style={{ borderRadius: 16, textDecoration: 'none', aspectRatio: '3/4' }}
    >
      <Image
        src={img}
        alt={dest.name}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />

      {/* Base gradient — always present */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(10,9,16,.92) 0%, rgba(10,9,16,.3) 45%, rgba(10,9,16,.05) 100%)' }}
      />

      {/* Hover gradient — reveals description */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(to top, rgba(10,9,16,.97) 0%, rgba(10,9,16,.6) 55%, rgba(10,9,16,.15) 100%)' }}
      />

      {/* Top badge */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        <span
          className="text-xs font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,.13)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,.85)', border: '1px solid rgba(255,255,255,.18)' }}
        >
          {getRegionLabel(dest)}
        </span>
        {dest.featured && (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff' }}
          >
            ✦
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Description — fades in on hover */}
        {dest.description && (
          <p
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              margin: '0 0 8px',
              fontSize: 12,
              color: 'rgba(255,255,255,.6)',
              lineHeight: 1.6,
            }}
          >
            {dest.description.length > 80 ? dest.description.slice(0, 80) + '…' : dest.description}
          </p>
        )}

        <h3
          style={{
            margin: '0 0 3px',
            fontFamily: 'var(--font-playfair), "Playfair Display", serif',
            fontSize: 'clamp(17px, 2.5vw, 22px)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.1,
          }}
        >
          {dest.name}
        </h3>

        <div className="flex items-center justify-between">
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
            {dest.country}
          </p>
          {pkgCount > 0 && (
            <span style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 700 }}>
              {pkgCount} pkg{pkgCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* CTA — slides in on hover */}
        <div
          className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300"
          style={{ color: '#c4b5fd', fontSize: 12, fontWeight: 700 }}
        >
          View destination
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count, icon }: { title: string; count: number; icon: string }) {
  return (
    <div className="flex items-center gap-4 mb-6 md:mb-8">
      <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
      <div className="flex-1">
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-playfair), "Playfair Display", serif',
            fontSize: 'clamp(22px, 3vw, 36px)',
            fontWeight: 700,
            color: '#1a1a24',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
      </div>
      <span
        className="flex-shrink-0 text-sm font-bold px-3 py-1.5 rounded-full hidden sm:inline-flex items-center"
        style={{ background: 'rgba(124,58,237,.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.15)' }}
      >
        {count} places
      </span>
    </div>
  )
}

// ─── Mid-page CTA banner ──────────────────────────────────────────────────────

function MidCTA() {
  return (
    <div
      className="relative overflow-hidden my-12 md:my-16"
      style={{ borderRadius: 20, background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1b69 40%, #1e1b4b 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #c4b5fd, transparent)' }} />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 20 }}>✨</span>
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#c4b5fd' }}>AI-Powered Planning</span>
          </div>
          <h3
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.15,
            }}
          >
            Can&apos;t decide where to go?
          </h3>
          <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 400 }}>
            Our AI travel planner crafts a personalised honeymoon itinerary in minutes — hotels, activities, and all.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-bold rounded-full transition-all duration-300 hover:gap-4 hover:shadow-2xl"
            style={{ background: 'linear-gradient(135deg,#c4b5fd,#818cf8)', color: '#1e0a3c', fontSize: 15, padding: '14px 32px', textDecoration: 'none', boxShadow: '0 8px 32px rgba(196,181,253,.3)' }}
          >
            Plan My Trip
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Free · No sign up needed</span>
        </div>
      </div>
    </div>
  )
}

// ─── Destination section (hero card + grid) ───────────────────────────────────

function DestSection({
  title, icon, dests, showHero, priorityFirst,
}: {
  title: string
  icon: string
  dests: Destination[]
  showHero: boolean
  priorityFirst?: boolean
}) {
  if (dests.length === 0) return null
  const [hero, ...rest] = dests

  return (
    <div className="mb-14 md:mb-20">
      <SectionHeader title={title} count={dests.length} icon={icon} />
      {showHero && (
        <div className="mb-4 md:mb-5">
          <HeroCard dest={hero} priority={priorityFirst} />
        </div>
      )}
      {(showHero ? rest : dests).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {(showHero ? rest : dests).map((d, i) => (
            <DestCard key={d.id ?? i} dest={d} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = ['All', 'India', 'International'] as const
type Tab = typeof TABS[number]

export default function DestinationsClient({ initialDestinations }: { initialDestinations: Destination[] }) {
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')

  const allIndia = useMemo(() => initialDestinations.filter(isIndia), [initialDestinations])
  const allIntl  = useMemo(() => initialDestinations.filter(d => !isIndia(d)), [initialDestinations])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const pool =
      tab === 'India'         ? allIndia :
      tab === 'International' ? allIntl  :
      initialDestinations

    return pool.filter(d =>
      !q
      || d.name.toLowerCase().includes(q)
      || d.country?.toLowerCase().includes(q)
      || d.description?.toLowerCase().includes(q)
    )
  }, [initialDestinations, allIndia, allIntl, tab, search])

  const filteredIndia = useMemo(() => filtered.filter(isIndia), [filtered])
  const filteredIntl  = useMemo(() => filtered.filter(d => !isIndia(d)), [filtered])

  const featuredSort = (list: Destination[]) =>
    [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))

  const indiaFeatured = featuredSort(filteredIndia)
  const intlFeatured  = featuredSort(filteredIntl)

  const tabCounts: Record<Tab, number> = {
    All:           initialDestinations.length,
    India:         allIndia.length,
    International: allIntl.length,
  }

  return (
    <>
      {/* ── Sticky filter bar ── */}
      <div
        className="sticky top-16 z-30"
        style={{ background: 'rgba(250,248,245,.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e9e5dd', boxShadow: '0 2px 20px rgba(26,26,36,.06)' }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">

          {/* Tab pills */}
          <div
            className="flex items-center gap-1 p-1 rounded-2xl flex-shrink-0"
            style={{ background: '#f0ede8', border: '1px solid #e0dbd4' }}
          >
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200"
                style={{
                  background: tab === t ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'transparent',
                  color: tab === t ? '#fff' : '#6b6b76',
                  boxShadow: tab === t ? '0 4px 16px rgba(79,70,229,.28)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    background: tab === t ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.07)',
                    color: tab === t ? '#fff' : '#9a9aa5',
                  }}
                >
                  {tabCounts[t]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 w-full sm:w-auto min-w-0">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="#9a9aa5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, country…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl outline-none transition-all"
              style={{
                background: '#f0ede8',
                border: '1px solid #e0dbd4',
                color: '#1a1a24',
                fontSize: 14,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a9aa5', lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>

          {/* Result count */}
          <span className="text-sm flex-shrink-0" style={{ color: '#9a9aa5' }}>
            <strong style={{ color: '#1a1a24' }}>{filtered.length}</strong> found
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <section style={{ padding: '56px 24px 96px' }}>
        <div className="max-w-6xl mx-auto">

          {filtered.length === 0 ? (
            /* ── Empty state ── */
            <div className="text-center py-28">
              <div
                className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
                style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.12)' }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <h3
                style={{ fontFamily: 'var(--font-playfair), "Playfair Display", serif', fontSize: 28, fontWeight: 700, color: '#1a1a24', margin: '0 0 10px' }}
              >
                No destinations found
              </h3>
              <p style={{ fontSize: 15, color: '#6b6b76', margin: '0 0 28px' }}>
                Try a different search term or clear your filters.
              </p>
              <button
                onClick={() => { setSearch(''); setTab('All') }}
                className="inline-flex items-center gap-2 font-bold rounded-full transition-all hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 14, padding: '13px 30px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,.3)' }}
              >
                Clear all filters
              </button>
            </div>

          ) : search ? (
            /* ── Search results: flat grid ── */
            <>
              <div className="mb-8">
                <p style={{ fontSize: 14, color: '#6b6b76', margin: 0 }}>
                  Showing <strong style={{ color: '#1a1a24' }}>{filtered.length}</strong> results for &ldquo;<strong style={{ color: '#7c3aed' }}>{search}</strong>&rdquo;
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {featuredSort(filtered).map((d, i) => (
                  <DestCard key={d.id ?? i} dest={d} />
                ))}
              </div>
            </>

          ) : tab === 'All' ? (
            /* ── All: sectioned layout ── */
            <>
              {indiaFeatured.length > 0 && (
                <DestSection
                  title="India Destinations"
                  icon="🇮🇳"
                  dests={indiaFeatured}
                  showHero={indiaFeatured.length >= 2}
                  priorityFirst
                />
              )}

              {indiaFeatured.length > 0 && intlFeatured.length > 0 && <MidCTA />}

              {intlFeatured.length > 0 && (
                <DestSection
                  title="International Destinations"
                  icon="🌍"
                  dests={intlFeatured}
                  showHero={intlFeatured.length >= 2}
                />
              )}
            </>

          ) : tab === 'India' ? (
            <DestSection
              title="India Destinations"
              icon="🇮🇳"
              dests={indiaFeatured}
              showHero={indiaFeatured.length >= 2}
              priorityFirst
            />

          ) : (
            <DestSection
              title="International Destinations"
              icon="🌍"
              dests={intlFeatured}
              showHero={intlFeatured.length >= 2}
              priorityFirst
            />
          )}
        </div>
      </section>
    </>
  )
}
