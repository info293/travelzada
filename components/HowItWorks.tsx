import Link from 'next/link'

const steps = [
  {
    num: '01',
    title: 'Share Your Honeymoon Preferences',
    desc: 'Destination, dates, budget, and trip type. Takes just 60 seconds.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'AI Builds Your Personalized Itinerary',
    desc: 'A custom day-by-day plan — hotels, activities, romantic add-ons, transfers.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Your Dedicated Planner Perfects It',
    desc: 'A real expert refines every detail and connects on WhatsApp. No payment until you love it.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    num: '04',
    title: 'See Exactly What You Pay For',
    desc: 'Complete cost breakdown — hotels, transfers, activities, fees. No hidden charges.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="relative py-16 sm:py-24 bg-[#fbf9f6] overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-indigo-100/40 via-amber-100/30 to-purple-100/40 blur-3xl pointer-events-none rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold tracking-[0.2em] uppercase mb-3 shadow-sm">
            Simple Process
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-display tracking-tight mb-3 leading-tight">
            How We Plan Your Customized Honeymoon Package
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Four steps from a single message to a trip that&rsquo;s ready to book.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((s, idx) => (
            <div
              key={s.num}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
            >
              {/* Top Row: Number pill & Icon */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black tracking-wider">
                    STEP {s.num}
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 group-hover:bg-indigo-600 text-white flex items-center justify-center transition-colors duration-300 shadow-md">
                    {s.icon}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 font-display mb-2.5 leading-snug group-hover:text-indigo-600 transition-colors">
                  {s.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal">
                  {s.desc}
                </p>
              </div>

              {/* Step indicator dot at bottom */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Phase {idx + 1} of 4</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3].map((stepIdx) => (
                    <div
                      key={stepIdx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        stepIdx === idx
                          ? 'w-5 bg-indigo-600'
                          : 'w-1.5 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action CTA */}
        <div className="text-center mt-14 sm:mt-16">
          <Link
            href="/tailored-travel"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-slate-900 hover:bg-indigo-600 text-white font-bold text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 transform hover:-translate-y-0.5"
          >
            <span>Plan My Trip</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  )
}
