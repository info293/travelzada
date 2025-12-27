import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
    title: 'Case Studies | Success Stories from Travelzada',
    description: 'Read real stories of how Travelzada helps couples plan thoughtful, stress-free trips.',
    keywords: 'Travelzada reviews, customer stories, travel case studies, couple travel reviews, corporate travel planning',
    alternates: {
        canonical: '/case-study',
    },
    openGraph: {
        title: 'Case Studies | Success Stories from Travelzada',
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
                description: 'Case study on independent referrals building confidence.'
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

            {/* Hero / Header Section */}
            <section className="relative py-20 px-4 md:px-12 bg-[#fcfcfc] border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 mb-6">
                        Case Studies
                    </h1>
                    <p className="text-lg text-gray-600">
                        Real stories of how Travelzada helps travelers every day.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 md:px-12 py-16 space-y-24">

                {/* Case Study 1 */}
                <section className="space-y-6">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wide">Case Study 1</span>
                    <h2 className="text-3xl font-serif font-bold text-gray-900">
                        “Why Some Couples Don’t Even Compare Anymore”
                    </h2>

                    <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4">
                        <p>
                            Mr. Gyan Prakash Srivastava & Mrs. Ranjana Srivastava first found Travelzada while planning a short couple trip.
                        </p>
                        <p>
                            They booked once.
                        </p>
                        <p>
                            Then again.
                        </p>
                        <p>
                            Then I started recommending it to friends.
                        </p>
                        <p>
                            Today, they along with couples like Mr. Karmveer Singh & Mrs. Aaditi Gupta and Mr. Harsh Jhalani & Ms. Tulsi Dangayach and Mr Navin Goyal & Mrs Charu Goyal either book or refer a trip every few months.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">What usually went wrong earlier</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>Before Travelzada, planning felt tiring.</p>
                            <p>They would:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>read long itineraries they didn’t fully understand</li>
                                <li>wonder why certain hotels were chosen</li>
                                <li>struggle to get answers once the trip started</li>
                            </ul>
                            <p className="italic pt-2">
                                As one of them put it: <br />
                                <span className="font-semibold">“Everything looked fine on paper, but we never felt fully confident.”</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">What felt different this time</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>With Travelzada, the experience felt calmer.</p>
                            <p>Instead of being sent multiple options, they were:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>walked through the itinerary step by step</li>
                                <li>told why each hotel or activity made sense</li>
                                <li>assured that help was just one call away</li>
                            </ul>
                            <p>
                                We took around 20 minutes to patiently explain the entire itinerary. The package was roughly ₹3,000 more expensive than other options, but once we broke down the pricing, the couple understood why the extra cost was worth it. During one trip, they had a small on-ground issue and called someone actually answered and fixed it. That moment built trust.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">Why they keep coming back</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>They don’t feel the need to re-check five websites anymore.</p>
                            <p className="italic pt-2">
                                As they said: <br />
                                <span className="font-semibold">“We already know what we’ll get. That peace of mind matters more than discounts.”</span>
                            </p>
                        </div>
                    </div>
                </section>

                <div className="w-full h-px bg-gray-200"></div>

                {/* Case Study 2 */}
                <section className="space-y-6">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wide">Case Study 2</span>
                    <h2 className="text-3xl font-serif font-bold text-gray-900">
                        “We Wanted Understanding, Not Just a Quote”
                    </h2>

                    <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4">
                        <p>
                            Shubham and his group was planning a corporate tour to Baku.
                        </p>
                        <p>
                            They did what most companies do - compared multiple travel brands.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">What didn’t work elsewhere</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>Most options looked similar:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>long PDFs</li>
                                <li>fixed plans</li>
                                <li>very little explanation</li>
                            </ul>
                            <p className="pt-2">They weren’t sure:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>why certain hotels were selected</li>
                                <li>bad flights were offered</li>
                                <li>whether transfers were comfortable</li>
                                <li>if the itinerary matched their group’s pace</li>
                            </ul>
                            <p className="italic pt-2">
                                It felt like: <br />
                                <span className="font-semibold">“Here’s the package. Take it or leave it.”</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">What Travelzada did instead</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>Travelzada started with questions, not pricing.</p>
                            <p>They:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>explained the itinerary in plain language</li>
                                <li>suggested upgrades like Mercedes transfers where it made sense</li>
                                <li>gave honest advice about food options and local logistics</li>
                                <li>adjusted plans instead of pushing fixed templates</li>
                            </ul>
                            <p>The group finally understood what they were paying for.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">The decision</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>Even after comparing prices, they chose Travelzada.</p>
                            <p>Not because it was the cheapest but because it felt thought-through.</p>
                        </div>
                    </div>
                </section>

                <div className="w-full h-px bg-gray-200"></div>

                {/* Case Study 3 */}
                <section className="space-y-6">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wide">Case Study 3</span>
                    <h2 className="text-3xl font-serif font-bold text-gray-900">
                        “When Everyone You Ask Says the Same Name”
                    </h2>

                    <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4">
                        <p>
                            Mr. Garg and Ms. Gupta were planning a Bali trip for their honeymoon.
                        </p>
                        <p>
                            They heard about Travelzada through a referral.
                        </p>
                        <p>
                            Pulkit was ready to book.
                        </p>
                        <p>
                            Ms. Gupta wanted to compare with a few offline agents first just to be safe.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">What happened next</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>They casually asked friends for suggestions.</p>
                            <p>To their surprise, most of them mentioned Travelzada independently.</p>
                            <p>At the same time, other agents they spoke to:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>shared generic itineraries</li>
                                <li>rushed through explanations</li>
                                <li>couldn’t clearly answer “why this plan?”</li>
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">What built confidence</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>With Travelzada, the conversations felt different.</p>
                            <p>They:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>understood the flow of the trip</li>
                                <li>knew what each day was for</li>
                                <li>felt no pressure to book immediately</li>
                            </ul>
                            <p className="italic pt-2">
                                As Ms. Gupta later said: <br />
                                <span className="font-semibold">“It didn’t feel like we were being sold to. It felt like someone was planning with us.”</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">Final choice</h3>
                        <div className="prose prose-lg text-gray-600 leading-relaxed">
                            <p>By the end, comparing more felt unnecessary.</p>
                            <p>Trust had already been built.</p>
                        </div>
                    </div>
                </section>

            </div>
            <Footer />
        </main>
    )
}
