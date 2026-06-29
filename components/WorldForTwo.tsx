'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Destination {
  id: string
  name: string
  description: string
  image: string
  region?: string
  slug: string
  // enriched from packages
  fromPrice?: number
  nights?: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractPrice(raw: string | number | undefined): number {
  if (!raw) return 0
  if (typeof raw === 'number') return raw
  const s = raw.replace(/[₹,\s]/g, '')
  const m = s.match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

function extractNights(raw: string | number | undefined): number {
  if (!raw) return 0
  if (typeof raw === 'number') return raw
  const m = String(raw).match(/(\d+)/)
  return m ? parseInt(m[1]) : 0
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
}

// Determine if a package belongs to a destination by slug/name matching
function matchesDest(pkgData: Record<string, unknown>, dest: Destination): boolean {
  const destSlug = dest.slug.toLowerCase()
  const destName = dest.name.toLowerCase()
  const pkgName  = ((pkgData.Destination_Name || pkgData.title || pkgData.destination || '') as string).toLowerCase()
  const pkgSlug  = ((pkgData.Destination_ID || pkgData.destination || '') as string).toLowerCase()
  return (
    pkgName.includes(destSlug) ||
    pkgSlug.includes(destSlug) ||
    destName.split(' ').some(w => w.length > 3 && pkgName.includes(w.toLowerCase()))
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  dest: Destination
  size?: 'large' | 'wide' | 'small'
  style?: React.CSSProperties
}

function DestCard({ dest, size = 'small', style }: CardProps) {
  const nameFontSize = size === 'large' ? 42 : size === 'wide' ? 30 : 24

  return (
    <Link
      href={`/destinations/${dest.slug}`}
      className="group relative block overflow-hidden"
      style={{
        borderRadius: 10,
        textDecoration: 'none',
        width: '100%',
        height: '100%',
        minHeight: size === 'large' ? 580 : size === 'wide' ? 268 : 268,
        ...style,
      }}
    >
      {dest.image ? (
        <Image
          src={dest.image}
          alt={dest.name}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1e1c2e' }} />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            size === 'large'
              ? 'linear-gradient(to top, rgba(10,9,16,.88) 0%, rgba(10,9,16,.3) 55%, rgba(10,9,16,.08) 100%)'
              : 'linear-gradient(to top, rgba(10,9,16,.82) 0%, rgba(10,9,16,.18) 50%, transparent 80%)',
        }}
      />

      {/* Hover shimmer */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,.1), transparent)' }}
      />

      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        {dest.region && (
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.5)',
              margin: '0 0 4px',
            }}
          >
            {dest.region}
          </p>
        )}
        <h3
          style={{
            fontFamily: 'var(--font-playfair), "Playfair Display", serif',
            fontSize: nameFontSize,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 6px',
            lineHeight: 1.05,
          }}
        >
          {dest.name}
        </h3>
        <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,.6)' }}>
          {dest.fromPrice ? `from ${formatINR(dest.fromPrice)}` : dest.description?.slice(0, 48) || ''}
          {dest.nights ? <> &bull; {dest.nights} nights</> : null}
        </p>
      </div>
    </Link>
  )
}

