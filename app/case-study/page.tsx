import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'Customer Stories | Why Couples Trust Travelzada',
    description: 'Read real stories of how Travelzada helps couples plan thoughtful, stress-free trips. From repeated bookings to corporate clarity.',
    keywords: 'Travelzada reviews, customer stories, travel case studies, couple travel reviews, corporate travel planning, Travelzada testimonials',
    alternates: {
        canonical: '/case-study',
    },
    openGraph: {
        title: 'Customer Stories | Why Couples Trust Travelzada',
        description: 'Read real stories of how Travelzada helps couples plan thoughtful, stress-free trips.',
        type: 'website',
        url: 'https://www.travelzada.com/case-study',
        siteName: 'Travelzada',
        images: [
            {
                url: '/images/logo/Travelzada Logo April (1).png',
                width: 1200,
                height: 630,
                alt: 'Travelzada Success Stories',
            },
        ],
    },
}

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Customer Stories',
    description: 'A collection of case studies and success stories from Travelzada customers.',
    mainEntity: {
        '@type': 'ItemList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Why Some Couples Don’t Even Compare Anymore',
                description: 'Case study on repeat customers and built trust.'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'We Wanted Understanding, Not Just a Quote',
                description: 'Case study on corporate travel clarity for Shubham Group.'
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: 'When Everyone You Ask Says the Same Name',
                description: 'Case study on independent referrals impacting decision making.'
            }
        ]
    }
}

