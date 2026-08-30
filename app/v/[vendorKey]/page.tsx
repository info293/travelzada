'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SpinWheel from '@/components/vendor/SpinWheel'
import { Vendor, VendorReward } from '@/components/admin/types'
import { CheckCircle2, XCircle, Phone, MessageSquare, ArrowRight, User, Mail } from 'lucide-react'

export default function VendorLandingPage() {
  const params = useParams()
  const vendorKey = params?.vendorKey as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Step state: 1 = Quiz, 2 = Spin Wheel, 3 = Claim Lead Form, 4 = Digital Voucher Pass
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Quiz state
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [quizPassed, setQuizPassed] = useState(false)

  // Spin Wheel state
  const [wonReward, setWonReward] = useState<VendorReward | null>(null)

  // Lead collection state
  const [userName, setUserName] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [claimResult, setClaimResult] = useState<{ claimCode: string } | null>(null)

  useEffect(() => {
    if (vendorKey) {
      fetchVendor()
    }
  }, [vendorKey])

  const fetchVendor = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vendors/${vendorKey}`)
      const data = await res.json()
      if (data.success && data.vendor) {
        setVendor(data.vendor)
      } else {
        setError(data.error || 'Vendor profile not found.')
      }
    } catch (e: any) {
      console.error('Error fetching vendor:', e)
      setError('Failed to load vendor offer. Please check your link.')
    } finally {
      setLoading(false)
    }
  }

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index)
    setQuizError(null)

    if (!vendor?.questionData) return

    const correctIndex = vendor.questionData.correctOptionIndex ?? 0
    if (index === correctIndex) {
      setQuizPassed(true)
      setTimeout(() => {
        setStep(2) // Move to Spin Wheel
      }, 700)
    } else {
      setQuizError('Incorrect answer! Please try another option.')
    }
  }

  const handleSpinEnd = (reward: VendorReward) => {
    setWonReward(reward)
    setTimeout(() => {
      setStep(3) // Move to Claim Form
    }, 1000)
  }

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userName.trim() || !userPhone.trim() || !wonReward) {
      alert('Please enter your full name and valid phone number.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vendor-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: vendor?.id,
          vendorKey: vendor?.vendorKey,
          vendorName: vendor?.name,
          userName: userName.trim(),
          userPhone: userPhone.trim(),
          userEmail: userEmail.trim(),
          rewardTitle: wonReward.title,
          rewardCode: wonReward.code,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setClaimResult({ claimCode: data.claimCode })
        setStep(4) // Show Voucher Pass
      } else {
        alert(data.error || 'Failed to submit claim. Please try again.')
      }
    } catch (e) {
      console.error('Submit claim error:', e)
      alert('Failed to submit claim. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf9f3] text-gray-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <img
            src="/images/logo/Travelzada Logo April (1).png"
            alt="Travelzada Logo"
            className="h-12 w-auto object-contain mx-auto animate-pulse"
          />
          <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 font-medium text-xs">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-[#fdf9f3] text-gray-900 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 max-w-sm w-full text-center shadow-md">
          <img
            src="/images/logo/Travelzada Logo April (1).png"
            alt="Travelzada Logo"
            className="h-10 w-auto object-contain mx-auto mb-4"
          />
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Offer Not Found</h2>
          <p className="text-gray-500 text-xs mb-5">{error || 'This QR Code offer is inactive or invalid.'}</p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs rounded-xl shadow transition"
          >
            Visit Travelzada Home
          </a>
        </div>
      </div>
    )
  }

  const safeQuestion = vendor.questionData?.question || 'What is Travelzada\'s top beach destination?'
  const safeOptions = vendor.questionData?.options && vendor.questionData.options.length === 4
    ? vendor.questionData.options
    : ['Bali', 'Dubai', 'Maldives', 'Paris']
  const correctIdx = vendor.questionData?.correctOptionIndex ?? 0

  return (
    <div className="h-screen max-h-screen bg-[#fdf9f3] text-gray-900 flex flex-col justify-between p-3 sm:p-5 overflow-hidden select-none">
      
      {/* TOP HEADER: Travelzada Brand Logo Only */}
      <header className="w-full max-w-md mx-auto text-center pt-1 pb-1 shrink-0">
        <img
          src="/images/logo/Travelzada Logo April (1).png"
          alt="Travelzada Logo"
          className="h-9 sm:h-11 w-auto object-contain mx-auto"
        />
      </header>

      {/* MAIN CONTAINER: Travelzada Standard Clean Box */}
      <main className="w-full max-w-md bg-white border border-purple-100 rounded-3xl p-4 sm:p-6 shadow-xl my-auto mx-auto shrink-0">
        
        {/* STEP 1: QUIZ CHALLENGE */}
        {step === 1 && (
          <div className="space-y-3">
            
            <div className="text-center">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold tracking-wider">
                Answer & Win Rewards
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-1 leading-snug">
                {safeQuestion}
              </h2>
            </div>

            {/* 4 Options Grid */}
            <div className="space-y-2 pt-1">
              {safeOptions.map((option, idx) => {
                const isSelected = selectedOption === idx
                const isCorrect = idx === correctIdx

                let btnStyle = "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800"
                if (isSelected) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-600 border-emerald-700 text-white shadow"
                  } else {
                    btnStyle = "bg-rose-600 border-rose-700 text-white shadow"
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={quizPassed}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-sm font-medium text-left transition flex items-center justify-between active:scale-[0.99] ${btnStyle}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </span>
                    {isSelected && isCorrect && <CheckCircle2 className="w-5 h-5 text-white" />}
                    {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-white" />}
                  </button>
                )
              })}
            </div>

            {/* Feedback Messages */}
            {quizError && (
              <p className="text-xs font-semibold text-rose-600 text-center pt-1">
                {quizError}
              </p>
            )}

            {quizPassed && (
              <p className="text-xs font-bold text-emerald-600 text-center flex items-center justify-center gap-1 pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Correct Answer! Opening Spin Wheel...
              </p>
            )}

          </div>
        )}

        {/* STEP 2: SPIN WHEEL */}
        {step === 2 && (
          <div className="space-y-2 text-center">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Spin the Wheel to Claim Reward
            </h2>

            <SpinWheel
              rewards={vendor.rewards}
              onSpinEnd={handleSpinEnd}
            />

            {wonReward && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl animate-pulse mt-2">
                <p className="text-xs text-purple-900 font-bold">Prize Won: {wonReward.title}</p>
                <p className="text-[11px] text-gray-500">Opening Claim Form...</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: LEAD FORM */}
        {step === 3 && wonReward && (
          <div className="space-y-4">
            
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Claim Your Reward
              </h2>

              {/* Clear & Prominent Prize Card */}
              <div className="mt-2 p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl text-left shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-purple-700 font-extrabold uppercase tracking-wider">You Won:</p>
                    <p className="text-base sm:text-lg font-black text-gray-900 leading-tight">{wonReward.title}</p>
                  </div>
                  {wonReward.code && (
                    <span className="px-3 py-1 bg-[#7c3aed] text-white font-mono font-bold text-xs rounded-lg shadow-sm shrink-0">
                      {wonReward.code}
                    </span>
                  )}
                </div>
                {wonReward.description && (
                  <p className="text-xs text-gray-600 mt-1 font-medium">{wonReward.description}</p>
                )}
              </div>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile / WhatsApp Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit mobile number"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-sm rounded-xl transition shadow flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : <>Claim "{wonReward.title}" <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

          </div>
        )}

        {/* STEP 4: DIGITAL VOUCHER PASS */}
        {step === 4 && claimResult && wonReward && (
          <div className="space-y-4 text-center">
            
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-emerald-600">Claim Confirmed</span>
              <h2 className="text-xl font-bold text-gray-900 mt-0.5">Digital Reward Voucher</h2>
            </div>

            <div className="bg-gradient-to-b from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 text-left shadow-sm">
              <p className="text-[10px] font-bold text-purple-700 uppercase">Vendor</p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{vendor.name}</h3>

              <div className="border-t border-b border-dashed border-purple-200 py-2 my-2">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Prize Won:</p>
                <p className="text-lg font-bold text-purple-800">{wonReward.title}</p>
                {wonReward.code && (
                  <p className="text-xs text-gray-600 font-mono mt-0.5">Code: <span className="font-bold">{wonReward.code}</span></p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Claim Code:</p>
                  <p className="text-base font-mono font-bold text-emerald-600">{claimResult.claimCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Claimed By:</p>
                  <p className="text-xs font-bold text-gray-800">{userName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {vendor.phone && (
                <a
                  href={`https://wa.me/${vendor.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${vendor.name}, I claimed my reward "${wonReward.title}" (Claim Code: ${claimResult.claimCode}). How can I redeem it?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow"
                >
                  <MessageSquare className="w-4 h-4" /> Redeem via WhatsApp
                </a>
              )}

              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5 text-purple-600" /> Call Vendor ({vendor.phone})
                </a>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-md mx-auto text-center py-1 text-gray-400 text-[11px] shrink-0">
        Powered by <span className="font-semibold text-gray-600">Travelzada</span>
      </footer>

    </div>
  )
}
