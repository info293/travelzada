import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SchemaMarkup, { generateWebSiteSchema, generateFAQSchema, generateBreadcrumbSchema, generateWebPageSchema } from '@/components/SchemaMarkup'
import { faqs } from '@/data/faqs'
import DestinationSlugCacheInitializer from '@/components/DestinationSlugCacheInitializer'
import TravelzadaHomePage from '@/components/homepage/TravelzadaHomePage'
import { fetchHomepageData } from '@/lib/homepageData'

export const revalidate = 60

export default async function Home() {
  const homepageData = await fetchHomepageData()

  const websiteSchema = generateWebSiteSchema()
  const faqSchema = generateFAQSchema(faqs)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' }
  ])
  const webPageSchema = generateWebPageSchema({
    name: 'Travelzada — Journeys designed only for two',
    description: 'Honeymoons, proposals, anniversaries and quiet escapes — planned by a real travel designer for two.',
    url: 'https://www.travelzada.com',
    websiteUrl: 'https://www.travelzada.com',
  })

  return (
    <>
      <SchemaMarkup schema={websiteSchema} id="website-schema" />
      <SchemaMarkup schema={faqSchema} id="faq-schema" />
      <SchemaMarkup schema={breadcrumbSchema} id="breadcrumb-schema-home" />
      <SchemaMarkup schema={webPageSchema} id="webpage-schema" />
      <DestinationSlugCacheInitializer />
      <Header />
      <main className="min-h-screen bg-[#F6F1E6] overflow-x-hidden">
        <TravelzadaHomePage initialData={homepageData} />
      </main>
      <Footer />
    </>
  )
}


