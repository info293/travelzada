import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { doc, getDoc, collection, getDocs, query, where, limit, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ShareButtons, NewsletterForm, RelatedPosts } from '@/components/blog/BlogInteractive'

interface BlogSection {
    type: 'intro' | 'paragraph' | 'heading' | 'subheading' | 'image' | 'quote' | 'list' | 'cta' | 'divider' | 'faq' | 'toc' | 'related'
    content?: string
    text?: string
    imageUrl?: string
    imageAlt?: string
    items?: string[]
    author?: string
    link?: string
    linkText?: string
    question?: string
    answer?: string
    faqs?: Array<{ question: string; answer: string }>
    relatedLinks?: Array<{ title: string; url: string; description?: string }>
}

interface BlogPost {
    id?: string
    title: string
    subtitle?: string
    description: string
    content: string
    blogStructure?: BlogSection[]
    image: string
    author: string
    authorImage?: string
    date: string
    category?: string
    readTime?: string
    likes?: number
    views?: number
    comments?: number
    shares?: number
    // SEO Fields
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
    canonicalUrl?: string
    ogImage?: string
    schemaType?: 'Article' | 'BlogPosting' | 'NewsArticle'
    slug?: string
    published?: boolean
}

interface PageProps {
    params: Promise<{ slug: string[] }> | { slug: string[] }
}

// Fetch blog post server-side
async function fetchBlogPost(slug: string[]): Promise<BlogPost | null> {
    if (!db) return null

    try {
        const blogsRef = collection(db, 'blogs')
        let foundPost: BlogPost | null = null

        if (slug.length === 2) {
            // Case 1: /blog/[category]/[slug]
            const [, urlSlug] = slug

            // Try to find by slug field
            const qSlug = query(blogsRef, where('slug', '==', urlSlug), where('published', '==', true))
            const snapshotSlug = await getDocs(qSlug)

            if (!snapshotSlug.empty) {
                const docSnap = snapshotSlug.docs[0]
                foundPost = { id: docSnap.id, ...docSnap.data() } as BlogPost
            } else {
                // Fallback: Try to find by title-slug match
                const qAll = query(blogsRef, where('published', '==', true))
                const snapshotAll = await getDocs(qAll)

                snapshotAll.forEach(doc => {
                    if (foundPost) return
                    const data = doc.data() as BlogPost
                    const titleSlug = data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

                    if (titleSlug === urlSlug) {
                        foundPost = { id: doc.id, ...data }
                    }
                })
            }
        } else if (slug.length === 1) {
            // Case 2: /blog/[id]
            const [idParam] = slug

            try {
                const docRef = doc(db, 'blogs', idParam)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists() && docSnap.data().published) {
                    foundPost = { id: docSnap.id, ...docSnap.data() } as BlogPost
                }
            } catch (e) {
                // Ignore invalid ID format errors
            }
        }

        return foundPost
    } catch (error) {
        console.error('Error fetching blog post:', error)
        return null
    }
}

// Fetch related posts
async function fetchRelatedPosts(category: string | undefined, currentPostId: string | undefined): Promise<BlogPost[]> {
    if (!category || !db) return []

    try {
        const relatedQuery = query(
            collection(db, 'blogs'),
            where('published', '==', true),
            where('category', '==', category),
            limit(4)
        )
        const relatedSnapshot = await getDocs(relatedQuery)
        const related: BlogPost[] = []

        relatedSnapshot.forEach((doc) => {
            if (doc.id !== currentPostId) {
                related.push({ id: doc.id, ...doc.data() } as BlogPost)
            }
        })

        return related.slice(0, 3)
    } catch (err) {
        console.error('Could not fetch related posts:', err)
        return []
    }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = params instanceof Promise ? await params : params
    const post = await fetchBlogPost(resolvedParams.slug)

    if (!post) {
        return {
            title: 'Post Not Found | Travelzada',
            description: 'The blog post you are looking for does not exist.',
        }
    }

    const metaTitle = post.metaTitle || post.title
    const metaDescription = post.metaDescription || post.description
    const ogImage = post.ogImage || post.image
    const computedCategory = post.category ? post.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'general'
    const computedSlug = post.slug || post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const canonicalUrl = post.canonicalUrl || `https://www.travelzada.com/blog/${computedCategory}/${computedSlug}`

    return {
        title: `${metaTitle} | Travelzada`,
        description: metaDescription,
        keywords: post.keywords?.join(', ') || post.category || '',
        authors: [{ name: post.author }],
        openGraph: {
            type: 'article',
            url: canonicalUrl,
            title: metaTitle,
            description: metaDescription,
            images: [ogImage],
            siteName: 'Travelzada',
            publishedTime: post.date,
            authors: [post.author],
            section: post.category,
        },
        twitter: {
            card: 'summary_large_image',
            title: metaTitle,
            description: metaDescription,
            images: [ogImage],
        },
        alternates: {
            canonical: canonicalUrl,
        },
        robots: {
            index: true,
            follow: true,
        },
    }
}

