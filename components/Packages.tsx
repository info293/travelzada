'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface FirestorePackage {
  id?: string
  Destination_Name: string
  Duration: string
  Price_Range_INR: string
  Primary_Image_URL: string
  Star_Category?: string
  Travel_Type?: string
  Destination_ID?: string
}

export default function Packages() {
  const [packages, setPackages] = useState<FirestorePackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPackages = async () => {
      if (typeof window === 'undefined' || !db) {
        setLoading(false)
        return
      }

      try {
        // Fetch first 4 packages from Firestore, ordered by creation date
        let q
        try {
          q = query(
            collection(db, 'packages'),
            orderBy('createdAt', 'desc'),
            limit(4)
          )
        } catch (error) {
          // If orderBy fails, just fetch without ordering
          console.log('OrderBy failed, fetching without order:', error)
          q = query(collection(db, 'packages'), limit(4))
        }

        const querySnapshot = await getDocs(q)
        const packagesData: FirestorePackage[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data() as FirestorePackage
          packagesData.push({ id: doc.id, ...data })
        })

        // If we got less than 4, try to get more without orderBy
        if (packagesData.length < 4) {
          const allSnapshot = await getDocs(collection(db, 'packages'))
          const allPackages: FirestorePackage[] = []
          allSnapshot.forEach((doc) => {
            const data = doc.data() as FirestorePackage
            if (!packagesData.find(p => p.id === doc.id)) {
              allPackages.push({ id: doc.id, ...data })
            }
          })
          // Add more packages to reach 4
          packagesData.push(...allPackages.slice(0, 4 - packagesData.length))
        }

        setPackages(packagesData.slice(0, 4))
      } catch (error) {
        console.error('Error fetching packages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [])

  // Helper function to extract image URL from markdown format
  const getImageUrl = (imageUrl: string | undefined): string => {
    if (!imageUrl) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'
    }
    // Handle markdown format: [alt text](url)
    return imageUrl.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
  }

  // Helper function to format price
  const formatPrice = (priceRange: string | undefined): string => {
    if (!priceRange) return 'Contact for price'
    // If it's already formatted, return as is
    if (priceRange.includes('₹') || priceRange.includes('INR')) {
      return priceRange
    }
    // Otherwise, try to extract first number and format
    const match = priceRange.match(/(\d+)/)
    if (match) {
      return `₹${parseInt(match[1]).toLocaleString('en-IN')}`
    }
    return priceRange
  }

  // Helper function to get badge
  const getBadge = (pkg: FirestorePackage): string | undefined => {
    if (pkg.Star_Category) {
      return pkg.Star_Category
    }
    if (pkg.Travel_Type) {
      return pkg.Travel_Type
    }
    return undefined
  }

  // Helper function to get destination name for URL
  const getDestinationSlug = (destinationName: string): string => {
    return destinationName.split(',')[0].trim().toLowerCase()
  }

  // Helper function to get package ID for URL
  const getPackageId = (pkg: FirestorePackage): string => {
    return pkg.Destination_ID || pkg.id || 'package'
  }

  if (loading) {
    return (
      <section className="py-24 px-4 md:px-8 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-[#fef6f1] to-white"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading packages...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (packages.length === 0) {
    return null // Don't show section if no packages
  }

  return (
    <section className="py-24 px-4 md:px-8 lg:px-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#fef6f1] to-white"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-pink-200/30 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-orange-100 shadow-sm mb-4">
          <span className="w-3.5 h-3.5 inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45"></span>
          <span className="text-xs uppercase tracking-[0.3em] text-orange-500 font-semibold">Featured journeys</span>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 mb-4">
          Premium capsules, ready to book
        </h2>
        <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto">
          Balanced itineraries curated for design lovers, slow travelers, and celebration seekers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {packages.map((pkg) => {
            const imageUrl = getImageUrl(pkg.Primary_Image_URL)
            const destinationSlug = getDestinationSlug(pkg.Destination_Name)
            const packageId = getPackageId(pkg)
            const badge = getBadge(pkg)
            const price = formatPrice(pkg.Price_Range_INR)

            return (
              <Link
                key={pkg.id || packageId}
                href={`/destinations/${encodeURIComponent(destinationSlug)}/${encodeURIComponent(packageId)}`}
                className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={pkg.Destination_Name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  {badge && (
                    <span className="absolute top-3 left-3 bg-white/90 text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                      {badge}
                    </span>
                  )}
                </div>
                <div className="p-5 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">{pkg.Duration || 'Custom'}</span>
                    <span className="text-sm font-semibold text-orange-500">{price}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">{pkg.Destination_Name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{destinationSlug}</p>
                  <span className="text-orange-500 font-semibold text-sm hover:underline">
                    View details →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
