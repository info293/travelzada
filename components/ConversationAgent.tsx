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
import LeadForm from '@/components/LeadForm'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import {
  Calendar,
  ChevronRight,
  MapPin,
  Sparkles,
  Clock,
  Building,
  Users,
  Send,
  Image as ImageIcon,
  X,
  RefreshCw,
  ChevronLeft,
  Mic,
  Volume2,
  Square,
  ArrowUp as ArrowUpIcon
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useVoiceChat } from '@/hooks/useVoiceChat'

// Animation Variants
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const slideUp: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const travelData = travelDatabase as any
type DestinationPackage = any

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



const TOTAL_STEPS = 5 // Removed budget step

const thinkingMessages = [
  'AI thinking...',
  'Planning your perfect trip...',
  'Finding the best options...',
  'Analyzing your preferences...',
  'Crafting personalized recommendations...',
  'Searching our database...',
  'Almost there...',
]

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
  { label: '3★ Comfort', value: '3 Star' },
  { label: '4★ Premium', value: '4 Star' },
  { label: '5★ Luxury', value: '5 Star' },
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
    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (parsed < today) {
      return null // Reject past dates
    }
    return formatISODate(parsed)
  }

  return null
}



const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

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
  recommendations?: DestinationPackage[]
  quickActions?: Array<{ label: string; action: string; packageData?: DestinationPackage }>
  startNewSearch?: boolean
}

interface ConversationAgentProps {
  formData: any
  setFormData: any
  onTripDetailsRequest?: () => void
  isMobileChatMode?: boolean
  onCloseMobileChat?: () => void
  onOpenMobileChat?: () => void
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

// LocalStorage key for saved trips
const SAVED_TRIPS_KEY = 'travelzada_saved_trips'

interface SavedTrip {
  id: string
  name: string
  destination: string
  createdAt: number
  updatedAt: number
  messages: Message[]
  tripInfo: TripInfo
}

export default function ConversationAgent({ formData, setFormData, onTripDetailsRequest, isMobileChatMode, onCloseMobileChat, onOpenMobileChat }: ConversationAgentProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [semanticScores, setSemanticScores] = useState<any[]>([]) // Store semantic search results
  const [thinkingMessage, setThinkingMessage] = useState(0)
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
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTripInfo, setEditTripInfo] = useState<TripInfo>({
    destination: '',
    travelDate: '',
    days: '',
    budget: '',
    hotelType: '',
    preferences: [],
    travelType: '',
  })
  const [aiResponseComplete, setAiResponseComplete] = useState(false)
  const [firestorePackages, setFirestorePackages] = useState<DestinationPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(true)
  // Interactive chat features - post-recommendation phase
  const [conversationPhase, setConversationPhase] = useState<'collecting-info' | 'showing-recommendation' | 'post-recommendation'>('collecting-info')
  const [shownPackageIds, setShownPackageIds] = useState<string[]>([])
  // Track full package objects for AI context (used when comparing packages)
  const [shownPackages, setShownPackages] = useState<Array<{
    name: string
    duration: string
    price: string
    starCategory: string
    travelType?: string
    overview?: string
  }>>([])
  const [currentRecommendationIndex, setCurrentRecommendationIndex] = useState(0)
  // Key to trigger re-initialization after New Chat click
  const [chatResetKey, setChatResetKey] = useState(0)
  const [destinations, setDestinations] = useState<Array<{ id?: string; name: string; slug?: string }>>([])
  const [destinationsLoading, setDestinationsLoading] = useState(true)
  const [destinationDayOptions, setDestinationDayOptions] = useState<Array<{ label: string; value: string }>>([])
  const [destinationHotelOptions, setDestinationHotelOptions] = useState<Array<{ label: string; value: string }>>([])
  const [destinationTravelTypeOptions, setDestinationTravelTypeOptions] = useState<Array<{ label: string; value: string }>>([])

