'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  BookOpen, Activity, LogOut, Loader2, Mail, Phone, MapPin, Calendar,
  CheckCircle, Clock, XCircle, Package, TrendingUp, Eye, BarChart3,
  MessageSquare, Send, Users, Copy, Check, ExternalLink, Home,
  IndianRupee, Star, ArrowUpRight, Search, ChevronDown, ChevronUp,
  Sparkles, Bot, Mic, MicOff, Volume2, Globe, Share2, FileText,
  Columns3, List, X
} from 'lucide-react'
import SubAgentDemoLoader from '@/components/travel-agent-dashboard/SubAgentDemoLoader'
import QuotationHistory from '@/components/dmc-dashboard/QuotationHistory'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: string
  packageTitle: string
  destination: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  preferredDates?: string
  groupSize: number
  adults: number
  kids: number
  status: string
  bookingValue?: number
  createdAt?: { seconds: number }
}

interface SessionEvent {
  id: string
  action: string
  destination?: string
  packageTitle?: string
  timestamp?: { seconds: number }
}

interface QuotMsg {
  id: string
  senderId: string
  senderRole: string
  senderName: string
  text: string
  timestamp: string
}

interface PackageData {
  id?: string
  title: string
  destination: string
  destinationCountry?: string
  overview?: string
  durationDays?: number
  durationNights?: number
  pricePerPerson?: number
  travelType?: string
  starCategory?: string
  inclusions?: string[]
  exclusions?: string[]
  highlights?: string[]
  dayWiseItinerary?: string
  primaryImageUrl?: string
  theme?: string
  mood?: string
}

interface Quotation {
  id: string
  packageTitle: string
  destination: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  status: string
  quotedPrice?: number
  groupSize?: number
  adults?: number
  kids?: number
  rooms?: number
  preferredDates?: string
  specialRequests?: string
  packageId?: string
  selectedPackage?: PackageData | null
  customPackageData?: PackageData | null
  messages: QuotMsg[]
  createdAt?: { seconds: number }
}

interface AgentPackage {
  id: string
  title: string
  destination: string
  destinationCountry?: string
  durationNights: number
  durationDays: number
  pricePerPerson: number
  travelType: string
  starCategory: string
  primaryImageUrl?: string
  isActive: boolean
  overview?: string
  inclusions?: string[]
  exclusions?: string[]
  highlights?: string[]
  dayWiseItinerary?: string
  theme?: string
  mood?: string
}

type Tab = 'planner' | 'home' | 'bookings' | 'packages' | 'quotations' | 'quote_history' | 'customers' | 'stats' | 'activity' | 'ai'

const INDIAN_LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिंदी' },
  { code: 'bn-IN', label: 'বাংলা' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'മലയാളം' },
  { code: 'gu-IN', label: 'ગુજરાતી' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
  { code: 'ur-IN', label: 'اردو' },
  { code: 'or-IN', label: 'ଓଡ଼ିଆ' },
]

