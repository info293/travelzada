import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'

export interface RealPackageCard {
  id: string
  place: string
  region: string
  nights: string
  price: string
  rawPrice: number
  hook: string
  img: string
  slug: string
  packageSlug: string
  occasion: string
}

export interface RealDestinationSection {
  id: string
  name: string
  fullName: string
  slug: string
  region: 'International' | 'India'
  img: string
  line: string
  meta: string
  cards: RealPackageCard[]
}

export interface RealOccasionSection {
  id: string
  name: string
  fullName?: string
  slug: string
  img: string
  line: string
  meta: string
  cards: RealPackageCard[]
}

export interface RealDestinationGridItem {
  id: string
  name: string
  meta: string
  img: string
  slug: string
  region: 'International' | 'India'
  packageCount: number
}

export interface RealCoupleReview {
  name: string
  content: string
  rating: number | string
  date?: string
  packageName?: string
  destination?: string
}

export interface HomepageData {
  occasionSections?: RealOccasionSection[]
  sections: RealDestinationSection[]
  destinationsGrid: {
    International: RealDestinationGridItem[]
    India: RealDestinationGridItem[]
  }
  featuredReviews: RealCoupleReview[]
  stats: {
    totalPackages: number
    totalDestinations: number
  }
}

function formatPrice(val: any): string {
  if (!val) return 'Tailor-made'
  const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10)
  return num ? `₹${num.toLocaleString('en-IN')}` : String(val)
}

function cleanOverview(text?: string): string {
  if (!text) return 'Curated romantic journey for two with verified luxury stays.'
  const clean = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  return clean.length > 120 ? clean.slice(0, 117) + '...' : clean
}