  const [showCalendar, setShowCalendar] = useState(false)
  const [questionRetryCount, setQuestionRetryCount] = useState(0) // Track retries for validation loop
  const [calendarViewDate, setCalendarViewDate] = useState(new Date())

  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)

  // LocalStorage: Saved trips state
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([])
  const [currentTripId, setCurrentTripId] = useState<string | null>(null)
  const [showMobileHistory, setShowMobileHistory] = useState(false) // Mobile drawer for saved trips
  const [imageAnalysisResult, setImageAnalysisResult] = useState<{
    detectedLocation: string | null
    rawDetectedLocation: string | null
    confidence: 'high' | 'medium' | 'low'
    similarLocations?: string[]
    description?: string
    landmarks?: string[]
  } | null>(null)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadFormPackage, setLeadFormPackage] = useState<DestinationPackage | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const tripDetailsAutoOpenedRef = useRef(false)
  const messagesRef = useRef<Message[]>([])
  // Ref for shownPackages to avoid re-renders triggering useEffect
  const shownPackagesRef = useRef<typeof shownPackages>([])
  const dateInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const todayISO = useMemo(() => formatISODate(new Date()), [])
  const initialPromptSentRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Keep shownPackagesRef in sync with shownPackages state
  useEffect(() => {
    shownPackagesRef.current = shownPackages
  }, [shownPackages])

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
        console.error('Error fetching destinations:', error)
      } finally {
        setDestinationsLoading(false)
      }
    }

    fetchDestinationsFromFirestore()
  }, [])

  // Initialize Voice Chat
  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    isSupported: isVoiceSupported
  } = useVoiceChat({
    onTranscript: (text) => {
      setInput(text)
    },
    onError: (err) => {
      alert(err)
    }
  })

  // Auto-send when voice input stops and we have text
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0) {
      handleSend()
    }
  }, [isListening, transcript]) // Removed handleSend from deps to avoid loop, but it's stable via useCallback usually

  // LocalStorage: Load saved trips on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(SAVED_TRIPS_KEY)
      if (stored) {
        const trips: SavedTrip[] = JSON.parse(stored)
        setSavedTrips(trips.sort((a, b) => b.updatedAt - a.updatedAt))
      }
    } catch (e) {
      console.error('Error loading saved trips:', e)
    }
  }, [])

  // LocalStorage: Auto-save current trip when messages or tripInfo change
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (messages.length === 0) return // Don't save empty conversations

    // Only save if there's at least one user message
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length === 0) return

    // Generate trip name: destination > first user message > fallback
    const firstUserMessage = userMessages[0]?.content || ''
    const tripName = tripInfo.destination
      || (firstUserMessage.length > 30 ? firstUserMessage.slice(0, 30) + '...' : firstUserMessage)
      || 'New Trip'
    const now = Date.now()

    setSavedTrips(prev => {
      let updated: SavedTrip[]

      if (currentTripId) {
        // Update existing trip
        updated = prev.map(t =>
          t.id === currentTripId
            ? { ...t, name: tripName, destination: tripInfo.destination, updatedAt: now, messages, tripInfo }
            : t
        )
      } else {
        // Create new trip
        const newId = `trip_${now}`
        setCurrentTripId(newId)
        const newTrip: SavedTrip = {
          id: newId,
          name: tripName,
          destination: tripInfo.destination,
          createdAt: now,
          updatedAt: now,
          messages,
          tripInfo
        }
        updated = [newTrip, ...prev]
      }

      // Save to localStorage
      localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(updated.slice(0, 20))) // Keep max 20 trips
      return updated.sort((a, b) => b.updatedAt - a.updatedAt)
    })
  }, [messages, tripInfo.destination])

  // Load a saved trip
  const loadTrip = useCallback((trip: SavedTrip) => {
    setCurrentTripId(trip.id)
    setMessages(trip.messages)
    setTripInfo(trip.tripInfo)
    setCurrentQuestion('destination') // Reset question flow
    if (trip.tripInfo.destination) setCurrentQuestion('complete')
  }, [])

  // Start new trip (reset state)
  const startNewTrip = useCallback(() => {
    setCurrentTripId(null)
    setMessages([])
    setTripInfo({
      destination: '',
      travelDate: '',
      days: '',
      budget: '',
      hotelType: '',
      preferences: [],
      travelType: '',
    })
    setCurrentQuestion('destination')
    setConversationPhase('collecting-info')
    setShownPackageIds([])
    setShownPackages([])
    setChatResetKey(prev => prev + 1)
  }, [])

  // Delete a saved trip
  const deleteTrip = useCallback((tripId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent loading the trip when clicking delete
    setSavedTrips(prev => {
      const updated = prev.filter(t => t.id !== tripId)
      localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(updated))
      return updated
    })
    // If deleting current trip, reset state
    if (currentTripId === tripId) {
      startNewTrip()
    }
  }, [currentTripId, startNewTrip])

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
          const data = doc.data()
          packagesData.push({ ...data, id: doc.id } as DestinationPackage)
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
    const destinationPackages = firestorePackages.filter((pkg: DestinationPackage) => {
      const pkgAny = pkg as any
      const pkgName = normalizeDestination((pkg as any).Destination_Name || '')
      return pkgName.includes(normalizedDestination) || normalizedDestination.includes(pkgName)
    })

    // Extract unique duration days from packages
    const daySet = new Set<number>()
    destinationPackages.forEach((pkg: DestinationPackage) => {
      const pkgAny = pkg as any
      // Try Duration_Days first, then Duration_Nights, then parse Duration string
      if (pkgAny.Duration_Days) {
        daySet.add(pkgAny.Duration_Days)
      } else if (pkgAny.Duration_Nights) {
        daySet.add(pkgAny.Duration_Nights + 1) // Nights + 1 = Days
      } else if (pkgAny.Duration) {
        // Parse duration string like "5 Nights / 6 Days" or "6 Days"
        const durationMatch = pkgAny.Duration.match(/(\d+)\s*(?:Days|days|Day|day)/i)
        if (durationMatch) {
          daySet.add(parseInt(durationMatch[1], 10))
        } else {
          const nightsMatch = pkgAny.Duration.match(/(\d+)\s*(?:Nights|nights|Night|night)/i)
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
    destinationPackages.forEach((pkg: DestinationPackage) => {
      const pkgAny = pkg as any
      if (pkgAny.Star_Category) {
        // Extract star rating from Star_Category (e.g., "3 Star", "4 Star", "5 Star", "3★", etc.)
        const starMatch = pkgAny.Star_Category.match(/(\d+)\s*(?:Star|star|★)/i)
        if (starMatch) {
          const starValue = starMatch[1]
          hotelTypeSet.add(starValue)
        } else if (pkgAny.Star_Category.includes('3') || pkgAny.Star_Category.toLowerCase().includes('budget')) {
          hotelTypeSet.add('3')
        } else if (pkgAny.Star_Category.includes('4') || pkgAny.Star_Category.toLowerCase().includes('mid')) {
          hotelTypeSet.add('4')
        } else if (pkgAny.Star_Category.includes('5') || pkgAny.Star_Category.toLowerCase().includes('luxury')) {
          hotelTypeSet.add('5')
        }
      }
    })

    // Convert to sorted array and create hotel options with proper labels
    const sortedStars = Array.from(hotelTypeSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    const hotelOptionsForDestination = sortedStars.map((star) => {
      const starNum = parseInt(star, 10)
      let label = ''
      let value = `${star} Star` // Store as "3 Star", "4 Star", "5 Star" to match Star_Category

      if (starNum === 3) {
        label = '3★ Comfort'
      } else if (starNum === 4) {
        label = '4★ Premium'
      } else if (starNum === 5) {
        label = '5★ Luxury'
      } else {
        label = `${star}★`
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
    destinationPackages.forEach((pkg: DestinationPackage) => {
      const pkgAny = pkg as any
      if (pkgAny.Travel_Type) {
        const travelType = pkgAny.Travel_Type.toLowerCase().trim()

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
      if (pkgAny.Group_Size) {
        const groupSize = pkgAny.Group_Size.toLowerCase().trim()
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
    firestorePackages.forEach((pkg: DestinationPackage) => {
      const pkgAny = pkg as any
      const id = pkgAny.Destination_ID || pkgAny.id
      if (id && !seenIds.has(id)) {
        seenIds.add(id)
        combined.push(pkg)
      }
    })

    // Then, add JSON packages that don't exist in Firestore
    destinationPackages.forEach((pkg: DestinationPackage) => {
      const pkgAny = pkg as any
      const id = pkgAny.Destination_ID
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
    async (prompt: string, extra: Partial<Message> = {}, availableDestinationsForContext?: string[], availableDayOptions?: string[]) => {
      setIsTyping(true)
      setThinkingMessage(0)

      // Start rotating thinking messages
      const messageInterval = setInterval(() => {
        setThinkingMessage((prev) => (prev + 1) % thinkingMessages.length)
      }, 2000) // Change message every 2 seconds

      try {
        // Get available destinations from database
        const destinationsToSend = availableDestinationsForContext ||
          (destinations.length > 0
            ? destinations.map(d => d.name)
            : [])

        const response = await fetch('/api/ai-planner/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            conversation: messagesRef.current.slice(-12), // Increased from 6 to 12 for better context
            shownPackages: shownPackagesRef.current, // Use ref for stable reference
            currentDestination: tripInfoRef.current.destination, // Add current destination for context
            availableDayOptions: availableDayOptions, // Add available day options for destination
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
        clearInterval(messageInterval)
        setIsTyping(false)
        setThinkingMessage(0)
      }
    },
    [appendMessage, destinations] // Removed shownPackages - using ref instead
  )

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    setIsAnalyzingImage(true)
    setImageAnalysisResult(null)
    setUploadedImage(null)

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string

        // Store image for preview
        setUploadedImage(base64String)

        // Get available destinations
        const availableDestinations = destinations.length > 0
          ? destinations.map(d => d.name)
          : []

        // Call image analysis API
        const response = await fetch('/api/ai-planner/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64String,
            availableDestinations,
          }),
        })

        const analysisData = await response.json()
        setImageAnalysisResult(analysisData)

        // Add user message with image
        appendMessage({
          role: 'user',
          content: 'I uploaded an image. Can you identify the location?',
        })

        // Handle the result
        if (analysisData.detectedLocation) {
          // Exact match found - set destination and show packages
          const matchedDestination = analysisData.detectedLocation
          setTripInfo(prev => ({ ...prev, destination: matchedDestination }))

          const locationName = analysisData.rawDetectedLocation || matchedDestination
          appendMessage({
            role: 'assistant',
            content: `Great! I've identified this image as ${locationName}. This matches ${matchedDestination} in our database! Let me show you the available packages for this destination!`,
          })

          // Set destination and move to next question
          setCurrentQuestion('date')
          setProgress((1 / TOTAL_STEPS) * 100)
          setCompletedSteps(1)
        } else if (analysisData.rawDetectedLocation || (analysisData.similarLocations && analysisData.similarLocations.length > 0)) {
          // No exact match, but we detected a location
          const detectedLocationName = analysisData.rawDetectedLocation || 'this location'
          const landmarksText = analysisData.landmarks && analysisData.landmarks.length > 0
            ? ` I can see ${analysisData.landmarks.join(' and ')} in the image.`
            : ''

          if (analysisData.similarLocations && analysisData.similarLocations.length > 0) {
            const similarList = analysisData.similarLocations.join(', ')
            appendMessage({
              role: 'assistant',
              content: `I've identified this image as ${detectedLocationName}.${landmarksText} Unfortunately, we don't have packages for ${detectedLocationName} in our database right now. However, we have similar destinations available: ${similarList}. Would you like to explore packages for any of these locations?`,
            })
          } else {
            appendMessage({
              role: 'assistant',
              content: `I've identified this image as ${detectedLocationName}.${landmarksText} Unfortunately, we don't have packages for this location in our database. Could you tell me which destination you'd like to visit? We have: ${availableDestinations.join(', ')}`,
            })
          }
        } else {
          // No location detected at all
          appendMessage({
            role: 'assistant',
            content: `I couldn't identify this location in the image. Could you tell me which destination you'd like to visit? We have: ${availableDestinations.join(', ')}`,
          })
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error analyzing image:', error)
      appendMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error analyzing the image. Please try again or tell me which destination you\'d like to visit.',
      })
    } finally {
      setIsAnalyzingImage(false)
    }
  }, [destinations, appendMessage])

  const handleImageInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    // Reset input so same file can be selected again
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }, [handleImageUpload])

  useEffect(() => {
    // Wait for destinations to load before sending initial prompt
    if (destinationsLoading) return

    // Only send if we have destinations loaded
    if (destinations.length === 0) return

    // Check if already sent (to prevent double message on initial load)
    if (initialPromptSentRef.current) return

    initialPromptSentRef.current = true

    // Get available destinations from database
    const availableDests = destinations.map(d => d.name)

    sendAssistantPrompt(
      withStyle(
        `Greet them briefly and ask which destination they want to plan. Only mention these available destinations: ${availableDests.join(', ')}. Do not suggest any other destinations.`,
        30
      ),
      {},
      availableDests
    )
  }, [sendAssistantPrompt, destinations, destinationsLoading, chatResetKey])

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

  // Extract hotel type - returns star rating format to match Star_Category
  const extractHotelType = (text: string): string | null => {
    const lowerText = text.toLowerCase().trim()

    // Check for star ratings first (e.g., "3 star", "4 star", "5 star")
    const starMatch = lowerText.match(/(\d+)\s*(?:star|★)/i)
    if (starMatch) {
      return `${starMatch[1]} Star`
    }

    // Check for numeric values
    if (lowerText === '3' || lowerText.includes('three')) {
      return '3 Star'
    }
    if (lowerText === '4' || lowerText.includes('four')) {
      return '4 Star'
    }
    if (lowerText === '5' || lowerText.includes('five')) {
      return '5 Star'
    }

    // Map budget/luxury terms to star ratings
    if (lowerText === 'budget' || lowerText === '1' || lowerText.includes('budget') || lowerText.includes('cheap') || lowerText.includes('hostel') || lowerText.includes('economy')) {
      return '3 Star'
    }
    if (lowerText === 'mid-range' || lowerText === 'mid range' || lowerText === 'midrange' || lowerText === '2' || (lowerText.includes('mid') && lowerText.includes('range')) || lowerText.includes('moderate') || lowerText.includes('standard')) {
      return '4 Star'
    }
    if (lowerText === 'luxury' || lowerText.includes('luxury') || lowerText.includes('premium')) {
      return '5 Star'
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

  // Simple markdown renderer for AI messages
  const renderMarkdown = (text: string) => {
    // Replace **bold** with <strong>bold</strong>
    let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Replace *italic* with <em>italic</em>
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Replace newlines with <br/>
    html = html.replace(/\n/g, '<br/>')
    return html
  }

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

  // Calculate Levenshtein distance for fuzzy matching (handles spelling mistakes)
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[str2.length][str1.length]
  }

  // Check if a word matches with fuzzy matching (handles typos)
  const fuzzyMatch = (word: string, text: string, threshold: number = 0.7): boolean => {
    const wordLower = word.toLowerCase()
    const textLower = text.toLowerCase()

    // Exact match
    if (textLower.includes(wordLower)) return true

    // Fuzzy match: check if any word in text is similar to the search word
    const textWords = textLower.split(/\s+/)
    for (const textWord of textWords) {
      if (textWord.length < 3) continue // Skip very short words

      const maxLen = Math.max(wordLower.length, textWord.length)
      if (maxLen === 0) continue

      const distance = levenshteinDistance(wordLower, textWord)
      const similarity = 1 - (distance / maxLen)

      if (similarity >= threshold) {
        return true
      }
    }

    return false
  }

  // Find closest destination matches for "Did you mean?" suggestions
  const findClosestDestinations = useCallback((userInput: string, limit: number = 3): Array<{ name: string; similarity: number }> => {
    const inputLower = userInput.toLowerCase().trim()
    if (!inputLower || inputLower.length < 2) return []

    const availableDestinations = destinations.length > 0 ? destinations : []

    const matches = availableDestinations
      .map(dest => {
        const destLower = dest.name.toLowerCase()
        const maxLen = Math.max(inputLower.length, destLower.length)
        const distance = levenshteinDistance(inputLower, destLower)
        const similarity = maxLen > 0 ? 1 - (distance / maxLen) : 0
        return { name: dest.name, similarity }
      })
      .filter(m => m.similarity > 0.4) // Only include reasonable matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return matches
  }, [destinations])

  // Enhanced search packages based on feedback keywords with fuzzy matching and synonym support
  const searchPackageByFeedback = (pkg: DestinationPackage, feedback: string): number => {
    if (!feedback || feedback.trim() === '') return 0

    const feedbackLower = feedback.toLowerCase().trim()
    const pkgAny = pkg as any

    // Comprehensive search across all package fields
    const searchFields = [
      pkgAny.Overview || '',
      pkgAny.Inclusions || '',
      pkgAny.Theme || '',
      pkgAny.Mood || '',
      pkgAny.Adventure_Level || '',
      pkgAny.Stay_Type || '',
      pkgAny.Day_Wise_Itinerary || '',
      pkgAny.Ideal_Traveler_Persona || '',
      pkgAny.Destination_Name || '',
      pkgAny.Description || '',
    ]

    // Combine all searchable text
    const allText = searchFields.join(' ').toLowerCase()

    // Activity synonyms mapping - helps match user intent even with different word choices
    const activitySynonyms: Record<string, string[]> = {
      'spa': ['spa', 'massage', 'wellness', 'relaxation', 'therapy', 'treatment', 'rejuvenation', 'pampering', 'beauty', 'salon'],
      'yoga': ['yoga', 'meditation', 'mindfulness', 'zen', 'stretching', 'flexibility', 'asana'],
      'adventure': ['adventure', 'adventurous', 'thrilling', 'exciting', 'extreme', 'outdoor', 'sports', 'activity', 'activities'],
      'diving': ['diving', 'scuba', 'snorkeling', 'snorkel', 'underwater', 'marine', 'coral', 'reef'],
      'hiking': ['hiking', 'trekking', 'trek', 'walking', 'trail', 'mountain', 'climbing'],
      'beach': ['beach', 'beaches', 'coastal', 'seaside', 'shore', 'ocean', 'seawater', 'swimming'],
      'culture': ['culture', 'cultural', 'heritage', 'historical', 'history', 'temple', 'temples', 'monument', 'monuments', 'tradition', 'traditional'],
      'shopping': ['shopping', 'shop', 'market', 'markets', 'mall', 'boutique', 'souvenir'],
      'food': ['food', 'cuisine', 'culinary', 'restaurant', 'dining', 'eat', 'eating', 'local', 'delicacy'],
      'nightlife': ['nightlife', 'night', 'club', 'bars', 'bar', 'party', 'entertainment', 'music'],
      'wildlife': ['wildlife', 'safari', 'animals', 'nature', 'jungle', 'forest', 'bird', 'birds'],
      'romantic': ['romantic', 'romance', 'honeymoon', 'couple', 'intimate', 'private'],
      'family': ['family', 'kids', 'children', 'child', 'kid-friendly', 'family-friendly'],
    }

    // Extract keywords from feedback (filter out common words and short words)
    const commonWords = ['the', 'and', 'or', 'for', 'with', 'like', 'want', 'need', 'have', 'get', 'do', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'from', 'as', 'it', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your']
    const keywords = feedbackLower
      .split(/[\s,\.!?]+/)
      .map(k => k.trim().replace(/[^\w]/g, ''))
      .filter(k => k.length > 2 && !commonWords.includes(k))

    if (keywords.length === 0) return 0

    let exactMatchCount = 0
    let fuzzyMatchCount = 0
    let synonymMatchCount = 0
    let totalScore = 0

    keywords.forEach(keyword => {
      let matched = false

      // Check for exact match first (highest priority)
      if (allText.includes(keyword)) {
        exactMatchCount++
        totalScore += 15 // Higher score for exact matches
        matched = true
      } else {
        // Check for synonym matches (user says "spa" but package has "massage" or "wellness")
        for (const [activity, synonyms] of Object.entries(activitySynonyms)) {
          if (synonyms.includes(keyword)) {
            // Check if any synonym appears in the package text
            const synonymFound = synonyms.some(syn => allText.includes(syn))
            if (synonymFound) {
              synonymMatchCount++
              totalScore += 12 // Good score for synonym matches
              matched = true
              break
            }
          } else if (keyword.includes(activity) || activity.includes(keyword)) {
            // Partial match with activity name
            const synonymFound = synonyms.some(syn => allText.includes(syn))
            if (synonymFound) {
              synonymMatchCount++
              totalScore += 12
              matched = true
              break
            }
          }
        }

        // Try fuzzy matching for typos/spelling mistakes (if not already matched)
        if (!matched && fuzzyMatch(keyword, allText, 0.65)) {
          fuzzyMatchCount++
          totalScore += 10 // Good score for fuzzy matches
          matched = true
        }
      }
    })

    // Calculate final score
    if (exactMatchCount === 0 && fuzzyMatchCount === 0 && synonymMatchCount === 0) return 0

    // Bonus for matching all keywords
    const totalMatches = exactMatchCount + fuzzyMatchCount + synonymMatchCount
    if (totalMatches === keywords.length) {
      totalScore += 30 // Higher bonus for matching all keywords
    } else if (totalMatches >= keywords.length * 0.7) {
      totalScore += 15 // Partial bonus if most keywords match
    }

    // Normalize score (max around 80-100 for perfect match with all bonuses)
    return Math.min(totalScore, 100)
  }

  const scorePackage = (pkg: DestinationPackage, info: TripInfo) => {
    let score = 0
    const pkgAny = pkg as any

    // Base score for destination match (required)
    if (info.destination) {
      const target = normalize(info.destination)
      if (
        normalize(pkgAny.Destination_Name || '').includes(target) ||
        target.includes(normalize(pkgAny.Destination_Name || ''))
      ) {
        score += 50 // Base score for matching destination
      } else {
        return 0 // Must match destination
      }
    }

    // Feedback matching - HIGH PRIORITY: prioritize packages that match user's activity preferences
    // This works even with spelling mistakes thanks to fuzzy matching and synonym support
    if (userFeedback && userFeedback.trim() !== '') {
      const feedbackScore = searchPackageByFeedback(pkg, userFeedback)

      if (feedbackScore > 0) {
        // Check if package matches basic criteria (duration and travel type)
        const requestedDays = parseInt(info.days, 10)
        let pkgDays = null
        if (pkgAny.Duration_Days) {
          pkgDays = pkgAny.Duration_Days
        } else {
          pkgDays = extractDaysFromDuration(pkgAny.Duration || '')
        }
        const daysMatch = !isNaN(requestedDays) && pkgDays && Math.abs(pkgDays - requestedDays) <= 2
        const travelMatch = info.travelType && pkgAny.Travel_Type &&
          (pkgAny.Travel_Type.toLowerCase().includes(info.travelType.toLowerCase()) ||
            info.travelType.toLowerCase().includes(pkgAny.Travel_Type.toLowerCase().split(' / ')[0]))

        // VERY HIGH priority boost if package matches feedback AND basic criteria
        if (daysMatch && travelMatch) {
          score += feedbackScore * 5.5 // Very high boost for perfect matches (user's activity preference is important!)
        } else if (daysMatch || travelMatch) {
          // High boost if at least one basic criteria matches
          score += feedbackScore * 2.0 // High boost for activity matches with partial criteria match
        } else {
          // Still give significant boost even if basic criteria don't match perfectly
          // This helps when user's activity preference is very specific (e.g., "I want scuba diving")
          score += feedbackScore * 1.5 // Significant boost for activity matches (user explicitly asked for this!)
        }
      }
    }

    // Travel type matching (high priority)
    if (info.travelType && pkgAny.Travel_Type) {
      const pkgTravelType = pkgAny.Travel_Type.toLowerCase()
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
        const pkgTypes = pkgTravelType.split(' / ').map((t: string) => t.trim())
        if (pkgTypes.some((t: string) => t === userTravelType || userTravelType.includes(t))) {
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
    if (pkgAny.Duration_Days) {
      pkgDays = pkgAny.Duration_Days
    } else {
      pkgDays = extractDaysFromDuration(pkgAny.Duration || '')
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

    // Hotel type matching (high priority) - now using Star_Category format directly
    if (info.hotelType && pkgAny.Star_Category) {
      // Extract star number from hotelType (e.g., "3 Star" -> "3")
      const userStarMatch = info.hotelType.match(/(\d+)/)
      const userStar = userStarMatch ? userStarMatch[1] : null

      if (userStar) {
        // Extract star number from package
        const pkgStarMatch = pkgAny.Star_Category.match(/(\d+)/)
        const pkgStar = pkgStarMatch ? pkgStarMatch[1] : null

        if (pkgStar) {
          const userStarNum = parseInt(userStar, 10)
          const pkgStarNum = parseInt(pkgStar, 10)

          // Exact match gets high score
          if (userStarNum === pkgStarNum) {
            score += 50 // Exact hotel type match - very high priority
          } else {
            // Heavy penalties for mismatches - user wants specific star rating
            if (userStarNum === 5 && pkgStarNum === 4) {
              score -= 30 // User wants 5-star, got 4-star (major downgrade)
            } else if (userStarNum === 5 && pkgStarNum === 3) {
              score -= 50 // User wants 5-star, got 3-star (huge downgrade)
            } else if (userStarNum === 4 && pkgStarNum === 3) {
              score -= 20 // User wants 4-star, got 3-star (downgrade)
            } else if (userStarNum === 4 && pkgStarNum === 5) {
              score -= 10 // User wants 4-star, got 5-star (upgrade - less ideal)
            } else if (userStarNum === 3 && pkgStarNum === 5) {
              score -= 30 // User wants 3-star, got 5-star (too expensive)
            } else if (userStarNum === 3 && pkgStarNum === 4) {
              score -= 15 // User wants 3-star, got 4-star (more expensive)
            }
          }
        }
      }
    }

    return score
  }

  const destinationSpecificPackages = useMemo(() => {
    if (!tripInfo.destination) return []
    return allPackages.filter((pkg: DestinationPackage) => {
      const pkgAny = pkg as any
      return matchesDestination(pkgAny.Destination_Name || '', tripInfo.destination)
    })
  }, [tripInfo.destination, allPackages])

  const rankedPackages = useMemo(() => {
    if (!tripInfo.destination || destinationSpecificPackages.length === 0) return []

    const scored = destinationSpecificPackages
      .map((pkg: DestinationPackage) => ({ pkg, score: scorePackage(pkg, tripInfo) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        const requestedDays = parseInt(tripInfo.days, 10)
        const aPkgAny = a.pkg as any
        const bPkgAny = b.pkg as any
        const aDays = !isNaN(requestedDays) ? (aPkgAny.Duration_Days || extractDaysFromDuration(aPkgAny.Duration || '') || 0) : 0
        const bDays = !isNaN(requestedDays) ? (bPkgAny.Duration_Days || extractDaysFromDuration(bPkgAny.Duration || '') || 0) : 0
        const aDiff = !isNaN(requestedDays) ? Math.abs(aDays - requestedDays) : 999
        const bDiff = !isNaN(requestedDays) ? Math.abs(bDays - requestedDays) : 999

        // ZERO: Semantic Score Boost (if available) - Integrating Hybrid Search
        // Apply semantic boost to base score before other strict sorting
        let aScore = a.score
        let bScore = b.score

        const aSemantic = semanticScores.find((s: any) => s.packageId === (aPkgAny.Destination_ID || aPkgAny.id))
        const bSemantic = semanticScores.find((s: any) => s.packageId === (bPkgAny.Destination_ID || bPkgAny.id))

        if (aSemantic) aScore += aSemantic.score * 50
        if (bSemantic) bScore += bSemantic.score * 50

        // FIRST: Prioritize exact hotel/star rating matches (HIGHEST PRIORITY)
        // If user selected a star rating, show matching packages first
        if (tripInfo.hotelType) {
          const userStarMatch = tripInfo.hotelType.match(/(\d+)/)
          const userStar = userStarMatch ? userStarMatch[1] : null

          if (userStar) {
            const aStarMatch = aPkgAny.Star_Category?.match(/(\d+)/)
            const bStarMatch = bPkgAny.Star_Category?.match(/(\d+)/)
            const aStar = aStarMatch ? aStarMatch[1] : null
            const bStar = bStarMatch ? bStarMatch[1] : null

            // Exact match vs non-match
            if (aStar === userStar && bStar !== userStar) return -1 // a matches exactly, b doesn't
            if (bStar === userStar && aStar !== userStar) return 1  // b matches exactly, a doesn't

            // Both match or both don't match - continue to next criteria
          }
        }

        // SECOND: Prioritize exact duration/days matches (HIGHEST PRIORITY after star rating)
        if (aDiff === 0 && bDiff !== 0) return -1 // a is exact match, b is not
        if (bDiff === 0 && aDiff !== 0) return 1  // b is exact match, a is not

        // If both are close, prefer the closer one
        if (aDiff !== bDiff && aDiff <= 2 && bDiff <= 2) {
          return aDiff - bDiff // Closer match first
        }

        // THIRD: Prioritize feedback/activity matches (HIGH PRIORITY - user explicitly asked for this!)
        // If user provided feedback about activities, prioritize packages that match
        if (userFeedback && userFeedback.trim() !== '') {
          const aFeedbackScore = searchPackageByFeedback(a.pkg, userFeedback)
          const bFeedbackScore = searchPackageByFeedback(b.pkg, userFeedback)

          // If one package matches feedback and the other doesn't, prioritize the match
          if (aFeedbackScore > 0 && bFeedbackScore === 0) return -1
          if (bFeedbackScore > 0 && aFeedbackScore === 0) return 1

          // If both match, prioritize the one with higher feedback score
          if (aFeedbackScore !== bFeedbackScore && aFeedbackScore > 0 && bFeedbackScore > 0) {
            return bFeedbackScore - aFeedbackScore
          }
        }

        // FOURTH: Sort by total score (including semantic boost)
        if (bScore !== aScore) {
          return bScore - aScore
        }

        // FIFTH: Prefer packages that match travel type exactly
        const userTravelType = tripInfo.travelType?.toLowerCase()
        const aTravelMatch = userTravelType && aPkgAny.Travel_Type?.toLowerCase() === userTravelType
        const bTravelMatch = userTravelType && bPkgAny.Travel_Type?.toLowerCase() === userTravelType

        if (aTravelMatch !== bTravelMatch) {
          return aTravelMatch ? -1 : 1
        }

        return 0
      })

    // Debug logging (commented out for production)
    // console.log('📊 Package Ranking for:', {
    //   destination: tripInfo.destination,
    //   days: tripInfo.days,
    //   hotelType: tripInfo.hotelType,
    //   travelType: tripInfo.travelType
    // })
    // scored.slice(0, 5).forEach(({ pkg, score }, idx) => {
    //   const pkgAny = pkg as any
    //   const pkgDays = pkgAny.Duration_Days || extractDaysFromDuration(pkgAny.Duration || '')
    //   console.log(`  ${idx + 1}. ${pkgAny.Destination_Name} (${pkgAny.Duration}) - Score: ${score}`, {
    //     travelType: pkgAny.Travel_Type,
    //     hotelType: pkgAny.Star_Category,
    //     days: pkgDays,
    //     matches: {
    //       travelType: tripInfo.travelType && pkgAny.Travel_Type?.toLowerCase().includes(tripInfo.travelType.toLowerCase()),
    //       hotelType: (() => {
    //         if (!tripInfo.hotelType || !pkgAny.Star_Category) return false
    //         const userStarMatch = tripInfo.hotelType.match(/(\d+)/)
    //         const userStar = userStarMatch ? userStarMatch[1] : null
    //         return userStar ? pkgAny.Star_Category.includes(userStar) : false
    //       })(),
    //       days: tripInfo.days && Math.abs((pkgDays || 0) - parseInt(tripInfo.days, 10)) <= 2
    //     }
    //   })
    // })

    return scored
  }, [destinationSpecificPackages, tripInfo, userFeedback])


  // Scroll to edit form when it opens
  useEffect(() => {
    if (isEditMode) {
      setTimeout(() => {
        const editForm = document.getElementById('edit-trip-form')
        if (editForm) {
          editForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    }
  }, [isEditMode])


  const generateRecommendation = useCallback(async () => {
    const currentInfo = tripInfoRef.current
    let bestMatch = rankedPackages[0]?.pkg
    let semanticMatches: any[] = []

    // 🔍 SEMANTIC SEARCH INTEGRATION (Hybrid Search)
    try {
      // Construct a rich natural language query from user preferences
      const searchQuery = `I want a ${currentInfo.days}-day ${currentInfo.travelType} trip to ${currentInfo.destination} with a budget of ₹${currentInfo.budget}. Preference: ${userFeedback || 'Best experience'}. Hotel: ${currentInfo.hotelType}.`

      console.log('🔍 Running hybrid semantic search for:', searchQuery)

      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          topK: 10, // Get top 10 matches to boost ranking
          filter: currentInfo.destination ? { destinationName: currentInfo.destination } : undefined
        }),
      })

      const data = await response.json()
      if (data.success && data.results) {
        semanticMatches = data.results
        setSemanticScores(data.results) // Update state for future re-renders (e.g. show alternatives)

        // Re-rank packages based on semantic scores locally for immediate use
        if (rankedPackages.length > 0) {
          const hybridRanked = [...rankedPackages].map(item => {
            const semanticMatch = semanticMatches.find((sm: any) => sm.packageId === (item.pkg.id || (item.pkg as any).Destination_ID))
            let semanticBoost = 0
            if (semanticMatch) {
              semanticBoost = semanticMatch.score * 50 // Boost score by up to 50 points based on semantic relevance
            }
            return { ...item, score: item.score + semanticBoost, semanticScore: semanticMatch?.score }
          }).sort((a, b) => b.score - a.score)

          bestMatch = hybridRanked[0]?.pkg
          console.log('✨ Hybrid ranking applied. Top match:', (bestMatch as any)?.Destination_Name)
        }
      }
    } catch (error) {
      console.error('❌ Semantic search failed:', error)
      // Continue with rule-based bestMatch
    }

    // Reset the flag before sending AI response
    setAiResponseComplete(false)

    if (!bestMatch) {
      // 🧠 SMART FALLBACK: If strict filters found nothing, use pure Semantic Search results
      if (semanticMatches.length > 0) {
        console.log('💡 Smart Fallback: Using semantic matches (strict filters failed)')
        const fallbackMatch = semanticMatches[0]
        // Find the full package object for this fallback result
        const fullPackage = allPackages.find(p => (p.id === fallbackMatch.packageId) || ((p as any).Destination_ID === fallbackMatch.packageId))

        if (fullPackage) {
          bestMatch = fullPackage
          // We found a semantic match! Proceed with it but mention it might vary slightly.
        }
      }
    }

    if (!bestMatch) {
      if (currentInfo.destination) {
        // ENHANCED FALLBACK: Analyze WHY no packages matched and suggest adjustments
        const normalizedDest = normalizeDestination(currentInfo.destination)
        const destPackages = allPackages.filter((pkg: DestinationPackage) => {
          const pkgAny = pkg as any
          const pkgName = normalizeDestination(pkgAny.Destination_Name || '')
          return pkgName.includes(normalizedDest) || normalizedDest.includes(pkgName)
        })

        if (destPackages.length === 0) {
          // No packages for this destination at all
          await sendAssistantPrompt(
            withStyle(`I don't have any packages for ${currentInfo.destination} yet. Would you like to explore a different destination? Available: ${destinations.map(d => d.name).slice(0, 5).join(', ')}.`, 50)
          )
        } else {
          // Packages exist but don't match criteria - analyze why
          const suggestions: string[] = []

          // Check duration mismatch
          if (currentInfo.days) {
            const requestedDays = parseInt(currentInfo.days, 10)
            const availableDays = new Set<number>()
            destPackages.forEach((pkg: DestinationPackage) => {
              const pkgAny = pkg as any
              const days = pkgAny.Duration_Days || extractDaysFromDuration(pkgAny.Duration || '')
              if (days) availableDays.add(days)
            })
            const sortedDays = Array.from(availableDays).sort((a, b) => a - b)
            if (sortedDays.length > 0 && !sortedDays.includes(requestedDays)) {
              const closest = sortedDays.reduce((a, b) => Math.abs(b - requestedDays) < Math.abs(a - requestedDays) ? b : a)
              suggestions.push(`try **${closest} days** instead of ${requestedDays}`)
            }
          }

          // Check hotel type mismatch
          if (currentInfo.hotelType) {
            const availableStars = new Set<string>()
            destPackages.forEach((pkg: DestinationPackage) => {
              const pkgAny = pkg as any
              const starMatch = pkgAny.Star_Category?.match(/(\d+)/)
              if (starMatch) availableStars.add(`${starMatch[1]} Star`)
            })
            const starArray = Array.from(availableStars)
            if (starArray.length > 0 && !starArray.includes(currentInfo.hotelType)) {
              suggestions.push(`try **${starArray[0]}** hotel instead of ${currentInfo.hotelType}`)
            }
          }

          // Check travel type mismatch  
          if (currentInfo.travelType) {
            const availableTypes = new Set<string>()
            destPackages.forEach((pkg: DestinationPackage) => {
              const pkgAny = pkg as any
              if (pkgAny.Travel_Type) {
                pkgAny.Travel_Type.toLowerCase().split('/').forEach((t: string) => {
                  availableTypes.add(t.trim())
                })
              }
            })
            const typeArray = Array.from(availableTypes)
            if (typeArray.length > 0 && !typeArray.some(t => t.includes(currentInfo.travelType.toLowerCase()))) {
              suggestions.push(`this destination has **${typeArray.join(', ')}** packages`)
            }
          }

          if (suggestions.length > 0) {
            await sendAssistantPrompt(
              withStyle(`I couldn't find an exact match for your preferences, but I found some similar options! Suggestions: ${suggestions.join(', ')}. Would you like to see these?`, 60)
            )
          } else {
            await sendAssistantPrompt(
              withStyle(`I couldn't find your preferred package for ${currentInfo.destination}. I'll pass your preferences to a human expert who'll find the perfect match. Meanwhile, check Trip Details or try different options.`, 60)
            )
          }
        }
      } else {
        await sendAssistantPrompt(
          'Let the traveler know you could not find an exact package match but will have a human expert follow up shortly.'
        )
      }
      // Mark AI response as complete even if no package found
      setAiResponseComplete(true)
      return
    }

    const bestMatchAny = bestMatch as any
    const prompt = withStyle(
      `Summarize why the "${bestMatchAny.Destination_Name}" package (${bestMatchAny.Duration}, ${bestMatchAny.Price_Range_INR}) fits their ${currentInfo.travelType} trip to ${currentInfo.destination}. Include 2 short bullet highlights from this overview: ${bestMatchAny.Overview} and inclusions: ${bestMatchAny.Inclusions}. End by inviting them to review Trip Details.`,
      80
    )

    // Get available destinations for context
    const availableDests = destinations.length > 0
      ? destinations.map(d => d.name)
      : []

    // Pass the top 1 suggestion to be rendered with the message
    const suggestions = rankedPackages.slice(0, 1).map(({ pkg }) => pkg)

    // Generate smart, dynamic suggestions based on package content
    const generateSmartSuggestions = (pkg: any) => {
      const suggestions = []
      const overview = (pkg.Overview || '').toLowerCase()
      const inclusions = (pkg.Inclusions || '').toLowerCase()
      const type = (pkg.Travel_Type || '').toLowerCase()
      const name = pkg.Destination_Name || 'this package'

      // 1. Highlight-based question
      if (overview.includes('pool') && overview.includes('private')) {
        suggestions.push({ label: `Tell me about the Private Pool \uD83C\uDFCA\u200D\u2642\uFE0F`, action: "package-details", packageData: pkg })
      } else if (overview.includes('adventure') || overview.includes('sport')) {
        suggestions.push({ label: `What adventure activities are included? \uD83C\uDFC4\u200D\u2642\uFE0F`, action: "package-details", packageData: pkg })
      } else if (overview.includes('romantic') || type.includes('couple')) {
        suggestions.push({ label: `Is this good for a honeymoon? \uD83D\uDC70\u200D\u2640\uFE0F`, action: "package-details", packageData: pkg })
      } else if (overview.includes('family') || type.includes('family')) {
        suggestions.push({ label: `Is this kid-friendly? \uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66`, action: "package-details", packageData: pkg })
      } else {
        suggestions.push({ label: `Tell me more about ${name} \u2728`, action: "package-details", packageData: pkg })
      }

      // 2. Comparison/Value question
      suggestions.push({ label: `Show me similar packages for ${tripInfo.destination} \uD83D\uDD04`, action: "show-alternatives" })

      // 3. Inclusions/Specifics
      if (inclusions.includes('candle') || inclusions.includes('dinner')) {
        suggestions.push({ label: `Tell me about the Candle Light Dinner \uD83D\uDD6F\uFE0F`, action: "show-inclusions", packageData: pkg })
      } else if (inclusions.includes('cruise')) {
        suggestions.push({ label: `What's included in the Cruise? \uD83D\uDEA2`, action: "show-inclusions", packageData: pkg })
      } else {
        suggestions.push({ label: `What's included in the price? \uD83D\uDCB0`, action: "show-inclusions", packageData: pkg })
      }

      // 4. Itinerary (Always useful)
      suggestions.push({ label: `Show day-wise plan for ${name} \uD83D\uDCC5`, action: "show-itinerary", packageData: pkg })

      return suggestions
    }

    const quickActions = generateSmartSuggestions(bestMatchAny)

    await sendAssistantPrompt(prompt, {
      packageMatch: bestMatch,
      recommendations: suggestions,
      quickActions
    }, availableDests)

    // Mark AI response as complete after the message is sent
    setAiResponseComplete(true)

    // Set conversation phase to post-recommendation
    setConversationPhase('post-recommendation')
    setShownPackageIds([bestMatchAny.Destination_ID || bestMatchAny.id || ''])
    // Track package details for AI context when comparing
    setShownPackages([{
      name: bestMatchAny.Destination_Name || '',
      duration: bestMatchAny.Duration || '',
      price: bestMatchAny.Price_Range_INR || '',
      starCategory: bestMatchAny.Star_Category || '',
      travelType: bestMatchAny.Travel_Type || '',
      overview: bestMatchAny.Overview || '',
    }])
    setCurrentRecommendationIndex(0)

    if (!tripDetailsAutoOpenedRef.current) {
      tripDetailsAutoOpenedRef.current = true
      onTripDetailsRequest?.()
    }
  }, [onTripDetailsRequest, rankedPackages, sendAssistantPrompt, destinations])

  // Handle quick action button clicks (AI-powered responses with database context)
  const handleQuickAction = useCallback(async (action: string, packageData?: DestinationPackage) => {
    const pkg = packageData as any

    switch (action) {
      case 'package-details':
        if (pkg) {
          // AI analyzes conversation + database data to give intelligent response
          const prompt = withStyle(
            `The user asked for more details about the "${pkg.Destination_Name}" package. Based on our conversation and their preferences (${tripInfo.travelType} trip, ${tripInfo.days} days, ${tripInfo.hotelType}), provide a detailed, personalized overview. Here's the package data from our database:
            
- Package: ${pkg.Destination_Name}
- Duration: ${pkg.Duration}
- Overview: ${pkg.Overview || 'Not available'}
- Travel Type: ${pkg.Travel_Type || 'Not specified'}
- Star Category: ${pkg.Star_Category || 'Not specified'}
- Price Range: ${pkg.Price_Range_INR || 'Contact for pricing'}
- Highlights: ${pkg.Highlights || 'Not available'}

Craft a natural, engaging response that highlights why this package fits their needs. Be conversational and enthusiastic.`,
            120
          )
          await sendAssistantPrompt(prompt)
        }
        break

      case 'show-alternatives':
        // Show 2nd and 3rd ranked packages from database with AI introduction
        const alternatives = rankedPackages.slice(1, 3).map(({ pkg }) => pkg)

        if (alternatives.length > 0) {
          // AI generates contextual introduction for alternatives
          const altNames = alternatives.map((p: any) => p.Destination_Name).join(' and ')

          // Construct context about WHY these are good alternatives using semantic scores
          let contextInfo = ''
          alternatives.forEach((pkg: any) => {
            const score = semanticScores.find(s => s.packageId === (pkg.Destination_ID || pkg.id))
            if (score && score.score > 0.75) {
              contextInfo += `- ${pkg.Destination_Name}: Strong match (${Math.round(score.score * 100)}%) for their vibe/preferences.\n`
            }
          })

          const prompt = withStyle(
            `The user wants to see alternative packages. Introduce these options naturally: ${altNames}. 
            ${contextInfo ? `Mention why they fit their vibe based on this data:\n${contextInfo}` : ''}
            Keep it brief and enthusiastic, mentioning they're also great matches for their ${tripInfo.travelType} trip to ${tripInfo.destination}.`,
            60
          )

          const firstAltName = (alternatives[0] as any).Destination_Name || tripInfo.destination
          // Generate context-aware actions for alternatives view
          // 1. Details for first option
          // 2. Booking options for EACH alternative shown
          const altActions: Array<{ label: string, action: string, packageData?: any }> = [
            { label: `Tell me more about ${firstAltName} \u2728`, action: "package-details", packageData: alternatives[0] }
          ]

          // Add booking buttons for each alternative
          alternatives.forEach((pkg: any) => {
            const name = (pkg as any).Destination_Name
            altActions.push({ label: `Ready to Book ${name} \uD83D\uDCC5`, action: "book-package", packageData: pkg })
          })

          // Add option to see even more
          altActions.push({ label: `Show me even more options \uD83D\uDD04`, action: "show-alternatives" })

          await sendAssistantPrompt(prompt, {
            recommendations: alternatives,
            quickActions: altActions
          })

          // Track shown packages - IDs
          const newIds = alternatives.map((p: any) => p.Destination_ID || p.id || '').filter(Boolean)
          setShownPackageIds(prev => [...prev, ...newIds])
          // Track shown packages - full details for AI context when comparing
          const newPackages = alternatives.map((p: any) => ({
            name: p.Destination_Name || '',
            duration: p.Duration || '',
            price: p.Price_Range_INR || '',
            starCategory: p.Star_Category || '',
            travelType: p.Travel_Type || '',
            overview: p.Overview || '',
          }))
          setShownPackages(prev => [...prev, ...newPackages])
          setCurrentRecommendationIndex(prev => prev + alternatives.length)
        } else {
          const prompt = withStyle(
            `Explain that you've shown all matching packages for their ${tripInfo.travelType} trip to ${tripInfo.destination}. Offer to help modify their preferences (dates, budget, duration) to see more options, or ask if they'd like to proceed with one of the packages already shown.`,
            50
          )
          await sendAssistantPrompt(prompt)
        }
        break

      case 'show-inclusions':
        if (pkg && pkg.Inclusions) {
          // AI analyzes inclusions and presents them naturally
          const prompt = withStyle(
            `The user asked what's included in "${pkg.Destination_Name}". Here's the inclusions data from our database:

${pkg.Inclusions}

Present this information in a clear, organized way. Group similar items together (accommodation, meals, activities, transfers, etc.) and highlight the key benefits that match their ${tripInfo.travelType} trip preferences. Be enthusiastic about the value they're getting.`,
            100
          )
          await sendAssistantPrompt(prompt)
        } else {
          const prompt = withStyle(
            `Apologize that detailed inclusions for "${pkg.Destination_Name}" aren't available in the system right now. Offer to connect them with a travel advisor who can provide complete details, or suggest they can check other packages.`,
            40
          )
          await sendAssistantPrompt(prompt)
        }
        break

      case 'book-package':
        if (pkg) {
          // Trigger lead form directly for booking intent
          setLeadFormPackage(pkg)
          setShowLeadForm(true)

          // Add AI confirmation message that encourages action
          const prompt = withStyle(
            `User wants to book "${pkg.Destination_Name}". Respond enthusiastically:
            - Confirm excellent choice
            - Say you're opening the secure booking form
            - Ask them to fill in their details so an expert can contact them right away.`,
            40
          )
          await sendAssistantPrompt(prompt)
        }
        break

      case 'show-itinerary':
        if (pkg && pkg.Day_Wise_Itinerary) {
          // AI formats and contextualizes the itinerary
          const prompt = withStyle(
            `The user wants to see the day-by-day itinerary for "${pkg.Destination_Name}". Here's the itinerary from our database:

${pkg.Day_Wise_Itinerary}

Present this in an engaging way, highlighting activities that would appeal to a ${tripInfo.travelType} traveler. Keep the day-by-day structure but make it conversational and exciting. Mention if any days are particularly special or unique.`,
            150
          )
          await sendAssistantPrompt(prompt)
        } else {
          const prompt = withStyle(
            `Explain that the detailed day-wise itinerary for "${pkg.Destination_Name}" isn't in the system yet. Offer to have a travel expert create a custom itinerary based on their ${tripInfo.travelType} preferences, or suggest they can check the itinerary for other packages.`,
            40
          )
          await sendAssistantPrompt(prompt)
        }
        break

      default:
        break
    }
  }, [rankedPackages, appendMessage, sendAssistantPrompt, tripInfo])

  const askNextQuestion = useCallback(
    async (infoOverride?: TripInfo) => {
      if (currentQuestion === 'complete') return
      const currentInfo = infoOverride ?? tripInfoRef.current
      let questionPrompt = ''

      if (!currentInfo.destination) {
        // Get available destinations (only Bali for now)
        const availableDests = destinations.length > 0
          ? destinations.map(d => d.name)
          : []

        questionPrompt = withStyle(
          `Greet them briefly and ask which destination they want to plan. Only mention these available destinations: ${availableDests.join(', ')}. Do not suggest any other destinations.`,
          30
        )
        setCurrentQuestion('destination')
      } else if (!currentInfo.travelDate) {
        questionPrompt = withStyle(
          `Thank them for choosing ${currentInfo.destination} and ask when they plan to travel—Next Month, Next Week, or do you have a specific date in mind?`,
          40
        )
        setCurrentQuestion('date')
      } else if (!currentInfo.days) {
        questionPrompt = withStyle(
          `Acknowledge their travel date and ask how many days they want in ${currentInfo.destination}. List these options in your message: (Options: 3 days, 5 days, 7 days, 10 days).`,
          40
        )
        setCurrentQuestion('days')
      } else if (!currentInfo.hotelType) {
        questionPrompt = withStyle(
          'Thank them and ask which stay style they prefer. List these options: (Options: 3★ Comfort, 4★ Premium, 5★ Luxury).',
          35
        )
        setCurrentQuestion('hotel')
      } else if (!currentInfo.travelType) {
        // Check if there are multiple travel type options available
        // If only one option exists, auto-select it and skip the question
        const availableOptions = destinationTravelTypeOptions.length > 0
          ? destinationTravelTypeOptions
          : travelerOptions

        if (availableOptions.length === 1) {
          // Only one option available - auto-select it and skip to next question
          const autoSelectedType = availableOptions[0].value
          updateTripInfo({ travelType: autoSelectedType })
          appendMessage({
            role: 'assistant',
            content: `Noted! You'll be travelling as a ${availableOptions[0].label.toLowerCase()}.`
          })
          // Skip to feedback question
          questionPrompt = withStyle(
            'Thank them for sharing their preferences. Ask if they have any specific questions, suggestions, or things they want to include in their trip (like spa, yoga, adventure activities, etc.). Mention they can skip if they want.',
            35
          )
          setCurrentQuestion('feedback')
        } else if (availableOptions.length === 0) {
          // No specific options - skip travel type question entirely
          updateTripInfo({ travelType: 'couple' }) // Default fallback
          // Skip to feedback question
          questionPrompt = withStyle(
            'Thank them for sharing their preferences. Ask if they have any specific questions, suggestions, or things they want to include in their trip (like spa, yoga, adventure activities, etc.). Mention they can skip if they want.',
            35
          )
          setCurrentQuestion('feedback')
        } else {
          // Multiple options available - show the question
          questionPrompt = withStyle(
            'Acknowledge their stay preference and ask who they are travelling with. List these options: (Options: Solo, Couple, Family, Friends).',
            35
          )
          setCurrentQuestion('travelType')
        }
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

      // Get available destinations for context
      const availableDests = destinations.length > 0
        ? destinations.map(d => d.name)
        : []

      // Get available day options for current destination (if on days question)
      const availableDayOptions = currentQuestion === 'days' && destinationDayOptions.length > 0
        ? destinationDayOptions.map(opt => opt.label)
        : []

      await sendAssistantPrompt(questionPrompt, {}, availableDests, availableDayOptions)
    },
    [currentQuestion, generateRecommendation, sendAssistantPrompt, destinationTravelTypeOptions, updateTripInfo, appendMessage, destinations]
  )

  // AI-powered data extraction function
  const extractDataWithAI = useCallback(async (
    userInput: string,
    currentQuestion: string,
    existingTripInfo: TripInfo
  ): Promise<{
    destination?: string | null
    travelDate?: string | null
    days?: string | null
    hotelType?: string | null
    travelType?: string | null
    budget?: string | null
    feedback?: string | null
    confidence: 'high' | 'medium' | 'low'
    understood: boolean
  }> => {
    // Show thinking indicator during extraction
    setIsTyping(true)
    setThinkingMessage(0)

    // Start rotating thinking messages
    const messageInterval = setInterval(() => {
      setThinkingMessage((prev) => (prev + 1) % thinkingMessages.length)
    }, 2000)

    try {
      // Get available destinations for context
      const availableDestinations = destinations.length > 0
        ? destinations.map(d => d.name)
        : travelData.destinations.map((d: any) => d.name)

      const response = await fetch('/api/ai-planner/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          currentQuestion,
          existingTripInfo,
          availableDestinations,
        }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('AI extraction failed:', error)
      return {
        confidence: 'low',
        understood: false,
      }
    } finally {
      clearInterval(messageInterval)
      setIsTyping(false)
      setThinkingMessage(0)
    }
  }, [destinations])

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

    const userInputLower = userInput.toLowerCase()

    // INTENT DETECTION: Priority check for context switching (New Destination)
    // If user mentions a new destination, we must prioritize that over current flow
    const availableDestinations = destinations.length > 0
      ? destinations
      : (travelData.destinations as any[])

    const foundNewDest = availableDestinations.find(d =>
      userInputLower.includes(d.name.toLowerCase())
    )

    if (foundNewDest) {
      // Check if it's actually a switch (different from current or we are in post-rec phase)
      if (foundNewDest.name !== latestInfo.destination || conversationPhase === 'post-recommendation') {
        const newDestName = foundNewDest.name

        // Reset necessary state for new destination
        const updates: Partial<TripInfo> = {
          destination: newDestName,
          // Reset other fields to allow fresh planning
          // Keep travelType/budget/hotel as they might be user prefs, but date/days usually change per trip
          // For safety/clarity, let's keep user prefs but reset specifics
        }

        updateTripInfo(updates)
        setConversationPhase('collecting-info')
        setAiResponseComplete(false)
        setFeedbackAnswered(false)
        setUserFeedback('')

        // If user explicitly asked for "package" in the same message, we can try to shortcut
        // But safer to just ask for Date to confirm intent and flow
        const prompt = withStyle(
          `User wants to switch to ${newDestName}. Acknowledge the switch enthusiastically and ask when they plan to travel—Next Month, Next Week, or do you have a specific date in mind?`,
          40
        )
        // Reset question flow
        setCurrentQuestion('date')
        await sendAssistantPrompt(prompt)
        return
      }
    }

    // INTENT DETECTION: Post-recommendation phase handling
    if (conversationPhase === 'post-recommendation') {
      const lastRecommendation = messages.filter(m => m.role === 'assistant' && m.recommendations && m.recommendations.length > 0).pop()
      const lastPackage = lastRecommendation?.recommendations?.[0]

      // Check if user typed a number (1-4)
      const numberMatch = userInput.trim().match(/^(\d)\.?$/)
      if (numberMatch) {
        const num = parseInt(numberMatch[1], 10)
        // Map number to action based on the quick actions shown
        if (num === 1 && lastPackage) {
          await handleQuickAction('package-details', lastPackage)
          return
        } else if (num === 2) {
          await handleQuickAction('show-alternatives')
          return
        } else if (num === 3 && lastPackage) {
          await handleQuickAction('show-inclusions', lastPackage)
          return
        } else if (num === 4 && lastPackage) {
          await handleQuickAction('show-itinerary', lastPackage)
          return
        }
      }

      // Detect user intent in post-recommendation phase
      // 1. Check for Confirmation keywords (Yes, sure, etc.) - Assumption: User wants details
      if ((userInputLower === 'yes' || userInputLower === 'sure' || userInputLower === 'okay' ||
        userInputLower === 'yup' || userInputLower === 'ok' || userInputLower === 'correct' ||
        userInputLower.includes('show package') || userInputLower.includes('package detail')) && lastPackage) {
        await handleQuickAction('package-details', lastPackage)
        return
      }

      // 2. Check for explicit "Book" intent - SHOW LEAD FORM
      if ((userInputLower.includes('book') || userInputLower.includes('booking') ||
        userInputLower.includes('ready to book') || userInputLower.includes('want to book')) && lastPackage) {
        // Show lead form for booking intent
        setLeadFormPackage(lastPackage)
        setShowLeadForm(true)
        appendMessage({
          role: 'assistant',
          content: "Great! Let me collect your details so our travel expert can assist you with booking."
        })
        return
      }

      if (userInputLower.includes('more') || userInputLower.includes('other') ||
        userInputLower.includes('alternative') || userInputLower.includes('different') ||
        userInputLower.includes('more option')) {
        // User wants to see alternatives
        await handleQuickAction('show-alternatives')
        return
      }

      if ((userInputLower.includes('detail') || userInputLower.includes('tell me more') ||
        userInputLower.includes('more about') || userInputLower.includes('information') ||
        userInputLower.includes('package')) && lastPackage) {
        // User wants more details
        await handleQuickAction('package-details', lastPackage)
        return
      }

      if ((userInputLower.includes('include') || userInputLower.includes('inclusion') ||
        userInputLower.includes('what') && userInputLower.includes('include')) && lastPackage) {
        // User wants inclusions
        await handleQuickAction('show-inclusions', lastPackage)
        return
      }

      if ((userInputLower.includes('itinerary') || userInputLower.includes('day wise') ||
        userInputLower.includes('schedule') || userInputLower.includes('plan')) && lastPackage) {
        // User wants itinerary
        await handleQuickAction('show-itinerary', lastPackage)
        return
      }

      // FEATURE VERIFICATION: Check if user is asking about specific features (e.g., "Does it have a pool?")
      const isFeatureQuestion = (userInputLower.includes('does it have') || userInputLower.includes('is there') ||
        userInputLower.includes('do they have') || userInputLower.includes('wifi') ||
        userInputLower.includes('pool') || userInputLower.includes('breakfast') ||
        userInputLower.includes('gym') || userInputLower.includes('spa') ||
        userInputLower.includes('balcony') || userInputLower.includes('view')) && lastPackage

      if (isFeatureQuestion && lastPackage) {
        // 1. Check if CURRENT package has the feature
        // Remove common question words to get the feature term
        const featureTerm = userInputLower
          .replace('does it have', '')
          .replace('is there', '')
          .replace('do they have', '')
          .replace(' a ', ' ')
          .replace(' an ', ' ')
          .replace(' the ', ' ')
          .replace('?', '')
          .trim()

        const matchScore = searchPackageByFeedback(lastPackage, featureTerm)

        if (matchScore > 20) { // Threshold for "Yes"
          const prompt = withStyle(
            `The user asked: "${userInput}". The current package "${(lastPackage as any).Destination_Name}" DOES have "${featureTerm}" (Match Score: ${matchScore}). 
            Confirm this enthusiastically and mention the specific details from the package description: ${(lastPackage as any).Overview} or inclusions: ${(lastPackage as any).Inclusions}.`,
            80
          )
          await sendAssistantPrompt(prompt)
          return
        } else {
          // 2. If current package doesn't have it, search strictly for this feature in OTHER packages
          // We use the semantic search API to find the best match for this specific feature
          try {
            const searchQuery = `${featureTerm} in ${tripInfo.destination}`
            const response = await fetch('/api/semantic-search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: searchQuery,
                topK: 3,
                filter: { destinationName: tripInfo.destination }
              }),
            })

            const data = await response.json()
            const bestAlternative = data.results && data.results.length > 0 ? data.results[0] : null

            if (bestAlternative && bestAlternative.score > 0.78) {
              // Found a better match!
              const altPackage = allPackages.find(p => (p.id === bestAlternative.packageId) || ((p as any).Destination_ID === bestAlternative.packageId))

              if (altPackage && (altPackage as any).Destination_Name !== (lastPackage as any).Destination_Name) {
                const prompt = withStyle(
                  `The user asked: "${userInput}". The current package "${(lastPackage as any).Destination_Name}" does NOT appear to have "${featureTerm}". 
                      HOWEVER, I found another package "${(altPackage as any).Destination_Name}" that DOES seem to have it (Match: ${Math.round(bestAlternative.score * 100)}%).
                      
                      Politely inform the user that the current package might not meet this specific request, and offer to show them "${(altPackage as any).Destination_Name}" instead.`,
                  100
                )

                await sendAssistantPrompt(prompt, {
                  startNewSearch: true, // Signal to UI to potentially clear previous context if needed
                  recommendations: [altPackage],
                  quickActions: [
                    { label: `Show me ${(altPackage as any).Destination_Name}`, action: "package-details", packageData: altPackage },
                    { label: "Keep looking at current package", action: "package-details", packageData: lastPackage }
                  ]
                })
                return
              }
            }
          } catch (e) {
            console.error("Feature search failed", e)
          }

          // Double check: maybe it IS in the current package but fuzzy match failed? 
          // Let AI handle the "No" gracefully if no alternative found
          const prompt = withStyle(
            `The user asked: "${userInput}". I couldn't find a strong mention of "${featureTerm}" in "${(lastPackage as any).Destination_Name}". 
            Answer honestly based on: ${(lastPackage as any).Overview} and Inclusions: ${(lastPackage as any).Inclusions}. 
            If it's truly not there, apologize and ask if this is a deal-breaker.`,
            60
          )
          await sendAssistantPrompt(prompt)
          return
        }
      }

      // COMPARISON DETECTION: Check if user wants to compare packages
      const isComparisonRequest = userInputLower.includes('compare') || userInputLower.includes('which is best') ||
        userInputLower.includes('difference between') || userInputLower.includes('which one') ||
        (userInputLower.includes('all') && (userInputLower.includes('package') || userInputLower.includes('three') || userInputLower.includes('3')))

      if (isComparisonRequest) {
        // Build explicit comparison prompt with all package details
        const packages = shownPackagesRef.current
        if (packages.length > 0) {
          let comparisonPrompt = `The user wants to COMPARE these ${packages.length} packages. You MUST compare ALL of them:\n\n`
          packages.forEach((pkg, i) => {
            comparisonPrompt += `${i + 1}. "${pkg.name}" - ${pkg.price}, ${pkg.duration}, ${pkg.starCategory}\n`
          })
          // Include user's specific interest (e.g., "spa", "adventure", "religious")
          comparisonPrompt += `\nUser asked: "${userInput}"\nProvide a clear comparison listing each package by name, their prices, durations, and what makes each unique. End with "Based on your preferences, I recommend [Package Name] because..."`

          const prompt = withStyle(comparisonPrompt, 150) // Allow longer response for comparison
          await sendAssistantPrompt(prompt)
          return
        }
        // If no packages tracked yet, fall through to generic AI response
      }

      // If no specific intent detected, let AI respond naturally
      const prompt = withStyle(`The user said: "${userInput}". Respond conversationally and offer to help with package details, alternatives, or booking.`, 40)
      await sendAssistantPrompt(prompt)
      return
    }

    // Check if user is asking for packages/inquiry form
    const wantsPackages = userInputLower.includes('inquiry') ||
      userInputLower.includes('form') ||
      userInputLower.includes('package') && (userInputLower.includes('show') || userInputLower.includes('dikhao') || userInputLower.includes('chahiye'))

    // Check if user mentions honeymoon/romantic trip
    const mentionsHoneymoon = userInputLower.includes('honeymoon') ||
      userInputLower.includes('romantic') ||
      (userInputLower.includes('package') && userInputLower.includes('honeymoon'))

    // Check if user is confirming/agreeing to Bali
    const isConfirming = userInputLower.includes('yes') ||
      userInputLower.includes('okay') ||
      userInputLower.includes('ok') ||
      userInputLower.includes('theek') ||
      userInputLower.includes('haan') ||
      userInputLower.includes('hmm')

    // If user mentions honeymoon but no destination, ask for confirmation
    if (mentionsHoneymoon && !latestInfo.destination && currentQuestion === 'destination') {
      const availableDests = destinations.length > 0
        ? destinations.map(d => d.name)
        : []

      const prompt = withStyle(
        availableDests.length > 0
          ? `Perfect! ${availableDests[0]} is an amazing honeymoon destination. Would you like to plan your honeymoon in ${availableDests[0]}? Just say "yes" or type "${availableDests[0]}" to continue.`
          : `Perfect! I'd love to help you plan your honeymoon. Which destination would you like to explore?`,
        35
      )
      await sendAssistantPrompt(prompt, {}, availableDests)
      return
    }

    // If user is confirming/agreeing but we don't have destination yet, check context first
    if (isConfirming && !latestInfo.destination && currentQuestion === 'destination') {
      // Check if Bali was mentioned in previous messages (including AI responses)
      const recentMessages = messagesRef.current.slice(-5)
      const baliMentioned = recentMessages.some(msg =>
        msg.content.toLowerCase().includes('bali')
      )

      if (baliMentioned) {
        // User confirmed, set Bali as destination and continue
        const updates: Partial<TripInfo> = { destination: 'Bali' }
        const nextInfo = updateTripInfo(updates)
        await askNextQuestion(nextInfo)
        return
      } else {
        // No destination mentioned, ask for confirmation
        const availableDests = destinations.length > 0
          ? destinations.map(d => d.name)
          : []

        const prompt = withStyle(
          availableDests.length > 0
            ? `Great! I'd love to help you plan your trip. Which destination would you like to explore? Available destinations: ${availableDests.join(', ')}.`
            : `Great! I'd love to help you plan your trip. Which destination would you like to explore?`,
          35
        )
        await sendAssistantPrompt(prompt, {}, availableDests)
        return
      }
    }

    // Use AI to extract data from user response
    const extractedData = await extractDataWithAI(userInput, currentQuestion, latestInfo)

    // If user wants to see packages and we now have enough info, show packages
    if (wantsPackages && latestInfo.destination) {
      // User wants packages - generate recommendations directly
      setCurrentQuestion('complete')
      setFeedbackAnswered(true)
      setUserFeedback('')
      setAiResponseComplete(false)
      await generateRecommendation()
      return
    }

    // If AI understood the response, use extracted data
    if (extractedData.understood) {
      const updates: Partial<TripInfo> = {}
      let hasUpdates = false

      // Update trip info with extracted data
      // Also check if user mentioned destination in confirming context
      if ((extractedData.destination || (isConfirming && !latestInfo.destination)) && !latestInfo.destination) {
        // If confirming, check if Bali was mentioned in conversation context
        const recentMessages = messagesRef.current.slice(-5)
        const baliMentioned = recentMessages.some(msg =>
          msg.content.toLowerCase().includes('bali')
        )

        // If confirming and Bali was mentioned, use Bali
        const dest = extractedData.destination || (isConfirming && baliMentioned ? 'Bali' : null)

        if (dest) {
          // Normalize destination to match database (case-insensitive)
          const normalizedDest = dest.trim()
          const destLower = normalizedDest.toLowerCase()

          // Check if destination is Bali - only Bali is supported for now
          const availableDests = destinations.length > 0
            ? destinations.map(d => d.name)
            : []

          if (!availableDests.some(d => d.toLowerCase() === destLower)) {
            // Destination not in available list - check for "Did you mean?" suggestions
            const closestMatches = findClosestDestinations(normalizedDest, 3)

            let prompt: string
            if (closestMatches.length > 0 && closestMatches[0].similarity > 0.5) {
              // Good matches found - suggest them
              const suggestions = closestMatches.map(m => m.name).join(', ')
              prompt = withStyle(
                `I couldn't find "${extractedData.destination}" in our database. Did you mean: **${suggestions}**? Please type the correct destination name.`,
                40
              )
            } else {
              // No good matches - show available destinations
              prompt = withStyle(
                `I'm sorry, but "${extractedData.destination}" is not currently available. Our destinations are: ${availableDests.join(', ')}. Which one would you like to explore?`,
                50
              )
            }
            await sendAssistantPrompt(prompt, {}, availableDests)
            return
          }

          // Find the exact destination name from available destinations (for proper capitalization)
          const exactDest = availableDests.find(d => d.toLowerCase() === destLower) || normalizedDest

          // CRITICAL FIX: If we found a destination, and it's different from current, OR we are in 'complete' state
          // we MUST reset if it's a clear intent change.
          if (exactDest !== latestInfo.destination || currentQuestion === 'complete') {
            console.log('[AI Extraction] New destination detected, resetting flow:', exactDest)
            // Update destination
            updates.destination = exactDest
            hasUpdates = true

            // If we were complete, or switching destinations, reset other fields that might not be relevant anymore
            // unless user explicitly said "same dates" etc. (which would be handled by other extractors)
            if (currentQuestion === 'complete' || exactDest !== latestInfo.destination) {
              // Reset flow to date question
              setCurrentQuestion('date')
              // We keep travelType/budget/hotelType as they might be user preferences that persist
              // But we definitely need to re-verify dates and structure
            }
          } else {
            updates.destination = exactDest
            hasUpdates = true
          }
          // console.log('[AI Extraction] Destination extracted and normalized:', updates.destination)
        }
      }

      if (extractedData.travelDate && !latestInfo.travelDate) {
        // PAST DATE VALIDATION: Check if the extracted date is in the past
        const extractedDate = new Date(extractedData.travelDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset to start of day for accurate comparison

        if (extractedDate < today) {
          // Date is in the past - reject it and ask for a future date
          const prompt = withStyle(
            `I noticed you mentioned a past date. Please provide a travel date in the future. When are you planning to travel?`,
            35
          )
          await sendAssistantPrompt(prompt)
          return // Stop processing and wait for new input
        }

        updates.travelDate = extractedData.travelDate
        hasUpdates = true
      }

      if (extractedData.days && !latestInfo.days) {
        const dayNum = parseInt(extractedData.days, 10)
        if (!isNaN(dayNum) && dayNum > 0 && dayNum <= 60) {
          updates.days = extractedData.days
          hasUpdates = true
        }
      }

      if (extractedData.hotelType && !latestInfo.hotelType) {
        updates.hotelType = extractedData.hotelType
        hasUpdates = true
      }

      if (extractedData.travelType && !latestInfo.travelType) {
        updates.travelType = extractedData.travelType
        hasUpdates = true
      }

      // Special handling: If user says "honeymoon package" or similar, extract couple travel type
      if (!latestInfo.travelType && (
        userInputLower.includes('honeymoon') ||
        userInputLower.includes('romantic') ||
        (userInputLower.includes('package') && userInputLower.includes('honeymoon'))
      )) {
        updates.travelType = 'couple'
        hasUpdates = true
      }

      if (extractedData.budget && !latestInfo.budget) {
        updates.budget = extractedData.budget
        hasUpdates = true
      }

      // Handle feedback separately
      if (currentQuestion === 'feedback') {
        if (extractedData.feedback === null || userInput.toLowerCase().includes('skip')) {
          // User skipped feedback
          setUserFeedback('')
          setFeedbackAnswered(true)
          setAiResponseComplete(false)
          setCurrentQuestion('complete')
          await generateRecommendation()
          return
        } else if (extractedData.feedback) {
          // User provided feedback
          setUserFeedback(extractedData.feedback)
          setFeedbackAnswered(true)
          setAiResponseComplete(false)
          setCurrentQuestion('complete')
          await generateRecommendation()
          return
        }
      }

      // If we have updates, apply them and move to next question
      if (hasUpdates) {
        // console.log('[AI Extraction] Applying updates:', updates)
        const nextInfo = updateTripInfo(updates)
        // console.log('[AI Extraction] Updated tripInfo:', nextInfo)

        // If user asked for packages and we now have enough info, show packages
        if (wantsPackages && nextInfo.destination) {
          setCurrentQuestion('complete')
          setFeedbackAnswered(true)
          setUserFeedback('')
          setAiResponseComplete(false)
          await generateRecommendation()
          return
        }

        // Force move to next question after updating trip info
        setQuestionRetryCount(0) // Reset retry count on successful extraction
        await askNextQuestion(nextInfo)
        return
      } else if (extractedData.understood && extractedData.confidence === 'high') {
        // Even if no updates, if AI understood with high confidence, acknowledge and ask next question
        // This handles cases where user confirms something
        console.log('[AI Extraction] AI understood but no updates, moving to next question')

        // If user wants packages, show them
        if (wantsPackages && latestInfo.destination) {
          setCurrentQuestion('complete')
          setFeedbackAnswered(true)
          setUserFeedback('')
          setAiResponseComplete(false)
          await generateRecommendation()
          return
        }

        setQuestionRetryCount(0) // Reset retry count
        await askNextQuestion()
        return
      } else if (extractedData.understood && extractedData.confidence === 'medium') {
        // Medium confidence - show what we understood and ask for confirmation
        console.log('[AI Extraction] Medium confidence, asking for clarification')

        // Build confirmation message based on what was extracted
        const clarifications: string[] = []
        if (extractedData.destination) clarifications.push(`destination: **${extractedData.destination}**`)
        if (extractedData.travelDate) clarifications.push(`travel date: **${extractedData.travelDate}**`)
        if (extractedData.days) clarifications.push(`duration: **${extractedData.days} days**`)
        if (extractedData.hotelType) clarifications.push(`hotel: **${extractedData.hotelType}**`)
        if (extractedData.travelType) clarifications.push(`traveling: **${extractedData.travelType}**`)

        if (clarifications.length > 0) {
          const prompt = withStyle(
            `Just to confirm - I understood ${clarifications.join(', ')}. Is this correct? Say "yes" to continue or correct me.`,
            40
          )
          await sendAssistantPrompt(prompt)
          return
        }
      } else {
        console.log('[AI Extraction] AI did not understand or low confidence:', {
          understood: extractedData.understood,
          confidence: extractedData.confidence,
          extractedData
        })
      }
    }

    // Handle case where user wants packages but we don't have destination yet
    if (wantsPackages && !latestInfo.destination) {
      const availableDests = destinations.length > 0
        ? destinations.map(d => d.name)
        : []

      const prompt = withStyle(
        `I'd love to show you packages! To get started, can you confirm you want to explore ${availableDests[0]}? Just say "yes" or type "${availableDests[0]}" and I'll show you amazing packages!`,
        35
      )
      await sendAssistantPrompt(prompt, {}, availableDests)
      return
    }

    // Fallback to regex extraction if AI didn't understand or confidence is low
    // This ensures backward compatibility
    if (!latestInfo.destination) {
      const dest = extractDestination(userInput)
      if (dest) {
        // Check if destination is Bali - only Bali is supported for now
        const availableDests = destinations.length > 0
          ? destinations.map(d => d.name)
          : []

        if (!availableDests.some(d => d.toLowerCase() === dest.toLowerCase())) {
          const prompt = withStyle(
            `I'm sorry, but ${dest} is not currently available in our database. Currently available destinations are: ${availableDests.join(', ')}. Would you like to explore one of these instead?`,
            50
          )
          await sendAssistantPrompt(prompt, {}, availableDests)
          return
        }
        // Find the exact destination name from available destinations (for proper capitalization)
        const exactDest = availableDests.find(d => d.toLowerCase() === dest.toLowerCase()) || dest
        updateTripInfo({ destination: exactDest })

        const prompt = withStyle(
          `Great choice! When do you plan to travel—Next Month, Next Week, or do you have a specific date in mind?`,
          30
        )
        await sendAssistantPrompt(prompt, {}, availableDests)
        setCurrentQuestion('date')
        return
      }
    }

    // Fallback regex extraction for date
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

    // Fallback regex extraction for days
    if (currentQuestion === 'days') {
      if (isSameAnswer(userInput) && latestInfo.days) {
        await askNextQuestion()
        return
      }
      const days = extractNumber(userInput)
      if (days) {
        const dayNum = parseInt(days, 10)
        if (!isNaN(dayNum) && dayNum > 0 && dayNum <= 60) {
          const nextInfo = updateTripInfo({ days })
          await askNextQuestion(nextInfo)
          return
        }
      }
    }

    // Fallback regex extraction for hotel
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

    // Fallback regex extraction for travel type
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

    // Get available destinations for context
    const availableDests = destinations.length > 0
      ? destinations.map(d => d.name)
      : []

    // INPUT VALIDATION RETRY LOOP
    // Track retries and provide increasingly helpful prompts
    const newRetryCount = questionRetryCount + 1
    setQuestionRetryCount(newRetryCount)

    // Define retry-aware prompts with examples
    const getRetryPrompt = (question: string, retryNum: number): string => {
      const prompts: Record<string, { first: string; second: string; final: string }> = {
        destination: {
          first: `I didn't quite catch which destination you want to explore. Could you please type one of these: ${availableDests.slice(0, 5).join(', ')}?`,
          second: `Hmm, I'm still not sure about the destination. Just type the name like "Bali" or "Maldives". Available: ${availableDests.join(', ')}.`,
          final: `I'm having trouble understanding. Would you like me to suggest our most popular destination, ${availableDests[0] || 'Bali'}? Just say "yes".`
        },
        date: {
          first: `I didn't catch your travel date. You can say things like "next month", "March 15", or "in 2 weeks".`,
          second: `Still need your travel date! Try: "next week", "15th March", or just the month like "April".`,
          final: `No worries! Should I assume you're flexible with dates? Say "yes" or give me a date.`
        },
        days: {
          first: `How many days is your trip? Just type a number like "5" or say "one week".`,
          second: `I need the trip duration. Examples: "5 days", "a week", or just "7".`,
          final: `Would you like me to suggest a ${destinationDayOptions[0]?.value || '5'}-day trip? Say "yes" or tell me your preferred duration.`
        },
        hotel: {
          first: `What's your hotel preference? Options: ${destinationHotelOptions.map(h => h.label).join(', ') || '3-star, 4-star, or 5-star'}.`,
          second: `I need your hotel type. Just say "3 star", "4 star", or "5 star" (or "budget", "premium", "luxury").`,
          final: `Should I go with ${destinationHotelOptions[0]?.label || '4★ Premium'}? Say "yes" or pick your style.`
        },
        travelType: {
          first: `Who are you traveling with? Options: Solo, Couple, Family, or Friends.`,
          second: `Please tell me your travel group: "solo", "couple", "family", or "friends".`,
          final: `Would you like me to assume this is a ${destinationTravelTypeOptions[0]?.label || 'Couple'} trip? Say "yes" or correct me.`
        }
      }

      const questionPrompts = prompts[question] || {
        first: 'Could you please clarify that?',
        second: 'I still need that information. Could you try again?',
        final: 'Let me know if you need help with this.'
      }

      if (retryNum === 1) return questionPrompts.first
      if (retryNum === 2) return questionPrompts.second
      return questionPrompts.final
    }

    const fallbackPrompt = withStyle(
      getRetryPrompt(currentQuestion, newRetryCount),
      35
    )
    await sendAssistantPrompt(fallbackPrompt, {}, availableDests)
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
    extractDataWithAI,
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

  // Reset conversation and start fresh
  const handleNewChat = useCallback(() => {
    // Reset all state - the useEffect will handle sending the initial greeting
    setMessages([])
    messagesRef.current = []
    setInput('')
    setIsTyping(false)
    setProgress(0)
    setCompletedSteps(0)
    setTripInfo({
      destination: '',
      travelDate: '',
      days: '',
      budget: '',
      hotelType: '',
      preferences: [],
      travelType: '',
    })
    setUserFeedback('')
    setCurrentQuestion('destination')
    setFeedbackAnswered(false)
    setAiResponseComplete(false)
    setConversationPhase('collecting-info')
    setShownPackageIds([])
    shownPackagesRef.current = [] // Reset the ref too
    setShownPackages([])
    setCurrentRecommendationIndex(0)
    setQuestionRetryCount(0)
    tripDetailsAutoOpenedRef.current = false
    // Reset this flag and increment key to trigger useEffect
    initialPromptSentRef.current = false
    setChatResetKey(prev => prev + 1)
  }, [])

  return (
    <div
      className={`bg-white overflow-hidden relative w-full max-w-full ${isMobileChatMode
        ? 'fixed inset-0 z-50 flex flex-col rounded-none'
        : 'h-[92vh] w-full max-w-[1600px] mx-auto rounded-2xl shadow-2xl border border-gray-200/50 flex flex-row overflow-hidden md:h-[85vh]'
        }`}
      style={isMobileChatMode ? { height: '100dvh', maxHeight: '-webkit-fill-available' } : undefined}
      onClick={() => {
        // On mobile (when not in mobile chat mode), clicking anywhere opens full-screen chat
        if (!isMobileChatMode && onOpenMobileChat && window.innerWidth < 768) {
          onOpenMobileChat()
        }
      }}
    >
      {/* Voice Output Indicator/Stop Button */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-sm cursor-pointer hover:bg-black/90"
            onClick={stopSpeaking}
          >
            <div className="flex gap-1 items-center">
              <span className="animate-pulse w-1 h-3 bg-white/50 rounded-full" />
              <span className="animate-pulse w-1 h-5 bg-white/80 rounded-full delay-75" />
              <span className="animate-pulse w-1 h-3 bg-white/50 rounded-full delay-150" />
            </div>
            <span className="text-xs font-medium">Speaking... Click to Stop</span>
            <Square className="w-3 h-3 ml-1 fill-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative gradient overlay - hide in mobile chat mode */}
      {!isMobileChatMode && (
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none"></div>
      )}

      {/* Desktop Sidebar (Visual Placeholder for Portal Feel) */}
      {!isMobileChatMode && (
        <div className="hidden lg:flex w-64 bg-gray-50 border-r border-gray-100 flex-col p-4">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-100">
              <div className="w-4 h-4 bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm animate-pulse" />
            </div>
            <span className="font-semibold text-gray-700">Trip Planner</span>
          </div>

          <div className="space-y-1 flex-1 overflow-hidden flex flex-col">
            <button
              onClick={startNewTrip}
              className="w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-800 flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              New Trip Plan
            </button>

            <div className="px-3 py-2 text-xs font-semibold text-gray-400 mt-4 uppercase tracking-wider">Recent</div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {savedTrips.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400 italic">No saved trips yet</p>
              ) : (
                savedTrips.slice(0, 10).map((trip) => (
                  <div
                    key={trip.id}
                    className={`group flex items-center gap-1 rounded-lg transition-colors ${currentTripId === trip.id
                      ? 'bg-purple-50 border border-purple-100'
                      : 'hover:bg-gray-100'
                      }`}
                  >
                    <button
                      onClick={() => loadTrip(trip)}
                      className={`flex-1 text-left px-3 py-2 text-sm truncate ${currentTripId === trip.id ? 'text-purple-700' : 'text-gray-500'
                        }`}
                    >
                      {trip.name || 'New Trip'}
                    </button>
                    <button
                      onClick={(e) => deleteTrip(trip.id, e)}
                      className="p-1 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
                      title="Delete trip"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* <div className="mt-auto">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-xs text-purple-800 font-medium mb-1">Upgrade Plan</p>
              <p className="text-[10px] text-purple-600">Get unlimited AI trip generations.</p>
            </div>
          </div> */}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-white">

        {/* Mobile History Drawer */}
        <AnimatePresence>
          {showMobileHistory && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setShowMobileHistory(false)}
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45" />
                    <span className="font-semibold text-gray-800">Chat History</span>
                  </div>
                  <button
                    onClick={() => setShowMobileHistory(false)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* New Trip Button */}
                <div className="p-3">
                  <button
                    onClick={() => {
                      startNewTrip()
                      setShowMobileHistory(false)
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-purple-50 border border-purple-100 text-sm font-medium text-purple-700 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    New Trip Plan
                  </button>
                </div>

                {/* Saved Trips List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {savedTrips.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No saved trips yet</p>
                  ) : (
                    savedTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className={`group flex items-center gap-1 rounded-lg transition-colors ${currentTripId === trip.id
                          ? 'bg-purple-50 border border-purple-100'
                          : 'hover:bg-gray-50'
                          }`}
                      >
                        <button
                          onClick={() => {
                            loadTrip(trip)
                            setShowMobileHistory(false)
                          }}
                          className={`flex-1 text-left px-3 py-2.5 text-sm truncate ${currentTripId === trip.id ? 'text-purple-700' : 'text-gray-600'
                            }`}
                        >
                          {trip.name || 'New Trip'}
                        </button>
                        <button
                          onClick={(e) => deleteTrip(trip.id, e)}
                          className="p-1.5 mr-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>


        {/* Header - Clean & Minimal */}
        <div className="flex-shrink-0 h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white z-10">
          <div className="flex items-center gap-3">
            {isMobileChatMode && (
              <button onClick={onCloseMobileChat} className="p-1 -ml-1">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                {!isMobileChatMode && <span className="lg:hidden">Trip Planner</span>}
                {isMobileChatMode && "AI Trip Planner"}
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold tracking-wide uppercase">Beta</span>
              </h2>
              {/* <p className="text-xs text-gray-400">Powered by Claude 4.5 Sonnet & ChatGPT 5.2</p> */}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* History button for mobile - shows saved trips drawer */}
            {isMobileChatMode && savedTrips.length > 0 && (
              <button
                onClick={() => setShowMobileHistory(true)}
                className="p-2 rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                title="Chat History"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>
        </div>
        {/* Voice Output Indicator/Stop Button */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-sm cursor-pointer hover:bg-black/90 transition-all"
              onClick={(e) => {
                e.stopPropagation()
                stopSpeaking()
              }}
            >
              <div className="flex gap-1 items-center">
                <span className="animate-pulse w-1 h-3 bg-white/50 rounded-full" />
                <span className="animate-pulse w-1 h-5 bg-white/80 rounded-full delay-75" />
                <span className="animate-pulse w-1 h-3 bg-white/50 rounded-full delay-150" />
              </div>
              <span className="text-xs font-medium whitespace-nowrap">Speaking... Click to Stop</span>
              <Square className="w-3 h-3 ml-1 fill-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Content Area - Contains messages AND all selectors */}
        {/* This is the middle section that scrolls, like WhatsApp */}
        <div
          ref={messagesContainerRef}
          className={`overflow-y-auto relative z-10 flex-1 min-h-0 pb-40`}
          style={{ scrollPaddingTop: '80px' }}
        >
          {/* Messages */}
          <div className="p-4 md:p-6 pb-40 space-y-3 md:space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  layout
                  className="flex flex-col gap-2 w-full"
                >
                  <div
                    className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <div className="w-4 h-4 bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm animate-pulse" />
                      </div>
                    )}

                    <div
                      className={`group relative max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-sm md:text-base leading-relaxed ${message.role === 'user'
                        ? 'bg-black text-white rounded-tr-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                        }`}
                    >
                      {message.role === 'assistant' ? (
                        <div
                          className="markdown-content"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                        />
                      ) : (
                        <p className="whitespace-pre-line">{message.content}</p>
                      )}

                      {/* Speaker Button for AI messages */}
                      {message.role === 'assistant' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            isSpeaking ? stopSpeaking() : speakText(message.content)
                          }}
                          className="absolute -bottom-5 left-0 p-1 text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all"
                          title="Read aloud"
                        >
                          {isSpeaking ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Render Recommended Packages if present */}
                  {message.role === 'assistant' && message.recommendations && message.recommendations.length > 0 && (
                    <div className="pl-0 md:pl-11 w-full mt-2">
                      <div className="bg-gray-50 rounded-xl p-3 md:p-4 border border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Recommended for you</p>
                            <p className="text-[10px] text-gray-500">Based on your preferences</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 w-full">
                          {message.recommendations.map((pkg) => {
                            const pkgAny = pkg as any
                            const imageUrl = pkgAny.Primary_Image_URL
                              ? pkgAny.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
                              : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'

                            const packageId = pkgAny.Destination_ID || pkgAny.id || 'package'
                            const destinationName = tripInfo.destination || pkgAny.Destination_Name || 'Bali'
                            const packageUrl = `/destinations/${encodeURIComponent(destinationName)}/${encodeURIComponent(packageId)}`

                            return (
                              <div
                                key={pkgAny.Destination_ID || pkgAny.id}
                                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 hover:shadow-md transition-all w-full"
                              >
                                <div className="flex flex-col sm:flex-row min-h-[8rem]">
                                  <div className="relative w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 bg-gray-100">
                                    <img
                                      src={imageUrl}
                                      alt={pkgAny.Destination_Name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 p-3 flex flex-col justify-between">
                                    <div>
                                      <div className="flex justify-between items-start gap-2">
                                        <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{pkgAny.Destination_Name}</h4>
                                        <span className="text-xs font-bold text-primary whitespace-nowrap">₹{pkgAny.Price_Range_INR}</span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1 mb-2">
                                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-md font-medium">{pkgAny.Duration}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium">{pkgAny.Star_Category}</span>
                                      </div>
                                      <p className="text-[10px] text-gray-600 line-clamp-2">{pkgAny.Overview}</p>

                                      {/* Highlights Section */}
                                      {(pkgAny.Highlights && (Array.isArray(pkgAny.Highlights) ? pkgAny.Highlights.length > 0 : typeof pkgAny.Highlights === 'string')) && (
                                        <div className="mt-2 bg-purple-50/50 rounded-lg p-2 border border-purple-100/50">
                                          <p className="text-[10px] font-semibold text-purple-900 mb-1.5 flex items-center gap-1">
                                            <span className="text-xs">✨</span> Highlights
                                          </p>
                                          <ul className="space-y-1">
                                            {(Array.isArray(pkgAny.Highlights)
                                              ? pkgAny.Highlights
                                              : String(pkgAny.Highlights).split(',')
                                            ).slice(0, 3).map((highlight: string, idx: number) => (
                                              <li key={idx} className="text-[10px] text-purple-800 flex items-start gap-1.5">
                                                <span className="mt-1 w-1 h-1 rounded-full bg-purple-400 flex-shrink-0"></span>
                                                <span className="line-clamp-1 leading-tight">{highlight.trim()}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                    <Link
                                      href={packageUrl}
                                      className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-1 self-end"
                                    >
                                      View Details
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render Quick Action Text Links (ChatGPT-style) if present */}
                  {message.role === 'assistant' && message.quickActions && message.quickActions.length > 0 && (
                    <div className="pl-0 md:pl-11 w-full mt-3">
                      <div className="flex flex-col gap-2">
                        {message.quickActions.map((action, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleQuickAction(action.action, action.packageData)}
                            className="text-left text-sm text-gray-700 hover:text-purple-700 hover:underline transition-all cursor-pointer bg-transparent border-none p-0 font-normal"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && (
              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl px-5 py-4 shadow-sm max-w-[85%] md:max-w-[80%]">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium animate-pulse">
                      {thinkingMessages[thinkingMessage]}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestions - Only show at start */}
          {/* Quick Suggestions REMOVED for Text-Only Experience */}

          {/* Animated Suggestion Rail REMOVED for Text-Only Experience */}

          <div className="hidden">
            <div className="max-w-3xl mx-auto">
              <AnimatePresence mode="wait">
                {/* DATE CHIPS */}
                {currentQuestion === 'date' && (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2"
                  >
                    <motion.button
                      variants={{
                        hidden: { y: 20, opacity: 0 },
                        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCalendar(!showCalendar);
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-white/90 backdrop-blur-md text-purple-700 text-sm font-medium border border-purple-200 rounded-full shadow-lg hover:bg-purple-50 transition-all flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      {tripInfo.travelDate ? new Date(tripInfo.travelDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Select Date'}
                    </motion.button>

                    {[
                      { label: 'Next Week', val: formatISODate(new Date(new Date().setDate(new Date().getDate() + 7))) },
                      { label: 'In 2 Weeks', val: formatISODate(new Date(new Date().setDate(new Date().getDate() + 14))) },
                      { label: 'Next Month', val: formatISODate(new Date(new Date().setMonth(new Date().getMonth() + 1))) }
                    ].map((item, idx) => (
                      <motion.button
                        key={idx}
                        variants={slideUp}
                        onClick={() => handleDateSelection(item.val)}
                        className="flex-shrink-0 px-4 py-2 bg-white/80 backdrop-blur-md text-gray-700 text-sm border border-gray-200 rounded-full shadow-sm hover:bg-white hover:text-purple-600 hover:border-purple-200 transition-all"
                      >
                        {item.label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* DAYS CHIPS */}
                {currentQuestion === 'days' && (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2"
                  >
                    {(destinationDayOptions.length > 0 ? destinationDayOptions : dayOptions).map((option) => (
                      <motion.button
                        key={option.value}
                        variants={slideUp}
                        onClick={() => handleDaySelect(option.label, option.value)}
                        className="flex-shrink-0 px-4 py-2 bg-white/80 backdrop-blur-md text-gray-700 text-sm border border-gray-200 rounded-full shadow-sm hover:scale-105 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all"
                      >
                        {option.label}
                        {option.label.match(/\d/) && !option.label.includes('Days') ? (parseInt(option.label) === 1 ? ' Day' : ' Days') : ''}
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* HOTEL CHIPS */}
                {currentQuestion === 'hotel' && (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2"
                  >
                    {(destinationHotelOptions.length > 0 ? destinationHotelOptions : hotelOptions).map((option) => (
                      <motion.button
                        key={option.value}
                        variants={slideUp}
                        onClick={() => handleHotelSelect(option.label, option.value)}
                        className="flex-shrink-0 px-4 py-2 bg-white/80 backdrop-blur-md text-gray-700 text-sm border border-gray-200 rounded-full shadow-sm hover:scale-105 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all"
                      >
                        <span className="font-semibold">{option.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* TRAVEL TYPE CHIPS */}
                {currentQuestion === 'travelType' && (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2"
                  >
                    {(destinationTravelTypeOptions.length > 0 ? destinationTravelTypeOptions : travelerOptions).map((option) => (
                      <motion.button
                        key={option.value}
                        variants={slideUp}
                        onClick={() => handleTravelTypeSelect(option.label, option.value)}
                        className="flex-shrink-0 px-4 py-2 bg-white/80 backdrop-blur-md text-gray-700 text-sm border border-gray-200 rounded-full shadow-sm hover:scale-105 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all"
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* FEEDBACK CHIPS */}
                {currentQuestion === 'feedback' && (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2"
                  >
                    <motion.button
                      variants={slideUp}
                      onClick={async () => {
                        setUserFeedback('Skip')
                        setFeedbackAnswered(true)
                        setAiResponseComplete(false)
                        setCurrentQuestion('complete')
                        appendMessage({ role: 'user', content: 'Skipped' })
                        await generateRecommendation()
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-gray-100/80 backdrop-blur-md text-gray-600 text-sm font-medium border border-transparent rounded-full shadow-sm hover:bg-gray-200 transition-all"
                    >
                      Skip
                    </motion.button>
                    {['Relaxing', 'Adventure', 'Romantic', 'Budget Friendly', 'Luxury'].map((tag) => (
                      <motion.button
                        key={tag}
                        variants={slideUp}
                        onClick={async () => {
                          const feedback = tag
                          setUserFeedback(feedback)
                          setFeedbackAnswered(true)
                          setAiResponseComplete(false)
                          setCurrentQuestion('complete')
                          appendMessage({ role: 'user', content: feedback })
                          await generateRecommendation()
                        }}
                        className="flex-shrink-0 px-4 py-2 bg-white/80 backdrop-blur-md text-purple-700 text-sm border border-purple-100 rounded-full shadow-sm hover:bg-purple-50 hover:border-purple-200 transition-all"
                      >
                        <Sparkles className="w-3 h-3 inline-block mr-1" />
                        {tag}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CALENDAR POPOVER */}
              <AnimatePresence>
                {showCalendar && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-20 left-4 z-50 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 w-72"
                  >
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newDate = new Date(calendarViewDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCalendarViewDate(newDate);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h4 className="text-sm font-bold text-gray-900">
                        {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newDate = new Date(calendarViewDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCalendarViewDate(newDate);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Calendar Grid Logic (Copied from previous) */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {dayNames.map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: getFirstDayOfMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-8 md:h-9"></div>
                      ))}

                      {Array.from({ length: getDaysInMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => {
                        const day = i + 1;
                        const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
                        const dateISO = formatISODate(date);
                        const isToday = dateISO === todayISO;
                        const isSelected = tripInfo.travelDate === dateISO;
                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={isPast}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateSelection(dateISO);
                              setShowCalendar(false);
                            }}
                            className={`
                                    h-8 md:h-9 rounded-lg text-xs md:text-sm font-medium transition-all flex items-center justify-center relative
                                    ${isSelected
                                ? 'bg-purple-600 text-white shadow-md'
                                : isPast
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                              }
                                    ${isToday && !isSelected ? 'border border-purple-200 text-purple-600 font-bold' : ''}
                                  `}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-xs text-gray-400">Select a date</span>
                      <button onClick={() => setShowCalendar(false)} className="text-xs text-red-500 hover:text-red-700 font-medium">Close</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Recommended Packages */}

          {/* Edit Trip Details Form */}
          {isEditMode && (
            <div
              id="edit-trip-form"
              className="border-t border-gray-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 px-4 md:px-6 py-4 md:py-6"
            >
              <div className="max-w-2xl mx-auto">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Edit Your Trip Details</h3>
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm space-y-3 md:space-y-4">
                  {/* Destination */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Destination</label>
                    <select
                      value={editTripInfo.destination}
                      onChange={(e) => setEditTripInfo({ ...editTripInfo, destination: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select destination</option>
                      {destinations.map((dest) => (
                        <option key={dest.id || dest.name} value={dest.name}>
                          {dest.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Travel Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Travel Date</label>
                    <input
                      type="date"
                      min={todayISO}
                      value={editTripInfo.travelDate || ''}
                      onChange={(e) => setEditTripInfo({ ...editTripInfo, travelDate: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Days */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (Days)</label>
                    <select
                      value={editTripInfo.days}
                      onChange={(e) => setEditTripInfo({ ...editTripInfo, days: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select days</option>
                      {dayOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} {opt.value === '1' ? 'day' : 'days'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hotel Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Hotel Type</label>
                    <select
                      value={editTripInfo.hotelType}
                      onChange={(e) => setEditTripInfo({ ...editTripInfo, hotelType: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select hotel type</option>
                      <option value="3 Star">3★ Comfort</option>
                      <option value="4 Star">4★ Premium</option>
                      <option value="5 Star">5★ Luxury</option>
                    </select>
                  </div>

                  {/* Travel Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Traveling With</label>
                    <select
                      value={editTripInfo.travelType}
                      onChange={(e) => setEditTripInfo({ ...editTripInfo, travelType: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select travel type</option>
                      {travelerOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditMode(false)
                        setEditTripInfo({
                          destination: '',
                          travelDate: '',
                          days: '',
                          budget: '',
                          hotelType: '',
                          preferences: [],
                          travelType: '',
                        })
                      }}
                      className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // Validate required fields
                        if (!editTripInfo.destination || !editTripInfo.travelDate || !editTripInfo.days || !editTripInfo.hotelType || !editTripInfo.travelType) {
                          alert('Please fill in all required fields')
                          return
                        }

                        // Update trip info
                        updateTripInfo(editTripInfo)

                        // Add a message to the conversation
                        appendMessage({
                          role: 'assistant',
                          content: `Great! I've updated your trip details. Let me regenerate your personalized recommendations based on your new preferences.`
                        })

                        // Reset feedback to allow new feedback
                        setUserFeedback('')
                        setFeedbackAnswered(false)

                        // Close edit mode
                        setIsEditMode(false)

                        // Scroll to top of conversation to show the update message
                        setTimeout(() => {
                          messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                        }, 100)

                        // Regenerate recommendations
                        setCurrentQuestion('complete')
                        setAiResponseComplete(false)
                        await generateRecommendation()
                      }}
                      className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition"
                    >
                      Save & Regenerate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Image Analysis Result Display */}
          {imageAnalysisResult && (
            <div className="border-t border-gray-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50 px-4 md:px-6 py-4 md:py-6">
              {uploadedImage && (
                <div className="mb-4">
                  <p className="text-xs md:text-sm font-semibold text-gray-700 mb-2">Uploaded Image:</p>
                  <img
                    src={uploadedImage}
                    alt="Uploaded location"
                    className="max-w-full max-h-48 rounded-lg border border-gray-200 shadow-sm object-cover"
                  />
                </div>
              )}
              {imageAnalysisResult.detectedLocation ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      {imageAnalysisResult.rawDetectedLocation && imageAnalysisResult.rawDetectedLocation !== imageAnalysisResult.detectedLocation && (
                        <p className="text-xs md:text-sm text-green-800 mb-2">
                          <span className="font-semibold">Location Identified:</span> {imageAnalysisResult.rawDetectedLocation}
                        </p>
                      )}
                      <p className="text-sm md:text-base font-semibold text-green-900 mb-1">
                        ✓ Perfect Match: {imageAnalysisResult.detectedLocation}
                      </p>
                      {imageAnalysisResult.landmarks && imageAnalysisResult.landmarks.length > 0 && (
                        <p className="text-xs md:text-sm text-green-700 mb-2">
                          I can see: {imageAnalysisResult.landmarks.join(', ')}
                        </p>
                      )}
                      {imageAnalysisResult.description && (
                        <p className="text-xs md:text-sm text-green-700 mb-3">{imageAnalysisResult.description}</p>
                      )}
                      <button
                        onClick={() => {
                          setTripInfo(prev => ({ ...prev, destination: imageAnalysisResult.detectedLocation! }))
                          setCurrentQuestion('date')
                          setProgress((1 / TOTAL_STEPS) * 100)
                          setCompletedSteps(1)
                          setImageAnalysisResult(null)
                          setUploadedImage(null)
                        }}
                        className="text-xs md:text-sm font-semibold text-green-700 hover:text-green-900 underline"
                      >
                        Show packages for {imageAnalysisResult.detectedLocation} →
                      </button>
                    </div>
                  </div>
                </div>
              ) : imageAnalysisResult.rawDetectedLocation || (imageAnalysisResult.similarLocations && imageAnalysisResult.similarLocations.length > 0) ? (
                <div className="space-y-4">
                  {/* Show detected location first */}
                  {imageAnalysisResult.rawDetectedLocation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm md:text-base font-semibold text-blue-900 mb-1">
                            Location Identified: {imageAnalysisResult.rawDetectedLocation}
                          </p>
                          {imageAnalysisResult.landmarks && imageAnalysisResult.landmarks.length > 0 && (
                            <p className="text-xs md:text-sm text-blue-700 mb-2">
                              I can see: {imageAnalysisResult.landmarks.join(', ')}
                            </p>
                          )}
                          {imageAnalysisResult.description && (
                            <p className="text-xs md:text-sm text-blue-700 mb-2">{imageAnalysisResult.description}</p>
                          )}
                          <p className="text-xs md:text-sm text-blue-800 font-medium">
                            Unfortunately, we don't have packages for {imageAnalysisResult.rawDetectedLocation} in our database right now.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show similar locations if available */}
                  {imageAnalysisResult.similarLocations && imageAnalysisResult.similarLocations.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-5">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm md:text-base font-semibold text-yellow-900 mb-2">
                            Similar Destinations We Offer
                          </p>
                          <p className="text-xs md:text-sm text-yellow-800 mb-3">
                            Here are similar destinations from our available packages:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {imageAnalysisResult.similarLocations.map((loc, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setTripInfo(prev => ({ ...prev, destination: loc }))
                                  setCurrentQuestion('date')
                                  setProgress((1 / TOTAL_STEPS) * 100)
                                  setCompletedSteps(1)
                                  setImageAnalysisResult(null)
                                  setUploadedImage(null)
                                }}
                                className="px-3 py-1.5 text-xs md:text-sm font-semibold bg-yellow-100 hover:bg-yellow-200 text-yellow-900 rounded-lg transition-colors"
                              >
                                {loc}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-5">
                  <p className="text-sm md:text-base font-semibold text-gray-900 mb-2">
                    Location Not Found
                  </p>
                  <p className="text-xs md:text-sm text-gray-600">
                    We couldn't identify this location in our database. Please tell us which destination you'd like to visit.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        {/* End of Scrollable Content Area */}

        {/* Input Area - Floating Capsule */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-10">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 p-2 flex items-end gap-2 relative z-20">
            {/* Image Upload Button */}
            <label
              className={`flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer flex-shrink-0 ${isAnalyzingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Upload image"
            >
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageInputChange}
                className="hidden"
              />
              {isAnalyzingImage ? <span className="animate-spin">⌛</span> : <ImageIcon className="w-5 h-5" />}
            </label>

            {/* Input Field */}
            <div className="flex-1 min-w-0">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={!tripInfo.destination ? "Where do you want to go?" : "Ask follow-up questions..."}
                className="w-full max-h-32 bg-transparent border-0 focus:ring-0 p-2 text-gray-800 placeholder-gray-400 resize-none text-sm md:text-base leading-relaxed"
                rows={1}
                style={{ minHeight: '40px' }}
              />
            </div>

            {/* Voice Input */}
            {isVoiceSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${isListening
                  ? 'bg-red-100 text-red-500 animate-pulse'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
              >
                <Mic className={`w-5 h-5 ${isListening ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTyping ? <span className="animate-spin text-xs">...</span> : <ArrowUpIcon className="w-5 h-5" />}
            </button>
          </div>

          <div className="text-center mt-3">
            <p className="text-[10px] text-gray-400">AI can make mistakes. Please verify important travel info.</p>
          </div>
        </div>

        {/* End of Main Chat Area div */}
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

      {/* Lead Form Modal - Shows when user expresses booking intent */}
      {showLeadForm && (
        <LeadForm
          isOpen={showLeadForm}
          onClose={() => {
            setShowLeadForm(false)
            setLeadFormPackage(null)
          }}
          packageName={leadFormPackage ? (leadFormPackage as any).Destination_Name : undefined}
          sourceUrl={typeof window !== 'undefined' ? window.location.href : ''}
        />
      )}
    </div>
  )
}
