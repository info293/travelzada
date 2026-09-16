import Link from 'next/link'

const BREAKDOWN = [
  { label: 'Hotels (4★)', amount: 16000, pct: 42, color: '#4f46e5', icon: '🏨' },
  { label: 'Transfers',   amount: 7000,  pct: 18, color: '#0284c7', icon: '🚗' },
  { label: 'Activities',  amount: 8000,  pct: 21, color: '#d97706', icon: '⛵' },
  { label: 'Romantic',    amount: 4000,  pct: 11, color: '#ec4899', icon: '🌹' },
  { label: 'Service Fee', amount: 3000,  pct: 8,  color: '#64748b', icon: '🛡️' },
]

const TOTAL = BREAKDOWN.reduce((s, b) => s + b.amount, 0)

const GUARANTEES = [
  { label: 'No hidden charges', icon: '🛡️' },
  { label: "We'll match or beat any agent's price", icon: '🏷️' },
  { label: 'Free cancellation up to 30 days before', icon: '✨' },
]

export default function PricingBreakdown() {
  return (
    <section className="relative py-8 sm:py-12 bg-[#fbf9f6] overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] bg-gradient-to-tr from-indigo-100/40 via-amber-100/30 to-purple-100/40 blur-3xl pointer-events-none rounded-full" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8">

        {/* Top Header Pill */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-md border border-slate-800 backdrop-blur-md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>From first message to ready-to-book in under 60 seconds</span>
          </div>
        </div>

        {/* Outer Card Wrapper with Subtle Gradient Border */}
        <div className="p-[1px] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-200/90 via-slate-100 to-slate-200/80 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.06)]">
          <div className="bg-white rounded-[15px] sm:rounded-[23px] p-4 sm:p-6 relative overflow-hidden">
            
            {/* Card Header & Total Price */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>See exactly what you pay for</span>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
                  Kashmir Honeymoon <span className="text-slate-400 font-sans font-normal text-sm sm:text-base">· 6N / 7D</span>
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Sample cost breakdown — transparent pricing with zero hidden charges
                </p>
              </div>

              {/* Total Price Highlight Box */}
              <div className="sm:text-right bg-slate-50 px-4 py-2 sm:py-2.5 rounded-xl border border-slate-100 shrink-0">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                  Total / person
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-display leading-none">
                  ₹{TOTAL.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Segmented Progress Allocation Bar */}
            <div className="mt-3.5 mb-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span className="uppercase tracking-wider text-[10px]">Cost Allocation</span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded text-[10px] font-extrabold">100% Itemized</span>
              </div>

              {/* Multi-color bar */}
              <div className="flex overflow-hidden h-3 rounded-full bg-slate-100 p-0.5 gap-1 shadow-inner">
                {BREAKDOWN.map((b) => (
                  <div
                    key={b.label}
                    className="h-full rounded-full transition-all duration-500 hover:scale-105"
                    style={{
                      width: `${b.pct}%`,
                      backgroundColor: b.color,
                    }}
                    title={`${b.label}: ₹${b.amount.toLocaleString('en-IN')} (${b.pct}%)`}
                  />
                ))}
              </div>
            </div>

            {/* Breakdown Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 my-3">
              {BREAKDOWN.map((b) => (
                <div
                  key={b.label}
                  className="bg-slate-50/80 hover:bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/70 hover:border-slate-300 shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">{b.icon}</span>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {b.label}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-display">
                    ₹{b.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {b.pct}% of total
                  </div>
                </div>
              ))}
            </div>

            {/* Flight Exclusion Note & Guarantees Row */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-amber-50/90 border border-amber-200/70 px-3 py-1.5 rounded-lg">
                <span>✈</span>
                <span>Flights not included — booked separately by the couple.</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {GUARANTEES.map((g) => (
                  <div
                    key={g.label}
                    className="inline-flex items-center gap-1.5 bg-emerald-50/90 text-emerald-800 border border-emerald-200/70 px-3 py-1 rounded-full text-[11px] font-bold"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{g.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action CTA */}
            <div className="text-center pt-1">
              <Link
                href="/tailored-travel"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 rounded-full bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm transition-all duration-300 shadow-md hover:shadow-indigo-500/25 transform hover:-translate-y-0.5"
              >
                <span>Get Your Custom Itinerary in 60 Seconds</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <p className="text-[11px] font-medium text-slate-400 mt-1.5">
                Free. No commitment. No spam.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
