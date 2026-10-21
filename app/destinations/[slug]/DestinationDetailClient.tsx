'use client'

import { use, useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import travelDatabase from '@/data/travel-database.json'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ReviewForm from '@/components/ReviewForm'
import ReviewList from '@/components/ReviewList'
import ReviewSummary from '@/components/ReviewSummary'
import Breadcrumbs from '@/components/Breadcrumbs'

const travelData = travelDatabase as any

interface DestinationPackage {
  id?: string
  Destination_ID: string
  Destination_Name: string
  Overview: string
  Duration: string
  Mood: string
  Occasion: string
  Travel_Type: string
  Star_Category: string
  Price_Range_INR: string
  Primary_Image_URL: string
  Inclusions: string
  Location_Breakup?: string
  Slug?: string
  [key: string]: any
}

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string }
  initialDestination?: any
  initialPackages?: DestinationPackage[]
}

const COUNTRY_FLAGS: Record<string, { flag: string; region: string; bestTime: string }> = {
  bali: { flag: '🇮🇩', region: 'Indonesia · Southeast Asia', bestTime: 'Apr - Oct' },
  thailand: { flag: '🇹🇭', region: 'Thailand · Southeast Asia', bestTime: 'Nov - Apr' },
  kashmir: { flag: '🇮🇳', region: 'India · North Highlands', bestTime: 'All Year' },
  kerala: { flag: '🇮🇳', region: 'India · South Coast', bestTime: 'Sep - Mar' },
  rajasthan: { flag: '🇮🇳', region: 'India · Royal Heritage', bestTime: 'Oct - Mar' },
  andaman: { flag: '🇮🇳', region: 'India · Island Paradise', bestTime: 'Oct - May' },
  singapore: { flag: '🇸🇬', region: 'Singapore · Southeast Asia', bestTime: 'All Year' },
  baku: { flag: '🇦🇿', region: 'Azerbaijan · Caucasus', bestTime: 'Apr - Oct' },
  dubai: { flag: '🇦🇪', region: 'United Arab Emirates · Middle East', bestTime: 'Nov - Mar' },
  maldives: { flag: '🇲🇻', region: 'Maldives · Indian Ocean', bestTime: 'Nov - Apr' },
  vietnam: { flag: '🇻🇳', region: 'Vietnam · Southeast Asia', bestTime: 'Dec - May' },
  srilanka: { flag: '🇱🇰', region: 'Sri Lanka · Indian Ocean', bestTime: 'Dec - Apr' }
}

function getDestinationMeta(slug: string, name: string) {
  const s = slug.toLowerCase()
  const n = name.toLowerCase()
  for (const [k, v] of Object.entries(COUNTRY_FLAGS)) {
    if (s.includes(k) || n.includes(k)) return v
  }
  return { flag: '✈️', region: 'Curated Romantic Journey', bestTime: 'Oct - Apr' }
}

function formatPackagePrice(val: any): string {
  if (!val) return 'Custom Quote'
  const str = String(val).replace(/,/g, '').trim()
  const num = parseInt(str.replace(/[^0-9]/g, ''), 10)
  return num ? `₹${num.toLocaleString('en-IN')}` : String(val)
}

function getPackageImage(url?: string): string {
  if (!url) return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80'
  return url.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
}

