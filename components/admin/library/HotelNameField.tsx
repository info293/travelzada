'use client'

/** Hotel name combobox for the quote builder's hotel rows — searches the Hotels library (lib/library/hotels.ts) */
import { useCallback } from 'react'
import { BedDouble, Star } from 'lucide-react'
import { findHotelMatches, type LibraryHotel } from '@/lib/library/hotels'
import LibraryCombobox from './LibraryCombobox'

export default function HotelNameField({ value, onChange, onPick, library, ready, city, destination, className }: {
  value: string
  onChange: (v: string) => void
  onPick: (h: LibraryHotel) => void
  library: LibraryHotel[]
  ready: boolean
  city?: string
  destination?: string
  className?: string
}) {
  const search = useCallback((q: string) => findHotelMatches(library, q, { city, destination }, 8).map((m) => m.hotel), [library, city, destination])
  return (
    <LibraryCombobox<LibraryHotel>
      value={value}
      onChange={onChange}
      search={search}
      onPick={onPick}
      itemKey={(h) => h.id}
      placeholder="Hotel name"
      ariaLabel="Hotel name (type to search the hotels library)"
      className={className}
      footer={!ready ? 'Loading the hotels library…' : 'Pick a saved hotel to fill the row — or keep typing a new one (saved to the library when the quote is saved)'}
      renderItem={(h) => <HotelOption h={h} />}
    />
  )
}

export function HotelOption({ h }: { h: LibraryHotel }) {
  const img = h.images[0]?.url
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {img ? <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center text-gray-300"><BedDouble className="h-4 w-4" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-gray-900">{h.name}</span>
          {h.starRating ? <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-amber-600">{h.starRating}<Star className="h-3 w-3 fill-current" /></span> : h.category ? <span className="shrink-0 text-[11px] text-gray-500">{h.category}</span> : null}
        </div>
        <div className="truncate text-xs text-gray-500">
          {[h.city, h.destination].filter(Boolean).join(' · ') || 'City not set'}
          {' · '}
          {h.usageCount ? `used ${h.usageCount}×` : 'not used yet'}
          {h.roomTypes.length ? ` · ${h.roomTypes.length} room type${h.roomTypes.length === 1 ? '' : 's'}` : ''}
        </div>
      </div>
    </div>
  )
}
