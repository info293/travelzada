const perks = ['Dedicated lifestyle concierge', 'Helicopter & yacht charters', 'Private culinary experiences']

export default function SummerDeals() {
  return (
    <section className="py-16 md:py-24 px-4 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#09161d] via-[#0f2d3d] to-[#051018] text-white border border-white/10 shadow-[0_40px_80px_-60px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 opacity-30">
            <img
              src="https://images.unsplash.com/photo-1439459613302-18929faaef7b?w=1400&q=80"
              alt="Luxury escape"
              className="w-full h-full object-cover mix-blend-luminosity"
            />
          </div>
          <div className="relative z-10 grid md:grid-cols-[1.1fr,0.9fr] gap-10 p-8 md:p-14">
            <div>
              <p className="text-sm uppercase tracking-[0.6em] text-white/70 mb-4">Summer Atelier 2025</p>
              <h2 className="text-3xl md:text-5xl font-semibold leading-tight mb-6">
                Escape to curated sanctuaries across the Mediterranean & Indian Ocean.
              </h2>
              <p className="text-white/80 text-lg md:text-xl mb-8 max-w-2xl">
                Save up to <span className="text-primary font-semibold">20%</span> on villa buy-outs, private island charters, and multi-country sabbaticals when you book this season.
              </p>
              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                {perks.map((perk) => (
                  <div key={perk} className="flex items-start gap-3">
                    <span className="text-primary text-xl">✦</span>
                    <p className="text-sm text-white/80">{perk}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <button className="bg-white text-gray-900 px-8 py-3 rounded-2xl font-semibold shadow-lg hover:-translate-y-0.5 transition-transform">
                  Reserve with Concierge
                </button>
                <button className="border border-white/40 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white/10 transition">
                  Explore Tailored Routes
                </button>
              </div>
            </div>
            <div className="bg-white/5 border border-white/15 rounded-3xl p-6 flex flex-col gap-6 backdrop-blur-md">
              <div>
                <p className="text-sm text-white/60 mb-1">Average Saving</p>
                <p className="text-4xl font-semibold">₹2.4L</p>
                <p className="text-white/70 text-sm">on curated 7-night itineraries</p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Popular Routes</p>
                <ul className="space-y-2 text-white/90 text-sm">
                  <li>• Amalfi Coast • Côte d’Azur • Santorini</li>
                  <li>• Maldives private island collective</li>
                  <li>• Rajasthan palaces & Himalayan retreats</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-sm">
                <p className="text-white/70 mb-2">Only 9 ateliers remain this season.</p>
                <p className="text-white font-semibold">Priority access closes on 30 June.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


