import {
    CONTACT, DEFAULT_WHY_US, LOGO_URL, nightsBetween,
    type ProposalData, type ProposalDay, type ProposalFlight, type ProposalHotel,
} from './types'

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
    totalCost: number
    advancePaid: number
    priceNote?: string
    days: ProposalDay[]
    hotels: ProposalHotel[]
    flights: ProposalFlight[]
    notes: string
    destinationName?: string
    destinationSlug?: string
    designerName?: string
    quoteRef: string
    quoteDate: Date
    validDays: number
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

export function buildProposalData(input: BuildProposalInput): ProposalData {
    const { pkg } = input
    const inclusions = parseList(pkg.Inclusions)
    const exclusions = parseList(pkg.Exclusions)
    const days = input.days
        .filter((d) => d && (d.title || d.description))
        .map((d) => {
            const description = String(d.description || '').replace(/^Day\s*\d+\s*[:\-–]\s*/i, '').trim()
            return { ...d, description: description === String(d.title || '').trim() ? '' : description, activities: (d.activities || []).filter(Boolean) }
        })
    const hotels = input.hotels.filter((h) => h.hotelName || h.city)
    const flights = input.flights.filter((f) => f.airline || f.departureCity || f.arrivalCity)

    // Route: catalog Location_Breakup, else the hotel cities
    let route = String(pkg.Location_Breakup || '').split(/\s*(?:,|→|->|\||\+|;)\s*/).map((s) => s.trim()).filter(Boolean)
    if (route.length < 2 && hotels.length > 1) {
        route = hotels.map((h) => {
            const n = nightsBetween(h.checkIn, h.checkOut)
            return h.city ? `${h.city}${n ? ` · ${n}N` : ''}` : ''
        }).filter(Boolean)
    }

    const durationLabel = String(pkg.Duration || '').trim() || (days.length ? `${Math.max(0, days.length - 1)} Nights / ${days.length} Days` : '')

    const highlightsRaw: string[] = Array.isArray(pkg.Highlights) && pkg.Highlights.length
        ? pkg.Highlights.map(String)
        : (days.length > 2 ? days.slice(1, -1) : days).map((d) => d.title)
    const highlights = Array.from(new Set(highlightsRaw.map((h) => h.trim()).filter((h) => h && !/^day\s*\d+/i.test(h)))).slice(0, 6)

    const incText = inclusions.join(' ').toLowerCase()
    const included = {
        stay: hotels.length > 0 || /hotel|stay|accommodation|resort|villa|night/.test(incText),
        meals: /breakfast|meal|dinner|lunch|map\b|cp\b|ap\b/.test(incText) || hotels.some((h) => /breakfast|dinner|meal|map|cp|ap/i.test(h.mealPlan)),
        transfers: /transfer|cab|car\b|pick|drop|vehicle|taxi|airport/.test(incText),
        sightseeing: /sightseeing|tour|visit|excursion|safari|cruise|activity|activities/.test(incText),
        flights: flights.length > 0 || (/flight|airfare|air fare|air ticket/.test(incText) && !/flight|airfare|air fare|air ticket/.test(exclusions.join(' ').toLowerCase())),
    }

    const pax = Math.max(0, (input.adults || 0) + (input.children || 0))
    const total = Math.max(0, Number(input.totalCost) || 0)
    const advance = Math.max(0, Number(input.advancePaid) || 0)

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
    const valid = new Date(input.quoteDate)
    valid.setDate(valid.getDate() + Math.max(1, input.validDays || 7))

    const packageSlug = pkg.Slug || pkg.Destination_ID
    const packageUrl = input.destinationSlug && packageSlug && pkg.id && pkg.id !== 'custom'
        ? `https://www.travelzada.com/destinations/${encodeURIComponent(input.destinationSlug)}/${encodeURIComponent(packageSlug)}`
        : ''

    const nights = Number(pkg.Duration_Nights) || (days.length ? days.length - 1 : 0) || undefined

    return {
        quoteRef: input.quoteRef,
        quoteDate: input.quoteDate.toISOString(),
        validUntil: valid.toISOString(),
        client: { name: input.client.name.trim() || 'Guest', phone: input.client.phone, email: input.client.email },
        designer: { name: (input.designerName || '').trim() || 'Team Travelzada', phone: CONTACT.phone, email: CONTACT.email, whatsapp: CONTACT.whatsappNumber },
        trip: {
            title: String(pkg.Destination_Name || input.destinationName || 'Your custom trip'),
            destination: input.destinationName || '',
            durationLabel,
            nights,
            days: Number(pkg.Duration_Days) || days.length || undefined,
            travelDate: input.travelDate || '',
            adults: Math.max(0, input.adults || 0),
            children: Math.max(0, input.children || 0),
            tripType: input.tripType || '',
            starCategory: String(pkg.Star_Category || ''),
            mealPlan: String(pkg.Meal_Plan || hotels.find((h) => h.mealPlan)?.mealPlan || ''),
            bestTime: String(pkg.Seasonality || ''),
            transferType: String(pkg.Transfer_Type || ''),
            overview: String(pkg.Overview || ''),
            route: route.slice(0, 7),
            heroImage: cleanImageUrl(pkg.Primary_Image_URL || pkg.Meta_Image_URL),
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
        policies: {
            booking: parsePolicies(bp.booking),
            payment: parsePolicies(bp.payment),
            cancellation: parsePolicies(bp.cancellation),
        },
        notes: input.notes || '',
        whyUs,
        reviews,
        logoUrl: LOGO_URL,
    }
}
