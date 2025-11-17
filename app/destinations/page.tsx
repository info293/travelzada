'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DestinationCard from '@/components/DestinationCard'
import travelDatabase from '@/data/travel-database.json'

const travelData = travelDatabase as any

export default function DestinationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCountry, setFilterCountry] = useState('all')
  
  const allDestinations = travelData.destinations
  const countries = ['all', ...new Set(allDestinations.map((d: any) => d.country))]

  // Filter destinations
  const filteredDestinations = allDestinations.filter((destination: any) => {
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
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Explore Amazing Destinations
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover your next adventure with our hand-picked destinations. From tropical beaches to mountain peaks, find the perfect place for your dream vacation.
          </p>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 px-4 md:px-12 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* Country Filter */}
            <div className="md:w-64">
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            Showing {filteredDestinations.length} of {allDestinations.length} destinations
          </div>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          {filteredDestinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDestinations.map((destination: any, index: number) => (
                <DestinationCard key={index} destination={destination} />
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

