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
      <section className="relative h-[350px] md:h-[400px] overflow-hidden">
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
              router.back()
            }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white hover:bg-white text-gray-900 hover:text-primary transition-all shadow-xl hover:shadow-2xl backdrop-blur-sm cursor-pointer"
            aria-label="Go back"
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
                href={`/ai-planner?destination=${encodeURIComponent(destination.name)}`}
                className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
              >
                Need something custom?
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
                
                // Generate package ID from Destination_ID or use Firestore doc id
                const packageId = pkg.Destination_ID || pkg.id || 'package'
                
                return (
                  <Link
                    key={pkg.id || packageId}
                    href={`/destinations/${encodeURIComponent(destination?.slug || destination?.name || destinationName)}/${packageId}`}
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

                        {/* Inclusions - Compact */}
                        {pkg.Inclusions && (
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <p className="text-[10px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                              <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Inclusions
                            </p>
                            <div className="space-y-1">
                              {pkg.Inclusions.split(',').slice(0, 3).map((inclusion: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-gray-700 min-w-0">
                                  <svg className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="leading-snug truncate flex-1 min-w-0">{inclusion.trim()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Price Section - Compact */}
                      <div className="p-0">
                        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-2.5 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 overflow-hidden">
                          {/* Animated gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-transparent to-indigo-700/20 rounded-lg"></div>
                          {/* Content */}
                          <div className="relative z-10">
                            <p className="text-[9px] uppercase text-white/90 tracking-wide font-semibold mb-0.5 drop-shadow-sm">Starting From</p>
                            <p className="text-sm font-bold text-white drop-shadow-md leading-tight"> INR  {pkg.Price_Range_INR || 'Contact for price'}</p>
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
                  href={`/ai-planner?destination=${encodeURIComponent(destination?.name || destinationName)}`}
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
                href={`/ai-planner?destination=${encodeURIComponent(destination.name)}`}
                className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              >
                Get Your Personalized Itinerary
              </Link>
            </div>
          </div>
        </div>
      </section>
      */}

      <Footer />
    </main>
  )
}

