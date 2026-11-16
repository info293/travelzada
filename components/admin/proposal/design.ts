/**
 * Defaults + helpers for the v2 quote design (stay options, images, closing copy).
 * Shared by the builder UI and buildProposalData; nothing here touches the DOM.
 */
import {
    nightsBetween,
    type ProposalHotel, type ProposalImage, type ProposalStay, type QuoteDesign, type StayOptionDraft,
} from './types'

export const uid = () => Math.random().toString(36).slice(2, 10)

export function newStay(partial: Partial<ProposalStay> = {}): ProposalStay {
    return { id: uid(), city: '', nights: 1, hotelName: '', roomType: '', mealPlan: '', bullets: [], images: [], ...partial }
}

export function newOption(partial: Partial<StayOptionDraft> = {}): StayOptionDraft {
    return {
        id: uid(),
        label: '',
        tier: '',
        isQuoted: false,
        price: 0,
        priceNote: '',
        mealSummary: '',
        transfer: '',
        location: '',
        starRating: 0,
        description: '',
        chooseIf: '',
        amenities: [],
        images: [],
        included: [],
        hotels: [],
        ...partial,
    }
}

export function defaultDesign(): QuoteDesign {
    return {
        version: 2,
        coverImage: [],
        coverTitle: '',
        coverScript: '',
        coverSubtitle: '',
        roomsLabel: '',
        stayOptions: [newOption({ isQuoted: true })],
        flightsMode: 'auto',
        outboundShot: [],
        returnShot: [],
        outboundLabel: '',
        returnLabel: '',
        fareNote: '',
        dayPhotos: [],
        atAGlance: [],
        chips: [],
        paymentText: '',
        cancellationText: '',
        peakLine: '',
        ratingLine: '',
        showcase: true,
    }
}

const asImages = (v: unknown): ProposalImage[] =>
    Array.isArray(v)
        ? v.map((i: any) => (typeof i === 'string' ? { url: i } : { url: String(i?.url || ''), caption: i?.caption ? String(i.caption) : '' })).filter((i) => i.url)
        : []
const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map((s) => String(s ?? '').trim()).filter(Boolean) : [])

/** Make any (possibly old / partial / Firestore-loaded) design object safe to use */
export function normaliseDesign(raw: any): QuoteDesign {
    const base = defaultDesign()
    if (!raw || typeof raw !== 'object') return base
    const options: StayOptionDraft[] = Array.isArray(raw.stayOptions) && raw.stayOptions.length
        ? raw.stayOptions.slice(0, 4).map((o: any) => newOption({
            ...o,
            id: String(o?.id || uid()),
            price: Number(o?.price) || 0,
            starRating: Math.max(0, Math.min(5, Number(o?.starRating) || 0)),
            amenities: asStrings(o?.amenities),
            included: asStrings(o?.included),
            images: asImages(o?.images),
            hotels: Array.isArray(o?.hotels) ? o.hotels.map((h: any) => newStay({
                ...h,
                id: String(h?.id || uid()),
                nights: Math.max(0, Number(h?.nights) || 0),
                bullets: asStrings(h?.bullets),
                images: asImages(h?.images),
                sizeSqm: h?.sizeSqm ? String(h.sizeSqm) : '',
            })) : [],
        }))
        : base.stayOptions
    if (!options.some((o) => o.isQuoted)) options[0].isQuoted = true
    let seen = false
    options.forEach((o) => { if (o.isQuoted) { if (seen) o.isQuoted = false; seen = true } })
    return {
        ...base,
        ...raw,
        version: 2,
        coverImage: asImages(raw.coverImage).slice(0, 1),
        stayOptions: options,
        flightsMode: ['auto', 'included', 'not-included'].includes(raw.flightsMode) ? raw.flightsMode : 'auto',
        outboundShot: asImages(raw.outboundShot).slice(0, 1),
        returnShot: asImages(raw.returnShot).slice(0, 1),
        dayPhotos: asImages(raw.dayPhotos).slice(0, 2),
        atAGlance: asStrings(raw.atAGlance),
        chips: asStrings(raw.chips),
        showcase: raw.showcase !== false,
    }
}

/** Old single hotels list (check-in / check-out dates) → stays */
export function hotelsToStays(hotels: ProposalHotel[] = []): ProposalStay[] {
    return hotels
        .filter((h) => h && (h.hotelName || h.city))
        .map((h) => newStay({
            city: h.city || '',
            hotelName: h.hotelName || '',
            roomType: h.roomType || '',
            mealPlan: h.mealPlan || '',
            checkIn: h.checkIn || '',
            checkOut: h.checkOut || '',
            nights: nightsBetween(h.checkIn, h.checkOut) || 1,
        }))
}

/** Put hotels into the quoted option (used for prefill / old records) */
export function withHotels(design: QuoteDesign, hotels: ProposalHotel[]): QuoteDesign {
    const stays = hotelsToStays(hotels)
    if (!stays.length) return design
    return { ...design, stayOptions: design.stayOptions.map((o) => (o.isQuoted ? { ...o, hotels: stays } : o)) }
}

/** "Premium · 4-star" → "Luxury · 5-star"; everything copied, hotels kept so the planner only swaps names */
export function duplicateAsUpgrade(o: StayOptionDraft): StayOptionDraft {
    return newOption({
        ...JSON.parse(JSON.stringify(o)),
        id: uid(),
        isQuoted: false,
        label: 'Luxury · 5-star',
        tier: 'Luxury',
        starRating: 5,
        price: Math.round((o.price || 0) * 1.5),
        chooseIf: '',
        hotels: o.hotels.map((h) => newStay({ ...h, id: uid(), hotelName: '', images: [] })),
        images: [],
    })
}

export function duplicateOption(o: StayOptionDraft): StayOptionDraft {
    return newOption({ ...JSON.parse(JSON.stringify(o)), id: uid(), isQuoted: false, label: o.label ? `${o.label} (copy)` : '' })
}

/** Every photo URL a design references (for "pick from this quote" suggestions) */
export function designImages(d: QuoteDesign): string[] {
    const urls: string[] = []
    d.coverImage.forEach((i) => urls.push(i.url))
    d.stayOptions.forEach((o) => {
        o.images.forEach((i) => urls.push(i.url))
        o.hotels.forEach((h) => h.images.forEach((i) => urls.push(i.url)))
    })
    d.dayPhotos.forEach((i) => urls.push(i.url))
    return Array.from(new Set(urls.filter(Boolean)))
}
