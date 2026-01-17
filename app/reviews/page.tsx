'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
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

const MAX_LENGTH = 200 // Character limit before showing "read more"

export default function ReviewsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [filteredTestimonials, setFilteredTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterFeatured, setFilterFeatured] = useState<boolean | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest')

  useEffect(() => {
    // Set page SEO
    document.title = 'Customer Reviews | Travelzada - Traveler Testimonials'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Read authentic reviews from travelers who used Travelzada. See ratings, testimonials, and experiences from real customers planning their perfect trips.')
    }

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
          // Try to get all testimonials ordered by creation date
          const q = query(collection(dbInstance, 'testimonials'), orderBy('createdAt', 'desc'))
          querySnapshot = await getDocs(q)
        } catch (orderError) {
          // If orderBy fails, just get all testimonials
          console.log('OrderBy failed, fetching all testimonials:', orderError)
          querySnapshot = await getDocs(collection(dbInstance, 'testimonials'))
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
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          })
        })

        // Sort by featured first, then by date
        testimonialsData.sort((a, b) => {
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          const aDate = a.createdAt || ''
          const bDate = b.createdAt || ''
          return bDate.localeCompare(aDate)
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
          setFilteredTestimonials(testimonialsData)
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

  // Filter and sort testimonials
  useEffect(() => {
    let filtered = [...testimonials]

    // Filter by rating
    if (filterRating !== null) {
      filtered = filtered.filter((t) => t.rating === filterRating)
    }

    // Filter by featured
    if (filterFeatured !== null) {
      filtered = filtered.filter((t) => t.featured === filterFeatured)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        const aDate = a.createdAt || ''
        const bDate = b.createdAt || ''
        return bDate.localeCompare(aDate)
      } else if (sortBy === 'oldest') {
        const aDate = a.createdAt || ''
        const bDate = b.createdAt || ''
        return aDate.localeCompare(bDate)
      } else if (sortBy === 'rating') {
        return b.rating - a.rating
      }
      return 0
    })

    setFilteredTestimonials(filtered)
  }, [testimonials, filterRating, filterFeatured, sortBy])

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

  const clearFilters = () => {
    setFilterRating(null)
    setFilterFeatured(null)
    setSortBy('newest')
  }

  const hasActiveFilters = filterRating !== null || filterFeatured !== null || sortBy !== 'newest'

  if (loading) {
    return (
      <main className="min-h-screen bg-cream">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream via-white to-cream">
      <Header />

      <section className="py-16 md:py-24 px-4 md:px-8 lg:px-12 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mt-6 mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-6">
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Reviews & Testimonials</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ink mb-6 bg-gradient-to-r from-ink to-gray-700 bg-clip-text text-transparent">
              What Our Travelers Say
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Discover authentic experiences from thousands of satisfied travelers who've trusted Travelzada for their perfect journeys
            </p>
          </div>

          {/* Filters Section */}
          <div className="mb-12 bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-200/50 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* Rating Filter */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</label>
                  <select
                    value={filterRating === null ? 'all' : filterRating.toString()}
                    onChange={(e) => setFilterRating(e.target.value === 'all' ? null : parseInt(e.target.value, 10))}
                    className="px-5 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm hover:shadow-md min-w-[140px]"
                  >
                    <option value="all">⭐ All Ratings</option>
                    <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                    <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                    <option value="3">⭐⭐⭐ 3 Stars</option>
                    <option value="2">⭐⭐ 2 Stars</option>
                    <option value="1">⭐ 1 Star</option>
                  </select>
                </div>

                {/* Featured Filter */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                  <select
                    value={filterFeatured === null ? 'all' : filterFeatured ? 'featured' : 'regular'}
                    onChange={(e) => {
                      if (e.target.value === 'all') setFilterFeatured(null)
                      else setFilterFeatured(e.target.value === 'featured')
                    }}
                    className="px-5 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm hover:shadow-md min-w-[140px]"
                  >
                    <option value="all">📋 All Reviews</option>
                    <option value="featured">⭐ Featured Only</option>
                    <option value="regular">📝 Regular Only</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'rating')}
                    className="px-5 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm hover:shadow-md min-w-[160px]"
                  >
                    <option value="newest">🕐 Newest First</option>
                    <option value="oldest">🕑 Oldest First</option>
                    <option value="rating">⭐ Highest Rating</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary-dark rounded-xl hover:from-primary-dark hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </button>
              )}
            </div>

            {/* Results Count */}
            <div className="mt-6 pt-6 border-t border-gray-200/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-bold text-primary text-base">{filteredTestimonials.length}</span> of{' '}
                  <span className="font-semibold text-ink">{testimonials.length}</span> reviews
                </p>
                {hasActiveFilters && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500">Filters Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Grid */}
          {filteredTestimonials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredTestimonials.map((testimonial, index) => {
                const testimonialId = testimonial.id || `testimonial-${index}`
                const isQuoteExpanded = isExpanded(testimonialId)
                const showReadMore = shouldShowReadMore(testimonial.quote)
                const displayText = isQuoteExpanded || !showReadMore
                  ? testimonial.quote
                  : getTruncatedText(testimonial.quote)

                return (
                  <div
                    key={testimonialId}
                    className="group bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100 hover:border-primary/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col relative overflow-hidden"
                  >
                    {/* Decorative gradient overlay */}
                    {testimonial.featured && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                    )}

                    <div className="relative z-10">
                      <div className="mb-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <p className="font-bold text-ink text-xl mb-1">{testimonial.name}</p>
                            <div className="flex items-center gap-1.5">
                              {[...Array(testimonial.rating)].map((_, i) => (
                                <svg key={i} className="w-5 h-5 text-yellow-400 fill-current drop-shadow-sm" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                              <span className="ml-2 text-sm font-medium text-gray-600">{testimonial.rating}.0</span>
                            </div>
                          </div>
                          {testimonial.featured && (
                            <span className="px-4 py-1.5 bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Featured
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-grow mb-6">
                        <div className="relative">
                          <div className="absolute -top-2 -left-2 text-6xl text-primary/5 font-serif leading-none">"</div>
                          <p className="text-gray-700 leading-relaxed text-base relative z-10 pl-4">
                            {displayText}
                          </p>
                        </div>
                      </div>

                      {showReadMore && (
                        <button
                          onClick={() => toggleExpand(testimonialId)}
                          className="mb-4 text-primary hover:text-primary-dark font-semibold text-sm transition-all flex items-center gap-2 self-start group/btn"
                        >
                          {isQuoteExpanded ? (
                            <>
                              <span>Read Less</span>
                              <svg className="w-4 h-4 transform group-hover/btn:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>Read More</span>
                              <svg className="w-4 h-4 transform group-hover/btn:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}

                      {testimonial.createdAt && (
                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs text-gray-500 font-medium">
                            {new Date(testimonial.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-dashed border-gray-300">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-ink mb-3">No reviews found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your filters to see more results</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:from-primary-dark hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-20 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-3xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-primary/10 via-white to-accent/10 rounded-3xl p-12 md:p-16 border-2 border-primary/20 shadow-2xl">
              <div className="max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-primary/20 mb-6">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-semibold text-primary">Join Our Community</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
                  Ready to create your perfect trip?
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Join thousands of satisfied travelers and let our AI planner create your personalized itinerary in minutes
                </p>
                <a
                  href="/ai-trip-planner"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-primary to-primary-dark text-white px-12 py-5 rounded-full text-base font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 group"
                >
                  PLAN MY TRIP
                  <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

