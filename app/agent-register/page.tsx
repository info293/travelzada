'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Building2, User, Phone, FileText, ChevronRight, Loader2, CheckCircle } from 'lucide-react'

const AGENCY_TYPES = [
  { value: 'individual', label: 'Individual Agent' },
  { value: 'small_agency', label: 'Small Agency (1–10 staff)' },
  { value: 'large_agency', label: 'Large Agency (10+ staff)' },
  { value: 'franchise', label: 'Franchise / Brand' },
]

export default function AgentRegisterPage() {
  const router = useRouter()

  const [step, setStep] = useState<'details' | 'account' | 'submitted'>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    gstNumber: '',
    agencyType: 'individual',
    desiredSlug: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      // 1. Create Firebase Auth account
      const { auth, db } = await import('@/lib/firebase')
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')

      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const uid = cred.user.uid

      // 2. Create base user doc
      await setDoc(doc(db, 'users', uid), {
        email: form.email,
        displayName: form.contactName,
        role: 'agent',
        agentStatus: 'pending',
        agentSlug: '',
        createdAt: serverTimestamp(),
        isActive: true,
        permissions: [],
      })

      // 3. Register agent via API (creates agents document + updates user with slug)
      const res = await fetch('/api/agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email: form.email,
          companyName: form.companyName,
          contactName: form.contactName,
          phone: form.phone,
          gstNumber: form.gstNumber,
          agencyType: form.agencyType,
          desiredSlug: form.desiredSlug || form.companyName,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')

      setStep('submitted')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for registering with Travelzada. Our team will review your application
            and you'll receive login credentials and your unique URL within 24–48 hours.
          </p>
          <p className="text-sm text-gray-500 mb-8">Check your email at <strong>{form.email}</strong> for updates.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Back to Home
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-600 px-8 py-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-6 h-6" />
            <span className="text-sm font-medium opacity-80 uppercase tracking-widest">Agent Platform</span>
          </div>
          <h1 className="text-3xl font-bold">Join Travelzada</h1>
          <p className="mt-2 opacity-80 text-sm">
            Get your own branded AI travel planner at travelzada.com/tailored-travel/your-name
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Agency Details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company / Agency Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                  placeholder="Sunrise Travels Pvt Ltd"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="contactName"
                  value={form.contactName}
                  onChange={handleChange}
                  required
                  placeholder="Ravindra Nath Jha"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="gstNumber"
                  value={form.gstNumber}
                  onChange={handleChange}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agency Type *</label>
              <select
                name="agencyType"
                value={form.agencyType}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {AGENCY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred URL Slug</label>
              <div className="flex items-center gap-0">
                <span className="text-xs text-gray-400 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl px-2 py-2.5 whitespace-nowrap">
                  /tailored-travel/
                </span>
                <input
                  name="desiredSlug"
                  value={form.desiredSlug}
                  onChange={handleChange}
                  placeholder="ravindra"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Auto-generated from company name if left blank.</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-4">Account Credentials</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="ravindra@agency.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Repeat password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            ) : (
              <><span>Submit Application</span><ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already registered?{' '}
            <Link href="/agent-login" className="text-purple-600 font-medium hover:underline">
              Sign in to your dashboard
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
