'use client'

export default function StepDmc5Pax({
  data,
  updateData,
  onNext,
  onPrev,
  isSubmitting,
}: {
  data: any
  updateData: (d: any) => void
  onNext: () => void
  onPrev: () => void
  isSubmitting?: boolean
}) {
  const groupSize = data.groupSize || { adults: 2, children: 0, infants: 0 }

  const adjust = (field: 'adults' | 'children' | 'infants', delta: number) => {
    const min = field === 'adults' ? 1 : 0
    const newVal = Math.max(min, (groupSize[field] || 0) + delta)
    updateData({
      groupSize: { ...groupSize, [field]: newVal },
      passengers: {
        adults: field === 'adults' ? newVal : groupSize.adults,
        kids: field === 'children' ? newVal : groupSize.children,
        rooms: Math.max(1, Math.ceil((field === 'adults' ? newVal : groupSize.adults) / 2)),
      },
    })
  }

  const fields = [
    { field: 'adults',   label: 'Adults',   sub: 'Age 12+',   emoji: '🧑', min: 1 },
    { field: 'children', label: 'Children', sub: 'Age 2–11',  emoji: '👦', min: 0 },
    { field: 'infants',  label: 'Infants',  sub: 'Under 2',   emoji: '👶', min: 0 },
  ] as const

  const totalPax = (groupSize.adults || 0) + (groupSize.children || 0) + (groupSize.infants || 0)

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          Group Size
        </h2>
        <p className="text-sm sm:text-lg text-gray-500 font-medium px-2">
          How many people are travelling? <span className="text-gray-300">(optional · default 2)</span>
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-3">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">7</span>
              PAX (Passengers)
            </h3>
            {totalPax > 0 && (
              <p className="text-xs text-gray-400 font-medium mt-1 ml-7">
                {totalPax} {totalPax === 1 ? 'person' : 'people'} total
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 p-4 gap-3">
            {fields.map(({ field, label, sub, emoji, min }) => (
              <div key={field} className="flex flex-col items-center py-4 px-2 bg-gray-50 rounded-2xl">
                <span className="text-2xl mb-1">{emoji}</span>
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{label}</span>
                <span className="text-[9px] text-gray-400 mb-3">{sub}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjust(field, -1)}
                    disabled={(groupSize[field] || 0) <= min}
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg shadow-sm"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-black text-2xl text-gray-900 tabular-nums">
                    {groupSize[field] || 0}
                  </span>
                  <button
                    onClick={() => adjust(field, 1)}
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-all font-bold text-lg shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-5 text-white shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50 mb-3">Trip Summary</p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-white/40">📍</span>
              <span className="font-semibold truncate">{data.destinations[0] || '—'}</span>
            </div>
            {(data.includedCities?.length > 0) && (
              <div className="flex items-center gap-2">
                <span className="text-white/40">🏙️</span>
                <span className="font-semibold truncate">{data.includedCities.length} cities</span>
              </div>
            )}
            {data.dateRange && !['Flexible'].includes(data.dateRange) && (
              <div className="flex items-center gap-2">
                <span className="text-white/40">📅</span>
                <span className="font-semibold">{data.dateRange}</span>
              </div>
            )}
            {data.routeItems?.[0]?.nights > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-white/40">🌙</span>
                <span className="font-semibold">{data.routeItems[0].nights} nights</span>
              </div>
            )}
            {data.hotelIncluded && data.hotelTypes?.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-white/40">🏨</span>
                <span className="font-semibold">{data.hotelTypes.join(', ')}</span>
              </div>
            )}
            {(data.pickupCity || data.dropCity) && (
              <div className="flex items-center gap-2 col-span-2">
                <span className="text-white/40">🚗</span>
                <span className="font-semibold truncate">
                  {data.pickupCity || '—'} → {data.dropCity || '—'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={onPrev}
          disabled={isSubmitting}
          className="px-8 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-full font-bold text-base hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={isSubmitting}
          className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Finding Packages…
            </>
          ) : (
            'Find Package ✨'
          )}
        </button>
      </div>
    </div>
  )
}
