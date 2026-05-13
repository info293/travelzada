'use client'

export default function StepDmc3Details({
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
  const travelDate = (!['Flexible', 'Next Month', 'Within 3 Months', 'Decided Dates'].includes(data.dateRange) && data.dateRange)
    ? data.dateRange
    : ''

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          Trip Details
        </h2>
        <p className="text-sm sm:text-lg text-gray-500 font-medium px-2">
          Set your pickup, drop and travel date. All fields are optional.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-3">

        {/* Pickup & Drop */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">3</span>
              Pickup &amp; Drop City
              <span className="text-[8px] text-gray-300 normal-case tracking-normal font-semibold">optional</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Pickup City
                </p>
                <input
                  type="text"
                  value={data.pickupCity || ''}
                  onChange={e => updateData({ pickupCity: e.target.value })}
                  placeholder="e.g. Kochi Airport"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/8 transition-all text-sm font-medium outline-none text-gray-900 placeholder-gray-300"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Drop City
                </p>
                <input
                  type="text"
                  value={data.dropCity || ''}
                  onChange={e => updateData({ dropCity: e.target.value })}
                  placeholder="e.g. Cochin"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/8 transition-all text-sm font-medium outline-none text-gray-900 placeholder-gray-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Travel Date */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">4</span>
              Travel Date
            </p>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={travelDate}
                onChange={e => updateData({ dateRange: e.target.value })}
                onClick={e => { try { (e.target as HTMLInputElement).showPicker?.() } catch {} }}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/8 transition-all font-semibold text-gray-900 outline-none cursor-pointer"
              />
            </div>
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
          className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
