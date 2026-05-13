'use client'

const HOTEL_STAR_OPTIONS = [
  { id: '3-star', label: '3-Star', desc: 'Comfortable & Budget-Friendly', count: 3 },
  { id: '4-star', label: '4-Star', desc: 'Premium Amenities', count: 4 },
  { id: '5-star', label: '5-Star', desc: 'Ultimate Luxury', count: 5 },
]

export default function StepDmc4HotelNights({
  data,
  updateData,
  onNext,
  onPrev,
}: {
  data: any
  updateData: (d: any) => void
  onNext: () => void
  onPrev: () => void
}) {
  const availableNights: { nights: number; label: string }[] = data.availableNights || []
  const selectedNights: number | null = data.routeItems?.[0]?.nights || null

  const setHotelIncluded = (value: boolean) => {
    updateData({
      hotelIncluded: value,
      hotelTypes: value ? (data.hotelTypes?.length > 0 ? data.hotelTypes : ['4-star']) : [],
    })
  }

  const toggleHotelStar = (id: string) => {
    const current = new Set(data.hotelTypes as string[])
    if (current.has(id)) current.delete(id)
    else current.add(id)
    updateData({ hotelTypes: Array.from(current) })
  }

  const selectNights = (nights: number) => {
    const destination = data.destinations[0] || ''
    updateData({ routeItems: [{ destination, nights }] })
  }

  const canProceed = selectedNights !== null && selectedNights > 0

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          Hotel &amp; Duration
        </h2>
        <p className="text-sm sm:text-lg text-gray-500 font-medium px-2">
          Set your hotel preference and trip duration.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-3">

        {/* Hotel Preference */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">5</span>
              Hotel Preference
            </p>

            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-gray-100 rounded-2xl mb-4">
              <button
                onClick={() => setHotelIncluded(false)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  !data.hotelIncluded
                    ? 'bg-white shadow-sm text-gray-900 scale-[1.01]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="text-lg">🏕️</span>
                Without Hotel
              </button>
              <button
                onClick={() => setHotelIncluded(true)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  data.hotelIncluded
                    ? 'bg-gray-900 shadow-md text-white scale-[1.01]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="text-lg">🏨</span>
                With Hotel
              </button>
            </div>

            {data.hotelIncluded && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.12em] mb-3">Select Star Category</p>
                <div className="grid grid-cols-3 gap-3">
                  {HOTEL_STAR_OPTIONS.map(opt => {
                    const isSelected = (data.hotelTypes as string[]).includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleHotelStar(opt.id)}
                        className={`relative flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-2xl border-2 transition-all duration-200 select-none ${
                          isSelected
                            ? 'bg-gradient-to-br from-primary/10 to-[#ff8a3d]/10 border-primary shadow-lg shadow-primary/15 scale-[1.04]'
                            : 'bg-gray-50 border-gray-100 hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.02]'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        <div className="flex gap-0.5">
                          {Array.from({ length: opt.count }).map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className={`text-sm font-black tracking-tight ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{opt.label}</span>
                        <span className={`text-[10px] font-semibold text-center leading-tight ${isSelected ? 'text-primary' : 'text-gray-400'}`}>{opt.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Package Nights */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">6</span>
              Package Nights
            </p>

            {availableNights.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No package durations available.</p>
            ) : (
              <>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4">Select Duration</p>
                <div className="flex flex-wrap gap-3">
                  {availableNights.map(opt => {
                    const isSelected = selectedNights === opt.nights
                    const parts = opt.label.split('/')
                    const daysLabel = parts[0]?.trim() || ''
                    return (
                      <button
                        key={opt.nights}
                        onClick={() => selectNights(opt.nights)}
                        className={`relative flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 transition-all duration-200 group select-none ${
                          isSelected
                            ? 'bg-gradient-to-br from-primary to-[#ff8a3d] border-transparent shadow-xl shadow-primary/30 scale-105'
                            : 'bg-gray-50 border-gray-100 hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.03] hover:shadow-md'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🌙</span>
                        <span className={`text-2xl font-black leading-none tabular-nums ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {opt.nights}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                          nights
                        </span>
                        {daysLabel && (
                          <span className={`text-[9px] font-semibold mt-0.5 ${isSelected ? 'text-white/60' : 'text-gray-300'}`}>
                            {daysLabel}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={onPrev}
          className="px-8 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-full font-bold text-base hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
