import { Pinecone } from '@pinecone-database/pinecone'
import { generateEmbedding } from './embeddings'

// Initialize Pinecone client
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
})

const INDEX_NAME = process.env.PINECONE_INDEX || 'travelzada-packages'

/**
 * Get the Pinecone index for travel packages
 */
export function getIndex() {
    return pinecone.index(INDEX_NAME)
}

/**
 * Package metadata stored in Pinecone
 */
interface PackageMetadata {
    packageId: string
    destinationName: string
    destinationId?: string
    duration?: string
    priceRange?: string
    starCategory?: string
    travelType?: string
    primaryImage?: string
    overview?: string
}

/**
 * Upsert a single package to Pinecone
 */
export async function upsertPackage(pkg: any, embedding: number[]) {
    const index = getIndex()

    const metadata: PackageMetadata = {
        packageId: pkg.id || pkg.Destination_ID || '',
        destinationName: pkg.Destination_Name || '',
        destinationId: pkg.Destination_ID || '',
        duration: pkg.Duration || '',
        priceRange: pkg.Price_Range_INR || '',
        starCategory: pkg.Star_Category || '',
        travelType: pkg.Travel_Type || '',
        primaryImage: pkg.Primary_Image_URL || '',
        overview: (pkg.Overview || '').slice(0, 500),
    }

    await index.upsert({
        records: [
            {
                id: metadata.packageId,
                values: embedding,
                metadata: metadata as Record<string, any>,
            },
        ]
    })
}

/**
 * Upsert multiple packages to Pinecone in batches
 */
export async function upsertPackages(
    packages: Array<{ pkg: any; embedding: number[] }>
) {
    const index = getIndex()
    const batchSize = 100

    if (!packages || packages.length === 0) {
        console.warn('⚠️ No packages provided to upsertPackages')
        return
    }

    console.log(`📦 Upserting ${packages.length} packages to Pinecone...`)

    for (let i = 0; i < packages.length; i += batchSize) {
        const batch = packages.slice(i, i + batchSize)

        if (batch.length === 0) continue

        const vectors = batch
            .filter(({ embedding }) => embedding && embedding.length > 0)
            .map(({ pkg, embedding }, idx) => ({
                id: pkg.id || pkg.Destination_ID || `pkg-${i + idx}`,
                values: embedding,
                metadata: {
                    packageId: pkg.id || pkg.Destination_ID || '',
                    destinationName: pkg.Destination_Name || '',
                    destinationId: pkg.Destination_ID || '',
                    duration: pkg.Duration || '',
                    priceRange: pkg.Price_Range_INR || '',
                    starCategory: pkg.Star_Category || '',
                    travelType: pkg.Travel_Type || '',
                    primaryImage: pkg.Primary_Image_URL || '',
                    overview: (pkg.Overview || '').slice(0, 500),
                } as Record<string, any>,
            }))

        if (vectors.length === 0) {
            console.warn(`⚠️ Skipped batch ${i} - no valid vectors`)
            continue
        }

        try {
            console.log(`Uploading batch ${i + 1}-${i + vectors.length}...`)
            // Using object format { records: vectors } as per error feedback (lint error "Property 'records' is missing" and runtime error "Must pass in at least 1 record")
            await index.upsert({ records: vectors })
        } catch (error) {
            console.error(`❌ Error upserting batch starting at ${i}:`, error)
            throw error // Re-throw to stop process or handle as needed
        }
    }
}

/**
 * Search for similar packages using semantic search
 */
export async function searchSimilarPackages(
    query: string,
    topK: number = 5,
    filter?: Record<string, any>
): Promise<Array<PackageMetadata & { score: number }>> {
    const index = getIndex()

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query)

    // Search Pinecone
    const results = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
    })

    // Transform results
    return (
        results.matches?.map((match) => ({
            packageId: (match.metadata?.packageId as string) || '',
            destinationName: (match.metadata?.destinationName as string) || '',
            destinationId: (match.metadata?.destinationId as string) || '',
            duration: (match.metadata?.duration as string) || '',
            priceRange: (match.metadata?.priceRange as string) || '',
            starCategory: (match.metadata?.starCategory as string) || '',
            travelType: (match.metadata?.travelType as string) || '',
            primaryImage: (match.metadata?.primaryImage as string) || '',
            overview: (match.metadata?.overview as string) || '',
            score: match.score || 0,
        })) || []
    )
}

/**
 * Delete all vectors from the index (for re-indexing)
 */
export async function deleteAllVectors() {
    const index = getIndex()
    await index.deleteAll()
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
    const index = getIndex()
    return await index.describeIndexStats()
}
