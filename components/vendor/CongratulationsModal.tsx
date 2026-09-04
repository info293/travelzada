'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { CheckCircle2, ArrowRight, Gift } from 'lucide-react'

interface CongratulationsModalProps {
  isOpen: boolean
  onClose?: () => void
  onProceed: () => void
  vendorName?: string
}

export default function CongratulationsModal({
  isOpen,
  onProceed,
  vendorName = 'Travelzada'
}: CongratulationsModalProps) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!isOpen) return

    setCountdown(5)

    // Play subtle pleasant victory audio chime
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const notes = [523.25, 659.25, 783.99, 1046.50]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1)
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(ctx.currentTime + idx * 0.1)
          osc.stop(ctx.currentTime + idx * 0.1 + 0.3)
        })
      }
    } catch (e) {
      // Audio fallback
    }

    // Fire refined, elegant confetti stream from screen sides
    const triggerConfetti = () => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0.05, y: 0.7 },
        colors: ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6']
      })
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 0.95, y: 0.7 },
        colors: ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6']
      })
    }

    triggerConfetti()
    const timerId = setTimeout(triggerConfetti, 400)

    // Countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearTimeout(timerId)
      clearInterval(interval)
    }
  }, [isOpen])

  useEffect(() => {
    if (countdown === 0 && isOpen) {
      onProceed()
    }
  }, [countdown, isOpen, onProceed])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm select-none">
        
        {/* Soft Ambient Radial Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* ELEGANT PROFESSIONAL MODAL CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-sm sm:max-w-md bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xl text-center overflow-hidden"
        >
          
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-normal tracking-wide mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct Answer
          </div>

          {/* Clean Central Victory Icon */}
          <div className="relative mx-auto w-14 h-14 mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
              className="relative w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center"
            >
              <Gift className="w-7 h-7" />
            </motion.div>
          </div>

          {/* Headline & Description */}
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
              Congratulations! 🎉
            </h2>
            <p className="text-xs font-normal text-gray-600 max-w-xs mx-auto leading-relaxed">
              You got the correct answer! You have unlocked your free spin to claim exclusive rewards from <span className="font-medium text-gray-900">{vendorName}</span>.
            </p>
          </div>

          {/* Action CTA Button */}
          <div className="mt-4 space-y-2.5">
            <button
              onClick={onProceed}
              className="w-full py-2.5 px-5 bg-[#7c3aed] hover:bg-[#6d28d9] active:scale-[0.98] text-white font-medium text-xs sm:text-sm rounded-lg shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Spin the Wheel Now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Subtle Progress / Countdown Bar */}
            <div className="pt-0.5 flex flex-col items-center gap-1">
              <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="bg-[#7c3aed] h-full"
                />
              </div>
              <p className="text-[10.5px] font-normal text-gray-400">
                Opening wheel in <span className="text-gray-700 font-medium">{countdown}s</span>...
              </p>
            </div>
          </div>

        </motion.div>

      </div>
    </AnimatePresence>
  )
}
