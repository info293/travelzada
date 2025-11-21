'use client'

import { use, useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface BlogPost {
  id?: string
  title: string
  subtitle?: string
  description: string
  content: string
  image: string
  author: string
  authorImage?: string
  date: string
  category?: string
  readTime?: string
  likes?: number
  comments?: number
  shares?: number
}

// Fallback hardcoded posts (for backward compatibility)
const blogPosts = [
  {
    id: 1,
    title: '10 Tips for Your First Solo Trip',
    description: 'Embark on your solo adventure with confidence. Here\'s what you need to know to make your first solo trip unforgettable.',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80',
    author: 'Sarah Johnson',
    authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    date: 'March 15, 2024',
    category: 'Travel Tips',
    readTime: '5 min read',
    content: `Traveling solo can be one of the most rewarding experiences. It teaches you independence, helps you discover yourself, and allows you to travel at your own pace. In this comprehensive guide, we'll cover everything from safety tips to making friends on the road.`,
  },
]

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default function BlogPostPage({ params }: PageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params
  const postId = resolvedParams.id
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const [email, setEmail] = useState('')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  useEffect(() => {
    const fetchBlogPost = async () => {
      if (typeof window === 'undefined' || !db) {
        // Fallback to hardcoded posts if Firestore is not available
        const numericId = parseInt(postId)
        if (!isNaN(numericId)) {
          const foundPost = blogPosts.find(p => p.id === numericId)
          if (foundPost) {
            setPost(foundPost)
            setLoading(false)
            return
          }
        }
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Try to fetch from Firestore using the document ID
        const docRef = doc(db, 'blogs', postId)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data() as BlogPost
          setPost({ id: docSnap.id, ...data })
          
          // Fetch related posts (same category)
          if (data.category) {
            const relatedQuery = query(
              collection(db, 'blogs'),
              where('published', '==', true),
              where('category', '==', data.category),
              limit(3)
            )
            try {
              const relatedSnapshot = await getDocs(relatedQuery)
              const related: BlogPost[] = []
              relatedSnapshot.forEach((doc) => {
                const relatedData = doc.data() as BlogPost
                if (doc.id !== postId) {
                  related.push({ id: doc.id, ...relatedData })
                }
              })
              setRelatedPosts(related)
            } catch (err) {
              console.log('Could not fetch related posts:', err)
            }
          }
          
          setLoading(false)
          return
        }
        
        // If not found in Firestore, try fallback to hardcoded posts
        const numericId = parseInt(postId)
        if (!isNaN(numericId)) {
          const foundPost = blogPosts.find(p => p.id === numericId)
          if (foundPost) {
            setPost(foundPost)
            setLoading(false)
            return
          }
        }
        
        setNotFound(true)
      } catch (error) {
        console.error('Error fetching blog post:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchBlogPost()
  }, [postId])

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      alert('Thank you for subscribing!')
      setEmail('')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blog post...</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (notFound || !post) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
            <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
            <Link
              href="/blog"
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Main Content */}
      <section className="pt-20 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column - Article Content */}
            <div className="lg:col-span-2">
              {/* Back Link */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Blog
              </Link>

              {/* Article Header */}
              <div className="mb-8">
                {post.category && (
                  <span className="inline-block text-xs uppercase tracking-wide text-gray-500 mb-4">
                    {post.category}
                  </span>
                )}
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  {post.title}
                </h1>
                {post.subtitle && (
                  <p className="text-xl text-gray-600 mb-6">
                    {post.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.author.toUpperCase()}</span>
                  {post.readTime && (
                    <>
                      <span>•</span>
                      <span>{post.readTime}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Featured Image */}
              {post.image && (
                <div className="mb-8">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-auto rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
                    }}
                  />
                </div>
              )}

              {/* Article Content */}
              <article className="prose prose-lg max-w-none">
                <div className="text-gray-700 leading-relaxed text-base md:text-lg">
                  {post.content.split('\n').map((paragraph, index) => {
                    if (paragraph.startsWith('## ')) {
                      return (
                        <h2 key={index} className="text-3xl font-bold text-gray-900 mt-10 mb-4">
                          {paragraph.replace('## ', '')}
                        </h2>
                      )
                    }
                    if (paragraph.startsWith('### ')) {
                      return (
                        <h3 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-3">
                          {paragraph.replace('### ', '')}
                        </h3>
                      )
                    }
                    if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                      return (
                        <li key={index} className="ml-6 mb-2 list-disc">
                          {paragraph.replace(/^[-*] /, '')}
                        </li>
                      )
                    }
                    if (paragraph.startsWith('1. ') || /^\d+\. /.test(paragraph)) {
                      return (
                        <li key={index} className="ml-6 mb-2 list-decimal">
                          {paragraph.replace(/^\d+\. /, '')}
                        </li>
                      )
                    }
                    if (paragraph.trim() === '') {
                      return <br key={index} />
                    }
                    if (paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**')) {
                      return (
                        <p key={index} className="mb-6 font-semibold text-gray-900 text-lg">
                          {paragraph.replace(/\*\*/g, '')}
                        </p>
                      )
                    }
                    return (
                      <p key={index} className="mb-6 leading-relaxed">
                        {paragraph}
                      </p>
                    )
                  })}
                </div>
              </article>

              {/* Share Section */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-4">Share this article</p>
                <div className="flex gap-3">
                  <a
                    href={currentUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a
                    href={currentUrl ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(post.title)}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                  <a
                    href={currentUrl ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-[#0077B5] hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                  <button
                    onClick={() => {
                      if (currentUrl && typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(currentUrl)
                        alert('Link copied to clipboard!')
                      }
                    }}
                    className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Newsletter Subscription */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-primary to-primary-dark"></div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Travelzada's Newsletter</h3>
                      <p className="text-xs text-gray-500">curated curiosities.</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleSubscribe} className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Type your email..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    />
                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors text-sm"
                    >
                      Subscribe
                    </button>
                  </form>
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Related Articles</h4>
                    <div className="space-y-4">
                      {relatedPosts.map((relatedPost) => (
                        <Link
                          key={relatedPost.id}
                          href={`/blog/${relatedPost.id}`}
                          className="block group"
                        >
                          <div className="flex gap-3">
                            {relatedPost.image && (
                              <div className="flex-shrink-0 w-16 h-16">
                                <img
                                  src={relatedPost.image}
                                  alt={relatedPost.title}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                {relatedPost.title}
                              </h5>
                              <p className="text-xs text-gray-500">{relatedPost.date}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
