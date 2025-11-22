'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
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
  likes?: number
  comments?: number
  shares?: number
  featured?: boolean
  published?: boolean
}

export default function BlogPage() {
  const [allPosts, setAllPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'latest' | 'top' | 'discussions'>('latest')
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeMessage, setSubscribeMessage] = useState('')

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

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Main Content Area */}
      <section className="pt-20 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with Tabs and Search */}
          {/* <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab('latest')}
                className={`text-sm font-medium transition-colors ${
                  activeTab === 'latest'
                    ? 'text-gray-900 bg-gray-100 px-3 py-1.5 rounded'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setActiveTab('top')}
                className={`text-sm font-medium transition-colors ${
                  activeTab === 'top'
                    ? 'text-gray-900 bg-gray-100 px-3 py-1.5 rounded'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Top
              </button>
              <button
                onClick={() => setActiveTab('discussions')}
                className={`text-sm font-medium transition-colors ${
                  activeTab === 'discussions'
                    ? 'text-gray-900 bg-gray-100 px-3 py-1.5 rounded'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Discussions
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-primary-dark"></div>
            </div>
          </div> */}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 py-20">
            {/* Left Column - Article Listings */}
            <div className="lg:col-span-2 space-y-6">
              {allPosts.map((post) => (
                <Link
                  key={post.id || post.title}
                  href={`/blog/${post.id || post.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="block group"
                >
                  <div className="flex gap-4">
                    {/* Thumbnail Image */}
                    <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=200&q=80'
                        }}
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors leading-tight">
                        {post.title}
                      </h3>
                      <p className="text-sm md:text-base text-gray-600 mb-2 line-clamp-2">
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
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setSubscribeMessage('')
                      }}
                      placeholder="Type your email..."
                      disabled={subscribing}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      <p className={`text-xs text-center ${
                        subscribeMessage.includes('Thank you') 
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
      </section>

      <Footer />
    </main>
  )
}
