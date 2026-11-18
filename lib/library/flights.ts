/**
 * Flights library — `flights/{id}`, one doc per reusable SECTOR (e.g. IndiGo 6E 2134 DEL→SXR 06:10–07:40).
 *
 * Captured automatically from every structured flight sector in a quote (source 'quote'), or added by staff in
 * /admin/flights (source 'admin'). The ROUTE view (DEL→SXR with all airlines + fare range) is derived in the UI
 * by grouping sectors on fromAirport/fromCity → toAirport/toCity (`groupRoutes`).
 *
 * De-dup: `normalizedKey` = flight number (with airline code, no spaces) + from + to (IATA when known, else city).
 * Without a flight number: airline + from + to + departure time. `matchKeys` also holds keys of sectors merged into it.
 */
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  fillBlank, matchesWords, normaliseText, nowIso, pushRecent, stripUndefined, tidy, titleCase,
  unionImages, unionStrings, type LibraryImage, type LibrarySource, type QuoteContext,
} from './common'

export const FLIGHTS_COLLECTION = 'flights'

export type Cabin = 'Economy' | 'Premium Economy' | 'Business' | 'First'
export const CABINS: Cabin[] = ['Economy', 'Premium Economy', 'Business', 'First']
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface FareSample {
  date: string // travel date yyyy-mm-dd (or quote date)
  price: number
  quoteRef: string
  note?: string
}

export interface LibraryFlight {
  id: string
  airline: string
  airlineCode: string
  flightNumber: string
  fromCity: string
  fromAirport: string
  toCity: string
  toAirport: string
  departureTime: string // HH:MM
  arrivalTime: string
  duration: string
  stops: number
  via: string
  cabin: Cabin
  baggage: string
  refundable: boolean | null
  daysOfWeek: string[]
  typicalFare: { min: number | null; max: number | null; note: string } | null
  fareSamples: FareSample[]
  screenshots: LibraryImage[]
  notes: string
  usageCount: number
  lastUsedAt: string
  quoteIds: string[]
  quoteRefs: string[]
  source: LibrarySource
  createdBy: string
  createdAt: string
  updatedAt: string
  updatedBy?: string
  staffEditedAt?: string
  normalizedKey: string
  matchKeys: string[]
}

export type FlightDraft = Omit<LibraryFlight, 'id' | 'usageCount' | 'lastUsedAt' | 'quoteIds' | 'quoteRefs' | 'createdAt' | 'updatedAt' | 'createdBy' | 'normalizedKey' | 'matchKeys'>

/* ------------------------------------------------------------------ airlines & airports */

export const AIRLINES: Array<{ code: string; name: string; aliases?: string[] }> = [
  { code: '6E', name: 'IndiGo', aliases: ['indigo', 'indi go'] },
  { code: 'AI', name: 'Air India' },
  { code: 'IX', name: 'Air India Express' },
  { code: 'UK', name: 'Vistara' },
  { code: 'SG', name: 'SpiceJet', aliases: ['spice jet'] },
  { code: 'QP', name: 'Akasa Air', aliases: ['akasa'] },
  { code: 'I5', name: 'AIX Connect', aliases: ['air asia india', 'airasia india'] },
  { code: '9I', name: 'Alliance Air' },
  { code: 'S5', name: 'Star Air' },
  { code: 'EK', name: 'Emirates' },
  { code: 'FZ', name: 'flydubai', aliases: ['fly dubai'] },
  { code: 'EY', name: 'Etihad Airways', aliases: ['etihad'] },
  { code: 'QR', name: 'Qatar Airways', aliases: ['qatar'] },
  { code: 'G9', name: 'Air Arabia' },
  { code: 'SQ', name: 'Singapore Airlines' },
  { code: 'TR', name: 'Scoot' },
  { code: 'TG', name: 'Thai Airways', aliases: ['thai'] },
  { code: 'FD', name: 'Thai AirAsia', aliases: ['thai air asia'] },
  { code: 'AK', name: 'AirAsia', aliases: ['air asia'] },
  { code: 'D7', name: 'AirAsia X' },
  { code: 'MH', name: 'Malaysia Airlines' },
  { code: 'VJ', name: 'VietJet Air', aliases: ['vietjet', 'viet jet'] },
  { code: 'VN', name: 'Vietnam Airlines' },
  { code: 'GA', name: 'Garuda Indonesia', aliases: ['garuda'] },
  { code: 'UL', name: 'SriLankan Airlines', aliases: ['srilankan', 'sri lankan'] },
  { code: '8M', name: 'Myanmar Airways' },
  { code: 'J2', name: 'Azerbaijan Airlines', aliases: ['azal'] },
  { code: 'TK', name: 'Turkish Airlines', aliases: ['turkish'] },
  { code: 'LH', name: 'Lufthansa' },
  { code: 'BA', name: 'British Airways' },
  { code: 'AF', name: 'Air France' },
  { code: 'KL', name: 'KLM' },
  { code: 'Q2', name: 'Maldivian' },
  { code: 'NR', name: 'Manta Air' },
]

