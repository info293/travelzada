import { Metadata } from 'next'
import SourceDestinationClient from './SourceDestinationClient'

interface PageProps {
    params: { slug: string; routeSlug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = params
    const destination = decodeURIComponent(resolvedParams.slug)
    const destName = destination.charAt(0).toUpperCase() + destination.slice(1)

    const routeSlug = decodeURIComponent(resolvedParams.routeSlug)
    let originName = 'India'
    if (routeSlug.startsWith('from-')) {
        originName = routeSlug.replace('from-', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }

    return {
        title: `${destName} Packages from ${originName} - Best Deals & Itineraries | Travelzada`,
        description: `Book the best ${destName} tour packages from ${originName} with flights. All-inclusive ${destName} trips customizable for couples and families from ${originName}.`,
        keywords: [`${destName} packages from ${originName}`, `${destName} tour from ${originName}`, `trip to ${destName} from ${originName}`],
        openGraph: {
            title: `${destName} Packages from ${originName}`,
            description: `Plan your perfect trip to ${destName} from ${originName} with Travelzada.`,
        }
    }
}

export default function SourceDestinationPage({ params }: PageProps) {
    return <SourceDestinationClient params={params} />
}
