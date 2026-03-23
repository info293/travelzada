import type { Metadata } from 'next'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import PackageDetailClient from './PackageDetailClient'
import SchemaMarkup, { 
  generateTravelPackageSchema, 
  generateBreadcrumbSchema, 
  generateProductSchema, 
  generateFAQSchema,
  generateWebPageSchema
} from '@/components/SchemaMarkup'

interface PageProps {
  params: { slug: string; packageId: string }
}

const DEFAULT_FAQ_ITEMS = [
  { question: 'What is the best time to visit Bali?', answer: 'The dry season from April to October offers sunny skies, calm waters and fewer showers—perfect for sightseeing and water adventures.' },
  { question: 'Do I need a visa for Bali?', answer: 'Indian passport holders can obtain a visa on arrival for tourist travel up to 30 days. Carry a return ticket and proof of accommodation.' },
  { question: 'Can I customize the itinerary?', answer: 'Absolutely. Our destination experts can tweak hotel categories, add private experiences or extend nights on request.' }
];

const DEFAULT_GUEST_REVIEWS = [
    { name: 'Anjali Mehta', content: 'Best vacation ever...', date: '14 November 2025', rating: '5/5' },
    { name: 'Priya & Rahul Sharma', content: 'Our honeymoon in Bali...', date: '11 November 2025', rating: '5/5' }
];

async function getPackageData(packageId: string, slug?: string) {
  if (!db) return null;
  // Try doc id
  const docRef = doc(db, 'packages', packageId)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() }
  
  // Try slug
  const packagesRef = collection(db, 'packages')
  const slugQuery = query(packagesRef, where('Slug', '==', packageId))
  const slugSnapshot = await getDocs(slugQuery)
  if (!slugSnapshot.empty) return { id: slugSnapshot.docs[0].id, ...slugSnapshot.docs[0].data() }

  // Try Destination_ID
  const destQuery = query(packagesRef, where('Destination_ID', '==', packageId))
  const destSnapshot = await getDocs(destQuery)
  if (!destSnapshot.empty) return { id: destSnapshot.docs[0].id, ...destSnapshot.docs[0].data() }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const packageData: any = await getPackageData(params.packageId, params.slug);
  if (!packageData) return { title: 'Package Not Found' };
  
  const packageTitle = packageData.Destination_Name || 'Travel Package'
  const imageUrl = packageData.Primary_Image_URL
    ? packageData.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
    : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
    
  return {
    title: `${packageTitle} - Travelzada`,
    description: packageData.Overview || `Explore ${packageTitle} with Travelzada. Book your dream vacation today!`,
    openGraph: {
      title: `${packageTitle} - Travelzada`,
      description: packageData.Overview || `Explore ${packageTitle} with Travelzada. Book your dream vacation today!`,
      images: [imageUrl],
      type: 'article',
    }
  }
}

export default async function PackagePage({ params }: PageProps) {
  const packageData: any = await getPackageData(params.packageId, params.slug);
  
  if (!packageData) {
    return <PackageDetailClient params={params} initialPackageData={null} />
  }

  const packageTitle = packageData.Destination_Name || 'Travel Package'
  const slug = decodeURIComponent(params.slug)
  const imageUrl = packageData.Primary_Image_URL
    ? packageData.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
    : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
  
  const itineraryData = Array.isArray(packageData.Day_Wise_Itinerary_Details) 
    ? packageData.Day_Wise_Itinerary_Details.map((day: any) => ({
        dayTitle: day.Title || day.Day_Title || day.Headline || 'Day',
        description: day.Description || day.Activities || day.Summary || 'Activities planned for the day'
      })).filter((day: any) => day.dayTitle && day.description)
    : undefined;

  const packageSchema = generateTravelPackageSchema({
    name: packageTitle,
    description: packageData.Overview || packageTitle,
    image: imageUrl,
    priceRange: packageData.Price_Range_INR,
    currency: 'INR',
    duration: packageData.Duration,
    destination: slug,
    url: `https://www.travelzada.com/destinations/${slug}/${params.packageId}`,
    itinerary: itineraryData
  })

  // Generate product schema for Ratings and Offers
  const productSchema = generateProductSchema({
    name: packageTitle,
    description: packageData.Overview || packageTitle,
    image: imageUrl,
    price: packageData.Price_Range_INR ? String(packageData.Price_Range_INR).replace(/[^0-9]/g, '') || '50000' : '50000',
    ratingValue: '5.0',
    ratingCount: (packageData.Guest_Reviews && packageData.Guest_Reviews.length > 0) ? String(packageData.Guest_Reviews.length) : String(DEFAULT_GUEST_REVIEWS.length),
    reviewCount: (packageData.Guest_Reviews && packageData.Guest_Reviews.length > 0) ? String(packageData.Guest_Reviews.length) : String(DEFAULT_GUEST_REVIEWS.length)
  })

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' },
    { name: 'Destinations', url: 'https://www.travelzada.com/destinations' },
    { name: slug, url: `https://www.travelzada.com/destinations/${slug}` },
    { name: packageTitle },
  ])

  const faqs = packageData.FAQ_Items && packageData.FAQ_Items.length > 0 ? packageData.FAQ_Items : DEFAULT_FAQ_ITEMS
  const faqSchema = generateFAQSchema(faqs)

  const webPageSchema = generateWebPageSchema({
    name: `${packageTitle} - Travelzada`,
    description: packageData.Overview || packageTitle,
    url: `https://www.travelzada.com/destinations/${slug}/${params.packageId}`,
    websiteUrl: 'https://www.travelzada.com',
    aboutDestinationName: slug
  })

  return (
    <>
      <SchemaMarkup schema={packageSchema} id="package-schema" />
      <SchemaMarkup schema={productSchema} id="product-schema" />
      <SchemaMarkup schema={breadcrumbSchema} id="breadcrumb-schema-package" />
      <SchemaMarkup schema={faqSchema} id="faq-schema-package" />
      <SchemaMarkup schema={webPageSchema} id="webpage-schema" />
      <PackageDetailClient params={params} initialPackageData={packageData} />
    </>
  )
}
