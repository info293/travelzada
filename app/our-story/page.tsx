import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Our Story | Travelzada - AI-Powered Travel Planning',
  description: 'Discover the journey behind Travelzada. Learn how we combine AI technology with travel expertise to create personalized, unforgettable travel experiences.',
  keywords: 'Travelzada story, about us, travel planning, AI travel, travel platform',
  alternates: {
    canonical: '/our-story',
  },
  openGraph: {
    title: 'Our Story | Travelzada',
    description: 'Discover the journey behind Travelzada and our mission to transform travel planning.',
    type: 'website',
  },
}

export default function StoryPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="py-16 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
        <div className="max-w- py-6 mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Our Story
          </h1>
          <p className="text-xl text-gray-600">
            Discover the journey behind Travelzada and our mission to transform travel planning.
          </p>
        </div>
      </section>

      {/* Story Content */}
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">The Beginning</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Travelzada was born from a simple observation: planning a perfect trip shouldn't be complicated.
                In 2023, our founders experienced the frustration of spending countless hours researching destinations,
                comparing prices, and piecing together itineraries from dozens of different sources.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We envisioned a platform that combines the power of artificial intelligence with the personal touch
                of travel experts, creating seamless, personalized travel experiences in seconds rather than days.
              </p>
            </div>

            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                At Travelzada, we believe that everyone deserves to experience the world's wonders without the
                stress of planning. Our mission is to democratize premium travel planning, making it accessible,
                efficient, and enjoyable for travelers of all kinds.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We combine cutting-edge AI technology with deep travel expertise to create itineraries that are
                not just efficient, but truly memorable. Every journey we plan is crafted with precision, care,
                and a deep understanding of what makes travel special.
              </p>
            </div>

            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What Makes Us Different</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Precision</h3>
                  <p className="text-gray-700">
                    Our advanced AI analyzes millions of data points to create the perfect itinerary tailored to your preferences.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Human Touch</h3>
                  <p className="text-gray-700">
                    Every plan is reviewed and refined by our team of travel experts who understand the nuances of great travel.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Premium Experiences</h3>
                  <p className="text-gray-700">
                    We curate only the best destinations, accommodations, and experiences to ensure your journey is extraordinary.
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Results</h3>
                  <p className="text-gray-700">
                    Get a complete, detailed itinerary in seconds, not days. Your perfect trip is just a few clicks away.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Looking Forward</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                As we continue to grow, our commitment remains the same: to make travel planning effortless and
                travel experiences unforgettable. We're constantly innovating, expanding our destination coverage,
                and enhancing our AI capabilities to serve you better.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Join us on this journey, and let's explore the world together, one perfectly planned trip at a time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
