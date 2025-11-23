'use client'

import { useEffect, useState, useRef } from 'react'
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
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchPackage = async () => {
      if (typeof window === 'undefined' || !db) {
        setLoading(false)
        setNotFound(true)
        return
      }

      try {
        setLoading(true)
        
        // Helper function to check if package matches destination
        const matchesDestination = (data: DestinationPackage): boolean => {
          const normalizedSlug = slug.toLowerCase()
          const pkgName = data.Destination_Name?.toLowerCase() || ''
          const pkgId = data.Destination_ID?.toLowerCase() || ''
          
          // Check if Destination_Name or Destination_ID contains the slug (or vice versa)
          return pkgName.includes(normalizedSlug) ||
                 normalizedSlug.includes(pkgName) ||
                 pkgId.includes(normalizedSlug) ||
                 normalizedSlug.includes(pkgId)
        }
        
        // Try to fetch by document ID first
        const docRef = doc(db, 'packages', packageId)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data() as DestinationPackage
          // Verify it matches the destination
          if (matchesDestination(data)) {
            setPackageData({ id: docSnap.id, ...data })
            setLoading(false)
            return
          }
        }
        
        // If not found by ID, try to find by Destination_ID
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        const packagesRef = collection(db, 'packages')
        
        try {
          const q = query(packagesRef, where('Destination_ID', '==', packageId))
          const querySnapshot = await getDocs(q)
          
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0]
            const data = doc.data() as DestinationPackage
            if (matchesDestination(data)) {
              setPackageData({ id: doc.id, ...data })
              setLoading(false)
              return
            }
          }
        } catch (queryError) {
          // If query fails (e.g., missing index), continue to fallback search
          console.log('Query by Destination_ID failed, trying fallback:', queryError)
        }
        
        // If still not found, try searching all packages
        console.log(`Searching all packages for packageId: ${packageId}, slug: ${slug}`)
        const allPackagesSnapshot = await getDocs(packagesRef)
        for (const doc of allPackagesSnapshot.docs) {
          const data = doc.data() as DestinationPackage
          const matchesId = data.Destination_ID === packageId || doc.id === packageId
          const matchesDest = matchesDestination(data)
          console.log(`Package ${doc.id}: Destination_ID=${data.Destination_ID}, matchesId=${matchesId}, matchesDest=${matchesDest}`)
          
          if (matchesId && matchesDest) {
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

  const handleDownloadItinerary = async () => {
    if (!contentRef.current || isGeneratingPDF) return

    try {
      setIsGeneratingPDF(true)
      
      // Dynamically import client-side only libraries
      const [jsPDFModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])
      const jsPDF = jsPDFModule.default || jsPDFModule
      const html2canvas = html2canvasModule.default || html2canvasModule
      
      // Store original states
      const detailsElements = contentRef.current.querySelectorAll('details')
      const originalStates: boolean[] = []
      detailsElements.forEach((detail, index) => {
        originalStates[index] = (detail as HTMLDetailsElement).open
        ;(detail as HTMLDetailsElement).open = true
      })

      // Wait for content to render and images to load
      await new Promise(resolve => setTimeout(resolve, 500))

      // Convert Next.js Image components to regular img tags for PDF capture
      const nextImages = contentRef.current.querySelectorAll('img[srcset], img[data-next-image], img[data-pdf-image], span[data-pdf-image]')
      const imageConversionPromises: Promise<void>[] = []
      
      nextImages.forEach((element) => {
        const imgElement = element as HTMLElement
        
        // Get the actual image source
        let actualSrc = ''
        
        // Check if it has data-pdf-image attribute (our custom attribute)
        if (imgElement.hasAttribute('data-pdf-image')) {
          actualSrc = imgElement.getAttribute('data-pdf-image') || ''
        } else if (imgElement.tagName === 'IMG') {
          const img = imgElement as HTMLImageElement
          actualSrc = img.src
          
          // If it's a Next.js optimized image, try to get the original src
          if (img.srcset) {
            // Extract the largest image from srcset
            const srcsetMatch = img.srcset.match(/(https?:\/\/[^\s,]+)/g)
            if (srcsetMatch && srcsetMatch.length > 0) {
              actualSrc = srcsetMatch[srcsetMatch.length - 1] // Get the largest one
            }
          }
          
          // If src contains Next.js image optimization, try to get original
          if (actualSrc.includes('/_next/image')) {
            try {
              const urlParams = new URL(actualSrc)
              const urlParam = urlParams.searchParams.get('url')
              if (urlParam) {
                actualSrc = decodeURIComponent(urlParam)
              } else {
                // Try regex fallback
                const urlMatch = actualSrc.match(/url=([^&]+)/)
                if (urlMatch) {
                  actualSrc = decodeURIComponent(urlMatch[1])
                }
              }
            } catch (e) {
              // If URL parsing fails, try regex
              const urlMatch = actualSrc.match(/url=([^&]+)/)
              if (urlMatch) {
                actualSrc = decodeURIComponent(urlMatch[1])
              }
            }
          }
        } else {
          // It's a span wrapper, find the img inside
          const innerImg = imgElement.querySelector('img')
          if (innerImg) {
            actualSrc = innerImg.src
            if (innerImg.srcset) {
              const srcsetMatch = innerImg.srcset.match(/(https?:\/\/[^\s,]+)/g)
              if (srcsetMatch && srcsetMatch.length > 0) {
                actualSrc = srcsetMatch[srcsetMatch.length - 1]
              }
            }
          }
        }
        
        if (!actualSrc) return
        
        // Find the actual img element (might be inside a span for Next.js Image)
        let targetImg: HTMLImageElement | null = null
        if (imgElement.tagName === 'IMG') {
          targetImg = imgElement as HTMLImageElement
        } else {
          targetImg = imgElement.querySelector('img') as HTMLImageElement
        }
        
        if (!targetImg) return
        
        // Get computed styles
        const computedStyle = window.getComputedStyle(targetImg)
        const parentStyle = targetImg.parentElement ? window.getComputedStyle(targetImg.parentElement) : null
        
        // Create a new img element with the actual source
        const newImg = document.createElement('img')
        newImg.src = actualSrc
        newImg.alt = targetImg.alt || packageTitle
        newImg.style.cssText = `
          position: ${computedStyle.position};
          width: ${computedStyle.width};
          height: ${computedStyle.height};
          object-fit: ${computedStyle.objectFit || 'cover'};
          display: block;
          visibility: visible;
          opacity: 1;
        `
        if (parentStyle) {
          newImg.style.position = parentStyle.position === 'relative' ? 'absolute' : computedStyle.position
          newImg.style.top = computedStyle.top
          newImg.style.left = computedStyle.left
          newImg.style.right = computedStyle.right
          newImg.style.bottom = computedStyle.bottom
        }
        
        // Replace the Next.js Image with regular img
        const promise = new Promise<void>((resolve) => {
          newImg.onload = () => {
            if (targetImg && targetImg.parentNode) {
              // Replace the entire parent if it's a span wrapper
              if (targetImg.parentElement && targetImg.parentElement.tagName === 'SPAN') {
                targetImg.parentElement.replaceWith(newImg)
              } else {
                targetImg.parentNode.replaceChild(newImg, targetImg)
              }
            }
            resolve()
          }
          newImg.onerror = () => {
            // If image fails, try to fix the src of original
            if (targetImg) {
              targetImg.src = actualSrc
              targetImg.removeAttribute('srcset')
            }
            resolve()
          }
          // Timeout after 5 seconds
          setTimeout(resolve, 5000)
        })
        imageConversionPromises.push(promise)
      })
      
      // Wait for all image conversions
      await Promise.all(imageConversionPromises)
      
      // Wait for all images to load (including converted ones)
      const allImages = contentRef.current.querySelectorAll('img')
      const imagePromises = Array.from(allImages).map((img) => {
        const imgElement = img as HTMLImageElement
        if (imgElement.complete && imgElement.naturalWidth > 0) {
          return Promise.resolve<void>(undefined)
        }
        return new Promise<void>((resolve) => {
          imgElement.onload = () => resolve()
          imgElement.onerror = () => resolve() // Continue even if image fails
          // Timeout after 5 seconds
          setTimeout(() => resolve(), 5000)
        })
      })
      await Promise.all(imagePromises)

      // Additional wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500))

      // Hide elements that shouldn't be in PDF
      const elementsToHide = contentRef.current.querySelectorAll('[data-pdf-hide="true"]')
      const originalDisplays: string[] = []
      elementsToHide.forEach((el) => {
        originalDisplays.push((el as HTMLElement).style.display)
        ;(el as HTMLElement).style.display = 'none'
      })

      // Hide iframes (maps) as they can't be captured properly
      const iframes = contentRef.current.querySelectorAll('iframe')
      const originalIframeDisplays: string[] = []
      iframes.forEach((iframe) => {
        originalIframeDisplays.push((iframe as HTMLElement).style.display)
        ;(iframe as HTMLElement).style.display = 'none'
      })

      // Ensure content is visible
      const originalOverflow = contentRef.current.style.overflow
      contentRef.current.style.overflow = 'visible'
      contentRef.current.style.position = 'relative'

      // Scroll to top to ensure we capture from the beginning
      const originalScrollTop = window.pageYOffset || document.documentElement.scrollTop
      window.scrollTo(0, 0)
      await new Promise(resolve => setTimeout(resolve, 300))

      // Capture the content area with better options
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8f5f0',
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight,
        allowTaint: true, // Changed to true to allow external images
        removeContainer: false,
        imageTimeout: 20000, // Increased timeout for image loading
        foreignObjectRendering: false, // Disable for better image support
        proxy: undefined, // No proxy needed
        onclone: (clonedDoc) => {
          // Handle Next.js Image components in cloned document
          const clonedImages = clonedDoc.querySelectorAll('img')
          clonedImages.forEach((img) => {
            const imgElement = img as HTMLImageElement
            imgElement.style.display = 'block'
            imgElement.style.visibility = 'visible'
            imgElement.style.opacity = '1'
            imgElement.style.maxWidth = '100%'
            imgElement.style.height = 'auto'
            imgElement.style.objectFit = 'cover'
            
            // Fix Next.js optimized image URLs
            let actualSrc = imgElement.src
            if (actualSrc.includes('/_next/image')) {
              // Extract original URL from Next.js image optimization URL
              try {
                const urlParams = new URL(actualSrc)
                const urlParam = urlParams.searchParams.get('url')
                if (urlParam) {
                  actualSrc = decodeURIComponent(urlParam)
                  imgElement.src = actualSrc
                }
              } catch (e) {
                // If parsing fails, try regex
                const urlMatch = actualSrc.match(/url=([^&]+)/)
                if (urlMatch) {
                  actualSrc = decodeURIComponent(urlMatch[1])
                  imgElement.src = actualSrc
                }
              }
            }
            
            // Remove srcset as it can cause issues
            imgElement.removeAttribute('srcset')
            imgElement.removeAttribute('sizes')
            
            // Ensure crossorigin for external images
            if (actualSrc.startsWith('http')) {
              imgElement.crossOrigin = 'anonymous'
            }
          })
          
          // Ensure all text is visible
          const allElements = clonedDoc.querySelectorAll('*')
          allElements.forEach((el) => {
            const element = el as HTMLElement
            if (element.style) {
              if (element.style.color === 'transparent' || element.style.opacity === '0') {
                element.style.color = 'inherit'
                element.style.opacity = '1'
              }
            }
          })
        }
      })

      // Restore scroll position
      window.scrollTo(0, originalScrollTop)

      // Restore styles
      contentRef.current.style.overflow = originalOverflow

      // Restore hidden elements
      elementsToHide.forEach((el, index) => {
        ;(el as HTMLElement).style.display = originalDisplays[index] || ''
      })
      iframes.forEach((iframe, index) => {
        ;(iframe as HTMLElement).style.display = originalIframeDisplays[index] || ''
      })

      // Restore scroll position
      window.scrollTo(0, originalScrollTop)

      // Restore hidden elements
      elementsToHide.forEach((el, index) => {
        ;(el as HTMLElement).style.display = originalDisplays[index] || ''
      })

      // Check if canvas has content
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture page content - canvas is empty')
      }

      // Verify canvas has actual content (not just blank)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100))
        const data = imageData.data
        let hasContent = false
        for (let i = 0; i < data.length; i += 4) {
          // Check if pixel is not just background color
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          // Background is #f8f5f0 which is rgb(248, 245, 240)
          if (a > 0 && (Math.abs(r - 248) > 10 || Math.abs(g - 245) > 10 || Math.abs(b - 240) > 10)) {
            hasContent = true
            break
          }
        }
        if (!hasContent) {
          console.warn('Canvas appears to be blank, but continuing...')
        }
      }

      const imgData = canvas.toDataURL('image/png', 1.0)
      
      if (!imgData || imgData === 'data:,') {
        throw new Error('Failed to generate image data from canvas')
      }
      
      // Calculate PDF dimensions
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth
      const pageHeight = 297 // A4 height in mm
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const totalPages = Math.ceil(pdfHeight / pageHeight)
      
      // Add pages with content
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage()
        }
        
        const yPosition = -(i * pageHeight)
        
        pdf.addImage(
          imgData,
          'PNG',
          0,
          yPosition,
          pdfWidth,
          pdfHeight,
          undefined,
          'FAST'
        )
      }

      // Save the PDF
      const fileName = `${packageTitle.replace(/[^a-z0-9]/gi, '_')}_Itinerary.pdf`
      pdf.save(fileName)
      
      // Restore original states
      detailsElements.forEach((detail, index) => {
        ;(detail as HTMLDetailsElement).open = originalStates[index]
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] text-gray-900">
      <Header />

      <div ref={contentRef} className="pdf-content bg-[#f8f5f0]">
        <section className="relative h-[420px] md:h-[520px] w-full">
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
          <div className="absolute top-20 left-4 md:left-8 z-10" data-pdf-hide="true">
            <Link
              href={`/destinations/${slug}`}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg"
            >
              <svg className="w-6 h-6 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>
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
                    className="rounded-[5px] border border-gray-200 bg-white p-5 open:shadow-sm [&[open]_summary_svg]:rotate-180"
                    open={index === 0}
                  >
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <div className="flex items-center gap-3 text-lg font-medium">
                        <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          {index + 1}
                        </span>
                        {day.day}: {day.title}
                      </div>
                      <svg 
                        className="w-5 h-5 text-primary transition-transform duration-200" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
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
                {(packageData.Guest_Reviews && packageData.Guest_Reviews.length > 0 
                  ? packageData.Guest_Reviews 
                  : DEFAULT_GUEST_REVIEWS).map((review, idx) => (
                  <div key={idx} className="rounded-[5px] border border-gray-200 p-5 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">{review.name}</p>
                      <p className="text-yellow-500">{review.rating || '★★★★★'}</p>
                    </div>
                    <p className="text-gray-600 mb-2">{review.content}</p>
                    <p className="text-sm text-gray-500">{review.date}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Booking Policies">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <PolicyCard 
                  title="Booking" 
                  items={packageData.Booking_Policies?.booking || ['Instant confirmation', 'Flexible dates', '24/7 support']} 
                />
                <PolicyCard 
                  title="Payment" 
                  items={packageData.Booking_Policies?.payment || ['Pay in instalments', 'Zero cost EMI', 'Secure transactions']} 
                />
                <PolicyCard 
                  title="Cancellation" 
                  items={packageData.Booking_Policies?.cancellation || ['Free cancellation up to 7 days', 'Partial refund available', 'Contact for details']} 
                />
              </div>
            </SectionCard>

            <SectionCard title="Frequently Asked Questions">
              <div className="space-y-4">
                {(packageData.FAQ_Items && packageData.FAQ_Items.length > 0 
                  ? packageData.FAQ_Items 
                  : DEFAULT_FAQ_ITEMS).map((faq, idx) => (
                  <details
                    key={idx}
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
      </div>

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

