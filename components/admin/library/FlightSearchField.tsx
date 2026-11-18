'use client'

/** Search the Flights library by airline, flight number or route ("DEL→SXR", "delhi srinagar") */
import { useCallback, useState } from 'react'
import { Plane, Search } from 'lucide-react'
import { fareRange, findFlightMatches, placeLabel, routeLabel, type LibraryFlight } from '@/lib/library/flights'
import type { ProposalFlight } from '@/components/admin/proposal/types'
import LibraryCombobox from './LibraryCombobox'
import { formatINR } from '../ui'

/** Library sector → quote sector fields (the date is kept / entered by staff) */
export function flightToSector(f: LibraryFlight, date = ''): ProposalFlight {
  return {
    date,
    airline: f.airline,
    flightNumber: f.flightNumber,
    departureTime: f.departureTime,
    arrivalTime: f.arrivalTime,
    departureCity: placeLabel(f.fromCity, f.fromAirport),
    arrivalCity: placeLabel(f.toCity, f.toAirport),
  }
}

export default function FlightSearchField({ library, ready, onPick, placeholder = 'Search saved flights: airline, flight no. or DEL→SXR', className, from, to }: {
  library: LibraryFlight[]
  ready: boolean
  onPick: (f: LibraryFlight) => void
  placeholder?: string
  className?: string
  from?: string
  to?: string
}) {
  const [text, setText] = useState('')
  const search = useCallback((q: string) => findFlightMatches(library, q, { fromCity: from, toCity: to }, 8), [library, from, to])
  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <LibraryCombobox<LibraryFlight>
          value={text}
          onChange={setText}
          search={search}
          onPick={(f) => { onPick(f); setText('') }}
          itemKey={(f) => f.id}
          placeholder={placeholder}
          inputClassName="pl-9"
          ariaLabel="Search the flights library"
          footer={!ready ? 'Loading the flights library…' : library.length ? 'Picking fills airline, flight no., cities and times — you still set the date' : 'No saved flights yet — sectors you enter are saved when the quote is saved'}
          renderItem={(f) => <FlightOption f={f} />}
        />
      </div>
    </div>
  )
}

export function FlightOption({ f }: { f: LibraryFlight }) {
  const [lo, hi] = fareRange(f)
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bordeaux-50 text-bordeaux-700"><Plane className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{routeLabel(f)}</span>
          <span className="truncate text-xs text-gray-600">{[f.airline, f.flightNumber].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="truncate text-xs text-gray-500">
          {f.departureTime || '--:--'} → {f.arrivalTime || '--:--'}
          {f.duration ? ` · ${f.duration}` : ''}
          {f.stops ? ` · ${f.stops} stop${f.stops > 1 ? 's' : ''}${f.via ? ` via ${f.via}` : ''}` : ' · non-stop'}
          {lo ? ` · ${formatINR(lo)}${hi && hi !== lo ? `–${formatINR(hi)}` : ''}` : ''}
          {` · used ${f.usageCount}×`}
        </div>
      </div>
    </div>
  )
}
