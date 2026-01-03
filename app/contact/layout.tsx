import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Contact Us | Travelzada - Get in Touch',
    description: 'Have questions about your trip? Contact Travelzada for booking inquiries, customer support, and travel planning assistance. We respond within 24 hours.',
    alternates: {
        canonical: '/contact',
    },
    openGraph: {
        title: 'Contact Us | Travelzada',
        description: 'Get in touch with Travelzada for booking inquiries and support.',
        type: 'website',
    },
}

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
