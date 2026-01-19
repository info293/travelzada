'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type TabType = 'india' | 'international' | 'blogs'

interface BlogPost {
    id: string
    title: string
    slug?: string
    category?: string
}

export default function FooterSEO() {
    const [activeTab, setActiveTab] = useState<TabType>('india')
    const [blogs, setBlogs] = useState<BlogPost[]>([])

    const tabs: { id: TabType; label: string }[] = [
        { id: 'india', label: 'India Routes' },
        { id: 'international', label: 'International Routes' },
        { id: 'blogs', label: 'Travel Blogs' },
    ]

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                let querySnapshot;
                // 1. Try with published filter and sort
                try {
                    const q = query(
                        collection(db, 'blogs'),
                        where('published', '==', true),
                        orderBy('createdAt', 'desc')
                    );
                    querySnapshot = await getDocs(q);
                } catch (err) {
                    console.warn('FooterSEO: Sort query failed, trying partial...', err);
                    // 2. Try with published filter only
                    try {
                        const q = query(
                            collection(db, 'blogs'),
                            where('published', '==', true)
                        );
                        querySnapshot = await getDocs(q);
                    } catch (err2) {
                        console.warn('FooterSEO: Filter query failed, fetching all...', err2);
                        // 3. Fetch all and filter client-side
                        querySnapshot = await getDocs(collection(db, 'blogs'));
                    }
                }

                const blogData: BlogPost[] = []
                querySnapshot.forEach((doc) => {
                    const data = doc.data()
                    // Client-side compatibility check
                    if (data.published === true || data.published === undefined) {
                        blogData.push({
                            id: doc.id,
                            title: data.title,
                            slug: data.slug,
                            category: data.category
                        } as BlogPost)
                    }
                })

                // If we fell back to fetching all, we might need manual sort here
                // but for footer links, exact order isn't critical, just presence.

                // Only use static fallback if we TRULY have 0 docs from DB
                if (blogData.length === 0) {
                    // Keep existing fallback logic as safety net
                    blogData.push(
                        { id: '1', title: 'Top 10 Places to Visit in Kashmir', slug: 'top-10-places-kashmir', category: 'Destinations' },
                        { id: '2', title: 'Why Kerala is God\'s Own Country', slug: 'why-kerala-gods-own-country', category: 'Culture' },
                        { id: '3', title: 'Ultimate Guide to Bali Nightlife', slug: 'bali-nightlife-guide', category: 'Nightlife' },
                        { id: '4', title: 'Best Time to Visit Ladakh', slug: 'best-time-visit-ladakh', category: 'Tips' }
                    )
                }

                setBlogs(blogData)
            } catch (error) {
                console.error('Error fetching footer blogs:', error)
                // Fallback on catastrophic error
                setBlogs([
                    { id: '1', title: 'Top 10 Places to Visit in Kashmir', slug: 'top-10-places-kashmir', category: 'Destinations' },
                    { id: '2', title: 'Why Kerala is God\'s Own Country', slug: 'why-kerala-gods-own-country', category: 'Culture' },
                    { id: '3', title: 'Ultimate Guide to Bali Nightlife', slug: 'bali-nightlife-guide', category: 'Nightlife' },
                    { id: '4', title: 'Best Time to Visit Ladakh', slug: 'best-time-visit-ladakh', category: 'Tips' }
                ])
            }
        }
        fetchBlogs()
    }, [])

    const getBlogUrl = (post: BlogPost) => {
        const category = post.category ? post.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'general'
        const slug = post.slug || post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        return `/blog/${category}/${slug}`
    }

    const links = {
        india: [
            { name: 'Kashmir from Delhi', url: '/destinations/kashmir/tours/from-delhi' },
            { name: 'Kashmir from Mumbai', url: '/destinations/kashmir/tours/from-mumbai' },
            { name: 'Kashmir from Bangalore', url: '/destinations/kashmir/tours/from-bangalore' },
            { name: 'Kashmir from Kolkata', url: '/destinations/kashmir/tours/from-kolkata' },
            { name: 'Kashmir from Chennai', url: '/destinations/kashmir/tours/from-chennai' },
            { name: 'Kashmir from Hyderabad', url: '/destinations/kashmir/tours/from-hyderabad' },
            { name: 'Kerala from Delhi', url: '/destinations/kerala/tours/from-delhi' },
            { name: 'Kerala from Mumbai', url: '/destinations/kerala/tours/from-mumbai' },
            { name: 'Kerala from Bangalore', url: '/destinations/kerala/tours/from-bangalore' },
            { name: 'Kerala from Kolkata', url: '/destinations/kerala/tours/from-kolkata' },
            { name: 'Kerala from Chennai', url: '/destinations/kerala/tours/from-chennai' },
            { name: 'Kerala from Hyderabad', url: '/destinations/kerala/tours/from-hyderabad' }
        ],
        international: [
            { name: 'Bali from Delhi', url: '/destinations/bali/tours/from-delhi' },
            { name: 'Bali from Mumbai', url: '/destinations/bali/tours/from-mumbai' },
            { name: 'Bali from Bangalore', url: '/destinations/bali/tours/from-bangalore' },
            { name: 'Baku from Delhi', url: '/destinations/baku/tours/from-delhi' },
            { name: 'Baku from Mumbai', url: '/destinations/baku/tours/from-mumbai' },
            { name: 'Phuket-Krabi from Delhi', url: '/destinations/phuket-krabi/tours/from-delhi' },
            { name: 'Phuket-Krabi from Mumbai', url: '/destinations/phuket-krabi/tours/from-mumbai' },
            { name: 'Phuket-Krabi from Bangalore', url: '/destinations/phuket-krabi/tours/from-bangalore' },
            { name: 'Phuket-Krabi from Kolkata', url: '/destinations/phuket-krabi/tours/from-kolkata' }
        ]
    }

    return (
        <div className="w-full border-b border-white/10 pb-8 mb-12">
            {/* Tabs */}
            <div className="flex flex-wrap gap-6 mb-6 border-b border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === tab.id
                            ? 'text-white border-b-2 border-primary'
                            : 'text-white/60 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                {activeTab === 'blogs' ? (
                    blogs.length > 0 ? (
                        blogs.map((blog) => (
                            <Link
                                key={blog.id}
                                href={getBlogUrl(blog)}
                                className="text-white/50 hover:text-primary text-[13px] transition-colors line-clamp-1"
                                title={blog.title}
                            >
                                {blog.title}
                            </Link>
                        ))
                    ) : (
                        <p className="text-white/30 text-sm col-span-full">Loading blogs or no blogs...</p>
                    )
                ) : (
                    links[activeTab].map((link, index) => (
                        <Link
                            key={index}
                            href={link.url}
                            className="text-white/50 hover:text-primary text-[13px] transition-colors line-clamp-1"
                        >
                            {link.name}
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
