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
  return (
    <section className="py-16 md:py-20 bg-white border-y border-gray-100 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            Luxury Hospitality Partners
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            Stay at World-Class Luxury Hotels & Resorts
          </h2>
          <p className="text-sm md:text-base text-gray-600 leading-relaxed">
            We partner with renowned hospitality brands, heritage palaces, and boutique luxury resorts to deliver extraordinary honeymoon & getaway experiences.
          </p>
        </div>

        {/* Logos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 items-center">
          {HOTEL_LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="group relative bg-gray-50/80 hover:bg-white border border-gray-200/80 hover:border-primary/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center h-28 sm:h-32 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer"
            >
              <div className="relative w-full h-16 flex items-center justify-center">
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={140}
                  height={70}
                  className="max-h-12 sm:max-h-14 w-auto object-contain transition-all duration-300 group-hover:scale-110"
                />
              </div>
              <span className="text-[11px] font-bold text-gray-700 mt-2 truncate w-full text-center group-hover:text-primary transition-colors">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
