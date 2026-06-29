import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DestinationsClient from './DestinationsClient'
import travelDatabase from '@/data/travel-database.json'
import SchemaMarkup, { generateBreadcrumbSchema, generateItemListSchema, generateWebPageSchema } from '@/components/SchemaMarkup'
import Image from 'next/image'

const travelData = travelDatabase as any

export const metadata: Metadata = {
  title: 'Explore Destinations | Travelzada — Curated for Couples',
  description: 'Discover 25+ destinations curated for honeymoons and romantic getaways — from the backwaters of Kerala to the atolls of the Maldives.',
  alternates: { canonical: 'https://www.travelzada.com/destinations' },
  openGraph: {
    title: 'Explore Destinations | Travelzada',
    description: 'Discover 25+ destinations curated for honeymoons and romantic getaways.',
    url: 'https://www.travelzada.com/destinations',
    type: 'website',
    images: [{ url: 'https://www.travelzada.com/images/og-homepage.jpg' }],
  },
  robots: { index: true, follow: true },
}

interface Destination {
  id?: string
  name: string
  country: string
  description: string
  image: string
  slug: string
  region?: string
  featured?: boolean
  packageIds?: string[]
}

async function fetchDestinations(): Promise<Destination[]> {
  try {
    const { db } = await import('@/lib/firebase')
    const { collection, getDocs } = await import('firebase/firestore')
    if (!db) return travelData.destinations ?? []

    const snap = await getDocs(collection(db, 'destinations'))
    const data: Destination[] = []
    snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Destination))
    return data.length > 0 ? data : (travelData.destinations ?? [])
  } catch {
    return travelData.destinations ?? []
  }
}

const STRIP_IMG: Record<string, string> = {
  bali:         'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=200&q=80',
  maldives:     'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=200&q=80',
  kerala:       'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=200&q=80',
  kashmir:      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80',
  rajasthan:    'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=200&q=80',
  goa:          'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=200&q=80',
  dubai:        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=200&q=80',
  thailand:     'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&q=80',
  singapore:    'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=200&q=80',
  andaman:      'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=200&q=80',
  manali:       'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80',
  ladakh:       'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=200&q=80',
  baku:         'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=200&q=80',
  phuket:       'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&q=80',
}

function getStripImg(d: Destination): string {
  if (d.image) return d.image
  const key = d.name.toLowerCase().replace(/[\s-]/g, '')
  for (const [k, v] of Object.entries(STRIP_IMG)) {
    if (key.includes(k)) return v
  }
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=80'
}

export default async function DestinationsPage() {
  const destinations = await fetchDestinations()

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' },
    { name: 'Destinations', url: 'https://www.travelzada.com/destinations' },
  ])
  const webPageSchema = generateWebPageSchema({
    name: 'Explore Destinations | Travelzada',
    description: 'Discover destinations curated for couples.',
    url: 'https://www.travelzada.com/destinations',
    websiteUrl: 'https://www.travelzada.com',
  })
  const itemListSchema = generateItemListSchema(
    'Travelzada Destinations',
    'Curated romantic destinations.',
    destinations.map((d) => ({
      name: d.name,
      url: `https://www.travelzada.com/destinations/${d.slug || d.name.toLowerCase().replace(/\s+/g, '-')}`,
    }))
  )

  const indiaCount = destinations.filter(d => d.country?.toLowerCase() === 'india').length
  const intlCount  = destinations.length - indiaCount

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#0a0910' }}>
      <SchemaMarkup schema={breadcrumbSchema} id="breadcrumbs" />
      <SchemaMarkup schema={itemListSchema} id="item-list" />
      <SchemaMarkup schema={webPageSchema} id="webpage-schema" />
      <Header />

      {/* ── Hero ── */}
      <section className="relative flex flex-col overflow-hidden" style={{ minHeight: '100vh' }}>

        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=85"
            alt="Travel background"
            fill
            className="object-cover"
            priority
          />
          {/* Deep cinematic overlay */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,9,16,.55) 0%, rgba(10,9,16,.38) 40%, rgba(10,9,16,.75) 75%, rgba(10,9,16,1) 100%)' }} />
          {/* Left vignette */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 100% at 0% 50%, rgba(10,9,16,.4), transparent)' }} />
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-6 pt-32 pb-16">

          {/* Eyebrow pill */}
          <div
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.14)' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c4b5fd', display: 'inline-block' }} />
            <span className="text-xs font-semibold tracking-[0.24em] uppercase" style={{ color: 'rgba(255,255,255,.8)' }}>
              Curated for Couples
            </span>
          </div>

          {/* Main heading */}
          <h1
            style={{
              margin: '0 0 20px',
              fontSize: 'clamp(36px, 6.5vw, 82px)',
              fontFamily: 'var(--font-playfair), "Playfair Display", serif',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              maxWidth: 860,
            }}
          >
            Where should your{' '}
            <em style={{ color: '#c4b5fd', fontStyle: 'italic', fontWeight: 500 }}>love story</em>
            <br />take you?
          </h1>

          <p style={{ margin: '0 0 44px', fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(255,255,255,.65)', lineHeight: 1.8, maxWidth: 480 }}>
            {destinations.length}+ handpicked destinations — from the backwaters of Kerala to the atolls of the Maldives.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            {[
              { value: `${destinations.length}+`, label: 'Destinations' },
              { value: String(indiaCount), label: 'India' },
              { value: String(intlCount), label: 'International' },
              { value: '100%', label: 'Couple-curated' },
            ].map(s => (
              <div
                key={s.label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full"
                style={{ background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.16)' }}
              >
                <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{s.value}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>Scroll</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>

        {/* ── Destination preview strip ── */}
        <div className="relative z-10 pb-8">
          <p className="text-center mb-4" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>
            Popular with couples
          </p>
          <div
            className="flex items-end gap-4 px-6 pb-2"
            style={{ overflowX: 'auto', scrollbarWidth: 'none', justifyContent: 'center' }}
          >
            {destinations.slice(0, 10).map((p, i) => (
              <div key={p.name} className="flex-none flex flex-col items-center gap-2">
                <div
                  className="relative overflow-hidden"
                  style={{
                    width: i % 3 === 1 ? 72 : 56,
                    height: i % 3 === 1 ? 72 : 56,
                    borderRadius: '50%',
                    border: '2px solid rgba(196,181,253,.35)',
                    boxShadow: '0 4px 20px rgba(0,0,0,.4)',
                    flexShrink: 0,
                  }}
                >
                  <Image src={getStripImg(p)} alt="" fill className="object-cover" />
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Destinations content ── */}
      <div style={{ background: '#faf8f5' }}>
        <DestinationsClient initialDestinations={destinations} />
      </div>

      <Footer />
    </main>
  )
}
