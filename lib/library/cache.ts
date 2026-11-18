'use client'

/**
 * Per-session cache of the hotels / flights library for the quote builder (one Firestore read per collection per
 * page load; the lists are small). `invalidateLibrary()` after captures / edits so the next search sees them.
 */
import { useEffect, useState } from 'react'
import { loadHotels, type LibraryHotel } from './hotels'
import { loadFlights, type LibraryFlight } from './flights'

let hotelsPromise: Promise<LibraryHotel[]> | null = null
let flightsPromise: Promise<LibraryFlight[]> | null = null
const listeners = new Set<() => void>()

export function getHotelsCached(): Promise<LibraryHotel[]> {
  if (!hotelsPromise) hotelsPromise = loadHotels().catch((e) => { hotelsPromise = null; console.warn('[library] hotels', e); return [] })
  return hotelsPromise
}

export function getFlightsCached(): Promise<LibraryFlight[]> {
  if (!flightsPromise) flightsPromise = loadFlights().catch((e) => { flightsPromise = null; console.warn('[library] flights', e); return [] })
  return flightsPromise
}

export function invalidateLibrary() {
  hotelsPromise = null
  flightsPromise = null
  listeners.forEach((l) => l())
}

function useCached<T>(get: () => Promise<T[]>, enabled: boolean): { items: T[]; ready: boolean } {
  const [items, setItems] = useState<T[]>([])
  const [ready, setReady] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick((t) => t + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  useEffect(() => {
    if (!enabled) return
    let alive = true
    get().then((list) => { if (alive) { setItems(list); setReady(true) } })
    return () => { alive = false }
  }, [enabled, tick, get])
  return { items, ready }
}

/** Library hotels; loads lazily the first time `enabled` is true (e.g. when the field is focused) */
export function useHotelLibrary(enabled = true) {
  return useCached(getHotelsCached, enabled)
}

export function useFlightLibrary(enabled = true) {
  return useCached(getFlightsCached, enabled)
}
