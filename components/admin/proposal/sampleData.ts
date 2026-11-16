/**
 * Rich sample quotes for the dev-only QA page (/zz-quote-preview). Built through the real buildProposalData
 * pipeline so the preview exercises the same code the builder uses. Not imported by production code paths.
 */
import { buildProposalData } from './buildProposalData'
import { defaultDesign, newOption, newStay } from './design'
import type { ProposalData, ProposalImage } from './types'

const U = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`
const img = (id: string, caption = ''): ProposalImage => ({ url: U(id), caption })
/** Travelzada's own Kashmir photos on ImageKit */
const IK = (name: string) => `https://ik.imagekit.io/tux8wjwgq/Kashmir/${encodeURIComponent(name)}`
const ik = (name: string, caption = ''): ProposalImage => ({ url: IK(name), caption })

/** A fake airline fare screenshot (SVG data URL) — stands in for a pasted flight screenshot */
export function fakeFlightShot(o: { airline: string; flight: string; from: string; to: string; dep: string; arr: string; dur: string; date: string; fare: string }) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="470" viewBox="0 0 900 470">
<rect width="900" height="470" fill="#ffffff"/>
<rect width="900" height="70" fill="#1f2a6b"/>
<text x="32" y="45" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff">${o.airline}</text>
<text x="868" y="45" font-family="Arial, sans-serif" font-size="20" fill="#c9d2ff" text-anchor="end">${o.date}</text>
<text x="32" y="122" font-family="Arial, sans-serif" font-size="20" fill="#6b7280">${o.flight} · Economy · Non-stop</text>
<text x="32" y="210" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#111827">${o.dep}</text>
<text x="32" y="250" font-family="Arial, sans-serif" font-size="24" fill="#374151">${o.from}</text>
<text x="868" y="210" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#111827" text-anchor="end">${o.arr}</text>
<text x="868" y="250" font-family="Arial, sans-serif" font-size="24" fill="#374151" text-anchor="end">${o.to}</text>
<line x1="270" y1="190" x2="630" y2="190" stroke="#9ca3af" stroke-width="2" stroke-dasharray="8 8"/>
<text x="450" y="175" font-family="Arial, sans-serif" font-size="20" fill="#6b7280" text-anchor="middle">${o.dur}</text>
<rect x="32" y="300" width="836" height="1" fill="#e5e7eb"/>
<text x="32" y="355" font-family="Arial, sans-serif" font-size="20" fill="#6b7280">Cabin 7 kg · Check-in 15 kg · Free meal</text>
<text x="32" y="420" font-family="Arial, sans-serif" font-size="22" fill="#16a34a" font-weight="700">Refundable with fee</text>
<text x="868" y="420" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#111827" text-anchor="end">${o.fare}</text>
</svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const QUOTE_DATE = new Date('2026-11-15T16:30:00+05:30')

