'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { motion } from 'framer-motion'
import {
  Package, Inbox, BarChart2, Users, LogOut, Copy, Check, ExternalLink,
  Building2, Clock, AlertCircle, Loader2, ChevronRight, UserCog, Activity
} from 'lucide-react'
import PackageManager from '@/components/agent-dashboard/PackageManager'
import BookingInbox from '@/components/agent-dashboard/BookingInbox'
import Analytics from '@/components/agent-dashboard/Analytics'
import CustomerRecords from '@/components/agent-dashboard/CustomerRecords'
import TeamManager from '@/components/agent-dashboard/TeamManager'
import CRMAnalytics from '@/components/agent-dashboard/CRMAnalytics'
import type { Agent } from '@/lib/types/agent'

type Tab = 'packages' | 'bookings' | 'analytics' | 'customers' | 'team' | 'crm'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'packages', label: 'Packages', icon: <Package className="w-4 h-4" /> },
  { id: 'bookings', label: 'Bookings', icon: <Inbox className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
  { id: 'team', label: 'Team', icon: <UserCog className="w-4 h-4" /> },
  { id: 'crm', label: 'CRM', icon: <Activity className="w-4 h-4" /> },
]

export default function AgentDashboardPage() {
  const router = useRouter()
  const { currentUser, isAgent, isSubAgent, agentSlug, agentStatus, loading: authLoading, logout } = useAuth()

  const [agentData, setAgentData] = useState<Agent | null>(null)
  const [tab, setTab] = useState<Tab>('packages')
  const [copied, setCopied] = useState(false)
  const [agentLoading, setAgentLoading] = useState(true)

  // Redirect non-agents; sub-agents get their own dashboard
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/agent-login')
      } else if (isSubAgent) {
        router.push('/sub-agent-dashboard')
      } else if (!isAgent) {
        router.push('/')
      }
    }
  }, [authLoading, currentUser, isAgent, isSubAgent, router])

  // Fetch full agent data
  useEffect(() => {
    if (!currentUser || !isAgent) return

    async function fetchAgent() {
      try {
        const snap = await getDoc(doc(db, 'agents', currentUser!.uid))
        if (snap.exists()) {
          setAgentData({ id: snap.id, ...snap.data() } as Agent)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setAgentLoading(false)
      }
    }

    fetchAgent()
  }, [currentUser, isAgent])

  async function handleLogout() {
    await logout()
    router.push('/agent-login')
  }

  function copyPlannerUrl() {
    const url = `${window.location.origin}/tailored-travel/${agentSlug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || agentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  // Pending / suspended state
  if (agentStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-3xl shadow-lg p-10 max-w-md text-center">
          <Clock className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Application Under Review</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your agent application is pending approval. We'll email you at{' '}
            <strong>{currentUser?.email}</strong> once it's approved.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (agentStatus === 'suspended' || agentStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-3xl shadow-lg p-10 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">
            Account {agentStatus === 'suspended' ? 'Suspended' : 'Rejected'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {agentStatus === 'suspended'
              ? 'Your account has been suspended. Please contact Travelzada support.'
              : agentData?.rejectionReason
              ? `Reason: ${agentData.rejectionReason}`
              : 'Your application was not approved. Please contact Travelzada support.'}
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  const plannerUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://www.travelzada.com'}/tailored-travel/${agentSlug}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar + Layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 hidden md:flex">
          {/* Brand */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight">
                  {agentData?.companyName || 'Agent Dashboard'}
                </p>
                <p className="text-xs text-gray-400">Travelzada Agent</p>
              </div>
            </div>
          </div>

          {/* Planner URL card */}
          <div className="mx-4 mt-4 mb-3 bg-purple-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-purple-700 mb-1.5">Your Planner URL</p>
            <p className="text-xs text-purple-600 font-mono break-all leading-relaxed">
              /tailored-travel/{agentSlug}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={copyPlannerUrl}
                className="flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900"
              >
                {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
              </button>
              <a
                href={`/tailored-travel/${agentSlug}`}
                target="_blank"
                className="flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900"
              >
                <ExternalLink className="w-3 h-3" />Preview
              </a>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-2 space-y-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-4 py-4 border-t border-gray-100 space-y-2">
            <div className="text-xs text-gray-500">
              <p className="font-medium text-gray-700">{currentUser?.email}</p>
              <p className="capitalize mt-0.5">{agentData?.subscriptionPlan || 'Basic'} Plan</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex md:hidden">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                tab === t.id ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Top bar */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h1 className="font-bold text-gray-900 capitalize">{tab}</h1>
              <p className="text-xs text-gray-400">
                {agentData?.companyName} · {agentData?.contactName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/tailored-travel/${agentSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Planner
              </a>
              <button onClick={handleLogout} className="md:hidden text-gray-400 hover:text-gray-700">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="p-6 pb-24 md:pb-6">
            {currentUser && agentSlug && (
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {tab === 'packages' && (
                  <PackageManager agentId={currentUser.uid} />
                )}
                {tab === 'bookings' && (
                  <BookingInbox agentId={currentUser.uid} />
                )}
                {tab === 'analytics' && (
                  <Analytics agentId={currentUser.uid} agentSlug={agentSlug} />
                )}
                {tab === 'customers' && (
                  <CustomerRecords agentId={currentUser.uid} />
                )}
                {tab === 'team' && (
                  <TeamManager agentId={currentUser.uid} />
                )}
                {tab === 'crm' && (
                  <CRMAnalytics agentId={currentUser.uid} agentSlug={agentSlug} />
                )}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
