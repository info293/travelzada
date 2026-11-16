import {
    BRAND_RATING_LINE, CONTACT, DEFAULT_WHY_US, LOGO_URL, TERMS_URL, nightsBetween,
    type ProposalData, type ProposalDay, type ProposalFlight, type ProposalHotel, type ProposalImage,
    type ProposalStay, type QuoteDesign, type StayOption, type StayOptionDraft,
} from './types'
import { hotelsToStays, newOption } from './design'

/** Split a catalog list field (array | newline / pipe / semicolon / comma separated string) into clean items */
export function parseList(field: unknown): string[] {
    if (!field) return []
    let items: string[]
    if (Array.isArray(field)) items = field.map((i) => String(i ?? ''))
    else {
        const s = String(field)
        if (s.includes('\n')) items = s.split('\n')
        else if (s.includes('|')) items = s.split('|')
        else if (s.includes(';')) items = s.split(';')
        else items = s.split(',')
    }
    return items.map((i) => i.replace(/^[\s•\-*✓✔·]+/, '').trim()).filter((i) => i.length > 0)
}

/** Booking_Policies values sometimes arrive as one JSON-ish string ('"a", "b"'); normalise to a list */
export function parsePolicies(items: unknown): string[] {
    if (!items) return []
    const unquote = (i: string) => i.replace(/^\\?"|\\?"$/g, '').trim()
    if (Array.isArray(items)) {
        if (items.length === 1 && typeof items[0] === 'string' && items[0].includes('", "')) return items[0].split('", "').map(unquote).filter(Boolean)
        return items.map((i) => String(i).trim()).filter(Boolean)
    }
    if (typeof items === 'string') {
        if (items.includes('", "')) return items.split('", "').map(unquote).filter(Boolean)
        return parseList(items)
    }
    return []
}

export function cleanImageUrl(raw?: string): string {
    if (!raw) return ''
    const s = String(raw).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
    const m = s.match(/https?:\/\/[^\s)\],]+/)
    return m ? m[0] : s.startsWith('/') ? s : ''
}

