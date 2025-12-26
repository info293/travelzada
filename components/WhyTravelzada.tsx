import Link from 'next/link'

const features = [
  {
    title: 'One itinerary, not twenty',
    description: 'We send one perfect plan so you never shift through endless options.',
  },
  {
    title: 'Clear reasoning',
    description: 'Every recommendation comes with the why—so you can decide with confidence.',
  },
  {
    title: 'AI + human touch',
    description: 'Smart automation paired with a real planner to personalize every detail.',
  },
]

export default function WhyTravelzada() {
  const icons = [
    <svg key="0" className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>,
    <svg key="1" className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>,
    <svg key="2" className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>,
  ]

  return (
    <section className="py-12 md:py-24 px-4 md:px-8 lg:px-12 bg-white relative overflow-hidden">
      {/* Decorative background - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 opacity-5">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-block mb-3 md:mb-4">
          <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-primary font-semibold">Why Choose Us</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-ink mb-4 md:mb-6">
          Why Travelzada
        </h2>
        <p className="text-base md:text-lg text-gray-600 mb-8 md:mb-16 max-w-2xl mx-auto px-4">
          Experience the perfect blend of AI intelligence and human expertise
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-gradient-to-br from-cream to-white rounded-2xl md:rounded-3xl p-5 md:p-8 text-left border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary to-primary-dark rounded-xl md:rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                {icons[index]}
              </div>
              <h3 className="text-base md:text-lg font-semibold text-ink mb-2 md:mb-3">{feature.title}</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/case-study"
            className="inline-flex items-center justify-center bg-white text-primary border-2 border-primary px-6 md:px-10 py-4 md:py-5 rounded-full text-sm md:text-base font-semibold shadow-md hover:bg-purple-50 hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            READ CASE STUDIES
          </Link>

          <Link
            href="/ai-planner"
            className="inline-flex items-center justify-center bg-primary text-white px-6 md:px-10 py-4 md:py-5 rounded-full text-sm md:text-base font-semibold shadow-xl hover:bg-primary-dark hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            TRY AI PLANNER
            <svg className="w-4 h-4 md:w-5 md:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