export default function DestinationDetailClient({ params, initialDestination, initialPackages }: PageProps) {
  const router = useRouter()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const destinationName = decodeURIComponent(resolvedParams.slug)
  const [destinationPackages, setDestinationPackages] = useState<DestinationPackage[]>(initialPackages || [])
  const [destination, setDestination] = useState<any>(initialDestination || null)
  const [loading, setLoading] = useState(!initialDestination)
  const [reviewRefresh, setReviewRefresh] = useState(0)
  const reviewFormRef = useRef<HTMLDivElement>(null)

  // Atlys Filter States
  const [durationFilter, setDurationFilter] = useState<'All' | '3-5 Nights' | '6-8 Nights' | '9+ Nights'>('All')
  const [budgetFilter, setBudgetFilter] = useState<'All' | 'Under ₹35k' | '₹35k - ₹60k' | '₹60k+'>('All')
  const [categoryFilter, setCategoryFilter] = useState<'All' | '4 Star' | '5 Star' | 'Villa'>('All')
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'duration'>('featured')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (initialDestination) return
    const fetchDestinationAndPackages = async () => {
      if (typeof window === 'undefined' || !db) {
        const foundDestination = travelData.destinations.find(
          (d: any) =>
            d.name.toLowerCase() === destinationName.toLowerCase() ||
            d.name.toLowerCase().replace(/\s+/g, '-') === destinationName.toLowerCase()
        )
        setDestination(foundDestination)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const normalizedDestination = destinationName.toLowerCase()
        const destinationsRef = collection(db, 'destinations')
        const destinationsSnapshot = await getDocs(destinationsRef)
        let foundDestination: any = null

        destinationsSnapshot.forEach((doc) => {
          const data = doc.data()
          const destSlug = data.slug?.toLowerCase() || ''
          const destName = data.name?.toLowerCase() || ''

          if (
            destSlug === normalizedDestination ||
            destName === normalizedDestination ||
            destSlug.includes(normalizedDestination) ||
            normalizedDestination.includes(destSlug)
          ) {
            foundDestination = { id: doc.id, ...data }
          }
        })

        if (!foundDestination) {
          foundDestination = travelData.destinations.find(
            (d: any) =>
              d.name.toLowerCase() === destinationName.toLowerCase() ||
              d.name.toLowerCase().replace(/\s+/g, '-') === destinationName.toLowerCase()
          )
        }

        setDestination(foundDestination)

        const packagesRef = collection(db, 'packages')
        const allPackagesSnapshot = await getDocs(packagesRef)
        const packagesData: DestinationPackage[] = []

        const linkedPackageIds = foundDestination?.packageIds || []
        const hasLinkedPackages = Array.isArray(linkedPackageIds) && linkedPackageIds.length > 0

        allPackagesSnapshot.forEach((doc) => {
          const data = doc.data() as DestinationPackage
          const pkgId = data.Destination_ID || ''

          let shouldInclude = false
          if (hasLinkedPackages) {
            shouldInclude = linkedPackageIds.includes(pkgId)
          } else {
            const pkgName = data.Destination_Name?.toLowerCase() || ''
            const normalizedPkgId = pkgId.toLowerCase()
            shouldInclude =
              pkgName.includes(normalizedDestination) ||
              normalizedDestination.includes(pkgName) ||
              pkgName === normalizedDestination ||
              normalizedPkgId.includes(normalizedDestination) ||
              normalizedDestination.includes(normalizedPkgId)
          }

          if (shouldInclude) {
            packagesData.push({ id: doc.id, ...data })
          }
        })

        setDestinationPackages(packagesData)
      } catch (error) {
        console.error('Error fetching destination:', error)
        const foundDestination = travelData.destinations.find(
          (d: any) =>
            d.name.toLowerCase() === destinationName.toLowerCase() ||
            d.name.toLowerCase().replace(/\s+/g, '-') === destinationName.toLowerCase()
        )
        setDestination(foundDestination)
      } finally {
        setLoading(false)
      }
    }

    fetchDestinationAndPackages()
  }, [destinationName, initialDestination])

  // Filtered & sorted packages
  const filteredPackages = useMemo(() => {
    let result = destinationPackages.filter((pkg) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const nameMatch = (pkg.Destination_Name || '').toLowerCase().includes(q)
        const overviewMatch = (pkg.Overview || '').toLowerCase().includes(q)
        const locationMatch = (pkg.Location_Breakup || '').toLowerCase().includes(q)
        if (!nameMatch && !overviewMatch && !locationMatch) return false
      }

      // Duration
      if (durationFilter !== 'All') {
        const match = (pkg.Duration || '').match(/(\d+)\s*N/i)
        const nights = match ? parseInt(match[1], 10) : 5
        if (durationFilter === '3-5 Nights' && (nights < 3 || nights > 5)) return false
        if (durationFilter === '6-8 Nights' && (nights < 6 || nights > 8)) return false
        if (durationFilter === '9+ Nights' && nights < 9) return false
      }

      // Budget
      if (budgetFilter !== 'All') {
        const cleanPrice = String(pkg.Price_Range_INR || '').replace(/[^0-9]/g, '')
        const num = parseInt(cleanPrice, 10) || 0
        if (budgetFilter === 'Under ₹35k' && (num > 35000 || num === 0)) return false
        if (budgetFilter === '₹35k - ₹60k' && (num < 35000 || num > 60000)) return false
        if (budgetFilter === '₹60k+' && num < 60000) return false
      }

      // Category
      if (categoryFilter !== 'All') {
        const cat = (pkg.Star_Category || '').toLowerCase()
        const name = (pkg.Destination_Name || '').toLowerCase()
        if (categoryFilter === '4 Star' && !cat.includes('4')) return false
        if (categoryFilter === '5 Star' && !cat.includes('5')) return false
        if (categoryFilter === 'Villa' && !name.includes('villa') && !cat.includes('villa')) return false
      }

      return true
    })

    // Sort
    if (sortBy === 'price-low') {
      result.sort((a, b) => {
        const priceA = parseInt(String(a.Price_Range_INR || '').replace(/[^0-9]/g, ''), 10) || 0
        const priceB = parseInt(String(b.Price_Range_INR || '').replace(/[^0-9]/g, ''), 10) || 0
        return priceA - priceB
      })
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => {
        const priceA = parseInt(String(a.Price_Range_INR || '').replace(/[^0-9]/g, ''), 10) || 0
        const priceB = parseInt(String(b.Price_Range_INR || '').replace(/[^0-9]/g, ''), 10) || 0
        return priceB - priceA
      })
    } else if (sortBy === 'duration') {
      result.sort((a, b) => {
        const matchA = (a.Duration || '').match(/(\d+)\s*N/i)
        const matchB = (b.Duration || '').match(/(\d+)\s*N/i)
        const nA = matchA ? parseInt(matchA[1], 10) : 0
        const nB = matchB ? parseInt(matchB[1], 10) : 0
        return nB - nA
      })
    }

    return result
  }, [destinationPackages, durationFilter, budgetFilter, categoryFilter, sortBy, searchQuery])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F2F5]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 border-4 border-black/20 border-t-black rounded-full animate-spin" />
            <p className="text-gray-500 font-medium animate-pulse">Loading destination packages...</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (!destination) {
    return (
      <main className="min-h-screen bg-[#F5F2F5]">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md px-6">
            <h1 className="text-3xl font-medium font-serif text-gray-900 mb-3">Destination Not Found</h1>
            <p className="text-gray-500 mb-6">The destination you are looking for is currently unavailable.</p>
            <Link
              href="/destinations"
              className="inline-block bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition"
            >
              Back to Destinations
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const meta = getDestinationMeta(destination?.slug || destinationName, destination?.name || destinationName)
  const minStartingPrice = destinationPackages.reduce((min, p) => {
    const clean = String(p.Price_Range_INR || '').replace(/[^0-9]/g, '')
    const num = parseInt(clean, 10)
    return num && num < min ? num : min
  }, Infinity)

  const formattedLowest = minStartingPrice !== Infinity ? `₹${minStartingPrice.toLocaleString('en-IN')}` : '₹32,000'

  return (
    <main className="min-h-screen bg-[#F5F2F5] text-[#0F0406] antialiased selection:bg-[#651926] selection:text-[#E2DDE3]">
      <Header />

      {/* ─────────────────────────────────────────────────────────────
          1. BREADCRUMBS & TOP NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#F5F2F5] px-5 sm:px-8 lg:px-12 pt-24 pb-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <Breadcrumbs
            items={[
              { name: 'Home', url: '/' },
              { name: 'Destinations', url: '/destinations' },
              { name: destination?.name || destinationName }
            ]}
          />
          <Link
            href="/destinations"
            className="text-xs font-semibold text-gray-500 hover:text-black flex items-center gap-1.5 transition"
          >
            <span>←</span>
            <span>All Destinations</span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ATLYS-STYLE DESTINATION HERO BANNER
      ───────────────────────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-8 lg:px-12 pt-4 pb-8">
        <div className="max-w-[1440px] mx-auto text-center flex flex-col items-center">
          
          {/* Flag & Region Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 shadow-sm mb-3">
            <span className="text-base">{meta.flag}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              {meta.region}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[36px] sm:text-[46px] lg:text-[54px] font-medium font-serif text-gray-900 tracking-tight leading-[1.08] text-balance">
            {destination?.name || destinationName}{' '}<span className="font-pinyon font-normal text-[#651926] text-[1.08em] tracking-normal">Tour Packages</span>
          </h1>

          {/* Subtitle */}
          <p className="text-gray-500 text-[15px] sm:text-[17px] max-w-2xl mt-3 leading-relaxed">
            {destination?.description ||
              `Discover handpicked packages for ${destination?.name || destinationName}. Verified 4★ & 5★ luxury stays, 100% itemised pricing, and 24×7 concierge on WhatsApp.`}
          </p>

          {/* Quick Stats Pill Strip */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>{destinationPackages.length} Curated Packages</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700 shadow-sm">
              <span className="size-2 rounded-full bg-[#C9A0AC]" />
              <span>From {formattedLowest} / couple</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700 shadow-sm">
              <span className="size-2 rounded-full bg-mauve-500" />
              <span>Best Time: {meta.bestTime}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700 shadow-sm">
              <span className="size-2 rounded-full bg-purple-500" />
              <span>Verified 4★ &amp; 5★ Stays</span>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. ATLYS FLOATING FILTER CAPSULE
      ───────────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 lg:px-12 mb-10">
        <div className="max-w-4xl mx-auto rounded-[36px] sm:rounded-full bg-white border border-gray-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.05)] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 md:gap-2">
          
          {/* Segment 1: Duration */}
          <div className="flex items-center gap-3 flex-1 min-w-[140px]">
            <div className="size-8 rounded-full bg-[#E8F8F0] text-[#10B981] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              ⚡
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
                <option value="All">All Durations</option>
                <option value="3-5 Nights">3–5 Nights</option>
                <option value="6-8 Nights">6–8 Nights</option>
                <option value="9+ Nights">9+ Nights</option>
              </select>
            </div>
          </div>

          <span className="hidden md:block h-7 w-px bg-gray-200 shrink-0" aria-hidden="true" />

          {/* Segment 2: Budget */}
          <div className="flex items-center gap-3 flex-1 min-w-[140px]">
            <div className="size-8 rounded-full bg-[#EDE4E7] text-[#462831] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
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
                <option value="Under ₹35k">Under ₹35,000</option>
                <option value="₹35k - ₹60k">₹35k - ₹60,000</option>
                <option value="₹60k+">₹60,000+ (Luxury)</option>
              </select>
            </div>
          </div>

          <span className="hidden md:block h-7 w-px bg-gray-200 shrink-0" aria-hidden="true" />

          {/* Segment 3: Category */}
          <div className="flex items-center gap-3 flex-1 min-w-[140px]">
            <div className="size-8 rounded-full bg-[#EDE4E7] text-[#462831] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              🏨
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Stays:
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-transparent font-bold text-[14px] text-gray-900 outline-none cursor-pointer"
              >
                <option value="All">All Stays</option>
                <option value="4 Star">4 Star Hotels</option>
                <option value="5 Star">5 Star Luxury</option>
                <option value="Villa">Private Pool Villa</option>
              </select>
            </div>
          </div>

          <span className="hidden md:block h-7 w-px bg-gray-200 shrink-0" aria-hidden="true" />

          {/* Segment 4: Sort */}
          <div className="flex items-center gap-3 flex-1 min-w-[140px]">
            <div className="size-8 rounded-full bg-[#F5E6E9] text-[#852233] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              📊
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-[14px] text-gray-900 outline-none cursor-pointer"
              >
                <option value="featured">Featured Picks</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="duration">Longest Trip</option>
              </select>
            </div>
          </div>

        </div>

        {/* Live Search bar for packages */}
        <div className="max-w-md mx-auto mt-4">
          <div className="flex items-center gap-2.5 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm focus-within:border-black transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6773" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${destination?.name || destinationName} packages, places...`}
              className="w-full bg-transparent text-[13px] font-medium text-gray-900 outline-none placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. ATLYS TALL PORTRAIT PACKAGE CARDS GRID
      ───────────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 lg:px-12 mb-20">
        <div className="max-w-[1440px] mx-auto">
          
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-gray-600">
              Showing <strong className="text-gray-900">{filteredPackages.length}</strong> available packages
            </span>
            <Link
              href={`/tailored-travel?destination=${encodeURIComponent(destination?.name || destinationName)}`}
              className="text-xs font-bold text-black hover:underline flex items-center gap-1"
            >
              <span>Customise with AI</span>
              <span>→</span>
            </Link>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-gray-300 bg-white p-16 text-center shadow-sm">
              <span className="text-4xl">🏝️</span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No packages match your filters</h3>
              <p className="mt-1 text-sm text-gray-500">Try selecting a different duration, budget, or clearing your search.</p>
              <button
                onClick={() => {
                  setDurationFilter('All')
                  setBudgetFilter('All')
                  setCategoryFilter('All')
                  setSortBy('featured')
                  setSearchQuery('')
                }}
                className="mt-6 rounded-full bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPackages.map((pkg) => {
                const imageUrl = getPackageImage(pkg.Primary_Image_URL)
                const packageSlug = (pkg as any).Slug || pkg.Destination_ID || pkg.id || 'package'
                const formattedPrice = formatPackagePrice(pkg.Price_Range_INR)
                const starCategory = pkg.Star_Category || '4★ & 5★'
                const travelType = pkg.Travel_Type || pkg.Mood || 'Romantic'

                return (
                  <Link
                    key={pkg.id || packageSlug}
                    href={`/destinations/${encodeURIComponent(destination?.slug || destination?.name || destinationName)}/${packageSlug}`}
                    className="group relative block aspect-[1/1.5] rounded-[30px] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 cursor-pointer bg-gray-900"
                  >
                    {/* Edge-to-Edge Image */}
                    <Image
                      src={imageUrl}
                      alt={pkg.Destination_Name || 'Package'}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    />

                    {/* Top Vignette */}
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 via-black/20 to-transparent pointer-events-none" />

                    {/* Top Floating Badges */}
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-none">
                      <span className="bg-white/95 backdrop-blur-md text-gray-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase">
                        {travelType}
                      </span>
                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-sm">
                        {starCategory}
                      </span>
                    </div>

                    {/* Deep Bottom Gradient */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0.18) 80%, transparent 100%)'
                      }}
                    />

                    {/* Content Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col z-10">
                      
                      {/* Location Hook */}
                      {pkg.Location_Breakup && (
                        <span className="text-[10px] font-semibold tracking-wider text-[#E2DDE3] uppercase line-clamp-1 mb-1">
                          📍 {pkg.Location_Breakup}
                        </span>
                      )}

                      {/* Package Name */}
                      <h3 className="font-serif text-[17px] lg:text-[19px] font-semibold text-white uppercase tracking-wider leading-tight drop-shadow-md line-clamp-2 text-balance">
                        {pkg.Destination_Name || 'Curated Romantic Package'}
                      </h3>

                      {/* Hairline Divider */}
                      <div className="w-full h-px bg-white/20 my-3" />

                      {/* 3-Column Specifications Bar */}
                      <div className="w-full flex items-center justify-between text-white">
                        
                        {/* Column 1: Duration */}
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] font-bold tracking-wider text-white/60 uppercase">
                            DURATION
                          </span>
                          <span className="text-[12px] font-bold tracking-wide uppercase">
                            {pkg.Duration || '5N / 6D'}
                          </span>
                        </div>

                        {/* Column 2: Starting */}
                        <div className="flex flex-col text-center">
                          <span className="text-[9px] font-bold tracking-wider text-white/60 uppercase">
                            STARTING
                          </span>
                          <span className="text-[12px] font-bold tracking-wide text-[#E2DDE3] uppercase">
                            {formattedPrice}
                          </span>
                        </div>

                        {/* Column 3: Category */}
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] font-bold tracking-wider text-white/60 uppercase">
                            STAYS
                          </span>
                          <span className="text-[12px] font-bold tracking-wide uppercase">
                            {starCategory}
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
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. ATLYS DESTINATION QUICK FACTS (4-CARD GRID)
      ───────────────────────────────────────────────────────────── */}
      {destination && (
        <section className="py-16 bg-white border-y border-gray-200/80">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
            
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="block font-pinyon font-normal text-[clamp(28px,2.6vw,36px)] leading-none text-[#651926]">
                Essential Guide
              </span>
              <h2 className="text-[26px] lg:text-[34px] font-medium font-serif text-gray-900 mt-1">
                Traveling to {destination?.name || destinationName}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Best Time */}
              <div className="rounded-[24px] bg-[#F5F2F5] p-6 border border-gray-200/80">
                <div className="size-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold mb-4">
                  ☀️
                </div>
                <h3 className="text-[16px] font-semibold text-gray-900">Best Time to Visit</h3>
                <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                  {destination.bestTimeToVisit || meta.bestTime} offers idyllic beach weather, calm ocean waters, and stunning sunsets.
                </p>
              </div>

              {/* Card 2: Recommended Duration */}
              <div className="rounded-[24px] bg-[#F5F2F5] p-6 border border-gray-200/80">
                <div className="size-10 rounded-2xl bg-mauve-50 text-mauve-600 flex items-center justify-center text-lg font-bold mb-4">
                  ⏳
                </div>
                <h3 className="text-[16px] font-semibold text-gray-900">Ideal Trip Length</h3>
                <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                  {destination.duration || '5 to 8 Days'} is recommended to comfortably explore key regions without feeling rushed.
                </p>
              </div>

              {/* Card 3: Currency */}
              <div className="rounded-[24px] bg-[#F5F2F5] p-6 border border-gray-200/80">
                <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold mb-4">
                  💵
                </div>
                <h3 className="text-[16px] font-semibold text-gray-900">Local Currency</h3>
                <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                  {destination.currency || 'Local Currency'}. Cards widely accepted in hotels, and forex exchange available at airport.
                </p>
              </div>

              {/* Card 4: Curated Stays */}
              <div className="rounded-[24px] bg-[#F5F2F5] p-6 border border-gray-200/80">
                <div className="size-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold mb-4">
                  🏨
                </div>
                <h3 className="text-[16px] font-semibold text-gray-900">Verified Couple Stays</h3>
                <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                  Handpicked private pool villas, 5★ beachfront resorts, and boutique stays vetted for privacy and intimacy.
                </p>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. TOP HIGHLIGHTS & THINGS TO DO
      ───────────────────────────────────────────────────────────── */}
      {destination && (destination.highlights || destination.activities) && (
        <section className="py-16 bg-[#F5F2F5]">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* Highlights */}
              {destination.highlights && destination.highlights.length > 0 && (
                <div>
                  <span className="block font-pinyon font-normal text-[clamp(28px,2.6vw,36px)] leading-none text-[#651926]">
                    Top Sights
                  </span>
                  <h2 className="text-[24px] lg:text-[30px] font-medium font-serif text-gray-900 mt-1 mb-6">
                    Must-Experience in {destination?.name || destinationName}
                  </h2>
                  <div className="space-y-3">
                    {destination.highlights.map((h: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3.5 p-4 rounded-[20px] bg-white border border-gray-200/80 shadow-sm"
                      >
                        <span className="size-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-[14.5px] text-gray-800 leading-relaxed font-medium">
                          {h}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Things to do */}
              {destination.activities && destination.activities.length > 0 && (
                <div>
                  <span className="block font-pinyon font-normal text-[clamp(28px,2.6vw,36px)] leading-none text-[#651926]">
                    Romantic Experiences
                  </span>
                  <h2 className="text-[24px] lg:text-[30px] font-medium font-serif text-gray-900 mt-1 mb-6">
                    Curated Activities for Two
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {destination.activities.map((act: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-[20px] bg-white border border-gray-200/80 shadow-sm flex items-center gap-3"
                      >
                        <span className="text-emerald-500 font-bold">✓</span>
                        <p className="text-[14px] text-gray-800 font-medium">{act}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. FAQs ACCORDION
      ───────────────────────────────────────────────────────────── */}
      {destination?.faqs && destination.faqs.length > 0 && (
        <section className="py-16 bg-white border-t border-gray-200/80">
          <div className="max-w-3xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-10">
              <span className="block font-pinyon font-normal text-[clamp(28px,2.6vw,36px)] leading-none text-[#651926]">
                Common Questions
              </span>
              <h2 className="text-[26px] lg:text-[32px] font-medium font-serif text-gray-900 mt-1">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-3">
              {destination.faqs.map((faq: any, idx: number) => (
                <details
                  key={idx}
                  className="rounded-[20px] bg-[#F5F2F5] p-5 border border-gray-200/80 group list-none cursor-pointer"
                >
                  <summary className="font-bold text-[15px] text-gray-900 flex items-center justify-between list-none">
                    <span>{faq.question}</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-3 text-[14px] text-gray-600 leading-relaxed pt-2 border-t border-gray-200/50">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. TRAVELER REVIEWS
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#F5F2F5] border-t border-gray-200/80">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
          
          <div className="mb-10">
            <span className="block font-pinyon font-normal text-[clamp(28px,2.6vw,36px)] leading-none text-[#651926]">
              Couple Testimonials
            </span>
            <h2 className="text-[26px] lg:text-[34px] font-medium font-serif text-gray-900 mt-1">
              What Couples Say About {destination?.name || destinationName}
            </h2>
            <p className="text-gray-500 text-[15px] mt-1">
              Authentic reviews from couples who traveled with Travelzada
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Summary & Form */}
            <div className="space-y-6">
              <ReviewSummary
                destinationName={destination?.name || destinationName}
                refreshTrigger={reviewRefresh}
                onWriteReviewClick={() => {
                  reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              />

              <div ref={reviewFormRef} id="write-review">
                <ReviewForm
                  destinationName={destination?.name || destinationName}
                  onReviewSubmitted={() => setReviewRefresh((n) => n + 1)}
                />
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
              <ReviewList
                destinationName={destination?.name || destinationName}
                refreshTrigger={reviewRefresh}
              />
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. BOTTOM CTA BANNER
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#111317] text-white">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 text-center flex flex-col items-center">
          <h2 className="text-[28px] lg:text-[40px] font-medium font-serif tracking-tight max-w-[650px] text-balance">
            Ready to plan your trip to {destination?.name || destinationName}?
          </h2>
          <p className="text-gray-300 text-[15px] max-w-[500px] mt-2.5">
            Talk to a real travel designer for two. Free personalised day-by-day itinerary with zero booking obligations.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center mt-7">
            <Link
              href={`/tailored-travel?destination=${encodeURIComponent(destination?.name || destinationName)}`}
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

      <Footer />
    </main>
  )
}
