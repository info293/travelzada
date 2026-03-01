import { Metadata } from 'next'
import SourceDestinationClient from './SourceDestinationClient'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import travelDatabase from '@/data/travel-database.json'

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
        alternates: {
            canonical: `/destinations/${destination}/tours/${routeSlug}`,
        },
        openGraph: {
            title: `${destName} Packages from ${originName}`,
            description: `Plan your perfect trip to ${destName} from ${originName} with Travelzada.`,
        }
    }
}

export default async function SourceDestinationPage({ params }: PageProps) {
    const destinationSlug = decodeURIComponent(params.slug)
    const normalizedDestination = destinationSlug.toLowerCase()
    let foundDestination: any = null

    try {
        const destinationsRef = collection(db, 'destinations')
        const destinationsSnapshot = await getDocs(destinationsRef)

        destinationsSnapshot.forEach((doc) => {
            const data = doc.data()
            const destSlug = data.slug?.toLowerCase() || ''
            const destName = data.name?.toLowerCase() || ''

            if (destSlug === normalizedDestination ||
                destName === normalizedDestination ||
                destSlug.includes(normalizedDestination) ||
                normalizedDestination.includes(destSlug)) {
                foundDestination = { id: doc.id, ...data }
            }
        })
    } catch (e) {
        console.error('Error fetching destination in SSR:', e)
    }

    if (!foundDestination) {
        const travelData = travelDatabase as any
        foundDestination = travelData.destinations?.find(
            (d: any) => d.name.toLowerCase() === destinationSlug.toLowerCase() ||
                d.name.toLowerCase().replace(/\s+/g, '-') === destinationSlug.toLowerCase()
        )
    }

    const packagesData: any[] = []

    if (foundDestination) {
        try {
            const packagesRef = collection(db, 'packages')
            const allPackagesSnapshot = await getDocs(packagesRef)
            const linkedPackageIds = foundDestination.packageIds || []
            const hasLinkedPackages = Array.isArray(linkedPackageIds) && linkedPackageIds.length > 0

            allPackagesSnapshot.forEach((doc) => {
                const data = doc.data() as any
                const pkgId = data.Destination_ID || ''
                let shouldInclude = false

                if (hasLinkedPackages) {
                    shouldInclude = linkedPackageIds.includes(pkgId)
                } else {
                    const pkgName = data.Destination_Name?.toLowerCase() || ''
                    const normalizedPkgId = pkgId.toLowerCase()
                    shouldInclude = pkgName.includes(normalizedDestination) ||
                        normalizedDestination.includes(pkgName) ||
                        pkgName === normalizedDestination ||
                        normalizedPkgId.includes(normalizedDestination) ||
                        normalizedDestination.includes(normalizedPkgId)
                }

                if (shouldInclude) {
                    packagesData.push({ id: doc.id, ...data })
                }
            })
        } catch (e) {
            console.error('Error fetching packages in SSR:', e)
        }
    }

    return <SourceDestinationClient params={params} initialDestination={foundDestination} initialPackages={packagesData} />
}

