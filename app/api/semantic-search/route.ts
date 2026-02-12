import { NextRequest, NextResponse } from 'next/server'
import { searchSimilarPackages } from '@/lib/pinecone'

export const dynamic = 'force-dynamic'

/**
 * POST /api/semantic-search
 * 
 * Search for travel packages using semantic similarity.
 * 
 * Request body:
 * {
 *   "query": "romantic beach getaway for couples",
 *   "topK": 5,  // optional, default 5
 *   "filter": { "travelType": "couple" }  // optional metadata filter
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "results": [
 *     {
 *       "packageId": "...",
 *       "destinationName": "Goa Beach Honeymoon",
 *       "score": 0.95,
 *       ...
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { query, topK = 5, filter } = body

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Query is required and must be a string' },
                { status: 400 }
            )
        }

        // Perform semantic search
        const results = await searchSimilarPackages(query, topK, filter)

        return NextResponse.json({
            success: true,
            query,
            count: results.length,
            results,
        })
    } catch (error: any) {
        console.error('Semantic search error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Search failed' },
            { status: 500 }
        )
    }
}
