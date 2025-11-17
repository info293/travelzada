const states = [
  {
    name: 'Rajasthan',
    description: 'Palatial stays, desert flying dinners, vintage car convoys.',
    image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e?w=900&q=80',
    tag: 'Royal Circuits',
  },
  {
    name: 'Goa',
    description: 'Private villas, beach clubs, catamarans & chef’s tables.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',
    tag: 'Coastal Escapes',
  },
  {
    name: 'Kerala',
    description: 'Backwater couture cruises, Ayurvedic journeys, spice estates.',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=900&q=80',
    tag: 'Slow Travel',
  },
  {
    name: 'Himachal Pradesh',
    description: 'Himalayan lodges, heliskiing, and mindful mountain ateliers.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
    tag: 'Mountain Retreats',
  },
]

export default function ExploreIndia() {
  return (
    <section className="py-18 md:py-24 px-4 md:px-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.5em] text-gray-400 mb-3">India, Reimagined</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            Curated state circuits by Travelzada ateliers
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            From heritage palaces to barefoot luxury islands, each circuit is designed with private charters, butlers, and immersive storytelling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {states.map((state, index) => (
            <div
              key={state.name}
              className="relative rounded-[28px] overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
            >
              <div
                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url(${state.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10"></div>
              </div>
              <div className="relative z-10 p-8 md:p-10 flex flex-col justify-between h-full min-h-[360px] text-white">
                <div className="space-y-4">
                  <span className="inline-flex bg-white/15 px-3 py-1 rounded-full text-xs tracking-wide uppercase">
                    {state.tag}
                  </span>
                  <h3 className="text-3xl font-semibold">{state.name}</h3>
                  <p className="text-sm md:text-base text-white/80">{state.description}</p>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-white/20 mt-6 text-sm">
                  <p className="text-white/80">3 signature ateliers • 2 pilot routes</p>
                  <button className="text-white font-semibold flex items-center gap-2">
                    Explore Now
                    <span className="text-lg">→</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


