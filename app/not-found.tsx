'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function NotFound() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const popularLinks = [
        { href: '/', label: 'Home', icon: '🏠' },
        { href: '/ai-trip-planner', label: 'AI Trip Planner', icon: '✨' },
        { href: '/destinations', label: 'Destinations', icon: '🌍' },
        { href: '/blog', label: 'Travel Blog', icon: '📝' },
        { href: '/contact', label: 'Contact Us', icon: '💬' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full text-center">
                {/* Animated 404 */}
                <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
                    <h1 className="text-[120px] md:text-[180px] font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent leading-none mb-4">
                        404
                    </h1>
                </div>

                {/* Message */}
                <div className={`transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <h2 className="text-2xl md:text-4xl font-bold text-gray-800 mb-4">
                        Oops! Page Not Found
                    </h2>
                    <p className="text-base md:text-lg text-gray-600 mb-8 max-w-md mx-auto">
                        The page you're looking for seems to have wandered off on its own adventure.
                        Let's get you back on track!
                    </p>
                </div>

                {/* Popular Links */}
                <div className={`transition-all duration-1000 delay-400 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-6 md:p-8 mb-8">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Try these popular pages:
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {popularLinks.map((link, index) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 transition-all duration-300 hover:shadow-md hover:scale-105"
                                    style={{
                                        transitionDelay: `${index * 50}ms`
                                    }}
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform">
                                        {link.icon}
                                    </span>
                                    <span className="font-medium text-gray-700 group-hover:text-purple-700">
                                        {link.label}
                                    </span>
                                    <span className="ml-auto text-purple-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all">
                                        →
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Help Section */}
                <div className={`transition-all duration-1000 delay-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
                        <p>Need help planning your trip?</p>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105"
                        >
                            Contact Our Team
                            <span className="text-lg">💌</span>
                        </Link>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-10 left-10 w-20 h-20 bg-purple-200 rounded-full blur-3xl opacity-50 animate-pulse" />
                <div className="absolute bottom-10 right-10 w-32 h-32 bg-indigo-200 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
        </div>
    )
}