function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{ borderRadius: 10, background: '#1e1c2e', width: '100%', minHeight: 268, ...style }}
    />
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorldForTwo() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        // Fetch destinations + packages in parallel
        const [destSnap, pkgSnap] = await Promise.all([
          getDocs(collection(db, 'destinations')),
          getDocs(collection(db, 'packages')),
        ])

        // Build destination list
        const dests: Destination[] = []
        destSnap.forEach((doc) => {
          const d = doc.data() as Omit<Destination, 'id'>
          if (d.name && d.slug) {
            dests.push({ ...d, id: doc.id })
          }
        })

        // Build price lookup from packages
        const pkgList: Record<string, unknown>[] = []
        pkgSnap.forEach((doc) => {
          pkgList.push({ ...doc.data(), id: doc.id })
        })

        // Enrich each destination with min price + typical nights from packages
        const enriched = dests.map((dest) => {
          const matching = pkgList.filter((p) => matchesDest(p, dest))
          if (matching.length === 0) return dest

          const prices = matching
            .map((p) => (p.pricePerPerson as number) || extractPrice(p.Price_Range_INR as string | number))
            .filter((n) => n > 0)
          const nightsList = matching
            .map((p) => (p.durationNights as number) || extractNights(p.Duration as string))
            .filter((n) => n > 0)

          return {
            ...dest,
            fromPrice: prices.length ? Math.min(...prices) : undefined,
            nights: nightsList.length ? Math.round(nightsList.reduce((a, b) => a + b, 0) / nightsList.length) : undefined,
          }
        })

        // Sort: destinations with images + price first, then by region variety
        enriched.sort((a, b) => {
          const aScore = (a.image ? 2 : 0) + (a.fromPrice ? 1 : 0)
          const bScore = (b.image ? 2 : 0) + (b.fromPrice ? 1 : 0)
          return bScore - aScore
        })

        setDestinations(enriched.slice(0, 7))
      } catch (e) {
        console.error('WorldForTwo:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const [d0, d1, d2, d3, ...rest] = destinations

  return (
    <section style={{ background: '#12101c', padding: '80px 24px 96px' }}>
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="block h-px w-8" style={{ background: '#a08a6a' }} />
              <span
                className="text-xs font-bold tracking-[0.22em] uppercase"
                style={{ color: '#a08a6a' }}
              >
                Where Love Takes You
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(32px, 4vw, 56px)',
                fontFamily: 'var(--font-playfair), "Playfair Display", serif',
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              A world made{' '}
              <em style={{ color: '#c4b5fd', fontStyle: 'italic', fontWeight: 500 }}>for two.</em>
            </h2>
          </div>
          <p
            style={{
              maxWidth: 300,
              fontSize: 15,
              color: 'rgba(255,255,255,.5)',
              lineHeight: 1.7,
              marginTop: 6,
              flexShrink: 0,
            }}
          >
            Twenty-five destinations, each curated for couples. Hover to explore — tap to see the full itinerary.
          </p>
        </div>

        {/* ── Bento grid ── */}
        {loading ? (
          <>
            {/* Mobile skeleton */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {[1,2,3].map(i => <SkeletonCard key={i} style={{ minHeight: 200 }} />)}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:block">
              <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <SkeletonCard style={{ minHeight: 580 }} />
                <div className="flex flex-col gap-3">
                  <SkeletonCard />
                  <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <SkeletonCard /><SkeletonCard />
                  </div>
                </div>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <SkeletonCard style={{ minHeight: 240 }} />
                <SkeletonCard style={{ minHeight: 240 }} />
                <SkeletonCard style={{ minHeight: 240 }} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Mobile: single column stack */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {[d0, d1, d2, d3, ...rest].filter(Boolean).slice(0, 6).map((dest) =>
                dest ? <DestCard key={dest.id} dest={dest} size="small" style={{ minHeight: 200 }} /> : null
              )}
            </div>

            {/* Desktop: bento layout */}
            <div className="hidden md:block">
              {/* Row 1: large left + right 3-up */}
              <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {d0 && (
                  <div style={{ minHeight: 580 }}>
                    <DestCard dest={d0} size="large" style={{ minHeight: 580 }} />
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {d1 && <DestCard dest={d1} size="wide" />}
                  <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {d2 && <DestCard dest={d2} size="small" />}
                    {d3 && <DestCard dest={d3} size="small" />}
                  </div>
                </div>
              </div>
              {/* Row 2: remaining cards */}
              {rest.length > 0 && (
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(rest.length, 3)}, 1fr)` }}>
                  {rest.slice(0, 3).map((dest) => (
                    <DestCard key={dest.id} dest={dest} size="small" style={{ minHeight: 240 }} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CTA ── */}
        {!loading && (
          <div className="text-center mt-12">
            <Link
              href="/destinations"
              className="inline-flex items-center gap-2.5 font-semibold text-sm rounded-full border transition-all px-6 py-3"
              style={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,.2)',
                background: 'rgba(255,255,255,.06)',
              }}
            >
              Explore all destinations
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

      </div>
    </section>
  )
}
