'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import SpinWheel from '@/components/vendor/SpinWheel'
import ScratchCard from '@/components/vendor/ScratchCard'
import FlipCardReward from '@/components/vendor/FlipCardReward'
import GiftBoxReward from '@/components/vendor/GiftBoxReward'
import GoldenTicketReward from '@/components/vendor/GoldenTicketReward'
import MemoryMatchGame from '@/components/vendor/MemoryMatchGame'
import TapTargetGame from '@/components/vendor/TapTargetGame'
import BalloonPopGame from '@/components/vendor/BalloonPopGame'
import LuckySlotsGame from '@/components/vendor/LuckySlotsGame'
import TreasureChestGame from '@/components/vendor/TreasureChestGame'
import WhackAMoleGame from '@/components/vendor/WhackAMoleGame'
import HighLowGame from '@/components/vendor/HighLowGame'
import FortuneWheelGame from '@/components/vendor/FortuneWheelGame'
import PrizeCelebrationModal from '@/components/vendor/PrizeCelebrationModal'
import confetti from 'canvas-confetti'
import { Vendor, VendorReward, VendorQuestion } from '@/components/admin/types'
import {
  CheckCircle2, XCircle, Phone, MessageSquare, ArrowRight, User, Mail, Gift, MapPin, Award,
  Trophy, RotateCcw, Volume2, VolumeX, ShieldCheck, Ticket, Zap
} from 'lucide-react'

// High-resolution default destination option photos matching screenshot options
const DEFAULT_OPTION_IMAGES = [
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', // Bali Beach
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80', // Paris Eiffel
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80', // Tokyo Mt Fuji
  'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&q=80', // Swiss Alps
]

// Curated Travel & Destination Backgrounds
const TRAVEL_WALLPAPERS = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1400&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=80',
]

