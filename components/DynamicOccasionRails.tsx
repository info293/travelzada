'use client'

import { useEffect, useState, useRef } from 'react'
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
    Occasion?: string
}

const OccasionSection = ({ occasion, packages, index }: { occasion: string, packages: FirestorePackage[], index: number }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)

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

        // remove commas to ensure regex matches the full number
        // also handle ranges by taking the first part
        const cleanStr = priceStr.split('-')[0].replace(/,/g, '')
        const match = cleanStr.match(/(\d+)/)

        if (match) {
            return `₹${parseInt(match[1]).toLocaleString('en-IN')}`
        }
        return priceStr
    }

    // Using centralized mapper functions from lib/destinationSlugMapper

    // Auto-scroll functionality
    useEffect(() => {
        let intervalId: NodeJS.Timeout

        if (!isHovered && packages.length > 0) {
            intervalId = setInterval(() => {
                if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current
                    const scrollAmount = 300 // Approx card width

                    if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
                        container.scrollTo({ left: 0, behavior: 'smooth' })
                    } else {
                        container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
                    }
                }
            }, 4000) // Slower scroll for packages
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [isHovered, packages.length])

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' })
        }
    }

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' })
        }
    }

    const isAlternate = index % 2 !== 0
    const bgClass = isAlternate ? 'bg-gray-50/50' : 'bg-white'

    return (
        <section
            className={`py-16 px-4 md:px-8 lg:px-12 relative overflow-hidden group/section ${bgClass}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex items-end justify-between mb-8 px-2">
                    <div className="max-w-3xl">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
                            Curated Collection
                        </span>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">
                            {occasion} Specials
                        </h2>
                        <p className="text-sm md:text-base text-gray-600">
                            Explore our exclusive {occasion.toLowerCase()} packages
                        </p>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="hidden md:flex gap-3">
                        <button
                            onClick={scrollLeft}
                            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:border-black hover:text-white transition-all text-gray-900 shadow-sm bg-white"
                            aria-label="Scroll left"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={scrollRight}
                            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:border-black hover:text-white transition-all text-gray-900 shadow-sm bg-white"
                            aria-label="Scroll right"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-4 md:gap-6 pb-6 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {packages.map((pkg) => {
                        const imageUrl = getImageUrl(pkg.Primary_Image_URL)
                        const destinationSlug = getDestinationSlugFromPackage(pkg)
                        const packageId = getPackageIdFromPackage(pkg)
                        const badge = pkg.Travel_Type || pkg.Star_Category

                        return (
                            <Link
                                key={pkg.id || packageId}
                                href={`/destinations/${encodeURIComponent(destinationSlug)}/${encodeURIComponent(packageId)}`}
                                className="flex-shrink-0 w-[260px] md:w-[300px] bg-white border border-gray-100 rounded-xl md:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group snap-center"
                            >
                                <div className="relative h-40 md:h-48 overflow-hidden">
                                    <img
                                        src={imageUrl}
                                        alt={pkg.Destination_Name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                                    {badge && (
                                        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-gray-900 text-[10px] md:text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                                            {badge}
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 md:p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide font-medium">{pkg.Duration || 'Flexible'}</span>
                                    </div>
                                    <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-primary transition-colors">{pkg.Destination_Name}</h3>
                                    <div className="flex items-center justify-between mt-4 border-t border-gray-100 pt-3">
                                        <span className="text-xs font-medium text-gray-500">From {formatPrice(pkg.Price_Range_INR)}</span>
                                        <span className="text-xs md:text-sm font-semibold text-primary group-hover:underline">
                                            View Details
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

export default function DynamicOccasionRails() {
    const [occasionGroups, setOccasionGroups] = useState<Record<string, FirestorePackage[]>>({})
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
                const groups: Record<string, FirestorePackage[]> = {}

                allPackagesSnapshot.forEach((doc) => {
                    const data = doc.data() as FirestorePackage
                    const pkg = { id: doc.id, ...data }

                    if (data.Occasion) {
                        const occasions = data.Occasion.split(',').map(o => o.trim())
                        occasions.forEach(occ => {
                            if (!occ) return
                            const normalizedOccasion = occ.charAt(0).toUpperCase() + occ.slice(1).toLowerCase()
                            if (!groups[normalizedOccasion]) {
                                groups[normalizedOccasion] = []
                            }
                            // Check for duplicates
                            if (!groups[normalizedOccasion].some(p => p.id === pkg.id)) {
                                groups[normalizedOccasion].push(pkg)
                            }
                        })
                    }
                })

                setOccasionGroups(groups)
            } catch (error) {
                console.error('Error fetching occasion packages:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchPackages()
    }, [])

    if (loading) return null;

    const occasions = Object.keys(occasionGroups).sort()

    if (occasions.length === 0) return null;

    return (
        <>
            {occasions.map((occasion, index) => (
                <OccasionSection
                    key={occasion}
                    occasion={occasion}
                    packages={occasionGroups[occasion]}
                    index={index}
                />
            ))}
        </>
    )
}
