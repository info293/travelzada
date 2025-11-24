'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ChangeEvent,
  KeyboardEvent,
} from 'react'
import Link from 'next/link'
import travelDatabase from '@/data/travel-database.json'
import destinationPackages from '@/data/destination_package.json'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const travelData = travelDatabase as any
type DestinationPackage = (typeof destinationPackages)[0] & { id?: string }

const monthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

// Get next 6 months from today
const getNextSixMonths = () => {
  const today = new Date()
  const months: { name: string; index: number }[] = []
  for (let i = 0; i < 6; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const monthIndex = date.getMonth()
    const monthName = monthNames[monthIndex]
    months.push({ name: monthName, index: monthIndex })
  }
  return months
}

const TOTAL_STEPS = 5 // Removed budget step

const withStyle = (instruction: string, maxWords = 35) =>
  `Keep the reply under ${maxWords} words. Be clear, upbeat, and avoid repetition. ${instruction}`

const dayOptions = [
  ...Array.from({ length: 8 }, (_, idx) => {
    const value = (idx + 2).toString()
    return { label: value, value }
  }),
  { label: '10', value: '10' },
  { label: '10+', value: '12' },
]

const budgetOptions = [
  { label: '₹10k - ₹30k', value: '30000' },
  { label: '₹30k - ₹50k', value: '50000' },
  { label: '₹50k - ₹80k', value: '80000' },
  { label: '₹80k - ₹1.5L', value: '150000' },
  { label: '₹1.5L+', value: '200000' },
]

const hotelOptions = [
  { label: '3★ Comfort', value: 'Budget' },
  { label: '4★ Premium', value: 'Mid-Range' },
  { label: '5★ Luxury', value: 'Luxury' },
]

const travelerOptions = [
  { label: 'Solo', value: 'solo' },
  { label: 'Family', value: 'family' },
  { label: 'Couple', value: 'couple' },
  { label: 'Friends', value: 'friends' },
]

const isTripInfoComplete = (info: TripInfo) =>
  Boolean(
    info.destination &&
      info.travelDate &&
      info.days &&
      info.budget &&
      info.hotelType &&
      info.travelType
  )

const formatISODate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const monthMap = monthNames.reduce<Record<string, number>>((acc, name, idx) => {
  acc[name] = idx + 1
  return acc
}, {})

const parseFlexibleDate = (text: string) => {
  const normalized = text.toLowerCase().trim()
  const ordinalPattern =
    /(\d{1,2})(?:st|nd|rd|th)?\s*(?:of)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/
  const monthFirstPattern =
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?/

  let match = normalized.match(ordinalPattern)
  if (match) {
    const day = parseInt(match[1], 10)
    const month = monthMap[match[2]]
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear()
    if (month && day <= 31) {
      return formatISODate(new Date(year, month - 1, day))
    }
  }

  match = normalized.match(monthFirstPattern)
  if (match) {
    const month = monthMap[match[1]]
    const day = parseInt(match[2], 10)
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear()
    if (month && day <= 31) {
      return formatISODate(new Date(year, month - 1, day))
    }
  }

  const dashedPattern = /(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{2,4})/
  match = normalized.match(dashedPattern)
  if (match) {
    const first = parseInt(match[1], 10)
    const second = parseInt(match[2], 10)
    let year = parseInt(match[3], 10)
    if (year < 100) year += 2000
    const monthGuess = first > 12 ? second : first
    const dayGuess = first > 12 ? first : second
    if (monthGuess <= 12 && dayGuess <= 31) {
      return formatISODate(new Date(year, monthGuess - 1, dayGuess))
    }
  }

  const parsed = new Date(text)
  if (!isNaN(parsed.getTime())) {
    return formatISODate(parsed)
  }

  return null
}

const getUpcomingDateForMonth = (monthIndex: number) => {
  const today = new Date()
  let year = today.getFullYear()
  if (monthIndex < today.getMonth()) {
    year += 1
  }
  const day = Math.min(today.getDate(), 28) // avoid invalid dates
  return formatISODate(new Date(year, monthIndex, day))
}

const isSameAnswer = (text: string) => {
  const normalized = text.trim().toLowerCase()
  return ['same', 'same as before', 'as before', 'no change', 'unchanged'].includes(
    normalized
  )
}

const normalizeDestination = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const matchesDestination = (packageName: string, destination: string) => {
  if (!destination) return false
  const pkg = normalizeDestination(packageName)
  const dest = normalizeDestination(destination)
  return pkg.includes(dest) || dest.includes(pkg)
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  packageMatch?: DestinationPackage
}

interface ConversationAgentProps {
  formData: any
  setFormData: any
  onTripDetailsRequest?: () => void
}

interface TripInfo {
  destination: string
  travelDate: string
  days: string
  budget: string
  hotelType: string
  preferences: string[]
  travelType: string // solo, family, couple, friends
}