export const AIRPORTS: Record<string, string> = {
  DEL: 'Delhi', BOM: 'Mumbai', BLR: 'Bengaluru', MAA: 'Chennai', CCU: 'Kolkata', HYD: 'Hyderabad', AMD: 'Ahmedabad',
  JAI: 'Jaipur', PNQ: 'Pune', GOI: 'Goa', GOX: 'Goa (Mopa)', COK: 'Kochi', TRV: 'Thiruvananthapuram', CCJ: 'Kozhikode',
  SXR: 'Srinagar', IXJ: 'Jammu', IXL: 'Leh', IXB: 'Bagdogra', GAU: 'Guwahati', IXZ: 'Port Blair', UDR: 'Udaipur',
  JDH: 'Jodhpur', LKO: 'Lucknow', IXC: 'Chandigarh', ATQ: 'Amritsar', DED: 'Dehradun', KUU: 'Kullu (Bhuntar)',
  DHM: 'Dharamshala', IDR: 'Indore', BBI: 'Bhubaneswar', NAG: 'Nagpur', VNS: 'Varanasi', PAT: 'Patna', IXE: 'Mangaluru',
  CJB: 'Coimbatore', IXM: 'Madurai', VTZ: 'Visakhapatnam', RPR: 'Raipur', BDQ: 'Vadodara', STV: 'Surat',
  DPS: 'Bali (Denpasar)', SIN: 'Singapore', BKK: 'Bangkok', DMK: 'Bangkok (Don Mueang)', HKT: 'Phuket', KBV: 'Krabi',
  USM: 'Koh Samui', CNX: 'Chiang Mai', KUL: 'Kuala Lumpur', DXB: 'Dubai', DWC: 'Dubai (Al Maktoum)', AUH: 'Abu Dhabi',
  SHJ: 'Sharjah', DOH: 'Doha', MLE: 'Malé', CMB: 'Colombo', KTM: 'Kathmandu', PBH: 'Paro', GYD: 'Baku', TBS: 'Tbilisi',
  HAN: 'Hanoi', SGN: 'Ho Chi Minh City', DAD: 'Da Nang', PQC: 'Phu Quoc', IST: 'Istanbul', LHR: 'London', CDG: 'Paris',
  FRA: 'Frankfurt', ZRH: 'Zurich', AMS: 'Amsterdam', FCO: 'Rome', MXP: 'Milan', BCN: 'Barcelona', VIE: 'Vienna',
  MRU: 'Mauritius', SEZ: 'Seychelles', HKG: 'Hong Kong', NRT: 'Tokyo', ICN: 'Seoul', SYD: 'Sydney', MEL: 'Melbourne',
}

export function airlineByCode(code: string) {
  const c = code.toUpperCase()
  return AIRLINES.find((a) => a.code === c) || null
}

export function airlineByName(name: string) {
  const n = normaliseText(name)
  if (!n) return null
  return AIRLINES.find((a) => normaliseText(a.name) === n || (a.aliases || []).some((x) => normaliseText(x) === n)) || null
}

/** "6E 2134" / "6e-2134" / "2134" (+ airline "IndiGo") → { code: "6E", number: "6E 2134" } */
export function normaliseFlightNumber(raw: string, airline = ''): { code: string; number: string; compact: string } {
  const t = tidy(raw).toUpperCase().replace(/[-_.]/g, ' ')
  const m = t.match(/^([A-Z0-9]{2})\s*(\d{1,4}[A-Z]?)$/)
  if (m && /[A-Z]/.test(m[1])) return { code: m[1], number: `${m[1]} ${m[2]}`, compact: `${m[1]}${m[2]}` }
  const digits = t.match(/^(\d{1,4}[A-Z]?)$/)
  const code = airlineByName(airline)?.code || ''
  if (digits) return { code, number: code ? `${code} ${digits[1]}` : digits[1], compact: `${code}${digits[1]}` }
  return { code, number: t, compact: t.replace(/\s+/g, '') }
}

