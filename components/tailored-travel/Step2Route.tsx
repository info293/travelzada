'use client'

import { useState } from 'react'

export default function Step2Route({
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

    // Create a default route planning state if none exists yet based on destinations
    const routeItems = data.routeItems.length > 0
        ? data.routeItems
        : data.destinations.map((d: string, index: number) => ({
            id: `route-${index}`,
            destination: d,
            nights: 2
        }))

    // Save initial mapped route elements back to state if we just generated them
    if (data.routeItems.length === 0 && data.destinations.length > 0) {
        updateData({ routeItems })
    }

    const updateNights = (index: number, delta: number) => {
        const newItems = [...routeItems]
        const newNights = newItems[index].nights + delta
        if (newNights >= 1 && newNights <= 14) {
            newItems[index].nights = newNights
            updateData({ routeItems: newItems })
        }
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

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight drop-shadow-sm">
                    Customize Your Journey
                </h2>
                <p className="text-lg text-gray-700 font-medium">Review your route and adjust the duration for each stop.</p>
            </div>

            <div className="max-w-4xl mx-auto">

                {/* Route List */}
                <div className="w-full space-y-4 bg-white/70 backdrop-blur-2xl rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
                    <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-[#f85cb5] drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Your Itinerary Options
                    </h3>

                    <div className="space-y-3 relative">
                        {/* Decorative timeline line */}
                        <div className="absolute left-[1.15rem] top-6 bottom-6 w-1 bg-gradient-to-b from-primary/20 via-[#f85cb5]/20 to-transparent rounded-full z-0"></div>

                        {routeItems.map((item: any, index: number) => (
                            <div
                                key={item.id || index}
                                className="relative z-10 flex items-center gap-4 bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-gray-200 hover:shadow-md group"
                            >
                                {/* Node counter */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#f85cb5] text-white flex items-center justify-center font-bold shadow-md flex-shrink-0">
                                    {index + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-lg truncate tracking-tight">{item.destination}</h4>
                                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 font-medium">
                                        <span className="text-lg">🌙</span>
                                        {item.nights} Nights
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 md:gap-3 pl-2">
                                    {/* Nights Adjuster */}
                                    <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-inner font-medium">
                                        <button
                                            onClick={() => updateNights(index, -1)}
                                            disabled={item.nights <= 1}
                                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                        >-</button>
                                        <span className="w-6 text-center text-sm font-bold text-gray-900">{item.nights}</span>
                                        <button
                                            onClick={() => updateNights(index, 1)}
                                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                                        >+</button>
                                    </div>

                                    {/* Delete button (hidden until hover on desktop) */}
                                    <button
                                        onClick={() => removeRouteItem(index)}
                                        className="w-8 h-8 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all md:opacity-0 md:group-hover:opacity-100"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add another destination button removed per user request */}
                    </div>
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
                    className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all text-center"
                >
                    Group Details →
                </button>
            </div>

        </div>
    )
}
