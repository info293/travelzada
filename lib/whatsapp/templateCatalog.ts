/**
 * Travelzada WhatsApp template catalog (client-safe: no env, no network).
 *
 * GetGabs only tells us a template's variable COUNT and sample values — never its wording. The wording below comes
 * from docs/whatsapp/getgabs-template-guide.md (section 5) and was cross-checked against the LIVE GetGabs list
 * (variable counts, header type, URL-button variable). Live wins for counts/types; the guide wins for wording.
 *
 * Every variable has a plain-English title so sales staff know exactly what to type.
 */

import type { GetGabsTemplateSummary } from '@/lib/getgabsTemplates'

export type TemplateStage =
  | 'first_contact'
  | 'lead'
  | 'quote'
  | 'booking'
  | 'payment'
  | 'pre_trip'
  | 'on_trip'
  | 'post_trip'
  | 'campaign'
  | 'internal'

export type TemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'

/** Values the inbox / broadcasts can fill in automatically */
export type VariableSource =
  | 'customer_first_name'
  | 'destination'
  | 'package_name'
  | 'trip_type'
  | 'travel_date'
  | 'nights'
  | 'price'
  | 'agent_name'
  | 'booking_id'

export interface CatalogVariable {
  /** {{index}} in the body (1-based) */
  index: number
  /** Clear title shown above the input, e.g. "Customer's first name" */
  label: string
  /** One line explaining what to type */
  help: string
  /** Realistic example (also the sample shown in the phone preview) */
  example: string
  source?: VariableSource
  /** Soft length hint shown under the input */
  maxLength?: number
}

export interface CatalogButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text: string
  /** URL buttons: full link; a dynamic one ends in {{1}} */
  url?: string
  urlHasVariable?: boolean
  /** Dynamic URL buttons: what to type for the end of the link */
  urlVariable?: { label: string; help: string; example: string; source?: VariableSource }
  phone?: string
}

export interface CatalogHeader {
  type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO'
  /** TEXT headers: fixed text */
  text?: string
  /** Media headers: title of the link input, e.g. "Quote PDF link" */
  hint?: string
  /** Media headers: example file name shown in the preview */
  sampleFilename?: string
}

export interface CatalogTemplate {
  name: string
  /** Plain English, e.g. "Quote sent (with PDF)" */
  title: string
  category: TemplateCategory
  language: string
  /** One line: what it is for */
  purpose: string
  /** When to send it */
  whenToUse: string
  stage: TemplateStage
  header?: CatalogHeader
  /** Body with {{1}}…{{n}}; empty when the wording is unknown */
  body: string
  footer?: string
  buttons?: CatalogButton[]
  variables: CatalogVariable[]
  /** 1 = best first message to a brand-new customer */
  firstContactRank?: number
  /** 1 = best message to re-open a conversation whose 24-hour window has closed */
  reopenRank?: number
  /** False when the wording isn't in our guide (approved in GetGabs only) */
  wordingKnown?: boolean
  /** Can't be sent from the admin (carousel, team-only…) — explains why */
  notSendableReason?: string
  /** Extra tip for staff */
  note?: string
  /** Carousel templates: the cards */
  carouselCards?: { imageHint: string; body: string; buttons: CatalogButton[] }[]
}

export const DEFAULT_FOOTER = 'Travelzada · Journeys designed for two'

/** values[] key for the end-of-link value of URL button number `buttonIndex` (0-based) */
export const BUTTON_VALUE_BASE = 100
export const buttonValueKey = (buttonIndex: number) => BUTTON_VALUE_BASE + buttonIndex

export const STAGE_LABEL: Record<TemplateStage, string> = {
  first_contact: 'First contact',
  lead: 'Leads',
  quote: 'Quotes',
  booking: 'Bookings',
  payment: 'Payments',
  pre_trip: 'Before trip',
  on_trip: 'On trip',
  post_trip: 'After trip',
  campaign: 'Campaigns',
  internal: 'Team only',
}

/** Filter chips on the Templates page / picker ("Bookings & payments" covers both stages) */
export const STAGE_FILTERS: { value: string; label: string; stages: TemplateStage[] }[] = [
  { value: 'first_contact', label: 'First contact', stages: ['first_contact'] },
  { value: 'lead', label: 'Leads', stages: ['lead'] },
  { value: 'quote', label: 'Quotes', stages: ['quote'] },
  { value: 'booking', label: 'Bookings & payments', stages: ['booking', 'payment'] },
  { value: 'pre_trip', label: 'Before trip', stages: ['pre_trip'] },
  { value: 'on_trip', label: 'On trip', stages: ['on_trip'] },
  { value: 'post_trip', label: 'After trip', stages: ['post_trip'] },
  { value: 'campaign', label: 'Campaigns', stages: ['campaign'] },
  { value: 'internal', label: 'Team only', stages: ['internal'] },
]

export const STAGE_ORDER: TemplateStage[] = ['first_contact', 'lead', 'quote', 'booking', 'payment', 'pre_trip', 'on_trip', 'post_trip', 'campaign', 'internal']

export const CATEGORY_LABEL: Record<string, string> = { UTILITY: 'Utility', MARKETING: 'Marketing', AUTHENTICATION: 'OTP' }

/* ------------------------------------------------------------------------------------------------
 * Building blocks
 * ---------------------------------------------------------------------------------------------- */

const NAME = (index = 1): CatalogVariable => ({
  index,
  label: "Customer's first name",
  help: 'Just the first name, as the customer writes it.',
  example: 'Priya',
  source: 'customer_first_name',
  maxLength: 30,
})
const DEST = (index: number, help = 'The place they are travelling to.'): CatalogVariable => ({
  index,
  label: 'Destination',
  help,
  example: 'Bali',
  source: 'destination',
  maxLength: 40,
})
const BOOKING_ID = (index: number): CatalogVariable => ({
  index,
  label: 'Booking ID',
  help: 'The booking reference from the admin, e.g. TZ-24871.',
  example: 'TZ-24871',
  source: 'booking_id',
  maxLength: 20,
})
const AMOUNT = (index: number, label: string, help: string, example: string): CatalogVariable => ({
  index,
  label,
  help: `${help} Write it with the ₹ sign and commas.`,
  example,
  maxLength: 20,
})
const COORDINATOR = (index: number, label = "Coordinator's name"): CatalogVariable => ({
  index,
  label,
  help: 'First name of the Travelzada person handling this trip (usually you).',
  example: 'Ananya',
  source: 'agent_name',
  maxLength: 30,
})

