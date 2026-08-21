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

    </>
  )
}

