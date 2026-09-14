'use client'

import React from 'react'
import Image from 'next/image'

const HOTEL_LOGOS = [
  { name: 'Taj Hotels & Resorts', src: '/logs/Taj.webp' },
  { name: 'The Oberoi Group', src: '/logs/Oberoi.webp' },
  { name: 'The Leela Palaces', src: '/logs/Leela.png' },
  { name: 'ITC Hotels', src: '/logs/ITC.webp' },
  { name: 'Marriott International', src: '/logs/Mariott.webp' },
  { name: 'Aman Resorts', src: '/logs/Aman.jpg' },
  { name: 'Radisson Hotels', src: '/logs/Radisson.jpg' },
  { name: 'The Lalit Hotels', src: '/logs/Lalit.png' },
  { name: 'Ananta Hotels & Resorts', src: '/logs/Ananta.avif' },
  { name: 'Brij Hotels', src: '/logs/Brij.png' },
  { name: 'The Fern Hotels', src: '/logs/Fern.png' },
  { name: 'Paatlidun Safari Lodge', src: '/logs/Paatlidun.png' },
]

export default function PartnerLogos() {
  // Duplicate list to create a seamless infinite loop
  const logosList = [...HOTEL_LOGOS, ...HOTEL_LOGOS]

  return (
    <section className="py-14 md:py-18 bg-white border-y border-slate-100 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-800 text-xs font-bold uppercase tracking-[0.2em] mb-3 border border-amber-500/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
            </svg>
            Luxury Hospitality Partners
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-display mb-3 leading-tight">
            Stay at World-Class Luxury Hotels & Resorts
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            We partner with renowned hospitality brands, heritage palaces, and boutique luxury resorts to deliver extraordinary honeymoon & getaway experiences.
          </p>
        </div>

        {/* Infinite Auto-Play Marquee Carousel */}
        <div className="relative w-full overflow-hidden py-4 group">
          {/* Left & Right Gradient Fade Overlays */}
          <div className="absolute left-0 top-0 z-20 h-full w-20 sm:w-32 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 z-20 h-full w-20 sm:w-32 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none" />

          {/* Scrolling Marquee Container */}
          <div className="flex w-max gap-4 sm:gap-6 animate-[marquee_35s_linear_infinite] group-hover:[animation-play-state:paused]">
            {logosList.map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className="flex-none w-[180px] sm:w-[210px] bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col items-center justify-center h-28 sm:h-32 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 cursor-pointer"
              >
                <div className="relative w-full h-14 flex items-center justify-center">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={140}
                    height={70}
                    className="max-h-12 sm:max-h-14 w-auto object-contain transition-all duration-300 group-hover:scale-105"
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 mt-2 truncate w-full text-center hover:text-amber-800 transition-colors">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

