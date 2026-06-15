'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
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

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'

export default function OccasionSectionClient({
    occasion,
    packages,
    index,
}: {
    occasion: string
    packages: FirestorePackage[]
    index: number
}) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)

    const getImageUrl = (url: string | undefined) =>
        url ? url.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim() : FALLBACK_IMAGE

    const formatPrice = (priceRange: string | number | undefined): string => {
        if (!priceRange) return 'Contact us'
        const clean = String(priceRange).split('-')[0].replace(/,/g, '')
        const match = clean.match(/(\d+)/)
        return match ? `₹${parseInt(match[1]).toLocaleString('en-IN')}` : String(priceRange)
    }

    useEffect(() => {
        let id: NodeJS.Timeout
        if (!isHovered && packages.length > 0) {
            id = setInterval(() => {
                const c = scrollContainerRef.current
                if (!c) return
                if (c.scrollLeft + c.clientWidth >= c.scrollWidth - 10) {
                    c.scrollTo({ left: 0, behavior: 'smooth' })
                } else {
                    c.scrollBy({ left: 300, behavior: 'smooth' })
                }
            }, 4000)
        }
        return () => { if (id) clearInterval(id) }
    }, [isHovered, packages.length])

    const scroll = (dir: 'left' | 'right') => {
        scrollContainerRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
    }

    const bgClass = index % 2 !== 0 ? 'bg-gray-50/60' : 'bg-white'

    return (
        <section
            className={`py-14 px-4 md:px-8 lg:px-12 relative overflow-hidden ${bgClass}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="max-w-7xl mx-auto">

                {/* Section header */}
                <div className="flex items-end justify-between mb-8 px-1">
                    <div>
                        <p className="font-serif italic text-primary text-base mb-1">Curated Collection</p>
                        <h2 className="text-2xl md:text-3xl font-bold text-ink leading-tight">
                            {occasion} Specials
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Explore our exclusive {occasion.toLowerCase()} packages
                        </p>
                    </div>

                    {/* Nav arrows */}
                    {packages.length > 3 && (
                        <div className="hidden md:flex gap-2 mb-1">
                            <button
                                onClick={() => scroll('left')}
                                className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-all shadow-sm"
                                aria-label="Previous"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-all shadow-sm"
                                aria-label="Next"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Cards */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                                className="flex-shrink-0 w-[255px] md:w-[275px] h-[330px] rounded-2xl overflow-hidden relative group shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 snap-center block"
                            >
                                {/* Full-bleed image */}
                                <img
                                    src={imageUrl}
                                    alt={pkg.Destination_Name}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE }}
                                />

                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                                {/* Top badges */}
                                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                                    {badge && (
                                        <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/25 leading-none">
                                            {badge}
                                        </span>
                                    )}
                                    {pkg.Duration && (
                                        <span className="ml-auto bg-black/30 backdrop-blur-md text-white/90 text-[10px] font-medium px-2.5 py-1 rounded-full leading-none whitespace-nowrap">
                                            {pkg.Duration}
                                        </span>
                                    )}
                                </div>

                                {/* Bottom info */}
                                <div className="absolute inset-x-0 bottom-0 p-4">
                                    {/* Occasion pill */}
                                    <span className="inline-block bg-primary/80 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2">
                                        {occasion}
                                    </span>

                                    {/* Name */}
                                    <h3 className="text-white font-bold text-base leading-tight mb-3 line-clamp-2 group-hover:text-purple-200 transition-colors">
                                        {pkg.Destination_Name}
                                    </h3>

                                    {/* Price + CTA */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white text-[9px] uppercase tracking-widest font-medium">Starting from</p>
                                            <p className="text-white font-bold text-sm leading-tight">{formatPrice(pkg.Price_Range_INR)}</p>
                                        </div>
                                        <span className="bg-white text-primary text-[11px] font-bold px-3.5 py-1.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors shadow-md whitespace-nowrap">
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
