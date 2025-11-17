import Link from 'next/link'

const steps = [
  {
    title: 'Share your preferences',
    description: 'Tell us where you want to go, your dates, budget, and travel vibe.',
  },
  {
    title: 'AI creates the itinerary',
    description: 'Our planner instantly builds a complete schedule with hotels and must-dos.',
  },
  {
    title: 'Human planner refines it',
    description: 'A Travelzada expert reviews every detail so it’s ready to book.',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-20 px-4 md:px-8 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">How It Works</h2>
        <p className="text-gray-600 mb-12">
          Planning your dream trip is as easy as 1, 2, 3 with our intelligent platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {steps.map((step, index) => (
            <div key={step.title} className="bg-cream rounded-2xl p-6 text-left border border-white shadow-sm">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white font-semibold mb-4">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>

        <Link
          href="/ai-planner"
          className="inline-flex items-center justify-center bg-primary text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          PLAN MY TRIP
        </Link>
      </div>
    </section>
  )
}