export function sampleKashmir(): ProposalData {
    const design = defaultDesign()
    const premium = newOption({
        isQuoted: true,
        label: 'Premium · 4-star',
        tier: 'Premium',
        starRating: 4,
        mealSummary: 'Breakfast & dinner daily',
        transfer: 'Private Innova, airport to airport',
        location: 'Srinagar, Gulmarg & Pahalgam',
        description: 'Warm, well-run 4-star hotels in the best spots of each town — plus one night on a heritage houseboat on Dal Lake.',
        chooseIf: 'you want great comfort and the classic Kashmir circuit without paying for big-brand luxury.',
        amenities: ['Lake-view rooms', 'Heated rooms', 'Houseboat night', 'In-house dining', 'Mountain views'],
        images: [
            ik('romantic shikara ride dal lake.png', 'Dal Lake shikara'),
            ik('couple playing with snow in gulmarg.jpg', 'Gulmarg snow'),
            ik('Srinagar.jpg', 'Srinagar'),
            img('1566073771259-6a8506099945', 'The Montreal'),
            img('1582719478250-c89cae4dc85b', 'Your room'),
            ik('gandola ride gulmarg kashmir.jpg', 'The gondola'),
        ],
        included: ['Daily breakfast & dinner', 'All transfers & sightseeing by private car', 'Shikara ride on Dal Lake', 'Welcome kahwa on arrival'],
        hotels: [
            newStay({ city: 'Srinagar', nights: 1, hotelName: 'The Montreal Srinagar', roomType: 'Deluxe Lake View Room', mealPlan: 'Breakfast & dinner', sizeSqm: '32', bullets: ['Dal Lake views from the balcony', 'Walk to the Boulevard'], images: [img('1590490360182-c33d57733427')] }),
            newStay({ city: 'Gulmarg', nights: 1, hotelName: 'Hotel Highlands Park', roomType: 'Heritage Cottage', mealPlan: 'Breakfast & dinner', bullets: ['Wood-panelled cottage with heater', 'Five minutes to the gondola'], images: [img('1611892440504-42a792e24d32')] }),
            newStay({ city: 'Pahalgam', nights: 2, hotelName: 'Hotel Heevan Pahalgam', roomType: 'River View Room', mealPlan: 'Breakfast & dinner' }),
            newStay({ city: 'Srinagar', nights: 1, hotelName: 'Sukoon Houseboat (Deluxe)', roomType: 'Houseboat Suite', mealPlan: 'Breakfast & dinner' }),
        ],
    })
    const luxury = newOption({
        label: 'Luxury · 5-star',
        tier: 'Luxury',
        starRating: 5,
        price: 148000,
        mealSummary: 'Breakfast & dinner daily',
        transfer: 'Private Innova Crysta, airport to airport',
        location: 'Srinagar, Gulmarg & Pahalgam',
        description: 'The very best address in each town: Vivanta on the Zabarwan hills, The Khyber in Gulmarg and Welcomhotel by the Lidder river.',
        chooseIf: 'it is a once-in-a-lifetime trip and you want spa evenings, big rooms and the best views.',
        amenities: ['Indoor heated pool', 'Spa', 'Ski-in views', 'Fine dining', 'Butler on the houseboat'],
        images: [
            ik('luxury gondola ride in gulmarg.png', 'Gulmarg gondola'),
            img('1542314831-068cd1dbfeeb', 'The Khyber'),
            img('1571896349842-33c89424de2d', 'Heated pool'),
            img('1520250497591-112f2f40a3f4', 'Evenings by the fire'),
        ],
        hotels: [
            newStay({ city: 'Srinagar', nights: 1, hotelName: 'Vivanta Dal View', roomType: 'Superior Charm Lake View', mealPlan: 'Breakfast & dinner' }),
            newStay({ city: 'Gulmarg', nights: 1, hotelName: 'The Khyber Himalayan Resort & Spa', roomType: 'Deluxe Mountain View', mealPlan: 'Breakfast & dinner' }),
            newStay({ city: 'Pahalgam', nights: 2, hotelName: 'Welcomhotel Pine N Peak', roomType: 'Premium River View', mealPlan: 'Breakfast & dinner' }),
            newStay({ city: 'Srinagar', nights: 1, hotelName: 'Sukoon Houseboat (Luxury)', roomType: 'Royal Suite', mealPlan: 'Breakfast & dinner' }),
        ],
    })
    design.stayOptions = [premium, luxury]
    design.coverScript = 'for two'
    design.outboundShot = [{ url: fakeFlightShot({ airline: 'IndiGo', flight: '6E 2131', from: 'Delhi (DEL)', to: 'Srinagar (SXR)', dep: '06:10', arr: '07:45', dur: '1h 35m', date: 'Sat, 12 Dec', fare: '₹14,820' }) }]
    design.returnShot = [{ url: fakeFlightShot({ airline: 'Air India', flight: 'AI 826', from: 'Srinagar (SXR)', to: 'Delhi (DEL)', dep: '13:25', arr: '15:05', dur: '1h 40m', date: 'Thu, 17 Dec', fare: '₹12,940' }) }]
    design.chips = ['Flights included', 'Taxes included']
    design.peakLine = 'December is peak season in Kashmir — houseboats and Gulmarg hotels fill up fast.'

    const days = [
        { title: 'Arrive in Srinagar', description: 'Your driver meets you at Srinagar airport with a warm welcome. Check in, rest, then an evening shikara ride on Dal Lake as the lights come on across the water.', location: 'Srinagar', activities: ['Airport pick-up', 'Sunset shikara ride'], images: [ik('shikara ride dal lake.jpg', 'Shikara on Dal Lake')] },
        { title: 'Gardens, then up to Gulmarg', description: 'Morning at the Mughal gardens — Nishat and Shalimar — then a scenic 2-hour drive to Gulmarg through apple orchards and pine forest.', location: 'Gulmarg', activities: ['Mughal gardens', 'Drive to Gulmarg (2 h)'], images: [ik('elegant couple in gulmarg snow.png', 'Gulmarg in winter')] },
        { title: 'Gondola day in Gulmarg', description: 'Ride the Gulmarg Gondola to Kongdoori (phase 1) for snow and big Himalayan views. Afternoon free for sledging or a hot chocolate by the fire.', location: 'Gulmarg', activities: ['Gondola phase 1', 'Snow play'], images: [ik('luxury gulmarg gondola experience.png')] },
        { title: 'Over to Pahalgam', description: 'Drive to Pahalgam (about 4 hours) via the saffron fields of Pampore and the ruins of Avantipur. Evening walk by the Lidder river.', location: 'Pahalgam', activities: ['Saffron fields', 'Avantipur ruins'] },
        { title: 'Aru & Betaab valleys', description: 'A relaxed day exploring Aru valley, Betaab valley and Chandanwari with a local union cab. Pony rides are optional and paid locally.', location: 'Pahalgam', activities: ['Aru valley', 'Betaab valley', 'Chandanwari'] },
        { title: 'Houseboat night & fly home', description: 'Back to Srinagar for a final night on a deluxe houseboat, then an easy morning transfer to the airport for your flight home.', location: 'Srinagar', activities: ['Houseboat stay', 'Airport drop'] },
    ]
    return buildProposalData({
        pkg: {
            id: 'sample', Destination_ID: 'kashmir-premium', Destination_Name: 'Premium Kashmir Honeymoon',
            Duration: '5 Nights / 6 Days', Star_Category: '4★', Meal_Plan: 'Breakfast & dinner',
            Primary_Image_URL: IK('romantic shikara experience on dal lake.png'),
            Gallery_Images: [IK('couple enjoying gulmarg snow romance.png'), IK('luxury gondola ride in gulmarg.png')],
            Highlights: ['Shikara ride on Dal Lake', 'Gulmarg Gondola (phase 1)', 'Aru & Betaab valleys', 'A night on a heritage houseboat', 'Private car, airport to airport'],
            Inclusions: ['Return flights Delhi ⇄ Srinagar (economy)', '5 nights in hand-picked 4-star stays', 'Daily breakfast & dinner', 'Private car for all transfers & sightseeing', 'Shikara ride on Dal Lake', 'All hotel taxes & GST'],
            Exclusions: ['Gondola tickets (₹1,700 per person, phase 1)', 'Pony rides & union cabs in Pahalgam', 'Lunches and personal expenses', 'Travel insurance'],
            Booking_Policies: {
                payment: ['30% to confirm, balance 21 days before travel.'],
                cancellation: ['Free cancellation up to 30 days before travel (flights as per airline rules). 50% charge from 29–15 days; non-refundable within 14 days.'],
                booking: ['Hotel check-in 2 pm, check-out 11 am.'],
            },
        },
        client: { name: 'Mr. Rahul' },
        travelDate: '2026-12-12',
        adults: 2,
        children: 0,
        tripType: 'Honeymoon',
        totalCost: 95000,
        advancePaid: 0,
        days: days.map((d, i) => ({ day: `Day ${i + 1}`, ...d })),
        hotels: [],
        flights: [],
        notes: 'Snowfall can close the Gulmarg gondola for a few hours — we will reshuffle the day if needed.',
        destinationName: 'Kashmir',
        designerName: 'Ananya Sharma',
        quoteRef: 'TZ-261115-Q2KM',
        quoteDate: QUOTE_DATE,
        validDays: 7,
        design,
    })
}

