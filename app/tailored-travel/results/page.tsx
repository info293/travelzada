'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import TailoredResultsChat from '@/components/tailored-travel/TailoredResultsChat'
import MatchCard from '@/components/tailored-travel/smart/MatchCard'
import LeadSheet from '@/components/tailored-travel/smart/LeadSheet'
import { BUDGETS, formatINR, occasionLabel, MONTH_LONG, type PlannerMatch, type PlannerPrefs } from '@/components/tailored-travel/smart/shared'
import dynamic from 'next/dynamic'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal } from 'lucide-react'

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
    Destination?: string
    Duration_Days: number
    Duration_Nights: number
    Price_Min_INR: number
    Travel_Type: string
    Star_Category?: string
    Meal_Plan?: string
    Primary_Image_URL: string
    matchScore: number
    matchReason: string
    Day_Wise_Itinerary?: string
    Day_Wise_Itinerary_Details?: any[]
    reasons?: string[]
    notes?: string[]
    url?: string
}

const STAR_FILTERS = [
    { id: 'any', label: 'Any hotel' },
    { id: '3', label: '3★' },
    { id: '4', label: '4★' },
    { id: '5', label: '5★' },
]
const NIGHT_FILTERS = [
    { id: 'any', label: 'Any length', test: () => true },
    { id: 'short', label: 'Up to 4N', test: (n: number) => n <= 4 },
    { id: 'mid', label: '5–6N', test: (n: number) => n >= 5 && n <= 6 },
    { id: 'long', label: '7N+', test: (n: number) => n >= 7 },
]

const starOf = (label?: string) => parseInt(String(label || '').match(/\d/)?.[0] || '0', 10)

function getItineraryItems(pkg: MatchedPackage) {
    if (pkg.Day_Wise_Itinerary_Details && pkg.Day_Wise_Itinerary_Details.length > 0) {
        return pkg.Day_Wise_Itinerary_Details.map((item: any, i: number) => ({
            day: `Day ${item.day || i + 1}`,
            title: formatTitle(item.title || ''),
            description: item.description || ''
        }))
    }
    if (pkg.Day_Wise_Itinerary) {
        return pkg.Day_Wise_Itinerary.split('|').map((s) => s.trim()).filter(Boolean).map((item, i) => {
            const dayMatch = item.match(/Day\s*(\d+):\s*(.+)/i)
            const rawTitle = dayMatch ? dayMatch[2].trim() : item.replace(/^Day\s*\d+:\s*/i, '').trim()
            return { day: dayMatch ? `Day ${dayMatch[1]}` : `Day ${i + 1}`, title: formatTitle(rawTitle), description: '' }
        })
    }
    return [] as { day: string; title: string; description: string }[]
}

function getMapItinerary(pkg?: MatchedPackage) {
    if (!pkg) return []
    if (pkg.Day_Wise_Itinerary_Details && pkg.Day_Wise_Itinerary_Details.length > 0) {
        return pkg.Day_Wise_Itinerary_Details.map((d: any) => ({ title: d.location || d.city || d.place || d.title || '', day: d.day }))
    }
    if (pkg.Day_Wise_Itinerary) {
        return pkg.Day_Wise_Itinerary.split('|').map((item: string) => {
            const match = item.match(/Day\s*\d+:\s*(.+)/i)
            return { title: match ? match[1].trim() : item.trim() }
        })
    }
    return []
}

