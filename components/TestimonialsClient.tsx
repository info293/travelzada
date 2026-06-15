'use client'

import { useState, useRef, useEffect } from 'react'

export interface Testimonial {
    id?: string
    name: string
    rating: number
    quote: string
    featured?: boolean
    createdAt?: string
    updatedAt?: string
}

interface TestimonialsClientProps {
    initialTestimonials: Testimonial[]
}

const avatarGradients = [
    'from-purple-500 to-indigo-600',
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-teal-400 to-cyan-600',
    'from-emerald-400 to-green-500',
    'from-blue-400 to-indigo-500',
]

export default function TestimonialsClient({ initialTestimonials }: TestimonialsClientProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isHovered, setIsHovered] = useState(false)
    const [itemsPerView, setItemsPerView] = useState(3)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const testimonials = initialTestimonials

    useEffect(() => {
        const handleResize = () => setItemsPerView(window.innerWidth >= 768 ? 3 : 1)
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (testimonials.length === 0 || isHovered) {
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current)
                autoScrollIntervalRef.current = null
            }
            return
        }

        const maxIndex = Math.max(0, testimonials.length - itemsPerView)
        if (testimonials.length <= itemsPerView) return

        autoScrollIntervalRef.current = setInterval(() => {
            setCurrentIndex((prev) => {
                const next = prev >= maxIndex ? 0 : prev + 1
                if (scrollContainerRef.current) {
                    const cardWidth = scrollContainerRef.current.offsetWidth / itemsPerView
                    scrollContainerRef.current.scrollTo({ left: next * cardWidth, behavior: 'smooth' })
                }
                return next
            })
        }, 2800)

        return () => {
            if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current)
            if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
        }
    }, [testimonials.length, isHovered, itemsPerView])

    const scrollToIndex = (index: number) => {
        if (scrollContainerRef.current) {
            const cardWidth = scrollContainerRef.current.offsetWidth / itemsPerView
            scrollContainerRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' })
            setCurrentIndex(index)
        }
    }

    const pauseAutoScroll = () => {
        setIsHovered(true)
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = setTimeout(() => {
            setIsHovered(false)
            resumeTimeoutRef.current = null
        }, 3000)
    }

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const cardWidth = scrollContainerRef.current.offsetWidth / itemsPerView
            setCurrentIndex(Math.round(scrollContainerRef.current.scrollLeft / cardWidth))
        }
        pauseAutoScroll()
    }

    const nextSlide = () => {
        const maxIndex = Math.max(0, testimonials.length - itemsPerView)
        scrollToIndex(currentIndex < maxIndex ? currentIndex + 1 : 0)
        pauseAutoScroll()
    }

    const prevSlide = () => {
        const maxIndex = Math.max(0, testimonials.length - itemsPerView)
        scrollToIndex(currentIndex > 0 ? currentIndex - 1 : maxIndex)
        pauseAutoScroll()
    }

    // The center card in the current view gets the highlight
    const centeredIndex = currentIndex + (itemsPerView === 3 ? 1 : 0)

    return (
        <div className="relative">

            {/* Nav arrows */}
            {testimonials.length > itemsPerView && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 md:-translate-x-10 z-20 w-9 h-9 bg-white border border-gray-200 rounded-full shadow flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-all"
                        aria-label="Previous"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 md:translate-x-10 z-20 w-9 h-9 bg-white border border-gray-200 rounded-full shadow flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-all"
                        aria-label="Next"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {/* Scrollable row */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {testimonials.map((t, index) => {
                    const id = t.id || `t-${index}`
                    const isFeatured = index === centeredIndex
                    const initials = t.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
                    const gradient = avatarGradients[index % avatarGradients.length]

                    return (
                        <div key={id} className="flex-shrink-0 w-full md:w-1/3 snap-start">
                            <div
                                className={`rounded-2xl p-5 flex items-start gap-4 h-full transition-all duration-300 ${
                                    isFeatured
                                        ? 'bg-white border-2 border-primary/40 shadow-lg shadow-primary/10'
                                        : 'bg-slate-50/80 border border-gray-100'
                                }`}
                            >
                                {/* Avatar */}
                                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                                    <span className="text-white text-lg font-bold tracking-wide">{initials}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Stars */}
                                    <div className="flex gap-0.5 mb-2">
                                        {[...Array(t.rating)].map((_, i) => (
                                            <svg key={i} className={`w-3.5 h-3.5 fill-current ${isFeatured ? 'text-amber-400' : 'text-amber-300'}`} viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>

                                    {/* Quote */}
                                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                                        {t.quote.length > 130 ? t.quote.substring(0, 130) + '…' : t.quote}
                                    </p>

                                    {/* Name & label */}
                                    <p className="font-bold text-ink text-sm leading-tight">{t.name}</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Verified Traveler</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Dot indicators */}
            {testimonials.length > itemsPerView && (
                <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: Math.ceil(testimonials.length / itemsPerView) }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { scrollToIndex(i); pauseAutoScroll() }}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                Math.floor(currentIndex) === i
                                    ? 'bg-primary w-8'
                                    : 'bg-gray-200 w-2 hover:bg-gray-300'
                            }`}
                            aria-label={`Slide ${i + 1}`}
                        />
                    ))}
                </div>
            )}

        </div>
    )
}
