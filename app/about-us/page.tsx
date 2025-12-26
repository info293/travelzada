import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'About Travelzada | Our Story & Philosophy',
    description: 'Travelzada is a couple-focused travel company building thoughtful, fairly priced, and emotionally satisfying travel experiences.',
    keywords: 'Travelzada, about us, couple travel, honeymoon planning, AI travel planner, Jaipur travel agency, Sadaya Trips LLP, personalized travel itineraries',
    alternates: {
        canonical: '/about-us',
    },
    openGraph: {
        title: 'About Travelzada | Our Story & Philosophy',
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

// The specific AI logo component used in the header/planner
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

            {/* Hero Section */}
            <section className="relative py-20 md:py-32 px-4 md:px-12 bg-[#fcfcfc] overflow-hidden">
                {/* Abstract Background Blobs - similar to AI Planner */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

                <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center">
                    <span className="text-gray-500 font-medium tracking-[0.2em] text-sm uppercase mb-8">A Unit of Sadaya Trips LLP</span>

                    {/* Main Logo */}
                    <div className="relative w-64 md:w-80 h-24 mb-6">
                        <Image
                            src="/images/logo/Travelzada Logo April (1).png"
                            alt="Travelzada"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>

                    <div className="w-16 h-1 bg-gradient-to-r from-primary to-primary-light rounded-full mb-8"></div>

                    <h1 className="text-2xl md:text-3xl lg:text-4xl text-gray-800 leading-relaxed max-w-3xl font-serif">
                        "Travel more, but in a way that actually feels worth it. <br className="hidden md:block" />
                        <span className="text-primary italic">Not rushed. Not confusing. Just right.</span>"
                    </h1>
                </div>
            </section>

            {/* Story Content */}
            <section className="py-16 md:py-24 px-4 md:px-12">
                <div className="max-w-6xl mx-auto space-y-32">

                    {/* Section 1: The Story (Offset Layout) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative">
                        {/* Left Text */}
                        <div className="lg:col-span-5 relative z-10">
                            <span className="text-primary font-bold text-sm tracking-wider uppercase mb-3 block">The Beginning</span>
                            <h2 className="text-4xl font-bold text-gray-900 mb-6 font-serif leading-tight">It Started With a Problem.</h2>
                            <div className="prose prose-lg text-gray-600 space-y-6">
                                <p>
                                    Travelzada was founded by <strong className="text-gray-900">Rishabh Khandelwal</strong>, an engineer from Manipal University, Jaipur, with 8 years of experience at companies like <strong>Blinkit, MakeMyTrip, and OYO</strong>.
                                </p>
                                <p>
                                    He saw the backend of travel—how it’s priced, packaged, and sold. But he also saw the human side. Friends constantly asked him to fix itineraries that were "fine on paper" but terrible in reality.
                                </p>
                                <p>
                                    The breaking point came when a couple showed him their honeymoon plan. It was cheap, but it had them flying at 3 AM and running around like backpackers. It wasn't a trip; it was a task list.
                                </p>
                            </div>
                        </div>

                        {/* Right Floating Card */}
                        <div className="lg:col-span-6 lg:col-start-7 lg:mt-12">
                            <div className="bg-gray-50 p-8 md:p-12 rounded-3xl border border-gray-100 relative shadow-xl">
                                <div className="absolute -top-6 -left-6 w-12 h-12 bg-primary text-white flex items-center justify-center rounded-full text-2xl shadow-lg">❝</div>
                                <p className="text-xl md:text-2xl text-gray-700 italic font-serif leading-relaxed mb-6">
                                    Most travel companies were focused on selling something quickly, not on thinking deeply about whether the itinerary actually made sense for the customer.
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden relative">
                                        {/* Placeholder avatar or just initials */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-300 text-gray-500 font-bold">RK</div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Rishabh Khandelwal</p>
                                        <p className="text-sm text-gray-500">Founder</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Why Book With Us (Intersecting Cards) */}
                    <div className="relative">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold text-gray-900 mb-4 font-serif">Why Choose Travelzada?</h2>
                            <p className="text-gray-600">We aren't the biggest, but we plan with the most heart.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                            {/* Card 1 */}
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🔍</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Clear & Honest</h3>
                                <p className="text-gray-600">No confusing PDFs or hidden clauses. We explain exactly what you get and why it matters.</p>
                            </div>

                            {/* Card 2 (Elevated) */}
                            <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-xl md:-mt-8 md:mb-8 transform md:scale-105 relative z-10 border border-gray-200">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-2xl mb-6">✨</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Thoughtful Pacing</h3>
                                <p className="text-gray-600">We prioritize comfort. Sensible flight timings and hotels that put you in the heart of the action, not miles away.</p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">💎</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Value {'>'} Price</h3>
                                <p className="text-gray-600">We don't sell the "cheapest" bad trip. We sell the best experience for your budget.</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: AI + Human (The "AI Logo" Section) */}
                    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[40px] p-8 md:p-16 border border-indigo-100 overflow-hidden relative">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-indigo-200/20 rounded-full blur-3xl -mr-20 -mt-20"></div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <SparkleIcon className="w-8 h-8 md:w-10 md:h-10" />
                                    <span className="text-sm font-bold uppercase tracking-wider text-purple-600">Our Technology</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-serif">
                                    AI Cuts the Noise. <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Humans Ensure Perfection.</span>
                                </h2>
                                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                    Travel planning suffers from information overload. We fixed that. Our AI instantly shortlists the best hotels and routes based on your vibe. Then, a real expert refines it to perfection.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-sm border border-gray-100">
                                        <span className="font-bold text-gray-900">30 Seconds</span>
                                        <span className="text-gray-500 text-sm">to plan</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-sm border border-gray-100">
                                        <span className="font-bold text-gray-900">100%</span>
                                        <span className="text-gray-500 text-sm">Personalised</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                {/* Visual representation of AI + Human link */}
                                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative z-10">
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-50 border border-purple-100">
                                            <SparkleIcon className="w-8 h-8 shrink-0 mt-1" />
                                            <div>
                                                <h4 className="font-bold text-gray-900">The Power of AI</h4>
                                                <p className="text-sm text-gray-600 mt-1">Instantly analyzes millions of data points to find the best-fit options for your dates and budget.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <div className="w-px h-8 bg-gray-300"></div>
                                        </div>
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-lg shrink-0 mt-1">👋</div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">The Human Touch</h4>
                                                <p className="text-sm text-gray-600 mt-1">Real experts finesse the details—rooms with views, surprise dinners, and smoother logistics.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Background element for "intersecting" look */}
                                <div className="absolute inset-0 bg-gray-900 rounded-2xl transform rotate-3 scale-[0.98] -z-10 translate-x-2 translate-y-2 opacity-10"></div>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Who is this for & Philosophy */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                        {/* Target Audience */}
                        <div className="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6 font-serif">Who is Travelzada For?</h3>
                            <p className="text-gray-600 mb-6 font-medium">Designed exclusively for couples:</p>
                            <div className="flex flex-wrap gap-2 mb-8">
                                <span className="px-4 py-1.5 bg-pink-50 text-pink-700 rounded-full text-sm font-medium">Honeymooners</span>
                                <span className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">Married Couples</span>
                                <span className="px-4 py-1.5 bg-rose-50 text-rose-700 rounded-full text-sm font-medium">Dating / Live-in</span>
                            </div>

                            <p className="text-gray-600 mb-4 text-sm uppercase tracking-wider font-semibold">For those 25–40y who value:</p>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                    <span className="text-gray-700"><span className="font-semibold text-gray-900">Comfort</span> over chaos</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                    <span className="text-gray-700"><span className="font-semibold text-gray-900">Thoughtful planning</span> over impulsive booking</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                    <span className="text-gray-700"><span className="font-semibold text-gray-900">Emotional satisfaction</span> over flashy inclusions</span>
                                </li>
                            </ul>
                            <p className="mt-8 text-gray-900 font-medium italic border-l-4 border-primary pl-4">
                                "If you want your trip to feel worth it, you’re our kind of traveller."
                            </p>
                        </div>

                        {/* Philosophy */}
                        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-8 md:p-12 rounded-3xl relative overflow-hidden flex flex-col justify-center">
                            {/* Abstract bg */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2"></div>

                            <h3 className="text-2xl font-bold mb-6 font-serif relative z-10 text-white">Our Philosophy</h3>
                            <div className="space-y-6 relative z-10">
                                <p className="text-lg text-white/80 leading-relaxed">
                                    Travel is a high ticket-size decision. It involves money, time, emotions, and expectations.
                                </p>
                                <p className="text-xl md:text-2xl font-serif leading-relaxed text-white">
                                    "At Travelzada, we believe couples should feel confident and happy about where their money and time are going. <span className="text-primary-light">The trip should feel meaningful, not transactional.</span>"
                                </p>
                                <div className="w-12 h-1 bg-white/20 rounded-full mt-4"></div>
                                <p className="text-white/60 text-sm">That feeling matters to us more than anything else.</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Details */}
                    <div className="bg-[#f8f9fa] rounded-3xl p-8 md:p-12 text-center border-t-4 border-primary">
                        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8">Built from Jaipur, for Couples Everywhere.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">Company</h4>
                                <p className="text-sm text-gray-600">Sadaya Trips LLP</p>
                                <p className="text-sm text-gray-600">ACH-0386</p>
                                <p className="text-sm text-gray-600">08AFHFS4668E1ZN</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">Contact</h4>
                                <p className="text-sm text-gray-600"><a href="mailto:info@travelzada.com" className="hover:text-primary">info@travelzada.com</a></p>
                                <p className="text-sm text-gray-600"><a href="tel:+919929962350" className="hover:text-primary">+91 99299 62350</a></p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">Visit Us</h4>
                                <p className="text-sm text-gray-600">
                                    Plot No. 18, Friends Colony,<br />
                                    Malviya Nagar, Jaipur 302017
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 pb-4 text-center">
                        <p className="text-2xl md:text-3xl font-serif font-bold text-gray-800 italic">
                            "Time to Travelzada - with your better half."
                        </p>
                    </div>

                </div>
            </section>

            <Footer />
        </main>
    )
}
