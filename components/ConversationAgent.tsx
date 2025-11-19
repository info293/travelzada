'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import travelDatabase from '@/data/travel-database.json'
import destinationPackages from '@/data/destination_package.json'

const travelData = travelDatabase as any
type DestinationPackage = (typeof destinationPackages)[0]

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
    if (messagesRef.current.length === 0) {
      sendAssistantPrompt(
        "Greet the traveler warmly and ask them which destination they'd like to plan a trip to. Mention popular inspirations like Bali, Goa, Kerala, Rajasthan, Singapore or Maldives."
      )
    }
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
    const totalSteps = 6
    setProgress((completed / totalSteps) * 100)
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

  const totalSteps = 6

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
    // Try to find date patterns
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY
      /\d{1,2}-\d{1,2}-\d{4}/, // MM-DD-YYYY
    ]
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[0]
      }
    }
    
    // Check for month names
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december']
    const lowerText = text.toLowerCase()
    for (let i = 0; i < months.length; i++) {
      if (lowerText.includes(months[i])) {
        const month = String(i + 1).padStart(2, '0')
        const year = new Date().getFullYear()
        return `${year}-${month}-01`
      }
    }
    
    return null
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
    setTripInfo((prev) => {
      const next = { ...prev, ...updates }
      tripInfoRef.current = next
      return next
    })
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

  const rankedPackages = useMemo(() => {
    if (!tripInfo.destination) return []
    return destinationPackages
      .map((pkg: DestinationPackage) => ({ pkg, score: scorePackage(pkg, tripInfo) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
  }, [tripInfo])

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
    const bestMatch = destinationPackages.reduce(
      (best, pkg) => {
        const score = scorePackage(pkg, currentInfo)
        if (score > best.score) {
          return { pkg, score }
        }
        return best
      },
      { pkg: null as DestinationPackage | null, score: -1 }
    ).pkg

    if (!bestMatch) {
      await sendAssistantPrompt(
        'Let the traveler know you could not find an exact package match but will have a human expert follow up shortly.'
      )
      return
    }

    const prompt = `You have collected all answers. Summarize why the "${bestMatch.Destination_Name}" package (${bestMatch.Duration}, ${bestMatch.Price_Range_INR}) fits their ${currentInfo.travelType} trip to ${currentInfo.destination}. Mention 2-3 highlights from this overview: ${bestMatch.Overview} and inclusions: ${bestMatch.Inclusions}. Keep it under 120 words and invite them to review Trip Details.`

    await sendAssistantPrompt(prompt, { packageMatch: bestMatch })
    if (!tripDetailsAutoOpenedRef.current) {
      tripDetailsAutoOpenedRef.current = true
      onTripDetailsRequest?.()
    }
  }, [onTripDetailsRequest, sendAssistantPrompt])

  const askNextQuestion = useCallback(async () => {
    const currentInfo = tripInfoRef.current
    let questionPrompt = ''

    if (!currentInfo.destination) {
      questionPrompt =
        "Ask the traveler which destination they'd like to visit. Mention inspirations such as Bali, Goa, Kerala, Rajasthan, Singapore or Maldives."
      setCurrentQuestion('destination')
    } else if (!currentInfo.travelDate) {
      questionPrompt = `The traveler chose ${currentInfo.destination}. Ask them when they plan to travel (exact date or month).`
      setCurrentQuestion('date')
    } else if (!currentInfo.days) {
      questionPrompt = `Ask the traveler how many days they want to spend in ${currentInfo.destination}.`
      setCurrentQuestion('days')
    } else if (!currentInfo.budget) {
      questionPrompt = `Ask for their overall budget in INR for ${currentInfo.days}-day trip. Offer cues like Budget, Mid-Range, Premium or Luxury.`
      setCurrentQuestion('budget')
    } else if (!currentInfo.hotelType) {
      questionPrompt =
        'Ask what type of stay they prefer: Budget, Mid-Range, Luxury, or Boutique hotels.'
      setCurrentQuestion('hotel')
    } else if (!currentInfo.travelType) {
      questionPrompt = 'Ask who they are traveling with (solo, family, couple, friends).'
      setCurrentQuestion('travelType')
    } else {
      await generateRecommendation()
      return
    }

    await sendAssistantPrompt(questionPrompt)
  }, [generateRecommendation, sendAssistantPrompt])

  const handleSend = useCallback(async () => {
    if (!input.trim()) return
    const userInput = input.trim()
    setInput('')

    appendMessage({ role: 'user', content: userInput })

    if (!tripInfo.destination) {
      const dest = extractDestination(userInput)
      if (dest) {
        updateTripInfo({ destination: dest })
        const destInfo = travelData.destinations.find((d: any) => d.name === dest)
        const prompt = destInfo
          ? `The traveler picked ${dest}. Compliment their choice using this context: ${destInfo.description}. Mention best time (${destInfo.bestTimeToVisit}) and typical duration (${destInfo.duration}).`
          : `Acknowledge their interest in ${dest} and mention why it's a great idea.`
        await sendAssistantPrompt(prompt)
        await askNextQuestion()
        return
      }
    }

    if (currentQuestion === 'date') {
      const date = extractDate(userInput)
      if (date) {
        updateTripInfo({ travelDate: date })
        await sendAssistantPrompt('Confirm the travel date they shared and let them know it is noted.')
        await askNextQuestion()
        return
      }
    }

    if (currentQuestion === 'days') {
      const days = extractNumber(userInput)
      if (days) {
        updateTripInfo({ days })
        await sendAssistantPrompt(
          `Acknowledge that ${days} days will work well for their ${tripInfo.destination || 'trip'} and let them know you have noted it.`
        )
        await askNextQuestion()
        return
      }
    }

    if (currentQuestion === 'hotel') {
      const hotelType = extractHotelType(userInput)
      if (hotelType) {
        updateTripInfo({ hotelType })
        await sendAssistantPrompt(
          `Confirm that you've locked ${hotelType} stays for them and mention what that experience usually feels like.`
        )
        await askNextQuestion()
        return
      }
    }

    if (currentQuestion === 'budget') {
      const budget = extractBudget(userInput)
      if (budget) {
        updateTripInfo({ budget })
        await sendAssistantPrompt(
          `Let them know you've recorded a budget of roughly ₹${Number(budget).toLocaleString(
            'en-IN'
          )} and that you'll optimize the plan around it.`
        )
        await askNextQuestion()
        return
      }
    }

    if (currentQuestion === 'travelType') {
      const travelType = extractTravelType(userInput)
      if (travelType) {
        updateTripInfo({ travelType })
        await sendAssistantPrompt(
          `Confirm they are traveling ${travelType} and mention you'll tailor experiences for that group.`
        )
        await askNextQuestion()
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

    const fallbackPrompt =
      fallbackMap[currentQuestion] ||
      'Acknowledge their message and let them know you are ready for the required detail.'
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
    tripInfo.destination,
    updateTripInfo,
  ])

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
            Step {Math.min(completedSteps + 1, totalSteps)} of {totalSteps}
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
