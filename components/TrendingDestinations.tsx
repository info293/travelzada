const destinations = [
  {
    name: 'Bali',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',
  },
  {
    name: 'Singapore',
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80',
  },
  {
    name: 'Thailand',
    image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80',
  },
  {
    name: 'Maldives',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  },
]

export default function TrendingDestinations() {
  return (
    <section className="py-20 px-4 md:px-8 lg:px-12 bg-cream">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-10">Trending Destinations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((destination) => (
            <div key={destination.name} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
              <div
                className="h-48 bg-cover bg-center"
                style={{ backgroundImage: `url(${destination.image})` }}
              ></div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-ink mb-2">{destination.name}</h3>
                <a href="/ai-trip-planner" className="text-primary font-semibold">
                  Plan with AI →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


