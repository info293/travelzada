'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getDestinationSlugFromPackage, getPackageIdFromPackage } from '@/lib/destinationSlugMapper'

interface RawPkg {
  id: string
  // Old schema
  Destination_Name?: string
  Duration?: string
  Price_Range_INR?: string | number
  Primary_Image_URL?: string
  Star_Category?: string
  Travel_Type?: string
  Occasion?: string
  Destination_ID?: string
  // New schema
  title?: string
  destination?: string
  destinationCountry?: string
  durationDays?: number
  durationNights?: number
  pricePerPerson?: number
  currency?: string
  primaryImageUrl?: string
  starCategory?: string
  travelType?: string
  inclusions?: string[]
  highlights?: string[]
  hotels?: { destination: string; nights: number; hotels: string; mealPlan: string; roomType: string }[]
  overview?: string
  isActive?: boolean
  _slug: string
  _packageId: string
}

const INDIA_KEYWORDS = [
  'india','goa','kerala','rajasthan','himachal','kashmir','ladakh','andaman',
  'uttarakhand','manali','shimla','jaipur','udaipur','delhi','agra','sikkim',
  'darjeeling','rishikesh','munnar','ooty','kodaikanal','coorg','spiti','leh',
  'auli','jim corbett','ranthambore','alleppey','thekkady','kochi','srinagar',
  'gulmarg','pahalgam','jodhpur','mount abu','mussoorie','nainital','varanasi',
  'pondicherry','varkala','havelock','neil island','port blair','north goa',
  'south goa','dooars','meghalaya','shillong','cherrapunji','assam',
]

// Visa on arrival / free destinations for Indian passport holders
const VISA_ON_ARRIVAL = [
  'bali','indonesia','thailand','maldives','nepal','bhutan','sri lanka',
  'cambodia','laos','myanmar','vietnam','macau','mauritius','seychelles',
  'kenya','tanzania','mozambique','zimbabwe','ethiopia','indonesia',
]
const VISA_FREE = ['mauritius','seychelles','nepal','bhutan']

const TYPE_BADGES = ['MOST BOOKED','BEST VALUE','CITY + BEACH','ISLAND ESCAPE','ROMANTIC','HIDDEN GEM']
const RATINGS   = [4.9, 4.7, 4.8, 4.9, 4.8, 4.7]
const REVIEWS   = [156, 134,  82,  98, 112,  76]
const DISCOUNTS = [ 17,  16,  13,  18,  15,  17]

// ─── Helpers ────────────────────────────────────────────────────────────────

function getName(p: RawPkg): string {
  return p.title || p.Destination_Name || p.destination || ''
}

function getDuration(p: RawPkg): string {
  if (p.durationNights && p.durationDays) return `${p.durationNights}N · ${p.durationDays}D`
  return p.Duration || ''
}

