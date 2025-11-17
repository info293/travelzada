'use client'

import { useState } from 'react'
import travelDatabase from '@/data/travel-database.json'

const travelData = travelDatabase as any

interface TripFormProps {
  formData: {
    destination: string
    travelDate: string
    days: string
    budget: string
    hotelType: string
  }
  setFormData: (data: any) => void
}

export default function TripForm({ formData, setFormData }: TripFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedItinerary, setGeneratedItinerary] = useState<string | null>(null)

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
    if (!formData.destination || !formData.travelDate || !formData.days || !formData.budget || !formData.hotelType) {
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

    // Determine package type based on budget
    let packageType = 'Mid-Range'
    let packagePrice = destination.budgetRange.midRange
    
    const budgetNum = parseInt(formData.budget.replace(/,/g, '')) || 50000
    
    if (budgetNum < 30000) {
      packageType = 'Budget'
      packagePrice = destination.budgetRange.budget
    } else if (budgetNum > 80000) {
      packageType = 'Luxury'
      packagePrice = destination.budgetRange.luxury
    }

    // Generate itinerary
    const days = parseInt(formData.days) || 5
    const itinerary = generateItinerary(destination, days, 'solo')

    const fullItinerary = `🎉 Your Personalized ${formData.destination} Package

📦 Package Type: ${packageType}
💰 Price: Starting from ${packagePrice}
📅 Duration: ${formData.days} days
📆 Travel Date: ${new Date(formData.travelDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
🏨 Accommodation: ${formData.hotelType}

📋 Your ${formData.days}-Day Itinerary:

${itinerary}

✨ What's Included:
• ${formData.hotelType} accommodation
• Breakfast included
• Airport transfers
• Local guide assistance
• Adventure activities

💡 Next Steps:
1. Review your itinerary above
2. Contact us to customize further
3. Book your package to secure your dates`

    setGeneratedItinerary(fullItinerary)
    setIsGenerating(false)
  }

  const destinations = travelData.destinations.map(d => d.name)
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
            {destinations.map((dest) => (
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

        {/* Budget */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Budget (₹)
          </label>
          <input
            type="text"
            value={formData.budget}
            onChange={(e) => handleChange('budget', e.target.value)}
            placeholder="e.g., 50,000"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-2">
            <input
              type="range"
              min="10000"
              max="500000"
              step="10000"
              value={formData.budget.replace(/,/g, '') || 50000}
              onChange={(e) => handleChange('budget', parseInt(e.target.value).toLocaleString('en-IN'))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>₹10,000</span>
              <span>₹5,00,000</span>
            </div>
          </div>
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
          disabled={isGenerating || !formData.destination || !formData.travelDate || !formData.days || !formData.budget || !formData.hotelType}
          className="w-full bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating Your Itinerary...' : 'GENERATE MY ITINERARY'}
        </button>

        {/* Generated Itinerary Display */}
        {generatedItinerary && (
          <div className="mt-8 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/20">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Your Personalized Itinerary</h3>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                {generatedItinerary}
              </pre>
            </div>
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedItinerary)
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

