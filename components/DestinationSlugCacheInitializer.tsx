'use client'

import { useEffect } from 'react'
import { initializeDestinationSlugCache } from '@/lib/destinationSlugMapper'

/**
 * Client component that initializes the destination slug cache on mount
 * This ensures all package links use correct destination slugs from Firestore
 */
export default function DestinationSlugCacheInitializer() {
    useEffect(() => {
        // Initialize the cache when the app loads
        initializeDestinationSlugCache().catch((error) => {
            console.error('Failed to initialize destination slug cache:', error)
        })
    }, [])

    // This component doesn't render anything
    return null
}
