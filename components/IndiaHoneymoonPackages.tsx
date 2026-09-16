'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getDestinationSlugFromPackage, getPackageIdFromPackage } from '@/lib/destinationSlugMapper'

// Handles both old (Destination_Name / Price_Range_INR) and new (title / pricePerPerson) schemas
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
  // Computed
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

const BADGES = ['MOST BOOKED', 'HONEYMOON SPECIAL', 'BUDGET PICK']
const RATINGS   = [4.9, 4.8, 4.7, 4.9, 4.8, 4.7]
const REVIEWS   = [128,  96, 142,  74,  88, 110]
const DISCOUNTS = [ 17,  18,  19,  17,  16,  19]

// ─── Normalisation helpers ───────────────────────────────────────────────────

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
  if (!url) return 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80'
  return url.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
}

function getStar(p: RawPkg): string {
  return p.starCategory || p.Star_Category || '4★ Luxury'
}

function getTravelType(p: RawPkg): string {
  return (p.travelType || p.Travel_Type || '').toLowerCase()
}

function getOccasion(p: RawPkg): string {
  return (p.Occasion || getTravelType(p)).toLowerCase()
}

function isIndia(p: RawPkg): boolean {
  if (p.destinationCountry && p.destinationCountry.toLowerCase() === 'india') return true
  const name = getName(p).toLowerCase()
  const id   = (p.Destination_ID || p.destination || '').toLowerCase()
  return INDIA_KEYWORDS.some(k => name.includes(k) || id.includes(k))
}