// ─── Status configs ───────────────────────────────────────────────────────────
const BOOKING_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  new:       { label: 'New',       color: 'bg-blue-50 text-blue-700',   dot: 'bg-blue-500' },
  contacted: { label: 'Contacted', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700',     dot: 'bg-red-400' },
  completed: { label: 'Completed', color: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
}

const QUOT_STATUS: Record<string, { label: string; color: string }> = {
  pending:       { label: 'Pending',       color: 'bg-amber-50 text-amber-700' },
  in_discussion: { label: 'In Discussion', color: 'bg-blue-50 text-blue-700' },
  quoted:        { label: 'Quoted',        color: 'bg-purple-50 text-purple-700' },
  accepted:      { label: 'Accepted',      color: 'bg-green-50 text-green-700' },
  rejected:      { label: 'Rejected',      color: 'bg-red-50 text-red-700' },
  converted:     { label: 'Booked ✓',      color: 'bg-purple-100 text-purple-700' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(ts?: { seconds: number }) {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDT(ts?: { seconds: number }) {
  if (!ts) return '—'
  const d = new Date(ts.seconds * 1000)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function buildPackageWhatsAppMessage(pkg: AgentPackage): string {
  const lines: string[] = []

  lines.push(`✈️ *${pkg.title}*`)
  lines.push(`📍 ${pkg.destination}${pkg.destinationCountry ? ', ' + pkg.destinationCountry : ''}`)
  lines.push(`🗓️ ${pkg.durationDays} Days / ${pkg.durationNights} Nights`)
  lines.push(`⭐ ${pkg.starCategory}  |  🎒 ${pkg.travelType}${pkg.theme ? '  |  🎨 ' + pkg.theme : ''}${pkg.mood ? '  |  💫 ' + pkg.mood : ''}`)
  lines.push(`💰 *₹${pkg.pricePerPerson.toLocaleString('en-IN')} per person*`)

  if (pkg.overview) {
    lines.push('')
    lines.push(`📝 *Overview*`)
    lines.push(pkg.overview)
  }

  if (pkg.highlights && pkg.highlights.length > 0) {
    lines.push('')
    lines.push(`✨ *Highlights*`)
    pkg.highlights.forEach(h => lines.push(`  • ${h}`))
  }

  if (pkg.inclusions && pkg.inclusions.length > 0) {
    lines.push('')
    lines.push(`✅ *Inclusions*`)
    pkg.inclusions.forEach(inc => lines.push(`  ✓ ${inc}`))
  }

  if (pkg.exclusions && pkg.exclusions.length > 0) {
    lines.push('')
    lines.push(`❌ *Exclusions*`)
    pkg.exclusions.forEach(exc => lines.push(`  ✗ ${exc}`))
  }

  if (pkg.dayWiseItinerary) {
    lines.push('')
    lines.push(`🗺️ *Day-wise Itinerary*`)
    pkg.dayWiseItinerary.split('\n').filter(Boolean).forEach(line => {
      const isDay = /^day\s*\d+/i.test(line)
      lines.push(isDay ? `*${line}*` : `  ${line}`)
    })
  }

  return lines.join('\n')
}

export default function SubAgentDashboardPage() {
  const router = useRouter()
  const { currentUser, isSubAgent, subAgentName, parentAgentId, parentAgentSlug, loading: authLoading, logout } = useAuth()

  const [tab, setTab] = useState<Tab>('home')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [sessions, setSessions] = useState<SessionEvent[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [packages, setPackages] = useState<AgentPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Quotation chat state
  const [selQuot, setSelQuot] = useState<Quotation | null>(null)
  const [msgText, setMsgText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [quotFilter, setQuotFilter] = useState('all')
  const [pdfQuot, setPdfQuot] = useState<Quotation | null>(null)

  // Package detail view modal (browse packages)
  const [viewPkgDetail, setViewPkgDetail] = useState<AgentPackage | null>(null)
  const [copiedPkgId, setCopiedPkgId] = useState<string | null>(null)

  // Package view/edit modal (quotation flow)
  const [viewPkgQuot, setViewPkgQuot] = useState<Quotation | null>(null)
  const [viewPkgData, setViewPkgData] = useState<PackageData | null>(null)
  const [loadingPkg, setLoadingPkg] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [customForm, setCustomForm] = useState<PackageData>({ title: '', destination: '' })
  const [savingCustom, setSavingCustom] = useState(false)
  const [sharingCustom, setSharingCustom] = useState(false)
  const [customSaved, setCustomSaved] = useState(false)

  // Bookings search/filter
  const [bookSearch, setBookSearch] = useState('')
  const [bookFilter, setBookFilter] = useState('all')
  const [expandedBook, setExpandedBook] = useState<string | null>(null)

  // Package search/filter
  const [pkgSearch, setPkgSearch] = useState('')
  const [pkgDestFilter, setPkgDestFilter] = useState('all')
  const [pkgStarFilter, setPkgStarFilter] = useState('all')
  const [pkgTypeFilter, setPkgTypeFilter] = useState('all')

  // Quotation search
  const [quotSearch, setQuotSearch] = useState('')

  // Customer search
  const [custSearch, setCustSearch] = useState('')

  // Activity filter
  const [actFilter, setActFilter] = useState('all')

  // AI Assistant state
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string; ts: number }[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedAiPkg, setSelectedAiPkg] = useState<AgentPackage | null>(null)
  const [aiLang, setAiLang] = useState('hi-IN')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [pkgPickerOpen, setPkgPickerOpen] = useState(false)
  const [pkgPickerSearch, setPkgPickerSearch] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [continuousMode, setContinuousMode] = useState(false)
  const [continuousStatus, setContinuousStatus] = useState<'listening' | 'thinking' | 'speaking' | 'idle'>('idle')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const recognitionRef = useRef<any>(null)
  const aiChatEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const continuousModeRef = useRef(false)
  const aiLangRef = useRef('hi-IN')
  const selectedAiPkgRef = useRef<AgentPackage | null>(null)
  const aiMessagesRef = useRef<{ role: 'user' | 'assistant'; content: string; ts: number }[]>([])

  // Redirect non-sub-agents
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) router.push('/agent-login')
      else if (!isSubAgent) router.push('/')
    }
  }, [authLoading, currentUser, isSubAgent, router])

  // Fetch everything in parallel
  const fetchAll = useCallback(async () => {
    if (!currentUser || !parentAgentId || !parentAgentSlug) return
    setLoading(true)
    try {
      const [bookRes, sessRes, quotRes, pkgRes] = await Promise.all([
        fetch(`/api/agent/bookings?agentId=${parentAgentId}`),
        fetch(`/api/agent/sessions?agentSlug=${parentAgentSlug}&subAgentId=${currentUser.uid}`),
        fetch(`/api/agent/quotations?subAgentId=${currentUser.uid}`),
        fetch(`/api/agent/packages?agentId=${parentAgentId}`),
      ])
      const [bookData, sessData, quotData, pkgData] = await Promise.all([
        bookRes.json(), sessRes.json(), quotRes.json(), pkgRes.json()
      ])
      if (bookData.success) {
        const mine = bookData.bookings
          .filter((b: any) => b.subAgentId === currentUser.uid)
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setBookings(mine)
      }
      if (sessData.success) setSessions(sessData.sessions)
      if (quotData.success) {
        setQuotations(quotData.quotations.map((q: any) => ({ ...q, messages: q.messages || [] })))
      }
      if (pkgData.success) {
        setPackages(pkgData.packages.filter((p: any) => p.isActive)
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
      }
    } catch { } finally { setLoading(false) }
  }, [currentUser, parentAgentId, parentAgentSlug])

  useEffect(() => {
    if (!authLoading && currentUser && isSubAgent) fetchAll()
  }, [authLoading, currentUser, isSubAgent, fetchAll])

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, aiLoading])

  // Keep refs in sync so callbacks always have latest values
  useEffect(() => { aiLangRef.current = aiLang }, [aiLang])
  useEffect(() => { selectedAiPkgRef.current = selectedAiPkg }, [selectedAiPkg])
  useEffect(() => { aiMessagesRef.current = aiMessages }, [aiMessages])

  async function sendMessage() {
    if (!msgText.trim() || !selQuot || !currentUser) return
    setSendingMsg(true)
    try {
      const res = await fetch(`/api/agent/quotations/${selQuot.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message', senderId: currentUser.uid,
          senderRole: 'subagent',
          senderName: subAgentName || currentUser.email || 'Travel Agent',
          text: msgText.trim(),
        }),
      })
      if (res.ok) {
        const newMsg: QuotMsg = {
          id: Date.now().toString(), senderId: currentUser.uid, senderRole: 'subagent',
          senderName: subAgentName || 'Travel Agent', text: msgText.trim(), timestamp: new Date().toISOString(),
        }
        const updated = { ...selQuot, messages: [...selQuot.messages, newMsg], status: selQuot.status === 'pending' ? 'in_discussion' : selQuot.status }
        setSelQuot(updated)
        setQuotations(prev => prev.map(q => q.id === updated.id ? updated : q))
        setMsgText('')
      }
    } catch { } finally { setSendingMsg(false) }
  }

  function shareQuotationWhatsApp(q: Quotation) {
    const price = q.quotedPrice ? `₹${Number(q.quotedPrice).toLocaleString('en-IN')}` : 'To be confirmed'
    const lines = [
      `🌍 *Travel Quotation*`,
      ``,
      `Hello ${q.customerName},`,
      ``,
      `Here is your travel quotation:`,
      ``,
      `📦 *Package:* ${q.packageTitle}`,
      `📍 *Destination:* ${q.destination}`,
      ``,
      `💰 *Quoted Price:* ${price}`,
      ``,
      `For more details or to confirm your booking, please reply to this message.`,
      ``,
      `Thank you for choosing us ✈️`,
    ].join('\n')

    const phone = q.customerPhone?.replace(/\D/g, '')
    const encoded = encodeURIComponent(lines)
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  function openPackageView(q: Quotation) {
    setViewPkgQuot(q)
    setEditingSection(null)
    setCustomSaved(false)

    // 1. Sub-agent's saved custom version
    if (q.customPackageData) {
      setViewPkgData(q.customPackageData)
      setCustomForm(q.customPackageData)
      return
    }

    // 2. Full package data saved at quotation-creation time
    if (q.selectedPackage && q.selectedPackage.title) {
      setViewPkgData(q.selectedPackage)
      setCustomForm(q.selectedPackage)
      return
    }

    // 3. Look up from the already-loaded packages array in state (fastest, no extra fetch)
    if (q.packageId) {
      const found = packages.find(p => p.id === q.packageId)
      if (found) {
        const pkgData: PackageData = {
          id: found.id,
          title: found.title,
          destination: found.destination,
          destinationCountry: found.destinationCountry,
          overview: found.overview,
          durationDays: found.durationDays,
          durationNights: found.durationNights,
          pricePerPerson: found.pricePerPerson,
          travelType: found.travelType,
          starCategory: found.starCategory,
          inclusions: found.inclusions || [],
          exclusions: found.exclusions || [],
          highlights: found.highlights || [],
          dayWiseItinerary: found.dayWiseItinerary || '',
          primaryImageUrl: found.primaryImageUrl,
          theme: found.theme,
          mood: found.mood,
        }
        setViewPkgData(pkgData)
        setCustomForm(pkgData)
        return
      }

      // 4. Package not in state yet (inactive/etc) — fetch directly
      setLoadingPkg(true)
      fetch(`/api/agent/packages/${q.packageId}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.package) {
            setViewPkgData(data.package)
            setCustomForm(data.package)
          } else {
            const fb: PackageData = { title: q.packageTitle, destination: q.destination }
            setViewPkgData(fb); setCustomForm(fb)
          }
        })
        .catch(() => {
          const fb: PackageData = { title: q.packageTitle, destination: q.destination }
          setViewPkgData(fb); setCustomForm(fb)
        })
        .finally(() => setLoadingPkg(false))
      return
    }

    // 5. No package ID at all — use quotation title/destination as starting point
    const fb: PackageData = { title: q.packageTitle, destination: q.destination }
    setViewPkgData(fb)
    setCustomForm(fb)
  }

  async function saveCustomPackage(andShare = false) {
    if (!viewPkgQuot || !currentUser) return
    andShare ? setSharingCustom(true) : setSavingCustom(true)
    try {
      await fetch(`/api/agent/quotations/${viewPkgQuot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPackageData: customForm }),
      })
      // Update local state
      setQuotations(prev => prev.map(q =>
        q.id === viewPkgQuot.id ? { ...q, customPackageData: customForm } : q
      ))
      setViewPkgQuot(prev => prev ? { ...prev, customPackageData: customForm } : prev)
      setViewPkgData(customForm)
      setCustomSaved(true)

      if (andShare) {
        // Send a message to notify the agent
        const msgRes = await fetch(`/api/agent/quotations/${viewPkgQuot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'message',
            senderId: currentUser.uid,
            senderRole: 'subagent',
            senderName: subAgentName || 'Travel Agent',
            text: `✏️ Custom Package Proposal: I've created a customized package version for ${viewPkgQuot.customerName}'s quotation — "${customForm.title}". Please review and set a price.`,
          }),
        })
        const msgData = await msgRes.json()
        if (msgData.success) {
          const updatedMsg = msgData.message
          setQuotations(prev => prev.map(q =>
            q.id === viewPkgQuot.id
              ? { ...q, messages: [...q.messages, updatedMsg] }
              : q
          ))
          if (selQuot?.id === viewPkgQuot.id) {
            setSelQuot(prev => prev ? { ...prev, messages: [...prev.messages, updatedMsg] } : prev)
          }
        }
        setViewPkgQuot(null)
      }
    } catch { }
    finally {
      setSavingCustom(false)
      setSharingCustom(false)
    }
  }

  function copyPlannerUrl() {
    const url = `${window.location.origin}/tailored-travel/${parentAgentSlug}?subAgent=${currentUser?.uid}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function stopSpeaking() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  async function speakText(text: string, onEnd?: () => void) {
    stopSpeaking()
    setIsSpeaking(true)
    const done = () => { setIsSpeaking(false); onEnd?.() }
    try {
      const res = await fetch('/api/ai-planner/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('TTS API failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); done() }
      audio.onerror = () => { URL.revokeObjectURL(url); done() }
      await audio.play()
    } catch {
      if ('speechSynthesis' in window) {
        const utt = new SpeechSynthesisUtterance(text)
        utt.lang = aiLangRef.current
        utt.onend = done
        utt.onerror = done
        window.speechSynthesis.speak(utt)
      } else {
        done()
      }
    }
  }

  // Core: send a message and optionally restart listening when done
  async function sendAiMessage(text?: string, restartAfter = false) {
    const msg = (text ?? aiInput).trim()
    if (!msg) return
    const userMsg = { role: 'user' as const, content: msg, ts: Date.now() }
    const updated = [...aiMessagesRef.current, userMsg]
    setAiMessages(updated)
    setAiInput('')
    setAiLoading(true)
    if (continuousModeRef.current) setContinuousStatus('thinking')
    try {
      const res = await fetch('/api/agent/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          language: aiLangRef.current,
          packageDetails: selectedAiPkgRef.current,
          conversation: updated.slice(-20),
        }),
      })
      const data = await res.json()
      const reply = data.reply || 'Sorry, something went wrong.'
      setAiMessages(prev => [...prev, { role: 'assistant' as const, content: reply, ts: Date.now() }])
      if (autoSpeak || restartAfter) {
        if (continuousModeRef.current) setContinuousStatus('speaking')
        speakText(reply, () => {
          if (continuousModeRef.current) startContinuousListening()
        })
      } else if (continuousModeRef.current) {
        startContinuousListening()
      }
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant' as const, content: 'Error getting response. Please try again.', ts: Date.now() }])
      if (continuousModeRef.current) startContinuousListening()
    } finally {
      setAiLoading(false)
    }
  }

  // Single-shot mic toggle (manual mode)
  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice input is not supported in this browser. Please use Chrome.'); return }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const recog = new SR()
    recog.lang = aiLangRef.current
    recog.continuous = false
    recog.interimResults = false
    recog.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript || ''
      if (t) sendAiMessage(t)
    }
    recog.onerror = () => setIsListening(false)
    recog.onend = () => setIsListening(false)
    recognitionRef.current = recog
    recog.start()
    setIsListening(true)
  }

  // Continuous mode: start one recognition round
  function startContinuousListening() {
    if (!continuousModeRef.current) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    setContinuousStatus('listening')
    let gotResult = false
    const recog = new SR()
    recog.lang = aiLangRef.current
    recog.continuous = false
    recog.interimResults = false
    recog.onresult = (e: any) => {
      gotResult = true
      const t = e.results[0]?.[0]?.transcript?.trim() || ''
      // Stop keywords in multiple languages
      const stopWords = ['stop', 'रुको', 'बंद करो', 'நிறுத்து', 'ఆపు', 'ನಿಲ್ಲಿಸು', 'നിർത്തൂ', 'বন্ধ করো', 'ਰੁਕੋ', 'બંધ કરો']
      if (stopWords.some(w => t.toLowerCase().includes(w.toLowerCase()))) {
        stopContinuousConversation()
        return
      }
      if (t) sendAiMessage(t, true)
    }
    recog.onerror = () => {
      setIsListening(false)
      // Restart on error if still in continuous mode
      if (continuousModeRef.current) setTimeout(() => startContinuousListening(), 800)
    }
    recog.onend = () => {
      setIsListening(false)
      // If timed out without speech, restart immediately
      if (!gotResult && continuousModeRef.current) setTimeout(() => startContinuousListening(), 400)
    }
    recognitionRef.current = recog
    recog.start()
    setIsListening(true)
  }

  function startContinuousConversation() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice conversation requires Chrome or Edge browser.'); return }
    continuousModeRef.current = true
    setContinuousMode(true)
    stopSpeaking()
    startContinuousListening()
  }

  function stopContinuousConversation() {
    continuousModeRef.current = false
    setContinuousMode(false)
    setContinuousStatus('idle')
    recognitionRef.current?.stop()
    stopSpeaking()
    setIsListening(false)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const visits = sessions.filter(s => s.action === 'visit').length
  const itineraries = sessions.filter(s => s.action === 'itinerary_generated').length
  const bookingEvents = sessions.filter(s => s.action === 'booking_submitted').length
  const convRate = visits > 0 ? Math.round((bookingEvents / visits) * 100) : 0
  const confirmedBks = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
  const totalRevenue = confirmedBks.reduce((s, b) => s + (b.bookingValue || 0), 0)
  const pendingQuots = quotations.filter(q => q.status === 'pending' || q.status === 'in_discussion').length

  // Customers derived from bookings
  const customerMap = new Map<string, { name: string; email: string; phone?: string; bookings: Booking[] }>()
  bookings.forEach(b => {
    const k = b.customerEmail
    if (!customerMap.has(k)) customerMap.set(k, { name: b.customerName, email: b.customerEmail, phone: b.customerPhone, bookings: [] })
    customerMap.get(k)!.bookings.push(b)
  })
  const customers = Array.from(customerMap.values())

  // Monthly bookings for mini chart (last 6 months)
  const monthlyMap: Record<string, number> = {}
  bookings.forEach(b => {
    if (!b.createdAt) return
    const d = new Date(b.createdAt.seconds * 1000)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[k] = (monthlyMap[k] || 0) + 1
  })
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { label: d.toLocaleDateString('en-IN', { month: 'short' }), count: monthlyMap[k] || 0 }
  })
  const maxMonthly = Math.max(...last6.map(m => m.count), 1)

  const plannerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tailored-travel/${parentAgentSlug}?subAgent=${currentUser?.uid}`
    : `/tailored-travel/${parentAgentSlug}`

  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'planner',   label: 'AI Planner', icon: Sparkles },
    { id: 'home',      label: 'Home',       icon: Home },
    { id: 'bookings',  label: 'Bookings',   icon: BookOpen,     badge: bookings.filter(b => b.status === 'new').length || undefined },
    { id: 'packages',  label: 'Packages',   icon: Package },
    { id: 'quotations',    label: 'Quotations',   icon: MessageSquare, badge: pendingQuots || undefined },
    { id: 'quote_history', label: 'Quote History', icon: BarChart3 },
    { id: 'customers', label: 'Customers',  icon: Users },
    { id: 'stats',     label: 'My Stats',   icon: BarChart3 },
    { id: 'activity',  label: 'Activity',   icon: Activity },
    { id: 'ai',        label: 'AI',         icon: Bot },
  ]

  // Filtered bookings
  const filteredBooks = bookings.filter(b => {
    const matchSearch = !bookSearch || b.customerName.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.packageTitle.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.destination.toLowerCase().includes(bookSearch.toLowerCase())
    const matchStatus = bookFilter === 'all' || b.status === bookFilter
    return matchSearch && matchStatus
  })

  // Filtered packages
  const filteredPkgs = packages.filter(p => {
    const q = pkgSearch.toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.destination.toLowerCase().includes(q)
    const matchDest = pkgDestFilter === 'all' || p.destination === pkgDestFilter
    const matchStar = pkgStarFilter === 'all' || p.starCategory === pkgStarFilter
    const matchType = pkgTypeFilter === 'all' || p.travelType === pkgTypeFilter
    return matchSearch && matchDest && matchStar && matchType
  })

  // Filtered quotations
  const filteredQuots = quotations.filter(q => {
    const matchStatus = quotFilter === 'all' || q.status === quotFilter
    const qs = quotSearch.toLowerCase()
    const matchSearch = !qs || q.customerName.toLowerCase().includes(qs) || q.packageTitle.toLowerCase().includes(qs) || q.destination.toLowerCase().includes(qs)
    return matchStatus && matchSearch
  })

  // Filtered customers
  const filteredCustomers = (() => {
    const cs = custSearch.toLowerCase()
    return customers.filter(c => !cs || c.name.toLowerCase().includes(cs) || c.email.toLowerCase().includes(cs) || (c.phone || '').includes(cs))
  })()

  return (
    <div className="min-h-screen bg-gray-50 flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-60 bg-white border-r border-gray-100 flex-col hidden md:flex flex-shrink-0">
        {/* Profile */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg mb-2 flex-shrink-0">
            {subAgentName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <p className="font-bold text-gray-900 text-sm leading-tight">{subAgentName || 'Travel Agent'}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{currentUser?.email}</p>
          <span className="mt-1.5 inline-block bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">Travel Agent</span>
        </div>

        {/* Planner link */}
        <div className="mx-3 mt-3 mb-1 bg-primary/5 border border-primary/20 rounded-xl p-3">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">My Planner Link</p>
          <p className="text-[11px] text-gray-500 font-mono break-all leading-relaxed">/tailored-travel/{parentAgentSlug}</p>
          <div className="flex gap-3 mt-2">
            <button onClick={copyPlannerUrl} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
              {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
            </button>
            <a href={plannerUrl} target="_blank" className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
              <ExternalLink className="w-3 h-3" />Open
            </a>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                tab === t.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}>
              <t.icon className="w-4 h-4 flex-shrink-0" />
              {t.label}
              {t.badge ? (
                <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
          <button onClick={() => logout().then(() => router.push('/agent-login'))}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          <div>
            <h1 className="font-bold text-gray-900">
              {TABS.find(t => t.id === tab)?.label || 'Dashboard'}
            </h1>
            <p className="text-xs text-gray-400">Travel Agent Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && parentAgentId && parentAgentSlug && (
              <SubAgentDemoLoader
                subAgentId={currentUser.uid}
                subAgentName={subAgentName || 'Travel Agent'}
                parentAgentId={parentAgentId}
                parentAgentSlug={parentAgentSlug}
                onDone={fetchAll}
              />
            )}
            <a href={plannerUrl} target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10">
              <ExternalLink className="w-3.5 h-3.5" />My Planner
            </a>
            <button onClick={() => logout().then(() => router.push('/agent-login'))} className="md:hidden text-gray-400 hover:text-gray-700">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 pb-24 md:pb-6">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>

            {/* ══════════════════════ AI PLANNER ═══════════════════════════ */}
            {tab === 'planner' && (
              <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div>
                    <h2 className="font-bold text-gray-900">AI Travel Planner</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Use the planner directly — your bookings will be tracked to your account</p>
                  </div>
                  <a
                    href={plannerUrl}
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />Open in new tab
                  </a>
                </div>
                {/* Iframe */}
                <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                  <iframe
                    key={parentAgentSlug}
                    src={`/tailored-travel/${parentAgentSlug}?embed=1&subAgent=${currentUser?.uid}`}
                    className="w-full h-full"
                    allow="microphone; camera"
                    title="AI Travel Planner"
                  />
                </div>
              </div>
            )}

            {/* ══════════════════════ HOME ══════════════════════════════════ */}
            {tab === 'home' && (
              <div className="space-y-6">
                {/* Greeting */}
                <div className="bg-gradient-to-br from-primary/90 to-primary rounded-2xl p-5 text-white">
                  <p className="text-sm opacity-80 mb-0.5">Welcome back,</p>
                  <h2 className="text-xl font-bold">{subAgentName || 'Travel Agent'} 👋</h2>
                  <p className="text-sm opacity-70 mt-1">Here's your performance snapshot</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {[
                      { label: 'My Bookings', value: bookings.length, icon: BookOpen },
                      { label: 'Revenue (confirmed)', value: `₹${(totalRevenue / 1000).toFixed(0)}K`, icon: IndianRupee },
                      { label: 'Open Quotations', value: pendingQuots, icon: MessageSquare },
                      { label: 'Planner Visits', value: visits, icon: Eye },
                    ].map(s => (
                      <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold">{s.value}</p>
                        <p className="text-[11px] opacity-75 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Recent bookings */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900">Recent Bookings</h3>
                      <button onClick={() => setTab('bookings')} className="text-xs text-primary font-semibold hover:underline">View all →</button>
                    </div>
                    {bookings.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No bookings yet. Share your planner link to get started.</p>
                    ) : (
                      <div className="space-y-2">
                        {bookings.slice(0, 4).map(b => {
                          const s = BOOKING_STATUS[b.status] || BOOKING_STATUS.new
                          return (
                            <div key={b.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{b.customerName}</p>
                                <p className="text-xs text-gray-500 truncate">{b.packageTitle} · {fmt(b.createdAt)}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                {b.bookingValue ? <p className="text-sm font-bold text-gray-900">₹{(b.bookingValue / 1000).toFixed(0)}K</p> : null}
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quick panel */}
                  <div className="space-y-3">
                    {/* Planner link card */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <p className="font-bold text-gray-900 text-sm mb-1">My Planner Link</p>
                      <p className="text-xs text-gray-500 mb-2">Share this link to track bookings from your clients</p>
                      <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 break-all mb-2">/tailored-travel/{parentAgentSlug}</div>
                      <div className="flex gap-2">
                        <button onClick={copyPlannerUrl} className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 text-primary font-semibold text-xs py-2 rounded-xl hover:bg-primary/20">
                          {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                        </button>
                        <a href={plannerUrl} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white font-semibold text-xs py-2 rounded-xl hover:bg-primary/90">
                          <ExternalLink className="w-3.5 h-3.5" />Open
                        </a>
                      </div>
                    </div>

                    {/* Active quotations */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-gray-900 text-sm">Active Quotations</p>
                        <button onClick={() => setTab('quotations')} className="text-xs text-primary font-semibold hover:underline">View →</button>
                      </div>
                      {quotations.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2 text-center">No quotations yet</p>
                      ) : (
                        <div className="space-y-2">
                          {quotations.filter(q => ['pending', 'in_discussion', 'quoted'].includes(q.status)).slice(0, 3).map(q => {
                            const sc = QUOT_STATUS[q.status]
                            return (
                              <button key={q.id} onClick={() => { setSelQuot(q); setTab('quotations') }}
                                className="w-full text-left flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl hover:bg-primary/5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-900 truncate">{q.customerName}</p>
                                  <p className="text-[11px] text-gray-500 truncate">{q.packageTitle}</p>
                                </div>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${sc?.color}`}>{sc?.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick stats */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <p className="font-bold text-gray-900 text-sm mb-3">Funnel</p>
                      {[
                        { label: 'Planner visits', value: visits, color: 'bg-blue-500' },
                        { label: 'Itineraries generated', value: itineraries, color: 'bg-purple-500' },
                        { label: 'Bookings submitted', value: bookingEvents, color: 'bg-green-500' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`} />
                          <span className="text-xs text-gray-600 flex-1">{s.label}</span>
                          <span className="text-sm font-bold text-gray-900">{s.value}</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs">
                        <span className="text-gray-500">Conversion rate</span>
                        <span className="font-bold text-primary">{convRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════ BOOKINGS ══════════════════════════════ */}
            {tab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                      placeholder="Search customer, package, destination…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {['all', 'new', 'contacted', 'confirmed', 'completed'].map(s => (
                      <button key={s} onClick={() => setBookFilter(s)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors ${bookFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s === 'all' ? `All (${bookings.length})` : `${s} (${bookings.filter(b => b.status === s).length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredBooks.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No bookings found. Share your planner link to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBooks.map(b => {
                      const s = BOOKING_STATUS[b.status] || BOOKING_STATUS.new
                      const expanded = expandedBook === b.id
                      return (
                        <div key={b.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                          <button className="w-full text-left p-5" onClick={() => setExpandedBook(expanded ? null : b.id)}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-bold text-gray-900">{b.customerName}</p>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                                </div>
                                <p className="text-sm text-gray-600">{b.packageTitle}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.destination}</span>
                                  {b.preferredDates && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.preferredDates}</span>}
                                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.groupSize} guests</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {b.bookingValue ? (
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">₹{b.bookingValue.toLocaleString('en-IN')}</p>
                                    <p className="text-xs text-gray-400">booking value</p>
                                  </div>
                                ) : null}
                                {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                            </div>
                          </button>
                          {expanded && (
                            <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                              <div><p className="text-xs text-gray-400 mb-0.5">Email</p>
                                <a href={`mailto:${b.customerEmail}`} className="text-primary font-medium hover:underline text-xs">{b.customerEmail}</a>
                              </div>
                              {b.customerPhone && <div><p className="text-xs text-gray-400 mb-0.5">Phone</p>
                                <a href={`https://wa.me/${b.customerPhone.replace(/\D/g,'')}`} target="_blank" className="text-green-600 font-medium hover:underline text-xs">{b.customerPhone}</a>
                              </div>}
                              <div><p className="text-xs text-gray-400 mb-0.5">Group</p><p className="font-medium text-xs">{b.adults} adults{b.kids ? `, ${b.kids} kids` : ''}</p></div>
                              <div><p className="text-xs text-gray-400 mb-0.5">Submitted</p><p className="font-medium text-xs">{fmt(b.createdAt)}</p></div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════ PACKAGES ══════════════════════════════ */}
            {tab === 'packages' && (
              <div className="space-y-4">
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={pkgSearch} onChange={e => setPkgSearch(e.target.value)}
                      placeholder="Search packages, destinations…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  {/* Destination */}
                  {Array.from(new Set(packages.map(p => p.destination))).length > 1 && (
                    <select value={pkgDestFilter} onChange={e => setPkgDestFilter(e.target.value)}
                      className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                      <option value="all">All Destinations</option>
                      {Array.from(new Set(packages.map(p => p.destination))).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                  {/* Star Category */}
                  {Array.from(new Set(packages.map(p => p.starCategory))).length > 1 && (
                    <select value={pkgStarFilter} onChange={e => setPkgStarFilter(e.target.value)}
                      className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                      <option value="all">All Stars</option>
                      {Array.from(new Set(packages.map(p => p.starCategory))).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {/* Travel Type */}
                  {Array.from(new Set(packages.map(p => p.travelType))).length > 1 && (
                    <select value={pkgTypeFilter} onChange={e => setPkgTypeFilter(e.target.value)}
                      className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                      <option value="all">All Types</option>
                      {Array.from(new Set(packages.map(p => p.travelType))).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                  {(pkgSearch || pkgDestFilter !== 'all' || pkgStarFilter !== 'all' || pkgTypeFilter !== 'all') && (
                    <button onClick={() => { setPkgSearch(''); setPkgDestFilter('all'); setPkgStarFilter('all'); setPkgTypeFilter('all') }}
                      className="text-xs text-gray-400 hover:text-red-500 font-medium px-2 py-1">Clear</button>
                  )}
                </div>
                <p className="text-sm text-gray-500">{filteredPkgs.length} of {packages.filter(p => p.isActive).length} active package{packages.filter(p => p.isActive).length !== 1 ? 's' : ''} available to share</p>

                {filteredPkgs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No packages available yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredPkgs.map(pkg => {
                      const plannerUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/tailored-travel/${parentAgentSlug}?subAgent=${currentUser?.uid}`
                      const isCopied = copiedPkgId === pkg.id
                      function copyLink() {
                        navigator.clipboard.writeText(plannerUrl)
                        setCopiedPkgId(pkg.id)
                        setTimeout(() => setCopiedPkgId(null), 2000)
                      }
                      function shareWhatsApp() {
                        const msg = buildPackageWhatsAppMessage(pkg)
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                      }
                      return (
                        <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                          <div className="relative">
                            {pkg.primaryImageUrl ? (
                              <img src={pkg.primaryImageUrl} alt={pkg.title} className="w-full h-40 object-cover" />
                            ) : (
                              <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                <Package className="w-10 h-10 text-primary/30" />
                              </div>
                            )}
                            {/* Duration badge */}
                            <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                              {pkg.durationDays}D / {pkg.durationNights}N
                            </span>
                            {/* Travel type badge */}
                            <span className="absolute top-2 right-2 bg-white/90 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              {pkg.travelType}
                            </span>
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 text-sm leading-snug">{pkg.title}</h3>
                              <span className="flex-shrink-0 flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                                <Star className="w-3 h-3 fill-amber-400" />{pkg.starCategory}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                              <MapPin className="w-3 h-3 flex-shrink-0" />{pkg.destination}
                            </p>
                            {pkg.overview && (
                              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">{pkg.overview}</p>
                            )}
                            <p className="text-lg font-bold text-primary mt-auto mb-3">
                              ₹{pkg.pricePerPerson.toLocaleString('en-IN')}
                              <span className="text-xs font-normal text-gray-400">/person</span>
                            </p>
                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setViewPkgDetail(pkg)}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gray-900 text-white py-2 rounded-xl hover:bg-gray-700 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />View
                              </button>
                              <button
                                onClick={shareWhatsApp}
                                className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-500 text-white px-3 py-2 rounded-xl hover:bg-green-600 transition-colors"
                                title="Share on WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={copyLink}
                                className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${isCopied ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                title="Copy planner link"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════ QUOTATIONS ════════════════════════════ */}
            {tab === 'quotations' && (
              <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
                {/* List */}
                <div className="w-72 flex-shrink-0 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-bold text-gray-900 text-sm">My Quotations</p>
                    <p className="text-xs text-gray-400 mt-0.5">{filteredQuots.length} of {quotations.length}</p>
                  </div>
                  {/* Search */}
                  <div className="px-3 pt-2 pb-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input value={quotSearch} onChange={e => setQuotSearch(e.target.value)}
                        placeholder="Search customer, package…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div className="px-3 pb-1 flex gap-1 flex-wrap">
                    {['all', 'pending', 'in_discussion', 'quoted', 'accepted'].map(s => (
                      <button key={s} onClick={() => setQuotFilter(s)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${quotFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s === 'all' ? `All (${quotations.length})` :
                         s === 'in_discussion' ? `Chat (${quotations.filter(q => q.status === s).length})` :
                         `${s} (${quotations.filter(q => q.status === s).length})`}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {filteredQuots.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No quotations</p>
                      </div>
                    ) : filteredQuots.map(q => {
                      const sc = QUOT_STATUS[q.status]
                      return (
                        <div
                          key={q.id}
                          onClick={() => setSelQuot(q)}
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${selQuot?.id === q.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                        >
                          {/* Row 1: name + status */}
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{q.customerName}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${sc?.color}`}>{sc?.label}</span>
                          </div>
                          {/* Row 2: package title */}
                          <p className="text-xs text-gray-500 truncate">{q.packageTitle}</p>
                          {/* Row 3: price/msgs + View button */}
                          <div className="flex items-center justify-between mt-1.5">
                            {q.quotedPrice ? (
                              <span className={`text-xs font-bold ${q.status === 'converted' ? 'text-purple-700' : 'text-emerald-700'}`}>
                                ₹{Number(q.quotedPrice).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              q.messages.length > 0
                                ? <span className="text-[10px] text-gray-400">{q.messages.length} msg{q.messages.length !== 1 ? 's' : ''}</span>
                                : <span />
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); openPackageView(q) }}
                              className="flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors"
                              title="View & edit package details"
                            >
                              <Eye className="w-3 h-3" />View
                            </button>
                          </div>
                          {/* My Version badge */}
                          {q.customPackageData && (
                            <span className="mt-1 inline-block text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">My Version</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Chat */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {!selQuot ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-gray-500 font-medium">Select a quotation</p>
                      <p className="text-xs text-gray-400 mt-1">Click a quotation on the left to view the conversation</p>
                    </div>
                  ) : (
                    <>
                      <div className="px-5 py-4 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900">{selQuot.customerName}</h3>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${QUOT_STATUS[selQuot.status]?.color}`}>
                                {QUOT_STATUS[selQuot.status]?.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{selQuot.packageTitle} · {selQuot.destination}</p>
                            <div className="flex gap-3 mt-2">
                              {selQuot.customerEmail && <a href={`mailto:${selQuot.customerEmail}`} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"><Mail className="w-3 h-3" />Email</a>}
                              {selQuot.customerPhone && <a href={`https://wa.me/${selQuot.customerPhone.replace(/\D/g,'')}`} target="_blank" className="text-xs text-green-600 font-semibold hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />WhatsApp</a>}
                              <button
                                onClick={() => shareQuotationWhatsApp(selQuot)}
                                className="flex items-center gap-1 text-xs bg-green-500 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-green-600 transition-colors"
                                title="Share quotation on WhatsApp"
                              >
                                <Share2 className="w-3 h-3" />Share Quote
                              </button>
                              <button
                                onClick={() => setPdfQuot(selQuot)}
                                className="flex items-center gap-1 text-xs bg-primary text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-primary/90 transition-colors"
                                title="Generate printable quotation"
                              >
                                <FileText className="w-3 h-3" />PDF
                              </button>
                            </div>
                          </div>
                          {selQuot.quotedPrice && (
                            <div className={`text-right flex-shrink-0 px-4 py-2 rounded-xl border ${selQuot.status === 'converted' ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200'}`}>
                              <p className={`text-xs font-medium ${selQuot.status === 'converted' ? 'text-purple-500' : 'text-emerald-500'}`}>
                                {selQuot.status === 'converted' ? 'Booked at' : 'Quoted'}
                              </p>
                              <p className={`text-xl font-bold ${selQuot.status === 'converted' ? 'text-purple-700' : 'text-emerald-700'}`}>
                                ₹{Number(selQuot.quotedPrice).toLocaleString('en-IN')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                        {selQuot.messages.length === 0 ? (
                          <p className="text-center text-xs text-gray-400 py-8">No messages yet. Start the conversation.</p>
                        ) : selQuot.messages.map(msg => {
                          // System / price / booking messages → centered pill
                          if (msg.senderRole === 'system' || msg.text.startsWith('💰') || msg.text.startsWith('✅')) {
                            return (
                              <div key={msg.id} className="flex justify-center">
                                <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full">
                                  {msg.text}
                                </span>
                              </div>
                            )
                          }
                          const isMe = msg.senderRole === 'travel_agent' || msg.senderRole === 'subagent'
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'}`}>
                                {!isMe && <p className="text-[10px] font-bold mb-1 opacity-60">{msg.senderName}</p>}
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                                  {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {['accepted', 'rejected', 'converted'].includes(selQuot.status) ? (
                        <div className={`px-5 py-3 border-t border-gray-100 text-center text-xs flex-shrink-0 ${
                          selQuot.status === 'converted' ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-400'
                        }`}>
                          {selQuot.status === 'converted'
                            ? '✅ This quotation has been converted to a booking. Check your Bookings tab.'
                            : selQuot.status === 'accepted'
                            ? '✅ Quotation accepted — awaiting booking confirmation.'
                            : '❌ This quotation was rejected.'}
                        </div>
                      ) : (
                        <div className="px-4 py-3 border-t border-gray-100 flex items-end gap-2">
                          <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                            rows={2} placeholder="Type a message… (Enter to send)"
                            className="flex-1 resize-none px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          <button onClick={sendMessage} disabled={!msgText.trim() || sendingMsg}
                            className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 flex-shrink-0">
                            {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════ QUOTE HISTORY ══════════════════════════ */}
            {tab === 'quote_history' && currentUser && parentAgentId && (
              <QuotationHistory agentId={parentAgentId} subAgentId={currentUser.uid} />
            )}

            {/* ══════════════════════ CUSTOMERS ══════════════════════════════ */}
            {tab === 'customers' && (
              <div className="space-y-4">
                {customers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={custSearch} onChange={e => setCustSearch(e.target.value)}
                        placeholder="Search by name, email, phone…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <span className="text-sm text-gray-500">{filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {customers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No customers yet. Customers appear automatically from your bookings.</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No customers match your search.</p>
                    <button onClick={() => setCustSearch('')} className="mt-2 text-xs text-primary font-semibold hover:underline">Clear search</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCustomers.map(c => {
                      const spend = c.bookings.reduce((s, b) => s + (b.bookingValue || 0), 0)
                      const confirmedCount = c.bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
                      return (
                        <div key={c.email} className="bg-white rounded-2xl border border-gray-200 p-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-bold text-gray-900">{c.name}</p>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                                <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="w-3 h-3" />{c.email}</a>
                                {c.phone && <a href={`https://wa.me/${c.phone.replace(/\D/g,'')}`} target="_blank" className="flex items-center gap-1 text-green-600 hover:underline"><Phone className="w-3 h-3" />{c.phone}</a>}
                              </div>
                            </div>
                            <div className="flex gap-4 text-center flex-shrink-0">
                              <div><p className="text-lg font-bold text-gray-900">{c.bookings.length}</p><p className="text-xs text-gray-400">trips</p></div>
                              {spend > 0 && <div><p className="text-lg font-bold text-gray-900">₹{(spend / 1000).toFixed(0)}K</p><p className="text-xs text-gray-400">spend</p></div>}
                              <div><p className="text-lg font-bold text-gray-900">{confirmedCount}</p><p className="text-xs text-gray-400">confirmed</p></div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {c.bookings.map(b => {
                              const s = BOOKING_STATUS[b.status] || BOOKING_STATUS.new
                              return (
                                <span key={b.id} className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>
                                  {b.packageTitle.split('—')[0].trim()} · {s.label}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════ STATS ════════════════════════════════ */}
            {tab === 'stats' && (
              <div className="space-y-5">
                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Bookings',    value: bookings.length,       icon: BookOpen,     color: 'bg-blue-100 text-blue-600' },
                    { label: 'Confirmed Revenue', value: `₹${(totalRevenue/1000).toFixed(0)}K`, icon: IndianRupee, color: 'bg-green-100 text-green-600' },
                    { label: 'Planner Visits',    value: visits,                icon: Eye,          color: 'bg-purple-100 text-purple-600' },
                    { label: 'Conversion Rate',   value: `${convRate}%`,        icon: TrendingUp,   color: 'bg-amber-100 text-amber-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div><p className="text-xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Monthly bookings chart */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4">Monthly Bookings</h3>
                    <div className="flex items-end gap-3 h-32">
                      {last6.map(m => (
                        <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-gray-700">{m.count || ''}</span>
                          <div className="w-full bg-primary/20 rounded-t-lg relative" style={{ height: `${Math.max((m.count / maxMonthly) * 100, m.count > 0 ? 8 : 0)}%`, minHeight: m.count > 0 ? '8px' : '0' }}>
                            <div className="absolute inset-0 bg-primary rounded-t-lg" />
                          </div>
                          <span className="text-[10px] text-gray-400">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Funnel */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4">Planner Funnel</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Planner Visits', value: visits, max: visits, color: 'bg-blue-500' },
                        { label: 'Itineraries Generated', value: itineraries, max: visits, color: 'bg-purple-500' },
                        { label: 'Bookings Submitted', value: bookingEvents, max: visits, color: 'bg-green-500' },
                      ].map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{s.label}</span>
                            <span className="font-bold text-gray-900">{s.value}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${s.color}`} style={{ width: s.max > 0 ? `${(s.value / s.max) * 100}%` : '0%' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-lg font-bold text-gray-900">{bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length}</p>
                        <p className="text-xs text-gray-500">Confirmed Bookings</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-lg font-bold text-gray-900">{customers.length}</p>
                        <p className="text-xs text-gray-500">Unique Customers</p>
                      </div>
                    </div>
                  </div>

                  {/* Status breakdown */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4">Booking Status Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(BOOKING_STATUS).map(([key, s]) => {
                        const count = bookings.filter(b => b.status === key).length
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                            <span className="text-sm text-gray-600 flex-1">{s.label}</span>
                            <span className="text-sm font-bold text-gray-900">{count}</span>
                            <div className="w-24 bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${s.dot}`} style={{ width: bookings.length > 0 ? `${(count / bookings.length) * 100}%` : '0%' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Destinations */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4">Top Destinations</h3>
                    {(() => {
                      const destMap: Record<string, number> = {}
                      bookings.forEach(b => { destMap[b.destination] = (destMap[b.destination] || 0) + 1 })
                      const top = Object.entries(destMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
                      const max = top[0]?.[1] || 1
                      return top.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
                      ) : (
                        <div className="space-y-3">
                          {top.map(([dest, count]) => (
                            <div key={dest}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-700 font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{dest}</span>
                                <span className="font-bold text-gray-900">{count} booking{count !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="h-2 rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════ AI ASSISTANT ══════════════════════════ */}
            {tab === 'ai' && (
              <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 180px)' }}>
                {/* Controls row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Package picker trigger */}
                  <button
                    onClick={() => { setPkgPickerSearch(''); setPkgPickerOpen(true) }}
                    className={`flex-1 min-w-[220px] flex items-center gap-3 px-3 py-2 rounded-xl border text-sm transition-colors text-left ${
                      selectedAiPkg
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-gray-200 bg-white hover:border-primary/30 hover:bg-gray-50'
                    }`}
                  >
                    {selectedAiPkg ? (
                      <>
                        {selectedAiPkg.primaryImageUrl ? (
                          <img src={selectedAiPkg.primaryImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-xs truncate">{selectedAiPkg.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">{selectedAiPkg.destination} · {selectedAiPkg.durationNights}N {selectedAiPkg.durationDays}D</p>
                        </div>
                        <span className="text-xs font-bold text-primary flex-shrink-0">₹{(selectedAiPkg.pricePerPerson/1000).toFixed(0)}K</span>
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedAiPkg(null) }}
                          className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                        <span className="text-gray-400 flex-1">Choose a package…</span>
                        <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </>
                    )}
                  </button>

                  {/* Language selector */}
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={aiLang}
                      onChange={e => setAiLang(e.target.value)}
                      className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white appearance-none"
                    >
                      {INDIAN_LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Voice conversation toggle */}
                  <button
                    onClick={continuousMode ? stopContinuousConversation : startContinuousConversation}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                      continuousMode
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90 shadow-sm shadow-primary/30'
                    }`}
                  >
                    {continuousMode
                      ? <><MicOff className="w-4 h-4" /> End Chat</>
                      : <><Mic className="w-4 h-4" /> Voice Chat</>
                    }
                  </button>

                  {/* Clear chat */}
                  {aiMessages.length > 0 && (
                    <button
                      onClick={() => { setAiMessages([]); stopSpeaking() }}
                      className="text-xs text-gray-400 hover:text-red-500 font-medium px-3 py-2 rounded-xl border border-gray-200 hover:border-red-200 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Package picker modal */}
                {pkgPickerOpen && (
                  <>
                    <motion.div
                      className="fixed inset-0 bg-black/40 z-50"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setPkgPickerOpen(false)}
                    />
                    <motion.div
                      className="fixed inset-0 z-50 flex items-center justify-center p-4"
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                          <div>
                            <h3 className="font-bold text-gray-900">Choose a Package</h3>
                            <p className="text-xs text-gray-400 mt-0.5">AI will answer questions about the selected package</p>
                          </div>
                          <button onClick={() => setPkgPickerOpen(false)} className="text-gray-400 hover:text-gray-700 p-1">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                        {/* Search */}
                        <div className="px-5 pt-3 pb-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              autoFocus
                              value={pkgPickerSearch}
                              onChange={e => setPkgPickerSearch(e.target.value)}
                              placeholder="Search packages or destinations…"
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                        </div>
                        {/* Package grid */}
                        <div className="flex-1 overflow-y-auto px-5 pb-5">
                          {packages.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-sm">No packages available</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                              {packages
                                .filter(p => !pkgPickerSearch || p.title.toLowerCase().includes(pkgPickerSearch.toLowerCase()) || p.destination.toLowerCase().includes(pkgPickerSearch.toLowerCase()))
                                .map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => { setSelectedAiPkg(p); setPkgPickerOpen(false) }}
                                    className={`text-left rounded-2xl border overflow-hidden transition-all hover:shadow-md group ${
                                      selectedAiPkg?.id === p.id
                                        ? 'border-primary ring-2 ring-primary/20'
                                        : 'border-gray-200 hover:border-primary/40'
                                    }`}
                                  >
                                    {/* Image */}
                                    <div className="relative h-32 w-full bg-gray-100 overflow-hidden">
                                      {p.primaryImageUrl ? (
                                        <img src={p.primaryImageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Package className="w-8 h-8 text-gray-300" />
                                        </div>
                                      )}
                                      {/* Duration badge */}
                                      <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
                                        {p.durationNights}N {p.durationDays}D
                                      </span>
                                      {/* Selected check */}
                                      {selectedAiPkg?.id === p.id && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                          <Check className="w-3 h-3 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    {/* Info */}
                                    <div className="p-3">
                                      <p className="font-bold text-gray-900 text-sm leading-snug truncate">{p.title}</p>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.destination}</span>
                                        <span className="flex items-center gap-0.5 ml-auto text-amber-500 font-semibold">
                                          <Star className="w-3 h-3 fill-amber-400" />{p.starCategory}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.travelType}</span>
                                        <span className="font-bold text-primary text-sm">₹{p.pricePerPerson.toLocaleString('en-IN')}<span className="text-[10px] font-normal text-gray-400">/person</span></span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Chat area */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {aiMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-8 px-4">
                        {!selectedAiPkg ? (
                          /* ── No package selected ── */
                          <div className="w-full max-w-lg">
                            <div className="text-center mb-6">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
                                <Bot className="w-6 h-6 text-white" />
                              </div>
                              <h3 className="font-bold text-gray-900 text-base">AI Travel Assistant</h3>
                              <p className="text-sm text-gray-400 mt-1">Pick a package below to start asking questions in any Indian language</p>
                            </div>

                            {/* Mini package cards */}
                            <div className="space-y-2">
                              {packages.slice(0, 4).map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => setSelectedAiPkg(p)}
                                  className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 hover:border-primary/40 hover:bg-primary/5 rounded-2xl transition-all group text-left"
                                >
                                  {p.primaryImageUrl ? (
                                    <img src={p.primaryImageUrl} alt={p.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <Package className="w-5 h-5 text-gray-300" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{p.title}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3" />{p.destination}
                                      <span className="mx-1 text-gray-300">·</span>
                                      <Clock className="w-3 h-3" />{p.durationNights}N {p.durationDays}D
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-primary">₹{(p.pricePerPerson/1000).toFixed(0)}K</p>
                                    <p className="text-[10px] text-gray-400">/person</p>
                                  </div>
                                  <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-primary flex-shrink-0 transition-colors" />
                                </button>
                              ))}
                            </div>

                            {packages.length > 4 && (
                              <button
                                onClick={() => { setPkgPickerSearch(''); setPkgPickerOpen(true) }}
                                className="w-full mt-3 py-2.5 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors border border-primary/20"
                              >
                                Browse all {packages.length} packages →
                              </button>
                            )}
                          </div>
                        ) : (
                          /* ── Package selected, no messages yet ── */
                          <div className="w-full max-w-lg">
                            {/* Package hero card */}
                            <div className="rounded-2xl border border-gray-200 overflow-hidden mb-5 shadow-sm">
                              {selectedAiPkg.primaryImageUrl ? (
                                <div className="relative h-36">
                                  <img src={selectedAiPkg.primaryImageUrl} alt={selectedAiPkg.title} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                  <div className="absolute bottom-3 left-3 right-3">
                                    <p className="font-bold text-white text-sm leading-snug">{selectedAiPkg.title}</p>
                                    <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3" />{selectedAiPkg.destination}
                                      <span className="mx-1 opacity-50">·</span>
                                      {selectedAiPkg.durationNights}N {selectedAiPkg.durationDays}D
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gradient-to-br from-primary/20 to-primary/5 px-4 py-5">
                                  <p className="font-bold text-gray-900 text-sm">{selectedAiPkg.title}</p>
                                  <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />{selectedAiPkg.destination} · {selectedAiPkg.durationNights}N {selectedAiPkg.durationDays}D
                                  </p>
                                </div>
                              )}
                              <div className="px-4 py-3 flex items-center gap-4 bg-white">
                                <div className="flex-1">
                                  <p className="text-xl font-bold text-primary">₹{selectedAiPkg.pricePerPerson.toLocaleString('en-IN')}</p>
                                  <p className="text-[11px] text-gray-400">per person</p>
                                </div>
                                <div className="flex gap-2 text-xs">
                                  <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{selectedAiPkg.travelType}</span>
                                  <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full flex items-center gap-0.5">
                                    <Star className="w-3 h-3 fill-amber-400" />{selectedAiPkg.starCategory}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Prompt suggestions */}
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Ask me anything</p>
                              <button
                                onClick={startContinuousConversation}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl shadow-sm shadow-primary/30 hover:opacity-90"
                              >
                                <Mic className="w-3.5 h-3.5" /> Start Voice Chat
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { emoji: '✨', text: 'इस पैकेज की खास बात क्या है?', sub: 'Highlights' },
                                { emoji: '💼', text: 'इसे customer को कैसे बेचें?', sub: 'Sales pitch' },
                                { emoji: '📋', text: 'What is included in this package?', sub: 'Inclusions' },
                                { emoji: '🗣️', text: 'இந்த package பற்றி சொல்லுங்கள்', sub: 'Tamil' },
                              ].map(q => (
                                <button
                                  key={q.text}
                                  onClick={() => sendAiMessage(q.text)}
                                  className="flex items-start gap-2 p-3 bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/30 rounded-xl text-left transition-all group"
                                >
                                  <span className="text-base flex-shrink-0">{q.emoji}</span>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-500 group-hover:text-primary mb-0.5">{q.sub}</p>
                                    <p className="text-xs text-gray-400 leading-snug line-clamp-2">{q.text}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {aiMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                                <Bot className="w-3.5 h-3.5 text-primary" />
                              </div>
                            )}
                            <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 ${
                              msg.role === 'user'
                                ? 'bg-primary text-white rounded-br-sm'
                                : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                            {msg.role === 'assistant' && (
                              <button
                                onClick={() => speakText(msg.content)}
                                className="ml-2 mt-1 text-gray-300 hover:text-primary flex-shrink-0 self-start transition-colors"
                                title="Listen to this message"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {aiLoading && (
                          <div className="flex justify-start">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                              <Bot className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                              <div className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={aiChatEndRef} />
                      </>
                    )}
                  </div>

                  {/* Continuous conversation bar */}
                  {continuousMode ? (
                    <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3 bg-gradient-to-r from-primary/5 to-primary/10">
                      {/* Animated status */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          continuousStatus === 'listening' ? 'bg-red-500 animate-pulse' :
                          continuousStatus === 'thinking' ? 'bg-amber-400 animate-pulse' :
                          continuousStatus === 'speaking' ? 'bg-primary animate-pulse' : 'bg-gray-300'
                        }`}>
                          {continuousStatus === 'listening' && <Mic className="w-4 h-4 text-white" />}
                          {continuousStatus === 'thinking' && <Loader2 className="w-4 h-4 text-white animate-spin" />}
                          {continuousStatus === 'speaking' && <Volume2 className="w-4 h-4 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800">
                            {continuousStatus === 'listening' && 'Listening…'}
                            {continuousStatus === 'thinking' && 'Thinking…'}
                            {continuousStatus === 'speaking' && 'Speaking…'}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {continuousStatus === 'listening' && `Say anything in ${INDIAN_LANGUAGES.find(l => l.code === aiLang)?.label || 'Hindi'} · say "stop" to end`}
                            {continuousStatus === 'thinking' && 'Getting your answer…'}
                            {continuousStatus === 'speaking' && 'Will listen again when done speaking'}
                          </p>
                        </div>
                      </div>
                      {/* Sound bars visual */}
                      {continuousStatus === 'listening' && (
                        <div className="flex items-end gap-0.5 h-5 flex-shrink-0">
                          {[8, 14, 10, 16, 8, 12, 6].map((h, i) => (
                            <span key={i} className="w-1 bg-red-400 rounded-full animate-bounce"
                              style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }} />
                          ))}
                        </div>
                      )}
                      <button
                        onClick={stopContinuousConversation}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex-shrink-0 transition-colors"
                      >
                        <MicOff className="w-3.5 h-3.5" /> End
                      </button>
                    </div>
                  ) : null}

                  {/* Input row */}
                  <div className={`border-t border-gray-100 px-4 py-3 flex items-end gap-2 ${continuousMode ? 'opacity-40 pointer-events-none' : ''}`}>
                    <textarea
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage() } }}
                      rows={2}
                      placeholder={`Ask anything… (${INDIAN_LANGUAGES.find(l => l.code === aiLang)?.label || 'Hindi'})`}
                      className="flex-1 resize-none px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                      disabled={aiLoading}
                    />
                    {/* Mic */}
                    <button
                      onClick={toggleVoice}
                      title={isListening ? 'Stop listening' : 'Speak in ' + (INDIAN_LANGUAGES.find(l => l.code === aiLang)?.label || 'Hindi')}
                      className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-gray-100 text-gray-500 hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    {/* Audio toggle / Speaking stop */}
                    {isSpeaking ? (
                      <button
                        onClick={stopSpeaking}
                        title="Speaking — tap to stop"
                        className="p-2.5 rounded-xl flex-shrink-0 bg-amber-400 text-white animate-pulse"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setAutoSpeak(v => !v)}
                        title={autoSpeak ? 'Auto-speak ON — click to mute' : 'Auto-speak OFF — click to enable'}
                        className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                          autoSpeak
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                    {/* Send */}
                    <button
                      onClick={() => sendAiMessage()}
                      disabled={!aiInput.trim() || aiLoading}
                      className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 flex-shrink-0"
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════ ACTIVITY ══════════════════════════════ */}
            {tab === 'activity' && (
              <div className="space-y-4">
                {sessions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {['all', 'visit', 'itinerary_generated', 'booking_submitted'].map(a => {
                      const labels: Record<string, string> = { all: 'All', visit: 'Visits', itinerary_generated: 'Itineraries', booking_submitted: 'Bookings' }
                      const count = a === 'all' ? sessions.length : sessions.filter(s => s.action === a).length
                      return (
                        <button key={a} onClick={() => setActFilter(a)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${actFilter === a ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {labels[a]} ({count})
                        </button>
                      )
                    })}
                  </div>
                )}
                {(() => {
                  const filteredSessions = sessions.filter(s => actFilter === 'all' || s.action === actFilter)
                  return sessions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No activity recorded yet.</p>
                  </div>
                ) : (
                  <>
                  <p className="text-sm text-gray-500">{filteredSessions.length} event{filteredSessions.length !== 1 ? 's' : ''}{actFilter !== 'all' ? ' (filtered)' : ''}</p>
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
                    {filteredSessions.map(ev => {
                      const colors: Record<string, string> = {
                        visit: 'bg-blue-50 text-blue-700',
                        itinerary_generated: 'bg-purple-50 text-purple-700',
                        booking_submitted: 'bg-green-50 text-green-700',
                      }
                      const labels: Record<string, string> = {
                        visit: 'Visit',
                        itinerary_generated: 'Itinerary',
                        booking_submitted: 'Booking',
                      }
                      return (
                        <div key={ev.id} className="flex items-center gap-3 px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${colors[ev.action] || 'bg-gray-100 text-gray-600'}`}>
                            {labels[ev.action] || ev.action}
                          </span>
                          <div className="flex-1 min-w-0">
                            {ev.destination && <p className="text-xs text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.destination}</p>}
                            {ev.packageTitle && <p className="text-xs text-gray-400 flex items-center gap-1"><Package className="w-3 h-3" />{ev.packageTitle}</p>}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{fmtDT(ev.timestamp)}</span>
                        </div>
                      )
                    })}
                  </div>
                  </>
                )
                })()}
              </div>
            )}

          </motion.div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex md:hidden">
        {TABS.slice(0, 5).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative ${tab === t.id ? 'text-primary' : 'text-gray-500'}`}>
            <t.icon className="w-5 h-5" />
            {t.label}
            {t.badge ? (
              <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Package Detail View Modal ─────────────────────────────────────────── */}
      {viewPkgDetail && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4" onClick={() => setViewPkgDetail(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Cover image */}
            {viewPkgDetail.primaryImageUrl ? (
              <div className="relative h-52">
                <img src={viewPkgDetail.primaryImageUrl} alt={viewPkgDetail.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <button onClick={() => setViewPkgDetail(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-4 left-5 right-5">
                  <h2 className="font-bold text-white text-xl leading-tight">{viewPkgDetail.title}</h2>
                  <p className="text-white/80 text-sm mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{viewPkgDetail.destination}{viewPkgDetail.destinationCountry ? `, ${viewPkgDetail.destinationCountry}` : ''}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{viewPkgDetail.title}</h2>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{viewPkgDetail.destination}</p>
                </div>
                <button onClick={() => setViewPkgDetail(null)} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Duration', value: `${viewPkgDetail.durationDays}D / ${viewPkgDetail.durationNights}N` },
                  { label: 'Star Category', value: viewPkgDetail.starCategory },
                  { label: 'Travel Type', value: viewPkgDetail.travelType },
                  { label: 'Price / Person', value: `₹${viewPkgDetail.pricePerPerson.toLocaleString('en-IN')}` },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
                    <p className="font-bold text-gray-900 text-sm">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Overview */}
              {viewPkgDetail.overview && (
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">Overview</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{viewPkgDetail.overview}</p>
                </div>
              )}

              {/* Highlights */}
              {viewPkgDetail.highlights && viewPkgDetail.highlights.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">Highlights</h3>
                  <ul className="space-y-1">
                    {viewPkgDetail.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-primary mt-0.5 flex-shrink-0">✦</span>{h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inclusions & Exclusions */}
              {((viewPkgDetail.inclusions && viewPkgDetail.inclusions.length > 0) || (viewPkgDetail.exclusions && viewPkgDetail.exclusions.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {viewPkgDetail.inclusions && viewPkgDetail.inclusions.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-1.5"><span className="text-green-500">✓</span> Inclusions</h3>
                      <ul className="space-y-1">
                        {viewPkgDetail.inclusions.map((inc, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>{inc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {viewPkgDetail.exclusions && viewPkgDetail.exclusions.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-1.5"><span className="text-red-400">✗</span> Exclusions</h3>
                      <ul className="space-y-1">
                        {viewPkgDetail.exclusions.map((exc, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>{exc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Day-wise itinerary */}
              {viewPkgDetail.dayWiseItinerary && (
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-3">Day-wise Itinerary</h3>
                  <div className="space-y-2">
                    {viewPkgDetail.dayWiseItinerary.split('\n').filter(Boolean).map((line, i) => {
                      const isDay = /^day\s*\d+/i.test(line)
                      return isDay ? (
                        <p key={i} className="font-semibold text-gray-900 text-sm pt-1">{line}</p>
                      ) : (
                        <p key={i} className="text-xs text-gray-500 pl-3 leading-relaxed">{line}</p>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  const msg = buildPackageWhatsAppMessage(viewPkgDetail)
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-green-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />Share on WhatsApp
              </button>
              <button
                onClick={() => {
                  const plannerUrl = `${window.location.origin}/tailored-travel/${parentAgentSlug}?subAgent=${currentUser?.uid}`
                  navigator.clipboard.writeText(plannerUrl)
                  setCopiedPkgId(viewPkgDetail.id)
                  setTimeout(() => setCopiedPkgId(null), 2000)
                }}
                className={`flex items-center justify-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors ${copiedPkgId === viewPkgDetail.id ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
              >
                {copiedPkgId === viewPkgDetail.id ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Link</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Package View / Edit Modal ────────────────────────────────────────── */}
      {viewPkgQuot && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <p className="font-bold text-gray-900 truncate">{customForm.title || viewPkgQuot.packageTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{viewPkgQuot.customerName}</p>
                    {viewPkgQuot.customPackageData && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">My Version</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewPkgQuot(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex-shrink-0">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {loadingPkg ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-6 space-y-5 overflow-y-auto">

                {/* ── Hero image ── */}
                {customForm.primaryImageUrl ? (
                  <div className="relative h-48 rounded-2xl overflow-hidden">
                    <img src={customForm.primaryImageUrl} alt={customForm.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <p className="text-white font-bold text-lg">{customForm.title}</p>
                      <p className="text-white/80 text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{customForm.destination}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-28 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <Package className="w-8 h-8 text-primary/40 mx-auto mb-1" />
                      <p className="font-bold text-gray-700">{customForm.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-center mt-0.5"><MapPin className="w-3 h-3" />{customForm.destination}</p>
                    </div>
                  </div>
                )}

                {/* ── Customer context strip ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Customer', value: viewPkgQuot.customerName },
                    { label: 'Travellers', value: viewPkgQuot.groupSize ? `${viewPkgQuot.groupSize} pax` : `${viewPkgQuot.adults ?? 1}A${viewPkgQuot.kids ? ` ${viewPkgQuot.kids}K` : ''}` },
                    { label: 'Travel Dates', value: viewPkgQuot.preferredDates || 'Not set' },
                    { label: 'Status', value: QUOT_STATUS[viewPkgQuot.status]?.label || viewPkgQuot.status },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.label}</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Instruction banner ── */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Eye className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Click <span className="font-bold">✏️ Edit</span> on any section to customise it. Your edits create <span className="font-bold">your own version</span> — the agent's original package is untouched. Hit <span className="font-bold">"Share to Agent"</span> to notify them.
                  </p>
                </div>

                {/* ── Section: Title & Basic Info ── */}
                <PkgSection
                  title="Package Title & Destination"
                  isEditing={editingSection === 'basic'}
                  onEdit={() => setEditingSection(editingSection === 'basic' ? null : 'basic')}
                  view={
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-gray-400 mb-0.5">Title</p><p className="font-semibold text-gray-800">{customForm.title || '—'}</p></div>
                      <div><p className="text-xs text-gray-400 mb-0.5">Destination</p><p className="font-semibold text-gray-800">{customForm.destination || '—'}</p></div>
                      {customForm.travelType && <div><p className="text-xs text-gray-400 mb-0.5">Travel Type</p><p className="font-semibold text-gray-800">{customForm.travelType}</p></div>}
                      {customForm.starCategory && <div><p className="text-xs text-gray-400 mb-0.5">Category</p><p className="font-semibold text-gray-800">{customForm.starCategory}</p></div>}
                    </div>
                  }
                  edit={
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Package Title</label>
                        <input value={customForm.title || ''} onChange={e => setCustomForm(p => ({ ...p, title: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Destination</label>
                        <input value={customForm.destination || ''} onChange={e => setCustomForm(p => ({ ...p, destination: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Travel Type</label>
                        <input value={customForm.travelType || ''} onChange={e => setCustomForm(p => ({ ...p, travelType: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                  }
                />

                {/* ── Section: Duration & Price ── */}
                <PkgSection
                  title="Duration & Pricing"
                  isEditing={editingSection === 'duration'}
                  onEdit={() => setEditingSection(editingSection === 'duration' ? null : 'duration')}
                  view={
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Nights</p>
                        <p className="font-bold text-gray-900 text-lg">{customForm.durationNights ?? '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Days</p>
                        <p className="font-bold text-gray-900 text-lg">{customForm.durationDays ?? '—'}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 text-center">
                        <p className="text-[10px] text-primary uppercase tracking-wide font-semibold">Price/Person</p>
                        <p className="font-bold text-primary text-lg">{customForm.pricePerPerson ? `₹${customForm.pricePerPerson.toLocaleString('en-IN')}` : '—'}</p>
                      </div>
                    </div>
                  }
                  edit={
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Nights</label>
                        <input type="number" value={customForm.durationNights ?? ''} onChange={e => setCustomForm(p => ({ ...p, durationNights: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Days</label>
                        <input type="number" value={customForm.durationDays ?? ''} onChange={e => setCustomForm(p => ({ ...p, durationDays: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Price/Person (₹)</label>
                        <input type="number" value={customForm.pricePerPerson ?? ''} onChange={e => setCustomForm(p => ({ ...p, pricePerPerson: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                  }
                />

                {/* ── Section: Overview ── */}
                <PkgSection
                  title="Overview"
                  isEditing={editingSection === 'overview'}
                  onEdit={() => setEditingSection(editingSection === 'overview' ? null : 'overview')}
                  view={
                    customForm.overview
                      ? <p className="text-sm text-gray-700 leading-relaxed">{customForm.overview}</p>
                      : <p className="text-sm text-gray-400 italic">No overview yet — click ✏️ to add one</p>
                  }
                  edit={
                    <textarea rows={4} value={customForm.overview || ''} onChange={e => setCustomForm(p => ({ ...p, overview: e.target.value }))}
                      placeholder="Write a compelling overview of this package…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  }
                />

                {/* ── Section: Highlights ── */}
                <PkgSection
                  title="Highlights"
                  isEditing={editingSection === 'highlights'}
                  onEdit={() => setEditingSection(editingSection === 'highlights' ? null : 'highlights')}
                  view={
                    Array.isArray(customForm.highlights) && customForm.highlights.length > 0
                      ? <ul className="space-y-1.5">{customForm.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-primary mt-0.5">✦</span>{h}
                          </li>
                        ))}</ul>
                      : <p className="text-sm text-gray-400 italic">No highlights yet — click ✏️ to add</p>
                  }
                  edit={
                    <div>
                      <textarea rows={4}
                        value={Array.isArray(customForm.highlights) ? customForm.highlights.join('\n') : ''}
                        onChange={e => setCustomForm(p => ({ ...p, highlights: e.target.value.split('\n').filter(Boolean) }))}
                        placeholder="One highlight per line&#10;Beautiful beaches&#10;Scuba diving spots&#10;Sunset cruise"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <p className="text-[10px] text-gray-400 mt-1">One highlight per line</p>
                    </div>
                  }
                />

                {/* ── Section: Inclusions & Exclusions ── */}
                <PkgSection
                  title="Inclusions & Exclusions"
                  isEditing={editingSection === 'inclusions'}
                  onEdit={() => setEditingSection(editingSection === 'inclusions' ? null : 'inclusions')}
                  view={
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-green-700 mb-2">✓ Inclusions</p>
                        {Array.isArray(customForm.inclusions) && customForm.inclusions.length > 0
                          ? <ul className="space-y-1">{customForm.inclusions.map((inc, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-green-500 mt-0.5">•</span>{inc}</li>
                            ))}</ul>
                          : <p className="text-xs text-gray-400 italic">None added</p>}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-600 mb-2">✗ Exclusions</p>
                        {Array.isArray(customForm.exclusions) && customForm.exclusions.length > 0
                          ? <ul className="space-y-1">{customForm.exclusions.map((exc, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-red-400 mt-0.5">•</span>{exc}</li>
                            ))}</ul>
                          : <p className="text-xs text-gray-400 italic">None added</p>}
                      </div>
                    </div>
                  }
                  edit={
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-green-700 block mb-1">✓ Inclusions (one per line)</label>
                        <textarea rows={5}
                          value={Array.isArray(customForm.inclusions) ? customForm.inclusions.join('\n') : ''}
                          onChange={e => setCustomForm(p => ({ ...p, inclusions: e.target.value.split('\n').filter(Boolean) }))}
                          placeholder="Flights&#10;Hotel accommodation&#10;Daily breakfast&#10;Airport transfers"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-300" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-red-600 block mb-1">✗ Exclusions (one per line)</label>
                        <textarea rows={5}
                          value={Array.isArray(customForm.exclusions) ? customForm.exclusions.join('\n') : ''}
                          onChange={e => setCustomForm(p => ({ ...p, exclusions: e.target.value.split('\n').filter(Boolean) }))}
                          placeholder="Personal expenses&#10;Visa fees&#10;Travel insurance&#10;Optional activities"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
                      </div>
                    </div>
                  }
                />

                {/* ── Section: Day-wise Itinerary ── */}
                <PkgSection
                  title="Day-Wise Itinerary"
                  isEditing={editingSection === 'itinerary'}
                  onEdit={() => setEditingSection(editingSection === 'itinerary' ? null : 'itinerary')}
                  view={
                    customForm.dayWiseItinerary
                      ? <div className="space-y-1.5">{customForm.dayWiseItinerary.split('\n').filter(Boolean).map((line, i) => (
                          <div key={i} className={`text-sm ${line.toLowerCase().startsWith('day') ? 'font-bold text-gray-900 mt-3 first:mt-0' : 'text-gray-600 pl-3'}`}>{line}</div>
                        ))}</div>
                      : <p className="text-sm text-gray-400 italic">No itinerary yet — click ✏️ to add day-by-day plan</p>
                  }
                  edit={
                    <div>
                      <textarea rows={8}
                        value={customForm.dayWiseItinerary || ''}
                        onChange={e => setCustomForm(p => ({ ...p, dayWiseItinerary: e.target.value }))}
                        placeholder="Day 1: Arrive at airport, check-in hotel&#10;Day 2: Visit beach, sunset cruise&#10;Day 3: Scuba diving, local market&#10;Day 4: Island hopping&#10;Day 5: Free time, departure"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <p className="text-[10px] text-gray-400 mt-1">Start each day with "Day 1:", "Day 2:" etc.</p>
                    </div>
                  }
                />
              </div>
            )}

            {/* ── Footer actions ── */}
            {!loadingPkg && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {customSaved && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />Saved
                    </span>
                  )}
                  <p className="text-xs text-gray-400">Edits only affect this quotation</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveCustomPackage(false)}
                    disabled={savingCustom || sharingCustom}
                    className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-xl hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {savingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                    Save My Version
                  </button>
                  <button
                    onClick={() => saveCustomPackage(true)}
                    disabled={savingCustom || sharingCustom}
                    className="flex items-center gap-1.5 text-xs font-bold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm shadow-primary/30"
                  >
                    {sharingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Share to Agent
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quotation PDF Modal ──────────────────────────────────────────────── */}
      {pdfQuot && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none">
            {/* Modal toolbar - hidden on print */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-bold text-gray-900">Quotation Preview</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => shareQuotationWhatsApp(pdfQuot)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-green-500 text-white px-3 py-1.5 rounded-xl hover:bg-green-600 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />WhatsApp
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />Print / Save PDF
                </button>
                <button
                  onClick={() => setPdfQuot(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable quotation body */}
            <div className="flex-1 overflow-y-auto p-6 print:p-8 space-y-5" id="quotation-print">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Travel Quotation</h1>
                  <p className="text-sm text-gray-400 mt-0.5">Ref: {pdfQuot.id.slice(-8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Date</p>
                  <p className="text-sm font-semibold text-gray-700">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="text-xs text-gray-400 mt-1">Prepared by</p>
                  <p className="text-sm font-semibold text-gray-700">{subAgentName || 'Travel Agent'}</p>
                </div>
              </div>

              <div className="h-px bg-gray-200" />

              {/* Customer info */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Prepared For</p>
                <p className="text-lg font-bold text-gray-900">{pdfQuot.customerName}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
                  {pdfQuot.customerEmail && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{pdfQuot.customerEmail}</span>}
                  {pdfQuot.customerPhone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{pdfQuot.customerPhone}</span>}
                </div>
              </div>

              {/* Package details */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Package Details</p>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-primary/5 px-5 py-4 border-b border-gray-200">
                    <p className="font-bold text-gray-900 text-base">{pdfQuot.packageTitle}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{pdfQuot.destination}</p>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="px-5 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Travellers</p>
                      <p className="font-semibold text-gray-800 text-sm">{pdfQuot.groupSize || 1} pax</p>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Status</p>
                      <p className="font-semibold text-gray-800 text-sm capitalize">{QUOT_STATUS[pdfQuot.status]?.label || pdfQuot.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className={`rounded-2xl p-5 border-2 ${pdfQuot.quotedPrice ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="text-xs font-bold uppercase tracking-wide mb-1 ${pdfQuot.quotedPrice ? 'text-emerald-600' : 'text-amber-600'}">
                  {pdfQuot.quotedPrice ? 'Quoted Price' : 'Price'}
                </p>
                {pdfQuot.quotedPrice ? (
                  <div>
                    <p className="text-3xl font-bold text-emerald-700">₹{Number(pdfQuot.quotedPrice).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">Total for {pdfQuot.groupSize || 1} traveller{(pdfQuot.groupSize || 1) !== 1 ? 's' : ''}</p>
                  </div>
                ) : (
                  <p className="text-base font-semibold text-amber-700">To be confirmed — please contact us</p>
                )}
              </div>

              {/* Terms */}
              <div className="text-xs text-gray-400 space-y-1 border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-500">Terms & Conditions</p>
                <p>• This quotation is valid for 7 days from the date of issue.</p>
                <p>• Prices are subject to availability at the time of booking.</p>
                <p>• A deposit may be required to confirm the booking.</p>
                <p>• For queries, please contact your travel agent directly.</p>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">Thank you for choosing us for your travel needs ✈️</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PkgSection: reusable collapsible section with pencil edit ─────────────────
function PkgSection({
  title, isEditing, onEdit, view, edit,
}: {
  title: string
  isEditing: boolean
  onEdit: () => void
  view: React.ReactNode
  edit: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <button
          onClick={onEdit}
          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
            isEditing
              ? 'bg-primary text-white'
              : 'text-gray-500 hover:text-primary hover:bg-primary/10 border border-gray-200'
          }`}
        >
          {isEditing ? (
            <><span className="text-xs">✓</span> Done</>
          ) : (
            <><span className="text-xs">✏️</span> Edit</>
          )}
        </button>
      </div>
      <div className="px-4 py-4">
        {isEditing ? edit : view}
      </div>
    </div>
  )
}
