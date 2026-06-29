import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PackagesClient, { PackageItem } from './PackagesClient'

export const metadata: Metadata = {
  title: 'Honeymoon & Romantic Packages | Travelzada',
  description:
    'Browse curated honeymoon, anniversary, birthday, and romantic getaway packages across India and the world. Filter by budget and book in minutes.',
}

function buildSlug(name: string): string {
  return name.toLowerCase().split(',')[0].trim().replace(/\s+/g, '-') || 'destination'
}

function buildPackageId(pkg: Record<string, unknown>): string {
  return (pkg.Slug as string) || (pkg.Destination_ID as string) || (pkg.id as string) || 'package'
}

async function fetchAllPackages(): Promise<PackageItem[]> {
  try {
    const { db } = await import('@/lib/firebase')
    const { collection, getDocs } = await import('firebase/firestore')

    const snap = await getDocs(collection(db, 'packages'))
    const items: PackageItem[] = []

    snap.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>
      const pkg: PackageItem = {
        id: doc.id,
        Destination_Name: (data.Destination_Name as string) || '',
        Duration: (data.Duration as string) || '',
        Price_Range_INR: (data.Price_Range_INR as string | number) || '',
        Primary_Image_URL: (data.Primary_Image_URL as string) || '',
        Star_Category: data.Star_Category as string | undefined,
        Travel_Type: data.Travel_Type as string | undefined,
        Occasion: data.Occasion as string | undefined,
        Destination_ID: data.Destination_ID as string | undefined,
        destinationSlug: buildSlug((data.Destination_Name as string) || ''),
        packageId: buildPackageId({ ...data, id: doc.id }),
      }
      items.push(pkg)
    })

    return items
  } catch (err) {
    console.error('Error fetching packages:', err)
    return []
  }
}

interface Props {
  searchParams: { type?: string; budget?: string }
}

export default async function PackagesPage({ searchParams }: Props) {
  const allPackages = await fetchAllPackages()
  const initialType = searchParams.type || 'all'
  const initialBudget = searchParams.budget || 'all'

  return (
    <>
    <Header />
    <main className="min-h-screen pt-16 md:pt-24" style={{ background: '#faf8f5' }}>
      {/* Page header */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1a1a24 0%,#2d2050 100%)', padding: '80px 24px 56px' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 80% at 80% 40%, rgba(99,102,241,.18), transparent)' }}
        />
        <div className="relative max-w-3xl mx-auto text-center text-white">
          <div className="text-xs font-bold tracking-[0.22em] uppercase mb-4" style={{ color: '#a5b4fc' }}>
            Curated Escapes
          </div>
          <h1
            style={{
              margin: '0 0 16px',
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(30px,5vw,52px)',
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            Find Your Perfect Romantic Escape
          </h1>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>
            Every package is curated for couples — from budget getaways to luxury hideaways.
          </p>
        </div>
      </div>

      <PackagesClient
        allPackages={allPackages}
        initialType={initialType}
        initialBudget={initialBudget}
      />
    </main>
    <Footer />
    </>
  )
}
