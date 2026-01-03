import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Explore Destinations | Travelzada - Travel Packages Worldwide',
    description: 'Discover amazing travel destinations worldwide. Browse Bali, Thailand, Maldives, Europe and more. Find curated travel packages and itineraries.',
    alternates: {
        canonical: '/destinations',
    },
    openGraph: {
        title: 'Explore Destinations | Travelzada',
        description: 'Discover amazing travel destinations worldwide with curated packages.',
        type: 'website',
    },
}

export default function DestinationsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