export function sampleMaldives(): ProposalData {
    const design = defaultDesign()
    const meal = 'Full Board Plus'
    const mk = (i: number, p: Partial<ReturnType<typeof newOption>>) => newOption({ mealSummary: meal, ...p, isQuoted: i === 0 })
    design.stayOptions = [
        mk(0, {
            label: 'Le Méridien Maldives Resort & Spa', starRating: 5, location: 'Lhaviyani Atoll', transfer: 'Seaplane · 35 min', priceNote: 'Full Board Plus · 4 nights',
            description: 'A sunny, design-led resort with one of the best house reefs in the Maldives and a superb kids club.',
            chooseIf: 'you want a lively resort with a brilliant kids club and snorkelling straight off the beach.',
            amenities: ['House reef', 'Kids club', 'Infinity pool', 'Spa', 'Overwater dining', 'Water sports centre'],
            images: [
                img('1514282401047-d79a71a590e8', 'The overwater villas'),
                img('1573843981267-be1999ff37cd', 'The lagoon'),
                img('1540541338287-41700207dee6', 'The infinity pool'),
                img('1586375300773-8384e3e4916f', 'Sunset deck'),
                img('1507525428034-b723cf961d3e', 'The beach'),
                img('1582719478250-c89cae4dc85b', 'Your villa'),
            ],
            included: ['Return seaplane transfers', 'Full Board Plus: breakfast, lunch & dinner with selected drinks', 'Kids club access', 'One sunset dolphin cruise', 'Non-motorised water sports'],
            hotels: [
                newStay({ city: 'Lhaviyani Atoll', nights: 3, hotelName: 'Le Méridien Maldives', roomType: 'Beach Villa', mealPlan: meal, sizeSqm: '94', bullets: ['Steps from the sand', 'Outdoor rain shower', 'Room for 2 adults + 2 children'], images: [img('1590490360182-c33d57733427')] }),
                newStay({ city: 'Lhaviyani Atoll', nights: 1, hotelName: 'Le Méridien Maldives', roomType: 'Sunrise Overwater Villa', mealPlan: meal, sizeSqm: '98', bullets: ['Glass floor panel', 'Ladder straight into the lagoon'], images: [img('1573843981267-be1999ff37cd')] }),
            ],
        }),
        mk(1, {
            label: 'Kuramathi Maldives', starRating: 4, location: 'Rasdhoo Atoll', transfer: 'Speedboat · 75 min', price: 389500, priceNote: 'Full Board Plus · 4 nights',
            description: 'A big, easy-going island with three long beaches, lots of restaurants and great value for families.',
            chooseIf: 'you want great value and lots of space for the kids to roam.',
            amenities: ['Three beaches', 'Kids club', 'Several restaurants'],
            images: [img('1512100356356-de1b84283e18', 'The island'), img('1507525428034-b723cf961d3e', 'Long beaches'), img('1571896349842-33c89424de2d', 'The pool')],
            hotels: [newStay({ city: 'Rasdhoo Atoll', nights: 4, hotelName: 'Kuramathi Maldives', roomType: 'Beach Villa with Pool', mealPlan: meal })],
        }),
        mk(2, {
            label: 'Sun Siyam Iru Fushi', starRating: 5, location: 'Noonu Atoll', transfer: 'Seaplane · 45 min', price: 545200, priceNote: 'Full Board Plus · 4 nights',
            description: 'Huge villas, a famous spa and some of the best food in the north of the Maldives.',
            chooseIf: 'you want a big private pool villa and a top spa.',
            hotels: [newStay({ city: 'Noonu Atoll', nights: 3, hotelName: 'Sun Siyam Iru Fushi', roomType: 'Deluxe Beach Villa', mealPlan: meal }), newStay({ city: 'Noonu Atoll', nights: 1, hotelName: 'Sun Siyam Iru Fushi', roomType: 'Water Villa with Pool', mealPlan: meal })],
        }),
        mk(3, {
            label: 'Siyam World Maldives', starRating: 5, location: 'Noonu Atoll', transfer: 'Seaplane · 40 min', price: 612000, mealSummary: 'Premium All Inclusive', priceNote: 'WOW! Premium All Inclusive · 4 nights',
            description: 'A playful, everything-included island with a floating water park, horse riding and karting.',
            chooseIf: 'the kids want non-stop activities and you never want to look at a bill.',
            hotels: [newStay({ city: 'Noonu Atoll', nights: 4, hotelName: 'Siyam World', roomType: 'Beach Villa with Pool', mealPlan: 'All inclusive' })],
        }),
    ]
    design.coverTitle = 'Maldives'
    design.coverScript = 'a family escape'
    design.coverImage = [img('1514282401047-d79a71a590e8')]
    design.flightsMode = 'not-included'
    design.chips = ['Seaplane included', 'Taxes included']
    return buildProposalData({
        pkg: {
            id: 'sample', Destination_ID: 'maldives-family', Destination_Name: 'Maldives Family Escape', Duration: '4 Nights / 5 Days',
            Inclusions: ['4 nights in your chosen resort', 'Meals as per the option chosen', 'Return resort transfers (seaplane / speedboat)', 'Green tax & all government taxes'],
            Exclusions: ['International flights', 'Spa treatments & motorised water sports', 'Travel insurance'],
        },
        client: { name: 'the Mehta family' },
        travelDate: '2027-01-22',
        adults: 2,
        children: 2,
        tripType: 'Family holiday',
        totalCost: 492797,
        advancePaid: 0,
        days: [
            { day: 'Day 1', title: 'Fly in & seaplane to the resort', description: 'Land in Malé, our team takes you to the seaplane lounge for a short scenic flight to your island.', location: 'Malé' },
            { day: 'Day 2', title: 'House reef & kids club', description: 'Snorkel the house reef in the morning while the kids join the club activities.', location: 'Resort' },
            { day: 'Day 3', title: 'Sunset dolphin cruise', description: 'A relaxed day on the beach and a sunset cruise to spot spinner dolphins.', location: 'Resort' },
            { day: 'Day 4', title: 'Move to your overwater villa', description: 'Your room changes today — we move your bags while you enjoy lunch.', location: 'Resort' },
            { day: 'Day 5', title: 'Fly home', description: 'Breakfast, then the seaplane back to Malé for your flight home.', location: 'Malé' },
        ],
        hotels: [],
        flights: [],
        notes: '',
        destinationName: 'Maldives',
        designerName: 'Ananya Sharma',
        quoteRef: 'TZ-261115-MV04',
        quoteDate: QUOTE_DATE,
        validDays: 5,
        design,
    })
}

/** Single-option quote (no upgrade) for checking the simple layout */
export function sampleSingle(): ProposalData {
    const d = sampleKashmir()
    return { ...d, stayOptions: d.stayOptions.filter((o) => o.isQuoted), cover: { ...d.cover, hotelsLabel: '4-star' } }
}
