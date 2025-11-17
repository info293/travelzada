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
    <section className="py-24 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-white via-cream/30 to-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-block mb-4">
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Simple Process</span>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-ink mb-6">
          How It Works
        </h2>
        <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto">
          Planning your dream trip is as easy as 1, 2, 3 with our intelligent platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20"></div>
          
          {steps.map((step, index) => (
            <div 
              key={step.title} 
              className="relative bg-white rounded-3xl p-8 text-left border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
            >
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-ink mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <Link
          href="/ai-planner"
          className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-full text-base font-semibold shadow-xl hover:bg-primary-dark hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          PLAN MY TRIP
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </section>
  )
}

