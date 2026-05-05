'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, X, Send, User, Phone, Mail, Calendar,
  Users, Star, Clock, CheckCircle, MapPin, Package,
  FileText, Printer, ChevronLeft, ChevronRight, Pause, Play,
} from 'lucide-react'

const LeafletMap = dynamic(() => import('@/components/tailored-travel/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading map…</p>
      </div>
    </div>
  ),
})

interface MatchedPackage {
  id: string
  Destination_Name: string
  Duration_Nights: number
  Duration_Days: number
  Price_Min_INR: number
  Travel_Type: string
  Star_Category?: string
  Primary_Image_URL: string
  matchScore: number
  matchReason: string
  Overview?: string
  Day_Wise_Itinerary?: string
  Inclusions?: string | string[]
  agentPackageTitle?: string
  agentSlug?: string
  source?: string
}

interface AgentInfo {
  id: string
  agentSlug: string
  companyName: string
  contactName: string
  logoUrl?: string | null
  status: string
}

interface DayBlock {
  number: number
  title: string
  lines: string[]
}

const cinematicTexts = [
  'Analyzing your preferences…',
  'Searching curated packages…',
  'Finding perfect experiences…',
  'Crafting your itinerary…',
]

function parseDays(itinerary: string): DayBlock[] {
  const rawLines = String(itinerary).split('\n').filter(l => l.trim())
  const days: DayBlock[] = []
  let current: DayBlock | null = null
  for (const line of rawLines) {
    if (/^day\s*\d+/i.test(line)) {
      if (current) days.push(current)
      const num = parseInt(line.match(/\d+/)?.[0] || '0')
      current = { number: num, title: line.trim(), lines: [] }
    } else if (current && line.trim()) {
      current.lines.push(line.trim())
    }
  }
  if (current) days.push(current)
  return days
}

function TravelGuide() {
  return (
    <svg width="60" height="74" viewBox="0 0 60 76" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="11" rx="22" ry="5" fill="#6d28d9" opacity="0.35"/>
      <rect x="15" y="4" width="30" height="11" rx="6" fill="#7c3aed"/>
      <rect x="12" y="11" width="36" height="4" rx="2" fill="#5b21b6"/>
      <rect x="24" y="40" width="12" height="8" rx="3" fill="#fbbf24"/>
      <circle cx="30" cy="28" r="17" fill="#fde68a"/>
      <ellipse cx="23" cy="25" rx="2.8" ry="3.2" fill="#1f2937"/>
      <circle cx="24" cy="23.5" r="1.1" fill="white"/>
      <ellipse cx="37" cy="25" rx="2.8" ry="3.2" fill="#1f2937"/>
      <circle cx="38" cy="23.5" r="1.1" fill="white"/>
      <path d="M21 32 Q30 40 39 32" stroke="#92400e" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <ellipse cx="17" cy="31" rx="5" ry="4" fill="#fca5a5" opacity="0.5"/>
      <ellipse cx="43" cy="31" rx="5" ry="4" fill="#fca5a5" opacity="0.5"/>
      <rect x="13" y="48" width="34" height="22" rx="9" fill="#7c3aed"/>
      <path d="M26 48 L30 55 L34 48" fill="#a78bfa"/>
      <rect x="1" y="50" width="12" height="8" rx="4" fill="#7c3aed"/>
      <rect x="47" y="50" width="12" height="8" rx="4" fill="#7c3aed"/>
      <circle cx="3" cy="54" r="4" fill="#fde68a"/>
      <circle cx="57" cy="54" r="4" fill="#fde68a"/>
    </svg>
  )
}

