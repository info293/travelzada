'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VendorReward, VendorRewardCustomSettings } from '@/components/admin/types'
import { selectWeightedReward } from '@/lib/rewardAlgorithm'
import { Ticket, CheckCircle2, Scissors, Award } from 'lucide-react'
import confetti from 'canvas-confetti'

interface GoldenTicketRewardProps {
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

export default function GoldenTicketReward({ rewards, onScratchEnd, customSettings, disabled }: GoldenTicketRewardProps) {
  const safeRewards = rewards && rewards.length > 0 ? rewards : DEFAULT_REWARDS
  const [winningReward, setWinningReward] = useState<VendorReward | null>(null)
  const [isTorn, setIsTorn] = useState(false)

  useEffect(() => {
    const selected = selectWeightedReward(safeRewards)
    setWinningReward(selected)
  }, [])

  const handleTearTicket = () => {
    if (disabled || isTorn || !winningReward) return
    setIsTorn(true)

    if (typeof confetti === 'function') {
      confetti({ particleCount: 130, spread: 95, origin: { y: 0.55 } })
    }

    setTimeout(() => {
      onScratchEnd(winningReward)
    }, 1800)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-5 shadow-2xl text-center select-none font-sans text-white">
      {/* Title */}
      <div className="space-y-1 mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-widest uppercase">
          <Ticket className="w-3.5 h-3.5 text-amber-400" /> VIP GOLDEN TICKET REVEAL
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
          Tear Ticket Perforation
        </h3>
        <p className="text-xs text-slate-300 font-medium">
          Tap or swipe to tear open your golden voucher pass!
        </p>
      </div>

      {/* GOLDEN TICKET CONTAINER */}
      <div className={`relative w-full aspect-[4/2.3] rounded-2xl border-4 shadow-lg p-4 flex flex-col justify-between items-center text-slate-950 relative overflow-hidden mb-5 ${
        customSettings?.ticketTheme === 'silver'
          ? 'bg-gradient-to-r from-slate-300 via-gray-100 to-slate-400 border-slate-300 shadow-[0_0_30px_rgba(203,213,225,0.4)]'
          : customSettings?.ticketTheme === 'rosegold'
          ? 'bg-gradient-to-r from-rose-400 via-pink-300 to-rose-500 border-pink-300 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
          : customSettings?.ticketTheme === 'emerald'
          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-700 border-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
          : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]'
      }`}>
        <AnimatePresence mode="wait">
          {!isTorn ? (
            <motion.div
              key="ticket-sealed"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full h-full flex flex-col justify-between items-center relative z-10"
            >
              <div className="w-full flex items-center justify-between border-b-2 border-dashed border-slate-950/40 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[170px]">
                  {customSettings?.ticketBadgeText || 'TRAVELZADA VIP TICKET'}
                </span>
                <span className="text-[10px] font-black">№ 884920</span>
              </div>

              <div className="flex items-center gap-2 my-auto">
                <Scissors className="w-6 h-6 text-slate-950 animate-pulse" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  {customSettings?.ticketTearText || 'TAP TO TEAR PERFORATION'}
                </span>
              </div>

              <div className="w-full border-t-2 border-dashed border-slate-950/40 pt-1 text-[10px] font-bold">
                GUARANTEED EXCLUSIVE REWARD PASS
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="ticket-revealed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="w-full h-full flex flex-col items-center justify-center text-center space-y-1 relative z-10 bg-slate-950 text-white rounded-xl p-3 border border-amber-400/60 shadow-inner"
            >
              <Award className="w-7 h-7 text-amber-400" />
              {winningReward && (
                <>
                  <span className="text-[9px] font-black uppercase text-amber-300">TICKET VOUCHER REVEALED</span>
                  <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                    {winningReward.title}
                  </h4>
                  {winningReward.code && (
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                      CODE: {winningReward.code}
                    </span>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decorative Ticket Circles On Edges */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-r-2 border-amber-400" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-l-2 border-amber-400" />
      </div>

      {/* Button */}
      {!isTorn ? (
        <button
          type="button"
          onClick={handleTearTicket}
          disabled={disabled}
          className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Scissors className="w-5 h-5" />
          <span>TEAR & REVEAL GOLDEN TICKET</span>
        </button>
      ) : (
        <div className="py-2.5 px-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Ticket Torn! Generating Voucher Pass...</span>
        </div>
      )}
    </div>
  )
}
