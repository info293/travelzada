import { Metadata } from 'next'

interface LayoutProps {
    children: React.ReactNode
    params: { slug: string }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const destination = decodeURIComponent(params.slug)
    const destName = destination.charAt(0).toUpperCase() + destination.slice(1).replace(/-/g, ' ')

    return {
        title: `${destName} Packages | Travelzada - Best Travel Deals`,
        description: `Explore the best ${destName} travel packages with Travelzada. Find curated itineraries, hotels, and experiences for your perfect trip.`,
        alternates: {
            canonical: `/destinations/${destination}`,
        },
        openGraph: {
            title: `${destName} Packages | Travelzada`,
            description: `Explore the best ${destName} travel packages with Travelzada.`,
            type: 'website',
        },
    }
}

export default function DestinationDetailLayout({ children }: LayoutProps) {
    return children
}
