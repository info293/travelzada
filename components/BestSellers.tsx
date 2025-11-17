import Link from 'next/link'
import { travelPackages } from '@/data/package-data'

export default function BestSellers() {
  // Get first 4 packages as trending packages
  const trendingPackages = travelPackages.slice(0, 4)

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {trendingPackages.map((pkg) => (
          <Link
            key={pkg.id}
            href={`/destinations/${encodeURIComponent(pkg.destination)}/${pkg.id}`}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
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
              <h3 className="font-bold text-lg mb-1 line-clamp-1">{pkg.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{pkg.destination}</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{pkg.duration}</span>
                <span className="text-lg font-bold text-primary">{pkg.pricePerPerson}</span>
              </div>
              <p className="text-primary font-semibold text-sm hover:underline">
                View Details →
              </p>
            </div>
          </Link>
        ))}
      </div>
      
      <Link
        href="/destinations"
        className="inline-block bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors"
      >
        See Our Hand-Picked Best Sellers
      </Link>
    </div>
  )
}


