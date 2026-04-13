'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Mail, Phone, Calendar, Users, MessageSquare,
  ChevronDown, ChevronUp, Download, IndianRupee, User,
  MessageCircle, MapPin, Tag
} from 'lucide-react'
import { AgentBooking } from '@/lib/types/agent'

interface Props {
  agentId: string
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-600',
}

const STATUS_OPTIONS = ['new', 'contacted', 'confirmed', 'cancelled', 'completed']

function formatDate(ts: any) {
  if (!ts) return ''
  const d = ts.seconds ? new Date(ts.seconds * 1000) : ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BookingInbox({ agentId }: Props) {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agent/bookings?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) {
        const sorted = (data.bookings as any[]).sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        )
        setBookings(sorted)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  async function updateBooking(bookingId: string, updates: Record<string, any>) {
    setUpdatingId(bookingId)
    try {
      await fetch('/api/agent/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, agentId, ...updates }),
      })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updates } : b))
    } finally {
      setUpdatingId(null)
    }
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Customer', 'Email', 'Phone', 'Package', 'Destination', 'Status', 'Booking Value', 'Adults', 'Kids', 'Dates', 'Sub-Agent'],
      ...filtered.map(b => [
        formatDate(b.createdAt),
        b.customerName,
        b.customerEmail,
        b.customerPhone || '',
        b.packageTitle,
        b.destination || '',
        b.status,
        b.bookingValue || '',
        b.adults || '',
        b.kids || '',
        b.preferredDates || '',
        b.subAgentId || '',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Count per status
  const countByStatus = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const filtered = bookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        b.customerName?.toLowerCase().includes(s) ||
        b.customerEmail?.toLowerCase().includes(s) ||
        b.packageTitle?.toLowerCase().includes(s) ||
        b.destination?.toLowerCase().includes(s)
      )
    }
    return true
  })

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Booking Inbox</h2>
          <p className="text-sm text-gray-500">{filtered.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-40"
          />
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 bg-white text-gray-600 px-3 py-2 rounded-xl hover:border-gray-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Status filters with counts */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({bookings.length})
        </button>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${filterStatus === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s} {countByStatus[s] ? `(${countByStatus[s]})` : '(0)'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">Share your planner URL to start receiving bookings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => (
            <div key={booking.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Summary row */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {booking.customerName?.charAt(0)?.toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{booking.customerName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                      {booking.status}
                      {booking.status === 'new' && <span className="ml-1 inline-block w-1.5 h-1.5 bg-blue-500 rounded-full align-middle animate-pulse" />}
                    </span>
                    {booking.subAgentId && (
                      <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        <User className="w-3 h-3" />
                        Team
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {booking.packageTitle}
                    {booking.destination ? ` · ${booking.destination}` : ''}
                    {booking.groupSize ? ` · ${booking.groupSize} pax` : ''}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 space-y-0.5">
                  {booking.bookingValue ? (
                    <p className="text-sm font-bold text-gray-900">₹{Number(booking.bookingValue).toLocaleString('en-IN')}</p>
                  ) : (
                    <p className="text-xs text-gray-400">No value set</p>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(booking.createdAt)}</p>
                </div>

                {expandedId === booking.id
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </div>

              {/* Expanded detail */}
              {expandedId === booking.id && (
                <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/50">
                  {/* Contact info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <a href={`mailto:${booking.customerEmail}`} className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {booking.customerEmail}
                    </a>
                    {booking.customerPhone && (
                      <a href={`tel:${booking.customerPhone}`} className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {booking.customerPhone}
                      </a>
                    )}
                    {booking.customerPhone && (
                      <a
                        href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        className="flex items-center gap-2 text-green-700 hover:text-green-800 font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 flex-shrink-0" />
                        WhatsApp
                      </a>
                    )}
                    {booking.preferredDates && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {booking.preferredDates}
                      </div>
                    )}
                    {booking.destination && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {booking.destination}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {booking.adults || 1} adult{(booking.adults || 1) !== 1 ? 's' : ''}
                      {booking.kids ? `, ${booking.kids} kid${booking.kids !== 1 ? 's' : ''}` : ''}
                      {' · '}{booking.rooms || 1} room{(booking.rooms || 1) !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {booking.specialRequests && (
                    <div className="bg-white rounded-xl p-3 border border-gray-200 text-sm text-gray-700">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Special Requests</p>
                      {booking.specialRequests}
                    </div>
                  )}

                  {/* Booking value + commission */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Booking Value (₹)
                      </label>
                      <BookingValueEditor
                        bookingId={booking.id}
                        initial={booking.bookingValue || ''}
                        onSave={(val) => updateBooking(booking.id, { bookingValue: Number(val) })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Commission Amount (₹)
                      </label>
                      <BookingValueEditor
                        bookingId={`comm-${booking.id}`}
                        initial={booking.commissionAmount || ''}
                        onSave={(val) => updateBooking(booking.id, { commissionAmount: Number(val) })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Status selector */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Update Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          disabled={booking.status === s || updatingId === booking.id}
                          onClick={() => updateBooking(booking.id, { status: s })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                            booking.status === s
                              ? 'bg-primary text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                          } disabled:opacity-50`}
                        >
                          {s}
                        </button>
                      ))}
                      {updatingId === booking.id && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                    </div>
                  </div>

                  {/* Agent notes */}
                  <AgentNotesEditor
                    bookingId={booking.id}
                    initialNotes={booking.agentNotes || ''}
                    onSave={(id, notes) => updateBooking(id, { agentNotes: notes })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BookingValueEditor({
  bookingId, initial, onSave, placeholder = 'Enter amount',
}: {
  bookingId: string
  initial: number | string
  onSave: (val: string) => Promise<void>
  placeholder?: string
}) {
  const [value, setValue] = useState(String(initial || ''))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleBlur() {
    if (String(value) === String(initial)) return
    setSaving(true)
    await onSave(value)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="relative">
      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      {saving && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400" />}
      {saved && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-semibold">Saved</span>}
    </div>
  )
}

function AgentNotesEditor({
  bookingId, initialNotes, onSave,
}: {
  bookingId: string
  initialNotes: string
  onSave: (id: string, notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(bookingId, notes)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Private Notes</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        placeholder="Add internal notes about this booking (not visible to customer)…"
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save notes'}
      </button>
    </div>
  )
}
