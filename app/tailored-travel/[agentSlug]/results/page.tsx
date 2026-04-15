'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, X, Send, User, Phone, Mail, Calendar,
  Users, Star, Clock, CheckCircle, MapPin, IndianRupee, Package
} from 'lucide-react'

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

const cinematicTexts = [
  'Analyzing your preferences…',
  'Searching curated packages…',
  'Finding perfect experiences…',
  'Crafting your itinerary…',
]

export default function AgentResultsPage() {
  const router = useRouter()
  const params = useParams()
  const agentSlug = params.agentSlug as string

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

  // Loading text rotation
  useEffect(() => {
    if (!isLoading) return
    const interval = setInterval(() => setLoadingIdx(i => (i + 1) % cinematicTexts.length), 2500)
    return () => clearInterval(interval)
  }, [isLoading])

  // Fetch agent info on mount
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
      router.push(`/tailored-travel/${agentSlug}`)
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

  async function fetchPackages(data: any) {
    setIsLoading(true)
    setError(null)
    setNoPackages(false)
    try {
      const res = await fetch('/api/tailored-travel/find-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, agentSlug }),
      })
      const result = await res.json()

      if (result.noAgentPackages) {
        setNoPackages(true)
        setPackages([])
      } else if (result.success && result.packages) {
        setPackages(result.packages)
      } else {
        throw new Error(result.error || 'No packages found')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Agent badge while loading */}
          {agentInfo && (
            <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
              {agentInfo.logoUrl ? (
                <img src={agentInfo.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                  {agentInfo.companyName.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">{agentInfo.companyName}</span>
              <span className="text-xs text-gray-400">· Powered by Travelzada AI</span>
            </div>
          )}

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full"
          />

          <AnimatePresence mode="wait">
            <motion.p
              key={loadingIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-gray-500 text-base"
            >
              {cinematicTexts[loadingIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ── Agent branding strip ─────────────────────────────────────────────────
  const AgentStrip = () => agentInfo ? (
    <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 md:top-20 z-30">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {agentInfo.logoUrl ? (
            <img src={agentInfo.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
              {agentInfo.companyName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{agentInfo.companyName}</p>
            <p className="text-xs text-gray-400">Powered by Travelzada AI</p>
          </div>
        </div>
        <Link
          href={`/tailored-travel/${agentSlug}`}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Change preferences
        </Link>
      </div>
    </div>
  ) : null

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <AgentStrip />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <button
            onClick={() => router.push(`/tailored-travel/${agentSlug}`)}
            className="flex items-center gap-2 text-purple-600 font-semibold hover:underline text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    )
  }

  // ── No packages ──────────────────────────────────────────────────────────
  if (noPackages || packages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <AgentStrip />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No matching packages found</h2>
          <p className="text-sm text-gray-500 mb-6">
            {agentInfo?.companyName} hasn't added packages for your selected destinations yet. Contact the agent directly to discuss a custom trip.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => router.push(`/tailored-travel/${agentSlug}`)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Change destination
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <AgentStrip />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {packages.length} Match{packages.length !== 1 ? 'es' : ''} Found
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            For {wizardData?.destinations?.join(', ')} ·{' '}
            {wizardData?.routeItems?.reduce((s: number, r: any) => s + (r.nights || 0), 0) || '?'}N ·{' '}
            {wizardData?.hotelTypes?.join(', ')} ·{' '}
            {wizardData?.passengers?.adults} adult{wizardData?.passengers?.adults !== 1 ? 's' : ''}
            {wizardData?.passengers?.kids ? ` + ${wizardData.passengers.kids} kid${wizardData.passengers.kids !== 1 ? 's' : ''}` : ''}
          </p>
        </div>

        {/* Package cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg, i) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              index={i}
              onRequest={() => {
                setSelectedPackage(pkg)
                setShowBookingForm(true)
              }}
            />
          ))}
        </div>
      </div>

      {/* Booking modal */}
      <AnimatePresence>
        {showBookingForm && selectedPackage && agentInfo && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <AgentBookingForm
                agentInfo={agentInfo}
                pkg={selectedPackage}
                wizardData={wizardData}
                subAgentId={subAgentId}
                sessionId={sessionId}
                agentSlug={agentSlug}
                onClose={() => setShowBookingForm(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}

// ── Package card ─────────────────────────────────────────────────────────────
function PackageCard({
  pkg,
  index,
  onRequest,
}: {
  pkg: MatchedPackage
  index: number
  onRequest: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const title = pkg.agentPackageTitle || pkg.Destination_Name
  const inclusions = typeof pkg.Inclusions === 'string'
    ? pkg.Inclusions.split(',').map(s => s.trim()).filter(Boolean)
    : Array.isArray(pkg.Inclusions) ? pkg.Inclusions : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
    >
      {/* Image */}
      <div className="relative h-44 bg-gray-100 flex-shrink-0">
        {pkg.Primary_Image_URL ? (
          <img
            src={pkg.Primary_Image_URL}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {/* Match score badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-gray-900">{pkg.matchScore}% match</span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Title + Price */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-base leading-tight">{title}</h3>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-purple-700">₹{pkg.Price_Min_INR.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400">per person</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            {pkg.Duration_Nights}N {pkg.Duration_Days}D
          </span>
          {pkg.Star_Category && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pkg.Star_Category}
            </span>
          )}
          {pkg.Travel_Type && (
            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
              {pkg.Travel_Type}
            </span>
          )}
        </div>

        {/* Match reason */}
        {pkg.matchReason && (
          <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 mb-3 border border-indigo-100 leading-relaxed">
            {pkg.matchReason}
          </p>
        )}

        {/* Overview */}
        {pkg.Overview && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{pkg.Overview}</p>
        )}

        {/* Inclusions toggle */}
        {inclusions.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-purple-600 font-semibold hover:underline"
            >
              {expanded ? '▲ Hide inclusions' : '▼ View inclusions'}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1">
                {inclusions.slice(0, 6).map((inc, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {inc}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-auto">
          <button
            onClick={onRequest}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            Request This Package
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Form router — sub-agent gets quotation form, customer gets booking form ───
function AgentBookingForm({
  agentInfo, pkg, wizardData, subAgentId, sessionId, agentSlug, onClose,
}: {
  agentInfo: AgentInfo
  pkg: MatchedPackage
  wizardData: any
  subAgentId?: string
  sessionId?: string
  agentSlug?: string
  onClose: () => void
}) {
  // Sub-agents → quotation flow; regular customers → booking flow
  if (subAgentId) {
    return (
      <QuotationRequestForm
        agentInfo={agentInfo} pkg={pkg} wizardData={wizardData}
        subAgentId={subAgentId} agentSlug={agentSlug} onClose={onClose}
      />
    )
  }
  return (
    <BookingRequestForm
      agentInfo={agentInfo} pkg={pkg} wizardData={wizardData}
      subAgentId={subAgentId} sessionId={sessionId} agentSlug={agentSlug} onClose={onClose}
    />
  )
}

// ── Sub-agent quotation request form (name + dates + notes only) ─────────────
function QuotationRequestForm({
  agentInfo, pkg, wizardData, subAgentId, agentSlug, onClose,
}: {
  agentInfo: AgentInfo
  pkg: MatchedPackage
  wizardData: any
  subAgentId: string
  agentSlug?: string
  onClose: () => void
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
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/agent/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentInfo.id,
          agentSlug: agentInfo.agentSlug,
          subAgentId,
          subAgentName: '',           // filled server-side or left blank
          packageId: pkg.id,
          packageTitle: pkg.agentPackageTitle || pkg.Destination_Name,
          destination: pkg.Destination_Name,
          customerName: form.customerName.trim(),
          customerEmail: '',
          customerPhone: '',
          preferredDates: form.preferredDates,
          groupSize: (wizardData?.passengers?.adults || 1) + (wizardData?.passengers?.kids || 0),
          adults: wizardData?.passengers?.adults || 1,
          kids: wizardData?.passengers?.kids || 0,
          rooms: wizardData?.passengers?.rooms || 1,
          specialRequests: form.specialRequests,
          wizardData,
          selectedPackage: pkg,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Quotation Request Sent!</h3>
        <p className="text-sm text-gray-500 mb-1">
          Your quotation request for <strong>{pkg.agentPackageTitle || pkg.Destination_Name}</strong> has been sent to the DMC.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          You can track the discussion and pricing in your <strong>Quotations</strong> tab.
        </p>
        <button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">
          Done
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">Request Quotation</h3>
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Goes to Quotations tab
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {pkg.agentPackageTitle || pkg.Destination_Name} · ₹{pkg.Price_Min_INR.toLocaleString('en-IN')}/person
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
          This will create a quotation request. You and the DMC will discuss itinerary and pricing — once agreed, it converts to a booking.
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-100">{error}</div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="customerName" value={form.customerName} onChange={handleChange}
              required placeholder="Your customer's full name"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Travel Dates</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              name="preferredDates" value={form.preferredDates} onChange={handleChange}
              placeholder="e.g. December 2025, Flexible"
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Special Notes</label>
          <textarea
            name="specialRequests" value={form.specialRequests} onChange={handleChange}
            rows={3}
            placeholder="Dietary needs, occasion, budget, specific preferences…"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
        </div>

        {/* Trip summary */}
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
        <p className="text-xs text-center text-gray-400 mt-2">
          The DMC will respond in your Quotations tab.
        </p>
      </div>
    </form>
  )
}

// ── Regular customer booking form ─────────────────────────────────────────────
function BookingRequestForm({
  agentInfo, pkg, wizardData, subAgentId, sessionId, agentSlug, onClose,
}: {
  agentInfo: AgentInfo
  pkg: MatchedPackage
  wizardData: any
  subAgentId?: string
  sessionId?: string
  agentSlug?: string
  onClose: () => void
}) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
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
    if (!form.customerName.trim() || !form.customerEmail.trim()) {
      setError('Name and email are required.'); return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/agent/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentInfo.id,
          agentSlug: agentInfo.agentSlug,
          packageId: pkg.id,
          packageTitle: pkg.agentPackageTitle || pkg.Destination_Name,
          destination: pkg.Destination_Name,
          customerName: form.customerName.trim(),
          customerEmail: form.customerEmail.trim(),
          customerPhone: form.customerPhone.trim(),
          preferredDates: form.preferredDates,
          groupSize: (wizardData?.passengers?.adults || 1) + (wizardData?.passengers?.kids || 0),
          adults: wizardData?.passengers?.adults || 1,
          kids: wizardData?.passengers?.kids || 0,
          rooms: wizardData?.passengers?.rooms || 1,
          specialRequests: form.specialRequests,
          wizardData,
          selectedPackage: pkg,
          subAgentId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      if (agentSlug && sessionId) {
        fetch('/api/agent/track', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentSlug, sessionId, action: 'booking_submitted', subAgentId,
            destination: pkg.Destination_Name,
            packageTitle: pkg.agentPackageTitle || pkg.Destination_Name,
          }),
        }).catch(() => {})
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Booking Request Sent!</h3>
        <p className="text-sm text-gray-500 mb-1">
          Your request for <strong>{pkg.agentPackageTitle || pkg.Destination_Name}</strong> has been received.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          <strong>{agentInfo.companyName}</strong> will contact you at <strong>{form.customerEmail}</strong> shortly.
        </p>
        <button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">
          Done
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <h3 className="font-bold text-gray-900">Request This Package</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {pkg.agentPackageTitle || pkg.Destination_Name} · ₹{pkg.Price_Min_INR.toLocaleString('en-IN')}/person
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-5 h-5" /></button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-100">{error}</div>}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input name="customerName" value={form.customerName} onChange={handleChange} required
              placeholder="Your full name"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="email" name="customerEmail" value={form.customerEmail} onChange={handleChange} required
                placeholder="you@email.com"
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input name="customerPhone" value={form.customerPhone} onChange={handleChange}
                placeholder="+91 98765..."
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Travel Dates</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input name="preferredDates" value={form.preferredDates} onChange={handleChange}
              placeholder="e.g. December 2025, Flexible"
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Special Requests</label>
          <textarea name="specialRequests" value={form.specialRequests} onChange={handleChange} rows={2}
            placeholder="Any dietary needs, accessibility, or special occasions…"
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
        <p className="text-xs text-center text-gray-400 mt-2">
          {agentInfo.companyName} will contact you to confirm details and pricing.
        </p>
      </div>
    </form>
  )
}