function getItineraryLine(p: RawPkg): string {
  if (p.hotels && p.hotels.length > 0) {
    return p.hotels.map(h => `${h.destination} ${h.nights}N`).join(' · ')
  }
  if (p.highlights && p.highlights.length > 0) {
    return p.highlights[0]
  }
  const n = getName(p).toLowerCase()
  if (n.includes('kashmir'))  return 'Srinagar 3N · Gulmarg 2N · Pahalgam 1N'
  if (n.includes('kerala') || n.includes('alleppey') || n.includes('munnar'))
    return 'Munnar 2N · Thekkady 1N · Alleppey 1N · Kochi 1N'
  if (n.includes('goa'))       return 'North Goa 2N · South Goa 2N'
  if (n.includes('andaman'))   return 'Port Blair 2N · Havelock 3N · Neil 1N'
  if (n.includes('rajasthan') || n.includes('udaipur') || n.includes('jaipur'))
    return 'Udaipur 2N · Jaipur 2N · Jodhpur 1N'
  if (n.includes('himachal') || n.includes('manali') || n.includes('shimla'))
    return 'Shimla 2N · Manali 3N'
  if (n.includes('ladakh') || n.includes('leh'))
    return 'Leh 2N · Nubra Valley 1N · Pangong 2N'
  if (n.includes('coorg'))     return 'Coorg 3N · Mysore 1N'
  const nights = p.durationNights || parseInt(p.Duration || '') || 4
  return `${getName(p)} ${nights}N · Personalised itinerary`
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="w-[320px] sm:w-[350px] bg-white rounded-[28px] p-4 shadow-md flex-none animate-pulse">
      <div className="rounded-[22px] h-[220px] bg-slate-200 mb-4" />
      <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 mb-4">
        <div className="h-8 bg-slate-100 rounded" />
        <div className="h-8 bg-slate-100 rounded" />
        <div className="h-8 bg-slate-100 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="w-10 h-10 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function IndiaHoneymoonPackages() {
  const [packages, setPackages] = useState<RawPkg[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const touchStartX = useRef<number | null>(null)

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
          if (isIndia(pkg)) all.push(pkg)
        })

        const honey = all.filter(p => getOccasion(p).includes('honeymoon'))
        const rest  = all.filter(p => !getOccasion(p).includes('honeymoon'))
        const finalPkgs = [...honey, ...rest].slice(0, 6)
        setPackages(finalPkgs)
        if (finalPkgs.length > 0) {
          setActiveIndex(Math.floor(finalPkgs.length / 2))
        }
      } catch (e) {
        console.error('IndiaHoneymoonPackages:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const nextSlide = useCallback(() => {
    if (packages.length === 0) return
    setActiveIndex(prev => (prev + 1) % packages.length)
  }, [packages.length])

  const prevSlide = useCallback(() => {
    if (packages.length === 0) return
    setActiveIndex(prev => (prev - 1 + packages.length) % packages.length)
  }, [packages.length])

  // Autoplay effect
  useEffect(() => {
    if (loading || packages.length === 0 || isHovered) return
    const timer = setInterval(() => {
      nextSlide()
    }, 3800)
    return () => clearInterval(timer)
  }, [loading, packages.length, isHovered, nextSlide])

  // Relative 3D offset calculation with circular looping
  const getOffset = (index: number) => {
    const total = packages.length
    if (total === 0) return 0
    let diff = (index - activeIndex) % total
    if (diff < -Math.floor(total / 2)) diff += total
    if (diff > Math.floor(total / 2)) diff -= total
    return diff
  }

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) nextSlide()
      else prevSlide()
    }
    touchStartX.current = null
  }

  return (
    <section className="relative overflow-hidden bg-[#fbf9f6] py-10 sm:py-14 px-4 sm:px-8 select-none">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-amber-100/40 via-purple-100/30 to-indigo-100/40 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* ── Header ── */}
        <div className="text-center mb-2 sm:mb-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-800 text-xs font-bold tracking-[0.2em] uppercase mb-2 border border-amber-500/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
            </svg>
            Incredible India
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-display mb-2 leading-tight">
            Best Honeymoon Tour Packages in India
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-1 max-w-2xl mx-auto">
            Every couple deserves a honeymoon that feels like a dream. From houseboat sunsets in Kerala to snow-dusted mornings in Kashmir — each package includes handpicked stays & dedicated WhatsApp support.
          </p>
          <p className="text-xs font-semibold text-amber-700/80 italic">
            Showing packages across all budgets — click any card to explore itinerary.
          </p>
        </div>

        {/* ── 3D Coverflow Container ── */}
        {loading ? (
          <div className="flex justify-center gap-6 overflow-hidden py-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div
            className="relative h-[440px] sm:h-[460px] flex items-start justify-center mt-2 mb-2 perspective-[1200px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Cards Stage */}
            <div className="relative w-full max-w-6xl h-full flex items-start justify-center">
              {packages.map((pkg, i) => {
                const offset = getOffset(i)
                const isCenter = offset === 0
                const badge = BADGES[i % BADGES.length]
                const rating = RATINGS[i % RATINGS.length]
                const reviews = REVIEWS[i % REVIEWS.length]
                const discount = DISCOUNTS[i % DISCOUNTS.length]
                const price = getPrice(pkg)
                const original = price ? Math.round(price / (1 - discount / 100) / 100) * 100 : 0
                const name = getName(pkg)
                const duration = getDuration(pkg)
                const imgUrl = getImg(pkg)
                const itinLine = getItineraryLine(pkg)
                const starCat = getStar(pkg)

                // 3D positioning styles
                let transformStyle = ''
                let zIndex = 0
                let opacity = 0
                let filter = 'none'

                if (offset === 0) {
                  transformStyle = 'translateX(0px) scale(1.02) translateZ(0px) rotateY(0deg)'
                  zIndex = 30
                  opacity = 1
                } else if (offset === 1) {
                  transformStyle = 'translateX(clamp(160px, 32vw, 320px)) scale(0.85) translateZ(-80px) rotateY(-14deg)'
                  zIndex = 20
                  opacity = 0.8
                  filter = 'brightness(0.9) contrast(0.95)'
                } else if (offset === -1) {
                  transformStyle = 'translateX(clamp(-320px, -32vw, -160px)) scale(0.85) translateZ(-80px) rotateY(14deg)'
                  zIndex = 20
                  opacity = 0.8
                  filter = 'brightness(0.9) contrast(0.95)'
                } else if (offset === 2) {
                  transformStyle = 'translateX(clamp(280px, 58vw, 560px)) scale(0.7) translateZ(-160px) rotateY(-24deg)'
                  zIndex = 10
                  opacity = 0.45
                  filter = 'brightness(0.75) contrast(0.9)'
                } else if (offset === -2) {
                  transformStyle = 'translateX(clamp(-560px, -58vw, -280px)) scale(0.7) translateZ(-160px) rotateY(24deg)'
                  zIndex = 10
                  opacity = 0.45
                  filter = 'brightness(0.75) contrast(0.9)'
                } else {
                  transformStyle = `translateX(${offset > 0 ? 700 : -700}px) scale(0.5)`
                  zIndex = 0
                  opacity = 0
                }

                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      if (!isCenter) setActiveIndex(i)
                    }}
                    className="absolute top-2 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer"
                    style={{
                      transform: transformStyle,
                      zIndex,
                      opacity,
                      filter,
                      pointerEvents: Math.abs(offset) <= 2 ? 'auto' : 'none',
                    }}
                  >
                    <div
                      className={`w-[300px] sm:w-[340px] bg-white rounded-3xl overflow-hidden border border-slate-200/80 transition-all duration-500 group ${
                        isCenter
                          ? 'shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5'
                          : 'shadow-md hover:shadow-xl'
                      }`}
                    >
                      {/* Top Image Card */}
                      <div className="relative h-[185px] sm:h-[200px] w-full overflow-hidden">
                        <Image
                          src={imgUrl}
                          alt={name}
                          fill
                          sizes="350px"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                        {/* Top Left Badge */}
                        <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-900/90 text-white backdrop-blur-md shadow-sm border border-white/10">
                          {badge}
                        </div>

                        {/* Top Right Rating */}
                        <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-950/80 backdrop-blur-md text-white flex items-center gap-1 border border-white/15">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                          </svg>
                          <span>{rating}</span>
                          <span className="text-white/60 font-normal text-[11px]">({reviews})</span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5 sm:p-6 flex flex-col justify-between">
                        {/* Title & Location */}
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-slate-700 transition-colors font-display">
                            {name}
                          </h3>

                          {/* Location Pin & Cities */}
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-1.5 line-clamp-1">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="line-clamp-1 text-slate-600">{itinLine}</span>
                          </div>

                          {/* Overview snippet */}
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-normal">
                            Personalized romantic itinerary with curated luxury stays, couple transfers, & handpicked sightseeing experiences.
                          </p>
                        </div>

                        {/* Minimal Metadata Pills (Clean, no background box clutter) */}
                        <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100/90 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>{duration || '5N · 6D'}</span>
                          </div>

                          <div className="inline-flex items-center gap-1.5 bg-slate-100/90 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 21h18M3 7v14M21 7v14M6 3h12v4H6zM9 11h2v2H9zM13 11h2v2h-2zM9 15h2v2H9zM13 15h2v2h-2z" />
                            </svg>
                            <span className="line-clamp-1">{starCat}</span>
                          </div>
                        </div>

                        {/* Bottom Price & Clear Action Button */}
                        <div className="flex items-end justify-between mt-4 pt-3.5 border-t border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              {original > 0 && (
                                <span className="text-xs text-slate-400 line-through font-medium">
                                  {formatINR(original)}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                {discount}% OFF
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl sm:text-2xl font-extrabold text-indigo-600 font-display">
                                {price ? formatINR(price) : 'On Request'}
                              </span>
                              {price > 0 && <span className="text-[11px] text-slate-400 font-medium">/ person</span>}
                            </div>
                          </div>

                          {/* Explicit Luxury Action Button */}
                          <Link
                            href={`/destinations/${encodeURIComponent(pkg._slug)}/${encodeURIComponent(pkg._packageId)}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all duration-300 shadow-sm hover:shadow-md shrink-0 group-hover:bg-slate-900"
                            aria-label={`View ${name} itinerary`}
                          >
                            <span>View Details</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Navigation Arrow Buttons */}
            <button
              onClick={prevSlide}
              aria-label="Previous Package"
              className="absolute left-2 sm:left-6 top-[200px] -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-slate-200/80 text-slate-800 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              onClick={nextSlide}
              aria-label="Next Package"
              className="absolute right-2 sm:right-6 top-[200px] -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-slate-200/80 text-slate-800 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Indicator Dots ── */}
        {!loading && packages.length > 0 && (
          <div className="flex items-center justify-center gap-2.5 mt-8">
            {packages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-500 rounded-full ${
                  activeIndex === idx
                    ? 'w-8 h-2.5 bg-indigo-600 shadow-md shadow-indigo-600/30'
                    : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}

        {/* ── View All Packages CTA ── */}
        {!loading && packages.length > 0 && (
          <div className="text-center mt-12">
            <Link
              href="/packages?type=honeymoon"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-indigo-600 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 transform hover:-translate-y-0.5"
            >
              View all 50+ India honeymoon packages
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        )}

      </div>
    </section>
  )
}

