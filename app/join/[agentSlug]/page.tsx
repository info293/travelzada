'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Building2, User, Mail, Phone, Lock, Star, MessageSquare, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface AgentInfo {
  id: string
  companyName: string
  contactName: string
  logoUrl?: string
  agentSlug: string
}

const PERKS = [
  { icon: MessageSquare, text: 'Receive quotation requests directly from the agency' },
  { icon: TrendingUp, text: 'Track your bookings and commissions in real time' },
  { icon: Star, text: 'Access AI-powered travel planning tools' },
]

export default function TravelAgentJoinPage() {
  const params = useParams()
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
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Invalid Registration Link</h1>
          <p className="text-sm text-gray-500">This link is not valid or the agency is no longer active.</p>
          <Link href="/" className="inline-block mt-5 text-sm text-violet-600 font-semibold hover:underline">Go to Travelzada →</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Your request to join <strong className="text-gray-800">{agentInfo?.companyName}</strong> has been sent.
            The agency manager will review and approve your account.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            We'll notify you at <strong>{form.email}</strong> once approved.
          </div>
          <Link href="/" className="inline-block mt-6 text-sm text-gray-400 hover:text-gray-600">← Back to Travelzada</Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — agency branding ── */}
      <div className="hidden lg:flex flex-col w-[420px] flex-shrink-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/3 rounded-full" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/3 rounded-full" />
        </div>

        <div className="relative flex flex-col h-full px-10 py-12">
          {/* Agency branding block */}
          <div className="mb-12">
            {agentInfo?.logoUrl ? (
              <img src={agentInfo.logoUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border border-white/10 mb-5" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                <Building2 className="w-8 h-8 text-white/60" />
              </div>
            )}
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">You're joining</p>
            <h1 className="text-3xl font-bold text-white leading-tight mb-1">{agentInfo?.companyName}</h1>
            <p className="text-white/50 text-sm">Powered by Travelzada</p>
          </div>

          {/* What you get */}
          <div className="mb-10">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-5">As a travel agent, you'll get</p>
            <div className="space-y-5">
              {PERKS.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <p.icon className="w-4 h-4 text-white/70" />
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{p.text}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          <div className="pt-8 border-t border-white/10">
            <p className="text-white/30 text-xs">Your account will be active after approval by {agentInfo?.companyName}.</p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            {agentInfo?.logoUrl ? (
              <img src={agentInfo.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-200 mx-auto mb-3" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6 text-violet-600" />
              </div>
            )}
            <h1 className="font-bold text-gray-900">{agentInfo?.companyName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Powered by Travelzada</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-8">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-gray-900">Create your agent account</h2>
              <p className="text-gray-500 text-sm mt-1">Fill in your details to send a join request</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Priya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    required
                    placeholder="priya@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    required
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-violet-600/20 mt-2"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
                  : 'Send Join Request'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-5">
              <Link href="/" className="hover:text-gray-600">← Back to Travelzada</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
