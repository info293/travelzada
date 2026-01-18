'use client'

import { useState } from 'react'
import Link from 'next/link'

interface BlogPost {
    id?: string
    title: string
    subtitle?: string
    description: string
    image: string
    author: string
    date: string
    category?: string
    readTime?: string
    slug?: string
}

interface BlogInteractiveProps {
    currentUrl: string
    postTitle: string
    relatedPosts: BlogPost[]
}

export function ShareButtons({ currentUrl, postTitle }: { currentUrl: string; postTitle: string }) {
    return (
        <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-4">Share this article</p>
            <div className="flex gap-3">
                <a
                    href={currentUrl ? `https://wa.me/?text=${encodeURIComponent(currentUrl)}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                </a>
                <a
                    href={currentUrl ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(postTitle)}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                </a>
                <a
                    href={currentUrl ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-[#0077B5] hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                </a>
                <button
                    onClick={() => {
                        if (currentUrl && typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(currentUrl)
                            alert('Link copied to clipboard!')
                        }
                    }}
                    className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

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

                <form onSubmit={handleSubscribe} className="max-w-md mx-auto space-y-4">
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

export function RelatedPosts({ relatedPosts }: { relatedPosts: BlogPost[] }) {
    if (relatedPosts.length === 0) return null

    return (
        <div className="mt-16">
            <h4 className="text-2xl font-bold text-gray-900 mb-8 text-center">Related Articles</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => {
                    const relatedSlug = relatedPost.slug || relatedPost.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    const relatedCategory = relatedPost.category ? relatedPost.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'general'
                    return (
                        <Link
                            key={relatedPost.id}
                            href={`/blog/${relatedCategory}/${relatedSlug}`}
                            className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                        >
                            <div className="aspect-video relative overflow-hidden">
                                <img
                                    src={relatedPost.image}
                                    alt={relatedPost.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80'
                                    }}
                                />
                            </div>
                            <div className="p-4">
                                {relatedPost.category && (
                                    <span className="text-xs uppercase tracking-wide text-primary font-semibold">
                                        {relatedPost.category}
                                    </span>
                                )}
                                <h5 className="font-bold text-gray-900 mt-2 mb-1 line-clamp-2 hover:text-primary transition-colors">
                                    {relatedPost.title}
                                </h5>
                                <p className="text-sm text-gray-600 line-clamp-2">{relatedPost.description}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                                    <span>{relatedPost.date}</span>
                                    {relatedPost.readTime && (
                                        <>
                                            <span>•</span>
                                            <span>{relatedPost.readTime}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
