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
      {/* ── COMPACT HERO ── */}
      <section className="relative flex items-center justify-center text-center overflow-hidden" style={{ paddingTop: '85px', paddingBottom: '20px' }}>

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
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(18,16,28,.65) 0%, rgba(18,16,28,.45) 50%, rgba(18,16,28,.75) 100%)' }} />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 mb-3">
            <span className="w-6 h-px bg-white/50" />
            <span className="text-white text-[11px] font-semibold tracking-[0.2em] uppercase">Couples Only · Expert-Refined</span>
            <span className="w-6 h-px bg-white/50" />
          </div>

          {/* Headline */}
          <h1
            className="text-white font-[var(--font-playfair)]"
            style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4.8vw, 50px)', lineHeight: 1.1, fontWeight: 500, letterSpacing: '-0.01em' }}
          >
            Honeymoon journeys,<br />
            designed only <em style={{ color: '#e9d5ff' }}>for two.</em>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-3 text-white font-medium leading-relaxed" style={{ maxWidth: 460, fontSize: 'clamp(13px, 2.5vw, 16px)', color: '#ffffff' }}>
            Your perfect romantic trip across India and the world — planned in 60 seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            <Link
              href="/destinations"
              className="font-semibold text-white rounded-lg transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)', fontSize: 14, padding: '12px 28px', boxShadow: '0 10px 25px rgba(79,70,229,.4)', letterSpacing: '.01em' }}
            >
              Explore Packages
            </Link>
            <Link
              href="/tailored-travel"
              className="font-semibold text-white rounded-lg backdrop-blur-sm transition-all border border-white/45 hover:bg-white/20"
              style={{ background: 'rgba(255,255,255,.1)', fontSize: 14, padding: '12px 28px', letterSpacing: '.01em' }}
            >
              Plan My Trip with AI
            </Link>
          </div>

          {/* Quick search */}
          <form onSubmit={handleSearch} className="mt-5 flex items-center bg-white rounded-2xl shadow-xl overflow-hidden p-1.5 gap-2 max-w-md mx-auto">
            <div className="flex items-center gap-2 flex-1 px-3">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where do you want to go?"
                className="flex-1 text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent py-2"
              />
            </div>
            <button
              type="submit"
              className="text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#9333ea,#4f46e5)' }}
            >
              Plan My Trip
            </button>
          </form>
        </div>
      </section>
    </>
  )
}
