import Link from 'next/link'
import TestimonialsClient from './TestimonialsClient'
import { Testimonial } from './TestimonialsClient'

async function fetchTestimonials(): Promise<Testimonial[]> {
  const fallbackTestimonials = [
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
    } catch (orderError) {
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

    if (testimonialsData.length === 0) {
      return fallbackTestimonials
    }

    return testimonialsData
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    return fallbackTestimonials
  }
}

export default async function Testimonials() {
  const testimonials = await fetchTestimonials()

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

        <TestimonialsClient initialTestimonials={testimonials} />

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
            href="/ai-trip-planner"
            className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-full text-base font-semibold shadow-xl hover:bg-primary-dark hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            PLAN MY TRIP
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