/** "Delhi (DEL)" / "DEL" / "delhi" / "New Delhi T3" → { city: "Delhi", airport: "DEL" } */
export function parsePlace(raw: string): { city: string; airport: string } {
  const t = tidy(raw)
  if (!t) return { city: '', airport: '' }
  const paren = t.match(/^(.*?)\s*\(\s*([A-Za-z]{3})\s*\)\s*$/)
  if (paren) {
    const code = paren[2].toUpperCase()
    return { city: titleCase(paren[1]) || AIRPORTS[code] || '', airport: code }
  }
  if (/^[A-Za-z]{3}$/.test(t) && AIRPORTS[t.toUpperCase()]) return { city: AIRPORTS[t.toUpperCase()], airport: t.toUpperCase() }
  const dash = t.match(/^([A-Z]{3})\s*[-–·,]\s*(.+)$/) // "DEL - Delhi"
  if (dash) return { city: titleCase(dash[2]), airport: dash[1] }
  const n = normaliseText(t.replace(/\bnew\b/i, ''))
  const hit = Object.entries(AIRPORTS).find(([, city]) => normaliseText(city) === n || normaliseText(city.replace(/\s*\(.*\)/, '')) === n)
  return { city: titleCase(t), airport: hit ? hit[0] : '' }
}

/** Display "Delhi (DEL)" */
export function placeLabel(city: string, airport: string) {
  if (city && airport) return `${city} (${airport})`
  return city || airport
}

export function flightKey(f: { airline?: string; airlineCode?: string; flightNumber?: string; fromCity?: string; fromAirport?: string; toCity?: string; toAirport?: string; departureTime?: string }): string {
  const fn = normaliseFlightNumber(f.flightNumber || '', f.airline || '')
  const from = (f.fromAirport || normaliseText(f.fromCity)).toLowerCase()
  const to = (f.toAirport || normaliseText(f.toCity)).toLowerCase()
  if (fn.compact) return `${fn.compact.toLowerCase()}|${from}|${to}`
  const al = (f.airlineCode || airlineByName(f.airline || '')?.code || normaliseText(f.airline)).toLowerCase()
  return `${al}|${from}|${to}|${tidy(f.departureTime)}`
}

/** "06:10" + "07:40" → "1h 30m" (handles overnight) */
export function durationBetween(dep: string, arr: string): string {
  const p = (s: string) => { const m = s.match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN }
  const a = p(dep), b = p(arr)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return ''
  let d = b - a
  if (d <= 0) d += 24 * 60
  return `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ''}`
}

export function weekdayOf(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''
  const d = new Date(date + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS[d.getDay()]
}

/** One ₹ amount in a fare note ("Fares ₹12,450 per person") → 12450; none or several → null */
export function parseSingleFare(note: string): number | null {
  const amounts = Array.from(String(note || '').matchAll(/(?:₹|rs\.?|inr)\s*([\d,]{3,9})/gi)).map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => n >= 500)
  return amounts.length === 1 ? amounts[0] : null
}

export function emptyFlightDraft(partial: Partial<FlightDraft> = {}): FlightDraft {
  return {
    airline: '', airlineCode: '', flightNumber: '', fromCity: '', fromAirport: '', toCity: '', toAirport: '', departureTime: '',
    arrivalTime: '', duration: '', stops: 0, via: '', cabin: 'Economy', baggage: '', refundable: null, daysOfWeek: [],
    typicalFare: { min: null, max: null, note: '' }, fareSamples: [], screenshots: [], notes: '', source: 'admin', ...partial,
  }
}

const numOrNull = (v: any): number | null => {
  const n = Number(v)
  return v === '' || v === null || v === undefined || !Number.isFinite(n) ? null : n
}

