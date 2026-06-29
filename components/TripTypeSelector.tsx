'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const tripTypes = [
  {
    key: 'honeymoon',
    label: 'Honeymoon Trips',
    line: 'The classic — romance from day one.',
    count: '50+ packages',
    img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path d="M12 21s-7-4.5-9.5-8.5C.5 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5.5 3.5 3.5 7C19 16.5 12 21 12 21z" />
      </svg>
    ),
  },
  {
    key: 'anniversary',
    label: 'Anniversary Getaways',
    line: 'Celebrate another year together.',
    count: '30+ packages',
    img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" /><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5" />
      </svg>
    ),
  },
  {
    key: 'birthday',
    label: 'Birthday Escapes',
    line: 'Surprise them with a getaway.',
    count: '20+ packages',
    img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21h16v-7H4zM4 14a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M12 8V5M12 5l-1.5-2M12 5l1.5-2" />
      </svg>
    ),
  },
  {
    key: 'weekend',
    label: 'Romantic Weekends',
    line: 'Short, sweet, unforgettable.',
    count: '25+ packages',
    img: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    ),
  },
]

const budgetTiers = [
  { key: 'all',     label: 'All',              range: '' },
  { key: 'budget',  label: 'Budget-Friendly',  range: 'Under ₹30k' },
  { key: 'value',   label: 'Best Value',        range: '₹30k–₹70k' },
  { key: 'premium', label: 'Premium',           range: '₹70k–₹1.5L' },
  { key: 'luxury',  label: 'Luxury',            range: '₹1.5L+' },
]

export default function TripTypeSelector() {
  const [selectedType, setSelectedType] = useState('honeymoon')
  const [selectedBudget, setSelectedBudget] = useState('all')
  const router = useRouter()

  const handleExplore = () => {
    const params = new URLSearchParams()
    params.set('type', selectedType)
    if (selectedBudget !== 'all') params.set('budget', selectedBudget)
    router.push(`/packages?${params.toString()}`)
  }

  return (
    <section style={{ background: '#fff', padding: '96px 24px' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-11">
          <div className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: '#a08a6a' }}>
            Find Your Trip
          </div>
          <h2
            style={{
              margin: '0 0 14px',
              fontSize: 'clamp(28px,4vw,40px)',
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: '#1a1a24',
            }}
          >
            What kind of romantic escape<br className="hidden md:block" /> are you dreaming of?
          </h2>
          <p style={{ margin: 0, fontSize: 16, color: '#6b6b76' }}>
            Pick a vibe — we&rsquo;ll tailor every detail to the two of you.
          </p>
        </div>

        {/* Trip type cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {tripTypes.map((t) => {
            const isSelected = selectedType === t.key
            return (
              <button
                key={t.key}
                onClick={() => {
                  setSelectedType(t.key)
                  const params = new URLSearchParams()
                  params.set('type', t.key)
                  if (selectedBudget !== 'all') params.set('budget', selectedBudget)
                  router.push(`/packages?${params.toString()}`)
                }}
                className="relative overflow-hidden text-left transition-all duration-300 focus:outline-none"
                style={{
                  height: 'clamp(220px, 45vw, 330px)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: 'none',
                  padding: 0,
                  transform: isSelected ? 'translateY(-6px)' : 'translateY(0)',
                  boxShadow: isSelected
                    ? '0 0 0 2px #fff, 0 0 0 4px #4f46e5, 0 22px 50px rgba(79,70,229,.32)'
                    : '0 12px 32px rgba(26,26,36,.14)',
                }}
              >
                {/* Background image */}
                <Image
                  src={t.img}
                  alt={t.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700"
                  style={{ transform: isSelected ? 'scale(1.06)' : 'scale(1)' }}
                />

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(12,11,20,.9) 0%, rgba(12,11,20,.32) 52%, rgba(12,11,20,.12) 100%)' }}
                />

                {/* Check badge */}
                <div
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg,#9333ea,#4f46e5)',
                    boxShadow: '0 6px 16px rgba(79,70,229,.5)',
                    opacity: isSelected ? 1 : 0,
                    transform: isSelected ? 'scale(1)' : 'scale(0.5)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>

                {/* Content */}
                <div className="absolute left-0 right-0 bottom-0 p-5">
                  {/* Icon circle */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{ background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.3)' }}
                  >
                    {t.icon}
                  </div>
                  <h3
                    className="text-white mb-1.5 leading-tight"
                    style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(15px, 4vw, 20px)', fontWeight: 600 }}
                  >
                    {t.label}
                  </h3>
                  <p className="text-xs md:text-sm mb-2.5" style={{ color: 'rgba(255,255,255,.78)', lineHeight: 1.5 }}>
                    {t.line}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider" style={{ color: '#e9d5ff' }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#c7b48a' }} />
                    {t.count}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Budget filter */}
        <div className="flex items-center gap-4 flex-wrap justify-center mb-6">
          <div className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase" style={{ color: '#a08a6a' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a08a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Your Budget
          </div>

          <div
            className="inline-flex items-center gap-1.5 flex-wrap justify-center p-1.5 rounded-xl"
            style={{ background: '#faf8f5', border: '1px solid #e9e5dd' }}
          >
            {budgetTiers.map((b) => {
              const isSel = selectedBudget === b.key
              return (
                <button
                  key={b.key}
                  onClick={() => setSelectedBudget(b.key)}
                  className="flex flex-col items-center transition-all duration-200 focus:outline-none"
                  style={{
                    padding: b.range ? '9px 18px' : '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: isSel ? 'linear-gradient(135deg,#9333ea,#4f46e5)' : 'transparent',
                    color: isSel ? '#fff' : '#1a1a24',
                    boxShadow: isSel ? '0 8px 20px rgba(79,70,229,.32)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.1 }}>{b.label}</span>
                  {b.range && (
                    <span style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: isSel ? 'rgba(255,255,255,.78)' : '#9a9aa5' }}>
                      {b.range}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center" style={{ fontSize: 15, color: '#6b6b76' }}>
          Every package is customizable. Share your budget and we&rsquo;ll build the perfect honeymoon around it.{' '}
          <strong style={{ color: '#1a1a24' }}>No judgment, no upselling.</strong>{' '}
          <button
            onClick={handleExplore}
            className="font-bold"
            style={{ color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}
          >
            Get Free Custom Quote →
          </button>
        </p>

      </div>
    </section>
  )
}
