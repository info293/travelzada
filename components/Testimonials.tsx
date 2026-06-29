import TestimonialsClient from './TestimonialsClient'

export default function Testimonials() {
  return (
    <section
      id="reviews"
      className="relative overflow-hidden"
      style={{ background: '#faf8f5', padding: '96px 24px' }}
    >
      <div className="relative z-10 max-w-5xl mx-auto">

        <div className="text-center mb-12">
          <div
            className="inline-block text-xs font-medium tracking-[0.22em] uppercase mb-5 px-4 py-1.5 rounded-full"
            style={{ color: '#7c3aed', background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.18)' }}
          >
            Customer Testimonials
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 4vw, 52px)',
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#1a1a24',
              lineHeight: 1.1,
            }}
          >
            Real Stories from Real Couples
          </h2>
        </div>

        <TestimonialsClient />

      </div>
    </section>
  )
}