export function toFlight(id: string, d: any): LibraryFlight {
  const arr = (v: any) => (Array.isArray(v) ? v.map((x) => tidy(x)).filter(Boolean) : [])
  const f: LibraryFlight = {
    id,
    airline: tidy(d?.airline),
    airlineCode: tidy(d?.airlineCode).toUpperCase(),
    flightNumber: tidy(d?.flightNumber),
    fromCity: tidy(d?.fromCity),
    fromAirport: tidy(d?.fromAirport).toUpperCase(),
    toCity: tidy(d?.toCity),
    toAirport: tidy(d?.toAirport).toUpperCase(),
    departureTime: tidy(d?.departureTime),
    arrivalTime: tidy(d?.arrivalTime),
    duration: tidy(d?.duration),
    stops: Math.max(0, Math.min(2, Number(d?.stops) || 0)),
    via: tidy(d?.via),
    cabin: (CABINS.includes(d?.cabin) ? d.cabin : 'Economy') as Cabin,
    baggage: tidy(d?.baggage),
    refundable: typeof d?.refundable === 'boolean' ? d.refundable : null,
    daysOfWeek: arr(d?.daysOfWeek).filter((x) => WEEKDAYS.includes(x)),
    typicalFare: d?.typicalFare ? { min: numOrNull(d.typicalFare.min), max: numOrNull(d.typicalFare.max), note: tidy(d.typicalFare.note) } : null,
    fareSamples: (Array.isArray(d?.fareSamples) ? d.fareSamples : []).filter((s: any) => Number(s?.price) > 0).map((s: any) => ({ date: String(s.date || ''), price: Number(s.price), quoteRef: String(s.quoteRef || ''), ...(s.note ? { note: String(s.note) } : {}) })),
    screenshots: unionImages(d?.screenshots, []),
    notes: String(d?.notes || ''),
    usageCount: Number(d?.usageCount) || 0,
    lastUsedAt: String(d?.lastUsedAt || ''),
    quoteIds: arr(d?.quoteIds),
    quoteRefs: arr(d?.quoteRefs),
    source: (['quote', 'admin', 'package'].includes(d?.source) ? d.source : 'admin') as LibrarySource,
    createdBy: tidy(d?.createdBy),
    createdAt: String(d?.createdAt || ''),
    updatedAt: String(d?.updatedAt || ''),
    updatedBy: tidy(d?.updatedBy),
    staffEditedAt: d?.staffEditedAt ? String(d.staffEditedAt) : undefined,
    normalizedKey: String(d?.normalizedKey || ''),
    matchKeys: arr(d?.matchKeys),
  }
  if (!f.normalizedKey) f.normalizedKey = flightKey(f)
  if (!f.matchKeys.length) f.matchKeys = [f.normalizedKey]
  return f
}

/* ------------------------------------------------------------------ reads & search */

export async function loadFlights(): Promise<LibraryFlight[]> {
  const snap = await getDocs(collection(db, FLIGHTS_COLLECTION))
  return snap.docs.map((d) => toFlight(d.id, d.data()))
}

export const routeLabel = (f: Pick<LibraryFlight, 'fromAirport' | 'fromCity' | 'toAirport' | 'toCity'>) => `${f.fromAirport || f.fromCity || '?'} → ${f.toAirport || f.toCity || '?'}`

/**
 * Search by airline, flight number or route: "indigo", "6E 2134", "DEL SXR", "DEL→SXR", "delhi srinagar".
 * A two-place query ("DEL→SXR") only matches that direction.
 */
export function findFlightMatches(list: LibraryFlight[], q: string, ctx: { fromCity?: string; toCity?: string } = {}, limit = 8): LibraryFlight[] {
  const raw = tidy(q)
  if (!raw) return []
  const routeParts = raw.split(/\s*(?:→|->|–|—|\bto\b|-|\s)\s*/i).filter(Boolean)
  const placeHit = (f: LibraryFlight, part: string, side: 'from' | 'to') => {
    const p = normaliseText(part)
    const code = side === 'from' ? f.fromAirport : f.toAirport
    const city = side === 'from' ? f.fromCity : f.toCity
    return code.toLowerCase() === p || normaliseText(city).startsWith(p)
  }
  const fnQ = raw.toUpperCase().replace(/[\s-]/g, '')
  const scored: Array<{ f: LibraryFlight; s: number }> = []
  for (const f of list) {
    let s = 0
    const forward = routeParts.length === 2 && placeHit(f, routeParts[0], 'from') && placeHit(f, routeParts[1], 'to')
    // "DEL→SXR" must not list the SXR→DEL return sector
    if (!forward && routeParts.length === 2 && placeHit(f, routeParts[0], 'to') && placeHit(f, routeParts[1], 'from')) continue
    if (forward) s += 80
    else if (f.flightNumber && f.flightNumber.toUpperCase().replace(/\s/g, '').includes(fnQ) && fnQ.length >= 2) s += 90
    else if (matchesWords(`${f.airline} ${f.airlineCode} ${f.flightNumber} ${f.fromCity} ${f.fromAirport} ${f.toCity} ${f.toAirport} ${f.via}`, raw)) s += 40
    else continue
    if (ctx.fromCity && placeHit(f, parsePlace(ctx.fromCity).airport || ctx.fromCity, 'from')) s += 15
    if (ctx.toCity && placeHit(f, parsePlace(ctx.toCity).airport || ctx.toCity, 'to')) s += 15
    s += Math.min(20, f.usageCount * 2)
    scored.push({ f, s })
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.f)
}

