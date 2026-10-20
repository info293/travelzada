'use client'

import { useEffect, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import LeadForm from '@/components/LeadForm'
import SchemaMarkup, { generateTravelPackageSchema, generateBreadcrumbSchema, generateProductSchema, generateFAQSchema } from '@/components/SchemaMarkup'
import Breadcrumbs from '@/components/Breadcrumbs'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import AiLoader from '@/components/ui/AiLoader'
import ReviewForm from '@/components/ReviewForm'
import ReviewList from '@/components/ReviewList'
import ReviewSummary from '@/components/ReviewSummary'

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
  Image_Alt_Text?: string
  Inclusions: string
  Exclusions?: string
  Theme?: string
  Stay?: string
  Day_Wise_Itinerary?: string
  Highlights?: string[]
  Day_Wise_Itinerary_Details?: Array<{
    day: number
    title: string
    description: string
    activities: string[]
  }>
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

export default function PackageDetailClient({ params, initialPackageData }: { params: { slug: string; packageId: string }, initialPackageData?: any }) {
  const slug = decodeURIComponent(params.slug)
  const packageId = decodeURIComponent(params.packageId)
  const [packageData, setPackageData] = useState<DestinationPackage | null>(initialPackageData || null)
  const [loading, setLoading] = useState(!initialPackageData)
  const [notFound, setNotFound] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [showAllFAQs, setShowAllFAQs] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [isInlineEnquireVisible, setIsInlineEnquireVisible] = useState(true)
  const [reviewRefresh, setReviewRefresh] = useState(0)
  const [relatedPackages, setRelatedPackages] = useState<DestinationPackage[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const reviewFormRef = useRef<HTMLDivElement>(null)
  const inlineEnquireRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInlineEnquireVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    if (inlineEnquireRef.current) {
      observer.observe(inlineEnquireRef.current)
    }

    return () => {
      if (inlineEnquireRef.current) {
        observer.unobserve(inlineEnquireRef.current)
      }
    }
  }, [loading])

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
      if (initialPackageData) return;
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

  // Fetch related packages
  useEffect(() => {
    const fetchRelated = async () => {
      if (!packageData || typeof window === 'undefined' || !db) return
      
      try {
        const { collection, getDocs } = await import('firebase/firestore')
        const packagesRef = collection(db, 'packages')
        
        const allPackagesSnapshot = await getDocs(packagesRef)
        const related: DestinationPackage[] = []
        
        for (const doc of allPackagesSnapshot.docs) {
          if (doc.id === packageData.id) continue
          const data = doc.data() as DestinationPackage
          
          if (data.Destination_Name === packageData.Destination_Name || slug.toLowerCase() === data.Destination_Name?.toLowerCase().split(/[\s,]+/)[0]) {
            related.push({ id: doc.id, ...data })
          }
        }
        
        // If we don't have enough, pick any random 3 from the same region or globally
        if (related.length < 3) {
          for (const doc of allPackagesSnapshot.docs) {
            if (doc.id !== packageData.id && !related.find(r => r.id === doc.id)) {
              related.push({ id: doc.id, ...doc.data() as DestinationPackage })
            }
          }
        }
        
        setRelatedPackages(related.slice(0, 3).sort(() => Math.random() - 0.5))
      } catch (err) {
        console.error('Error fetching related packages:', err)
      }
    }
    
    fetchRelated()
  }, [packageData, slug])

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
  const galleryImages = [
    (packageData.Primary_Image_URL ? packageData.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim() : 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1600&q=85'),
    'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1600&q=85',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85',
    'https://images.unsplash.com/photo-1548013146-72479768bada?w=1600&q=85',
    'https://images.unsplash.com/photo-1627894483216-2138af692e32?w=1600&q=85',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=85',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=85',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=85'
  ]
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

  // Format price with commas
  const formatPrice = (price: string | number) => {
    const numericPrice = String(price).replace(/[^0-9]/g, '')
    if (!numericPrice) return price
    return new Intl.NumberFormat('en-IN').format(Number(numericPrice))
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

  // Generate product schema for Ratings and Offers
  const productSchema = generateProductSchema({
    name: packageData.Destination_Name || 'Travel Package',
    description: packageData.Overview || packageData.Destination_Name,
    image: imageUrl,
    price: packageData.Price_Range_INR ? String(packageData.Price_Range_INR).replace(/[^0-9]/g, '') || '50000' : '50000',
    ratingValue: '5.0',
    ratingCount: (packageData.Guest_Reviews && packageData.Guest_Reviews.length > 0) ? String(packageData.Guest_Reviews.length) : String(DEFAULT_GUEST_REVIEWS.length),
    reviewCount: (packageData.Guest_Reviews && packageData.Guest_Reviews.length > 0) ? String(packageData.Guest_Reviews.length) : String(DEFAULT_GUEST_REVIEWS.length)
  })

  // Generate breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' },
    { name: 'Destinations', url: 'https://www.travelzada.com/destinations' },
    { name: slug, url: `https://www.travelzada.com/destinations/${slug}` },
    { name: packageData.Destination_Name || 'Package' },
  ])

  // Generate FAQ schema
  const faqs = packageData.FAQ_Items && packageData.FAQ_Items.length > 0 ? packageData.FAQ_Items : DEFAULT_FAQ_ITEMS
  const faqSchema = generateFAQSchema(faqs)

  // Create itinerary from Day_Wise_Itinerary field or generate from duration
  const createItinerary = () => {
    // NEW: Use AI-generated itinerary details if available
    if (packageData.Day_Wise_Itinerary_Details && packageData.Day_Wise_Itinerary_Details.length > 0) {
      return packageData.Day_Wise_Itinerary_Details.map((item) => ({
        day: `Day ${item.day}`,
        title: item.title,
        description: item.description,
        details: item.activities || []
      }))
    }

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
            const xPos = 15 // Left margin
            pdf.addImage(logoData, 'PNG', xPos, 10, targetWidth, targetHeight, undefined, 'FAST')
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
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(14)
          pdf.setTextColor(255, 255, 255)
          const title = packageTitle.length > 40 ? packageTitle.substring(0, 37) + '...' : packageTitle
          pdf.text(title, pageWidth - 10, 17, { align: 'right' })
        }

        // --- PAGE 1: COVER PAGE ---

        // 1. Logo (Top)
        await addLogo()

        // Brand Line removed per user request - logo no longer has underline

        // 2. Main Image (Reduced Height, Below Line)
        try {
          const mainImageData = await loadImage(imageUrl)
          const imgStartY = 35 // Start below line
          const imgHeight = pageHeight * 0.35 // Reduced height

          pdf.addImage(mainImageData, 'JPEG', 0, imgStartY, pageWidth, imgHeight, undefined, 'FAST')

          // Add visible caption if alt text exists
          if (packageData.Image_Alt_Text) {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(8)
            pdf.setTextColor(100, 100, 100)
            // Position at bottom right of image area, slightly below
            pdf.text(packageData.Image_Alt_Text, pageWidth - 10, imgStartY + imgHeight + 5, { align: 'right' })
          }

          // Update Y cursor for text content
          var contentCursorY = imgStartY + imgHeight + 15
        } catch (e) {
          console.error('Failed to load main image', e)
          var contentCursorY = 50 // Fallback
        }

        // 3. Text Content (Below Image)

        // Title - Brand Primary Color (Purple)
        pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(28) // Slightly smaller than before to fit better

        const maxTitleWidth = pageWidth - 40
        const titleLines = pdf.splitTextToSize(packageTitle, maxTitleWidth)
        pdf.text(titleLines, pageWidth / 2, contentCursorY, { align: 'center' })

        contentCursorY += (titleLines.length * 10) + 5

        // Tags (Duration • Category • Type)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(100, 100, 100) // Grey
        const tags = [
          packageData.Duration,
          packageData.Star_Category || 'Luxury Stay',
          packageData.Travel_Type || 'Custom Trip'
        ].join('  •  ')

        pdf.text(tags, pageWidth / 2, contentCursorY, { align: 'center' })

        contentCursorY += 15

        // "Starting From"
        pdf.setFontSize(10)
        pdf.setTextColor(100, 100, 100)
        pdf.text('STARTING FROM', pageWidth / 2, contentCursorY, { align: 'center' })

        contentCursorY += 10 // Increased spacing

        // Price - Gold
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(26) // Back to larger size
        pdf.setTextColor(COLOR_PRICE[0], COLOR_PRICE[1], COLOR_PRICE[2])
        pdf.text(`INR ${formatPrice(packageData.Price_Range_INR)}`, pageWidth / 2, contentCursorY, { align: 'center' })

        contentCursorY += 7 // Gap between price and per person text

        // "PER PERSON" - Small block text below price
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(150, 150, 150) // Light gray
        pdf.text('PER PERSON', pageWidth / 2, contentCursorY, { align: 'center' })

        contentCursorY += 12 // Increased spacing

        // Date Quote
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(150, 150, 150)
        pdf.text(`Quoted on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, contentCursorY, { align: 'center' })

        contentCursorY += 8

        // Separator Line
        pdf.setDrawColor(220, 220, 220)
        pdf.line((pageWidth / 2) - 15, contentCursorY, (pageWidth / 2) + 15, contentCursorY)

        contentCursorY += 10

        // Description / Overview
        pdf.setFontSize(11)
        pdf.setTextColor(60, 60, 60)
        const overviewText = pdf.splitTextToSize(packageData.Overview || '', pageWidth - 50)
        pdf.text(overviewText, pageWidth / 2, contentCursorY, { align: 'center' })


        // --- PAGE 2: DETAILS & HIGHLIGHTS ---
        pdf.addPage()
        addFooter(2)
        await addLogo()
        let y = margin + 10 // Increased top margin for logo

        // Header Branding Line removed per user request
        y += 5

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
        pdf.setFont('helvetica', 'bold')
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

        // Header Branding Line removed per user request
        y += 5

        // Itinerary - Matching website style
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Day-wise Itinerary', margin, y)
        y += 12

        const itinerary = createItinerary()

        // CLEAN SIMPLE TABLE DESIGN
        const tableStartX = margin
        const tableWidth = pageWidth - (margin * 2)
        const dayColWidth = 35 // Compact day column
        const rowHeight = 12 // Compact row height

        // Table Header - Simple purple header
        pdf.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
        pdf.rect(tableStartX, y, tableWidth, rowHeight + 2, 'F')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(255, 255, 255)
        pdf.text('Day', tableStartX + 8, y + 8)
        pdf.text('Activities', tableStartX + dayColWidth + 8, y + 8)
        y += rowHeight + 2

        // Table Rows - Clean and minimal
        itinerary.forEach((day, index) => {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9)
          const descLines = pdf.splitTextToSize(day.title, tableWidth - dayColWidth - 15)
          const currentRowHeight = Math.max(rowHeight, (descLines.length * 5) + 8)

          // Check for page break
          if (y + currentRowHeight > pageHeight - 30) {
            pdf.addPage()
            addFooter(3)
            addLogo()
            y = margin + 25
          }

          // Subtle alternating background
          if (index % 2 === 0) {
            pdf.setFillColor(252, 250, 248)
          } else {
            pdf.setFillColor(255, 255, 255)
          }
          pdf.rect(tableStartX, y, tableWidth, currentRowHeight, 'F')

          // Day text - Purple, bold
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(9)
          pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2])
          pdf.text(day.day, tableStartX + 8, y + 7)

          // Description text - Dark
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          pdf.text(descLines, tableStartX + dayColWidth + 8, y + 7)

          // Bottom border
          pdf.setDrawColor(230, 230, 230)
          pdf.setLineWidth(0.2)
          pdf.line(tableStartX, y + currentRowHeight, tableStartX + tableWidth, y + currentRowHeight)

          y += currentRowHeight
        })

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

        // Header Branding Line removed per user request
        y += 5

        const incExcStartY = y
        const startY = y // Snapshot starting Y for alignment

        // Inclusions - Cream background with dynamic height
        pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2])
        pdf.roundedRect(margin, y - 5, colW, maxHeight, 5, 5, 'F')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(16)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Inclusions', margin + 3, y + 1)
        y += 10

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        inclusions.forEach(item => {
          const lines = pdf.splitTextToSize(item, colW - 10)
          // Green Check
          pdf.setTextColor(22, 163, 74)
          pdf.setFont('helvetica', 'bold')
          pdf.text('+', margin + 3, y)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          pdf.text(lines, margin + 10, y)
          y += (lines.length * 6) + 3
        })

        // Exclusions - Cream background with dynamic height
        let y2 = startY // Reset Y to start for second column
        pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2])
        pdf.roundedRect(margin + colW + margin, y2 - 5, colW, maxHeight, 5, 5, 'F')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(16)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Exclusions', margin + colW + margin + 3, y2 + 1)
        y2 += 10

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        exclusions.forEach(item => {
          const lines = pdf.splitTextToSize(item, colW - 10)
          // Red X
          pdf.setTextColor(239, 68, 68)
          pdf.setFont('helvetica', 'bold')
          pdf.text('-', margin + colW + margin + 3, y2)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          pdf.text(lines, margin + colW + margin + 8, y2)
          y2 += (lines.length * 6) + 3
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

        // Header Branding Line removed per user request
        if (y === margin + 10) {
          y += 5
        }

        // Reviews
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
        pdf.text('Guest Reviews', margin, y)
        y += 12

        const reviews = packageData.Guest_Reviews || DEFAULT_GUEST_REVIEWS
        const reviewsToShow = reviews.slice(0, 2) // Show 2 reviews

        // TWO COLUMN LAYOUT for 2 reviews side by side
        const reviewColWidth = (pageWidth - (margin * 2) - 10) / 2 // 10px gap between columns
        const maxReviewChars = 850 // Show more content since we have space

        // Process reviews first to calculate heights
        const processedReviews = reviewsToShow.map(review => {
          let reviewContent = review.content
          if (reviewContent.length > maxReviewChars) {
            reviewContent = reviewContent.substring(0, maxReviewChars) + '...'
          }

          pdf.setFont('helvetica', 'italic')
          pdf.setFontSize(9)
          const contentLines = pdf.splitTextToSize(`"${reviewContent}"`, reviewColWidth - 16)
          // Height: padding(8) + name(8) + rating gap(6) + content + date(12) + bottom padding(6)
          const height = 8 + 8 + 6 + (contentLines.length * 5)

          return { ...review, contentLines, contentHeight: height, displayContent: reviewContent }
        })

        // Use the taller review height for both boxes (uniform look)
        const reviewBoxHeight = Math.max(...processedReviews.map(r => r.contentHeight), 55)

        // Draw both reviews side by side
        processedReviews.forEach((review, index) => {
          const xPos = margin + (index * (reviewColWidth + 10))
          let currY = y

          // Draw Box with cream background
          pdf.setDrawColor(220, 220, 220)
          pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2])
          pdf.roundedRect(xPos, currY, reviewColWidth, reviewBoxHeight, 4, 4, 'FD')

          currY += 8 // Top padding

          // Name - Bold
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(10)
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2])
          pdf.text(String(review.name || 'Guest'), xPos + 8, currY)

          // Rating - Gold color on the right
          pdf.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2])
          pdf.text(String(review.rating || '5/5'), xPos + reviewColWidth - 8, currY, { align: 'right' })

          currY += 8 // Gap after name

          // Review Content - Italic
          pdf.setFont('helvetica', 'italic')
          pdf.setFontSize(9)
          pdf.setTextColor(80, 80, 80)
          pdf.text(review.contentLines, xPos + 8, currY)

          // Date at bottom of box
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(130, 130, 130)
          pdf.text(String(review.date || ''), xPos + 8, y + reviewBoxHeight - 6)
        })

        // Update main Y position after reviews
        y += reviewBoxHeight + 12

        // --- PAGE 5: BOOKING POLICIES (Always start on new page) ---
        pdf.addPage()
        addFooter(5)
        await addLogo()
        y = margin + 10

        // Header Branding Line removed per user request
        y += 5

        pdf.setFont('helvetica', 'bold')
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

        // Header Branding Line removed per user request
        y += 5

        pdf.setFont('helvetica', 'bold')
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
                <div className="text-5xl font-serif">INR {formatPrice(packageData.Price_Range_INR)}</div>
              </div>
              <p className="text-lg text-gray-400 mt-4">Quoted on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="w-32 h-1.5 bg-gray-200 rounded-full" />
            <p className="text-2xl text-gray-600 max-w-4xl leading-relaxed">{packageData.Overview}</p>
          </div>
        </div>

        
        {/* ─────────────────────────────────────────────────────────────
            BREADCRUMBS & TOP NAVIGATION
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#FAFAFC] px-5 sm:px-8 lg:px-12 pt-24 pb-4">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between">
            <Breadcrumbs
              items={[
                { name: 'Home', url: '/' },
                { name: 'Destinations', url: '/destinations' },
                { name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), url: `/destinations/${slug}` },
                { name: packageTitle },
              ]}
            />
            <Link
              href={`/destinations/${slug}`}
              className="text-xs font-semibold text-gray-500 hover:text-black flex items-center gap-1.5 transition"
            >
              <span>←</span>
              <span>Back to Packages</span>
            </Link>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            ATLYS-STYLE PACKAGE HEADER & HERO GALLERY (01 / 08 PHOTOS)
        ───────────────────────────────────────────────────────────── */}
        <section className="px-5 sm:px-8 lg:px-12 pt-2 pb-12">
          <div className="max-w-[1440px] mx-auto">
            
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-800 shadow-sm">
                <span>💍</span>
                <span>Curated for Couples</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-sm">
                <span>📍</span>
                <span>{packageData.Location_Breakup || packageData.Destination_Name || slug}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-sm">
                <span>⏳</span>
                <span>{packageData.Duration}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-semibold text-purple-700 shadow-sm">
                <span>🏨</span>
                <span>{packageData.Star_Category || '4★ & 5★ Stays'}</span>
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-gray-900 tracking-tight leading-[1.12] text-balance">
              {packageTitle}
            </h1>

            {/* Subtitle / Overview */}
            {packageData.Overview && (
              <p className="text-gray-500 text-base sm:text-lg max-w-3xl mt-3 leading-relaxed">
                {packageData.Overview}
              </p>
            )}

            {/* Atlys Trust Points with Colored Dots */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-xs sm:text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>100% Itemised Pricing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-500" />
                <span>Dedicated Heated Cab &amp; Driver</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>Handpicked Couple Stays</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-500" />
                <span>24×7 Concierge on WhatsApp</span>
              </div>
            </div>

            {/* Hero Panoramic Image with 01 / 08 Photo Counter & Carousel */}
            <div className="relative mt-8 rounded-[28px] sm:rounded-[36px] overflow-hidden aspect-[16/9] md:aspect-[21/9] shadow-xl bg-gray-900 group">
              <Image
                src={galleryImages[currentPhotoIndex] || imageUrl}
                alt={packageData.Image_Alt_Text || packageTitle}
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                priority
                data-pdf-image={imageUrl}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* Photo Navigation Arrows */}
              <button
                type="button"
                onClick={() => setCurrentPhotoIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer z-10"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setCurrentPhotoIndex((prev) => (prev + 1) % galleryImages.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer z-10"
                aria-label="Next photo"
              >
                ›
              </button>

              {/* 01 / 08 Photo Badge */}
              <div className="absolute top-5 right-5 z-10">
                <span className="bg-black/75 backdrop-blur-md text-white text-xs font-mono font-bold px-3.5 py-1.5 rounded-full border border-white/20 shadow-md tracking-wider flex items-center gap-1.5">
                  <span>📷</span>
                  <span>0{currentPhotoIndex + 1} / 08</span>
                </span>
              </div>

              {/* Alt Caption Badge */}
              {packageData.Image_Alt_Text && (
                <div className="absolute bottom-5 left-5 z-10 pointer-events-none">
                  <span className="bg-black/60 backdrop-blur-md text-white/90 text-xs px-3.5 py-1.5 rounded-full border border-white/20 shadow-sm font-medium">
                    {packageData.Image_Alt_Text}
                  </span>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            STICKY QUICK-JUMP SUB-NAVIGATION (01 TO 08)
        ───────────────────────────────────────────────────────────── */}
        <div className="sticky top-20 z-20 bg-white/90 backdrop-blur-md border-y border-gray-200/80 py-3.5 mb-12 shadow-xs hidden md:block">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between gap-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
              Tour Sections:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'section-01', num: '01', label: 'Overview' },
                { id: 'section-02', num: '02', label: 'Highlights' },
                { id: 'section-03', num: '03', label: 'Itinerary' },
                { id: 'section-04', num: '04', label: 'Inclusions' },
                { id: 'section-05', num: '05', label: 'Policies' },
                { id: 'section-06', num: '06', label: 'FAQ' },
                { id: 'section-07', num: '07', label: 'More Packages' },
                { id: 'section-08', num: '08', label: 'Reviews' },
              ].map((tab) => (
                <a
                  key={tab.id}
                  href={'#' + tab.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FAFAFC] hover:bg-black hover:text-white text-gray-700 border border-gray-200/70 transition shrink-0 shadow-2xs group"
                >
                  <span className="font-mono text-[10px] font-bold text-gray-400 group-hover:text-white">
                    {tab.num}
                  </span>
                  <span>{tab.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TWO-COLUMN MAIN CONTENT + FLOATING ATLYS BOOKING CARD
        ───────────────────────────────────────────────────────────── */}
        <section className="px-5 sm:px-8 lg:px-12 pb-28">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_420px] gap-12 lg:gap-14 items-start">
            
            {/* LEFT COLUMN: 8 NUMBERED SECTIONS WITH GENEROUS SPACING */}
            <div className="space-y-16 sm:space-y-20">

              {/* ── SECTION 01 / 08: TRIP OVERVIEW & SPECS ── */}
              <section id="section-01" className="rounded-[32px] sm:rounded-[36px] bg-white p-8 sm:p-12 lg:p-14 border border-gray-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-8 scroll-mt-28">
                <div className="flex items-center gap-3.5 border-b border-gray-100/80 pb-5">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-xs font-mono font-semibold tracking-wider shadow-sm">
                    <span>01</span>
                    <span className="text-gray-400 font-light">/</span>
                    <span className="text-gray-300">08</span>
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#7A4F34]">
                    TRIP OVERVIEW &amp; SPECS
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 tracking-tight">
                    Overview &amp; Key Details
                  </h2>
                  <p className="text-gray-600 text-base sm:text-lg leading-relaxed mt-3.5">
                    {packageData.Overview || 'A romantic getaway designed specifically for couples, featuring luxury stays and private chauffeurs.'}
                  </p>
                </div>

                {/* 4 Atlys Pill Spec Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 pt-2">
                  <div className="rounded-[22px] bg-[#FAFAFC] p-5 sm:p-6 border border-gray-200/80 flex flex-col justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Duration</span>
                    <span className="text-base font-bold text-gray-900 mt-2">{packageData.Duration}</span>
                  </div>
                  <div
                    onClick={() => setShowLocationModal(true)}
                    className="rounded-[22px] bg-[#FAFAFC] p-5 sm:p-6 border border-gray-200/80 flex flex-col justify-between cursor-pointer hover:border-black transition"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                      <span>Locations</span>
                      <span className="text-xs">↗</span>
                    </span>
                    <span className="text-sm font-bold text-gray-900 mt-2 line-clamp-1">
                      {packageData.Location_Breakup || packageData.Destination_Name}
                    </span>
                  </div>
                  <div className="rounded-[22px] bg-[#FAFAFC] p-5 sm:p-6 border border-gray-200/80 flex flex-col justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Stays</span>
                    <span className="text-sm font-bold text-gray-900 mt-2 line-clamp-1">
                      {packageData.Star_Category || 'Deluxe 4★'}
                    </span>
                  </div>
                  <div className="rounded-[22px] bg-[#FAFAFC] p-5 sm:p-6 border border-gray-200/80 flex flex-col justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Travel Style</span>
                    <span className="text-sm font-bold text-gray-900 mt-2 line-clamp-1">
                      {packageData.Travel_Type || 'Honeymoon'}
                    </span>
                  </div>
                </div>
              </section>

              {/* ── SECTION 02 / 08: KEY HIGHLIGHTS ── */}
              <section id="section-02" className="rounded-[32px] sm:rounded-[36px] bg-white p-8 sm:p-12 lg:p-14 border border-gray-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-8 scroll-mt-28">
                <div className="flex items-center gap-3.5 border-b border-gray-100/80 pb-5">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-xs font-mono font-semibold tracking-wider shadow-sm">
                    <span>02</span>
                    <span className="text-gray-400 font-light">/</span>
                    <span className="text-gray-300">08</span>
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#7A4F34]">
                    KEY HIGHLIGHTS
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 tracking-tight">
                    What Makes This Journey Unforgettable
                  </h2>
                  <p className="text-gray-500 text-sm sm:text-base mt-2">
                    Handpicked couple experiences included in this package
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {(packageData.Highlights && packageData.Highlights.length > 0
                    ? packageData.Highlights
                    : inclusions
                  )
                    .slice(0, 6)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3.5 p-5 rounded-2xl bg-[#FAFAFC] border border-gray-200/70 hover:border-black/30 transition"
                      >
                        <span className="size-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          ✓
                        </span>
                        <p className="text-sm font-medium text-gray-800 leading-snug">{item}</p>
                      </div>
                    ))}
                </div>
              </section>

              {/* ── SECTION 03 / 08: DAY-BY-DAY ITINERARY ── */}
              <section id="section-03" className="rounded-[32px] sm:rounded-[36px] bg-white p-8 sm:p-12 lg:p-14 border border-gray-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-8 scroll-mt-28">
                <div className="flex items-center justify-between border-b border-gray-100/80 pb-5 flex-wrap gap-2">
                  <div className="flex items-center gap-3.5">
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-xs font-mono font-semibold tracking-wider shadow-sm">
                      <span>03</span>
                      <span className="text-gray-400 font-light">/</span>
                      <span className="text-gray-300">08</span>
                    </span>
                    <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#7A4F34]">
                      DAY-BY-DAY ITINERARY
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-500 bg-[#FAFAFC] px-3.5 py-1.5 rounded-full border border-gray-200">
                    {createItinerary().length} Days Curated
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 tracking-tight">
                    Planned for the Two of You
                  </h2>
                  <p className="text-gray-500 text-sm sm:text-base mt-2">
                    Every day is paced for romance, private sightseeing, and comfortable stays.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {createItinerary().map((day, index) => (
                    <details
                      key={day.day}
                      open={index === 0}
                      className="rounded-[22px] bg-[#FAFAFC] border border-gray-200/80 p-5 sm:p-6 group open:shadow-sm transition-all"
                    >
                      <summary className="flex items-center justify-between cursor-pointer list-none gap-3">
                        <div className="flex items-center gap-3.5">
                          <span className="size-9 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                            {index + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                              {day.day}
                            </span>
                            <span className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                              {day.title}
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-4 pt-4 border-t border-gray-200/60 text-sm sm:text-base text-gray-600 space-y-3 pl-12">
                        <p className="leading-relaxed">{day.description}</p>
                        {day.details && day.details.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {day.details.map((detail, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 text-xs bg-white px-3 py-1 rounded-full border border-gray-200 text-gray-700 font-medium shadow-2xs"
                              >
                                <span className="text-emerald-500 font-bold">✓</span>
                                <span>{detail}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* ── SECTION 04 / 08: INCLUSIONS & EXCLUSIONS ── */}
              <section id="section-04" className="rounded-[32px] sm:rounded-[36px] bg-white p-8 sm:p-12 lg:p-14 border border-gray-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-8 scroll-mt-28">
                <div className="flex items-center gap-3.5 border-b border-gray-100/80 pb-5">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-xs font-mono font-semibold tracking-wider shadow-sm">
                    <span>04</span>
                    <span className="text-gray-400 font-light">/</span>
                    <span className="text-gray-300">08</span>
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#7A4F34]">
                    INCLUSIONS &amp; EXCLUSIONS
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 tracking-tight">
                    Transparent Coverage
                  </h2>
                  <p className="text-gray-500 text-sm sm:text-base mt-2">
                    Clear itemisation of what is taken care of and what is optional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Inclusions */}
                  <div className="rounded-[26px] bg-[#FAFAFC] p-6 sm:p-8 border border-emerald-100">
                    <div className="flex items-center gap-2.5 mb-5">
                      <span className="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-xs">
                        ✓
                      </span>
                      <h3 className="text-lg font-bold font-serif text-gray-900">What's Included</h3>
                    </div>
                    <ul className="space-y-3.5 text-sm text-gray-700">
                      {inclusions.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                          <span className="leading-snug font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Exclusions */}
                  <div className="rounded-[26px] bg-[#FAFAFC] p-6 sm:p-8 border border-gray-200/80">
                    <div className="flex items-center gap-2.5 mb-5">
                      <span className="size-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm shadow-xs">
                        ✕
                      </span>
                      <h3 className="text-lg font-bold font-serif text-gray-900">What's Excluded</h3>
                    </div>
                    <ul className="space-y-3.5 text-sm text-gray-500">
                      {(exclusions.length > 0
                        ? exclusions
                        : ['Airfare / Train tickets', 'Personal expenses & tips', 'Entry tickets not mentioned']
                      ).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-gray-400 shrink-0 mt-0.5">✕</span>
                          <span className="leading-snug font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* ── SECTION 05 / 08: TRANSPARENT POLICIES ── */}
              <section id="section-05" className="rounded-[32px] sm:rounded-[36px] bg-white p-8 sm:p-12 lg:p-14 border border-gray-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-8 scroll-mt-28">
                <div className="flex items-center gap-3.5 border-b border-gray-100/80 pb-5">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-xs font-mono font-semibold tracking-wider shadow-sm">
                    <span>05</span>
                    <span className="text-gray-400 font-light">/</span>
                    <span className="text-gray-300">08</span>
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#7A4F34]">
                    TRANSPARENT POLICIES
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 tracking-tight">
                    Booking &amp; Cancellation Policies
                  </h2>
                  <p className="text-gray-500 text-sm sm:text-base mt-2">
                    Zero hidden surprises. Flexible options for modern couples.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                  <div className="p-6 rounded-2xl bg-[#FAFAFC] border border-gray-200/70">
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="text-base">📅</span>
                      <h4 className="font-bold text-sm text-gray-900">Booking Terms</h4>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
                      {parsePolicies(
                        packageData.Booking_Policies?.booking || ['Instant confirmation', 'Flexible dates', 'Zero hidden fees']
                      ).map((p, idx) => (
                        <li key={idx}>• {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 rounded-2xl bg-[#FAFAFC] border border-gray-200/70">
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="text-base">💳</span>
                      <h4 className="font-bold text-sm text-gray-900">Payment Schedule</h4>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
                      {parsePolicies(
                        packageData.Booking_Policies?.payment || ['Pay in 2 instalments', 'Zero cost EMI options', 'Secure bank transfer']
                      ).map((p, idx) => (
                        <li key={idx}>• {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 rounded-2xl bg-[#FAFAFC] border border-gray-200/70">
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="text-base">🛡️</span>
                      <h4 className="font-bold text-sm text-gray-900">Cancellation</h4>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
                      {parsePolicies(
                        packageData.Booking_Policies?.cancellation || ['Free cancellation up to 7 days', 'Partial refund available', 'Custom terms apply']
                      ).map((p, idx) => (
                        <li key={idx}>• {p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* ── SECTION 06 / 08: FREQUENTLY ASKED QUESTIONS ── */}
              <section id="section-06" className="rounded-[32px] sm:rounded-[36px] bg-white p-8 sm:p-12 lg:p-14 border border-gray-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-8 scroll-mt-28">
                <div className="flex items-center gap-3.5 border-b border-gray-100/80 pb-5">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-xs font-mono font-semibold tracking-wider shadow-sm">
                    <span>06</span>
                    <span className="text-gray-400 font-light">/</span>
                    <span className="text-gray-300">08</span>
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#7A4F34]">
                    FREQUENTLY ASKED QUESTIONS
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 tracking-tight">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-gray-500 text-sm sm:text-base mt-2">
                    Quick answers to common questions about this tour and destinations
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {(packageData.FAQ_Items && packageData.FAQ_Items.length > 0
                    ? packageData.FAQ_Items
                    : DEFAULT_FAQ_ITEMS
                  )
                    .slice(0, 5)
                    .map((faq, idx) => (
                      <details
                        key={idx}
                        className="rounded-[22px] bg-[#FAFAFC] p-5 sm:p-6 border border-gray-200/80 group cursor-pointer"
                      >
                        <summary className="font-bold text-sm sm:text-base text-gray-900 flex items-center justify-between list-none">
                          <span>{faq.question}</span>
                          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="mt-3.5 text-sm sm:text-base text-gray-600 leading-relaxed pt-3.5 border-t border-gray-200/60">
                          {faq.answer}
                        </p>
                      </details>
                    ))}
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: FLOATING ATLYS BOOKING CARD */}
            <aside className="space-y-6 lg:sticky lg:top-28">
              <div className="rounded-[32px] bg-white border border-gray-200/90 shadow-[0_12px_45px_rgba(0,0,0,0.06)] p-7 sm:p-8 space-y-6">
                {/* Price Header */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Starting from</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-bold font-serif text-gray-900">
                      INR {formatPrice(packageData.Price_Range_INR) || 'Contact for price'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">per couple · all taxes &amp; private transfers included</p>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Key Guarantees */}
                <div className="space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="font-medium">Free cancellation up to 7 days before</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="font-medium">Pay in 2 instalments with zero cost EMI</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="font-medium">Customised day-by-day plan on WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="font-medium">100% itemised cost breakdown</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <a
                    href={whatsappShare}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center bg-[#25D366] hover:bg-[#20ba59] text-white py-4 rounded-full font-bold text-sm transition shadow flex items-center justify-center gap-2"
                  >
                    <span>💬</span>
                    <span>Chat on WhatsApp</span>
                  </a>

                  <button
                    ref={inlineEnquireRef}
                    onClick={() => setShowLeadForm(true)}
                    className="w-full text-center bg-black hover:bg-gray-800 text-white py-4 rounded-full font-bold text-sm transition shadow"
                  >
                    Request Custom Quote
                  </button>

                  <button
                    onClick={handleDownloadItinerary}
                    disabled={isGeneratingPDF}
                    className="w-full text-center border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white py-3.5 rounded-full font-semibold text-xs transition disabled:opacity-50"
                  >
                    {isGeneratingPDF ? 'Generating PDF...' : 'Download Itinerary PDF'}
                  </button>
                </div>

                {/* Concierge Avatar Strip */}
                <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#3B2A20] text-white font-bold text-sm flex items-center justify-center shrink-0">
                    TZ
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Dedicated Trip Designer</div>
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Online on WhatsApp (Avg. reply 5m)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share & Assistance Card */}
              <div className="rounded-[28px] bg-white border border-gray-200/80 p-6 space-y-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Direct Assistance</div>
                <div className="space-y-2 text-sm">
                  <a
                    href="tel:+919929962350"
                    className="flex items-center gap-2.5 text-gray-700 hover:text-black font-medium transition"
                  >
                    <span>📞</span>
                    <span>+91 99299 62350</span>
                  </a>
                  <a
                    href="mailto:info@travelzada.com"
                    className="flex items-center gap-2.5 text-gray-700 hover:text-black font-medium transition"
                  >
                    <span>✉️</span>
                    <span>info@travelzada.com</span>
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ── SECTION 07 / 08: MORE CURATED PACKAGES (ATLYS TALL CARDS) ── */}
        <section id="section-07" className="py-24 sm:py-32 px-5 sm:px-8 lg:px-12 bg-white border-t border-gray-200/80 scroll-mt-28">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
              <div>
                <div className="flex items-center gap-3.5 mb-2">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-xs font-mono font-semibold tracking-wider shadow-sm">
                    <span>07</span>
                    <span className="text-gray-400 font-light">/</span>
                    <span className="text-gray-300">08</span>
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#7A4F34]">
                    MORE CURATED PACKAGES
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-gray-900 mt-2">
                  Other Curated Packages You Might Love
                </h2>
              </div>
              <Link
                href={`/destinations/${slug}`}
                className="text-xs font-bold text-black hover:underline flex items-center gap-1"
              >
                <span>View all packages</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(relatedPackages && relatedPackages.length > 0
                ? relatedPackages.slice(0, 4)
                : [
                    {
                      id: 'kashmir-deluxe',
                      Destination_Name: 'Kashmir Luxury Houseboat & Valley Romance',
                      Duration: '5N / 6D',
                      Star_Category: '5★ Luxury',
                      Price_Range_INR: '48,500',
                      Primary_Image_URL: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1000&q=80',
                      Slug: 'kashmir-packages'
                    },
                    {
                      id: 'bali-honeymoon',
                      Destination_Name: 'Bali Tropical Private Pool Villa Honeymoon',
                      Duration: '6N / 7D',
                      Star_Category: '5★ Luxury',
                      Price_Range_INR: '68,000',
                      Primary_Image_URL: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1000&q=80',
                      Slug: 'bali-packages'
                    },
                    {
                      id: 'kerala-backwaters',
                      Destination_Name: 'Kerala Backwaters & Munnar Mist Romance',
                      Duration: '5N / 6D',
                      Star_Category: '4★ Deluxe',
                      Price_Range_INR: '42,000',
                      Primary_Image_URL: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1000&q=80',
                      Slug: 'kerala-packages'
                    },
                    {
                      id: 'andaman-coral',
                      Destination_Name: 'Andaman Coral Island & Havelock Getaway',
                      Duration: '5N / 6D',
                      Star_Category: '5★ Luxury',
                      Price_Range_INR: '54,000',
                      Primary_Image_URL: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&q=80',
                      Slug: 'andaman-and-nicobar-packages'
                    }
                  ]
              ).map((pkg) => {
                let img = pkg.Primary_Image_URL || ''
                const match = img.match(/\[([^\]]+)\]\(([^)]+)\)/)
                if (match) img = match[2]
                const pkgSlug = pkg.Slug || (pkg as any).Destination_ID || pkg.id || 'package'
                const price = pkg.Price_Range_INR ? `₹${formatPrice(pkg.Price_Range_INR)}` : 'On Request'

                return (
                  <Link
                    key={pkg.id || pkgSlug}
                    href={`/destinations/${encodeURIComponent(slug)}/${pkgSlug}`}
                    className="group relative block aspect-[1/1.5] rounded-[30px] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 cursor-pointer bg-gray-900"
                  >
                    <Image
                      src={img || '/images/placeholder.jpg'}
                      alt={pkg.Destination_Name || 'Package'}
                      fill
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />
                    
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-none">
                      <span className="bg-white/90 backdrop-blur-md text-gray-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase">
                        {pkg.Duration}
                      </span>
                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-sm">
                        {pkg.Star_Category || '4★ Deluxe'}
                      </span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col z-10">
                      <h3 className="font-serif text-[17px] font-bold text-white uppercase tracking-wider leading-tight drop-shadow line-clamp-2 text-balance">
                        {pkg.Destination_Name}
                      </h3>
                      <div className="w-full h-px bg-white/20 my-3" />
                      <div className="flex items-center justify-between text-white text-xs">
                        <span className="text-[11px] font-medium text-white/70">From</span>
                        <span className="text-sm font-bold text-[#E8DCC3]">{price}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 08 / 08: COUPLE FEEDBACK & REVIEWS ── */}
        <section id="section-08" className="py-24 sm:py-32 px-5 sm:px-8 lg:px-12 bg-[#FAFAFC] border-t border-gray-200/80 scroll-mt-28">
          <div className="max-w-[1440px] mx-auto">
            <div className="mb-12">
              <div className="flex items-center gap-3.5 mb-2">
                <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-xs font-mono font-semibold tracking-wider shadow-sm">
                  <span>08</span>
                  <span className="text-gray-400 font-light">/</span>
                  <span className="text-gray-300">08</span>
                </span>
                <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#7A4F34]">
                  COUPLE FEEDBACK &amp; REVIEWS
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-gray-900 mt-2">
                Reviews for {packageData.Destination_Name || 'this package'}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <ReviewSummary
                  destinationName={packageData.Destination_Name || slug}
                  packageId={packageData.id || packageId}
                  refreshTrigger={reviewRefresh}
                  onWriteReviewClick={() => {
                    reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                />
                <div ref={reviewFormRef} id="write-review">
                  <ReviewForm
                    destinationName={packageData.Destination_Name || slug}
                    packageId={packageData.id || packageId}
                    packageName={packageData.Destination_Name || 'this package'}
                    onReviewSubmitted={() => setReviewRefresh((n) => n + 1)}
                  />
                </div>
              </div>
              <div className="lg:col-span-2">
                <ReviewList
                  destinationName={packageData.Destination_Name || slug}
                  packageId={packageData.id || packageId}
                  refreshTrigger={reviewRefresh}
                />
              </div>
            </div>
          </div>
        </section>

        <Footer />

        {/* ─────────────────────────────────────────────────────────────
            MOBILE BOTTOM ENQUIRY BAR
        ───────────────────────────────────────────────────────────── */}
        {!showLeadForm && !isInlineEnquireVisible && (
          <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 flex items-center gap-3">
            <a
              href={whatsappShare}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#25D366] text-white py-3.5 rounded-full font-bold text-sm text-center shadow-lg flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => setShowLeadForm(true)}
              className="flex-1 bg-black text-white py-3.5 rounded-full font-bold text-sm text-center shadow-lg"
            >
              Enquire Now
            </button>
          </div>
        )}

        <LeadForm
          isOpen={showLeadForm}
          onClose={() => setShowLeadForm(false)}
          sourceUrl={typeof window !== 'undefined' ? window.location.href : ''}
          packageName={packageData.Destination_Name}
        />

        {/* Location Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowLocationModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Locations Covered</h3>
              </div>
              <div className="prose prose-sm text-gray-600 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <p className="text-base leading-relaxed">
                  {packageData.Location_Breakup || packageData.Destination_Name || 'Bali, Indonesia'}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-black transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
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

function StatBlock({ label, value, icon, onClick }: { label: string; value: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-start p-3 sm:p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 group h-full ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-full bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
          {icon}
        </div>
        <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-xs sm:text-sm font-bold text-[#1e1d2f] leading-snug break-words pl-1 line-clamp-3">{value}</p>
    </div>
  )
}

function ListWithIcon({ items, icon, iconClass }: { items: string[]; icon: React.ReactNode; iconClass: string }) {
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
