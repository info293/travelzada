'use client'

import Link from 'next/link'
import { useState } from 'react'

interface DestinationCardProps {
  destination: {
    id?: string
    name: string
    country: string
    description: string
    image?: string
    slug?: string
    featured?: boolean
    packageIds?: string[]
    // Legacy fields (from JSON, optional)
    bestTimeToVisit?: string
    highlights?: string[]
    activities?: string[]
    budgetRange?: {
      budget: string
      midRange: string
      luxury: string
    }
    duration?: string
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

  // Parse duration to get days/nights format
  const parseDuration = (duration?: string): string => {
    if (!duration) return '5D/4N'
    const match = duration.match(/(\d+)/)
    if (match) {
      const days = parseInt(match[1])
      return `${days}D/${days - 1}N`
    }
    return '5D/4N'
  }

  // Extract price from budget range (e.g., "₹30,000 - ₹50,000" -> "₹30,000")
  const getStartingPrice = (budget?: string): string => {
    if (!budget) return 'Contact for price'
    const match = budget.match(/₹[\d,]+/)
    return match ? match[0] : budget.split('-')[0].trim()
  }

  // Generate a deterministic rating based on destination name
  const getRating = (name: string): string => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const rating = 4.5 + (Math.abs(hash) % 40) / 100
    return rating.toFixed(1)
  }
  
  const rating = getRating(destination.name)

  // Use image from Firestore if available, otherwise fallback to image map
  const imageUrl = destination.image || getDestinationImage(destination.name)
  const durationFormatted = parseDuration(destination.duration)
  const startingPrice = getStartingPrice(destination.budgetRange?.budget)
  
  // Use slug if available, otherwise use name
  const destinationSlug = destination.slug || destination.name.toLowerCase().replace(/\s+/g, '-')

  return (
    <Link
      href={`/destinations/${encodeURIComponent(destinationSlug)}`}
      className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 block"
    >
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
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
        
        {/* FEATURED Tag */}
        {(destination.featured !== false) && (
          <div className="absolute top-3 left-3 bg-primary text-white px-2.5 py-1 rounded-lg">
            <span className="text-xs font-semibold uppercase">Featured</span>
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 bg-[#1e1d2f]/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg">
          <span className="text-xs font-medium">⭐ {rating}</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 bg-white">
        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
          <span>📍</span>
          <span>{destination.name}, {destination.country}</span>
        </div>

        {/* Package Title */}
        <h3 className="text-base font-medium text-[#1e1d2f] mb-3 line-clamp-2">
          {destination.description || `${destination.name} Adventure Package`}
        </h3>

        {/* Price and Duration Row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Starting from</p>
            <p className="text-2xl font-semibold text-[#1e1d2f]">{startingPrice}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>🕐</span>
            <span>{durationFormatted}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

