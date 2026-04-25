'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, X, Send, User, Phone, Mail, Calendar,
  Users, Star, Clock, CheckCircle, MapPin, IndianRupee, Package,
  FileText, Printer, Eye
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
        {!isEmbed && <Header />}
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
    <div className={`bg-white border-b border-gray-100 shadow-sm sticky z-30 ${isEmbed ? 'top-0' : 'top-16 md:top-20'}`}>
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
        {!isEmbed && <Header />}
        <AgentStrip />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <button
            onClick={() => router.push(`/tailored-travel/${agentSlug}${isEmbed ? '?embed=1' : ''}`)}
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
        {!isEmbed && <Header />}
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
              onClick={() => router.push(`/tailored-travel/${agentSlug}${isEmbed ? '?embed=1' : ''}`)}
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
      {!isEmbed && <Header />}
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

      {!isEmbed && <Footer />}
    </div>
  )
}

// ── WhatsApp message builder for a matched package ───────────────────────────
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

  if (pkg.Overview) {
    lines.push('')
    lines.push(`📝 *Overview*`)
    lines.push(pkg.Overview)
  }

  if (inclusions.length > 0) {
    lines.push('')
    lines.push(`✅ *Inclusions*`)
    inclusions.forEach((inc: string) => lines.push(`  ✓ ${inc}`))
  }

  if (pkg.Day_Wise_Itinerary) {
    lines.push('')
    lines.push(`🗺️ *Day-wise Itinerary*`)
    String(pkg.Day_Wise_Itinerary).split('\n').filter(Boolean).forEach(line => {
      lines.push(/^day\s*\d+/i.test(line) ? `*${line}*` : `  ${line}`)
    })
  }

  return lines.join('\n')
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
  const [showPdf, setShowPdf] = useState(false)
  const [showItinerary, setShowItinerary] = useState(false)
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

        <div className="mt-auto flex gap-2">
          <button
            onClick={() => {
              const msg = buildWhatsAppMsg(pkg)
              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
            }}
            className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-2.5 rounded-xl transition-colors flex-shrink-0"
            title="Share on WhatsApp"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPdf(true)}
            className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2.5 rounded-xl transition-colors flex-shrink-0"
            title="Download / Print PDF"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowItinerary(true)}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            View Itinerary
          </button>
        </div>
      </div>

      {/* ── Full Itinerary — DMC-style full-page two-column view ─────────── */}
      {showItinerary && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#f4f5f9]">

          {/* Top bar */}
          <div className="flex items-center justify-between bg-white border-b border-gray-100 px-4 py-2.5 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowItinerary(false)}
                className="flex items-center gap-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 px-2.5 py-1.5 rounded-lg transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back
              </button>
              <div className="h-4 w-px bg-gray-200" />
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pkg.matchScore}% match</span>
              <p className="text-sm font-semibold text-gray-700 truncate max-w-xs hidden sm:block">{title}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const msg = buildWhatsAppMsg(pkg); window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank') }}
                className="flex items-center gap-1.5 text-xs font-bold bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button
                onClick={() => { setShowItinerary(false); setShowPdf(true) }}
                className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={() => setShowItinerary(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main: left content + right preview */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: scrollable itinerary content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-w-0">

              {/* Package title card with gradient header */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-500 px-5 pt-5 pb-4">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Package Itinerary</p>
                  <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
                  <p className="text-sm text-white/70 flex items-center gap-1 mt-1.5">
                    <MapPin className="w-3.5 h-3.5" />{pkg.Destination_Name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 px-5 py-3">
                  <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" />{pkg.Duration_Days}D / {pkg.Duration_Nights}N
                  </span>
                  {pkg.Star_Category && (
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Star className="w-3 h-3" />{pkg.Star_Category}
                    </span>
                  )}
                  {pkg.Travel_Type && (
                    <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{pkg.Travel_Type}</span>
                  )}
                  <span className="bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">{pkg.matchScore}% AI Match</span>
                </div>
              </div>

              {/* Hero image */}
              {pkg.Primary_Image_URL && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="relative h-52 md:h-64">
                    <img src={pkg.Primary_Image_URL} alt={title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-5">
                      <p className="text-white font-bold text-lg leading-tight drop-shadow">{title}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Why it matches */}
              {pkg.matchReason && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-sm">🎯</span>
                    <p className="text-sm font-bold text-gray-800">Why It Matches You</p>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-indigo-800 leading-relaxed">{pkg.matchReason}</p>
                  </div>
                </div>
              )}

              {/* Overview */}
              {pkg.Overview && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-sm">📝</span>
                    <p className="text-sm font-bold text-gray-800">Overview</p>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{pkg.Overview}</p>
                  </div>
                </div>
              )}

              {/* Inclusions */}
              {inclusions.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-sm">✅</span>
                    <p className="text-sm font-bold text-gray-800">Inclusions</p>
                  </div>
                  <div className="p-5">
                    <ul className="space-y-2">
                      {inclusions.map((inc: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />{inc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Day-wise itinerary */}
              {pkg.Day_Wise_Itinerary && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-sm">🗺️</span>
                    <p className="text-sm font-bold text-gray-800">Day-Wise Itinerary</p>
                  </div>
                  <div className="p-5 space-y-2">
                    {String(pkg.Day_Wise_Itinerary).split('\n').filter(Boolean).map((line, i) => (
                      /^day\s*\d+/i.test(line) ? (
                        <div key={i} className="flex items-center gap-2 mt-4 first:mt-0">
                          <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {(line.match(/\d+/) || ['?'])[0]}
                          </span>
                          <p className="text-sm font-bold text-gray-900">{line}</p>
                        </div>
                      ) : (
                        <p key={i} className="text-sm text-gray-600 pl-8 border-l-2 border-purple-100 ml-3 leading-relaxed">{line}</p>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* T&C footer */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-xs text-gray-400 space-y-1">
                <p className="font-semibold text-gray-500">Terms & Conditions</p>
                <p>• Prices are subject to availability at the time of booking.</p>
                <p>• This is an indicative package — final price confirmed on booking.</p>
                <p>• A deposit may be required to confirm the booking.</p>
              </div>

            </div>

            {/* Right: sticky Live Preview card */}
            <div className="w-80 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto hidden md:flex">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700">Package Preview</span>
                <span className="text-[10px] text-gray-400">As customer sees it</span>
              </div>
              <div className="p-4">
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                  {/* Preview image */}
                  <div className="relative h-44">
                    {pkg.Primary_Image_URL ? (
                      <img src={pkg.Primary_Image_URL} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-200 to-indigo-300 flex items-center justify-center">
                        <Package className="w-14 h-14 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white text-[10px] font-bold px-2.5 py-1 rounded-full text-gray-800 shadow">Travelzada</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-0.5">Personalized Itinerary</p>
                      <p className="text-white font-bold text-base leading-snug line-clamp-2">{title}</p>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="p-4">
                    <p className="text-xs font-bold text-gray-900 mb-3">Trip Overview</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { emoji: '🏨', label: 'Stay', val: pkg.Star_Category || '—' },
                        { emoji: '✈️', label: 'Type', val: pkg.Travel_Type || '—' },
                        { emoji: '🌙', label: 'Nights', val: String(pkg.Duration_Nights) },
                      ].map(({ emoji, label, val }) => (
                        <div key={label} className="text-center">
                          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-1 text-base">{emoji}</div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{label}</p>
                          <p className="text-[10px] font-bold text-gray-700">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Match score */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2 mb-3">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-amber-800">{pkg.matchScore}% AI Match Score</p>
                    </div>

                    {/* Price */}
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-purple-400 font-semibold uppercase">Starting from</p>
                      <p className="text-xl font-bold text-purple-700">₹{pkg.Price_Min_INR.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-purple-400">per person</p>
                    </div>

                    {/* Inclusions preview */}
                    {inclusions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-700 mb-2">Inclusions ({inclusions.length})</p>
                        <div className="space-y-1.5">
                          {inclusions.slice(0, 4).map((inc: string, i: number) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <p className="text-[10px] text-gray-600 leading-tight line-clamp-1">{inc}</p>
                            </div>
                          ))}
                          {inclusions.length > 4 && (
                            <p className="text-[10px] text-gray-400 pl-4.5">+{inclusions.length - 4} more…</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3.5 bg-white border-t border-gray-100 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const msg = buildWhatsAppMsg(pkg); window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank') }}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-green-200"
              >
                <Send className="w-4 h-4" /> Share on WhatsApp
              </button>
              <button
                onClick={() => { setShowItinerary(false); setShowPdf(true) }}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" /> Download PDF
              </button>
            </div>
            <button
              onClick={() => { setShowItinerary(false); onRequest() }}
              className="flex items-center gap-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-purple-200"
            >
              Request This Package
            </button>
          </div>
        </div>
      )}

      {/* ── PDF Modal ─────────────────────────────────────────────────────── */}
      {showPdf && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4 print:bg-white print:p-0 print:block" onClick={() => setShowPdf(false)}>
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none"
            onClick={e => e.stopPropagation()}
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-gray-900 text-sm">Package Details</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const msg = buildWhatsAppMsg(pkg)
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-green-500 text-white px-3 py-1.5 rounded-xl hover:bg-green-600 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />WhatsApp
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-purple-600 text-white px-3 py-1.5 rounded-xl hover:bg-purple-700 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />Print / Save PDF
                </button>
                <button onClick={() => setShowPdf(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable content */}
            <div className="flex-1 overflow-y-auto p-6 print:p-8 space-y-5">
              {/* Hero image */}
              {pkg.Primary_Image_URL && (
                <div className="relative h-44 rounded-2xl overflow-hidden">
                  <img src={pkg.Primary_Image_URL} alt={title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <p className="text-white font-bold text-lg leading-tight">{title}</p>
                    <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />{pkg.Destination_Name}
                    </p>
                  </div>
                </div>
              )}

              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Duration', value: `${pkg.Duration_Days}D / ${pkg.Duration_Nights}N` },
                  { label: 'Category', value: pkg.Star_Category || '—' },
                  { label: 'Travel Type', value: pkg.Travel_Type || '—' },
                  { label: 'Match', value: `${pkg.matchScore}%` },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                    <p className="font-bold text-gray-900 text-xs mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="rounded-2xl p-5 border-2 border-purple-200 bg-purple-50">
                <p className="text-xs font-bold text-purple-500 uppercase tracking-wide mb-1">Price</p>
                <p className="text-3xl font-bold text-purple-700">₹{pkg.Price_Min_INR.toLocaleString('en-IN')}</p>
                <p className="text-xs text-purple-400 mt-0.5">per person (starting from)</p>
              </div>

              {/* Why it matches */}
              {pkg.matchReason && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-indigo-600 mb-1">Why it matches you</p>
                  <p className="text-sm text-indigo-800 leading-relaxed">{pkg.matchReason}</p>
                </div>
              )}

              {/* Overview */}
              {pkg.Overview && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Overview</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{pkg.Overview}</p>
                </div>
              )}

              {/* Inclusions */}
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

              {/* Day-wise itinerary */}
              {pkg.Day_Wise_Itinerary && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Day-wise Itinerary</p>
                  <div className="space-y-1.5">
                    {String(pkg.Day_Wise_Itinerary).split('\n').filter(Boolean).map((line, i) => (
                      <div key={i} className={`text-sm ${/^day\s*\d+/i.test(line) ? 'font-semibold text-gray-900 mt-3 first:mt-0' : 'text-gray-600 pl-4'}`}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 space-y-1 border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-500">Terms & Conditions</p>
                <p>• Prices are subject to availability at the time of booking.</p>
                <p>• This is an indicative quote — final price confirmed on booking.</p>
                <p>• A deposit may be required to confirm the booking.</p>
              </div>

              <div className="text-center pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">Powered by Travelzada AI ✈️</p>
              </div>
            </div>
          </div>
        </div>
      )}
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
