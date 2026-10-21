import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DestinationsClient from './DestinationsClient'
import SchemaMarkup, {
  generateBreadcrumbSchema,
  generateItemListSchema,
  generateWebPageSchema,
} from '@/components/SchemaMarkup'
import { fetchHomepageData } from '@/lib/homepageData'

export const metadata: Metadata = {
  title: 'Destinations & Packages | Travelzada — Curated for Couples',
  description:
    'Explore handpicked romantic destinations across India and internationally. Verified 4★ & 5★ stays, 100% itemised pricing, 24×7 concierge.',
  alternates: { canonical: 'https://www.travelzada.com/destinations' },
  openGraph: {
    title: 'Destinations & Packages | Travelzada',
    description: 'Explore handpicked romantic destinations across India and internationally.',
    url: 'https://www.travelzada.com/destinations',
    type: 'website',
    images: [{ url: 'https://www.travelzada.com/images/og-homepage.jpg' }],
  },
  robots: { index: true, follow: true },
}

export default async function DestinationsPage() {
  const data = await fetchHomepageData()

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
    (data.sections || []).map((d) => ({
      name: d.name,
      url: `https://www.travelzada.com/destinations/${d.slug}`,
    }))
  )

  return (
    <main className="min-h-screen bg-[#F5F2F5]">
      <SchemaMarkup schema={breadcrumbSchema} id="breadcrumbs" />
      <SchemaMarkup schema={itemListSchema} id="item-list" />
      <SchemaMarkup schema={webPageSchema} id="webpage-schema" />
      <Header />
      <DestinationsClient initialData={data} />
      <Footer />
    </main>
  )
}
