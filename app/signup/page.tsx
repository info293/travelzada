'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function SignupPage() {
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [infoMessage, setInfoMessage] = useState('')

  const { signup, loginWithGoogle, currentUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Set page SEO
    document.title = 'Sign Up | Travelzada - Create Your Account'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Create your free Travelzada account to access AI-powered travel planning, exclusive deals, and personalized travel recommendations.'
      )
    }

    if (currentUser) {
      router.push('/')
    }
  }, [currentUser, router])

  // Countdown timer for OTP Resend
  useEffect(() => {
    if (step !== 'otp' || resendTimer <= 0) return

    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [step, resendTimer])

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

  const validateDetails = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle Step 1: Send OTP code to email
  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateDetails()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setInfoMessage('')

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code.')
      }

      setStep('otp')
      setResendTimer(60)
      setInfoMessage(`We've sent a 6-digit verification code to ${formData.email.trim()}`)
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Failed to send verification code. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSubmitting) return

    setIsSubmitting(true)
    setErrors({})
    setInfoMessage('')

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code.')
      }

      setResendTimer(60)
      setInfoMessage('A new 6-digit verification code has been sent to your email!')
    } catch (error: any) {
      setErrors({
        otp: error.message || 'Failed to resend verification code.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // OTP input handlers
  const handleOtpDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)

    if (errors.otp) {
      setErrors({ ...errors, otp: '' })
    }

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('')
      setOtpDigits(digits)
      if (errors.otp) setErrors({ ...errors, otp: '' })
      const lastInput = document.getElementById('otp-digit-5')
      if (lastInput) lastInput.focus()
    }
  }

  // Handle Step 2: Verify OTP and create account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    const code = otpDigits.join('')
    if (code.length !== 6) {
      setErrors({ otp: 'Please enter all 6 digits of the verification code' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      // 1. Verify OTP with API
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          otp: code,
        }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Invalid verification code')
      }

      // 2. Register user with Firebase Auth
      await signup(formData.email.trim(), formData.password)

      // 3. Update Firebase display name if possible
      try {
        const { auth, db } = await import('@/lib/firebase')
        const { updateProfile } = await import('firebase/auth')
        const { doc, updateDoc } = await import('firebase/firestore')

        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, { displayName: formData.name.trim() })
          if (db) {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              displayName: formData.name.trim(),
              emailVerified: true,
            })
          }
        }
      } catch (err) {
        console.warn('Non-critical: error setting display name', err)
      }

      // 4. Send Welcome Email
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'customer_signup',
          data: { name: formData.name.trim(), email: formData.email.trim() },
        }),
      }).catch(() => {})

      // 5. Redirect to Home
      router.push('/')
    } catch (error: any) {
      setErrors({
        otp: error.message || 'Verification failed. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      await loginWithGoogle()
      router.push('/')
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Failed to sign up with Google.',
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
        <div className="max-w-5xl mx-auto w-full grid lg:grid-cols-[1fr_440px] gap-12 items-center">
          {/* Left — brand content */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                Join Thousands
              </span>
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Start your<br />
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  adventure today
                </span>
              </h1>
              <p className="text-gray-500 text-base leading-relaxed max-w-sm">
                Create a free account and unlock AI-powered travel planning, exclusive deals, and personalized recommendations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {[
                { label: 'AI Trip Planner', sub: 'Personalized routes in seconds', color: 'from-purple-50 to-indigo-50' },
                { label: 'Exclusive Deals', sub: 'Members-only pricing', color: 'from-pink-50 to-rose-50' },
                { label: 'Saved Itineraries', sub: 'Access anywhere, anytime', color: 'from-amber-50 to-orange-50' },
                { label: '24/7 Support', sub: 'Always here to help', color: 'from-green-50 to-emerald-50' },
              ].map((c) => (
                <div key={c.label} className={`p-4 rounded-2xl bg-gradient-to-br ${c.color} border border-white/80`}>
                  <p className="text-sm font-semibold text-gray-800 mb-0.5">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form / OTP Step */}
          <div className="w-full">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-purple-900/5 p-8">
              {step === 'details' ? (
                <>
                  <div className="mb-7">
                    <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
                    <p className="text-gray-500 text-sm mt-1">Free forever · No credit card needed</p>
                  </div>

                  <form onSubmit={handleSubmitDetails} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <svg
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your full name"
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                            errors.name
                              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                          }`}
                        />
                      </div>
                      {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <svg
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
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
                      {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <svg
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="At least 8 characters"
                          className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                            errors.password
                              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.03 10.03 0 014.122-.963c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"
                              />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <svg
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Re-enter your password"
                          className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                            errors.confirmPassword
                              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.03 10.03 0 014.122-.963c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"
                              />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleChange}
                        className="mt-0.5 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-xs text-gray-500">
                        I agree to the{' '}
                        <Link href="/terms" className="text-purple-600 font-semibold hover:underline">
                          Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-purple-600 font-semibold hover:underline">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {errors.agreeToTerms && <p className="text-xs text-red-600 -mt-2">{errors.agreeToTerms}</p>}

                    {errors.submit && (
                      <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                        <span className="flex-shrink-0 mt-0.5">⚠</span>
                        {errors.submit}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-purple-600/20 mt-2"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sending verification code…
                        </>
                      ) : (
                        'Continue to Verification →'
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-500">
                      Already have an account?{' '}
                      <Link href="/login" className="text-purple-600 font-semibold hover:text-purple-700 hover:underline">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </>
              ) : (
                /* Step 2: OTP Verification UI */
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto text-2xl">
                      ✉️
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
                    <p className="text-sm text-gray-500">
                      We sent a 6-digit code to{' '}
                      <span className="font-semibold text-gray-800">{formData.email.trim()}</span>
                    </p>
                  </div>

                  {infoMessage && (
                    <div className="bg-purple-50 border border-purple-100 text-purple-700 text-xs px-4 py-3 rounded-xl text-center font-medium">
                      {infoMessage}
                    </div>
                  )}

                  {errors.otp && (
                    <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">
                      <span>⚠</span> {errors.otp}
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    {/* 6 OTP Inputs */}
                    <div className="flex justify-between items-center gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-digit-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="w-12 h-14 text-center text-xl font-bold border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || otpDigits.join('').length !== 6}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-purple-600/20"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Verifying & Creating Account…
                        </>
                      ) : (
                        'Verify & Complete Signup'
                      )}
                    </button>
                  </form>

                  {/* Resend & Change Email Actions */}
                  <div className="space-y-3 pt-2 text-center text-xs">
                    <div>
                      {resendTimer > 0 ? (
                        <span className="text-gray-400">
                          Resend code in <strong className="text-gray-600">{resendTimer}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSubmitting}
                          className="text-purple-600 font-semibold hover:underline disabled:opacity-50"
                        >
                          Didn&apos;t receive code? Resend Code
                        </button>
                      )}
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('details')
                          setErrors({})
                          setInfoMessage('')
                        }}
                        className="text-gray-500 hover:text-gray-700 underline"
                      >
                        ← Edit email address or details
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
