'use client'

import { useEffect, useRef } from 'react'

export function ViewCounter({ postId }: { postId: string }) {
    const hasIncremented = useRef(false)

    useEffect(() => {
        if (!postId || hasIncremented.current) return

        // Dynamic import to prevent SSR bailout - only runs on client
        const incrementView = async () => {
            try {
                const { doc, updateDoc, increment } = await import('firebase/firestore')
                const { db } = await import('@/lib/firebase')

                if (!db) return

                const docRef = doc(db, 'blogs', postId)
                await updateDoc(docRef, { views: increment(1) })
                hasIncremented.current = true
            } catch (error) {
                // Silently fail
                console.warn('Failed to increment view count:', error)
            }
        }

        incrementView()
    }, [postId])

    return null
}

