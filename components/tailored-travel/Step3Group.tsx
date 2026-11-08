'use client'

import { BUDGETS } from './smart/shared'

const HOTEL_OPTIONS = [
    { id: '3-star', label: '3-Star', desc: 'Comfortable & great value', stars: 3 },
    { id: '4-star', label: '4-Star', desc: 'Premium comfort', stars: 4 },
    { id: '5-star', label: '5-Star', desc: 'Pure luxury', stars: 5 },
]

const StarRow = ({ count, on }: { count: number; on: boolean }) => (
    <div className="flex gap-0.5">
        {Array.from({ length: count }).map((_, i) => (
            <svg key={i} className={`w-4 h-4 ${on ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
)

/**
 * Main-site step 3: budget per person, hotel category and number of travellers.
 * Every Travelzada trip is for couples, so the group type is fixed to 'couple'.
 */
export default function Step3Group({
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
    const adults: number = data.passengers?.adults || 2

    const toggleHotel = (id: string) => {
        const current = new Set<string>(data.hotelTypes || [])
        if (current.has(id)) current.delete(id)
        else current.add(id)
        updateData({ hotelTypes: Array.from(current) })
    }

    const setBudget = (id: string) => {
        const b = BUDGETS.find((x) => x.id === id)
        if (!b || data.budgetKey === id) {
            updateData({ budgetKey: null, budgetPerPerson: null })
            return
        }
        updateData({ budgetKey: b.id, budgetPerPerson: b.max })
    }

    const setAdults = (delta: number) => {
        const next = Math.max(1, Math.min(10, adults + delta))
        updateData({
            groupType: 'couple',
            passengers: { ...(data.passengers || {}), adults: next, rooms: Math.max(1, Math.ceil(next / 2)) },
            groupSize: { ...(data.groupSize || {}), adults: next },
        })
    }

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-gray-900 mb-2 tracking-tight">
                    Budget &amp; stay
                </h2>
                <p className="text-sm sm:text-base text-gray-600 font-medium">Tell us roughly what you'd like to spend — we'll show honest matches.</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-3">
                {/* Budget per person */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Budget per person</p>
                    <p className="text-xs text-gray-500 mb-4">Includes hotels, transfers and sightseeing as listed in each trip.</p>
                    <div className="flex flex-wrap gap-2">
                        {BUDGETS.map((b) => {
                            const isSelected = data.budgetKey === b.id
                            return (
                                <button
                                    type="button"
                                    key={b.id}
                                    onClick={() => setBudget(b.id)}
                                    className={`px-4 py-2.5 rounded-full border-2 text-sm font-semibold transition-all ${isSelected
                                        ? 'bg-bordeaux-600 border-bordeaux-600 text-white shadow-md'
                                        : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {b.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Hotel Category */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Hotel category</p>
                    <p className="text-xs text-gray-500 mb-4">Pick one or more — or skip to see all.</p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {HOTEL_OPTIONS.map((item) => {
                            const isSelected = (data.hotelTypes || []).includes(item.id)
                            return (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => toggleHotel(item.id)}
                                    className={`relative flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border-2 transition-all ${isSelected
                                        ? 'bg-bordeaux-50 border-bordeaux-500 shadow-md'
                                        : 'bg-gray-50 border-gray-100 hover:border-bordeaux-200'
                                        }`}
                                >
                                    <StarRow count={item.stars} on={isSelected} />
                                    <span className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{item.label}</span>
                                    <span className={`text-[10px] sm:text-xs text-center leading-tight ${isSelected ? 'text-bordeaux-700' : 'text-gray-400'}`}>{item.desc}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Travellers */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Travellers</p>
                        <p className="text-sm text-gray-700 font-medium mt-1">{adults === 2 ? 'Just the two of you 💑' : `${adults} adults`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setAdults(-1)}
                            disabled={adults <= 1}
                            aria-label="Fewer travellers"
                            className="w-10 h-10 rounded-full bg-white border border-gray-200 text-lg font-bold text-gray-700 hover:border-bordeaux-400 disabled:opacity-30"
                        >
                            −
                        </button>
                        <span className="w-8 text-center text-xl font-black tabular-nums text-gray-900">{adults}</span>
                        <button
                            type="button"
                            onClick={() => setAdults(1)}
                            disabled={adults >= 10}
                            aria-label="More travellers"
                            className="w-10 h-10 rounded-full bg-white border border-gray-200 text-lg font-bold text-gray-700 hover:border-bordeaux-400 disabled:opacity-30"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-col-reverse sm:flex-row justify-center items-center gap-3 sm:gap-4 w-full">
                <button
                    onClick={onPrev}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3 sm:py-3.5 bg-white text-gray-700 border-2 border-gray-200 rounded-full font-medium text-sm sm:text-base hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-10 py-3 sm:py-3.5 bg-bordeaux-600 text-white rounded-full font-semibold text-sm sm:text-base shadow-xl hover:bg-bordeaux-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin -ml-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Finding your trips…
                        </>
                    ) : (
                        'Show my matches ✨'
                    )}
                </button>
            </div>
        </div>
    )
}