export default function VendorLandingPage() {
  const params = useParams()
  const vendorKey = params?.vendorKey as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Step state: 1 = Quiz Game, 2 = Spin Wheel / Scratch Card, 3 = Claim Lead Form, 4 = Digital Voucher Pass
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Quiz game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [quizPassed, setQuizPassed] = useState(false)

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState(15)
  const [timerActive, setTimerActive] = useState(false)
  const [timeIsUp, setTimeIsUp] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Points and score state
  const [totalPoints, setTotalPoints] = useState(0)

  // Reward state
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
        const isQuiz = !data.vendor.gameType || data.vendor.gameType === 'quiz'
        if (isQuiz) {
          const qList = getNormalizedQuestions(data.vendor)
          if (qList.length > 0) {
            setTimeLeft(qList[0].timerSeconds || 15)
          }
          setTimerActive(true)
        } else {
          setTimerActive(false)
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

  // Dynamic Background Wallpaper URL for current question
  const currentBgImage = (currentQuestion?.imageUrl && currentQuestion.imageUrl.trim() !== '')
    ? currentQuestion.imageUrl
    : TRAVEL_WALLPAPERS[currentQuestionIndex % TRAVEL_WALLPAPERS.length]

  // Audio tick on low timer
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
        osc.frequency.setValueAtTime(750, audioContextRef.current.currentTime)
        gain.gain.setValueAtTime(0.04, audioContextRef.current.currentTime)
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

  // Dense multi-wave birthday streamer & ribbon confetti rain (continuous shower from full top edge)
  const triggerConfetti = () => {
    if (!confetti) return

    const PARTY_COLORS = [
      '#FF0055', '#FF7A00', '#FFD600', '#00E676',
      '#00B0FF', '#7C4DFF', '#E040FB', '#FF4081',
      '#00BCD4', '#FFC107', '#8BC34A', '#E91E63',
    ]

    // Fire a single wave of ribbon-like confetti from a random top position
    const fireWave = () => {
      const xPos = 0.1 + Math.random() * 0.8
      confetti({
        particleCount: 40,
        spread: 70 + Math.random() * 50,
        origin: { x: xPos, y: 0 },
        colors: PARTY_COLORS,
        startVelocity: 25 + Math.random() * 20,
        gravity: 0.5 + Math.random() * 0.4,
        drift: -1 + Math.random() * 2,
        ticks: 400,
        decay: 0.92,
        scalar: 1.2 + Math.random() * 0.6,
        shapes: ['square', 'circle'] as confetti.Shape[],
      })
    }

    // Immediate dense opening burst — 3 wide showers across full width
    confetti({
      particleCount: 100,
      spread: 160,
      origin: { x: 0.5, y: 0 },
      colors: PARTY_COLORS,
      startVelocity: 35,
      gravity: 0.6,
      drift: 0,
      ticks: 450,
      decay: 0.91,
      scalar: 1.5,
      shapes: ['square', 'circle'] as confetti.Shape[],
    })
    confetti({
      particleCount: 60,
      angle: 70,
      spread: 90,
      origin: { x: 0.05, y: 0 },
      colors: PARTY_COLORS,
      startVelocity: 30,
      gravity: 0.55,
      ticks: 420,
      scalar: 1.4,
    })
    confetti({
      particleCount: 60,
      angle: 110,
      spread: 90,
      origin: { x: 0.95, y: 0 },
      colors: PARTY_COLORS,
      startVelocity: 30,
      gravity: 0.55,
      ticks: 420,
      scalar: 1.4,
    })

    // Staggered follow-up waves over ~1.5 seconds for continuous rain
    const waveTimings = [120, 250, 400, 550, 700, 870, 1050, 1200, 1350, 1500]
    waveTimings.forEach((delay) => {
      setTimeout(fireWave, delay)
    })
  }

  // Celebration sticker overlay state
  const [showStickerCelebration, setShowStickerCelebration] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)

  // Advance to next question or directly to reward game (Spin Wheel / Scratch Card)
  const advanceToNextOrRewardGame = () => {
    setShowStickerCelebration(false)
    if (currentQuestionIndex + 1 < questionsList.length) {
      const nextIdx = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIdx)
      setSelectedOption(null)
      setAnswerSubmitted(false)
      setQuizError(null)
      setTimeIsUp(false)
      const nextQ = questionsList[nextIdx]
      setTimeLeft(nextQ?.timerSeconds || 15)
      setTimerActive(true)
    } else {
      // Completed all questions!
      setQuizPassed(true)
      setStep(2) // Move to Reward Game (Spin Wheel / Scratch Card)
    }
  }

  // Handle non-quiz mini-game completion (Memory Match, Tap Target, Balloon Pop)
  const handleOtherGameComplete = (pts: number) => {
    setTotalPoints(pts)
    setEarnedPoints(pts)
    triggerConfetti()
    setShowStickerCelebration(true)
    setTimeout(() => {
      setShowStickerCelebration(false)
      setQuizPassed(true)
      setStep(2) // Move to Reward Game (Spin Wheel / Scratch Card)
    }, 1800)
  }

  // Timer Countdown Effect (For Travel Quiz only)
  useEffect(() => {
    const isQuizMode = vendor && (!vendor.gameType || vendor.gameType === 'quiz')
    if (
      !isQuizMode ||
      step !== 1 ||
      !timerActive ||
      quizPassed ||
      timeIsUp ||
      answerSubmitted
    ) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimerActive(false)
          setTimeIsUp(true)
          setAnswerSubmitted(true)
          setQuizError("Time's up! Moving to next question...")
          setTimeout(() => {
            advanceToNextOrRewardGame()
          }, 1200)
          return 0
        }
        if (prev <= 4) {
          playTickSound()
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [step, timerActive, currentQuestionIndex, quizPassed, timeIsUp, answerSubmitted, vendor])

  // Handle Option Click (Single attempt per question, then auto-advance)
  const handleOptionClick = (idx: number) => {
    if (answerSubmitted || timeIsUp || quizPassed) return

    setSelectedOption(idx)
    setAnswerSubmitted(true)
    setTimerActive(false)

    const isCorrect = idx === (currentQuestion?.correctOptionIndex ?? 0)

    if (isCorrect) {
      setQuizError(null)
      triggerConfetti()

      // Calculate points award (100 base PTS + 10 PTS per remaining second)
      const basePoints = 100
      const speedBonus = Math.max(0, timeLeft) * 10
      const pointsAwarded = basePoints + speedBonus

      setEarnedPoints(pointsAwarded)
      setTotalPoints((prev) => prev + pointsAwarded)
      setShowStickerCelebration(true)

      setTimeout(() => {
        advanceToNextOrRewardGame()
      }, 1600)
    } else {
      setQuizError('Incorrect answer!')
      setTimeout(() => {
        advanceToNextOrRewardGame()
      }, 1200)
    }
  }

  const handleSpinEnd = (reward: VendorReward) => {
    setWonReward(reward)
    setShowPrizeCelebrationModal(true)
  }

  const handleProceedToClaimForm = () => {
    setShowPrizeCelebrationModal(false)
    setStep(3) // Move to Claim Lead Form
  }

  const handleSpinAgain = () => {
    setShowPrizeCelebrationModal(false)
    setWonReward(null)
    setStep(2)
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
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
        <div className="text-center space-y-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center text-xl mx-auto shadow-lg">
            {vendorKey.charAt(0).toUpperCase()}
          </div>
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-300 font-medium text-xs tracking-wider">Loading offer...</p>
        </div>
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Offer Unavailable</h2>
            <p className="text-slate-300 text-xs mt-1">{error || 'This QR offer link is inactive or invalid.'}</p>
          </div>
          <a
            href="/"
            className="inline-block w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
          >
            Visit Travelzada Home
          </a>
        </div>
      </div>
    )
  }

  const hasOptionImages = true
  const maxTimerSeconds = currentQuestion?.timerSeconds || 15
  const timerPercentage = (timeLeft / maxTimerSeconds) * 100

  return (
    <div className="min-h-screen bg-[#0B132B] text-white flex flex-col justify-between p-3 sm:p-6 select-none relative font-sans overflow-hidden">
      
      {/* Dynamic Background Wallpaper */}
      {currentBgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 filter blur-[2px] scale-105 transition-all duration-700 pointer-events-none z-0"
          style={{ backgroundImage: `url(${currentBgImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B132B]/80 via-[#0B132B]/60 to-[#0B132B] pointer-events-none z-0" />

      {/* TOP HEADER: VENDOR BRAND & PROGRESS */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between gap-2 pt-2 pb-1 relative z-30 shrink-0">
        
        {/* Vendor Logo & Name */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg">
          {vendor.logoUrl ? (
            <img
              src={vendor.logoUrl}
              alt={vendor.name}
              className="w-5 h-5 rounded-full object-cover border border-amber-400/40"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
              {vendor.name ? vendor.name.charAt(0).toUpperCase() : 'V'}
            </div>
          )}
          <span className="text-xs font-bold text-white tracking-wide truncate max-w-[120px] sm:max-w-[160px]">
            {vendor.name}
          </span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        </div>

        {/* Right Badges: Points & Step */}
        <div className="flex items-center gap-2">
          {/* Live Points Pill */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-3 py-1 rounded-full text-xs font-black shadow-md shrink-0">
            <Trophy className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>{totalPoints} PTS</span>
          </div>

          {/* Question Counter Pill */}
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 text-xs font-bold text-slate-300 shadow-md flex items-center gap-1 shrink-0">
            <span>{currentQuestionIndex + 1}/{questionsList.length}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-md sm:max-w-lg mx-auto my-auto py-2 relative z-10 shrink-0 flex flex-col items-center">
        
        {/* STEP 1: INTERACTIVE GAME VIEW */}
        {step === 1 && (
          <>
            {vendor.gameType === 'memory' && (
              <MemoryMatchGame
                onGameComplete={handleOtherGameComplete}
                timerSeconds={vendor.gameTimerSeconds}
                customImages={vendor.gameImages}
              />
            )}

            {vendor.gameType === 'taptarget' && (
              <TapTargetGame
                onGameComplete={handleOtherGameComplete}
                timerSeconds={vendor.gameTimerSeconds}
                customImages={vendor.gameImages}
              />
            )}

            {vendor.gameType === 'balloon' && (
              <BalloonPopGame
                onGameComplete={handleOtherGameComplete}
                timerSeconds={vendor.gameTimerSeconds}
                customImages={vendor.gameImages}
              />
            )}

            {vendor.gameType === 'slots' && (
              <LuckySlotsGame
                onGameComplete={handleOtherGameComplete}
                timerSeconds={vendor.gameTimerSeconds}
                customImages={vendor.gameImages}
              />
            )}

            {vendor.gameType === 'treasure' && (
              <TreasureChestGame
                onGameComplete={handleOtherGameComplete}
                timerSeconds={vendor.gameTimerSeconds}
                customImages={vendor.gameImages}
              />
            )}

            {vendor.gameType === 'whack' && (
              <WhackAMoleGame
                onGameComplete={handleOtherGameComplete}
                timerSeconds={vendor.gameTimerSeconds}
                customImages={vendor.gameImages}
              />
            )}

            {vendor.gameType === 'highlow' && (
              <HighLowGame
                onGameComplete={handleOtherGameComplete}
                timerSeconds={vendor.gameTimerSeconds}
                customImages={vendor.gameImages}
              />
            )}

            {vendor.gameType === 'wheel' && (
              <FortuneWheelGame
                onGameComplete={handleOtherGameComplete}
                timerSeconds={vendor.gameTimerSeconds}
                customImages={vendor.gameImages}
              />
            )}

            {(!vendor.gameType || vendor.gameType === 'quiz') && (
              <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full space-y-4"
            >
              
              {/* QUIZ CARD */}
              <div className="w-full bg-slate-900/85 backdrop-blur-xl text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-700/60 relative overflow-hidden">
                
                {/* Header Category Tag */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                    TRAVEL QUIZ • QUESTION {currentQuestionIndex + 1}
                  </span>

                  {/* Circular Timer Ring */}
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        stroke={timeLeft <= 4 ? '#EF4444' : '#F59E0B'}
                        strokeWidth="3"
                        strokeDasharray={88}
                        strokeDashoffset={88 - (88 * timerPercentage) / 100}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-1000 linear"
                      />
                    </svg>
                    <span className={`absolute text-xs font-black font-mono ${timeLeft <= 4 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                      {timeLeft}
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
                  {currentQuestion?.question || 'Which of the following is Travelzada\'s top destination?'}
                </h2>

                {/* Question Banner Image */}
                {currentQuestion?.imageUrl && (
                  <div className="w-full h-36 sm:h-44 rounded-2xl overflow-hidden border border-slate-700/80 mt-3 shadow-inner">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question Header"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* TIME'S UP NOTICE */}
              {timeIsUp ? (
                <div className="w-full bg-rose-950/80 border border-rose-500/40 rounded-3xl p-6 text-center space-y-2 shadow-2xl backdrop-blur-xl">
                  <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wide">TIME&apos;S UP!</h3>
                    <p className="text-xs text-rose-200 mt-1 font-medium">Moving to next question...</p>
                  </div>
                </div>
              ) : (
                /* OPTIONS AREA */
                <div className="w-full space-y-3">
                  {hasOptionImages ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {currentQuestion.options.map((optText, idx) => {
                        const letter = String.fromCharCode(65 + idx)
                        const isSelected = selectedOption === idx
                        const isCorrect = idx === (currentQuestion.correctOptionIndex ?? 0)
                        const rawImg = currentQuestion.optionImages?.[idx]
                        const photoUrl = rawImg && rawImg.trim() !== '' ? rawImg : DEFAULT_OPTION_IMAGES[idx % DEFAULT_OPTION_IMAGES.length]

                        let cardBorder = "border-slate-700/80 hover:border-amber-400/80"
                        if (isSelected) {
                          if (isCorrect) {
                            cardBorder = "border-emerald-500 ring-2 ring-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                          } else {
                            cardBorder = "border-rose-500 ring-2 ring-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                          }
                        }

                        return (
                          <motion.button
                            key={idx}
                            type="button"
                            onClick={() => handleOptionClick(idx)}
                            disabled={answerSubmitted}
                            initial={{ opacity: 0, y: 22, scale: 0.94 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              scale: isSelected ? (isCorrect ? 1.04 : 1) : 1,
                              x: isSelected && !isCorrect ? [-8, 8, -6, 6, -3, 3, 0] : 0,
                            }}
                            transition={{
                              duration: 0.35,
                              delay: idx * 0.08,
                              type: 'spring',
                              stiffness: 350,
                              damping: 22,
                              x: { type: 'keyframes', duration: 0.4 },
                            }}
                            whileHover={!answerSubmitted ? { scale: 1.03, y: -2 } : undefined}
                            whileTap={!answerSubmitted ? { scale: 0.96 } : undefined}
                            className={`relative aspect-[4/2.7] rounded-2xl overflow-hidden border-2 transition-all duration-200 text-left group flex flex-col justify-between p-2.5 cursor-pointer bg-slate-900 ${cardBorder}`}
                          >
                            {/* Image Background */}
                            {photoUrl && (
                              <img
                                src={photoUrl}
                                alt={optText}
                                className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />

                            {/* Letter Badge */}
                            <div className="relative z-10">
                              <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shadow-md ${
                                isSelected
                                  ? isCorrect
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-rose-500 text-white'
                                  : 'bg-slate-900/90 text-white border border-slate-700'
                              }`}>
                                {letter}
                              </span>
                            </div>

                            {/* Title Pill */}
                            <div className="relative z-10 self-start max-w-full">
                              <div className="bg-slate-950/80 backdrop-blur-md text-white font-bold text-[11px] px-2.5 py-1 rounded-lg border border-slate-800 truncate">
                                {letter}. {optText}
                              </div>
                            </div>

                            {/* Correct State Indicator Badge */}
                            {isSelected && isCorrect && (
                              <motion.div
                                initial={{ scale: 0, rotate: 15 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="absolute top-2.5 right-2.5 z-20 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 border border-emerald-300"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Correct</span>
                              </motion.div>
                            )}

                            {/* Incorrect State Indicator Badge */}
                            {isSelected && !isCorrect && (
                              <motion.div
                                initial={{ scale: 0, rotate: -15 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="absolute top-2.5 right-2.5 z-20 bg-rose-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 border border-rose-300"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Incorrect</span>
                              </motion.div>
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  ) : (
                    /* Fallback Pill Buttons */
                    <div className="space-y-2.5">
                      {currentQuestion.options.map((optText, idx) => {
                        const letter = String.fromCharCode(65 + idx)
                        const isSelected = selectedOption === idx
                        const isCorrect = idx === (currentQuestion.correctOptionIndex ?? 0)

                        let pillStyle = "bg-slate-900/90 border-slate-700 hover:border-amber-400 text-white"
                        if (isSelected) {
                          if (isCorrect) {
                            pillStyle = "bg-emerald-600 text-white border-emerald-500"
                          } else {
                            pillStyle = "bg-rose-600 text-white border-rose-500"
                          }
                        }

                        return (
                          <motion.button
                            key={idx}
                            type="button"
                            onClick={() => handleOptionClick(idx)}
                            disabled={answerSubmitted}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              x: isSelected && !isCorrect ? [-8, 8, -6, 6, -3, 3, 0] : 0,
                            }}
                            transition={{
                              duration: 0.3,
                              delay: idx * 0.07,
                              x: { type: 'keyframes', duration: 0.4 },
                            }}
                            className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between shadow-md cursor-pointer ${pillStyle}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-xl bg-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                                {letter}
                              </span>
                              <span className="font-bold text-sm truncate">{optText}</span>
                            </div>
                            {isSelected && isCorrect && (
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-200 bg-emerald-700/60 px-2.5 py-0.5 rounded-lg border border-emerald-400/40">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Correct
                              </span>
                            )}
                            {isSelected && !isCorrect && (
                              <span className="flex items-center gap-1 text-xs font-bold text-rose-200 bg-rose-700/60 px-2.5 py-0.5 rounded-lg border border-rose-400/40">
                                <XCircle className="w-3.5 h-3.5 text-rose-300" /> Incorrect
                              </span>
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  )}

                  {/* ERROR FEEDBACK */}
                  {quizError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-bold text-rose-300 text-center bg-rose-950/90 border border-rose-500/40 py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{quizError}</span>
                    </motion.div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
          )}
          </>
        )}

        {/* STEP 2: REWARD GAME VIEW */}
        {step === 2 && (
          <div className="w-full space-y-4 text-center my-auto relative">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
                <Trophy className="w-4 h-4 text-amber-400" /> {totalPoints > 0 ? totalPoints : 250} POINTS • GUARANTEED REWARD
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {vendor.rewardType === 'scratch'
                  ? 'Scratch to Reveal Prize!'
                  : vendor.rewardType === 'flipcard'
                  ? 'Pick a Card to Reveal Prize!'
                  : vendor.rewardType === 'giftbox'
                  ? 'Unbox Your Mystery Prize!'
                  : vendor.rewardType === 'ticket'
                  ? 'Tear Your Golden Ticket!'
                  : 'Spin the Wheel to Win!'}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {vendor.rewardType === 'scratch'
                  ? 'Swipe across the card below to unlock your reward voucher.'
                  : vendor.rewardType === 'flipcard'
                  ? 'Select one of the golden cards below to flip and reveal your voucher.'
                  : vendor.rewardType === 'giftbox'
                  ? 'Tap the glowing gift box to unwrap your special reward.'
                  : vendor.rewardType === 'ticket'
                  ? 'Pull or tap the perforated tear strip to unlock your VIP pass.'
                  : 'Spin the wheel below to unlock your reward voucher.'}
              </p>
            </div>

            {vendor.rewardType === 'scratch' ? (
              <ScratchCard
                rewards={vendor.rewards}
                customSettings={vendor.rewardCustomSettings}
                onScratchEnd={handleSpinEnd}
              />
            ) : vendor.rewardType === 'flipcard' ? (
              <FlipCardReward
                rewards={vendor.rewards}
                customSettings={vendor.rewardCustomSettings}
                onScratchEnd={handleSpinEnd}
              />
            ) : vendor.rewardType === 'giftbox' ? (
              <GiftBoxReward
                rewards={vendor.rewards}
                customSettings={vendor.rewardCustomSettings}
                onScratchEnd={handleSpinEnd}
              />
            ) : vendor.rewardType === 'ticket' ? (
              <GoldenTicketReward
                rewards={vendor.rewards}
                customSettings={vendor.rewardCustomSettings}
                onScratchEnd={handleSpinEnd}
              />
            ) : (
              <SpinWheel
                rewards={vendor.rewards}
                customSettings={vendor.rewardCustomSettings}
                onSpinEnd={handleSpinEnd}
              />
            )}

            {wonReward && (
              <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl mt-2 shadow-xl">
                <p className="text-xs text-emerald-300 font-bold">Reward Unlocked: {wonReward.title}</p>
                <p className="text-[10px] text-slate-300">Opening claim pass...</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CLAIM LEAD FORM */}
        {step === 3 && wonReward && (
          <div className="w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
            
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> REWARD UNLOCKED
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
                Claim Reward Voucher
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Enter your details to generate your digital reward code.
              </p>
            </div>

            {/* Reward Summary Card */}
            <div className="p-4 bg-slate-800/80 border border-amber-400/40 rounded-2xl flex items-start justify-between gap-3 shadow-inner">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block">
                  YOU WON
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {wonReward.title}
                </h3>
                <p className="text-xs text-slate-300">
                  {wonReward.description || 'Exclusive discount voucher pass.'}
                </p>
              </div>

              <div className="w-11 h-11 bg-amber-500 rounded-xl shadow-lg flex items-center justify-center p-2 shrink-0 text-slate-950">
                <Gift className="w-6 h-6" />
              </div>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mobile / WhatsApp Number *</label>
                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/80 overflow-hidden focus-within:border-amber-400 transition">
                  <div className="flex items-center gap-1 px-3 py-2.5 bg-slate-800/80 text-xs font-bold text-white border-r border-slate-700 shrink-0">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit mobile number"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-transparent text-xs font-medium text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Gift className="w-4 h-4" />
                <span>{isSubmitting ? 'Generating Digital Voucher...' : `Claim "${wonReward.title}"`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <span>🔒</span> Instant Digital Voucher Claim.
            </p>
          </div>
        )}

        {/* STEP 4: DIGITAL VOUCHER PASS */}
        {step === 4 && claimResult && wonReward && (
          <div className="w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl text-center space-y-4">
            
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">CLAIM CONFIRMED</span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Digital Reward Pass</h2>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-left space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">VENDOR</p>
                  <h3 className="text-base font-bold text-white">{vendor.name}</h3>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full uppercase border border-amber-500/30">
                  VERIFIED DEAL
                </span>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">REWARD WON</p>
                <p className="text-lg font-black text-amber-400">{wonReward.title}</p>
                {wonReward.code && (
                  <p className="text-xs text-slate-300 font-mono mt-0.5">Promo Code: <span className="text-white font-bold">{wonReward.code}</span></p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">CLAIM PASS CODE</p>
                  <p className="text-base font-mono font-black text-emerald-400">{claimResult.claimCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">CLAIMED BY</p>
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
                  className="w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" /> Redeem Pass via WhatsApp
                </a>
              )}

              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Phone className="w-4 h-4 text-amber-400" /> Call Vendor ({vendor.phone})
                </a>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-xl mx-auto text-center py-2 relative z-10 shrink-0">
        <p className="text-slate-400 text-xs font-medium">
          {vendor.name} • Official Reward Offer
        </p>
      </footer>

      {/* CORRECT ANSWER STICKER CELEBRATION POPUP OVERLAY */}
      <AnimatePresence>
        {showStickerCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.2, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.3, rotate: 15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className="bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 px-8 py-6 rounded-3xl border-4 border-white shadow-[0_0_50px_rgba(245,158,11,0.85)] text-center relative overflow-hidden flex flex-col items-center gap-2 max-w-xs"
            >
              {/* Top Decorative Star Ribbon Tag */}
              <div className="bg-slate-950 text-amber-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-400 shadow-md flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>SPOT ON!</span>
              </div>

              {/* Large Animated Victory Checkmark Badge */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xl border-2 border-emerald-400 my-1"
              >
                <CheckCircle2 className="w-10 h-10 fill-emerald-100 stroke-[2.5]" />
              </motion.div>

              <h3 className="text-xl font-black uppercase tracking-tight text-slate-950 leading-none">
                CORRECT ANSWER!
              </h3>

              <div className="bg-slate-950/90 text-emerald-400 text-xs font-black px-4 py-1.5 rounded-full border border-emerald-400 shadow-inner flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>+{earnedPoints} PTS AWARDED</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
