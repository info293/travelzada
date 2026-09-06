'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import SpinWheel from '@/components/vendor/SpinWheel'
import PrizeCelebrationModal from '@/components/vendor/PrizeCelebrationModal'
import { Vendor, VendorReward, VendorQuestion } from '@/components/admin/types'
import {
  CheckCircle2, XCircle, Phone, MessageSquare, ArrowRight, User, Mail, Gift, MapPin, Award,
  Trophy, RotateCcw, Sparkles, Volume2, VolumeX, HelpCircle, Megaphone
} from 'lucide-react'

// High-resolution default destination option photos matching screenshot options
const DEFAULT_OPTION_IMAGES = [
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', // Bali Beach
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80', // Paris Eiffel
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80', // Tokyo Mt Fuji
  'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&q=80', // Swiss Alps
]

// Curated Travel, Fun & Quiz Wallpapers
const TRAVEL_FUN_QUIZ_WALLPAPERS = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1400&q=80', // Travel World Map, Passport & Compass
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80', // Tropical Beach Resort & Palms
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400&q=80', // Fun Vibrant Festival & Lights
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=80', // Fun Road Trip & Adventure
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=80', // Carnival Celebration & Confetti
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=80', // Iconic Eiffel Tower Landmark
]

export default function VendorLandingPage() {
  const params = useParams()
  const vendorKey = params?.vendorKey as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Step state: 1 = Quiz Game, 2 = Spin Wheel, 3 = Claim Lead Form, 4 = Digital Voucher Pass
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Quiz game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [quizPassed, setQuizPassed] = useState(false)
  const [showCongratulationModal, setShowCongratulationModal] = useState(false)

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState(15)
  const [timerActive, setTimerActive] = useState(true)
  const [timeIsUp, setTimeIsUp] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Spin Wheel state
  const [wonReward, setWonReward] = useState<VendorReward | null>(null)
  const [showPrizeCelebrationModal, setShowPrizeCelebrationModal] = useState(false)

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
        const qList = getNormalizedQuestions(data.vendor)
        if (qList.length > 0) {
          setTimeLeft(qList[0].timerSeconds || 15)
        }
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

  // Normalize questions array from single or multi-question data
  const getNormalizedQuestions = (v: Vendor | null): VendorQuestion[] => {
    if (!v) return []
    if (v.questions && v.questions.length > 0) {
      return v.questions
    }
    if (v.questionData) {
      return [v.questionData]
    }
    return [
      {
        question: "Which of the following is Travelzada's top beach destination?",
        options: ['Bali', 'Paris', 'Tokyo', 'Swiss Alps'],
        optionImages: DEFAULT_OPTION_IMAGES,
        correctOptionIndex: 0,
        timerSeconds: 15,
      },
    ]
  }

  const questionsList = getNormalizedQuestions(vendor)
  const currentQuestion = questionsList[currentQuestionIndex] || questionsList[0]

  // Dynamic Background Wallpaper URL for the current question (Travel, Fun & Quiz Theme)
  const currentBgImage = (currentQuestion?.imageUrl && currentQuestion.imageUrl.trim() !== '')
    ? currentQuestion.imageUrl
    : TRAVEL_FUN_QUIZ_WALLPAPERS[currentQuestionIndex % TRAVEL_FUN_QUIZ_WALLPAPERS.length]

  // Play audio tick on countdown low time
  const playTickSound = () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) audioContextRef.current = new AudioCtx()
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }
      if (audioContextRef.current) {
        const osc = audioContextRef.current.createOscillator()
        const gain = audioContextRef.current.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, audioContextRef.current.currentTime)
        gain.gain.setValueAtTime(0.06, audioContextRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.04)
        osc.connect(gain)
        gain.connect(audioContextRef.current.destination)
        osc.start()
        osc.stop(audioContextRef.current.currentTime + 0.04)
      }
    } catch (e) {
      // Ignore audio error
    }
  }

  // Confetti trigger
  const triggerConfetti = () => {
    try {
      const confetti = (window as any).confetti || require('canvas-confetti')
      if (confetti) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#38BDF8', '#F59E0B', '#EC4899', '#10B981', '#FFFFFF'],
        })
      }
    } catch (e) {
      // Fallback
    }
  }

  // Timer Countdown Effect
  useEffect(() => {
    if (step !== 1 || !timerActive || quizPassed || timeIsUp || answerSubmitted) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimerActive(false)
          setTimeIsUp(true)
          setQuizError("⏳ Time's up! Speed matters!")
          return 0
        }
        if (prev <= 4) {
          playTickSound()
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [step, timerActive, currentQuestionIndex, quizPassed, timeIsUp, answerSubmitted])

  // Handle Option Click
  const handleOptionClick = (idx: number) => {
    if (answerSubmitted || timeIsUp || quizPassed) return

    setSelectedOption(idx)
    setAnswerSubmitted(true)
    setTimerActive(false)

    const isCorrect = idx === (currentQuestion?.correctOptionIndex ?? 0)

    if (isCorrect) {
      setQuizError(null)
      triggerConfetti()

      // Delay transition to next question or completion
      setTimeout(() => {
        if (currentQuestionIndex + 1 < questionsList.length) {
          const nextIdx = currentQuestionIndex + 1
          setCurrentQuestionIndex(nextIdx)
          setSelectedOption(null)
          setAnswerSubmitted(false)
          const nextQ = questionsList[nextIdx]
          setTimeLeft(nextQ?.timerSeconds || 15)
          setTimerActive(true)
          setTimeIsUp(false)
        } else {
          // Cleared all questions!
          setQuizPassed(true)
          setStep(2) // Move directly to Spin Wheel
        }
      }, 1100)
    } else {
      setQuizError('Incorrect answer! Please try another option.')
      setTimeout(() => {
        setAnswerSubmitted(false)
        setSelectedOption(null)
        setTimerActive(true)
      }, 1000)
    }
  }

  // Restart question if time ran out
  const handleRestartQuestion = () => {
    setSelectedOption(null)
    setAnswerSubmitted(false)
    setQuizError(null)
    setTimeIsUp(false)
    const currentQ = questionsList[currentQuestionIndex]
    setTimeLeft(currentQ?.timerSeconds || 15)
    setTimerActive(true)
  }

  const handleProceedToSpin = () => {
    setStep(2) // Move to Spin Wheel
  }

  const handleSpinEnd = (reward: VendorReward) => {
    setWonReward(reward)
    setShowPrizeCelebrationModal(true) // Trigger Arcade Celebration Modal Popup!
  }

  const handleProceedToClaimForm = () => {
    setShowPrizeCelebrationModal(false)
    setStep(3) // Move to Claim Lead Form
  }

  const handleSpinAgain = () => {
    setShowPrizeCelebrationModal(false)
    setWonReward(null)
    setStep(2) // Spin again
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
      <div className="min-h-screen bg-[#004bb4] text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-75 filter blur-[1px] scale-105 pointer-events-none z-0"
          style={{ backgroundImage: `url(${TRAVEL_FUN_QUIZ_WALLPAPERS[0]})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-blue-950/40 to-black/60 pointer-events-none z-0" />
        <div className="text-center space-y-3 relative z-10">
          <img
            src="/images/logo/Travelzada Logo April (1).png"
            alt="Travelzada Logo"
            className="h-12 w-auto object-contain mx-auto animate-pulse filter drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]"
          />
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-blue-100 font-bold text-xs tracking-wider">Loading Quiz Time...</p>
        </div>
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-[#004bb4] text-white flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl">
          <img
            src="/images/logo/Travelzada Logo April (1).png"
            alt="Travelzada Logo"
            className="h-10 w-auto object-contain mx-auto mb-4"
          />
          <h2 className="text-xl font-bold text-white mb-1">Offer Not Found</h2>
          <p className="text-blue-100 text-xs mb-5">{error || 'This QR Code offer is inactive or invalid.'}</p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
          >
            Visit Travelzada Home
          </a>
        </div>
      </div>
    )
  }

  const hasOptionImages = true // Always render 2x2 image card grid matching reference screenshot

  return (
    <div className="min-h-screen bg-[#004bb4] text-white flex flex-col justify-between p-3 sm:p-6 select-none relative font-sans overflow-hidden">
      
      {/* DYNAMIC FULL-SCREEN BACKGROUND IMAGE WALLPAPER (FULLY VISIBLE & VIBRANT) */}
      {currentBgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-75 filter blur-[1px] scale-105 transition-all duration-700 pointer-events-none z-0"
          style={{ backgroundImage: `url(${currentBgImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-blue-950/40 to-black/60 pointer-events-none z-0" />

      {/* FLOATING 3D QUESTION MARK BUBBLES & DOODLE ANIMATIONS */}
      <div className="absolute top-12 left-4 w-12 h-12 text-blue-200/40 animate-bounce pointer-events-none z-0">
        <HelpCircle className="w-full h-full transform -rotate-12" />
      </div>
      <div className="absolute top-20 right-6 w-16 h-16 text-sky-200/30 animate-pulse pointer-events-none z-0">
        <HelpCircle className="w-full h-full transform rotate-12" />
      </div>

      {/* TOP HEADER: BRAND LOGO & VENDOR BADGE */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between gap-3 pt-2 pb-1 relative z-30 shrink-0">
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/25 shadow-md">
          {vendor.logoUrl ? (
            <img
              src={vendor.logoUrl}
              alt={vendor.name}
              className="w-5 h-5 rounded-full object-cover border border-white/40"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xs">
              {vendor.name ? vendor.name.charAt(0).toUpperCase() : 'T'}
            </div>
          )}
          <span className="text-xs font-bold text-white tracking-wide truncate max-w-[140px] sm:max-w-[200px]">
            {vendor.name}
          </span>
        </div>

        {/* Progress Pill */}
        <div className="bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/25 text-xs font-bold text-white shadow-md flex items-center gap-1.5">
          <span>Question</span>
          <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
            {currentQuestionIndex + 1} / {questionsList.length}
          </span>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-md sm:max-w-lg mx-auto my-auto py-1 relative z-10 shrink-0 flex flex-col items-center">
        
        {/* STEP 1: QUIZ GAME VIEW */}
        {step === 1 && (
          <div className="w-full space-y-3 sm:space-y-4">
            
            {/* SPEECH BUBBLE WHITE QUESTION CARD WITH 3D "QUIZ TIME" & ANIMATIONS (MATCHING REFERENCE IMAGE) */}
            <div className="w-full bg-[#faf8f5] text-gray-900 rounded-3xl p-4 sm:p-6 shadow-2xl border-4 border-white relative overflow-visible transform transition duration-300 mt-5 sm:mt-6">
              
              {/* Top-Left Animated 3D Megaphone / Horn (Positioned cleanly beside header) */}
              <div className="absolute -top-6 -left-6 z-20 animate-bounce">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 via-blue-600 to-sky-400 rounded-2xl p-2.5 shadow-2xl border-3 border-white transform -rotate-12 flex items-center justify-center">
                  <Megaphone className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-[2.5]" />
                </div>
              </div>

              {/* Top-Right Floating 3D Question Mark Bubbles (Positioned cleanly beside header) */}
              <div className="absolute -top-5 -right-3 z-20 flex items-center gap-1">
                <div className="bg-gradient-to-br from-blue-500 to-sky-400 text-white font-black text-xs px-2 py-0.5 rounded-xl shadow-lg border-2 border-white transform rotate-6 animate-pulse">
                  ?
                </div>
                <div className="bg-gradient-to-br from-sky-400 to-indigo-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-lg shadow-md border-2 border-white transform -rotate-6">
                  ?
                </div>
              </div>

              {/* Bold 3D Pop "QUIZ TIME" Title Header */}
              <div className="text-center pt-1 pb-0.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0b5cce] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] font-serif italic">
                  QUIZ TIME
                </h1>
              </div>

              {/* Question Text */}
              <div className="text-center pt-0.5">
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-gray-800 leading-snug">
                  {currentQuestion?.question || 'Which of the following is Travelzada\'s top destination?'}
                </h2>
              </div>

              {/* Optional Question Banner Image Header */}
              {currentQuestion?.imageUrl && (
                <div className="w-full h-32 sm:h-40 rounded-2xl overflow-hidden border border-gray-200 shadow-inner mt-3">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question Header"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Speech Bubble Tail Pointer at Bottom */}
              <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 bg-[#faf8f5] rotate-45 border-r-4 border-b-4 border-white shadow-sm" />
            </div>

            {/* RETRY / TIME'S UP OVERLAY IF TIMER EXPIRED */}
            {timeIsUp ? (
              <div className="w-full bg-rose-950/90 border border-rose-500/50 rounded-3xl p-6 text-center space-y-4 shadow-2xl backdrop-blur-xl">
                <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <RotateCcw className="w-7 h-7 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wide">TIME&apos;S UP!</h3>
                  <p className="text-xs text-rose-200 mt-1">You ran out of time on Question {currentQuestionIndex + 1}.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRestartQuestion}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Try Question Again
                </button>
              </div>
            ) : (
              /* OPTIONS AREA */
              <div className="w-full space-y-3 pt-2">
                {hasOptionImages ? (
                  /* 2x2 IMAGE CARDS GRID (EXACT MATCH TO REFERENCE SCREENSHOT) */
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {currentQuestion.options.map((optText, idx) => {
                      const letter = String.fromCharCode(65 + idx) // A, B, C, D
                      const isSelected = selectedOption === idx
                      const isCorrect = idx === (currentQuestion.correctOptionIndex ?? 0)
                      const rawImg = currentQuestion.optionImages?.[idx]
                      const photoUrl = rawImg && rawImg.trim() !== '' ? rawImg : DEFAULT_OPTION_IMAGES[idx % DEFAULT_OPTION_IMAGES.length]

                      let cardBorder = "border-white/30 hover:border-amber-300"
                      if (isSelected) {
                        if (isCorrect) {
                          cardBorder = "border-emerald-400 ring-4 ring-emerald-400/60 scale-[1.03]"
                        } else {
                          cardBorder = "border-rose-500 ring-4 ring-rose-500/60"
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleOptionClick(idx)}
                          disabled={answerSubmitted}
                          className={`relative aspect-[4/2.8] sm:aspect-[4/2.6] rounded-2xl sm:rounded-3xl overflow-hidden border-2 shadow-xl transition-all duration-200 text-left group flex flex-col justify-between p-2 sm:p-2.5 active:scale-95 cursor-pointer ${cardBorder}`}
                        >
                          {/* Option Image Background */}
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={optText}
                              className="absolute inset-0 w-full h-full object-cover transition transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900" />
                          )}

                          {/* Gradient Overlay for Text Contrast */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                          {/* Top-Left Circular Black Letter Badge (A, B, C, D) */}
                          <div className="relative z-10">
                            <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black text-xs sm:text-sm flex items-center justify-center shadow-lg border border-white/20 transition ${
                              isSelected
                                ? isCorrect
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-500 text-white'
                                : 'bg-black text-white'
                            }`}>
                              {letter}
                            </span>
                          </div>

                          {/* Bottom Center Black Translucent Title Badge (e.g. "A. Italy") */}
                          <div className="relative z-10 self-center max-w-full">
                            <div className="bg-black/75 backdrop-blur-md text-white font-bold text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full border border-white/20 shadow-md text-center truncate max-w-[120px] sm:max-w-[150px]">
                              {letter}. {optText}
                            </div>
                          </div>

                          {/* Success/Error Indicator Icons */}
                          {isSelected && isCorrect && (
                            <div className="absolute top-2.5 right-2.5 z-20 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                          {isSelected && !isCorrect && (
                            <div className="absolute top-2.5 right-2.5 z-20 bg-rose-500 text-white p-1 rounded-full shadow-lg">
                              <XCircle className="w-5 h-5" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  /* SLEEK PILL BUTTON LIST (FALLBACK IF NO OPTION PHOTOS) */
                  <div className="space-y-3">
                    {currentQuestion.options.map((optText, idx) => {
                      const letter = String.fromCharCode(97 + idx) // a, b, c, d
                      const isSelected = selectedOption === idx
                      const isCorrect = idx === (currentQuestion.correctOptionIndex ?? 0)

                      let pillStyle = "bg-white text-gray-900 border-white/60 hover:bg-white hover:border-amber-400"
                      if (isSelected) {
                        if (isCorrect) {
                          pillStyle = "bg-emerald-500 text-white border-emerald-400 ring-4 ring-emerald-400/40"
                        } else {
                          pillStyle = "bg-rose-500 text-white border-rose-400 ring-4 ring-rose-400/40"
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleOptionClick(idx)}
                          disabled={answerSubmitted}
                          className={`w-full p-3 sm:p-4 rounded-3xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-lg hover:shadow-xl active:scale-98 cursor-pointer ${pillStyle}`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Circular Black Letter Badge */}
                            <span className={`w-9 h-9 rounded-full font-black text-sm flex items-center justify-center shrink-0 shadow-md ${
                              isSelected ? 'bg-white text-gray-900' : 'bg-[#0088ff] text-white'
                            }`}>
                              {letter}
                            </span>
                            <span className="font-bold text-sm sm:text-base truncate">
                              {optText}
                            </span>
                          </div>

                          <div className="shrink-0 pr-1">
                            {isSelected && isCorrect && <CheckCircle2 className="w-6 h-6 text-white" />}
                            {isSelected && !isCorrect && <XCircle className="w-6 h-6 text-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* ERROR FEEDBACK BANNER */}
                {quizError && (
                  <p className="text-xs font-bold text-rose-200 text-center bg-rose-950/80 border border-rose-500/50 py-2 px-3 rounded-full shadow-md animate-shake">
                    {quizError}
                  </p>
                )}
              </div>
            )}

            {/* GOLDEN LEAF WREATH TIMER BADGE (EXACT MATCH TO REFERENCE SCREENSHOT) */}
            <div className="flex flex-col items-center justify-center pt-2 pb-1 relative">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                
                {/* SVG Leaf / Autumn Wreath Frame Graphic */}
                <svg className="absolute inset-0 w-full h-full text-amber-400 animate-spin-slow opacity-95" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.7" />
                  {/* Decorative Leaves around circle */}
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 360) / 12
                    const rad = (angle * Math.PI) / 180
                    const r = 44
                    const x = 50 + r * Math.cos(rad)
                    const y = 50 + r * Math.sin(rad)
                    return (
                      <path
                        key={i}
                        d="M0 -3 C2 -6 6 -6 8 -3 C6 0 2 0 0 -3 Z"
                        fill="#F59E0B"
                        transform={`translate(${x}, ${y}) rotate(${angle + 90})`}
                      />
                    )
                  })}
                </svg>

                {/* Inner Black Circular Timer Hub */}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0a1838] border-2 border-amber-400 shadow-2xl flex flex-col items-center justify-center text-center relative z-10 transition ${
                  timeLeft <= 4 ? 'border-rose-500 animate-pulse' : ''
                }`}>
                  <span className={`text-xl sm:text-2xl font-black font-mono leading-none ${timeLeft <= 4 ? 'text-rose-400' : 'text-white'}`}>
                    {timeLeft}
                  </span>
                  <span className="text-[8px] font-bold text-amber-300 tracking-wider uppercase mt-0.5">SEC</span>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* STEP 2: SPIN WHEEL VIEW */}
        {step === 2 && (
          <div className="w-full space-y-4 text-center my-auto relative">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold shadow-sm">
                <Gift className="w-4 h-4 text-amber-400" /> GUARANTEED REWARD SPIN
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Spin the Wheel & Claim Prize!
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                You passed the quiz! Every spin wins a guaranteed Travelzada reward pass.
              </p>
            </div>

            <SpinWheel
              rewards={vendor.rewards}
              onSpinEnd={handleSpinEnd}
            />

            {wonReward && (
              <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl animate-pulse mt-2 shadow-xl">
                <p className="text-xs text-emerald-300 font-bold">Prize Unlocked: {wonReward.title}</p>
                <p className="text-[10px] text-gray-300">Opening reward claim voucher...</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CLAIM REWARD LEAD FORM */}
        {step === 3 && wonReward && (
          <div className="w-full bg-white/15 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
            
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> REWARD UNLOCKED!
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight pt-1">
                Claim Your Reward Pass
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Enter your details to generate your instant digital voucher code.
              </p>
            </div>

            {/* Reward Card */}
            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-blue-500/20 to-indigo-500/20 border border-amber-400/50 rounded-2xl flex items-start justify-between gap-3 shadow-inner">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest block">
                  YOU WON
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {wonReward.title}
                </h3>
                <p className="text-xs text-gray-200">
                  {wonReward.description || 'Exclusive discount voucher for your next trip.'}
                </p>
              </div>

              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg flex items-center justify-center p-2 transform rotate-3 shrink-0">
                <Gift className="w-6 h-6 text-slate-950" />
              </div>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/20 rounded-xl text-xs font-medium text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1">Mobile / WhatsApp Number *</label>
                <div className="flex items-center rounded-xl border border-white/20 bg-black/40 overflow-hidden focus-within:border-amber-400 transition">
                  <div className="flex items-center gap-1 px-3 py-2.5 bg-white/10 text-xs font-bold text-white border-r border-white/20 shrink-0">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit mobile number"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-transparent text-xs font-medium text-white placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/20 rounded-xl text-xs font-medium text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Gift className="w-4 h-4" />
                <span>{isSubmitting ? 'Generating Digital Voucher...' : `Claim "${wonReward.title}"`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[11px] text-blue-200 text-center flex items-center justify-center gap-1">
              <span>🔒</span> 100% Secure Instant Claim. Powered by Travelzada.
            </p>
          </div>
        )}

        {/* STEP 4: DIGITAL VOUCHER PASS */}
        {step === 4 && claimResult && wonReward && (
          <div className="w-full bg-white/15 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 sm:p-7 shadow-2xl text-center space-y-4">
            
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">CLAIM CONFIRMED</span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Digital Reward Voucher Pass</h2>
            </div>

            <div className="bg-black/50 border border-white/20 rounded-2xl p-4 text-left space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div>
                  <p className="text-[10px] text-blue-200 font-bold uppercase">VENDOR</p>
                  <h3 className="text-base font-bold text-white">{vendor.name}</h3>
                </div>
                <span className="px-2.5 py-1 bg-amber-400/20 text-amber-300 text-[10px] font-bold rounded-full uppercase border border-amber-400/30">
                  VERIFIED DEALS
                </span>
              </div>

              <div>
                <p className="text-[10px] text-blue-200 font-bold uppercase">PRIZE WON</p>
                <p className="text-lg font-black text-amber-400">{wonReward.title}</p>
                {wonReward.code && (
                  <p className="text-xs text-gray-300 font-mono mt-0.5">Promo Code: <span className="text-white font-bold">{wonReward.code}</span></p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">CLAIM PASS CODE</p>
                  <p className="text-base font-mono font-black text-emerald-400">{claimResult.claimCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">CLAIMED BY</p>
                  <p className="text-xs font-bold text-white">{userName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {vendor.phone && (
                <a
                  href={`https://wa.me/${vendor.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${vendor.name}, I claimed my reward "${wonReward.title}" (Claim Code: ${claimResult.claimCode}). How can I redeem it?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs uppercase tracking-wider rounded-full transition flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" /> Redeem Pass via WhatsApp
                </a>
              )}

              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-full transition flex items-center justify-center gap-2 border border-white/20"
                >
                  <Phone className="w-4 h-4 text-amber-400" /> Call Vendor ({vendor.phone})
                </a>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER & PROGRESS LINE AT VERY BOTTOM (EXACT MATCH TO REFERENCE SCREENSHOT) */}
      <footer className="w-full max-w-xl mx-auto text-center py-1 relative z-10 shrink-0">
        <p className="text-blue-100/80 text-xs font-medium mb-2">
          Powered by <span className="font-bold text-white">Travelzada</span>
        </p>
        
        {/* Bottom progress bar line (matching screenshot video scrubber line) */}
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-white/90 transition-all duration-300 rounded-full"
            style={{ width: step === 1 ? `${((currentQuestionIndex + 1) / questionsList.length) * 100}%` : '100%' }}
          />
        </div>
      </footer>

      {/* WINNER PRIZE CELEBRATION MODAL POPUP */}
      <PrizeCelebrationModal
        isOpen={showPrizeCelebrationModal}
        reward={wonReward}
        vendorName={vendor.name}
        onProceed={handleProceedToClaimForm}
        onSpinAgain={handleSpinAgain}
      />

    </div>
  )
}
