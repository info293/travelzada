'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import travelDatabase from '@/data/travel-database.json'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

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
  [key: string]: any
}

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string }
}

export default function DestinationDetailPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const destinationName = decodeURIComponent(resolvedParams.slug)
  const [destinationPackages, setDestinationPackages] = useState<DestinationPackage[]>([])
  const [destination, setDestination] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDestinationAndPackages = async () => {
      if (typeof window === 'undefined' || !db) {
        // Fallback to JSON
        const foundDestination = travelData.destinations.find(
          (d: any) => d.name.toLowerCase() === destinationName.toLowerCase() ||
            d.name.toLowerCase().replace(/\s+/g, '-') === destinationName.toLowerCase()
        )
        setDestination(foundDestination)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const normalizedDestination = destinationName.toLowerCase()

        // First, try to fetch destination from Firestore
        const destinationsRef = collection(db, 'destinations')
        const destinationsSnapshot = await getDocs(destinationsRef)
        let foundDestination: any = null

        destinationsSnapshot.forEach((doc) => {
          const data = doc.data()
          const destSlug = data.slug?.toLowerCase() || ''
          const destName = data.name?.toLowerCase() || ''

          if (destSlug === normalizedDestination ||
            destName === normalizedDestination ||
            destSlug.includes(normalizedDestination) ||
            normalizedDestination.includes(destSlug)) {
            foundDestination = { id: doc.id, ...data }
          }
        })

        // If not found in Firestore, fallback to JSON
        if (!foundDestination) {
          foundDestination = travelData.destinations.find(
            (d: any) => d.name.toLowerCase() === destinationName.toLowerCase() ||
              d.name.toLowerCase().replace(/\s+/g, '-') === destinationName.toLowerCase()
          )
        }

        setDestination(foundDestination)

        // Fetch packages from Firestore
        const packagesRef = collection(db, 'packages')
        const allPackagesSnapshot = await getDocs(packagesRef)
        const packagesData: DestinationPackage[] = []

        // Get linked package IDs from destination if available
        const linkedPackageIds = foundDestination?.packageIds || []
        const hasLinkedPackages = Array.isArray(linkedPackageIds) && linkedPackageIds.length > 0

        allPackagesSnapshot.forEach((doc) => {
          const data = doc.data() as DestinationPackage
          const pkgId = data.Destination_ID || ''

          let shouldInclude = false

          // First priority: Check if package ID is in the linked packageIds array
          if (hasLinkedPackages) {
            shouldInclude = linkedPackageIds.includes(pkgId)
          } else {
            // Fallback: Match by destination name if no linked packages
            const pkgName = data.Destination_Name?.toLowerCase() || ''
            const normalizedPkgId = pkgId.toLowerCase()

            // Match if package name or Destination_ID contains destination or vice versa
            shouldInclude = pkgName.includes(normalizedDestination) ||
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
        // Fallback to JSON
        const foundDestination = travelData.destinations.find(
          (d: any) => d.name.toLowerCase() === destinationName.toLowerCase() ||
            d.name.toLowerCase().replace(/\s+/g, '-') === destinationName.toLowerCase()
        )
        setDestination(foundDestination)
      } finally {
        setLoading(false)
      }
    }

    fetchDestinationAndPackages()
  }, [destinationName])

  if (!destination) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Destination Not Found</h1>
            <p className="text-gray-600 mb-8">The destination you're looking for doesn't exist.</p>
            <Link
              href="/destinations"
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Back to Destinations
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const getDestinationImage = (dest: any) => {
    // Use image from Firestore if available
    if (dest?.image) return dest.image

    // Fallback to image map
    const imageMap: { [key: string]: string } = {
      'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
      'Goa': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
      'Kerala': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80',
      'Rajasthan': 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e?w=1200&q=80',
      'Manali': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
      'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=80',
      'Thailand': 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=80',
      'Maldives': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    }
    return imageMap[dest?.name] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80'
  }

  const imageUrl = destination ? getDestinationImage(destination) : ''

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero Image Section */}
      <section className="relative h-[460px] md:h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
        </div>
        {/* Back Button - Positioned over image */}
        <div className="absolute top-20 left-4 md:left-12 z-[100] pointer-events-auto">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.push('/destinations')
            }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white hover:bg-white text-gray-900 hover:text-primary transition-all shadow-xl hover:shadow-2xl backdrop-blur-sm cursor-pointer"
            aria-label="Go back to destinations"
            type="button"
          >
            <svg className="w-6 h-6 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="relative z-10 h-full flex items-end pointer-events-none">
          <div className="max-w-6xl mx-auto w-full px-4 md:px-12 pb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold">
                {destination?.country || 'Destination'}
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {destination?.name || destinationName}
            </h1>
            <p className="text-xl text-white/90 max-w-3xl">
              {destination?.description || 'A beautiful destination waiting to be explored.'}
            </p>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      {loading ? (
        <section className="py-12 md:py-16 px-4 md:px-12 bg-gray-50 border-b border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <p className="text-gray-600">Loading packages...</p>
            </div>
          </div>
        </section>
      ) : destinationPackages.length > 0 ? (
        <section className="py-12 md:py-16 px-4 md:px-12 bg-gray-50 border-b border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Featured {destination?.name || destinationName} Packages
                </h2>
                <p className="text-gray-600">
                  Curated itineraries crafted by experts for {destination?.name || destinationName}
                </p>
              </div>
              <Link
                href={`/ai-trip-planner?destination=${encodeURIComponent(destination.name)}`}
                className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Plan Trip with AI
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {destinationPackages.map((pkg) => {
                // Extract image URL from Primary_Image_URL (handle markdown format)
                const imageUrl = pkg.Primary_Image_URL
                  ? pkg.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
                  : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'

                // Use Slug if available, otherwise fall back to Destination_ID or doc id
                const packageSlug = (pkg as any).Slug || pkg.Destination_ID || pkg.id || 'package'

                return (
                  <Link
                    key={pkg.id || packageSlug}
                    href={`/destinations/${encodeURIComponent(destination?.slug || destination?.name || destinationName)}/${packageSlug}`}

                    className="bg-white rounded-[5px] border border-gray-200 hover:border-primary/40 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col relative group"
                  >
                    {/* Shine Effect Overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                    </div>
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={pkg.Destination_Name || 'Package'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'
                        }}
                      />
                      {pkg.Star_Category && (
                        <span className="absolute top-3 right-3 bg-white text-gray-900 text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow">
                          {pkg.Star_Category}
                        </span>
                      )}
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col gap-2.5 min-h-[240px] max-h-[280px]">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 leading-tight">{pkg.Destination_Name || 'Package'}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{pkg.Duration || 'Duration not specified'}</span>
                        </div>
                      </div>

                      {/* Package Details - Compact */}
                      <div className="flex-1 space-y-2">
                        {/* Key Features as Small Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.Star_Category && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-[10px] font-semibold border border-purple-100">
                              <svg className="w-2.5 h-2.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {pkg.Star_Category}
                            </span>
                          )}
                          {pkg.Travel_Type && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-semibold border border-indigo-100">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {pkg.Travel_Type}
                            </span>
                          )}
                          {pkg.Mood && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-50 text-pink-700 rounded-md text-[10px] font-semibold border border-pink-100">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {pkg.Mood}
                            </span>
                          )}
                        </div>

                        {/* Highlights / Overview - Compact */}
                        {(() => {
                          // Helper to get highlights with priority: Highlights > Day Wise > Overview
                          const getHighlights = () => {
                            // 1. Check explicit Highlights field
                            if (pkg.Highlights) {
                              if (Array.isArray(pkg.Highlights) && pkg.Highlights.length > 0) {
                                return pkg.Highlights;
                              }
                              if (typeof pkg.Highlights === 'string') {
                                try {
                                  if (pkg.Highlights.trim().startsWith('[')) {
                                    const parsed = JSON.parse(pkg.Highlights);
                                    if (Array.isArray(parsed)) return parsed;
                                  }
                                  return [pkg.Highlights];
                                } catch (e) {
                                  return [pkg.Highlights];
                                }
                              }
                            }

                            // 2. Fallback to Day Wise Itinerary Titles
                            if (pkg.Day_Wise_Itinerary_Details && Array.isArray(pkg.Day_Wise_Itinerary_Details)) {
                              const titles = pkg.Day_Wise_Itinerary_Details
                                .map((day: any) => day.Title)
                                .filter((t: any) => t && t.trim().length > 3 && !t.toLowerCase().includes('arrival') && !t.toLowerCase().includes('departure'));
                              if (titles.length > 0) return titles;
                            }

                            return [];
                          };

                          const highlights = getHighlights();

                          const displayPoints = highlights.length > 0
                            ? highlights
                            : (pkg.Overview ? pkg.Overview.split('. ').filter((point: string) => point.trim().length > 0) : []);

                          const label = highlights.length > 0 ? 'Highlights' : 'Overview';
                          const showSection = displayPoints.length > 0;

                          if (!showSection) return null;

                          return (
                            <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                              <p className="text-[10px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                                {label === 'Highlights' ? (
                                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                {label}
                              </p>
                              <div className="space-y-1">
                                {displayPoints.slice(0, 3).map((point: string, idx: number) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-[11px] text-gray-700 min-w-0">
                                    <svg className="w-3 h-3 text-primary/70 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="leading-snug line-clamp-2 flex-1 min-w-0">{point.trim()}{point.trim().endsWith('.') ? '' : '.'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Price Section - Compact */}
                      <div className="p-0">
                        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-2.5 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 overflow-hidden">
                          {/* Animated gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-transparent to-indigo-700/20 rounded-lg"></div>
                          {/* Content */}
                          <div className="relative z-10">
                            <p className="text-[9px] uppercase text-white/90 tracking-wide font-semibold mb-0.5 drop-shadow-sm">Starting From</p>
                            <p className="text-sm font-bold text-white drop-shadow-md leading-tight">
                              INR {(() => {
                                const price = pkg.Price_Range_INR
                                if (!price) return 'Contact for price'
                                // Remove existing formatting + non-digits (except maybe range separator if needed, but assuming simple price for now)
                                // If it contains non-digit chars that aren't commas, it might be a range or text.
                                // Simple approach: Try to parse as single number if possible.
                                const cleanPrice = String(price).replace(/,/g, '').trim()
                                const num = parseInt(cleanPrice)
                                if (!isNaN(num) && String(num) === cleanPrice) {
                                  return num.toLocaleString('en-IN')
                                }
                                return price
                              })()}
                            </p>
                          </div>
                          {/* Decorative corner accent */}
                          <div className="absolute top-0 right-0 w-10 h-10 bg-gradient-to-br from-purple-300/30 to-transparent rounded-bl-full"></div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Destination Information Section */}
      {destination && (
        <>
          {/* Quick Info Bar */}
          <section className="bg-gradient-to-r from-gray-50 to-white border-y border-gray-200">
            <div className="max-w-6xl mx-auto px-4 md:px-12 py-4 md:py-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                {destination.bestTimeToVisit && (
                  <div className="text-center p-2 md:p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <svg className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Best Time</p>
                    <p className="text-xs md:text-sm font-bold text-gray-900 leading-tight">{destination.bestTimeToVisit}</p>
                  </div>
                )}
                {destination.duration && (
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <svg className="w-6 h-6 mx-auto mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Duration</p>
                    <p className="text-sm font-bold text-gray-900">{destination.duration}</p>
                  </div>
                )}
                {destination.currency && (
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <svg className="w-6 h-6 mx-auto mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Currency</p>
                    <p className="text-sm font-bold text-gray-900">{destination.currency}</p>
                  </div>
                )}
                {destination.language && (
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <svg className="w-6 h-6 mx-auto mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Language</p>
                    <p className="text-sm font-bold text-gray-900">{destination.language}</p>
                  </div>
                )}
                {destination.rating && (
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <svg className="w-6 h-6 mx-auto mb-2 text-yellow-500 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Rating</p>
                    <p className="text-sm font-bold text-gray-900">{destination.rating}/5.0</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Highlights & Activities */}
          <section className="py-6 md:py-10 px-4 md:px-12 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Highlights */}
                {destination.highlights && destination.highlights.length > 0 && (
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Top Highlights
                    </h2>
                    <div className="space-y-3">
                      {destination.highlights.map((highlight: string, index: number) => (
                        <div key={index} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-primary/5 transition-colors">
                          <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                          <p className="text-sm md:text-base text-gray-700 leading-relaxed">{highlight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities */}
                {destination.activities && destination.activities.length > 0 && (
                  <div>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
                      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Things to Do
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                      {destination.activities.map((activity: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 md:p-3 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
                          <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-sm text-gray-700">{activity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Budget & Hotel Types */}
          <section className="py-6 md:py-10 px-4 md:px-12 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Budget Range */}
                {destination.budgetRange && Object.keys(destination.budgetRange).length > 0 && (
                  <div>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Budget Guide</h2>
                    <div className="space-y-3 md:space-y-4">
                      {destination.budgetRange.budget && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-900">Budget</h3>
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">Economical</span>
                          </div>
                          <p className="text-xl md:text-2xl font-bold text-primary">{destination.budgetRange.budget}</p>
                        </div>
                      )}
                      {destination.budgetRange.midRange && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-900">Mid-Range</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">Popular</span>
                          </div>
                          <p className="text-2xl font-bold text-primary">{destination.budgetRange.midRange}</p>
                        </div>
                      )}
                      {destination.budgetRange.luxury && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-900">Luxury</h3>
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">Premium</span>
                          </div>
                          <p className="text-2xl font-bold text-primary">{destination.budgetRange.luxury}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hotel Types */}
                {destination.hotelTypes && destination.hotelTypes.length > 0 && (
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Accommodation Options</h2>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <div className="space-y-3">
                        {destination.hotelTypes.map((hotelType: string, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <p className="text-gray-700 font-medium">{hotelType}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Quick Info Bar */}
      {/* <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-12 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Best Time to Visit</p>
              <p className="font-semibold text-gray-900">
                {destination?.bestTimeToVisit 
                  ? (destination.bestTimeToVisit.includes('(') 
                      ? destination.bestTimeToVisit.split('(')[0].trim() 
                      : destination.bestTimeToVisit)
                  : 'Year-round'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Recommended Duration</p>
              <p className="font-semibold text-gray-900">{destination?.duration || '5-7 days recommended'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Currency</p>
              <p className="font-semibold text-gray-900">{destination?.currency || 'Contact for details'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Language</p>
              <p className="font-semibold text-gray-900">{destination?.language || 'English'}</p>
            </div>
          </div>
        </div>
      </section> */}

      {/* Main Content - Commented Out */}
      {/* 
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Top Highlights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {destination.highlights.map((highlight: string, index: number) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{highlight}</h3>
                          <p className="text-sm text-gray-600">
                            A must-visit attraction in {destination.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Popular Activities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {destination.activities.map((activity: string, index: number) => (
                    <div
                      key={index}
                      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                    >
                      <p className="font-medium text-gray-900">{activity}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">About {destination.name}</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    {destination.description}
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    {destination.name} offers an incredible blend of natural beauty, rich culture, and unforgettable experiences. 
                    Whether you're seeking adventure, relaxation, or cultural immersion, this destination has something special 
                    for every traveler. From stunning landscapes to vibrant local traditions, your journey here will create 
                    memories that last a lifetime.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 text-white">
                <h3 className="text-2xl font-bold mb-4">Budget Ranges</h3>
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-sm opacity-90 mb-1">Budget</p>
                    <p className="text-xl font-bold">{destination.budgetRange.budget}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-sm opacity-90 mb-1">Mid-Range</p>
                    <p className="text-xl font-bold">{destination.budgetRange.midRange}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-sm opacity-90 mb-1">Luxury</p>
                    <p className="text-xl font-bold">{destination.budgetRange.luxury}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Hotel Types</h3>
                <div className="space-y-2">
                  {destination.hotelTypes.map((hotelType: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-gray-700"
                    >
                      <span className="text-primary">✓</span>
                      <span>{hotelType}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Link
                  href={`/ai-trip-planner?destination=${encodeURIComponent(destination?.name || destinationName)}`}
                  className="block w-full bg-primary text-white text-center px-6 py-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                >
                  Plan Your Trip with AI
                </Link>
                <Link
                  href="/destinations"
                  className="block w-full bg-white border-2 border-primary text-primary text-center px-6 py-4 rounded-lg font-semibold hover:bg-primary/10 transition-colors"
                >
                  Back to Destinations
                </Link>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>💡</span> Travel Tip
                </h3>
                <p className="text-sm text-gray-700">
                  The best time to visit {destination.name} is {destination.bestTimeToVisit}. 
                  Make sure to book your accommodations in advance, especially during peak season.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 md:px-12 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Suggested Itinerary
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {destination.highlights.slice(0, 4).map((highlight: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">Day {index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{highlight}</h3>
                    <p className="text-sm text-gray-600">
                      Explore this amazing attraction and immerse yourself in the local culture.
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href={`/ai-trip-planner?destination=${encodeURIComponent(destination.name)}`}
                className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              >
                Get Your Personalized Itinerary
              </Link>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* PLP Sections */}
      {destination && (
        <>
          {/* From Airport Cities Section */}
          {destination.airportCities && destination.airportCities.length > 0 && (
            <section className="py-12 px-4 md:px-12 bg-white border-t border-gray-100">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 md:mb-6">From Airport Cities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {destination.airportCities.map((city: any, index: number) => (
                    <Link
                      key={index}
                      href={city.url}
                      className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 hover:bg-primary/10 border border-gray-200 hover:border-primary rounded-lg text-center transition-all font-medium text-gray-900 hover:text-primary text-sm"
                    >
                      {city.cityName}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* From India Section */}
          {destination.fromIndiaCities && destination.fromIndiaCities.length > 0 && (
            <section className="py-12 px-4 md:px-12 bg-gray-50 border-t border-gray-100">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">From India</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {destination.fromIndiaCities.map((city: any, index: number) => (
                    <Link
                      key={index}
                      href={city.url}
                      className="px-4 py-3 bg-white hover:bg-primary/10 border border-gray-200 hover:border-primary rounded-lg text-center transition-all font-medium text-gray-900 hover:text-primary text-sm"
                    >
                      {city.cityName}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Travel Guides Section */}
          {destination.travelGuides && destination.travelGuides.length > 0 && (
            <section className="py-12 px-4 md:px-12 bg-white border-t border-gray-100">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Travel Guides</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {destination.travelGuides.map((guide: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-200 hover:border-primary/50 transition-all">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{guide.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{guide.description}</p>
                      {guide.url && (
                        <Link href={guide.url} className="inline-block mt-3 text-primary font-semibold hover:underline">
                          Read More →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* FAQ Section */}
          {destination.faqs && destination.faqs.length > 0 && (
            <section className="py-12 px-4 md:px-12 bg-gray-50 border-t border-gray-100">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {destination.faqs.map((faq: any, index: number) => (
                    <details key={index} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-primary/50 transition-all group">
                      <summary className="font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                        <span>{faq.question}</span>
                        <svg className="w-5 h-5 text-gray-400 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <p className="mt-3 text-gray-600 leading-relaxed">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <Footer />
    </main>
  )
}

