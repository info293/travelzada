import { MetadataRoute } from 'next'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Define interfaces for data we need
interface BlogPost {
    id: string
    slug?: string
    title: string
    category?: string
    updatedAt?: string
    date?: string
}

interface Destination {
    id: string
    slug: string
    updatedAt?: string
}

interface DestinationPackage {
    id: string
    Destination_ID: string
    Last_Updated?: string
    Slug?: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://www.travelzada.com'

    // 1. Static Routes
    const staticRoutes = [
        '',
        '/about',
        '/contact',
        '/blog',
        '/destinations',
        '/careers',
        '/reviews',
        '/our-story',
        '/press',
        '/ai-trip-planner',
        '/case-study',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: route === '' ? 1 : 0.8,
    }))

    // 2. Fetch Data
    let blogRoutes: MetadataRoute.Sitemap = []
    let destinationRoutes: MetadataRoute.Sitemap = []
    let packageRoutes: MetadataRoute.Sitemap = []

    try {
        // Fetch Blogs
        const blogsQuery = query(collection(db, 'blogs'), where('published', '==', true))
        const blogsSnapshot = await getDocs(blogsQuery)

        blogRoutes = blogsSnapshot.docs.map((doc) => {
            const data = doc.data() as BlogPost
            const category = data.category
                ? data.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                : 'general'
            const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

            return {
                url: `${baseUrl}/blog/${category}/${slug}`,
                lastModified: data.updatedAt ? new Date(data.updatedAt) : (data.date ? new Date(data.date) : new Date()),
                changeFrequency: 'weekly' as const,
                priority: 0.9, // High priority for blogs
            }
        })

        // Fetch Destinations
        const destinationsSnapshot = await getDocs(collection(db, 'destinations'))
        const destinationMap = new Map<string, string>() // Key -> Slug

        console.log(`Sitemap: Found ${destinationsSnapshot.size} destinations`)

        destinationRoutes = destinationsSnapshot.docs.map((doc) => {
            const data = doc.data() as Destination
            const slug = data.slug || doc.id

            // Map multiple keys to the same slug for robust matching
            destinationMap.set(doc.id, slug) // Match by Firestore ID
            if (data.slug) destinationMap.set(data.slug.toLowerCase(), slug) // Match by slug
            // We don't have 'name' in the interface defined above, but it exists in Firestore
            const destName = (data as any).name
            if (destName) destinationMap.set(destName.toLowerCase(), slug) // Match by name

            // Map packages from this destination to the slug directly using packageIds!
            const packageIds = (data as any).packageIds
            if (Array.isArray(packageIds)) {
                packageIds.forEach((pkgId: string) => {
                    destinationMap.set(pkgId, slug)
                })
            }

            console.log(`Sitemap: Destination ${doc.id} (${destName}) -> ${slug}`)

            return {
                url: `${baseUrl}/destinations/${slug}`,
                lastModified: data.updatedAt ? new Date(data.updatedAt) : new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            }
        })

        // Fetch Packages
        const packagesSnapshot = await getDocs(collection(db, 'packages'))
        console.log(`Sitemap: Found ${packagesSnapshot.size} packages`)

        packageRoutes = packagesSnapshot.docs.map((doc) => {
            const data = doc.data() as DestinationPackage
            let destinationSlug = 'unknown'

            // STRATEGY 0: Direct match by Package ID - This matches the package to its
            // exact parent Destination where this packageId resides in `.packageIds`
            if (destinationMap.has(doc.id)) {
                destinationSlug = destinationMap.get(doc.id)!
            }
            // Strategy 1: Direct match by Destination_ID (if it matches a destination doc ID)
            else if (destinationMap.has(data.Destination_ID)) {
                destinationSlug = destinationMap.get(data.Destination_ID)!
            }
            // Strategy 2: Match by Destination_Name
            else if ((data as any).Destination_Name && destinationMap.has((data as any).Destination_Name.toLowerCase())) {
                destinationSlug = destinationMap.get((data as any).Destination_Name.toLowerCase())!
            }
            // Strategy 3: Try to extract from Destination_ID (e.g., BAL_005 -> bali)
            else {
                const parts = data.Destination_ID.split('_')
                if (parts.length >= 2) {
                    const prefix = parts[0].toUpperCase()

                    // Manual Fallback Map for common codes to match typical destination slugs
                    const prefixMap: Record<string, string> = {
                        'BAL': 'bali-packages',
                        'KER': 'kerala',
                        'GOA': 'goa',
                        'KASH': 'kashmir',
                        'RAJ': 'rajasthan',
                        'THAI': 'thailand',
                        'VIET': 'vietnam',
                        'DUBAI': 'dubai',
                        'MAL': 'maldives',
                        'EUR': 'europe',
                        'LAD': 'ladakh',
                        'AND': 'andaman'
                    }

                    if (prefixMap[prefix]) {
                        destinationSlug = prefixMap[prefix]
                    } else {
                        // Try matching the prefix against names if not in map
                        const potentialName = prefix.toLowerCase()
                        if (destinationMap.has(potentialName)) {
                            destinationSlug = destinationMap.get(potentialName)!
                        } else if (destinationMap.has(`${potentialName}-packages`)) {
                            destinationSlug = destinationMap.get(`${potentialName}-packages`)!
                        }
                    }
                }
            }

            // FIX: If destinationSlug is STILL unknown, generate a slug from the package data itself instead of dropping it
            // This mirrors how the frontend gracefully handles missing destination documents
            if (destinationSlug === 'unknown') {
                if ((data as any).Destination_Name) {
                    // Convert "Singapore" to "singapore-packages"
                    const baseName = (data as any).Destination_Name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    destinationSlug = `${baseName}-packages`;
                } else if (data.Destination_ID) {
                    const prefix = data.Destination_ID.split('_')[0].toLowerCase();
                    destinationSlug = `${prefix}-packages`;
                } else {
                    destinationSlug = 'general-packages'; // Ultimate fallback
                }
                console.warn(`Sitemap: Package ${doc.id} (DestID: ${data.Destination_ID}) could not be linked strictly to a destination doc. Generated fallback slug: ${destinationSlug}`)
            }

            // Use the package's custom Slug if available, otherwise fallback to ID
            const packageSlug = (data.Slug && data.Slug.trim()) ? data.Slug.trim() : doc.id

            return {
                url: `${baseUrl}/destinations/${destinationSlug}/${packageSlug}`,
                lastModified: data.Last_Updated ? new Date(data.Last_Updated) : new Date(),
                changeFrequency: 'weekly' as const,
                priority: 1.0,
            }
        })

    } catch (error) {
        console.error('Error generating sitemap:', error)
    }

    return [...staticRoutes, ...destinationRoutes, ...packageRoutes, ...blogRoutes]
}
