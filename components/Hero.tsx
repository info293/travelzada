'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'

// Free travel stock video (Mixkit). Drop your own at /public/videos/hero-bg.mp4 to override.
const HERO_VIDEO_ONLINE = 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-beach-with-blue-water-1606-large.mp4'

interface HeroSlide {
  image: string
  link: string
  alt: string
  label?: string
}

const popularDestinations = ['Bali', 'Maldives', 'Rajasthan', 'Manali', 'Dubai']

function LocationPin() {
  return (
    <svg className="w-3 h-3 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
  )
}

export default function Hero() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [destination, setDestination] = useState('')
  const router = useRouter()

  const defaultSlide: HeroSlide = {
    image: '/images/home/homepage.jpg',
    link: '/destinations',
    alt: 'Travelzada premium vacation destinations and beautiful travel spots',
    label: 'Explore the World',
  }

  useEffect(() => {
    const fetchPackages = async () => {
      if (typeof window === 'undefined' || !db) return
      try {
        const packagesRef = collection(db, 'packages')
        const packagesSnapshot = await getDocs(packagesRef)
        const validSlides: HeroSlide[] = []

        packagesSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.Primary_Image_URL) {
            const cleanUrl = data.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
            if (cleanUrl) {
              const destinationSlug = (data.Destination_Name || '').split(',')[0].trim().toLowerCase()
              const packageId = data.Destination_ID || doc.id || 'package'
              const label = data.Destination_Name
                ? data.Destination_Name.split(',')[0].trim()
                : 'Beautiful Destination'
              validSlides.push({
                image: cleanUrl,
                link: `/destinations/${encodeURIComponent(destinationSlug)}/${encodeURIComponent(packageId)}`,
                alt: data.Destination_Name ? `${data.Destination_Name} Travel Package` : 'Beautiful travel destination package',
                label,
              })
            }
          }
        })

        if (validSlides.length > 0) {
          setSlides(validSlides.sort(() => 0.5 - Math.random()))
        }
      } catch (error) {
        console.error('Error fetching hero images:', error)
      }
    }

    fetchPackages()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = destination.trim()
    router.push(q ? `/tailored-travel?destination=${encodeURIComponent(q)}` : '/tailored-travel')
  }

  const photo0 = slides[0] ?? defaultSlide
  const photo1 = slides[1] ?? defaultSlide
  const photo2 = slides[2] ?? defaultSlide

  return (
    <section className="w-full min-h-[92vh] flex items-center relative overflow-hidden pt-10 pb-24">

      {/* ── Background Video ── */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/images/home/homepage.jpg"
          className="w-full h-full object-cover"
          style={{ filter: 'blur(2px)', transform: 'scale(1.05)' }}
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
          <source src={HERO_VIDEO_ONLINE} type="video/mp4" />
        </video>
        {/* Dark overlay — uniform enough for text, keeps video visible */}
        <div className="absolute inset-0 bg-black/62" />
        {/* Subtle warm-purple vignette at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#130025]/55 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ── LEFT: copy ── */}
          <div className="space-y-7">

            {/* Badge */}
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white font-semibold bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full shadow-sm">
              <span className="w-2 h-2 bg-gradient-to-br from-[#ff8a3d] to-[#f85cb5] rounded-full animate-pulse"></span>
              AI-Powered Travel Planner
            </span>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1]">
              Discover the World,<br />
              <span className="bg-gradient-to-r from-purple-300 to-amber-300 bg-clip-text text-transparent">
                Plan in Seconds.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-md">
              Your AI travel companion for couples — personalised itineraries crafted with love and refined by real travel experts. 💞
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex items-center bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden p-1.5 gap-2 max-w-lg">
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
                  className="flex-1 text-sm text-ink placeholder-gray-400 outline-none bg-transparent py-2.5"
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md flex-shrink-0"
              >
                Plan My Trip
              </button>
            </form>

            {/* Popular quick picks */}
            <div className="flex items-center gap-2 flex-wrap -mt-2">
              <span className="text-xs text-white font-medium">Popular:</span>
              {popularDestinations.map((dest, i) => (
                <span key={dest} className="flex items-center gap-2">
                  <Link
                    href={`/destinations/${dest.toLowerCase()}`}
                    className="text-xs text-white hover:text-purple-200 transition-colors"
                  >
                    {dest}
                  </Link>
                  {i < popularDestinations.length - 1 && (
                    <span className="text-white/50 text-xs">·</span>
                  )}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-0 divide-x divide-white/20 border-t border-white/15 pt-5">

              <div className="pr-6">
                <p className="text-3xl font-bold text-white leading-none">500+</p>
                <p className="text-xs text-white/50 mt-1">Happy Couples</p>
              </div>

              <div className="px-6">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-3xl font-bold text-white leading-none">5.0</p>
                  <span className="text-amber-400 font-bold text-sm leading-none">★</span>
                </div>
                <div className="flex gap-0.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-white/50 mt-1">Avg. Rating</p>
              </div>

              <div className="pl-6">
                <p className="text-3xl font-bold text-white leading-none">25+</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <svg className="w-3.5 h-3.5 text-indigo-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-white/50">Destinations</p>
                </div>
              </div>

            </div>
          </div>

          {/* ── RIGHT: photo showcase ── */}
          <div className="hidden lg:block relative h-[520px] select-none">

            {/* ── Main tall hero card (left side of right column) ── */}
            <Link
              href={photo1.link}
              className="absolute top-6 left-4 z-20 w-[245px] h-[360px] rounded-3xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.55)] block group"
            >
              <Image
                src={photo1.image}
                alt={photo1.alt}
                fill
                sizes="245px"
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Bottom gradient + label */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5">
                <LocationPin />
                <p className="text-white text-xs font-semibold truncate">{photo1.label}</p>
              </div>
              {/* Top-left "Featured" pill */}
              <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2.5 py-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-white text-[10px] font-semibold">Featured</span>
              </div>
            </Link>

            {/* ── Top-right accent card ── */}
            <Link
              href={photo0.link}
              className="absolute top-4 right-4 z-30 w-[175px] h-[130px] rounded-2xl overflow-hidden shadow-xl block group"
              style={{ transform: 'rotate(2.5deg)' }}
            >
              <Image
                src={photo0.image}
                alt={photo0.alt}
                fill
                sizes="175px"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/75 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                <LocationPin />
                <p className="text-white text-[10px] font-medium truncate">{photo0.label}</p>
              </div>
            </Link>

            {/* ── Bottom-right accent card ── */}
            <Link
              href={photo2.link}
              className="absolute bottom-14 right-4 z-30 w-[175px] h-[145px] rounded-2xl overflow-hidden shadow-xl block group"
              style={{ transform: 'rotate(-2deg)' }}
            >
              <Image
                src={photo2.image}
                alt={photo2.alt}
                fill
                sizes="175px"
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                <LocationPin />
                <p className="text-white text-[10px] font-medium truncate">{photo2.label}</p>
              </div>
            </Link>

            {/* ── Decorative ring around main card ── */}
            <div
              className="absolute top-3 left-1 w-[255px] h-[370px] rounded-3xl border border-white/15 z-10"
              style={{ transform: 'rotate(-1.5deg)' }}
            />

            {/* ── Floating trust badge ── */}
            <div className="absolute bottom-0 left-4 z-40 bg-white/15 backdrop-blur-xl border border-white/25 shadow-xl rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow">
                  <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm leading-tight">Trusted by 500+</p>
                  <p className="text-white/60 text-[11px] mt-0.5">Travelers worldwide</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
