'use client'

const HOTEL_OPTIONS = [
    { id: '3-star', label: '3-Star', desc: 'Comfortable & Budget-Friendly', icon: '⭐⭐⭐' },
    { id: '4-star', label: '4-Star', desc: 'Premium Amenities', icon: '⭐⭐⭐⭐' },
    { id: '5-star', label: '5-Star', desc: 'Ultimate Luxury', icon: '⭐⭐⭐⭐⭐' },
]

export default function Step4Stay({
    data,
    updateData,
    onNext,
    onPrev,
    isSubmitting
}: {
    data: any,
    updateData: (data: any) => void,
    onNext: () => void,
    onPrev: () => void,
    isSubmitting?: boolean
}) {

    const toggleHotel = (id: string) => {
        const current = new Set(data.hotelTypes)
        if (current.has(id)) {
            current.delete(id)
        } else {
            current.add(id)
        }
        updateData({ hotelTypes: Array.from(current) })
    }

    const updateCounter = (field: 'adults' | 'kids' | 'rooms', delta: number) => {
        const current = data.passengers[field] || 0

        // Minimum constraints
        if (field === 'adults' && current + delta < 1) return
        if (field === 'rooms' && current + delta < 1) return
        if (field === 'kids' && current + delta < 0) return

        // Maximum constraints roughly
        if (current + delta > 20) return

        updateData({
            passengers: {
                ...data.passengers,
                [field]: current + delta
            }
        })
    }

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight drop-shadow-sm">
                    Stay Preferences
                </h2>
                <p className="text-base text-gray-700 font-medium">Tell us what kind of accommodations you prefer and who is staying.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">

                {/* Room Configuration */}
                <div className="bg-white/70 backdrop-blur-2xl rounded-[1.5rem] p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#ff8a3d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Travellers & Rooms
                    </label>

                    <div className="space-y-4">
                        {/* Row for Adults */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div>
                                <h4 className="font-bold text-lg text-gray-900">Adults</h4>
                                <p className="text-sm text-gray-500 font-medium">Ages 12 or above</p>
                            </div>
                            <div className="flex items-center bg-gray-50 rounded-xl border-2 border-gray-100 overflow-hidden shadow-inner">
                                <button
                                    onClick={() => updateCounter('adults', -1)}
                                    className="w-10 h-10 flex items-center justify-center text-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                                >-</button>
                                <span className="w-8 text-center font-black text-base text-gray-900">{data.passengers?.adults || 2}</span>
                                <button
                                    onClick={() => updateCounter('adults', 1)}
                                    className="w-10 h-10 flex items-center justify-center text-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                                >+</button>
                            </div>
                        </div>

                        {/* Row for Kids */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div>
                                <h4 className="font-bold text-lg text-gray-900">Children</h4>
                                <p className="text-sm text-gray-500 font-medium">Ages 2 - 11</p>
                            </div>
                            <div className="flex items-center bg-gray-50 rounded-xl border-2 border-gray-100 overflow-hidden shadow-inner">
                                <button
                                    onClick={() => updateCounter('kids', -1)}
                                    className="w-10 h-10 flex items-center justify-center text-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                                >-</button>
                                <span className="w-8 text-center font-black text-base text-gray-900">{data.passengers?.kids || 0}</span>
                                <button
                                    onClick={() => updateCounter('kids', 1)}
                                    className="w-10 h-10 flex items-center justify-center text-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                                >+</button>
                            </div>
                        </div>

                        {/* Row for Rooms */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-lg text-gray-900">Rooms</h4>
                                <p className="text-sm text-gray-500 font-medium">Total rooms needed</p>
                            </div>
                            <div className="flex items-center bg-gray-50 rounded-xl border-2 border-gray-100 overflow-hidden shadow-inner">
                                <button
                                    onClick={() => updateCounter('rooms', -1)}
                                    className="w-10 h-10 flex items-center justify-center text-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                                >-</button>
                                <span className="w-8 text-center font-black text-base text-gray-900">{data.passengers?.rooms || 1}</span>
                                <button
                                    onClick={() => updateCounter('rooms', 1)}
                                    className="w-10 h-10 flex items-center justify-center text-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                                >+</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hotel Category */}
                <div className="bg-white/70 backdrop-blur-2xl rounded-[1.5rem] p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#f85cb5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z" /></svg>
                        Select Hotel Category
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {HOTEL_OPTIONS.map((item) => {
                            const isSelected = data.hotelTypes.includes(item.id)
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleHotel(item.id)}
                                    className={`relative overflow-hidden flex flex-col items-center justify-center text-center gap-1.5 p-5 rounded-[1.25rem] border-2 transition-all duration-300 group ${isSelected
                                        ? 'bg-gradient-to-br from-primary/10 to-[#f85cb5]/10 border-primary shadow-[0_8px_30px_rgba(0,0,0,0.08)] scale-[1.02]'
                                        : 'bg-white/70 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-lg shadow-sm'
                                        }`}
                                >
                                    <span className={`text-2xl tracking-widest transition-transform duration-500 ${isSelected ? 'scale-110 drop-shadow-md' : 'grayscale opacity-60 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100'}`}>{item.icon}</span>
                                    <span className={`font-black mt-2 text-lg tracking-tight transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{item.label}</span>
                                    <span className={`text-xs font-medium transition-colors ${isSelected ? 'text-primary' : 'text-gray-500'}`}>{item.desc}</span>

                                    {/* Selection Indicator */}
                                    <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary text-white scale-100 opacity-100' : 'border-gray-300 scale-75 opacity-0 group-hover:opacity-50'}`}>
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

            </div>

            <div className="mt-8 flex justify-center gap-3">
                <button
                    onClick={onPrev}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-white text-gray-700 border-2 border-transparent rounded-full font-bold text-base hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm disabled:opacity-50"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={isSubmitting || data.hotelTypes.length === 0}
                    className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-70 disabled:hover:scale-100 disabled:shadow-none"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin -ml-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Itinerary...
                        </>
                    ) : (
                        'Generate Itinerary ✨'
                    )}
                </button>
            </div>

        </div>
    )
}
