'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, Loader2, ChevronDown, ChevronUp,
  User, MapPin, Calendar, Users, IndianRupee, Send,
  CheckCircle, XCircle, Clock, ArrowRight, Package, Phone, Mail
} from 'lucide-react'

interface Message {
  id: string
  senderId: string
  senderRole: 'dmc' | 'travel_agent'
  senderName: string
  text: string
  timestamp: string
}

interface Quotation {
  id: string
  subAgentId: string
  subAgentName: string
  packageTitle: string
  destination: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  preferredDates?: string
  groupSize: number
  adults: number
  kids: number
  specialRequests?: string
  status: string
  quotedPrice?: number | null
  agentNotes?: string
  messages: Message[]
  createdAt?: { seconds: number }
  updatedAt?: { seconds: number }
}

interface Props {
  agentId: string
  agentName: string
  currentUserId: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:       { label: 'Pending',       color: 'bg-gray-100 text-gray-600',   icon: Clock },
  in_discussion: { label: 'In Discussion', color: 'bg-blue-100 text-blue-700',   icon: MessageSquare },
  quoted:        { label: 'Quoted',        color: 'bg-amber-100 text-amber-700', icon: IndianRupee },
  accepted:      { label: 'Accepted',      color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected:      { label: 'Rejected',      color: 'bg-red-100 text-red-700',     icon: XCircle },
  converted:     { label: 'Converted',     color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
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

export default function QuotationsManager({ agentId, agentName, currentUserId }: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [quotedPrice, setQuotedPrice] = useState<string>('')
  const [savingPrice, setSavingPrice] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchQuotations = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/quotations?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) setQuotations(data.quotations)
    } catch { } finally { setLoading(false) }
  }, [agentId])

  useEffect(() => { fetchQuotations() }, [fetchQuotations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, quotations])

  const active = quotations.find(q => q.id === activeId) || null

  async function sendMessage() {
    if (!messageText.trim() || !activeId) return
    setSending(true)
    const res = await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'message',
        senderId: currentUserId,
        senderRole: 'dmc',
        senderName: agentName,
        text: messageText.trim(),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setQuotations(prev => prev.map(q => q.id === activeId
        ? { ...q, messages: [...(q.messages || []), data.message], status: q.status === 'pending' ? 'in_discussion' : q.status }
        : q
      ))
      setMessageText('')
    }
    setSending(false)
  }

  async function updateQuotedPrice() {
    if (!activeId || !quotedPrice) return
    setSavingPrice(true)
    await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotedPrice: Number(quotedPrice), status: 'quoted' }),
    })
    setQuotations(prev => prev.map(q => q.id === activeId
      ? { ...q, quotedPrice: Number(quotedPrice), status: 'quoted' }
      : q
    ))
    setSavingPrice(false)
  }

  async function updateStatus(status: string) {
    if (!activeId) return
    setSavingStatus(true)
    await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setQuotations(prev => prev.map(q => q.id === activeId ? { ...q, status } : q))
    setSavingStatus(false)
  }

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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="flex gap-5 h-[calc(100vh-160px)] min-h-[600px]">
      {/* LEFT — quotation list */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="mb-3">
          <h2 className="text-xl font-bold text-gray-900">Quotations</h2>
          <p className="text-sm text-gray-500 mt-0.5">{quotations.length} total</p>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quotations…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
            All ({quotations.length})
          </button>
          {Object.keys(STATUS_CONFIG).map(s => (
            (countByStatus[s] || 0) > 0 ? (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-primary text-white' : STATUS_CONFIG[s].color}`}>
                {STATUS_CONFIG[s].label} ({countByStatus[s]})
              </button>
            ) : null
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No quotations found</div>
          ) : filtered.map(q => {
            const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending
            const unread = (q.messages || []).filter(m => m.senderRole === 'travel_agent').length
            return (
              <button
                key={q.id}
                onClick={() => { setActiveId(q.id); setQuotedPrice(String(q.quotedPrice || '')) }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                  activeId === q.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{q.customerName}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{q.packageTitle}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <User className="w-3 h-3" />{q.subAgentName}
                  </span>
                  {q.quotedPrice ? (
                    <span className="text-xs font-bold text-emerald-700">₹{Number(q.quotedPrice).toLocaleString('en-IN')}</span>
                  ) : (
                    <span className="text-xs text-gray-400">{formatDate(q.createdAt)}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT — active quotation detail + chat */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-10 h-10 mb-3" />
            <p className="font-medium">Select a quotation to view details and messages</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{active.customerName}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_CONFIG[active.status]?.color || ''}`}>
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

                {/* Quick contact */}
                <div className="flex gap-2 flex-shrink-0">
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
                </div>
              </div>
            </div>

            {/* Controls row */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4 flex-wrap bg-white">
              {/* Quoted price */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500">Quote Price (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="number"
                    value={quotedPrice}
                    onChange={e => setQuotedPrice(e.target.value)}
                    placeholder="0"
                    className="pl-7 pr-3 py-1.5 w-32 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <button
                  onClick={updateQuotedPrice}
                  disabled={savingPrice || !quotedPrice}
                  className="text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingPrice ? 'Saving…' : 'Set Quote'}
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {['in_discussion', 'accepted', 'rejected', 'converted'].map(s => (
                  <button
                    key={s}
                    disabled={active.status === s || savingStatus}
                    onClick={() => updateStatus(s)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
                      active.status === s
                        ? `${STATUS_CONFIG[s]?.color || ''} border-transparent`
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {STATUS_CONFIG[s]?.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {active.specialRequests && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  <p className="text-xs font-semibold mb-1">Customer Special Requests</p>
                  {active.specialRequests}
                </div>
              )}

              {(!active.messages || active.messages.length === 0) ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  No messages yet. Start the conversation with your travel agent below.
                </div>
              ) : (
                active.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.senderRole === 'dmc' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      msg.senderRole === 'dmc' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {msg.senderName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className={`max-w-[72%] ${msg.senderRole === 'dmc' ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                        msg.senderRole === 'dmc'
                          ? 'bg-primary text-white rounded-tr-sm'
                          : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 px-1">
                        {msg.senderName} · {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex gap-2">
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  rows={2}
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !messageText.trim()}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 self-end"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
