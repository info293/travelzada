import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import travelDatabase from '@/data/travel-database.json'
import type { Metadata } from 'next'
import DestinationDetailClient from './DestinationDetailClient'
import SchemaMarkup, {
  generateTouristDestinationSchema,
  generateBreadcrumbSchema,
  generateItemListSchema,
  generateWebPageSchema,
  generateTravelAgencyReviewSchema
} from '@/components/SchemaMarkup'

const geoData: Record<string, { latitude: string; longitude: string }> = {
  'bali': { latitude: '-8.3405', longitude: '115.0920' },
  'singapore': { latitude: '1.3521', longitude: '103.8198' },
  'rajasthan': { latitude: '27.0238', longitude: '74.2179' },
  'kashmir': { latitude: '33.7782', longitude: '76.5762' },
  'kerala': { latitude: '10.8505', longitude: '76.2711' },
  'thailand': { latitude: '15.8700', longitude: '100.9925' },
  'andaman': { latitude: '11.7401', longitude: '92.6586' },
  'baku': { latitude: '40.4093', longitude: '49.8671' }
}

const travelData = travelDatabase as any

interface PageProps {
  params: { slug: string } | Promise<{ slug: string }>
}

async function getDestinationData(slug: string) {
  const normalizedDestination = decodeURIComponent(slug).toLowerCase()
  let destination = null

  // Server-side Firebase query
  if (db) {
    const destinationsRef = collection(db, 'destinations')
    const destinationsSnapshot = await getDocs(destinationsRef)
    
    destinationsSnapshot.forEach((doc) => {
      const data = doc.data()
      const destSlug = data.slug?.toLowerCase() || ''
      const destName = data.name?.toLowerCase() || ''

      if (destSlug === normalizedDestination ||
          destName === normalizedDestination ||
          destSlug.includes(normalizedDestination) ||
          normalizedDestination.includes(destSlug)) {
        destination = { id: doc.id, ...data }
      }
    })
  }

  if (!destination) {
    destination = travelData.destinations.find(
      (d: any) => d.name.toLowerCase() === normalizedDestination ||
        d.name.toLowerCase().replace(/\s+/g, '-') === normalizedDestination
    )
  }

  return destination
}

async function getDestinationPackages(destination: any, slug: string) {
  if (!destination || !db) return []
  const packagesData: any[] = []
  const normalizedDestination = decodeURIComponent(slug).toLowerCase()

  const packagesRef = collection(db, 'packages')
  const allPackagesSnapshot = await getDocs(packagesRef)
  
  const linkedPackageIds = destination.packageIds || []
  const hasLinkedPackages = Array.isArray(linkedPackageIds) && linkedPackageIds.length > 0

  allPackagesSnapshot.forEach((doc) => {
    const data = doc.data() as any
    const pkgId = data.Destination_ID || ''

    let shouldInclude = false
    if (hasLinkedPackages) {
      shouldInclude = linkedPackageIds.includes(pkgId)
    } else {
      const pkgName = data.Destination_Name?.toLowerCase() || ''
      shouldInclude = pkgName.includes(normalizedDestination) ||
        normalizedDestination.includes(pkgName) ||
        pkgId.toLowerCase().includes(normalizedDestination)
    }

    if (shouldInclude) {
      packagesData.push({ id: doc.id, ...data })
    }
  })
  
  return packagesData
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params)
  const slug = resolvedParams.slug
  const destination = await getDestinationData(slug)
  
  if (!destination) return { title: 'Destination Not Found - Travelzada' }
  
  return {
    title: `${destination.name} Tour Packages - Travelzada`,
    description: destination.description || `Explore top tour packages for ${destination.name}. Book your dream trip with Travelzada!`,
  }
}

export default async function DestinationPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params)
  const slug = resolvedParams.slug
  const destination = await getDestinationData(slug)
  const packages = await getDestinationPackages(destination, slug)

  if (!destination) {
    return <DestinationDetailClient params={resolvedParams} initialDestination={null} initialPackages={[]} />
  }

  const destinationUrl = `https://www.travelzada.com/destinations/${destination.slug || destination.name.toLowerCase().replace(/\s+/g, '-')}`
  
  const destinationGeo = geoData[destination.name.toLowerCase()] || undefined
  const destinationAttractions = destination.highlights?.map((h: string) => ({ name: h })) || []

  const destinationSchema = generateTouristDestinationSchema({
    name: destination.name,
    description: destination.description,
    country: destination.country,
    geo: destinationGeo,
    attractions: destinationAttractions
  })

  // Basic breadcrumb schema built into the existing unmodified components/SchemaMarkup.tsx
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' },
    { name: 'Destinations', url: 'https://www.travelzada.com/destinations' },
    { name: destination.name, url: destinationUrl }
  ])

  // Basic itemList schema for packages
  const itemListSchema = packages.length > 0 ? generateItemListSchema(
    `${destination.name} Travel Packages`,
    `Explore top travel packages for ${destination.name}`,
    packages.map((pkg: any) => ({
      name: pkg.Destination_Name || 'Package',
      url: `${destinationUrl}/${pkg.Slug || pkg.Destination_ID || pkg.id}`
    }))
  ) : null

  const webPageSchema = generateWebPageSchema({
    name: `${destination.name} Tour Packages - Travelzada`,
    description: destination.description,
    url: destinationUrl,
    websiteUrl: 'https://www.travelzada.com',
    aboutDestinationName: destination.name
  })

  // TravelAgency Review for destinations (4.8 rating)
  const reviewSchema = generateTravelAgencyReviewSchema({
    ratingValue: '4.8',
    ratingCount: '150',
    reviewCount: '150',
    reviews: [
      { authorName: 'Priya Sharma', date: '2026-02-15', ratingValue: '5', body: `Amazing ${destination.name} trip planned by Travelzada. Everything was perfect.` }
    ]
  })

  return (
    <>
      <SchemaMarkup schema={destinationSchema} id="destination-schema" />
      <SchemaMarkup schema={breadcrumbSchema} id="breadcrumb-schema-dest" />
      {itemListSchema && <SchemaMarkup schema={itemListSchema} id="item-list-schema" />}
      <SchemaMarkup schema={webPageSchema} id="webpage-schema" />
      <SchemaMarkup schema={reviewSchema} id="review-schema" />
      
      <DestinationDetailClient 
        params={resolvedParams} 
        initialDestination={destination} 
        initialPackages={packages} 
      />
    </>
  )
}
