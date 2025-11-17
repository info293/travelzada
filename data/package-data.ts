export interface TravelPackage {
  id: string
  destination: string
  title: string
  duration: string
  pricePerPerson: string
  totalPrice: string
  nightsSummary: string
  hotelLevel: string
  activitiesCount: number
  meals: string
  perks: string[]
  highlights: string[]
  overview: string
  itinerary: Array<{
    day: string
    title: string
    description: string
    details: string[]
  }>
  inclusions: string[]
  exclusions: string[]
  policies: {
    booking: string[]
    payment: string[]
    cancellation: string[]
  }
  image: string
  badge?: string
  type?: string
  rating?: number
  reviews?: number
  paymentNote?: string
}

export const travelPackages: TravelPackage[] = [
  {
    id: 'bali-classic',
    destination: 'Bali',
    title: 'Exciting Bali Vacay',
    duration: '5 Nights / 6 Days',
    pricePerPerson: '₹27,795',
    totalPrice: '₹55,590',
    nightsSummary: '3N Kuta • 2N Ubud',
    hotelLevel: '4 Star Hotels',
    activitiesCount: 3,
    meals: 'Selected Meals',
    perks: [
      '20% Off on Kintamani Tour',
      'Free Nusa Penida Tour',
      'Bird Park Entry',
    ],
    highlights: [
      'Daily breakfast for two',
      'Private cab transfers',
      'Guided sightseeing tours',
    ],
    overview:
      'Discover the best of Bali with a balanced blend of relaxation in Kuta and cultural immersion in Ubud.',
    itinerary: [
      {
        day: 'Day 1',
        title: 'Arrive in Bali & Sunset at Tanah Lot',
        description:
          'Airport pickup and check-in at your Kuta hotel followed by a magical sunset visit to Tanah Lot temple.',
        details: [
          'Private airport transfers',
          'Welcome drink & orientation',
          'Evening at Tanah Lot',
        ],
      },
      {
        day: 'Day 2',
        title: 'Kintamani Volcano & Coffee Tour',
        description:
          'Explore Bali’s volcanic landscapes and indulge in authentic coffee tasting sessions.',
        details: [
          'Visit Batur Volcano viewpoint',
          'Traditional Balinese lunch',
          'Tegallalang rice terraces',
        ],
      },
      {
        day: 'Day 3',
        title: 'Island Hopping to Nusa Penida',
        description:
          'Full-day trip to Nusa Penida featuring white sand beaches and crystal lagoons.',
        details: [
          'Angel’s Billabong visit',
          'Kelingking Beach photo stop',
          'Snorkeling session',
        ],
      },
      {
        day: 'Day 4',
        title: 'Transfer to Ubud & Spa Ritual',
        description:
          'Scenic drive to Ubud with stops en route followed by a signature Balinese spa experience.',
        details: [
          'Visit Goa Gajah temple',
          'Balinese massage therapy',
          'Evening at leisure in Ubud market',
        ],
      },
      {
        day: 'Day 5',
        title: 'Ubud Culture & Monkey Forest',
        description:
          'Discover Ubud’s artistic heritage and famous Monkey Forest sanctuary.',
        details: [
          'Campuhan Ridge Walk',
          'Sacred Monkey Forest visit',
          'Traditional dance performance',
        ],
      },
      {
        day: 'Day 6',
        title: 'Departure',
        description:
          'Breakfast at the hotel and private drop-off to the airport.',
        details: [
          'Hotel checkout assistance',
          'Souvenir shopping stop (optional)',
        ],
      },
    ],
    inclusions: [
      '5 nights premium accommodation',
      'Daily breakfast & 2 lunches',
      'All sightseeing transfers',
      'English-speaking guide',
      'Airport pickup & drop',
    ],
    exclusions: [
      'International flights',
      'Personal expenses & tips',
      'Travel insurance',
    ],
    policies: {
      booking: [
        '50% advance required to confirm the booking',
        'Balance payment due 15 days prior to departure',
      ],
      payment: [
        'Secure online payment gateway',
        'EMI options available on request',
      ],
      cancellation: [
        'Free cancellation up to 21 days before departure',
        '50% charge between 20-10 days',
        'No refund within 9 days of departure',
      ],
    },
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    badge: 'MMT Premium',
    type: '5N/6D',
    rating: 4.8,
    reviews: 124,
    paymentNote: 'This price is lower than the average price in December',
  },
  {
    id: 'bali-group',
    destination: 'Bali',
    title: 'Serene Bali - Indian Group Tour',
    duration: '5 Nights / 6 Days',
    pricePerPerson: '₹36,010',
    totalPrice: '₹72,020',
    nightsSummary: '5N Bali',
    hotelLevel: '4 Star Hotel',
    activitiesCount: 2,
    meals: 'Selected Meals',
    perks: ['Airport Pickup & Drop', 'Sunset Cruise', 'Group Tour Captain'],
    highlights: [
      'Daily buffet breakfast',
      'Guided group activities',
      'All internal transfers',
    ],
    overview:
      'Perfectly curated for Indian travelers who love exploring Bali in a fun, social group setup.',
    itinerary: [
      {
        day: 'Day 1',
        title: 'Welcome to Bali',
        description: 'Group airport transfer and welcome dinner with live music.',
        details: [
          'Airport pickup with group coordinator',
          'Check-in & welcome dinner',
        ],
      },
      {
        day: 'Day 2',
        title: 'Uluwatu & Sunset Cruise',
        description: 'Clifftop temple visit and evening sunset cruise with DJ.',
        details: [
          'Visit Uluwatu Temple',
          'Kecek fire dance show',
          'Sunset dinner cruise',
        ],
      },
      {
        day: 'Day 3',
        title: 'Water Sports & Beach Club',
        description: 'Exciting water sports followed by beach club entry.',
        details: ['Banana boat ride', 'Parasailing', 'Beach club access'],
      },
      {
        day: 'Day 4',
        title: 'Cultural Bali',
        description:
          'Explore Bali’s temples, coffee plantations and rice terraces.',
        details: [
          'Lempuyang Temple',
          'Coffee tasting',
          'Tegallalang terraces',
        ],
      },
      {
        day: 'Day 5',
        title: 'Free Day & Shopping',
        description: 'Leisure day for shopping and personal exploration.',
        details: ['Optional spa session', 'Local market visit'],
      },
      {
        day: 'Day 6',
        title: 'Departure',
        description: 'Breakfast and airport drop.',
        details: ['Group transfer to airport'],
      },
    ],
    inclusions: [
      '4 star hotel stays',
      'Daily breakfast',
      'Sunset cruise with dinner',
      'Group tour captain',
      'Airport transfers',
    ],
    exclusions: [
      'Lunch and dinners unless specified',
      'Personal expenses',
      'Travel insurance',
    ],
    policies: {
      booking: ['Group confirmation closes 20 days prior to departure'],
      payment: ['Reserve your seat for just ₹5,000'],
      cancellation: [
        'Full refund till 30 days before travel',
        'Partial refund according to group policy',
      ],
    },
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80',
    badge: 'Group Tour',
    type: '5N/6D',
    rating: 4.9,
    reviews: 98,
    paymentNote: 'Book now by paying only ₹5,000',
  },
]

