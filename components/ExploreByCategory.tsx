const categories = [
  {
    title: 'Beach Paradise',
    description: 'Relax and unwind.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  },
  {
    title: 'Urban Exploration',
    description: 'Discover the city lights.',
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&q=80',
  },
  {
    title: 'Mountain Adventures',
    description: 'Hike to new heights.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  },
  {
    title: 'Cultural Journeys',
    description: 'Explore ancient wonders.',
    image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e?w=400&q=80',
  },
  {
    title: 'Charming Towns',
    description: 'Wander and get lost.',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80',
  },
]

export default function ExploreByCategory() {
  return (
    <section className="py-16 md:py-20 px-4 md:px-8 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Explore by Category
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover destinations tailored to your travel style
          </p>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((category, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-72 h-56 rounded-2xl overflow-hidden relative group cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${category.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/80 transition-colors"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="font-bold text-xl mb-2">{category.title}</h3>
                <p className="text-sm text-white/90">{category.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

