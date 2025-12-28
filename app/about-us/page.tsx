import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'About Travelzada | The Story Behind Travelzada',
    description: 'Travelzada is a couple-focused travel company building thoughtful, fairly priced, and emotionally satisfying travel experiences.',

    keywords: 'Travelzada, about us, couple travel, honeymoon planning, AI travel planner, Jaipur travel agency, Sadaya Trips LLP, personalized travel itineraries',
    alternates: {
        canonical: '/about-us',
    },
    openGraph: {
        title: 'About Travelzada | The Story Behind Travelzada',
        description: 'Travelzada is a couple-focused travel company building thoughtful, fairly priced, and emotionally satisfying travel experiences.',
        type: 'website',
        url: 'https://www.travelzada.com/about-us',
        siteName: 'Travelzada',
        locale: 'en_US',
        images: [
            {
                url: '/images/logo/Travelzada Logo April (1).png',
                width: 1200,
                height: 630,
                alt: 'Travelzada Logo',
            },
        ],
    },
}

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    mainEntity: {
        '@type': 'Organization',
        name: 'Travelzada',
        legalName: 'Sadaya Trips LLP',
        url: 'https://www.travelzada.com',
        logo: 'https://www.travelzada.com/images/logo/Travelzada%20Logo%20April%20(1).png',
        foundingDate: '2023',
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Plot No. 18, Friends Colony, Malviya Nagar',
            addressLocality: 'Jaipur',
            postalCode: '302017',
            addressCountry: 'IN'
        },
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+919929962350',
            contactType: 'customer support',
            email: 'info@travelzada.com'
        }
    }
}

// Reusing the SparkleIcon for consistency if needed, though the text content is priority now.
const SparkleIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
    <span
        className={`${className} inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm animate-pulse`}
    />
)