export function makeQuoteRef(date = new Date()) {
    const yy = String(date.getFullYear()).slice(2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X')
    return `TZ-${yy}${mm}${dd}-${rand}`
}

export interface BuildProposalInput {
    pkg: Record<string, any>
    client: { name: string; phone?: string; email?: string }
    travelDate?: string
    adults: number
    children: number
    tripType?: string
    /** Total price of the quoted option */
    totalCost: number
    advancePaid: number
    priceNote?: string
    days: ProposalDay[]
    /** Legacy single hotel list — used as option 1 when the design has no hotels */
    hotels: ProposalHotel[]
    flights: ProposalFlight[]
    notes: string
    destinationName?: string
    destinationSlug?: string
    designerName?: string
    quoteRef: string
    quoteDate: Date
    validDays: number
    /** v2 design: stay options, images, closing copy (empty values = auto) */
    design?: QuoteDesign
}

/** Rough topic of a "why us" point so "24/7 On-Trip Support" and "24×7 on-trip support" count as the same */
function whyTopic(label: string) {
    const l = label.toLowerCase()
    if (/support|24s*[x×/]s*7|assist/.test(l)) return 'support'
    if (/hotel|stay|resort/.test(l)) return 'stays'
    if (/hidden|transparent|price|cost/.test(l)) return 'price'
    if (/custom|tailor|personal|just for/.test(l)) return 'custom'
    return l.replace(/[^a-z]/g, '')
}

export const addDays = (iso: string, n: number) => {
    const d = new Date(iso + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return ''
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "12 – 17 Dec 2026" / "28 Dec – 2 Jan 2027" */
export function dateRangeLabel(start?: string, nights?: number) {
    if (!start) return ''
    const a = new Date(start + 'T00:00:00')
    if (Number.isNaN(a.getTime())) return ''
    if (!nights) return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()}`
    const b = new Date(a)
    b.setDate(b.getDate() + nights)
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
    if (a.getFullYear() === b.getFullYear()) return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
    return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
}

const joinAnd = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}`)

/** "4★ & 5★" / "4 Star" / "Premium 4-star" → 4 (first number 1..5) */
const starsFrom = (s: string) => {
    const m = String(s || '').match(/([1-5])\s*(?:★|\*|-?\s*star)/i)
    return m ? Number(m[1]) : 0
}

const coverScriptFor = (adults: number, children: number) => {
    if (children > 0) return 'for the family'
    if (adults === 2) return 'for two'
    if (adults === 1) return 'just for you'
    return `for ${adults}`
}

const stripCode = (s?: string) => String(s || '').replace(/\s*\(.*\)/, '').trim()

/** Option drafts → final options: one quoted (carrying the quote total), sequential hotel dates, per-person */
function resolveOptions(input: BuildProposalInput, design: QuoteDesign | undefined, pax: number, total: number, pkg: Record<string, any>): StayOption[] {
    const drafts: StayOptionDraft[] = design?.stayOptions?.length
        ? design.stayOptions.slice(0, 4)
        : [newOption({ isQuoted: true, hotels: hotelsToStays(input.hotels) })]
    // legacy hotels (prefill) still land in the quoted option when the design has none
    if (design && !drafts.some((o) => o.hotels.length) && input.hotels?.length) {
        const qi = Math.max(0, drafts.findIndex((o) => o.isQuoted))
        drafts[qi] = { ...drafts[qi], hotels: hotelsToStays(input.hotels) }
    }
    let quotedIdx = drafts.findIndex((o) => o.isQuoted)
    if (quotedIdx < 0) quotedIdx = 0
    const starCat = String(pkg.Star_Category || '')
    return drafts.map((o, idx) => {
        const isQuoted = idx === quotedIdx
        const price = isQuoted ? total : Math.max(0, Number(o.price) || 0)
        let cursor = input.travelDate || ''
        const hotels: ProposalStay[] = (o.hotels || [])
            .filter((h) => h && (h.hotelName || h.city || h.roomType))
            .map((h) => {
                const nights = Math.max(0, Number(h.nights) || nightsBetween(h.checkIn, h.checkOut) || 0)
                const checkIn = h.checkIn || cursor
                const checkOut = h.checkOut || (checkIn && nights ? addDays(checkIn, nights) : '')
                cursor = checkOut || cursor
                return {
                    ...h,
                    nights,
                    checkIn,
                    checkOut,
                    bullets: (h.bullets || []).filter(Boolean),
                    images: (h.images || []).filter((i) => i?.url),
                }
            })
        const stars = Number(o.starRating) || (isQuoted ? starsFrom(starCat) : 0)
        const label = (o.label || '').trim() || (drafts.length > 1 ? `Option ${idx + 1}` : starCat ? `Hand-picked · ${starCat}` : 'Your stay')
        return {
            ...o,
            label,
            isQuoted,
            price,
            perPerson: pax > 0 ? Math.round(price / pax) : price,
            starRating: Math.max(0, Math.min(5, stars)),
            mealSummary: o.mealSummary || (isQuoted ? String(pkg.Meal_Plan || '') : '') || hotels.find((h) => h.mealPlan)?.mealPlan || '',
            transfer: o.transfer || (isQuoted ? String(pkg.Transfer_Type || '') : ''),
            amenities: (o.amenities || []).filter(Boolean),
            included: (o.included || []).filter(Boolean),
            images: (o.images || []).filter((i) => i?.url).slice(0, 6),
            hotels,
        }
    })
}

export function buildProposalData(input: BuildProposalInput): ProposalData {
    const { pkg, design } = input
    const inclusions = parseList(pkg.Inclusions)
    const exclusions = parseList(pkg.Exclusions)
    const days = input.days
        .filter((d) => d && (d.title || d.description))
        .map((d) => {
            const description = String(d.description || '').replace(/^Day\s*\d+\s*[:\-–]\s*/i, '').trim()
            return {
                ...d,
                description: description === String(d.title || '').trim() ? '' : description,
                activities: (d.activities || []).filter(Boolean),
                location: String(d.location || '').trim(),
                images: (d.images || []).filter((i) => i?.url),
            }
        })
    const flights = input.flights.filter((f) => f.airline || f.departureCity || f.arrivalCity)

    const pax = Math.max(0, (input.adults || 0) + (input.children || 0))
    const total = Math.max(0, Number(input.totalCost) || 0)
    const advance = Math.max(0, Number(input.advancePaid) || 0)

    const stayOptions = resolveOptions(input, design, pax, total, pkg)
    const quoted = stayOptions.find((o) => o.isQuoted) || stayOptions[0]
    const hotels: ProposalHotel[] = quoted.hotels.map((h) => ({ city: h.city, hotelName: h.hotelName, checkIn: h.checkIn || '', checkOut: h.checkOut || '', roomType: h.roomType, mealPlan: h.mealPlan }))
    const quotedNights = quoted.hotels.reduce((s, h) => s + (h.nights || 0), 0)

    // Route: catalog Location_Breakup, else the hotel cities
    let route = String(pkg.Location_Breakup || '').split(/\s*(?:,|→|->|\||\+|;)\s*/).map((s) => s.trim()).filter(Boolean)
    if (route.length < 2 && quoted.hotels.length > 1) {
        route = quoted.hotels.map((h) => (h.city ? `${h.city}${h.nights ? ` · ${h.nights}N` : ''}` : '')).filter(Boolean)
    }

    const durationLabel = String(pkg.Duration || '').trim() || (days.length ? `${Math.max(0, days.length - 1)} Nights / ${days.length} Days` : '')

    const highlightsRaw: string[] = Array.isArray(pkg.Highlights) && pkg.Highlights.length
        ? pkg.Highlights.map(String)
        : (days.length > 2 ? days.slice(1, -1) : days).map((d) => d.title)
    const highlights = Array.from(new Set(highlightsRaw.map((h) => h.trim()).filter((h) => h && !/^day\s*\d+/i.test(h)))).slice(0, 6)

    const incText = inclusions.join(' ').toLowerCase()
    const excText = exclusions.join(' ').toLowerCase()
    const flightWords = /flight|airfare|air fare|air ticket/
    const hasShots = !!(design?.outboundShot?.length || design?.returnShot?.length)
    const autoFlights = flights.length > 0 || hasShots || (flightWords.test(incText) && !flightWords.test(excText))
    const flightsIncluded = design?.flightsMode === 'included' ? true : design?.flightsMode === 'not-included' ? false : autoFlights
    const included = {
        stay: quoted.hotels.length > 0 || /hotel|stay|accommodation|resort|villa|night/.test(incText),
        meals: /breakfast|meal|dinner|lunch|map\b|cp\b|ap\b/.test(incText) || quoted.hotels.some((h) => /breakfast|dinner|meal|map|cp|ap/i.test(h.mealPlan)),
        transfers: /transfer|cab|car\b|pick|drop|vehicle|taxi|airport/.test(incText),
        sightseeing: /sightseeing|tour|visit|excursion|safari|cruise|activity|activities/.test(incText),
        flights: flightsIncluded,
    }

    const pkgWhy = Array.isArray(pkg.Why_Book_With_Us) ? pkg.Why_Book_With_Us.filter((w: any) => w?.label).map((w: any) => ({ label: String(w.label), description: String(w.description || '') })) : []
    const whyUs = [...pkgWhy]
    for (const w of DEFAULT_WHY_US) {
        if (whyUs.length >= 6) break
        if (!whyUs.some((x) => whyTopic(x.label) === whyTopic(w.label))) whyUs.push(w)
    }

    const reviews = Array.isArray(pkg.Guest_Reviews)
        ? pkg.Guest_Reviews.filter((r: any) => r?.content && r?.name).map((r: any) => ({ name: String(r.name), content: String(r.content), date: r.date ? String(r.date) : '', rating: r.rating ? String(r.rating) : '' }))
        : []

    const bp = pkg.Booking_Policies || {}
    const policies = { booking: parsePolicies(bp.booking), payment: parsePolicies(bp.payment), cancellation: parsePolicies(bp.cancellation) }
    const valid = new Date(input.quoteDate)
    valid.setDate(valid.getDate() + Math.max(1, input.validDays || 7))

    const packageSlug = pkg.Slug || pkg.Destination_ID
    const packageUrl = input.destinationSlug && packageSlug && pkg.id && pkg.id !== 'custom'
        ? `https://www.travelzada.com/destinations/${encodeURIComponent(input.destinationSlug)}/${encodeURIComponent(packageSlug)}`
        : ''

    const nights = Number(pkg.Duration_Nights) || quotedNights || (days.length ? days.length - 1 : 0) || undefined
    const title = String(pkg.Destination_Name || input.destinationName || 'Your custom trip')
    const heroImage = design?.coverImage?.[0]?.url || cleanImageUrl(pkg.Primary_Image_URL || pkg.Meta_Image_URL)

    /* ---- cover ---- */
    const coverTitle = (design?.coverTitle || '').trim() || (input.destinationName || '').trim() || title
    const cities = Array.from(new Set(quoted.hotels.map((h) => h.city.trim()).filter(Boolean)))
    const routeCities = cities.length ? cities : route.map((r) => r.replace(/\s*[·(\-].*$/, '').trim()).filter(Boolean)
    const starLabel = quoted.starRating ? `${quoted.starRating}-star` : String(pkg.Star_Category || '').trim()
    let autoSubtitle = [joinAnd(routeCities.slice(0, 4)), starLabel ? `hand-picked ${starLabel} stays` : ''].filter(Boolean).join(' · ')
    if (stayOptions.length >= 3) {
        // Resort comparison: where the options are + the star range
        const places = Array.from(new Set(stayOptions.map((o) => (o.location || o.hotels[0]?.city || '').trim()).filter(Boolean)))
        const stars = Array.from(new Set(stayOptions.map((o) => o.starRating).filter(Boolean))).sort()
        autoSubtitle = [joinAnd(places.slice(0, 4)), stars.length ? `${stars.join(' & ')}-star stays` : ''].filter(Boolean).join(' · ')
    }
    const rooms = Math.max(1, Math.ceil((input.adults || 1) / 2))
    const salutation = input.client.name.trim() || 'you'

    /* ---- flights ---- */
    const lastDay = input.travelDate && nights ? addDays(input.travelDate, nights) : ''
    const destCity = routeCities[0] || input.destinationName || coverTitle
    // fly home from where the last hotel is (Srinagar → … → Srinagar), not the last *new* city
    const lastCity = quoted.hotels[quoted.hotels.length - 1]?.city?.trim() || routeCities[routeCities.length - 1] || destCity
    const out = flights[0]
    const back = flights.length > 1 ? flights[flights.length - 1] : undefined
    const quoteTime = input.quoteDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

    /* ---- day photos: chosen, else day photos, else package gallery ---- */
    let dayPhotos = (design?.dayPhotos || []).filter((i) => i.url).slice(0, 2)
    if (!dayPhotos.length) {
        const fromDays = days.flatMap((d) => d.images || [])
        const galleryRaw: unknown[] = Array.isArray(pkg.Gallery_Images) ? pkg.Gallery_Images : []
        const gallery: ProposalImage[] = galleryRaw.map((u) => ({ url: cleanImageUrl(String(u || '')) })).filter((i) => i.url && i.url !== heroImage)
        dayPhotos = [...fromDays, ...gallery].slice(0, 2)
    }

    /* ---- extras ---- */
    const autoGlance = (highlights.length >= 3 ? highlights : inclusions).slice(0, 6)
    const autoChips: string[] = []
    if (flightsIncluded) autoChips.push('Flights included')
    if (/gst|tax/.test(incText + ' ' + String(input.priceNote || '').toLowerCase())) autoChips.push('Taxes included')
    if (included.transfers && autoChips.length < 3) autoChips.push('Private transfers')
    if (included.meals && autoChips.length < 2) autoChips.push(quoted.mealSummary || 'Meals included')

    return {
        quoteRef: input.quoteRef,
        quoteDate: input.quoteDate.toISOString(),
        validUntil: valid.toISOString(),
        client: { name: input.client.name.trim() || 'Guest', phone: input.client.phone, email: input.client.email },
        designer: { name: (input.designerName || '').trim() || 'Team Travelzada', phone: CONTACT.phone, email: CONTACT.email, whatsapp: CONTACT.whatsappNumber },
        trip: {
            title,
            destination: input.destinationName || '',
            durationLabel,
            nights,
            days: Number(pkg.Duration_Days) || days.length || undefined,
            travelDate: input.travelDate || '',
            adults: Math.max(0, input.adults || 0),
            children: Math.max(0, input.children || 0),
            tripType: input.tripType || '',
            starCategory: String(pkg.Star_Category || ''),
            mealPlan: String(pkg.Meal_Plan || quoted.mealSummary || ''),
            bestTime: String(pkg.Seasonality || ''),
            transferType: String(pkg.Transfer_Type || ''),
            overview: String(pkg.Overview || ''),
            route: route.slice(0, 7),
            heroImage,
            packageUrl,
            rating: pkg.Rating && Number(pkg.Rating) > 0 ? String(pkg.Rating) : '',
        },
        price: {
            total,
            perPerson: pax > 0 ? Math.round(total / pax) : total,
            advancePaid: advance,
            balance: Math.max(0, total - advance),
            note: input.priceNote || '',
        },
        included,
        highlights,
        days,
        hotels,
        flights,
        inclusions,
        exclusions,
        policies,
        notes: input.notes || '',
        whyUs,
        reviews,
        logoUrl: LOGO_URL,

        cover: {
            title: coverTitle,
            script: (design?.coverScript || '').trim() || coverScriptFor(input.adults || 0, input.children || 0),
            subtitle: (design?.coverSubtitle || '').trim() || autoSubtitle,
            eyebrow: `A Travelzada proposal for ${salutation}`,
            roomsLabel: (design?.roomsLabel || '').trim() || (rooms === 1 ? '1 double' : `${rooms} rooms`),
            dateRange: dateRangeLabel(input.travelDate, nights),
            hotelsLabel: stayOptions.length > 1 ? `${stayOptions.length} options` : starLabel,
        },
        runningLabel: [quoted.tier || '', coverTitle].filter(Boolean).join(' '),
        stayOptions,
        flightInfo: {
            show: flightsIncluded || design?.flightsMode === 'not-included',
            included: flightsIncluded,
            outbound: outboundShotOf(design),
            inbound: returnShotOf(design),
            outboundLabel: (design?.outboundLabel || '').trim() || `${stripCode(out?.departureCity) || 'Your city'} → ${stripCode(out?.arrivalCity) || destCity}`,
            inboundLabel: (design?.returnLabel || '').trim() || `${stripCode(back?.departureCity) || lastCity} → ${stripCode(back?.arrivalCity) || 'Your city'}`,
            outboundDate: out?.date || input.travelDate || '',
            inboundDate: back?.date || lastDay,
            fareNote: (design?.fareNote || '').trim() || `Fares as of ${quoteTime} · subject to change until ticketed`,
        },
        dayPhotos,
        extras: {
            atAGlance: design?.atAGlance?.length ? design.atAGlance : autoGlance,
            chips: design?.chips?.length ? design.chips : autoChips.slice(0, 3),
            paymentText: (design?.paymentText || '').trim() || policies.payment.join(' ') || 'A small advance blocks your hotels and dates right away. The balance is due before you travel — we will share the exact schedule when you confirm.',
            cancellationText: (design?.cancellationText || '').trim() || policies.cancellation.join(' ') || 'Cancellation charges follow the hotel and airline rules at the time of cancellation. We will always tell you the exact amount before you confirm anything.',
            peakLine: (design?.peakLine || '').trim() || 'Hotel rates and fares move quickly — confirm soon to keep this price.',
            ratingLine: (design?.ratingLine || '').trim() || BRAND_RATING_LINE,
            termsUrl: TERMS_URL,
            showcase: design ? design.showcase !== false : true,
        },
    }
}

const outboundShotOf = (d?: QuoteDesign) => (d?.outboundShot?.[0]?.url ? d.outboundShot[0] : undefined)
const returnShotOf = (d?: QuoteDesign) => (d?.returnShot?.[0]?.url ? d.returnShot[0] : undefined)
