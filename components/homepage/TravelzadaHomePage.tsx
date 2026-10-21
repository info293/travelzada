'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

import { HomepageData, RealDestinationSection, RealPackageCard, fetchHomepageData } from '@/lib/homepageData'

export interface TravelzadaHomePageProps {
  initialData?: HomepageData
}

const hotelPartners = [
  { name: 'Taj Hotels & Resorts', logo: 'https://www.travelzada.com/logs/Taj.webp' },
  { name: 'The Oberoi Group', logo: 'https://www.travelzada.com/logs/Oberoi.webp' },
  { name: 'The Leela Palaces', logo: 'https://www.travelzada.com/logs/Leela.png' },
  { name: 'ITC Hotels', logo: 'https://www.travelzada.com/logs/ITC.webp' },
  { name: 'Marriott International', logo: 'https://www.travelzada.com/logs/Mariott.webp' },
  { name: 'Aman Resorts', logo: 'https://www.travelzada.com/logs/Aman.jpg' },
  { name: 'The Lalit', logo: 'https://www.travelzada.com/logs/Lalit.png' },
  { name: 'Brij Hotels', logo: 'https://www.travelzada.com/logs/Brij.png' }
]

const airlines = [
  'Emirates',
  'Qatar Airways',
  'Singapore Airlines',
  'Etihad Airways',
  'Air India',
  'Lufthansa',
  'Thai Airways'
]

const faqData = [
  {
    q: 'How does planning with Travelzada work?',
    a: 'Share your dates, budget and occasion. You get a personalised day-by-day itinerary, then a real planner refines every detail with you on WhatsApp.'
  },
  {
    q: 'Is the itinerary free?',
    a: 'Yes. Planning is free and unlimited. You only pay once you decide to book.'
  },
  {
    q: 'Can we customise a package?',
    a: 'Every package is 100% customisable — swap hotels, add a surprise, change the number of nights.'
  },
  {
    q: 'What happens after we book?',
    a: 'You receive a detailed confirmation and a dedicated trip coordinator who handles transfers, check-ins and special requests.'
  },
  {
    q: 'Do you support us during the trip?',
    a: 'Yes — 24/7 on-trip support. A last-minute change or an emergency is just a message away.'
  }
]

const allOccasionsList = [
  'Honeymoons',
  'Minimoons',
  'Proposals',
  'Surprise your girlfriend',
  'First wedding night',
  'Luxury getaways',
  'Wedding blessings',
  'Anniversaries',
  'Babymoons',
  'Gratitude to parents'
]

// Helper for high-res images
function toHighRes(url: string) {
  return url.replace('tr=w-900', 'tr=w-1800').replace('w=900', 'w=1800')
}

