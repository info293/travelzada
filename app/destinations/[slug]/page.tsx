'use client'

import { use, useEffect, useState } from 'react'
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
  const resolvedParams = params instanceof Promise ? use(params) : params
  const destinationName = decodeURIComponent(resolvedParams.slug)
  const [destinationPackages, setDestinationPackages] = useState<DestinationPackage[]>([])
  const [loading, setLoading] = useState(true)
  
  const destination = travelData.destinations.find(
    (d: any) => d.name.toLowerCase() === destinationName.toLowerCase()
  )

  useEffect(() => {
    const fetchPackages = async () => {
      if (typeof window === 'undefined' || !db) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Normalize destination name for matching (handle "Bali" vs "bali")
        const normalizedDestination = destinationName.toLowerCase()
        
        // Fetch all packages from Firestore and filter client-side
        // (Firestore doesn't support case-insensitive queries)
        const packagesRef = collection(db, 'packages')
        const allPackagesSnapshot = await getDocs(packagesRef)
        const packagesData: DestinationPackage[] = []
        
        allPackagesSnapshot.forEach((doc) => {
          const data = doc.data() as DestinationPackage
          const pkgName = data.Destination_Name?.toLowerCase() || ''
          const pkgId = data.Destination_ID?.toLowerCase() || ''
          
          // Match if package name or Destination_ID contains destination or vice versa
          if (pkgName.includes(normalizedDestination) || 
              normalizedDestination.includes(pkgName) ||
              pkgName === normalizedDestination ||
              pkgId.includes(normalizedDestination) ||
              normalizedDestination.includes(pkgId)) {
            packagesData.push({ id: doc.id, ...data })
          }
        })
        
        setDestinationPackages(packagesData)
      } catch (error) {
        console.error('Error fetching packages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
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

  const getDestinationImage = (name: string) => {
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
    return imageMap[name] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80'
  }

  const imageUrl = getDestinationImage(destination.name)

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
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-6xl mx-auto w-full px-4 md:px-12 pb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold">
                {destination.country}
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {destination.name}
            </h1>
            <p className="text-xl text-white/90 max-w-3xl">
              {destination.description}
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
                  Featured {destination.name} Packages
                </h2>
                <p className="text-gray-600">
                  Curated itineraries crafted by experts for {destination.name}
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
                    href={`/destinations/${encodeURIComponent(destination.name)}/${packageId}`}
                    className="bg-white rounded-[5px] border border-gray-200 hover:border-primary/40 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
                  >
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
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{pkg.Destination_Name || 'Package'}</h3>
                        <p className="text-xs text-gray-500">{pkg.Duration || ''}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[13px] text-gray-600">
                        <div className="space-y-0.5">
                          <p>{pkg.Star_Category || 'Hotel'}</p>
                          <p>{pkg.Travel_Type || 'Travel'}</p>
                          <p>{pkg.Mood || 'Experience'}</p>
                        </div>
                        <div className="space-y-0.5">
                          {pkg.Inclusions?.split(',').slice(0, 3).map((inclusion: string, idx: number) => (
                            <p key={idx} className="text-primary">✓ {inclusion.trim()}</p>
                          ))}
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-[5px] p-3 text-sm">
                        <p className="text-xs text-gray-500 mb-1">
                          Flexible payment options available
                        </p>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[11px] uppercase text-gray-500 tracking-wide">Price Range</p>
                            <p className="text-2xl font-bold text-gray-900">{pkg.Price_Range_INR || 'Contact for price'}</p>
                          </div>
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
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-12 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Best Time to Visit</p>
              <p className="font-semibold text-gray-900">{destination.bestTimeToVisit.split('(')[0].trim()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Recommended Duration</p>
              <p className="font-semibold text-gray-900">{destination.duration}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Currency</p>
              <p className="font-semibold text-gray-900">{destination.currency}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Language</p>
              <p className="font-semibold text-gray-900">{destination.language}</p>
            </div>
          </div>
        </div>
      </section>

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
                  href={`/ai-planner?destination=${encodeURIComponent(destination.name)}`}
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