export interface FlightRoute {
  key: string
  from: string
  to: string
  fromCity: string
  toCity: string
  sectors: LibraryFlight[]
  airlines: string[]
  fareMin: number | null
  fareMax: number | null
  usageCount: number
  lastUsedAt: string
}

/** Low / high fare of a sector from its typical fare + samples */
export function fareRange(f: LibraryFlight): [number | null, number | null] {
  const vals = [f.typicalFare?.min, f.typicalFare?.max, ...f.fareSamples.map((s) => s.price)].filter((n): n is number => typeof n === 'number' && n > 0)
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : [null, null]
}

export function groupRoutes(list: LibraryFlight[]): FlightRoute[] {
  const map = new Map<string, FlightRoute>()
  for (const f of list) {
    const from = f.fromAirport || f.fromCity
    const to = f.toAirport || f.toCity
    const key = `${from.toLowerCase()}|${to.toLowerCase()}`
    let r = map.get(key)
    if (!r) { r = { key, from, to, fromCity: f.fromCity, toCity: f.toCity, sectors: [], airlines: [], fareMin: null, fareMax: null, usageCount: 0, lastUsedAt: '' }; map.set(key, r) }
    r.sectors.push(f)
    if (f.airline && !r.airlines.includes(f.airline)) r.airlines.push(f.airline)
    const [lo, hi] = fareRange(f)
    if (lo !== null) r.fareMin = r.fareMin === null ? lo : Math.min(r.fareMin, lo)
    if (hi !== null) r.fareMax = r.fareMax === null ? hi : Math.max(r.fareMax, hi)
    r.usageCount += f.usageCount
    if (f.lastUsedAt > r.lastUsedAt) r.lastUsedAt = f.lastUsedAt
    if (!r.fromCity) r.fromCity = f.fromCity
    if (!r.toCity) r.toCity = f.toCity
  }
  return Array.from(map.values()).sort((a, b) => b.usageCount - a.usageCount || a.from.localeCompare(b.from))
}

/* ------------------------------------------------------------------ quote capture */

/** One structured sector from a quote (ProposalFlight / FlightDetail) */
export interface QuoteFlightInput {
  date: string
  airline: string
  flightNumber: string
  departureTime: string
  arrivalTime: string
  departureCity: string
  arrivalCity: string
}

/** Turn a quote sector into library fields (null when it has nothing identifying) */
export function sectorFromQuote(f: QuoteFlightInput): Omit<FlightDraft, 'source'> | null {
  const from = parsePlace(f.departureCity)
  const to = parsePlace(f.arrivalCity)
  const fn = normaliseFlightNumber(f.flightNumber || '', f.airline || '')
  const airline = tidy(f.airline) || airlineByCode(fn.code)?.name || ''
  if (!(airline || fn.compact) || !(from.city || from.airport) || !(to.city || to.airport)) return null
  const dep = tidy(f.departureTime)
  const arr = tidy(f.arrivalTime)
  const wd = weekdayOf(f.date)
  return {
    ...emptyFlightDraft(),
    airline: airlineByName(airline)?.name || titleCase(airline),
    airlineCode: fn.code || airlineByName(airline)?.code || '',
    flightNumber: fn.number,
    fromCity: from.city,
    fromAirport: from.airport,
    toCity: to.city,
    toAirport: to.airport,
    departureTime: dep,
    arrivalTime: arr,
    duration: durationBetween(dep, arr),
    daysOfWeek: wd ? [wd] : [],
    typicalFare: null,
  }
}

async function findExistingFlight(key: string): Promise<LibraryFlight | null> {
  const snap = await getDocs(query(collection(db, FLIGHTS_COLLECTION), where('matchKeys', 'array-contains', key)))
  return snap.empty ? null : toFlight(snap.docs[0].id, snap.docs[0].data())
}

