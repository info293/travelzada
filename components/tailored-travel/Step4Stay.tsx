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
            <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight drop-shadow-sm">
                    Stay Preferences
                </h2>
                <p className="text-lg text-gray-700 font-medium">Tell us what kind of accommodations you prefer and who is staying.</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">

                {/* Room Configuration */}
                <div className="bg-white/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-gray-200/50">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-6">
                        Travellers & Rooms
                    </label>

                    <div className="space-y-6">
                        {/* Row for Adults */}
                        <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                            <div>
                                <h4 className="font-bold text-xl text-gray-900">Adults</h4>
                                <p className="text-sm text-gray-500 font-medium">Ages 12 or above</p>
                            </div>
                            <div className="flex items-center bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <button
                                    onClick={() => updateCounter('adults', -1)}
                                    className="w-12 h-12 flex items-center justify-center text-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                >-</button>
                                <span className="w-10 text-center font-bold text-lg text-gray-900">{data.passengers?.adults || 2}</span>
                                <button
                                    onClick={() => updateCounter('adults', 1)}
                                    className="w-12 h-12 flex items-center justify-center text-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                >+</button>
                            </div>
                        </div>

                        {/* Row for Kids */}
                        <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                            <div>
                                <h4 className="font-bold text-xl text-gray-900">Children</h4>
                                <p className="text-sm text-gray-500 font-medium">Ages 2 - 11</p>
                            </div>
                            <div className="flex items-center bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <button
                                    onClick={() => updateCounter('kids', -1)}
                                    className="w-12 h-12 flex items-center justify-center text-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                >-</button>
                                <span className="w-10 text-center font-bold text-lg text-gray-900">{data.passengers?.kids || 0}</span>
                                <button
                                    onClick={() => updateCounter('kids', 1)}
                                    className="w-12 h-12 flex items-center justify-center text-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                >+</button>
                            </div>
                        </div>

                        {/* Row for Rooms */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-xl text-gray-900">Rooms</h4>
                                <p className="text-sm text-gray-500 font-medium">Total rooms needed</p>
                            </div>
                            <div className="flex items-center bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <button
                                    onClick={() => updateCounter('rooms', -1)}
                                    className="w-12 h-12 flex items-center justify-center text-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                >-</button>
                                <span className="w-10 text-center font-bold text-lg text-gray-900">{data.passengers?.rooms || 1}</span>
                                <button
                                    onClick={() => updateCounter('rooms', 1)}
                                    className="w-12 h-12 flex items-center justify-center text-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                >+</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hotel Category */}
                <div className="bg-white/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-gray-200/50">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-5">
                        Select Hotel Category
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {HOTEL_OPTIONS.map((item) => {
                            const isSelected = data.hotelTypes.includes(item.id)
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleHotel(item.id)}
                                    className={`relative overflow-hidden flex flex-col items-center justify-center text-center gap-2 p-6 rounded-2xl border transition-all duration-300 group ${isSelected
                                        ? 'bg-primary/5 border-primary shadow-md scale-105'
                                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                                        }`}
                                >
                                    <span className={`text-3xl tracking-widest transition-transform ${isSelected ? 'scale-110 drop-shadow-md' : 'grayscale opacity-70 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100'}`}>{item.icon}</span>
                                    <span className={`font-bold mt-2 text-lg transition-colors ${isSelected ? 'text-primary' : 'text-gray-900 group-hover:text-primary'}`}>{item.label}</span>
                                    <span className="text-xs text-gray-500 font-medium">{item.desc}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

            </div>

            <div className="mt-12 flex justify-center gap-4">
                <button
                    onClick={onPrev}
                    disabled={isSubmitting}
                    className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-full font-bold text-lg hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={isSubmitting || data.hotelTypes.length === 0}
                    className="px-10 py-4 bg-gray-900 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-70 disabled:hover:scale-100 disabled:shadow-none"
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
