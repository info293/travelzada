'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Testimonial {
  id?: string
  name: string
  rating: number
  quote: string
  featured?: boolean
  createdAt?: string
  updatedAt?: string
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [isHovered, setIsHovered] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const MAX_LENGTH = 150 // Character limit before showing "read more"

  useEffect(() => {
    const fetchTestimonials = async () => {
      if (typeof window === 'undefined' || !db) {
        // Fallback to hardcoded testimonials
        setTestimonials([
          {
            name: 'Sarah L.',
            rating: 5,
            quote: 'Travelzada made our anniversary trip unforgettable. The AI planner was spot-on, and the human touch made all the difference. Flawless!',
          },
          {
            name: 'Mark T.',
            rating: 5,
            quote: 'As a solo traveler, I used to spend weeks planning. Now, I just tell Travelzada what I like, it creates the perfect itinerary in minutes. Game-changer!',
          },
          {
            name: 'Emily C.',
            rating: 5,
            quote: 'The best part is getting one perfect itinerary, not twenty confusing options. It saved so much time and stress. Highly recommend!',
          },
        ])
        setLoading(false)
        return
      }

      try {
        const dbInstance = db
        let querySnapshot
        try {
          // Try to get featured testimonials first, then regular ones
          const featuredQuery = query(
            collection(dbInstance, 'testimonials'),
            where('featured', '==', true),
            orderBy('createdAt', 'desc')
          )
          querySnapshot = await getDocs(featuredQuery)
        } catch (orderError) {
          // If orderBy fails, just get all testimonials
          const allQuery = query(collection(dbInstance, 'testimonials'))
          querySnapshot = await getDocs(allQuery)
        }

        const testimonialsData: Testimonial[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          testimonialsData.push({
            id: doc.id,
            name: data.name || '',
            rating: data.rating || 5,
            quote: data.quote || '',
            featured: data.featured || false,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          })
        })

        // If no testimonials found, use fallback
        if (testimonialsData.length === 0) {
          setTestimonials([
            {
              name: 'Sarah L.',
              rating: 5,
              quote: 'Travelzada made our anniversary trip unforgettable. The AI planner was spot-on, and the human touch made all the difference. Flawless!',
            },
            {
              name: 'Mark T.',
              rating: 5,
              quote: 'As a solo traveler, I used to spend weeks planning. Now, I just tell Travelzada what I like, it creates the perfect itinerary in minutes. Game-changer!',
            },
            {
              name: 'Emily C.',
              rating: 5,
              quote: 'The best part is getting one perfect itinerary, not twenty confusing options. It saved so much time and stress. Highly recommend!',
            },
          ])
        } else {
          setTestimonials(testimonialsData)
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error)
        // Fallback to hardcoded testimonials on error
        setTestimonials([
          {
            name: 'Sarah L.',
            rating: 5,
            quote: 'Travelzada made our anniversary trip unforgettable. The AI planner was spot-on, and the human touch made all the difference. Flawless!',
          },
          {
            name: 'Mark T.',
            rating: 5,
            quote: 'As a solo traveler, I used to spend weeks planning. Now, I just tell Travelzada what I like, it creates the perfect itinerary in minutes. Game-changer!',
          },
          {
            name: 'Emily C.',
            rating: 5,
            quote: 'The best part is getting one perfect itinerary, not twenty confusing options. It saved so much time and stress. Highly recommend!',
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [])

  // Auto-scroll functionality
  useEffect(() => {
    // Only auto-scroll if there are testimonials and user is not hovering
    if (testimonials.length === 0 || isHovered) {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current)
        autoScrollIntervalRef.current = null
      }
      return
    }

    // Calculate how many cards are visible at once
    const getVisibleCards = () => {
      if (typeof window === 'undefined') return 1
      return window.innerWidth >= 768 ? 3 : 1
    }

    const visibleCards = getVisibleCards()
    const maxIndex = Math.max(0, testimonials.length - visibleCards)

    // Only auto-scroll if there are more testimonials than visible cards
    if (testimonials.length <= visibleCards) {
      return
    }

    // Set up auto-scroll interval (scroll every 2.5 seconds)
    autoScrollIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex >= maxIndex ? 0 : prevIndex + 1
        // Scroll to the next index
        if (scrollContainerRef.current) {
          const cardWidth = scrollContainerRef.current.offsetWidth / visibleCards
          scrollContainerRef.current.scrollTo({
            left: nextIndex * cardWidth,
            behavior: 'smooth',
          })
        }
        return nextIndex
      })
    }, 2500) // 2.5 seconds interval

    // Cleanup on unmount or when dependencies change
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
  }, [testimonials.length, isHovered])

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.offsetWidth / (window.innerWidth >= 768 ? 3 : 1)
      scrollContainerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth',
      })
      setCurrentIndex(index)
    }
  }

  const pauseAutoScroll = () => {
    setIsHovered(true)
    // Clear any existing resume timeout
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
    }
    // Resume auto-scroll after 3 seconds of no interaction
    resumeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
      resumeTimeoutRef.current = null
    }, 3000)
  }

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft
      const cardWidth = scrollContainerRef.current.offsetWidth / (window.innerWidth >= 768 ? 3 : 1)
      const newIndex = Math.round(scrollLeft / cardWidth)
      setCurrentIndex(newIndex)
    }
    // Pause auto-scroll temporarily when user manually scrolls
    pauseAutoScroll()
  }

  const nextSlide = () => {
    const maxIndex = Math.max(0, testimonials.length - (window.innerWidth >= 768 ? 3 : 1))
    const nextIndex = currentIndex < maxIndex ? currentIndex + 1 : 0
    scrollToIndex(nextIndex)
    // Pause auto-scroll temporarily when user clicks navigation
    pauseAutoScroll()
  }

  const prevSlide = () => {
    const maxIndex = Math.max(0, testimonials.length - (window.innerWidth >= 768 ? 3 : 1))
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex
    scrollToIndex(prevIndex)
    // Pause auto-scroll temporarily when user clicks navigation
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

  if (loading) {
    return (
      <section className="py-24 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-cream via-white to-cream relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading testimonials...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-cream via-white to-cream relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-block mb-4">
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Testimonials</span>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-ink mb-6">
          What Our Travelers Say
        </h2>
        <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto">
          Join thousands of satisfied travelers who've experienced the perfect trip
        </p>
        
        {/* Slider Container */}
        <div className="relative mb-12">
          {/* Navigation Buttons */}
          {testimonials.length > (window.innerWidth >= 768 ? 3 : 1) && (
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

          {/* Scrollable Cards Container */}
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

          {/* Dots Indicator */}
          {testimonials.length > (window.innerWidth >= 768 ? 3 : 1) && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: Math.ceil(testimonials.length / (window.innerWidth >= 768 ? 3 : 1)) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    scrollToIndex(index)
                    // Pause auto-scroll temporarily when user clicks dot
                    pauseAutoScroll()
                  }}
                  className={`w-3 h-3 rounded-full transition-all ${
                    Math.floor(currentIndex) === index
                      ? 'bg-primary w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/reviews"
            className="inline-flex items-center justify-center bg-white text-primary border-2 border-primary px-8 py-4 rounded-full text-base font-semibold shadow-lg hover:bg-primary hover:text-white hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            View All Reviews
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/ai-planner"
            className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-full text-base font-semibold shadow-xl hover:bg-primary-dark hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            PLAN MY TRIP
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