export interface QuoteFlightExtras {
  fare?: FareSample | null
  screenshot?: LibraryImage | null
}

/** Create or merge one quote sector. Returns the flight id ('' when the sector is incomplete). */
export async function upsertFlightFromQuote(f: QuoteFlightInput, extras: QuoteFlightExtras, ctx: QuoteContext): Promise<string> {
  const s = sectorFromQuote(f)
  if (!s) return ''
  const key = flightKey(s)
  const existing = await findExistingFlight(key)
  const now = nowIso()
  const samples = (list: FareSample[]) => {
    if (!extras.fare) return list
    const rest = list.filter((x) => !(x.quoteRef === extras.fare!.quoteRef && x.date === extras.fare!.date))
    return [...rest, extras.fare].slice(-10)
  }
  if (existing) {
    const already = existing.quoteIds.includes(ctx.quoteId) || (ctx.linkedIds || []).includes(existing.id)
    const patch: Partial<LibraryFlight> = {
      airline: fillBlank(existing.airline, s.airline),
      airlineCode: fillBlank(existing.airlineCode, s.airlineCode),
      fromCity: fillBlank(existing.fromCity, s.fromCity),
      fromAirport: fillBlank(existing.fromAirport, s.fromAirport),
      toCity: fillBlank(existing.toCity, s.toCity),
      toAirport: fillBlank(existing.toAirport, s.toAirport),
      departureTime: fillBlank(existing.departureTime, s.departureTime),
      arrivalTime: fillBlank(existing.arrivalTime, s.arrivalTime),
      duration: fillBlank(existing.duration, s.duration),
      daysOfWeek: WEEKDAYS.filter((d) => existing.daysOfWeek.includes(d) || s.daysOfWeek.includes(d)),
      fareSamples: samples(existing.fareSamples),
      screenshots: unionImages(existing.screenshots, extras.screenshot ? [extras.screenshot] : [], 12),
      quoteIds: pushRecent(existing.quoteIds, ctx.quoteId),
      quoteRefs: pushRecent(existing.quoteRefs, ctx.quoteRef),
      updatedAt: now,
    }
    if (!already) { patch.usageCount = existing.usageCount + 1; patch.lastUsedAt = now }
    await updateDoc(doc(db, FLIGHTS_COLLECTION, existing.id), stripUndefined(patch) as any)
    return existing.id
  }
  const data: Omit<LibraryFlight, 'id'> = {
    ...s,
    fareSamples: samples([]),
    screenshots: extras.screenshot ? unionImages([extras.screenshot], []) : [],
    usageCount: 1,
    lastUsedAt: now,
    quoteIds: [ctx.quoteId],
    quoteRefs: ctx.quoteRef ? [ctx.quoteRef] : [],
    source: 'quote',
    createdBy: ctx.by,
    createdAt: now,
    updatedAt: now,
    normalizedKey: key,
    matchKeys: [key],
  }
  const ref = await addDoc(collection(db, FLIGHTS_COLLECTION), stripUndefined(data))
  return ref.id
}

/* ------------------------------------------------------------------ staff CRUD */

function cleanFlightDraft(d: FlightDraft): FlightDraft {
  const fn = normaliseFlightNumber(d.flightNumber, d.airline)
  const fare = d.typicalFare
  return {
    ...d,
    airline: tidy(d.airline) || airlineByCode(fn.code)?.name || '',
    airlineCode: (tidy(d.airlineCode) || fn.code).toUpperCase(),
    flightNumber: fn.number,
    fromCity: tidy(d.fromCity) || AIRPORTS[d.fromAirport?.toUpperCase()] || '',
    fromAirport: tidy(d.fromAirport).toUpperCase(),
    toCity: tidy(d.toCity) || AIRPORTS[d.toAirport?.toUpperCase()] || '',
    toAirport: tidy(d.toAirport).toUpperCase(),
    duration: tidy(d.duration) || durationBetween(d.departureTime, d.arrivalTime),
    stops: Math.max(0, Math.min(2, Number(d.stops) || 0)),
    typicalFare: fare && (fare.min || fare.max || fare.note) ? { min: numOrNull(fare.min), max: numOrNull(fare.max), note: tidy(fare.note) } : null,
    screenshots: unionImages(d.screenshots, []),
    daysOfWeek: WEEKDAYS.filter((x) => d.daysOfWeek.includes(x)),
  }
}

