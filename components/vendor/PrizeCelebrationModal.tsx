'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Trophy, ArrowRight, Sparkles, Gift, RotateCcw, Lock } from 'lucide-react'
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

    if (!isTryAgain) {
      // Fire party confetti explosion
      try {
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#FF9500', '#00A896', '#E6193C', '#48BB78', '#6B21A8', '#E02470', '#FFD700']
        })
      } catch (e) {
        // Fallback
      }

      // Victory chime audio
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
            gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1)
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
  }, [isOpen, isTryAgain])

  if (!isOpen || !reward) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-sans">
        
        {/* Radial Amber Light Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />

        {/* GAMIFIED ARCADE POPUP CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', damping: 22, stiffness: 340 }}
          className="relative z-10 w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#1c0a3a] via-[#14062c] to-[#0a021a] border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.5)] text-center overflow-hidden text-white"
        >
          {/* Confetti & Sparkles Overlay */}
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:18px_18px] pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-600/30 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Arcade Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{isTryAgain ? 'SPIN AGAIN' : 'REWARD UNLOCKED'}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </div>

          {/* Central 3D Badge */}
          <div className="relative mx-auto w-20 h-20 mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-400/30 rounded-full animate-ping opacity-40" />
            {isTryAgain ? (
              <div className="relative w-20 h-20 bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-300 text-slate-950 rounded-2xl shadow-2xl border-2 border-white flex items-center justify-center transform -rotate-3">
                <RotateCcw className="w-10 h-10 text-slate-950 stroke-[2.5]" />
              </div>
            ) : (
              <div className="relative w-20 h-20 bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-300 text-slate-950 rounded-2xl shadow-2xl border-2 border-white flex items-center justify-center transform rotate-3">
                <Trophy className="w-10 h-10 text-slate-950 stroke-[2.2]" />
              </div>
            )}
          </div>

          {/* Headline & Details */}
          {isTryAgain ? (
            /* Try Again Layout */
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                ALMOST THERE! 🎲
              </h2>
              <p className="text-xs sm:text-sm text-purple-200 font-medium">
                You landed on <span className="font-bold text-amber-300">&quot;Try Again&quot;</span>. Give the wheel another spin to claim guaranteed rewards!
              </p>

              <div className="pt-3">
                <button
                  onClick={onSpinAgain || onProceed}
                  className="w-full py-3.5 px-6 rounded-full font-black text-xs sm:text-sm tracking-widest uppercase bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 shadow-[0_6px_20px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 border-t border-amber-200 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>SPIN WHEEL AGAIN</span>
                </button>
              </div>
            </div>
          ) : (
            /* Real Won Reward Layout */
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                🎉 CONGRATULATIONS! 🎉
              </h2>
              <p className="text-xs text-purple-200/90 font-medium">
                You unlocked a guaranteed reward pass from <span className="font-bold text-amber-300">{vendorName}</span>:
              </p>

              {/* 3D Prize Ticket Pass */}
              <div className="p-4 bg-gradient-to-b from-[#2a1354] via-[#200e40] to-[#160830] border-2 border-amber-400/60 rounded-2xl shadow-inner space-y-2 text-center my-3 relative overflow-hidden">
                <div className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 uppercase tracking-widest">
                  <Gift className="w-3 h-3 text-amber-400" /> YOU WON
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-xs">
                  {reward.title}
                </h3>

                {reward.description && (
                  <p className="text-xs text-purple-200/90 font-medium">
                    {reward.description}
                  </p>
                )}

                {reward.code && (
                  <div className="inline-block mt-1 px-3 py-1 bg-black/60 border border-amber-400/40 rounded-lg text-xs font-mono font-bold text-amber-300">
                    PROMO CODE: {reward.code}
                  </div>
                )}
              </div>

              {/* Primary 3D Arcade CTA Button */}
              <div className="pt-2">
                <button
                  onClick={onProceed}
                  className="w-full py-3.5 px-6 rounded-full font-black text-xs sm:text-sm tracking-widest uppercase bg-gradient-to-r from-[#ff5e62] via-[#ff4365] to-[#e12d39] text-white shadow-[0_8px_22px_rgba(225,45,57,0.6)] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 border-t border-red-200 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25 rounded-t-full pointer-events-none" />
                  <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-xs">
                    <span>CLAIM YOUR REWARD NOW</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Security Caption */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-purple-200/80 font-medium mt-3">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Assured rewards • 100% Free Claim</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  )
}
