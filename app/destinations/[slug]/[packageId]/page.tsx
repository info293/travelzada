'use client'

import { useEffect, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import LeadForm from '@/components/LeadForm'
import SchemaMarkup, { generateTravelPackageSchema, generateBreadcrumbSchema } from '@/components/SchemaMarkup'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import AiLoader from '@/components/ui/AiLoader'

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
  Guest_Reviews?: Array<{
    name: string
    content: string
    date: string
    rating?: string
  }>
  Booking_Policies?: {
    booking?: string[]
    payment?: string[]
    cancellation?: string[]
  }
  FAQ_Items?: Array<{
    question: string
    answer: string
  }>
  Why_Book_With_Us?: Array<{
    label: string
    description: string
  }>
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

// Default fallback values (used if not in Firestore)
const DEFAULT_FAQ_ITEMS = [
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

const DEFAULT_GUEST_REVIEWS: Array<{
  name: string
  content: string
  date: string
  rating?: string
}> = [
    {
      name: 'Anjali Mehta',
      content:
        'Best vacation ever! The Ubud rice terraces were breathtaking, and the candlelight dinner on the beach was so romantic.',
      date: '14 November 2025',
      rating: '5/5',
    },
    {
      name: 'Priya & Rahul Sharma',
      content:
        'Our honeymoon in Bali was absolutely magical. Every detail was perfectly arranged and the private transfers made it seamless.',
      date: '11 November 2025',
      rating: '5/5',
    },
  ]

export default function PackageDetailPage({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug)
  const packageId = decodeURIComponent(params.packageId)
  const [packageData, setPackageData] = useState<DestinationPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [showAllFAQs, setShowAllFAQs] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storageKey = `destination-lead-popup:${slug.toLowerCase()}`
    if (sessionStorage.getItem(storageKey) === 'true') return

    const timer = window.setTimeout(() => {
      setShowLeadForm(true)
      sessionStorage.setItem(storageKey, 'true')
    }, 30000)

    return () => window.clearTimeout(timer)
  }, [slug])

  useEffect(() => {
    const fetchPackage = async () => {
      if (typeof window === 'undefined' || !db) {
        setLoading(false)
        setNotFound(true)
        return
      }

      try {
        setLoading(true)

        // Try to fetch by document ID first (most direct way)
        const docRef = doc(db, 'packages', packageId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data() as DestinationPackage
          // If found by document ID, use it regardless of destination slug
          setPackageData({ id: docSnap.id, ...data })
          setLoading(false)
          return
        }

        // If not found by document ID, try to find by Slug first (for SEO-friendly URLs)
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        const packagesRef = collection(db, 'packages')

        try {
          // Try to find by Slug first (for custom SEO-friendly URLs)
          const slugQuery = query(packagesRef, where('Slug', '==', packageId))
          const slugSnapshot = await getDocs(slugQuery)

          if (!slugSnapshot.empty) {
            const doc = slugSnapshot.docs[0]
            const data = doc.data() as DestinationPackage
            setPackageData({ id: doc.id, ...data })
            setLoading(false)
            return
          }
        } catch (slugError) {
          console.log('Query by Slug failed, trying Destination_ID:', slugError)
        }

        try {
          const q = query(packagesRef, where('Destination_ID', '==', packageId))
          const querySnapshot = await getDocs(q)

          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0]
            const data = doc.data() as DestinationPackage
            // If found by Destination_ID, use it regardless of destination slug
            setPackageData({ id: doc.id, ...data })
            setLoading(false)
            return
          }
        } catch (queryError) {
          // If query fails (e.g., missing index), continue to fallback search
          console.log('Query by Destination_ID failed, trying fallback:', queryError)
        }

        // If still not found, try searching all packages by ID or Slug match
        console.log(`Searching all packages for packageId: ${packageId}`)
        const allPackagesSnapshot = await getDocs(packagesRef)
        for (const doc of allPackagesSnapshot.docs) {
          const data = doc.data() as DestinationPackage
          // Match by Slug, Destination_ID, or document ID
          const matchesId = data.Slug === packageId || data.Destination_ID === packageId || doc.id === packageId

          if (matchesId) {
            console.log(`Found package: ${doc.id}`)
            setPackageData({ id: doc.id, ...data })
            setLoading(false)
            return
          }
        }

        console.log(`Package not found: ${packageId}`)

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

  // Parse inclusions and exclusions - handle both string and array types
  const parseListField = (field: string | string[] | undefined): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field.map((i: string) => String(i).trim());
    if (typeof field === 'string') return field.split(',').map((i: string) => i.trim());
    return [];
  };
  const inclusions = parseListField(packageData.Inclusions);
  const exclusions = parseListField(packageData.Exclusions);

  // Helper to parse policies which might be arrays or stringified arrays
  const parsePolicies = (items: any): string[] => {
    if (!items) return []
    if (Array.isArray(items)) {
      // Check if it's an array of format ["\"Policy 1\", \"Policy 2\""] which is effectively a stringified array inside an array
      if (items.length === 1 && typeof items[0] === 'string' && items[0].includes('", "')) {
        return items[0].split('", "').map((i: string) => i.replace(/^"|"$/g, '').replace(/^\\"|\\"?$/g, '').trim())
      }
      return items.map((i: any) => String(i).trim())
    }
    if (typeof items === 'string') {
      // Handle "Item 1, Item 2" or "\"Item 1\", \"Item 2\""
      if (items.includes('", "')) {
        return items.split('", "').map(i => i.replace(/^"|"$/g, '').replace(/^\\"|\\"?$/g, '').trim())
      }
      return items.split(',').map(i => i.trim())
    }
    return []
  }

  // Extract days from Duration or Duration_Days
  const extractDays = (duration: string): number => {
    const match = duration.match(/(\d+)/)
    return match ? parseInt(match[1]) : (packageData.Duration_Days || 5)
  }
  const days = extractDays(packageData.Duration)

  // Generate schema.org structured data for SEO
  const packageSchema = generateTravelPackageSchema({
    name: packageData.Destination_Name || 'Travel Package',
    description: packageData.Overview || packageData.Destination_Name,
    image: imageUrl,
    priceRange: packageData.Price_Range_INR,
    currency: 'INR',
    duration: packageData.Duration,
    destination: slug,
    url: typeof window !== 'undefined' ? window.location.href : `https://www.travelzada.com/destinations/${slug}/${packageId}`,
  })

  // Generate breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' },
    { name: 'Destinations', url: 'https://www.travelzada.com/destinations' },
    { name: slug, url: `https://www.travelzada.com/destinations/${slug}` },
    { name: packageData.Destination_Name || 'Package' },
  ])

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
  const whatsappShare = `https://wa.me/919929962350?text=${encodeURIComponent(
    `Hello! I'm interested in booking the ${packageTitle} package.\n\nPackage Details:\n${packageUrl}\n\nPlease share more information about:\n- Availability\n- Pricing details\n- Booking process\n\nThank you!`
  )}`
  const shareText = encodeURIComponent(
    `Check out ${packageTitle} on Travelzada • ${packageUrl}`
  )

  const handleDownloadItinerary = async () => {
    if (isGeneratingPDF) return

    try {
      setIsGeneratingPDF(true)

      // PDF Generation Logic wrapped in a function

      // PDF Generation Logic wrapped in a function
      const generatePdfPromise = (async () => {
        // Dynamically import jspdf
        const jsPDFModule = await import('jspdf')
        const jsPDF = jsPDFModule.default || jsPDFModule

        const pdf = new jsPDF('p', 'mm', 'a4')
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 20

        // Brand Colors - Matching Website UI
        const COLOR_PRIMARY = [124, 58, 237] // #7c3aed (Purple - Primary)
        const COLOR_PRIMARY_DARK = [109, 40, 217] // #6d28d9 (Purple Dark)
        const COLOR_ACCENT = [212, 175, 55] // #d4af37 (Gold - Accent)
        const COLOR_ACCENT_DARK = [183, 144, 37] // #b79025 (Gold Dark)
        const COLOR_INK = [31, 27, 44] // #1f1b2c (Ink - Dark Text)
        const COLOR_CREAM = [253, 249, 243] // #fdf9f3 (Cream - Background)
        const COLOR_PRICE = [201, 152, 70] // #c99846 (Price Gold)
        const COLOR_GRAY = [100, 100, 100]
        const COLOR_LIGHT_BG = [253, 249, 243] // Cream background

        // Helper to load image
        const loadImage = (url: string): Promise<string> => {
          return new Promise((resolve, reject) => {
            const img = new window.Image()
            img.crossOrigin = 'Anonymous'
            img.src = url
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0)
                resolve(canvas.toDataURL('image/png'))
              } else {
                reject(new Error('Could not get canvas context'))
              }
            }
            img.onerror = reject
          })
        }

        // Helper: Add Footer
        const addFooter = (pageNum: number) => {
          const footerY = pageHeight - 15
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(150, 150, 150)
          pdf.text('Travelzada • +91 99299 62350 • info@travelzada.com', pageWidth / 2, footerY, { align: 'center' })

          // CTA Link - Using Primary Purple
          pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
          pdf.setFont('helvetica', 'bold')
          pdf.textWithLink('Book this Package on Travelzada', pageWidth / 2, footerY + 5, { url: window.location.href, align: 'center' })
        }

        // Helper to get image properties (width/height)
        const getImageProperties = (url: string): Promise<{ width: number; height: number }> => {
          return new Promise((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => {
              resolve({ width: img.width, height: img.height })
            }
            img.onerror = reject
            img.src = url
          })
        }

        // Helper: Add Logo
        const addLogo = async () => {
          try {
            const logoUrl = '/images/logo/Travelzada Logo April (1).png'
            const logoData = await loadImage(logoUrl)

            // Calculate aspect ratio to prevent distortion
            const imgProps = await getImageProperties(logoUrl)
            const targetHeight = 15
            const targetWidth = (imgProps.width / imgProps.height) * targetHeight

            // Add logo to top left
            pdf.addImage(logoData, 'PNG', 15, 10, targetWidth, targetHeight, undefined, 'FAST')
          } catch (e) {
            console.error('Failed to load logo', e)
          }
        }

        // Helper: Add Header Strip (Pages 2+)
        const addHeader = async (pageNum: number) => {
          // Primary Purple Strip - Matching website
          pdf.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
          pdf.rect(0, 0, pageWidth, 25, 'F')

          // Logo Container with rounded corners
          pdf.setFillColor(255, 255, 255)
          pdf.roundedRect(10, 2, 45, 21, 3, 3, 'F')

          try {
            const logoUrl = '/images/logo/Travelzada Logo April (1).png'
            const logoData = await loadImage(logoUrl)

            // Calculate aspect ratio
            const imgProps = await getImageProperties(logoUrl)
            const targetHeight = 15
            const targetWidth = (imgProps.width / imgProps.height) * targetHeight

            // Center logo in the white box (approx width 45)
            const xPos = 10 + (45 - targetWidth) / 2

            pdf.addImage(logoData, 'PNG', xPos, 5, targetWidth, targetHeight, undefined, 'FAST')
          } catch (e) {
            console.error('Failed to load logo', e)
          }

          // Package Title (Truncated) - White text on purple
          pdf.setFont('times', 'bold')
          pdf.setFontSize(14)
          pdf.setTextColor(255, 255, 255)
          const title = packageTitle.length > 40 ? packageTitle.substring(0, 37) + '...' : packageTitle
          pdf.text(title, pageWidth - 10, 17, { align: 'right' })
        }

        // --- PAGE 1: COVER PAGE (UNCHANGED) ---
        try {
          const mainImageData = await loadImage(imageUrl)
          const imgHeight = pageHeight * 0.6
          pdf.addImage(mainImageData, 'JPEG', 0, 0, pageWidth, imgHeight, undefined, 'FAST')
        } catch (e) {
          console.error('Failed to load main image', e)
        }

        // Add Logo to Page 1
        await addLogo()

        pdf.setTextColor(255, 255, 255)
        pdf.setFont('times', 'bold')
        // Calculate title height dynamically to prevent overlap
        pdf.setFont('times', 'bold')
        pdf.setFontSize(32)
        const maxTitleWidth = pageWidth - 40
        const titleLines = pdf.splitTextToSize(packageTitle, maxTitleWidth)

        // Start Y position relative to image height
        // Adjusted to ensure it leaves ~30-40mm padding from bottom of image
        const titleStartY = (pageHeight * 0.6) - (titleLines.length * 12) - 40
        pdf.text(titleLines, pageWidth / 2, titleStartY, { align: 'center' })

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(12)
        const tags = [
          packageData.Duration,
          packageData.Star_Category || 'Luxury Stay',
          packageData.Travel_Type || 'Custom Trip'
        ].join('  •  ')

        // Position tags relative to title end
        const tagsY = titleStartY + (titleLines.length * 12) + 12
        pdf.text(tags, pageWidth / 2, tagsY, { align: 'center' })

        const contentStartY = (pageHeight * 0.6) + 15
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])

        pdf.setFontSize(10)
        pdf.setTextColor(100, 100, 100)
        pdf.text('STARTING FROM', pageWidth / 2, contentStartY, { align: 'center' })

        pdf.setFont('times', 'bold')
        pdf.setFontSize(28)
        // Using Price Gold color - matching website
        pdf.setTextColor(COLOR_PRICE[0], COLOR_PRICE[1], COLOR_PRICE[2])
        pdf.text(`INR ${String(packageData.Price_Range_INR)}`, pageWidth / 2, contentStartY + 12, { align: 'center' })

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(150, 150, 150)
        pdf.text(`Quoted on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, contentStartY + 20, { align: 'center' })

        pdf.setDrawColor(200, 200, 200)
        pdf.line((pageWidth / 2) - 15, contentStartY + 28, (pageWidth / 2) + 15, contentStartY + 28)

        pdf.setFontSize(11)
        pdf.setTextColor(60, 60, 60)
        const overviewText = pdf.splitTextToSize(packageData.Overview || '', pageWidth - 60)
        pdf.text(overviewText, pageWidth / 2, contentStartY + 40, { align: 'center' })


        // --- PAGE 2: DETAILS & HIGHLIGHTS ---
        pdf.addPage()
        addFooter(2)
        await addLogo()
        let y = margin + 10 // Increased top margin for logo

        // Header Branding Line - Primary Purple
        pdf.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
        pdf.setLineWidth(2)
        pdf.line(margin, y, margin + 25, y)
        y += 12

        // Details Box - Cream background matching website
        const boxHeight = 45
        pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2])
        pdf.roundedRect(margin, y, pageWidth - (margin * 2), boxHeight, 5, 5, 'F')

        let boxY = y + 12
        const col1X = margin + 10
        const col2X = margin + (pageWidth - (margin * 2)) / 2 + 10

        // Row 1
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Duration', col1X, boxY)
        pdf.text('Location', col2X, boxY)

        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(80, 80, 80)
        pdf.text(String(packageData.Duration || ''), col1X, boxY + 6)
        pdf.text(String(packageData.Destination_Name || 'Bali'), col2X, boxY + 6)

        boxY += 18

        // Row 2
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Hotel Category', col1X, boxY)
        pdf.text('Travel Type', col2X, boxY)

        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(80, 80, 80)
        pdf.text(String(packageData.Star_Category || '4-Star'), col1X, boxY + 6)
        pdf.text(String(packageData.Travel_Type || 'Couple'), col2X, boxY + 6)

        y += boxHeight + 15

        // Highlights - Matching website style


        // Highlights - Matching website style
        pdf.setFont('times', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Highlights', margin, y)
        y += 12

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(60, 60, 60)
        inclusions.slice(0, 6).forEach(item => {
          // Custom bullet - Using Primary Purple
          pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
          pdf.setFont('helvetica', 'bold')
          pdf.text('+', margin, y)

          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          pdf.text(item, margin + 8, y)
          y += 9
        })


        // --- PAGE 3: ITINERARY & INC/EXC ---
        pdf.addPage()
        addFooter(3)
        await addLogo()
        y = margin + 10

        // Header Branding Line - Primary Purple
        pdf.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
        pdf.setLineWidth(2)
        pdf.line(margin, y, margin + 25, y)
        y += 12

        // Itinerary - Matching website style
        pdf.setFont('times', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Day-wise Itinerary', margin, y)
        y += 15

        const itinerary = createItinerary()

        // Draw vertical timeline line
        const timelineX = margin + 6
        const timelineStartY = y

        itinerary.forEach((day, index) => {
          if (y > pageHeight - margin) { pdf.addPage(); addFooter(3); addLogo(); y = margin + 20; }

          // Dot - Primary Purple circle
          pdf.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
          pdf.circle(timelineX, y - 1.5, 2, 'F')

          // Day Text - Primary Purple
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
          pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
          pdf.text(day.day, timelineX + 10, y)

          // Title - Ink color
          pdf.setFont('helvetica', 'medium')
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          const titleX = timelineX + 35
          const titleWidth = pageWidth - margin - titleX
          const titleLines = pdf.splitTextToSize(day.title, titleWidth)
          pdf.text(titleLines, titleX, y)

          y += (titleLines.length * 6) + 6
        })

        // Draw line connecting dots (approximate)
        pdf.setDrawColor(220, 220, 220)
        pdf.setLineWidth(0.5)
        pdf.line(timelineX, timelineStartY - 2, timelineX, y - 12)

        y += 10

        // --- INCLUSIONS & EXCLUSIONS ---
        // --- INCLUSIONS & EXCLUSIONS ---
        // Helper to calculate height of a list
        const getListHeight = (items: string[], width: number) => {
          let h = 0
          items.forEach(item => {
            const lines = pdf.splitTextToSize(item, width - 10)
            h += (lines.length * 6) + 2 // Matching line height + spacing used below
          })
          return h
        }

        const colW = (pageWidth - (margin * 3)) / 2

        // Calculate required heights for both columns
        const incHeight = getListHeight(inclusions, colW) + 20 // +20 for title spacing
        const excHeight = getListHeight(exclusions, colW) + 20
        const maxHeight = Math.max(incHeight, excHeight, 100) // Minimum 100 height

        // --- PAGE 4: Inclusions/Exclusions (Always start on new page) ---
        pdf.addPage()
        addFooter(4)
        await addLogo()
        y = margin + 10

        // Header Branding Line - Primary Purple
        pdf.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
        pdf.setLineWidth(2)
        pdf.line(margin, y, margin + 25, y)
        y += 12

        const incExcStartY = y
        const startY = y // Snapshot starting Y for alignment

        // Inclusions - Cream background with dynamic height
        pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2])
        pdf.roundedRect(margin, y - 5, colW, maxHeight, 5, 5, 'F')

        pdf.setFont('times', 'bold')
        pdf.setFontSize(16)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Inclusions', margin, y)
        y += 10

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        inclusions.forEach(item => {
          const lines = pdf.splitTextToSize(item, colW - 10)
          // Green Check
          pdf.setTextColor(22, 163, 74)
          pdf.setFont('helvetica', 'bold')
          pdf.text('+', margin, y)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          pdf.text(lines, margin + 6, y)
          y += (lines.length * 6) + 2
        })

        // Exclusions - Cream background with dynamic height
        let y2 = startY // Reset Y to start for second column
        pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2])
        pdf.roundedRect(margin + colW + margin, y2 - 5, colW, maxHeight, 5, 5, 'F')

        pdf.setFont('times', 'bold')
        pdf.setFontSize(16)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Exclusions', margin + colW + margin, y2)
        y2 += 10

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        exclusions.forEach(item => {
          const lines = pdf.splitTextToSize(item, colW - 10)
          // Red X
          pdf.setTextColor(239, 68, 68)
          pdf.setFont('helvetica', 'bold')
          pdf.text('-', margin + colW + margin, y2)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          pdf.text(lines, margin + colW + margin + 6, y2)
          y2 += (lines.length * 6) + 2
        })

        // Update main Y to be below the tallest column
        y = startY + maxHeight + 10

        // --- PAGE 4: REVIEWS, POLICIES, FAQ ---
        // Check if we need a new page for Reviews
        if (y > pageHeight - 100) {
          pdf.addPage()
          addFooter(4)
          await addLogo()
          y = margin + 10
        } else {
          y += 15 // Add some spacing if continuing on same page
        }

        // Header Branding Line (only if new page or enough space)
        if (y === margin + 10) {
          pdf.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
          pdf.setLineWidth(2)
          pdf.line(margin, y, margin + 25, y)
          y += 12
        }

        // Reviews
        pdf.setFont('times', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Guest Reviews', margin, y)
        y += 15

        const reviews = packageData.Guest_Reviews || DEFAULT_GUEST_REVIEWS
        const reviewsToShow = reviews.slice(0, 1) // Show ONLY 1 review as per request
        // FULL WIDTH: Use entire page width minus margins
        const reviewColW = pageWidth - (margin * 2)

        // 1. Calculate Height
        let maxContentHeight = 0
        const processedReviews = reviewsToShow.map(review => {
          const maxReviewLength = 300
          let reviewContent = review.content
          if (reviewContent.length > maxReviewLength) {
            reviewContent = reviewContent.substring(0, maxReviewLength) + '...'
          }

          pdf.setFont('helvetica', 'italic')
          pdf.setFontSize(10)
          const contentLines = pdf.splitTextToSize(`"${reviewContent}"`, reviewColW - 10)
          // Height: Top pad(6) + Name(6) + Gap(4) + Content(lines*6) + Gap(4) + Date(8) + Bottom Pad(4) => Tighter spacing
          const height = 6 + 6 + 4 + (contentLines.length * 6) + 4 + 8 + 4

          if (height > maxContentHeight) maxContentHeight = height

          return { ...review, contentLines, contentHeight: height }
        })

        // Reduce min height floor from 60 to 40
        const reviewBoxHeight = Math.max(maxContentHeight, 40)

        // 2. Page Break Logic - DISABLED BY REQUEST
        // User explicitly asked to force it on the "next page" behavior being wrong and wants it on the same page.
        /*
        if (y + reviewBoxHeight > pageHeight - margin) {
          pdf.addPage()
          addFooter(4)
          await addLogo()
          y = margin + 25
        }
        */

        // 3. Draw Single Review
        processedReviews.forEach((review, index) => {
          const xPos = margin
          let currY = y

          // Draw Box
          pdf.setDrawColor(230, 230, 230)
          pdf.setFillColor(255, 255, 255)
          pdf.roundedRect(xPos, currY, reviewColW, reviewBoxHeight, 3, 3, 'FD')

          currY += 6 // Reduced top padding

          // Name
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          pdf.text(String(review.name || 'Guest'), xPos + 5, currY)

          // Rating
          pdf.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2])
          pdf.setFont('helvetica', 'bold')
          pdf.text(String(review.rating || '5/5'), xPos + reviewColW - 5, currY, { align: 'right' })

          currY += 6 // Reduced gap

          // Content
          pdf.setFont('helvetica', 'italic')
          pdf.setFontSize(9)
          pdf.setTextColor(80, 80, 80)
          pdf.text(review.contentLines, xPos + 5, currY)

          // Date at bottom
          const dateY = y + reviewBoxHeight - 5

          // Date
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(150, 150, 150)
          pdf.text(String(review.date || ''), xPos + 5, dateY)
        })

        // Update main Y
        y += reviewBoxHeight + 15

        // --- PAGE 5: BOOKING POLICIES (Always start on new page) ---
        pdf.addPage()
        addFooter(5)
        await addLogo()
        y = margin + 10

        // Header Branding Line - Primary Purple
        pdf.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
        pdf.setLineWidth(2)
        pdf.line(margin, y, margin + 25, y)
        y += 12

        pdf.setFont('times', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Booking Policies', margin, y)
        y += 15

        const drawPolicySection = (title: string, items: string[]) => {
          // Section Title
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(12)
          pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]) // Primary Color Title
          pdf.text(title, margin, y)
          y += 7

          // Items
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(10)
          pdf.setTextColor(60, 60, 60)

          items.forEach(p => {
            const bullet = '•'
            const indent = 5

            // Write bullet
            pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
            pdf.text(bullet, margin, y)

            // Write text wrapping to full width
            pdf.setTextColor(60, 60, 60)
            const textWidth = pageWidth - (margin * 2) - indent
            const lines = pdf.splitTextToSize(p, textWidth)

            pdf.text(lines, margin + indent, y)
            y += (lines.length * 5) + 3 // Line height + spacing between items
          })
          y += 8 // Spacing between sections
        }

        drawPolicySection('Booking Terms', parsePolicies(packageData.Booking_Policies?.booking || ['Instant confirmation', 'Flexible dates']))
        drawPolicySection('Payment Policy', parsePolicies(packageData.Booking_Policies?.payment || ['Pay in instalments', 'Zero cost EMI']))
        drawPolicySection('Cancellation Policy', parsePolicies(packageData.Booking_Policies?.cancellation || ['Free cancellation up to 7 days']))

        // --- PAGE 6: FAQs (Always start on new page) ---
        pdf.addPage()
        addFooter(6)
        await addLogo()
        y = margin + 10

        // Header Branding Line - Primary Purple
        pdf.setDrawColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
        pdf.setLineWidth(2)
        pdf.line(margin, y, margin + 25, y)
        y += 12

        pdf.setFont('times', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Frequently Asked Questions', margin, y)
        y += 12

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
          ; (packageData.FAQ_Items || DEFAULT_FAQ_ITEMS).slice(0, 5).forEach(faq => {
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
            pdf.text(`Q: ${faq.question}`, margin, y)
            y += 6
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(60, 60, 60)
            const answerLines = pdf.splitTextToSize(`A: ${faq.answer}`, pageWidth - (margin * 2))
            pdf.text(answerLines, margin, y)
            y += (answerLines.length * 5) + 8
          })

        // --- FINAL PAGE CTA ---
        y += 15
        if (y > pageHeight - 40) { pdf.addPage(); addFooter(4); await addLogo(); y = margin + 25; }

        // Add CTA Buttons at the end
        const btnW = 50
        const btnH = 12
        const gap = 10
        const startX = (pageWidth - (btnW * 2 + gap)) / 2

        // WhatsApp Button
        pdf.setFillColor(37, 211, 102) // WhatsApp Green
        pdf.roundedRect(startX, y, btnW, btnH, 3, 3, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text('WhatsApp Us', startX + (btnW / 2), y + 8, { align: 'center' })
        pdf.link(startX, y, btnW, btnH, { url: whatsappShare })

        // Call Button
        pdf.setFillColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]) // Dark
        pdf.roundedRect(startX + btnW + gap, y, btnW, btnH, 3, 3, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.text('Call Us', startX + btnW + gap + (btnW / 2), y + 8, { align: 'center' })
        pdf.link(startX + btnW + gap, y, btnW, btnH, { url: 'tel:+919929962350' })

        const fileName = `${packageTitle.replace(/[^a-z0-9]/gi, '_')}_Itinerary.pdf`
        pdf.save(fileName)
      })()

      // Wait for completion
      await generatePdfPromise

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <>
      <Head>
        <title>{packageTitle} - Travelzada</title>
        <meta name="description" content={packageData.Overview || `Explore ${packageTitle} with Travelzada. Book your dream vacation today!`} />
        <meta property="og:title" content={`${packageTitle} - Travelzada`} />
        <meta property="og:description" content={packageData.Overview || `Explore ${packageTitle} with Travelzada. Book your dream vacation today!`} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={packageUrl} />
        <meta property="og:type" content="website" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(packageSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      </Head>

      <main className="min-h-screen bg-[#f8f5f0] text-gray-900" ref={contentRef}>
        {isGeneratingPDF && <AiLoader />}
        <Header />

        {/* PDF Cover Page (hidden by default, shown in PDF generation) */}
        <div className="pdf-cover-page hidden flex-col w-full h-[1500px] bg-[#f8f5f0] text-[#1e1d2f]">
          <div className="relative w-full h-[60%]">
            <img
              src={imageUrl}
              alt={packageTitle}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center' }}
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#f8f5f0] via-transparent to-black/40" />

            {/* Logo */}
            <div className="absolute top-16 left-16 z-20">
              <img
                src="/images/logo/Travelzada Logo April (1).png"
                alt="Travelzada"
                className="h-16 w-auto"
                crossOrigin="anonymous"
              />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h1 className="text-7xl font-serif text-[#1e1d2f] mb-4 leading-tight drop-shadow-sm text-center">{packageTitle}</h1>
              <div className="flex flex-wrap justify-center gap-4 text-xl font-medium">
                <span className="bg-white/90 backdrop-blur-md px-6 py-1 rounded-full shadow-sm text-gray-800">{packageData.Duration}</span>
                <span className="bg-white/90 backdrop-blur-md px-6 py-1 rounded-full shadow-sm text-gray-800">{packageData.Star_Category || 'Luxury Stay'}</span>
                <span className="bg-white/90 backdrop-blur-md px-6 py-1 rounded-full shadow-sm text-gray-800">{packageData.Travel_Type || 'Custom Trip'}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-2xl text-gray-500 uppercase tracking-[0.2em]">Starting From</p>
              <div className="inline-block text-black font-semibold px-10 py-4 rounded-lg shadow-lg">
                <div className="text-5xl font-serif">INR {packageData.Price_Range_INR}</div>
              </div>
              <p className="text-lg text-gray-400 mt-4">Quoted on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="w-32 h-1.5 bg-gray-200 rounded-full" />
            <p className="text-2xl text-gray-600 max-w-4xl leading-relaxed">{packageData.Overview}</p>
          </div>
        </div>

        <section className="web-hero relative h-[300px] sm:h-[380px] md:h-[420px] lg:h-[520px] w-full">
          <Image
            src={imageUrl}
            alt={packageTitle}
            fill
            className="object-cover"
            priority
            data-pdf-image={imageUrl}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#f8f5f0] opacity-95" />
          {/* Back Button - Positioned over image */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-20 md:left-8 z-10" data-pdf-hide="true">
            <Link
              href={`/destinations/${slug}`}
              className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>
        </section>

        <section className="relative -mt-24 sm:-mt-28 md:-mt-36 lg:-mt-40 px-4 sm:px-6 md:px-8 pb-12 sm:pb-16 md:pb-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 md:gap-8 items-start">
            <div className="space-y-6 md:space-y-8">
              <article className="bg-white rounded-lg sm:rounded-[5px] shadow-lg p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 md:space-y-6">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-primary font-semibold uppercase tracking-wide">
                  <span className="px-2.5 sm:px-3 py-1 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">{packageData.Destination_Name}</span>
                  <span className="px-2.5 sm:px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">{packageData.Duration}</span>
                  <span className="px-2.5 sm:px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">{packageData.Star_Category || 'Hotel'}</span>
                </div>
                <div className="flex flex-col gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-[#1e1d2f] leading-tight">{packageTitle}</h1>
                  <p className="text-xs sm:text-sm text-primary font-semibold flex items-center gap-2">
                    <span className="text-lg">💳</span>
                    Flexible payment options available
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <StatBlock label="Duration" value={packageData.Duration} />
                  <StatBlock label="Location" value={packageData.Destination_Name || 'Bali, Indonesia'} />
                  <StatBlock label="Hotel" value={packageData.Star_Category || 'Hotel'} />
                  <StatBlock label="Travel Type" value={packageData.Travel_Type || '—'} />
                </div>
              </article>

              {/* Mobile Price Section - Static Part */}
              <div className="lg:hidden bg-white rounded-lg sm:rounded-[5px] shadow-xl p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Starting from</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#c99846] leading-tight">INR {packageData.Price_Range_INR || 'Contact for price'} </p>
                </div>
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  <button
                    onClick={() => setShowLeadForm(true)}
                    className="w-full text-center bg-primary text-white py-3 sm:py-3.5 rounded-lg sm:rounded-[5px] font-semibold text-sm sm:text-base transition hover:bg-primary/90 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Enquire Now
                  </button>
                </div>
              </div>

              {/* Mobile Download Button - Static */}
              <div className="lg:hidden mt-4">
                <button
                  onClick={handleDownloadItinerary}
                  disabled={isGeneratingPDF}
                  className="w-full text-center bg-white border-2 border-gray-900 text-gray-900 py-3 sm:py-3.5 rounded-lg sm:rounded-[5px] font-semibold text-sm sm:text-base transition hover:bg-gray-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                >
                  {isGeneratingPDF ? 'Generating PDF...' : 'Download Itinerary'}
                </button>
              </div>

              <SectionCard title="Highlights">
                <ul className="space-y-2.5 sm:space-y-3 text-base sm:text-lg text-[#1e1d2f]">
                  {inclusions.slice(0, 5).map((inclusion, idx) => (
                    <li key={idx} className="flex items-start gap-3 sm:gap-4">
                      <span className="mt-0.5 sm:mt-1 text-primary text-lg sm:text-xl flex-shrink-0">✔</span>
                      <p className="leading-relaxed">{inclusion}</p>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title="Day-wise Itinerary">
                <div className="space-y-3 sm:space-y-4">
                  {createItinerary().map((day, index) => (
                    <details
                      key={day.day}
                      className="rounded-lg sm:rounded-[5px] border border-gray-200 bg-white p-4 sm:p-5 open:shadow-sm transition-all duration-200 hover:border-primary/30 [&[open]_summary_svg]:rotate-180"
                    >
                      <summary className="flex items-center justify-between cursor-pointer list-none gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-medium flex-1 min-w-0">
                          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm sm:text-base flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="truncate sm:whitespace-normal">
                            <span className="hidden sm:inline">{day.day}: </span>
                            <span className="sm:font-normal">{day.title}</span>
                          </span>
                        </div>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-primary transition-transform duration-200 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 space-y-2 sm:space-y-3">
                        <p className="leading-relaxed">{day.description}</p>
                        <ul className="list-disc pl-5 sm:pl-6 space-y-1">
                          {day.details.map((detail, idx) => (
                            <li key={idx} className="leading-relaxed">{detail}</li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ))}
                </div>
              </SectionCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <SectionCard title="Inclusions">
                  <ListWithIcon items={inclusions} icon="✓" iconClass="text-green-600" />
                </SectionCard>
                <SectionCard title="Exclusions">
                  <ListWithIcon items={exclusions.length > 0 ? exclusions : ['International flights', 'Visa fees', 'Personal expenses']} icon="✕" iconClass="text-red-500" />
                </SectionCard>
              </div>

              <SectionCard title="Guest Reviews">
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  {(() => {
                    const allReviews = packageData.Guest_Reviews && packageData.Guest_Reviews.length > 0
                      ? packageData.Guest_Reviews
                      : DEFAULT_GUEST_REVIEWS
                    const displayedReviews = showAllReviews ? allReviews : allReviews.slice(0, 3)

                    return (
                      <>
                        {displayedReviews.map((review, idx) => (
                          <div key={idx} className="rounded-lg sm:rounded-[5px] border border-gray-200 p-4 sm:p-5 bg-white hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                              <p className="font-semibold text-sm sm:text-base">{review.name}</p>
                              <p className="text-yellow-500 text-sm sm:text-base">{review.rating || '★★★★★'}</p>
                            </div>
                            <p className="text-sm sm:text-base text-gray-600 mb-2 leading-relaxed">{review.content}</p>
                            <p className="text-xs sm:text-sm text-gray-500">{review.date}</p>
                          </div>
                        ))}
                        {allReviews.length > 3 && !showAllReviews && (
                          <button
                            onClick={() => setShowAllReviews(true)}
                            className="w-full py-3 text-center border-2 border-primary text-primary font-semibold text-sm sm:text-base rounded-lg sm:rounded-[5px] hover:bg-primary hover:text-white transition-colors transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            View All Reviews ({allReviews.length})
                          </button>
                        )}
                        {showAllReviews && allReviews.length > 3 && (
                          <button
                            onClick={() => setShowAllReviews(false)}
                            className="w-full py-3 text-center border-2 border-gray-300 text-gray-700 font-semibold text-sm sm:text-base rounded-lg sm:rounded-[5px] hover:bg-gray-100 transition-colors transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Show Less
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </SectionCard>

              <SectionCard title="Booking Policies">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                  <PolicyCard
                    title="Booking"
                    items={parsePolicies(packageData.Booking_Policies?.booking || ['Instant confirmation', 'Flexible dates', '24/7 support'])}
                  />
                  <PolicyCard
                    title="Payment"
                    items={parsePolicies(packageData.Booking_Policies?.payment || ['Pay in instalments', 'Zero cost EMI', 'Secure transactions'])}
                  />
                  <PolicyCard
                    title="Cancellation"
                    items={parsePolicies(packageData.Booking_Policies?.cancellation || ['Free cancellation up to 7 days', 'Partial refund available', 'Contact for details'])}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Frequently Asked Questions">
                <div className="space-y-4">
                  {(() => {
                    const allFAQs = packageData.FAQ_Items && packageData.FAQ_Items.length > 0
                      ? packageData.FAQ_Items
                      : DEFAULT_FAQ_ITEMS
                    const displayedFAQs = showAllFAQs ? allFAQs : allFAQs.slice(0, 5)

                    return (
                      <>
                        {displayedFAQs.map((faq, idx) => (
                          <details
                            key={idx}
                            className="rounded-[5px] border border-gray-200 bg-white p-4 md:p-5 open:shadow-sm transition-all duration-200 hover:border-primary/30"
                          >
                            <summary className="cursor-pointer text-base md:text-lg font-medium text-[#1e1d2f] leading-relaxed">
                              {faq.question}
                            </summary>
                            <p className="mt-3 text-sm md:text-base text-gray-600 leading-relaxed">{faq.answer}</p>
                          </details>
                        ))}
                        {allFAQs.length > 5 && !showAllFAQs && (
                          <button
                            onClick={() => setShowAllFAQs(true)}
                            className="w-full py-3 text-center border-2 border-primary text-primary font-semibold rounded-[5px] hover:bg-primary hover:text-white transition-colors"
                          >
                            View All FAQs ({allFAQs.length})
                          </button>
                        )}
                        {showAllFAQs && allFAQs.length > 5 && (
                          <button
                            onClick={() => setShowAllFAQs(false)}
                            className="w-full py-3 text-center border-2 border-gray-300 text-gray-700 font-semibold rounded-[5px] hover:bg-gray-100 transition-colors"
                          >
                            Show Less
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </SectionCard>


            </div>

            <aside className="hidden lg:block space-y-6 lg:sticky lg:top-24">
              <div className="bg-white rounded-[5px] shadow-xl p-8 space-y-6">
                <div>
                  <p className="text-sm text-gray-500">Starting from</p>
                  <p className="text-4xl font-serif text-[#c99846]">INR {packageData.Price_Range_INR || 'Contact for price'} </p>
                  {/* <p className="text-sm text-gray-500">Per person • twin sharing</p> */}
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowLeadForm(true)}
                    className="w-full text-center bg-primary text-white py-3 rounded-[5px] font-semibold transition hover:bg-primary/90"
                  >
                    Enquire Now
                  </button>
                  <button
                    onClick={handleDownloadItinerary}
                    disabled={isGeneratingPDF}
                    className="w-full text-center border border-gray-900 text-gray-900 py-3 rounded-[5px] font-semibold transition hover:bg-gray-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingPDF ? 'Generating PDF...' : 'Download Itinerary'}
                  </button>
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
                    <button
                      onClick={async () => {
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: packageTitle,
                              text: `Check out ${packageTitle} on Travelzada`,
                              url: packageUrl,
                            })
                          } catch (err) {
                            // User cancelled or error occurred
                            if ((err as Error).name !== 'AbortError') {
                              console.error('Error sharing:', err)
                            }
                          }
                        } else {
                          // Fallback: open Twitter share in new tab
                          window.open(`https://twitter.com/intent/tweet?text=${shareText}`, '_blank', 'noopener,noreferrer')
                        }
                      }}
                      className="flex-1 text-center bg-[#0a1026] text-white py-2.5 rounded-[5px] font-semibold hover:bg-black transition"
                    >
                      Share
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-[#1e1d2f]">Contact Us</p>
                  <a href="tel:+919929962350" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    +919929962350
                  </a>
                  <a href="mailto:info@travelzada.com" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    info@travelzada.com
                  </a>
                </div>
                <div className="rounded-[5px] border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <p className="font-semibold text-sm text-[#1e1d2f]">Why Book With Us</p>
                  {(packageData.Why_Book_With_Us && packageData.Why_Book_With_Us.length > 0
                    ? packageData.Why_Book_With_Us
                    : WHY_BOOK_WITH_US).map((item, idx) => (
                      <div key={idx} className="flex gap-3 text-sm text-gray-600">
                        <span className="text-primary">✓</span>
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p>{item.description}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* <SectionCard title="Travel Concierge">
          <p className="text-gray-600 mb-3">
            Need help customising this journey? Speak to our specialist for curated stays,
            private experiences and visa assistance.
          </p>
          <Link
            href="tel:+919929962350"
            className="inline-flex items-center gap-3 text-primary font-semibold hover:text-primary-dark transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call +919929962350 →
          </Link>
        </SectionCard> */}

              {/* <SectionCard title="Why Travelers Love Us">
          <ul className="space-y-3 text-gray-600">
            <li>98% positive reviews across honeymoon packages</li>
            <li>Partners with luxury resorts in Kuta, Ubud and Nusa Dua</li>
            <li>Assistance with forex, insurance and travel SIM</li>
          </ul>
        </SectionCard> */}

              <SectionCard title="Need a Custom Quote?">
                <p className="text-gray-600 mb-3">
                  Email us at{' '}
                  <a href="mailto:info@travelzada.com" className="text-primary font-semibold hover:underline">
                    info@travelzada.com
                  </a>{' '}
                  or call us at{' '}
                  <a href="tel:+919929962350" className="text-primary font-semibold hover:underline">
                    +919929962350
                  </a>{' '}
                  with your travel dates and preferences.
                </p>
              </SectionCard>
            </aside>
          </div>
        </section>

        <Footer />

        {
          !showLeadForm && (
            <div className="lg:hidden fixed bottom-4 left-0 right-0 px-4 z-40 pointer-events-none">
              <button
                type="button"
                onClick={() => setShowLeadForm(true)}
                className="pointer-events-auto w-full bg-primary text-white py-3.5 sm:py-4 rounded-full font-semibold text-sm sm:text-base shadow-xl shadow-primary/30 hover:bg-primary-dark transition transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Enquire Now
              </button>
            </div>
          )
        }

        <LeadForm
          isOpen={showLeadForm}
          onClose={() => setShowLeadForm(false)}
          sourceUrl={typeof window !== 'undefined' ? window.location.href : ''}
          packageName={packageData.Destination_Name}
        />
      </main >
    </>
  )
}

function PolicyCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg sm:rounded-[5px] border border-gray-200 bg-white p-4 sm:p-5 hover:shadow-md transition-shadow">
      <h3 className="text-base sm:text-lg font-semibold text-[#1e1d2f] mb-2.5 sm:mb-3">{title}</h3>
      <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 leading-relaxed">
            <span className="text-primary flex-shrink-0 mt-0.5">•</span>
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

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg sm:rounded-[5px] border border-gray-100 bg-gray-50 p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-sm sm:text-base font-semibold text-[#1e1d2f] leading-tight break-words">{value}</p>
    </div>
  )
}

function ListWithIcon({ items, icon, iconClass }: { items: string[]; icon: string; iconClass: string }) {
  return (
    <ul className="space-y-2.5 sm:space-y-3 text-sm sm:text-base text-gray-600">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 sm:gap-3">
          <span className={`font-semibold ${iconClass} text-base sm:text-lg flex-shrink-0 mt-0.5`}>{icon}</span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function SectionCard({ title, children, intro }: { title: string; children: ReactNode; intro?: string }) {
  return (
    <section className="bg-white rounded-lg sm:rounded-[5px] shadow-sm p-5 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-serif text-[#1e1d2f] leading-tight">{title}</h2>
        {intro && <p className="text-sm sm:text-base text-gray-600 mt-2 leading-relaxed">{intro}</p>}
      </div>
      {children}
    </section>
  )
}