export default function AgentResultsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const agentSlug = params.agentSlug as string
  const isEmbed = searchParams.get('embed') === '1'

  const [wizardData, setWizardData] = useState<any>(null)
  const [packages, setPackages] = useState<MatchedPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noPackages, setNoPackages] = useState(false)
  const [loadingIdx, setLoadingIdx] = useState(0)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<MatchedPackage | null>(null)
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [subAgentId, setSubAgentId] = useState<string | undefined>(undefined)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [showPdf, setShowPdf] = useState(false)

  // Day narrator
  const [currentDayIdx, setCurrentDayIdx] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const dayRefs = useRef<(HTMLDivElement | null)[]>([])

  // Language selector for Travel Guide
  const LANGUAGES = [
    { code: 'en', label: 'English',    flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi',      flag: '🇮🇳' },
    { code: 'ar', label: 'Arabic',     flag: '🇸🇦' },
    { code: 'es', label: 'Spanish',    flag: '🇪🇸' },
    { code: 'fr', label: 'French',     flag: '🇫🇷' },
    { code: 'de', label: 'German',     flag: '🇩🇪' },
    { code: 'zh', label: 'Chinese',    flag: '🇨🇳' },
    { code: 'ja', label: 'Japanese',   flag: '🇯🇵' },
    { code: 'ru', label: 'Russian',    flag: '🇷🇺' },
    { code: 'th', label: 'Thai',       flag: '🇹🇭' },
    { code: 'ko', label: 'Korean',     flag: '🇰🇷' },
    { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  ]
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0])
  const [isTranslating, setIsTranslating] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isSpeakingRef = useRef(false)   // synchronous check inside intervals
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [autoListen, setAutoListen] = useState(false)
  const autoListenRef = useRef(false)

  useEffect(() => {
    if (!isLoading) return
    const interval = setInterval(() => setLoadingIdx(i => (i + 1) % cinematicTexts.length), 2500)
    return () => clearInterval(interval)
  }, [isLoading])

  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agent/profile?slug=${agentSlug}`)
        const data = await res.json()
        if (data.success) setAgentInfo(data.agent)
      } catch { }
    }
    fetchAgent()
  }, [agentSlug])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = sessionStorage.getItem('tailored_wizard_data')
    if (!stored) {
      router.push(`/tailored-travel/${agentSlug}${isEmbed ? '?embed=1' : ''}`)
      return
    }
    try {
      const parsed = JSON.parse(stored)
      setWizardData(parsed)
      if (parsed.subAgentId) setSubAgentId(parsed.subAgentId)
      if (parsed.sessionId) setSessionId(parsed.sessionId)
      fetchPackages(parsed)
    } catch {
      setError('Failed to load your preferences. Please try again.')
      setIsLoading(false)
    }
  }, [agentSlug, router])

  // Auto-advance days — paused while audio is speaking
  useEffect(() => {
    if (isPaused || isSpeaking || packages.length === 0) return
    const days = parseDays(packages[0]?.Day_Wise_Itinerary || '')
    if (days.length === 0) return
    const interval = setInterval(() => {
      if (isSpeakingRef.current) return  // synchronous — no React delay
      setCurrentDayIdx(prev => (prev + 1) % days.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [packages, isPaused, isSpeaking])

  // Translate + typewriter for the Travel Guide speech bubble
  // (No auto-speak — browsers block audio not triggered by a direct user click)
  useEffect(() => {
    if (packages.length === 0) return
    const days = parseDays(packages[0]?.Day_Wise_Itinerary || '')
    if (days.length === 0) return
    const raw = days[currentDayIdx]?.lines[0] || days[currentDayIdx]?.title || ''
    const baseText = raw.slice(0, 120)

    let cancelled = false
    let timer: ReturnType<typeof setInterval>

    // Stop any playing audio when day/language changes
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    isSpeakingRef.current = false
    setIsSpeaking(false)

    const runTypewriter = (text: string) => {
      if (cancelled) return
      setTypedText('')
      setIsTyping(true)
      let i = 0
      timer = setInterval(() => {
        if (cancelled) { clearInterval(timer); return }
        i++
        setTypedText(text.slice(0, i))
        if (i >= text.length) {
          setIsTyping(false)
          clearInterval(timer)
          if (autoListenRef.current && !isSpeakingRef.current) doSpeak(text)
        }
      }, 55)
    }

    if (selectedLang.code === 'en') {
      runTypewriter(baseText)
    } else {
      setIsTranslating(true)
      setTypedText('')
      fetch('/api/ai-planner/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: baseText, targetLanguage: selectedLang.code, targetLanguageName: selectedLang.label }),
      })
        .then(r => r.json())
        .then(data => {
          if (cancelled) return
          setIsTranslating(false)
          runTypewriter(data.translated || baseText)
        })
        .catch(() => {
          if (!cancelled) { setIsTranslating(false); runTypewriter(baseText) }
        })
    }

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [currentDayIdx, packages, selectedLang])

  // Core speak — can be called from user click OR auto-listen (after page audio is unlocked)
  const doSpeak = async (text: string) => {
    if (!text || isSpeakingRef.current) return
    isSpeakingRef.current = true
    setIsSpeaking(true)
    try {
      const res = await fetch('/api/ai-planner/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) { isSpeakingRef.current = false; setIsSpeaking(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      await audio.play()
      audio.onended = () => { URL.revokeObjectURL(url); isSpeakingRef.current = false; setIsSpeaking(false) }
      audio.onerror  = () => { isSpeakingRef.current = false; setIsSpeaking(false) }
    } catch { isSpeakingRef.current = false; setIsSpeaking(false) }
  }

  // Stop current audio
  const stopSpeak = () => {
    isSpeakingRef.current = false
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setIsSpeaking(false)
  }

  // Manual listen/stop button
  const handleSpeak = () => {
    if (isSpeaking) { stopSpeak(); return }
    doSpeak(typedText)
  }

  // Toggle auto-listen — first click is the browser user-gesture that unlocks audio
  const toggleAutoListen = () => {
    const next = !autoListenRef.current
    autoListenRef.current = next
    setAutoListen(next)
    if (!next) {
      stopSpeak()
    } else if (typedText && !isSpeakingRef.current) {
      doSpeak(typedText)  // immediately speak current text on enable
    }
  }

  // Scroll active day into view
  useEffect(() => {
    dayRefs.current[currentDayIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentDayIdx])

  async function fetchPackages(data: any) {
    setIsLoading(true); setError(null); setNoPackages(false)
    try {
      const res = await fetch('/api/tailored-travel/find-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, agentSlug }),
      })
      const result = await res.json()
      if (result.noAgentPackages) { setNoPackages(true); setPackages([]) }
      else if (result.success && result.packages) setPackages(result.packages)
      else throw new Error(result.error || 'No packages found')
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {agentInfo && (
            <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
              {agentInfo.logoUrl
                ? <img src={agentInfo.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">{agentInfo.companyName.charAt(0)}</div>}
              <span className="text-sm font-medium text-gray-700">{agentInfo.companyName}</span>
              <span className="text-xs text-gray-400">· Powered by Travelzada AI</span>
            </div>
          )}
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full" />
          <AnimatePresence mode="wait">
            <motion.p key={loadingIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="text-gray-500 text-base">{cinematicTexts[loadingIdx]}</motion.p>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  const AgentStrip = ({ pkg }: { pkg?: MatchedPackage }) => agentInfo ? (
    <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 flex-shrink-0">
      <div className="px-5 py-2 flex items-center gap-3">
        {/* DMC logo + name */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {agentInfo.logoUrl
            ? <img src={agentInfo.logoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-100" />
            : <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">{agentInfo.companyName.charAt(0)}</div>}
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{agentInfo.companyName}</p>
            <p className="text-[10px] text-gray-400">Powered by Travelzada AI</p>
          </div>
        </div>

        {/* Action buttons — visible only when a package is matched */}
        {pkg && (
          <div className="flex items-center gap-2 ml-4">
            <div className="w-px h-6 bg-gray-200" />
            <button
              onClick={() => { const msg = buildWhatsAppMsg(pkg); window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank') }}
              title="Share on WhatsApp"
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Send className="w-3 h-3" /> Share
            </button>
            <button
              onClick={() => setShowPdf(true)}
              title="View / Print PDF"
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <FileText className="w-3 h-3" /> PDF
            </button>
            <button
              onClick={() => { setSelectedPackage(pkg); setShowBookingForm(true) }}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Request Package
            </button>
          </div>
        )}

        {/* Change preferences — pushed to the right */}
        <Link href={`/tailored-travel/${agentSlug}`}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 font-medium transition-colors flex-shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" />Change preferences
        </Link>
      </div>
    </div>
  ) : null

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AgentStrip />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <button onClick={() => router.push(`/tailored-travel/${agentSlug}${isEmbed ? '?embed=1' : ''}`)}
            className="flex items-center gap-2 text-purple-600 font-semibold hover:underline text-sm">
            <ArrowLeft className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    )
  }

  if (noPackages || packages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AgentStrip />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No matching packages found</h2>
          <p className="text-sm text-gray-500 mb-6">
            {agentInfo?.companyName} hasn't added packages for your selected destinations yet.
          </p>
          <button onClick={() => router.push(`/tailored-travel/${agentSlug}${isEmbed ? '?embed=1' : ''}`)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Change destination
          </button>
        </div>
      </div>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────
  const bestPkg = packages[0]
  const title = bestPkg.agentPackageTitle || bestPkg.Destination_Name
  const inclusions = typeof bestPkg.Inclusions === 'string'
    ? bestPkg.Inclusions.split(',').map((s: string) => s.trim()).filter(Boolean)
    : Array.isArray(bestPkg.Inclusions) ? bestPkg.Inclusions : []
  const days = parseDays(bestPkg.Day_Wise_Itinerary || '')

  const mapItinerary = days.map(d => {
    // Prefer the overnight/stay city so the route follows where you sleep, not day-trip destinations
    const allText = [d.title, ...d.lines].join(' ')
    const overnightMatch = allText.match(/overnight[:\s]+([A-Za-z][a-zA-Z\s]+?)(?:\.|,|$)/i)
    if (overnightMatch) {
      return { title: overnightMatch[1].trim(), day: `Day ${d.number}` }
    }
    // Fall back: first city-like word after stripping "Day N:"
    const loc = d.title.replace(/^day\s*\d+[:\s-]*/i, '').split(/,|\band\b/i)[0].trim()
    return { title: loc || bestPkg.Destination_Name, day: `Day ${d.number}` }
  })

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      <AgentStrip pkg={bestPkg} />

      <div className="flex flex-1 overflow-hidden min-h-0 p-3 gap-3">

        {/* ── LEFT 30%: Package details ──────────────────────────────────── */}
        <div className="w-[30%] flex-shrink-0 flex flex-col overflow-hidden bg-white rounded-2xl shadow-sm">

          {/* Hero image */}
          <div className="relative h-44 flex-shrink-0">
            {bestPkg.Primary_Image_URL
              ? <img src={bestPkg.Primary_Image_URL} alt={title} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-purple-200 to-indigo-300 flex items-center justify-center"><MapPin className="w-10 h-10 text-white/50" /></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
              Best Match
            </div>
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-gray-900">{bestPkg.matchScore}%</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white font-bold text-base leading-tight drop-shadow line-clamp-2">{title}</p>
              <p className="text-white/70 text-[11px] mt-0.5 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />{bestPkg.Destination_Name}
              </p>
            </div>
          </div>

          {/* Price + tags */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex flex-wrap gap-1">
              <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                <Clock className="w-2.5 h-2.5" />{bestPkg.Duration_Nights}N {bestPkg.Duration_Days}D
              </span>
              {bestPkg.Star_Category && (
                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{bestPkg.Star_Category}</span>
              )}
              {bestPkg.Travel_Type && (
                <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">{bestPkg.Travel_Type}</span>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-purple-700">₹{bestPkg.Price_Min_INR.toLocaleString('en-IN')}</p>
              <p className="text-[9px] text-gray-400">per person</p>
            </div>
          </div>

          {/* Scrollable details */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {bestPkg.matchReason && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide mb-1">Why it matches</p>
                <p className="text-[11px] text-indigo-800 leading-relaxed">{bestPkg.matchReason}</p>
              </div>
            )}

            {bestPkg.Overview && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Overview</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">{bestPkg.Overview}</p>
              </div>
            )}

            {inclusions.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Inclusions</p>
                <ul className="space-y-1">
                  {inclusions.map((inc: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />{inc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-2">
              <p className="font-semibold text-gray-500">Terms & Conditions</p>
              <p>• Prices subject to availability at booking.</p>
              <p>• Final price confirmed on booking.</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 px-3 py-2.5 border-t border-gray-100 bg-white flex gap-2">
            <button
              onClick={() => { const msg = buildWhatsAppMsg(bestPkg); window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank') }}
              className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-2 rounded-xl transition-colors flex-shrink-0"
              title="Share on WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowPdf(true)}
              className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2 rounded-xl transition-colors flex-shrink-0"
              title="Download PDF">
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setSelectedPackage(bestPkg); setShowBookingForm(true) }}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-xl transition-colors text-xs">
              Request Package
            </button>
          </div>
        </div>

        {/* ── MIDDLE 30%: Day narrator ────────────────────────────────────── */}
        <div className="w-[30%] flex-shrink-0 flex flex-col overflow-hidden bg-gradient-to-b from-violet-50/60 to-white rounded-2xl shadow-sm">

          {/* Header: controls + progress */}
          <div className="flex-shrink-0 px-3 pt-2.5 pb-2 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Journey Timeline</p>
                <p className="text-xs font-bold text-gray-900">
                  {days.length > 0 ? `Day ${currentDayIdx + 1} of ${days.length}` : 'No itinerary'}
                </p>
              </div>
              {days.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentDayIdx(p => Math.max(0, p - 1))}
                    disabled={currentDayIdx === 0}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setIsPaused(p => !p)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-purple-100 hover:bg-purple-200 transition-colors"
                  >
                    {isPaused
                      ? <Play className="w-3 h-3 text-purple-700" />
                      : <Pause className="w-3 h-3 text-purple-700" />}
                  </button>
                  <button
                    onClick={() => setCurrentDayIdx(p => Math.min(days.length - 1, p + 1))}
                    disabled={currentDayIdx === days.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Auto-advance progress bar */}
            {days.length > 0 && (
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  key={isPaused ? 'paused' : currentDayIdx}
                  className="h-full bg-purple-500 rounded-full origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isPaused ? undefined : 1 }}
                  transition={{ duration: 6, ease: 'linear' }}
                />
              </div>
            )}

            {/* Day dots */}
            {days.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {days.map((_, i) => (
                  <button key={i} onClick={() => setCurrentDayIdx(i)}
                    className={`rounded-full transition-all duration-300 ${i === currentDayIdx ? 'w-5 h-2 bg-purple-600' : 'w-2 h-2 bg-gray-200 hover:bg-purple-300'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Character + speech bubble + language picker */}
          <div className="flex-shrink-0 px-3 pt-3 pb-4 flex flex-col items-center bg-gradient-to-b from-violet-50/80 to-transparent border-b border-purple-50">
            {days.length > 0 ? (
              <>
                {/* Speech bubble */}
                <AnimatePresence mode="wait">
                  <motion.div key={currentDayIdx}
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full"
                  >
                    <div className="bg-white border-2 border-purple-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Your Guide Says…</p>
                        {/* Audio controls */}
                        <div className="flex items-center gap-1">
                          {/* Auto-listen toggle — click once to enable; first click unlocks browser audio */}
                          <button
                            onClick={toggleAutoListen}
                            title={autoListen ? 'Auto-listen on — click to disable' : 'Enable auto-listen (plays each day automatically)'}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                              autoListen
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                            </svg>
                            {autoListen ? 'Auto ON' : 'Auto'}
                          </button>
                          {/* Speaking indicator / stop */}
                          {isSpeaking && (
                            <button onClick={stopSpeak}
                              title="Stop audio"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow-md">
                              <span className="flex items-end gap-px h-3">
                                {[2, 4, 3].map((h, i) => (
                                  <span key={i} className="w-0.5 bg-white rounded-full animate-bounce"
                                    style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }} />
                                ))}
                              </span>
                              Stop
                            </button>
                          )}
                          {/* Manual play (only when auto-listen is off and not speaking) */}
                          {!autoListen && !isSpeaking && (
                            <button onClick={handleSpeak}
                              disabled={isTranslating || isTyping || !typedText}
                              title="Listen"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                              ▶ Listen
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed min-h-[40px]">
                        {isTranslating ? (
                          <span className="flex items-center gap-1.5 text-purple-400">
                            <svg className="animate-spin w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Translating to {selectedLang.label}…
                          </span>
                        ) : (
                          <>{typedText || '…'}{isTyping && <span className="text-purple-400 animate-pulse font-thin">|</span>}</>
                        )}
                      </p>
                    </div>
                    <div className="absolute -bottom-2 left-8 w-3.5 h-3.5 bg-white border-r-2 border-b-2 border-purple-200 rotate-45" />
                  </motion.div>
                </AnimatePresence>

                {/* Guide character */}
                <div className="flex items-center gap-3 mt-4">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <TravelGuide />
                  </motion.div>
                  <div>
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Travel Guide</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Speaking in <span className="font-semibold text-purple-400">{selectedLang.flag} {selectedLang.label}</span></p>
                  </div>
                </div>

                {/* Language picker grid */}
                <div className="mt-3 w-full">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                    </svg>
                    Choose Language
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLang(lang)}
                        title={lang.label}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-150 select-none ${
                          selectedLang.code === lang.code
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200 scale-105'
                            : 'bg-white border border-gray-100 text-gray-600 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                      >
                        <span className="text-sm leading-none">{lang.flag}</span>
                        <span className="hidden sm:inline">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
                  <TravelGuide />
                </motion.div>
                <p className="text-xs text-gray-400 mt-2">No day-wise itinerary available</p>
              </div>
            )}
          </div>

          {/* Scrollable day cards */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
            {days.map((day, i) => (
              <div
                key={i}
                ref={el => { dayRefs.current[i] = el }}
                onClick={() => { setCurrentDayIdx(i); setIsPaused(true) }}
                className={`rounded-xl border cursor-pointer transition-all duration-300 ${
                  i === currentDayIdx
                    ? 'bg-purple-50 border-purple-200 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-purple-100 hover:shadow-sm'
                }`}
              >
                <div className="px-3 py-2.5 flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 transition-colors ${
                    i === currentDayIdx ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {day.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-bold leading-snug ${i === currentDayIdx ? 'text-purple-900' : 'text-gray-700'}`}>
                      {day.title}
                    </p>
                    {i === currentDayIdx && day.lines.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.25 }}
                        className="mt-1.5 space-y-1 overflow-hidden"
                      >
                        {day.lines.map((line, j) => (
                          <p key={j} className="text-[10px] text-purple-700/70 leading-relaxed pl-2 border-l-2 border-purple-200">
                            {line}
                          </p>
                        ))}
                      </motion.div>
                    )}
                    {i !== currentDayIdx && day.lines[0] && (
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{day.lines[0]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT 40%: Map ──────────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden min-w-0 rounded-2xl shadow-sm">
          <LeafletMap
            mainDestination={wizardData?.destinations?.[0] || bestPkg.Destination_Name}
            itinerary={mapItinerary}
            currentStep={4}
            userOrigin={null}
          />
        </div>
      </div>

      {/* ── Booking modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBookingForm && selectedPackage && agentInfo && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
              <AgentBookingForm agentInfo={agentInfo} pkg={selectedPackage} wizardData={wizardData}
                subAgentId={subAgentId} sessionId={sessionId} agentSlug={agentSlug}
                onClose={() => setShowBookingForm(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PDF Modal ────────────────────────────────────────────────────── */}
      {showPdf && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPdf(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-gray-900 text-sm">Package Details</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const msg = buildWhatsAppMsg(bestPkg); window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank') }}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-green-500 text-white px-3 py-1.5 rounded-xl hover:bg-green-600 transition-colors">
                  <Send className="w-3.5 h-3.5" />WhatsApp
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-purple-600 text-white px-3 py-1.5 rounded-xl hover:bg-purple-700 transition-colors">
                  <Printer className="w-3.5 h-3.5" />Print PDF
                </button>
                <button onClick={() => setShowPdf(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {bestPkg.Primary_Image_URL && (
                <div className="relative h-44 rounded-2xl overflow-hidden">
                  <img src={bestPkg.Primary_Image_URL} alt={title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <p className="text-white font-bold text-lg">{title}</p>
                    <p className="text-white/80 text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{bestPkg.Destination_Name}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Duration', value: `${bestPkg.Duration_Days}D/${bestPkg.Duration_Nights}N` },
                  { label: 'Category', value: bestPkg.Star_Category || '—' },
                  { label: 'Type', value: bestPkg.Travel_Type || '—' },
                  { label: 'Match', value: `${bestPkg.matchScore}%` },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                    <p className="font-bold text-gray-900 text-xs mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-4 border-2 border-purple-200 bg-purple-50">
                <p className="text-xs font-bold text-purple-500 uppercase tracking-wide mb-1">Price</p>
                <p className="text-3xl font-bold text-purple-700">₹{bestPkg.Price_Min_INR.toLocaleString('en-IN')}</p>
                <p className="text-xs text-purple-400">per person (starting from)</p>
              </div>
              {bestPkg.matchReason && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-indigo-600 mb-1">Why it matches you</p>
                  <p className="text-sm text-indigo-800 leading-relaxed">{bestPkg.matchReason}</p>
                </div>
              )}
              {bestPkg.Overview && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Overview</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{bestPkg.Overview}</p>
                </div>
              )}
              {inclusions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Inclusions</p>
                  <ul className="space-y-1.5">
                    {inclusions.map((inc: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />{inc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {bestPkg.Day_Wise_Itinerary && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Day-wise Itinerary</p>
                  <div className="space-y-1.5">
                    {String(bestPkg.Day_Wise_Itinerary).split('\n').filter(Boolean).map((line, i) => (
                      <div key={i} className={`text-sm ${/^day\s*\d+/i.test(line) ? 'font-semibold text-gray-900 mt-3 first:mt-0' : 'text-gray-600 pl-4'}`}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-400 space-y-1 border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-500">Terms & Conditions</p>
                <p>• Prices subject to availability at time of booking.</p>
                <p>• Final price confirmed on booking.</p>
              </div>
              <div className="text-center pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">Powered by Travelzada AI ✈️</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function buildWhatsAppMsg(pkg: MatchedPackage): string {
  const title = pkg.agentPackageTitle || pkg.Destination_Name
  const inclusions = typeof pkg.Inclusions === 'string'
    ? pkg.Inclusions.split(',').map((s: string) => s.trim()).filter(Boolean)
    : Array.isArray(pkg.Inclusions) ? pkg.Inclusions : []
  const lines: string[] = []
  lines.push(`✈️ *${title}*`)
  lines.push(`📍 ${pkg.Destination_Name}`)
  lines.push(`🗓️ ${pkg.Duration_Days} Days / ${pkg.Duration_Nights} Nights`)
  const tags = [pkg.Star_Category, pkg.Travel_Type].filter(Boolean).join('  |  ')
  if (tags) lines.push(`⭐ ${tags}`)
  lines.push(`💰 *₹${pkg.Price_Min_INR.toLocaleString('en-IN')} per person*`)
  if (pkg.Overview) { lines.push(''); lines.push(`📝 *Overview*`); lines.push(pkg.Overview) }
  if (inclusions.length > 0) {
    lines.push(''); lines.push(`✅ *Inclusions*`)
    inclusions.forEach((inc: string) => lines.push(`  ✓ ${inc}`))
  }
  if (pkg.Day_Wise_Itinerary) {
    lines.push(''); lines.push(`🗺️ *Day-wise Itinerary*`)
    String(pkg.Day_Wise_Itinerary).split('\n').filter(Boolean).forEach(line => {
      lines.push(/^day\s*\d+/i.test(line) ? `*${line}*` : `  ${line}`)
    })
  }
  return lines.join('\n')
}

function AgentBookingForm({ agentInfo, pkg, wizardData, subAgentId, sessionId, agentSlug, onClose }: {
  agentInfo: AgentInfo; pkg: MatchedPackage; wizardData: any
  subAgentId?: string; sessionId?: string; agentSlug?: string; onClose: () => void
}) {
  if (subAgentId) return <QuotationRequestForm agentInfo={agentInfo} pkg={pkg} wizardData={wizardData} subAgentId={subAgentId} agentSlug={agentSlug} onClose={onClose} />
  return <BookingRequestForm agentInfo={agentInfo} pkg={pkg} wizardData={wizardData} subAgentId={subAgentId} sessionId={sessionId} agentSlug={agentSlug} onClose={onClose} />
}

function QuotationRequestForm({ agentInfo, pkg, wizardData, subAgentId, agentSlug, onClose }: {
  agentInfo: AgentInfo; pkg: MatchedPackage; wizardData: any; subAgentId: string; agentSlug?: string; onClose: () => void
}) {
  const [form, setForm] = useState({
    customerName: '',
    preferredDates: wizardData?.dateRange && wizardData.dateRange !== 'Flexible' ? wizardData.dateRange : '',
    specialRequests: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerName.trim()) { setError('Customer name is required.'); return }
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/agent/quotations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentInfo.id, agentSlug: agentInfo.agentSlug, subAgentId, subAgentName: '',
          packageId: pkg.id, packageTitle: pkg.agentPackageTitle || pkg.Destination_Name,
          destination: pkg.Destination_Name, customerName: form.customerName.trim(),
          customerEmail: '', customerPhone: '', preferredDates: form.preferredDates,
          groupSize: (wizardData?.passengers?.adults || 1) + (wizardData?.passengers?.kids || 0),
          adults: wizardData?.passengers?.adults || 1, kids: wizardData?.passengers?.kids || 0,
          rooms: wizardData?.passengers?.rooms || 1, specialRequests: form.specialRequests,
          wizardData, selectedPackage: pkg,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmitted(true)
    } catch (err: any) { setError(err.message || 'Something went wrong.') }
    finally { setSubmitting(false) }
  }

  if (submitted) return (
    <div className="p-8 text-center">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-7 h-7 text-green-600" /></div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Quotation Request Sent!</h3>
      <p className="text-sm text-gray-500 mb-6">Your quotation request has been sent to the DMC. Track it in your <strong>Quotations</strong> tab.</p>
      <button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">Done</button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">Request Quotation</h3>
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Goes to Quotations tab</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{pkg.agentPackageTitle || pkg.Destination_Name} · ₹{pkg.Price_Min_INR.toLocaleString('en-IN')}/person</p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-6 py-5 space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
          This will create a quotation request. You and the DMC will discuss itinerary and pricing.
        </div>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-100">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input name="customerName" value={form.customerName} onChange={handleChange} required placeholder="Your customer's full name"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Travel Dates</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input name="preferredDates" value={form.preferredDates} onChange={handleChange} placeholder="e.g. December 2025, Flexible"
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Special Notes</label>
          <textarea name="specialRequests" value={form.specialRequests} onChange={handleChange} rows={3}
            placeholder="Dietary needs, occasion, budget…"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
        </div>
        <div className="bg-purple-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-purple-100">
          <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <p className="text-xs text-purple-800">
            {wizardData?.passengers?.adults || 1} adult{(wizardData?.passengers?.adults || 1) !== 1 ? 's' : ''}
            {wizardData?.passengers?.kids ? `, ${wizardData.passengers.kids} kid${wizardData.passengers.kids !== 1 ? 's' : ''}` : ''}
            {' · '}{wizardData?.passengers?.rooms || 1} room{(wizardData?.passengers?.rooms || 1) !== 1 ? 's' : ''}
            {' · '}{pkg.Duration_Nights}N {pkg.Duration_Days}D
          </p>
        </div>
      </div>
      <div className="px-6 pb-6">
        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <><Send className="w-4 h-4" />Send Quotation Request</>}
        </button>
      </div>
    </form>
  )
}

function BookingRequestForm({ agentInfo, pkg, wizardData, subAgentId, sessionId, agentSlug, onClose }: {
  agentInfo: AgentInfo; pkg: MatchedPackage; wizardData: any
  subAgentId?: string; sessionId?: string; agentSlug?: string; onClose: () => void
}) {
  const [form, setForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '',
    preferredDates: wizardData?.dateRange && wizardData.dateRange !== 'Flexible' ? wizardData.dateRange : '',
    specialRequests: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerName.trim() || !form.customerEmail.trim()) { setError('Name and email are required.'); return }
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/agent/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentInfo.id, agentSlug: agentInfo.agentSlug,
          packageId: pkg.id, packageTitle: pkg.agentPackageTitle || pkg.Destination_Name,
          destination: pkg.Destination_Name, customerName: form.customerName.trim(),
          customerEmail: form.customerEmail.trim(), customerPhone: form.customerPhone.trim(),
          preferredDates: form.preferredDates,
          groupSize: (wizardData?.passengers?.adults || 1) + (wizardData?.passengers?.kids || 0),
          adults: wizardData?.passengers?.adults || 1, kids: wizardData?.passengers?.kids || 0,
          rooms: wizardData?.passengers?.rooms || 1, specialRequests: form.specialRequests,
          wizardData, selectedPackage: pkg, subAgentId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      if (agentSlug && sessionId) {
        fetch('/api/agent/track', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentSlug, sessionId, action: 'booking_submitted', subAgentId, destination: pkg.Destination_Name, packageTitle: pkg.agentPackageTitle || pkg.Destination_Name }),
        }).catch(() => {})
      }
      setSubmitted(true)
    } catch (err: any) { setError(err.message || 'Something went wrong.') }
    finally { setSubmitting(false) }
  }

  if (submitted) return (
    <div className="p-8 text-center">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-7 h-7 text-green-600" /></div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Booking Request Sent!</h3>
      <p className="text-sm text-gray-500 mb-1">Your request for <strong>{pkg.agentPackageTitle || pkg.Destination_Name}</strong> has been received.</p>
      <p className="text-sm text-gray-500 mb-6"><strong>{agentInfo.companyName}</strong> will contact you at <strong>{form.customerEmail}</strong> shortly.</p>
      <button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">Done</button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <h3 className="font-bold text-gray-900">Request This Package</h3>
          <p className="text-xs text-gray-500 mt-0.5">{pkg.agentPackageTitle || pkg.Destination_Name} · ₹{pkg.Price_Min_INR.toLocaleString('en-IN')}/person</p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-6 py-5 space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-100">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input name="customerName" value={form.customerName} onChange={handleChange} required placeholder="Your full name"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="email" name="customerEmail" value={form.customerEmail} onChange={handleChange} required placeholder="you@email.com"
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input name="customerPhone" value={form.customerPhone} onChange={handleChange} placeholder="+91 98765..."
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Travel Dates</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input name="preferredDates" value={form.preferredDates} onChange={handleChange} placeholder="e.g. December 2025, Flexible"
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Special Requests</label>
          <textarea name="specialRequests" value={form.specialRequests} onChange={handleChange} rows={2}
            placeholder="Dietary needs, accessibility, or special occasions…"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
        </div>
        <div className="bg-purple-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-purple-100">
          <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <p className="text-xs text-purple-800">
            {wizardData?.passengers?.adults || 1} adult{(wizardData?.passengers?.adults || 1) !== 1 ? 's' : ''}
            {wizardData?.passengers?.kids ? `, ${wizardData.passengers.kids} kid${wizardData.passengers.kids !== 1 ? 's' : ''}` : ''}
            {' · '}{wizardData?.passengers?.rooms || 1} room{(wizardData?.passengers?.rooms || 1) !== 1 ? 's' : ''}
            {' · '}{pkg.Duration_Nights}N {pkg.Duration_Days}D
          </p>
        </div>
      </div>
      <div className="px-6 pb-6">
        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending request…</> : <><Send className="w-4 h-4" />Send Booking Request</>}
        </button>
        <p className="text-xs text-center text-gray-400 mt-2">{agentInfo.companyName} will contact you to confirm details.</p>
      </div>
    </form>
  )
}
