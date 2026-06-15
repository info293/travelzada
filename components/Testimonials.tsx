import Link from 'next/link'
import TestimonialsClient from './TestimonialsClient'
import { Testimonial } from './TestimonialsClient'

async function fetchTestimonials(): Promise<Testimonial[]> {
  const fallbackTestimonials = [
    {
      name: 'Sarah L.',
      rating: 5,
      quote: 'Travelzada made our anniversary trip unforgettable. The AI planner was spot-on, and the human touch made all the difference. Absolutely flawless!',
    },
    {
      name: 'Mark T.',
      rating: 5,
      quote: 'As a solo traveler, I used to spend weeks planning. Now I just tell Travelzada what I like and it creates the perfect itinerary in minutes. Game-changer!',
    },
    {
      name: 'Emily C.',
      rating: 5,
      quote: 'The best part is getting one perfect itinerary, not twenty confusing options. It saved so much time and stress. Highly recommend!',
    },
  ]

  try {
    const { db } = await import('@/lib/firebase')
    const { collection, getDocs, query, orderBy, where } = await import('firebase/firestore')

    let querySnapshot
    try {
      const featuredQuery = query(
        collection(db, 'testimonials'),
        where('featured', '==', true),
        orderBy('createdAt', 'desc')
      )
      querySnapshot = await getDocs(featuredQuery)
    } catch {
      const allQuery = query(collection(db, 'testimonials'))
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

    if (testimonialsData.length === 0) return fallbackTestimonials
    return testimonialsData
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    return fallbackTestimonials
  }
}

export default async function Testimonials() {
  const testimonials = await fetchTestimonials()

  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 relative z-10">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="font-serif italic text-primary text-lg mb-3">Customer Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink">
            What Our Travelers Say
          </h2>
        </div>

        <TestimonialsClient initialTestimonials={testimonials} />

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white px-7 py-3 rounded-full text-sm font-semibold transition-all duration-300"
          >
            View All Reviews
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/tailored-travel"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-7 py-3 rounded-full text-sm font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300"
          >
            Plan My Trip
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  )
}
