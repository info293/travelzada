'use client'

import { useEffect, useState, useRef } from 'react'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

interface Destination {
    id: string
    name: string
    description: string
    image: string
    region?: string
    slug: string
}

interface DestinationRailProps {
    region: 'India' | 'International'
    title: string
    subtitle?: string
    tagLabel?: string
}

export default function DestinationRail({ region, title, subtitle, tagLabel }: DestinationRailProps) {
    const [destinations, setDestinations] = useState<Destination[]>([])
    const [loading, setLoading] = useState(true)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        const fetchDestinations = async () => {
            try {
                const destRef = collection(db, 'destinations')
                const q = query(destRef)
                const snapshot = await getDocs(q)
                const validDestinations: Destination[] = []
                snapshot.forEach(doc => {
                    const data = doc.data() as Destination
                    if (data.region === region) {
                        validDestinations.push({ ...data, id: doc.id })
                    }
                })
                setDestinations(validDestinations)
            } catch (error) {
                console.error('Error fetching destinations:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchDestinations()
    }, [region])

    // Auto-scroll functionality
    useEffect(() => {
        let intervalId: NodeJS.Timeout

        if (!isHovered && destinations.length > 0) {
            intervalId = setInterval(() => {
                if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current
                    const scrollAmount = 300 // Approx card width

                    // Check if we've reached the end
                    if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
                        // Reset to start smoothly
                        container.scrollTo({ left: 0, behavior: 'smooth' })
                    } else {
                        container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
                    }
                }
            }, 3000) // Scroll every 3 seconds
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [isHovered, destinations.length])

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

    if (loading) return null
    if (destinations.length === 0) return null

    return (
        <section className="py-12 md:py-16 px-4 md:px-12 bg-white group/section"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="max-w-7xl mx-auto relative">
                <div className="flex items-end justify-between mb-12 px-2">
                    <div className="max-w-4xl">
                        {tagLabel && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-orange-100 shadow-sm mb-6">
                                <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9]"></span>
                                <span className="text-xs uppercase tracking-[0.2em] text-orange-500 font-semibold">{tagLabel}</span>
                            </div>
                        )}
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 mb-4 leading-tight">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="hidden md:flex gap-4 mb-2">
                        <button
                            onClick={scrollLeft}
                            className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:border-black hover:text-white transition-all text-gray-900 shadow-sm bg-white"
                            aria-label="Scroll left"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={scrollRight}
                            className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:border-black hover:text-white transition-all text-gray-900 shadow-sm bg-white"
                            aria-label="Scroll right"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {destinations.map((destination) => (
                        <div
                            key={destination.id}
                            className="flex-shrink-0 w-[240px] md:w-[280px] lg:w-[300px] relative rounded-2xl overflow-hidden group shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 snap-center"
                        >
                            <div
                                className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                                style={{ backgroundImage: `url(${destination.image})` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            </div>
                            <div className="relative z-10 p-5 flex flex-col justify-end h-[320px] md:h-[350px] text-white">
                                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    <h3 className="text-xl md:text-2xl font-bold mb-1 leading-tight">{destination.name}</h3>
                                    <p className="text-xs md:text-sm text-white/80 line-clamp-2 md:line-clamp-3 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 h-0 group-hover:h-auto">
                                        {destination.description}
                                    </p>
                                    <Link
                                        href={`/destinations/${destination.slug}`}
                                        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white hover:text-primary-200 transition-colors mt-1"
                                    >
                                        Explore
                                        <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
