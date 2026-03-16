'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

export default function Step2Nights({
    data,
    updateData,
    onNext,
    onPrev
}: {
    data: any,
    updateData: (data: any) => void,
    onNext: () => void,
    onPrev: () => void
}) {

    const [availableOptions, setAvailableOptions] = useState<Record<string, { nights: number, label: string }[]>>({})
    const [loading, setLoading] = useState(true)

    // Create a synchronized route planning state based on destinations
    const routeItems = data.destinations.map((d: string, index: number) => {
        const existingItem = data.routeItems.find((item: any) => item.destination === d);
        return existingItem || {
            id: `route-${index}`,
            destination: d,
            nights: null
        };
    });

    // Save synchronized route elements back to state if they change
    useEffect(() => {
        const isSyncNeeded = data.destinations.length !== data.routeItems.length ||
            data.destinations.some((d: string, i: number) => data.routeItems[i]?.destination !== d);

        if (isSyncNeeded) {
            updateData({ routeItems });
        }
    }, [data.destinations, data.routeItems, routeItems, updateData]);

    useEffect(() => {
        const fetchPackageNights = async () => {
            if (!db) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                const packagesRef = collection(db, 'packages')
                const allPackagesSnapshot = await getDocs(packagesRef)

                const destPackagesOptions: Record<string, { nights: number, label: string }[]> = {}

                data.destinations.forEach((dest: string) => {
                    destPackagesOptions[dest] = []
                })

                allPackagesSnapshot.forEach((doc) => {
                    const docData = doc.data()
                    const pkgName = (docData.Destination_Name || '').trim().toLowerCase()
                    const pkgId = (docData.Destination_ID || '').trim().toLowerCase()

                    data.destinations.forEach((dest: string) => {
                        const normalizedDest = dest.trim().toLowerCase()
                        if (!normalizedDest) return;

                        const hasMatch = (pkgName && (pkgName.includes(normalizedDest) || normalizedDest.includes(pkgName))) ||
                                         (pkgId && (pkgId.includes(normalizedDest) || normalizedDest.includes(pkgId)));

                        if (hasMatch) {

                            let nights = docData.Duration_Nights
                            if (!nights && docData.Duration) {
                                const match = String(docData.Duration).match(/(\d+)\s*[Nn]ight/)
                                if (match) nights = parseInt(match[1])
                            }

                            let days = docData.Duration_Days
                            if (!days && docData.Duration) {
                                const match = String(docData.Duration).match(/(\d+)\s*[Dd]ay/)
                                if (match) days = parseInt(match[1])
                            }

                            if (nights) {
                                const parsedNights = typeof nights === 'string' ? parseInt(nights) : nights
                                if (!destPackagesOptions[dest].find(o => o.nights === parsedNights)) {
                                    destPackagesOptions[dest].push({
                                        nights: parsedNights,
                                        label: days ? `${days} Days / ${parsedNights} Nights` : `${parsedNights} Nights`
                                    })
                                }
                            }
                        }
                    })
                })

                // Sort options by nights and set fallbacks
                const newRouteItems = [...routeItems]
                let shouldUpdateRouteItems = false

                Object.keys(destPackagesOptions).forEach((dest) => {
                    destPackagesOptions[dest].sort((a, b) => a.nights - b.nights)
                    
                    if (destPackagesOptions[dest].length === 0) {
                        destPackagesOptions[dest] = [
                            { nights: 2, label: '3 Days / 2 Nights' },
                            { nights: 3, label: '4 Days / 3 Nights' },
                            { nights: 4, label: '5 Days / 4 Nights' },
                            { nights: 5, label: '6 Days / 5 Nights' }
                        ]
                    }

                    // Auto-select first available option if null or not in list
                    const currentItem = newRouteItems.find(item => item.destination === dest)
                    if (currentItem) {
                        const hasMatchingOption = destPackagesOptions[dest].some(opt => opt.nights === currentItem.nights)
                        if (!currentItem.nights || !hasMatchingOption) {
                            currentItem.nights = destPackagesOptions[dest][0].nights
                            shouldUpdateRouteItems = true
                        }
                    }
                })

                setAvailableOptions(destPackagesOptions)
                if (shouldUpdateRouteItems) {
                    updateData({ routeItems: newRouteItems })
                }
            } catch (error) {
                console.error('Error fetching package days:', error)
            } finally {
                setLoading(false)
            }
        }

        if (data.destinations.length > 0) {
            fetchPackageNights()
        } else {
            setLoading(false)
        }
    }, [data.destinations]) // Only re-fetch if destinations change

    const selectNights = (index: number, nights: number) => {
        const newItems = [...routeItems]
        newItems[index].nights = nights
        updateData({ routeItems: newItems })
    }

    const removeRouteItem = (index: number) => {
        const newItems = [...routeItems]
        newItems.splice(index, 1)

        // Auto update destinations array to stay in sync
        const newDestinations = newItems.map(i => i.destination)
        updateData({
            routeItems: newItems,
            destinations: newDestinations
        })

        if (newItems.length === 0) {
            onPrev() // bounce back to step 1 if they delete all
        }
    }

    // Check if all stops have a valid nights selection
    const canProceed = routeItems.every((item: any) => item.nights !== null && item.nights > 0)

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight drop-shadow-sm">
                    Customize Your Journey
                </h2>
                <p className="text-lg text-gray-700 font-medium">Review your route and select the package duration for each stop.</p>
            </div>

            <div className="max-w-4xl mx-auto">

                {/* Route List */}
                <div className="w-full space-y-4 bg-white/70 backdrop-blur-2xl rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
                    <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-[#ff8a3d] drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Available Packages
                    </h3>

                    {loading ? (
                        <div className="py-8 text-center text-gray-500 font-medium animate-pulse">
                            Loading package durations...
                        </div>
                    ) : (
                        <div className="space-y-4 relative">
                            {/* Decorative timeline line */}
                            <div className="absolute left-[1.15rem] top-6 bottom-6 w-1 bg-gradient-to-b from-primary/20 via-[#ff8a3d]/20 to-transparent rounded-full z-0"></div>

                            {routeItems.map((item: any, index: number) => {
                                const options = availableOptions[item.destination] || []

                                return (
                                    <div
                                        key={item.id || index}
                                        className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-gray-200 hover:shadow-md group"
                                    >
                                        <div className="flex items-center gap-4 md:w-[220px] lg:w-[260px] flex-shrink-0 min-w-0">
                                            {/* Node counter */}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#ff8a3d] text-white flex items-center justify-center font-bold shadow-md flex-shrink-0">
                                                {index + 1}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-900 text-lg tracking-tight truncate" title={item.destination}>{item.destination}</h4>
                                                {item.nights ? (
                                                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 font-medium md:hidden">
                                                        <span className="text-lg">🌙</span>
                                                        {item.nights} Nights Selected
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-red-500 font-medium mt-1 md:hidden">Select duration below</div>
                                                )}
                                            </div>

                                            {/* Delete button (Visible on mobile only in this flex item) */}
                                            <button
                                                onClick={() => removeRouteItem(index)}
                                                className="w-8 h-8 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all md:hidden"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>

                                        <div className="pl-14 md:pl-0 flex-1 min-w-0">
                                            {/* Duration Buttons Container */}
                                            <div className="flex flex-wrap gap-2 md:justify-end">
                                                {options.length > 0 ? options.map((opt, i) => {
                                                    const isSelected = item.nights === opt.nights;
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => selectNights(index, opt.nights)}
                                                            className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all ${
                                                                isSelected
                                                                ? 'bg-gradient-to-r from-primary to-[#ff8a3d] text-white border-transparent shadow-md scale-105'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                                                            }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    )
                                                }) : (
                                                    <div className="text-sm text-gray-400 italic">No packages available</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete button (Desktop) */}
                                        <div className="hidden md:flex flex-shrink-0 ml-2">
                                            <button
                                                onClick={() => removeRouteItem(index)}
                                                className="w-8 h-8 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 flex justify-center gap-3">
                <button
                    onClick={onPrev}
                    className="px-8 py-3 bg-white text-gray-700 border-2 border-transparent rounded-full font-bold text-base hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!canProceed || loading}
                    className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all text-center disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                    {loading ? 'Wait...' : 'Group Details →'}
                </button>
            </div>

        </div>
    )
}