export async function fetchHomepageData(): Promise<HomepageData> {
  try {
    if (!db) {
      throw new Error('Firestore instance not initialized')
    }

    const [destSnap, pkgSnap] = await Promise.all([
      getDocs(collection(db, 'destinations')),
      getDocs(collection(db, 'packages'))
    ])

    const rawDests = destSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
    const rawPkgs = pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

    // Map destinations
    const destMap: Record<string, RealDestinationSection> = {}

    rawDests.forEach(d => {
      const displayName = d.name === 'Phuket-Krabi' ? 'Thailand' : d.name
      destMap[d.id] = {
        id: d.id,
        name: displayName,
        fullName: d.name || displayName,
        slug: d.slug || displayName.toLowerCase().replace(/\s+/g, '-'),
        region: (d.region === 'India' ? 'India' : 'International') as 'International' | 'India',
        img: d.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
        line: d.description || 'Curated journeys designed for two with handpicked stays.',
        meta: '',
        cards: []
      }
    })

    const allReviews: RealCoupleReview[] = []
    const allCards: RealPackageCard[] = []

    // Match packages to destinations
    rawPkgs.forEach(p => {
      const destId = (p.Destination_ID || '').toLowerCase()
      const pName = (p.Destination_Name || '').toLowerCase()
      const loc = (p.Location_Breakup || '').toLowerCase()

      let matchedDest: RealDestinationSection | null = null

      for (const d of Object.values(destMap)) {
        const dName = d.name.toLowerCase()
        const fName = d.fullName.toLowerCase()

        if (dName.includes('thailand') || fName.includes('phuket')) {
          if (destId.startsWith('tha') || pName.includes('thailand') || pName.includes('phuket') || pName.includes('krabi') || loc.includes('phuket') || loc.includes('bangkok')) {
            matchedDest = d; break
          }
        } else if (dName.includes('bali')) {
          if (destId.startsWith('bal') || pName.includes('bali') || loc.includes('bali') || loc.includes('kuta') || loc.includes('ubud')) {
            matchedDest = d; break
          }
        } else if (dName.includes('singapore')) {
          if (destId.startsWith('sin') || pName.includes('singapore') || loc.includes('singapore')) {
            matchedDest = d; break
          }
        } else if (dName.includes('baku')) {
          if (destId.startsWith('bak') || pName.includes('baku') || loc.includes('baku')) {
            matchedDest = d; break
          }
        } else if (dName.includes('kashmir')) {
          if (destId.startsWith('kas') || pName.includes('kashmir') || pName.includes('srinagar') || pName.includes('gulmarg') || loc.includes('srinagar')) {
            matchedDest = d; break
          }
        } else if (dName.includes('kerala')) {
          if (destId.startsWith('ker') || pName.includes('kerala') || pName.includes('munnar') || pName.includes('alleppey') || loc.includes('kerala') || ['1', '2', '5'].includes(p.Destination_ID)) {
            matchedDest = d; break
          }
        } else if (dName.includes('rajasthan')) {
          if (destId.startsWith('raj') || pName.includes('rajasthan') || pName.includes('udaipur') || pName.includes('jaipur') || pName.includes('jaisalmer') || loc.includes('jaipur') || loc.includes('udaipur')) {
            matchedDest = d; break
          }
        } else if (dName.includes('andaman')) {
          if (destId.startsWith('and') || pName.includes('andaman') || pName.includes('havelock') || loc.includes('port blair')) {
            matchedDest = d; break
          }
        }
      }

      if (matchedDest) {
        const rawPrice = parseInt(String(p.Price_Range_INR).replace(/[^0-9]/g, ''), 10) || 0
        const pkgSlug = p.Slug || p.Destination_ID || p.id

        const cardItem: RealPackageCard = {
          id: p.id,
          place: p.Destination_Name || 'Romantic Escape',
          region: matchedDest.name,
          nights: p.Duration || 'Custom Nights',
          price: formatPrice(p.Price_Range_INR),
          rawPrice,
          hook: cleanOverview(p.Overview || p.SEO_Description || p.Location_Breakup),
          img: p.Primary_Image_URL || matchedDest.img,
          slug: matchedDest.slug,
          packageSlug: pkgSlug,
          occasion: p.Occasion || 'Honeymoon'
        }

        matchedDest.cards.push(cardItem)
        allCards.push(cardItem)
      }

      // Collect real guest reviews
      if (Array.isArray(p.Guest_Reviews)) {
        p.Guest_Reviews.forEach((r: any) => {
          if (r && r.name && r.content && String(r.content).trim().length > 20) {
            allReviews.push({
              name: r.name,
              content: r.content.trim(),
              rating: r.rating || 5,
              date: r.date || 'Verified Couple',
              packageName: p.Destination_Name,
              destination: matchedDest ? matchedDest.name : ''
            })
          }
        })
      }
    })

    // Compute starting prices and build destination grid
    const sections: RealDestinationSection[] = []
    const gridInternational: RealDestinationGridItem[] = []
    const gridIndia: RealDestinationGridItem[] = []

    // Sort order for destination sections: popular first
    const preferredOrder = ['thailand-packages', 'bali-packages', 'kashmir-packages', 'kerala-packages', 'rajasthan-packages', 'andaman-and-nicobar-packages', 'singapore-packages', 'baku-packages']

    const sortedDests = Object.values(destMap).sort((a, b) => {
      const idxA = preferredOrder.indexOf(a.slug)
      const idxB = preferredOrder.indexOf(b.slug)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return b.cards.length - a.cards.length
    })

    sortedDests.forEach(d => {
      const minPrice = d.cards.reduce((min, c) => (c.rawPrice && c.rawPrice < min ? c.rawPrice : min), Infinity)
      d.meta = minPrice !== Infinity ? `From ₹${minPrice.toLocaleString('en-IN')} per person` : 'Tailor-made'

      if (d.cards.length > 0) {
        sections.push(d)
      }

      const gridItem: RealDestinationGridItem = {
        id: d.id,
        name: d.name,
        meta: d.meta,
        img: d.img,
        slug: d.slug,
        region: d.region,
        packageCount: d.cards.length
      }

      if (d.region === 'India') {
        gridIndia.push(gridItem)
      } else {
        gridInternational.push(gridItem)
      }
    })

    // ─────────────────────────────────────────────────────────────
    // Build Occasion Sections (Packages filtered by Occasion)
    // ─────────────────────────────────────────────────────────────
    const OCCASION_DEFINITIONS = [
      {
        id: 'honeymoons',
        name: 'Honeymoons',
        slug: 'honeymoon',
        line: 'Slow mornings, big views, nothing on the clock.',
        img: 'https://ik.imagekit.io/tux8wjwgq/Bali/BAL_001_3.jpg?tr=w-1800',
        match: (c: RealPackageCard) =>
          c.occasion.toLowerCase().includes('honeymoon') ||
          c.place.toLowerCase().includes('honeymoon') ||
          c.place.toLowerCase().includes('newlywed') ||
          c.place.toLowerCase().includes('love')
      },
      {
        id: 'minimoons',
        name: 'Minimoons',
        slug: 'minimoon',
        line: 'Two to four nights, close to home, right after the wedding.',
        img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/Couple%20in%20Munnar%20Tea%20garden%20and%20cloudes.jpg?tr=w-1800',
        match: (c: RealPackageCard) => {
          const dur = c.nights.toLowerCase()
          return dur.includes('2n') || dur.includes('3n') || dur.includes('4n') || c.place.toLowerCase().includes('retreat') || c.place.toLowerCase().includes('escape')
        }
      },
      {
        id: 'proposals',
        name: 'Proposals',
        slug: 'proposal',
        line: 'We scout the spot, hide the photographer and chill the champagne.',
        img: 'https://ik.imagekit.io/tux8wjwgq/Thailand/romantic%20couple%20walking%20on%20phi%20phi%20island%20beach.png?tr=w-1800',
        match: (c: RealPackageCard) =>
          c.place.toLowerCase().includes('romance') ||
          c.place.toLowerCase().includes('delight') ||
          c.place.toLowerCase().includes('snowfall') ||
          c.place.toLowerCase().includes('blue water') ||
          c.place.toLowerCase().includes('sunset')
      },
      {
        id: 'anniversaries',
        name: 'Anniversaries',
        slug: 'anniversary',
        line: 'Another year, somewhere neither of you has been.',
        img: 'https://ik.imagekit.io/tux8wjwgq/Bali/anniversary%20special.jpg?tr=w-1800',
        match: (c: RealPackageCard) =>
          c.occasion.toLowerCase().includes('anniversary') ||
          c.place.toLowerCase().includes('anniversary') ||
          c.place.toLowerCase().includes('imperial') ||
          c.place.toLowerCase().includes('heritage') ||
          c.nights.toLowerCase().includes('7n') ||
          c.nights.toLowerCase().includes('6n')
      },
      {
        id: 'birthday-getaways',
        name: 'Birthday & Surprises',
        slug: 'birthday',
        line: 'You book it. They find out at the airport.',
        img: 'https://images.pexels.com/photos/30987033/pexels-photo-30987033.jpeg?auto=compress&cs=tinysrgb&w=1800',
        match: (c: RealPackageCard) =>
          c.occasion.toLowerCase().includes('birthday') ||
          c.place.toLowerCase().includes('birthday') ||
          c.place.toLowerCase().includes('special') ||
          c.place.toLowerCase().includes('nature') ||
          c.place.toLowerCase().includes('adventure')
      },
      {
        id: 'luxury-getaways',
        name: 'Luxury Getaways',
        slug: 'luxury',
        line: 'Five-star retreats, private transfers, pure indulgence.',
        img: 'https://ik.imagekit.io/tux8wjwgq/Rajasthan/luxury%20indian%20couple%20at%20a%20heritage%20palace%20in%20jaisalmer.png?tr=w-1800',
        match: (c: RealPackageCard) =>
          c.place.toLowerCase().includes('royal') ||
          c.place.toLowerCase().includes('crown') ||
          c.place.toLowerCase().includes('premium') ||
          c.place.toLowerCase().includes('luxury') ||
          c.place.toLowerCase().includes('elite') ||
          c.rawPrice >= 40000
      },
      {
        id: 'babymoons',
        name: 'Babymoons',
        slug: 'babymoon',
        line: 'Short flights, gentle days, soft beds — one last trip as two.',
        img: 'https://ik.imagekit.io/tux8wjwgq/Kerala/couple%20at%20kovalam%20beach%20during%20sunset.png?tr=w-1800',
        match: (c: RealPackageCard) =>
          c.place.toLowerCase().includes('serene') ||
          c.place.toLowerCase().includes('beach') ||
          c.place.toLowerCase().includes('bliss') ||
          c.place.toLowerCase().includes('valley') ||
          c.place.toLowerCase().includes('hills') ||
          c.place.toLowerCase().includes('lakes')
      },
      {
        id: 'gratitude-to-parents',
        name: 'Gratitude to Parents',
        slug: 'gratitude',
        line: 'Send them on the holiday they always put off.',
        img: 'https://ik.imagekit.io/tux8wjwgq/SIngapore/indian%20couple%20at%20merlion%20park%20singapore.jpg?tr=w-1800',
        match: (c: RealPackageCard) =>
          c.place.toLowerCase().includes('highlights') ||
          c.place.toLowerCase().includes('heritage') ||
          c.place.toLowerCase().includes('essentials') ||
          c.place.toLowerCase().includes('signature') ||
          c.place.toLowerCase().includes('grand') ||
          c.region.toLowerCase().includes('singapore') ||
          c.region.toLowerCase().includes('kerala') ||
          c.region.toLowerCase().includes('rajasthan')
      }
    ]

    const occasionSections: RealOccasionSection[] = OCCASION_DEFINITIONS.map(occDef => {
      let matched = allCards.filter(occDef.match)
      if (matched.length < 5) {
        const existingIds = new Set(matched.map(m => m.id))
        const fill = allCards.filter(c => !existingIds.has(c.id)).slice(0, 8 - matched.length)
        matched = matched.concat(fill)
      }
      const cards = matched.slice(0, 8)
      const minPrice = cards.reduce((min, c) => (c.rawPrice && c.rawPrice < min ? c.rawPrice : min), Infinity)
      const meta = minPrice !== Infinity ? `From ₹${minPrice.toLocaleString('en-IN')} per couple` : 'Tailor-made'

      return {
        id: occDef.id,
        name: occDef.name,
        fullName: occDef.name,
        slug: occDef.slug,
        line: occDef.line,
        meta,
        img: occDef.img,
        cards
      }
    })

    // Pick top real couple reviews
    const featuredReviews: RealCoupleReview[] = allReviews.slice(0, 8)

    return {
      occasionSections,
      sections,
      destinationsGrid: {
        International: gridInternational,
        India: gridIndia
      },
      featuredReviews,
      stats: {
        totalPackages: rawPkgs.length,
        totalDestinations: rawDests.length
      }
    }
  } catch (error) {
    console.error('Error fetching homepage data from Firestore:', error)
    return {
      occasionSections: [],
      sections: [],
      destinationsGrid: { International: [], India: [] },
      featuredReviews: [],
      stats: { totalPackages: 0, totalDestinations: 0 }
    }
  }
}
