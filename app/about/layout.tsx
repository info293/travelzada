import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Travelzada',
  description: 'Learn about Travelzada, our AI-powered travel planning, and our commitment to creating the perfect romantic getaways and honeymoon packages.',
  openGraph: {
    type: 'website',
    url: 'https://www.travelzada.com/about',
    title: 'About Us | Travelzada',
    description: 'Learn about Travelzada, our AI-powered travel planning, and our commitment to creating the perfect romantic getaways and honeymoon packages.',
    images: [{ url: 'https://www.travelzada.com/images/og-homepage.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | Travelzada',
    description: 'Learn about Travelzada, our AI-powered travel planning, and our commitment to creating the perfect romantic getaways and honeymoon packages.',
    images: ['https://www.travelzada.com/images/og-homepage.jpg'],
  }
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
