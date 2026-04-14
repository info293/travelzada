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
  Sparkles
} from 'lucide-react'
import SubAgentDemoLoader from '@/components/sub-agent-dashboard/SubAgentDemoLoader'

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

interface Quotation {
  id: string
  packageTitle: string
  destination: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  status: string
  quotedPrice?: number
  messages: QuotMsg[]
  createdAt?: { seconds: number }
}

interface AgentPackage {
  id: string
  title: string
  destination: string
  durationNights: number
  durationDays: number
  pricePerPerson: number
  travelType: string
  starCategory: string
  primaryImageUrl?: string
  isActive: boolean
  overview?: string
}

type Tab = 'home' | 'bookings' | 'packages' | 'quotations' | 'customers' | 'stats' | 'activity'

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
  converted:     { label: 'Converted',     color: 'bg-teal-50 text-teal-700' },
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

  // Bookings search/filter
  const [bookSearch, setBookSearch] = useState('')
  const [bookFilter, setBookFilter] = useState('all')
  const [expandedBook, setExpandedBook] = useState<string | null>(null)

  // Package search
  const [pkgSearch, setPkgSearch] = useState('')

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

  function copyPlannerUrl() {
    const url = `${window.location.origin}/tailored-travel/${parentAgentSlug}?subAgent=${currentUser?.uid}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    { id: 'home',      label: 'Home',       icon: Home },
    { id: 'bookings',  label: 'Bookings',   icon: BookOpen,     badge: bookings.filter(b => b.status === 'new').length || undefined },
    { id: 'packages',  label: 'Packages',   icon: Package },
    { id: 'quotations',label: 'Quotations', icon: MessageSquare, badge: pendingQuots || undefined },
    { id: 'customers', label: 'Customers',  icon: Users },
    { id: 'stats',     label: 'My Stats',   icon: BarChart3 },
    { id: 'activity',  label: 'Activity',   icon: Activity },
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
  const filteredPkgs = packages.filter(p =>
    !pkgSearch || p.title.toLowerCase().includes(pkgSearch.toLowerCase()) ||
    p.destination.toLowerCase().includes(pkgSearch.toLowerCase())
  )

  // Filtered quotations
  const filteredQuots = quotations.filter(q => quotFilter === 'all' || q.status === quotFilter)

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
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={pkgSearch} onChange={e => setPkgSearch(e.target.value)}
                      placeholder="Search packages…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">{filteredPkgs.length} active package{filteredPkgs.length !== 1 ? 's' : ''} available to share</p>

                {filteredPkgs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No packages available yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredPkgs.map(pkg => {
                      const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/tailored-travel/${parentAgentSlug}?subAgent=${currentUser?.uid}`
                      return (
                        <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
                          {pkg.primaryImageUrl ? (
                            <img src={pkg.primaryImageUrl} alt={pkg.title} className="w-full h-36 object-cover" />
                          ) : (
                            <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                          <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 text-sm leading-snug">{pkg.title}</h3>
                              <span className="flex-shrink-0 flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                                <Star className="w-3 h-3 fill-amber-400" />{pkg.starCategory}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pkg.destination}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pkg.durationNights}N {pkg.durationDays}D</span>
                              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{pkg.travelType}</span>
                            </div>
                            <p className="text-lg font-bold text-primary mb-3">₹{pkg.pricePerPerson.toLocaleString('en-IN')}<span className="text-xs font-normal text-gray-400">/person</span></p>
                            <div className="flex gap-2 mt-auto">
                              <button onClick={() => { navigator.clipboard.writeText(shareUrl) }}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary py-2 rounded-xl hover:bg-primary/20">
                                <Copy className="w-3.5 h-3.5" />Share Link
                              </button>
                              <a href={shareUrl} target="_blank"
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-primary text-white py-2 rounded-xl hover:bg-primary/90">
                                <ExternalLink className="w-3.5 h-3.5" />Preview
                              </a>
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
                    <p className="text-xs text-gray-400 mt-0.5">{quotations.length} total</p>
                  </div>
                  <div className="px-3 pt-2 pb-1 flex gap-1 flex-wrap">
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
                        <button key={q.id} onClick={() => setSelQuot(q)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selQuot?.id === q.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{q.customerName}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${sc?.color}`}>{sc?.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{q.packageTitle}</p>
                          {q.quotedPrice && <p className="text-xs text-green-700 font-semibold mt-0.5">₹{q.quotedPrice.toLocaleString('en-IN')}</p>}
                          {q.messages.length > 0 && <p className="text-[10px] text-gray-400 mt-0.5">{q.messages.length} messages</p>}
                        </button>
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
                            </div>
                          </div>
                          {selQuot.quotedPrice && (
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-400">Quoted</p>
                              <p className="text-xl font-bold text-gray-900">₹{selQuot.quotedPrice.toLocaleString('en-IN')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                        {selQuot.messages.length === 0 ? (
                          <p className="text-center text-xs text-gray-400 py-8">No messages yet. Start the conversation.</p>
                        ) : selQuot.messages.map(msg => {
                          const isMe = msg.senderRole === 'subagent'
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
                        <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400">
                          This quotation is {selQuot.status} — no further messages can be sent.
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

            {/* ══════════════════════ CUSTOMERS ══════════════════════════════ */}
            {tab === 'customers' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{customers.length} unique customer{customers.length !== 1 ? 's' : ''} from your bookings</p>
                {customers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No customers yet. Customers appear automatically from your bookings.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customers.map(c => {
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

            {/* ══════════════════════ ACTIVITY ══════════════════════════════ */}
            {tab === 'activity' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{sessions.length} session event{sessions.length !== 1 ? 's' : ''} recorded</p>
                {sessions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
                    {sessions.map(ev => {
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
                )}
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
    </div>
  )
}
