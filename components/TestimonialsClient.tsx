'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Testimonial {
  id?: string
  name: string
  rating: number
  quote: string
  image?: string
  location?: string
  trip?: string
  featured?: boolean
  createdAt?: string
  updatedAt?: string
}

// ─── Destination enrichment map ──────────────────────────────────────────────

const DEST_MAP: { keywords: string[]; image: string; location: string }[] = [
  {
    keywords: ['bali', 'ubud', 'seminyak', 'indonesia', 'temple', 'rice terrace'],
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    location: 'BALI, INDONESIA',
  },
  {
    keywords: ['maldives', 'overwater', 'water villa', 'atoll', 'lagoon'],
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
    location: 'MALDIVES',
  },
  {
    keywords: ['kerala', 'houseboat', 'backwater', 'alleppey', 'munnar', 'kochi', 'thekkady'],
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80',
    location: 'ALLEPPEY, KERALA',
  },
  {
    keywords: ['kashmir', 'srinagar', 'gulmarg', 'pahalgam', 'shikara', 'dal lake', 'snow'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    location: 'KASHMIR, INDIA',
  },
  {
    keywords: ['rajasthan', 'udaipur', 'jaipur', 'jodhpur', 'palace', 'heritage', 'fort'],
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80',
    location: 'UDAIPUR, RAJASTHAN',
  },
  {
    keywords: ['dubai', 'uae', 'burj', 'desert safari', 'emirates'],
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
    location: 'DUBAI, UAE',
  },
  {
    keywords: ['thailand', 'bangkok', 'phuket', 'chiang mai', 'koh samui', 'thai'],
    image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80',
    location: 'THAILAND',
  },
  {
    keywords: ['singapore', 'sentosa', 'marina bay', 'gardens by the bay'],
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80',
    location: 'SINGAPORE',
  },
  {
    keywords: ['goa', 'beach', 'sunset cruise', 'north goa', 'south goa'],
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
    location: 'GOA, INDIA',
  },
  {
    keywords: ['andaman', 'havelock', 'neil island', 'port blair', 'scuba', 'coral'],
    image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
    location: 'ANDAMAN ISLANDS',
  },
  {
    keywords: ['himachal', 'manali', 'shimla', 'spiti', 'rohtang', 'hills'],
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    location: 'HIMACHAL PRADESH',
  },
  {
    keywords: ['vietnam', 'hanoi', 'ha long', 'hoi an', 'ho chi minh'],
    image: 'https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=800&q=80',
    location: 'VIETNAM',
  },
  {
    keywords: ['europe', 'paris', 'rome', 'italy', 'france', 'greece', 'santorini'],
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
    location: 'SANTORINI, GREECE',
  },
  {
    keywords: ['sri lanka', 'colombo', 'kandy', 'bentota', 'sigiriya'],
    image: 'https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?w=800&q=80',
    location: 'SRI LANKA',
  },
  {
    keywords: ['mauritius', 'seychelles', 'island', 'tropical'],
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    location: 'MAURITIUS',
  },
]

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'

const FALLBACK_LIST: Testimonial[] = [
  {
    name: 'Aarav & Riya',
    rating: 5,
    quote: 'Travelzada planned our Bali honeymoon down to the sunset dinner. One perfect itinerary — zero stress.',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    location: 'UBUD, BALI',
    trip: 'Bali · 6N/7D · Dec 2024 · ₹78k/person',
  },
  {
    name: 'Meera & Sahil',
    rating: 5,
    quote: 'The Maldives plan felt hand-made for us. The human planner caught details the apps never would.',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
    location: 'NORTH MALÉ ATOLL, MALDIVES',
    trip: 'Maldives · 5N/6D · Jan 2025 · ₹1.65L/person',
  },
  {
    name: 'Kabir & Vanya',
    rating: 5,
    quote: 'We booked Rajasthan in a weekend. The reasoning for every choice meant we actually trusted it.',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80',
    location: 'UDAIPUR, RAJASTHAN',
    trip: 'Rajasthan · 6N/7D · Nov 2024 · ₹41k/person',
  },
  {
    name: 'Neel & Ishita',
    rating: 5,
    quote: 'Best anniversary surprise ever. Dubai was flawless — every transfer and dinner already sorted.',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
    location: 'DOWNTOWN, DUBAI',
    trip: 'Dubai · 5N/6D · Feb 2025 · ₹85k/person',
  },
  {
    name: 'Dev & Priya',
    rating: 5,
    quote: 'Felt like a personal concierge. We just shared our vibe and the houseboat plan arrived, ready to book.',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80',
    location: 'ALLEPPEY, KERALA',
    trip: 'Kerala · 5N/6D · Oct 2025 · ₹32k/person',
  },
]

function enrichTestimonial(t: Testimonial): Testimonial {
  if (t.image && t.location) return t
  const text = `${t.quote} ${t.name}`.toLowerCase()
  const match = DEST_MAP.find(d => d.keywords.some(k => text.includes(k)))
  return {
    ...t,
    image:    t.image    || match?.image    || FALLBACK_IMAGE,
    location: t.location || match?.location || undefined,
  }
}

function getInitials(name: string): string {
  const parts = name.split(/\s*&\s*|\s+and\s+/i)
  if (parts.length >= 2) return `${parts[0][0]}&${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TestimonialsClient() {
  const [list, setList] = useState<Testimonial[]>(FALLBACK_LIST)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        let snapshot
        try {
          snapshot = await getDocs(
            query(collection(db, 'testimonials'), where('featured', '==', true), orderBy('createdAt', 'desc'))
          )
        } catch {
          snapshot = await getDocs(
            query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'))
          )
        }

        const data: Testimonial[] = []
        snapshot.forEach((doc) => {
          const d = doc.data()
          if (!d.name || !d.quote) return
          data.push({
            id:       doc.id,
            name:     d.name,
            rating:   d.rating || 5,
            quote:    d.quote,
            image:    d.image || d.imageUrl || undefined,
            location: d.location || undefined,
            trip:     d.trip || undefined,
            featured: d.featured || false,
          })
        })

        if (data.length > 0) setList(data.map(enrichTestimonial))
      } catch {
        // keep fallback
      }
    })()
  }, [])

  useEffect(() => {
    if (paused || list.length <= 1) return
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % list.length)
    }, 4200)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused, list.length])

  const active = list[activeIndex]
  if (!active) return null

  const initials = getInitials(active.name)
  const imgSrc = active.image || FALLBACK_IMAGE

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Main card ── */}
      <div
        className="flex flex-col md:flex-row overflow-hidden"
        style={{
          borderRadius: 16,
          border: '1px solid #e9e5dd',
          boxShadow: '0 12px 48px rgba(26,26,36,.08)',
          minHeight: 420,
        }}
      >
        {/* Left: destination image */}
        <div className="relative flex-none w-full md:w-[360px]" style={{ minHeight: 260 }}>
          <Image
            src={imgSrc}
            alt={active.location || active.name}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
            style={{ transition: 'opacity .4s ease' }}
            unoptimized
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,9,16,.58) 0%, transparent 55%)' }} />
          {active.location && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#fff', textTransform: 'uppercase' }}>{active.location}</span>
            </div>
          )}
        </div>

        {/* Right: quote content */}
        <div
          className="flex flex-col justify-center flex-1 px-8 py-10 md:px-12"
          style={{ background: '#fff' }}
        >
          {/* Stars */}
          <div className="flex gap-1 mb-6">
            {Array.from({ length: active.rating ?? 5 }).map((_, i) => (
              <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
              </svg>
            ))}
          </div>

          {/* Quote */}
          <blockquote
            style={{
              margin: '0 0 32px',
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontSize: 'clamp(16px, 4.5vw, 26px)',
              fontWeight: 400,
              color: '#1a1a24',
              lineHeight: 1.6,
            }}
          >
            &ldquo;{active.quote}&rdquo;
          </blockquote>

          {/* Author */}
          <div className="flex items-center gap-4">
            <div
              className="flex-none flex items-center justify-center rounded-full text-sm font-black"
              style={{ width: 52, height: 52, background: '#1a1a24', color: '#fff', letterSpacing: '.03em' }}
            >
              {initials}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: '#1a1a24' }}>{active.name}</p>
              {active.trip && (
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9a9aa5' }}>{active.trip}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Avatar row ── */}
      {list.length > 1 && (
        <div className="flex justify-center gap-3 mt-8">
          {list.map((t, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={t.id ?? i}
                onClick={() => {
                  setActiveIndex(i)
                  setPaused(true)
                  setTimeout(() => setPaused(false), 5000)
                }}
                className="flex-none flex items-center justify-center rounded-full font-black text-xs transition-all duration-300"
                style={{
                  width: 52,
                  height: 52,
                  background: isActive ? '#1a1a24' : '#d9d5ce',
                  color: isActive ? '#fff' : '#6b6b76',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '.03em',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: isActive
                    ? '0 0 0 3px #faf8f5, 0 0 0 5px #4f46e5, 0 8px 20px rgba(26,26,36,.2)'
                    : 'none',
                }}
                aria-label={t.name}
              >
                {getInitials(t.name)}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Bottom stats ── */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8" style={{ fontSize: 14 }}>
        <span style={{ color: '#6b6b76' }}>
          Rated <strong style={{ color: '#1a1a24' }}>4.9/5</strong> from <strong style={{ color: '#1a1a24' }}>500+</strong> couples
        </span>
        <span style={{ color: '#e9e5dd' }}>|</span>
        <Link href="/reviews" className="font-semibold hover:underline" style={{ color: '#4f46e5' }}>
          Read All Reviews →
        </Link>
        <span style={{ color: '#e9e5dd' }}>|</span>
        <Link
          href="https://g.page/r/travelzada"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:underline"
          style={{ color: '#4f46e5' }}
        >
          Review us on Google
        </Link>
      </div>
    </div>
  )
}
