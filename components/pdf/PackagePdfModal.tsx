'use client'

import { X } from 'lucide-react'

export interface PackagePdfModalProps {
  title: string
  destination: string
  destinationCountry?: string
  durationDays?: number
  durationNights?: number
  starCategory?: string
  travelType?: string
  theme?: string
  mood?: string
  seasonalAvailability?: string
  pricePerPerson?: number | null
  quotedPriceTotal?: number | null
  groupSize?: number
  adults?: number
  kids?: number
  overview?: string
  inclusions?: string[]
  exclusions?: string[]
  highlights?: string[]
  dayWiseItinerary?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  preferredDates?: string
  refId?: string
  specialRequests?: string
  brandName: string
  onClose: () => void
  onWhatsApp: () => void
  onPrint: () => void
}

export default function PackagePdfModal({
  title, destination, destinationCountry,
  durationDays, durationNights, starCategory, travelType, theme, mood, seasonalAvailability,
  pricePerPerson, quotedPriceTotal, groupSize = 1, adults, kids,
  overview, inclusions = [], exclusions = [], highlights = [],
  dayWiseItinerary,
  customerName, customerEmail, customerPhone, preferredDates, refId, specialRequests,
  brandName, onClose, onWhatsApp, onPrint,
}: PackagePdfModalProps) {
  const itineraryLines = dayWiseItinerary ? dayWiseItinerary.split('\n').filter(Boolean) : []

  const days: { title: string; desc: string }[] = []
  if (itineraryLines.length > 0) {
    let cur: { title: string; desc: string } | null = null
    for (const line of itineraryLines) {
      if (/^day\s*\d+/i.test(line)) {
        if (cur) days.push(cur)
        cur = { title: line, desc: '' }
      } else if (cur) {
        cur.desc += (cur.desc ? '\n' : '') + line
      }
    }
    if (cur) days.push(cur)
  }

  const displayPrice = pricePerPerson ?? null
  const priceLabel = quotedPriceTotal ? 'Quoted Price' : 'Price per Person'

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4 print:p-0 print:bg-white print:block">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl print:shadow-none print:rounded-none print:max-w-full">

        {/* Modal controls — hidden on print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <div>
            <h3 className="font-bold text-gray-900">Package PDF Preview</h3>
            <p className="text-xs text-gray-400 mt-0.5">Print or save as PDF, then share via WhatsApp</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onWhatsApp}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl"
            >
              📱 Print &amp; Share on WhatsApp
            </button>
            <button
              onClick={onPrint}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50"
            >
              🖨️ Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="p-8 space-y-6 print:p-6">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Travel Package</p>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-500 text-sm mt-1">
                📍 {destination}{destinationCountry ? `, ${destinationCountry}` : ''}
              </p>
              {refId && <p className="text-xs text-gray-400 mt-1">Ref: {refId}</p>}
            </div>
            <div className="text-right ml-6 flex-shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase">{priceLabel}</p>
              {quotedPriceTotal ? (
                <>
                  <p className="text-3xl font-bold text-purple-600">₹{Number(quotedPriceTotal).toLocaleString('en-IN')}</p>
                  {groupSize > 1 && <p className="text-xs text-gray-400">Total for {groupSize} traveller{groupSize !== 1 ? 's' : ''}</p>}
                  {displayPrice && groupSize > 1 && (
                    <p className="text-xs text-gray-400">₹{Number(displayPrice).toLocaleString('en-IN')} per person</p>
                  )}
                </>
              ) : displayPrice ? (
                <p className="text-3xl font-bold text-purple-600">₹{Number(displayPrice).toLocaleString('en-IN')}</p>
              ) : (
                <p className="text-sm font-semibold text-gray-500">To be confirmed</p>
              )}
            </div>
          </div>

          {/* Meta pills */}
          {(durationDays || starCategory || travelType || theme || mood || seasonalAvailability) && (
            <div className="flex flex-wrap gap-2">
              {[
                durationDays && durationNights ? `🗓️ ${durationDays}D / ${durationNights}N` : null,
                starCategory ? `⭐ ${starCategory}` : null,
                travelType ? `🎒 ${travelType}` : null,
                theme ? `🌿 ${theme}` : null,
                mood ? `✨ ${mood}` : null,
                seasonalAvailability ? `📅 ${seasonalAvailability}` : null,
              ].filter(Boolean).map((tag, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
                  {tag as string}
                </span>
              ))}
            </div>
          )}

          {/* Customer info — shown only for quotations */}
          {customerName && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prepared For</p>
                <p className="text-lg font-bold text-gray-900">{customerName}</p>
                <div className="mt-2 space-y-1">
                  {customerEmail && <p className="text-xs text-gray-500">✉️ {customerEmail}</p>}
                  {customerPhone && <p className="text-xs text-gray-500">📞 {customerPhone}</p>}
                  {preferredDates && <p className="text-xs text-gray-500">📅 {preferredDates}</p>}
                  {(adults != null || kids != null) && (
                    <p className="text-xs text-gray-500">
                      👥 {adults ?? groupSize}A{kids ? ` + ${kids}K` : ''} ({groupSize} traveller{groupSize !== 1 ? 's' : ''})
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-indigo-600 rounded-2xl p-4 flex flex-col justify-center">
                <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest mb-1.5">Prepared By</p>
                <p className="text-base font-bold text-white">{brandName}</p>
                <p className="text-xs text-indigo-300 mt-1">Your trusted travel partner</p>
                <div className="mt-3 pt-3 border-t border-indigo-500">
                  <p className="text-[9px] text-indigo-300">Date issued</p>
                  <p className="text-xs font-semibold text-indigo-100 mt-0.5">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overview */}
          {overview && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Overview</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{overview}</p>
            </div>
          )}

          {/* Inclusions / Exclusions */}
          {(inclusions.length > 0 || exclusions.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {inclusions.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-green-700 mb-1.5">✓ Inclusions</h3>
                  <ul className="space-y-1">
                    {inclusions.map((inc, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>{inc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {exclusions.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-600 mb-1.5">✗ Exclusions</h3>
                  <ul className="space-y-1">
                    {exclusions.map((exc, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>{exc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">✨ Highlights</h3>
              <ul className="space-y-1">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="text-purple-500 mt-0.5 flex-shrink-0">✦</span>{h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Day-wise itinerary */}
          {(days.length > 0 || itineraryLines.length > 0) && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">📅 Day-Wise Itinerary</h3>
              {days.length > 0 ? (
                <div className="space-y-3">
                  {days.map((d, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-7 h-7 bg-purple-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{d.title}</p>
                        {d.desc && <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{d.desc}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {itineraryLines.map((line, i) => (
                    <p key={i} className={`text-sm ${/^day\s*\d+/i.test(line) ? 'font-bold text-gray-900' : 'text-gray-600 pl-4'}`}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Special requests */}
          {specialRequests && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1.5">Special Requests</p>
              <p className="text-sm text-gray-700">{specialRequests}</p>
            </div>
          )}

          {/* Terms */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Terms &amp; Conditions</p>
            <ul className="space-y-1">
              {[
                'This quotation is valid for 7 days from the date of issue.',
                'Prices are subject to availability at the time of booking.',
                'A deposit may be required to confirm the booking.',
                'For queries, please contact your travel agent directly.',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                  <span className="text-gray-300 flex-shrink-0">•</span>{t}
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-center">
            <p className="text-xs text-gray-400">
              {brandName} · This is a preliminary quotation subject to availability
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