export default function TravelzadaHomePage({ initialData }: TravelzadaHomePageProps) {
  const router = useRouter()

  // Real database state
  const [data, setData] = useState<HomepageData | undefined>(initialData)

  useEffect(() => {
    if (!data || !data.sections || data.sections.length === 0) {
      fetchHomepageData().then(res => {
        if (res && res.sections && res.sections.length > 0) {
          setData(res)
        }
      })
    }
  }, [data])

  const sections = data?.sections || []
  const destinationsData = data?.destinationsGrid || { International: [], India: [] }
  const featuredReviews = data?.featuredReviews || []

  // Navigation & Tabs
  const [destTab, setDestTab] = useState<'International' | 'India'>('International')
  const [activeFaq, setActiveFaq] = useState<number>(0)
  const [pickedOccasions, setPickedOccasions] = useState<string[]>(['Honeymoons'])

  // Search Bar State
  const [searchDest, setSearchDest] = useState('')
  const [searchOccasion, setSearchOccasion] = useState('Honeymoon')
  const [searchWhen, setSearchWhen] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    names: '',
    whereTo: '',
    when: '',
    phone: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  // Occasions Showcase State
  const [activeSec, setActiveSec] = useState<number>(0)
  const [hoveredSec, setHoveredSec] = useState<number>(-1)
  const [selectedCards, setSelectedCards] = useState<number[]>(() => Array(12).fill(0))
  const [seenSections, setSeenSections] = useState<boolean[]>(() => Array(12).fill(false))
  const [isNarrow, setIsNarrow] = useState<boolean>(false)

  // Double-buffered backgrounds
  const [bgs, setBgs] = useState(() =>
    sections.map(s => ({
      a: toHighRes(s.cards[0]?.img || s.img),
      b: '',
      front: 'A' as 'A' | 'B',
      cur: toHighRes(s.cards[0]?.img || s.img)
    }))
  )

  useEffect(() => {
    if (sections.length > 0) {
      setSelectedCards(Array(sections.length).fill(0))
      setSeenSections(Array(sections.length).fill(false))
      setBgs(
        sections.map(s => ({
          a: toHighRes(s.cards[0]?.img || s.img),
          b: '',
          front: 'A' as 'A' | 'B',
          cur: toHighRes(s.cards[0]?.img || s.img)
        }))
      )
    }
  }, [sections])

  const secRefs = useRef<(HTMLElement | null)[]>([])
  const trackRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollLockRef = useRef<{ [key: number]: number }>({})

  // Window resize check for mobile bar
  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 760)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Card Width helper
  const getCardWidth = (el: HTMLDivElement | null) => {
    if (!el || !el.firstElementChild) return 280
    return el.firstElementChild.getBoundingClientRect().width + 18
  }

  // Set card and smooth scroll
  const goToCard = (secIdx: number, cardIdx: number) => {
    scrollLockRef.current[secIdx] = Date.now()
    setSelectedCards(prev => {
      const next = [...prev]
      next[secIdx] = cardIdx
      return next
    })

    const track = trackRefs.current[secIdx]
    if (track) {
      const w = getCardWidth(track)
      track.scrollTo({ left: cardIdx * w, behavior: 'smooth' })
    }
  }

  // Track onScroll handler
  const handleTrackScroll = (secIdx: number) => {
    if (Date.now() - (scrollLockRef.current[secIdx] || 0) < 800) return
    const track = trackRefs.current[secIdx]
    if (!track) return

    const numCards = sections[secIdx]?.cards?.length || 5
    const w = getCardWidth(track)
    const cardIdx = Math.max(0, Math.min(numCards - 1, Math.round(track.scrollLeft / w)))
    const maxScroll = track.scrollWidth - track.clientWidth
    if (track.scrollLeft >= maxScroll - 4 && selectedCards[secIdx] > cardIdx) return

    if (cardIdx !== selectedCards[secIdx]) {
      setSelectedCards(prev => {
        const next = [...prev]
        next[secIdx] = cardIdx
        return next
      })
    }
  }

  // Smooth scroll to an occasion section
  const scrollToOccasion = (secIdx: number) => {
    const el = secRefs.current[secIdx]
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 110
    window.scrollTo({ top, behavior: 'smooth' })
  }

  // Update background crossfade when selected card changes
  useEffect(() => {
    if (sections.length === 0) return
    setBgs(prevBgs => {
      let changed = false
      const newBgs = sections.map((sec, i) => {
        const b = prevBgs[i] || {
          a: toHighRes(sec.cards[0]?.img || sec.img),
          b: '',
          front: 'A' as const,
          cur: toHighRes(sec.cards[0]?.img || sec.img)
        }
        const cardImg = sec.cards[selectedCards[i] || 0]?.img || sec.img
        if (!cardImg) return b
        const targetUrl = toHighRes(cardImg)
        if (targetUrl === b.cur) return b
        changed = true
        return b.front === 'A'
          ? { a: b.a, b: targetUrl, front: 'B' as const, cur: targetUrl }
          : { a: targetUrl, b: b.b, front: 'A' as const, cur: targetUrl }
      })
      return changed ? newBgs : prevBgs
    })
  }, [selectedCards, sections])

  // IntersectionObserver to detect active occasion and trigger reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const idx = secRefs.current.indexOf(entry.target as HTMLElement)
          if (idx < 0) return

          if (entry.intersectionRatio >= 0.2) {
            setSeenSections(prev => {
              if (prev[idx]) return prev
              const next = [...prev]
              next[idx] = true
              return next
            })
          }

          if (entry.intersectionRatio >= 0.55) {
            setActiveSec(idx)
          }
        })
      },
      { threshold: [0, 0.2, 0.3, 0.55, 0.8] }
    )

    secRefs.current.forEach(el => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // Autoplay timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeSec < 0 || hoveredSec === activeSec) return
      const totalCards = sections[activeSec]?.cards?.length || 1
      const nextCard = ((selectedCards[activeSec] || 0) + 1) % totalCards
      goToCard(activeSec, nextCard)
    }, 4800)

    return () => clearInterval(timer)
  }, [activeSec, hoveredSec, selectedCards])

  // Toggle occasion in enquiry
  const toggleOccasion = (occName: string) => {
    setPickedOccasions(prev =>
      prev.includes(occName) ? prev.filter(x => x !== occName) : [...prev, occName]
    )
  }

  // Handle Hero Quick Search Submit -> routes to real AI planner (/tailored-travel)
  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchDest.trim()) params.set('destination', searchDest.trim())
    if (searchOccasion.trim()) params.set('occasion', searchOccasion.trim())
    if (searchWhen.trim()) params.set('when', searchWhen.trim())

    router.push(`/tailored-travel?${params.toString()}`)
  }

  // Real Lead Submission -> Saves to Firestore leads collection + emails agents + WhatsApp
  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      const cleanMobile = formData.phone.trim().replace(/\D/g, '')
      if (cleanMobile.length < 10) {
        setFormError('Please enter a valid 10-digit mobile number.')
        setIsSubmitting(false)
        return
      }

      const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

      // 1. Save lead to Firestore 'leads' collection
      if (db) {
        await addDoc(collection(db, 'leads'), {
          name: formData.names.trim(),
          mobile: cleanMobile,
          destination: formData.whereTo.trim(),
          duration: formData.when.trim(),
          occasion: pickedOccasions.join(', '),
          sourceUrl: pageUrl,
          packageName: 'Homepage Custom Itinerary Request',
          status: 'new',
          createdAt: serverTimestamp(),
          read: false,
        })
      }

      // 2. Dispatch email notification to team
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead_notification',
          data: {
            name: formData.names.trim(),
            mobile: cleanMobile,
            sourceUrl: pageUrl,
            destination: formData.whereTo.trim(),
            duration: formData.when.trim(),
            occasion: pickedOccasions.join(', '),
            packageName: 'Homepage Itinerary Enquiry',
          },
        }),
      }).catch(err => console.error('Failed to dispatch lead email:', err))

      setSubmitSuccess(true)

      // 3. Open WhatsApp conversation with prefilled text
      const waText = encodeURIComponent(
        `Hi Travelzada! We would like to plan our trip.\n` +
        `• Names: ${formData.names.trim()}\n` +
        `• Destination: ${formData.whereTo.trim() || 'Anywhere romantic'}\n` +
        `• When & Duration: ${formData.when.trim() || 'Flexible'}\n` +
        `• Occasion: ${pickedOccasions.join(', ')}\n` +
        `• Phone: ${cleanMobile}`
      )
      window.open(`https://wa.me/919929962350?text=${waText}`, '_blank')
    } catch (err: any) {
      console.error('Lead submission error:', err)
      setFormError(err.message || 'Something went wrong. Please try again or chat with us on WhatsApp.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="font-figtree text-[#0F0406] bg-[#F5F2F5] text-[16px] antialiased selection:bg-[#651926] selection:text-[#E2DDE3]">

      {/* ─────────────────────────────────────────────────────────────
          1. HERO & QUICK AI SEARCH SECTION
      ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[min(100vh,920px)] flex flex-col bg-[#0F0406] overflow-hidden pt-20 md:pt-24">
        {/* Background Hero Image */}
        <div className="absolute inset-0">
          <img
            src="https://ik.imagekit.io/tux8wjwgq/Andaman/couple%20swimming%20and%20enjoying%20a%20golden%20sunset%20at%20radhanagar%20beach.png?tr=w-2400"
            alt="Hero couple enjoying turquoise ocean"
            className="w-full h-full object-cover object-[center_32%]"
            loading="eager"
          />
        </div>

        {/* Clear, Luminous Vignette Overlay (Leaves natural sunlit colors intact) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,4,6,0.35) 0%, rgba(15,4,6,0.08) 30%, rgba(70,40,49,0.2) 60%, rgba(15,4,6,0.85) 100%)'
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center text-center px-5 sm:px-8 pt-10 sm:pt-16 pb-28 sm:pb-36">
          <div className="max-w-[980px] animate-[tzRise_0.9s_ease_both]">
            <div className="text-[12.5px] font-semibold tracking-[0.3em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              Couples only · India &amp; the world
            </div>
            <h1 className="font-cormorant font-normal text-[clamp(44px,6.8vw,96px)] leading-[0.98] tracking-[-0.01em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] mt-4 text-balance">
              Journeys designed<br />
              only <span className="font-pinyon font-normal text-[#E2DDE3] text-[0.92em] tracking-normal drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">for two</span>
            </h1>
            <p className="text-[clamp(15px,1.35vw,18px)] leading-relaxed text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)] font-medium mt-4 mx-auto max-w-[560px]">
              Honeymoons, proposals, anniversaries and quiet escapes — planned by real travel designers and powered by AI.
            </p>

            {/* Quick Interactive Search Bar (Connected to /tailored-travel) */}
            <form
              onSubmit={handleHeroSearch}
              className="mt-7 sm:mt-9 mx-auto max-w-[840px] flex items-stretch flex-wrap gap-2 bg-[#F5F2F5]/25 backdrop-blur-[16px] border border-white/60 rounded-[18px] p-2 text-left shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
            >
              {/* Occasion select */}
              <div className="flex-1 min-w-[150px] p-2.5 sm:px-4 rounded-[12px] bg-black/20 hover:bg-black/30 transition-colors">
                <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-[#E2DDE3]">
                  Occasion
                </label>
                <select
                  value={searchOccasion}
                  onChange={e => setSearchOccasion(e.target.value)}
                  className="w-full bg-transparent text-[#E2DDE3] font-medium text-[15px] outline-none cursor-pointer mt-1"
                >
                  <option value="Honeymoon" className="bg-[#0F0406] text-white">Honeymoon</option>
                  <option value="Minimoon" className="bg-[#0F0406] text-white">Minimoon</option>
                  <option value="Proposal" className="bg-[#0F0406] text-white">Proposal</option>
                  <option value="Anniversary" className="bg-[#0F0406] text-white">Anniversary</option>
                  <option value="Birthday Escape" className="bg-[#0F0406] text-white">Birthday Escape</option>
                  <option value="Luxury Getaway" className="bg-[#0F0406] text-white">Luxury Getaway</option>
                  <option value="Babymoon" className="bg-[#0F0406] text-white">Babymoon</option>
                </select>
              </div>

              {/* Destination search */}
              <div className="flex-1 min-w-[160px] p-2.5 sm:px-4 rounded-[12px] bg-black/20 hover:bg-black/30 transition-colors">
                <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-[#E2DDE3]">
                  Destination
                </label>
                <input
                  type="text"
                  value={searchDest}
                  onChange={e => setSearchDest(e.target.value)}
                  placeholder="Bali, Kashmir, Europe..."
                  className="w-full bg-transparent text-[#E2DDE3] placeholder-white/60 font-medium text-[15px] outline-none mt-1"
                />
              </div>

              {/* When input */}
              <div className="flex-1 min-w-[140px] p-2.5 sm:px-4 rounded-[12px] bg-black/20 hover:bg-black/30 transition-colors">
                <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-[#E2DDE3]">
                  When &amp; Nights
                </label>
                <input
                  type="text"
                  value={searchWhen}
                  onChange={e => setSearchWhen(e.target.value)}
                  placeholder="Feb · 6 Nights"
                  className="w-full bg-transparent text-[#E2DDE3] placeholder-white/60 font-medium text-[15px] outline-none mt-1"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="flex-initial flex items-center justify-center text-[15px] font-semibold text-[#0F0406] bg-[#F5F2F5] hover:bg-[#C9A0AC] rounded-[12px] px-6 py-3.5 whitespace-nowrap transition cursor-pointer"
              >
                Plan our trip
              </button>
            </form>

            {/* Trust badges */}
            <div className="flex justify-center items-center gap-3 sm:gap-5 flex-wrap mt-6 text-[14.5px] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] font-medium">
              <Link href="/reviews" className="hover:underline flex items-center gap-1.5 text-white">
                <strong className="font-semibold text-amber-300">★ 4.9</strong>
                <span>from 500+ couples</span>
              </Link>
              <span className="w-1 h-1 rounded-full bg-white/70" />
              <span>Free personalized itinerary</span>
              <span className="w-1 h-1 rounded-full bg-white/70" />
              <span>No payment until you love the plan</span>
            </div>
          </div>
        </div>

        {/* Decorative Wave Divider */}
        <svg
          viewBox="0 0 1440 40"
          preserveAspectRatio="none"
          className="absolute left-0 right-0 -bottom-[1px] w-full h-[34px] z-10 block pointer-events-none"
        >
          <path
            fill="#E2DDE3"
            d="M0,40 L0,18 L40,22 L75,14 L110,20 L150,12 L190,19 L230,15 L270,23 L310,13 L350,18 L395,11 L440,20 L480,16 L520,24 L560,14 L605,19 L650,12 L690,21 L735,15 L780,22 L820,13 L860,18 L905,10 L950,19 L990,15 L1030,23 L1075,14 L1120,20 L1160,12 L1200,19 L1245,16 L1290,22 L1330,13 L1375,18 L1410,14 L1440,19 L1440,40 Z"
          />
        </svg>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. OCCASIONS HEADER
      ───────────────────────────────────────────────────────────── */}
      <section id="occasions" className="max-w-[1280px] mx-auto px-5 sm:px-8 pt-16 sm:pt-28">
        <div className="text-center max-w-[680px] mx-auto">
          <div className="font-pinyon text-[clamp(30px,3vw,40px)] text-[#651926] leading-none">
            for every chapter
          </div>
          <h2 className="font-cormorant font-normal text-[clamp(38px,4.6vw,62px)] leading-tight tracking-[-0.01em] mt-2.5">
            What are you celebrating?
          </h2>
          <p className="text-[17px] leading-relaxed text-[#651926] mt-4">
            Ten reasons to go away together. Each one planned differently.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. INTERACTIVE OCCASIONS & PACKAGES SHOWCASE (WITH GENEROUS GAPS & 01/08 INDICATORS)
      ───────────────────────────────────────────────────────────── */}
      <div id="packages" className="relative bg-[#E2DDE3] pt-6 pb-20 sm:pb-28 mt-6 sm:mt-10">
        {/* Sticky Occasions Filter Bar */}
        <div className="sticky top-[64px] md:top-[72px] z-30 bg-[#E2DDE3]/90 backdrop-blur-[14px] border-b border-[#95929C]/30 py-3.5 mb-10 sm:mb-14 shadow-xs">
          <div
            data-noscroll=""
            className="max-w-[1520px] w-full mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap scrollbar-none"
          >
            <span className="flex-none text-[12px] font-semibold tracking-[0.2em] uppercase text-[#651926]">
              Featured Destinations (01 - 08)
            </span>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {sections.slice(0, 8).map((occ, i) => {
                const isActive = activeSec === i
                const pad = String(i + 1).padStart(2, '0')
                return (
                  <button
                    key={occ.id}
                    onClick={() => scrollToOccasion(i)}
                    className={`flex-none font-figtree text-[13px] font-semibold px-4 py-2 rounded-full cursor-pointer transition-all border flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#651926] text-white border-[#651926] shadow-sm'
                        : 'bg-white/80 text-[#0F0406] border-[#95929C]/35 hover:bg-white hover:text-[#651926] hover:border-[#651926]/40'
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-75">{pad}</span>
                    <span>{occ.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Real Destination Sections with Clear, Generous Gaps Between Each */}
        <div className="space-y-14 sm:space-y-20 lg:space-y-24">
          {sections.slice(0, 8).map((occ, i) => {
            const displayCards = occ.cards.slice(0, 8)
            const rawCardIdx = selectedCards[i] || 0
            const cardIdx = rawCardIdx < displayCards.length ? rawCardIdx : 0
            const bgState = bgs[i] || {
              a: toHighRes(displayCards[0]?.img || occ.img),
              b: '',
              front: 'A' as const,
              cur: toHighRes(displayCards[0]?.img || occ.img)
            }
            const isSeen = Boolean(seenSections[i])
            const padNum = String(i + 1).padStart(2, '0')
            const totalNum = '08'
            const nextIdx = (i + 1) % Math.min(sections.length, 8)

            return (
              <div key={occ.id} className="w-full">
                <section
                  id={`occ-${i}`}
                  ref={el => { secRefs.current[i] = el }}
                  onMouseEnter={() => setHoveredSec(i)}
                  onMouseLeave={() => setHoveredSec(-1)}
                  className="w-full relative overflow-hidden text-[#E2DDE3] scroll-mt-28"
                >
                  {/* Double-buffered Dynamic Crossfade Backgrounds */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-[1200ms] ease-out pointer-events-none"
                    style={{
                      backgroundImage: bgState.a ? `url("${bgState.a}")` : 'none',
                      opacity: bgState.front === 'A' ? 1 : 0,
                      transform: bgState.front === 'A' ? 'scale(1)' : 'scale(1.08)'
                    }}
                  />
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-[1200ms] ease-out pointer-events-none"
                    style={{
                      backgroundImage: bgState.b ? `url("${bgState.b}")` : 'none',
                      opacity: bgState.front === 'B' ? 1 : 0,
                      transform: bgState.front === 'B' ? 'scale(1)' : 'scale(1.08)'
                    }}
                  />

                  {/* Gradient Scrims for text contrast */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(15,4,6,0.94) 0%, rgba(70,40,49,0.8) 36%, rgba(15,4,6,0.38) 70%, rgba(15,4,6,0.5) 100%), linear-gradient(180deg, rgba(226,221,227,1) 0%, rgba(226,221,227,0) 8%, rgba(15,4,6,0.15) 30%, rgba(15,4,6,0.25) 70%, rgba(226,221,227,0) 92%, rgba(226,221,227,1) 100%)'
                    }}
                  />

                  {/* Occasion Inner Grid */}
                  <div className="relative max-w-[1520px] w-full mx-auto min-h-[min(88vh,780px)] px-6 sm:px-10 lg:px-16 py-16 sm:py-24 flex flex-wrap items-center gap-10 sm:gap-16">

                    {/* Left Side: Destination Details */}
                    <div
                      className="flex-1 basis-[300px] max-w-[420px] min-w-0 transition-all duration-700 ease-out"
                      style={{
                        opacity: isSeen ? 1 : 0,
                        transform: isSeen ? 'none' : 'translateY(28px)'
                      }}
                    >
                      {/* Destination Number Badge (01 / 08) */}
                      <div className="flex items-center gap-2.5 mb-3.5">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-mono font-bold tracking-wider border border-white/20 shadow-sm">
                          <span className="text-[#E2DDE3]">{padNum}</span>
                          <span className="text-white/40">/</span>
                          <span className="text-white">{totalNum}</span>
                        </span>
                        <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#C9A0AC]">
                          DESTINATION {padNum} OF {totalNum}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2.5 font-cormorant">
                        <span className="text-[clamp(44px,5vw,60px)] font-normal leading-none">{padNum}</span>
                        <span className="text-[20px] text-[#C9A0AC]">/ {totalNum}</span>
                      </div>
                      <h2 className="font-cormorant font-normal text-[clamp(42px,5.2vw,74px)] leading-none tracking-[-0.01em] mt-3 text-balance">
                        {occ.name}
                      </h2>
                      <div className="inline-block mt-3 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-[13px] text-[#E2DDE3]">
                        {occ.meta} · {displayCards.length} Curated Packages
                      </div>
                      <p className="text-[16px] leading-relaxed text-[#E2DDE3]/90 mt-4 max-w-[360px] line-clamp-3">
                        {occ.line}
                      </p>

                      <div className="flex items-center gap-3.5 flex-wrap mt-7">
                        <Link
                          href={`/tailored-travel?destination=${encodeURIComponent(occ.name)}`}
                          className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#0F0406] bg-[#F5F2F5] px-5 py-3 rounded-full transition hover:bg-[#C9A0AC] hover:-translate-y-0.5"
                        >
                          Plan with AI <span>→</span>
                        </Link>
                        <Link
                          href={`/destinations/${occ.slug}`}
                          className="inline-flex items-center text-[14px] font-medium text-[#E2DDE3] border border-[#95929C]/30/40 px-4 py-2.5 rounded-full hover:border-white hover:text-white transition"
                        >
                          Explore All Packages
                        </Link>
                        {sections.length > 1 && (
                          <button
                            onClick={() => scrollToOccasion(nextIdx)}
                            className="text-[14px] font-medium text-[#E2DDE3] hover:text-[#E2DDE3] cursor-pointer transition"
                          >
                            Next: {sections[nextIdx]?.name} ↓
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Package Cards Carousel */}
                    <div className="flex-1 basis-[520px] min-w-0">
                      <div
                        ref={el => { trackRefs.current[i] = el }}
                        onScroll={() => handleTrackScroll(i)}
                        data-noscroll=""
                        className="flex gap-4 sm:gap-5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none py-4 px-2"
                      >
                        {displayCards.map((c, j) => {
                          const isSelected = j === cardIdx
                          const targetUrl = c.packageSlug
                            ? `/destinations/${c.slug}/${c.packageSlug}`
                            : `/destinations/${c.slug}`

                          return (
                            <div
                              key={c.id || c.place}
                              onMouseEnter={() => goToCard(i, j)}
                              className={`flex-none snap-start w-[clamp(232px,21vw,280px)] aspect-[5/7] rounded-[18px] transition-all duration-500 ease-out relative ${
                                isSelected
                                  ? 'opacity-100 -translate-y-2.5 outline outline-1 outline-[#E2DDE3]/90 outline-offset-4'
                                  : 'opacity-75 hover:opacity-100 outline outline-1 outline-transparent'
                              }`}
                            >
                              <Link
                                href={targetUrl}
                                onClick={() => goToCard(i, j)}
                                className="block w-full h-full rounded-[18px] overflow-hidden bg-[#462831] shadow-[0_34px_60px_-28px_rgba(0,0,0,0.85)] cursor-pointer relative group"
                                title={`Open ${c.place}`}
                              >
                                <img
                                  src={c.img}
                                  alt={c.place}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                  loading="lazy"
                                />
                                {/* Card gradient overlay */}
                                <div
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    background:
                                      'linear-gradient(to top, rgba(15,4,6,0.95) 0%, rgba(70,40,49,0.35) 48%, transparent 68%)'
                                  }}
                                />
                                {/* Nights badge */}
                                <div className="absolute top-3.5 left-3.5 text-[12px] font-semibold text-[#E2DDE3] bg-[#0F0406]/65 backdrop-blur-[8px] border border-[#F5F2F5]/35 px-3 py-1.5 rounded-full pointer-events-none">
                                  {c.nights}
                                </div>
                                {/* Top-right "Package" badge */}
                                <div className="absolute top-3.5 right-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#0F0406] bg-[#E2DDE3] px-2.5 py-1 rounded-full shadow-sm group-hover:bg-[#F5F2F5] transition-colors pointer-events-none flex items-center gap-1">
                                  <span>Package</span>
                                  <span>↗</span>
                                </div>
                                {/* Card bottom text */}
                                <div className="absolute left-4 sm:left-5 right-4 sm:right-5 bottom-4 sm:bottom-5 text-[#E2DDE3]">
                                  <div className="text-[11.5px] font-semibold tracking-[0.16em] uppercase text-[#E2DDE3] flex items-center justify-between">
                                    <span>{c.region}</span>
                                    {c.price && (
                                      <span className="font-semibold text-[13px] text-[#E2DDE3]">
                                        {c.price}
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-cormorant font-semibold text-[25px] leading-tight mt-1 group-hover:text-[#E2DDE3] transition-colors line-clamp-2">
                                    {c.place}
                                  </div>
                                  <div className="text-[13px] leading-snug mt-1.5 text-[#E2DDE3]/90 line-clamp-2">
                                    {c.hook}
                                  </div>
                                  {/* Direct Destination Link & AI Plan */}
                                  <div className="mt-3.5 pt-2.5 border-t border-white/20 flex items-center justify-between gap-2 text-[12.5px]">
                                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F0406] bg-[#F5F2F5] group-hover:bg-[#C9A0AC] px-3.5 py-1.5 rounded-full transition-colors shadow-sm text-[12px]">
                                      Explore Package <span className="transition-transform group-hover:translate-x-0.5">→</span>
                                    </span>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        router.push(`/tailored-travel?destination=${encodeURIComponent(c.place)}`)
                                      }}
                                      className="text-[#E2DDE3] hover:text-white font-medium px-2 py-1 hover:underline cursor-pointer transition text-[12px] whitespace-nowrap"
                                    >
                                      Plan with AI
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          )
                        })}
                      </div>

                      {/* Carousel Controls */}
                      {displayCards.length > 1 && (
                        <div className="flex items-center gap-4 mt-4 px-2 flex-wrap">
                          <button
                            onClick={() => goToCard(i, (cardIdx + displayCards.length - 1) % displayCards.length)}
                            aria-label="Previous card"
                            className="w-[48px] h-[48px] rounded-full border border-[#F5F2F5]/55 bg-[#0F0406]/40 text-[#E2DDE3] text-[18px] flex items-center justify-center cursor-pointer transition hover:bg-[#F5F2F5]/20"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => goToCard(i, (cardIdx + 1) % displayCards.length)}
                            aria-label="Next card"
                            className="w-[48px] h-[48px] rounded-full border border-[#F5F2F5] bg-[#F5F2F5] text-[#0F0406] text-[18px] flex items-center justify-center cursor-pointer transition hover:bg-[#C9A0AC]"
                          >
                            →
                          </button>

                          <div className="flex-1 max-w-[220px] h-[2px] bg-[#F5F2F5]/25 rounded overflow-hidden">
                            <div
                              className="h-full bg-[#C9A0AC] transition-all duration-500 ease-out"
                              style={{ width: `${((cardIdx + 1) / displayCards.length) * 100}%` }}
                            />
                          </div>

                          <div className="font-cormorant flex items-baseline gap-1.5">
                            <span className="text-[34px] font-normal leading-none text-white">
                              {String(cardIdx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-[17px] text-[#C9A0AC]">/ 08</span>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </section>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. DESTINATIONS SECTION (CONNECTS TO /destinations/[slug])
      ───────────────────────────────────────────────────────────── */}
      <section id="destinations" className="bg-[#E2DDE3]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[12.5px] font-semibold tracking-[0.24em] uppercase text-[#651926]">
                Destinations
              </div>
              <h2 className="font-cormorant font-normal text-[clamp(38px,4.6vw,62px)] leading-tight tracking-[-0.01em] mt-3">
                Where couples are going
              </h2>
            </div>
            {/* Tab switch + Explore All button */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 bg-[#F5F2F5] rounded-full p-1.5 shadow-sm">
                <button
                  onClick={() => setDestTab('International')}
                  className={`font-figtree text-[15px] font-semibold px-5 py-2.5 rounded-full transition cursor-pointer ${
                    destTab === 'International'
                      ? 'bg-[#462831] text-[#E2DDE3]'
                      : 'bg-transparent text-[#0F0406] hover:text-[#651926]'
                  }`}
                >
                  International
                </button>
                <button
                  onClick={() => setDestTab('India')}
                  className={`font-figtree text-[15px] font-semibold px-5 py-2.5 rounded-full transition cursor-pointer ${
                    destTab === 'India'
                      ? 'bg-[#462831] text-[#E2DDE3]'
                      : 'bg-transparent text-[#0F0406] hover:text-[#651926]'
                  }`}
                >
                  India
                </button>
              </div>

              <Link
                href="/destinations"
                className="font-semibold text-sm text-[#0F0406] hover:text-[#651926] underline underline-offset-4"
              >
                All Destinations →
              </Link>
            </div>
          </div>

          {/* Destinations Grid (Real Next.js destination detail pages from Firestore) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12">
            {(destinationsData[destTab] || []).map(dest => (
              <Link
                key={dest.name}
                href={`/destinations/${dest.slug}`}
                className="group relative block h-[clamp(320px,30vw,420px)] rounded-[20px] overflow-hidden bg-[#C9A0AC] shadow-sm animate-[tzRise_0.5s_ease_both]"
              >
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
                  <img
                    src={dest.img}
                    alt={dest.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(15,4,6,0.92) 0%, rgba(70,40,49,0.25) 42%, transparent 64%)'
                  }}
                />
                <div className="absolute left-6 right-6 bottom-5 text-[#E2DDE3] flex items-end justify-between gap-3">
                  <div>
                    <div className="font-cormorant font-semibold text-[32px] leading-none">
                      {dest.name}
                    </div>
                    <div className="text-[14.5px] mt-2 text-[#E2DDE3]">
                      {dest.meta}
                    </div>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-[#F5F2F5] text-[#0F0406] flex items-center justify-center text-[17px] group-hover:bg-[#C9A0AC] transition-colors">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. STAYS & SKIES (MARQUEE)
      ───────────────────────────────────────────────────────────── */}
      <section id="stays" className="py-16 sm:py-28 overflow-hidden">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8 text-center">
          <div className="text-[12.5px] font-semibold tracking-[0.24em] uppercase text-[#651926]">
            Stays &amp; skies
          </div>
          <h2 className="font-cormorant font-normal text-[clamp(36px,4.2vw,56px)] leading-tight tracking-[-0.01em] mt-3.5">
            Only the names you'd pick yourselves
          </h2>
        </div>

        <div className="mt-10 sm:mt-14 space-y-6">
          {/* Hotels Marquee */}
          <div>
            <div className="text-center text-[12.5px] font-semibold tracking-[0.2em] uppercase text-[#651926] mb-4">
              Luxury hotel partners
            </div>
            <div
              className="overflow-hidden"
              style={{
                maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)'
              }}
            >
              <div className="flex items-center w-max animate-[tzMarquee_42s_linear_infinite]">
                {[...hotelPartners, ...hotelPartners, ...hotelPartners].map((hotel, idx) => (
                  <div key={idx} className="h-[92px] px-6 sm:px-11 flex items-center">
                    <img
                      src={hotel.logo}
                      alt={hotel.name}
                      title={hotel.name}
                      className="w-[140px] h-[54px] object-contain mix-blend-multiply grayscale opacity-85 hover:grayscale-0 hover:opacity-100 transition duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Airlines Marquee (Reverse) */}
          <div className="pt-2">
            <div className="text-center text-[12.5px] font-semibold tracking-[0.2em] uppercase text-[#651926] mb-3">
              Premium airlines
            </div>
            <div
              className="overflow-hidden"
              style={{
                maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)'
              }}
            >
              <div
                className="flex items-center w-max"
                style={{ animation: 'tzMarquee 36s linear infinite reverse' }}
              >
                {[...airlines, ...airlines, ...airlines].map((air, idx) => (
                  <div
                    key={idx}
                    className="h-[72px] px-6 sm:px-11 flex items-center font-cormorant font-semibold text-[26px] tracking-[0.08em] uppercase text-[#0F0406] whitespace-nowrap"
                  >
                    {air}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. HOW IT WORKS (CONNECTS TO /tailored-travel)
      ───────────────────────────────────────────────────────────── */}
      <section id="how" className="bg-[#462831] text-[#E2DDE3]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-24 items-center">

          {/* Left Image & Floating Cost Card */}
          <div className="relative pb-12 mx-auto lg:mx-0 w-full max-w-[460px]">
            <div className="h-[clamp(440px,46vw,600px)] rounded-t-full rounded-b-[20px] overflow-hidden outline outline-1 outline-[#651926] outline-offset-[10px]">
              <img
                src="https://ik.imagekit.io/tux8wjwgq/Kerala/romantic%20candlelight%20dinner%20in%20kerala.png?tr=w-1000"
                alt="Candlelit dinner for two"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Floating Breakdown Card */}
            <div className="absolute right-0 bottom-0 w-[min(330px,90%)] bg-[#F5F2F5] text-[#0F0406] rounded-[18px] p-5 shadow-[0_30px_60px_-28px_rgba(0,0,0,0.6)] animate-[tzFloat_6s_ease-in-out_infinite]">
              <div className="flex justify-between items-baseline gap-2">
                <div className="text-[12px] font-semibold tracking-[0.14em] uppercase text-[#651926]">
                  Sample breakdown
                </div>
                <div className="text-[12.5px] text-[#651926]">100% itemised</div>
              </div>
              <div className="font-cormorant font-semibold text-[24px] mt-1.5">
                Kashmir Honeymoon · 6N/7D
              </div>

              {/* Segmented bar */}
              <div className="flex h-2.5 rounded-full overflow-hidden mt-3.5 gap-0.5">
                <div className="w-[42%] bg-[#462831]" title="Hotels" />
                <div className="w-[18%] bg-[#651926]" title="Transfers" />
                <div className="w-[21%] bg-[#95929C]" title="Activities" />
                <div className="w-[11%] bg-[#C9A0AC]" title="Romantic extras" />
                <div className="w-[8%] bg-[#E2DDE3]" title="Service fee" />
              </div>

              {/* Price rows */}
              <div className="grid gap-1.5 mt-3.5 text-[14px]">
                <div className="flex justify-between"><span>Hotels (4★)</span><span className="font-medium">₹16,000</span></div>
                <div className="flex justify-between"><span>Transfers</span><span className="font-medium">₹7,000</span></div>
                <div className="flex justify-between"><span>Activities</span><span className="font-medium">₹8,000</span></div>
                <div className="flex justify-between"><span>Romantic extras</span><span className="font-medium">₹4,000</span></div>
                <div className="flex justify-between"><span>Service fee</span><span className="font-medium">₹3,000</span></div>
              </div>

              <div className="flex justify-between items-baseline border-t border-[#95929C]/30 mt-3 pt-3">
                <span className="text-[14px] text-[#651926]">Total / person</span>
                <span className="text-[20px] font-bold">₹38,000</span>
              </div>
            </div>
          </div>

          {/* Right Text & Steps */}
          <div>
            <div className="font-pinyon text-[clamp(30px,3vw,40px)] text-[#C9A0AC] leading-none">
              how it works
            </div>
            <h2 className="font-cormorant font-normal text-[clamp(38px,4.4vw,58px)] leading-[1.04] tracking-[-0.01em] mt-2.5">
              From one message to a trip you'll remember
            </h2>

            <div className="relative mt-8 sm:mt-11 pl-11">
              {/* Vertical connecting line */}
              <div className="absolute left-[13px] top-2.5 bottom-2.5 w-[1px] bg-[#651926]" />

              {/* Step 1 */}
              <div className="relative pb-7">
                <div className="absolute -left-[44px] top-0 w-7 h-7 rounded-full bg-[#462831] border border-[#651926]/40 flex items-center justify-center text-[11.5px] font-semibold text-[#E2DDE3]">
                  01
                </div>
                <h3 className="text-[19px] font-semibold mt-0.5 text-[#E2DDE3]">
                  Share your preferences
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#E2DDE3] mt-1.5 max-w-[460px]">
                  Destination, dates, budget and the occasion. Sixty seconds.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative pb-7">
                <div className="absolute -left-[44px] top-0 w-7 h-7 rounded-full bg-[#462831] border border-[#651926]/40 flex items-center justify-center text-[11.5px] font-semibold text-[#E2DDE3]">
                  02
                </div>
                <h3 className="text-[19px] font-semibold mt-0.5 text-[#E2DDE3]">
                  Get your personalised itinerary
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#E2DDE3] mt-1.5 max-w-[460px]">
                  Day by day — hotels, transfers, romantic add-ons.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative pb-7">
                <div className="absolute -left-[44px] top-0 w-7 h-7 rounded-full bg-[#462831] border border-[#651926]/40 flex items-center justify-center text-[11.5px] font-semibold text-[#E2DDE3]">
                  03
                </div>
                <h3 className="text-[19px] font-semibold mt-0.5 text-[#E2DDE3]">
                  Your planner perfects it
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#E2DDE3] mt-1.5 max-w-[460px]">
                  A real expert refines every detail with you on WhatsApp.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative pb-5">
                <div className="absolute -left-[44px] top-0 w-7 h-7 rounded-full bg-[#462831] border border-[#651926]/40 flex items-center justify-center text-[11.5px] font-semibold text-[#E2DDE3]">
                  04
                </div>
                <h3 className="text-[19px] font-semibold mt-0.5 text-[#E2DDE3]">
                  See exactly what you pay
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#E2DDE3] mt-1.5 max-w-[460px]">
                  A complete, itemised breakdown. No hidden charges.
                </p>
              </div>
            </div>

            <Link
              href="/tailored-travel"
              className="inline-block text-[15.5px] font-semibold text-[#0F0406] bg-[#F5F2F5] px-7 py-4 rounded-full transition hover:bg-[#C9A0AC] hover:-translate-y-0.5 mt-2"
            >
              Start planning — it's free
            </Link>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. REAL COUPLES TESTIMONIAL (CONNECTS TO /reviews)
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-20 items-center">
        <div className="h-[clamp(360px,38vw,520px)] rounded-[20px] overflow-hidden shadow-md">
          <img
            src="https://ik.imagekit.io/tux8wjwgq/Bali/anniversary%20special.jpg?tr=w-1200"
            alt="Real couple story photo"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <div className="text-[12.5px] font-semibold tracking-[0.24em] uppercase text-[#651926]">
            Real couples
          </div>
          <div className="font-cormorant text-[96px] leading-[0.5] text-[#C9A0AC] mt-9">
            “
          </div>
          <blockquote className="font-cormorant font-normal text-[clamp(24px,2.6vw,36px)] leading-snug mt-1.5 text-balance">
            {featuredReviews[0]?.content || "Our honeymoon was truly unforgettable, and all thanks to Travelzada. Every detail was thoughtfully planned—from seamless transfers to beautiful hotel stays."}
          </blockquote>
          <div className="flex items-center gap-3.5 mt-7">
            <div className="w-12 h-12 rounded-full bg-[#E2DDE3] flex items-center justify-center font-cormorant font-semibold text-[18px]">
              {(featuredReviews[0]?.name || 'Nishchay Gupta').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="text-[16px] font-semibold">{featuredReviews[0]?.name || 'Nishchay Gupta'}</div>
              <div className="text-[14.5px] text-[#651926] mt-0.5">
                {featuredReviews[0]?.packageName || 'Singapore Dream Honeymoon'} · Verified Couple
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap border-t border-[#95929C]/30 mt-8 pt-6">
            <div className="flex">
              {['M&S', 'K&V', 'N&I', 'D&P'].map((initials, idx) => (
                <div
                  key={idx}
                  className="w-[38px] h-[38px] rounded-full bg-[#462831] text-[#E2DDE3] border-2 border-[#F5F2F5] -mr-2.5 flex items-center justify-center text-[11.5px] font-semibold"
                >
                  {initials}
                </div>
              ))}
            </div>
            <div className="text-[15px] pl-2.5">
              <strong className="font-semibold">4.9/5</strong> from 500+ couples
            </div>
            <Link
              href="/reviews"
              className="text-[15px] font-semibold text-[#651926] border-b border-[#651926]/40 pb-0.5 hover:text-[#0F0406] transition-colors"
            >
              Read all reviews
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. QUESTIONS COUPLES ASK (FAQ)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#E2DDE3]">
        <div className="max-w-[860px] mx-auto px-5 sm:px-8 py-16 sm:py-28">
          <h2 className="font-cormorant font-normal text-[clamp(36px,4.2vw,56px)] leading-tight text-center">
            Questions couples ask
          </h2>
          <div className="grid gap-2.5 mt-8 sm:mt-11">
            {faqData.map((faq, i) => {
              const isOpen = activeFaq === i
              return (
                <div key={i} className="bg-[#F5F2F5] rounded-[16px] overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 bg-transparent border-none cursor-pointer p-5 sm:p-6 text-left font-figtree text-[17px] font-semibold text-[#0F0406]"
                  >
                    <span>{faq.q}</span>
                    <span
                      className={`w-8 h-8 rounded-full border border-[#651926]/40 flex items-center justify-center flex-none text-[18px] text-[#651926] transition-transform duration-300 ${
                        isOpen ? 'rotate-45' : 'rotate-0'
                      }`}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-[16px] leading-relaxed text-[#651926] max-w-[680px] animate-[tzRise_0.35s_ease_both]">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. ENQUIRE / BOOKING FORM (REAL FIRESTORE & EMAIL INTEGRATION)
      ───────────────────────────────────────────────────────────── */}
      <section id="enquire" className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-9 sm:gap-20 items-start">
          <div>
            <div className="font-pinyon text-[clamp(30px,3vw,40px)] text-[#651926] leading-none">
              let's begin
            </div>
            <h2 className="font-cormorant font-normal text-[clamp(40px,4.8vw,64px)] leading-none tracking-[-0.01em] mt-2.5">
              Tell us about the two of you
            </h2>
            <p className="text-[17px] leading-relaxed text-[#651926] mt-4 max-w-[440px]">
              Free, personalised itinerary. No payment until you love it.
            </p>

            {/* Occasion Chips Multi-select */}
            <div className="text-[12.5px] font-semibold tracking-[0.2em] uppercase text-[#651926] mt-8">
              The occasion
            </div>
            <div className="flex flex-wrap gap-2 mt-3.5 max-w-[520px]">
              {allOccasionsList.map(occName => {
                const isSelected = pickedOccasions.includes(occName)
                return (
                  <button
                    key={occName}
                    type="button"
                    onClick={() => toggleOccasion(occName)}
                    className={`font-figtree text-[14.5px] font-medium rounded-full px-4 py-2.5 cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-[#462831] text-[#E2DDE3] border-[#462831]'
                        : 'bg-transparent text-[#0F0406] border-[#651926]/40 hover:border-[#462831]'
                    }`}
                  >
                    {occName}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-[#95929C]/30 rounded-[24px] p-6 sm:p-10 shadow-sm grid gap-4">
            <form onSubmit={handleEnquirySubmit} className="grid gap-4">
              <label className="block">
                <div className="text-[14px] font-semibold text-[#0F0406]">Your names</div>
                <input
                  type="text"
                  required
                  value={formData.names}
                  onChange={e => setFormData({ ...formData, names: e.target.value })}
                  placeholder="Riya &amp; Aarav"
                  className="w-full box-border mt-2 border border-[#95929C]/30 rounded-[12px] bg-[#F5F2F5] outline-none font-figtree text-[16px] text-[#0F0406] p-3.5 focus:border-[#651926] focus:bg-white transition"
                />
              </label>

              <label className="block">
                <div className="text-[14px] font-semibold text-[#0F0406]">Where to?</div>
                <input
                  type="text"
                  required
                  value={formData.whereTo}
                  onChange={e => setFormData({ ...formData, whereTo: e.target.value })}
                  placeholder="Bali, Kashmir, anywhere warm…"
                  className="w-full box-border mt-2 border border-[#95929C]/30 rounded-[12px] bg-[#F5F2F5] outline-none font-figtree text-[16px] text-[#0F0406] p-3.5 focus:border-[#651926] focus:bg-white transition"
                />
              </label>

              <label className="block">
                <div className="text-[14px] font-semibold text-[#0F0406]">When &amp; how long?</div>
                <input
                  type="text"
                  required
                  value={formData.when}
                  onChange={e => setFormData({ ...formData, when: e.target.value })}
                  placeholder="February, 6 nights"
                  className="w-full box-border mt-2 border border-[#95929C]/30 rounded-[12px] bg-[#F5F2F5] outline-none font-figtree text-[16px] text-[#0F0406] p-3.5 focus:border-[#651926] focus:bg-white transition"
                />
              </label>

              <label className="block">
                <div className="text-[14px] font-semibold text-[#0F0406]">WhatsApp mobile number</div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full box-border mt-2 border border-[#95929C]/30 rounded-[12px] bg-[#F5F2F5] outline-none font-figtree text-[16px] text-[#0F0406] p-3.5 focus:border-[#651926] focus:bg-white transition"
                />
              </label>

              {formError && (
                <div className="text-red-600 text-sm font-medium">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="font-figtree text-[16px] font-semibold text-[#E2DDE3] bg-[#462831] disabled:bg-gray-400 border-none rounded-full py-4 px-7 cursor-pointer mt-1.5 transition hover:bg-[#651926] hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Saving your request...</span>
                ) : (
                  <span>Get our free itinerary</span>
                )}
              </button>
            </form>

            {submitSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-center text-sm font-medium animate-[tzRise_0.3s_ease_both]">
                ✓ Your inquiry has been saved! A personal travel designer will connect with you on WhatsApp shortly.
              </div>
            )}

            <a
              href="https://wa.me/919929962350"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-[15px] font-semibold text-[#0F0406] hover:text-[#651926] transition-colors pt-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              Or chat directly on WhatsApp — +91 99299 62350
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. MOBILE FLOATING ACTION BAR
      ───────────────────────────────────────────────────────────── */}
      {isNarrow && (
        <>
          <div className="h-[84px] bg-[#462831]" />
          <div className="fixed left-3 right-3 bottom-3 z-50 flex gap-2 bg-[#F5F2F5] rounded-full p-1.5 shadow-[0_18px_40px_-14px_rgba(15,4,6,0.55),0_0_0_1px_#E2DDE3] animate-[tzRise_0.4s_ease_both]">
            <a
              href="https://wa.me/919929962350"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Us"
              className="flex-none w-[52px] h-[52px] rounded-full bg-[#E2DDE3] flex items-center justify-center hover:bg-[#C9A0AC] transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B2A20" strokeWidth="2">
                <path d="M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z" />
              </svg>
            </a>
            <Link
              href="/tailored-travel"
              className="flex-1 flex items-center justify-center text-[16px] font-semibold text-[#E2DDE3] bg-[#462831] rounded-full hover:bg-[#651926] transition-colors"
            >
              Plan our trip — free
            </Link>
          </div>
        </>
      )}

    </div>
  )
}
