'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TailoredResultsChat from '@/components/tailored-travel/TailoredResultsChat'
import dynamic from 'next/dynamic'

// Need to dynamically import map to avoid SSR issues
const LeafletMap = dynamic(() => import('@/components/tailored-travel/LeafletMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[400px] bg-gray-100 animate-pulse rounded-3xl border border-gray-200 flex items-center justify-center">
            <span className="text-gray-400 font-medium tracking-widest text-sm uppercase">Loading Map...</span>
        </div>
    )
})

// Type for the matched package returned by the API
interface MatchedPackage {
    id: string
    Destination_Name: string
    Duration_Days: number
    Duration_Nights: number
    Price_Min_INR: number
    Travel_Type: string
    Primary_Image_URL: string
    matchScore: number
    matchReason: string
    Day_Wise_Itinerary?: string
    Day_Wise_Itinerary_Details?: any[]
}

export default function TailoredResultsPage() {
    const [wizardData, setWizardData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [packages, setPackages] = useState<MatchedPackage[]>([])
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        // Load data from session storage
        if (typeof window !== 'undefined') {
            const storedData = sessionStorage.getItem('tailored_wizard_data')
            if (storedData) {
                try {
                    const parsedData = JSON.parse(storedData)
                    setWizardData(parsedData)
                    fetchPackages(parsedData)
                } catch (e) {
                    console.error("Failed to parse wizard data", e)
                    setError("Failed to load your preferences. Please try again.")
                    setIsLoading(false)
                }
            } else {
                // No data found, redirect back to wizard
                router.push('/tailored-travel')
            }
        }
    }, [router])

    const fetchPackages = async (data: any) => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/tailored-travel/find-packages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
            }

            const result = await response.json()
            if (result.success && result.packages) {
                setPackages(result.packages)
            } else {
                throw new Error(result.error || "Failed to find matching packages")
            }
        } catch (err: any) {
            console.error("Error fetching packages:", err)
            setError(err.message || "An unexpected error occurred while finding your perfect trip.")
        } finally {
            setIsLoading(false)
        }
    }

    // Loading State UI
    if (isLoading) {
        return (
            <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-hidden bg-gray-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10 w-full max-w-2xl mx-auto">
                    <div className="w-32 h-32 mb-8 relative">
                        {/* Animated elements representing AI searching */}
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                        <div className="absolute inset-2 bg-primary/40 rounded-full animate-pulse"></div>
                        <div className="absolute inset-4 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl">
                            <span className="text-4xl animate-bounce">✨</span>
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 drop-shadow-sm tracking-tight text-balance">
                        Curating Your Dream Journey
                    </h1>
                    <p className="text-lg md:text-xl text-gray-500 font-medium max-w-xl mx-auto mb-10 text-balance animate-pulse">
                        Our AI is searching through hundreds of exclusive packages to find the perfect match for your preferences...
                    </p>

                    {/* Placeholder loading cards to show it's working */}
                    <div className="w-full space-y-4 max-w-xl opacity-60">
                        <div className="w-full h-24 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center p-4 gap-4 animate-pulse">
                            <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                            <div className="flex-1 space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                        <div className="w-full h-24 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center p-4 gap-4 animate-pulse" style={{ animationDelay: '0.2s' }}>
                            <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                            <div className="flex-1 space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </main>
        )
    }

    return (
        <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-hidden bg-gray-50 max-h-screen">
            <Header />

            <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
                {/* Header Section */}
                <div className="text-left mb-6 shrink-0 animate-fade-in-up flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">
                            Your Perfect Matches
                        </h1>
                        <p className="text-gray-600 font-medium">
                            We've analyzed your preferences and hand-picked these exclusive itineraries.
                        </p>
                    </div>
                </div>

                {error ? (
                    <div className="w-full h-full bg-white rounded-3xl p-8 text-center shadow-xl border border-red-100 flex flex-col items-center justify-center animate-fade-in-up">
                        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mb-6">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h2>
                        <p className="text-gray-600 mb-8">{error}</p>
                        <button onClick={() => router.push('/tailored-travel')} className="bg-gray-900 text-white px-8 py-4 rounded-full font-bold hover:bg-gray-800 transition-colors shadow-lg">Try Again</button>
                    </div>
                ) : packages.length === 0 ? (
                    <div className="w-full h-full bg-white rounded-3xl p-8 text-center shadow-xl border border-gray-200 flex flex-col items-center justify-center animate-fade-in-up">
                        <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-4xl mb-6">🔍</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Perfect Matches Found</h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">We couldn't find an exact match for your specific combination of requirements.</p>
                        <button onClick={() => router.push('/tailored-travel')} className="bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg">Modify Preferences</button>
                    </div>
                ) : (
                    /* ====== 3-PANEL GRID LAYOUT ====== */
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

                        {/* 1. LEFT PANEL: Packages List & Itinerary (Scrollable) */}
                        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 pb-4 scrollbar-hide">
                            {packages.slice(0, 1).map((pkg, index) => {
                                // Extract and normalize Day-Wise Itinerary for displaying and map routing
                                let itineraryItems: { day: string; title: string; description: string }[] = [];

                                if (pkg.Day_Wise_Itinerary_Details && pkg.Day_Wise_Itinerary_Details.length > 0) {
                                    itineraryItems = pkg.Day_Wise_Itinerary_Details.map((item: any) => ({
                                        day: `Day ${item.day}`,
                                        title: item.title,
                                        description: item.description || ''
                                    }));
                                } else if (pkg.Day_Wise_Itinerary) {
                                    const items = pkg.Day_Wise_Itinerary.split('|').map((item: string) => item.trim());
                                    itineraryItems = items.map((item: string, i: number) => {
                                        const dayMatch = item.match(/Day\s*(\d+):\s*(.+)/i);
                                        return {
                                            day: dayMatch ? `Day ${dayMatch[1]}` : `Day ${i + 1}`,
                                            title: dayMatch ? dayMatch[2].trim() : item.replace(/^Day\s*\d+:\s*/i, '').trim(),
                                            description: '' // No desc in string format
                                        };
                                    });
                                }

                                return (
                                    <div key={pkg.id} className="flex flex-col gap-6">
                                        {/* --- 1A. Top Recommended Package Card --- */}
                                        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-primary/20 flex flex-col group relative ring-1 ring-primary/20 shrink-0">
                                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-secondary"></div>
                                            {/* Image */}
                                            <div className="relative h-56 w-full overflow-hidden">
                                                {pkg.Primary_Image_URL ? (
                                                    <Image src={pkg.Primary_Image_URL} alt={pkg.Destination_Name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 33vw" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center"><span className="text-gray-400">No Image</span></div>
                                                )}
                                                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 z-10">
                                                    <span className="text-secondary font-black text-xs">✨ Top Match ({pkg.matchScore}%)</span>
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                                                <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                                                    <h3 className="text-2xl font-bold tracking-tight drop-shadow-md leading-tight mb-1">{pkg.Destination_Name}</h3>
                                                    <div className="flex items-center gap-3 text-sm font-medium opacity-95">
                                                        <span className="flex items-center gap-1">⌚ {pkg.Duration_Nights}N/{pkg.Duration_Days}D</span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white/50"></span>
                                                        <span className="font-bold text-yellow-300">₹{pkg.Price_Min_INR?.toLocaleString('en-IN') || 'TBA'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Match Reason */}
                                            <div className="p-5 flex flex-col gap-4 bg-primary/5">
                                                <div className="flex gap-3">
                                                    <div className="mt-1 bg-primary/20 p-1.5 rounded-full text-primary shrink-0 h-fit">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </div>
                                                    <p className="text-gray-700 text-sm leading-relaxed font-medium">
                                                        {pkg.matchReason}
                                                    </p>
                                                </div>
                                                <Link href={`/destinations/custom/${pkg.id}`} target="_blank" className="w-full text-center py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-md">
                                                    View Full Details
                                                </Link>
                                            </div>
                                        </div>

                                        {/* --- 1B. Day-Wise Itinerary List --- */}
                                        {itineraryItems.length > 0 && (
                                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 flex flex-col shrink-0">
                                                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                    <span>📅</span> Day-by-Day Plan
                                                </h4>
                                                <div className="flex col gap-0 pl-2">
                                                    <div className="relative border-l-2 border-dashed border-gray-200 ml-3 space-y-6 pb-2">
                                                        {itineraryItems.map((item, idx) => (
                                                            <div key={idx} className="relative pl-6">
                                                                {/* Custom Timeline Dot matching map */}
                                                                <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-sm z-10"></div>
                                                                <h5 className="font-bold text-gray-900 text-sm">{item.day}: <span className="font-semibold text-primary">{item.title}</span></h5>
                                                                {item.description && (
                                                                    <p className="text-gray-600 text-xs mt-1.5 leading-relaxed line-clamp-2">{item.description}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 2. MIDDLE PANEL: AI Chat Interface */}
                        <div className="lg:col-span-4 flex flex-col min-h-0 bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-200">
                            <TailoredResultsChat initialPackages={packages.slice(0, 1)} wizardData={wizardData} />
                        </div>

                        {/* 3. RIGHT PANEL: Interactive Map */}
                        <div className="lg:col-span-4 bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-200 relative min-h-[400px]">
                            {/* Pass the first package's destination and itinerary points to the map */}
                            <LeafletMap
                                mainDestination={wizardData?.destinations?.[0] || packages[0]?.Destination_Name}
                                itinerary={
                                    (packages[0]?.Day_Wise_Itinerary_Details && packages[0].Day_Wise_Itinerary_Details.length > 0)
                                        ? packages[0].Day_Wise_Itinerary_Details.map((d: any) => ({ title: d.title, day: d.day }))
                                        : packages[0]?.Day_Wise_Itinerary
                                            ? packages[0].Day_Wise_Itinerary.split('|').map((item: string) => {
                                                const match = item.match(/Day\s*\d+:\s*(.+)/i);
                                                return { title: match ? match[1].trim() : item.trim() };
                                            })
                                            : []
                                }
                            />
                        </div>
                    </div>
                )}
            </div>
            {/* Omit standard footer to maximize app height for the 3-panel layout */}
        </main>
    )
}
