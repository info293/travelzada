'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const HERO_VIDEO_ONLINE = 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-beach-with-blue-water-1606-large.mp4'

export default function Hero() {
  const [destination, setDestination] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = destination.trim()
    router.push(q ? `/tailored-travel?destination=${encodeURIComponent(q)}` : '/tailored-travel')
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center text-center overflow-hidden" style={{ padding: 'clamp(80px,15vw,120px) 20px clamp(40px,8vw,60px)' }}>

        {/* Background video */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/images/home/homepage.jpg"
            className="w-full h-full object-cover"
            style={{ animation: 'tzken 18s ease-in-out infinite alternate' }}
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
            <source src={HERO_VIDEO_ONLINE} type="video/mp4" />
          </video>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(18,16,28,.55) 0%, rgba(18,16,28,.42) 45%, rgba(18,16,28,.66) 100%)' }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-3.5 mb-8">
            <span className="w-8 h-px bg-white/50" />
            <span className="text-white text-xs font-semibold tracking-[0.22em] uppercase">Couples Only · Expert-Refined</span>
            <span className="w-8 h-px bg-white/50" />
          </div>

          {/* Headline */}
          <h1
            className="text-white font-[var(--font-playfair)]"
            style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 7vw, 76px)', lineHeight: 1.08, fontWeight: 500, letterSpacing: '-0.01em' }}
          >
            Honeymoon journeys,<br />
            designed only <em style={{ color: '#e9d5ff' }}>for two.</em>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-7 text-white/80 leading-relaxed" style={{ maxWidth: 520, fontSize: 'clamp(15px, 4vw, 19px)', fontWeight: 400 }}>
            Your perfect romantic trip across India and the world — planned in 60 seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3.5 mt-10 justify-center">
            <Link
              href="/destinations"
              className="font-semibold text-white rounded-lg transition-all"
              style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)', fontSize: 15, padding: '17px 36px', boxShadow: '0 16px 40px rgba(79,70,229,.45)', letterSpacing: '.01em' }}
            >
              Explore Packages
            </Link>
            <Link
              href="/tailored-travel"
              className="font-semibold text-white rounded-lg backdrop-blur-sm transition-all border border-white/45"
              style={{ background: 'rgba(255,255,255,.1)', fontSize: 15, padding: '17px 36px', letterSpacing: '.01em' }}
            >
              Plan My Trip with AI
            </Link>
          </div>

          {/* Quick search */}
          <form onSubmit={handleSearch} className="mt-8 flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden p-1.5 gap-2 max-w-lg mx-auto">
            <div className="flex items-center gap-2 flex-1 px-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where do you want to go?"
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent py-2.5"
              />
            </div>
            <button
              type="submit"
              className="text-white px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all"
              style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)' }}
            >
              Plan My Trip
            </button>
          </form>
        </div>

        {/* Scroll indicator */}
        <div className="absolute left-1/2 bottom-8 -translate-x-1/2 z-10 flex flex-col items-center gap-2" style={{ color: 'rgba(255,255,255,.6)' }}>
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase">Scroll</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <div style={{ background: '#1a1a24', color: '#fff', padding: '36px 0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">

            <div className="flex items-start gap-3 pt-4 md:pt-0 md:px-6 first:pt-0 first:md:pl-0 last:md:pr-0">
              <div className="flex-none w-10 h-10 rounded-full flex items-center justify-center border border-indigo-300/35" style={{ background: 'rgba(99,102,241,.16)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">AI + Human</div>
                <div className="text-xs mt-0.5 text-white/50 leading-snug">Smart plans, expert-refined</div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-4 md:pt-0 md:px-6">
              <div className="flex-none w-10 h-10 rounded-full flex items-center justify-center border border-amber-300/40" style={{ background: 'rgba(160,138,106,.16)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#c7b48a">
                  <path d="M12 21s-7-4.5-9.5-8.5C.5 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5.5 3.5 3.5 7C19 16.5 12 21 12 21z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Couples Only</div>
                <div className="text-xs mt-0.5 text-white/50 leading-snug">Designed for two, always</div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-4 md:pt-0 md:px-6">
              <div className="flex-none w-10 h-10 rounded-full flex items-center justify-center border border-indigo-300/35" style={{ background: 'rgba(99,102,241,.16)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Clear Pricing</div>
                <div className="text-xs mt-0.5 text-white/50 leading-snug">Full breakdown, no markups</div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-4 md:pt-0 md:px-6">
              <div className="flex-none w-10 h-10 rounded-full flex items-center justify-center border border-indigo-300/35" style={{ background: 'rgba(99,102,241,.16)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">24/7 Support</div>
                <div className="text-xs mt-0.5 text-white/50 leading-snug">A real planner on WhatsApp</div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-4 md:pt-0 md:px-6">
              <div className="flex-none w-10 h-10 rounded-full flex items-center justify-center border border-indigo-300/35" style={{ background: 'rgba(99,102,241,.16)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Free Edits</div>
                <div className="text-xs mt-0.5 text-white/50 leading-snug">Tweak it until it's perfect</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
