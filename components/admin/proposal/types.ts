/**
 * Data model for the customer-facing quote / itinerary PDF ("proposal").
 * The builder (ItineraryGenerator) maps its form + package into this shape; the page components render it.
 */

export interface ProposalDay {
    day: string // "Day 1"
    title: string
    description: string
    activities?: string[]
}

export interface ProposalHotel {
    city: string
    hotelName: string
    checkIn: string // yyyy-mm-dd
    checkOut: string
    roomType: string
    mealPlan: string
}

export interface ProposalFlight {
    date: string
    airline: string
    flightNumber: string
    departureTime: string
    arrivalTime: string
    departureCity: string
    arrivalCity: string
}

export interface ProposalData {
    quoteRef: string
    quoteDate: string // ISO
    validUntil: string // ISO
    client: { name: string; phone?: string; email?: string }
    designer: { name: string; phone: string; email: string; whatsapp: string }
    trip: {
        title: string
        destination: string
        durationLabel: string // "5 Nights / 6 Days"
        nights?: number
        days?: number
        travelDate?: string // yyyy-mm-dd
        adults: number
        children: number
        tripType?: string // Honeymoon / Anniversary…
        starCategory?: string
        mealPlan?: string
        bestTime?: string
        transferType?: string
        overview?: string
        route: string[] // ["Ubud · 2N", "Seminyak · 3N"]
        heroImage?: string // URL or data URL; empty → brand gradient
        packageUrl?: string
        rating?: string
    }
    price: {
        total: number
        perPerson: number
        advancePaid: number
        balance: number
        note?: string
    }
    included: { stay: boolean; meals: boolean; transfers: boolean; sightseeing: boolean; flights: boolean }
    highlights: string[]
    days: ProposalDay[]
    hotels: ProposalHotel[]
    flights: ProposalFlight[]
    inclusions: string[]
    exclusions: string[]
    policies: { booking: string[]; payment: string[]; cancellation: string[] }
    notes: string
    whyUs: { label: string; description: string }[]
    reviews: { name: string; content: string; date?: string; rating?: string }[]
    logoUrl: string
}

export const TZ = {
    wine: '#651926',
    wineDark: '#4c111c',
    wineLight: '#852233',
    coffee: '#0F0406',
    mauve: '#462831',
    alabaster: '#E2DDE3',
    mist: '#F7F3F5',
    rose: '#C9A0AC',
    roseSoft: '#F3E6EA',
    granite: '#6B6773',
    line: '#E8E1E5',
    green: '#128C4A',
    greenSoft: '#E6F5EC',
    red: '#C0392B',
    redSoft: '#FBEAEA',
    whatsapp: '#25D366',
}

export const CONTACT = {
    phone: '+91 99299 62350',
    phoneHref: 'tel:+919929962350',
    email: 'info@travelzada.com',
    whatsappNumber: '919929962350',
    website: 'www.travelzada.com',
    address: 'Plot No. 18, Friends Colony, Malviya Nagar, Jaipur',
}

export const LOGO_URL = '/images/logo/Travelzada Logo April (1).png'

export const PAGE_W = 794
export const PAGE_H = 1123

export const formatRupees = (n: number) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')

export function formatLongDate(value?: string) {
    if (!value) return ''
    const d = new Date(value.length === 10 ? value + 'T00:00:00' : value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatShortDate(value?: string) {
    if (!value) return ''
    const d = new Date(value.length === 10 ? value + 'T00:00:00' : value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function nightsBetween(a?: string, b?: string) {
    if (!a || !b) return 0
    const d1 = new Date(a + 'T00:00:00').getTime()
    const d2 = new Date(b + 'T00:00:00').getTime()
    if (!Number.isFinite(d1) || !Number.isFinite(d2)) return 0
    return Math.max(0, Math.round((d2 - d1) / 86400000))
}

export function whatsappLink(text: string, number: string = CONTACT.whatsappNumber) {
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

/** Brand defaults used when the package has no Why_Book_With_Us */
export const DEFAULT_WHY_US = [
    { label: '24×7 on-trip support', description: 'A real person on WhatsApp from take-off to touch-down, any hour.' },
    { label: 'Handpicked couple-friendly stays', description: 'Every hotel is vetted for privacy, romance and great service.' },
    { label: 'No hidden costs', description: 'What you see in this quote is what you pay. Taxes clearly shown.' },
    { label: 'Made just for you two', description: 'Change any day, hotel or activity — we tailor it until it feels right.' },
    { label: 'Little surprises included', description: 'Room decor, cake or a candle-light dinner for your special occasion on request.' },
    { label: 'Easy, secure payments', description: 'Block your trip with a small advance; pay the balance before you fly.' },
]