export function findDuplicateFlight(list: LibraryFlight[], d: FlightDraft, selfId?: string): LibraryFlight | null {
  const key = flightKey(cleanFlightDraft(d))
  return list.find((f) => f.id !== selfId && f.matchKeys.includes(key)) || null
}

export async function createFlight(d: FlightDraft, by: string): Promise<string> {
  const c = cleanFlightDraft(d)
  const now = nowIso()
  const key = flightKey(c)
  const ref = await addDoc(collection(db, FLIGHTS_COLLECTION), stripUndefined({
    ...c, source: d.source || 'admin', usageCount: 0, lastUsedAt: '', quoteIds: [], quoteRefs: [], createdBy: by, createdAt: now,
    updatedAt: now, updatedBy: by, staffEditedAt: now, normalizedKey: key, matchKeys: [key],
  }))
  return ref.id
}

export async function updateFlight(prev: LibraryFlight, d: FlightDraft, by: string): Promise<void> {
  const c = cleanFlightDraft(d)
  const now = nowIso()
  const key = flightKey(c)
  const { source: _s, ...rest } = c
  await updateDoc(doc(db, FLIGHTS_COLLECTION, prev.id), stripUndefined({
    ...rest, updatedAt: now, updatedBy: by, staffEditedAt: now, normalizedKey: key, matchKeys: unionStrings([key], prev.matchKeys, 20),
  }) as any)
}

export async function deleteFlight(id: string) {
  await deleteDoc(doc(db, FLIGHTS_COLLECTION, id))
}

export async function mergeFlights(keep: LibraryFlight, drop: LibraryFlight, by: string): Promise<void> {
  const fresh = await getDoc(doc(db, FLIGHTS_COLLECTION, keep.id))
  const k = fresh.exists() ? toFlight(keep.id, fresh.data()) : keep
  const shared = k.quoteIds.filter((q) => drop.quoteIds.includes(q)).length
  const samples = [...k.fareSamples, ...drop.fareSamples]
    .filter((s, i, a) => a.findIndex((x) => x.quoteRef === s.quoteRef && x.date === s.date && x.price === s.price) === i)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(-10)
  const patch: Partial<LibraryFlight> = {
    airline: fillBlank(k.airline, drop.airline),
    airlineCode: fillBlank(k.airlineCode, drop.airlineCode),
    flightNumber: fillBlank(k.flightNumber, drop.flightNumber),
    fromCity: fillBlank(k.fromCity, drop.fromCity),
    fromAirport: fillBlank(k.fromAirport, drop.fromAirport),
    toCity: fillBlank(k.toCity, drop.toCity),
    toAirport: fillBlank(k.toAirport, drop.toAirport),
    departureTime: fillBlank(k.departureTime, drop.departureTime),
    arrivalTime: fillBlank(k.arrivalTime, drop.arrivalTime),
    duration: fillBlank(k.duration, drop.duration),
    via: fillBlank(k.via, drop.via),
    baggage: fillBlank(k.baggage, drop.baggage),
    refundable: k.refundable ?? drop.refundable,
    daysOfWeek: WEEKDAYS.filter((d) => k.daysOfWeek.includes(d) || drop.daysOfWeek.includes(d)),
    typicalFare: k.typicalFare || drop.typicalFare,
    fareSamples: samples,
    screenshots: unionImages(k.screenshots, drop.screenshots, 12),
    notes: [k.notes, drop.notes].map((s) => tidy(s)).filter(Boolean).filter((s, i, a) => a.indexOf(s) === i).join('\n\n'),
    usageCount: Math.max(0, k.usageCount + drop.usageCount - shared),
    lastUsedAt: [k.lastUsedAt, drop.lastUsedAt].sort().pop() || '',
    quoteIds: Array.from(new Set([...k.quoteIds, ...drop.quoteIds])).slice(-20),
    quoteRefs: Array.from(new Set([...k.quoteRefs, ...drop.quoteRefs])).slice(-20),
    matchKeys: unionStrings(k.matchKeys, drop.matchKeys, 30),
    updatedAt: nowIso(),
    updatedBy: by,
  }
  await updateDoc(doc(db, FLIGHTS_COLLECTION, k.id), stripUndefined(patch) as any)
  await deleteDoc(doc(db, FLIGHTS_COLLECTION, drop.id))
}