const qr = (text: string): CatalogButton => ({ type: 'QUICK_REPLY', text })
const link = (text: string, url: string): CatalogButton => ({ type: 'URL', text, url })
const dynLink = (text: string, prefix: string, v: CatalogButton['urlVariable']): CatalogButton => ({
  type: 'URL',
  text,
  url: `${prefix}{{1}}`,
  urlHasVariable: true,
  urlVariable: v,
})
const SHARED_PLAN_VAR = (what: string): CatalogButton['urlVariable'] => ({
  label: `${what} link code`,
  help: 'Paste the shared-plan link (travelzada.com/shared-plan/…) or just the code at its end.',
  example: 'abc123',
})
const DEST_SLUG_VAR: CatalogButton['urlVariable'] = {
  label: 'Destination page (end of the link)',
  help: 'The destination as it appears in the website link, lowercase, e.g. bali for travelzada.com/destinations/bali.',
  example: 'bali',
}

const tpl = (t: Omit<CatalogTemplate, 'language' | 'footer'> & { footer?: string | null; language?: string }): CatalogTemplate => ({
  ...t,
  language: t.language || 'en',
  footer: t.footer === null ? undefined : t.footer || DEFAULT_FOOTER,
  wordingKnown: t.wordingKnown ?? true,
})

/* ------------------------------------------------------------------------------------------------
 * The catalog
 * ---------------------------------------------------------------------------------------------- */

