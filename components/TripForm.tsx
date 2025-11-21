'use client'

import { useState } from 'react'
import Link from 'next/link'
import travelDatabase from '@/data/travel-database.json'
import { travelPackages } from '@/data/package-data'

const travelData = travelDatabase as any

interface TripFormProps {
  formData: {
    destination: string
    travelDate: string
    days: string
    hotelType: string
  }
  setFormData: (data: any) => void
}

interface ItineraryData {
  itinerary: string
  destination: string
  days: string
  hotelType: string
  travelDate: string
}

export default function TripForm({ formData, setFormData }: TripFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedItinerary, setGeneratedItinerary] = useState<ItineraryData | null>(null)

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
    setGeneratedItinerary(null) // Clear previous itinerary when form changes
  }

  const generateItinerary = (destination: any, days: number, travelType: string = 'solo'): string => {
    const highlights = destination.highlights.slice(0, days)
    const activities = destination.activities
    
    let itinerary = ''
    for (let i = 0; i < days; i++) {
      const day = i + 1
      const highlight = highlights[i] || destination.highlights[0]
      
      if (day === 1) {
        itinerary += `Day ${day}: Arrival & ${highlight}\n   • Check-in and relax\n   • Explore local area\n   • ${travelType === 'couple' ? 'Romantic dinner' : 'Local cuisine experience'}\n\n`
      } else if (day === days) {
        itinerary += `Day ${day}: ${highlight} & Departure\n   • Last-minute shopping\n   • Check-out and airport transfer\n\n`
      } else {
        itinerary += `Day ${day}: ${highlight}\n   • ${activities[Math.floor(Math.random() * activities.length)]}\n   • ${travelType === 'family' ? 'Family-friendly activity' : 'Cultural experience'}\n\n`
      }
    }
    
    return itinerary
  }

  const handleGenerate = async () => {
    if (!formData.destination || !formData.travelDate || !formData.days || !formData.hotelType) {
      alert('Please fill in all fields')
      return
    }

    setIsGenerating(true)
    
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    const destination = travelData.destinations.find((d: any) => d.name === formData.destination)
    if (!destination) {
      alert('Destination not found')
      setIsGenerating(false)
      return
    }

    // Determine package type based on hotel type
    let packageType = 'Mid-Range'
    let packagePrice = destination.budgetRange.midRange
    
    if (formData.hotelType === 'Budget' || formData.hotelType === '3-Star') {
      packageType = 'Budget'
      packagePrice = destination.budgetRange.budget
    } else if (formData.hotelType === 'Luxury' || formData.hotelType === '5-Star') {
      packageType = 'Luxury'
      packagePrice = destination.budgetRange.luxury
    }

    // Generate itinerary
    const days = parseInt(formData.days) || 5
    const itinerary = generateItinerary(destination, days, 'solo')

    const itineraryData: ItineraryData = {
      itinerary: itinerary,
      destination: formData.destination,
      days: formData.days,
      hotelType: formData.hotelType,
      travelDate: formData.travelDate
    }

    setGeneratedItinerary(itineraryData)
    setIsGenerating(false)
  }

  // Get matching packages for the destination
  const matchingPackages = generatedItinerary
    ? travelPackages.filter(
        (pkg) => pkg.destination.toLowerCase() === generatedItinerary.destination.toLowerCase()
      )
    : []

  const destinations = travelData.destinations.map((d: { name: string }) => d.name)
  const hotelTypes = ['Budget', 'Mid-Range', 'Luxury', 'Boutique']

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Trip Details</h2>
      
      <div className="space-y-6">
        {/* Destination */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Destination
          </label>
          <select
            value={formData.destination}
            onChange={(e) => handleChange('destination', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a destination</option>
            {destinations.map((dest: string) => (
              <option key={dest} value={dest}>
                {dest}
              </option>
            ))}
          </select>
        </div>

        {/* Travel Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Travel Date
          </label>
          <input
            type="date"
            value={formData.travelDate}
            onChange={(e) => handleChange('travelDate', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Days */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Number of Days
          </label>
          <input
            type="number"
            min="1"
            value={formData.days}
            onChange={(e) => handleChange('days', e.target.value)}
            placeholder="e.g., 5"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>


        {/* Hotel Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Hotel Type
          </label>
          <select
            value={formData.hotelType}
            onChange={(e) => handleChange('hotelType', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select hotel type</option>
            {hotelTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !formData.destination || !formData.travelDate || !formData.days || !formData.hotelType}
          className="w-full bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating Your Itinerary...' : 'GENERATE MY ITINERARY'}
        </button>

        {/* Generated Itinerary Display */}
        {generatedItinerary && (
          <div className="mt-8 space-y-6">
            <div className="bg-gray-100 text-gray-800 rounded-2xl px-4 py-3 mb-3">
              <p className="whitespace-pre-line">
                🎉 Perfect! I've created your personalized {generatedItinerary.days}-day itinerary for {generatedItinerary.destination}!
                {'\n\n'}Here's your complete travel plan:
              </p>
            </div>

            {/* Package Cards */}
            {matchingPackages.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="relative mb-4">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-semibold px-3 py-0.5 rounded-b-full shadow">
                    {matchingPackages.length > 2 ? `${matchingPackages.length - 2} More Options Available` : 'Available Packages'}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Recommended Packages</p>
                    <p className="text-xs text-gray-500">
                      Based on your trip to {generatedItinerary.destination}
                    </p>
                  </div>
                  <Link
                    href={`/destinations/${encodeURIComponent(generatedItinerary.destination)}`}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchingPackages.slice(0, 2).map((pkg) => (
                    <Link
                      key={pkg.id}
                      href={`/destinations/${encodeURIComponent(pkg.destination)}/${pkg.id}`}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
                    >
                      {/* Image Section */}
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={pkg.image}
                          alt={pkg.title}
                          className="w-full h-full object-cover"
                        />
                        {pkg.badge && (
                          <span className="absolute top-3 left-3 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                            {pkg.badge}
                          </span>
                        )}
                        {pkg.type && (
                          <span className="absolute top-3 right-3 bg-white text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                            {pkg.type}
                          </span>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold text-gray-900 flex-1">{pkg.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{pkg.nightsSummary}</p>
                        
                        {/* Inclusions */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                            <span>{pkg.hotelLevel}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                            <span>Visa</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                            <span>{pkg.activitiesCount} Activities</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                            <span>{pkg.meals}</span>
                          </div>
                          {pkg.perks && pkg.perks.length > 0 && (
                            <>
                              {pkg.perks.slice(0, 3).map((perk, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-green-600">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>{perk}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>

                        {/* Pricing Section */}
                        <div className="border-t border-gray-200 pt-3 mt-3">
                          {pkg.paymentNote && (
                            <p className="text-xs text-gray-600 mb-2">{pkg.paymentNote}</p>
                          )}
                          <div className="flex items-baseline justify-between">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">{pkg.pricePerPerson} /Person</p>
                              <p className="text-sm text-gray-600 mt-1">Total Price {pkg.totalPrice}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* Itinerary Card */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {generatedItinerary.destination} Itinerary
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📅 {generatedItinerary.days} Days</span>
                  <span>🏨 {generatedItinerary.hotelType}</span>
                  <span>📆 {new Date(generatedItinerary.travelDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {generatedItinerary.itinerary.split('\n\n').map((day, idx) => {
                    if (!day.trim()) return null
                    const lines = day.split('\n')
                    const dayTitle = lines[0]
                    const details = lines.slice(1)
                    return (
                      <div key={idx} className="border-l-4 border-primary pl-4">
                        <h4 className="font-bold text-gray-900 mb-2">{dayTitle}</h4>
                        <ul className="space-y-1">
                          {details.map((detail, detailIdx) => (
                            <li key={detailIdx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-primary mt-1.5">•</span>
                              <span>{detail.replace('   • ', '')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3">✨ What's Included:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {generatedItinerary.hotelType} accommodation
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Breakfast included
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Airport transfers
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Local guide assistance
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Adventure activities
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => {
                  const text = `🎉 Your Personalized ${generatedItinerary.destination} Itinerary\n\n${generatedItinerary.itinerary}\n\n✨ What's Included:\n• ${generatedItinerary.hotelType} accommodation\n• Breakfast included\n• Airport transfers\n• Local guide assistance\n• Adventure activities`
                  navigator.clipboard.writeText(text)
                  alert('Itinerary copied to clipboard!')
                }}
                className="flex-1 bg-white text-primary border-2 border-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary/10 transition-colors"
              >
                Copy Itinerary
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

