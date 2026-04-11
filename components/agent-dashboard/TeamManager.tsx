'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, X, Eye, EyeOff, ToggleLeft, ToggleRight,
  Trash2, Phone, Mail, Calendar, Loader2, AlertCircle, CheckCircle
} from 'lucide-react'

interface SubAgent {
  id: string
  name: string
  email: string
  phone?: string
  isActive: boolean
  totalBookings: number
  totalRevenue: number
  createdAt?: { seconds: number }
}

interface Props {
  agentId: string
}

export default function TeamManager({ agentId }: Props) {
  const { currentUser } = useAuth()
  const [subAgents, setSubAgents] = useState<SubAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchSubAgents = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/subagents?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) setSubAgents(data.subAgents)
    } catch { } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchSubAgents()
  }, [fetchSubAgents])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Name, email, and password are required.')
      return
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/agent/subagents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      setFormSuccess(`Team member "${form.name}" created successfully.`)
      setForm({ name: '', email: '', password: '', phone: '' })
      await fetchSubAgents()
      setTimeout(() => { setShowForm(false); setFormSuccess('') }, 2500)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(subAgent: SubAgent) {
    setActionLoading(subAgent.id)
    try {
      await fetch(`/api/agent/subagents/${subAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !subAgent.isActive }),
      })
      setSubAgents(prev => prev.map(s => s.id === subAgent.id ? { ...s, isActive: !s.isActive } : s))
    } catch { } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(id)
    try {
      await fetch(`/api/agent/subagents/${id}`, { method: 'DELETE' })
      setSubAgents(prev => prev.filter(s => s.id !== id))
      setDeleteConfirm(null)
    } catch { } finally {
      setActionLoading(null)
    }
  }

  function formatDate(ts?: { seconds: number }) {
    if (!ts) return '—'
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage sub-agents who can access your planner</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(''); setFormSuccess('') }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {/* Create form modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Add Team Member</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Priya Sharma"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="priya@agency.com"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Share this password with your team member securely.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone (optional)</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {formSuccess}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : 'Create Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sub-agents list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : subAgents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">No team members yet</p>
          <p className="text-sm text-gray-500">Add your first sub-agent to start tracking their activity.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Member</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Contact</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Bookings</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Added</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subAgents.map(sa => (
                <tr key={sa.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {sa.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{sa.name}</p>
                        <p className="text-xs text-gray-400 md:hidden">{sa.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="w-3 h-3" />{sa.email}
                      </div>
                      {sa.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Phone className="w-3 h-3" />{sa.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-gray-900">{sa.totalBookings}</span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(sa.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      sa.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {sa.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Toggle active */}
                      <button
                        onClick={() => toggleActive(sa)}
                        disabled={actionLoading === sa.id}
                        title={sa.isActive ? 'Suspend' : 'Reactivate'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-50"
                      >
                        {actionLoading === sa.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : sa.isActive ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {/* Delete */}
                      {deleteConfirm === sa.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(sa.id)}
                            disabled={actionLoading === sa.id}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-60"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs border border-gray-200 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(sa.id)}
                          title="Remove"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>How it works:</strong> Team members can log in at your planner URL using the credentials you create here.
        All their activity (visits, itineraries, bookings) is tracked and attributed to them in your CRM analytics.
      </div>
    </div>
  )
}
