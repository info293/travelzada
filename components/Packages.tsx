import Link from 'next/link'
import { travelPackages } from '@/data/package-data'

export default function Packages() {
  // Get first 4 packages to display
  const displayedPackages = travelPackages.slice(0, 4)

  return (
    <section className="py-24 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-cream via-white to-cream relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-block mb-4">
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Featured Packages</span>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-ink mb-6">
          Premium Travel Packages
        </h2>
        <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto">
          Curated experiences designed for the discerning traveler
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayedPackages.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/destinations/${encodeURIComponent(pkg.destination)}/${pkg.id}`}
              className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {pkg.badge && (
                  <span className="absolute top-3 left-3 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    {pkg.badge}
                  </span>
                )}
                {pkg.rating && (
                  <span className="absolute top-3 right-3 bg-white text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                    ⭐ {pkg.rating}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-ink mb-1 line-clamp-1">{pkg.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{pkg.destination}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">{pkg.duration}</span>
                  <span className="text-lg font-bold text-primary">{pkg.pricePerPerson}</span>
                </div>
                <span className="text-primary font-semibold text-sm hover:underline">
                  View Details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

