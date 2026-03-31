import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
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

  // Fallback: Case-insensitive search on all packages
  const allPackagesSnapshot = await getDocs(packagesRef)
  for (const docSnap of allPackagesSnapshot.docs) {
    const data = docSnap.data() as any
    const searchParam = String(packageId).toLowerCase()
    
    if (
      (data.Slug && String(data.Slug).toLowerCase() === searchParam) || 
      (data.Destination_ID && String(data.Destination_ID).toLowerCase() === searchParam) || 
      String(docSnap.id).toLowerCase() === searchParam
    ) {
      console.log(`[SSR] getPackageData Fallback Match Found! ID: ${docSnap.id}`);
      return { id: docSnap.id, ...data }
    }
  }
  
  console.log(`[SSR] getPackageData FAILED to find any package for: ${packageId}`);
  return null;
}

function getCanonicalDestinationSlug(packageData: any, currentSlug: string): string {
  const destIdStr = packageData.Destination_ID ? String(packageData.Destination_ID) : '';
  const prefix = destIdStr ? destIdStr.split('_')[0].toUpperCase() : '';
  const prefixMap: Record<string, string> = {
      'BAL': 'bali-packages',
      'KER': 'kerala-packages',
      'GOA': 'goa-packages',
      'KASH': 'kashmir-packages',
      'RAJ': 'rajasthan-packages',
      'THAI': 'thailand-packages',
      'VIET': 'vietnam-packages',
      'DUBAI': 'dubai-packages',
      'MAL': 'maldives-packages',
      'EUR': 'europe-packages',
      'LAD': 'ladakh-packages',
      'AND': 'andaman-and-nicobar-packages',
      'BAKU': 'baku-packages',
      'SING': 'singapore-packages'
  };
  
  if (prefixMap[prefix]) {
      return prefixMap[prefix];
  }
  
  if (packageData.Destination_Name) {
      let baseName = String(packageData.Destination_Name).toLowerCase().split(' ')[0].replace(/[^a-z0-9-]/g, '');
      if (baseName === 'andaman') return 'andaman-and-nicobar-packages';
      if (baseName === 'sri') return 'sri-lanka-packages';
      return `${baseName}-packages`;
  }
  
  // Fallback
  if (!String(currentSlug).endsWith('-packages')) {
      return `${String(currentSlug)}-packages`;
  }
  return String(currentSlug);
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
    },
    twitter: {
      card: 'summary_large_image',
      title: `${packageTitle} - Travelzada`,
      description: packageData.Overview || `Explore ${packageTitle} with Travelzada. Book your dream vacation today!`,
      images: [imageUrl],
    }
  }
}

export default async function PackagePage({ params }: PageProps) {
  console.log(`[SSR] PackagePage Started for slug: ${params.slug}, packageId: ${params.packageId}`);
  const packageData: any = await getPackageData(params.packageId, params.slug);
  
  if (!packageData) {
    console.log(`[SSR] packageData is null. Bailing out to PackageDetailClient without redirect.`);
    return <PackageDetailClient params={params} initialPackageData={null} />
  }

  const slug = decodeURIComponent(params.slug)

  // Enforce Canonical URL Structure
  const canonicalSlug = getCanonicalDestinationSlug(packageData, slug)
  console.log(`[SSR] canonicalSlug = ${canonicalSlug}, currentSlug = ${slug}`);
  if (slug.toLowerCase() !== canonicalSlug.toLowerCase()) {
    const packageSlug = packageData.Slug || params.packageId
    console.log(`[SSR] MUST REDIRECT to /destinations/${canonicalSlug}/${packageSlug}`);
    // Permanent 301 Redirect to the correct canonical URL
    permanentRedirect(`/destinations/${canonicalSlug}/${packageSlug}`)
  }

  const packageTitle = packageData.Destination_Name || 'Travel Package'
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

  const packageUrl = `https://www.travelzada.com/destinations/${slug}/${params.packageId}`
  const webPageSchema = generateWebPageSchema({
    name: `${packageTitle} - Travelzada`,
    description: packageData.Overview || packageTitle,
    url: packageUrl,
    websiteUrl: 'https://www.travelzada.com',
    aboutDestinationName: slug
  })

  // We explicitly pass packageUrl as the globalId to generateBreadcrumbSchema so the @id correctly matches WebPageSchema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' },
    { name: 'Destinations', url: 'https://www.travelzada.com/destinations' },
    { name: slug, url: `https://www.travelzada.com/destinations/${slug}` },
    { name: packageTitle, url: packageUrl },
  ], `${packageUrl}#breadcrumb`)

  const faqs = packageData.FAQ_Items && packageData.FAQ_Items.length > 0 ? packageData.FAQ_Items : DEFAULT_FAQ_ITEMS
  const faqSchema = generateFAQSchema(faqs)

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
