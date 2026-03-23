import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | Travelzada - Get in Touch',
  description: 'Have questions about your trip? Contact Travelzada for booking inquiries, customer support, and travel planning assistance. We respond within 24 hours.',
  openGraph: {
    type: 'website',
    url: 'https://www.travelzada.com/contact',
    title: 'Contact Us | Travelzada - Get in Touch',
    description: 'Have questions about your trip? Contact Travelzada for booking inquiries, customer support, and travel planning assistance. We respond within 24 hours.',
    images: [{ url: 'https://www.travelzada.com/images/og-homepage.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | Travelzada - Get in Touch',
    description: 'Have questions about your trip? Contact Travelzada for booking inquiries, customer support, and travel planning assistance. We respond within 24 hours.',
    images: ['https://www.travelzada.com/images/og-homepage.jpg'],
  }
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
