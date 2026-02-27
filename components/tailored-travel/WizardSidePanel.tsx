'use client'

import dynamic from 'next/dynamic'

// Dynamically import the leaflet map to disable SSR, as Leaflet requires the window object
const MapComponent = dynamic(() => import('./LeafletMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
            <span className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
            <p className="mt-4 text-gray-400 text-sm font-bold tracking-widest uppercase">Initializing Map...</p>
        </div>
    )
})

export default function WizardSidePanel({
    currentStep,
    data
}: {
    currentStep: number,
    data: any
}) {
    // If we have route items mapped out, use them. Otherwise, map destinations to a simple structure.
    const routeItems = data.routeItems.length > 0
        ? data.routeItems
        : data.destinations.map((d: string, index: number) => ({
            id: `summary-route-${index}`,
            destination: d,
            nights: 0 // unknown at step 1
        }))

    return (
        <div className="hidden lg:flex w-[45%] bg-white/80 backdrop-blur-3xl border border-gray-200/50 shadow-2xl shadow-gray-200/50 rounded-[2.5rem] p-8 text-gray-900 flex-col relative overflow-hidden flex-1">
            {/* Cartographic Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTQwIDBMMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjIiLz48L3N2Zz4=')] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="mb-8 flex items-center gap-3">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    <div>
                        <h3 className="text-3xl font-bold drop-shadow-sm">Live Journey Map</h3>
                        <p className="text-gray-500 font-medium">
                            {routeItems.length === 0
                                ? "Your map is currently empty."
                                : "A personalized map of your tailored trip."}
                        </p>
                    </div>
                </div>

                <div className="relative w-full flex-1">
                    <MapComponent
                        mainDestination={routeItems[0]?.destination}
                        itinerary={routeItems.length > 1 ? routeItems.slice(1).map((item: any) => ({ title: item.destination })) : []}
                        hideCarAnimation={true}
                    />
                </div>
            </div>
        </div>
    )
}
