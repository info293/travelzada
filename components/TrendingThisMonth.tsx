import Link from 'next/link'

const destinations = [
  {
    name: 'Bali + Nusa Penida circuit',
    snippet: 'Private villas, volcano picnics, modular yachts',
    price: '₹2.3L',
    length: '7 Nights',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=80',
  },
  {
    name: 'Maldives private island collective',
    snippet: 'Seaplanes, overwater estates, coral nursery dives',
    price: '₹4.8L',
    length: '5 Nights',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
  },
  {
    name: 'Côte d’Azur to Amalfi sabbatical',
    snippet: 'Palazzo stays, chef’s tables, superyacht sunsets',
    price: '₹6.2L',
    length: '9 Nights',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&q=80',
  },
]

export default function TrendingThisMonth() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-12 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.6em] text-gray-400 mb-3">Popular now</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
              Signature routes the atelier is crafting this month.
            </h2>
          </div>
          <Link
            href="/destinations"
            className="text-primary font-semibold flex items-center gap-2 hover:gap-3 transition-all"
          >
            View all destinations
            <span>→</span>
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {destinations.map((destination) => (
            <Link
              key={destination.name}
              href={`/destinations/${encodeURIComponent(destination.name.split(' ')[0])}`}
              className="group flex flex-col md:flex-row items-center gap-4 bg-white border border-gray-100 rounded-[32px] p-4 md:p-6 hover:border-primary/30 hover:shadow-2xl transition-all"
            >
              <div className="w-full md:w-56 h-48 md:h-40 rounded-[28px] overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex-1 flex flex-col md:flex-row md:items-center w-full gap-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.4em] text-primary mb-2">Travelzada Atelier</p>
                  <h3 className="text-2xl font-semibold text-gray-900">{destination.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{destination.snippet}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{destination.length}</p>
                  <p className="text-3xl font-bold text-gray-900">{destination.price}</p>
                  <p className="text-sm text-green-600 font-semibold mt-1">⭐ {destination.rating} / guest rating</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

