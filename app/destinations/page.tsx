'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DestinationCard from '@/components/DestinationCard'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import travelDatabase from '@/data/travel-database.json'

const travelData = travelDatabase as any

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

export default function DestinationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCountry, setFilterCountry] = useState('all')
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDestinations = async () => {
      if (typeof window === 'undefined' || !db) {
        // Fallback to JSON data
        const allDestinations = travelData.destinations.filter((d: any) => 
          d.name.toLowerCase() === 'bali'
        )
        setDestinations(allDestinations)
        setLoading(false)
        return
      }

      try {
        const destinationsRef = collection(db, 'destinations')
        const querySnapshot = await getDocs(destinationsRef)
        const destinationsData: Destination[] = []
        
        querySnapshot.forEach((doc) => {
          destinationsData.push({ id: doc.id, ...doc.data() } as Destination)
        })
        
        // If no destinations in Firestore, fallback to JSON
        if (destinationsData.length === 0) {
          const allDestinations = travelData.destinations.filter((d: any) => 
            d.name.toLowerCase() === 'bali'
          )
          setDestinations(allDestinations)
        } else {
          setDestinations(destinationsData)
        }
      } catch (error) {
        console.error('Error fetching destinations:', error)
        // Fallback to JSON data
        const allDestinations = travelData.destinations.filter((d: any) => 
          d.name.toLowerCase() === 'bali'
        )
        setDestinations(allDestinations)
      } finally {
        setLoading(false)
      }
    }

    fetchDestinations()
  }, [])

  const countrySet = new Set<string>(destinations.map((d) => d.country))
  const countries: string[] = ['all', ...Array.from(countrySet)]

  // Filter destinations
  const filteredDestinations = destinations.filter((destination) => {
    const matchesSearch = destination.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         destination.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         destination.country.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCountry = filterCountry === 'all' || destination.country === filterCountry
    return matchesSearch && matchesCountry
  })

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
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

      {/* Search and Filter Section */}
      <section className="py-4 px-4 md:px-12 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* Country Filter */}
            <div className="md:w-64">
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country === 'all' ? 'All Countries' : country}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredDestinations.length} of {destinations.length} destinations
          </div>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading destinations...</p>
            </div>
          ) : filteredDestinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDestinations.map((destination, index) => (
                <DestinationCard key={destination.id || index} destination={destination} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No destinations found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}

