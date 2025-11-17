'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

const blogPosts = [
  {
    id: 1,
    title: '10 Tips for Your First Solo Trip',
    description: 'Embark on your solo adventure with confidence. Here\'s what you need to know to make your first solo trip unforgettable.',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
    author: 'Sarah Johnson',
    date: 'March 15, 2024',
    category: 'Travel Tips',
    readTime: '5 min read',
    content: 'Traveling solo can be one of the most rewarding experiences. It teaches you independence, helps you discover yourself, and allows you to travel at your own pace. In this comprehensive guide, we\'ll cover everything from safety tips to making friends on the road.',
  },
  {
    id: 2,
    title: 'A Food Lover\'s Guide to Southeast Asia',
    description: 'Taste your way through the vibrant street food scenes of Thailand, Vietnam, and beyond.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    author: 'Michael Chen',
    date: 'March 10, 2024',
    category: 'Food & Culture',
    readTime: '7 min read',
    content: 'Southeast Asia is a paradise for food lovers. From the spicy curries of Thailand to the fresh spring rolls of Vietnam, every country offers unique flavors that will tantalize your taste buds.',
  },
  {
    id: 3,
    title: 'How to Plan a Stress-Free Family Vacation',
    description: 'Keep everyone happy with our top tips for planning a memorable family getaway.',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
    author: 'Emily Rodriguez',
    date: 'March 5, 2024',
    category: 'Family Travel',
    readTime: '6 min read',
    content: 'Planning a family vacation doesn\'t have to be stressful. With the right approach, you can create memories that last a lifetime while keeping everyone entertained and happy.',
  },
  {
    id: 4,
    title: 'Budget Travel: How to See the World on a Shoestring',
    description: 'Discover proven strategies for traveling the world without breaking the bank.',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
    author: 'David Kumar',
    date: 'February 28, 2024',
    category: 'Budget Travel',
    readTime: '8 min read',
    content: 'Traveling on a budget doesn\'t mean sacrificing experiences. Learn how to find cheap flights, affordable accommodations, and free activities that make your trip just as memorable.',
  },
  {
    id: 5,
    title: 'The Ultimate Packing List for Every Type of Trip',
    description: 'Never forget an essential item again with our comprehensive packing guides.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
    author: 'Lisa Wang',
    date: 'February 20, 2024',
    category: 'Travel Tips',
    readTime: '4 min read',
    content: 'Packing can make or break your trip. Whether you\'re heading to the beach, mountains, or city, we\'ve got the perfect packing list for you.',
  },
  {
    id: 6,
    title: 'Hidden Gems: Off-the-Beaten-Path Destinations in India',
    description: 'Explore lesser-known destinations that offer authentic experiences away from the crowds.',
    image: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80',
    author: 'Raj Patel',
    date: 'February 15, 2024',
    category: 'Destinations',
    readTime: '9 min read',
    content: 'India is full of hidden treasures waiting to be discovered. From remote hill stations to ancient temples, these destinations offer unique experiences without the tourist crowds.',
  },
]

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const categories = ['All', 'Travel Tips', 'Food & Culture', 'Family Travel', 'Budget Travel', 'Destinations']

  const filteredPosts = selectedCategory === 'All'
    ? blogPosts
    : blogPosts.filter(post => post.category === selectedCategory)

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Travel Blog & Guides
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover travel tips, destination guides, and inspiring stories to help you plan your next adventure.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 px-4 md:px-12 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 group"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-sm font-semibold text-primary">{post.category}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {post.author.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{post.author}</span>
                    </div>
                    <span className="text-primary font-semibold text-sm group-hover:underline">
                      Read More →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-600">Try selecting a different category</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}


