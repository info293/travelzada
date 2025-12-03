'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { collection, getDocs, query, orderBy, where, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface BlogPost {
  id?: string
  title: string
  subtitle?: string
  description: string
  image: string
  author: string
  authorImage?: string
  date: string
  category?: string
  sectionHeader?: string
  isFeatured?: boolean
  sectionOrder?: number
  likes?: number
  comments?: number
  views?: number
  shares?: number
  featured?: boolean
  published?: boolean
  slug?: string
}

export default function BlogPage() {
  const [allPosts, setAllPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'latest' | 'top' | 'discussions'>('latest')
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeMessage, setSubscribeMessage] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      if (typeof window === 'undefined' || !db) return

      // Try to fetch with published filter and orderBy
      let querySnapshot
      try {
        const q = query(
          collection(db, 'blogs'),
          where('published', '==', true),
          orderBy('createdAt', 'desc')
        )
        querySnapshot = await getDocs(q)
      } catch (orderError) {
        // If orderBy fails (missing index or createdAt field), try without orderBy
        console.log('OrderBy failed, trying without orderBy:', orderError)
        try {
          const q = query(
            collection(db, 'blogs'),
            where('published', '==', true)
          )
          querySnapshot = await getDocs(q)
        } catch (whereError) {
          // If where also fails, fetch all blogs and filter client-side
          console.log('Where clause failed, fetching all blogs:', whereError)
          querySnapshot = await getDocs(collection(db, 'blogs'))
        }
      }

      const blogsData: BlogPost[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data() as BlogPost
        // Filter client-side if needed (in case where clause failed)
        if (data.published !== false) {
          blogsData.push({ id: doc.id, ...data })
        }
      })

      // Sort by createdAt if available, otherwise by date
      blogsData.sort((a, b) => {
        const aDate = (a as any).createdAt || a.date || ''
        const bDate = (b as any).createdAt || b.date || ''
        return bDate.localeCompare(aDate)
      })

      console.log(`✅ Loaded ${blogsData.length} blogs from Firestore`)
      console.log('Blogs data:', blogsData.map(b => ({ id: b.id, title: b.title, published: (b as any).published })))
      setAllPosts(blogsData)
    } catch (error) {
      console.error('Error fetching blogs:', error)
    } finally {
      setLoading(false)
    }
  }

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

  // Show message if no blogs found
  if (allPosts.length === 0) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <section className="pt-20 pb-16 px-4 md:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Blog Posts Yet</h1>
            <p className="text-gray-600 mb-8">
              There are no published blog posts at the moment. Check back soon!
            </p>
            <p className="text-sm text-gray-500">
              If you're an admin, make sure your blogs are marked as "Published" in the admin dashboard.
            </p>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  // Group posts by section
  const groupedPosts = allPosts.reduce((acc, post) => {
    const section = post.sectionHeader || 'General'
    if (!acc[section]) {
      acc[section] = []
    }
    acc[section].push(post)
    return acc
  }, {} as Record<string, BlogPost[]>)

  // Get selected section from URL
  const selectedSection = searchParams.get('section')

  // Sort sections and posts within sections
  let sortedSections = Object.keys(groupedPosts).sort()

  // Filter sections if a specific section is selected
  if (selectedSection) {
    sortedSections = sortedSections.filter(section =>
      section.toLowerCase() === selectedSection.toLowerCase()
    )
  }

  sortedSections.forEach(section => {
    groupedPosts[section].sort((a, b) => {
      // Featured posts first
      if (a.isFeatured && !b.isFeatured) return -1
      if (!a.isFeatured && b.isFeatured) return 1
      // Then by sectionOrder
      const aOrder = a.sectionOrder ?? 999
      const bOrder = b.sectionOrder ?? 999
      return aOrder - bOrder
    })
  })

  // Sort posts by views (for Top posts section)
  const topPosts = [...allPosts].sort((a, b) => {
    const aViews = a.views || 0
    const bViews = b.views || 0
    return bViews - aViews
  }).slice(0, 5) // Top 5 posts by views

  // Sort posts by date (for Recent posts section)
  const recentPosts = [...allPosts].sort((a, b) => {
    const aDate = (a as any).createdAt || a.date || ''
    const bDate = (b as any).createdAt || b.date || ''
    return bDate.localeCompare(aDate)
  }).slice(0, 4) // Latest 4 posts

  const getBlogUrl = (post: BlogPost) => {
    const category = post.category ? post.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'general'
    const slug = post.slug || post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `/blog/${category}/${slug}`
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Main Content Area */}
      <section className="pt-20 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Blog Sections */}
          <div className="space-y-16 py-12">
            {selectedSection && (
              <div className="mb-8">
                <Link
                  href="/blog"
                  className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to all posts
                </Link>
              </div>
            )}
            {sortedSections.map((sectionName) => {
              const sectionPosts = groupedPosts[sectionName]

              // If a section is selected, show ALL posts in a grid
              if (selectedSection) {
                return (
                  <div key={sectionName} className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-4xl md:text-5xl font-bold text-gray-900">{sectionName}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {sectionPosts.map((post) => (
                        <Link
                          key={post.id || post.title}
                          href={getBlogUrl(post)}
                          className="group block h-full"
                        >
                          <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                            {/* Image */}
                            <div className="relative w-full h-48 overflow-hidden">
                              <img
                                src={post.image}
                                alt={post.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'
                                }}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex flex-col flex-grow p-5">
                              <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide mb-3">
                                <span>{post.date}</span>
                                <span>•</span>
                                <span>{post.author}</span>
                              </div>

                              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors leading-tight">
                                {post.title}
                              </h3>

                              <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">
                                {post.subtitle || post.description}
                              </p>

                              <span className="text-sm font-medium text-primary group-hover:text-primary-dark transition-colors mt-auto">
                                Read Article →
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              }

              // Default View (Featured + Sidebar)
              let featuredPost = sectionPosts.find(p => p.isFeatured)
              // If no featured post, use the first post as featured
              if (!featuredPost && sectionPosts.length > 0) {
                featuredPost = sectionPosts[0]
              }
              const relatedPosts = sectionPosts.filter(p => p.id !== featuredPost?.id).slice(0, 4)

              return (
                <div key={sectionName} className="space-y-6">
                  {/* Section Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900">{sectionName}</h2>
                    {sectionPosts.length > 5 && !selectedSection && (
                      <Link
                        href={`/blog?section=${encodeURIComponent(sectionName)}`}
                        className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                      >
                        VIEW ALL
                      </Link>
                    )}
                  </div>

                  {/* Section Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-12">
                    {/* Left Column - Featured Post */}
                    {featuredPost && (
                      <Link
                        href={getBlogUrl(featuredPost)}
                        className="group block"
                      >
                        <div className="space-y-4">
                          {/* Large Featured Image */}
                          <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden rounded-lg shadow-lg">
                            <img
                              src={featuredPost.image}
                              alt={featuredPost.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
                              }}
                            />
                          </div>

                          {/* Featured Post Content */}
                          <div className="space-y-3">
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors leading-tight">
                              {featuredPost.title}
                            </h3>
                            <p className="text-base md:text-lg text-gray-600 leading-relaxed line-clamp-3">
                              {featuredPost.subtitle || featuredPost.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wide">
                              <span>{featuredPost.date}</span>
                              <span>•</span>
                              <span>{featuredPost.author.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}

                    {/* Right Column - Related Posts & Newsletter */}
                    <div className="space-y-8">
                      {/* Related Posts */}
                      {relatedPosts.length > 0 && (
                        <div className="space-y-6">
                          {relatedPosts.map((post) => (
                            <Link
                              key={post.id || post.title}
                              href={getBlogUrl(post)}
                              className="group block"
                            >
                              <div className="flex gap-4">
                                {/* Thumbnail Image */}
                                <div className="flex-shrink-0 w-24 h-24 md:w-28 md:h-28">
                                  <img
                                    src={post.image}
                                    alt={post.title}
                                    className="w-full h-full object-cover rounded transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=200&q=80'
                                    }}
                                  />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1.5 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                                    {post.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                    {post.subtitle || post.description}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide">
                                    <span>{post.date}</span>
                                    <span>•</span>
                                    <span>{post.author.toUpperCase()}</span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Newsletter Subscription - Sticky - Only show once per page */}
                      {sectionName === sortedSections[0] && (
                        <div className="sticky top-24">
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Travelzada Newsletter</h3>
                            <p className="text-sm text-gray-600 mb-4">
                              Essays and analysis about travel, destinations, tips, and all the other things we care about.
                            </p>

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
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* If no sections, show all posts in default layout */}
            {sortedSections.length === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-12">
                <div className="space-y-6">
                  {allPosts.map((post) => (
                    <Link
                      key={post.id || post.title}
                      href={getBlogUrl(post)}
                      className="block group"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-32 h-32">
                          <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover rounded transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=200&q=80'
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 mb-1.5 group-hover:text-primary transition-colors leading-tight">
                            {post.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {post.subtitle || post.description}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide">
                            <span>{post.date}</span>
                            <span>•</span>
                            <span>{post.author.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Newsletter Sidebar */}
                <div className="sticky top-24">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Travelzada Newsletter</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Essays and analysis about travel, destinations, tips, and all the other things we care about.
                    </p>
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
                  </div>
                </div>
              </div>
            )}

            {/* New Three Column Section: Top Posts, Recent Posts, Newsletter */}
            <div className="pt-16 border-t border-gray-200 mt-16">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                {/* Left Column - Top Posts */}
                <div className="lg:col-span-1">
                  <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Top posts</h2>
                  </div>
                  <div className="space-y-6">
                    {topPosts.map((post) => (
                      <Link
                        key={post.id || post.title}
                        href={getBlogUrl(post)}
                        className="group block"
                      >
                        <div className="flex gap-4">
                          {/* Thumbnail Image */}
                          <div className="flex-shrink-0 w-24 h-24">
                            <img
                              src={post.image}
                              alt={post.title}
                              className="w-full h-full object-cover rounded transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=200&q=80'
                              }}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                              {post.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide">
                              <span>{post.date}</span>
                              <span>•</span>
                              <span className="truncate">{post.category || post.author.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {topPosts.length === 0 && (
                      <p className="text-sm text-gray-500">No posts yet</p>
                    )}
                  </div>
                </div>

                {/* Middle Column - Recent Posts */}
                <div className="lg:col-span-1">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Recent posts</h2>
                    <Link
                      href="/blog#all-posts"
                      className="text-sm font-medium text-gray-600 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      VIEW ALL
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </Link>
                  </div>
                  <div className="space-y-6">
                    {recentPosts.map((post) => (
                      <Link
                        key={post.id || post.title}
                        href={getBlogUrl(post)}
                        className="group block"
                      >
                        <div className="flex gap-4">
                          {/* Thumbnail Image */}
                          <div className="flex-shrink-0 w-24 h-24">
                            <img
                              src={post.image}
                              alt={post.title}
                              className="w-full h-full object-cover rounded transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=200&q=80'
                              }}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                              {post.title}
                            </h3>
                            {post.subtitle && (
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {post.subtitle}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide">
                              <span>{post.date}</span>
                              <span>•</span>
                              <span className="truncate">{post.category || post.author.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {recentPosts.length === 0 && (
                      <p className="text-sm text-gray-500">No posts yet</p>
                    )}
                  </div>
                </div>

                {/* Right Column - Newsletter */}
                <div className="lg:col-span-1">
                  <div className="sticky top-24">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Travelzada Newsletter</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Essays and analysis about travel, destinations, tips, and all the other things we care about.
                      </p>

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
                    </div>
                  </div>
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