export default function CaseStudyPage() {
    return (
        <main className="min-h-screen bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Header />

            {/* Hero Section */}
            <section className="relative py-24 md:py-32 px-4 md:px-12 bg-gradient-to-b from-purple-50 via-white to-white overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">Success Stories</span>
                    <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight text-gray-900">
                        Trust is Built on <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">Results.</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Real stories of couples and groups who moved from confusion to confidence.
                    </p>
                </div>
            </section>

            {/* Content Container */}
            <div className="max-w-5xl mx-auto px-4 md:px-12 py-16 md:py-24 space-y-32">

                {/* Case Study 1: Loyalty */}
                <section className="relative group">
                    <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent -ml-8"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-5">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wide mb-6">Case Study 01</div>
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 leading-tight">
                                "Why Some Couples Don’t Even Compare Anymore"
                            </h2>
                            <p className="text-lg text-gray-600 mb-8 italic">
                                Repeat Customers & The Compound Effect of Trust
                            </p>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8">
                                <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase">The People</h4>
                                <ul className="space-y-3 text-gray-700 text-sm">
                                    <li className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                        Mr. Gyan Prakash Srivastava & Mrs. Ranjana Srivastava
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                        Mr. Karmveer Singh & Mrs. Aaditi Gupta
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                        Mr. Harsh Jhalani & Ms. Tulsi Dangayach
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                        Mr. Navin Goyal & Mrs. Charu Goyal
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="lg:col-span-7 space-y-8">
                            <div className="prose prose-lg text-gray-600">
                                <p>
                                    They booked once. Then again. Then they started recommending it to friends. Today, these couples either book or refer a trip every few months.
                                </p>
                            </div>

                            {/* Problem vs Solution Card */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <span className="text-red-500 text-xl">✕</span> Earlier
                                    </h4>
                                    <ul className="text-sm text-gray-600 space-y-2">
                                        <li>• Read long itineraries they didn’t understand</li>
                                        <li>• Wondered why hotels were chosen</li>
                                        <li>• Struggled to get answers mid-trip</li>
                                    </ul>
                                    <p className="mt-4 text-xs italic text-gray-500">"Everything looked fine on paper, but we never felt fully confident."</p>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-lg border border-green-100 relative overflow-hidden transform md:-translate-y-4 transition-transform duration-300">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <span className="text-green-500 text-xl">✓</span> With Travelzada
                                    </h4>
                                    <ul className="text-sm text-gray-600 space-y-2">
                                        <li>• Walked through step-by-step</li>
                                        <li>• Explained "Why" each hotel makes sense</li>
                                        <li>• Assured help was one call away</li>
                                    </ul>
                                    <p className="mt-4 text-xs italic text-gray-500">"We already know what we’ll get. That peace of mind matters more than discounts."</p>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-6 rounded-xl text-blue-900 text-sm">
                                <strong>The Trust Moment:</strong> During one trip, they had a small on-ground issue and called — someone actually answered and fixed it immediately. That built lifelong trust.
                            </div>
                        </div>
                    </div>
                </section>

                {/* Case Study 2: Clarity */}
                <section className="relative">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 order-2 lg:order-1">
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                                    <span className="font-serif italic text-lg text-gray-900">"We Wanted Understanding, Not Just a Quote"</span>
                                    <span className="text-sm text-gray-500">Shubham Group • Baku Tour</span>
                                </div>
                                <div className="p-8">
                                    <div className="space-y-8">
                                        <div>
                                            <h5 className="font-bold text-gray-900 mb-3">The Usual Experience (Others)</h5>
                                            <div className="flex gap-4 overflow-x-auto pb-2">
                                                <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm whitespace-nowrap">Long PDFs</span>
                                                <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm whitespace-nowrap">Fixed Plans</span>
                                                <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm whitespace-nowrap">"Take it or leave it"</span>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute left-6 top-0 bottom-0 w-px bg-primary/30"></div>
                                            <h5 className="font-bold text-gray-900 mb-4 pl-10 relative">
                                                <span className="absolute left-0 top-0 w-3 h-3 rounded-full bg-primary mt-1.5"></span>
                                                The Travelzada Difference
                                            </h5>
                                            <ul className="space-y-4 pl-10 text-gray-600">
                                                <li className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 text-sm">Plain Language Explanations</span>
                                                    <span className="text-sm">Explained exactly what they were paying for.</span>
                                                </li>
                                                <li className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 text-sm">Smart Upgrades</span>
                                                    <span className="text-sm">Suggested Mercedes transfers where it made sense for comfort.</span>
                                                </li>
                                                <li className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 text-sm">Honest Advice</span>
                                                    <span className="text-sm">Real talk about food options and local logistics.</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100 text-center">
                                            <p className="text-lg font-bold text-gray-900">The Decision:</p>
                                            <p className="text-gray-600">"Not because it was the cheapest — but because it felt thought-through."</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 order-1 lg:order-2">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">Case Study 02</div>
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 leading-tight">
                                Information Overload vs. True Clarity
                            </h2>
                            <p className="text-lg text-gray-600">
                                Shubham Group compared multiple brands for a corporate tour to Baku. Most sent confusing PDFs with bad flights and zero explanation.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Case Study 3: Referral */}
                <section className="relative">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-5">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wide mb-6">Case Study 03</div>
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 leading-tight">
                                "When Everyone You Ask Says the Same Name"
                            </h2>
                            <p className="text-lg text-gray-600 mb-6">
                                Mr. Garg and Ms. Gupta (Honeymoon to Bali).
                            </p>
                            <div className="prose prose-gray text-gray-600">
                                <p>
                                    Pulkit was ready to book, but Ms. Gupta wanted to compare offline agents first. They casually asked friends for suggestions.
                                </p>
                                <p className="font-bold text-gray-900">
                                    To their surprise, most friends mentioned Travelzada — independently.
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-7">
                            <div className="bg-gradient-to-br from-purple-50 to-white p-8 md:p-12 rounded-[2rem] border border-purple-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200 rounded-full blur-[50px] -mr-10 -mt-10"></div>

                                <h3 className="text-2xl font-bold text-gray-900 mb-8 relative z-10">What Built Confidence?</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-10">
                                    <div className="bg-white p-5 rounded-xl shadow-sm">
                                        <div className="text-2xl mb-2">🧠</div>
                                        <h5 className="font-bold text-gray-900 text-sm">Understood the Flow</h5>
                                        <p className="text-xs text-gray-500 mt-1">Knew exactly what each day was for.</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl shadow-sm">
                                        <div className="text-2xl mb-2">😌</div>
                                        <h5 className="font-bold text-gray-900 text-sm">No Pressure</h5>
                                        <p className="text-xs text-gray-500 mt-1">Felt no urgency to "book now or lose it".</p>
                                    </div>
                                </div>

                                <blockquote className="relative z-10 border-l-4 border-purple-500 pl-6 py-2">
                                    <p className="text-xl md:text-2xl font-serif italic text-gray-800 leading-relaxed">
                                        "It didn’t feel like we were being sold to. It felt like someone was planning with us."
                                    </p>
                                    <footer className="mt-4 text-sm font-bold text-gray-600">— Ms. Gupta</footer>
                                </blockquote>

                                <div className="mt-8 text-center">
                                    <p className="text-purple-900 font-medium">Result: Trust was built. Comparing more felt unnecessary.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="text-center py-16 border-t border-gray-100">
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Ready to write your own story?</h2>
                    <a href="/ai-planner" className="inline-block px-8 py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all transform">
                        Start Planning Now
                    </a>
                </section>

            </div>
            <Footer />
        </main>
    )
}
