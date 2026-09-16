'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

function getImageUrl(url: string | undefined): string {
    if (!url) return FALLBACK_IMAGE
    return url.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
}

function formatPrice(priceRange: string | number | undefined): string {
    if (!priceRange) return 'On Request'
    const clean = String(priceRange).split('-')[0].replace(/,/g, '')
    const match = clean.match(/(\d+)/)
    return match ? `₹${parseInt(match[1]).toLocaleString('en-IN')}` : String(priceRange)
}

export default function OccasionSectionClient({
    occasion,
    packages,
    index,
}: {
    occasion: string
    packages: FirestorePackage[]
    index: number
}) {
    const [activeIndex, setActiveIndex] = useState(0)
    const [isHovered, setIsHovered] = useState(false)
    const touchStartX = useRef<number | null>(null)

    useEffect(() => {
        if (packages.length > 0) {
            setActiveIndex(Math.floor(packages.length / 2))
        }
    }, [packages.length])

    const nextSlide = useCallback(() => {
        if (packages.length === 0) return
        setActiveIndex(prev => (prev + 1) % packages.length)
    }, [packages.length])

    const prevSlide = useCallback(() => {
        if (packages.length === 0) return
        setActiveIndex(prev => (prev - 1 + packages.length) % packages.length)
    }, [packages.length])

    // Autoplay effect
    useEffect(() => {
        if (packages.length === 0 || isHovered) return
        const timer = setInterval(() => {
            nextSlide()
        }, 3800)
        return () => clearInterval(timer)
    }, [packages.length, isHovered, nextSlide])

    const getOffset = (idx: number) => {
        const total = packages.length
        if (total === 0) return 0
        let diff = (idx - activeIndex) % total
        if (diff < -Math.floor(total / 2)) diff += total
        if (diff > Math.floor(total / 2)) diff -= total
        return diff
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return
        const diffX = touchStartX.current - e.changedTouches[0].clientX
        if (Math.abs(diffX) > 40) {
            if (diffX > 0) nextSlide()
            else prevSlide()
        }
        touchStartX.current = null
    }

    const bgClass = index % 2 !== 0 ? 'bg-[#faf8f5]' : 'bg-white'

    if (!packages || packages.length === 0) return null

    return (
        <section
            className={`relative overflow-hidden ${bgClass} py-10 sm:py-14 px-4 sm:px-8 select-none`}
        >
            {/* Background ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-pink-100/30 via-purple-100/30 to-amber-100/30 blur-3xl pointer-events-none rounded-full" />

            <div className="max-w-7xl mx-auto relative z-10">

                {/* ── Header ── */}
                <div className="text-center mb-2 sm:mb-3 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 text-pink-800 text-xs font-bold tracking-[0.2em] uppercase mb-2 border border-pink-500/20">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
                        </svg>
                        Curated Collection
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-display mb-2 leading-tight">
                        {occasion} Specials
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-1 max-w-2xl mx-auto">
                        Explore our exclusive handpicked {occasion.toLowerCase()} trip packages designed for couples.
                    </p>
                </div>

                {/* ── 3D Coverflow Container ── */}
                <div
                    className="relative h-[440px] sm:h-[460px] flex items-start justify-center mt-2 mb-2 perspective-[1200px]"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Cards Stage */}
                    <div className="relative w-full max-w-6xl h-full flex items-start justify-center">
                        {packages.map((pkg, i) => {
                            const offset = getOffset(i)
                            const isCenter = offset === 0
                            const imageUrl = getImageUrl(pkg.Primary_Image_URL)
                            const destinationSlug = getDestinationSlugFromPackage(pkg)
                            const packageId = getPackageIdFromPackage(pkg)
                            const badge = pkg.Travel_Type || pkg.Star_Category || 'Couple Special'
                            const priceText = formatPrice(pkg.Price_Range_INR)

                            // 3D positioning styles
                            let transformStyle = ''
                            let zIndex = 0
                            let opacity = 0
                            let filter = 'none'

                            if (offset === 0) {
                                transformStyle = 'translateX(0px) scale(1.02) translateZ(0px) rotateY(0deg)'
                                zIndex = 30
                                opacity = 1
                            } else if (offset === 1) {
                                transformStyle = 'translateX(clamp(160px, 32vw, 320px)) scale(0.85) translateZ(-80px) rotateY(-14deg)'
                                zIndex = 20
                                opacity = 0.8
                                filter = 'brightness(0.9) contrast(0.95)'
                            } else if (offset === -1) {
                                transformStyle = 'translateX(clamp(-320px, -32vw, -160px)) scale(0.85) translateZ(-80px) rotateY(14deg)'
                                zIndex = 20
                                opacity = 0.8
                                filter = 'brightness(0.9) contrast(0.95)'
                            } else if (offset === 2) {
                                transformStyle = 'translateX(clamp(280px, 58vw, 560px)) scale(0.7) translateZ(-160px) rotateY(-24deg)'
                                zIndex = 10
                                opacity = 0.45
                                filter = 'brightness(0.75) contrast(0.9)'
                            } else if (offset === -2) {
                                transformStyle = 'translateX(clamp(-560px, -58vw, -280px)) scale(0.7) translateZ(-160px) rotateY(24deg)'
                                zIndex = 10
                                opacity = 0.45
                                filter = 'brightness(0.75) contrast(0.9)'
                            } else {
                                transformStyle = `translateX(${offset > 0 ? 700 : -700}px) scale(0.5)`
                                zIndex = 0
                                opacity = 0
                            }

                            return (
                                <div
                                    key={pkg.id || `${packageId}-${i}`}
                                    onClick={() => {
                                        if (!isCenter) setActiveIndex(i)
                                    }}
                                    className="absolute top-2 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer"
                                    style={{
                                        transform: transformStyle,
                                        zIndex,
                                        opacity,
                                        filter,
                                        pointerEvents: Math.abs(offset) <= 2 ? 'auto' : 'none',
                                    }}
                                >
                                    <div
                                        className={`w-[300px] sm:w-[340px] bg-white rounded-3xl overflow-hidden border border-slate-200/80 transition-all duration-500 group ${
                                            isCenter
                                                ? 'shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5'
                                                : 'shadow-md hover:shadow-xl'
                                        }`}
                                    >
                                        {/* Top Image Card */}
                                        <div className="relative h-[185px] sm:h-[200px] w-full overflow-hidden">
                                            <Image
                                                src={imageUrl}
                                                alt={pkg.Destination_Name}
                                                fill
                                                sizes="350px"
                                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                                            {/* Top Left Badge */}
                                            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-900/90 text-white backdrop-blur-md shadow-sm border border-white/10">
                                                {badge}
                                            </div>

                                            {/* Top Right Duration */}
                                            {pkg.Duration && (
                                                <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-950/80 backdrop-blur-md text-white shadow-sm border border-white/15">
                                                    {pkg.Duration}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-5 sm:p-6 flex flex-col justify-between">
                                            {/* Title */}
                                            <div>
                                                <div className="inline-block bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5 border border-slate-200/60">
                                                    {occasion}
                                                </div>
                                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-slate-700 transition-colors font-display">
                                                    {pkg.Destination_Name}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-normal">
                                                    Exclusive couple getaway package with handpicked luxury stays, transfers & romantic setups.
                                                </p>
                                            </div>

                                            {/* Minimal Metadata Pills */}
                                            <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100">
                                                <div className="inline-flex items-center gap-1.5 bg-slate-100/90 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    <span>{pkg.Duration || 'Custom'}</span>
                                                </div>

                                                <div className="inline-flex items-center gap-1.5 bg-slate-100/90 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 21h18M3 7v14M21 7v14M6 3h12v4H6zM9 11h2v2H9zM13 11h2v2h-2zM9 15h2v2H9zM13 15h2v2h-2z" />
                                                    </svg>
                                                    <span className="line-clamp-1">{pkg.Star_Category || '4★ Luxury'}</span>
                                                </div>
                                            </div>

                                            {/* Bottom Price & Clear Action Button */}
                                            <div className="flex items-end justify-between mt-4 pt-3.5 border-t border-slate-100">
                                                <div>
                                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">Starting from</span>
                                                    <span className="text-xl sm:text-2xl font-extrabold text-indigo-600 font-display">
                                                        {priceText}
                                                    </span>
                                                </div>

                                                {/* Explicit Luxury Action Button */}
                                                <Link
                                                    href={`/destinations/${encodeURIComponent(destinationSlug)}/${encodeURIComponent(packageId)}`}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all duration-300 shadow-sm hover:shadow-md shrink-0 group-hover:bg-slate-900"
                                                    aria-label={`View ${pkg.Destination_Name} details`}
                                                >
                                                    <span>View Details</span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                        <polyline points="12 5 19 12 12 19" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Navigation Arrow Buttons */}
                    {packages.length > 1 && (
                        <>
                            <button
                                onClick={prevSlide}
                                aria-label="Previous Package"
                                className="absolute left-2 sm:left-6 top-[200px] -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-slate-200/80 text-slate-800 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>

                            <button
                                onClick={nextSlide}
                                aria-label="Next Package"
                                className="absolute right-2 sm:right-6 top-[200px] -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-slate-200/80 text-slate-800 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                {/* ── Indicator Dots ── */}
                {packages.length > 1 && (
                    <div className="flex items-center justify-center gap-2.5 mt-8">
                        {packages.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveIndex(idx)}
                                aria-label={`Go to slide ${idx + 1}`}
                                className={`transition-all duration-500 rounded-full ${
                                    activeIndex === idx
                                        ? 'w-8 h-2.5 bg-pink-600 shadow-md shadow-pink-600/30'
                                        : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
                                }`}
                            />
                        ))}
                    </div>
                )}

            </div>
        </section>
    )
}

