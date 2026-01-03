import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Customer Reviews | Travelzada - Traveler Testimonials',
    description: 'Read authentic reviews from travelers who used Travelzada. See ratings, testimonials, and experiences from real customers planning their perfect trips.',
    alternates: {
        canonical: '/reviews',
    },
    openGraph: {
        title: 'Customer Reviews | Travelzada',
        description: 'Authentic reviews from travelers who used Travelzada.',
        type: 'website',
    },
}

export default function ReviewsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