export default function ConversationAgent({ formData, setFormData, onTripDetailsRequest }: ConversationAgentProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(0)
  const [tripInfo, setTripInfo] = useState<TripInfo>({
    destination: '',
    travelDate: '',
    days: '',
    budget: '',
    hotelType: '',
    preferences: [],
    travelType: '',
  })
  const [userFeedback, setUserFeedback] = useState<string>('')
  const [currentQuestion, setCurrentQuestion] = useState<string>('destination')
  const [feedbackAnswered, setFeedbackAnswered] = useState(false)
  const [aiResponseComplete, setAiResponseComplete] = useState(false)
  const [firestorePackages, setFirestorePackages] = useState<DestinationPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [destinations, setDestinations] = useState<Array<{ id?: string; name: string; slug?: string }>>([])
  const [destinationsLoading, setDestinationsLoading] = useState(true)
  const [destinationDayOptions, setDestinationDayOptions] = useState<Array<{ label: string; value: string }>>([])
  const [destinationHotelOptions, setDestinationHotelOptions] = useState<Array<{ label: string; value: string }>>([])
  const [destinationTravelTypeOptions, setDestinationTravelTypeOptions] = useState<Array<{ label: string; value: string }>>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const tripDetailsAutoOpenedRef = useRef(false)
  const messagesRef = useRef<Message[]>([])
  const todayISO = useMemo(() => formatISODate(new Date()), [])
  const initialPromptSentRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Fetch destinations from Firestore on component mount
  useEffect(() => {
    const fetchDestinationsFromFirestore = async () => {
      if (typeof window === 'undefined' || !db) {
        setDestinationsLoading(false)
        return
      }

      try {
        setDestinationsLoading(true)
        const destinationsRef = collection(db, 'destinations')
        const querySnapshot = await getDocs(destinationsRef)
        const destinationsData: Array<{ id?: string; name: string; slug?: string }> = []
        
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.name) {
            destinationsData.push({ 
              id: doc.id, 
              name: data.name,
              slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-')
            })
          }
        })
        
        setDestinations(destinationsData)
        console.log(`✅ Loaded ${destinationsData.length} destinations from Firestore`)
      } catch (error) {
        console.error('Error fetching destinations from Firestore:', error)
      } finally {
        setDestinationsLoading(false)
      }
    }

    fetchDestinationsFromFirestore()
  }, [])

  // Fetch packages from Firestore on component mount
  useEffect(() => {
    const fetchPackagesFromFirestore = async () => {
      if (typeof window === 'undefined' || !db) {
        setPackagesLoading(false)
        return
      }

      try {
        setPackagesLoading(true)
        const packagesRef = collection(db, 'packages')
        const querySnapshot = await getDocs(packagesRef)
        const packagesData: DestinationPackage[] = []
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as DestinationPackage
          packagesData.push({ id: doc.id, ...data })
        })
        
        setFirestorePackages(packagesData)
        console.log(`✅ Loaded ${packagesData.length} packages from Firestore`)
      } catch (error) {
        console.error('Error fetching packages from Firestore:', error)
      } finally {
        setPackagesLoading(false)
      }
    }

    fetchPackagesFromFirestore()
  }, [])

  // Update day options and hotel options based on selected destination
  useEffect(() => {
    if (!tripInfo.destination || firestorePackages.length === 0) {
      setDestinationDayOptions([])
      setDestinationHotelOptions([])
      setDestinationTravelTypeOptions([])
      return
    }

    // Find packages for the selected destination
    const normalizedDestination = normalizeDestination(tripInfo.destination)
    const destinationPackages = firestorePackages.filter((pkg) => {
      const pkgName = normalizeDestination(pkg.Destination_Name || '')
      return pkgName.includes(normalizedDestination) || normalizedDestination.includes(pkgName)
    })

    // Extract unique duration days from packages
    const daySet = new Set<number>()
    destinationPackages.forEach((pkg) => {
      // Try Duration_Days first, then Duration_Nights, then parse Duration string
      if (pkg.Duration_Days) {
        daySet.add(pkg.Duration_Days)
      } else if (pkg.Duration_Nights) {
        daySet.add(pkg.Duration_Nights + 1) // Nights + 1 = Days
      } else if (pkg.Duration) {
        // Parse duration string like "5 Nights / 6 Days" or "6 Days"
        const durationMatch = pkg.Duration.match(/(\d+)\s*(?:Days|days|Day|day)/i)
        if (durationMatch) {
          daySet.add(parseInt(durationMatch[1], 10))
        } else {
          const nightsMatch = pkg.Duration.match(/(\d+)\s*(?:Nights|nights|Night|night)/i)
          if (nightsMatch) {
            daySet.add(parseInt(nightsMatch[1], 10) + 1)
          }
        }
      }
    })

    // Convert to sorted array and create options
    const sortedDays = Array.from(daySet).sort((a, b) => a - b)
    const dayOptionsForDestination = sortedDays.map((days) => ({
      label: days.toString(),
      value: days.toString(),
    }))

    // Extract unique hotel types (Star_Category) from packages
    const hotelTypeSet = new Set<string>()
    destinationPackages.forEach((pkg) => {
      if (pkg.Star_Category) {
        // Extract star rating from Star_Category (e.g., "3 Star", "4 Star", "5 Star", "3★", etc.)
        const starMatch = pkg.Star_Category.match(/(\d+)\s*(?:Star|star|★)/i)
        if (starMatch) {
          const starValue = starMatch[1]
          hotelTypeSet.add(starValue)
        } else if (pkg.Star_Category.includes('3') || pkg.Star_Category.toLowerCase().includes('budget')) {
          hotelTypeSet.add('3')
        } else if (pkg.Star_Category.includes('4') || pkg.Star_Category.toLowerCase().includes('mid')) {
          hotelTypeSet.add('4')
        } else if (pkg.Star_Category.includes('5') || pkg.Star_Category.toLowerCase().includes('luxury')) {
          hotelTypeSet.add('5')
        }
      }
    })

    // Convert to sorted array and create hotel options with proper labels
    const sortedStars = Array.from(hotelTypeSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    const hotelOptionsForDestination = sortedStars.map((star) => {
      const starNum = parseInt(star, 10)
      let label = ''
      let value = ''
      
      if (starNum === 3) {
        label = '3★ Comfort'
        value = 'Budget'
      } else if (starNum === 4) {
        label = '4★ Premium'
        value = 'Mid-Range'
      } else if (starNum === 5) {
        label = '5★ Luxury'
        value = 'Luxury'
      } else {
        label = `${star}★`
        value = starNum <= 3 ? 'Budget' : starNum === 4 ? 'Mid-Range' : 'Luxury'
      }
      
      return { label, value }
    })

    // Update state
    if (dayOptionsForDestination.length > 0) {
      setDestinationDayOptions(dayOptionsForDestination)
    } else {
      setDestinationDayOptions([])
    }

    if (hotelOptionsForDestination.length > 0) {
      setDestinationHotelOptions(hotelOptionsForDestination)
    } else {
      setDestinationHotelOptions([])
    }

    // Extract unique travel types from packages
    const travelTypeMap = new Map<string, string>() // value -> label
    destinationPackages.forEach((pkg) => {
      if (pkg.Travel_Type) {
        const travelType = pkg.Travel_Type.toLowerCase().trim()
        
        // Map various travel type formats to standard values
        if (travelType.includes('solo') || travelType.includes('single')) {
          travelTypeMap.set('solo', 'Solo')
        } else if (travelType.includes('family') || travelType.includes('families')) {
          travelTypeMap.set('family', 'Family')
        } else if (travelType.includes('couple') || travelType.includes('couples') || travelType.includes('romantic')) {
          travelTypeMap.set('couple', 'Couple')
        } else if (travelType.includes('friend') || travelType.includes('group') || travelType.includes('friends')) {
          travelTypeMap.set('friends', 'Friends')
        }
      }
      
      // Also check Group_Size field if available
      if (pkg.Group_Size) {
        const groupSize = pkg.Group_Size.toLowerCase().trim()
        if (groupSize.includes('solo') || groupSize.includes('single') || groupSize === '1') {
          travelTypeMap.set('solo', 'Solo')
        } else if (groupSize.includes('family') || groupSize.includes('families')) {
          travelTypeMap.set('family', 'Family')
        } else if (groupSize.includes('couple') || groupSize === '2') {
          travelTypeMap.set('couple', 'Couple')
        } else if (groupSize.includes('group') || groupSize.includes('friend')) {
          travelTypeMap.set('friends', 'Friends')
        }
      }
    })

    // Convert to array with proper order (solo, couple, family, friends)
    const travelTypeOptionsForDestination: Array<{ label: string; value: string }> = []
    const order = ['solo', 'couple', 'family', 'friends']
    order.forEach((value) => {
      if (travelTypeMap.has(value)) {
        travelTypeOptionsForDestination.push({
          label: travelTypeMap.get(value)!,
          value: value,
        })
      }
    })

    // Update travel type options
    if (travelTypeOptionsForDestination.length > 0) {
      setDestinationTravelTypeOptions(travelTypeOptionsForDestination)
    } else {
      setDestinationTravelTypeOptions([])
    }
  }, [tripInfo.destination, firestorePackages])

  // Combine Firestore packages with JSON packages (remove duplicates by Destination_ID)
  const allPackages = useMemo(() => {
    const combined: DestinationPackage[] = []
    const seenIds = new Set<string>()
    
    // First, add Firestore packages (priority)
    firestorePackages.forEach((pkg) => {
      const id = pkg.Destination_ID || pkg.id
      if (id && !seenIds.has(id)) {
        seenIds.add(id)
        combined.push(pkg)
      }
    })
    
    // Then, add JSON packages that don't exist in Firestore
    destinationPackages.forEach((pkg) => {
      const id = pkg.Destination_ID
      if (id && !seenIds.has(id)) {
        seenIds.add(id)
        combined.push(pkg)
      }
    })
    
    return combined
  }, [firestorePackages])

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      const updated = [...prev, message]
      messagesRef.current = updated
      return updated
    })
  }, [])

  const sendAssistantPrompt = useCallback(
    async (prompt: string, extra: Partial<Message> = {}) => {
      setIsTyping(true)
      try {
        const response = await fetch('/api/ai-planner/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            conversation: messagesRef.current.slice(-6),
          }),
        })
        const data = await response.json()
        const content = data?.message || prompt
        appendMessage({
          role: 'assistant',
          content,
          ...extra,
        })
      } catch (error) {
        appendMessage({
          role: 'assistant',
          content: prompt,
          ...extra,
        })
      } finally {
        setIsTyping(false)
      }
    },
    [appendMessage]
  )

  useEffect(() => {
    if (initialPromptSentRef.current) return
    initialPromptSentRef.current = true
    sendAssistantPrompt(
      withStyle(
        'Greet them briefly and ask which destination they want to plan.',
        20
      )
    )
  }, [sendAssistantPrompt])

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Calculate progress based on trip info
  useEffect(() => {
    let completed = 0
    if (tripInfo.destination) completed++
    if (tripInfo.travelDate) completed++
    if (tripInfo.days) completed++
    if (tripInfo.hotelType) completed++
    if (tripInfo.travelType) completed++
    setProgress((completed / TOTAL_STEPS) * 100)
    setCompletedSteps(completed)
    
    // Update form data
    setFormData({
      destination: tripInfo.destination,
      travelDate: tripInfo.travelDate,
      days: tripInfo.days,
      hotelType: tripInfo.hotelType,
    })
  }, [tripInfo, setFormData])

  // Extract destination from user input
  const extractDestination = (text: string): string | null => {
    const lowerText = text.toLowerCase()
    for (const dest of travelData.destinations) {
      if (lowerText.includes(dest.name.toLowerCase())) {
        return dest.name
      }
    }
    return null
  }

  // Extract number (days or budget)
  const extractNumber = (text: string): string | null => {
    const match = text.match(/\d+/)
    return match ? match[0] : null
  }

  // Extract date
  const extractDate = (text: string): string | null => {
    const directISO = text.match(/\d{4}-\d{2}-\d{2}/)
    if (directISO) {
      return directISO[0]
    }

    return parseFlexibleDate(text)
  }

  // Extract budget range
  const extractBudget = (text: string): string | null => {
    const lowerText = text.toLowerCase()
    const budgetMatch = text.match(/₹?\s*(\d{1,3}(?:,\d{2,3})*(?:,\d{3})*)/)
    if (budgetMatch) {
      return budgetMatch[1].replace(/,/g, '')
    }
    
    // Check for budget keywords
    if (lowerText.includes('budget') || lowerText.includes('cheap') || lowerText.includes('affordable')) {
      return '30000'
    }
    if (lowerText.includes('mid') || lowerText.includes('moderate')) {
      return '50000'
    }
    if (lowerText.includes('luxury') || lowerText.includes('premium') || lowerText.includes('expensive')) {
      return '100000'
    }
    
    return null
  }

  // Extract hotel type
  const extractHotelType = (text: string): string | null => {
    const lowerText = text.toLowerCase().trim()
    // Check exact matches first
    if (lowerText === 'budget' || lowerText === '1' || lowerText.includes('budget')) {
      return 'Budget'
    }
    if (lowerText === 'mid-range' || lowerText === 'mid range' || lowerText === 'midrange' || lowerText === '2' || (lowerText.includes('mid') && lowerText.includes('range'))) {
      return 'Mid-Range'
    }
    if (lowerText === 'luxury' || lowerText === '3' || lowerText.includes('luxury') || lowerText.includes('premium')) {
      return 'Luxury'
    }
    if (lowerText === 'boutique' || lowerText === '4' || lowerText.includes('boutique') || lowerText.includes('unique')) {
      return 'Boutique'
    }
    // Fallback checks
    if (lowerText.includes('cheap') || lowerText.includes('hostel') || lowerText.includes('economy')) {
      return 'Budget'
    }
    if (lowerText.includes('moderate') || lowerText.includes('standard')) {
      return 'Mid-Range'
    }
    if (lowerText.includes('5 star') || lowerText.includes('five star')) {
      return 'Luxury'
    }
    return null
  }

  // Extract travel type
  const extractTravelType = (text: string): string | null => {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('solo') || lowerText.includes('alone') || lowerText.includes('myself')) {
      return 'solo'
    }
    if (lowerText.includes('family') || lowerText.includes('kids') || lowerText.includes('children')) {
      return 'family'
    }
    if (lowerText.includes('couple') || lowerText.includes('romantic') || lowerText.includes('honeymoon')) {
      return 'couple'
    }
    if (lowerText.includes('friends') || lowerText.includes('group')) {
      return 'friends'
    }
    return null
  }

  // Ask next question based on current state - use ref to get latest state
  const tripInfoRef = useRef(tripInfo)
  useEffect(() => {
    tripInfoRef.current = tripInfo
  }, [tripInfo])

  const updateTripInfo = useCallback((updates: Partial<TripInfo>) => {
    const next = { ...tripInfoRef.current, ...updates }
    tripInfoRef.current = next
    setTripInfo(next)
    return next
  }, [])

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .trim()

  const extractDaysFromDuration = (duration: string) => {
    const match = duration.match(/(\d+)\s*Days?/i)
    if (match) return parseInt(match[1], 10)
    const nightsMatch = duration.match(/(\d+)\s*Nights?/i)
    if (nightsMatch) return parseInt(nightsMatch[1], 10) + 1
    return null
  }

  const getBudgetCategory = (budget: string, hotelType: string) => {
    const sanitized = budget.replace(/,/g, '')
    const amount = parseInt(sanitized, 10)
    if (!isNaN(amount)) {
      if (amount < 60000) return 'Economy'
      if (amount < 100000) return 'Mid'
      if (amount < 140000) return 'Premium'
      return 'Luxury'
    }
    switch (hotelType) {
      case 'Budget':
        return 'Economy'
      case 'Mid-Range':
        return 'Mid'
      case 'Luxury':
        return 'Luxury'
      case 'Boutique':
        return 'Premium'
      default:
        return 'Mid'
    }
  }

  // Search packages based on feedback keywords
  const searchPackageByFeedback = (pkg: DestinationPackage, feedback: string): number => {
    if (!feedback || feedback.trim() === '') return 0
    
    const feedbackLower = feedback.toLowerCase()
    const searchFields = [
      pkg.Overview || '',
      pkg.Inclusions || '',
      pkg.Theme || '',
      pkg.Mood || '',
      pkg.Adventure_Level || '',
      pkg.Stay_Type || '',
      pkg.Day_Wise_Itinerary || '',
      pkg.Ideal_Traveler_Persona || '',
    ]
    
    const allText = searchFields.join(' ').toLowerCase()
    const keywords = feedbackLower.split(/\s+/).filter(k => k.length > 2) // Filter out short words
    
    let matchCount = 0
    keywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        matchCount++
      }
    })
    
    // Return score based on how many keywords matched
    if (matchCount === 0) return 0
    if (matchCount === keywords.length) return 15 // All keywords matched - high priority
    return (matchCount / keywords.length) * 10 // Partial match
  }

  const scorePackage = (pkg: DestinationPackage, info: TripInfo) => {
    let score = 0
    
    // Base score for destination match (required)
    if (info.destination) {
      const target = normalize(info.destination)
      if (
        normalize(pkg.Destination_Name).includes(target) ||
        target.includes(normalize(pkg.Destination_Name))
      ) {
        score += 10 // Base score for matching destination
      } else {
        return 0 // Must match destination
      }
    }
    
    // Feedback matching (only boost if package already matches basic criteria)
    if (userFeedback && userFeedback.trim() !== '') {
      const feedbackScore = searchPackageByFeedback(pkg, userFeedback)
      // Only add feedback boost if package matches duration (within 2 days) and travel type
      const requestedDays = parseInt(info.days, 10)
      let pkgDays = null
      if ((pkg as any).Duration_Days) {
        pkgDays = (pkg as any).Duration_Days
      } else {
        pkgDays = extractDaysFromDuration(pkg.Duration)
      }
      const daysMatch = !isNaN(requestedDays) && pkgDays && Math.abs(pkgDays - requestedDays) <= 2
      const travelMatch = info.travelType && pkg.Travel_Type && 
        (pkg.Travel_Type.toLowerCase().includes(info.travelType.toLowerCase()) || 
         info.travelType.toLowerCase().includes(pkg.Travel_Type.toLowerCase().split(' / ')[0]))
      
      // Only boost if package matches basic criteria
      if (daysMatch && travelMatch && feedbackScore > 0) {
        score += feedbackScore * 0.5 // Reduced weight - only 50% of feedback score
      }
    }
    
    // Travel type matching (high priority)
    if (info.travelType && pkg.Travel_Type) {
      const pkgTravelType = pkg.Travel_Type.toLowerCase()
      const userTravelType = info.travelType.toLowerCase()
      
      // Exact match
      if (pkgTravelType === userTravelType) {
        score += 12 // High priority for exact match
      }
      // Partial match (e.g., "Couple / Solo" contains "couple", or "Friends / Solo" contains "solo")
      else if (pkgTravelType.includes(userTravelType)) {
        score += 10 // Good match if it's in the list
      }
      // Check if any part of the package travel type matches
      else if (pkgTravelType.includes(' / ')) {
        const pkgTypes = pkgTravelType.split(' / ').map(t => t.trim())
        if (pkgTypes.some(t => t === userTravelType || userTravelType.includes(t))) {
          score += 10
        }
      } else {
        // No match - significant penalty
        score -= 8 // Penalize packages that don't match travel type
      }
    }
    
    // Duration matching (high priority - use Duration_Days if available)
    const requestedDays = parseInt(info.days, 10)
    let pkgDays = null
    
    // Try to use Duration_Days field first (more accurate)
    if ((pkg as any).Duration_Days) {
      pkgDays = (pkg as any).Duration_Days
    } else {
      pkgDays = extractDaysFromDuration(pkg.Duration)
    }
    
    if (!isNaN(requestedDays) && pkgDays) {
      const diff = Math.abs(pkgDays - requestedDays)
      if (diff === 0) {
        score += 20 // Exact duration match - CRITICAL priority
      } else if (diff === 1) {
        score += 10 // Very close (1 day off) - good but not as good as exact
      } else if (diff === 2) {
        score += 4 // Close (2 days off) - acceptable
      } else if (diff === 3) {
        score += 1 // Somewhat close (3 days off) - less ideal
      }
      // No points for diff > 3 - too far off
    }
    
    // Hotel type matching (high priority)
    if (info.hotelType && pkg.Star_Category) {
      const starHint = info.hotelType.includes('Luxury') || info.hotelType.includes('5')
        ? '5'
        : info.hotelType.includes('Budget') || info.hotelType.includes('3')
        ? '3'
        : '4'
      
      if (pkg.Star_Category.includes(starHint)) {
        score += 10 // Exact hotel type match
      } else {
        // Penalize mismatches
        const pkgStar = pkg.Star_Category.includes('5') ? '5' : pkg.Star_Category.includes('3') ? '3' : '4'
        if (starHint === '4' && pkgStar === '5') {
          score += 5 // User wants 4-star, got 5-star (upgrade is acceptable but not ideal)
        } else if (starHint === '4' && pkgStar === '3') {
          score -= 5 // User wants 4-star, got 3-star (downgrade is not ideal)
        } else if (starHint === '5' && pkgStar === '4') {
          score -= 3 // User wants 5-star, got 4-star (downgrade)
        }
      }
    }
    
    return score
  }

  const destinationSpecificPackages = useMemo(() => {
    if (!tripInfo.destination) return []
    return allPackages.filter((pkg: DestinationPackage) =>
      matchesDestination(pkg.Destination_Name, tripInfo.destination)
    )
  }, [tripInfo.destination, allPackages])

  const rankedPackages = useMemo(() => {
    if (!tripInfo.destination || destinationSpecificPackages.length === 0) return []
    
    const scored = destinationSpecificPackages
      .map((pkg: DestinationPackage) => ({ pkg, score: scorePackage(pkg, tripInfo) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        const requestedDays = parseInt(tripInfo.days, 10)
        const aDays = !isNaN(requestedDays) ? ((a.pkg as any).Duration_Days || extractDaysFromDuration(a.pkg.Duration) || 0) : 0
        const bDays = !isNaN(requestedDays) ? ((b.pkg as any).Duration_Days || extractDaysFromDuration(b.pkg.Duration) || 0) : 0
        const aDiff = !isNaN(requestedDays) ? Math.abs(aDays - requestedDays) : 999
        const bDiff = !isNaN(requestedDays) ? Math.abs(bDays - requestedDays) : 999
        
        // FIRST: Prioritize exact duration matches (most important)
        if (aDiff === 0 && bDiff !== 0) return -1 // a is exact match, b is not
        if (bDiff === 0 && aDiff !== 0) return 1  // b is exact match, a is not
        
        // SECOND: If both are close (within 1 day), then consider feedback as tiebreaker
        if (userFeedback && userFeedback.trim() !== '' && aDiff <= 1 && bDiff <= 1) {
          const aFeedbackScore = searchPackageByFeedback(a.pkg, userFeedback)
          const bFeedbackScore = searchPackageByFeedback(b.pkg, userFeedback)
          // Only use feedback to break ties when duration is similar
          if (aFeedbackScore > 0 && bFeedbackScore === 0) return -1 // a matches feedback, b doesn't
          if (bFeedbackScore > 0 && aFeedbackScore === 0) return 1  // b matches feedback, a doesn't
          if (aFeedbackScore !== bFeedbackScore) return bFeedbackScore - aFeedbackScore // Higher feedback score first
        }
        
        // THIRD: Sort by total score (includes all factors including feedback boost)
        if (b.score !== a.score) {
          return b.score - a.score
        }
        
        // FOURTH: If scores are equal, prefer closer duration match
        if (aDiff !== bDiff) {
          return aDiff - bDiff
        }
        
        // FOURTH: Prefer packages that match hotel type exactly
        const hotelMatch = tripInfo.hotelType?.includes('4') ? '4' : tripInfo.hotelType?.includes('5') ? '5' : '3'
        const aHotelMatch = a.pkg.Star_Category?.includes(hotelMatch)
        const bHotelMatch = b.pkg.Star_Category?.includes(hotelMatch)
        
        if (aHotelMatch !== bHotelMatch) {
          return aHotelMatch ? -1 : 1
        }
        
        // FIFTH: Prefer packages that match travel type exactly
        const userTravelType = tripInfo.travelType?.toLowerCase()
        const aTravelMatch = userTravelType && a.pkg.Travel_Type?.toLowerCase() === userTravelType
        const bTravelMatch = userTravelType && b.pkg.Travel_Type?.toLowerCase() === userTravelType
        
        if (aTravelMatch !== bTravelMatch) {
          return aTravelMatch ? -1 : 1
        }
        
        return 0
      })
    
    // Debug logging
    console.log('📊 Package Ranking for:', {
      destination: tripInfo.destination,
      days: tripInfo.days,
      hotelType: tripInfo.hotelType,
      travelType: tripInfo.travelType
    })
    scored.slice(0, 5).forEach(({ pkg, score }, idx) => {
      const pkgDays = (pkg as any).Duration_Days || extractDaysFromDuration(pkg.Duration)
      console.log(`  ${idx + 1}. ${pkg.Destination_Name} (${pkg.Duration}) - Score: ${score}`, {
        travelType: pkg.Travel_Type,
        hotelType: pkg.Star_Category,
        days: pkgDays,
        matches: {
          travelType: tripInfo.travelType && pkg.Travel_Type?.toLowerCase().includes(tripInfo.travelType.toLowerCase()),
          hotelType: tripInfo.hotelType && pkg.Star_Category?.includes(tripInfo.hotelType.includes('4') ? '4' : tripInfo.hotelType.includes('5') ? '5' : '3'),
          days: tripInfo.days && Math.abs((pkgDays || 0) - parseInt(tripInfo.days, 10)) <= 2
        }
      })
    })
    
    return scored
  }, [destinationSpecificPackages, tripInfo, userFeedback])

  const suggestedPackages = rankedPackages.slice(0, 2).map(({ pkg }) => pkg)
  const showPackageSuggestions = Boolean(
    currentQuestion === 'complete' && suggestedPackages.length > 0 && aiResponseComplete
  )

  useEffect(() => {
    if (showPackageSuggestions && !tripDetailsAutoOpenedRef.current) {
      tripDetailsAutoOpenedRef.current = true
      onTripDetailsRequest?.()
    }
  }, [showPackageSuggestions, onTripDetailsRequest])

  const generateRecommendation = useCallback(async () => {
    const currentInfo = tripInfoRef.current
    const bestMatch = rankedPackages[0]?.pkg

    // Reset the flag before sending AI response
    setAiResponseComplete(false)

    if (!bestMatch) {
      if (currentInfo.destination) {
        await sendAssistantPrompt(
          `Explain that you couldn't find a curated package in the database for ${currentInfo.destination} yet, but you'll pass their preferences to a human expert. Encourage them to review Trip Details or try another destination.`
        )
      } else {
        await sendAssistantPrompt(
          'Let the traveler know you could not find an exact package match but will have a human expert follow up shortly.'
        )
      }
      // Mark AI response as complete even if no package found
      setAiResponseComplete(true)
      return
    }

    const prompt = withStyle(
      `Summarize why the "${bestMatch.Destination_Name}" package (${bestMatch.Duration}, ${bestMatch.Price_Range_INR}) fits their ${currentInfo.travelType} trip to ${currentInfo.destination}. Include 2 short bullet highlights from this overview: ${bestMatch.Overview} and inclusions: ${bestMatch.Inclusions}. End by inviting them to review Trip Details.`,
      80
    )

    await sendAssistantPrompt(prompt, { packageMatch: bestMatch })
    
    // Mark AI response as complete after the message is sent
    setAiResponseComplete(true)
    
    if (!tripDetailsAutoOpenedRef.current) {
      tripDetailsAutoOpenedRef.current = true
      onTripDetailsRequest?.()
    }
  }, [onTripDetailsRequest, rankedPackages, sendAssistantPrompt])

  const askNextQuestion = useCallback(
    async (infoOverride?: TripInfo) => {
      if (currentQuestion === 'complete') return
      const currentInfo = infoOverride ?? tripInfoRef.current
    let questionPrompt = ''

    if (!currentInfo.destination) {
      questionPrompt = withStyle(
        'Greet them briefly and ask which destination they want to plan.',
        20
      )
      setCurrentQuestion('destination')
    } else if (!currentInfo.travelDate) {
      questionPrompt = withStyle(
        `Thank them for choosing ${currentInfo.destination} and ask when they plan to travel. Mention they can share a month or exact date.`,
        32
      )
      setCurrentQuestion('date')
    } else if (!currentInfo.days) {
      questionPrompt = withStyle(
        `Acknowledge their travel date and ask how many days they want in ${currentInfo.destination}. Mention they can tap a quick option.`,
        30
      )
      setCurrentQuestion('days')
    } else if (!currentInfo.hotelType) {
      questionPrompt = withStyle(
        'Thank them and ask which stay style they prefer: 3-star, 4-star, or 5-star.',
        25
      )
      setCurrentQuestion('hotel')
    } else if (!currentInfo.travelType) {
      questionPrompt = withStyle(
        'Acknowledge their stay preference and ask who they are travelling with: solo, family, couple, or friends.',
        26
      )
      setCurrentQuestion('travelType')
    } else if (!feedbackAnswered) {
      questionPrompt = withStyle(
        'Thank them for sharing their preferences. Ask if they have any specific questions, suggestions, or things they want to include in their trip (like spa, yoga, adventure activities, etc.). Mention they can skip if they want.',
        35
      )
      setCurrentQuestion('feedback')
    } else {
      await generateRecommendation()
      setCurrentQuestion('complete')
      return
    }

    await sendAssistantPrompt(questionPrompt)
  },
  [currentQuestion, generateRecommendation, sendAssistantPrompt]
  )

  const handleSend = useCallback(async () => {
    if (!input.trim()) return
    
    // If we're on feedback question and feedback was already answered, don't process again
    if (currentQuestion === 'feedback' && feedbackAnswered) {
      return
    }
    
    const userInput = input.trim()
    setInput('')

    appendMessage({ role: 'user', content: userInput })

    const latestInfo = tripInfoRef.current

    if (!latestInfo.destination) {
      const dest = extractDestination(userInput)
      if (dest) {
        updateTripInfo({ destination: dest })
        const destInfo = travelData.destinations.find((d: any) => d.name === dest)
        const prompt = withStyle(
          `Great choice! When do you plan to travel—any specific month or date in mind?`,
          20
        )
        await sendAssistantPrompt(prompt)
        setCurrentQuestion('date')
        return
      }
    }

    if (currentQuestion === 'date') {
      if (isSameAnswer(userInput) && latestInfo.travelDate) {
        await askNextQuestion()
        return
      }
      const date = extractDate(userInput)
      if (date) {
        const nextInfo = updateTripInfo({ travelDate: date })
        await askNextQuestion(nextInfo)
        return
      }
    }

    if (currentQuestion === 'days') {
      if (isSameAnswer(userInput) && latestInfo.days) {
        await askNextQuestion()
        return
      }
      const days = extractNumber(userInput)
      if (days) {
        const nextInfo = updateTripInfo({ days })
        await askNextQuestion(nextInfo)
        return
      }
    }

    if (currentQuestion === 'hotel') {
      if (isSameAnswer(userInput) && latestInfo.hotelType) {
        await askNextQuestion()
        return
      }
      const hotelType = extractHotelType(userInput)
      if (hotelType) {
        const nextInfo = updateTripInfo({ hotelType })
        await askNextQuestion(nextInfo)
        return
      }
    }

    if (currentQuestion === 'travelType') {
      if (isSameAnswer(userInput) && latestInfo.travelType) {
        await askNextQuestion()
        return
      }
      const travelType = extractTravelType(userInput)
      if (travelType) {
        const nextInfo = updateTripInfo({ travelType })
        await askNextQuestion(nextInfo)
        return
      }
    }

    if (currentQuestion === 'feedback') {
      // Prevent duplicate processing - if feedback was already answered, skip
      if (feedbackAnswered) {
        return
      }
      // User can skip or provide feedback
      if (userInput.toLowerCase().includes('skip') || userInput.toLowerCase().trim() === '') {
        setUserFeedback('')
        setFeedbackAnswered(true)
        setAiResponseComplete(false) // Reset before generating recommendation
        setCurrentQuestion('complete')
        // Don't append message again if it was already appended by the input handler
        if (!messagesRef.current.some(m => m.role === 'user' && m.content === 'Skipped')) {
          appendMessage({ role: 'user', content: 'Skipped' })
        }
        // Directly generate recommendation instead of calling askNextQuestion
        await generateRecommendation()
        return
      } else {
        // Store feedback and search packages
        const feedback = userInput.trim()
        setUserFeedback(feedback)
        setFeedbackAnswered(true)
        setAiResponseComplete(false) // Reset before generating recommendation
        setCurrentQuestion('complete')
        // Don't append message again if it was already appended by the input handler
        if (!messagesRef.current.some(m => m.role === 'user' && m.content === feedback)) {
          appendMessage({ role: 'user', content: feedback })
        }
        // Directly generate recommendation instead of calling askNextQuestion
        await generateRecommendation()
        return
      }
    }

    const fallbackMap: Record<string, string> = {
      destination:
        'Let them know you still need to know where they want to go and offer a couple of popular examples.',
      date: 'Kindly remind them you still need their travel dates and that a month is enough.',
      days: 'Let them know the trip length helps shape the plan and ask again for number of days.',
      budget:
        'Explain that even a rough budget helps you recommend the right experiences and ask for an amount or band.',
      hotel:
        'Ask again about preferred stay style (Budget, Mid-Range, Luxury, Boutique) and explain why it matters.',
      travelType:
        'Remind them you can personalize better if you know whether they are traveling solo, as a couple, with family, or friends.',
    }

    const fallbackPrompt = withStyle(
      fallbackMap[currentQuestion] ||
        'Acknowledge their message and let them know you are ready for the required detail.',
      28
    )
    await sendAssistantPrompt(fallbackPrompt)
  }, [
    appendMessage,
    askNextQuestion,
    currentQuestion,
    feedbackAnswered,
    generateRecommendation,
    extractBudget,
    extractDate,
    extractDestination,
    extractHotelType,
    extractNumber,
    extractTravelType,
    input,
    sendAssistantPrompt,
    updateTripInfo,
  ])

  const handleDateSelection = useCallback(
    async (isoDate: string) => {
      if (!isoDate) return
      const nextInfo = updateTripInfo({ travelDate: isoDate })
      appendMessage({
        role: 'user',
        content: `Travel date selected: ${new Date(isoDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
      })
      await askNextQuestion(nextInfo)
    },
    [appendMessage, askNextQuestion, updateTripInfo]
  )
  const selectedMonthIndex = useMemo(() => {
    if (!tripInfo.travelDate) return null
    const parsed = new Date(tripInfo.travelDate)
    return isNaN(parsed.getTime()) ? null : parsed.getMonth()
  }, [tripInfo.travelDate])

  const handleMonthSelect = useCallback(
    (monthIndex: number) => {
      const iso = getUpcomingDateForMonth(monthIndex)
      handleDateSelection(iso)
    },
    [handleDateSelection]
  )

  const handleCalendarInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      if (value) {
        handleDateSelection(value)
      }
    },
    [handleDateSelection]
  )
  const handleDaySelect = useCallback(
    async (label: string, daysValue: string) => {
      const nextInfo = updateTripInfo({ days: daysValue })
      appendMessage({ role: 'user', content: `Trip length: ${label} days` })
      await askNextQuestion(nextInfo)
    },
    [appendMessage, askNextQuestion, updateTripInfo]
  )


  const handleHotelSelect = useCallback(
    async (label: string, mappedType: string) => {
      const nextInfo = updateTripInfo({ hotelType: mappedType })
      appendMessage({ role: 'user', content: `Preferred stay: ${label}` })
      await askNextQuestion(nextInfo)
    },
    [appendMessage, askNextQuestion, updateTripInfo]
  )

  const handleTravelTypeSelect = useCallback(
    async (label: string, travelType: string) => {
      const nextInfo = updateTripInfo({ travelType })
      appendMessage({ role: 'user', content: `Travelling with: ${label}` })
      await askNextQuestion(nextInfo)
    },
    [appendMessage, askNextQuestion, updateTripInfo]
  )

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden relative">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none"></div>
      
      {/* Progress Bar */}
      <div className="px-6 pt-6 sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-900">AI Trip Planner</p>
              <p className="text-xs text-gray-500">
                Step {Math.min(completedSteps + 1, TOTAL_STEPS)} of {TOTAL_STEPS} • {Math.round(progress)}% complete
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 h-full transition-all duration-500 rounded-full relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="h-[500px] overflow-y-auto p-6 space-y-4 relative z-10"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            )}
            {message.role === 'assistant' && message.packageMatch ? (
              <div className="max-w-[80%] rounded-2xl px-5 py-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 text-gray-800 shadow-sm">
                <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
              </div>
            ) : (
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                    : 'bg-gray-50 border border-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
              </div>
            )}
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Suggestions - Only show at start */}
      {messages.length <= 2 && !tripInfo.destination && (
        <div className="px-6 pb-4 relative z-10">
          <p className="text-xs text-gray-500 mb-3 font-medium">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {destinationsLoading ? (
              <div className="text-xs text-gray-400">Loading destinations...</div>
            ) : destinations.length > 0 ? (
              destinations.slice(0, 6).map((dest) => (
                <button
                  key={dest.id || dest.name}
                  onClick={async () => {
                    const suggestion = `I want to visit ${dest.name}`
                    setInput(suggestion)
                    await new Promise(resolve => setTimeout(resolve, 100))
                    await handleSend()
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-full text-sm text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  I want to visit {dest.name}
                </button>
              ))
            ) : (
              <button
                onClick={async () => {
                  const suggestion = 'I want to visit Bali'
                  setInput(suggestion)
                  await new Promise(resolve => setTimeout(resolve, 100))
                  await handleSend()
                }}
                className="px-4 py-2 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-full text-sm text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                I want to visit Bali
              </button>
            )}
          </div>
        </div>
      )}

      {/* Date Picker Helper */}
      {currentQuestion === 'date' && (
        <div className="border-t border-gray-200 bg-gradient-to-br from-purple-50/30 to-indigo-50/30 px-6 py-6 relative z-10">
          <p className="text-sm text-gray-800 mb-4">Select your travel month</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {getNextSixMonths().map(({ name, index }) => {
              const isSelected = selectedMonthIndex === index
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleMonthSelect(index)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-xs capitalize transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-lg shadow-purple-500/30'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50 shadow-sm'
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              )
            })}
          </div>
          <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-200">
            <label className="text-xs text-gray-600 mb-2 block">
              Or pick an exact date
            </label>
            <input
              type="date"
              min={todayISO}
              value={tripInfo.travelDate || ''}
              onChange={handleCalendarInputChange}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            <p className="text-xs text-gray-500 mt-2">
              We'll note this immediately and move to the next step.
            </p>
          </div>
        </div>
      )}

      {/* Day Count Selector */}
      {currentQuestion === 'days' && (
        <div className="border-t border-gray-200 bg-gradient-to-br from-purple-50/30 to-indigo-50/30 px-6 py-6 relative z-10">
          <p className="text-sm text-gray-800 mb-4">
            {destinationDayOptions.length > 0 
              ? `Great choice! How many days are you planning to spend in ${tripInfo.destination}? You can tap a quick option if you'd like!`
              : `How many days are you planning to spend in ${tripInfo.destination}?`
            }
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(destinationDayOptions.length > 0 ? destinationDayOptions : dayOptions).map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleDaySelect(option.label, option.value)}
                className={`rounded-xl border-2 bg-white px-3 py-3 text-sm transition-all duration-200 shadow-sm ${
                  destinationDayOptions.length > 0 && destinationDayOptions.some(opt => opt.value === option.value)
                    ? 'border-purple-500 text-purple-700 hover:bg-purple-50 hover:shadow-md font-semibold'
                    : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:shadow-md'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {destinationDayOptions.length > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              💡 These options are based on our best packages for {tripInfo.destination}
            </p>
          )}
        </div>
      )}


      {/* Hotel Selector */}
      {currentQuestion === 'hotel' && (
        <div className="border-t border-gray-200 bg-gradient-to-br from-purple-50/30 to-indigo-50/30 px-6 py-6 relative z-10">
          <p className="text-sm text-gray-800 mb-4">
            {destinationHotelOptions.length > 0
              ? `Thank you! Exciting times ahead! What stay style do you prefer for ${tripInfo.destination}?`
              : 'What stay style do you prefer: 3-star, 4-star, or 5-star accommodation?'
            }
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(destinationHotelOptions.length > 0 ? destinationHotelOptions : hotelOptions).map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleHotelSelect(option.label, option.value)}
                className={`rounded-2xl border-2 bg-white px-5 py-5 text-left hover:shadow-lg transition-all duration-200 shadow-sm ${
                  destinationHotelOptions.length > 0 && destinationHotelOptions.some(opt => opt.value === option.value)
                    ? 'border-purple-500 hover:border-purple-600 hover:bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <p className={`text-sm mb-1 ${
                  destinationHotelOptions.length > 0 && destinationHotelOptions.some(opt => opt.value === option.value)
                    ? 'text-purple-700 font-semibold'
                    : 'text-gray-900'
                }`}>
                  {option.label}
                </p>
                <p className="text-xs text-gray-500">
                  {option.value === 'Budget'
                    ? 'Cozy 3★ stays'
                    : option.value === 'Mid-Range'
                    ? 'Polished 4★ hotels'
                    : 'Luxury 5★ experience'}
                </p>
              </button>
            ))}
          </div>
          {destinationHotelOptions.length > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              💡 These options are based on our available packages for {tripInfo.destination}
            </p>
          )}
        </div>
      )}

      {/* Travel Type Selector */}
      {currentQuestion === 'travelType' && (
        <div className="border-t border-gray-200 bg-gradient-to-br from-purple-50/30 to-indigo-50/30 px-6 py-6 relative z-10">
          <p className="text-sm text-gray-800 mb-4">
            {destinationTravelTypeOptions.length > 0
              ? `Excellent! A week in ${tripInfo.destination} sounds splendid. Who will you be travelling with?`
              : 'Who are you travelling with?'
            }
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(destinationTravelTypeOptions.length > 0 ? destinationTravelTypeOptions : travelerOptions).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTravelTypeSelect(option.label, option.value)}
                className={`rounded-xl border-2 bg-white px-5 py-4 text-sm transition-all duration-200 shadow-sm ${
                  destinationTravelTypeOptions.length > 0 && destinationTravelTypeOptions.some(opt => opt.value === option.value)
                    ? 'border-purple-500 text-purple-700 hover:border-purple-600 hover:bg-purple-50 hover:shadow-md font-semibold'
                    : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:shadow-md'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {destinationTravelTypeOptions.length > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              💡 These options are based on our available packages for {tripInfo.destination}
            </p>
          )}
        </div>
      )}

      {/* Feedback/Suggestions Input */}
      {currentQuestion === 'feedback' && (
        <div className="border-t border-gray-200 bg-gradient-to-br from-purple-50/30 to-indigo-50/30 px-6 py-6 relative z-10">
          <p className="text-sm text-gray-800 mb-2">Any specific questions or suggestions?</p>
          <p className="text-xs text-gray-500 mb-4">Tell us what you'd like to include (e.g., spa, yoga, adventure, beach activities, etc.)</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (input.trim()) {
                    const feedback = input.trim()
                    setUserFeedback(feedback)
                    setFeedbackAnswered(true)
                    setAiResponseComplete(false) // Reset before generating recommendation
                    setCurrentQuestion('complete')
                    appendMessage({ role: 'user', content: feedback })
                    setInput('')
                    // Directly generate recommendation to avoid asking question again
                    await generateRecommendation()
                  }
                }
              }}
              placeholder="e.g., spa, yoga, adventure activities..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm"
            />
            <button
              type="button"
              onClick={async () => {
                setUserFeedback('')
                setFeedbackAnswered(true)
                setAiResponseComplete(false) // Reset before generating recommendation
                setCurrentQuestion('complete')
                appendMessage({ role: 'user', content: 'Skipped' })
                setInput('')
                // Directly generate recommendation instead of calling askNextQuestion
                await generateRecommendation()
              }}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              Skip
            </button>
            {input.trim() && (
              <button
                type="button"
                onClick={async () => {
                  const feedback = input.trim()
                  setUserFeedback(feedback)
                  setFeedbackAnswered(true)
                  setAiResponseComplete(false) // Reset before generating recommendation
                  setCurrentQuestion('complete')
                  appendMessage({ role: 'user', content: feedback })
                  setInput('')
                  // Directly generate recommendation to avoid asking question again
                  await generateRecommendation()
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                Submit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recommended Packages */}
      {showPackageSuggestions && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-6">
          <div className="relative mb-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-semibold px-3 py-0.5 rounded-b-full shadow">
              Tailored from your answers
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Recommended Packages</p>
              <p className="text-xs text-gray-500">
                Based on your answers for {tripInfo.destination}
              </p>
            </div>
            <Link
              href={`/destinations/${tripInfo.destination}`}
              className="text-xs text-primary font-semibold hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedPackages.map((pkg) => {
              // Extract image URL from Primary_Image_URL (handle markdown link format)
              const imageUrl = pkg.Primary_Image_URL 
                ? pkg.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
                : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'
              
              // Generate package URL - use Destination_ID or Firestore doc id
              const packageId = pkg.Destination_ID || (pkg as any).id || 'package'
              const destinationName = tripInfo.destination || pkg.Destination_Name || 'Bali'
              const packageUrl = `/destinations/${encodeURIComponent(destinationName)}/${encodeURIComponent(packageId)}`
              
              return (
              <div
                key={pkg.Destination_ID || (pkg as any).id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
              >
                {/* Package Image */}
                <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                  <img
                    src={imageUrl}
                    alt={pkg.Destination_Name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'
                    }}
                  />
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{pkg.Destination_Name}</h3>
                      <p className="text-sm text-gray-500">{pkg.Duration}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{pkg.Price_Range_INR}</p>
                      <p className="text-xs text-gray-500">
                        {pkg.Budget_Category} • {pkg.Star_Category}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{pkg.Overview}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] uppercase text-gray-500">Mood</p>
                      <p className="font-semibold text-gray-900">{pkg.Mood}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] uppercase text-gray-500">Theme</p>
                      <p className="font-semibold text-gray-900">{pkg.Theme}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] uppercase text-gray-500">Travel Type</p>
                      <p className="font-semibold text-gray-900">{pkg.Travel_Type}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] uppercase text-gray-500">Stay</p>
                      <p className="font-semibold text-gray-900">{pkg.Stay_Type}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-2">Key Inclusions</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {(pkg.Inclusions?.split(',') || []).slice(0, 4).map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{item.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={packageUrl}
                    className="block w-full text-center rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    View Full Details
                  </Link>
                </div>
              </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => onTripDetailsRequest?.()}
            className="mt-6 w-full rounded-xl border border-dashed border-primary/40 bg-white px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            Edit Trip Details & Regenerate
          </button>
        </div>
      )}

      {!showPackageSuggestions && tripInfo.destination && tripInfo.travelType && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
          We’re still curating ready-made packages for {tripInfo.destination}. A travel expert will
          review your preferences and follow up with personalized options.
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-gray-50/50 p-4 relative z-10">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !tripInfo.destination
                ? "Tell me where you want to travel..."
                : currentQuestion === 'date'
                ? "When are you traveling? (e.g., March 2024 or 15/03/2024)"
                : currentQuestion === 'days'
                ? "How many days? (e.g., 5 days)"
                : currentQuestion === 'hotel'
                ? "What hotel type? (3-star, 4-star, 5-star)"
                : currentQuestion === 'travelType'
                ? "Who are you traveling with? (solo, family, couple, friends)"
                : currentQuestion === 'feedback'
                ? "Any suggestions? (e.g., spa, yoga, adventure) or type 'skip'"
                : "Type your message..."
            }
            className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
          >
            {isTyping ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
