'use client'

import { useState } from 'react'
import DestinationCard from '@/components/DestinationCard'

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

interface DestinationsClientProps {
    initialDestinations: Destination[]
}

export default function DestinationsClient({ initialDestinations }: DestinationsClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCountry, setFilterCountry] = useState('all')

    const countrySet = new Set<string>(initialDestinations.map((d) => d.country))
    const countries: string[] = ['all', ...Array.from(countrySet)]

    // Filter destinations
    const filteredDestinations = initialDestinations.filter((destination) => {
        const matchesSearch = destination.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            destination.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            destination.country.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCountry = filterCountry === 'all' || destination.country === filterCountry
        return matchesSearch && matchesCountry
    })

    return (
        <>
            {/* Search and Filter Section */}
            <section className="py-4 px-4 md:px-12 bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search destinations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                            />
                        </div>

                        {/* Country Filter */}
                        <div className="md:w-64 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <select
                                value={filterCountry}
                                onChange={(e) => setFilterCountry(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white transition-all shadow-sm"
                            >
                                {countries.map((country) => (
                                    <option key={country} value={country}>
                                        {country === 'all' ? 'All Countries' : country}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Results Count */}
                    <div className="mt-4 text-sm text-gray-600">
                        Showing {filteredDestinations.length} of {initialDestinations.length} destinations
                    </div>
                </div>
            </section>

            {/* Destinations Grid */}
            <section className="py-8 md:py-16 px-4 md:px-12">
                <div className="max-w-6xl mx-auto">
                    {filteredDestinations.length > 0 ? (
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
        </>
    )
}
