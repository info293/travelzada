import Link from 'next/link'

const ROWS = [
  {
    feature: 'Who they serve',
    agents: 'Everyone — families, groups, solo',
    otas: 'Everyone — flights, hotels, buses',
    tz: 'Couples only — honeymoons, anniversaries, romantic trips',
  },
  {
    feature: 'Planning speed',
    agents: '3–7 days for a quote',
    otas: 'Self-serve — hours of browsing',
    tz: 'AI itinerary in 60 seconds + human refinement',
  },
  {
    feature: 'Personalization',
    agents: 'Template packages, minor tweaks',
    otas: 'DIY — you build everything yourself',
    tz: 'Fully custom itinerary built around you as a couple',
  },
  {
    feature: 'Price transparency',
    agents: 'Lump-sum quote, markups hidden',
    otas: 'Per-item, no bundled breakdown',
    tz: 'Full split — hotels, transfers, activities, fees',
  },
  {
    feature: 'Support model',
    agents: 'Office hours, phone/email',
    otas: 'Chatbot + generic call center',
    tz: 'Dedicated planner on WhatsApp 24/7',
  },
  {
    feature: 'Decision experience',
    agents: '5–10 brochure packages',
    otas: '1000+ results to filter',
    tz: 'ONE curated itinerary, unlimited free edits',
  },
  {
    feature: 'Romantic experiences',
    agents: 'Rarely offered or extra cost',
    otas: 'Not available — hotels/flights only',
    tz: 'Candlelight dinners, couple spa, surprises included',
  },
]

// ⊖ icon for agents/OTAs
function NegIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="12" cy="12" r="10" stroke="#d1d5db" strokeWidth="1.5" />
      <path d="M8 12h8" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Filled check for Travelzada
function CheckIcon() {
  return (
    <span
      className="flex-none flex items-center justify-center rounded-full"
      style={{ width: 22, height: 22, background: '#4f46e5', marginTop: 2, flexShrink: 0 }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  )
}

export default function WhyTravelzada() {
  return (
    <section className="py-16 md:py-24 px-4" style={{ background: '#fff' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="text-xs font-bold tracking-[0.22em] uppercase mb-5"
            style={{ color: '#a08a6a' }}
          >
            Why Couples Are Switching
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(26px, 4.5vw, 56px)',
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#1a1a24',
              lineHeight: 1.15,
            }}
          >
            Travelzada vs Travel Agents vs OTAs
          </h2>
        </div>

        {/* Swipe hint — mobile only */}
        <p className="md:hidden text-xs text-center mb-3" style={{ color: '#9a9aa5' }}>
          ← Swipe to compare →
        </p>

        {/* Table wrapper */}
        <div className="relative overflow-x-auto">

          {/* "Loved by Couples" badge — floats above Travelzada column */}
          <div
            className="absolute right-0 flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold tracking-[0.1em] uppercase"
            style={{
              top: -18,
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              boxShadow: '0 6px 18px rgba(79,70,229,.35)',
              zIndex: 10,
              right: 0,
              width: 'fit-content',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
            </svg>
            Loved by Couples
          </div>

          <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '26%' }} />
            </colgroup>

            {/* Column headers */}
            <thead>
              <tr style={{ borderBottom: '1.5px solid #e5e7eb' }}>
                {/* Compare */}
                <th
                  style={{
                    padding: '16px 20px 16px 0',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#9a9aa5',
                  }}
                >
                  Compare
                </th>
                {/* Travel Agents */}
                <th
                  style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#6b6b76',
                  }}
                >
                  Travel Agents
                </th>
                {/* OTAs */}
                <th
                  style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#6b6b76',
                  }}
                >
                  OTAs
                </th>
                {/* Travelzada */}
                <th
                  style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    background: 'rgba(79,70,229,.04)',
                    borderRadius: '10px 10px 0 0',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Eye/brand icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#1a1a24',
                        fontFamily: 'var(--font-playfair), "Playfair Display", serif',
                      }}
                    >
                      Travelzada
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Rows */}
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid #f0ece5' }}
                >
                  {/* Feature label */}
                  <td
                    style={{
                      padding: '20px 20px 20px 0',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#1a1a24',
                      verticalAlign: 'top',
                    }}
                  >
                    {row.feature}
                  </td>

                  {/* Travel Agents */}
                  <td style={{ padding: '20px', verticalAlign: 'top' }}>
                    <span className="flex items-start gap-2">
                      <NegIcon />
                      <span style={{ fontSize: 14, color: '#9a9aa5', lineHeight: 1.55 }}>{row.agents}</span>
                    </span>
                  </td>

                  {/* OTAs */}
                  <td style={{ padding: '20px', verticalAlign: 'top' }}>
                    <span className="flex items-start gap-2">
                      <NegIcon />
                      <span style={{ fontSize: 14, color: '#9a9aa5', lineHeight: 1.55 }}>{row.otas}</span>
                    </span>
                  </td>

                  {/* Travelzada */}
                  <td
                    style={{
                      padding: '20px',
                      verticalAlign: 'top',
                      background: 'rgba(79,70,229,.04)',
                      borderLeft: '1px solid rgba(79,70,229,.1)',
                      borderRight: '1px solid rgba(79,70,229,.1)',
                    }}
                  >
                    <span className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span style={{ fontSize: 14, color: '#1a1a24', fontWeight: 500, lineHeight: 1.55 }}>{row.tz}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-14">
          <Link
            href="/case-study"
            className="inline-flex items-center justify-center font-semibold rounded-full transition-all hover:scale-105"
            style={{ background: '#fff', color: '#1a1a24', border: '1px solid #d8d2c6', fontSize: 14, padding: '15px 32px' }}
          >
            Read Case Studies
          </Link>
          <Link
            href="/tailored-travel"
            className="inline-flex items-center gap-2 justify-center text-white font-semibold rounded-full transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)', fontSize: 14, padding: '15px 32px', boxShadow: '0 10px 28px rgba(79,70,229,.3)' }}
          >
            Try AI Planner
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  )
}