export const TEMPLATE_CATALOG: CatalogTemplate[] = [
  /* ---------------- A. Enquiries & leads ---------------- */
  tpl({
    name: 'tz_enquiry_received',
    title: 'Thanks for your enquiry',
    category: 'UTILITY',
    stage: 'first_contact',
    purpose: 'Say hello and confirm we got their trip request.',
    whenToUse: 'First message to a new lead, right after they enquire (website form, Instagram, call).',
    body: `Hi {{1}}, thank you for reaching out to Travelzada! 💛

We've received your request for a {{2}} trip to {{3}}. Your personal travel designer will share a free, day-by-day itinerary within {{4}}.

Reply here anytime with your dates, budget or special wishes.`,
    variables: [
      NAME(1),
      { index: 2, label: 'Type of trip', help: 'One or two words: honeymoon, anniversary, family, friends…', example: 'honeymoon', source: 'trip_type', maxLength: 30 },
      DEST(3),
      { index: 4, label: 'When they get the itinerary', help: 'How soon you will share the plan, e.g. 2 hours, 24 hours, today evening.', example: '2 hours', maxLength: 30 },
    ],
    buttons: [qr('Share my dates'), qr('Call me back')],
    firstContactRank: 1,
  }),
  tpl({
    name: 'tz_enquiry_missed_call',
    title: 'Tried calling you',
    category: 'UTILITY',
    stage: 'first_contact',
    purpose: 'Tell the customer you called and ask when to talk.',
    whenToUse: 'You called the lead and they did not pick up. Also good to restart a quiet chat.',
    body: `Hi {{1}}, this is {{2}} from Travelzada. I tried calling you about your {{3}} trip but couldn't get through.

When would be a good time to talk? You can also simply reply here.`,
    variables: [
      NAME(1),
      { index: 2, label: 'Your first name', help: 'The name the customer should know you by.', example: 'Ananya', source: 'agent_name', maxLength: 30 },
      DEST(3, 'The destination (or trip) they asked about.'),
    ],
    buttons: [qr('Call me now'), qr('Call me later'), qr('Chat on WhatsApp')],
    firstContactRank: 2,
    reopenRank: 2,
  }),
  tpl({
    name: 'tz_itinerary_ready',
    title: 'Itinerary ready (with link)',
    category: 'UTILITY',
    stage: 'lead',
    purpose: 'Share the personalised itinerary link.',
    whenToUse: 'The day-by-day plan is ready on the website (shared-plan link).',
    header: { type: 'TEXT', text: 'Your itinerary is ready ✨' },
    body: `Hi {{1}}, your personalised {{2}} itinerary is ready!

It covers all {{3}} nights: hand-picked hotels, transfers, experiences and romantic extras, with every cost itemised.

Take a look and tell us what you'd like to change. Edits are free and unlimited.`,
    variables: [
      NAME(1),
      { index: 2, label: 'Trip name', help: 'Destination + type of trip, e.g. Bali honeymoon.', example: 'Bali honeymoon', source: 'package_name', maxLength: 40 },
      { index: 3, label: 'Number of nights', help: 'Just the number, e.g. 6.', example: '6', source: 'nights', maxLength: 3 },
    ],
    buttons: [dynLink('View itinerary', 'https://www.travelzada.com/shared-plan/', SHARED_PLAN_VAR('Itinerary')), qr('Customise it')],
    firstContactRank: 3,
  }),
  tpl({
    name: 'tz_lead_followup_day5',
    title: 'Follow-up: still dreaming?',
    category: 'MARKETING',
    stage: 'lead',
    purpose: 'Gentle follow-up to a lead who went quiet.',
    whenToUse: 'About 5 days after the enquiry, when the customer has not replied.',
    body: `Hi {{1}}, still dreaming about {{2}}? 🌅

Our travel designers have put together a few ideas couples loved this season: quiet stays, private experiences and easy flights.

Would you like us to send them over?`,
    variables: [NAME(1), DEST(2)],
    buttons: [qr('Yes, send ideas'), qr('Change destination'), qr('Stop messages')],
    reopenRank: 1,
  }),
  tpl({
    name: 'tz_lead_last_nudge',
    title: 'Last nudge: keep the trip open?',
    category: 'MARKETING',
    stage: 'lead',
    purpose: 'Final polite check before closing an unresponsive lead.',
    whenToUse: 'Around day 10 with no reply. After this, stop messaging.',
    body: `Hi {{1}}, we don't want to keep messaging if your plans have changed.

Should we keep your {{2}} trip open? If you're ready later, just say hello here and we'll pick up where we left off.`,
    variables: [NAME(1), DEST(2)],
    buttons: [qr('Yes, keep it open'), qr('Plans postponed'), qr('Stop messages')],
  }),

  /* ---------------- B. Quotations ---------------- */
  tpl({
    name: 'tz_quote_sent',
    title: 'Quote sent (with PDF)',
    category: 'UTILITY',
    stage: 'quote',
    purpose: 'Send the quotation PDF with price and hold date.',
    whenToUse: 'Right after you make a quote in the admin. Attach the quote PDF link.',
    header: { type: 'DOCUMENT', hint: 'Quote PDF link (must be a public https link)', sampleFilename: 'Travelzada-Quote.pdf' },
    body: `Hi {{1}}, here is your quotation for {{2}} ({{3}}).

Total for two: {{4}}, fully itemised, with no hidden charges. These prices are held until {{5}}.

Tell us if you'd like to change hotels, nights or add a surprise.`,
    variables: [
      NAME(1),
      { index: 2, label: 'Package name', help: 'The name of the trip on the quote.', example: 'Kashmir Honeymoon', source: 'package_name', maxLength: 50 },
      { index: 3, label: 'Duration', help: 'Nights / days, e.g. 6N/7D.', example: '6N/7D', maxLength: 15 },
      AMOUNT(4, 'Total price for two', 'The final quoted total.', '₹76,000'),
      { index: 5, label: 'Price held until', help: 'Last date these prices are guaranteed.', example: '15 Nov 2026', maxLength: 25 },
    ],
    buttons: [qr('Looks good, book it'), qr('Request changes'), qr('Call me back')],
  }),
  tpl({
    name: 'tz_quote_revised',
    title: 'Revised quote (with PDF)',
    category: 'UTILITY',
    stage: 'quote',
    purpose: 'Send an updated quote after the customer asked for changes.',
    whenToUse: 'The customer asked for changes and you made a new quote PDF.',
    header: { type: 'DOCUMENT', hint: 'Revised quote PDF link (must be a public https link)', sampleFilename: 'Travelzada-Quote-v2.pdf' },
    body: `Hi {{1}}, we've updated your {{2}} quotation with the changes you asked for: {{3}}.

New total for two: {{4}}. The revised plan is attached.`,
    variables: [
      NAME(1),
      DEST(2, 'Destination or package name.'),
      { index: 3, label: 'What changed', help: 'Short, one line, e.g. upgraded to a private pool villa.', example: 'upgraded to a private pool villa', maxLength: 120 },
      AMOUNT(4, 'New total for two', 'The new quoted total.', '₹1,12,000'),
    ],
    buttons: [qr('Confirm booking'), qr('More changes')],
  }),
  tpl({
    name: 'tz_quote_expiring',
    title: 'Quote prices expiring',
    category: 'UTILITY',
    stage: 'quote',
    purpose: 'Remind the customer that quoted prices are held only until a date.',
    whenToUse: 'One day before the price hold ends.',
    body: `Hi {{1}}, a quick reminder that the prices in your {{2}} quotation are held until {{3}}.

After that, hotel and flight rates may change. Reply here if you have any questions.`,
    variables: [
      NAME(1),
      DEST(2, 'Destination or package name of the quote.'),
      { index: 3, label: 'Price held until', help: 'Date and time, e.g. tomorrow, 6 PM.', example: 'tomorrow, 6 PM', maxLength: 30 },
    ],
    buttons: [qr('Confirm now'), qr('Talk to my planner')],
  }),
  tpl({
    name: 'tz_hotel_options',
    title: 'Hotel options (with photo)',
    category: 'MARKETING',
    stage: 'quote',
    purpose: 'Show a photo of a stay and link to all stays in the destination.',
    whenToUse: 'The customer wants to choose a hotel before the quote.',
    header: { type: 'IMAGE', hint: 'Hotel photo link (must be a public https link, JPG or PNG)' },
    body: `Hi {{1}}, here are our favourite couple-friendly stays in {{2}} 🏝️

Each one is chosen for privacy, views and romantic touches. Pick a favourite and we'll build your plan around it.`,
    variables: [NAME(1), DEST(2)],
    buttons: [dynLink('See all stays', 'https://www.travelzada.com/destinations/', DEST_SLUG_VAR), qr('Stop promotions')],
  }),

  /* ---------------- C. Booking & payments ---------------- */
  tpl({
    name: 'tz_booking_confirmed',
    title: 'Booking confirmed (with PDF)',
    category: 'UTILITY',
    stage: 'booking',
    purpose: 'Confirm the booking, with the confirmation PDF and booking link.',
    whenToUse: 'The booking is confirmed and the first payment is in.',
    header: { type: 'DOCUMENT', hint: 'Booking confirmation PDF link (must be a public https link)', sampleFilename: 'Booking-Confirmation.pdf' },
    body: `Hi {{1}}, your {{2}} is confirmed! 🎉

Booking ID: {{3}}
Travel dates: {{4}}

Your trip coordinator {{5}} will be your single point of contact from now until you're home. Your confirmation is attached.`,
    variables: [
      NAME(1),
      { index: 2, label: 'Trip name', help: 'e.g. Bali honeymoon.', example: 'Bali honeymoon', source: 'package_name', maxLength: 40 },
      BOOKING_ID(3),
      { index: 4, label: 'Travel dates', help: 'Start–end dates, e.g. 12–18 Feb 2027.', example: '12–18 Feb 2027', source: 'travel_date', maxLength: 30 },
      COORDINATOR(5),
    ],
    buttons: [dynLink('View booking', 'https://www.travelzada.com/shared-plan/', SHARED_PLAN_VAR('Booking'))],
  }),
  tpl({
    name: 'tz_payment_received',
    title: 'Payment received',
    category: 'UTILITY',
    stage: 'payment',
    purpose: 'Thank the customer for a payment and show the balance due.',
    whenToUse: 'Any payment has been received.',
    body: `Hi {{1}}, we've received your payment of {{2}} for booking {{3}}. Thank you! 💛

Balance due: {{4}}, by {{5}}.

Your receipt will follow by email.`,
    variables: [
      NAME(1),
      AMOUNT(2, 'Amount received', 'What they just paid.', '₹40,000'),
      BOOKING_ID(3),
      AMOUNT(4, 'Balance still due', 'What is left to pay (₹0 if fully paid).', '₹36,000'),
      { index: 5, label: 'Balance due date', help: 'When the balance must be paid.', example: '20 Jan 2027', maxLength: 25 },
    ],
    buttons: [],
  }),
  tpl({
    name: 'tz_payment_reminder',
    title: 'Payment reminder',
    category: 'UTILITY',
    stage: 'payment',
    purpose: 'Gently remind the customer about a balance that is due.',
    whenToUse: '3 days before a balance is due.',
    body: `Hi {{1}}, a gentle reminder that the balance of {{2}} for your {{3}} trip (booking {{4}}) is due on {{5}}.

Paying on time keeps your hotel and flight bookings secure.`,
    variables: [
      NAME(1),
      AMOUNT(2, 'Balance due', 'The amount still to pay.', '₹36,000'),
      DEST(3),
      BOOKING_ID(4),
      { index: 5, label: 'Due date', help: 'When the balance must be paid.', example: '20 Jan 2027', maxLength: 25 },
    ],
    buttons: [qr('Share payment details'), qr("I've already paid")],
  }),
  tpl({
    name: 'tz_payment_link',
    title: 'Payment link',
    category: 'UTILITY',
    stage: 'payment',
    purpose: 'Send a secure payment link.',
    whenToUse: 'You created a payment link for the customer.',
    body: `Hi {{1}}, here is your secure payment link for booking {{2}}.

Amount: {{3}}
Link valid until: {{4}}

Tap the button below to pay.`,
    variables: [
      NAME(1),
      BOOKING_ID(2),
      AMOUNT(3, 'Amount to pay', 'The amount on the payment link.', '₹36,000'),
      { index: 4, label: 'Link valid until', help: 'Expiry date of the payment link.', example: '20 Jan 2027', maxLength: 25 },
    ],
    buttons: [
      dynLink('Pay securely', 'https://rzp.io/rzp/', {
        label: 'Payment link code',
        help: 'The code at the end of the payment link.',
        example: 'a1b2c3',
      }),
    ],
    note: 'The payment gateway for this button was never decided, so this template may not exist in GetGabs.',
  }),
  tpl({
    name: 'tz_booking_cancelled',
    title: 'Booking cancelled',
    category: 'UTILITY',
    stage: 'booking',
    purpose: 'Confirm a cancellation and the refund amount and timing.',
    whenToUse: 'The customer asked to cancel and the cancellation is done.',
    body: `Hi {{1}}, as requested, booking {{2}} for {{3}} has been cancelled.

A refund of {{4}} will be processed to your original payment method within {{5}}. We hope to plan something special for you two again.`,
    variables: [
      NAME(1),
      BOOKING_ID(2),
      DEST(3),
      AMOUNT(4, 'Refund amount', 'How much will be refunded.', '₹30,000'),
      { index: 5, label: 'Refund time', help: 'How long the refund takes, e.g. 7 working days.', example: '7 working days', maxLength: 30 },
    ],
    buttons: [],
  }),
  tpl({
    name: 'tz_refund_processed',
    title: 'Refund processed',
    category: 'UTILITY',
    stage: 'payment',
    purpose: 'Tell the customer their refund has been sent.',
    whenToUse: 'The refund was processed today.',
    body: `Hi {{1}}, your refund of {{2}} for booking {{3}} has been processed today.

It should reflect in your account within {{4}}. Reply here if you don't see it by then.`,
    variables: [
      NAME(1),
      AMOUNT(2, 'Refund amount', 'How much was refunded.', '₹30,000'),
      BOOKING_ID(3),
      { index: 4, label: 'Time to reflect', help: 'How long until it shows in their account.', example: '5–7 working days', maxLength: 30 },
    ],
    buttons: [],
  }),

  /* ---------------- D. Before the trip ---------------- */
  tpl({
    name: 'tz_documents_needed',
    title: 'Documents needed',
    category: 'UTILITY',
    stage: 'pre_trip',
    purpose: 'Ask for passports / IDs needed to confirm hotels and transfers.',
    whenToUse: 'You need documents from the customer to finish bookings.',
    body: `Hi {{1}}, to confirm your {{2}} hotels and transfers we need: {{3}}.

Please share them here by {{4}}. Everything is stored securely and used only for your bookings.`,
    variables: [
      NAME(1),
      DEST(2),
      { index: 3, label: 'Documents needed', help: 'One line, e.g. passport copies of both travellers.', example: 'passport copies of both travellers', maxLength: 120 },
      { index: 4, label: 'Send by (date)', help: 'Deadline for the documents.', example: '10 Jan 2027', maxLength: 25 },
    ],
    buttons: [qr('Uploading now'), qr('Need help')],
  }),
  tpl({
    name: 'tz_visa_update',
    title: 'Visa update',
    category: 'UTILITY',
    stage: 'pre_trip',
    purpose: 'Share a status update on the visa.',
    whenToUse: 'Any change in visa status (applied, approved, more documents needed).',
    body: `Hi {{1}}, an update on your {{2}} visa: {{3}}.

Reply here if you have any questions.`,
    variables: [
      NAME(1),
      DEST(2, 'The country of the visa.'),
      { index: 3, label: 'The update', help: 'One line, e.g. both e-visas have been approved and emailed to you.', example: 'both e-visas have been approved and emailed to you', maxLength: 160 },
    ],
    buttons: [],
  }),
  tpl({
    name: 'tz_travel_kit_ready',
    title: 'Travel kit ready (with PDF)',
    category: 'UTILITY',
    stage: 'pre_trip',
    purpose: 'Send vouchers + final itinerary as one PDF.',
    whenToUse: 'Hotel vouchers and the final day-by-day plan are ready.',
    header: { type: 'DOCUMENT', hint: 'Travel kit PDF link (must be a public https link)', sampleFilename: 'Travel-Kit.pdf' },
    body: `Hi {{1}}, your travel kit for {{2}} is ready ✈️

Attached: hotel vouchers, transfer details and your day-by-day itinerary. Your trip starts on {{3}}.

Save this chat. Your coordinator is reachable here 24/7.`,
    variables: [
      NAME(1),
      DEST(2),
      { index: 3, label: 'Trip start date', help: 'The first day of the trip.', example: '12 Feb 2027', source: 'travel_date', maxLength: 25 },
    ],
    buttons: [],
  }),
  tpl({
    name: 'tz_trip_reminder_7d',
    title: '7 days to go',
    category: 'UTILITY',
    stage: 'pre_trip',
    purpose: 'Countdown reminder with a packing checklist and weather.',
    whenToUse: '7 days before the trip starts.',
    header: { type: 'TEXT', text: '7 days to go 🌴' },
    body: `Hi {{1}}, your {{2}} escape begins in 7 days!

Quick checklist: {{3}}.

Expected weather: {{4}}. Reply here if you need anything before you fly.`,
    variables: [
      NAME(1),
      DEST(2),
      { index: 3, label: 'Checklist', help: 'Comma-separated, one line, e.g. passports, printed vouchers, forex card.', example: 'passports, printed vouchers, forex card, sunscreen', maxLength: 160 },
      { index: 4, label: 'Expected weather', help: 'e.g. 29°C with evening showers.', example: '29°C with evening showers', maxLength: 60 },
    ],
    buttons: [qr('All set'), qr('I have a question')],
  }),
  tpl({
    name: 'tz_flight_reminder_24h',
    title: 'Flight reminder (24 h)',
    category: 'UTILITY',
    stage: 'pre_trip',
    purpose: 'Remind the customer of their flight time.',
    whenToUse: 'The day before the flight.',
    body: `Hi {{1}}, your flight {{2}} departs on {{3}} at {{4}}.

Please reach the airport at least {{5}} before departure. Have a beautiful journey! ✈️`,
    variables: [
      NAME(1),
      { index: 2, label: 'Flight number', help: 'Airline code + number, e.g. 6E 1603.', example: '6E 1603', maxLength: 15 },
      { index: 3, label: 'Departure date', help: 'e.g. 12 Feb.', example: '12 Feb', maxLength: 20 },
      { index: 4, label: 'Departure time', help: 'e.g. 10:40 AM.', example: '10:40 AM', maxLength: 15 },
      { index: 5, label: 'Reach airport how early', help: 'e.g. 3 hours (international) or 2 hours (domestic).', example: '3 hours', maxLength: 15 },
    ],
    buttons: [],
  }),
  tpl({
    name: 'tz_pickup_details',
    title: 'Pickup / driver details',
    category: 'UTILITY',
    stage: 'pre_trip',
    purpose: "Share the driver's name, phone and vehicle for the airport pickup.",
    whenToUse: 'Before arrival, once the driver is assigned.',
    body: `Hi {{1}}, your pickup in {{2}} is all set.

Driver: {{3}}
Phone: {{4}}
Vehicle: {{5}}

They will meet you at {{6}} with a Travelzada name board.`,
    variables: [
      NAME(1),
      { index: 2, label: 'Pickup city', help: 'Where the pickup happens.', example: 'Bali', source: 'destination', maxLength: 40 },
      { index: 3, label: "Driver's name", help: 'As the driver will introduce himself.', example: 'Made', maxLength: 30 },
      { index: 4, label: "Driver's phone", help: 'With country code.', example: '+62 812 3456 7890', maxLength: 20 },
      { index: 5, label: 'Vehicle', help: 'Colour, model and number plate.', example: 'White Toyota Innova, DK 1234 AB', maxLength: 60 },
      { index: 6, label: 'Meeting point', help: 'e.g. arrivals gate 2.', example: 'arrivals gate 2', maxLength: 60 },
    ],
    buttons: [],
  }),

  /* ---------------- E. During the trip ---------------- */
  tpl({
    name: 'tz_checkin_welcome',
    title: 'Welcome / checked in',
    category: 'UTILITY',
    stage: 'on_trip',
    purpose: 'Welcome the couple when they check in.',
    whenToUse: 'The day they arrive and check in.',
    body: `Welcome to {{1}}, {{2}}! 💛

You're checked in at {{3}}. Your coordinator {{4}} is available 24/7 right here on WhatsApp.

Enjoy every moment together.`,
    variables: [
      DEST(1, 'Where they just arrived. (Note: the destination comes first in this message.)'),
      { ...NAME(2) },
      { index: 3, label: 'Hotel name', help: 'Where they checked in.', example: 'The Kayon Jungle Resort', maxLength: 60 },
      COORDINATOR(4),
    ],
    buttons: [qr('All good'), qr('Need help')],
  }),
  tpl({
    name: 'tz_daily_plan',
    title: "Today's plan",
    category: 'UTILITY',
    stage: 'on_trip',
    purpose: "Morning message with the day's plan and pickup time.",
    whenToUse: 'Each morning of the trip.',
    body: `Good morning {{1}}! ☀️ Here's your plan for today in {{2}}:

{{3}}

Pickup at {{4}} from your hotel lobby. Have a lovely day!`,
    variables: [
      NAME(1),
      { index: 2, label: 'Place today', help: 'Town or area they are in today.', example: 'Ubud', maxLength: 40 },
      { index: 3, label: "Today's plan (one line)", help: 'Comma-separated, ONE line — WhatsApp does not allow line breaks here.', example: "Tegallalang rice terraces, lunch with a view, couples' spa at 4 PM", maxLength: 250 },
      { index: 4, label: 'Pickup time', help: 'e.g. 9:00 AM.', example: '9:00 AM', maxLength: 15 },
    ],
    buttons: [],
  }),
  tpl({
    name: 'tz_surprise_confirmed',
    title: 'Surprise confirmed (secret)',
    category: 'UTILITY',
    stage: 'on_trip',
    purpose: 'Confirm a surprise (proposal, decor, cake) to the person who booked it.',
    whenToUse: 'Send only to the person who planned the surprise.',
    body: `Hi {{1}}, everything is set for {{2}} on {{3}} at {{4}}. 🤫

We'll keep it a secret. Your coordinator will message you 1 hour before with final details.`,
    variables: [
      { ...NAME(1), label: 'First name of the person who booked the surprise', example: 'Rahul' },
      { index: 2, label: 'The surprise', help: 'e.g. the beach proposal dinner.', example: 'the beach proposal dinner', maxLength: 80 },
      { index: 3, label: 'Surprise date', help: 'e.g. 14 Feb.', example: '14 Feb', maxLength: 20 },
      { index: 4, label: 'Surprise time', help: 'e.g. 7:30 PM.', example: '7:30 PM', maxLength: 15 },
    ],
    buttons: [qr('Perfect, thank you'), qr('Change something')],
  }),
  tpl({
    name: 'tz_trip_checkin',
    title: 'How is the trip going?',
    category: 'UTILITY',
    stage: 'on_trip',
    purpose: 'Quick check that everything is fine during the trip.',
    whenToUse: 'Day 2 of the trip.',
    body: `Hi {{1}}, how is {{2}} treating you two?

If anything isn't perfect, from the room to a transfer, tell us and we'll fix it right away.`,
    variables: [NAME(1), DEST(2)],
    buttons: [qr('All perfect 💛'), qr('Need help')],
  }),

  /* ---------------- F. After the trip ---------------- */
  tpl({
    name: 'tz_welcome_home',
    title: 'Welcome home + rating',
    category: 'UTILITY',
    stage: 'post_trip',
    purpose: 'Welcome them back and ask for a quick rating.',
    whenToUse: 'The day after they return.',
    body: `Welcome home, {{1}}! We hope {{2}} was everything you dreamed of.

How would you rate your trip?`,
    variables: [NAME(1), DEST(2)],
    buttons: [qr('Loved it 😍'), qr('It was good'), qr('Could be better')],
  }),
  tpl({
    name: 'tz_review_request',
    title: 'Ask for a review',
    category: 'MARKETING',
    stage: 'post_trip',
    purpose: 'Ask a happy customer to write a review.',
    whenToUse: 'After a good rating (e.g. they tapped "Loved it").',
    body: `Hi {{1}}, could you take one minute to share your {{2}} story?

Your review helps other couples plan their special trip with confidence 💛`,
    variables: [
      NAME(1),
      { index: 2, label: 'Trip name', help: 'e.g. Bali honeymoon.', example: 'Bali honeymoon', source: 'package_name', maxLength: 40 },
    ],
    buttons: [link('Write a review', 'https://www.travelzada.com/reviews'), qr('Stop promotions')],
  }),
  tpl({
    name: 'tz_photo_request',
    title: 'Ask for a trip photo',
    category: 'MARKETING',
    stage: 'post_trip',
    purpose: 'Ask for a favourite photo to feature (with permission).',
    whenToUse: 'A few days after a happy trip.',
    body: `Hi {{1}}, we'd love to see your favourite photo from {{2}}! 📸

Share one here and, with your permission, we may feature your story on our page.`,
    variables: [NAME(1), DEST(2)],
    buttons: [qr('Sending one'), qr('Prefer not'), qr('Stop promotions')],
  }),
  tpl({
    name: 'tz_referral',
    title: 'Refer a couple',
    category: 'MARKETING',
    stage: 'post_trip',
    purpose: 'Invite a past customer to refer friends for a discount.',
    whenToUse: 'Only while a referral offer is really running.',
    body: `Hi {{1}}, know a couple planning a honeymoon or anniversary?

Introduce them to Travelzada and you both get {{2}} off your next trip together.`,
    variables: [NAME(1), AMOUNT(2, 'Referral discount', 'The discount each side gets.', '₹2,000')],
    buttons: [qr('Refer a couple'), qr('Stop promotions')],
  }),

  /* ---------------- G. Occasions & campaigns ---------------- */
  tpl({
    name: 'tz_anniversary_reminder',
    title: 'Anniversary coming up',
    category: 'MARKETING',
    stage: 'campaign',
    purpose: 'Suggest an anniversary trip ahead of the date.',
    whenToUse: 'A few weeks before a known anniversary date.',
    header: { type: 'IMAGE', hint: 'Romantic photo link (must be a public https link, JPG or PNG)' },
    body: `Hi {{1}}, your anniversary is coming up on {{2}} 💛

Shall we plan something unforgettable? Think {{3}}.

Our travel designers will create a free plan for you.`,
    variables: [
      NAME(1),
      { index: 2, label: 'Anniversary date', help: 'Day and month, e.g. 18 December.', example: '18 December', maxLength: 25 },
      { index: 3, label: 'Idea to suggest', help: 'One line, e.g. a private dinner on a Maldives sandbank.', example: 'a private dinner on a Maldives sandbank', maxLength: 100 },
    ],
    buttons: [qr('Show me ideas'), qr('Not this year'), qr('Stop promotions')],
  }),
  tpl({
    name: 'tz_honeymoon_campaign',
    title: 'Honeymoon campaign (photo)',
    category: 'MARKETING',
    stage: 'campaign',
    purpose: 'Promote free personalised honeymoon planning.',
    whenToUse: 'Campaigns to people who are planning a honeymoon.',
    header: { type: 'IMAGE', hint: 'Honeymoon photo link (must be a public https link, JPG or PNG)' },
    body: `Hi {{1}}, planning your honeymoon? ✨

Our travel designers will create a free, personalised itinerary for {{2}}, with no payment until you love the plan.

Tell us your dates and we'll take care of the rest.`,
    variables: [NAME(1), DEST(2)],
    buttons: [link('Start planning', 'https://www.travelzada.com/tailored-travel'), qr('Plan our honeymoon'), qr('Stop promotions')],
  }),
  tpl({
    name: 'tz_seasonal_offer',
    title: 'Seasonal offer (photo)',
    category: 'MARKETING',
    stage: 'campaign',
    purpose: 'Promote a seasonal package price for a destination.',
    whenToUse: 'Only while the offer and price are real.',
    header: { type: 'IMAGE', hint: 'Destination photo link (must be a public https link, JPG or PNG)' },
    body: `Hi {{1}}, {{2}} season is here! 🌸

Couples' packages to {{3}} start from {{4}} for two, and dates in {{5}} are filling fast.

Want us to check availability for you?`,
    variables: [
      NAME(1),
      { index: 2, label: 'Season', help: 'e.g. Winter, Summer, Cherry blossom.', example: 'Winter', maxLength: 25 },
      DEST(3),
      AMOUNT(4, 'Starting price for two', 'The lowest real package price.', '₹42,000'),
      { index: 5, label: 'Busy month', help: 'The month that is filling up, e.g. December.', example: 'December', maxLength: 20 },
    ],
    buttons: [dynLink('Explore packages', 'https://www.travelzada.com/destinations/', { ...DEST_SLUG_VAR, example: 'kashmir' }), qr('Check availability'), qr('Stop promotions')],
  }),
  tpl({
    name: 'tz_valentines_campaign',
    title: "Valentine's campaign (photo)",
    category: 'MARKETING',
    stage: 'campaign',
    purpose: "Promote Valentine's Day surprises.",
    whenToUse: 'Mid-January.',
    header: { type: 'IMAGE', hint: "Valentine's photo link (must be a public https link, JPG or PNG)" },
    body: `Hi {{1}}, Valentine's Day is on 14 February 💘

From a candlelit dinner by the sea to a surprise weekend away, let us plan a moment {{2}} will never forget.`,
    variables: [
      NAME(1),
      { index: 2, label: 'Who the surprise is for', help: 'Usually "your partner", or their partner\'s name.', example: 'your partner', maxLength: 30 },
    ],
    buttons: [qr('Plan a surprise'), qr('Stop promotions')],
  }),
  tpl({
    name: 'tz_new_destination',
    title: 'New destination launch (photo)',
    category: 'MARKETING',
    stage: 'campaign',
    purpose: 'Announce a newly launched destination.',
    whenToUse: 'When a new destination goes live on the website.',
    header: { type: 'IMAGE', hint: 'Destination photo link (must be a public https link, JPG or PNG)' },
    body: `Hi {{1}}, just launched: {{2}} for couples 🌍

{{3}}

Tap below to see the packages.`,
    variables: [
      NAME(1),
      DEST(2, 'The new destination.'),
      { index: 3, label: 'Highlights (one line)', help: 'One sentence, no line breaks.', example: 'Lantern-lit Hoi An, Ha Long Bay cruises and quiet beach villas in Phu Quoc.', maxLength: 200 },
    ],
    buttons: [dynLink('Explore packages', 'https://www.travelzada.com/destinations/', { ...DEST_SLUG_VAR, example: 'vietnam' }), qr('Stop promotions')],
  }),
  tpl({
    name: 'tz_destination_carousel',
    title: 'Destination carousel (3 cards)',
    category: 'MARKETING',
    stage: 'campaign',
    purpose: 'Swipeable cards: Maldives, Bali, Kashmir with prices.',
    whenToUse: 'Campaigns. Send it from GetGabs (the admin cannot send carousels).',
    body: `Hi {{1}}, here are three escapes couples are loving right now 💛`,
    footer: null,
    variables: [NAME(1)],
    buttons: [],
    notSendableReason: 'Carousel templates can only be sent from GetGabs.',
    carouselCards: [
      { imageHint: 'Maldives villa', body: 'Maldives · overwater villas from ₹1,45,000 for two', buttons: [qr('Tell me more'), link('View', 'https://www.travelzada.com/destinations/maldives')] },
      { imageHint: 'Bali temple', body: 'Bali · jungle pool villas from ₹78,000 for two', buttons: [qr('Tell me more'), link('View', 'https://www.travelzada.com/destinations/bali')] },
      { imageHint: 'Kashmir houseboat', body: 'Kashmir · houseboats and snow from ₹52,000 for two', buttons: [qr('Tell me more'), link('View', 'https://www.travelzada.com/destinations/kashmir')] },
    ],
  }),
  tpl({
    name: 'tz_reengage_90d',
    title: "It's been a while",
    category: 'MARKETING',
    stage: 'campaign',
    purpose: 'Re-engage a past customer or old lead.',
    whenToUse: 'After about 90 days of silence.',
    body: `Hi {{1}}, it's been a while! 💛

Planning your next escape together? Tell us where your hearts are set and we'll design it for free.`,
    variables: [NAME(1)],
    buttons: [qr('Plan a new trip'), qr('Stop promotions')],
    reopenRank: 3,
  }),

  /* ---------------- Vouchers (approved in GetGabs, wording not in the guide) ---------------- */
  tpl({
    name: 'tz_voucher_code',
    title: 'Gift voucher code',
    category: 'MARKETING',
    stage: 'campaign',
    purpose: 'Sends a gift-voucher code with its value and terms.',
    whenToUse: 'Sent automatically when someone claims a QR gift voucher. Rarely sent by hand.',
    body: '',
    wordingKnown: false,
    footer: null,
    variables: [
      NAME(1),
      { index: 2, label: 'Voucher code', help: 'The personal code, e.g. TZI-7KQ4-M2XP.', example: 'TZI-7KQ4-M2XP', maxLength: 20 },
      AMOUNT(3, 'Voucher value', 'Discount amount.', '₹5,000'),
      { index: 4, label: 'Trip type', help: 'domestic or international.', example: 'international', maxLength: 20 },
      AMOUNT(5, 'Minimum spend', 'Minimum booking value to use the voucher.', '₹1,00,000'),
      { index: 6, label: 'Book by (date)', help: 'Last date to book with this voucher.', example: '29 Jan 2027', maxLength: 25 },
    ],
    buttons: [
      {
        type: 'URL',
        text: 'Open voucher',
        url: 'https://www.travelzada.com/voucher/code/{{1}}',
        urlHasVariable: true,
        urlVariable: { label: 'Voucher code (for the link)', help: 'The same voucher code as above.', example: 'TZI-7KQ4-M2XP' },
      },
    ],
    note: 'Wording unknown — check the template in GetGabs. Used by the voucher system automatically.',
  }),
  tpl({
    name: 'tz_voucher_image',
    title: 'Gift voucher (with picture)',
    category: 'MARKETING',
    stage: 'campaign',
    purpose: 'Same as the voucher code, with a picture of the personal voucher.',
    whenToUse: 'Sent automatically when someone claims a QR gift voucher. Rarely sent by hand.',
    header: { type: 'IMAGE', hint: 'Voucher picture link (must be a public https link)' },
    body: '',
    wordingKnown: false,
    footer: null,
    variables: [
      NAME(1),
      { index: 2, label: 'Voucher code', help: 'The personal code, e.g. TZI-7KQ4-M2XP.', example: 'TZI-7KQ4-M2XP', maxLength: 20 },
      AMOUNT(3, 'Voucher value', 'Discount amount.', '₹5,000'),
      { index: 4, label: 'Trip type', help: 'domestic or international.', example: 'international', maxLength: 20 },
      AMOUNT(5, 'Minimum spend', 'Minimum booking value to use the voucher.', '₹1,00,000'),
      { index: 6, label: 'Book by (date)', help: 'Last date to book with this voucher.', example: '29 Jan 2027', maxLength: 25 },
    ],
    buttons: [
      {
        type: 'URL',
        text: 'Open voucher',
        url: 'https://www.travelzada.com/voucher/code/{{1}}',
        urlHasVariable: true,
        urlVariable: { label: 'Voucher code (for the link)', help: 'The same voucher code as above.', example: 'TZI-7KQ4-M2XP' },
      },
    ],
    note: 'Wording unknown — check the template in GetGabs. Used by the voucher system automatically.',
  }),

  /* ---------------- H. Internal / partner ---------------- */
  tpl({
    name: 'tz_team_new_lead',
    title: 'New lead alert (team)',
    category: 'UTILITY',
    stage: 'internal',
    purpose: 'Alert to the Travelzada sales team about a new lead.',
    whenToUse: 'Sent to TEAM numbers only, never to customers. Usually automatic.',
    body: `New lead received: {{1}}, phone {{2}}.

Trip: {{3}} to {{4}}
Source: {{5}}

Please contact them within 15 minutes.`,
    variables: [
      { index: 1, label: "Lead's full name", help: 'Name of the new lead.', example: 'Priya Sharma', maxLength: 40 },
      { index: 2, label: "Lead's phone", help: 'With country code.', example: '+91 98765 43210', maxLength: 20 },
      { index: 3, label: 'Type of trip', help: 'e.g. Honeymoon.', example: 'Honeymoon', source: 'trip_type', maxLength: 30 },
      DEST(4),
      { index: 5, label: 'Lead source', help: 'Where the lead came from, e.g. Homepage form.', example: 'Homepage form', maxLength: 40 },
    ],
    buttons: [],
    notSendableReason: 'Team-only alert — never send it to a customer.',
  }),
  tpl({
    name: 'tz_agent_new_enquiry',
    title: 'New enquiry alert (travel agent)',
    category: 'UTILITY',
    stage: 'internal',
    purpose: 'Tells a partner travel agent they have a new enquiry.',
    whenToUse: 'Sent to agents on the agent platform, not to customers. Usually automatic.',
    body: `Hi {{1}}, you have a new enquiry on Travelzada: {{2}} is planning a {{3}} trip to {{4}}.

Reply within 1 hour to keep your response score high.`,
    variables: [
      { index: 1, label: "Agent's first name", help: 'The travel agent receiving the enquiry.', example: 'Rohit', maxLength: 30 },
      { index: 2, label: "Customer's first name", help: 'The customer who enquired.', example: 'Priya', maxLength: 30 },
      { index: 3, label: 'Type of trip', help: 'e.g. honeymoon.', example: 'honeymoon', source: 'trip_type', maxLength: 30 },
      DEST(4),
    ],
    buttons: [link('Open dashboard', 'https://www.travelzada.com/travel-agent-dashboard')],
    notSendableReason: 'Partner-agent alert — never send it to a customer.',
  }),
]