// Generate static params for all blog posts
export async function generateStaticParams() {
    if (!db) return []

    try {
        const blogsQuery = query(collection(db, 'blogs'), where('published', '==', true))
        const blogsSnapshot = await getDocs(blogsQuery)

        return blogsSnapshot.docs.map((doc) => {
            const data = doc.data() as BlogPost
            const category = data.category
                ? data.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                : 'general'
            const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

            return {
                slug: [category, slug],
            }
        })
    } catch (error) {
        console.error('Error generating static params:', error)
        return []
    }
}

export default async function BlogPostPage({ params }: PageProps) {
    const resolvedParams = params instanceof Promise ? await params : params
    const { slug } = resolvedParams

    const post = await fetchBlogPost(slug)

    if (!post) {
        notFound()
    }

    // Fetch related posts server-side
    const relatedPosts = await fetchRelatedPosts(post.category, post.id)

    // Increment view count (fire and forget - don't await)
    if (post.id && db) {
        const docRef = doc(db, 'blogs', post.id)
        updateDoc(docRef, { views: increment(1) }).catch(() => {
            // Silently fail, view counting is not critical
        })
    }

    // Generate structured data for SEO
    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description || post.subtitle,
        image: post.image,
        author: {
            '@type': 'Person',
            name: post.author,
        },
        datePublished: post.date,
        dateModified: post.date,
        publisher: {
            '@type': 'Organization',
            name: 'Travelzada',
            logo: {
                '@type': 'ImageObject',
                url: 'https://www.travelzada.com/images/logo/Travelzada%20Logo%20April%20(1).png',
            },
        },
    }

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.travelzada.com' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.travelzada.com/blog' },
            { '@type': 'ListItem', position: 3, name: post.category || 'Post', item: `https://www.travelzada.com/blog/${slug.join('/')}` },
            { '@type': 'ListItem', position: 4, name: post.title },
        ],
    }

    // FAQ structured data
    const faqSections = post.blogStructure?.filter(s => s.type === 'faq') || []
    const faqStructuredData = faqSections.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqSections.flatMap(section => {
            if (section.faqs && section.faqs.length > 0) {
                return section.faqs.map(faq => ({
                    '@type': 'Question',
                    name: faq.question,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: faq.answer,
                    },
                }))
            }
            if (section.question && section.answer) {
                return [{
                    '@type': 'Question',
                    name: section.question,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: section.answer,
                    },
                }]
            }
            return []
        }),
    } : null

    // Compute current URL for share buttons
    const computedCategory = post.category ? post.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'general'
    const computedSlug = post.slug || post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const currentUrl = `https://www.travelzada.com/blog/${computedCategory}/${computedSlug}`

    return (
        <>
            {/* Schema Markup - Server-side rendered */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
                key="article-schema"
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
                key="breadcrumb-schema"
            />
            {faqStructuredData && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
                    key="faq-schema"
                />
            )}

            <main className="min-h-screen bg-white">
                <Header />

                {/* Main Content */}
                <section className="pt-24 pb-12 px-4 md:px-8 lg:px-12">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col gap-12">
                            {/* Article Content */}
                            <div className="w-full">
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
                                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                                        {post.title}
                                    </h1>
                                    {post.subtitle && (
                                        <p className="text-lg md:text-xl text-gray-600 mb-6">
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
                                            alt={post.metaDescription || post.description || post.title}
                                            title={post.title}
                                            className="w-full max-h-[500px] object-cover rounded-lg"
                                            loading="eager"
                                        />
                                    </div>
                                )}

                                {/* Article Content */}
                                <article itemScope itemType="https://schema.org/BlogPosting" className="prose prose-lg max-w-none">
                                    {post.blogStructure && post.blogStructure.length > 0 ? (
                                        // Render rich blog structure
                                        <div className="space-y-8">
                                            {post.blogStructure.map((section, index) => {
                                                switch (section.type) {
                                                    case 'intro':
                                                        return (
                                                            <div key={index} className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed mb-8 pb-6 border-b border-gray-200">
                                                                {section.text || section.content}
                                                            </div>
                                                        )
                                                    case 'heading':
                                                        return (
                                                            <h2 key={`heading-${index}`} id={`heading-${index}`} className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6 scroll-mt-20">
                                                                {section.text || section.content}
                                                            </h2>
                                                        )
                                                    case 'subheading':
                                                        return (
                                                            <h3 key={`heading-${index}`} id={`heading-${index}`} className="text-xl md:text-2xl font-bold text-gray-900 mt-10 mb-4 scroll-mt-20">
                                                                {section.text || section.content}
                                                            </h3>
                                                        )
                                                    case 'paragraph':
                                                        return (
                                                            <p key={index} className="text-base md:text-lg text-gray-700 leading-relaxed mb-6">
                                                                {section.text || section.content}
                                                            </p>
                                                        )
                                                    case 'image':
                                                        return (
                                                            <div key={index} className="my-8">
                                                                <img
                                                                    src={section.imageUrl || ''}
                                                                    alt={section.imageAlt || 'Blog image'}
                                                                    className="w-full max-h-[500px] object-cover rounded-lg shadow-lg"
                                                                />
                                                                {section.imageAlt && (
                                                                    <p className="text-sm text-gray-500 italic mt-2 text-center">{section.imageAlt}</p>
                                                                )}
                                                            </div>
                                                        )
                                                    case 'quote':
                                                        return (
                                                            <blockquote key={index} className="border-l-4 border-primary pl-6 py-4 my-8 bg-gray-50 rounded-r-lg">
                                                                <p className="text-lg md:text-xl text-gray-800 italic mb-2">
                                                                    &quot;{section.text || section.content}&quot;
                                                                </p>
                                                                {section.author && (
                                                                    <cite className="text-sm text-gray-600 font-semibold not-italic">— {section.author}</cite>
                                                                )}
                                                            </blockquote>
                                                        )
                                                    case 'list':
                                                        return (
                                                            <ul key={index} className="list-disc list-inside space-y-3 my-6 text-base md:text-lg text-gray-700">
                                                                {section.items?.map((item, itemIndex) => (
                                                                    <li key={itemIndex} className="leading-relaxed">{item}</li>
                                                                ))}
                                                            </ul>
                                                        )
                                                    case 'cta':
                                                        return (
                                                            <div key={index} className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-8 my-10 text-center text-white">
                                                                <p className="text-xl md:text-2xl font-semibold mb-4">{section.text || section.content}</p>
                                                                {section.link && (
                                                                    <Link
                                                                        href={section.link}
                                                                        className="inline-block bg-white text-primary px-6 py-2.5 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                                                                    >
                                                                        {section.linkText || 'Learn More'}
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        )
                                                    case 'divider':
                                                        return (
                                                            <div key={index} className="my-10 border-t border-gray-200"></div>
                                                        )
                                                    case 'faq':
                                                        return (
                                                            <section key={index} className="my-10 bg-gray-50 rounded-xl p-8">
                                                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
                                                                <div className="space-y-6">
                                                                    {section.faqs && section.faqs.length > 0 ? (
                                                                        section.faqs.map((faq, faqIndex) => (
                                                                            <details key={faqIndex} className="bg-white rounded-lg p-4 shadow-sm">
                                                                                <summary className="font-semibold text-gray-900 cursor-pointer hover:text-primary transition-colors">
                                                                                    {faq.question}
                                                                                </summary>
                                                                                <p className="mt-3 text-gray-700 leading-relaxed">{faq.answer}</p>
                                                                            </details>
                                                                        ))
                                                                    ) : section.question && section.answer ? (
                                                                        <details className="bg-white rounded-lg p-4 shadow-sm">
                                                                            <summary className="font-semibold text-gray-900 cursor-pointer hover:text-primary transition-colors">
                                                                                {section.question}
                                                                            </summary>
                                                                            <p className="mt-3 text-gray-700 leading-relaxed">{section.answer}</p>
                                                                        </details>
                                                                    ) : null}
                                                                </div>
                                                            </section>
                                                        )
                                                    case 'toc':
                                                        const headings = post.blogStructure?.filter(s => s.type === 'heading' || s.type === 'subheading') || []
                                                        return (
                                                            <nav key={index} className="my-10 bg-gradient-to-r from-primary/10 to-primary-dark/10 rounded-xl p-6 border-l-4 border-primary">
                                                                <h3 className="text-xl font-bold text-gray-900 mb-4">Table of Contents</h3>
                                                                <ol className="list-decimal list-inside space-y-2">
                                                                    {headings.map((heading, headingIndex) => (
                                                                        <li key={headingIndex}>
                                                                            <a
                                                                                href={`#heading-${headingIndex}`}
                                                                                className="text-primary hover:text-primary-dark font-medium transition-colors"
                                                                            >
                                                                                {heading.text || heading.content}
                                                                            </a>
                                                                        </li>
                                                                    ))}
                                                                </ol>
                                                            </nav>
                                                        )
                                                    case 'related':
                                                        return (
                                                            <section key={index} className="my-10">
                                                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Related Content</h3>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {section.relatedLinks?.map((link, linkIndex) => (
                                                                        <Link
                                                                            key={linkIndex}
                                                                            href={link.url}
                                                                            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
                                                                        >
                                                                            <h4 className="font-semibold text-gray-900 mb-2 hover:text-primary transition-colors">
                                                                                {link.title}
                                                                            </h4>
                                                                            {link.description && (
                                                                                <p className="text-sm text-gray-600">{link.description}</p>
                                                                            )}
                                                                        </Link>
                                                                    ))}
                                                                </div>
                                                            </section>
                                                        )
                                                    default:
                                                        return null
                                                }
                                            })}
                                        </div>
                                    ) : (
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
                                    )}
                                </article>

                                {/* Share Section - Client Component */}
                                <ShareButtons currentUrl={currentUrl} postTitle={post.title} />
                            </div>

                            {/* Newsletter Subscription - Client Component */}
                            <NewsletterForm />

                            {/* Related Posts - Client Component */}
                            <RelatedPosts relatedPosts={relatedPosts} />
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    )
}
