'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VendorReward, VendorRewardCustomSettings } from '@/components/admin/types'
import { selectWeightedReward } from '@/lib/rewardAlgorithm'
import { Gift, CheckCircle2, Award } from 'lucide-react'
import confetti from 'canvas-confetti'

interface GiftBoxRewardProps {
  rewards: VendorReward[]
  onScratchEnd: (winningReward: VendorReward) => void
  customSettings?: VendorRewardCustomSettings
  disabled?: boolean
}

const DEFAULT_REWARDS: VendorReward[] = [
  { id: '1', title: '10% OFF Booking', code: 'OFF10', color: '#FF7A00', description: '10% discount on next holiday package' },
  { id: '2', title: 'Free Hotel Pass', code: 'HOTELPASS', color: '#00B4D8', description: 'Complimentary room upgrade' },
  { id: '3', title: '₹1000 Cashback', code: 'SAVE1000', color: '#FF4D6D', description: 'Flat ₹1000 cashback' },
]

export default function GiftBoxReward({ rewards, onScratchEnd, customSettings, disabled }: GiftBoxRewardProps) {
  const safeRewards = rewards && rewards.length > 0 ? rewards : DEFAULT_REWARDS
  const [winningReward, setWinningReward] = useState<VendorReward | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const selected = selectWeightedReward(safeRewards)
    setWinningReward(selected)
  }, [])

  const handleOpenGift = () => {
    if (disabled || isOpen || !winningReward) return
    setIsOpen(true)

    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } })
    }

    setTimeout(() => {
      onScratchEnd(winningReward)
    }, 1800)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center select-none font-sans text-white">
      {/* Title */}
      <div className="space-y-1 mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-widest uppercase">
          <Gift className="w-3.5 h-3.5 text-amber-400" /> SURPRISE GIFT UNBOXING
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
          Tap to Open Surprise Gift
        </h3>
        <p className="text-xs text-slate-300 font-medium">
          {customSettings?.giftBoxInstructionText || 'Untie the ribbon to unbox your reward voucher!'}
        </p>
      </div>

      {/* GIFT BOX DISPLAY AREA */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-6 flex items-center justify-center">
        <motion.div
          onClick={handleOpenGift}
          whileHover={!isOpen ? { scale: 1.05 } : undefined}
          whileTap={!isOpen ? { scale: 0.95 } : undefined}
          className="cursor-pointer relative flex flex-col items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.div
                key="closed-box"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={`w-40 h-40 sm:w-48 sm:h-48 rounded-3xl border-4 p-4 relative flex flex-col items-center justify-center ${
                  customSettings?.giftBoxTheme === 'blue_silver'
                    ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 border-slate-200 shadow-[0_0_35px_rgba(59,130,246,0.5)]'
                    : customSettings?.giftBoxTheme === 'emerald_gold'
                    ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-950 border-amber-300 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                    : customSettings?.giftBoxTheme === 'black_gold'
                    ? 'bg-gradient-to-br from-slate-900 via-zinc-900 to-black border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-br from-red-600 via-rose-600 to-red-800 border-amber-300 shadow-[0_0_35px_rgba(239,68,68,0.5)]'
                }`}
              >
                {/* Ribbon overlay */}
                <div className={`absolute inset-y-0 w-8 shadow-md border-x ${
                  customSettings?.giftBoxTheme === 'blue_silver' ? 'bg-slate-200 border-white' : 'bg-amber-300 border-amber-400'
                }`} />
                <div className={`absolute inset-x-0 h-8 shadow-md border-y ${
                  customSettings?.giftBoxTheme === 'blue_silver' ? 'bg-slate-200 border-white' : 'bg-amber-300 border-amber-400'
                }`} />
                
                {/* Top Bow */}
                <div className={`relative z-10 w-12 h-12 rounded-full border-2 shadow-xl flex items-center justify-center ${
                  customSettings?.giftBoxTheme === 'blue_silver' ? 'bg-slate-200 border-white' : 'bg-amber-300 border-white'
                }`}>
                  <Gift className="w-7 h-7 text-slate-950 animate-bounce" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="open-box"
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border-4 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)] flex flex-col items-center justify-center p-5 text-center space-y-2 relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg">
                  <Award className="w-7 h-7 stroke-[2.5]" />
                </div>
                {winningReward && (
                  <>
                    <span className="text-[10px] font-black uppercase text-amber-300">YOU UNBOXED</span>
                    <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                      {winningReward.title}
                    </h4>
                    {winningReward.code && (
                      <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-500/40">
                        {winningReward.code}
                      </span>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Button Status */}
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpenGift}
          disabled={disabled}
          className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Gift className="w-5 h-5 fill-slate-950" />
          <span>UNBOX SURPRISE GIFT</span>
        </button>
      ) : (
        <div className="py-2.5 px-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Gift Unboxed! Generating Voucher Pass...</span>
        </div>
      )}
    </div>
  )
}