function getPrice(p: RawPkg): number {
  if (p.pricePerPerson) return p.pricePerPerson
  const s = String(p.Price_Range_INR || '').replace(/[₹,\s]/g, '')
  const m = s.match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

function getImg(p: RawPkg): string {
  const url = p.primaryImageUrl || p.Primary_Image_URL || ''
  if (!url) return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'
  return url.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
}

function getStar(p: RawPkg): string {
  return p.starCategory || p.Star_Category || ''
}

function isIndia(p: RawPkg): boolean {
  if (p.destinationCountry) {
    return p.destinationCountry.toLowerCase() === 'india'
  }
  const name = getName(p).toLowerCase()
  const id   = (p.Destination_ID || p.destination || '').toLowerCase()
  return INDIA_KEYWORDS.some(k => name.includes(k) || id.includes(k))
}

function getVisaBadge(p: RawPkg): { label: string; bg: string } {
  const name = getName(p).toLowerCase()
  const country = (p.destinationCountry || '').toLowerCase()
  const check = name + ' ' + country
  if (VISA_FREE.some(k => check.includes(k))) {
    return { label: 'VISA FREE', bg: '#059669' }
  }
  if (VISA_ON_ARRIVAL.some(k => check.includes(k))) {
    return { label: 'VISA ON ARRIVAL', bg: '#2563eb' }
  }
  return { label: 'VISA REQUIRED', bg: '#6b6b76' }
}

function getInclusions(p: RawPkg): string[] {
  if (p.inclusions && p.inclusions.length > 0) {
    return p.inclusions.slice(0, 4)
  }
  const star = getStar(p)
  const starLabel = star ? `${star} hotels` : '4★ hotels'
  return [starLabel, 'Visa guidance', 'Sightseeing', 'Romance']
}

function getItineraryLine(p: RawPkg): string {
  if (p.hotels && p.hotels.length > 0) {
    return p.hotels.map(h => `${h.destination} ${h.nights}N`).join(' · ')
  }
  if (p.highlights && p.highlights.length > 0) return p.highlights[0]
  const n = getName(p).toLowerCase()
  if (n.includes('bali'))         return 'Ubud 3N · Seminyak 3N'
  if (n.includes('thailand'))     return 'Bangkok 2N · Phuket 3N'
  if (n.includes('singapore'))    return 'Singapore 3N · Sentosa 2N'
  if (n.includes('maldives'))     return 'Male 1N · Water Villa 4N'
  if (n.includes('dubai') || n.includes('uae')) return 'Dubai City 3N · Desert 1N · Abu Dhabi 1N'
  if (n.includes('europe'))       return 'Paris 3N · Rome 2N · Amsterdam 2N'
  if (n.includes('paris'))        return 'Paris 3N · Nice 2N'
  if (n.includes('vietnam'))      return 'Hanoi 2N · Ha Long Bay 1N · Hoi An 2N'
  if (n.includes('cambodia') || n.includes('siem'))  return 'Siem Reap 2N · Phnom Penh 2N'
  if (n.includes('sri lanka'))    return 'Colombo 1N · Kandy 2N · Bentota 2N'
  if (n.includes('mauritius'))    return 'Grand Baie 3N · Flic en Flac 2N'
  if (n.includes('nepal') || n.includes('kathmandu')) return 'Kathmandu 2N · Pokhara 3N'
  if (n.includes('japan'))        return 'Tokyo 3N · Kyoto 2N · Osaka 1N'
  if (n.includes('malaysia') || n.includes('kuala')) return 'Kuala Lumpur 2N · Langkawi 3N'
  const nights = p.durationNights || parseInt(p.Duration || '') || 5
  return `${getName(p)} ${nights}N · Personalised itinerary`
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none w-[78vw] sm:w-auto snap-start">
      <div style={{ borderRadius: 10, height: 280, background: '#e9e5dd' }} />
      <div style={{ paddingTop: 20 }}>
        <div style={{ height: 28, background: '#e9e5dd', borderRadius: 4, width: '70%', marginBottom: 8 }} />
        <div style={{ height: 14, background: '#e9e5dd', borderRadius: 4, width: '90%', marginBottom: 6 }} />
        <div style={{ height: 14, background: '#e9e5dd', borderRadius: 4, width: '80%' }} />
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InternationalPackages() {
  const [packages, setPackages] = useState<RawPkg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const snap = await getDocs(collection(db, 'packages'))
        const all: RawPkg[] = []
        snap.forEach((doc) => {
          const data = doc.data() as Omit<RawPkg, 'id' | '_slug' | '_packageId'>
          if (data.isActive === false) return
          const pkg: RawPkg = {
            ...data,
            id: doc.id,
            _slug: getDestinationSlugFromPackage(data as Parameters<typeof getDestinationSlugFromPackage>[0]),
            _packageId: getPackageIdFromPackage({ ...data, id: doc.id }),
          }
          if (!isIndia(pkg)) all.push(pkg)
        })
        // Honeymoon/romantic first, rest fill remaining slots
        const romantic = all.filter(p => {
          const t = (p.travelType || p.Travel_Type || p.Occasion || '').toLowerCase()
          return t.includes('honeymoon') || t.includes('romantic') || t.includes('couple')
        })
        const rest = all.filter(p => {
          const t = (p.travelType || p.Travel_Type || p.Occasion || '').toLowerCase()
          return !t.includes('honeymoon') && !t.includes('romantic') && !t.includes('couple')
        })
        setPackages([...romantic, ...rest].slice(0, 6))
      } catch (e) {
        console.error('InternationalPackages:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <section style={{ background: '#fff', padding: '96px 24px' }}>
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <div className="text-xs font-bold tracking-[0.22em] uppercase mb-5" style={{ color: '#a08a6a' }}>
            International
          </div>
          <h2
            style={{
              margin: '0 auto 20px',
              fontSize: 'clamp(22px, 3.2vw, 44px)',
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#1a1a24',
              lineHeight: 1.15,
            }}
          >
            International Couple Tour Packages from India
          </h2>
          <p style={{ margin: '0 auto', fontSize: 16, color: '#6b6b76', lineHeight: 1.8, maxWidth: 620, textAlign: 'center' }}>
            Dreaming of Bali rice terraces, Maldives overwater villas, or Thai island hopping? Our packages include visa guidance, luxury stays, transfers, sightseeing, and romantic experiences — planned by AI and refined by a human expert.{' '}
            <strong style={{ color: '#1a1a24' }}>Flights are booked separately by the couple.</strong>
          </p>
        </div>

        {/* ── Grid ── */}
        <div className="flex sm:grid overflow-x-auto sm:overflow-x-visible sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-4 sm:pb-0 snap-x snap-mandatory sm:snap-none" style={{ scrollbarWidth: 'none' }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : packages.map((pkg, i) => {
                const typeBadge = TYPE_BADGES[i % TYPE_BADGES.length]
                const visaBadge = getVisaBadge(pkg)
                const rating    = RATINGS[i % RATINGS.length]
                const reviews   = REVIEWS[i % REVIEWS.length]
                const discount  = DISCOUNTS[i % DISCOUNTS.length]
                const price     = getPrice(pkg)
                const original  = price ? Math.round(price / (1 - discount / 100) / 100) * 100 : 0
                const name      = getName(pkg)
                const duration  = getDuration(pkg)
                const imgUrl    = getImg(pkg)
                const itinLine  = getItineraryLine(pkg)
                const incl      = getInclusions(pkg)

                return (
                  <Link
                    key={pkg.id}
                    href={`/destinations/${encodeURIComponent(pkg._slug)}/${encodeURIComponent(pkg._packageId)}`}
                    className="group block flex-none w-[78vw] sm:w-auto snap-start"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden" style={{ borderRadius: 10, height: 280 }}>
                      <Image
                        src={imgUrl}
                        alt={name}
                        fill
                        sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(10,9,16,.65) 0%, rgba(10,9,16,.15) 45%, transparent 70%)' }}
                      />

                      {/* Two top badges */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-start">
                        {/* Left: type */}
                        <span
                          className="text-xs font-black px-3 py-1.5"
                          style={{ background: '#fff', color: '#1a1a24', borderRadius: 4, letterSpacing: '0.1em' }}
                        >
                          {typeBadge}
                        </span>
                        {/* Right: visa */}
                        <span
                          className="text-xs font-black px-3 py-1.5"
                          style={{ background: visaBadge.bg, color: '#fff', borderRadius: 4, letterSpacing: '0.08em' }}
                        >
                          {visaBadge.label}
                        </span>
                      </div>

                      {/* Bottom: duration · rating */}
                      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4 pb-4">
                        {duration && (
                          <div className="flex items-center gap-1.5">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                            </svg>
                            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{duration}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                          </svg>
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{rating}</span>
                          <span style={{ color: 'rgba(255,255,255,.65)', fontSize: 12 }}>· {reviews}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="pt-5 pb-2">
                      <h3
                        className="line-clamp-1 group-hover:text-indigo-700 transition-colors"
                        style={{
                          fontFamily: 'var(--font-playfair), "Playfair Display", serif',
                          fontSize: 'clamp(18px, 5vw, 24px)',
                          fontWeight: 700,
                          color: '#1a1a24',
                          margin: '0 0 6px',
                        }}
                      >
                        {name}
                      </h3>

                      <p className="line-clamp-1" style={{ margin: '0 0 8px', fontSize: 13.5, color: '#9a9aa5' }}>
                        {itinLine}
                      </p>

                      <p className="line-clamp-1" style={{ margin: '0 0 4px', fontSize: 13, color: '#6b6b76' }}>
                        {incl.join(' · ')}
                      </p>

                      {/* Flights note */}
                      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#a08a6a', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>✈</span> Flights booked separately
                      </p>

                      {/* Price */}
                      <div className="flex items-end justify-between pt-4" style={{ borderTop: '1px solid #e9e5dd' }}>
                        <div>
                          {price ? (
                            <>
                              <div style={{ fontFamily: 'var(--font-playfair), "Playfair Display", serif', fontSize: 22, fontWeight: 700, color: '#1a1a24', lineHeight: 1 }}>
                                {formatINR(price)}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span style={{ fontSize: 13, color: '#9a9aa5', textDecoration: 'line-through' }}>{formatINR(original)}</span>
                                <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>save {discount}%</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#9a9aa5', marginTop: 2 }}>per person</div>
                            </>
                          ) : (
                            <span style={{ fontSize: 15, color: '#6b6b76', fontWeight: 600 }}>On Request</span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-sm font-bold" style={{ color: '#4f46e5' }}>
                          View itinerary
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
        </div>

        {/* ── View all CTA ── */}
        {!loading && packages.length > 0 && (
          <div className="text-center mt-14">
            <Link
              href="/packages"
              className="inline-flex items-center gap-2 text-base font-bold"
              style={{ color: '#4f46e5', textDecoration: 'none' }}
            >
              View all international packages
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

      </div>
    </section>
  )
}
