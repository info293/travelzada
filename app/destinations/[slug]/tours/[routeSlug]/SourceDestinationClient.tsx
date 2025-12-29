'use client'

import { useEffect, useState } from 'react'
import { useRouter, notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import travelDatabase from '@/data/travel-database.json'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import LeadForm from '@/components/LeadForm'

const travelData = travelDatabase as any

interface DestinationPackage {
    id?: string
    Destination_ID: string
    Destination_Name: string
    Overview: string
    Duration: string
    Mood: string
    Occasion: string
    Travel_Type: string
    Star_Category: string
    Price_Range_INR: string
    Primary_Image_URL: string
    Inclusions: string
    Slug?: string
    Location_Breakup?: string
    [key: string]: any
}

interface PageProps {
    params: { slug: string; routeSlug: string }
}

export default function SourceDestinationClient({ params }: PageProps) {
    const router = useRouter()
    const destinationSlug = decodeURIComponent(params.slug)
    const routeSlug = decodeURIComponent(params.routeSlug)

    // Validate route format (must start with 'from-')
    if (!routeSlug.startsWith('from-')) {
        notFound()
    }

    const originName = routeSlug.replace('from-', '').split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')

    // Capitalize destination for display
    const destNameDisplay = destinationSlug.charAt(0).toUpperCase() + destinationSlug.slice(1)

    const [destinationPackages, setDestinationPackages] = useState<DestinationPackage[]>([])
    const [destination, setDestination] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeAccordion, setActiveAccordion] = useState<number | null>(0)
    const [isLeadFormOpen, setIsLeadFormOpen] = useState(false)

    useEffect(() => {
        const fetchDestinationAndPackages = async () => {
            if (typeof window === 'undefined' || !db) {
                const found = travelData.destinations.find(
                    (d: any) => d.name.toLowerCase() === destinationSlug.toLowerCase() ||
                        d.name.toLowerCase().replace(/\s+/g, '-') === destinationSlug.toLowerCase()
                )
                setDestination(found)
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                const normalizedDestination = destinationSlug.toLowerCase()

                const destinationsRef = collection(db, 'destinations')
                const destinationsSnapshot = await getDocs(destinationsRef)
                let foundDestination: any = null

                destinationsSnapshot.forEach((doc) => {
                    const data = doc.data()
                    const destSlug = data.slug?.toLowerCase() || ''
                    const destName = data.name?.toLowerCase() || ''

                    if (destSlug === normalizedDestination ||
                        destName === normalizedDestination ||
                        destSlug.includes(normalizedDestination) ||
                        normalizedDestination.includes(destSlug)) {
                        foundDestination = { id: doc.id, ...data }
                    }
                })

                if (!foundDestination) {
                    const found = travelData.destinations.find(
                        (d: any) => d.name.toLowerCase() === destinationSlug.toLowerCase() ||
                            d.name.toLowerCase().replace(/\s+/g, '-') === destinationSlug.toLowerCase()
                    )
                    foundDestination = found
                }

                setDestination(foundDestination)

                if (foundDestination) {
                    const packagesRef = collection(db, 'packages')
                    const allPackagesSnapshot = await getDocs(packagesRef)
                    const packagesData: DestinationPackage[] = []
                    const linkedPackageIds = foundDestination.packageIds || []
                    const hasLinkedPackages = Array.isArray(linkedPackageIds) && linkedPackageIds.length > 0

                    allPackagesSnapshot.forEach((doc) => {
                        const data = doc.data() as DestinationPackage
                        const pkgId = data.Destination_ID || ''
                        let shouldInclude = false

                        if (hasLinkedPackages) {
                            shouldInclude = linkedPackageIds.includes(pkgId)
                        } else {
                            const pkgName = data.Destination_Name?.toLowerCase() || ''
                            const normalizedPkgId = pkgId.toLowerCase()
                            shouldInclude = pkgName.includes(normalizedDestination) ||
                                normalizedDestination.includes(pkgName) ||
                                pkgName === normalizedDestination ||
                                normalizedPkgId.includes(normalizedDestination) ||
                                normalizedDestination.includes(normalizedPkgId)
                        }

                        if (shouldInclude) {
                            packagesData.push({ id: doc.id, ...data })
                        }
                    })
                    setDestinationPackages(packagesData)
                }

            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDestinationAndPackages()
    }, [destinationSlug])

    const getDestinationImage = (dest: any) => {
        if (dest?.image) return dest.image
        const imageMap: { [key: string]: string } = {
            'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
            'Goa': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
            'Kerala': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80',
            'Rajasthan': 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e?w=1200&q=80',
        }
        return imageMap[dest?.name] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80'
    }

    const SparkleIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
        <span
            className={`${className} inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm animate-pulse`}
        />
    )

    const imageUrl = destination ? getDestinationImage(destination) : ''

    const formatPrice = (priceRange: string | number | undefined): string => {
        if (!priceRange) return 'Contact for price'
        const priceStr = String(priceRange)
        if (priceStr.includes('₹') || priceStr.includes('INR')) return priceStr
        const match = priceStr.match(/(\d+)/)
        if (match) return `₹${parseInt(match[1]).toLocaleString('en-IN')}`
        return priceStr
    }

    if (!destination && !loading) {
        return notFound()
    }

    return (
        <main className="min-h-screen bg-white">
            <Header />

            <LeadForm
                isOpen={isLeadFormOpen}
                onClose={() => setIsLeadFormOpen(false)}
                packageName={`${destination?.name} Packages from ${originName}`}
            />

            {/* Breadcrumbs */}
            <div className="bg-white border-b border-gray-100 relative z-20">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <nav className="flex text-xs font-medium text-gray-500" aria-label="Breadcrumb">
                        <ol className="inline-flex items-center space-x-1 md:space-x-2">
                            <li className="inline-flex items-center">
                                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <span className="mx-1 text-gray-400">/</span>
                                    <Link href="/destinations" className="hover:text-primary transition-colors">Destinations</Link>
                                </div>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <span className="mx-1 text-gray-400">/</span>
                                    <Link href={`/destinations/${destinationSlug}`} className="hover:text-primary transition-colors">{destNameDisplay}</Link>
                                </div>
                            </li>
                            <li aria-current="page">
                                <div className="flex items-center">
                                    <span className="mx-1 text-gray-400">/</span>
                                    <span className="text-gray-900">Packages from {originName}</span>
                                </div>
                            </li>
                        </ol>
                    </nav>
                </div>
            </div>

            {/* Enhanced Hero Section - Simpler Fonts */}
            <section className="relative h-[65vh] min-h-[500px] overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={imageUrl}
                        alt={destination?.name}
                        className="w-full h-full object-cover transition-transform duration-[30s] hover:scale-105"
                    />
                    {/* Modern Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/70 via-transparent to-transparent"></div>
                </div>

                <div className="relative z-10 h-full flex items-center px-4 max-w-7xl mx-auto">
                    <div className="max-w-2xl text-left space-y-6 animate-fadeIn">

                        {/* Premium Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-medium text-white tracking-wide uppercase">Best Selling Packages</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-semibold text-white tracking-tight leading-[1.1] drop-shadow-lg">
                            {destination?.name} Tours <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-100">
                                from {originName}
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-200 max-w-xl font-normal leading-relaxed drop-shadow-md">
                            Unlock exclusive deals on {destination?.name || 'travel'} packages tailored for {originName} departures. Flights, hotels, and experiences included.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link
                                href="/ai-planner"
                                className="px-8 py-4 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white rounded-full font-semibold shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                <SparkleIcon className="w-5 h-5" />
                                <span>Plan with AI Planner</span>
                            </Link>
                            <button
                                onClick={() => setIsLeadFormOpen(true)}
                                className="px-8 py-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/30 rounded-full font-medium transition-all hover:border-white shadow-sm flex items-center justify-center gap-2"
                            >
                                <span>View Itineraries</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Proposition Strip */}
            <div className="bg-white border-b border-gray-100 shadow-sm relative z-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
                        {[
                            { label: 'Flights Included', sub: `From ${originName}`, icon: '✈️', premium: true },
                            { label: 'Visa Assistance', sub: 'Hassle-free', icon: '🛂', premium: true },
                            { label: 'Top Rated Hotels', sub: '4★ & 5★ Stays', icon: '🏨', premium: false },
                            { label: '24/7 Support', sub: 'On-ground team', icon: '📞', premium: false },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col justify-center p-4 md:p-6 text-center md:text-left md:flex-row md:items-center md:gap-3 group relative">
                                <div className="text-2xl opacity-80 mb-2 md:mb-0 transform group-hover:scale-110 transition-transform">{item.icon}</div>
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm md:text-base leading-tight flex items-center justify-center md:justify-start gap-1">
                                        {item.label}
                                        {item.premium && <span className="text-amber-500 font-bold text-xs" title="Premium Feature">*</span>}
                                    </p>
                                    <p className="text-xs text-gray-500">{item.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Premium Feature Note */}
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-[10px] text-amber-800 text-center md:text-right font-medium">
                        * Available with premium packages only. Extra charges may apply.
                    </div>
                </div>
            </div>

            {/* Intro Text Content */}
            <section className="py-12 px-4 md:px-8 lg:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gray-50/50 p-6 md:p-10 rounded-3xl border border-gray-100/50">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{destination?.name} Holiday Packages from {originName}</h2>
                        <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                            <p className="mb-4">
                                Book your <span className="font-medium text-gray-800">{destination?.name} tour packages from {originName}</span> with Travelzada and prepare for breathtaking experiences.
                                We curate the perfect blend of adventure, culture, and relaxation, ensuring your trip is nothing short of extraordinary.
                            </p>
                            <p>
                                Whether you're planning a <span className="text-primary font-medium">romantic honeymoon</span>, a fun-filled family holiday, or a solo discovery, our packages tailored for {originName} travelers include strictly vetted hotels, comfortable transfers, and immersive guided tours.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Package Grid Section */}
            <section className="pb-20 px-4 md:px-8 lg:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div>
                            <span className="text-orange-500 font-semibold tracking-wider uppercase text-xs mb-2 block">Curated For You</span>
                            <h2 className="text-3xl font-semibold text-gray-900">
                                Trending Packages <span className="text-gray-400 font-light">from {originName}</span>
                            </h2>
                        </div>
                        {/* Filters removed per user request */}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                            {[1, 2, 3, 4].map((n) => (
                                <div key={n} className="h-72 bg-gray-100 rounded-3xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                            {destinationPackages.map((pkg) => {
                                const imageUrl = pkg.Primary_Image_URL
                                    ? pkg.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
                                    : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'

                                const packageSlug = (pkg as any).Slug || pkg.Destination_ID || pkg.id
                                const badge = pkg.Travel_Type || pkg.Star_Category

                                return (
                                    <Link
                                        key={pkg.id}
                                        href={`/destinations/${encodeURIComponent(destinationSlug)}/${packageSlug}`}
                                        className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col"
                                    >
                                        <div className="relative h-40 sms:h-48 overflow-hidden">
                                            <img
                                                src={imageUrl}
                                                alt={pkg.Destination_Name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                                            {badge && (
                                                <span className="absolute top-3 left-3 bg-white/95 text-gray-900 text-[10px] font-semibold px-2 py-1 rounded shadow-sm uppercase tracking-wide">
                                                    {badge}
                                                </span>
                                            )}
                                            <div className="absolute bottom-2 left-3 right-3 text-white">
                                                <span className="text-[10px] bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded border border-white/20 font-medium">
                                                    {pkg.Duration}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 flex flex-col">
                                            <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                                {pkg.Destination_Name}
                                            </h3>
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                <p className="text-xs text-gray-500 line-clamp-1">
                                                    {pkg.Location_Breakup || `Explores ${destinationSlug}`}
                                                </p>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Starts from</p>
                                                    <span className="text-sm md:text-base font-semibold text-[#7c3aed]">
                                                        {formatPrice(pkg.Price_Range_INR)}
                                                    </span>
                                                </div>
                                                <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all">
                                                    ➜
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Simple FAQ Section */}
            <section className="py-16 px-4 md:px-12 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                        <span className="text-primary font-semibold tracking-wider uppercase text-xs">Help & Support</span>
                        <h3 className="text-2xl font-semibold text-gray-900 mt-2">Frequently Asked Questions</h3>
                    </div>
                    <div className="space-y-3">
                        {[
                            {
                                q: `How to reach ${destination?.name} from ${originName}?`,
                                a: `We offer packages with direct or connecting flights from ${originName}. Our team ensures you get the most convenient schedule.`
                            },
                            {
                                q: `Are meals included in the package?`,
                                a: `Yes, typically breakfast is included at all hotels. Some packages may also include dinner or all meals depending on your selection.`
                            },
                            {
                                q: `Do you provide visa assistance?`,
                                a: `Absolutely! We guide you through the entire visa process for ${destination?.name} ensuring a hassle-free approval.`
                            }
                        ].map((faq, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                                <button
                                    onClick={() => setActiveAccordion(activeAccordion === i ? null : i)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <span className="font-medium text-gray-800 text-sm md:text-base">{faq.q}</span>
                                    <span className={`transform transition-transform text-gray-400 ${activeAccordion === i ? 'rotate-180 text-primary' : ''}`}>
                                        ▼
                                    </span>
                                </button>
                                <div
                                    className={`px-5 bg-gray-50/50 text-sm text-gray-600 overflow-hidden transition-all duration-300 ${activeAccordion === i ? 'max-h-40 pb-5 pt-0' : 'max-h-0'}`}
                                >
                                    {faq.a}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Flight Info Box */}
            <section className="py-12 bg-white border-t border-gray-100 text-center">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900">Flight Connectivity Information</h2>
                    <p className="text-gray-500 text-sm max-w-2xl mx-auto mb-6">
                        Flights from <span className="text-gray-900 font-medium">{originName}</span> to {destination?.name} are available daily.
                        Average flight duration is 4-6 hours.
                    </p>
                    <div className="flex justify-center gap-8 text-xs text-gray-500 font-medium">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-2xl opacity-80">🛫</span>
                            <span>Daily Flights</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-2xl opacity-80">🧳</span>
                            <span>25kg Baggage</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile Sticky CTA */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 flex gap-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => router.push('/ai-planner')}
                    className="flex-1 bg-gray-900 text-white font-semibold py-3 rounded-xl text-sm shadow-md active:scale-95 transition-transform"
                >
                    AI Planner
                </button>
                <button
                    onClick={() => setIsLeadFormOpen(true)}
                    className="flex-1 bg-gradient-to-r from-primary to-orange-500 text-white font-semibold py-3 rounded-xl text-sm shadow-md active:scale-95 transition-transform"
                >
                    Enquire Now
                </button>
            </div>

            {/* Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        "mainEntity": [
                            {
                                "@type": "Question",
                                "name": `How to reach ${destination?.name} from ${originName}?`,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": `You can reach ${destination?.name} from ${originName} via direct or connecting flights. Our packages include airport transfers for your convenience.`
                                }
                            }
                        ]
                    })
                }}
            />

            <Footer />
        </main>
    )
}
