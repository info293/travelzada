'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

interface Destination {
    id: string
    name: string
    description: string
    image: string
    region?: string
    slug: string
}

interface DestinationRailClientProps {
    title: string
    subtitle?: string
    tagLabel?: string
    destinations: Destination[]
}

// Stagger offsets (px) and heights (px) cycle through for visual rhythm
const staggerMt  = [0, 28, 10, 36, 6, 22, 0, 28, 10, 36]
const imgHeights = [215, 240, 185, 225, 200, 185, 240, 210, 225, 195]

export default function DestinationRailClient({ title, subtitle, tagLabel, destinations }: DestinationRailClientProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        let intervalId: NodeJS.Timeout

        if (!isHovered && destinations.length > 0) {
            intervalId = setInterval(() => {
                if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current
                    if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
                        container.scrollTo({ left: 0, behavior: 'smooth' })
                    } else {
                        container.scrollBy({ left: 180, behavior: 'smooth' })
                    }
                }
            }, 3000)
        }

        return () => { if (intervalId) clearInterval(intervalId) }
    }, [isHovered, destinations.length])

    if (!destinations || destinations.length === 0) return null

    // Card width scales up when there are fewer destinations so the row fills the screen
    const cardW = destinations.length <= 4 ? 200 : destinations.length <= 6 ? 178 : 158

    return (
        <section
            className="py-14 bg-white relative overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Decorative floating icons */}
            <div className="absolute top-10 left-[12%] text-teal-400 opacity-60 pointer-events-none">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
            </div>
            <div className="absolute top-8 right-[12%] text-amber-400 opacity-60 pointer-events-none">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
            </div>

            <div className="max-w-7xl mx-auto px-6">

                {/* Centered heading */}
                <div className="text-center mb-10">
                    {tagLabel && (
                        <p className="font-serif italic text-teal-500 text-lg mb-2">{tagLabel}</p>
                    )}
                    <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2c4e]">{title}</h2>
                    {subtitle && (
                        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">{subtitle}</p>
                    )}
                </div>

                {/* Staggered photo row — centers when few cards, scrolls when many */}
                <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto pb-6"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <div className="flex gap-5 items-start min-w-max mx-auto">
                        {destinations.map((destination, i) => {
                            const mt = staggerMt[i % staggerMt.length]
                            const h  = imgHeights[i % imgHeights.length]

                            return (
                                <Link
                                    key={destination.id}
                                    href={`/destinations/${destination.slug}`}
                                    className="flex-shrink-0 flex flex-col items-center group"
                                    style={{ marginTop: mt, width: cardW }}
                                >
                                    {/* Photo */}
                                    <div
                                        className="rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl group-hover:scale-[1.03] transition-all duration-300 w-full relative"
                                        style={{
                                            height: h,
                                            backgroundImage: `url(${destination.image})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }}
                                    >
                                        {/* Gradient overlay — fades in on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                                        {/* Hover text — slides up */}
                                        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <p className="text-white text-xs font-bold leading-tight mb-1 line-clamp-1">{destination.name}</p>
                                            {destination.description && (
                                                <p className="text-white/75 text-[10px] leading-snug line-clamp-2 mb-2">{destination.description}</p>
                                            )}
                                            <span className="inline-flex items-center gap-1 text-white text-[10px] font-semibold uppercase tracking-wide">
                                                Explore
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                    {/* Label */}
                                    <p className="mt-3 text-sm font-semibold text-gray-800 text-center group-hover:text-teal-600 transition-colors leading-tight w-full">
                                        {destination.name}
                                    </p>
                                </Link>
                            )
                        })}
                    </div>
                </div>

            </div>
        </section>
    )
}
