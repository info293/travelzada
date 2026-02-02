'use client'

import { useEffect, useRef } from 'react'
import { doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function ViewCounter({ postId }: { postId: string }) {
    const hasIncremented = useRef(false)

    useEffect(() => {
        if (!postId || !db || hasIncremented.current) return

        const incrementView = async () => {
            try {
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
