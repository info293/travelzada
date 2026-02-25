import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DestinationsClient from './DestinationsClient'
import travelDatabase from '@/data/travel-database.json'

const travelData = travelDatabase as any

// Removed 'use client' and static firebase imports for SSR safety

export const metadata: Metadata = {
  title: 'Explore Destinations | Travelzada - Travel Packages Worldwide',
  description: 'Discover amazing travel destinations worldwide. Browse Bali, Thailand, Maldives, Europe and more. Find curated travel packages and itineraries.',
  alternates: {
    canonical: 'https://www.travelzada.com/destinations',
  },
  openGraph: {
    title: 'Explore Destinations | Travelzada',
    description: 'Discover amazing travel destinations worldwide with curated packages.',
    url: 'https://www.travelzada.com/destinations',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Explore Destinations | Travelzada',
    description: 'Discover amazing travel destinations worldwide with curated packages.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

interface Destination {
  id?: string
  name: string
  country: string
  description: string
  image: string
  slug: string
  featured?: boolean
  packageIds?: string[]
}

// Fetch destinations server-side
async function fetchDestinations(): Promise<Destination[]> {
  try {
    // Dynamic import to prevent SSR side-effects
    const { db } = await import('@/lib/firebase')
    const { collection, getDocs } = await import('firebase/firestore')

    if (!db) {
      // Fallback to JSON data if Firebase is not initialized
      return travelData.destinations.filter((d: any) =>
        d.name.toLowerCase() === 'bali'
      )
    }

    const destinationsRef = collection(db, 'destinations')
    const querySnapshot = await getDocs(destinationsRef)
    const destinationsData: Destination[] = []

    querySnapshot.forEach((doc) => {
      destinationsData.push({ id: doc.id, ...doc.data() } as Destination)
    })

    // If no destinations in Firestore, fallback to JSON
    if (destinationsData.length === 0) {
      return travelData.destinations.filter((d: any) =>
        d.name.toLowerCase() === 'bali'
      )
    }

    return destinationsData
  } catch (error) {
    console.error('Error fetching destinations:', error)
    // Fallback to JSON data
    return travelData.destinations.filter((d: any) =>
      d.name.toLowerCase() === 'bali'
    )
  }
}

export default async function DestinationsPage() {
  const destinations = await fetchDestinations()

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="py-8 md:py-16 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-0 mt-8">
            <Link
              href="/"
              className="inline-flex items-center text-gray-900 hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Explore Amazing Destinations
            </h1>
          </div>
        </div>
      </section>

      {/* Client Component for Interactive Features */}
      <DestinationsClient initialDestinations={destinations} />

      <Footer />
    </main>
  )
}

