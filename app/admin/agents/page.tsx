'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  Building2, Users, TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle,
  ExternalLink, MoreVertical, Search, Loader2, ArrowLeft, ChevronDown,
  IndianRupee, Package, Inbox, Edit3, Shield, Ban
} from 'lucide-react'
import Link from 'next/link'

interface AgentRow {
  id: string
  companyName: string
  contactName: string
  email: string
  agentSlug: string
  phone: string
  fallbackToTravelzada?: boolean
  agencyType: string
  status: string
  subscriptionPlan: string
  commissionRate: number
  totalPackages: number
  liveBookings: number
  totalRevenue: number
  createdAt: any
  adminNotes?: string
  rejectionReason?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: <Ban className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-gray-100 text-gray-600', icon: <XCircle className="w-3 h-3" /> },
}

export default function AdminAgentsPage() {
  const router = useRouter()
  const { currentUser, isAdmin, loading: authLoading } = useAuth()

  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [commissionInput, setCommissionInput] = useState('')
  const [rejectionInput, setRejectionInput] = useState('')

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/')
  }, [authLoading, isAdmin, router])

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/agents')
      const data = await res.json()
      if (data.success) setAgents(data.agents)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  async function performAction(agentId: string, action: string, extra: Record<string, any> = {}) {
    setActionLoading(agentId + action)
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, approvedBy: currentUser?.email, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchAgents()
      // Update selectedAgent
      if (selectedAgent?.id === agentId) {
        const updated = agents.find(a => a.id === agentId)
        if (updated) setSelectedAgent({ ...updated, status: getStatusAfterAction(action, updated.status) })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  function getStatusAfterAction(action: string, current: string) {
    const map: Record<string, string> = {
      approve: 'active', suspend: 'suspended', reject: 'rejected', reactivate: 'active'
    }
    return map[action] || current
  }

  const filtered = agents.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    const matchSearch = !search ||
      a.companyName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.agentSlug.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    pending: agents.filter(a => a.status === 'pending').length,
    totalRevenue: agents.reduce((s, a) => s + (a.totalRevenue || 0), 0),
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              Agent CRM
            </h1>
            <p className="text-xs text-gray-400">Manage travel agents on the platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Agents', value: stats.total, icon: <Users className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Active', value: stats.active, icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
            { label: 'Pending Approval', value: stats.pending, icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
            { label: 'Platform Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: <IndianRupee className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Agent list */}
          <div className="flex-1">
            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search agents…"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'pending', 'active', 'suspended', 'rejected'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${filterStatus === s ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-400'}`}
                  >
                    {s}
                    {s !== 'all' && (
                      <span className="ml-1 opacity-70">
                        ({agents.filter(a => a.status === s).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No agents found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Agent</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Slug / URL</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Bookings</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Commission</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(agent => (
                      <tr
                        key={agent.id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedAgent?.id === agent.id ? 'bg-purple-50' : ''}`}
                        onClick={() => {
                          setSelectedAgent(agent)
                          setNotesInput(agent.adminNotes || '')
                          setCommissionInput(String(agent.commissionRate || 10))
                          setRejectionInput('')
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{agent.companyName}</p>
                          <p className="text-xs text-gray-500">{agent.contactName} · {agent.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <code className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            /tailored-travel/{agent.agentSlug}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[agent.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_CONFIG[agent.status]?.icon}
                            {STATUS_CONFIG[agent.status]?.label || agent.status}
                          </span>
                          {agent.status === 'pending' && (
                            <div className="flex gap-1.5 mt-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => performAction(agent.id, 'approve')}
                                disabled={!!actionLoading}
                                className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded-full font-semibold disabled:opacity-50"
                              >
                                {actionLoading === agent.id + 'approve' ? '…' : 'Approve'}
                              </button>
                              <button
                                onClick={() => performAction(agent.id, 'reject', { rejectionReason: 'Not meeting requirements' })}
                                disabled={!!actionLoading}
                                className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-0.5 rounded-full font-semibold disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-700">
                          {agent.liveBookings || 0}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-700">
                          {agent.commissionRate || 10}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/tailored-travel/${agent.agentSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-gray-400 hover:text-purple-600"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selectedAgent && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm self-start sticky top-20 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{selectedAgent.companyName}</p>
                    <p className="text-xs opacity-70 mt-0.5">{selectedAgent.contactName}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_CONFIG[selectedAgent.status]?.color || 'bg-white/20 text-white'}`}>
                    {selectedAgent.status}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Info */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-gray-900 text-xs">{selectedAgent.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium text-gray-900">{selectedAgent.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-900 capitalize">{selectedAgent.agencyType?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan</span>
                    <span className="font-medium text-gray-900 capitalize">{selectedAgent.subscriptionPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Packages</span>
                    <span className="font-medium text-gray-900">{selectedAgent.totalPackages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bookings</span>
                    <span className="font-medium text-gray-900">{selectedAgent.liveBookings}</span>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Fallback toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Fallback to Main Packages</p>
                    <p className="text-xs text-gray-400 mt-0.5">Show Travelzada packages if agent has none</p>
                  </div>
                  <button
                    onClick={() => performAction(selectedAgent.id, 'update', {
                      fallbackToTravelzada: !selectedAgent.fallbackToTravelzada
                    }).then(() => setSelectedAgent(a => a ? { ...a, fallbackToTravelzada: !a.fallbackToTravelzada } : a))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      selectedAgent.fallbackToTravelzada ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        selectedAgent.fallbackToTravelzada ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <hr className="border-gray-100" />

                {/* Commission */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Commission Rate</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={commissionInput}
                      onChange={e => setCommissionInput(e.target.value)}
                      min="0"
                      max="50"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <span className="flex items-center text-sm text-gray-500">%</span>
                    <button
                      onClick={() => performAction(selectedAgent.id, 'update', { commissionRate: Number(commissionInput) })}
                      className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Admin notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Admin Notes</label>
                  <textarea
                    value={notesInput}
                    onChange={e => setNotesInput(e.target.value)}
                    rows={3}
                    placeholder="Internal notes about this agent…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    onClick={() => performAction(selectedAgent.id, 'update', { adminNotes: notesInput })}
                    className="mt-1 text-xs text-purple-600 font-semibold hover:underline"
                  >
                    Save notes
                  </button>
                </div>

                <hr className="border-gray-100" />

                {/* Actions */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</p>

                  {selectedAgent.status === 'pending' && (
                    <button
                      onClick={() => performAction(selectedAgent.id, 'approve')}
                      disabled={!!actionLoading}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {actionLoading ? 'Processing…' : 'Approve Agent'}
                    </button>
                  )}

                  {(selectedAgent.status === 'pending' || selectedAgent.status === 'active') && (
                    <div className="space-y-1">
                      <input
                        value={rejectionInput}
                        onChange={e => setRejectionInput(e.target.value)}
                        placeholder="Rejection reason (optional)"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      <button
                        onClick={() => performAction(selectedAgent.id, 'reject', { rejectionReason: rejectionInput })}
                        disabled={!!actionLoading}
                        className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 font-semibold py-2 rounded-xl text-sm border border-red-200"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Application
                      </button>
                    </div>
                  )}

                  {selectedAgent.status === 'active' && (
                    <button
                      onClick={() => performAction(selectedAgent.id, 'suspend')}
                      disabled={!!actionLoading}
                      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm"
                    >
                      <Ban className="w-4 h-4" />
                      Suspend Agent
                    </button>
                  )}

                  {(selectedAgent.status === 'suspended' || selectedAgent.status === 'rejected') && (
                    <button
                      onClick={() => performAction(selectedAgent.id, 'reactivate')}
                      disabled={!!actionLoading}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Reactivate Agent
                    </button>
                  )}

                  <a
                    href={`/tailored-travel/${selectedAgent.agentSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview Planner URL
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
