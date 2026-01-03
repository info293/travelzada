import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Careers at Travelzada | Join Our Team',
    description: 'Join the Travelzada team! Explore exciting career opportunities in travel planning, AI/ML engineering, customer success, and more. Work remotely, travel benefits included.',
    alternates: {
        canonical: '/careers',
    },
    openGraph: {
        title: 'Careers at Travelzada',
        description: 'Explore exciting career opportunities at Travelzada.',
        type: 'website',
    },
}

export default function CareersLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
