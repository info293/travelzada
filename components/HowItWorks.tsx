import Link from 'next/link'

const steps = [
  {
    num: '1',
    title: 'Share Your Honeymoon Preferences',
    desc: 'Destination, dates, budget, and trip type. Takes just 60 seconds.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a08a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    num: '2',
    title: 'AI Builds Your Personalized Itinerary',
    desc: 'A custom day-by-day plan — hotels, activities, romantic add-ons, transfers.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a08a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      </svg>
    ),
  },
  {
    num: '3',
    title: 'Your Dedicated Planner Perfects It',
    desc: 'A real expert refines every detail and connects on WhatsApp. No payment until you love it.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a08a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 000 8z" />
      </svg>
    ),
  },
  {
    num: '4',
    title: 'See Exactly What You Pay For',
    desc: 'Complete cost breakdown — hotels, transfers, activities, fees. No hidden charges.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a08a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" />
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <section
      id="how"
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#faf8f5,#f3f0ea 55%,#faf8f5)', padding: '88px 24px' }}
    >
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(26,26,36,.08) 1.4px, transparent 1.5px)',
          backgroundSize: '26px 26px',
          opacity: 0.55,
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: '#a08a6a' }}>Simple Process</div>
          <h2
            className="mb-3"
            style={{ margin: '0 0 12px', fontSize: 'clamp(28px,4vw,42px)', fontFamily: "'Playfair Display', serif", fontWeight: 600, letterSpacing: '-0.01em', color: '#1a1a24' }}
          >
            How We Plan Your Customized Honeymoon Package
          </h2>
          <p style={{ margin: 0, fontSize: 17, color: '#6b6b76' }}>
            Four steps from a single message to a trip that&rsquo;s ready to book.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line — visible on md+ */}
          <div
            className="hidden md:block absolute"
            style={{
              top: 40,
              left: '12.5%',
              right: '12.5%',
              height: 2,
              background: 'linear-gradient(90deg, #e0d9cc, #c9bce6 50%, #e0d9cc)',
            }}
          />

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-9">
            {steps.map((s) => (
              <div key={s.num} className="text-center flex flex-col items-center">
                {/* Number circle */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-5 relative z-10"
                  style={{ background: '#fff', border: '2px solid #e0d9cc', boxShadow: '0 8px 24px rgba(26,26,36,.08)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)', boxShadow: '0 4px 12px rgba(79,70,229,.4)' }}
                  >
                    {s.num}
                  </div>
                </div>

                {/* Icon box */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: '#f3f0ea', border: '1px solid #e9e3d8' }}
                >
                  {s.icon}
                </div>

                <h3
                  className="mb-2 leading-snug"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: '#1a1a24' }}
                >
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, color: '#6b6b76', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            href="/tailored-travel"
            className="inline-flex items-center gap-2 text-white font-semibold rounded-full transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)', fontSize: 15, padding: '16px 36px', boxShadow: '0 12px 32px rgba(79,70,229,.35)' }}
          >
            Plan My Trip
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  )
}
