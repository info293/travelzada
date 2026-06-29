import Link from 'next/link'

const BREAKDOWN = [
  { label: 'Hotels (4★)', amount: 16000, pct: 42, color: '#3730a3' },
  { label: 'Transfers',   amount: 7000,  pct: 18, color: '#4f46e5' },
  { label: 'Activities',  amount: 8000,  pct: 21, color: '#818cf8' },
  { label: 'Romantic',    amount: 4000,  pct: 11, color: '#c7b48a' },
  { label: 'Service Fee', amount: 3000,  pct: 8,  color: '#d9d4c7' },
]

const TOTAL = BREAKDOWN.reduce((s, b) => s + b.amount, 0)

const GUARANTEES = [
  'No hidden charges',
  "We'll match or beat any agent's price",
  'Free cancellation up to 30 days before',
]

export default function PricingBreakdown() {
  return (
    <section
      style={{
        background: '#faf8f5',
        padding: '80px 24px 96px',
        backgroundImage:
          'radial-gradient(circle, rgba(26,26,36,.06) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      <div className="max-w-4xl mx-auto">

        {/* Top pill */}
        <div className="flex justify-center mb-10">
          <div
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full"
            style={{ background: '#fff', border: '1px solid #e9e5dd', boxShadow: '0 2px 12px rgba(26,26,36,.06)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#4f46e5' }}>
              From first message to ready-to-book in under 60 seconds
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: 'clamp(24px, 6vw, 40px) clamp(20px, 6vw, 44px)',
            boxShadow: '0 8px 40px rgba(26,26,36,.1)',
          }}
        >
          {/* Card top row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: '#f3f0ea', fontSize: 12.5, fontWeight: 600, color: '#1a1a24' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              See exactly what you pay for
            </div>
            <div className="sm:text-right">
              <div style={{ fontSize: 12, color: '#9a9aa5', marginBottom: 2 }}>Total / person</div>
              <div
                style={{
                  fontFamily: 'var(--font-playfair), "Playfair Display", serif',
                  fontSize: 'clamp(26px, 7vw, 36px)',
                  fontWeight: 700,
                  color: '#4f46e5',
                  lineHeight: 1,
                }}
              >
                ₹{TOTAL.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Package name */}
          <h3
            style={{
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontSize: 26,
              fontWeight: 700,
              color: '#1a1a24',
              margin: '14px 0 4px',
            }}
          >
            Kashmir Honeymoon · 6N / 7D
          </h3>
          <p style={{ margin: '0 0 24px', fontSize: 13.5, color: '#9a9aa5' }}>
            Sample cost breakdown — no hidden charges
          </p>

          {/* Segmented bar */}
          <div
            className="flex overflow-hidden mb-6"
            style={{ height: 14, borderRadius: 99, gap: 2 }}
          >
            {BREAKDOWN.map((b) => (
              <div
                key={b.label}
                style={{
                  width: `${b.pct}%`,
                  background: b.color,
                  borderRadius: 99,
                  transition: 'width .4s ease',
                }}
              />
            ))}
          </div>

          {/* Breakdown items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-5 gap-x-4 mb-6">
            {BREAKDOWN.map((b) => (
              <div key={b.label}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="flex-none rounded-full"
                    style={{ width: 10, height: 10, background: b.color }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a24' }}>{b.label}</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b6b76', paddingLeft: 16 }}>
                  ₹{b.amount.toLocaleString('en-IN')} · {b.pct}%
                </div>
              </div>
            ))}
          </div>

          {/* Flights note */}
          <p style={{ fontSize: 13, color: '#9a9aa5', margin: '0 0 20px' }}>
            ✈ Flights not included — booked separately by the couple.
          </p>

          <div style={{ height: 1, background: '#e9e5dd', margin: '0 0 20px' }} />

          {/* Guarantees */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mb-7">
            {GUARANTEES.map((g) => (
              <div key={g} className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span style={{ fontSize: 13, color: '#1a1a24', fontWeight: 500 }}>{g}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/tailored-travel"
            className="block w-full text-center font-bold text-white rounded-xl transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
              padding: '18px 24px',
              fontSize: 16,
              letterSpacing: '.01em',
              boxShadow: '0 10px 30px rgba(79,70,229,.35)',
            }}
          >
            Get Your Custom Itinerary in 60 Seconds
          </Link>
          <p className="text-center mt-3" style={{ fontSize: 13, color: '#9a9aa5' }}>
            Free. No commitment. No spam.
          </p>
        </div>

      </div>
    </section>
  )
}
