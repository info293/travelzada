import Link from 'next/link'

export default function Hero() {
  return (
    <section className="w-full bg-cream pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            Plan your perfect trip in seconds
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            One best itinerary made just for you. Share your preferences and we’ll deliver a ready-to-book plan.
          </p>
          <Link
            href="/ai-planner"
            className="inline-flex items-center justify-center bg-primary text-white px-8 py-4 rounded-full text-sm font-semibold shadow hover:bg-primary-dark transition-colors"
          >
            START PLANNING WITH AI
          </Link>
        </div>

        <div className="relative">
          <div className="h-96 rounded-3xl overflow-hidden shadow-lg border border-white">
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80"
              alt="Beach resort"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 bg-white shadow-lg rounded-xl px-6 py-4 text-sm font-medium text-ink">
            Trusted by 5,000+ travelers
          </div>
        </div>
      </div>
    </section>
  )
}

