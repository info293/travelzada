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
                                    loading="lazy"
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
