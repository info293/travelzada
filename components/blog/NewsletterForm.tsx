'use client'

import { useState } from 'react'

export function NewsletterForm() {
    const [email, setEmail] = useState('')

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault()
        if (email.trim()) {
            alert('Thank you for subscribing!')
            setEmail('')
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto mt-8">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-10 text-center">
                <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Travelzada&apos;s Newsletter</h3>
                        <p className="text-gray-600">Curated curiosities delivered to your inbox.</p>
                    </div>
                </div>
                <form onSubmit={handleSubscribe} className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Type your email..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button
                        type="submit"
                        className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                    >
                        Subscribe
                    </button>
                </form>
            </div>
        </div>
    )
}
