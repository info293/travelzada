'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DestinationPackage {
  id?: string
  Destination_ID: string
  Destination_Name: string
  Overview: string
  Duration: string
  Duration_Days?: number
  Mood: string
  Occasion: string
  Travel_Type: string
  Star_Category: string
  Price_Range_INR: string
  Primary_Image_URL: string
  Inclusions: string
  Exclusions?: string
  Theme?: string
  Stay?: string
  Day_Wise_Itinerary?: string
  [key: string]: any
}

interface PageProps {
  params: { slug: string; packageId: string }
}

type Bullet = { label: string; description: string }

const WHY_BOOK_WITH_US: Bullet[] = [
  { label: 'Best Price Guarantee', description: 'Direct contracts with premium hotels' },
  { label: '24/7 Support', description: 'Dedicated trip concierge on WhatsApp & call' },
  { label: 'Instant Confirmation', description: 'Travel docs delivered straight to inbox' },
  { label: 'Flexible Payments', description: 'Pay in secure instalments with zero cost EMI' },
]

const FAQ_ITEMS = [
  {
    question: 'What is the best time to visit Bali?',
    answer:
      'The dry season from April to October offers sunny skies, calm waters and fewer showers—perfect for sightseeing and water adventures.',
  },
  {
    question: 'Do I need a visa for Bali?',
    answer:
      'Indian passport holders can obtain a visa on arrival for tourist travel up to 30 days. Carry a return ticket and proof of accommodation.',
  },
  {
    question: 'Can I customize the itinerary?',
    answer:
      'Absolutely. Our destination experts can tweak hotel categories, add private experiences or extend nights on request.',
  },
]

const GUEST_REVIEWS = [
  {
    name: 'Anjali Mehta',
    content:
      'Best vacation ever! The Ubud rice terraces were breathtaking, and the candlelight dinner on the beach was so romantic.',
    date: '14 November 2025',
  },
  {
    name: 'Priya & Rahul Sharma',
    content:
      'Our honeymoon in Bali was absolutely magical. Every detail was perfectly arranged and the private transfers made it seamless.',
    date: '11 November 2025',
  },
]

