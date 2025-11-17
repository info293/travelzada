import Link from 'next/link'
import { travelPackages } from '@/data/package-data'

export default function Packages() {
  // Get first 4 packages to display
  const displayedPackages = travelPackages.slice(0, 4)

  return (
    <section className="py-20 px-4 md:px-8 lg:px-12 bg-cream">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-10">Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedPackages.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/destinations/${encodeURIComponent(pkg.destination)}/${pkg.id}`}
              className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
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

