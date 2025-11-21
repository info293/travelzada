import Link from 'next/link'
import { travelPackages } from '@/data/package-data'

export default function Packages() {
  const displayedPackages = travelPackages.slice(0, 4)

  return (
    <section className="py-24 px-4 md:px-8 lg:px-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#fef6f1] to-white"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-pink-200/30 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-orange-100 shadow-sm mb-4">
          <span className="w-3.5 h-3.5 inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45"></span>
          <span className="text-xs uppercase tracking-[0.3em] text-orange-500 font-semibold">Featured journeys</span>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 mb-4">
          Premium capsules, ready to book
        </h2>
        <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto">
          Balanced itineraries curated for design lovers, slow travelers, and celebration seekers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayedPackages.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/destinations/${encodeURIComponent(pkg.destination)}/${pkg.id}`}
              className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                {pkg.badge && (
                  <span className="absolute top-3 left-3 bg-white/90 text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                    {pkg.badge}
                  </span>
                )}
                {pkg.rating && (
                  <span className="absolute top-3 right-3 bg-white text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                    ⭐ {pkg.rating}
                  </span>
                )}
              </div>
              <div className="p-5 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">{pkg.duration}</span>
                  <span className="text-lg font-bold text-orange-500">{pkg.pricePerPerson}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">{pkg.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{pkg.destination}</p>
                <span className="text-orange-500 font-semibold text-sm hover:underline">
                  View details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

