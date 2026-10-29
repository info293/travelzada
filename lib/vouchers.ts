/**
 * Travelzada gift vouchers — shared config & helpers (safe for client and server).
 *
 * Flow: a printed voucher "card" (e.g. TZ-INT-0001, created in /admin/vouchers) carries a QR code that opens
 * /voucher/TZ-INT-0001. The customer enters their details and gets a unique personal code (e.g. TZI-7KQ4-M2XP),
 * stored in `voucher_claims`, emailed + WhatsApped to them, and applied by the team when the booking is confirmed.
 */

export const VOUCHER_CARDS_COLLECTION = 'voucher_cards'
export const VOUCHER_CLAIMS_COLLECTION = 'voucher_claims'

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.travelzada.com').replace(/\/$/, '')

export type VoucherType = 'domestic' | 'international'

export interface VoucherTypeConfig {
  type: VoucherType
  label: string
  cardPrefix: string // printed card code prefix, e.g. TZ-INT-0001
  claimPrefix: string // personal code prefix, e.g. TZI-7KQ4-M2XP
  amount: number
  minSpend: number
  bookWithinMonths: number
  travelBy: string // fixed last travel date (end of day IST)
  idDocument: string
  destinations: string[]
  destinationsBlurb: string
  packageNote?: string // appended to the "eligible package" term
  theme: { panel: string; panelDeep: string; accent: string }
}

export const VOUCHER_ASSISTANCE_EMAIL = 'rishabh@travelzada.com'

export const VOUCHER_TYPES: Record<VoucherType, VoucherTypeConfig> = {
  domestic: {
    type: 'domestic',
    label: 'Domestic',
    cardPrefix: 'TZ-DOM',
    claimPrefix: 'TZD',
    amount: 3000,
    minSpend: 60000,
    bookWithinMonths: 3,
    travelBy: '2027-03-31T23:59:59+05:30',
    idDocument: 'Indian ID Card',
    destinations: [
      'Andaman & Nicobar', 'Gujarat', 'Himachal Pradesh', 'Karnataka', 'Kashmir', 'Kerala', 'Leh Ladakh',
      'Meghalaya', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    ],
    destinationsBlurb: '14 Indian destinations of your choice',
    theme: { panel: '#163F8A', panelDeep: '#0B2A63', accent: '#E4C47E' },
  },
  international: {
    type: 'international',
    label: 'International',
    cardPrefix: 'TZ-INT',
    claimPrefix: 'TZI',
    amount: 5000,
    minSpend: 100000,
    bookWithinMonths: 3,
    travelBy: '2027-03-31T23:59:59+05:30',
    idDocument: 'Indian passport',
    destinations: [
      'Abu Dhabi', 'Azerbaijan (Baku)', 'Bali', 'Bhutan', 'Dubai', 'Malaysia', 'Nepal', 'Singapore', 'Sri Lanka', 'Thailand', 'Vietnam',
    ],
    destinationsBlurb: '11 countries + cruise holidays',
    packageNote: 'Visa services are optional and may be added where applicable.',
    theme: { panel: '#7A1F33', panelDeep: '#4D0E1D', accent: '#E4C47E' },
  },
}

/** Destinations shown in forms and term 14 (international also covers cruises) */
export const destinationOptions = (type: VoucherType) =>
  type === 'international' ? [...VOUCHER_TYPES[type].destinations, 'Cruise holiday'] : VOUCHER_TYPES[type].destinations

export const voucherConfig = (type?: string) => VOUCHER_TYPES[(type as VoucherType) || 'international'] || VOUCHER_TYPES.international

/** Indian number format: 100000 → "₹1,00,000" */
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

export function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/** "2027-01-29T…" → "29 Jan 2027" */
export const formatVoucherDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : ''

/** "2027-03-31T…" → "31 March 2027" */
export const formatLongDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })

export const normalizeCardCode = (code: string) => decodeURIComponent(code || '').trim().toUpperCase()

export function termsFor(type: VoucherType): string[] {
  const c = VOUCHER_TYPES[type]
  const list = type === 'international' ? [...c.destinations, 'cruise holidays'] : c.destinations
  const places = list.join(', ').replace(/, ([^,]*)$/, ' and $1')
  return [
    `Valid for ${c.idDocument} holders only, with a minimum of 2 travellers per booking.`,
    `The booking must be confirmed within ${c.bookWithinMonths} months of issue. Travel must be completed by ${formatLongDate(c.travelBy)}.`,
    'Applies only to holiday packages for the destinations listed in term 14.',
    `An eligible package must include hotel stay(s), transfers, sightseeing and meals.${c.packageNote ? ` ${c.packageNote}` : ''}`,
    'Flights and all airfare-related charges are excluded from the package value and cannot be discounted.',
    `The package value must be at least ${inr(c.minSpend)} per couple, excluding flights, before the discount is applied.`,
    'One voucher per booking. It cannot be combined with any other offer, discount or voucher.',
    'The voucher may be gifted to another person, but cannot be exchanged for cash. The recipient must meet all eligibility conditions in these terms.',
    "All prices are dynamic, subject to availability, supplier terms and Travelzada's booking, payment and cancellation policies.",
    'Cannot be applied to a booking that is already confirmed.',
    'If a booking is cancelled or changed and no longer meets the eligibility criteria, the voucher benefit may be withdrawn, in line with the cancellation and refund terms.',
    'Redeemable only through Travelzada, subject to verification at the time of booking.',
    'Travelzada reserves the right to verify eligibility and enforce these terms.',
    `Valid destinations: ${places}.`,
  ]
}

export const REDEEM_STEPS: { title: string; text: string }[] = [
  { title: 'Scan the QR code', text: 'on your voucher.' },
  { title: 'Enter your details.', text: 'It takes under a minute.' },
  { title: 'Get your unique voucher code', text: 'on email and WhatsApp straight away.' },
  { title: 'A Travelzada travel expert calls you', text: 'within 24 hours to plan your holiday.' },
  { title: 'Book within 3 months', text: 'and travel by 31 March 2027. The code is applied when your booking is confirmed.' },
]

export interface VoucherCard {
  code: string
  type: VoucherType
  recipientName?: string
  issuedAt: string
  validUntil: string
  travelUntil: string
  maxClaims: number
  claimCount: number
  status: 'active' | 'disabled'
  note?: string
  createdAt?: string
  createdBy?: string
}

export type ClaimStatus = 'active' | 'applied' | 'cancelled'

export interface VoucherClaim {
  code: string
  cardCode: string
  type: VoucherType
  amount: number
  minSpend: number
  name: string
  phone: string
  phoneNorm: string
  email: string
  destination?: string
  travelMonth?: string
  notes?: string
  status: ClaimStatus
  bookBy: string
  travelBy: string
  createdAt: string
  updatedAt?: string
  appliedAt?: string
  bookingRef?: string
  bookingValue?: number
  adminNote?: string
  notifications?: { email?: string; whatsapp?: string; team?: string }
}

export const CLAIM_STATUSES: { id: ClaimStatus; label: string; className: string }[] = [
  { id: 'active', label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'applied', label: 'Applied to booking', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'cancelled', label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
]

/** A claim past its book-by date that was never applied */
export const isClaimExpired = (c: Pick<VoucherClaim, 'status' | 'bookBy'>) =>
  c.status === 'active' && !!c.bookBy && new Date(c.bookBy).getTime() < Date.now()

export const cardRedeemUrl = (cardCode: string) => `${SITE_URL}/voucher/${encodeURIComponent(cardCode)}`
export const claimViewUrl = (claimCode: string) => `${SITE_URL}/voucher/code/${encodeURIComponent(claimCode)}`
