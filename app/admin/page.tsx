'use client'

/**
 * Admin Overview — the home screen. Shows only what the logged-in person can act on:
 * fresh leads to call, overdue follow-ups, upcoming departures, unread messages, and shortcuts.
 * Each section of the admin now lives on its own route (see lib/admin/nav.ts).
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import {
  AlertTriangle, ArrowRight, CalendarClock, FileText, Inbox, MessageCircle, Package, PenLine, Phone, Plane,
  Sparkles, Target, TrendingUp, Users, Building2,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { STAGES, isFollowUpOverdue, type CrmRecord } from '@/lib/metaLeadsCrm'
import { Badge, Card, EmptyState, StatCard, Spinner, StatusBadge, formatDate, formatINR, timeAgo, toMillis, waLink } from '@/components/admin/ui'

interface LeadLite {
  id: string
  name: string
  phone: string
  destination: string
  status: string
  createdAt: any
  source: 'Website' | 'AI Planner' | 'Meta Ad'
  href: string
}

interface TripLite {
  id: string
  clientName: string
  clientPhone?: string
  destinationName?: string
  packageName?: string
  travelDate?: string
  status?: string
  totalCost?: number
  advancePaid?: number
}

const DAY = 86400000
const OPEN_STATUSES = ['new', '', 'unread', 'pending', undefined]

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.warn('[Overview]', e)
    return fallback
  }
}

async function countOf(name: string, ...constraints: any[]) {
  return safe(async () => (await getCountFromServer(query(collection(db, name), ...constraints))).data().count, 0)
}

async function recentDocs(name: string, n = 60) {
  return safe(async () => {
    try {
      return (await getDocs(query(collection(db, name), orderBy('createdAt', 'desc'), limit(n)))).docs
    } catch {
      return (await getDocs(query(collection(db, name), limit(n)))).docs
    }
  }, [] as any[])
}

export default function AdminOverviewPage() {
  const { currentUser, isAdmin, permissions } = useAuth()
  const router = useRouter()
  const can = (p: string) => isAdmin || permissions.includes(p)
  const canLeads = can('leads')
  const canCustomers = can('customer-records')
  const canContacts = can('contacts')
  const canCatalog = can('packages') || can('blogs')

  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadLite[]>([])
  const [crm, setCrm] = useState<CrmRecord[]>([])
  const [trips, setTrips] = useState<TripLite[]>([])
  const [counts, setCounts] = useState({ unreadMessages: 0, pendingAgents: 0, packages: 0, blogs: 0, destinations: 0 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [web, ai, crmDocs, tripDocs, unreadMessages, pendingAgents, packages, blogs, destinations] = await Promise.all([
        canLeads ? recentDocs('leads') : Promise.resolve([]),
        canLeads ? recentDocs('ai_planner_leads') : Promise.resolve([]),
        canLeads ? safe(async () => (await getDocs(collection(db, 'meta_lead_crm'))).docs, [] as any[]) : Promise.resolve([]),
        canCustomers ? safe(async () => (await getDocs(collection(db, 'customer_itineraries'))).docs, [] as any[]) : Promise.resolve([]),
        canContacts ? countOf('contact_messages', where('read', '==', false)) : Promise.resolve(0),
        isAdmin ? countOf('agents', where('status', '==', 'pending')) : Promise.resolve(0),
        canCatalog ? countOf('packages') : Promise.resolve(0),
        canCatalog ? countOf('blogs') : Promise.resolve(0),
        canCatalog ? countOf('destinations') : Promise.resolve(0),
      ])
      if (cancelled) return

      const crmRecords = crmDocs.map((d: any) => ({ ...(d.data() as CrmRecord), leadId: d.id }))
      const mapLead = (d: any, source: LeadLite['source']): LeadLite => {
        const x = d.data()
        return {
          id: d.id,
          name: x.name || x.fullName || x.customerName || 'Unknown',
          phone: x.mobile || x.phone || x.phoneNumber || '',
          destination: x.destination || x.packageName || x.selectedDestination || '',
          status: x.status || 'new',
          createdAt: x.createdAt,
          source,
          href: '/admin/leads',
        }
      }
      const metaLeads: LeadLite[] = crmRecords.map((r: CrmRecord) => ({
        id: r.leadId,
        name: r.name || 'Unknown',
        phone: r.phone || '',
        destination: r.travel?.destination || r.formName || r.campaignName || '',
        status: r.stage,
        createdAt: r.leadCreatedAt,
        source: 'Meta Ad',
        href: `/admin/meta-leads/${r.leadId}`,
      }))
      const isFbCopy = (d: any) => { const x = d.data(); return !!x.leadgenId || /facebook/i.test(String(x.source || '')) }
      const all = [...web.filter((d: any) => !isFbCopy(d)).map((d: any) => mapLead(d, 'Website')), ...ai.map((d: any) => mapLead(d, 'AI Planner')), ...metaLeads]
      all.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))

      setLeads(all)
      setCrm(crmRecords)
      setTrips(tripDocs.map((d: any) => ({ id: d.id, ...d.data() })))
      setCounts({ unreadMessages, pendingAgents, packages, blogs, destinations })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [canLeads, canCustomers, canContacts, canCatalog, isAdmin])

  const stats = useMemo(() => {
    const now = Date.now()
    const startOfDay = new Date().setHours(0, 0, 0, 0)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    const newToday = leads.filter((l) => toMillis(l.createdAt) >= startOfDay).length
    const uncontacted = leads.filter((l) => OPEN_STATUSES.includes(String(l.status || '').toLowerCase())).length
    const overdue = crm.filter((r) => isFollowUpOverdue(r))
    const upcoming = trips
      .filter((t) => t.travelDate && ['confirmed', 'sent', 'draft'].includes(String(t.status)) && new Date(t.travelDate).getTime() >= now - DAY)
      .sort((a, b) => new Date(a.travelDate!).getTime() - new Date(b.travelDate!).getTime())
    const confirmedNext30 = upcoming.filter((t) => t.status === 'confirmed' && new Date(t.travelDate!).getTime() <= now + 30 * DAY)
    const wonThisMonth = crm.filter((r) => r.stage === 'won' && toMillis((r as any).updatedAt || r.leadCreatedAt) >= monthStart)
    const bookedValue =
      wonThisMonth.reduce((s, r) => s + (r.dealValue || 0), 0) +
      trips.filter((t) => t.status === 'confirmed' && toMillis((t as any).updatedAt) >= monthStart).reduce((s, t) => s + (Number(t.totalCost) || 0), 0)
    const balanceDue = trips.filter((t) => t.status === 'confirmed').reduce((s, t) => s + Math.max(0, (Number(t.totalCost) || 0) - (Number(t.advancePaid) || 0)), 0)
    const stageCounts = STAGES.map((s) => ({ ...s, count: crm.filter((r) => r.stage === s.id).length }))
    return { newToday, uncontacted, overdue, upcoming, confirmedNext30, bookedValue, balanceDue, stageCounts }
  }, [leads, crm, trips])

  const firstName = (currentUser?.displayName || currentUser?.email?.split('@')[0] || '').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const quickActions = [
    can('create-itinerary') && { href: '/admin/itinerary', label: 'Create quote PDF', icon: FileText, desc: 'Branded itinerary for a customer' },
    canLeads && { href: '/admin/meta-leads', label: 'Work Meta leads', icon: Target, desc: 'Call, follow up, move stages' },
    (can('whatsapp') || canLeads) && { href: '/admin/whatsapp-chats', label: 'WhatsApp inbox', icon: MessageCircle, desc: 'Reply to customers' },
    can('packages') && { href: '/admin/packages', label: 'Add a package', icon: Package, desc: 'Publish to the website' },
    can('ai-generator') && { href: '/admin/ai-packages', label: 'AI package writer', icon: Sparkles, desc: 'Draft a package in minutes' },
    can('blogs') && { href: '/admin/blogs', label: 'Write a blog', icon: PenLine, desc: 'Travel guides for SEO' },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: any; desc: string }>

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{greeting}{firstName ? `, ${firstName}` : ''} 👋</h1>
      </div>

      {loading ? (
        <Spinner label="Loading today's numbers…" />
      ) : (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {canLeads && <StatCard label="New leads today" value={stats.newToday} hint={`${leads.length} recent leads in total`} icon={<TrendingUp className="w-5 h-5" />} tone="blue" onClick={() => router.push('/admin/leads')} />}
            {canLeads && <StatCard label="Not contacted yet" value={stats.uncontacted} hint="Status still “New”" icon={<Phone className="w-5 h-5" />} tone="amber" />}
            {canLeads && <StatCard label="Follow-ups overdue" value={stats.overdue.length} hint="Meta leads past their follow-up time" icon={<AlertTriangle className="w-5 h-5" />} tone={stats.overdue.length ? 'red' : 'green'} onClick={() => router.push('/admin/meta-leads')} />}
            {canCustomers && <StatCard label="Booked this month" value={formatINR(stats.bookedValue)} hint={`${formatINR(stats.balanceDue)} balance still to collect`} icon={<TrendingUp className="w-5 h-5" />} tone="green" onClick={() => router.push('/admin/customers')} />}
            {canContacts && <StatCard label="Unread messages" value={counts.unreadMessages} hint="Contact Us form" icon={<Inbox className="w-5 h-5" />} tone="purple" onClick={() => router.push('/admin/enquiries')} />}
            {isAdmin && counts.pendingAgents > 0 && <StatCard label="Agents awaiting approval" value={counts.pendingAgents} hint="Check for spam sign-ups" icon={<Building2 className="w-5 h-5" />} tone="amber" onClick={() => router.push('/admin/agents')} />}
            {canCatalog && <StatCard label="Live catalog" value={counts.packages} hint={`packages · ${counts.destinations} destinations · ${counts.blogs} blogs`} icon={<Package className="w-5 h-5" />} tone="wine" />}
          </div>

          {/* Quick actions */}
          {quickActions.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {quickActions.map((a) => (
                <Link key={a.href} href={a.href} className="group rounded-2xl border border-gray-200 bg-white p-4 hover:border-bordeaux-300 hover:shadow-md transition-all">
                  <div className="w-9 h-9 rounded-xl bg-bordeaux-50 text-bordeaux-600 flex items-center justify-center mb-2 group-hover:bg-bordeaux-600 group-hover:text-white transition-colors">
                    <a.icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                </Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Leads to call */}
            {canLeads && (
              <Card padded={false} className="xl:col-span-2">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">Call these leads first</h2>
                    <p className="text-xs text-gray-500">Newest leads that nobody has contacted yet</p>
                  </div>
                  <Link href="/admin/leads" className="text-sm font-semibold text-bordeaux-600 hover:underline inline-flex items-center gap-1">All leads <ArrowRight className="w-4 h-4" /></Link>
                </div>
                {(() => {
                  const fresh = leads.filter((l) => OPEN_STATUSES.includes(String(l.status || '').toLowerCase())).slice(0, 8)
                  if (!fresh.length) return <EmptyState title="All caught up" description="Every recent lead has been contacted." icon={<Users className="w-5 h-5" />} />
                  return (
                    <ul className="divide-y divide-gray-100">
                      {fresh.map((l) => (
                        <li key={l.source + l.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-bold shrink-0">{l.name.charAt(0).toUpperCase()}</div>
                          <Link href={l.href} className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{l.name}</p>
                            <p className="text-xs text-gray-500 truncate">{l.destination || 'Destination not given'} · {timeAgo(l.createdAt)}</p>
                          </Link>
                          <Badge tone={l.source === 'Meta Ad' ? 'blue' : l.source === 'AI Planner' ? 'purple' : 'gray'} className="hidden sm:inline-flex">{l.source}</Badge>
                          {l.phone && (
                            <div className="flex gap-1.5 shrink-0">
                              <a href={`tel:${l.phone}`} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" title="Call"><Phone className="w-4 h-4" /></a>
                              <a
                                href={waLink(l.phone, `Hi ${l.name.split(' ')[0]}, this is Travelzada 😊 Thanks for your enquiry${l.destination ? ` about ${l.destination}` : ''}! When is a good time to plan your trip together?`)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </Card>
            )}

            {/* Pipeline + overdue */}
            {canLeads && (
              <Card>
                <h2 className="font-semibold text-gray-900">Meta leads pipeline</h2>
                <p className="text-xs text-gray-500 mb-4">Where every ad lead stands</p>
                <div className="space-y-2.5">
                  {stats.stageCounts.map((s) => {
                    const max = Math.max(1, ...stats.stageCounts.map((x) => x.count))
                    return (
                      <div key={s.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700">{s.label}</span>
                          <span className="tabular-nums text-gray-500">{s.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${s.id === 'won' ? 'bg-emerald-500' : s.id === 'lost' ? 'bg-red-400' : 'bg-bordeaux-500'}`} style={{ width: `${(s.count / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {stats.overdue.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Overdue follow-ups</p>
                    <ul className="space-y-1.5">
                      {stats.overdue.slice(0, 5).map((r) => (
                        <li key={r.leadId}>
                          <Link href={`/admin/meta-leads/${r.leadId}`} className="flex justify-between gap-2 text-sm hover:text-bordeaux-600">
                            <span className="truncate">{r.name}</span>
                            <span className="text-xs text-gray-500 shrink-0">{timeAgo(r.nextFollowUp)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Upcoming departures */}
          {canCustomers && (
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Upcoming trips</h2>
                  <p className="text-xs text-gray-500">Quotes and bookings with a travel date ahead — confirm hotels, collect balance</p>
                </div>
                <Link href="/admin/customers" className="text-sm font-semibold text-bordeaux-600 hover:underline inline-flex items-center gap-1">All customers <ArrowRight className="w-4 h-4" /></Link>
              </div>
              {stats.upcoming.length === 0 ? (
                <EmptyState title="No upcoming trips" description="Quotes created with “Create quote PDF” appear here." icon={<Plane className="w-5 h-5" />} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <tbody>
                      {stats.upcoming.slice(0, 8).map((t) => {
                        const days = Math.ceil((new Date(t.travelDate!).getTime() - Date.now()) / DAY)
                        const balance = Math.max(0, (Number(t.totalCost) || 0) - (Number(t.advancePaid) || 0))
                        return (
                          <tr key={t.id} className="border-t border-gray-100">
                            <td className="px-5 py-3">
                              <p className="font-semibold text-gray-900">{t.clientName || '—'}</p>
                              <p className="text-xs text-gray-500">{t.destinationName || t.packageName}</p>
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <p className="text-gray-900">{formatDate(t.travelDate)}</p>
                              <p className={`text-xs ${days <= 7 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{days <= 0 ? 'Travelling now' : `in ${days} day${days === 1 ? '' : 's'}`}</p>
                            </td>
                            <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              <p className="font-semibold text-gray-900">{formatINR(t.totalCost)}</p>
                              {balance > 0 && <p className="text-xs text-amber-700">{formatINR(balance)} due</p>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {!canLeads && !canCustomers && !canCatalog && (
            <Card>
              <EmptyState title="Welcome to Travelzada admin" description="Use the menu on the left to open the sections you have access to. Open “How to use” for a guide." />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
