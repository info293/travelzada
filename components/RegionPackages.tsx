'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getDestinationSlugFromPackage, getPackageIdFromPackage } from '@/lib/destinationSlugMapper'

interface FirestorePackage {
    id?: string
    Destination_Name: string
    Duration: string
    Price_Range_INR: string | number
    Primary_Image_URL: string
    Star_Category?: string
    Travel_Type?: string
    Destination_ID?: string
}

interface RegionPackagesProps {
    region: 'India' | 'International';
    title?: string;
    subtitle?: string;
}

const INDIA_KEYWORDS = [
    'india', 'goa', 'kerala', 'rajasthan', 'himachal', 'kashmir', 'ladakh',
    'andaman', 'uttarakhand', 'manali', 'shimla', 'jaipur', 'udaipur',
    'delhi', 'agra', 'sikkim', 'darjeeling', 'rishikesh', 'munnar'
]

export default function RegionPackages({ region, title, subtitle }: RegionPackagesProps) {
    const [packages, setPackages] = useState<FirestorePackage[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPackages = async () => {
            if (typeof window === 'undefined' || !db) {
                setLoading(false)
                return
            }

            try {
                const packagesRef = collection(db, 'packages')
                const allPackagesSnapshot = await getDocs(packagesRef)
                const packagesData: FirestorePackage[] = []

                allPackagesSnapshot.forEach((doc) => {
                    const data = doc.data() as FirestorePackage
                    const destName = (data.Destination_Name || '').toLowerCase()
                    const destId = (data.Destination_ID || '').toLowerCase()

                    // Check if destination matches any India keyword
                    const isIndia = INDIA_KEYWORDS.some(keyword =>
                        destName.includes(keyword) || destId.includes(keyword)
                    )

                    if (region === 'India' && isIndia) {
                        packagesData.push({ id: doc.id, ...data })
                    } else if (region === 'International' && !isIndia) {
                        packagesData.push({ id: doc.id, ...data })
                    }
                })

                // Randomize
                const shuffled = packagesData.sort(() => 0.5 - Math.random())

                // Take up to 4
                setPackages(shuffled.slice(0, 4))
            } catch (error) {
                console.error('Error fetching region packages:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchPackages()
    }, [region])

    // Helper functions
    const getImageUrl = (imageUrl: string | undefined): string => {
        if (!imageUrl) {
            return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'
        }
        return imageUrl.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
    }

    const formatPrice = (priceRange: string | number | undefined): string => {
        if (!priceRange) return 'Contact for price'
        const priceStr = String(priceRange)
        if (priceStr.includes('₹') || priceStr.includes('INR')) return priceStr
        const match = priceStr.match(/(\d+)/)
        if (match) return `₹${parseInt(match[1]).toLocaleString('en-IN')}`
        return priceStr
    }

    // Using centralized mapper functions from lib/destinationSlugMapper

    if (loading) return null;
    if (packages.length === 0) return null;

    return (
        <section className="py-20 px-4 md:px-8 lg:px-12 relative overflow-hidden bg-white">
            <div className="max-w-7xl mx-auto text-center relative z-10">
                <div className="mb-12">
                    {title && <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 mb-3">{title}</h2>}
                    {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
                    {packages.map((pkg) => {
                        const imageUrl = getImageUrl(pkg.Primary_Image_URL)
                        const destinationSlug = getDestinationSlugFromPackage(pkg)
                        const packageId = getPackageIdFromPackage(pkg)
                        const price = formatPrice(pkg.Price_Range_INR)
                        const badge = pkg.Travel_Type || pkg.Star_Category

                        return (
                            <Link
                                key={pkg.id || packageId}
                                href={`/destinations/${encodeURIComponent(destinationSlug)}/${encodeURIComponent(packageId)}`}
                                className="bg-white border border-gray-100 rounded-xl md:rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group text-left"
                            >
                                <div className="relative h-32 sm:h-40 md:h-56 overflow-hidden">
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
                                        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-gray-900 text-[10px] md:text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                                            {badge}
                                        </span>
                                    )}
                                </div>
                                <div className="p-3 md:p-5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide">{pkg.Duration || 'Flexible'}</span>
                                    </div>
                                    <h3 className="text-sm md:text-lg font-semibold text-gray-900 mb-0.5 md:mb-1 line-clamp-1">{pkg.Destination_Name}</h3>
                                    <span className="text-xs md:text-sm font-medium text-purple-600 group-hover:text-purple-700 transition-colors">
                                        Explore Package →
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
