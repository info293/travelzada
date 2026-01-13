'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface HeroSlide {
  image: string
  link: string
  alt: string
}

export default function Hero() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Default fallback slide
  const defaultSlide: HeroSlide = {
    image: '/images/home/homepage.jpg',
    link: '/destinations',
    alt: 'Travel destination'
  }

  const currentSlide = slides.length > 0 ? slides[currentSlideIndex] : defaultSlide

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

              validSlides.push({
                image: cleanUrl,
                link: `/destinations/${encodeURIComponent(destinationSlug)}/${encodeURIComponent(packageId)}`,
                alt: data.Destination_Name || 'Travel destination'
              })
            }
          }
        })

        if (validSlides.length > 0) {
          // Shuffle the array to get random start order
          const shuffled = validSlides.sort(() => 0.5 - Math.random())
          setSlides(shuffled)
        }
      } catch (error) {
        console.error('Error fetching hero images:', error)
      }
    }

    fetchPackages()
  }, [])

  // Auto-rotation effect
  useEffect(() => {
    if (slides.length <= 1) return

    const intervalId = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % slides.length)
    }, 10000) // 10 seconds

    return () => clearInterval(intervalId)
  }, [slides.length])


  return (
    <section className="w-full bg-gradient-to-b from-cream via-white to-cream pt-10 pb-20 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 px-4 py-2 rounded-full shadow-sm">
                <span className="w-3.5 h-3.5 inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm"></span>
                Premium Travel Planner
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-ink mb-6 leading-tight">
              Plan your perfect trip in{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                seconds
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl">
              Travelzada- with your better half 💞
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/ai-planner"
                className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-5 rounded-full text-base font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:from-purple-700 hover:to-indigo-700 hover:scale-105 transition-all duration-300"
              >
                START PLANNING WITH AI
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/destinations"
                className="inline-flex items-center justify-center bg-white border-2 border-purple-600 text-primary px-10 py-5 rounded-full text-base font-semibold hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-300"
              >
                Explore Destinations
              </Link>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-6 md:gap-8 pt-4">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-semibold text-ink">5,00+</p>
                <p className="text-xs md:text-sm text-gray-600">Happy Couple</p>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-semibold text-ink">5★</p>
                <p className="text-xs md:text-sm text-gray-600">Couple Rating</p>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-semibold text-ink">25+</p>
                <p className="text-xs md:text-sm text-gray-600">Destinations</p>
              </div>
            </div>
          </div>

          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white group-hover:shadow-3xl transition-shadow duration-300">
              <Link href={currentSlide.link} className="block w-full h-full cursor-pointer">
                <img
                  src={currentSlide.image}
                  alt={currentSlide.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </Link>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>

              {/* Star Flow Effect */}
              <div className="absolute top-10 left-10 w-4 h-4 bg-yellow-300 rounded-full blur-[2px] animate-twinkle shadow-[0_0_10px_rgba(253,224,71,0.8)]"></div>
              <div className="absolute top-20 right-20 w-3 h-3 bg-white rounded-full blur-[1px] animate-twinkle delay-700 shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
              <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-yellow-200 rounded-full blur-[1px] animate-twinkle delay-1000 shadow-[0_0_6px_rgba(254,240,138,0.8)]"></div>

              {/* Floating Stars */}
              <div className="absolute -top-6 -right-6 text-yellow-400 animate-float delay-500">
                <svg className="w-12 h-12 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="absolute top-1/2 -left-8 text-purple-400 animate-float delay-1000 duration-[8s]">
                <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              {/* Snow Flow Effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute bg-white rounded-full opacity-0 animate-snow-fall"
                    style={{
                      top: `-${Math.random() * 20}%`,
                      left: `${Math.random() * 100}%`,
                      width: `${Math.random() * 4 + 2}px`,
                      height: `${Math.random() * 4 + 2}px`,
                      animationDelay: `${Math.random() * 5}s`,
                      animationDuration: `${Math.random() * 5 + 5}s`
                    }}
                  ></div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-8 -left-8 bg-gradient-to-br from-white to-purple-50/30 shadow-2xl rounded-2xl px-8 py-6 border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-ink text-base">Trusted by 5,00+</p>
                  <p className="text-sm text-gray-600">Travelers worldwide</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

