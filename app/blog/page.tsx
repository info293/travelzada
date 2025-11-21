'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface BlogPost {
  id?: string
  title: string
  subtitle?: string
  description: string
  image: string
  author: string
  date: string
  category?: string
  likes?: number
  comments?: number
  shares?: number
  featured?: boolean
  published?: boolean
}

export default function BlogPage() {
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([])
  const [mostPopularPosts, setMostPopularPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      if (typeof window === 'undefined' || !db) return
      
      const q = query(
        collection(db, 'blogs'),
        where('published', '==', true),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const blogsData: BlogPost[] = []
      
      querySnapshot.forEach((doc) => {
        blogsData.push({ id: doc.id, ...doc.data() } as BlogPost)
      })

      // Separate featured and regular posts
      const featured = blogsData.filter(b => b.featured).slice(0, 2)
      const popular = blogsData.slice(0, 8)
      
      if (featured.length > 0) setFeaturedPosts(featured)
      if (popular.length > 0) setMostPopularPosts(popular)
    } catch (error) {
      console.error('Error fetching blogs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Main Content - Two Column Layout */}
      <section className="pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column - Featured Articles */}
            <div className="lg:col-span-2 space-y-8">
              {/* Top Featured Article */}
              {featuredPosts[0] && (
                <Link href={`/blog/${featuredPosts[0].id || featuredPosts[0].title.toLowerCase().replace(/\s+/g, '-')}`} className="block group">
                  <div className="mb-4">
                    <img
                      src={featuredPosts[0].image}
                      alt={featuredPosts[0].title}
                      className="w-full h-[400px] md:h-[500px] object-cover"
                    />
                  </div>
                  {featuredPosts[0].category && (
                    <div className="mb-2">
                      <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
                        {featuredPosts[0].category}
                      </p>
                    </div>
                  )}
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                    {featuredPosts[0].title}
                  </h2>
                  {featuredPosts[0].subtitle && (
                    <p className="text-sm md:text-base text-gray-600 mb-1">{featuredPosts[0].subtitle}</p>
                  )}
                  <p className="text-[10px] md:text-xs text-gray-500 mb-4 leading-relaxed">{featuredPosts[0].description}</p>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 uppercase">
                    <span>{featuredPosts[0].date}</span>
                    <span>•</span>
                    <span>{featuredPosts[0].author}</span>
                  </div>
                </Link>
              )}

              {/* Decorative Block - Green (Large) */}
              <div className="bg-[#22c55e] text-white py-12 md:py-16 px-8 md:px-12">
                <p className="text-sm md:text-base uppercase tracking-[0.15em] font-semibold mb-2">
                  THINGS I READ THIS WEEK
                </p>
                <p className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 leading-tight">
                  that made me think
                </p>
                <p className="text-sm md:text-base font-medium">
                  BECAUSE THE INTERNET DESERVES
                </p>
              </div>

              {/* Bottom Featured Article */}
              <div className="space-y-4">
                {/* Decorative Block - Pink/Purple Gradient (Small) */}
                <div className="bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white py-6 md:py-7 px-6 md:px-8">
                  <p className="text-[10px] md:text-xs uppercase tracking-[0.15em] font-semibold mb-1">
                    THINGS I READ THIS WEEK
                  </p>
                  <p className="text-lg md:text-xl font-bold leading-tight">
                    that made me think
                  </p>
                </div>

                {featuredPosts[1] && (
                  <Link href={`/blog/${featuredPosts[1].id || featuredPosts[1].title.toLowerCase().replace(/\s+/g, '-')}`} className="block group">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                      {featuredPosts[1].title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 mb-3">{featuredPosts[1].description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 uppercase">
                        <span>{featuredPosts[1].date}</span>
                        <span>•</span>
                        <span>{featuredPosts[1].author}</span>
                      </div>
                      <div className="flex items-center gap-3 md:gap-4 text-xs text-gray-500">
                        {featuredPosts[1].likes !== undefined && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            {featuredPosts[1].likes}
                          </span>
                        )}
                        {featuredPosts[1].comments !== undefined && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {featuredPosts[1].comments}
                          </span>
                        )}
                        {featuredPosts[1].shares !== undefined && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.885 12.938 9 12.482 9 12c0-.482-.115-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            {featuredPosts[1].shares}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Right Column - Most Popular */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base md:text-lg font-bold text-gray-900">Most Popular</h2>
                  <Link href="/blog" className="text-xs md:text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wide">
                    VIEW ALL
                  </Link>
                </div>
                <div className="space-y-5">
                  {mostPopularPosts.map((post) => (
                    <Link
                      key={post.id || post.title}
                      href={`/blog/${post.id || post.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="block group"
                    >
                      <div className="flex gap-3">
                        {post.image && (
                          <div className="flex-shrink-0">
                            <img
                              src={post.image}
                              alt={post.title}
                              className="w-16 h-16 md:w-20 md:h-20 object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-gray-600 transition-colors leading-snug">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 uppercase">
                            <span>{post.date}</span>
                            {post.author && (
                              <>
                                <span>•</span>
                                <span>{post.author}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}


