'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface DestinationOption {
  name: string
  label: string
}

interface NightOption {
  nights: number
  label: string
}

const HOTEL_STAR_OPTIONS = [
  { id: '3-star', label: '3-Star', desc: 'Comfortable & Budget-Friendly', count: 3 },
  { id: '4-star', label: '4-Star', desc: 'Premium Amenities', count: 4 },
  { id: '5-star', label: '5-Star', desc: 'Ultimate Luxury', count: 5 },
]

function extractCitiesFromPackage(pkg: any): string[] {
  const cities = new Set<string>()

  // Primary: extract from hotels array
  if (Array.isArray(pkg.hotels)) {
    pkg.hotels.forEach((h: any) => {
      const city = (h.destination || '').trim()
      if (city) cities.add(city)
    })
  }

  // Secondary: parse dayWiseItinerary string
  if (typeof pkg.dayWiseItinerary === 'string' && pkg.dayWiseItinerary) {
    const matches = pkg.dayWiseItinerary.matchAll(/Day\s*\d+\s*[:\-]\s*([^|\n\r]+)/gi)
    for (const match of matches) {
      const raw = match[1].trim()
      const city = raw
        .replace(/^(arrive|arrival|transfer|depart|departure|travel|drive|fly|check[- ]in|check[- ]out|proceed|board|reach)\s+(in|to|from|at|for)?\s*/i, '')
        .replace(/\s*[-–—]\s*.*$/, '') // remove everything after a dash
        .trim()
      if (city && city.length > 1 && city.length < 50) cities.add(city)
    }
  }

  return Array.from(cities)
}

