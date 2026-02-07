'use client'

import { useState } from 'react'
// Imports moved dynamically for SSR safety

export function NewsletterSubscription() {
    const [email, setEmail] = useState('')
    const [subscribing, setSubscribing] = useState(false)
    const [subscribeMessage, setSubscribeMessage] = useState('')

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault()
        const emailValue = email.trim().toLowerCase()

        if (!emailValue) {
            setSubscribeMessage('Please enter a valid email address.')
            return
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(emailValue)) {
            setSubscribeMessage('Please enter a valid email address.')
            return
        }

        try {
            setSubscribing(true)
            setSubscribeMessage('')

            // Dynamic imports to prevent SSR bailout
            const { addDoc, collection, getDocs, query, serverTimestamp, where } = await import('firebase/firestore')
            const { db } = await import('@/lib/firebase')

            if (typeof window === 'undefined' || !db) {
                setSubscribeMessage('Unable to subscribe. Please try again later.')
                return
            }

            // Check if email already exists
            const subscribersRef = collection(db, 'newsletter_subscribers')
            const existingQuery = query(subscribersRef, where('email', '==', emailValue))
            const existingSnapshot = await getDocs(existingQuery)

            if (!existingSnapshot.empty) {
                setSubscribeMessage('This email is already subscribed!')
                setEmail('')
                return
            }

            // Add email to Firestore
            await addDoc(subscribersRef, {
                email: emailValue,
                subscribedAt: serverTimestamp(),
                status: 'active',
                source: 'blog_page',
            })

            setSubscribeMessage('Thank you for subscribing!')
            setEmail('')

            // Clear message after 3 seconds
            setTimeout(() => {
                setSubscribeMessage('')
            }, 3000)
        } catch (error) {
            console.error('Error subscribing:', error)
            setSubscribeMessage('Something went wrong. Please try again later.')
        } finally {
            setSubscribing(false)
        }
    }

    return (
        <form onSubmit={handleSubscribe} className="space-y-3">
            <input
                type="email"
                value={email}
                onChange={(e) => {
                    setEmail(e.target.value)
                    setSubscribeMessage('')
                }}
                placeholder="Type your email..."
                disabled={subscribing}
                className="w-full px-4 py-2.5 border border-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
            />
            <button
                type="submit"
                disabled={subscribing}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {subscribing ? 'Subscribing...' : 'Subscribe'}
            </button>
            {subscribeMessage && (
                <p className={`text-xs text-center ${subscribeMessage.includes('Thank you')
                    ? 'text-green-600'
                    : 'text-red-600'
                    }`}>
                    {subscribeMessage}
                </p>
            )}
        </form>
    )
}
