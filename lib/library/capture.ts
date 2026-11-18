/**
 * Auto-capture: after a quote is saved in /admin/itinerary, every hotel (from EVERY stay option) and every structured
 * flight sector goes into the library. Called fire-and-forget from ItineraryGenerator.saveRecord — failures are
 * logged, never thrown into the quote save.
 *
 * Rules
 *  - hotels: one upsert per distinct (name, city) in the quote, even if it appears in several options (room types /
 *    meal plans / photos of every option are unioned). The option's star rating applies to its hotels; option
 *    description / amenities / photos / location only when the option has a single hotel (otherwise we can't tell
 *    which hotel they describe). Room photos + room highlights always.
 *  - flights: one upsert per distinct sector. Screenshots are attached only when there is one sector per direction
 *    (1 sector → outbound shot; 2 sectors → outbound + return). The fare is stored as a sample only when the fare
 *    note contains exactly one ₹ amount and the quote has exactly one sector.
 *  - idempotent per quote: usage is counted once per quote id (record.quoteIds + customer_itineraries.libraryLinks).
 */
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { normaliseText, unionImages, unionStrings, type LibraryImage, type QuoteContext } from './common'
import { hotelKey, upsertHotelFromQuote, type QuoteHotelInput } from './hotels'
import { flightKey, parseSingleFare, sectorFromQuote, upsertFlightFromQuote, type QuoteFlightInput } from './flights'

interface StayLike {
  city?: string
  hotelName?: string
  roomType?: string
  mealPlan?: string
  bullets?: string[]
  images?: LibraryImage[]
}

interface OptionLike {
  starRating?: number
  location?: string
  description?: string
  amenities?: string[]
  images?: LibraryImage[]
  hotels?: StayLike[]
}

export interface QuoteCaptureInput {
  quoteId: string
  quoteRef: string
  by: string
  destination: string
  travelDate?: string
  stayOptions: OptionLike[]
  flights: QuoteFlightInput[]
  outboundShot?: LibraryImage | null
  returnShot?: LibraryImage | null
  fareNote?: string
}

export interface CaptureResult {
  hotelIds: string[]
  flightIds: string[]
}

/** Distinct hotels of a quote, combined across options */
export function hotelsOfQuote(stayOptions: OptionLike[], destination: string): QuoteHotelInput[] {
  const map = new Map<string, QuoteHotelInput>()
  for (const o of stayOptions || []) {
    const stays = (o.hotels || []).filter((h) => normaliseText(h.hotelName))
    const single = stays.length === 1
    for (const h of stays) {
      const k = hotelKey(h.hotelName || '', h.city || '')
      const inp: QuoteHotelInput = {
        name: h.hotelName || '',
        city: h.city || '',
        destination,
        starRating: o.starRating || null,
        location: single ? o.location || '' : '',
        roomTypes: unionStrings([h.roomType], []),
        mealPlans: unionStrings([h.mealPlan], []),
        highlights: h.bullets || [],
        amenities: single ? o.amenities || [] : [],
        images: unionImages(h.images || [], single ? o.images || [] : [], 24),
        description: single ? o.description || '' : '',
      }
      const prev = map.get(k)
      if (!prev) { map.set(k, inp); continue }
      prev.starRating = prev.starRating || inp.starRating
      prev.location = prev.location || inp.location
      prev.roomTypes = unionStrings(prev.roomTypes, inp.roomTypes)
      prev.mealPlans = unionStrings(prev.mealPlans, inp.mealPlans)
      prev.highlights = unionStrings(prev.highlights, inp.highlights)
      prev.amenities = unionStrings(prev.amenities, inp.amenities)
      prev.images = unionImages(prev.images, inp.images)
      if ((inp.description || '').length > (prev.description || '').length) prev.description = inp.description
    }
  }
  return Array.from(map.values())
}

// Captures run one after another in this tab ("Save draft" then "PDF" in quick succession must not race and create
// the same hotel twice).
let queue: Promise<unknown> = Promise.resolve()

export function captureQuoteToLibrary(input: QuoteCaptureInput): Promise<CaptureResult> {
  const run = queue.then(() => captureNow(input), () => captureNow(input))
  queue = run.catch(() => undefined)
  return run
}

async function captureNow(input: QuoteCaptureInput): Promise<CaptureResult> {
  if (!input.quoteId) return { hotelIds: [], flightIds: [] }

  // Library ids this quote was already counted for (so a re-save never double counts, even after quoteIds rolled over)
  let prevHotels: string[] = []
  let prevFlights: string[] = []
  try {
    const snap = await getDoc(doc(db, 'customer_itineraries', input.quoteId))
    const l = snap.data()?.libraryLinks
    prevHotels = Array.isArray(l?.hotelIds) ? l.hotelIds : []
    prevFlights = Array.isArray(l?.flightIds) ? l.flightIds : []
  } catch { /* ignore */ }
  const ctx: QuoteContext = { quoteId: input.quoteId, quoteRef: input.quoteRef, by: input.by, linkedIds: [...prevHotels, ...prevFlights] }

  const hotelIds: string[] = []
  for (const inp of hotelsOfQuote(input.stayOptions, input.destination)) {
    try {
      const id = await upsertHotelFromQuote(inp, ctx)
      if (id && !hotelIds.includes(id)) hotelIds.push(id)
    } catch (e) {
      console.warn('[library] hotel capture failed', inp.name, e)
    }
  }

  const sectors = (input.flights || []).filter((f) => sectorFromQuote(f))
  const seen = new Set<string>()
  const flightIds: string[] = []
  const fare = sectors.length === 1 ? parseSingleFare(input.fareNote || '') : null
  // Screenshots only when there is exactly one sector per direction: A→B, or A→B + B→A
  const place = (city: string, code: string) => (code || normaliseText(city)).toLowerCase()
  const parsed = sectors.map((f) => sectorFromQuote(f)!)
  const oneEach = parsed.length === 1 || (parsed.length === 2
    && place(parsed[0].fromCity, parsed[0].fromAirport) === place(parsed[1].toCity, parsed[1].toAirport)
    && place(parsed[0].toCity, parsed[0].toAirport) === place(parsed[1].fromCity, parsed[1].fromAirport))
  for (let i = 0; i < sectors.length; i++) {
    const f = sectors[i]
    const key = flightKey(parsed[i])
    if (seen.has(key)) continue
    seen.add(key)
    const shot = oneEach ? (i === 0 ? input.outboundShot : input.returnShot) : null
    try {
      const id = await upsertFlightFromQuote(f, {
        screenshot: shot && shot.url && !shot.url.startsWith('data:') ? shot : null,
        fare: fare ? { date: f.date || input.travelDate || new Date().toISOString().slice(0, 10), price: fare, quoteRef: input.quoteRef, note: (input.fareNote || '').slice(0, 140) } : null,
      }, ctx)
      if (id && !flightIds.includes(id)) flightIds.push(id)
    } catch (e) {
      console.warn('[library] flight capture failed', f.flightNumber, e)
    }
  }

  try {
    await updateDoc(doc(db, 'customer_itineraries', input.quoteId), {
      libraryLinks: {
        // Everything this quote has ever been counted for (keeps re-saves idempotent)
        hotelIds: Array.from(new Set([...prevHotels, ...hotelIds])).slice(-60),
        flightIds: Array.from(new Set([...prevFlights, ...flightIds])).slice(-40),
        current: { hotelIds, flightIds },
        capturedAt: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.warn('[library] could not store libraryLinks on the quote', e)
  }
  return { hotelIds, flightIds }
}
