'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

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

export default function TestimonialsClient({ initialTestimonials }: TestimonialsClientProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
    const [isHovered, setIsHovered] = useState(false)
    const [itemsPerView, setItemsPerView] = useState(3) // Avoid window during SSR
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const MAX_LENGTH = 150

    const testimonials = initialTestimonials

    useEffect(() => {
        const handleResize = () => setItemsPerView(window.innerWidth >= 768 ? 3 : 1)
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Auto-scroll functionality
    useEffect(() => {
        if (testimonials.length === 0 || isHovered) {
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current)
                autoScrollIntervalRef.current = null
            }
            return
        }

        const maxIndex = Math.max(0, testimonials.length - itemsPerView)

        if (testimonials.length <= itemsPerView) {
            return
        }

        autoScrollIntervalRef.current = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                const nextIndex = prevIndex >= maxIndex ? 0 : prevIndex + 1
                if (scrollContainerRef.current) {
                    const cardWidth = scrollContainerRef.current.offsetWidth / itemsPerView
                    scrollContainerRef.current.scrollTo({
                        left: nextIndex * cardWidth,
                        behavior: 'smooth',
                    })
                }
                return nextIndex
            })
        }, 2500)

        return () => {
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current)
                autoScrollIntervalRef.current = null
            }
            if (resumeTimeoutRef.current) {
                clearTimeout(resumeTimeoutRef.current)
                resumeTimeoutRef.current = null
            }
        }
    }, [testimonials.length, isHovered, itemsPerView])

    const scrollToIndex = (index: number) => {
        if (scrollContainerRef.current) {
            const cardWidth = scrollContainerRef.current.offsetWidth / itemsPerView
            scrollContainerRef.current.scrollTo({
                left: index * cardWidth,
                behavior: 'smooth',
            })
            setCurrentIndex(index)
        }
    }

    const pauseAutoScroll = () => {
        setIsHovered(true)
        if (resumeTimeoutRef.current) {
            clearTimeout(resumeTimeoutRef.current)
        }
        resumeTimeoutRef.current = setTimeout(() => {
            setIsHovered(false)
            resumeTimeoutRef.current = null
        }, 3000)
    }

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const scrollLeft = scrollContainerRef.current.scrollLeft
            const cardWidth = scrollContainerRef.current.offsetWidth / itemsPerView
            const newIndex = Math.round(scrollLeft / cardWidth)
            setCurrentIndex(newIndex)
        }
        pauseAutoScroll()
    }

    const nextSlide = () => {
        const maxIndex = Math.max(0, testimonials.length - itemsPerView)
        const nextIndex = currentIndex < maxIndex ? currentIndex + 1 : 0
        scrollToIndex(nextIndex)
        pauseAutoScroll()
    }

    const prevSlide = () => {
        const maxIndex = Math.max(0, testimonials.length - itemsPerView)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex
        scrollToIndex(prevIndex)
        pauseAutoScroll()
    }

    const toggleExpand = (testimonialId: string) => {
        setExpandedCards((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(testimonialId)) {
                newSet.delete(testimonialId)
            } else {
                newSet.add(testimonialId)
            }
            return newSet
        })
    }

    const isExpanded = (testimonialId: string) => {
        return expandedCards.has(testimonialId)
    }

    const shouldShowReadMore = (quote: string) => {
        return quote.length > MAX_LENGTH
    }

    const getTruncatedText = (quote: string) => {
        if (quote.length <= MAX_LENGTH) return quote
        return quote.substring(0, MAX_LENGTH) + '...'
    }

    return (
        <div className="relative mb-12">
            {testimonials.length > itemsPerView && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-20 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all hover:scale-110"
                        aria-label="Previous testimonials"
                    >
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-20 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all hover:scale-110"
                        aria-label="Next testimonials"
                    >
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex gap-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {testimonials.map((testimonial, index) => {
                    const testimonialId = testimonial.id || `testimonial-${index}`
                    const isQuoteExpanded = isExpanded(testimonialId)
                    const showReadMore = shouldShowReadMore(testimonial.quote)
                    const displayText = isQuoteExpanded || !showReadMore
                        ? testimonial.quote
                        : getTruncatedText(testimonial.quote)

                    return (
                        <div
                            key={testimonialId}
                            className="flex-shrink-0 w-full md:w-1/3 snap-start"
                        >
                            <div className="bg-white rounded-3xl p-8 shadow-lg text-left border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group h-full flex flex-col">
                                <div className="mb-6">
                                    <p className="font-semibold text-ink text-base mb-2">{testimonial.name}</p>
                                    <div className="flex items-center gap-1">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-grow">
                                    <p className="text-gray-700 leading-relaxed text-base italic">
                                        "{displayText}"
                                    </p>
                                </div>
                                {showReadMore && (
                                    <button
                                        onClick={() => toggleExpand(testimonialId)}
                                        className="mt-4 text-primary hover:text-primary-dark font-semibold text-sm transition-colors flex items-center gap-1"
                                    >
                                        {isQuoteExpanded ? (
                                            <>
                                                Read Less
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            </>
                                        ) : (
                                            <>
                                                Read More
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {testimonials.length > itemsPerView && (
                <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: Math.ceil(testimonials.length / itemsPerView) }).map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                scrollToIndex(index)
                                pauseAutoScroll()
                            }}
                            className={`w-3 h-3 rounded-full transition-all ${Math.floor(currentIndex) === index
                                ? 'bg-primary w-8'
                                : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    )
}
