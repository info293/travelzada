'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Mail, Phone, Calendar, Users, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
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

export default function BookingInbox({ agentId }: Props) {
  const [bookings, setBookings] = useState<AgentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agent/bookings?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) {
        // Sort newest first client-side (avoids Firestore composite index requirement)
        const sorted = (data.bookings as any[]).sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0
          const bTime = b.createdAt?.seconds || 0
          return bTime - aTime
        })
        setBookings(sorted)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  async function updateStatus(bookingId: string, status: string) {
    setUpdatingId(bookingId)
    try {
      await fetch('/api/agent/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, agentId, status }),
      })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: status as any } : b))
    } finally {
      setUpdatingId(null)
    }
  }

  async function saveNotes(bookingId: string, agentNotes: string) {
    await fetch('/api/agent/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, agentId, agentNotes }),
    })
  }

  const filtered = filterStatus === 'all'
    ? bookings
    : bookings.filter(b => b.status === filterStatus)

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Booking Inbox</h2>
          <p className="text-sm text-gray-500">{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${filterStatus === s ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No bookings yet</p>
          <p className="text-sm text-gray-400 mt-1">Share your planner URL to start receiving bookings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => (
            <div key={booking.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Summary row */}
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{booking.customerName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                      {booking.status}
                    </span>
                    {booking.status === 'new' && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full animate-pulse">New</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {booking.packageTitle} · {booking.preferredDates || 'Flexible dates'}
                    {booking.groupSize ? ` · ${booking.groupSize} travellers` : ''}
                  </p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {booking.createdAt?.toDate
                    ? booking.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : ''}
                </p>
                <button
                  onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                  className="p-1 text-gray-400 hover:text-gray-700"
                >
                  {expandedId === booking.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Expanded detail */}
              {expandedId === booking.id && (
                <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${booking.customerEmail}`} className="hover:text-purple-600">{booking.customerEmail}</a>
                    </div>
                    {booking.customerPhone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${booking.customerPhone}`} className="hover:text-purple-600">{booking.customerPhone}</a>
                      </div>
                    )}
                    {booking.preferredDates && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {booking.preferredDates}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4 text-gray-400" />
                      {booking.adults} adult{booking.adults !== 1 ? 's' : ''}{booking.kids ? `, ${booking.kids} kid${booking.kids !== 1 ? 's' : ''}` : ''} · {booking.rooms} room{booking.rooms !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {booking.specialRequests && (
                    <div className="bg-white rounded-xl p-3 border border-gray-200 text-sm text-gray-700">
                      <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Special Requests</p>
                      {booking.specialRequests}
                    </div>
                  )}

                  {/* Status selector */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Update Status:</span>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          disabled={booking.status === s || updatingId === booking.id}
                          onClick={() => updateStatus(booking.id, s)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${booking.status === s ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-400 hover:text-purple-600'} disabled:opacity-50`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Agent notes */}
                  <AgentNotesEditor
                    bookingId={booking.id}
                    initialNotes={booking.agentNotes || ''}
                    onSave={saveNotes}
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

function AgentNotesEditor({
  bookingId,
  initialNotes,
  onSave,
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
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your Notes</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        placeholder="Add private notes about this booking..."
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-1 text-xs text-purple-600 font-semibold hover:underline disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save notes'}
      </button>
    </div>
  )
}
