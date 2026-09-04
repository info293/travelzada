'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SpinWheel from '@/components/vendor/SpinWheel'
import CongratulationsModal from '@/components/vendor/CongratulationsModal'
import { Vendor, VendorReward } from '@/components/admin/types'
import {
  CheckCircle2, XCircle, Phone, MessageSquare, ArrowRight, User, Mail, Gift, MapPin, Award,
  ShieldCheck, Zap, Trophy, Plane, Compass
} from 'lucide-react'

// High-resolution default destination option photos matching screenshot options (Bali, Paris, Tokyo, Swiss Alps)
const DEFAULT_OPTION_IMAGES = [
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80', // Bali Beach
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80', // Paris Eiffel
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80', // Tokyo Mt Fuji
  'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&q=80', // Swiss Alps
]

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
  const [showCongratulationModal, setShowCongratulationModal] = useState(false)

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
  }

  const handleSubmitAnswer = () => {
    if (selectedOption === null) {
      setQuizError('Please select an option to submit your answer!')
      return
    }

    if (!vendor?.questionData) return

    const correctIndex = vendor.questionData.correctOptionIndex ?? 0
    if (selectedOption === correctIndex) {
      setQuizPassed(true)
      setQuizError(null)
      setShowCongratulationModal(true)
    } else {
      setQuizError('Incorrect answer! Please try another option.')
    }
  }

  const handleProceedToSpin = () => {
    setShowCongratulationModal(false)
    setStep(2) // Move to Spin Wheel
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
      <div className="min-h-screen bg-[#f3f7fb] text-gray-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <img
            src="/images/logo/Travelzada Logo April (1).png"
            alt="Travelzada Logo"
            className="h-12 w-auto object-contain mx-auto animate-pulse"
          />
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 font-medium text-xs">Loading campaign details...</p>
        </div>
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-[#f3f7fb] text-gray-900 flex items-center justify-center p-4">
        <div className="bg-white border border-purple-100 rounded-3xl p-7 max-w-sm w-full text-center shadow-xl">
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
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            Visit Travelzada Home
          </a>
        </div>
      </div>
    )
  }

  const safeQuestion = vendor.questionData?.question || 'Which of the following is Travelzada\'s top beach destination?'
  const safeOptions = vendor.questionData?.options && vendor.questionData.options.length === 4
    ? vendor.questionData.options
    : ['Bali', 'Paris', 'Tokyo', 'Swiss Alps']
  const optionPhotos = vendor.questionData?.optionImages && vendor.questionData.optionImages.length === 4
    ? vendor.questionData.optionImages
    : DEFAULT_OPTION_IMAGES
  const correctIdx = vendor.questionData?.correctOptionIndex ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#b8e4f0] via-[#e2f1f8] to-[#f5f0eb] text-gray-900 flex flex-col justify-between p-3 sm:p-6 overflow-y-auto select-none relative font-sans">
      
      {/* TROPICAL BEACH BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 w-44 sm:w-64 md:w-80 h-44 sm:h-64 pointer-events-none z-0 opacity-85">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-emerald-800/40">
          <path d="M-20 -20 C 60 20, 100 80, 140 130 C 110 100, 70 60, -20 -20 Z" fill="#2d6a4f" opacity="0.6"/>
          <path d="M-10 -40 C 80 10, 120 70, 160 110 C 120 90, 60 50, -10 -40 Z" fill="#1b4332" opacity="0.7"/>
          <path d="M-30 0 C 40 40, 80 110, 120 160 C 90 120, 40 70, -30 0 Z" fill="#40916c" opacity="0.5"/>
        </svg>
      </div>

      <div className="absolute top-0 right-0 w-44 sm:w-64 md:w-80 h-44 sm:h-64 pointer-events-none z-0 opacity-85">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-emerald-800/40">
          <path d="M220 -20 C 140 20, 100 80, 60 130 C 90 100, 130 60, 220 -20 Z" fill="#2d6a4f" opacity="0.6"/>
          <path d="M210 -40 C 120 10, 80 70, 40 110 C 80 90, 140 50, 210 -40 Z" fill="#1b4332" opacity="0.7"/>
          <path d="M230 0 C 160 40, 120 110, 80 160 C 110 120, 160 70, 230 0 Z" fill="#40916c" opacity="0.5"/>
        </svg>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-200/40 rounded-full blur-3xl pointer-events-none z-0" />

      {/* TOP HEADER LOGO & BRAND TAGLINE */}
      <header className="w-full max-w-5xl mx-auto text-center pt-1 pb-1 shrink-0 relative z-10">
        <div className="inline-flex flex-col items-center">
          <img
            src="/images/logo/Travelzada Logo April (1).png"
            alt="Travelzada Logo"
            className="h-9 sm:h-11 w-auto object-contain mx-auto filter drop-shadow-sm"
          />
          <p className="text-xs sm:text-sm font-normal text-slate-700 tracking-wide mt-0.5">
            Travel More. Win More.
          </p>
          <div className="flex items-center gap-1 mt-0.5 text-purple-600">
            <span className="text-[10px]">✦</span>
            <span className="w-8 h-[1px] bg-purple-300" />
            <span className="text-[10px]">✦</span>
            <span className="w-8 h-[1px] bg-purple-300" />
            <span className="text-[10px]">✦</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID CONTAINER */}
      <div className="w-full max-w-5xl mx-auto my-auto py-1 relative z-10 shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          
          {/* LEFT CARD: Vendor Info & Campaign Benefits (Hidden on Mobile View) */}
          <div className="hidden lg:flex lg:col-span-5 bg-white/95 backdrop-blur-md border border-purple-100 rounded-2xl p-3.5 sm:p-4 shadow-lg flex-col justify-between text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/50 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-normal shadow-2xs">
                <Award className="w-3.5 h-3.5 text-purple-600" /> Verified Partner Campaign
              </div>

              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {vendor.logoUrl ? (
                    <img
                      src={vendor.logoUrl}
                      alt={vendor.name}
                      className="w-11 h-11 rounded-xl object-cover border border-purple-100 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 text-white font-medium text-lg flex items-center justify-center shadow-xs shrink-0">
                      {vendor.name ? vendor.name.charAt(0).toUpperCase() : 'T'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 text-[9.5px] font-medium rounded uppercase tracking-wider mb-0.5">
                      {vendor.category || 'TRAVEL PARTNER'}
                    </span>
                    <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight truncate">
                      {vendor.name}
                    </h1>
                  </div>
                </div>

                <div className="relative w-12 h-12 shrink-0 hidden sm:flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-dashed border-purple-200 animate-spin-slow" />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 via-sky-100 to-purple-100 flex items-center justify-center p-1 shadow-inner">
                    <Compass className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-2.5 space-y-2 shadow-2xs">
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-purple-600" /> EXCLUSIVE CAMPAIGN BENEFITS
                </h3>
                
                <ul className="space-y-2 text-xs text-gray-600 font-normal">
                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-[9px]">
                      <Trophy className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <span className="text-gray-900 font-medium block">Win Guaranteed Rewards</span>
                      <span className="text-gray-500 text-[11px]">Spin the wheel to unlock exclusive discounts & gift vouchers.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-[9px]">
                      <Zap className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <span className="text-gray-900 font-medium block">Instant Digital Pass</span>
                      <span className="text-gray-500 text-[11px]">Claim code generated instantly for quick redemption on WhatsApp.</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-[9px]">
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <span className="text-gray-900 font-medium block">100% Verified Deals</span>
                      <span className="text-gray-500 text-[11px]">Powered by Travelzada&apos;s official partner network.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-purple-100/80 relative">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">CAMPAIGN FLOW</p>
              <div className="grid grid-cols-4 gap-1 text-center relative z-10">
                <div className={`py-1 px-1 rounded-lg text-[10.5px] font-medium transition flex items-center justify-center gap-1 ${step === 1 ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' : 'bg-purple-50/80 text-purple-900'}`}>
                  <span className="w-3.5 h-3.5 rounded-full bg-white/20 text-current flex items-center justify-center text-[9px]">1</span>
                  <span>Quiz</span>
                </div>
                <div className={`py-1 px-1 rounded-lg text-[10.5px] font-medium transition flex items-center justify-center gap-1 ${step === 2 ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' : 'bg-purple-50/80 text-purple-900'}`}>
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-[9px]">2</span>
                  <span>Spin</span>
                </div>
                <div className={`py-1 px-1 rounded-lg text-[10.5px] font-medium transition flex items-center justify-center gap-1 ${step === 3 ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' : 'bg-purple-50/80 text-purple-900'}`}>
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-[9px]">3</span>
                  <span>Claim</span>
                </div>
                <div className={`py-1 px-1 rounded-lg text-[10.5px] font-medium transition flex items-center justify-center gap-1 ${step === 4 ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' : 'bg-purple-50/80 text-purple-900'}`}>
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-[9px]">4</span>
                  <span>Voucher</span>
                </div>
              </div>

              {/* Dotted Flight Path */}
              <div className="flex items-center justify-end mt-1 text-purple-400 pr-2">
                <div className="border-t border-dashed border-purple-300 w-full mr-2" />
                <Plane className="w-3 h-3 transform rotate-45 shrink-0" />
              </div>

              {/* Passport Stamp & Handwritten Text Decor */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] font-serif italic text-purple-400 flex items-center gap-1">
                  Collect Memories & Rewards ♡
                </p>
                
                <div className="w-8 h-8 rounded-full border border-purple-300/80 flex items-center justify-center text-[6.5px] font-mono text-purple-400 text-center uppercase leading-none transform -rotate-12 select-none opacity-80">
                  <span>★ PASSPORT ★<br />VERIFIED</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT CARD: Quiz / Spin / Claim Section */}
          <main className="lg:col-span-7 bg-white/95 backdrop-blur-md border border-purple-100 rounded-2xl p-3.5 sm:p-4 shadow-lg flex flex-col justify-between relative">
            {step === 1 && (
              <div className="space-y-2.5 my-auto">
                <div className="flex items-center justify-between gap-2">
                  <div className="mx-auto lg:mx-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-normal shadow-2xs">
                      <Gift className="w-3.5 h-3.5" /> Answer & Win Rewards
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 border border-purple-300/80 rounded-lg px-2 py-0.5 text-[9.5px] font-normal text-purple-400 uppercase tracking-wider transform rotate-3 select-none">
                    <span>ADVENTURE AWAITS</span>
                    <Plane className="w-2.5 h-2.5 text-purple-400" />
                  </div>
                </div>

                <div className="text-center pt-0.5">
                  <h2 className="text-base sm:text-lg lg:text-xl font-serif font-normal text-gray-900 leading-snug tracking-tight">
                    {safeQuestion}
                  </h2>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {safeOptions.map((optionText, idx) => {
                    const isSelected = selectedOption === idx
                    const isCorrect = idx === correctIdx
                    const optionPhoto = optionPhotos[idx] || DEFAULT_OPTION_IMAGES[idx % DEFAULT_OPTION_IMAGES.length]

                    let cardBorder = "border-purple-100 hover:border-purple-300 bg-white"
                    if (isSelected) {
                      if (quizPassed) {
                        cardBorder = "border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-50/40"
                      } else if (quizError && selectedOption === idx) {
                        cardBorder = "border-rose-500 ring-1 ring-rose-500/30 bg-rose-50/40"
                      } else {
                        cardBorder = "border-purple-600 ring-1 ring-purple-500/30 bg-purple-50/40"
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleOptionSelect(idx)}
                        disabled={quizPassed}
                        className={`w-full p-1.5 px-2.5 rounded-lg border text-left transition-all duration-200 flex items-center justify-between gap-2.5 shadow-2xs hover:shadow-xs active:scale-[0.99] ${cardBorder}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-6 h-6 rounded flex items-center justify-center font-medium text-xs shrink-0 transition ${isSelected ? 'bg-purple-600 text-white shadow-2xs' : 'bg-purple-100 text-purple-800'}`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="font-normal text-gray-800 text-xs sm:text-sm truncate">
                            {optionText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {optionPhoto && (
                            <img
                              src={optionPhoto}
                              alt={optionText}
                              className="w-14 sm:w-20 h-9 sm:h-10 object-cover rounded-md border border-gray-100 shadow-2xs"
                            />
                          )}
                          {isSelected && isCorrect && quizPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          {isSelected && !isCorrect && quizError && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {quizError && (
                  <p className="text-xs font-normal text-rose-600 text-center bg-rose-50 border border-rose-200 py-1 px-2.5 rounded-md">
                    {quizError}
                  </p>
                )}

                {quizPassed && (
                  <p className="text-xs font-normal text-emerald-700 text-center bg-emerald-50 border border-emerald-200 py-1 px-2.5 rounded-md flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct Answer! Opening Spin Wheel...
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1.5 border-t border-purple-100">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <img className="inline-block h-5 w-5 rounded-full ring-1 ring-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" alt="Traveler" />
                      <img className="inline-block h-5 w-5 rounded-full ring-1 ring-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" alt="Traveler" />
                      <img className="inline-block h-5 w-5 rounded-full ring-1 ring-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="Traveler" />
                    </div>
                    <p className="text-[10px] font-normal text-gray-500 leading-tight">
                      Join thousands of smart travelers<br />winning exciting rewards daily!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={quizPassed}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5 text-purple-200" />
                    <span>Submit Answer</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SPIN WHEEL VIEW */}
            {step === 2 && (
              <div className="space-y-2 text-center my-auto relative">
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-normal shadow-2xs">
                    <Gift className="w-3.5 h-3.5 text-purple-600" /> Guaranteed Spin & Win
                  </span>
                  <h2 className="text-base sm:text-lg lg:text-xl font-serif font-normal text-gray-900 leading-snug">
                    Spin the Wheel to Claim Reward
                  </h2>
                  <p className="text-xs text-gray-500 font-normal">
                    Every spin wins something exciting!
                  </p>
                </div>

                <SpinWheel
                  rewards={vendor.rewards}
                  onSpinEnd={handleSpinEnd}
                />

                {wonReward && (
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg animate-pulse mt-1">
                    <p className="text-xs text-purple-900 font-medium">Prize Won: {wonReward.title}</p>
                    <p className="text-[10px] text-gray-500">Opening Claim Form...</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: CLAIM REWARD LEAD FORM */}
            {step === 3 && wonReward && (
              <div className="space-y-2.5 my-auto relative">
                <div className="text-center space-y-0.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-normal shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reward Won!
                  </span>

                  <h2 className="text-lg sm:text-xl font-serif font-medium text-gray-900 tracking-tight pt-0.5">
                    Claim Your Reward
                  </h2>
                  <p className="text-xs text-gray-500 font-normal">
                    Almost there! Fill in your details to claim your reward.
                  </p>
                </div>

                <div className="p-3 sm:p-3.5 bg-gradient-to-r from-purple-50/80 via-indigo-50/60 to-purple-50/80 border border-purple-100 rounded-xl relative overflow-hidden shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-[9px] font-medium text-purple-700 uppercase tracking-widest block">
                        YOU WON
                      </span>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                        {wonReward.title}
                      </h3>
                      <p className="text-xs text-gray-600 font-normal">
                        {wonReward.description || 'Flat cashback on your next booking'}
                      </p>
                    </div>

                    <div className="relative shrink-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg shadow-2xs flex items-center justify-center p-1.5 transform rotate-3">
                        <Gift className="w-6 h-6 text-amber-300" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 font-medium text-[8px] uppercase px-1 py-0.5 rounded shadow-2xs border border-amber-200 transform -rotate-6">
                        SAVE {wonReward.title.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 pt-2 mt-2 border-t border-purple-200/60 text-[10px] font-normal text-purple-900">
                    <span className="px-1.5 py-0.5 rounded bg-white/80 border border-purple-200/80 flex items-center gap-1 shadow-2xs">
                      <Plane className="w-2.5 h-2.5 text-purple-600" /> Flights, Hotels & Packages
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/80 border border-purple-200/80 flex items-center gap-1 shadow-2xs">
                      <Zap className="w-2.5 h-2.5 text-purple-600" /> Instant Use
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/80 border border-purple-200/80 flex items-center gap-1 shadow-2xs">
                      <Award className="w-2.5 h-2.5 text-purple-600" /> No Minimum Booking
                    </span>
                  </div>
                </div>

                <form onSubmit={handleClaimSubmit} className="space-y-2">
                  <div>
                    <label className="block text-xs font-normal text-gray-700 mb-0.5">Full Name *</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-xs font-normal focus:outline-none focus:border-purple-600 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-gray-700 mb-0.5">Mobile / WhatsApp Number *</label>
                    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50/80 overflow-hidden focus-within:border-purple-600 focus-within:bg-white transition">
                      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-100/80 border-r border-gray-200 text-xs font-normal text-gray-700 shrink-0">
                        <span>🇮🇳</span>
                        <span>+91</span>
                        <span className="text-[8px] text-gray-400">▼</span>
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="Enter 10-digit mobile number"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-transparent text-xs font-normal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-gray-700 mb-0.5">Email Address (Optional)</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-xs font-normal focus:outline-none focus:border-purple-600 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-xs sm:text-sm rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5 text-purple-200" />
                    <span>{isSubmitting ? 'Submitting Claim...' : `Claim "${wonReward.title}"`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="flex items-center justify-center gap-1 text-[10.5px] text-gray-400 font-normal pt-0.5">
                  <span>🔒</span>
                  <span>Your information is safe with us. We never share your data.</span>
                </div>
              </div>
            )}

            {step === 4 && claimResult && wonReward && (
              <div className="space-y-3 text-center my-auto">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-normal uppercase text-emerald-600 tracking-wider">Claim Confirmed</span>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-0.5">Digital Reward Voucher</h2>
                </div>
                <div className="bg-gradient-to-b from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-200 rounded-xl p-4 text-left shadow-2xs">
                  <p className="text-[10px] font-normal text-purple-700 uppercase tracking-wider">Vendor</p>
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">{vendor.name}</h3>
                  <div className="border-t border-b border-dashed border-purple-200 py-2 my-1.5">
                    <p className="text-[10px] text-gray-500 uppercase font-normal">Prize Won:</p>
                    <p className="text-lg font-semibold text-purple-800">{wonReward.title}</p>
                    {wonReward.code && (
                      <p className="text-xs text-gray-600 font-mono mt-0.5">Code: <span className="font-medium">{wonReward.code}</span></p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-normal">Claim Code:</p>
                      <p className="text-sm font-mono font-semibold text-emerald-600">{claimResult.claimCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-normal">Claimed By:</p>
                      <p className="text-xs font-medium text-gray-800">{userName}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {vendor.phone && (
                    <a
                      href={`https://wa.me/${vendor.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${vendor.name}, I claimed my reward "${wonReward.title}" (Claim Code: ${claimResult.claimCode}). How can I redeem it?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <MessageSquare className="w-4 h-4" /> Redeem via WhatsApp
                    </a>
                  )}
                  {vendor.phone && (
                    <a
                      href={`tel:${vendor.phone}`}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Phone className="w-3.5 h-3.5 text-purple-600" /> Call Vendor ({vendor.phone})
                    </a>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full max-w-5xl mx-auto text-center py-1.5 text-gray-500 text-xs shrink-0 relative z-10 font-normal">
        Powered by <span className="font-medium text-gray-700">Travelzada</span>
      </footer>

      {/* CONGRATULATIONS CELEBRATION POPUP MODAL */}
      <CongratulationsModal
        isOpen={showCongratulationModal}
        onProceed={handleProceedToSpin}
        vendorName={vendor.name}
      />

    </div>
  )
}