export default function AboutUsPage() {
    return (
        <main className="min-h-screen bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Header />

            {/* Hero / Intro Section */}
            <section className="relative py-20 px-4 md:px-12 bg-[#fcfcfc] border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center space-y-8">

                    <div className="space-y-6">
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">About Travelzada</h1>
                        <div className="prose prose-lg mx-auto text-gray-600 leading-relaxed text-justify">
                            <p>
                                Travelzada is a unit of Sadaya Trips LLP , building couple-focused travel experiences for a little over one year now.
                            </p>
                            <p>
                                The name “Travelzada” comes from a simple idea - travel more but in a way that actually feels worth it, not rushed, not confusing. We exist to help couples plan trips that feel thoughtfully designed, fairly priced, and emotionally satisfying.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Sections */}
            <section className="py-16 px-4 md:px-12">
                <div className="max-w-4xl mx-auto space-y-20">

                    {/* The Story */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-gray-900">The Story Behind Travelzada (and Why It Exists)</h2>
                        <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4 text-justify">
                            <p>
                                Travelzada was founded by Rishabh Khandelwal (<a href="https://www.linkedin.com/in/rishabhk108/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>)
                            </p>
                            <p>
                                Rishabh studied engineering at Manipal University, Jaipur, and spent close to 8 years working across consumer and travel companies like Blinkit, MakeMyTrip, and OYO. His work gave him deep exposure to how travel is priced, packaged, sold, and delivered at scale.
                            </p>
                            <p>
                                But travel was never just work for him.
                            </p>
                            <p>
                                He was always the person friends turned to when planning trips, especially couple trips and honeymoons. He helped them build itineraries, avoided bad flight timings, suggested sensible hotel locations, and often fixed plans that felt rushed or poorly thought through.
                            </p>
                            <p>
                                One day, a couple reached out to plan their trip. They had already spoken to multiple travel companies and collected several itineraries. On paper, everything looked fine. But nothing felt right.
                            </p>
                            <p>
                                As we reviewed the options together, the gaps were clear.
                            </p>
                            <p>
                                One itinerary looked cheaper, but it included off-hour flights that would leave the couple exhausted on arrival. Another was overstuffed with activities, making the trip hectic, overpriced, and leaving no time to actually enjoy being together.
                            </p>
                            <p>
                                Over time, a clear pattern emerged.
                            </p>
                            <p>
                                Most travel companies were focused on selling something quickly, not on thinking deeply about whether the itinerary actually made sense for the customer.
                            </p>
                        </div>
                    </div>

                    {/* The Problem */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-gray-900">The Problem</h2>
                        <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4">
                            <p>
                                Couples today aren’t short on travel options. They’re overwhelmed by them.
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>juggling multiple tabs and PDFs</li>
                                <li>delaying decisions because nothing felt right</li>
                                <li>panicking as prices changed</li>
                                <li>finally booking out of fatigue, not confidence</li>
                            </ul>
                            <p>
                                Everyone wanted to travel more, but confusion always got in the way.
                            </p>
                            <p>
                                That gap is where Travelzada was born.
                            </p>
                        </div>
                    </div>

                    {/* Why Book with Travelzada */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-gray-900">Why Book Your Couple Trip with Travelzada</h2>
                        <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4 text-justify">
                            <p>
                                We’re upfront about one thing - we are not the biggest travel company in the market (yet). We focus on planning trips that actually make sense for couples.
                            </p>
                            <p>
                                Here’s how we’re different:
                            </p>
                            <ul className="grid gap-4 md:grid-cols-2">
                                <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                                    <span className="text-primary mt-1">✓</span>
                                    <span>No dozens of packages—only the best-fit options</span>
                                </li>
                                <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                                    <span className="text-primary mt-1">✓</span>
                                    <span>Clear explanations, not confusing PDFs</span>
                                </li>
                                <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                                    <span className="text-primary mt-1">✓</span>
                                    <span>Comfort and pacing over packed itineraries</span>
                                </li>
                                <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                                    <span className="text-primary mt-1">✓</span>
                                    <span>Thoughtful flight timings and hotel locations</span>
                                </li>
                                <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                                    <span className="text-primary mt-1">✓</span>
                                    <span>Value for money, not just lower prices</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* How We Use AI & Technology */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-gray-900">How We Use AI & Technology</h2>
                        <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4 text-justify">
                            <p>
                                Travel planning today suffers from information overload. Our technology is built to reduce that.
                            </p>
                            <p>
                                Travelzada uses an AI-driven chat interface where couples share:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>destination preferences</li>
                                <li>travel dates</li>
                                <li>trip duration</li>
                                <li>hotel comfort level</li>
                            </ul>
                            <p>
                                Based on this, our system shortlists only the best two itinerary options.
                            </p>
                            <p>
                                Once a couple drops a lead, a real travel expert steps in to:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>refine the itinerary</li>
                                <li>suggest smarter alternatives</li>
                                <li>make small custom changes</li>
                                <li>finalise a plan that actually works</li>
                            </ul>
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex flex-col md:flex-row gap-6 md:items-center mt-6">
                                <SparkleIcon className="w-10 h-10 shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-900 text-lg">AI helps cut the noise.</p>
                                    <p className="font-bold text-indigo-600 text-lg">Humans ensure the plan feels right.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Who Travelzada Is Built For */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-gray-900">Who Travelzada Is Built For</h2>
                        <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4 text-justify">
                            <p>
                                Travelzada is designed exclusively for couples:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Honeymoon couples</li>
                                <li>Married couples</li>
                                <li>Dating or live-in couples</li>
                            </ul>
                            <p>
                                Typically between 25–40 years, who value:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>comfort over chaos</li>
                                <li>thoughtful planning over impulsive booking</li>
                                <li>emotional satisfaction over flashy inclusions</li>
                            </ul>
                            <p className="font-medium text-gray-900 italic pt-4">
                                If you want your trip to feel worth it, you’re our kind of traveller.
                            </p>
                        </div>
                    </div>

                    {/* Our Philosophy */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-gray-900">Our Philosophy</h2>
                        <div className="prose prose-lg text-gray-600 leading-relaxed space-y-4 text-justify">
                            <p>
                                Travel is a high ticket-size decision.
                            </p>
                            <p>
                                It involves money, time, emotions, and expectations.
                            </p>
                            <p>
                                At Travelzada, we believe couples should feel confident and happy about where their money and time are going. The trip should feel meaningful, not transactional.
                            </p>
                            <p className="font-medium text-gray-900 text-xl">
                                That feeling matters to us more than anything else.
                            </p>
                        </div>
                    </div>

                    {/* Company Details */}
                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 md:p-12 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-serif font-bold text-gray-900">Built from Jaipur, for Couples Everywhere</h2>
                            <p className="text-lg text-gray-600">
                                Travelzada is proudly built from Jaipur, India, with a deep focus on operations, planning, and real-world execution.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 pt-4">
                            <div>
                                <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-sm">Company Details</h3>
                                <div className="space-y-2 text-gray-600">
                                    <p className="font-semibold text-gray-900">Sadaya Trips LLP</p>
                                    <p>LLP Number: ACH-0386</p>
                                    <p>GST Number: 08AFHFS4668E1ZN</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-sm">Contact & Address</h3>
                                <div className="space-y-2 text-gray-600">
                                    <p>Email ID : <a href="mailto:info@travelzada.com" className="text-primary hover:underline">info@travelzada.com</a></p>
                                    <p>Contact Number : <a href="tel:+919929962350" className="text-primary hover:underline">+91 9929962350</a></p>
                                    <div className="mt-4">
                                        <p className="font-semibold text-gray-900">SADAYA TRIPS LLP</p>
                                        <p>PLOT NO. 18, FRIENDS COLONY, MALVIYA NAGAR,</p>
                                        <p>Malviya Nagar (Jaipur), Malviya Nagar Police Station,</p>
                                        <p>Jaipur – 302017, Rajasthan, India</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-200">
                            <p className="text-lg text-gray-600 italic">
                                We may be based in Jaipur, but we plan trips for couples across destinations - carefully, thoughtfully, and honestly.
                            </p>
                        </div>
                    </div>

                    <div className="text-center pt-8">
                        <p className="text-3xl md:text-4xl font-serif font-bold text-gray-900 italic">
                            Time to Travelzada - with your better half.
                        </p>
                    </div>

                </div>
            </section>

            <Footer />
        </main>
    )
}
