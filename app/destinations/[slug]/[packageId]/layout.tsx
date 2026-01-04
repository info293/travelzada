import { Metadata } from 'next'

interface LayoutProps {
    children: React.ReactNode
    params: { slug: string; packageId: string }
}

export async function generateMetadata({ params }: { params: { slug: string; packageId: string } }): Promise<Metadata> {
    const destination = decodeURIComponent(params.slug)
    const packageId = decodeURIComponent(params.packageId)
    const destName = destination.charAt(0).toUpperCase() + destination.slice(1).replace(/-/g, ' ')
    const packageName = packageId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

    return {
        title: `${packageName} | ${destName} - Travelzada`,
        description: `Book ${packageName} in ${destName}. Includes accommodation, transfers, and curated experiences. Plan your perfect trip with Travelzada.`,
        alternates: {
            canonical: `/destinations/${destination}/${packageId}`,
        },
        openGraph: {
            title: `${packageName} | ${destName} Package`,
            description: `Book ${packageName} package in ${destName} with Travelzada.`,
            type: 'website',
        },
    }
}

export default function PackageDetailLayout({ children }: LayoutProps) {
    return children
}
