'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  BookOpen, Activity, LogOut, Loader2, User, Mail, Phone,
  MapPin, Calendar, CheckCircle, Clock, XCircle, Package,
  TrendingUp, Eye, BarChart3
} from 'lucide-react'

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

type Tab = 'overview' | 'bookings' | 'activity'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: 'New', color: 'bg-blue-50 text-blue-700', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-amber-50 text-amber-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-50 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-purple-50 text-purple-700', icon: CheckCircle },
}

export default function SubAgentDashboardPage() {
  const router = useRouter()
  const {
    currentUser, isSubAgent, subAgentName, parentAgentId, parentAgentSlug,
    loading: authLoading, logout
  } = useAuth()

  const [tab, setTab] = useState<Tab>('overview')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [sessions, setSessions] = useState<SessionEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect non-sub-agents
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) router.push('/agent-login')
      else if (!isSubAgent) router.push('/')
    }
  }, [authLoading, currentUser, isSubAgent, router])

  const fetchData = useCallback(async () => {
    if (!currentUser || !parentAgentId || !parentAgentSlug) return
    setLoading(true)
    try {
      const [bookRes, sessRes] = await Promise.all([
        fetch(`/api/agent/bookings?agentId=${parentAgentId}`),
        fetch(`/api/agent/sessions?agentSlug=${parentAgentSlug}&subAgentId=${currentUser.uid}`),
      ])

      const bookData = await bookRes.json()
      const sessData = await sessRes.json()

      if (bookData.success) {
        // Only show bookings attributed to this sub-agent
        const myBookings = bookData.bookings.filter(
          (b: any) => b.subAgentId === currentUser.uid
        )
        myBookings.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setBookings(myBookings)
      }

      if (sessData.success) {
        setSessions(sessData.sessions)
      }
    } catch { } finally {
      setLoading(false)
    }
  }, [currentUser, parentAgentId, parentAgentSlug])

  useEffect(() => {
    if (!authLoading && currentUser && isSubAgent) {
      fetchData()
    }
  }, [authLoading, currentUser, isSubAgent, fetchData])

  async function handleLogout() {
    await logout()
    router.push('/agent-login')
  }

  function formatDate(ts?: { seconds: number }) {
    if (!ts) return '—'
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  function formatDateTime(ts?: { seconds: number }) {
    if (!ts) return '—'
    const d = new Date(ts.seconds * 1000)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const totalVisits = sessions.filter(s => s.action === 'visit').length
  const totalItineraries = sessions.filter(s => s.action === 'itinerary_generated').length
  const totalBookingsSub = sessions.filter(s => s.action === 'booking_submitted').length
  const conversionRate = totalVisits > 0 ? Math.round((totalBookingsSub / totalVisits) * 100) : 0

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
  const totalRevenue = confirmedBookings.reduce((s, b) => s + (b.bookingValue || 0), 0)

  const plannerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tailored-travel/${parentAgentSlug}`
    : `/tailored-travel/${parentAgentSlug}`

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex-col hidden md:flex flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mb-2">
            {subAgentName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <p className="font-bold text-gray-900 text-sm">{subAgentName || 'Team Member'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{currentUser?.email}</p>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {([
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'bookings', label: 'My Bookings', icon: BookOpen },
            { id: 'activity', label: 'My Activity', icon: Activity },
          ] as { id: Tab; label: string; icon: any }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
          {parentAgentSlug && (
            <a
              href={plannerUrl}
              target="_blank"
              className="block text-xs text-primary font-semibold hover:underline"
            >
              Open Planner →
            </a>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-gray-900">{
              tab === 'overview' ? 'My Overview' :
              tab === 'bookings' ? 'My Bookings' : 'My Activity'
            }</h1>
            <p className="text-xs text-gray-400">Sub-agent dashboard</p>
          </div>
          <button onClick={handleLogout} className="md:hidden text-gray-400 hover:text-gray-700">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 pb-24 md:pb-6">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Overview ───────────────────────────────────── */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Bookings', value: bookings.length, icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
                    { label: 'Planner Visits', value: totalVisits, icon: Eye, color: 'bg-purple-100 text-purple-600' },
                    { label: 'Itineraries', value: totalItineraries, icon: TrendingUp, color: 'bg-amber-100 text-amber-600' },
                    { label: 'Conversion', value: `${conversionRate}%`, icon: BarChart3, color: 'bg-green-100 text-green-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent bookings preview */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Recent Bookings</h3>
                  {bookings.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No bookings attributed to you yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {bookings.slice(0, 5).map(b => {
                        const s = statusConfig[b.status] || statusConfig.new
                        return (
                          <div key={b.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{b.customerName}</p>
                              <p className="text-xs text-gray-500">{b.packageTitle} · {formatDate(b.createdAt)}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${s.color}`}>
                              {s.label}
                            </span>
                          </div>
                        )
                      })}
                      {bookings.length > 5 && (
                        <button
                          onClick={() => setTab('bookings')}
                          className="text-sm text-primary font-semibold hover:underline w-full text-center pt-1"
                        >
                          View all {bookings.length} bookings →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Bookings ───────────────────────────────────── */}
            {tab === 'bookings' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{bookings.length} booking{bookings.length !== 1 ? 's' : ''} attributed to you</p>
                {bookings.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No bookings yet. Share your planner URL to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map(b => {
                      const s = statusConfig[b.status] || statusConfig.new
                      return (
                        <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-gray-900">{b.customerName}</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                                  {s.label}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-700">{b.packageTitle}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />{b.destination}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Mail className="w-3 h-3" />{b.customerEmail}
                                </span>
                                {b.customerPhone && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Phone className="w-3 h-3" />{b.customerPhone}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="w-3 h-3" />{formatDate(b.createdAt)}
                                </span>
                              </div>
                            </div>
                            {b.bookingValue ? (
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">₹{b.bookingValue.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-gray-400">booking value</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Activity ───────────────────────────────────── */}
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
                            {ev.destination && (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <MapPin className="w-3 h-3" />{ev.destination}
                              </span>
                            )}
                            {ev.packageTitle && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Package className="w-3 h-3" />{ev.packageTitle}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(ev.timestamp)}</span>
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
        {([
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'bookings', label: 'Bookings', icon: BookOpen },
          { id: 'activity', label: 'Activity', icon: Activity },
        ] as { id: Tab; label: string; icon: any }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
              tab === t.id ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <t.icon className="w-5 h-5" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
