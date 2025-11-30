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
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://www.travelzada.com'

    // 1. Static Routes
    const staticRoutes = [
        '',
        '/about-us',
        '/contact',
        '/blog',
        '/destinations',
        '/careers',
        '/reviews',
        '/story',
        '/press',
        '/ai-planner',
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

            // Strategy 1: Direct match by Destination_ID (if it matches a destination doc ID)
            if (destinationMap.has(data.Destination_ID)) {
                destinationSlug = destinationMap.get(data.Destination_ID)!
            }
            // Strategy 2: Match by Destination_Name
            else if ((data as any).Destination_Name && destinationMap.has((data as any).Destination_Name.toLowerCase())) {
                destinationSlug = destinationMap.get((data as any).Destination_Name.toLowerCase())!
            }
            // Strategy 3: Try to extract from Destination_ID (e.g., DEST_BALI_002 -> bali)
            else {
                const parts = data.Destination_ID.split('_')
                if (parts.length >= 2) {
                    // Try matching the middle part (e.g., BALI)
                    const potentialName = parts[1].toLowerCase()
                    if (destinationMap.has(potentialName)) {
                        destinationSlug = destinationMap.get(potentialName)!
                    }
                }
            }

            if (destinationSlug === 'unknown') {
                console.warn(`Sitemap: Package ${doc.id} (DestID: ${data.Destination_ID}) could not be linked to a destination.`)
            }

            return {
                url: `${baseUrl}/destinations/${destinationSlug}/${doc.id}`,
                lastModified: data.Last_Updated ? new Date(data.Last_Updated) : new Date(),
                changeFrequency: 'weekly' as const,
                priority: 1.0, // Highest priority for packages
            }
        }).filter(route => !route.url.includes('/unknown/')) // Filter out packages with missing destinations

    } catch (error) {
        console.error('Error generating sitemap:', error)
    }

    return [...staticRoutes, ...destinationRoutes, ...packageRoutes, ...blogRoutes]
}
