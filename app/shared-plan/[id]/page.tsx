'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import HeaderClient from '@/components/HeaderClient';
import FooterSEO from '@/components/FooterSEO';
import { ThumbsUp, ThumbsDown, Share2, ClipboardCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import CollaborativeChat from '@/components/tailored-travel/CollaborativeChat';

const LeafletMap = dynamic(() => import('@/components/tailored-travel/LeafletMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">Loading Route Map...</div>
});

export default function SharedPlanPage() {
    const params = useParams();
    const router = useRouter();
    const planId = params.id as string;

    const [planData, setPlanData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch the shared plan
    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const docRef = doc(db, 'shared_plans', planId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setPlanData(docSnap.data());
                } else {
                    setError('Shared plan not found or has expired.');
                }
            } catch (err) {
                console.error("Error fetching shared plan:", err);
                setError('Failed to load the shared plan.');
            } finally {
                setLoading(false);
            }
        };

        if (planId) {
            fetchPlan();
        }
    }, [planId]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleVote = async (type: 'up' | 'down') => {
        if (!planData) return;

        // Optimistically update UI
        const updatedPackage = {
            ...planData.package,
            votes: {
                ...planData.package.votes,
                [type]: (planData.package.votes?.[type] || 0) + 1
            }
        };

        setPlanData({ ...planData, package: updatedPackage });

        // Update Firestore
        try {
            const docRef = doc(db, 'shared_plans', planId);
            await updateDoc(docRef, {
                package: updatedPackage
            });
        } catch (err) {
            console.error("Failed to sync vote:", err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !planData) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <HeaderClient navItems={[]} children={null} />
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mb-6">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || "Plan Not Found"}</h2>
                    <button onClick={() => router.push('/')} className="bg-primary text-white px-8 py-3 rounded-full font-semibold mt-4">Return Home</button>
                </div>
            </div>
        );
    }

    const { wizardData, package: pkg, messages } = planData;
    const destinationsStr = wizardData.destinations?.join(', ') || 'Your Destination';

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
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-sans">
            <HeaderClient navItems={[]} children={null} />

            {/* Quick Share Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm relative shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 line-clamp-1">Multiplayer Trip: {destinationsStr}</h1>
                        <p className="text-xs text-gray-500 hidden sm:block">Collaborate with the AI and vote on this itinerary</p>
                    </div>
                    <button
                        onClick={handleCopyLink}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${copied ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                    >
                        {copied ? <ClipboardCheck className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        {copied ? 'Link Copied!' : 'Invite Friends'}
                    </button>
                </div>
            </div>

            <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col min-h-0 h-[calc(100vh-64px-73px)]">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

                    {/* LEFT PANEL: Collaborative AI Chat (60%) */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-[650px] lg:h-[750px] max-h-[80vh]">
                        <CollaborativeChat
                            planId={planId}
                            initialMessages={messages}
                            wizardData={wizardData}
                            selectedPackage={pkg}
                        />
                    </div>

                    {/* RIGHT PANEL: The Package & Map (40%) */}
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 pb-4 scrollbar-hide shrink-0 min-h-0">
                        {/* The Package Card */}
                        <div className="bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-primary/20 flex flex-col relative shrink-0">
                            {/* Image & Gradient Badge */}
                            <div className="relative h-44 md:h-52 w-full overflow-hidden shrink-0">
                                {pkg.Primary_Image_URL ? (
                                    <Image src={pkg.Primary_Image_URL} alt={pkg.Destination_Name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
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

                            {/* Content */}
                            <div className="p-5 flex flex-col gap-4 bg-white relative">
                                {/* Floating Price Tag */}
                                <div className="absolute -top-7 right-5 bg-white text-gray-900 px-4 py-2 rounded-xl shadow-xl border border-gray-100 font-black text-lg flex items-center gap-1 z-20">
                                    ₹{pkg.Price_Min_INR?.toLocaleString('en-IN') || 'TBA'} <span className="text-xs text-gray-400 font-medium">/person</span>
                                </div>

                                <div className="flex gap-3 mt-1">
                                    <div className="mt-0.5 bg-blue-50 p-2 rounded-xl text-blue-500 shrink-0 h-fit border border-blue-100">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed font-medium">
                                        {pkg.Overview}
                                    </p>
                                </div>

                                {/* Multiplayer Voting Bar */}
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mt-2">
                                    <h4 className="text-sm font-bold text-gray-900 mb-3 text-center">Group Consensus</h4>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleVote('up')}
                                            className="flex-1 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl flex justify-center items-center gap-2 font-bold transition-colors border border-green-200"
                                        >
                                            <ThumbsUp className="w-5 h-5" />
                                            <span>{pkg.votes?.up || 0}</span>
                                            <span className="hidden sm:inline font-medium">Love it</span>
                                        </button>
                                        <button
                                            onClick={() => handleVote('down')}
                                            className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl flex justify-center items-center gap-2 font-bold transition-colors border border-red-200"
                                        >
                                            <ThumbsDown className="w-5 h-5" />
                                            <span>{pkg.votes?.down || 0}</span>
                                            <span className="hidden sm:inline font-medium">Not a fan</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Map */}
                        <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-200 h-[300px] flex flex-col relative shrink-0">
                            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                                <h3 className="font-bold text-gray-900 text-sm">Route Map</h3>
                            </div>
                            <div className="flex-1 w-full bg-gray-100 relative">
                                <LeafletMap
                                    mainDestination={pkg.Destination_Name}
                                    itinerary={itineraryItems}
                                />
                            </div>
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
                                                {/* Timeline Node */}
                                                <div className="absolute -left-[11px] top-1">
                                                    <div className="w-5 h-5 bg-white border-4 border-primary rounded-full shadow-sm"></div>
                                                </div>

                                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-primary/30 transition-colors group relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff8a3d] to-[#f85cb5] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">{item.day}</span>
                                                        </div>
                                                        <h5 className="font-bold text-gray-900 text-lg leading-tight mt-1">{item.title}</h5>
                                                        {item.description && (
                                                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <FooterSEO />
        </div>
    );
}
