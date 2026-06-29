import Link from 'next/link'

export default function PromiseBanner() {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: 520 }}>

      {/* Background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1800&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      />

      {/* Dark teal overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(10,40,40,.55) 0%, rgba(8,32,34,.72) 100%)' }}
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-6"
        style={{ minHeight: 520, padding: '80px 24px' }}
      >
        {/* Label */}
        <div className="flex items-center gap-3 mb-7">
          <span className="block h-px w-8" style={{ background: 'rgba(255,255,255,.45)' }} />
          <span
            className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: 'rgba(255,255,255,.7)' }}
          >
            The Travelzada Promise
          </span>
          <span className="block h-px w-8" style={{ background: 'rgba(255,255,255,.45)' }} />
        </div>

        {/* Headline */}
        <h2
          style={{
            margin: '0 0 22px',
            fontSize: 'clamp(24px, 6vw, 58px)',
            fontFamily: 'var(--font-playfair), "Playfair Display", serif',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            maxWidth: 700,
          }}
        >
          Your honeymoon should feel like
          <br />
          the{' '}
          <em style={{ color: '#c4b5fd', fontStyle: 'italic', fontWeight: 500 }}>
            first day of forever.
          </em>
        </h2>

        {/* Subtitle */}
        <p
          style={{
            margin: '0 0 40px',
            fontSize: 17,
            color: 'rgba(255,255,255,.72)',
            lineHeight: 1.7,
            maxWidth: 520,
          }}
        >
          No endless tabs. No hard sell. Just one beautiful, expert-crafted
          plan — and a dedicated human who answers when you message.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/tailored-travel"
            className="font-bold text-white rounded-xl transition-all hover:opacity-90 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              fontSize: 15,
              padding: '17px 36px',
              boxShadow: '0 10px 32px rgba(79,70,229,.45)',
            }}
          >
            Start Planning — It&apos;s Free
          </Link>
          <Link
            href="/reviews"
            className="font-bold rounded-xl transition-all hover:bg-white hover:text-gray-900"
            style={{
              background: 'transparent',
              color: '#fff',
              fontSize: 15,
              padding: '16px 36px',
              border: '1.5px solid rgba(255,255,255,.55)',
            }}
          >
            Read Couple Stories
          </Link>
        </div>
      </div>

    </section>
  )
}
