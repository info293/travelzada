'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// --- Data definitions ---

interface Card {
  place: string
  region: string
  nights: string
  hook: string
  img: string
  slug: string
}

interface Occasion {
  name: string
  line: string
  cards: Card[]
}

const occasionsData: Occasion[] = [
  {
    name: 'Honeymoons',
    line: 'Slow mornings, big views, nothing on the clock.',
    cards: [
      { place: 'Bali', region: 'Indonesia', nights: '6N / 7D', hook: 'Jungle villas and floating breakfasts', img: 'https://ik.imagekit.io/tux8wjwgq/Bali/BAL_001_3.jpg?tr=w-900', slug: 'bali' },
      { place: 'Vietnam', region: 'Hoi An · Ha Long', nights: '7N / 8D', hook: 'Lantern towns and limestone bays', img: 'https://images.pexels.com/photos/23857946/pexels-photo-23857946.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'vietnam' },
      { place: 'Thailand', region: 'Phuket · Krabi', nights: '5N / 6D', hook: 'Longtail boats to hidden lagoons', img: 'https://ik.imagekit.io/tux8wjwgq/Thailand/stylish%20couple%20boating%20through%20krabi%20limestone%20islands.png?tr=w-900', slug: 'thailand' },
      { place: 'Kerala', region: 'Munnar · Alleppey', nights: '5N / 6D', hook: 'Tea hills, then a private houseboat', img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/couple%20overlooking%20serene%20kerala%20backwaters.png?tr=w-900', slug: 'kerala' },
      { place: 'Andaman', region: 'Havelock', nights: '5N / 6D', hook: 'Coral reefs and empty beaches', img: 'https://ik.imagekit.io/tux8wjwgq/Andaman/couple%20snorkelling%20over%20vibrant%20coral%20reefs%20at%20elephant%20beach.png?tr=w-900', slug: 'andaman' }
    ]
  },
  {
    name: 'Minimoons',
    line: 'Two to four nights, close to home, right after the wedding.',
    cards: [
      { place: 'Coorg', region: 'Karnataka', nights: '2N / 3D', hook: 'Coffee estates in the mist', img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/Couple%20in%20Munnar%20Tea%20garden%20and%20cloudes.jpg?tr=w-900', slug: 'coorg' },
      { place: 'Da Nang', region: 'Vietnam', nights: '3N / 4D', hook: 'Beach days, Hoi An nights', img: 'https://images.pexels.com/photos/31476945/pexels-photo-31476945.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'vietnam' },
      { place: 'Phu Quoc', region: 'Vietnam', nights: '3N / 4D', hook: 'Island sunsets, no alarms', img: 'https://ik.imagekit.io/tux8wjwgq/Andaman/couple%20relaxing%20together%20at%20a%20beach%20resort%20near%20radhanagar%20beach.png?tr=w-900', slug: 'vietnam' },
      { place: 'Gulmarg', region: 'Kashmir', nights: '3N / 4D', hook: 'Snowfall and a fireside cabin', img: 'https://ik.imagekit.io/tux8wjwgq/Kashmir/couple%20playing%20with%20snow%20in%20gulmarg.jpg?tr=w-900', slug: 'kashmir' },
      { place: 'Udaipur', region: 'Rajasthan', nights: '2N / 3D', hook: 'Lake views from a palace suite', img: 'https://ik.imagekit.io/tux8wjwgq/Rajasthan/indian%20couple%20walking%20near%20lake%20pichola%20udaipur.png?tr=w-900', slug: 'udaipur' }
    ]
  },
  {
    name: 'Proposals',
    line: 'We scout the spot, hide the photographer and chill the champagne.',
    cards: [
      { place: 'Phi Phi Island', region: 'Thailand', nights: '4N / 5D', hook: 'A private beach at golden hour', img: 'https://ik.imagekit.io/tux8wjwgq/Thailand/romantic%20couple%20walking%20on%20phi%20phi%20island%20beach.png?tr=w-900', slug: 'thailand' },
      { place: 'Dubai', region: 'UAE', nights: '4N / 5D', hook: 'Dunes, a dinner table, one question', img: 'https://images.pexels.com/photos/36260020/pexels-photo-36260020.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'dubai' },
      { place: 'Paris', region: 'France', nights: '5N / 6D', hook: 'The Seine at sunset', img: 'https://images.pexels.com/photos/29389532/pexels-photo-29389532.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'france' },
      { place: 'Swiss Alps', region: 'Switzerland', nights: '6N / 7D', hook: 'A mountaintop with no one else', img: 'https://images.pexels.com/photos/36980067/pexels-photo-36980067.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'switzerland' },
      { place: 'Maldives', region: 'Sandbank dinner', nights: '4N / 5D', hook: 'Just the two of you and the sea', img: 'https://images.pexels.com/photos/1287455/pexels-photo-1287455.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'maldives' }
    ]
  },
  {
    name: 'Surprise your girlfriend',
    line: 'You book it. She finds out at the airport.',
    cards: [
      { place: 'Goa', region: 'North Goa', nights: '3N / 4D', hook: 'Beach shacks and a sunset cruise', img: 'https://images.pexels.com/photos/30987033/pexels-photo-30987033.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'goa' },
      { place: 'Pondicherry', region: 'White Town', nights: '2N / 3D', hook: 'French lanes and seaside cafés', img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/couple%20at%20kovalam%20beach.jpg?tr=w-900', slug: 'pondicherry' },
      { place: 'Wayanad', region: 'Kerala', nights: '3N / 4D', hook: 'A treehouse in the rainforest', img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/couple%20enjoying%20lush%20green%20tea%20gardens%20in%20munnar.png?tr=w-900', slug: 'kerala' },
      { place: 'Jaisalmer', region: 'Rajasthan', nights: '2N / 3D', hook: 'Dunes, camels and a desert camp', img: 'https://ik.imagekit.io/tux8wjwgq/Rajasthan/indian%20couple%20having%20camel%20ride%20on%20sam%20sand%20dunes%20jaisalmer.png?tr=w-900', slug: 'jaisalmer' },
      { place: 'Bali', region: 'Indonesia', nights: '5N / 6D', hook: "A birthday she won't see coming", img: 'https://ik.imagekit.io/tux8wjwgq/Bali/Birthday.jpg?tr=w-900', slug: 'bali' }
    ]
  },
  {
    name: 'First wedding night',
    line: 'Suites chosen for privacy, petals and a very late checkout.',
    cards: [
      { place: 'The Lodhi', region: 'New Delhi', nights: '1–2 nights', hook: 'Suites with private plunge pools', img: 'https://images.pexels.com/photos/17657612/pexels-photo-17657612.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'delhi' },
      { place: 'Brij Kukas', region: 'Jaipur', nights: '1–2 nights', hook: 'A private heritage hideaway near Amer', img: 'https://ik.imagekit.io/tux8wjwgq/Rajasthan/indian%20couple%20at%20amber%20fort%20jaipur%20exploring%20historic%20architecture.png?tr=w-900', slug: 'jaipur' },
      { place: 'The Oberoi Amarvilas', region: 'Agra', nights: '1–2 nights', hook: 'Wake up facing the Taj Mahal', img: 'https://ik.imagekit.io/tux8wjwgq/Rajasthan/luxury%20indian%20couple%20inside%20city%20palace%20udaipur.png?tr=w-900', slug: 'agra' },
      { place: 'Taj Lake Palace', region: 'Udaipur', nights: '1–2 nights', hook: 'A palace floating on Lake Pichola', img: 'https://ik.imagekit.io/tux8wjwgq/Rajasthan/romantic%20couple%20boating%20on%20lake%20pichola%20udaipur.png?tr=w-900', slug: 'udaipur' },
      { place: 'ITC Grand Bharat', region: 'Gurugram', nights: '1–2 nights', hook: 'All-suite retreat in the Aravallis', img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/candle%20light%20dinner%20kerala.jpg?tr=w-900', slug: 'delhi' }
    ]
  },
  {
    name: 'Luxury getaways',
    line: "Private villas, butlers and pools you won't share.",
    cards: [
      { place: 'Koh Samui', region: 'Thailand', nights: '6N / 7D', hook: 'Private beach villa resorts', img: 'https://ik.imagekit.io/tux8wjwgq/Thailand/luxury%20couple%20relaxing%20at%20private%20koh%20samui%20beach%20resort.png?tr=w-900', slug: 'thailand' },
      { place: 'Ubud', region: 'Bali', nights: '5N / 6D', hook: 'Infinity pools over the jungle', img: 'https://ik.imagekit.io/tux8wjwgq/Bali/bali%20floating%20breakfast.jpg?tr=w-900', slug: 'bali' },
      { place: 'Maldives', region: 'Baa Atoll', nights: '4N / 5D', hook: 'Overwater villas with private pools', img: 'https://images.pexels.com/photos/28843928/pexels-photo-28843928.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'maldives' },
      { place: 'Dubai', region: 'Palm Jumeirah', nights: '4N / 5D', hook: 'Suites above the Gulf', img: 'https://images.pexels.com/photos/28720826/pexels-photo-28720826.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'dubai' },
      { place: 'Singapore', region: 'Marina Bay', nights: '4N / 5D', hook: 'Skyline rooftops and fine dining', img: 'https://ik.imagekit.io/tux8wjwgq/SIngapore/luxury%20couple%20at%20gardens%20by%20the%20bay.jpg?tr=w-900', slug: 'singapore' }
    ]
  },
  {
    name: 'Wedding blessings',
    line: 'Begin together at the temples and shrines that matter to you.',
    cards: [
      { place: 'Varanasi', region: 'Uttar Pradesh', nights: '2N / 3D', hook: 'Ganga aarti, side by side', img: 'https://images.pexels.com/photos/32297486/pexels-photo-32297486.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'varanasi' },
      { place: 'Amritsar', region: 'Punjab', nights: '2N / 3D', hook: 'The Golden Temple at dawn', img: 'https://images.pexels.com/photos/29231349/pexels-photo-29231349.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'amritsar' },
      { place: 'Rishikesh', region: 'Uttarakhand', nights: '3N / 4D', hook: 'Riverside blessings in the hills', img: 'https://images.pexels.com/photos/37248322/pexels-photo-37248322.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'rishikesh' },
      { place: 'Paro', region: 'Bhutan', nights: '4N / 5D', hook: "The climb to Tiger's Nest", img: 'https://images.pexels.com/photos/9982525/pexels-photo-9982525.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'bhutan' },
      { place: 'Thekkady', region: 'Kerala', nights: '3N / 4D', hook: 'Temple towns and forest calm', img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/elephant%20bathing%20in%20thekkady%20forest%20river.png?tr=w-900', slug: 'kerala' }
    ]
  },
  {
    name: 'Anniversaries',
    line: 'Another year, somewhere neither of you has been.',
    cards: [
      { place: 'Bali', region: 'Indonesia', nights: '7N / 8D', hook: 'Cliff dinners and a couple spa', img: 'https://ik.imagekit.io/tux8wjwgq/Bali/anniversary%20special.jpg?tr=w-900', slug: 'bali' },
      { place: 'Andaman', region: 'Port Blair · Havelock', nights: '5N / 6D', hook: 'Candlelit dinner on the sand', img: 'https://ik.imagekit.io/tux8wjwgq/Andaman/couple%20celebrating%20an%20anniversary%20dinner%20at%20a%20luxury%20resort%20in%20port%20blair.png?tr=w-900', slug: 'andaman' },
      { place: 'Baku', region: 'Azerbaijan', nights: '4N / 5D', hook: 'Old-town lanes, a city of lights', img: 'https://ik.imagekit.io/tux8wjwgq/Baku/couple%20at%20baku%20eye.jpg?tr=w-900', slug: 'baku' },
      { place: 'Paris', region: 'France', nights: '5N / 6D', hook: 'Rooftops at golden hour', img: 'https://images.pexels.com/photos/28688862/pexels-photo-28688862.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'france' },
      { place: 'Switzerland', region: 'Lucerne · Alps', nights: '6N / 7D', hook: 'Lakes, trains and snow peaks', img: 'https://images.pexels.com/photos/30765901/pexels-photo-30765901.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'switzerland' }
    ]
  },
  {
    name: 'Babymoons',
    line: 'Short flights, gentle days, soft beds — one last trip as two.',
    cards: [
      { place: 'Maldives', region: 'Kaafu Atoll', nights: '4N / 5D', hook: 'Short flight, total stillness', img: 'https://images.pexels.com/photos/32267913/pexels-photo-32267913.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'maldives' },
      { place: 'Sri Lanka', region: 'Ella · Galle', nights: '5N / 6D', hook: 'Tea country by slow train', img: 'https://images.pexels.com/photos/31555892/pexels-photo-31555892.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'sri-lanka' },
      { place: 'Nepal', region: 'Pokhara', nights: '4N / 5D', hook: 'Lakeside mornings, mountain views', img: 'https://images.pexels.com/photos/26926327/pexels-photo-26926327.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'nepal' },
      { place: 'Bhutan', region: 'Paro · Thimphu', nights: '5N / 6D', hook: 'The calmest kingdom on earth', img: 'https://images.pexels.com/photos/17898806/pexels-photo-17898806.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'bhutan' },
      { place: 'Kerala', region: 'Kovalam', nights: '4N / 5D', hook: 'Ayurveda and ocean breezes', img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/couple%20at%20kovalam%20beach%20during%20sunset.png?tr=w-900', slug: 'kerala' }
    ]
  },
  {
    name: 'Gratitude to parents',
    line: 'Send them on the holiday they always put off.',
    cards: [
      { place: 'Singapore', region: 'City · Sentosa', nights: '5N / 6D', hook: 'Easy pace, everything nearby', img: 'https://ik.imagekit.io/tux8wjwgq/SIngapore/indian%20couple%20at%20merlion%20park%20singapore.jpg?tr=w-900', slug: 'singapore' },
      { place: 'Malaysia', region: 'Kuala Lumpur · Langkawi', nights: '5N / 6D', hook: 'Skylines, then island calm', img: 'https://images.pexels.com/photos/6147614/pexels-photo-6147614.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'malaysia' },
      { place: 'Dubai', region: 'UAE', nights: '4N / 5D', hook: 'Desert dinners by the Burj Al Arab', img: 'https://images.pexels.com/photos/17865575/pexels-photo-17865575.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'dubai' },
      { place: 'Europe', region: 'Swiss & Italian Alps', nights: '8N / 9D', hook: 'The trip they never took', img: 'https://images.pexels.com/photos/27912555/pexels-photo-27912555.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'switzerland' },
      { place: 'Kashmir', region: 'Srinagar · Gulmarg', nights: '5N / 6D', hook: 'A shikara ride on Dal Lake', img: 'https://ik.imagekit.io/tux8wjwgq/Kashmir/romantic%20shikara%20experience%20on%20dal%20lake.png?tr=w-900', slug: 'kashmir' }
    ]
  }
]

const destinationsData = {
  International: [
    { name: 'Bali', meta: 'From ₹35,000 per person', img: 'https://ik.imagekit.io/tux8wjwgq/Bali/Phinisi%20Cruise%20Dinner.jpg?tr=w-900', slug: 'bali' },
    { name: 'Thailand', meta: 'From ₹32,000 per person', img: 'https://ik.imagekit.io/tux8wjwgq/Thailand/romantic%20couple%20on%20krabi%20four%20island%20longtail%20boat.png?tr=w-900', slug: 'thailand' },
    { name: 'Singapore', meta: 'From ₹41,599 per person', img: 'https://ik.imagekit.io/tux8wjwgq/SIngapore/honeymoon%20couple%20at%20marina%20bay%20sands%20pool.jpg?tr=w-900', slug: 'singapore' },
    { name: 'Baku', meta: 'From ₹35,000 per person', img: 'https://ik.imagekit.io/tux8wjwgq/Baku/honeymoon%20couple%20in%20baku%20azerbaijan.jpg?tr=w-900', slug: 'baku' },
    { name: 'Dubai', meta: 'Tailor-made', img: 'https://images.pexels.com/photos/17865575/pexels-photo-17865575.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'dubai' },
    { name: 'Switzerland', meta: 'Tailor-made', img: 'https://images.pexels.com/photos/30765901/pexels-photo-30765901.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'switzerland' }
  ],
  India: [
    { name: 'Kashmir', meta: 'From ₹14,500 per person', img: 'https://ik.imagekit.io/tux8wjwgq/Kashmir/romantic%20shikara%20experience%20on%20dal%20lake.png?tr=w-900', slug: 'kashmir' },
    { name: 'Udaipur', meta: 'From ₹17,249 per person', img: 'https://ik.imagekit.io/tux8wjwgq/Rajasthan/romantic%20couple%20boating%20on%20lake%20pichola%20udaipur.png?tr=w-900', slug: 'udaipur' },
    { name: 'Kerala', meta: 'From ₹19,000 per person', img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/luxury%20couple%20in%20scenic%20munnar%20tea%20plantations.png?tr=w-900', slug: 'kerala' },
    { name: 'Andaman', meta: 'From ₹30,475 per person', img: 'https://ik.imagekit.io/tux8wjwgq/Andaman/couple%20strolling%20peacefully%20along%20the%20shoreline%20of%20radhanagar%20beach.png?tr=w-900', slug: 'andaman' },
    { name: 'Jaisalmer', meta: 'From ₹25,299 per person', img: 'https://ik.imagekit.io/tux8wjwgq/Rajasthan/luxury%20indian%20couple%20at%20a%20heritage%20palace%20in%20jaisalmer.png?tr=w-900', slug: 'jaisalmer' },
    { name: 'Himachal', meta: 'Tailor-made', img: 'https://images.pexels.com/photos/20725666/pexels-photo-20725666.jpeg?auto=compress&cs=tinysrgb&w=900', slug: 'himachal' }
  ]
}

const hotelPartners = [
  { name: 'Taj Hotels & Resorts', logo: 'https://www.travelzada.com/logs/Taj.webp' },
  { name: 'The Oberoi Group', logo: 'https://www.travelzada.com/logs/Oberoi.webp' },
  { name: 'The Leela Palaces', logo: 'https://www.travelzada.com/logs/Leela.png' },
  { name: 'ITC Hotels', logo: 'https://www.travelzada.com/logs/ITC.webp' },
  { name: 'Marriott International', logo: 'https://www.travelzada.com/logs/Mariott.webp' },
  { name: 'Aman Resorts', logo: 'https://www.travelzada.com/logs/Aman.jpg' },
  { name: 'The Lalit', logo: 'https://www.travelzada.com/logs/Lalit.png' },
  { name: 'Brij Hotels', logo: 'https://www.travelzada.com/logs/Brij.png' }
]

const airlines = [
  'Emirates',
  'Qatar Airways',
  'Singapore Airlines',
  'Etihad Airways',
  'Air India',
  'Lufthansa',
  'Thai Airways'
]

const faqData = [
  {
    q: 'How does planning with Travelzada work?',
    a: 'Share your dates, budget and occasion. You get a personalised day-by-day itinerary, then a real planner refines every detail with you on WhatsApp.'
  },
  {
    q: 'Is the itinerary free?',
    a: 'Yes. Planning is free and unlimited. You only pay once you decide to book.'
  },
  {
    q: 'Can we customise a package?',
    a: 'Every package is 100% customisable — swap hotels, add a surprise, change the number of nights.'
  },
  {
    q: 'What happens after we book?',
    a: 'You receive a detailed confirmation and a dedicated trip coordinator who handles transfers, check-ins and special requests.'
  },
  {
    q: 'Do you support us during the trip?',
    a: 'Yes — 24/7 on-trip support. A last-minute change or an emergency is just a message away.'
  }
]

const allOccasionsList = [
  'Honeymoons',
  'Minimoons',
  'Proposals',
  'Surprise your girlfriend',
  'First wedding night',
  'Luxury getaways',
  'Wedding blessings',
  'Anniversaries',
  'Babymoons',
  'Gratitude to parents'
]

// Helper for high-res images
function toHighRes(url: string) {
  return url.replace('tr=w-900', 'tr=w-1800').replace('w=900', 'w=1800')
}

export default function TravelzadaHomePage() {
  const router = useRouter()

  // Navigation & Tabs
  const [destTab, setDestTab] = useState<'International' | 'India'>('International')
  const [activeFaq, setActiveFaq] = useState<number>(0)
  const [pickedOccasions, setPickedOccasions] = useState<string[]>(['Honeymoons'])

  // Search Bar State
  const [searchDest, setSearchDest] = useState('')
  const [searchOccasion, setSearchOccasion] = useState('Honeymoon')
  const [searchWhen, setSearchWhen] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    names: '',
    whereTo: '',
    when: '',
    phone: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  // Occasions Showcase State
  const [activeSec, setActiveSec] = useState<number>(0)
  const [hoveredSec, setHoveredSec] = useState<number>(-1)
  const [selectedCards, setSelectedCards] = useState<number[]>(Array(10).fill(0))
  const [seenSections, setSeenSections] = useState<boolean[]>(Array(10).fill(false))
  const [isNarrow, setIsNarrow] = useState<boolean>(false)

  // Double-buffered backgrounds
  const [bgs, setBgs] = useState(() =>
    occasionsData.map(o => ({
      a: toHighRes(o.cards[0].img),
      b: '',
      front: 'A' as 'A' | 'B',
      cur: toHighRes(o.cards[0].img)
    }))
  )

  const secRefs = useRef<(HTMLElement | null)[]>([])
  const trackRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollLockRef = useRef<{ [key: number]: number }>({})

  // Window resize check for mobile bar
  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 760)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Card Width helper
  const getCardWidth = (el: HTMLDivElement | null) => {
    if (!el || !el.firstElementChild) return 280
    return el.firstElementChild.getBoundingClientRect().width + 18
  }

  // Set card and smooth scroll
  const goToCard = (secIdx: number, cardIdx: number) => {
    scrollLockRef.current[secIdx] = Date.now()
    setSelectedCards(prev => {
      const next = [...prev]
      next[secIdx] = cardIdx
      return next
    })

    const track = trackRefs.current[secIdx]
    if (track) {
      const w = getCardWidth(track)
      track.scrollTo({ left: cardIdx * w, behavior: 'smooth' })
    }
  }

  // Track onScroll handler
  const handleTrackScroll = (secIdx: number) => {
    if (Date.now() - (scrollLockRef.current[secIdx] || 0) < 800) return
    const track = trackRefs.current[secIdx]
    if (!track) return

    const w = getCardWidth(track)
    const cardIdx = Math.max(0, Math.min(4, Math.round(track.scrollLeft / w)))
    const maxScroll = track.scrollWidth - track.clientWidth
    if (track.scrollLeft >= maxScroll - 4 && selectedCards[secIdx] > cardIdx) return

    if (cardIdx !== selectedCards[secIdx]) {
      setSelectedCards(prev => {
        const next = [...prev]
        next[secIdx] = cardIdx
        return next
      })
    }
  }

  // Smooth scroll to an occasion section
  const scrollToOccasion = (secIdx: number) => {
    const el = secRefs.current[secIdx]
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 110
    window.scrollTo({ top, behavior: 'smooth' })
  }

  // Update background crossfade when selected card changes
  useEffect(() => {
    setBgs(prevBgs => {
      let changed = false
      const newBgs = prevBgs.map((b, i) => {
        const targetUrl = toHighRes(occasionsData[i].cards[selectedCards[i]].img)
        if (targetUrl === b.cur) return b
        changed = true
        return b.front === 'A'
          ? { a: b.a, b: targetUrl, front: 'B' as const, cur: targetUrl }
          : { a: targetUrl, b: b.b, front: 'A' as const, cur: targetUrl }
      })
      return changed ? newBgs : prevBgs
    })
  }, [selectedCards])

  // IntersectionObserver to detect active occasion and trigger reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const idx = secRefs.current.indexOf(entry.target as HTMLElement)
          if (idx < 0) return

          if (entry.intersectionRatio >= 0.2) {
            setSeenSections(prev => {
              if (prev[idx]) return prev
              const next = [...prev]
              next[idx] = true
              return next
            })
          }

          if (entry.intersectionRatio >= 0.55) {
            setActiveSec(idx)
          }
        })
      },
      { threshold: [0, 0.2, 0.3, 0.55, 0.8] }
    )

    secRefs.current.forEach(el => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // Autoplay timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeSec < 0 || hoveredSec === activeSec) return
      const nextCard = (selectedCards[activeSec] + 1) % 5
      goToCard(activeSec, nextCard)
    }, 4800)

    return () => clearInterval(timer)
  }, [activeSec, hoveredSec, selectedCards])

  // Toggle occasion in enquiry
  const toggleOccasion = (occName: string) => {
    setPickedOccasions(prev =>
      prev.includes(occName) ? prev.filter(x => x !== occName) : [...prev, occName]
    )
  }

  // Handle Hero Quick Search Submit -> routes to real AI planner (/tailored-travel)
  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchDest.trim()) params.set('destination', searchDest.trim())
    if (searchOccasion.trim()) params.set('occasion', searchOccasion.trim())
    if (searchWhen.trim()) params.set('when', searchWhen.trim())

    router.push(`/tailored-travel?${params.toString()}`)
  }

  // Real Lead Submission -> Saves to Firestore leads collection + emails agents + WhatsApp
  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      const cleanMobile = formData.phone.trim().replace(/\D/g, '')
      if (cleanMobile.length < 10) {
        setFormError('Please enter a valid 10-digit mobile number.')
        setIsSubmitting(false)
        return
      }

      const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

      // 1. Save lead to Firestore 'leads' collection
      if (db) {
        await addDoc(collection(db, 'leads'), {
          name: formData.names.trim(),
          mobile: cleanMobile,
          destination: formData.whereTo.trim(),
          duration: formData.when.trim(),
          occasion: pickedOccasions.join(', '),
          sourceUrl: pageUrl,
          packageName: 'Homepage Custom Itinerary Request',
          status: 'new',
          createdAt: serverTimestamp(),
          read: false,
        })
      }

      // 2. Dispatch email notification to team
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead_notification',
          data: {
            name: formData.names.trim(),
            mobile: cleanMobile,
            sourceUrl: pageUrl,
            destination: formData.whereTo.trim(),
            duration: formData.when.trim(),
            occasion: pickedOccasions.join(', '),
            packageName: 'Homepage Itinerary Enquiry',
          },
        }),
      }).catch(err => console.error('Failed to dispatch lead email:', err))

      setSubmitSuccess(true)

      // 3. Open WhatsApp conversation with prefilled text
      const waText = encodeURIComponent(
        `Hi Travelzada! We would like to plan our trip.\n` +
        `• Names: ${formData.names.trim()}\n` +
        `• Destination: ${formData.whereTo.trim() || 'Anywhere romantic'}\n` +
        `• When & Duration: ${formData.when.trim() || 'Flexible'}\n` +
        `• Occasion: ${pickedOccasions.join(', ')}\n` +
        `• Phone: ${cleanMobile}`
      )
      window.open(`https://wa.me/919929962350?text=${waText}`, '_blank')
    } catch (err: any) {
      console.error('Lead submission error:', err)
      setFormError(err.message || 'Something went wrong. Please try again or chat with us on WhatsApp.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="font-figtree text-[#3B2A20] bg-[#F6F1E6] text-[16px] antialiased selection:bg-[#E8DCC3]">

      {/* ─────────────────────────────────────────────────────────────
          1. HERO & QUICK AI SEARCH SECTION
      ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[min(100vh,920px)] flex flex-col bg-[#2B1D17] overflow-hidden pt-20 md:pt-24">
        {/* Background Hero Image */}
        <div className="absolute inset-0">
          <img
            src="https://ik.imagekit.io/tux8wjwgq/Andaman/couple%20swimming%20and%20enjoying%20a%20golden%20sunset%20at%20radhanagar%20beach.png?tr=w-2000"
            alt="Hero couple at golden hour"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Vignette Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(43,29,23,0.7) 0%, rgba(43,29,23,0.25) 38%, rgba(43,29,23,0.3) 62%, rgba(43,29,23,0.85) 100%)'
          }}
        />

        {/* In-page Anchor Links Bar */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8 py-3 w-full flex items-center justify-between gap-4 flex-wrap text-[13px] tracking-[0.14em] uppercase text-[#E8DCC3]/80 border-b border-white/10">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none py-1">
            <a href="#occasions" className="hover:text-white transition-colors">Occasions</a>
            <a href="#packages" className="hover:text-white transition-colors">Packages</a>
            <a href="#destinations" className="hover:text-white transition-colors">Destinations</a>
            <a href="#stays" className="hover:text-white transition-colors">Stays &amp; Airlines</a>
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/tailored-travel"
              className="text-[#F6F1E6] hover:text-[#D6B08C] transition-colors flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>AI Itinerary Planner</span>
            </Link>
            <Link
              href="/destinations"
              className="hidden sm:inline-block text-[#F6F1E6] hover:text-[#D6B08C] transition-colors"
            >
              All Destinations →
            </Link>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center text-center px-5 sm:px-8 pt-8 pb-28 sm:pb-36">
          <div className="max-w-[980px] animate-[tzRise_0.9s_ease_both]">
            <div className="text-[12.5px] font-semibold tracking-[0.3em] uppercase text-[#F6F1E6]">
              Couples only · India &amp; the world
            </div>
            <h1 className="font-cormorant font-normal text-[clamp(48px,7.4vw,110px)] leading-[0.98] tracking-[-0.01em] text-[#F6F1E6] mt-4 text-balance">
              Journeys designed<br />
              only <span className="font-pinyon font-normal text-[#E8DCC3] text-[0.92em] tracking-normal">for two</span>
            </h1>
            <p className="text-[clamp(16px,1.4vw,19px)] leading-relaxed text-[#F6F1E6] mt-5 mx-auto max-w-[560px]">
              Honeymoons, proposals, anniversaries and quiet escapes — planned by real travel designers and powered by AI.
            </p>

            {/* Quick Interactive Search Bar (Connected to /tailored-travel) */}
            <form
              onSubmit={handleHeroSearch}
              className="mt-8 sm:mt-10 mx-auto max-w-[840px] flex items-stretch flex-wrap gap-2 bg-[#F6F1E6]/15 backdrop-blur-[14px] border border-[#F6F1E6]/40 rounded-[18px] p-2 text-left"
            >
              {/* Occasion select */}
              <div className="flex-1 min-w-[150px] p-2.5 sm:px-4 rounded-[12px] bg-black/20 hover:bg-black/30 transition-colors">
                <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-[#E8DCC3]">
                  Occasion
                </label>
                <select
                  value={searchOccasion}
                  onChange={e => setSearchOccasion(e.target.value)}
                  className="w-full bg-transparent text-[#F6F1E6] font-medium text-[15px] outline-none cursor-pointer mt-1"
                >
                  <option value="Honeymoon" className="bg-[#2B1D17] text-white">Honeymoon</option>
                  <option value="Minimoon" className="bg-[#2B1D17] text-white">Minimoon</option>
                  <option value="Proposal" className="bg-[#2B1D17] text-white">Proposal</option>
                  <option value="Anniversary" className="bg-[#2B1D17] text-white">Anniversary</option>
                  <option value="Birthday Escape" className="bg-[#2B1D17] text-white">Birthday Escape</option>
                  <option value="Luxury Getaway" className="bg-[#2B1D17] text-white">Luxury Getaway</option>
                  <option value="Babymoon" className="bg-[#2B1D17] text-white">Babymoon</option>
                </select>
              </div>

              {/* Destination search */}
              <div className="flex-1 min-w-[160px] p-2.5 sm:px-4 rounded-[12px] bg-black/20 hover:bg-black/30 transition-colors">
                <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-[#E8DCC3]">
                  Destination
                </label>
                <input
                  type="text"
                  value={searchDest}
                  onChange={e => setSearchDest(e.target.value)}
                  placeholder="Bali, Kashmir, Europe..."
                  className="w-full bg-transparent text-[#F6F1E6] placeholder-white/60 font-medium text-[15px] outline-none mt-1"
                />
              </div>

              {/* When input */}
              <div className="flex-1 min-w-[140px] p-2.5 sm:px-4 rounded-[12px] bg-black/20 hover:bg-black/30 transition-colors">
                <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-[#E8DCC3]">
                  When &amp; Nights
                </label>
                <input
                  type="text"
                  value={searchWhen}
                  onChange={e => setSearchWhen(e.target.value)}
                  placeholder="Feb · 6 Nights"
                  className="w-full bg-transparent text-[#F6F1E6] placeholder-white/60 font-medium text-[15px] outline-none mt-1"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="flex-initial flex items-center justify-center text-[15px] font-semibold text-[#3B2A20] bg-[#F6F1E6] hover:bg-[#D6B08C] rounded-[12px] px-6 py-3.5 whitespace-nowrap transition cursor-pointer"
              >
                Plan our trip
              </button>
            </form>

            {/* Trust badges */}
            <div className="flex justify-center items-center gap-3 sm:gap-5 flex-wrap mt-6 text-[14.5px] text-[#F6F1E6]">
              <Link href="/reviews" className="hover:underline flex items-center gap-1.5">
                <strong className="font-semibold text-amber-300">★ 4.9</strong>
                <span>from 500+ couples</span>
              </Link>
              <span className="w-1 h-1 rounded-full bg-[#E8DCC3]" />
              <span>Free personalized itinerary</span>
              <span className="w-1 h-1 rounded-full bg-[#E8DCC3]" />
              <span>No payment until you love the plan</span>
            </div>
          </div>
        </div>

        {/* Decorative Wave Divider */}
        <svg
          viewBox="0 0 1440 40"
          preserveAspectRatio="none"
          className="absolute left-0 right-0 -bottom-[1px] w-full h-[34px] z-10 block pointer-events-none"
        >
          <path
            fill="#F6F1E6"
            d="M0,40 L0,18 L40,22 L75,14 L110,20 L150,12 L190,19 L230,15 L270,23 L310,13 L350,18 L395,11 L440,20 L480,16 L520,24 L560,14 L605,19 L650,12 L690,21 L735,15 L780,22 L820,13 L860,18 L905,10 L950,19 L990,15 L1030,23 L1075,14 L1120,20 L1160,12 L1200,19 L1245,16 L1290,22 L1330,13 L1375,18 L1410,14 L1440,19 L1440,40 Z"
          />
        </svg>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. OCCASIONS HEADER
      ───────────────────────────────────────────────────────────── */}
      <section id="occasions" className="max-w-[1280px] mx-auto px-5 sm:px-8 pt-16 sm:pt-28">
        <div className="text-center max-w-[680px] mx-auto">
          <div className="font-pinyon text-[clamp(30px,3vw,40px)] text-[#7A4F34] leading-none">
            for every chapter
          </div>
          <h2 className="font-cormorant font-normal text-[clamp(38px,4.6vw,62px)] leading-tight tracking-[-0.01em] mt-2.5">
            What are you celebrating?
          </h2>
          <p className="text-[17px] leading-relaxed text-[#7A4F34] mt-4">
            Ten reasons to go away together. Each one planned differently.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. INTERACTIVE OCCASIONS & PACKAGES SHOWCASE
      ───────────────────────────────────────────────────────────── */}
      <div id="packages" className="relative bg-[#2B1D17] mt-10 sm:mt-16">
        {/* Sticky Occasions Filter Bar */}
        <div className="sticky top-[64px] md:top-[72px] z-30 bg-[#2B1D17]/90 backdrop-blur-[14px] border-b border-[#E8DCC3]/20">
          <div
            data-noscroll=""
            className="max-w-[1280px] mx-auto px-5 sm:px-8 py-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none"
          >
            <span className="flex-none text-[12px] font-semibold tracking-[0.2em] uppercase text-[#D6B08C] mr-2">
              Packages by occasion
            </span>
            {occasionsData.map((occ, i) => {
              const isActive = activeSec === i
              return (
                <button
                  key={occ.name}
                  onClick={() => scrollToOccasion(i)}
                  className={`flex-none font-figtree text-[14px] font-medium px-4 py-2 rounded-full cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-[#F6F1E6] text-[#3B2A20] border-[#F6F1E6]'
                      : 'bg-transparent text-[#F6F1E6] border-[#F6F1E6]/35 hover:border-[#F6F1E6]/70'
                  }`}
                >
                  {occ.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* 10 Occasion Sections */}
        {occasionsData.map((occ, i) => {
          const cardIdx = selectedCards[i]
          const bgState = bgs[i]
          const isSeen = seenSections[i]
          const padNum = String(i + 1).padStart(2, '0')
          const nextIdx = (i + 1) % 10

          return (
            <section
              key={occ.name}
              id={`occ-${i}`}
              ref={el => { secRefs.current[i] = el }}
              onMouseEnter={() => setHoveredSec(i)}
              onMouseLeave={() => setHoveredSec(-1)}
              className="relative overflow-hidden text-[#F6F1E6] scroll-mt-24"
            >
              {/* Double-buffered Dynamic Crossfade Backgrounds */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-[1200ms] ease-out pointer-events-none"
                style={{
                  backgroundImage: bgState.a ? `url("${bgState.a}")` : 'none',
                  opacity: bgState.front === 'A' ? 1 : 0,
                  transform: bgState.front === 'A' ? 'scale(1)' : 'scale(1.08)'
                }}
              />
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-[1200ms] ease-out pointer-events-none"
                style={{
                  backgroundImage: bgState.b ? `url("${bgState.b}")` : 'none',
                  opacity: bgState.front === 'B' ? 1 : 0,
                  transform: bgState.front === 'B' ? 'scale(1)' : 'scale(1.08)'
                }}
              />

              {/* Gradient Scrims for text contrast */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(43,29,23,0.94) 0%, rgba(43,29,23,0.76) 32%, rgba(43,29,23,0.34) 66%, rgba(43,29,23,0.5) 100%), linear-gradient(180deg, #2B1D17 0%, rgba(43,29,23,0) 20%, rgba(43,29,23,0) 74%, #2B1D17 100%)'
                }}
              />

              {/* Occasion Inner Grid */}
              <div className="relative max-w-[1280px] mx-auto min-h-[min(92vh,820px)] px-5 sm:px-8 py-16 sm:py-28 flex flex-wrap items-center gap-8 sm:gap-16">

                {/* Left Side: Occasion Details */}
                <div
                  className="flex-1 basis-[300px] max-w-[400px] min-w-0 transition-all duration-700 ease-out"
                  style={{
                    opacity: isSeen ? 1 : 0,
                    transform: isSeen ? 'none' : 'translateY(28px)'
                  }}
                >
                  <div className="flex items-baseline gap-2.5 font-cormorant">
                    <span className="text-[clamp(44px,5vw,60px)] font-normal leading-none">{padNum}</span>
                    <span className="text-[20px] text-[#D6B08C]">/ 10</span>
                  </div>
                  <h2 className="font-cormorant font-normal text-[clamp(42px,5.2vw,74px)] leading-none tracking-[-0.01em] mt-4 text-balance">
                    {occ.name}
                  </h2>
                  <p className="text-[17px] leading-relaxed text-[#F6F1E6] mt-4 max-w-[360px]">
                    {occ.line}
                  </p>

                  <div className="flex items-center gap-3.5 flex-wrap mt-7">
                    <Link
                      href={`/tailored-travel?occasion=${encodeURIComponent(occ.name)}`}
                      className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#3B2A20] bg-[#F6F1E6] px-5 py-3 rounded-full transition hover:bg-[#D6B08C] hover:-translate-y-0.5"
                    >
                      Plan with AI <span>→</span>
                    </Link>
                    <Link
                      href={`/packages?occasion=${encodeURIComponent(occ.name.toLowerCase())}`}
                      className="inline-flex items-center text-[14px] font-medium text-[#E8DCC3] border border-[#E8DCC3]/40 px-4 py-2.5 rounded-full hover:border-white hover:text-white transition"
                    >
                      Explore Packages
                    </Link>
                    <button
                      onClick={() => scrollToOccasion(nextIdx)}
                      className="text-[14px] font-medium text-[#E8DCC3] border-b border-[#E8DCC3]/45 pb-0.5 hover:text-[#F6F1E6] cursor-pointer"
                    >
                      Next: {occasionsData[nextIdx].name} ↓
                    </button>
                  </div>
                </div>

                {/* Right Side: 5-Card Carousel */}
                <div className="flex-1 basis-[520px] min-w-0">
                  <div
                    ref={el => { trackRefs.current[i] = el }}
                    onScroll={() => handleTrackScroll(i)}
                    data-noscroll=""
                    className="flex gap-4 sm:gap-5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none py-4 px-2"
                  >
                    {occ.cards.map((c, j) => {
                      const isSelected = j === cardIdx
                      return (
                        <div
                          key={c.place}
                          className={`flex-none snap-start w-[clamp(232px,21vw,280px)] aspect-[5/7] rounded-[18px] transition-all duration-500 ease-out relative ${
                            isSelected
                              ? 'opacity-100 -translate-y-2.5 outline outline-1 outline-[#E8DCC3]/90 outline-offset-4'
                              : 'opacity-75 hover:opacity-100 outline outline-1 outline-transparent'
                          }`}
                        >
                          <div
                            onClick={() => goToCard(i, j)}
                            className="w-full h-full rounded-[18px] overflow-hidden bg-[#3B2A20] shadow-[0_34px_60px_-28px_rgba(0,0,0,0.85)] cursor-pointer relative group"
                          >
                            <img
                              src={c.img}
                              alt={c.place}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                            {/* Card gradient overlay */}
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background:
                                  'linear-gradient(to top, rgba(43,29,23,0.92) 0%, rgba(43,29,23,0.3) 46%, rgba(43,29,23,0) 66%)'
                              }}
                            />
                            {/* Nights badge */}
                            <div className="absolute top-3.5 left-3.5 text-[12.5px] font-semibold text-[#F6F1E6] bg-[#2B1D17]/50 backdrop-blur-[8px] border border-[#F6F1E6]/35 px-3 py-1.5 rounded-full pointer-events-none">
                              {c.nights}
                            </div>
                            {/* Card bottom text */}
                            <div className="absolute left-4 sm:left-5 right-4 sm:right-5 bottom-4 sm:bottom-5 text-[#F6F1E6]">
                              <div className="text-[11.5px] font-semibold tracking-[0.16em] uppercase text-[#E8DCC3]">
                                {c.region}
                              </div>
                              <div className="font-cormorant font-semibold text-[27px] leading-tight mt-1">
                                {c.place}
                              </div>
                              <div className="text-[13.5px] leading-snug mt-1.5 text-[#F6F1E6]/90 line-clamp-2">
                                {c.hook}
                              </div>
                              {/* Direct Destination Link */}
                              <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-[12.5px] text-[#E8DCC3]">
                                <Link
                                  href={`/destinations/${c.slug}`}
                                  className="hover:text-white font-medium underline underline-offset-2"
                                  onClick={e => e.stopPropagation()}
                                >
                                  View Packages →
                                </Link>
                                <Link
                                  href={`/tailored-travel?destination=${encodeURIComponent(c.place)}`}
                                  className="hover:text-white font-medium"
                                  onClick={e => e.stopPropagation()}
                                >
                                  Plan with AI
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Carousel Controls */}
                  <div className="flex items-center gap-4 mt-2 px-2 flex-wrap">
                    <button
                      onClick={() => goToCard(i, (cardIdx + 4) % 5)}
                      aria-label="Previous card"
                      className="w-[48px] h-[48px] rounded-full border border-[#F6F1E6]/55 bg-[#2B1D17]/40 text-[#F6F1E6] text-[18px] flex items-center justify-center cursor-pointer transition hover:bg-[#F6F1E6]/20"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => goToCard(i, (cardIdx + 1) % 5)}
                      aria-label="Next card"
                      className="w-[48px] h-[48px] rounded-full border border-[#F6F1E6] bg-[#F6F1E6] text-[#3B2A20] text-[18px] flex items-center justify-center cursor-pointer transition hover:bg-[#D6B08C]"
                    >
                      →
                    </button>

                    <div className="flex-1 max-w-[220px] h-[2px] bg-[#F6F1E6]/25 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#D6B08C] transition-all duration-500 ease-out"
                        style={{ width: `${((cardIdx + 1) / 5) * 100}%` }}
                      />
                    </div>

                    <div className="font-cormorant flex items-baseline gap-1.5">
                      <span className="text-[36px] font-normal leading-none">
                        {String(cardIdx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[17px] text-[#D6B08C]">/ 05</span>
                    </div>
                  </div>
                </div>

              </div>
            </section>
          )
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. DESTINATIONS SECTION (CONNECTS TO /destinations/[slug])
      ───────────────────────────────────────────────────────────── */}
      <section id="destinations" className="bg-[#E8DCC3]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[12.5px] font-semibold tracking-[0.24em] uppercase text-[#7A4F34]">
                Destinations
              </div>
              <h2 className="font-cormorant font-normal text-[clamp(38px,4.6vw,62px)] leading-tight tracking-[-0.01em] mt-3">
                Where couples are going
              </h2>
            </div>
            {/* Tab switch + Explore All button */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 bg-[#F6F1E6] rounded-full p-1.5 shadow-sm">
                <button
                  onClick={() => setDestTab('International')}
                  className={`font-figtree text-[15px] font-semibold px-5 py-2.5 rounded-full transition cursor-pointer ${
                    destTab === 'International'
                      ? 'bg-[#3B2A20] text-[#F6F1E6]'
                      : 'bg-transparent text-[#3B2A20] hover:text-[#7A4F34]'
                  }`}
                >
                  International
                </button>
                <button
                  onClick={() => setDestTab('India')}
                  className={`font-figtree text-[15px] font-semibold px-5 py-2.5 rounded-full transition cursor-pointer ${
                    destTab === 'India'
                      ? 'bg-[#3B2A20] text-[#F6F1E6]'
                      : 'bg-transparent text-[#3B2A20] hover:text-[#7A4F34]'
                  }`}
                >
                  India
                </button>
              </div>

              <Link
                href="/destinations"
                className="font-semibold text-sm text-[#3B2A20] hover:text-[#7A4F34] underline underline-offset-4"
              >
                All Destinations →
              </Link>
            </div>
          </div>

          {/* Destinations Grid (Links to real Next.js destination detail pages) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
            {destinationsData[destTab].map(dest => (
              <Link
                key={dest.name}
                href={`/destinations/${dest.slug}`}
                className="group relative block h-[clamp(320px,30vw,420px)] rounded-[20px] overflow-hidden bg-[#D6B08C] shadow-sm animate-[tzRise_0.5s_ease_both]"
              >
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
                  <img
                    src={dest.img}
                    alt={dest.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(43,29,23,0.85) 0%, rgba(43,29,23,0.2) 42%, transparent 64%)'
                  }}
                />
                <div className="absolute left-6 right-6 bottom-5 text-[#F6F1E6] flex items-end justify-between gap-3">
                  <div>
                    <div className="font-cormorant font-semibold text-[32px] leading-none">
                      {dest.name}
                    </div>
                    <div className="text-[14.5px] mt-2 text-[#E8DCC3]">
                      {dest.meta}
                    </div>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-[#F6F1E6] text-[#3B2A20] flex items-center justify-center text-[17px] group-hover:bg-[#D6B08C] transition-colors">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. STAYS & SKIES (MARQUEE)
      ───────────────────────────────────────────────────────────── */}
      <section id="stays" className="py-16 sm:py-28 overflow-hidden">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8 text-center">
          <div className="text-[12.5px] font-semibold tracking-[0.24em] uppercase text-[#7A4F34]">
            Stays &amp; skies
          </div>
          <h2 className="font-cormorant font-normal text-[clamp(36px,4.2vw,56px)] leading-tight tracking-[-0.01em] mt-3.5">
            Only the names you'd pick yourselves
          </h2>
        </div>

        <div className="mt-10 sm:mt-14 space-y-6">
          {/* Hotels Marquee */}
          <div>
            <div className="text-center text-[12.5px] font-semibold tracking-[0.2em] uppercase text-[#7A4F34] mb-4">
              Luxury hotel partners
            </div>
            <div
              className="overflow-hidden"
              style={{
                maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)'
              }}
            >
              <div className="flex items-center w-max animate-[tzMarquee_42s_linear_infinite]">
                {[...hotelPartners, ...hotelPartners, ...hotelPartners].map((hotel, idx) => (
                  <div key={idx} className="h-[92px] px-6 sm:px-11 flex items-center">
                    <img
                      src={hotel.logo}
                      alt={hotel.name}
                      title={hotel.name}
                      className="w-[140px] h-[54px] object-contain mix-blend-multiply grayscale opacity-85 hover:grayscale-0 hover:opacity-100 transition duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Airlines Marquee (Reverse) */}
          <div className="pt-2">
            <div className="text-center text-[12.5px] font-semibold tracking-[0.2em] uppercase text-[#7A4F34] mb-3">
              Premium airlines
            </div>
            <div
              className="overflow-hidden"
              style={{
                maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)'
              }}
            >
              <div
                className="flex items-center w-max"
                style={{ animation: 'tzMarquee 36s linear infinite reverse' }}
              >
                {[...airlines, ...airlines, ...airlines].map((air, idx) => (
                  <div
                    key={idx}
                    className="h-[72px] px-6 sm:px-11 flex items-center font-cormorant font-semibold text-[26px] tracking-[0.08em] uppercase text-[#3B2A20] whitespace-nowrap"
                  >
                    {air}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. HOW IT WORKS (CONNECTS TO /tailored-travel)
      ───────────────────────────────────────────────────────────── */}
      <section id="how" className="bg-[#3B2A20] text-[#F6F1E6]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-24 items-center">

          {/* Left Image & Floating Cost Card */}
          <div className="relative pb-12 mx-auto lg:mx-0 w-full max-w-[460px]">
            <div className="h-[clamp(440px,46vw,600px)] rounded-t-full rounded-b-[20px] overflow-hidden outline outline-1 outline-[#B88A5A] outline-offset-[10px]">
              <img
                src="https://ik.imagekit.io/tux8wjwgq/Kerala/romantic%20candlelight%20dinner%20in%20kerala.png?tr=w-1000"
                alt="Candlelit dinner for two"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Floating Breakdown Card */}
            <div className="absolute right-0 bottom-0 w-[min(330px,90%)] bg-[#F6F1E6] text-[#3B2A20] rounded-[18px] p-5 shadow-[0_30px_60px_-28px_rgba(0,0,0,0.6)] animate-[tzFloat_6s_ease-in-out_infinite]">
              <div className="flex justify-between items-baseline gap-2">
                <div className="text-[12px] font-semibold tracking-[0.14em] uppercase text-[#7A4F34]">
                  Sample breakdown
                </div>
                <div className="text-[12.5px] text-[#7A4F34]">100% itemised</div>
              </div>
              <div className="font-cormorant font-semibold text-[24px] mt-1.5">
                Kashmir Honeymoon · 6N/7D
              </div>

              {/* Segmented bar */}
              <div className="flex h-2.5 rounded-full overflow-hidden mt-3.5 gap-0.5">
                <div className="w-[42%] bg-[#3B2A20]" title="Hotels" />
                <div className="w-[18%] bg-[#7A4F34]" title="Transfers" />
                <div className="w-[21%] bg-[#B88A5A]" title="Activities" />
                <div className="w-[11%] bg-[#D6B08C]" title="Romantic extras" />
                <div className="w-[8%] bg-[#E8DCC3]" title="Service fee" />
              </div>

              {/* Price rows */}
              <div className="grid gap-1.5 mt-3.5 text-[14px]">
                <div className="flex justify-between"><span>Hotels (4★)</span><span className="font-medium">₹16,000</span></div>
                <div className="flex justify-between"><span>Transfers</span><span className="font-medium">₹7,000</span></div>
                <div className="flex justify-between"><span>Activities</span><span className="font-medium">₹8,000</span></div>
                <div className="flex justify-between"><span>Romantic extras</span><span className="font-medium">₹4,000</span></div>
                <div className="flex justify-between"><span>Service fee</span><span className="font-medium">₹3,000</span></div>
              </div>

              <div className="flex justify-between items-baseline border-t border-[#E8DCC3] mt-3 pt-3">
                <span className="text-[14px] text-[#7A4F34]">Total / person</span>
                <span className="text-[20px] font-bold">₹38,000</span>
              </div>
            </div>
          </div>

          {/* Right Text & Steps */}
          <div>
            <div className="font-pinyon text-[clamp(30px,3vw,40px)] text-[#D6B08C] leading-none">
              how it works
            </div>
            <h2 className="font-cormorant font-normal text-[clamp(38px,4.4vw,58px)] leading-[1.04] tracking-[-0.01em] mt-2.5">
              From one message to a trip you'll remember
            </h2>

            <div className="relative mt-8 sm:mt-11 pl-11">
              {/* Vertical connecting line */}
              <div className="absolute left-[13px] top-2.5 bottom-2.5 w-[1px] bg-[#7A4F34]" />

              {/* Step 1 */}
              <div className="relative pb-7">
                <div className="absolute -left-[44px] top-0 w-7 h-7 rounded-full bg-[#3B2A20] border border-[#D6B08C] flex items-center justify-center text-[11.5px] font-semibold text-[#E8DCC3]">
                  01
                </div>
                <h3 className="text-[19px] font-semibold mt-0.5 text-[#F6F1E6]">
                  Share your preferences
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#E8DCC3] mt-1.5 max-w-[460px]">
                  Destination, dates, budget and the occasion. Sixty seconds.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative pb-7">
                <div className="absolute -left-[44px] top-0 w-7 h-7 rounded-full bg-[#3B2A20] border border-[#D6B08C] flex items-center justify-center text-[11.5px] font-semibold text-[#E8DCC3]">
                  02
                </div>
                <h3 className="text-[19px] font-semibold mt-0.5 text-[#F6F1E6]">
                  Get your personalised itinerary
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#E8DCC3] mt-1.5 max-w-[460px]">
                  Day by day — hotels, transfers, romantic add-ons.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative pb-7">
                <div className="absolute -left-[44px] top-0 w-7 h-7 rounded-full bg-[#3B2A20] border border-[#D6B08C] flex items-center justify-center text-[11.5px] font-semibold text-[#E8DCC3]">
                  03
                </div>
                <h3 className="text-[19px] font-semibold mt-0.5 text-[#F6F1E6]">
                  Your planner perfects it
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#E8DCC3] mt-1.5 max-w-[460px]">
                  A real expert refines every detail with you on WhatsApp.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative pb-5">
                <div className="absolute -left-[44px] top-0 w-7 h-7 rounded-full bg-[#3B2A20] border border-[#D6B08C] flex items-center justify-center text-[11.5px] font-semibold text-[#E8DCC3]">
                  04
                </div>
                <h3 className="text-[19px] font-semibold mt-0.5 text-[#F6F1E6]">
                  See exactly what you pay
                </h3>
                <p className="text-[15.5px] leading-relaxed text-[#E8DCC3] mt-1.5 max-w-[460px]">
                  A complete, itemised breakdown. No hidden charges.
                </p>
              </div>
            </div>

            <Link
              href="/tailored-travel"
              className="inline-block text-[15.5px] font-semibold text-[#3B2A20] bg-[#F6F1E6] px-7 py-4 rounded-full transition hover:bg-[#D6B08C] hover:-translate-y-0.5 mt-2"
            >
              Start planning — it's free
            </Link>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. REAL COUPLES TESTIMONIAL (CONNECTS TO /reviews)
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-20 items-center">
        <div className="h-[clamp(360px,38vw,520px)] rounded-[20px] overflow-hidden shadow-md">
          <img
            src="https://ik.imagekit.io/tux8wjwgq/Bali/anniversary%20special.jpg?tr=w-1200"
            alt="Real couple story photo"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <div className="text-[12.5px] font-semibold tracking-[0.24em] uppercase text-[#7A4F34]">
            Real couples
          </div>
          <div className="font-cormorant text-[96px] leading-[0.5] text-[#D6B08C] mt-9">
            “
          </div>
          <blockquote className="font-cormorant font-normal text-[clamp(30px,3.2vw,44px)] leading-snug mt-1.5 text-balance">
            Travelzada planned our Bali honeymoon down to the sunset dinner. One perfect itinerary — zero stress.
          </blockquote>
          <div className="flex items-center gap-3.5 mt-7">
            <div className="w-12 h-12 rounded-full bg-[#E8DCC3] flex items-center justify-center font-cormorant font-semibold text-[18px]">
              A&amp;R
            </div>
            <div>
              <div className="text-[16px] font-semibold">Aarav &amp; Riya</div>
              <div className="text-[14.5px] text-[#7A4F34] mt-0.5">Bali · 6N/7D · Dec 2024</div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap border-t border-[#E8DCC3] mt-8 pt-6">
            <div className="flex">
              {['M&S', 'K&V', 'N&I', 'D&P'].map((initials, idx) => (
                <div
                  key={idx}
                  className="w-[38px] h-[38px] rounded-full bg-[#3B2A20] text-[#F6F1E6] border-2 border-[#F6F1E6] -mr-2.5 flex items-center justify-center text-[11.5px] font-semibold"
                >
                  {initials}
                </div>
              ))}
            </div>
            <div className="text-[15px] pl-2.5">
              <strong className="font-semibold">4.9/5</strong> from 500+ couples
            </div>
            <Link
              href="/reviews"
              className="text-[15px] font-semibold text-[#7A4F34] border-b border-[#D6B08C] pb-0.5 hover:text-[#3B2A20] transition-colors"
            >
              Read all reviews
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. QUESTIONS COUPLES ASK (FAQ)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#E8DCC3]">
        <div className="max-w-[860px] mx-auto px-5 sm:px-8 py-16 sm:py-28">
          <h2 className="font-cormorant font-normal text-[clamp(36px,4.2vw,56px)] leading-tight text-center">
            Questions couples ask
          </h2>
          <div className="grid gap-2.5 mt-8 sm:mt-11">
            {faqData.map((faq, i) => {
              const isOpen = activeFaq === i
              return (
                <div key={i} className="bg-[#F6F1E6] rounded-[16px] overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 bg-transparent border-none cursor-pointer p-5 sm:p-6 text-left font-figtree text-[17px] font-semibold text-[#3B2A20]"
                  >
                    <span>{faq.q}</span>
                    <span
                      className={`w-8 h-8 rounded-full border border-[#D6B08C] flex items-center justify-center flex-none text-[18px] text-[#7A4F34] transition-transform duration-300 ${
                        isOpen ? 'rotate-45' : 'rotate-0'
                      }`}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-[16px] leading-relaxed text-[#7A4F34] max-w-[680px] animate-[tzRise_0.35s_ease_both]">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. ENQUIRE / BOOKING FORM (REAL FIRESTORE & EMAIL INTEGRATION)
      ───────────────────────────────────────────────────────────── */}
      <section id="enquire" className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-9 sm:gap-20 items-start">
          <div>
            <div className="font-pinyon text-[clamp(30px,3vw,40px)] text-[#7A4F34] leading-none">
              let's begin
            </div>
            <h2 className="font-cormorant font-normal text-[clamp(40px,4.8vw,64px)] leading-none tracking-[-0.01em] mt-2.5">
              Tell us about the two of you
            </h2>
            <p className="text-[17px] leading-relaxed text-[#7A4F34] mt-4 max-w-[440px]">
              Free, personalised itinerary. No payment until you love it.
            </p>

            {/* Occasion Chips Multi-select */}
            <div className="text-[12.5px] font-semibold tracking-[0.2em] uppercase text-[#7A4F34] mt-8">
              The occasion
            </div>
            <div className="flex flex-wrap gap-2 mt-3.5 max-w-[520px]">
              {allOccasionsList.map(occName => {
                const isSelected = pickedOccasions.includes(occName)
                return (
                  <button
                    key={occName}
                    type="button"
                    onClick={() => toggleOccasion(occName)}
                    className={`font-figtree text-[14.5px] font-medium rounded-full px-4 py-2.5 cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-[#3B2A20] text-[#F6F1E6] border-[#3B2A20]'
                        : 'bg-transparent text-[#3B2A20] border-[#D6B08C] hover:border-[#3B2A20]'
                    }`}
                  >
                    {occName}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-[#E8DCC3] rounded-[24px] p-6 sm:p-10 shadow-sm grid gap-4">
            <form onSubmit={handleEnquirySubmit} className="grid gap-4">
              <label className="block">
                <div className="text-[14px] font-semibold text-[#3B2A20]">Your names</div>
                <input
                  type="text"
                  required
                  value={formData.names}
                  onChange={e => setFormData({ ...formData, names: e.target.value })}
                  placeholder="Riya &amp; Aarav"
                  className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[16px] text-[#3B2A20] p-3.5 focus:border-[#B88A5A] focus:bg-white transition"
                />
              </label>

              <label className="block">
                <div className="text-[14px] font-semibold text-[#3B2A20]">Where to?</div>
                <input
                  type="text"
                  required
                  value={formData.whereTo}
                  onChange={e => setFormData({ ...formData, whereTo: e.target.value })}
                  placeholder="Bali, Kashmir, anywhere warm…"
                  className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[16px] text-[#3B2A20] p-3.5 focus:border-[#B88A5A] focus:bg-white transition"
                />
              </label>

              <label className="block">
                <div className="text-[14px] font-semibold text-[#3B2A20]">When &amp; how long?</div>
                <input
                  type="text"
                  required
                  value={formData.when}
                  onChange={e => setFormData({ ...formData, when: e.target.value })}
                  placeholder="February, 6 nights"
                  className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[16px] text-[#3B2A20] p-3.5 focus:border-[#B88A5A] focus:bg-white transition"
                />
              </label>

              <label className="block">
                <div className="text-[14px] font-semibold text-[#3B2A20]">WhatsApp mobile number</div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[16px] text-[#3B2A20] p-3.5 focus:border-[#B88A5A] focus:bg-white transition"
                />
              </label>

              {formError && (
                <div className="text-red-600 text-sm font-medium">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="font-figtree text-[16px] font-semibold text-[#F6F1E6] bg-[#3B2A20] disabled:bg-gray-400 border-none rounded-full py-4 px-7 cursor-pointer mt-1.5 transition hover:bg-[#7A4F34] hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Saving your request...</span>
                ) : (
                  <span>Get our free itinerary</span>
                )}
              </button>
            </form>

            {submitSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-center text-sm font-medium animate-[tzRise_0.3s_ease_both]">
                ✓ Your inquiry has been saved! A personal travel designer will connect with you on WhatsApp shortly.
              </div>
            )}

            <a
              href="https://wa.me/919929962350"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-[15px] font-semibold text-[#3B2A20] hover:text-[#7A4F34] transition-colors pt-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              Or chat directly on WhatsApp — +91 99299 62350
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. MOBILE FLOATING ACTION BAR
      ───────────────────────────────────────────────────────────── */}
      {isNarrow && (
        <>
          <div className="h-[84px] bg-[#3B2A20]" />
          <div className="fixed left-3 right-3 bottom-3 z-50 flex gap-2 bg-[#F6F1E6] rounded-full p-1.5 shadow-[0_18px_40px_-14px_rgba(43,29,23,0.55),0_0_0_1px_#E8DCC3] animate-[tzRise_0.4s_ease_both]">
            <a
              href="https://wa.me/919929962350"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Us"
              className="flex-none w-[52px] h-[52px] rounded-full bg-[#E8DCC3] flex items-center justify-center hover:bg-[#D6B08C] transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B2A20" strokeWidth="2">
                <path d="M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z" />
              </svg>
            </a>
            <Link
              href="/tailored-travel"
              className="flex-1 flex items-center justify-center text-[16px] font-semibold text-[#F6F1E6] bg-[#3B2A20] rounded-full hover:bg-[#7A4F34] transition-colors"
            >
              Plan our trip — free
            </Link>
          </div>
        </>
      )}

    </div>
  )
}
