'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Building2 } from 'lucide-react'
import Link from 'next/link'

interface AgentInfo {
  id: string
  companyName: string
  contactName: string
  logoUrl?: string
  agentSlug: string
}

export default function TravelAgentJoinPage() {
  const params = useParams()
  const router = useRouter()
  const agentSlug = params.agentSlug as string

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [agentLoading, setAgentLoading] = useState(true)
  const [agentNotFound, setAgentNotFound] = useState(false)

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agent/profile?slug=${agentSlug}`)
        const data = await res.json()
        if (data.success && data.agent?.status === 'active') {
          setAgentInfo(data.agent)
        } else {
          setAgentNotFound(true)
        }
      } catch { setAgentNotFound(true) } finally { setAgentLoading(false) }
    }
    fetchAgent()
  }, [agentSlug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/agent/subagents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentInfo!.id,
          agentSlug,
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          selfRegister: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally { setSubmitting(false) }
  }

  if (agentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (agentNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Invalid Registration Link</h1>
          <p className="text-sm text-gray-500 mt-1">This link is not valid or the agency is no longer active.</p>
          <Link href="/" className="text-sm text-primary hover:underline mt-4 block">Go to Travelzada →</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
          <p className="text-sm text-gray-500 mb-1">
            Your request to join <strong>{agentInfo?.companyName}</strong> has been sent.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            The agency manager will review and approve your account. You'll receive an email once approved.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Check your email</strong> at <strong>{form.email}</strong> for a confirmation.
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8"
      >
        {/* Agency branding */}
        <div className="text-center mb-8">
          {agentInfo?.logoUrl ? (
            <img src={agentInfo.logoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-gray-200 mx-auto mb-3" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900">{agentInfo?.companyName}</h1>
          <p className="text-sm text-gray-500 mt-1">Join as a Travel Agent</p>
          <p className="text-xs text-gray-400 mt-0.5">Powered by Travelzada</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
              placeholder="Priya Sharma"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
              placeholder="priya@example.com"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+91 98765 43210"
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
                required
                placeholder="Min. 8 characters"
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password *</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
              required
              placeholder="Repeat password"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : 'Submit Registration'}
          </button>

          <p className="text-xs text-center text-gray-400">
            Your account will be active after approval by {agentInfo?.companyName}.
          </p>
        </form>
      </motion.div>
    </div>
  )
}
