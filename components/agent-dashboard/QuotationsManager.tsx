'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  MessageSquare, Search, Loader2, IndianRupee, Send,
  CheckCircle, XCircle, Clock, Package, Phone, Mail,
  MapPin, Calendar, Users, User, BookCheck, Edit3, X,
  Eye, Star, Save, ChevronDown, ChevronUp, FileEdit, Share2, FileText, Printer
} from 'lucide-react'

interface Message {
  id: string
  senderId: string
  senderRole: 'dmc' | 'travel_agent' | 'system'
  senderName: string
  text: string
  timestamp: string
}

interface PackageData {
  id: string
  title: string
  destination: string
  destinationCountry?: string
  overview?: string
  durationDays?: number
  durationNights?: number
  pricePerPerson?: number
  maxGroupSize?: number
  minGroupSize?: number
  travelType?: string
  theme?: string
  mood?: string
  starCategory?: string
  inclusions?: string[]
  exclusions?: string[]
  highlights?: string[]
  dayWiseItinerary?: string
  primaryImageUrl?: string
  seasonalAvailability?: string
}

interface Quotation {
  id: string
  subAgentId: string
  subAgentName: string
  packageId?: string
  packageTitle: string
  destination: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  preferredDates?: string
  groupSize: number
  adults: number
  kids: number
  rooms?: number
  specialRequests?: string
  status: string
  quotedPrice?: number | null
  agentNotes?: string
  customPackageData?: PackageData | null
  messages: Message[]
  createdAt?: { seconds: number }
  updatedAt?: { seconds: number }
}