/* ------------------------------------------------------------------------------------------------
 * Lookups
 * ---------------------------------------------------------------------------------------------- */

const BY_NAME = new Map(TEMPLATE_CATALOG.map((t) => [t.name, t]))

export const getCatalogTemplate = (name?: string | null): CatalogTemplate | undefined => (name ? BY_NAME.get(name) : undefined)

/** The best 2–3 templates for the first message to a brand-new customer */
export const FIRST_CONTACT_TEMPLATES = TEMPLATE_CATALOG.filter((t) => t.firstContactRank).sort((a, b) => a.firstContactRank! - b.firstContactRank!)

/** The best 2–3 templates to re-open a conversation whose 24-hour window closed */
export const REOPEN_TEMPLATES = TEMPLATE_CATALOG.filter((t) => t.reopenRank).sort((a, b) => a.reopenRank! - b.reopenRank!)

/** Example values for every variable (and URL button) — used by the Templates page preview */
export function exampleValues(t: CatalogTemplate): Record<number, string> {
  const v: Record<number, string> = {}
  t.variables.forEach((x) => (v[x.index] = x.example))
  ;(t.buttons || []).forEach((b, i) => b.urlVariable && (v[buttonValueKey(i)] = b.urlVariable.example))
  return v
}

/** URL buttons that need an end-of-link value, with their button index */
export const dynamicUrlButtons = (t: CatalogTemplate) =>
  (t.buttons || []).map((b, i) => ({ button: b, index: i })).filter((x) => x.button.type === 'URL' && x.button.urlHasVariable)

