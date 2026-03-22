'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TailoredResultsChat from '@/components/tailored-travel/TailoredResultsChat'
import LeadForm from '@/components/LeadForm'
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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Type for the matched package returned by the API
interface MatchedPackage {
    id: string
    Destination_ID?: string
    Slug?: string
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
    const [enquireTrigger, setEnquireTrigger] = useState(0)
    const [enquirePackageName, setEnquirePackageName] = useState<string>('')
    const [showLeadForm, setShowLeadForm] = useState(false)
    const [selectedPackageForLead, setSelectedPackageForLead] = useState<string>('')
    const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'results'>('chat')
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

    // Auto-switch to Matches tab on mobile after 3s when packages update
    useEffect(() => {
        if (packages.length > 0) {
            const timer = setTimeout(() => {
                setActiveMobileTab(prev => prev === 'chat' ? 'results' : prev)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [packages])

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
                    <>
                    {/* ====== MOBILE TAB SWITCHER ====== */}
                    <div className="lg:hidden flex bg-white rounded-full p-1.5 border border-gray-200 shadow-sm w-full max-w-sm shrink-0 mx-auto relative z-30 mb-4">
                        <button 
                            onClick={() => setActiveMobileTab('results')}
                            className={`flex-1 flex justify-center items-center gap-2 py-2.5 text-sm font-bold rounded-full transition-all ${activeMobileTab === 'results' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            Matches
                        </button>
                        <button 
                            onClick={() => setActiveMobileTab('chat')}
                            className={`flex-1 flex justify-center items-center gap-2 py-2.5 text-sm font-bold rounded-full transition-all ${activeMobileTab === 'chat' ? 'bg-gradient-to-r from-primary to-[#ff8a3d] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <span className="text-base">✨</span> AI Planner
                        </button>
                    </div>

                    {/* ====== 2-PANEL GRID LAYOUT ====== */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 min-h-0">

                        {/* 1. LEFT PANEL: AI Chat Interface (60%) */}
                        {/* Interactive Trip Planner Chat */}
                        <div id="trip-planner-chat-container" className={`lg:col-span-8 flex-col min-h-0 h-full border border-gray-200 rounded-3xl overflow-hidden shadow-xl bg-white relative z-20 ${activeMobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                            <div className="flex-1 overflow-hidden">
                                <TailoredResultsChat 
                                    initialPackages={packages} 
                                    wizardData={wizardData} 
                                    onNewPackages={setPackages}
                                    enquireTrigger={enquireTrigger}
                                    enquirePackageName={enquirePackageName}
                                />
                            </div>
                        </div>

                        {/* 2. RIGHT PANEL: Packages List, Map & Itinerary (Scrollable) (40%) */}
                        <div className={`lg:col-span-4 flex-col gap-6 overflow-y-auto pr-2 pb-4 scrollbar-hide xl:pr-6 ${activeMobileTab === 'results' ? 'flex' : 'hidden lg:flex'}`}>
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
                                    <div key={pkg.id} className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
                                        {/* --- 2A. Top Recommended Package Card --- */}
                                        <div className="bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-primary/20 flex flex-col group relative shrink-0">
                                            {/* Image & Gradient Badge */}
                                            <div className="relative h-44 md:h-52 w-full overflow-hidden shrink-0">
                                                {pkg.Primary_Image_URL ? (
                                                    <Image src={pkg.Primary_Image_URL} alt={pkg.Destination_Name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 33vw" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center"><span className="text-gray-400">No Image</span></div>
                                                )}
                                                <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                                                    <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-white/20">
                                                        <span>⌚</span> {pkg.Duration_Nights}N/{pkg.Duration_Days}D
                                                    </div>
                                                    <div className="bg-gradient-to-r from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] p-[1px] rounded-full shadow-lg">
                                                        <div className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
                                                            <span className="text-gray-900 font-bold text-xs"><span className="text-[#f85cb5]">✨</span> {pkg.matchScore}% Match</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                                                <div className="absolute bottom-4 left-5 right-5 text-white z-10 flex flex-col items-start">
                                                    <h3 className="text-2xl font-bold tracking-tight drop-shadow-md leading-tight">{pkg.Destination_Name}</h3>
                                                </div>
                                            </div>

                                            {/* Content & CTAs */}
                                            <div className="p-5 flex flex-col gap-4 bg-white relative">
                                                {/* Floating Price Tag */}
                                                <div className="absolute -top-7 right-5 bg-white text-gray-900 px-4 py-2 rounded-xl shadow-xl border border-gray-100 font-black text-lg flex items-center gap-1 z-20">
                                                    ₹{pkg.Price_Min_INR?.toLocaleString('en-IN') || 'TBA'} <span className="text-xs text-gray-400 font-medium">/person</span>
                                                </div>

                                                <div className="flex gap-3">
                                                    <div className="mt-0.5 bg-blue-50 p-2 rounded-xl text-blue-500 shrink-0 h-fit border border-blue-100">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                    </div>
                                                    <p className="text-gray-600 text-sm leading-relaxed font-medium line-clamp-2 md:line-clamp-3">
                                                        <span className="text-gray-900 font-bold">Why it's a match: </span>{pkg.matchReason.replace(/(^\w+:|^)\s*/, '')}
                                                    </p>
                                                </div>

                                                {/* Buttons */}
                                                <div className="grid grid-cols-2 gap-3 mt-1">
                                                    {(() => {
                                                        const destinationCategory = wizardData?.destinations?.[0] || 'travel';
                                                        const destinationSlug = `${slugify(destinationCategory)}-packages`;
                                                        const packageSlug = pkg.Slug || slugify(pkg.Destination_Name || pkg.id);
                                                        const viewDetailsUrl = `/destinations/${encodeURIComponent(destinationSlug)}/${encodeURIComponent(packageSlug)}`;
                                                        
                                                        return (
                                                            <Link href={viewDetailsUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm text-xs md:text-sm uppercase tracking-wider group">
                                                                <span>View Details</span>
                                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                            </Link>
                                                        );
                                                    })()}

                                                    <button onClick={() => { 
                                                        setEnquirePackageName(pkg.Destination_Name); 
                                                        setEnquireTrigger(prev => prev + 1);
                                                        setSelectedPackageForLead(pkg.Destination_Name);
                                                        setShowLeadForm(true);
                                                    }} className="w-full relative overflow-hidden flex items-center justify-center py-3 bg-gradient-to-r from-primary to-[#ff8a3d] text-white font-bold rounded-xl hover:from-[#e65c00] hover:to-[#e67300] transition-all shadow-md hover:shadow-lg text-xs md:text-sm uppercase tracking-wider group transform hover:scale-[1.02] active:scale-[0.98]">
                                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                                                        <span className="relative z-10 flex items-center gap-2">
                                                            Enquire Now
                                                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- 2B. Interactive Map --- */}
                                        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 relative min-h-[400px] shrink-0">
                                            {/* Pass the first package's destination and itinerary points to the map */}
                                            <LeafletMap
                                                mainDestination={wizardData?.destinations?.[0] || pkg?.Destination_Name}
                                                itinerary={
                                                    (pkg?.Day_Wise_Itinerary_Details && pkg.Day_Wise_Itinerary_Details.length > 0)
                                                        ? pkg.Day_Wise_Itinerary_Details.map((d: any) => ({ title: d.title, day: d.day }))
                                                        : pkg?.Day_Wise_Itinerary
                                                            ? pkg.Day_Wise_Itinerary.split('|').map((item: string) => {
                                                                const match = item.match(/Day\s*\d+:\s*(.+)/i);
                                                                return { title: match ? match[1].trim() : item.trim() };
                                                            })
                                                            : []
                                                }
                                            />
                                        </div>

                                        {/* --- 2C. Day-Wise Itinerary List --- */}
                                        {itineraryItems.length > 0 && (
                                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col shrink-0">
                                                <h4 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                                                    <span>📅</span> Day-by-Day Plan
                                                </h4>
                                                <div className="flex col gap-0 pl-2">
                                                    <div className="relative border-l-2 border-dashed border-gray-200 ml-3 space-y-8 pb-2">
                                                        {itineraryItems.map((item, idx) => (
                                                            <div key={idx} className="relative pl-8">
                                                                {/* Custom Timeline Dot matching map */}
                                                                <div className="absolute -left-[11px] top-1 w-5 h-5 bg-white border-[3px] border-primary rounded-full shadow-sm z-10"></div>
                                                                <h5 className="font-bold text-gray-900 text-base">{item.day}: <span className="font-semibold text-primary">{item.title}</span></h5>
                                                                {item.description && (
                                                                    <p className="text-gray-600 text-sm mt-2 leading-relaxed opacity-90">{item.description}</p>
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
                    </div>
                    </>
                )}
            </div>
            {/* Omit standard footer to maximize app height for the 3-panel layout */}
        </main>
    )
}
