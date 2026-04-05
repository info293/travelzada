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
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useRef } from 'react'

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
}

const slideUpItem = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
}

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

const formatTitle = (str: string) => {
    if (!str) return '';
    // If it's mostly uppercase, convert to Title Case
    const upperCount = (str.match(/[A-Z]/g) || []).length;
    const alphaCount = (str.match(/[a-zA-Z]/g) || []).length;
    
    if (alphaCount > 0 && (upperCount / alphaCount) > 0.6) {
        return str.toLowerCase().split(' ').map(word => {
            if (word.length === 0) return '';
            // Always capitalize "Day" followed by number
            if (word === 'day' || (word.startsWith('day') && word.length > 3)) {
                return 'Day';
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }
    return str;
}

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
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [loadingTextIndex, setLoadingTextIndex] = useState(0)
    const [isMapExpanded, setIsMapExpanded] = useState(false)
    const router = useRouter()
    // Ref to the right scrollable panel — synced with page scroll
    const rightPanelRef = useRef<HTMLDivElement>(null)

    // Sync page scroll → right panel scroll on desktop
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            const panel = rightPanelRef.current
            if (!panel) return
            // Only sync if the user isn't already hovering the panel
            if (panel.matches(':hover')) return
            panel.scrollTop += e.deltaY
        }
        window.addEventListener('wheel', handleWheel, { passive: true })
        return () => window.removeEventListener('wheel', handleWheel)
    }, [])

    const cinematicLoadingTexts = [
        "Analyzing your pacing requirements...",
        "Searching partner luxury networks...",
        "Finding perfect boutique experiences...",
        "Curating your bespoke itinerary..."
    ];

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setLoadingTextIndex(prev => (prev + 1) % cinematicLoadingTexts.length);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

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
            <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-hidden bg-[#fafafa]">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10 w-full max-w-2xl mx-auto">
                    {/* Cinematic Passport Overlay Effect in Background */}
                    <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTQwIDBMMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjAzIi8+PC9zdmc+')]"></div>

                    <div className="w-32 h-32 mb-8 relative">
                        {/* Airplane Flying Loop Animation */}
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 z-10"
                        >
                            <span className="absolute -top-4 left-1/2 -ml-6 text-5xl transform rotate-45 drop-shadow-md">✈️</span>
                        </motion.div>
                        {/* The Globe in center */}
                        <div className="absolute inset-4 bg-primary/5 rounded-full border-2 border-dashed border-primary/20 flex items-center justify-center shadow-inner">
                            <span className="text-4xl opacity-50">🌍</span>
                        </div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-2 bg-primary/20 blur-xl rounded-full"></div>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 tracking-tight text-balance">
                        Crafting Your Journey
                    </h1>
                    
                    <div className="h-8 overflow-hidden relative w-full mb-10">
                        <AnimatePresence mode="wait">
                            <motion.p 
                                key={loadingTextIndex}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.5 }}
                                className="text-base md:text-lg text-primary font-semibold w-full absolute inset-x-0"
                            >
                                {cinematicLoadingTexts[loadingTextIndex]}
                            </motion.p>
                        </AnimatePresence>
                    </div>

                    {/* Passport Check Skeleton */}
                    <div className="w-full space-y-4 max-w-xl opacity-80 mt-4">
                        <div className="w-full h-24 bg-white/60 backdrop-blur-xl rounded-[2rem] border border-gray-200 shadow-xl flex items-center p-5 gap-5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl shrink-0 p-3"><div className="w-full h-full border-[3px] border-gray-200 rounded-full border-t-primary animate-spin"></div></div>
                            <div className="flex-1 space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Adding styles for the shimmer animation right inside the module */}
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes shimmer { 100% { transform: translateX(100%); } }
                `}} />
            </main>
        )
    }

    return (
        <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-hidden bg-gray-50 max-h-screen">
            {/* Added Premium Background Styling */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-60"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] opacity-60"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTQwIDBMMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjAxNSIvPjwvc3ZnPg==')]"></div>
            </div>

            <Header />

            <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-80px)] overflow-hidden relative z-10">
                <div className="text-left mb-6 shrink-0 animate-fade-in-up flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                            Your Tailored Travel Plan
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
                            Itinerary
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
                        <div id="trip-planner-chat-container" className={`lg:col-span-8 flex-col min-h-0 h-full border border-gray-100/80 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white/90 backdrop-blur-2xl relative z-20 ${activeMobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
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
                        <div ref={rightPanelRef} className={`lg:col-span-4 flex-col gap-6 overflow-y-auto pr-2 pb-4 scrollbar-hide xl:pr-6 ${activeMobileTab === 'results' ? 'flex' : 'hidden lg:flex'}`}>
                            {packages.slice(0, 1).map((pkg, index) => {
                                // Extract and normalize Day-Wise Itinerary for displaying and map routing
                                let itineraryItems: { day: string; title: string; description: string }[] = [];

                                if (pkg.Day_Wise_Itinerary_Details && pkg.Day_Wise_Itinerary_Details.length > 0) {
                                    itineraryItems = pkg.Day_Wise_Itinerary_Details.map((item: any) => ({
                                        day: `Day ${item.day}`,
                                        title: formatTitle(item.title),
                                        description: item.description || ''
                                    }));
                                } else if (pkg.Day_Wise_Itinerary) {
                                    const items = pkg.Day_Wise_Itinerary.split('|').map((item: string) => item.trim());
                                        itineraryItems = items.map((item: string, i: number) => {
                                            const dayMatch = item.match(/Day\s*(\d+):\s*(.+)/i);
                                            const rawTitle = dayMatch ? dayMatch[2].trim() : item.replace(/^Day\s*\d+:\s*/i, '').trim();
                                            return {
                                                day: dayMatch ? `Day ${dayMatch[1]}` : `Day ${i + 1}`,
                                                title: formatTitle(rawTitle),
                                                description: '' // No desc in string format
                                            };
                                        });
                                }

                                // Build itinerary points for the map — use location/city from details if available
                                const mapItinerary = (pkg.Day_Wise_Itinerary_Details && pkg.Day_Wise_Itinerary_Details.length > 0)
                                    ? pkg.Day_Wise_Itinerary_Details.map((d: any) => ({
                                        title: d.location || d.city || d.place || d.title || '',
                                        day: d.day,
                                    }))
                                    : pkg.Day_Wise_Itinerary
                                        ? pkg.Day_Wise_Itinerary.split('|').map((item: string) => {
                                            const match = item.match(/Day\s*\d+:\s*(.+)/i);
                                            return { title: match ? match[1].trim() : item.trim() };
                                        })
                                        : [];

                                return (
                                    <motion.div
                                        key={pkg.id}
                                        className="flex flex-col gap-6 w-full max-w-3xl mx-auto pb-8"
                                        variants={staggerContainer}
                                        initial="hidden"
                                        animate="show"
                                    >
                                        {/* --- 2A. Top Recommended Package Card (Boarding Pass Layout) --- */}
                                        <motion.div variants={slideUpItem} className="bg-white/95 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-[0_12px_44px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col group relative shrink-0">
                                            {/* Image & Gradient Badge */}
                                            <div className="relative h-44 md:h-52 w-full overflow-hidden shrink-0">
                                                {pkg.Primary_Image_URL ? (
                                                    <Image src={pkg.Primary_Image_URL} alt={pkg.Destination_Name} fill className="object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" sizes="(max-width: 768px) 100vw, 33vw" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><span className="text-gray-400">No Image</span></div>
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
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>

                                                <div className="absolute bottom-4 left-5 text-white z-10 flex flex-col items-start gap-3">
                                                    <h3 className="text-2xl font-bold tracking-tight drop-shadow-md leading-tight pr-4">{pkg.Destination_Name}</h3>
                                                    {/* Jump to Map Shortcut */}
                                                    <button
                                                        onClick={() => {
                                                            document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }}
                                                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-3.5 py-2 rounded-full text-xs font-semibold transition-all border border-white/30 shadow-sm group-hover:bg-white/30"
                                                    >
                                                        <span>📍</span> View on Map
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Flight Ticket Perforated Divider */}
                                            <div className="relative w-full h-0 border-b-[3px] border-dashed border-gray-200 z-20 flex items-center justify-between">
                                                <div className="absolute -left-3 w-6 h-6 bg-gray-50/80 backdrop-blur-2xl rounded-full border border-gray-200 border-l-transparent shadow-inner"></div>
                                                <div className="absolute -right-3 w-6 h-6 bg-gray-50/80 backdrop-blur-2xl rounded-full border border-gray-200 border-r-transparent shadow-inner"></div>
                                            </div>

                                            {/* Content & Ticket Stub CTAs */}
                                            <div className="p-5 md:p-6 flex flex-col gap-5 bg-white relative">
                                                {/* Floating Price Tag on Stub */}
                                                <div className="absolute -top-6 right-6 bg-gradient-to-r from-primary to-[#ff8a3d] text-white px-4 py-2 rounded-xl shadow-lg font-bold text-lg flex items-center gap-1 z-30 transform group-hover:scale-105 transition-transform border border-white/20">
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
                                                            <button
                                                                onClick={() => {
                                                                    setIsTransitioning(true);
                                                                    setTimeout(() => {
                                                                        window.open(viewDetailsUrl, '_blank', 'noopener,noreferrer');
                                                                        setIsTransitioning(false);
                                                                    }, 500);
                                                                }}
                                                                className="w-full flex items-center justify-center gap-2 py-3 bg-[#f8f9fa] border-2 border-gray-200/60 text-gray-700 font-bold uppercase rounded-xl hover:bg-gray-100 hover:border-gray-300 hover:text-gray-900 transition-all shadow-sm text-xs tracking-wider group"
                                                            >
                                                                <span>View Final Details</span>
                                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                            </button>
                                                        );
                                                    })()}

                                                    <button onClick={() => {
                                                        setEnquirePackageName(pkg.Destination_Name);
                                                        setEnquireTrigger(prev => prev + 1);
                                                        setSelectedPackageForLead(pkg.Destination_Name);
                                                        setShowLeadForm(true);
                                                    }} className="w-full relative overflow-hidden flex items-center justify-center py-2.5 sm:py-3 px-1.5 bg-gradient-to-r from-primary to-[#ff8a3d] text-white font-bold rounded-xl hover:from-[#e65c00] hover:to-[#e67300] transition-all shadow-md hover:shadow-lg text-[10px] lg:text-xs uppercase tracking-wide whitespace-nowrap group transform hover:scale-[1.02] active:scale-[0.98]">
                                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                                                        <span className="relative z-10 flex items-center gap-1 sm:gap-1.5">
                                                            Download Itinerary
                                                            <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* --- 2B. Day-wise Itinerary List (before map) --- */}
                                        {itineraryItems.length > 0 && (
                                            <ScrollLinkedItinerary itineraryItems={itineraryItems} />
                                        )}

                                        {/* --- 2C. Interactive Map (after itinerary) --- */}
                                        <div className="flex flex-col gap-4 shrink-0 mt-2">
                                            {/* Premium segmented control for Day Shortcuts */}
                                            {itineraryItems.length > 0 && (
                                                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide px-1 w-full relative">
                                                    {itineraryItems.map((item, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                document.getElementById(`itinerary-day-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }}
                                                            className="flex flex-col items-center justify-center min-w-[72px] py-1.5 px-3 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:bg-white hover:border-gray-300 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group shrink-0 relative overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest group-hover:text-primary transition-colors relative z-10">Day</span>
                                                            <span className="text-base font-black text-gray-800 tracking-tight mt-[-2px] relative z-10">{idx + 1}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <motion.div id="map-section" variants={slideUpItem} className="bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 relative min-h-[400px] group">
                                            {/* Interactive Overlay Hint */}
                                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                                <button
                                                    onClick={() => setIsMapExpanded(true)}
                                                    className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-gray-700 text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:scale-105 transition-all flex items-center gap-2 border border-gray-100 shadow-sm"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                                    Large View
                                                </button>
                                                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[10px] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 border border-white/20 pointer-events-none">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                    Interactive Map
                                                </div>
                                            </div>

                                            {/* Pass all itinerary day locations to the map. currentStep=4 triggers the
                                                 'else' branch which renders all day markers + route polyline. 
                                                 userOrigin=null hides the user-location flight arc. */}
                                            <LeafletMap
                                                mainDestination={wizardData?.destinations?.[0] || pkg?.Destination_Name}
                                                itinerary={mapItinerary}
                                                currentStep={4}
                                                userOrigin={null}
                                            />
                                            </motion.div>
                                        </div>

                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                    </>
                )}
            </div>
            
            {/* Full Screen Map Modal */}
            <AnimatePresence>
                {isMapExpanded && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 sm:p-10"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full h-full max-w-6xl bg-white rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col"
                        >
                            <div className="absolute top-6 right-6 z-10">
                                <button 
                                    onClick={() => setIsMapExpanded(false)}
                                    className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-xl"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 w-full h-full">
                                <LeafletMap
                                    mainDestination={wizardData?.destinations?.[0] || packages[0]?.Destination_Name}
                                    itinerary={
                                        (packages[0]?.Day_Wise_Itinerary_Details && packages[0].Day_Wise_Itinerary_Details.length > 0)
                                            ? packages[0].Day_Wise_Itinerary_Details.map((d: any) => ({
                                                title: d.location || d.city || d.place || d.title || '',
                                                day: d.day,
                                            }))
                                            : packages[0]?.Day_Wise_Itinerary
                                                ? packages[0].Day_Wise_Itinerary.split('|').map((item: string) => {
                                                    const match = item.match(/Day\s*\d+:\s*(.+)/i);
                                                    return { title: match ? match[1].trim() : item.trim() };
                                                })
                                                : []
                                    }
                                    currentStep={4}
                                    userOrigin={null}
                                />
                            </div>
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full border border-gray-200 shadow-lg text-sm font-bold text-gray-800 pointer-events-none">
                                Exploring Your Bespoke Itinerary
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cinematic Exit Transition Override */}
            <AnimatePresence>
                {isTransitioning && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-white/90 flex flex-col items-center justify-center backdrop-blur-3xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.5, rotate: -45 }}
                            animate={{ scale: [0.5, 1.2, 1], rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.8 }}
                            className="text-primary text-8xl drop-shadow-[0_0_80px_rgba(255,138,61,0.2)]"
                        >
                            ✈️
                        </motion.div>
                        <h2 className="mt-8 text-2xl font-bold text-[#ff8a3d] animate-pulse tracking-widest uppercase">Ready for Takeoff</h2>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Omit standard footer to maximize app height for the 3-panel layout */}
        </main>
    )
}

// Child component for the Scroll-Linked Itinerary Animation
function ScrollLinkedItinerary({ itineraryItems }: { itineraryItems: { day: string; title: string; description: string }[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start center", "end end"] });
    // Transform scroll progress from 0->1 into a percentage for top property
    const planeY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    return (
        <motion.div ref={containerRef} id="itinerary-section" variants={slideUpItem} className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-5 md:p-6 shadow-[0_12px_44px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col shrink-0">
            <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#ff8a3d] to-primary flex items-center justify-center border border-orange-100 shadow-inner text-white">
                    <span className="text-xl drop-shadow-sm">📅</span>
                </div>
                Day-wise Itinerary
            </h4>
            <div className="flex col gap-0 pl-2">
                <div className="relative border-l-2 border-dashed border-gray-200 ml-4 space-y-10 pb-4 h-full">
                    {/* The Scrolling Airplane Icon on the dashed line */}
                    <motion.div 
                        style={{ top: planeY }} 
                        className="absolute -left-[14px] w-7 h-7 z-20 flex items-center justify-center pointer-events-none drop-shadow-lg"
                    >
                        <div className="bg-white rounded-full p-1 border border-primary/20 shadow-sm flex items-center justify-center">
                            <span className="text-xl leading-none transform -rotate-45 block">✈️</span>
                        </div>
                    </motion.div>

                    {itineraryItems.map((item, idx) => (
                        <div key={idx} id={`itinerary-day-${idx}`} className="relative pl-10 pt-1 group">
                            {/* Custom Timeline Dot matching map */}
                            <div className="absolute -left-[11px] top-1 w-5 h-5 bg-white border-[4px] border-primary group-hover:border-[#ff8a3d] rounded-full shadow-[0_0_15px_rgba(255,138,61,0.2)] z-10 transition-colors duration-300"></div>
                            <h5 className="font-bold text-gray-800 text-base tracking-wide">{item.day}: <span className="font-semibold text-gray-500">{item.title}</span></h5>
                            {item.description && (
                                <p className="text-gray-600 text-sm mt-2 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity bg-gray-50/50 p-3 rounded-lg border border-gray-100">{item.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
