import { Metadata } from 'next'
import SchemaMarkup, { generateWebPageSchema, generateBreadcrumbSchema } from '@/components/SchemaMarkup'

export const metadata: Metadata = {
  title: 'Customer Reviews | Travelzada',
  description: 'Read exactly what travelers are saying about Travelzada. Curated trips matching your exact vibe.',
  openGraph: {
    type: 'website',
    url: 'https://www.travelzada.com/reviews',
    title: 'Customer Reviews | Travelzada',
    description: 'Read exactly what travelers are saying about Travelzada. Curated trips matching your exact vibe.',
    images: [{ url: 'https://www.travelzada.com/images/og-homepage.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Customer Reviews | Travelzada',
    description: 'Read exactly what travelers are saying about Travelzada. Curated trips matching your exact vibe.',
    images: ['https://www.travelzada.com/images/og-homepage.jpg'],
  }
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  const webPageSchema = generateWebPageSchema({
    name: 'Customer Reviews | Travelzada',
    description: 'Read exactly what travelers are saying about Travelzada. Curated trips matching your exact vibe.',
    url: 'https://www.travelzada.com/reviews',
    websiteUrl: 'https://www.travelzada.com',
  })
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' },
    { name: 'Reviews', url: 'https://www.travelzada.com/reviews' },
  ])

  return (
    <>
      <SchemaMarkup schema={webPageSchema} id="webpage-schema" />
      <SchemaMarkup schema={breadcrumbSchema} id="breadcrumb-schema-reviews" />
      {children}
    </>
  )
}