interface Props {
  agentId: string
  agentSlug: string
  agentName: string
  currentUserId: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:       { label: 'Pending',       color: 'bg-gray-100 text-gray-600',    icon: Clock },
  in_discussion: { label: 'In Discussion', color: 'bg-blue-100 text-blue-700',    icon: MessageSquare },
  quoted:        { label: 'Quoted',        color: 'bg-amber-100 text-amber-700',  icon: IndianRupee },
  accepted:      { label: 'Accepted',      color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:      { label: 'Rejected',      color: 'bg-red-100 text-red-700',      icon: XCircle },
  converted:     { label: 'Booked ✓',      color: 'bg-purple-100 text-purple-700', icon: BookCheck },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  return isToday
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(ts?: { seconds: number }) {
  if (!ts) return ''
  return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function QuotationsManager({ agentId, agentSlug, agentName, currentUserId }: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [pdfQuot, setPdfQuot] = useState<Quotation | null>(null)
  // Price editing
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  // Booking conversion
  const [converting, setConverting] = useState(false)
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set())
  // Package view / customize
  const [viewPkg, setViewPkg] = useState<PackageData | null>(null)
  const [loadingPkg, setLoadingPkg] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [customForm, setCustomForm] = useState<Partial<PackageData>>({})
  const [savingCustom, setSavingCustom] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── View full package details ────────────────────────────────────────────────
  async function fetchAndViewPackage(q: Quotation) {
    // If quotation has customPackageData already, show that; otherwise fetch real package
    if (q.customPackageData) { setViewPkg(q.customPackageData); return }
    if (!q.packageId) {
      // No packageId — build a minimal view from quotation fields
      setViewPkg({ id: '', title: q.packageTitle, destination: q.destination })
      return
    }
    setLoadingPkg(true)
    try {
      const res = await fetch(`/api/agent/packages/${q.packageId}`)
      const data = await res.json()
      if (data.success && data.package) setViewPkg(data.package)
      else setViewPkg({ id: q.packageId, title: q.packageTitle, destination: q.destination })
    } catch { setViewPkg({ id: q.packageId || '', title: q.packageTitle, destination: q.destination }) }
    finally { setLoadingPkg(false) }
  }

  // ── Open customize form ──────────────────────────────────────────────────────
  async function openCustomize(q: Quotation) {
    setShowCustomize(true)
    if (q.customPackageData) { setCustomForm(q.customPackageData); return }
    if (!q.packageId) { setCustomForm({ title: q.packageTitle, destination: q.destination }); return }
    setLoadingPkg(true)
    try {
      const res = await fetch(`/api/agent/packages/${q.packageId}`)
      const data = await res.json()
      if (data.success && data.package) setCustomForm(data.package)
      else setCustomForm({ title: q.packageTitle, destination: q.destination })
    } catch { setCustomForm({ title: q.packageTitle, destination: q.destination }) }
    finally { setLoadingPkg(false) }
  }

  // ── Save custom package data to quotation ────────────────────────────────────
  async function saveCustomPackage() {
    if (!activeId) return
    setSavingCustom(true)
    try {
      await fetch(`/api/agent/quotations/${activeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPackageData: customForm }),
      })
      setQuotations(prev => prev.map(q => q.id === activeId ? { ...q, customPackageData: customForm as PackageData } : q))
      setShowCustomize(false)
    } catch { }
    finally { setSavingCustom(false) }
  }

  const fetchQuotations = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/quotations?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) {
        setQuotations(data.quotations.map((q: any) => ({ ...q, messages: q.messages || [] })))
      }
    } catch { } finally { setLoading(false) }
  }, [agentId])

  useEffect(() => { fetchQuotations() }, [fetchQuotations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, quotations])

  // Reset package states when switching quotations
  useEffect(() => {
    setShowCustomize(false)
    setViewPkg(null)
  }, [activeId])

  const active = quotations.find(q => q.id === activeId) || null

  // ── Send message ────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!messageText.trim() || !activeId) return
    setSending(true)
    const res = await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'message', senderId: currentUserId, senderRole: 'dmc',
        senderName: agentName, text: messageText.trim(),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setQuotations(prev => prev.map(q => q.id === activeId
        ? { ...q, messages: [...q.messages, data.message], status: q.status === 'pending' ? 'in_discussion' : q.status }
        : q
      ))
      setMessageText('')
    }
    setSending(false)
  }

  // ── Set / update quoted price ────────────────────────────────────────────────
  async function savePrice() {
    if (!activeId || !priceInput) return
    const newPrice = Number(priceInput)
    if (isNaN(newPrice) || newPrice <= 0) return
    setSavingPrice(true)

    const currentPrice = active?.quotedPrice
    const isUpdate = currentPrice && currentPrice !== newPrice

    // Save price + status → quoted
    await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotedPrice: newPrice, status: 'quoted' }),
    })

    // Auto-send a chat notification so travel agent sees the change
    const msgText = isUpdate
      ? `💰 Quote updated: ₹${newPrice.toLocaleString('en-IN')} (was ₹${currentPrice!.toLocaleString('en-IN')})`
      : `💰 Quote set: ₹${newPrice.toLocaleString('en-IN')} for ${active?.packageTitle}`

    const msgRes = await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'message', senderId: currentUserId, senderRole: 'dmc',
        senderName: agentName, text: msgText,
      }),
    })
    const msgData = await msgRes.json()

    setQuotations(prev => prev.map(q => {
      if (q.id !== activeId) return q
      return {
        ...q,
        quotedPrice: newPrice,
        status: 'quoted',
        messages: msgData.success ? [...q.messages, msgData.message] : q.messages,
      }
    }))
    setEditingPrice(false)
    setSavingPrice(false)
  }

  // ── Update status only ───────────────────────────────────────────────────────
  async function updateStatus(status: string) {
    if (!activeId) return
    await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setQuotations(prev => prev.map(q => q.id === activeId ? { ...q, status } : q))
  }

  // ── Convert quotation → booking ──────────────────────────────────────────────
  async function convertToBooking() {
    if (!active || converting) return
    setConverting(true)
    try {
      const res = await fetch('/api/agent/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          agentSlug,
          packageTitle: active.packageTitle,
          destination: active.destination,
          customerName: active.customerName,
          customerEmail: active.customerEmail || '',
          customerPhone: active.customerPhone || '',
          preferredDates: active.preferredDates || '',
          groupSize: active.groupSize || 1,
          adults: active.adults || 1,
          kids: active.kids || 0,
          rooms: active.rooms || 1,
          specialRequests: active.specialRequests || '',
          subAgentId: active.subAgentId,
          bookingValue: active.quotedPrice || null,
        }),
      })
      const bookingData = await res.json()
      if (!res.ok) throw new Error(bookingData.error || 'Failed to create booking')

      // Mark quotation as converted + send system message
      await fetch(`/api/agent/quotations/${active.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'converted' }),
      })
      const msgRes = await fetch(`/api/agent/quotations/${active.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message', senderId: currentUserId, senderRole: 'dmc',
          senderName: agentName,
          text: `✅ Booking confirmed! This quotation has been converted to a booking${active.quotedPrice ? ` for ₹${active.quotedPrice.toLocaleString('en-IN')}` : ''}.`,
        }),
      })
      const msgData = await msgRes.json()

      setConvertedIds(prev => new Set([...prev, active.id]))
      setQuotations(prev => prev.map(q => {
        if (q.id !== active.id) return q
        return {
          ...q,
          status: 'converted',
          messages: msgData.success ? [...q.messages, msgData.message] : q.messages,
        }
      }))
    } catch (err: any) {
      alert('Failed to create booking: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  // ── WhatsApp quotation share ─────────────────────────────────────────────────
  function shareOnWhatsApp(q: Quotation) {
    const price = q.quotedPrice ? `₹${Number(q.quotedPrice).toLocaleString('en-IN')}` : 'To be confirmed'
    const lines = [
      `🌍 *Travel Quotation*`,
      ``,
      `Hello ${q.customerName},`,
      ``,
      `Here is your travel quotation from *${agentName}*:`,
      ``,
      `📦 *Package:* ${q.packageTitle}`,
      `📍 *Destination:* ${q.destination}`,
      `👥 *Travellers:* ${q.groupSize} pax (${q.adults} adults${q.kids ? `, ${q.kids} kids` : ''})`,
      q.preferredDates ? `📅 *Dates:* ${q.preferredDates}` : null,
      ``,
      `💰 *Quoted Price:* ${price}`,
      ``,
      q.specialRequests ? `📝 *Special Notes:* ${q.specialRequests}\n` : null,
      `For more details or to confirm your booking, please reply to this message.`,
      ``,
      `Thank you for choosing *${agentName}* ✈️`,
    ].filter(Boolean).join('\n')

    const phone = q.customerPhone?.replace(/\D/g, '')
    const encoded = encodeURIComponent(lines)
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const countByStatus = quotations.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const filtered = quotations.filter(q => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false
    if (search) {
      const s = search.toLowerCase()
      return q.customerName?.toLowerCase().includes(s) ||
        q.subAgentName?.toLowerCase().includes(s) ||
        q.destination?.toLowerCase().includes(s) ||
        q.packageTitle?.toLowerCase().includes(s)
    }
    return true
  })

  const isClosed = active && ['converted', 'rejected'].includes(active.status)

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <>
    <div className="flex gap-5 h-[calc(100vh-160px)] min-h-[600px]">

      {/* ── LEFT — quotation list ─────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="mb-3">
          <h2 className="text-xl font-bold text-gray-900">Quotations</h2>
          <p className="text-sm text-gray-500 mt-0.5">{quotations.length} total</p>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search quotations…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${filterStatus === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
            All ({quotations.length})
          </button>
          {Object.keys(STATUS_CONFIG).map(s => (countByStatus[s] || 0) > 0 ? (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-primary text-white' : STATUS_CONFIG[s].color}`}>
              {STATUS_CONFIG[s].label} ({countByStatus[s]})
            </button>
          ) : null)}
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No quotations found</div>
          ) : filtered.map(q => {
            const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending
            const isConverted = q.status === 'converted'
            return (
              <button key={q.id}
                onClick={() => { setActiveId(q.id); setEditingPrice(false); setPriceInput(String(q.quotedPrice || '')) }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                  activeId === q.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{q.customerName}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${cfg.color}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{q.packageTitle}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-400 truncate">via {q.subAgentName || 'Agent'}</span>
                  {q.quotedPrice ? (
                    <span className={`text-xs font-bold ${isConverted ? 'text-purple-700' : 'text-emerald-700'}`}>
                      ₹{Number(q.quotedPrice).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">{formatDate(q.createdAt)}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT — detail + chat ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-10 h-10 mb-3" />
            <p className="font-medium">Select a quotation to view details and messages</p>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{active.customerName}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_CONFIG[active.status]?.color || ''}`}>
                      {STATUS_CONFIG[active.status]?.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />{active.packageTitle}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{active.destination}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{active.groupSize} pax</span>
                    {active.preferredDates && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{active.preferredDates}</span>}
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />via {active.subAgentName}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  {active.customerEmail && (
                    <a href={`mailto:${active.customerEmail}`}
                      className="flex items-center gap-1 text-xs border border-gray-200 bg-white text-gray-600 px-2.5 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors">
                      <Mail className="w-3 h-3" />Email
                    </a>
                  )}
                  {active.customerPhone && (
                    <a href={`https://wa.me/${active.customerPhone.replace(/\D/g, '')}`} target="_blank"
                      className="flex items-center gap-1 text-xs border border-green-200 bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                      WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => shareOnWhatsApp(active)}
                    className="flex items-center gap-1 text-xs border border-green-300 bg-green-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    title="Share quotation via WhatsApp"
                  >
                    <Share2 className="w-3 h-3" />Share Quote
                  </button>
                  <button
                    onClick={() => setPdfQuot(active)}
                    className="flex items-center gap-1 text-xs border border-primary bg-primary text-white px-2.5 py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                    title="Generate printable quotation"
                  >
                    <FileText className="w-3 h-3" />PDF
                  </button>
                  <button
                    onClick={() => fetchAndViewPackage(active)}
                    disabled={loadingPkg}
                    className="flex items-center gap-1 text-xs border border-indigo-200 bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="View full package details"
                  >
                    {loadingPkg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    {active.customPackageData ? 'View Custom' : 'View Package'}
                  </button>
                  {!isClosed && (
                    <button
                      onClick={() => openCustomize(active)}
                      className="flex items-center gap-1 text-xs border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                      title="Customize package for this quote only"
                    >
                      <FileEdit className="w-3 h-3" />
                      {active.customPackageData ? 'Edit Custom' : 'Customize Package'}
                    </button>
                  )}
                  {active.customPackageData && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full self-center">
                      Customized
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Controls row (price + status + book button) ── */}
            <div className="px-5 py-3 border-b border-gray-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-4 flex-wrap">

                {/* ── Quoted price block ── */}
                <div className="flex items-center gap-3">
                  {active.quotedPrice && !editingPrice ? (
                    // Price is set — show it prominently
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-emerald-600" />
                        <span className="text-lg font-bold text-emerald-700">
                          {Number(active.quotedPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium">quoted</span>
                      </div>
                      {!isClosed && (
                        <button onClick={() => { setEditingPrice(true); setPriceInput(String(active.quotedPrice || '')) }}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit price">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : !isClosed ? (
                    // No price yet OR editing — show input
                    <div className="flex items-center gap-2">
                      {editingPrice && (
                        <button onClick={() => setEditingPrice(false)} className="p-1 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {editingPrice ? 'Update price (₹)' : 'Set quote price (₹)'}
                      </label>
                      <div className="relative">
                        <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') savePrice() }}
                          placeholder="e.g. 58000"
                          className="pl-7 pr-3 py-1.5 w-32 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <button onClick={savePrice} disabled={savingPrice || !priceInput}
                        className="text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap">
                        {savingPrice ? 'Saving…' : editingPrice ? 'Update' : 'Set & Notify'}
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* ── Status buttons + Convert to Booking ── */}
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {!isClosed && ['in_discussion', 'accepted', 'rejected'].map(s => (
                    <button key={s} disabled={active.status === s}
                      onClick={() => updateStatus(s)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
                        active.status === s
                          ? `${STATUS_CONFIG[s]?.color || ''} border-transparent`
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}>
                      {STATUS_CONFIG[s]?.label}
                    </button>
                  ))}

                  {/* ── Convert to Booking button ── */}
                  {active.status !== 'converted' && active.status !== 'rejected' && (
                    <button
                      onClick={convertToBooking}
                      disabled={converting}
                      className="flex items-center gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3.5 py-1.5 rounded-xl transition-colors ml-1"
                    >
                      {converting
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Converting…</>
                        : <><BookCheck className="w-3.5 h-3.5" />Mark as Booked</>
                      }
                    </button>
                  )}

                  {/* Booked badge */}
                  {active.status === 'converted' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-purple-100 text-purple-700 px-3.5 py-1.5 rounded-xl">
                      <BookCheck className="w-3.5 h-3.5" />Booked ✓
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Customize Package Panel ── */}
            {showCustomize && (
              <div className="border-b border-amber-200 bg-amber-50 flex-shrink-0">
                <div className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-bold text-amber-800">Customize Package for This Quote</span>
                    <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Not saved to real package</span>
                  </div>
                  <button onClick={() => setShowCustomize(false)} className="text-amber-500 hover:text-amber-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-5 pb-4 space-y-3 max-h-[380px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Package Title</label>
                      <input value={customForm.title || ''} onChange={e => setCustomForm(p => ({ ...p, title: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Duration</label>
                      <div className="flex gap-2">
                        <input type="number" placeholder="Days" value={customForm.durationDays || ''} onChange={e => setCustomForm(p => ({ ...p, durationDays: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        <input type="number" placeholder="Nights" value={customForm.durationNights || ''} onChange={e => setCustomForm(p => ({ ...p, durationNights: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Price per Person (₹)</label>
                      <input type="number" value={customForm.pricePerPerson || ''} onChange={e => setCustomForm(p => ({ ...p, pricePerPerson: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Overview</label>
                      <textarea rows={2} value={customForm.overview || ''} onChange={e => setCustomForm(p => ({ ...p, overview: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Inclusions (one per line)</label>
                      <textarea rows={3} value={Array.isArray(customForm.inclusions) ? customForm.inclusions.join('\n') : (customForm.inclusions || '')}
                        onChange={e => setCustomForm(p => ({ ...p, inclusions: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Exclusions (one per line)</label>
                      <textarea rows={3} value={Array.isArray(customForm.exclusions) ? customForm.exclusions.join('\n') : (customForm.exclusions || '')}
                        onChange={e => setCustomForm(p => ({ ...p, exclusions: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Highlights (one per line)</label>
                      <textarea rows={2} value={Array.isArray(customForm.highlights) ? customForm.highlights.join('\n') : (customForm.highlights || '')}
                        onChange={e => setCustomForm(p => ({ ...p, highlights: e.target.value.split('\n').filter(Boolean) }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Day-Wise Itinerary</label>
                      <textarea rows={4} value={customForm.dayWiseItinerary || ''} onChange={e => setCustomForm(p => ({ ...p, dayWiseItinerary: e.target.value }))}
                        placeholder="Day 1: Arrive…&#10;Day 2: Explore…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowCustomize(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50">Cancel</button>
                    <button onClick={saveCustomPackage} disabled={savingCustom}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold disabled:opacity-60">
                      {savingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Custom Package
                    </button>
                    <button onClick={() => { saveCustomPackage().then(() => setViewPkg(customForm as PackageData)) }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
                      <Eye className="w-3.5 h-3.5" />Save & Preview
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {active.specialRequests && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  <p className="text-xs font-semibold mb-1">Customer Notes / Special Requests</p>
                  {active.specialRequests}
                </div>
              )}

              {active.messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  No messages yet. Start the conversation below.
                </div>
              ) : (
                active.messages.map(msg => {
                  // System / price-update messages
                  if (msg.senderRole === 'system' || msg.text.startsWith('💰') || msg.text.startsWith('✅')) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full">
                          {msg.text} · {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )
                  }
                  const isDmc = msg.senderRole === 'dmc'
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isDmc ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDmc ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {msg.senderName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className={`max-w-[72%] flex flex-col ${isDmc ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${isDmc ? 'bg-primary text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 px-1">
                          {msg.senderName} · {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Message input ── */}
            {!isClosed ? (
              <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-2">
                  <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    rows={2} placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button onClick={sendMessage} disabled={sending || !messageText.trim()}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 self-end">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400 flex-shrink-0">
                {active.status === 'converted'
                  ? '✅ This quotation has been converted to a booking.'
                  : '❌ This quotation has been rejected.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {/* ── Package View Modal ──────────────────────────────────────────────────── */}
    {viewPkg && (
      <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-500" />
              <span className="font-bold text-gray-900 text-sm">Package Details</span>
              {active?.customPackageData && (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Custom for this quote</span>
              )}
            </div>
            <button onClick={() => setViewPkg(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {viewPkg.primaryImageUrl ? (
            <div className="relative h-52 w-full overflow-hidden">
              <img src={viewPkg.primaryImageUrl} alt={viewPkg.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <h2 className="text-2xl font-bold text-white">{viewPkg.title}</h2>
                <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />{viewPkg.destination}{viewPkg.destinationCountry ? `, ${viewPkg.destinationCountry}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col items-center justify-center">
              <Package className="w-8 h-8 text-purple-300 mb-2" />
              <h2 className="text-xl font-bold text-gray-800">{viewPkg.title}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />{viewPkg.destination}
              </p>
            </div>
          )}

          {/* Key stats */}
          {(viewPkg.durationDays || viewPkg.starCategory || viewPkg.travelType) && (
            <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
              {[
                { label: 'Duration', value: viewPkg.durationNights ? `${viewPkg.durationNights}N/${viewPkg.durationDays}D` : viewPkg.durationDays ? `${viewPkg.durationDays} Days` : '—' },
                { label: 'Category', value: viewPkg.starCategory || '—' },
                { label: 'Type', value: viewPkg.travelType || '—' },
                { label: 'Season', value: viewPkg.seasonalAvailability || 'Year Round' },
              ].map(({ label, value }) => (
                <div key={label} className="px-3 py-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="p-6 space-y-5">
            {viewPkg.pricePerPerson ? (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-500">Starting from</p>
                  <p className="text-2xl font-bold text-purple-700">₹{viewPkg.pricePerPerson.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-purple-400">per person</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {viewPkg.theme && <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{viewPkg.theme}</span>}
                  {viewPkg.mood && <span className="bg-pink-100 text-pink-700 text-xs font-semibold px-2.5 py-1 rounded-full">{viewPkg.mood}</span>}
                </div>
              </div>
            ) : null}

            {viewPkg.overview && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1.5">Overview</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{viewPkg.overview}</p>
              </div>
            )}

            {Array.isArray(viewPkg.highlights) && viewPkg.highlights.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Highlights</h4>
                <ul className="space-y-1.5">
                  {viewPkg.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-purple-400 mt-0.5">✦</span>{h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(Array.isArray(viewPkg.inclusions) && viewPkg.inclusions.length > 0 ||
              Array.isArray(viewPkg.exclusions) && viewPkg.exclusions.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {Array.isArray(viewPkg.inclusions) && viewPkg.inclusions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-green-700 mb-2">✓ Inclusions</h4>
                    <ul className="space-y-1">
                      {viewPkg.inclusions.map((inc, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">•</span>{inc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(viewPkg.exclusions) && viewPkg.exclusions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-red-600 mb-2">✗ Exclusions</h4>
                    <ul className="space-y-1">
                      {viewPkg.exclusions.map((exc, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5">•</span>{exc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {viewPkg.dayWiseItinerary && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Day-Wise Itinerary</h4>
                <div className="space-y-1.5">
                  {viewPkg.dayWiseItinerary.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className={`text-sm ${line.toLowerCase().startsWith('day') ? 'font-semibold text-gray-900 mt-3 first:mt-0' : 'text-gray-600 pl-4'}`}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {active?.customPackageData
                ? 'This is the customized version for this quotation only.'
                : 'This is the original package from your Package Manager.'}
            </p>
            {!isClosed && (
              <button onClick={() => { setViewPkg(null); openCustomize(active!) }}
                className="flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
                <FileEdit className="w-3.5 h-3.5" />Customize for this Quote
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── Quotation PDF Modal ────────────────────────────────────────────────── */}
    {pdfQuot && (
      <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-bold text-gray-900">Quotation Preview</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => shareOnWhatsApp(pdfQuot)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-green-500 text-white px-3 py-1.5 rounded-xl hover:bg-green-600 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />WhatsApp
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />Print / PDF
              </button>
              <button onClick={() => setPdfQuot(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable content */}
          <div className="flex-1 overflow-y-auto p-6 print:p-8 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Travel Quotation</h1>
                <p className="text-sm text-gray-400 mt-0.5">Ref: {pdfQuot.id.slice(-8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Date</p>
                <p className="text-sm font-semibold text-gray-700">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-xs text-gray-400 mt-1">Prepared by</p>
                <p className="text-sm font-semibold text-gray-700">{agentName}</p>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Prepared For</p>
              <p className="text-lg font-bold text-gray-900">{pdfQuot.customerName}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
                {pdfQuot.customerEmail && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{pdfQuot.customerEmail}</span>}
                {pdfQuot.customerPhone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{pdfQuot.customerPhone}</span>}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Package Details</p>
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-primary/5 px-5 py-4 border-b border-gray-200">
                  <p className="font-bold text-gray-900 text-base">{pdfQuot.packageTitle}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{pdfQuot.destination}</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200">
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">Travellers</p>
                    <p className="font-semibold text-gray-800 text-sm">{pdfQuot.groupSize || 1} pax ({pdfQuot.adults}A{pdfQuot.kids ? `, ${pdfQuot.kids}K` : ''})</p>
                  </div>
                  {pdfQuot.preferredDates && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Travel Dates</p>
                      <p className="font-semibold text-gray-800 text-sm">{pdfQuot.preferredDates}</p>
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">Agent</p>
                    <p className="font-semibold text-gray-800 text-sm truncate">{pdfQuot.subAgentName || agentName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl p-5 border-2 ${pdfQuot.quotedPrice ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${pdfQuot.quotedPrice ? 'text-emerald-600' : 'text-amber-600'}`}>
                {pdfQuot.quotedPrice ? 'Quoted Price' : 'Price'}
              </p>
              {pdfQuot.quotedPrice ? (
                <div>
                  <p className="text-3xl font-bold text-emerald-700">₹{Number(pdfQuot.quotedPrice).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Total for {pdfQuot.groupSize || 1} traveller{(pdfQuot.groupSize || 1) !== 1 ? 's' : ''}</p>
                </div>
              ) : (
                <p className="text-base font-semibold text-amber-700">To be confirmed</p>
              )}
            </div>

            {pdfQuot.specialRequests && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Special Requests</p>
                <p className="text-sm text-gray-700">{pdfQuot.specialRequests}</p>
              </div>
            )}

            <div className="text-xs text-gray-400 space-y-1 border-t border-gray-100 pt-4">
              <p className="font-semibold text-gray-500">Terms & Conditions</p>
              <p>• This quotation is valid for 7 days from the date of issue.</p>
              <p>• Prices are subject to availability at the time of booking.</p>
              <p>• A deposit may be required to confirm the booking.</p>
              <p>• For queries, please contact us directly.</p>
            </div>

            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">Thank you for choosing {agentName} for your travel needs ✈️</p>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
