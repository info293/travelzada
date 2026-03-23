import { Metadata } from 'next'

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
  return children
}
