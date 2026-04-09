import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Breadcrumbs from '@/components/Breadcrumbs'
import SchemaMarkup from '@/components/SchemaMarkup'

export const revalidate = 3600

interface Author {
  id?: string
  name: string
  slug: string
  bio: string
  shortBio?: string
  photo?: string
  role?: string
  expertise?: string[]
  socialLinks?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    website?: string
  }
  location?: string
  createdAt?: string
}

interface BlogPost {
  id?: string
  title: string
  description: string
  image: string
  author: string
  authorSlug?: string
  date: string
  category?: string
  readTime?: string
  slug?: string
  published?: boolean
}

async function fetchAuthor(slug: string): Promise<Author | null> {
  try {
    const { collection, getDocs, query, where } = await import('firebase/firestore')
    const { db } = await import('@/lib/firebase')
    if (!db) return null

    const q = query(collection(db, 'authors'), where('slug', '==', slug))
    const snap = await getDocs(q)
    if (snap.empty) return null
    const docSnap = snap.docs[0]
    return { id: docSnap.id, ...docSnap.data() } as Author
  } catch {
    return null
  }
}

async function fetchAuthorPosts(authorSlug: string, authorName: string): Promise<BlogPost[]> {
  try {
    const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore')
    const { db } = await import('@/lib/firebase')
    if (!db) return []

    // Try by authorSlug first, fall back to author name match
    let posts: BlogPost[] = []

    try {
      const q = query(
        collection(db, 'blogs'),
        where('authorSlug', '==', authorSlug),
        where('published', '==', true),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      const snap = await getDocs(q)
      snap.forEach(d => posts.push({ id: d.id, ...d.data() } as BlogPost))
    } catch { /* index may not exist yet */ }

    if (posts.length === 0) {
      // Fallback: match by author name
      const q2 = query(
        collection(db, 'blogs'),
        where('author', '==', authorName),
        where('published', '==', true),
        limit(20)
      )
      const snap2 = await getDocs(q2)
      snap2.forEach(d => posts.push({ id: d.id, ...d.data() } as BlogPost))
    }

    return posts
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const author = await fetchAuthor(params.slug)
  if (!author) return { title: 'Author Not Found | Travelzada' }

  return {
    title: `${author.name} - Travel Writer | Travelzada`,
    description: author.shortBio || author.bio?.slice(0, 160) || `Read articles by ${author.name} on Travelzada.`,
    openGraph: {
      title: `${author.name} | Travelzada`,
      description: author.shortBio || author.bio?.slice(0, 160) || '',
      images: author.photo ? [author.photo] : [],
      type: 'profile',
      url: `https://www.travelzada.com/author/${author.slug}`,
    },
    alternates: {
      canonical: `https://www.travelzada.com/author/${author.slug}`,
    },
  }
}

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const author = await fetchAuthor(params.slug)
  if (!author) notFound()

  const posts = await fetchAuthorPosts(author.slug, author.name)

  const authorSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `https://www.travelzada.com/author/${author.slug}`,
    description: author.bio,
    ...(author.photo ? { image: author.photo } : {}),
    ...(author.role ? { jobTitle: author.role } : {}),
    worksFor: {
      '@type': 'Organization',
      name: 'Travelzada',
      url: 'https://www.travelzada.com',
    },
    ...(author.socialLinks?.twitter ? { sameAs: [author.socialLinks.twitter] } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorSchema).replace(/</g, '\\u003c') }}
      />
      <main className="min-h-screen bg-white">
        <Header />

        {/* Breadcrumb */}
        <div className="bg-white px-4 md:px-8 lg:px-12 pt-20 lg:pt-24 pb-3 border-b border-gray-100">
          <div className="max-w-4xl mx-auto">
            <Breadcrumbs items={[
              { name: 'Home', url: '/' },
              { name: 'Blog', url: '/blog' },
              { name: author.name }
            ]} />
          </div>
        </div>

        {/* Author Hero */}
        <section className="pt-12 pb-10 px-4 md:px-8 border-b border-gray-100">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start">
            {/* Photo */}
            <div className="flex-shrink-0">
              {author.photo ? (
                <img
                  src={author.photo}
                  alt={author.name}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center shadow-lg">
                  <span className="text-4xl font-bold text-primary">
                    {author.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{author.name}</h1>
                {author.role && (
                  <span className="text-xs uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold">
                    {author.role}
                  </span>
                )}
              </div>

              {author.location && (
                <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {author.location}
                </p>
              )}

              <p className="text-gray-700 leading-relaxed mb-4 text-base md:text-lg">{author.bio}</p>

              {/* Expertise tags */}
              {author.expertise && author.expertise.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {author.expertise.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Social links */}
              {author.socialLinks && Object.values(author.socialLinks).some(Boolean) && (
                <div className="flex gap-3">
                  {author.socialLinks.twitter && (
                    <a href={author.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1DA1F2] transition-colors" aria-label="Twitter">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                  )}
                  {author.socialLinks.linkedin && (
                    <a href={author.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0077B5] transition-colors" aria-label="LinkedIn">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  )}
                  {author.socialLinks.instagram && (
                    <a href={author.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E1306C] transition-colors" aria-label="Instagram">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    </a>
                  )}
                  {author.socialLinks.website && (
                    <a href={author.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors" aria-label="Website">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Author's Articles */}
        <section className="py-12 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Articles by {author.name}
              <span className="ml-2 text-sm font-normal text-gray-400">({posts.length})</span>
            </h2>

            {posts.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl">
                <p className="text-gray-500">No published articles yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map((post) => {
                  const cat = post.category?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'general'
                  const postSlug = post.slug || post.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  const href = `/blog/${cat}/${postSlug}`

                  return (
                    <Link
                      key={post.id}
                      href={href}
                      className="group flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {post.image && (
                        <div className="h-44 overflow-hidden">
                          <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1">
                        {post.category && (
                          <span className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">{post.category}</span>
                        )}
                        <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{post.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto">
                          <span>{post.date}</span>
                          {post.readTime && <><span>•</span><span>{post.readTime}</span></>}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
