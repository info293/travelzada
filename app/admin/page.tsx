'use client'

/**
 * Admin Overview — "only what needs action today", across every lead source:
 * Meta ads (live from Meta + meta_lead_crm), website / AI planner leads, Contact Us messages (spam excluded),
 * WhatsApp chats and sent quotes. Data + rules live in components/admin/overview/useOverviewData.ts.
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCountFromServer, collection, query, where } from 'firebase/firestore'
import {
  AlertTriangle, Building2, CalendarClock, FileText, MessageCircle, Package, PenLine, PhoneIncoming, Sparkles, Target, TrendingUp,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, EmptyState, StatCard, Spinner } from '@/components/admin/ui'
import { useOverviewData } from '@/components/admin/overview/useOverviewData'
import ActionList from '@/components/admin/overview/ActionList'
import { MonthStrip, UpcomingTrips, breakdownText } from '@/components/admin/overview/OverviewPanels'

export default function AdminOverviewPage() {
  const { currentUser, isAdmin, permissions } = useAuth()
  const router = useRouter()
  const can = (p: string) => isAdmin || permissions.includes(p)
  const { loading, access, meta, kpis, actions, monthStats, trips } = useOverviewData()
  const metaPending = meta.status === 'loading'

  // Admin-only nudge: agent sign-ups waiting for approval
  const [pendingAgents, setPendingAgents] = useState(0)
  useEffect(() => {
    if (!isAdmin) return
    getCountFromServer(query(collection(db, 'agents'), where('status', '==', 'pending')))
      .then((s) => setPendingAgents(s.data().count))
      .catch(() => {})
  }, [isAdmin])

  const firstName = (currentUser?.displayName || currentUser?.email?.split('@')[0] || '').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const quickActions = [
    can('create-itinerary') && { href: '/admin/itinerary', label: 'Create quote PDF', icon: FileText, desc: 'Branded itinerary for a customer' },
    access.leads && { href: '/admin/meta-leads', label: 'Work Meta leads', icon: Target, desc: 'Call, follow up, move stages' },
    access.whatsapp && { href: '/admin/whatsapp-chats', label: 'WhatsApp inbox', icon: MessageCircle, desc: 'Reply to customers' },
    can('packages') && { href: '/admin/packages', label: 'Add a package', icon: Package, desc: 'Publish to the website' },
    can('ai-generator') && { href: '/admin/ai-packages', label: 'AI package writer', icon: Sparkles, desc: 'Draft a package in minutes' },
    can('blogs') && { href: '/admin/blogs', label: 'Write a blog', icon: PenLine, desc: 'Travel guides for SEO' },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: any; desc: string }>

  const anyLeadSource = access.leads || access.contacts || access.whatsapp
  const metaNote = meta.status === 'error' ? 'Meta leads unavailable right now' : metaPending ? 'Loading Meta leads…' : undefined

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
          {/* KPI row — 4 max, each opens the page where the work happens */}
          {anyLeadSource && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(access.leads || access.contacts) && (
                <StatCard label="New leads today" value={kpis.newToday.value} hint={breakdownText(kpis.newToday.parts, metaPending)} icon={<TrendingUp className="w-5 h-5" />} tone="blue" onClick={() => router.push(access.leads ? '/admin/meta-leads' : '/admin/enquiries')} />
              )}
              {(access.leads || access.contacts) && (
                <StatCard label="Waiting for first contact" value={kpis.waiting.value} hint={breakdownText(kpis.waiting.parts, metaPending)} icon={<PhoneIncoming className="w-5 h-5" />} tone="amber" onClick={() => router.push(access.leads ? '/admin/leads' : '/admin/enquiries')} />
              )}
              {(access.leads || access.quotes) && (
                <StatCard label="Follow-ups due" value={kpis.followUps.value} hint={breakdownText(kpis.followUps.parts)} icon={kpis.followUps.value ? <AlertTriangle className="w-5 h-5" /> : <CalendarClock className="w-5 h-5" />} tone={kpis.followUps.value ? 'red' : 'green'} onClick={() => router.push(access.leads ? '/admin/meta-leads' : '/admin/quotes')} />
              )}
              {access.whatsapp && (
                <StatCard label="Unread WhatsApp" value={kpis.whatsapp.value} hint={kpis.whatsapp.value ? `${kpis.whatsapp.parts[0]?.value ?? 0} unread messages` : 'Inbox is clear'} icon={<MessageCircle className="w-5 h-5" />} tone="green" onClick={() => router.push('/admin/whatsapp-chats')} />
              )}
            </div>
          )}

          {isAdmin && pendingAgents > 0 && (
            <Link href="/admin/agents" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 hover:bg-amber-100">
              <Building2 className="w-4 h-4" /> {pendingAgents} agent sign-up{pendingAgents === 1 ? '' : 's'} awaiting approval — check for spam
            </Link>
          )}

          {(anyLeadSource || access.quotes) && <ActionList items={actions} metaNote={metaNote} />}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <MonthStrip
                leads={access.leads || access.contacts ? monthStats.leads : null}
                quotes={access.quotes ? { made: monthStats.quotesMade, sent: monthStats.quotesSent } : null}
                bookings={access.bookings ? { count: monthStats.bookings, value: monthStats.bookedValue, balance: monthStats.balance } : null}
                metaPending={metaPending}
              />
            </div>
            {access.bookings && <UpcomingTrips trips={trips} />}
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

          {!anyLeadSource && !access.quotes && !access.bookings && quickActions.length === 0 && (
            <Card>
              <EmptyState title="Welcome to Travelzada admin" description="Use the menu on the left to open the sections you have access to. Open “How to use” for a guide." />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
