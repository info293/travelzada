'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import travelDatabase from '@/data/travel-database.json'
import { travelPackages } from '@/data/package-data'

const travelData = travelDatabase as any

interface Message {
  role: 'user' | 'assistant'
  content: string
  itinerary?: string
  tripInfo?: TripInfo
  destination?: any
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
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI travel planner. Where would you like to plan your trip? You can tell me the destination name, or ask me for recommendations!",
    },
  ])
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
  const [showRecommendation, setShowRecommendation] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const tripDetailsAutoOpenedRef = useRef(false)

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
    setProgress((completed / 5) * 100)
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

  const totalSteps = 5

  const matchingPackages =
    tripInfo.destination
      ? travelPackages.filter(
          (pkg) => pkg.destination.toLowerCase() === tripInfo.destination.toLowerCase()
        )
      : []
  const showPackageSuggestions = completedSteps === totalSteps && matchingPackages.length > 0

  useEffect(() => {
    if (showPackageSuggestions && !tripDetailsAutoOpenedRef.current) {
      tripDetailsAutoOpenedRef.current = true
      onTripDetailsRequest?.()
    }
  }, [showPackageSuggestions, onTripDetailsRequest])

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

  const askNextQuestion = async () => {
    setIsTyping(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const currentInfo = tripInfoRef.current
    let question = ''
    
    if (!currentInfo.destination) {
      question = "Great! I'd love to help you plan your trip. Which destination are you interested in? You can choose from popular places like Bali, Goa, Kerala, Rajasthan, Manali, Singapore, Thailand, or Maldives."
      setCurrentQuestion('destination')
    } else if (!currentInfo.travelDate) {
      question = `Perfect choice! ${currentInfo.destination} is amazing. When are you planning to travel? You can tell me a specific date or just the month.`
      setCurrentQuestion('date')
    } else if (!currentInfo.days) {
      question = `Got it! How many days are you planning to stay in ${currentInfo.destination}?`
      setCurrentQuestion('days')
    } else if (!currentInfo.budget) {
      question = `Nice! For your ${currentInfo.days}-day trip, what's your budget range? You can tell me a specific amount (like ₹50,000) or just say "budget", "mid-range", or "luxury".`
      setCurrentQuestion('budget')
    } else if (!currentInfo.hotelType) {
      question = `Perfect! What type of accommodation are you looking for? Budget, Mid-Range, Luxury, or Boutique hotels?`
      setCurrentQuestion('hotel')
    } else if (!currentInfo.travelType) {
      question = `Almost done! Are you traveling solo, with family, as a couple, or with friends?`
      setCurrentQuestion('travelType')
    } else {
      // All info collected, generate recommendation
      setIsTyping(false)
      setTimeout(() => generateRecommendation(), 100)
      return
    }

    const assistantMessage: Message = { role: 'assistant', content: question }
    setMessages((prev) => [...prev, assistantMessage])
    setIsTyping(false)
  }

  // Generate personalized recommendation
  const generateRecommendation = async () => {
    setIsTyping(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const currentInfo = tripInfoRef.current
    const destination = travelData.destinations.find((d: any) => d.name === currentInfo.destination)
    if (!destination) {
      setIsTyping(false)
      return
    }

    // Create personalized itinerary
    const days = parseInt(currentInfo.days) || 5
    const itinerary = generateItinerary(destination, days, currentInfo.travelType)

    const recommendation = `🎉 Perfect! I've created your personalized ${currentInfo.days}-day itinerary for ${currentInfo.destination}!

Here's your complete travel plan:`

    const assistantMessage: Message = { 
      role: 'assistant', 
      content: recommendation,
      itinerary: itinerary,
      tripInfo: currentInfo,
      destination: destination
    }
    setMessages((prev) => [...prev, assistantMessage])
    setShowRecommendation(true)
    setIsTyping(false)
  }

  // Generate day-by-day itinerary
  const generateItinerary = (destination: any, days: number, travelType: string): string => {
    const highlights = destination.highlights.slice(0, days)
    const activities = destination.activities
    
    let itinerary = ''
    for (let i = 0; i < days; i++) {
      const day = i + 1
      const highlight = highlights[i] || destination.highlights[0]
      
      if (day === 1) {
        itinerary += `Day ${day}: Arrival & ${highlight}\n   • Check-in and relax\n   • Explore local area\n   • ${travelType === 'couple' ? 'Romantic dinner' : 'Local cuisine experience'}\n\n`
      } else if (day === days) {
        itinerary += `Day ${day}: ${highlight} & Departure\n   • Last-minute shopping\n   • Check-out and airport transfer\n\n`
      } else {
        itinerary += `Day ${day}: ${highlight}\n   • ${activities[Math.floor(Math.random() * activities.length)]}\n   • ${travelType === 'family' ? 'Family-friendly activity' : 'Cultural experience'}\n\n`
      }
    }
    
    return itinerary
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    const userInput = input
    setInput('')
    setIsTyping(true)

    // Simulate AI thinking
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Process user input and extract information
    const lowerInput = userInput.toLowerCase()
    
    // Extract destination
    if (!tripInfo.destination) {
      const dest = extractDestination(userInput)
      if (dest) {
        setTripInfo((prev) => ({ ...prev, destination: dest }))
        const destInfo = travelData.destinations.find((d: any) => d.name === dest)
        if (destInfo) {
          const response = `Excellent choice! ${dest} is ${destInfo.description}\n\nBest time to visit: ${destInfo.bestTimeToVisit}\nRecommended duration: ${destInfo.duration}`
          const assistantMessage: Message = { role: 'assistant', content: response }
          setMessages((prev) => [...prev, assistantMessage])
          setIsTyping(false)
          setTimeout(() => askNextQuestion(), 1000)
          return
        }
      }
    }

    // Extract date
    if (currentQuestion === 'date') {
      const date = extractDate(userInput)
      if (date) {
        setTripInfo((prev) => ({ ...prev, travelDate: date }))
        const response = `Perfect! I've noted your travel date.`
        const assistantMessage: Message = { role: 'assistant', content: response }
        setMessages((prev) => [...prev, assistantMessage])
        setIsTyping(false)
        setTimeout(() => askNextQuestion(), 1000)
        return
      }
    }

    // Extract days
    if (currentQuestion === 'days') {
      const days = extractNumber(userInput)
      if (days) {
        setTripInfo((prev) => ({ ...prev, days }))
        const response = `Great! ${days} days in ${tripInfo.destination || 'your destination'} sounds perfect.`
        const assistantMessage: Message = { role: 'assistant', content: response }
        setMessages((prev) => [...prev, assistantMessage])
        setIsTyping(false)
        setTimeout(() => askNextQuestion(), 1000)
        return
      }
    }

    // Extract hotel type - check this BEFORE budget since "budget" can be both
    if (currentQuestion === 'hotel') {
      const hotelType = extractHotelType(userInput)
      if (hotelType) {
        setTripInfo((prev) => ({ ...prev, hotelType }))
        const response = `Great! I've noted ${hotelType} accommodation for you.`
        const assistantMessage: Message = { role: 'assistant', content: response }
        setMessages((prev) => [...prev, assistantMessage])
        setIsTyping(false)
        setTimeout(() => askNextQuestion(), 1000)
        return
      }
    }

    // Extract budget
    if (currentQuestion === 'budget') {
      const budget = extractBudget(userInput)
      if (budget) {
        setTripInfo((prev) => ({ ...prev, budget }))
        const response = `Perfect! I've noted your budget preference.`
        const assistantMessage: Message = { role: 'assistant', content: response }
        setMessages((prev) => [...prev, assistantMessage])
        setIsTyping(false)
        setTimeout(() => askNextQuestion(), 1000)
        return
      }
    }

    // Extract travel type
    if (currentQuestion === 'travelType') {
      const travelType = extractTravelType(userInput)
      if (travelType) {
        setTripInfo((prev) => ({ ...prev, travelType }))
        const response = `Excellent! Traveling ${travelType === 'solo' ? 'solo' : travelType === 'family' ? 'with family' : travelType === 'couple' ? 'as a couple' : 'with friends'} - I'll customize your itinerary accordingly!`
        const assistantMessage: Message = { role: 'assistant', content: response }
        setMessages((prev) => [...prev, assistantMessage])
        setIsTyping(false)
        setTimeout(() => askNextQuestion(), 1000)
        return
      }
    }

    // If no specific extraction, provide helpful response and continue
    let response = ''
    if (!tripInfo.destination) {
      response = "I'd love to help! Could you tell me which destination you're interested in? For example: 'I want to visit Bali' or 'Tell me about Goa'."
      const assistantMessage: Message = { role: 'assistant', content: response }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    } else {
      // Continue with current question flow
      setIsTyping(false)
      setTimeout(() => askNextQuestion(), 500)
    }
  }

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
            {message.role === 'assistant' && message.itinerary ? (
              <div className="max-w-[90%] w-full">
                <div className="bg-gray-100 text-gray-800 rounded-2xl px-4 py-3 mb-3">
                  <p className="whitespace-pre-line">{message.content}</p>
                </div>
                {/* Itinerary Card */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {message.tripInfo?.destination} Itinerary
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📅 {message.tripInfo?.days} Days</span>
                      <span>🏨 {message.tripInfo?.hotelType}</span>
                      <span>👥 {message.tripInfo?.travelType?.charAt(0).toUpperCase()}{message.tripInfo?.travelType?.slice(1)}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {message.itinerary.split('\n\n').map((day, idx) => {
                        if (!day.trim()) return null
                        const lines = day.split('\n')
                        const dayTitle = lines[0]
                        const details = lines.slice(1)
                        return (
                          <div key={idx} className="border-l-4 border-primary pl-4">
                            <h4 className="font-bold text-gray-900 mb-2">{dayTitle}</h4>
                            <ul className="space-y-1">
                              {details.map((detail, detailIdx) => (
                                <li key={detailIdx} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="text-primary mt-1.5">•</span>
                                  <span>{detail.replace('   • ', '')}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-3">✨ What's Included:</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {message.tripInfo?.hotelType} accommodation
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Breakfast included
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Airport transfers
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Local guide assistance
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {message.tripInfo?.travelType === 'family' ? 'Kid-friendly activities' : message.tripInfo?.travelType === 'couple' ? 'Romantic experiences' : 'Adventure activities'}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
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
              2 More Options Available
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
            {matchingPackages.slice(0, 2).map((pkg) => (
              <Link
                key={pkg.id}
                href={`/destinations/${encodeURIComponent(pkg.destination)}/${pkg.id}`}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
              >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    className="w-full h-full object-cover"
                  />
                  {pkg.badge && (
                    <span className="absolute top-3 left-3 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      {pkg.badge}
                    </span>
                  )}
                  {pkg.type && (
                    <span className="absolute top-3 right-3 bg-white text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                      {pkg.type}
                    </span>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 flex-1">{pkg.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{pkg.nightsSummary}</p>
                  
                  {/* Inclusions */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                      <span>{pkg.hotelLevel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                      <span>Visa</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                      <span>{pkg.activitiesCount} Activities</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                      <span>{pkg.meals}</span>
                    </div>
                    {pkg.perks && pkg.perks.length > 0 && (
                      <>
                        {pkg.perks.slice(0, 3).map((perk, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-green-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>{perk}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Pricing Section */}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    {pkg.paymentNote && (
                      <p className="text-xs text-gray-600 mb-2">{pkg.paymentNote}</p>
                    )}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{pkg.pricePerPerson} /Person</p>
                        <p className="text-sm text-gray-600 mt-1">Total Price {pkg.totalPrice}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
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
