'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { RealDestinationSection, HomepageData } from '@/lib/homepageData'

export interface DestinationsClientProps {
  initialData: HomepageData
}

// Country flags and metadata for luxury display
const COUNTRY_META: Record<string, { flag: string; countryCode: string; bestTime: string }> = {
  thailand: { flag: '🇹🇭', countryCode: 'TH', bestTime: 'Nov - Apr' },
  bali: { flag: '🇮🇩', countryCode: 'ID', bestTime: 'Apr - Oct' },
  kashmir: { flag: '🇮🇳', countryCode: 'IN', bestTime: 'All Year' },
  kerala: { flag: '🇮🇳', countryCode: 'IN', bestTime: 'Sep - Mar' },
  rajasthan: { flag: '🇮🇳', countryCode: 'IN', bestTime: 'Oct - Mar' },
  andaman: { flag: '🇮🇳', countryCode: 'IN', bestTime: 'Oct - May' },
  singapore: { flag: '🇸🇬', countryCode: 'SG', bestTime: 'All Year' },
  baku: { flag: '🇦🇿', countryCode: 'AZ', bestTime: 'Apr - Oct' },
  dubai: { flag: '🇦🇪', countryCode: 'AE', bestTime: 'Nov - Mar' },
  maldives: { flag: '🇲🇻', countryCode: 'MV', bestTime: 'Nov - Apr' },
  vietnam: { flag: '🇻🇳', countryCode: 'VN', bestTime: 'Dec - May' },
  srilanka: { flag: '🇱🇰', countryCode: 'LK', bestTime: 'Dec - Apr' },
  malaysia: { flag: '🇲🇾', countryCode: 'MY', bestTime: 'All Year' },
  goa: { flag: '🇮🇳', countryCode: 'IN', bestTime: 'Nov - Feb' },
  ladakh: { flag: '🇮🇳', countryCode: 'IN', bestTime: 'May - Sep' },
  himachal: { flag: '🇮🇳', countryCode: 'IN', bestTime: 'Mar - Jun' }
}

function getCountryMeta(slug: string, name: string) {
  const s = slug.toLowerCase()
  const n = name.toLowerCase()
  for (const [k, v] of Object.entries(COUNTRY_META)) {
    if (s.includes(k) || n.includes(k)) return v
  }
  return { flag: '✈️', countryCode: 'DEST', bestTime: 'Oct - Apr' }
}

