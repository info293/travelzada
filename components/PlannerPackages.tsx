'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { travelPackages } from '@/data/package-data'

interface FirestorePackage {
  id: string
  Destination_Name: string
  Duration?: string
  Price_Range_INR?: string
  Primary_Image_URL?: string
  Star_Category?: string
  Travel_Type?: string
  Destination_ID?: string
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeImage = (image?: string) => {
  if (!image) return FALLBACK_IMAGE
  const markdownMatch = image.match(/\((https?:\/\/[^)]+)\)/)
  if (markdownMatch) return markdownMatch[1]
  return image
}

export default function PlannerPackages() {
  const [firestorePackages, setFirestorePackages] = useState<FirestorePackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPackages = async () => {
      if (typeof window === 'undefined' || !db) {
        setLoading(false)
        return
      }

      try {
        const packagesRef = collection(db, 'packages')
        const snapshot = await getDocs(packagesRef)
        const docs: FirestorePackage[] = []

        snapshot.forEach((doc) => {
          const data = doc.data() as FirestorePackage
          docs.push({
            ...data,
            id: doc.id || data.id,
          })
        })

        // Shuffle to keep the section fresh, then take 4
        for (let i = docs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[docs[i], docs[j]] = [docs[j], docs[i]]
        }

        setFirestorePackages(docs.slice(0, 4))
      } catch (error) {
        console.error('Planner packages fetch failed:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [])

  const fallbackPackages = useMemo(() => {
    const shuffled = [...travelPackages]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, 4)
  }, [])

  const displayPackages =
    !loading && firestorePackages.length > 0 ? firestorePackages : fallbackPackages

  const isFirestoreData = !loading && firestorePackages.length > 0

  if (loading && firestorePackages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#fef6f1] to-white"></div>
      <div className="absolute top-0 left-0 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-[24rem] h-[24rem] bg-pink-200/30 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {displayPackages.map((pkg, index) => {
            const isTravelPackage = 'title' in pkg
            const title = isTravelPackage ? pkg.title : pkg.Destination_Name
            const duration = isTravelPackage ? pkg.duration : pkg.Duration || 'Flexible stay'
            const price = isTravelPackage ? pkg.pricePerPerson : pkg.Price_Range_INR || 'Price on request'
            const badge = isTravelPackage ? pkg.badge || pkg.type : pkg.Star_Category || pkg.Travel_Type
            const image = isTravelPackage
              ? pkg.image || FALLBACK_IMAGE
              : normalizeImage(pkg.Primary_Image_URL)
            const destination = isTravelPackage ? pkg.destination : pkg.Destination_Name
            const destinationSlug = slugify(destination || '')
            const safeDestinationSlug = destinationSlug || 'travel'
            const packageIdentifier =
              !isTravelPackage && (pkg.Destination_ID || pkg.id || `pkg-${index}`)

            const href = packageIdentifier
              ? `/destinations/${encodeURIComponent(safeDestinationSlug)}/${encodeURIComponent(packageIdentifier)}`
              : `/destinations/${encodeURIComponent(safeDestinationSlug)}`

            return (
              <Link
                key={pkg.id || `pkg-${index}`}
                href={href}
                className="bg-white/90 backdrop-blur-xl border border-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 group"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={image || FALLBACK_IMAGE}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = FALLBACK_IMAGE
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  {badge && (
                    <span className="absolute top-3 left-3 bg-white/90 text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                      {badge}
                    </span>
                  )}
                </div>
                <div className="p-4 text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-gray-500 uppercase tracking-wide">{duration}</span>
                    {/* <span className="text-xs font-semibold text-orange-500">{price}</span> */}
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">{title}</h4>
                  <p className="text-xs text-gray-600 mb-3 capitalize">
                    {slugify(destination).replace(/-/g, ' ')}
                  </p>
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-semibold text-xs hover:underline">
                    View details →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