export default function AgentPackageFinder({
  agentSlug,
  subAgentId,
  sessionId,
  isEmbed,
}: {
  agentSlug: string
  subAgentId?: string
  sessionId?: string
  isEmbed?: boolean
}) {
  const router = useRouter()

  // Destination
  const [allDestinations, setAllDestinations] = useState<DestinationOption[]>([])
  const [destInput, setDestInput] = useState('')
  const [showDestDropdown, setShowDestDropdown] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState('')
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true)
  const destDropdownRef = useRef<HTMLDivElement>(null)
  const destInputRef = useRef<HTMLInputElement>(null)

  // Cities
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [destPackages, setDestPackages] = useState<any[]>([])

  // Pickup / Drop
  const [pickupCity, setPickupCity] = useState('')
  const [dropCity, setDropCity] = useState('')

  // Travel Date
  const [travelDate, setTravelDate] = useState('')

  // Hotel preference
  const [hotelIncluded, setHotelIncluded] = useState(false)
  const [hotelTypes, setHotelTypes] = useState<string[]>([])

  // Package Nights
  const [availableNights, setAvailableNights] = useState<NightOption[]>([])
  const [selectedNights, setSelectedNights] = useState<number | null>(null)

  // PAX
  const [pax, setPax] = useState(2)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch destinations on mount
  useEffect(() => {
    async function fetchDestinations() {
      try {
        const { db } = await import('@/lib/firebase')
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        if (!db) { setIsLoadingDestinations(false); return }

        const q = query(
          collection(db, 'agent_packages'),
          where('agentSlug', '==', agentSlug),
          where('isActive', '==', true)
        )
        const snap = await getDocs(q)
        const seen = new Set<string>()
        const options: DestinationOption[] = []

        snap.forEach(doc => {
          const d = doc.data()
          const name = (d.destination as string || '').trim()
          if (name && !seen.has(name)) {
            seen.add(name)
            options.push({
              name,
              label: d.destinationCountry ? `${name}, ${d.destinationCountry}` : name,
            })
          }
        })

        setAllDestinations(options)
      } catch (err) {
        console.error('Failed to fetch destinations:', err)
      } finally {
        setIsLoadingDestinations(false)
      }
    }
    fetchDestinations()
  }, [agentSlug])

  // Fetch packages when destination is selected → extract cities + night options
  useEffect(() => {
    if (!selectedDestination) {
      setAvailableCities([])
      setSelectedCities([])
      setAvailableNights([])
      setSelectedNights(null)
      setDestPackages([])
      return
    }

    async function fetchPackagesForDest() {
      setIsLoadingCities(true)
      try {
        const { db } = await import('@/lib/firebase')
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        if (!db) { setIsLoadingCities(false); return }

        const q = query(
          collection(db, 'agent_packages'),
          where('agentSlug', '==', agentSlug),
          where('isActive', '==', true)
        )
        const snap = await getDocs(q)

        const packages: any[] = []
        const citySet = new Set<string>()
        const nightMap = new Map<number, string>()

        snap.forEach(doc => {
          const d = doc.data()
          const pkgDest = (d.destination || '').trim().toLowerCase()
          const sel = selectedDestination.trim().toLowerCase()
          if (!pkgDest.includes(sel) && !sel.includes(pkgDest)) return

          const pkg = { id: doc.id, ...d }
          packages.push(pkg)

          extractCitiesFromPackage(pkg).forEach(c => citySet.add(c))

          const nights = Number(d.durationNights || 0)
          const days = Number(d.durationDays || 0)
          if (nights > 0 && !nightMap.has(nights)) {
            nightMap.set(nights, days > 0 ? `${days} Days / ${nights} Nights` : `${nights} Nights`)
          }
        })

        setDestPackages(packages)
        setAvailableCities(Array.from(citySet).sort())
        setSelectedCities([])

        const sorted = Array.from(nightMap.entries())
          .map(([nights, label]) => ({ nights, label }))
          .sort((a, b) => a.nights - b.nights)

        setAvailableNights(sorted)
        if (sorted.length > 0) setSelectedNights(sorted[0].nights)
      } catch (err) {
        console.error('Failed to fetch packages for destination:', err)
      } finally {
        setIsLoadingCities(false)
      }
    }

    fetchPackagesForDest()
  }, [selectedDestination, agentSlug])

  // Close destination dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        destDropdownRef.current && !destDropdownRef.current.contains(e.target as Node) &&
        destInputRef.current && !destInputRef.current.contains(e.target as Node)
      ) {
        setShowDestDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredDestinations = destInput.trim()
    ? allDestinations.filter(d =>
        d.label.toLowerCase().includes(destInput.toLowerCase()) ||
        d.name.toLowerCase().includes(destInput.toLowerCase())
      )
    : allDestinations

  const handleSelectDestination = (dest: DestinationOption) => {
    setSelectedDestination(dest.name)
    setDestInput(dest.label)
    setShowDestDropdown(false)
  }

  const handleClearDestination = () => {
    setSelectedDestination('')
    setDestInput('')
    setAvailableCities([])
    setSelectedCities([])
    setAvailableNights([])
    setSelectedNights(null)
    setPickupCity('')
    setDropCity('')
    setTravelDate('')
    setHotelIncluded(false)
    setHotelTypes([])
    setPax(2)
  }

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  const toggleHotelStar = (id: string) => {
    setHotelTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleFindPackage = () => {
    if (!selectedDestination || selectedNights === null || isSubmitting) return
    setIsSubmitting(true)

    const wizardData = {
      destinations: [selectedDestination],
      includedCities: selectedCities,
      pickupCity: pickupCity.trim(),
      dropCity: dropCity.trim(),
      dateRange: travelDate || 'Flexible',
      hotelIncluded,
      hotelTypes,
      routeItems: [{ destination: selectedDestination, nights: selectedNights }],
      groupSize: { adults: pax, children: 0, infants: 0 },
      passengers: { adults: pax, kids: 0, rooms: Math.max(1, Math.ceil(pax / 2)) },
      experiences: [],
      groupType: 'group',
      inclusions: hotelIncluded ? ['hotels'] : [],
      userOrigin: null,
      destinationPackages: destPackages,
      agentSlug,
      subAgentId,
      sessionId,
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tailored_wizard_data', JSON.stringify(wizardData))
    }

    if (agentSlug && sessionId) {
      fetch('/api/agent/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentSlug,
          sessionId,
          action: 'itinerary_generated',
          subAgentId,
          destination: selectedDestination,
        }),
      }).catch(() => {})
    }

    const embedSuffix = isEmbed ? '?embed=1' : ''
    router.push(`/tailored-travel/${agentSlug}/results${embedSuffix}`)
  }

  const canSubmit = !!selectedDestination && selectedNights !== null && !isSubmitting

  const showSections = !!selectedDestination

  return (
    <div className="w-full max-w-2xl mx-auto py-4 px-2 sm:px-0">

      {/* Heading */}
      <div className="text-center mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          Find Your Package
        </h2>
        <p className="text-sm text-gray-400 font-medium mt-2">
          Fill in your preferences and we'll match the best packages for you.
        </p>
      </div>

      <div className="space-y-3">

        {/* ── 1: Destination ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-visible">
          <div className="px-5 pt-5 pb-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">1</span>
              Destination
            </p>

            {selectedDestination ? (
              <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-primary to-[#ff8a3d] text-white pl-4 pr-3 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/25 text-sm">
                <svg className="w-4 h-4 opacity-80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{selectedDestination}</span>
                <button
                  onClick={handleClearDestination}
                  className="w-5 h-5 bg-white/20 rounded-full hover:bg-white/40 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative flex items-center group">
                  <div className="absolute left-4 text-gray-400 group-focus-within:text-primary transition-colors">
                    {isLoadingDestinations ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>
                  <input
                    ref={destInputRef}
                    type="text"
                    value={destInput}
                    onChange={e => { setDestInput(e.target.value); setShowDestDropdown(true) }}
                    onFocus={() => setShowDestDropdown(true)}
                    placeholder={isLoadingDestinations ? 'Loading destinations…' : 'Search destinations…'}
                    disabled={isLoadingDestinations}
                    autoComplete="off"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/8 transition-all text-base font-medium outline-none text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {!isLoadingDestinations && allDestinations.length === 0 && (
                  <p className="mt-3 text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-xl">
                    No packages available yet. Please contact the agent.
                  </p>
                )}

                {showDestDropdown && !isLoadingDestinations && filteredDestinations.length > 0 && (
                  <div
                    ref={destDropdownRef}
                    className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <ul className="max-h-52 overflow-y-auto py-1.5">
                      {filteredDestinations.map(dest => (
                        <li
                          key={dest.name}
                          onMouseDown={e => { e.preventDefault(); handleSelectDestination(dest) }}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </span>
                          {dest.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 2: Cities to Include ── */}
        {showSections && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">2</span>
                Cities to Include
                <span className="text-[8px] text-gray-300 normal-case tracking-normal font-semibold">optional</span>
              </p>

              {isLoadingCities ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium py-3">
                  <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading cities from itineraries…
                </div>
              ) : availableCities.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No cities found in itineraries for this destination.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-3 mt-1">Select cities you want to visit (leave empty to see all packages)</p>
                  <div className="flex flex-wrap gap-2">
                    {availableCities.map(city => {
                      const isSelected = selectedCities.includes(city)
                      return (
                        <button
                          key={city}
                          onClick={() => toggleCity(city)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-200 select-none ${
                            isSelected
                              ? 'bg-gray-900 border-gray-900 text-white shadow-md scale-[1.03]'
                              : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {city}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 3: Pickup & Drop City ── */}
        {showSections && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">3</span>
                Pickup & Drop City
                <span className="text-[8px] text-gray-300 normal-case tracking-normal font-semibold">optional</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Pickup City</p>
                  <input
                    type="text"
                    value={pickupCity}
                    onChange={e => setPickupCity(e.target.value)}
                    placeholder="e.g. Kochi Airport"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/8 transition-all text-sm font-medium outline-none text-gray-900 placeholder-gray-300"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Drop City</p>
                  <input
                    type="text"
                    value={dropCity}
                    onChange={e => setDropCity(e.target.value)}
                    placeholder="e.g. Cochin"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/8 transition-all text-sm font-medium outline-none text-gray-900 placeholder-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 4: Travel Date ── */}
        {showSections && (
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
                  onChange={e => setTravelDate(e.target.value)}
                  onClick={e => { try { (e.target as HTMLInputElement).showPicker?.() } catch {} }}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/8 transition-all font-semibold text-gray-900 outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── 5: Hotel Preference ── */}
        {showSections && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">5</span>
                Hotel Preference
              </p>

              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-gray-100 rounded-2xl mb-4">
                <button
                  onClick={() => { setHotelIncluded(false); setHotelTypes([]) }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    !hotelIncluded ? 'bg-white shadow-sm text-gray-900 scale-[1.01]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-lg">🏕️</span>
                  Without Hotel
                </button>
                <button
                  onClick={() => { setHotelIncluded(true); if (hotelTypes.length === 0) setHotelTypes(['4-star']) }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    hotelIncluded ? 'bg-gray-900 shadow-md text-white scale-[1.01]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-lg">🏨</span>
                  With Hotel
                </button>
              </div>

              {hotelIncluded && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.12em] mb-3">Select Star Category</p>
                  <div className="grid grid-cols-3 gap-3">
                    {HOTEL_STAR_OPTIONS.map(opt => {
                      const isSelected = hotelTypes.includes(opt.id)
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
        )}

        {/* ── 6: Package Nights ── */}
        {showSections && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">6</span>
                Package Nights
              </p>

              {isLoadingCities ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium py-2">
                  <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading durations…
                </div>
              ) : availableNights.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No packages found for this destination.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableNights.map(opt => {
                    const isSelected = selectedNights === opt.nights
                    const parts = opt.label.split('/')
                    const daysLabel = parts[0]?.trim() || ''
                    return (
                      <button
                        key={opt.nights}
                        onClick={() => setSelectedNights(opt.nights)}
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
              )}
            </div>
          </div>
        )}

        {/* ── 7: PAX ── */}
        {showSections && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2 mb-4">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black flex-shrink-0">7</span>
                PAX (Passengers)
                <span className="text-[8px] text-gray-300 normal-case tracking-normal font-semibold">optional · default 2</span>
              </p>
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setPax(p => Math.max(1, p - 1))}
                  disabled={pax <= 1}
                  className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xl shadow-sm"
                >
                  −
                </button>
                <div className="text-center min-w-[60px]">
                  <span className="text-4xl font-black text-gray-900 tabular-nums">{pax}</span>
                  <p className="text-xs text-gray-400 font-medium mt-1">
                    {pax === 1 ? 'passenger' : 'passengers'}
                  </p>
                </div>
                <button
                  onClick={() => setPax(p => Math.min(99, p + 1))}
                  className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all font-bold text-xl shadow-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Find Package Button ── */}
        {showSections && (
          <div className="flex justify-center pt-2 pb-8">
            <button
              onClick={handleFindPackage}
              disabled={!canSubmit}
              className="px-10 py-4 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2.5"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Finding Packages…
                </>
              ) : (
                <>
                  Find Package
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
