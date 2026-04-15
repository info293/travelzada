'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, loginWithGoogle, currentUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Set page SEO
    document.title = 'Login | Travelzada - Sign In to Your Account'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Sign in to your Travelzada account for personalized travel recommendations, saved itineraries, and exclusive deals on travel packages.')
    }

    if (currentUser) {
      router.push('/')
    }
  }, [currentUser, router])


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    })
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
    }
  }

  const validate = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      await login(formData.email, formData.password)
      router.push('/')
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Failed to sign in. Please check your credentials.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
      router.push('/')
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Failed to sign in with Google.'
      })
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
      <Header />

      {/* Decorative blobs */}
      <div className="absolute top-32 right-0 w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />

      <section className="py-16 px-4 md:px-12 relative z-10 flex items-center min-h-[calc(100vh-160px)]">
        <div className="max-w-5xl mx-auto w-full grid lg:grid-cols-[1fr_420px] gap-12 items-center">

          {/* Left — brand content */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                AI-Powered Travel
              </span>
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Welcome back to<br />
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  your journey
                </span>
              </h1>
              <p className="text-gray-500 text-base leading-relaxed max-w-sm">
                Sign in to access your personalized itineraries, saved packages, and exclusive travel deals.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {[
                { label: 'AI Trip Planner', sub: 'Personalized routes in seconds', color: 'from-purple-50 to-indigo-50' },
                { label: 'Saved Itineraries', sub: 'Pick up where you left off', color: 'from-pink-50 to-rose-50' },
                { label: 'Exclusive Deals', sub: 'Members-only pricing', color: 'from-amber-50 to-orange-50' },
                { label: '24/7 Support', sub: 'Always here to help', color: 'from-green-50 to-emerald-50' },
              ].map(c => (
                <div key={c.label} className={`p-4 rounded-2xl bg-gradient-to-br ${c.color} border border-white/80`}>
                  <p className="text-sm font-semibold text-gray-800 mb-0.5">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="w-full">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-purple-900/5 p-8">
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your credentials to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                        errors.email
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">{errors.email}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Your password"
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                        errors.password
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                      }`}
                    />
                  </div>
                  {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>

                {errors.submit && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <span className="flex-shrink-0 mt-0.5">⚠</span>
                    {errors.submit}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-purple-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in…
                    </>
                  ) : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-purple-600 font-semibold hover:text-purple-700 hover:underline">
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
