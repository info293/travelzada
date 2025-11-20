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

const travelData = travelDatabase as any
type DestinationPackage = (typeof destinationPackages)[0]

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

const TOTAL_STEPS = 6

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
  const [currentQuestion, setCurrentQuestion] = useState<string>('destination')
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const tripDetailsAutoOpenedRef = useRef(false)
  const messagesRef = useRef<Message[]>([])
  const todayISO = useMemo(() => formatISODate(new Date()), [])
  const initialPromptSentRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

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
        'Greet them briefly and ask which destination they want to plan. Offer two inspirations like Bali or Kerala.',
        28
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
    if (tripInfo.budget) completed++
    if (tripInfo.hotelType) completed++
    if (tripInfo.travelType) completed++
    setProgress((completed / TOTAL_STEPS) * 100)
    setCompletedSteps(completed)
    
    // Update form data
    setFormData({
      destination: tripInfo.destination,
      travelDate: tripInfo.travelDate,
      days: tripInfo.days,
      budget: tripInfo.budget,
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

  const scorePackage = (pkg: DestinationPackage, info: TripInfo) => {
    let score = 0
    if (info.destination) {
      const target = normalize(info.destination)
      if (
        normalize(pkg.Destination_Name).includes(target) ||
        target.includes(normalize(pkg.Destination_Name))
      ) {
        score += 5
      }
    }
    if (info.travelType && pkg.Travel_Type?.toLowerCase() === info.travelType.toLowerCase()) {
      score += 3
    }
    const desiredBudget = getBudgetCategory(info.budget, info.hotelType)
    if (
      desiredBudget &&
      pkg.Budget_Category?.toLowerCase() === desiredBudget.toLowerCase()
    ) {
      score += 2
    }
    const requestedDays = parseInt(info.days, 10)
    const pkgDays = extractDaysFromDuration(pkg.Duration)
    if (!isNaN(requestedDays) && pkgDays) {
      const diff = Math.abs(pkgDays - requestedDays)
      if (diff === 0) score += 2
      else if (diff <= 2) score += 1
    }
    if (info.hotelType && pkg.Star_Category) {
      const starHint = info.hotelType.includes('Luxury')
        ? '5'
        : info.hotelType.includes('Budget')
        ? '3'
        : '4'
      if (pkg.Star_Category.includes(starHint)) {
        score += 1
      }
    }
    return score
  }

  const destinationSpecificPackages = useMemo(() => {
    if (!tripInfo.destination) return []
    return destinationPackages.filter((pkg: DestinationPackage) =>
      matchesDestination(pkg.Destination_Name, tripInfo.destination)
    )
  }, [tripInfo.destination])

  const rankedPackages = useMemo(() => {
    if (!tripInfo.destination || destinationSpecificPackages.length === 0) return []
    return destinationSpecificPackages
      .map((pkg: DestinationPackage) => ({ pkg, score: scorePackage(pkg, tripInfo) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
  }, [destinationSpecificPackages, tripInfo])

  const suggestedPackages = rankedPackages.slice(0, 2).map(({ pkg }) => pkg)
  const showPackageSuggestions = Boolean(tripInfo.travelType && suggestedPackages.length > 0)

  useEffect(() => {
    if (showPackageSuggestions && !tripDetailsAutoOpenedRef.current) {
      tripDetailsAutoOpenedRef.current = true
      onTripDetailsRequest?.()
    }
  }, [showPackageSuggestions, onTripDetailsRequest])

  const generateRecommendation = useCallback(async () => {
    const currentInfo = tripInfoRef.current
    const bestMatch = rankedPackages[0]?.pkg

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
      return
    }

    const prompt = withStyle(
      `Summarize why the "${bestMatch.Destination_Name}" package (${bestMatch.Duration}, ${bestMatch.Price_Range_INR}) fits their ${currentInfo.travelType} trip to ${currentInfo.destination}. Include 2 short bullet highlights from this overview: ${bestMatch.Overview} and inclusions: ${bestMatch.Inclusions}. End by inviting them to review Trip Details.`,
      80
    )

    await sendAssistantPrompt(prompt, { packageMatch: bestMatch })
    if (!tripDetailsAutoOpenedRef.current) {
      tripDetailsAutoOpenedRef.current = true
      onTripDetailsRequest?.()
    }
  }, [onTripDetailsRequest, rankedPackages, sendAssistantPrompt])

  const askNextQuestion = useCallback(
    async (infoOverride?: TripInfo) => {
      const currentInfo = infoOverride ?? tripInfoRef.current
    let questionPrompt = ''

    if (!currentInfo.destination) {
      questionPrompt = withStyle(
        'Greet them briefly and ask which destination they want to plan. Offer two examples like Bali or Kerala.',
        28
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
    } else if (!currentInfo.budget) {
      questionPrompt = withStyle(
        `Great, ${currentInfo.days}-day plan noted. Ask for their total budget in INR and hint at ranges like ₹30k-50k or ₹80k+.`,
        32
      )
      setCurrentQuestion('budget')
    } else if (!currentInfo.hotelType) {
      questionPrompt = withStyle(
        'Thank them for sharing their budget and ask which stay style they prefer: 3-star, 4-star, or 5-star.',
        28
      )
      setCurrentQuestion('hotel')
    } else if (!currentInfo.travelType) {
      questionPrompt = withStyle(
        'Acknowledge their stay preference and ask who they are travelling with: solo, family, couple, or friends.',
        26
      )
      setCurrentQuestion('travelType')
    } else {
      await generateRecommendation()
      return
    }

      await sendAssistantPrompt(questionPrompt)
    },
    [generateRecommendation, sendAssistantPrompt]
  )

  const handleSend = useCallback(async () => {
    if (!input.trim()) return
    const userInput = input.trim()
    setInput('')

    appendMessage({ role: 'user', content: userInput })

    const latestInfo = tripInfoRef.current

    if (!latestInfo.destination) {
      const dest = extractDestination(userInput)
      if (dest) {
        updateTripInfo({ destination: dest })
        const destInfo = travelData.destinations.find((d: any) => d.name === dest)
        const prompt = destInfo
          ? withStyle(
              `They picked ${dest}. In one sentence mention ${destInfo.description}. Add best time ${destInfo.bestTimeToVisit} and typical duration ${destInfo.duration}. Then ask when they plan to travel (month or exact date).`,
              55
            )
          : withStyle(
              `Acknowledge their interest in ${dest} and ask when they plan to travel (month or exact date).`,
              35
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

    if (currentQuestion === 'budget') {
      if (isSameAnswer(userInput) && latestInfo.budget) {
        await askNextQuestion()
        return
      }
      const budget = extractBudget(userInput)
      if (budget) {
        const nextInfo = updateTripInfo({ budget })
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

  const handleBudgetSelect = useCallback(
    async (label: string, value: string) => {
      const nextInfo = updateTripInfo({ budget: value })
      appendMessage({ role: 'user', content: `Budget selected: ${label}` })
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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>
            Step {Math.min(completedSteps + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="h-[500px] overflow-y-auto p-6 space-y-4"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && message.packageMatch ? (
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-800">
                <p className="whitespace-pre-line">{message.content}</p>
              </div>
            ) : (
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-line">{message.content}</p>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Suggestions - Only show at start */}
      {messages.length <= 2 && !tripInfo.destination && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {['I want to visit Bali', 'Tell me about Goa', 'Plan a trip to Kerala', 'Rajasthan trip'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={async () => {
                  setInput(suggestion)
                  await new Promise(resolve => setTimeout(resolve, 100))
                  await handleSend()
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date Picker Helper */}
      {currentQuestion === 'date' && (
        <div className="border-t border-gray-100 bg-white px-4 py-6">
          <p className="text-sm font-semibold text-gray-800 mb-3">Select your travel month</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
            {monthNames.map((month, idx) => {
              const isSelected = selectedMonthIndex === idx
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthSelect(idx)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                    isSelected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary/60'
                  }`}
                >
                  {month.slice(0, 3)}
                </button>
              )
            })}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-semibold text-gray-500">
              Or pick an exact date
            </label>
            <input
              type="date"
              min={todayISO}
              value={tripInfo.travelDate || ''}
              onChange={handleCalendarInputChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-gray-500">
              We’ll note this immediately and move to the next step.
            </p>
          </div>
        </div>
      )}

      {/* Day Count Selector */}
      {currentQuestion === 'days' && (
        <div className="border-t border-gray-100 bg-white px-4 py-6">
          <p className="text-sm font-semibold text-gray-800 mb-3">How many days?</p>
          <div className="grid grid-cols-5 gap-2">
            {dayOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleDaySelect(option.label, option.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-primary/60 hover:bg-primary/10 transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Budget Selector */}
      {currentQuestion === 'budget' && (
        <div className="border-t border-gray-100 bg-white px-4 py-6 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Select your overall budget</p>
          {budgetOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => handleBudgetSelect(option.label, option.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:border-primary/60 hover:bg-primary/5 transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Hotel Selector */}
      {currentQuestion === 'hotel' && (
        <div className="border-t border-gray-100 bg-white px-4 py-6">
          <p className="text-sm font-semibold text-gray-800 mb-3">Preferred stay style</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hotelOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleHotelSelect(option.label, option.value)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <p className="text-sm font-semibold text-gray-900">{option.label}</p>
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
        </div>
      )}

      {/* Travel Type Selector */}
      {currentQuestion === 'travelType' && (
        <div className="border-t border-gray-100 bg-white px-4 py-6">
          <p className="text-sm font-semibold text-gray-800 mb-3">Who are you travelling with?</p>
          <div className="grid grid-cols-2 gap-3">
            {travelerOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTravelTypeSelect(option.label, option.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                {option.label}
              </button>
            ))}
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
            {suggestedPackages.map((pkg) => (
              <div
                key={pkg.Destination_ID}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
              >
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
                  <button
                    onClick={() => onTripDetailsRequest?.()}
                    className="w-full rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    Customize This Plan
                  </button>
                </div>
              </div>
            ))}
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
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
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
                : currentQuestion === 'budget'
                ? "What's your budget? (e.g., ₹50,000 or luxury)"
                : currentQuestion === 'hotel'
                ? "What hotel type? (Budget, Mid-Range, Luxury, Boutique)"
                : currentQuestion === 'travelType'
                ? "Who are you traveling with? (solo, family, couple, friends)"
                : "Type your message..."
            }
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
