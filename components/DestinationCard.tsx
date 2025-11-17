'use client'

import Link from 'next/link'
import { useState } from 'react'

interface DestinationCardProps {
  destination: {
    name: string
    country: string
    description: string
    bestTimeToVisit: string
    highlights: string[]
    activities: string[]
    budgetRange: {
      budget: string
      midRange: string
      luxury: string
    }
    duration: string
  }
}

export default function DestinationCard({ destination }: DestinationCardProps) {
  const [imageError, setImageError] = useState(false)
  
  // Get destination-specific images
  const getDestinationImage = (name: string) => {
    const imageMap: { [key: string]: string } = {
      'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',
      'Goa': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
      'Kerala': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&q=80',
      'Rajasthan': 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e?w=600&q=80',
      'Manali': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
      'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80',
      'Thailand': 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80',
      'Maldives': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    }
    return imageMap[name] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80'
  }

  const imageUrl = getDestinationImage(destination.name)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
      {/* Image */}
      <div className="relative h-64 overflow-hidden">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={destination.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <span className="text-6xl">🌴</span>
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-sm font-semibold text-primary">{destination.country}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{destination.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{destination.description}</p>
        
        {/* Highlights */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Highlights</p>
          <div className="flex flex-wrap gap-2">
            {destination.highlights.slice(0, 3).map((highlight, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Best Time</p>
            <p className="font-semibold text-gray-800">{destination.bestTimeToVisit.split('(')[0].trim()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Duration</p>
            <p className="font-semibold text-gray-800">{destination.duration}</p>
          </div>
        </div>

        {/* Budget Range */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 mb-2">Starting From</p>
          <p className="text-lg font-bold text-primary">{destination.budgetRange.budget}</p>
        </div>

        {/* Activities Preview */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Popular Activities</p>
          <div className="flex flex-wrap gap-1">
            {destination.activities.slice(0, 3).map((activity, index) => (
              <span
                key={index}
                className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
              >
                {activity}
              </span>
            ))}
            {destination.activities.length > 3 && (
              <span className="text-xs text-gray-500">+{destination.activities.length - 3} more</span>
            )}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2">
          <Link
            href={`/ai-planner?destination=${encodeURIComponent(destination.name)}`}
            className="flex-1 bg-primary text-white text-center px-4 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Plan with AI
          </Link>
          <Link
            href={`/destinations/${encodeURIComponent(destination.name)}`}
            className="px-4 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors text-center"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}