export default function TailoredResultsPage() {
    const [wizardData, setWizardData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [packages, setPackages] = useState<MatchedPackage[]>([])
    const [prefs, setPrefs] = useState<PlannerPrefs | null>(null)
    const [activityId, setActivityId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'results'>('results')
    const [loadingTextIndex, setLoadingTextIndex] = useState(0)
    const [isMapExpanded, setIsMapExpanded] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [budgetFilter, setBudgetFilter] = useState<string>('any')
    const [starFilter, setStarFilter] = useState<string>('any')
    const [nightFilter, setNightFilter] = useState<string>('any')
    const [leadOpen, setLeadOpen] = useState(false)
    const [leadPkg, setLeadPkg] = useState<PlannerMatch | null>(null)
    const router = useRouter()
    const rightPanelRef = useRef<HTMLDivElement>(null)

    const loadingTexts = [
        "Reading your preferences…",
        "Checking every couple trip we have…",
        "Matching nights, hotels and budget…",
        "Picking the best ones for you two…"
    ];

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setLoadingTextIndex(prev => (prev + 1) % loadingTexts.length);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isLoading, loadingTexts.length]);

    useEffect(() => {
        if (typeof window === 'undefined') return
        const storedData = sessionStorage.getItem('tailored_wizard_data')
        if (!storedData) {
            router.push('/tailored-travel')
            return
        }
        try {
            const parsedData = JSON.parse(storedData)
            setWizardData(parsedData)
            fetchPackages(parsedData)
        } catch (e) {
            console.error("Failed to parse wizard data", e)
            setError("Failed to load your preferences. Please try again.")
            setIsLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    const fetchPackages = async (data: any) => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/tailored-travel/find-packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(result?.error || `Something went wrong (${response.status})`)
            if (result.success && result.packages) {
                setPackages(result.packages)
                setPrefs(result.prefs || null)
                setActivityId(result.activityId || null)
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

    const adults: number = wizardData?.passengers?.adults || prefs?.adults || 2

    const toMatch = (p: MatchedPackage): PlannerMatch => {
        const destinationCategory = p.Destination || wizardData?.destinations?.[0] || 'travel'
        const fallbackUrl = `/destinations/${encodeURIComponent(`${slugify(destinationCategory)}-packages`)}/${encodeURIComponent(p.Slug || slugify(p.Destination_Name || p.id))}`
        return {
            id: p.id,
            name: p.Destination_Name,
            destination: p.Destination || wizardData?.destinations?.[0] || '',
            nights: Number(p.Duration_Nights) || 0,
            days: Number(p.Duration_Days) || 0,
            pricePerPerson: Number(p.Price_Min_INR) || 0,
            stars: starOf(p.Star_Category),
            starLabel: p.Star_Category || '',
            mealPlan: p.Meal_Plan,
            image: p.Primary_Image_URL,
            url: p.url || fallbackUrl,
            score: Number(p.matchScore) || 0,
            reasons: p.reasons || [],
            notes: p.notes || [],
            // Skip the line when it is just the reasons joined (AI fallback) — the ticks already show them
            whyForYou: p.matchReason && p.matchReason !== (p.reasons || []).slice(0, 3).join(' · ')
                ? p.matchReason.replace(/(^\w+:|^)\s*/, '')
                : null,
        }
    }

    // Client-side filters (budget, stars, nights)
    const filtered = useMemo(() => {
        const budget = BUDGETS.find((b) => b.id === budgetFilter)
        const nightTest = NIGHT_FILTERS.find((n) => n.id === nightFilter)?.test || (() => true)
        return packages.filter((p) => {
            const price = Number(p.Price_Min_INR) || 0
            if (budget && budget.id !== 'flexible' && price) {
                if (price < budget.min) return false
                if (budget.max && price > budget.max) return false
            }
            if (starFilter !== 'any' && starOf(p.Star_Category) !== Number(starFilter)) return false
            if (!nightTest(Number(p.Duration_Nights) || 0)) return false
            return true
        })
    }, [packages, budgetFilter, starFilter, nightFilter])

    const selected = packages.find((p) => p.id === selectedId) || filtered[0] || packages[0]
    const filtersOn = budgetFilter !== 'any' || starFilter !== 'any' || nightFilter !== 'any'
    const clearFilters = () => {
        setBudgetFilter('any')
        setStarFilter('any')
        setNightFilter('any')
    }

    const openLead = (pkg: PlannerMatch | null) => {
        setLeadPkg(pkg)
        setLeadOpen(true)
    }

    const selectPkg = (m: PlannerMatch) => {
        setSelectedId(m.id)
        setTimeout(() => document.getElementById('selected-trip')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }

    const summaryLine = [
        occasionLabel(wizardData?.occasion),
        (wizardData?.destinations || []).join(', '),
        wizardData?.month ? MONTH_LONG[wizardData.month - 1] : '',
        prefs?.nights ? `${prefs.nights} nights` : '',
        prefs?.budgetPerPerson ? `up to ${formatINR(prefs.budgetPerPerson)} pp` : '',
    ].filter(Boolean).join(' · ')

    // Loading State UI
    if (isLoading) {
        return (
            <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-hidden bg-gray-50">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10 w-full max-w-2xl mx-auto">
                    <div className="w-24 h-24 mb-8 relative">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 z-10">
                            <span className="absolute -top-3 left-1/2 -ml-5 text-4xl transform rotate-45 drop-shadow-md">✈️</span>
                        </motion.div>
                        <div className="absolute inset-3 bg-bordeaux-50 rounded-full border-2 border-dashed border-bordeaux-200 flex items-center justify-center">
                            <span className="text-3xl">💑</span>
                        </div>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3 tracking-tight">Finding your perfect trip</h1>
                    <div className="h-8 overflow-hidden relative w-full mb-8">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={loadingTextIndex}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.4 }}
                                className="text-base md:text-lg text-bordeaux-700 w-full absolute inset-x-0"
                            >
                                {loadingTexts[loadingTextIndex]}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className={`rounded-2xl bg-white border border-gray-200 overflow-hidden ${i > 0 ? 'hidden sm:block' : ''}`}>
                                <div className="h-28 bg-gray-100 animate-pulse" />
                                <div className="p-3 space-y-2">
                                    <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                                    <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        )
    }

    const filteredMatches = filtered.map(toMatch)
    const top = filteredMatches.slice(0, 3)
    const more = filteredMatches.slice(3)
    const itineraryItems = selected ? getItineraryItems(selected) : []
    const mapItinerary = getMapItinerary(selected)

    return (
        <main className="min-h-[100dvh] lg:h-screen flex flex-col pt-16 md:pt-24 relative lg:overflow-hidden bg-gray-50">
            <Header />

            <div className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 flex flex-col min-h-0 lg:overflow-hidden relative z-10 pb-4 md:pb-8">
                <div className="mb-4 shrink-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
                            Your trip <span className="text-bordeaux-600">matches</span>
                        </h1>
                        {summaryLine && <p className="text-gray-600 text-sm mt-1">{summaryLine}</p>}
                    </div>
                    <button onClick={() => router.push('/tailored-travel#plan-step-by-step')} className="self-start sm:self-auto text-sm font-semibold text-bordeaux-600 hover:underline">
                        ← Change preferences
                    </button>
                </div>

                {error ? (
                    <div className="w-full bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-bordeaux-50 text-bordeaux-600 rounded-full flex items-center justify-center text-2xl mb-4">⚠️</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button onClick={() => wizardData && fetchPackages(wizardData)} className="bg-bordeaux-600 text-white px-6 py-3 rounded-full font-semibold">Try again</button>
                    </div>
                ) : packages.length === 0 ? (
                    <div className="w-full bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4">🔍</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No ready trips for this yet</h2>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">Our trip experts can build one just for you two.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => openLead(null)} className="bg-bordeaux-600 text-white px-6 py-3 rounded-full font-semibold">Get a custom plan on WhatsApp</button>
                            <button onClick={() => router.push('/tailored-travel')} className="border border-gray-200 bg-white px-6 py-3 rounded-full font-semibold text-gray-800">Change preferences</button>
                        </div>
                    </div>
                ) : (
                    <>
                    {/* ====== MOBILE TAB SWITCHER ====== */}
                    <div className="lg:hidden flex bg-white rounded-full p-1 border border-gray-200 shadow-sm w-full max-w-sm shrink-0 mx-auto relative z-30 mb-4">
                        <button
                            onClick={() => setActiveMobileTab('results')}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all ${activeMobileTab === 'results' ? 'bg-bordeaux-600 text-white shadow' : 'text-gray-600'}`}
                        >
                            Trips ({filtered.length})
                        </button>
                        <button
                            onClick={() => setActiveMobileTab('chat')}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all ${activeMobileTab === 'chat' ? 'bg-bordeaux-600 text-white shadow' : 'text-gray-600'}`}
                        >
                            ✨ Ask AI
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 min-h-0">

                        {/* LEFT: AI chat */}
                        <div id="trip-planner-chat-container" className={`lg:col-span-5 xl:col-span-4 flex-col min-h-[70vh] lg:min-h-0 h-full border border-gray-100/80 rounded-3xl overflow-hidden shadow-sm bg-white relative z-20 ${activeMobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                            <div className="flex-1 overflow-hidden">
                                <TailoredResultsChat
                                    initialPackages={packages}
                                    wizardData={wizardData}
                                    onNewPackages={(p) => { setPackages(p); setSelectedId(null) }}
                                    enquireTrigger={0}
                                    enquirePackageName=""
                                />
                            </div>
                        </div>

                        {/* RIGHT: matches, filters, selected trip */}
                        <div ref={rightPanelRef} className={`lg:col-span-7 xl:col-span-8 flex-col gap-5 lg:overflow-y-auto lg:pr-2 pb-4 scrollbar-hide ${activeMobileTab === 'results' ? 'flex' : 'hidden lg:flex'}`}>

                            {/* Filters */}
                            <div className="rounded-2xl bg-white border border-gray-200 p-3 sm:p-4 shrink-0">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                        <SlidersHorizontal className="w-3.5 h-3.5" /> Filter {filtered.length} of {packages.length} trips
                                    </p>
                                    {filtersOn && <button onClick={clearFilters} className="text-xs font-semibold text-bordeaux-600">Clear</button>}
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    <FilterChip active={budgetFilter === 'any'} onClick={() => setBudgetFilter('any')}>Any budget</FilterChip>
                                    {BUDGETS.filter((b) => b.id !== 'flexible').map((b) => (
                                        <FilterChip key={b.id} active={budgetFilter === b.id} onClick={() => setBudgetFilter(budgetFilter === b.id ? 'any' : b.id)}>{b.label}</FilterChip>
                                    ))}
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-hide">
                                    {STAR_FILTERS.map((s) => (
                                        <FilterChip key={s.id} active={starFilter === s.id} onClick={() => setStarFilter(s.id)}>{s.label}</FilterChip>
                                    ))}
                                    <span className="shrink-0 w-px self-stretch bg-gray-200 mx-0.5" />
                                    {NIGHT_FILTERS.map((n) => (
                                        <FilterChip key={n.id} active={nightFilter === n.id} onClick={() => setNightFilter(n.id)}>{n.label}</FilterChip>
                                    ))}
                                </div>
                            </div>

                            {filtered.length === 0 ? (
                                <div className="rounded-2xl bg-white border border-gray-200 p-6 text-center shrink-0">
                                    <p className="font-semibold text-gray-900">No trips match these filters</p>
                                    <button onClick={clearFilters} className="mt-2 text-sm font-semibold text-bordeaux-600">Clear filters</button>
                                </div>
                            ) : (
                                <>
                                    <div className="shrink-0">
                                        <h2 className="text-base font-semibold text-gray-900 mb-3">Top picks for you</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                                            {top.map((m, i) => (
                                                <MatchCard key={m.id} pkg={m} rank={i} adults={adults} onLead={openLead} onSelect={selectPkg} active={selected?.id === m.id} />
                                            ))}
                                        </div>
                                    </div>

                                    {more.length > 0 && (
                                        <div className="shrink-0">
                                            <h2 className="text-base font-semibold text-gray-900 mb-3">More options</h2>
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                                {more.map((m, i) => (
                                                    <MatchCard key={m.id} pkg={m} rank={i + 3} adults={adults} onLead={openLead} onSelect={selectPkg} active={selected?.id === m.id} compact />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Selected trip: day by day + map */}
                            {selected && (
                                <motion.div key={selected.id} id="selected-trip" initial="hidden" animate="show" className="flex flex-col gap-5 shrink-0 scroll-mt-28">
                                    <div className="flex items-center justify-between gap-3">
                                        <h2 className="text-base font-semibold text-gray-900 min-w-0">
                                            Day by day: <span className="text-bordeaux-700">{selected.Destination_Name}</span>
                                        </h2>
                                        <button onClick={() => openLead(toMatch(selected))} className="shrink-0 text-sm font-semibold text-bordeaux-600 hover:underline">
                                            Get this plan
                                        </button>
                                    </div>

                                    {itineraryItems.length > 0 && <ScrollLinkedItinerary itineraryItems={itineraryItems} />}

                                    <motion.div id="map-section" variants={slideUpItem} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative min-h-[360px] group">
                                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                                            <button
                                                onClick={() => setIsMapExpanded(true)}
                                                className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-gray-700 text-[10px] font-semibold tracking-widest uppercase hover:bg-white transition-all flex items-center gap-2 border border-gray-100 shadow-sm"
                                            >
                                                Large view
                                            </button>
                                        </div>
                                        <LeafletMap
                                            mainDestination={wizardData?.destinations?.[0] || selected.Destination_Name}
                                            itinerary={mapItinerary}
                                            currentStep={4}
                                            userOrigin={null}
                                        />
                                    </motion.div>
                                </motion.div>
                            )}
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
                                    aria-label="Close map"
                                    className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-xl"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 w-full h-full">
                                <LeafletMap
                                    mainDestination={wizardData?.destinations?.[0] || selected?.Destination_Name}
                                    itinerary={mapItinerary}
                                    currentStep={4}
                                    userOrigin={null}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <LeadSheet
                open={leadOpen}
                onClose={() => setLeadOpen(false)}
                pkg={leadPkg}
                prefs={prefs}
                activityId={activityId}
                shownMatches={packages.slice(0, 12).map((p) => ({ id: p.id, name: p.Destination_Name, score: Number(p.matchScore) || 0 }))}
                source="AI Planner"
            />
        </main>
    )
}

function FilterChip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium border transition ${active ? 'bg-bordeaux-600 border-bordeaux-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-bordeaux-300'}`}
        >
            {children}
        </button>
    )
}

// Child component for the Scroll-Linked Itinerary Animation
function ScrollLinkedItinerary({ itineraryItems }: { itineraryItems: { day: string; title: string; description: string }[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start center", "end end"] });
    // Transform scroll progress from 0->1 into a percentage for top property
    const planeY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    return (
        <motion.div ref={containerRef} id="itinerary-section" variants={slideUpItem} className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-gray-100 flex flex-col shrink-0">
            <div className="flex col gap-0 pl-2">
                <div className="relative border-l-2 border-dashed border-gray-200 ml-4 space-y-8 pb-4 h-full">
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
                            <div className="absolute -left-[11px] top-1 w-5 h-5 bg-white border-[4px] border-primary rounded-full z-10"></div>
                            <h5 className="font-semibold text-gray-800 text-sm sm:text-base">{item.day}: <span className="font-normal text-gray-600">{item.title}</span></h5>
                            {item.description && (
                                <p className="text-gray-600 text-sm mt-2 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100">{item.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