export default function DestinationsClient({ initialData }: DestinationsClientProps) {
  const sections = initialData.sections || []

  // Top Tab State (Explore vs Honeymoon / Curated)
  const [activeTab, setActiveTab] = useState<'explore' | 'honeymoon'>('explore')

  // Filter Capsule State
  const [regionFilter, setRegionFilter] = useState<'All' | 'International' | 'India'>('All')
  const [budgetFilter, setBudgetFilter] = useState<'All' | 'Under ₹30k' | '₹30k - ₹60k' | '₹60k+'>('All')
  const [durationFilter, setDurationFilter] = useState<'All' | '3-5 Nights' | '6-8 Nights' | '9+ Nights'>('All')
  const [styleFilter, setStyleFilter] = useState<'All' | 'Honeymoon' | 'Luxury Stays' | 'Beach & Island'>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Filtered destinations logic
  const filteredDestinations = useMemo(() => {
    return sections.filter((sec) => {
      // Region
      if (regionFilter !== 'All' && sec.region !== regionFilter) return false

      // Tab filter (if honeymoon tab is selected, bias towards top honeymoon destinations)
      if (activeTab === 'honeymoon') {
        const isHoneymoon = ['thailand', 'bali', 'maldives', 'kashmir', 'kerala', 'andaman', 'dubai'].some(k => 
          sec.slug.toLowerCase().includes(k) || sec.name.toLowerCase().includes(k)
        )
        if (!isHoneymoon) return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = sec.name.toLowerCase().includes(q)
        const matchesFullName = sec.fullName?.toLowerCase().includes(q)
        const matchesPackages = sec.cards.some((c) => 
          c.place.toLowerCase().includes(q) || 
          c.hook.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q)
        )
        if (!matchesName && !matchesFullName && !matchesPackages) return false
      }

      // Budget filter
      if (budgetFilter !== 'All') {
        const minPrice = sec.cards.reduce((min, c) => (c.rawPrice && c.rawPrice < min ? c.rawPrice : min), Infinity)
        if (budgetFilter === 'Under ₹30k' && minPrice > 30000) return false
        if (budgetFilter === '₹30k - ₹60k' && (minPrice < 30000 || minPrice > 60000)) return false
        if (budgetFilter === '₹60k+' && minPrice < 60000) return false
      }

      // Duration filter
      if (durationFilter !== 'All') {
        const hasMatchingDuration = sec.cards.some((c) => {
          const nightsMatch = c.nights.match(/(\d+)\s*N/i)
          const nights = nightsMatch ? parseInt(nightsMatch[1], 10) : 5
          if (durationFilter === '3-5 Nights') return nights >= 3 && nights <= 5
          if (durationFilter === '6-8 Nights') return nights >= 6 && nights <= 8
          if (durationFilter === '9+ Nights') return nights >= 9
          return true
        })
        if (!hasMatchingDuration) return false
      }

      return true
    })
  }, [sections, activeTab, regionFilter, budgetFilter, durationFilter, searchQuery])

  // Total packages count
  const totalPackagesShown = filteredDestinations.reduce((acc, curr) => acc + curr.cards.length, 0)

  return (
    <div className="font-figtree text-[#1C1C1E] bg-[#FAFAFC] min-h-screen antialiased selection:bg-[#E8DCC3] pt-24 pb-20">

      {/* ─────────────────────────────────────────────────────────────
          1. ATLYS-INSPIRED TOP NAVIGATION: TABS & SEARCH PILL
      ───────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 border-b border-gray-200/70 pb-5">
          
          {/* Left spacer / subtle branding indicator */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
              Curated Destinations
            </span>
          </div>

          {/* Center: Iconic Category Tabs (Explore vs Honeymoon) */}
          <div className="flex items-center gap-10">
            {/* Tab 1: Explore */}
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className="flex flex-col items-center gap-1.5 group cursor-pointer relative"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm flex items-center justify-center text-xl text-white group-hover:scale-105 transition-transform">
                🌍
              </div>
              <span className={`text-[14px] font-bold tracking-tight transition-colors ${
                activeTab === 'explore' ? 'text-black' : 'text-gray-500 hover:text-gray-900'
              }`}>
                Explore
              </span>
              {activeTab === 'explore' && (
                <span className="absolute -bottom-5 w-8 h-[3px] bg-black rounded-full" />
              )}
            </button>

            {/* Tab 2: Honeymoon Specials */}
            <button
              type="button"
              onClick={() => setActiveTab('honeymoon')}
              className="flex flex-col items-center gap-1.5 group cursor-pointer relative"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 shadow-sm flex items-center justify-center text-xl text-white group-hover:scale-105 transition-transform">
                💍
              </div>
              <span className={`text-[14px] font-bold tracking-tight transition-colors ${
                activeTab === 'honeymoon' ? 'text-black' : 'text-gray-500 hover:text-gray-900'
              }`}>
                Honeymoon
              </span>
              {activeTab === 'honeymoon' && (
                <span className="absolute -bottom-5 w-8 h-[3px] bg-black rounded-full" />
              )}
            </button>
          </div>

          {/* Right: Sleek Country Search Pill */}
          <div className="relative w-full md:w-auto">
            <div className="flex items-center gap-2.5 rounded-full border border-gray-300/80 bg-white px-4 py-2.5 shadow-sm hover:border-gray-400 focus-within:border-black focus-within:ring-2 focus-within:ring-black/5 transition w-full md:w-[260px]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Country..."
                className="w-full bg-transparent text-[13.5px] font-medium text-gray-900 outline-none placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FLOATING FILTER CAPSULE (EXACT MATCH TO INSPIRATION IMAGE)
      ───────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 mb-10">
        <div className="rounded-[40px] sm:rounded-full bg-white border border-gray-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.05)] px-6 py-3.5 max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 md:gap-2">
          
          {/* Segment 1: Region */}
          <div className="flex items-center gap-3 flex-1 min-w-[150px]">
            <div className="size-8 rounded-full bg-[#E8F8F0] text-[#10B981] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              ⚡
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Region:
              </span>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as any)}
                className="bg-transparent font-bold text-[14px] text-gray-900 outline-none cursor-pointer"
              >
                <option value="All">All Regions</option>
                <option value="International">International</option>
                <option value="India">India</option>
              </select>
            </div>
          </div>

          <span className="hidden md:block h-7 w-px bg-gray-200 shrink-0" aria-hidden="true" />

          {/* Segment 2: Budget */}
          <div className="flex items-center gap-3 flex-1 min-w-[150px]">
            <div className="size-8 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              ✈️
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Budget:
              </span>
              <select
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value as any)}
                className="bg-transparent font-bold text-[14px] text-gray-900 outline-none cursor-pointer"
              >
                <option value="All">Any Budget</option>
                <option value="Under ₹30k">Under ₹30,000</option>
                <option value="₹30k - ₹60k">₹30k - ₹60,000</option>
                <option value="₹60k+">₹60,000+ (Luxury)</option>
              </select>
            </div>
          </div>

          <span className="hidden md:block h-7 w-px bg-gray-200 shrink-0" aria-hidden="true" />

          {/* Segment 3: Duration */}
          <div className="flex items-center gap-3 flex-1 min-w-[150px]">
            <div className="size-8 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              📋
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Duration:
              </span>
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value as any)}
                className="bg-transparent font-bold text-[14px] text-gray-900 outline-none cursor-pointer"
              >
                <option value="All">Any Duration</option>
                <option value="3-5 Nights">3–5 Nights</option>
                <option value="6-8 Nights">6–8 Nights</option>
                <option value="9+ Nights">9+ Nights</option>
              </select>
            </div>
          </div>

          <span className="hidden md:block h-7 w-px bg-gray-200 shrink-0" aria-hidden="true" />

          {/* Segment 4: Holidays / Style */}
          <div className="flex items-center gap-3 flex-1 min-w-[150px]">
            <div className="size-8 rounded-full bg-[#FCE7F3] text-[#EC4899] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              🏖️
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Holidays:
              </span>
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value as any)}
                className="bg-transparent font-bold text-[14px] text-gray-900 outline-none cursor-pointer"
              >
                <option value="All">All Dates</option>
                <option value="Honeymoon">Honeymoon</option>
                <option value="Luxury Stays">Luxury Stays</option>
                <option value="Beach & Island">Island & Beach</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TALL PORTRAIT DESTINATION CARDS (ATLYS 5-COLUMN GRID)
      ───────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">

        {filteredDestinations.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-gray-300 bg-white p-16 text-center shadow-sm">
            <span className="text-4xl">🌍</span>
            <h3 className="mt-4 text-lg font-bold text-gray-900">No destinations match your filters</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your region, budget, or duration filter.</p>
            <button
              onClick={() => {
                setRegionFilter('All')
                setBudgetFilter('All')
                setDurationFilter('All')
                setStyleFilter('All')
                setSearchQuery('')
                setActiveTab('explore')
              }}
              className="mt-6 rounded-full bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredDestinations.map((dest) => {
              const meta = getCountryMeta(dest.slug, dest.name)
              const minPrice = dest.cards.reduce(
                (min, c) => (c.rawPrice && c.rawPrice < min ? c.rawPrice : min),
                Infinity
              )
              const startingPrice = minPrice !== Infinity ? `₹${minPrice.toLocaleString('en-IN')}` : 'Tailor-made'

              return (
                <Link
                  key={dest.slug}
                  href={`/destinations/${dest.slug}`}
                  className="group relative block aspect-[1/1.55] rounded-[30px] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 cursor-pointer bg-gray-900"
                >
                  {/* Destination Cover Photo */}
                  <Image
                    src={dest.img}
                    alt={dest.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  />

                  {/* Top subtle vignette */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

                  {/* Bottom deep gradient overlay for crisp readability */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.78) 42%, rgba(0,0,0,0.2) 80%, transparent 100%)'
                    }}
                  />

                  {/* Content Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col items-center z-10">
                    
                    {/* Country Flag Circle */}
                    <div className="size-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-sm shadow-md mb-2 group-hover:scale-110 transition-transform duration-300">
                      {meta.flag}
                    </div>

                    {/* Destination Name */}
                    <h3 className="text-center font-serif text-[18px] lg:text-[20px] font-bold text-white uppercase tracking-wider leading-tight drop-shadow-md text-balance">
                      {dest.name}
                    </h3>

                    {/* Hairline Divider */}
                    <div className="w-full h-px bg-white/20 my-3.5" />

                    {/* Specification 3-column table */}
                    <div className="w-full flex items-center justify-between text-white">
                      
                      {/* Column 1: Packages */}
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-bold tracking-wider text-white/60 uppercase">
                          PACKAGES
                        </span>
                        <span className="text-[12px] font-bold tracking-wide uppercase">
                          {dest.cards.length} TOURS
                        </span>
                      </div>

                      {/* Column 2: Starting */}
                      <div className="flex flex-col text-center">
                        <span className="text-[9px] font-bold tracking-wider text-white/60 uppercase">
                          STARTING
                        </span>
                        <span className="text-[12px] font-bold tracking-wide text-[#E8DCC3] uppercase">
                          {startingPrice}
                        </span>
                      </div>

                      {/* Column 3: Best Time */}
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] font-bold tracking-wider text-white/60 uppercase">
                          BEST TIME
                        </span>
                        <span className="text-[12px] font-bold tracking-wide uppercase">
                          {meta.bestTime}
                        </span>
                      </div>

                    </div>

                  </div>
                </Link>
              )
            })}
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. WHY COUPLES CHOOSE TRAVELZADA (VALUE PROPOSITION)
      ───────────────────────────────────────────────────────────── */}
      <section className="mt-24 pt-16 border-t border-gray-200/70 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          
          <div className="text-center max-w-[640px] mx-auto mb-14">
            <span className="text-[11.5px] font-bold tracking-[0.2em] uppercase text-[#7A4F34]">
              The Travelzada Standard
            </span>
            <h2 className="text-[28px] lg:text-[38px] font-bold tracking-tight text-gray-900 mt-2">
              Why couples book their milestone trips with us
            </h2>
            <p className="text-gray-500 text-[15px] mt-2.5">
              Handcrafted romantic getaways with complete price transparency and personalized support.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-[24px] bg-[#FAFAFC] p-7 border border-gray-200/80 hover:shadow-md transition">
              <div className="size-11 rounded-2xl bg-[#5057EA]/10 text-[#5057EA] flex items-center justify-center text-xl font-bold mb-4">
                ⚡
              </div>
              <h3 className="text-[17px] font-bold text-gray-900">Customised in 24 Hours</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mt-2">
                Personalized day-by-day plan crafted for the two of you with handpicked experiences.
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FAFAFC] p-7 border border-gray-200/80 hover:shadow-md transition">
              <div className="size-11 rounded-2xl bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center text-xl font-bold mb-4">
                🏷️
              </div>
              <h3 className="text-[17px] font-bold text-gray-900">100% Itemised Costs</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mt-2">
                Every stay, private cab, and romantic candlelight dinner is clearly itemised with zero hidden markups.
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FAFAFC] p-7 border border-gray-200/80 hover:shadow-md transition">
              <div className="size-11 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center text-xl font-bold mb-4">
                🏨
              </div>
              <h3 className="text-[17px] font-bold text-gray-900">Verified Couple Stays</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mt-2">
                Private pool villas, heritage suites, and beachfront bungalows vetted for romance.
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FAFAFC] p-7 border border-gray-200/80 hover:shadow-md transition">
              <div className="size-11 rounded-2xl bg-[#EC4899]/10 text-[#EC4899] flex items-center justify-center text-xl font-bold mb-4">
                💬
              </div>
              <h3 className="text-[17px] font-bold text-gray-900">24×7 WhatsApp Concierge</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mt-2">
                A dedicated travel designer stays by your side on WhatsApp from inquiry until you return home.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. COUPLE TESTIMONIALS & BOTTOM CTA BANNER
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-[11.5px] font-bold tracking-[0.2em] uppercase text-[#7A4F34]">
                Verified Reviews
              </span>
              <h2 className="text-[26px] lg:text-[34px] font-bold tracking-tight text-gray-900 mt-1">
                Loved by 500+ couples across India
              </h2>
            </div>
            <div className="flex items-center gap-1.5 bg-[#FAFAFC] px-4 py-2 rounded-full border border-gray-200">
              <span className="text-[#00B67A] font-bold">★ 4.9 / 5.0</span>
              <span className="text-gray-400 text-xs">· Trustpilot Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Nishchay & Mansi Gupta',
                pkg: 'Singapore Honeymoon Experience',
                text: 'Our trip was planned so seamlessly by Travelzada. Everything from private limousine pickup to the Marina Bay rooftop dinner was flawlessly coordinated on WhatsApp.'
              },
              {
                name: 'Prashant Singh & Devika',
                pkg: 'Phuket & Krabi Romantic Tour',
                text: 'Swapping hotels was so effortless. They accommodated every request without hesitation, and the local driver in Thailand was courteous and on time every single morning.'
              },
              {
                name: 'Aman & Neha Sharma',
                pkg: 'Kashmir Luxury Valley Getaway',
                text: 'Staying on the private luxury houseboat on Dal Lake and waking up to the snow peaks in Gulmarg was magical. We never felt rushed once.'
              }
            ].map((rev, idx) => (
              <div
                key={idx}
                className="rounded-[24px] bg-[#FAFAFC] p-7 border border-gray-200/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 mb-3.5">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="size-4 rounded-[3px] bg-[#00B67A] text-white flex items-center justify-center text-[10px] font-bold">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-[14.5px] leading-relaxed text-gray-700 italic">
                    "{rev.text}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#3B2A20] text-white flex items-center justify-center font-bold text-xs">
                    {rev.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900">{rev.name}</div>
                    <div className="text-xs text-gray-500">{rev.pkg}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. BOTTOM MINIMALIST CTA
      ───────────────────────────────────────────────────────────── */}
      <section className="py-14 bg-[#111317] text-white">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 text-center flex flex-col items-center">
          <h2 className="text-[28px] lg:text-[40px] font-bold tracking-tight max-w-[650px] text-balance">
            Ready to plan your romantic getaway?
          </h2>
          <p className="text-gray-300 text-[15px] max-w-[480px] mt-2.5">
            Connect with a dedicated travel designer. Completely customized day-by-day itinerary with zero booking obligations.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center mt-7">
            <Link
              href="/tailored-travel"
              className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-[14px] hover:bg-gray-100 transition shadow"
            >
              Plan with AI — Free
            </Link>
            <a
              href="https://wa.me/919929962350"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-full bg-[#25D366] text-white font-bold text-[14px] hover:bg-[#20ba59] transition shadow flex items-center gap-2"
            >
              <span>Chat on WhatsApp</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
