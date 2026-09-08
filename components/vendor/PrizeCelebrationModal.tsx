'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Trophy, ArrowRight, Gift, RotateCcw, ShieldCheck, Star, Ticket } from 'lucide-react'
import { VendorReward } from '@/components/admin/types'

interface PrizeCelebrationModalProps {
  isOpen: boolean
  reward: VendorReward | null
  vendorName?: string
  onProceed: () => void
  onSpinAgain?: () => void
}

export default function PrizeCelebrationModal({
  isOpen,
  reward,
  vendorName = 'Travelzada',
  onProceed,
  onSpinAgain
}: PrizeCelebrationModalProps) {
  const isTryAgain = reward?.title?.toLowerCase().includes('try again') || reward?.code?.toLowerCase().includes('tryagain')

  useEffect(() => {
    if (!isOpen) return

    let confettiInterval: any = null

    if (!isTryAgain) {
      const PARTY_COLORS = [
        '#FF0055', '#FF7A00', '#FFD600', '#00E676',
        '#00B0FF', '#7C4DFF', '#E040FB', '#FF4081',
        '#00BCD4', '#FFC107', '#8BC34A', '#E91E63',
      ]

      confetti({
        particleCount: 100,
        spread: 160,
        origin: { x: 0.5, y: 0 },
        colors: PARTY_COLORS,
        startVelocity: 35,
        gravity: 0.6,
        ticks: 450,
        decay: 0.91,
        scalar: 1.5,
        shapes: ['square', 'circle'] as confetti.Shape[],
      })
      confetti({
        particleCount: 50,
        angle: 70,
        spread: 90,
        origin: { x: 0.05, y: 0 },
        colors: PARTY_COLORS,
        startVelocity: 30,
        gravity: 0.55,
        ticks: 420,
        scalar: 1.3,
      })
      confetti({
        particleCount: 50,
        angle: 110,
        spread: 90,
        origin: { x: 0.95, y: 0 },
        colors: PARTY_COLORS,
        startVelocity: 30,
        gravity: 0.55,
        ticks: 420,
        scalar: 1.3,
      })

      confettiInterval = setInterval(() => {
        confetti({
          particleCount: 8,
          angle: 90,
          spread: 140,
          startVelocity: 15,
          ticks: 300,
          origin: { y: 0, x: Math.random() },
          colors: PARTY_COLORS,
          gravity: 0.5,
          scalar: 1.2,
        })
      }, 280)

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          const notes = [523.25, 659.25, 783.99, 1046.50]
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1)
            gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(ctx.currentTime + idx * 0.1)
            osc.stop(ctx.currentTime + idx * 0.1 + 0.35)
          })
        }
      } catch (e) {
        // Audio fallback
      }
    }

    return () => {
      if (confettiInterval) clearInterval(confettiInterval)
    }
  }, [isOpen, isTryAgain])

  if (!isOpen || !reward) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sans overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #4c1d95 0%, #7e22ce 25%, #a855f7 45%, #ec4899 65%, #f97316 85%, #eab308 100%)' }}
      >
        {/* Animated floating color blobs */}
        <div className="absolute top-[10%] left-[15%] w-[350px] h-[350px] bg-yellow-400/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-cyan-400/25 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

        {/* MAIN CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative z-10 w-full max-w-[380px] rounded-[28px] shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
        >
          {/* Shimmering border */}
          <div className="absolute -inset-[1px] rounded-[29px] bg-gradient-to-br from-white/50 via-white/20 to-white/40 pointer-events-none" />

          <div className="relative rounded-[28px] px-6 py-7 sm:px-7 sm:py-8 overflow-hidden bg-white/95 backdrop-blur-xl">

            {isTryAgain ? (
              /* TRY AGAIN LAYOUT */
              <div className="text-center space-y-4 relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                  className="mx-auto rounded-2xl shadow-lg flex items-center justify-center border border-orange-200"
                  style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                >
                  <RotateCcw className="w-9 h-9 text-white stroke-[2]" />
                </motion.div>

                <div className="space-y-1.5">
                  <h2 className="text-[22px] sm:text-2xl font-black text-slate-800 tracking-tight">
                    Almost There!
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                    You landed on <span className="font-bold text-orange-500">&quot;Try Again&quot;</span>. Give it another shot!
                  </p>
                </div>

                <button
                  onClick={onSpinAgain || onProceed}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide text-white shadow-lg hover:shadow-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>Spin Again</span>
                </button>
              </div>
            ) : (
              /* WINNER REWARD LAYOUT */
              <div className="text-center space-y-5 relative z-10">

                {/* Animated trophy badge */}
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.05, type: 'spring', stiffness: 350, damping: 20 }}
                    className="mx-auto relative"
                    style={{ width: 80, height: 80 }}
                  >
                    <div className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute -inset-3 rounded-full blur-lg pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(249,115,22,0.2))' }} />

                    <div className="relative w-full h-full rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.4)] border-[3px] border-white"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)' }}
                    >
                      <Trophy className="w-9 h-9 text-white stroke-[2.2] drop-shadow-md" />
                    </div>
                  </motion.div>
                </div>

                {/* Headline */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-1"
                >
                  <h2 className="text-[26px] sm:text-[28px] font-black tracking-tight leading-none"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    Congratulations!
                  </h2>
                  <p className="text-sm text-slate-500">
                    You unlocked a reward from <span className="font-semibold text-violet-600">{vendorName}</span>
                  </p>
                </motion.div>

                {/* Reward ticket card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="relative"
                >
                  {/* Notched ticket cutouts */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white/95" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-white/95" />

                  <div className="rounded-2xl overflow-hidden shadow-lg"
                    style={{ background: 'linear-gradient(140deg, #7c3aed, #6d28d9, #4c1d95)' }}
                  >
                    {/* Top accent bar */}
                    <div className="h-1 bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400" />

                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                        <span className="text-[10px] font-black text-yellow-300 uppercase tracking-[0.2em]">
                          Your Reward
                        </span>
                        <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-sm">
                        {reward.title}
                      </h3>

                      {reward.description && (
                        <p className="text-xs text-violet-200 leading-relaxed">
                          {reward.description}
                        </p>
                      )}

                      <div className="border-t border-dashed border-white/20" />

                      {reward.code && (
                        <div className="flex items-center justify-center gap-2">
                          <Ticket className="w-4 h-4 text-yellow-300" />
                          <span className="font-mono text-sm font-bold text-white tracking-wider px-3.5 py-1.5 rounded-lg bg-white/15 border border-white/20 backdrop-blur-sm">
                            {reward.code}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <button
                    onClick={onProceed}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide text-white shadow-lg hover:shadow-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    <Gift className="w-4 h-4 stroke-[2.5]" />
                    <span>Claim Your Reward</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </motion.div>

                {/* Trust line */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verified reward · Free to claim</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