export default function PackageDetailPage({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug)
  const packageId = params.packageId
  const [packageData, setPackageData] = useState<DestinationPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchPackage = async () => {
      if (typeof window === 'undefined' || !db) {
        setLoading(false)
        setNotFound(true)
        return
      }

      try {
        setLoading(true)
        
        // Try to fetch by document ID first
        const docRef = doc(db, 'packages', packageId)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data() as DestinationPackage
          // Verify it matches the destination
          if (data.Destination_Name?.toLowerCase().includes(slug.toLowerCase()) ||
              slug.toLowerCase().includes(data.Destination_Name?.toLowerCase() || '')) {
            setPackageData({ id: docSnap.id, ...data })
            setLoading(false)
            return
          }
        }
        
        // If not found by ID, try to find by Destination_ID
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        const packagesRef = collection(db, 'packages')
        const q = query(packagesRef, where('Destination_ID', '==', packageId))
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0]
          const data = doc.data() as DestinationPackage
          if (data.Destination_Name?.toLowerCase().includes(slug.toLowerCase()) ||
              slug.toLowerCase().includes(data.Destination_Name?.toLowerCase() || '')) {
            setPackageData({ id: doc.id, ...data })
            setLoading(false)
            return
          }
        }
        
        // If still not found, try searching all packages
        const allPackagesSnapshot = await getDocs(packagesRef)
        for (const doc of allPackagesSnapshot.docs) {
          const data = doc.data() as DestinationPackage
          if ((data.Destination_ID === packageId || doc.id === packageId) &&
              (data.Destination_Name?.toLowerCase().includes(slug.toLowerCase()) ||
               slug.toLowerCase().includes(data.Destination_Name?.toLowerCase() || ''))) {
            setPackageData({ id: doc.id, ...data })
            setLoading(false)
            return
          }
        }
        
        setNotFound(true)
      } catch (error) {
        console.error('Error fetching package:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchPackage()
  }, [packageId, slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] text-gray-900">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading package details...</p>
        </div>
        <Footer />
      </main>
    )
  }

  if (notFound || !packageData) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] text-gray-900">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Package Not Found</h1>
            <p className="text-gray-600 mb-8">The package you're looking for doesn't exist.</p>
            <Link
              href={`/destinations/${slug}`}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Back to Packages
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  // Extract image URL from Primary_Image_URL (handle markdown format)
  const imageUrl = packageData.Primary_Image_URL
    ? packageData.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
    : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
  
  // Parse inclusions and exclusions
  const inclusions = packageData.Inclusions?.split(',').map((i: string) => i.trim()) || []
  const exclusions = packageData.Exclusions?.split(',').map((e: string) => e.trim()) || []
  
  // Extract days from Duration or Duration_Days
  const extractDays = (duration: string): number => {
    const match = duration.match(/(\d+)/)
    return match ? parseInt(match[1]) : (packageData.Duration_Days || 5)
  }
  const days = extractDays(packageData.Duration)
  
  // Create itinerary from Day_Wise_Itinerary field or generate from duration
  const createItinerary = () => {
    // Check if Day_Wise_Itinerary exists in package data
    if (packageData.Day_Wise_Itinerary) {
      // Parse the Day_Wise_Itinerary string
      // Format: "Day 1: Arrive & relax | Day 2: Ubud Tour | Day 3: Watersports | ..."
      const itineraryItems = packageData.Day_Wise_Itinerary.split('|').map((item: string) => item.trim())
      
      return itineraryItems.map((item: string, index: number) => {
        // Extract day number and title
        const dayMatch = item.match(/Day\s*(\d+):\s*(.+)/i)
        if (dayMatch) {
          const dayNum = dayMatch[1]
          const title = dayMatch[2].trim()
          return {
            day: `Day ${dayNum}`,
            title: title,
            description: index === 0 
              ? `Arrive in ${packageData.Destination_Name || 'Bali'} and check into your hotel. ${packageData.Overview || ''}`
              : index === itineraryItems.length - 1
              ? `Final day in ${packageData.Destination_Name || 'Bali'}. Check out and depart with wonderful memories.`
              : `Enjoy ${title.toLowerCase()} in ${packageData.Destination_Name || 'Bali'}. ${packageData.Overview || ''}`,
            details: index === 0 
              ? ['Airport pickup', 'Hotel check-in', 'Welcome briefing']
              : index === itineraryItems.length - 1
              ? ['Hotel check-out', 'Airport transfer', 'Departure']
              : inclusions.slice(0, 3)
          }
        } else {
          // Fallback if format doesn't match
          return {
            day: `Day ${index + 1}`,
            title: item.replace(/^Day\s*\d+:\s*/i, '').trim() || `Day ${index + 1} Activities`,
            description: packageData.Overview || `Experience the beauty of ${packageData.Destination_Name}`,
            details: inclusions.slice(0, 3)
          }
        }
      })
    }
    
    // Fallback: Generate simple itinerary based on duration
    const itinerary = []
    for (let i = 1; i <= days; i++) {
      itinerary.push({
        day: `Day ${i}`,
        title: i === 1 ? 'Arrival & Check-in' : i === days ? 'Departure' : `Day ${i} Activities`,
        description: i === 1
          ? `Arrive in ${packageData.Destination_Name || 'Bali'} and check into your hotel. ${packageData.Overview || ''}`
          : i === days
          ? `Final day in ${packageData.Destination_Name || 'Bali'}. Check out and depart with wonderful memories.`
          : `Enjoy your stay in ${packageData.Destination_Name || 'Bali'}. ${packageData.Overview || ''}`,
        details: i === 1
          ? ['Airport pickup', 'Hotel check-in', 'Welcome briefing']
          : i === days
          ? ['Hotel check-out', 'Airport transfer', 'Departure']
          : inclusions.slice(0, 3)
      })
    }
    return itinerary
  }
  
  const packageUrl = `https://travelzada.com/destinations/${slug}/${packageId}`
  const packageTitle = packageData.Destination_Name || 'Package'
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(
    `Hi! I'm interested in the ${packageTitle} package. Could you share more details? ${packageUrl}`
  )}`
  const shareText = encodeURIComponent(
    `Check out ${packageTitle} on Travelzada • ${packageUrl}`
  )

  return (
    <main className="min-h-screen bg-[#f8f5f0] text-gray-900">
      <Header />

      <section className="relative h-[420px] md:h-[520px] w-full">
        <Image
          src={imageUrl}
          alt={packageTitle}
          fill
          className="object-cover"
          priority
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#f8f5f0] opacity-95" />
      </section>

      <section className="relative -mt-36 md:-mt-40 px-4 md:px-8 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
          <div className="space-y-8">
            <article className="bg-white rounded-[5px] shadow-lg p-8 space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-sm text-primary font-semibold uppercase tracking-wide">
                <span className="px-3 py-1 bg-primary/10 rounded-full">{packageData.Destination_Name}</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">{packageData.Duration}</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">{packageData.Star_Category || 'Hotel'}</span>
              </div>
              <div className="flex flex-col gap-3">
                <h1 className="text-4xl md:text-5xl font-serif text-[#1e1d2f]">{packageTitle}</h1>
                <p className="text-sm text-primary font-semibold">Flexible payment options available</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <StatBlock label="Duration" value={packageData.Duration} />
                <StatBlock label="Location" value={packageData.Destination_Name || 'Bali, Indonesia'} />
                <StatBlock label="Hotel" value={packageData.Star_Category || 'Hotel'} />
                <StatBlock label="Travel Type" value={packageData.Travel_Type || '—'} />
              </div>
            </article>
            <SectionCard title="Package Highlights" intro={packageData.Overview}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <Fact label="Destination" value={packageData.Destination_Name || 'Bali, Indonesia'} />
                <Fact label="Duration" value={packageData.Duration} />
                <Fact label="Mood" value={packageData.Mood || 'Relax'} />
                <Fact label="Theme" value={packageData.Theme || 'Beach / Culture'} />
                <Fact label="Travel Type" value={packageData.Travel_Type || 'Couple'} />
                <Fact label="Stay" value={packageData.Stay || packageData.Star_Category || 'Hotel'} />
              </dl>
            </SectionCard>

            <SectionCard title="Highlights">
              <ul className="space-y-3 text-lg text-[#1e1d2f]">
                {inclusions.slice(0, 5).map((inclusion, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <span className="mt-1 text-primary">✔</span>
                    <p>{inclusion}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Day-wise Itinerary">
              <div className="space-y-4">
                {createItinerary().map((day, index) => (
                  <details
                    key={day.day}
                    className="rounded-[5px] border border-gray-200 bg-white p-5 open:shadow-sm"
                    open={index === 0}
                  >
                    <summary className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3 text-lg font-medium">
                        <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          {index + 1}
                        </span>
                        {day.day}: {day.title}
                      </div>
                      <span className="text-sm text-primary">View details</span>
                    </summary>
                    <div className="mt-4 text-gray-600 space-y-3">
                      <p>{day.description}</p>
                      <ul className="list-disc pl-6 space-y-1">
                        {day.details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionCard title="Inclusions">
                <ListWithIcon items={inclusions} icon="✓" iconClass="text-green-600" />
              </SectionCard>
              <SectionCard title="Exclusions">
                <ListWithIcon items={exclusions.length > 0 ? exclusions : ['International flights', 'Visa fees', 'Personal expenses']} icon="✕" iconClass="text-red-500" />
              </SectionCard>
            </div>

            <SectionCard title="Guest Reviews">
              <div className="space-y-6">
                {GUEST_REVIEWS.map((review) => (
                  <div key={review.name} className="rounded-[5px] border border-gray-200 p-5 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">{review.name}</p>
                      <p className="text-yellow-500">★★★★★</p>
                    </div>
                    <p className="text-gray-600 mb-2">{review.content}</p>
                    <p className="text-sm text-gray-500">{review.date}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Booking Policies">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <PolicyCard title="Booking" items={['Instant confirmation', 'Flexible dates', '24/7 support']} />
                <PolicyCard title="Payment" items={['Pay in instalments', 'Zero cost EMI', 'Secure transactions']} />
                <PolicyCard title="Cancellation" items={['Free cancellation up to 7 days', 'Partial refund available', 'Contact for details']} />
              </div>
            </SectionCard>

            <SectionCard title="Frequently Asked Questions">
              <div className="space-y-4">
                {FAQ_ITEMS.map((faq) => (
                  <details
                    key={faq.question}
                    className="rounded-[5px] border border-gray-200 bg-white p-5 open:shadow-sm"
                  >
                    <summary className="cursor-pointer text-lg font-medium text-[#1e1d2f]">
                      {faq.question}
                    </summary>
                    <p className="mt-3 text-gray-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Location Map">
              <div className="aspect-[16/9] rounded-[5px] overflow-hidden border border-gray-200 shadow-sm">
                <iframe
                  title={`Map of ${packageData.Destination_Name || 'Bali'}`}
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d252111.25858393507!2d114.79136011672423!3d-8.4543220429647!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd239dc54737811%3A0x3030bfbca7cb180!2sBali%2C%20Indonesia!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                  width="600"
                  height="450"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                ></iframe>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-[5px] shadow-xl p-8 space-y-6">
              <div>
                <p className="text-sm text-gray-500">Starting from</p>
                <p className="text-4xl font-serif text-[#c99846]">{packageData.Price_Range_INR || 'Contact for price'}</p>
                <p className="text-sm text-gray-500">Per person • twin sharing</p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href={`/contact?package=${packageId}`}
                  className="w-full text-center bg-primary text-white py-3 rounded-[5px] font-semibold transition hover:bg-primary/90"
                >
                  Enquire Now
                </Link>
                <Link
                  href="/packages/itinerary.pdf"
                  className="w-full text-center border border-gray-900 text-gray-900 py-3 rounded-[5px] font-semibold transition hover:bg-gray-900 hover:text-white"
                >
                  Download Itinerary
                </Link>
              </div>
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <p className="text-sm font-semibold text-[#1e1d2f]">Share Package</p>
                <div className="flex gap-3">
                  <a
                    href={whatsappShare}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-green-500 text-white py-2.5 rounded-[5px] font-semibold hover:bg-green-600 transition"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${shareText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-[#0a1026] text-white py-2.5 rounded-[5px] font-semibold hover:bg-black transition"
                  >
                    Share
                  </a>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#1e1d2f]">Contact Us</p>
                <p className="flex items-center gap-2 text-gray-600">
                  <span aria-hidden="true">📞</span> +91 98765 43210
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                  <span aria-hidden="true">✉️</span> hello@travelzada.com
                </p>
              </div>
              <div className="rounded-[5px] border border-gray-100 bg-gray-50 p-4 space-y-3">
                <p className="font-semibold text-sm text-[#1e1d2f]">Why Book With Us</p>
                {WHY_BOOK_WITH_US.map((item) => (
                  <div key={item.label} className="flex gap-3 text-sm text-gray-600">
                    <span className="text-primary">✓</span>
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <SectionCard title="Travel Concierge">
              <p className="text-gray-600 mb-3">
                Need help customising this journey? Speak to our Bali specialist for curated stays,
                private experiences and visa assistance.
              </p>
              <Link
                href="tel:+919876543210"
                className="inline-flex items-center gap-3 text-primary font-semibold"
              >
                Call +91 98765 43210 →
              </Link>
            </SectionCard>

            <SectionCard title="Why Travelers Love Us">
              <ul className="space-y-3 text-gray-600">
                <li>98% positive reviews across honeymoon packages</li>
                <li>Partners with luxury resorts in Kuta, Ubud and Nusa Dua</li>
                <li>Assistance with forex, insurance and travel SIM</li>
              </ul>
            </SectionCard>

            <SectionCard title="Need a Custom Quote?">
              <p className="text-gray-600">
                Email us at{' '}
                <a href="mailto:hello@travelzada.com" className="text-primary font-semibold">
                  hello@travelzada.com
                </a>{' '}
                with your travel dates and preferences.
              </p>
            </SectionCard>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function SectionCard({ title, children, intro }: { title: string; children: ReactNode; intro?: string }) {
  return (
    <section className="bg-white rounded-[5px] shadow-sm p-6 md:p-8 space-y-4">
      <div>
        <h2 className="text-2xl font-serif text-[#1e1d2f]">{title}</h2>
        {intro && <p className="text-gray-600 mt-2">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-semibold text-[#1e1d2f]">{value}</p>
    </div>
  )
}

function ListWithIcon({ items, icon, iconClass }: { items: string[]; icon: string; iconClass: string }) {
  return (
    <ul className="space-y-3 text-gray-600">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span className={`font-semibold ${iconClass}`}>{icon}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function PolicyCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[5px] border border-gray-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-[#1e1d2f] mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-gray-600">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-lg font-medium text-[#1e1d2f]">{value}</dd>
    </div>
  )
}

