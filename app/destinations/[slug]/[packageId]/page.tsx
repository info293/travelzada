'use client'

import { use } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { travelPackages } from '@/data/package-data'

interface PageProps {
  params: Promise<{ slug: string; packageId: string }> | { slug: string; packageId: string }
}

export default function PackageDetailPage({ params }: PageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params
  const slug = decodeURIComponent(resolvedParams.slug)
  const packageId = resolvedParams.packageId

  const packageData = travelPackages.find(
    (pkg) => pkg.destination.toLowerCase() === slug.toLowerCase() && pkg.id === packageId
  )

  if (!packageData) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Package Not Found</h1>
            <p className="text-gray-600 mb-8">The package you're looking for is unavailable.</p>
            <Link
              href={`/destinations/${slug}`}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Back to Packages
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const whatsappMessage = encodeURIComponent(
    `Hi! I'm interested in the ${packageData.title} package for ${packageData.destination}. Please share more details.`
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <section className="relative h-[420px] md:h-[520px] overflow-hidden">
        <img
          src={packageData.image}
          alt={packageData.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70"></div>
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-6xl mx-auto px-4 md:px-12 pb-12 w-full text-white">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
                {packageData.destination}
              </span>
              <span className="bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-semibold shadow">
                {packageData.duration}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{packageData.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-white/90 text-sm">
              <div>
                <p className="uppercase tracking-wide text-xs">Duration</p>
                <p className="font-semibold">{packageData.duration}</p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-xs">Price from</p>
                <p className="font-semibold text-2xl">{packageData.pricePerPerson} / person</p>
              </div>
              {packageData.rating && (
                <div>
                  <p className="uppercase tracking-wide text-xs">Guest reviews</p>
                  <p className="font-semibold">
                    ⭐ {packageData.rating} ({packageData.reviews}+ reviews)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Overview */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Destination Overview</h2>
              <p className="text-gray-600 leading-relaxed">{packageData.overview}</p>
            </div>

            {/* Highlights */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Highlights</h2>
              <div className="grid grid-cols-2 gap-4 text-gray-700">
                {packageData.highlights.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day-wise Itinerary */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Day-wise Itinerary</h2>
              <div className="space-y-4">
                {packageData.itinerary.map((day) => (
                  <details
                    key={day.day}
                    className="border border-gray-200 rounded-2xl p-4 bg-gray-50"
                    open={day.day === 'Day 1'}
                  >
                    <summary className="cursor-pointer font-semibold text-gray-900 flex justify-between items-center">
                      <span>
                        {day.day}: {day.title}
                      </span>
                      <span className="text-primary text-sm">See details</span>
                    </summary>
                    <div className="mt-3 text-gray-600">
                      <p className="mb-2">{day.description}</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {day.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-primary/10">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Inclusions</h3>
                <ul className="space-y-2 text-gray-700">
                  {packageData.inclusions.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-red-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Exclusions</h3>
                <ul className="space-y-2 text-gray-700">
                  {packageData.exclusions.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-3xl p-8 shadow-sm space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Policies</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PolicyCard title="Booking Policy" items={packageData.policies.booking} />
                <PolicyCard title="Payment Policy" items={packageData.policies.payment} />
                <PolicyCard title="Cancellation Policy" items={packageData.policies.cancellation} />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-lg sticky top-28">
              <div className="border-b border-gray-200 pb-6 mb-6">
                <p className="text-sm text-gray-500">Starting from</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">{packageData.pricePerPerson}</p>
                <p className="text-sm text-gray-500">Total price {packageData.totalPrice}</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() =>
                    window.open(`https://api.whatsapp.com/send?text=${whatsappMessage}`, '_blank')
                  }
                  className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-2xl font-semibold hover:bg-green-600 transition-colors"
                >
                  Share on WhatsApp
                </button>
                <button
                  onClick={() => alert('Itinerary download will be available soon!')}
                  className="w-full flex items-center justify-center gap-2 border border-primary text-primary py-3 rounded-2xl font-semibold hover:bg-primary/5 transition-colors"
                >
                  Download Itinerary
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Enquiry Form</h3>
              <p className="text-sm text-gray-500 mb-6">
                Destination - {packageData.destination}
              </p>
              <form className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 12345 67890"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Email</label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Preferred Travel Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-white py-3 rounded-2xl font-semibold hover:bg-primary-dark transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    alert('Thanks! We will contact you shortly.')
                  }}
                >
                  Submit Enquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function PolicyCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-gray-600">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

