'use client'

import React from 'react'

const destinations = [
    {
        name: 'Bali',
        description: 'Tropical paradise with beaches, temples, and lush rice terraces.',
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=80',
        tag: 'Island Bliss',
    },
    {
        name: 'Dubai',
        description: 'Futuristic cityscapes, desert safaris, and luxury shopping.',
        image: 'https://images.unsplash.com/photo-1512453979798-5ea904acfb5b?w=900&q=80',
        tag: 'Desert Luxury',
    },
    {
        name: 'Singapore',
        description: 'Modern marvels, vibrant gardens, and culinary delights.',
        image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=900&q=80',
        tag: 'Urban Oasis',
    },
    {
        name: 'Thailand',
        description: 'Golden temples, bustling markets, and pristine islands.',
        image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=900&q=80',
        tag: 'Cultural Wonders',
    },
]

export default function ExploreInternational() {
    return (
        <section className="py-18 md:py-24 px-4 md:px-12 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-xs uppercase tracking-widest text-blue-600 font-semibold">Global Getaways</span>
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
                        International Destinations
                    </h2>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                        Discover the world's most enchanting places, curated for unforgettable experiences.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {destinations.map((destination) => (
                        <div
                            key={destination.name}
                            className="relative rounded-[28px] overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                        >
                            <div
                                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                                style={{ backgroundImage: `url(${destination.image})` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10"></div>
                            </div>
                            <div className="relative z-10 p-8 md:p-10 flex flex-col justify-between h-full min-h-[360px] text-white">
                                <div className="space-y-4">
                                    <span className="inline-flex bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs tracking-wide uppercase border border-white/30">
                                        {destination.tag}
                                    </span>
                                    <h3 className="text-3xl font-semibold">{destination.name}</h3>
                                    <p className="text-sm md:text-base text-white/90 font-medium">{destination.description}</p>
                                </div>
                                <div className="flex items-center justify-between pt-6 border-t border-white/20 mt-6 text-sm">
                                    <p className="text-white/80">Multiple packages available</p>
                                    <a href={`/destinations/${destination.name.toLowerCase()}`} className="text-white font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                                        Explore
                                        <span className="text-lg">→</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
