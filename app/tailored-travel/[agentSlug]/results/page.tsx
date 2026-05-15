'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, X, Send, User, Calendar,
  Users, Star, Clock, CheckCircle, MapPin, Package,
  FileText, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react'
import PackagePdfModal from '@/components/pdf/PackagePdfModal'
import { openPackagePdfWindow } from '@/lib/generatePackagePdf'


interface MatchedPackage {
  id: string
  Destination_Name: string
  Destination_Country?: string
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
  Exclusions?: string | string[]
  Highlights?: string[]
  Hotels?: any[]
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
  const [nameCaptureAction, setNameCaptureAction] = useState<'pdf' | 'whatsapp' | null>(null)
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [subAgentId, setSubAgentId] = useState<string | undefined>(undefined)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [showPdf, setShowPdf] = useState(false)
  const [selectedPkgIdx, setSelectedPkgIdx] = useState(0)

  // Day narrator
  const [currentDayIdx, setCurrentDayIdx] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-7">
          {agentInfo && (
            <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-md shadow-gray-100">
              {agentInfo.logoUrl
                ? <img src={agentInfo.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{agentInfo.companyName.charAt(0)}</div>}
              <span className="text-sm font-semibold text-gray-700">{agentInfo.companyName}</span>
              <span className="text-xs text-gray-400">· Powered by Travelzada AI</span>
            </div>
          )}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-16 h-16 rounded-full bg-primary/10 animate-ping" />
            <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-primary animate-spin" />
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={loadingIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="text-gray-500 text-sm font-medium tracking-wide">{cinematicTexts[loadingIdx]}</motion.p>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  const AgentStrip = ({ pkg }: { pkg?: MatchedPackage }) => agentInfo ? (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm relative z-50 flex-shrink-0">
      <div className="px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {agentInfo.logoUrl
            ? <img src={agentInfo.logoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-100 shadow-sm" />
            : <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm">{agentInfo.companyName.charAt(0)}</div>}
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">{agentInfo.companyName}</p>
            <p className="text-[10px] text-gray-400 font-medium">Powered by Travelzada AI</p>
          </div>
        </div>
        <Link href={`/tailored-travel/${agentSlug}`}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary font-semibold transition-colors flex-shrink-0 bg-gray-50 hover:bg-primary/5 px-3 py-1.5 rounded-full border border-gray-100 hover:border-primary/20">
          <ArrowLeft className="w-3 h-3" /> Change preferences
        </Link>
      </div>
    </div>
  ) : null

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AgentStrip />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-600 mb-4 text-sm font-medium">{error}</p>
          <button onClick={() => router.push(`/tailored-travel/${agentSlug}${isEmbed ? '?embed=1' : ''}`)}
            className="flex items-center gap-2 text-primary font-semibold hover:underline text-sm">
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
          <div className="w-16 h-16 bg-primary/8 rounded-full flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-primary/50" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No matching packages found</h2>
          <p className="text-sm text-gray-500 mb-6">
            {agentInfo?.companyName} hasn&apos;t added packages for your selected destinations yet.
          </p>
          <button onClick={() => router.push(`/tailored-travel/${agentSlug}${isEmbed ? '?embed=1' : ''}`)}
            className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-primary/25 transition-all hover:scale-105">
            <ArrowLeft className="w-4 h-4" /> Change destination
          </button>
        </div>
      </div>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────
  const bestPkg = packages[selectedPkgIdx] ?? packages[0]
  const title = bestPkg.agentPackageTitle || bestPkg.Destination_Name
  const inclusions = typeof bestPkg.Inclusions === 'string'
    ? bestPkg.Inclusions.split(',').map((s: string) => s.trim()).filter(Boolean)
    : Array.isArray(bestPkg.Inclusions) ? bestPkg.Inclusions : []
  const exclusions = typeof bestPkg.Exclusions === 'string'
    ? bestPkg.Exclusions.split(',').map((s: string) => s.trim()).filter(Boolean)
    : Array.isArray(bestPkg.Exclusions) ? bestPkg.Exclusions : []
  const highlights = Array.isArray(bestPkg.Highlights) ? bestPkg.Highlights : []
  const pdfAdults = wizardData?.passengers?.adults || 1
  const pdfKids = wizardData?.passengers?.kids || 0
  const pdfGroupSize = pdfAdults + pdfKids
  const days = parseDays(bestPkg.Day_Wise_Itinerary || '')

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-gray-900">
      <AgentStrip pkg={bestPkg} />

      {/* ── Hero ── */}
      <section className="relative h-[260px] sm:h-[340px] md:h-[440px] w-full">
        {bestPkg.Primary_Image_URL
          ? <img src={bestPkg.Primary_Image_URL} alt={title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><MapPin className="w-16 h-16 text-primary/20" /></div>}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#f8f5f0] opacity-95" />
      </section>

      {/* ── Floating content ── */}
      <section className="relative -mt-20 sm:-mt-24 md:-mt-32 px-4 sm:px-6 md:px-8 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 md:gap-8 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">

            {/* Header card */}
            <article className="bg-white rounded-xl shadow-lg p-5 sm:p-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-primary font-semibold uppercase tracking-wide">
                <span className="px-3 py-1 bg-primary/10 rounded-full">{bestPkg.Destination_Name}</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full">{bestPkg.Duration_Nights}N {bestPkg.Duration_Days}D</span>
                {bestPkg.Star_Category && bestPkg.Star_Category.toLowerCase() !== 'none' && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full">{bestPkg.Star_Category}</span>
                )}
                {bestPkg.Travel_Type && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full">{bestPkg.Travel_Type}</span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1e1d2f] leading-tight">{title}</h1>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1 p-3 bg-[#f8f5f0] rounded-lg">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Duration</p>
                  <p className="text-sm font-bold text-[#1e1d2f]">{bestPkg.Duration_Nights}N {bestPkg.Duration_Days}D</p>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-[#f8f5f0] rounded-lg">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Destination</p>
                  <p className="text-sm font-bold text-[#1e1d2f]">{bestPkg.Destination_Name}</p>
                </div>
                {bestPkg.Star_Category && bestPkg.Star_Category.toLowerCase() !== 'none' && (
                  <div className="flex flex-col gap-1 p-3 bg-[#f8f5f0] rounded-lg">
                    <Star className="w-4 h-4 text-primary" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Hotel</p>
                    <p className="text-sm font-bold text-[#1e1d2f]">{bestPkg.Star_Category}</p>
                  </div>
                )}
                {bestPkg.Travel_Type && (
                  <div className="flex flex-col gap-1 p-3 bg-[#f8f5f0] rounded-lg">
                    <Users className="w-4 h-4 text-primary" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Travel Type</p>
                    <p className="text-sm font-bold text-[#1e1d2f]">{bestPkg.Travel_Type}</p>
                  </div>
                )}
              </div>
            </article>

            {/* Why it matches */}
            {bestPkg.matchReason && (
              <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border-l-4 border-primary">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Why it matches</p>
                <p className="text-sm text-gray-700 leading-relaxed">{bestPkg.matchReason}</p>
              </div>
            )}

            {/* Overview */}
            {bestPkg.Overview && (
              <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
                <h2 className="text-xl font-serif text-[#1e1d2f] mb-3">Overview</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{bestPkg.Overview}</p>
              </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
                <h2 className="text-xl font-serif text-[#1e1d2f] mb-4">Highlights</h2>
                <ul className="space-y-3">
                  {highlights.map((h: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 text-primary text-base flex-shrink-0">✔</span>
                      <span className="text-sm text-gray-700 leading-relaxed">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Day-wise Itinerary */}
            {days.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-serif text-[#1e1d2f]">Day-wise Itinerary</h2>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentDayIdx(p => Math.max(0, p - 1))} disabled={currentDayIdx === 0}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                    </button>
<button onClick={() => setCurrentDayIdx(p => Math.min(days.length - 1, p + 1))} disabled={currentDayIdx === days.length - 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {days.map((day, i) => (
                    <details
                      key={i}
                      ref={el => { dayRefs.current[i] = el as any }}
                      open={i === currentDayIdx}
                      className={`rounded-lg border p-4 transition-all [&[open]_svg.chevron]:rotate-180 ${
                        i === currentDayIdx ? 'border-primary/30 shadow-sm' : 'border-gray-200 bg-white hover:border-primary/20'
                      }`}
                    >
                      <summary
                        className="flex items-center justify-between cursor-pointer list-none gap-3"
                        onClick={e => { e.preventDefault(); setCurrentDayIdx(i); setIsPaused(true) }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 transition-all ${
                            i === currentDayIdx ? 'bg-primary text-white shadow-sm' : 'bg-primary/10 text-primary'
                          }`}>
                            {day.number}
                          </span>
                          <span className="text-sm font-medium text-gray-800 leading-tight">{day.title}</span>
                        </div>
                        <ChevronDown className="chevron w-4 h-4 text-primary transition-transform duration-200 flex-shrink-0" />
                      </summary>
                      {day.lines.length > 0 && (
                        <div className="mt-3 pl-10 space-y-1.5">
                          {day.lines.map((line, j) => (
                            <p key={j} className="text-xs text-gray-500 leading-relaxed pl-2 border-l-2 border-primary/20">{line}</p>
                          ))}
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Inclusions + Exclusions */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inclusions.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-serif text-[#1e1d2f] mb-3">Inclusions</h2>
                    <ul className="space-y-2.5">
                      {inclusions.map((inc: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-700 leading-relaxed">{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {exclusions.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-serif text-[#1e1d2f] mb-3">Exclusions</h2>
                    <ul className="space-y-2.5">
                      {exclusions.map((exc: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-500 leading-relaxed">{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Terms */}
            <div className="bg-white rounded-xl shadow-sm p-5 text-xs text-gray-400 space-y-1">
              <p className="font-bold text-gray-500 text-sm">Terms & Conditions</p>
              <p>• Prices subject to availability at time of booking.</p>
              <p>• Final price confirmed on booking confirmation.</p>
            </div>

          </div>

          {/* ── RIGHT COLUMN — Sticky sidebar ── */}
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* Price + action card */}
            <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 space-y-5">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Starting from</p>
                <p className="text-3xl font-serif text-[#c99846] leading-tight">
                  ₹{bestPkg.Price_Min_INR.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-500">per person</p>
              </div>

              {/* Trip summary */}
              <div className="text-xs text-gray-600 bg-[#f8f5f0] rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>
                    {pdfAdults} adult{pdfAdults !== 1 ? 's' : ''}
                    {pdfKids ? `, ${pdfKids} kid${pdfKids !== 1 ? 's' : ''}` : ''}
                  </span>
                </div>
                {wizardData?.dateRange && !['Flexible', 'Next Month', 'Within 3 Months', 'Decided Dates'].includes(wizardData.dateRange) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{new Date(wizardData.dateRange).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                {wizardData?.pickupCity && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>From {wizardData.pickupCity}</span>
                  </div>
                )}
              </div>

              {/* CTAs */}
              <div className="space-y-2.5">
                <button
                  onClick={() => setNameCaptureAction('pdf')}
                  className="w-full border-2 border-gray-900 text-gray-900 py-3 rounded-lg font-semibold text-sm hover:bg-gray-900 hover:text-white transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Download Itinerary
                </button>
                <button
                  onClick={() => setNameCaptureAction('whatsapp')}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-sm transition"
                >
                  <Send className="w-3.5 h-3.5" /> Share on WhatsApp
                </button>
              </div>
            </div>


            {/* Other matched packages */}
            {packages.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Other Matches</p>
                <div className="space-y-2">
                  {packages.slice(1).map((pkg, i) => (
                    <button
                      key={pkg.id}
                      onClick={() => { setSelectedPkgIdx(i + 1); setCurrentDayIdx(0); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      className={`w-full flex gap-3 p-2.5 rounded-lg transition text-left ${selectedPkgIdx === i + 1 ? 'bg-primary/5 border border-primary/20' : 'hover:bg-gray-50 border border-transparent'}`}
                    >
                      {pkg.Primary_Image_URL && (
                        <img src={pkg.Primary_Image_URL} alt="" className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{pkg.agentPackageTitle || pkg.Destination_Name}</p>
                        <p className="text-[10px] text-[#c99846] font-semibold mt-1">₹{pkg.Price_Min_INR.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-gray-400">{pkg.matchScore}% match</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── Name Capture Modal ── */}
      <AnimatePresence>
        {nameCaptureAction && agentInfo && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <NameCaptureModal
                action={nameCaptureAction}
                agentInfo={agentInfo}
                pkg={bestPkg}
                wizardData={wizardData}
                subAgentId={subAgentId}
                sessionId={sessionId}
                agentSlug={agentSlug}
                onClose={() => setNameCaptureAction(null)}
                onSuccess={() => {
                  if (nameCaptureAction === 'pdf') setShowPdf(true)
                  else { const msg = buildWhatsAppMsg(bestPkg); window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank') }
                  setNameCaptureAction(null)
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PDF Modal ── */}
      {showPdf && (
        <PackagePdfModal
          title={title}
          destination={bestPkg.Destination_Name}
          destinationCountry={bestPkg.Destination_Country}
          durationDays={bestPkg.Duration_Days}
          durationNights={bestPkg.Duration_Nights}
          starCategory={bestPkg.Star_Category}
          travelType={bestPkg.Travel_Type}
          pricePerPerson={bestPkg.Price_Min_INR}
          groupSize={pdfGroupSize}
          adults={pdfAdults}
          kids={pdfKids || undefined}
          overview={bestPkg.Overview}
          inclusions={inclusions}
          exclusions={exclusions}
          highlights={highlights}
          dayWiseItinerary={bestPkg.Day_Wise_Itinerary ? String(bestPkg.Day_Wise_Itinerary) : undefined}
          brandName={agentInfo?.companyName || 'Travel Agent'}
          onClose={() => setShowPdf(false)}
          onWhatsApp={() => {
            const msg = buildWhatsAppMsg(bestPkg)
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
          }}
          onPrint={() => openPackagePdfWindow({
            title,
            destination: bestPkg.Destination_Name,
            destinationCountry: bestPkg.Destination_Country,
            heroImage: bestPkg.Primary_Image_URL,
            durationDays: bestPkg.Duration_Days,
            durationNights: bestPkg.Duration_Nights,
            starCategory: bestPkg.Star_Category,
            travelType: bestPkg.Travel_Type,
            pricePerPerson: bestPkg.Price_Min_INR,
            groupSize: pdfGroupSize,
            adults: pdfAdults,
            kids: pdfKids || undefined,
            overview: bestPkg.Overview,
            inclusions,
            exclusions,
            highlights,
            dayWiseItinerary: bestPkg.Day_Wise_Itinerary ? String(bestPkg.Day_Wise_Itinerary) : undefined,
            brandName: agentInfo?.companyName || 'Travel Agent',
            termsVariant: 'brochure',
          })}
        />
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


function NameCaptureModal({ action, agentInfo, pkg, wizardData, subAgentId, sessionId, agentSlug, onClose, onSuccess }: {
  action: 'pdf' | 'whatsapp'
  agentInfo: AgentInfo; pkg: MatchedPackage; wizardData: any
  subAgentId?: string; sessionId?: string; agentSlug?: string
  onClose: () => void; onSuccess: () => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const preferredDates = wizardData?.dateRange && !['Flexible', 'Next Month', 'Within 3 Months', 'Decided Dates'].includes(wizardData.dateRange)
    ? wizardData.dateRange : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim()) { setError('Customer name is required.'); return }
    setError(''); setSubmitting(true)
    try {
      const endpoint = subAgentId ? '/api/agent/quotations' : '/api/agent/bookings'
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentInfo.id, agentSlug: agentInfo.agentSlug, subAgentId, subAgentName: '',
          packageId: pkg.id, packageTitle: pkg.agentPackageTitle || pkg.Destination_Name,
          destination: pkg.Destination_Name, customerName: customerName.trim(),
          customerEmail: '', customerPhone: '', preferredDates,
          groupSize: (wizardData?.passengers?.adults || 1) + (wizardData?.passengers?.kids || 0),
          adults: wizardData?.passengers?.adults || 1, kids: wizardData?.passengers?.kids || 0,
          rooms: wizardData?.passengers?.rooms || 1, specialRequests: '',
          wizardData, selectedPackage: pkg,
        }),
      })
      if (agentSlug && sessionId) {
        fetch('/api/agent/track', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentSlug, sessionId, action: 'quotation_submitted', subAgentId, destination: pkg.Destination_Name, packageTitle: pkg.agentPackageTitle || pkg.Destination_Name }),
        }).catch(() => {})
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      onSuccess()
    } catch (err: any) { setError(err.message || 'Something went wrong.') }
    finally { setSubmitting(false) }
  }

  const actionLabel = action === 'pdf' ? 'Download Itinerary' : 'Share on WhatsApp'

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-3xl">
        <div>
          <h3 className="font-bold text-gray-900">{actionLabel}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{pkg.agentPackageTitle || pkg.Destination_Name} · ₹{pkg.Price_Min_INR.toLocaleString('en-IN')}/person</p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-6 py-5 space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-100">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
              placeholder="Your customer's full name"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
            />
          </div>
        </div>
        <div className="bg-primary/5 rounded-xl px-4 py-3 flex items-center gap-3 border border-primary/10">
          <Users className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-gray-700">
            {wizardData?.passengers?.adults || 1} adult{(wizardData?.passengers?.adults || 1) !== 1 ? 's' : ''}
            {wizardData?.passengers?.kids ? `, ${wizardData.passengers.kids} kid${wizardData.passengers.kids !== 1 ? 's' : ''}` : ''}
            {' · '}{wizardData?.passengers?.rooms || 1} room{(wizardData?.passengers?.rooms || 1) !== 1 ? 's' : ''}
            {' · '}{pkg.Duration_Nights}N {pkg.Duration_Days}D
          </p>
        </div>
      </div>
      <div className="px-6 pb-6">
        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Send className="w-4 h-4" />{actionLabel}</>}
        </button>
      </div>
    </form>
  )
}