/* ------------------------------------------------------------------------------------------------
 * Live reconciliation (GetGabs skeleton is the source of truth for counts / types)
 * ---------------------------------------------------------------------------------------------- */

const HEADER_FROM_LIVE: Record<string, CatalogHeader['type']> = { document: 'DOCUMENT', image: 'IMAGE', video: 'VIDEO' }

/** Turn a "tz_some_name" template name into "Some name" */
export const humanizeTemplateName = (name: string) => {
  const s = name.replace(/^tz_/, '').replace(/_/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : name
}

/**
 * A catalog entry adjusted to what GetGabs actually has. When GetGabs has a template the guide doesn't, a fallback
 * entry is built from its sample values ("wording unknown"). When counts differ, live wins and extra variables get
 * generic titles with the GetGabs sample as the example.
 */
export function reconcileWithLive(entry: CatalogTemplate | undefined, live: GetGabsTemplateSummary): CatalogTemplate {
  const liveHeader = live.headerMedia ? HEADER_FROM_LIVE[live.headerMedia] : undefined
  const base: CatalogTemplate =
    entry ||
    ({
      name: live.name,
      title: humanizeTemplateName(live.name),
      category: (live.category as TemplateCategory) || 'UTILITY',
      language: live.language || 'en',
      purpose: 'Approved in GetGabs — its wording is not in our template guide.',
      whenToUse: 'Check the template in GetGabs before sending.',
      stage: live.category === 'MARKETING' ? 'campaign' : 'lead',
      body: '',
      variables: [],
      buttons: [],
      wordingKnown: false,
      note: 'Wording unknown — check GetGabs.',
    } as CatalogTemplate)

  const out: CatalogTemplate = { ...base, language: live.language || base.language, category: (live.category as TemplateCategory) || base.category }

  // Header: media type from live; keep a TEXT header from the guide (GetGabs can't see fixed text headers)
  if (liveHeader) out.header = { ...(base.header?.type === liveHeader ? base.header : {}), type: liveHeader, hint: base.header?.hint || `${liveHeader === 'DOCUMENT' ? 'PDF' : liveHeader === 'IMAGE' ? 'Image' : 'Video'} link (must be a public https link)` }
  else if (base.header && base.header.type !== 'TEXT') out.header = undefined

  // Body variables
  const n = live.bodyParams.length
  if (n !== base.variables.length) {
    out.variables = Array.from({ length: n }, (_, i) => {
      const known = base.variables.find((v) => v.index === i + 1)
      return (
        known || {
          index: i + 1,
          label: i === 0 ? "Customer's first name (probably)" : `Value ${i + 1}`,
          help: `GetGabs sample: "${live.bodyParams[i] || '—'}"`,
          example: live.bodyParams[i] || '',
        }
      )
    })
    if (entry) out.note = [base.note, `GetGabs has ${n} values but our guide lists ${base.variables.length} — the wording below may be out of date.`].filter(Boolean).join(' ')
    if (!entry && n && out.variables[0]) out.variables[0] = { ...out.variables[0], source: 'customer_first_name' }
  }

  // Dynamic URL buttons: keep catalog buttons when they match; otherwise synthesise
  const liveUrlIdx = live.buttons.map((b) => b.index)
  const catalogUrl = dynamicUrlButtons(base).map((x) => x.index)
  const sameButtons = liveUrlIdx.length === catalogUrl.length && liveUrlIdx.every((x, i) => x === catalogUrl[i])
  if (!sameButtons) {
    const buttons: CatalogButton[] = [...(base.buttons || [])].map((b) => (b.type === 'URL' && b.urlHasVariable ? { ...b, urlHasVariable: false, urlVariable: undefined } : b))
    live.buttons.forEach((lb) => {
      const v = { label: `Link button ${lb.index + 1} — end of the link`, help: `GetGabs sample: "${lb.sample || '—'}"`, example: lb.sample || '' }
      const existing = buttons[lb.index]
      if (existing && existing.type === 'URL') buttons[lb.index] = { ...existing, urlHasVariable: true, urlVariable: existing.urlVariable || v }
      else buttons[lb.index] = { type: 'URL', text: 'Open link', url: '…/{{1}}', urlHasVariable: true, urlVariable: v }
    })
    out.buttons = Array.from(buttons, (b) => b || qr('…'))
  }

  if (!live.supported) out.notSendableReason = `This template ${live.unsupportedReason || 'is not supported here'}.`
  return out
}
