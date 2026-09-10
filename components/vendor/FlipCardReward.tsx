'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { VendorReward, VendorRewardCustomSettings } from '@/components/admin/types'
import { selectWeightedReward } from '@/lib/rewardAlgorithm'
import { Gift, Trophy, CheckCircle2, Award } from 'lucide-react'
import confetti from 'canvas-confetti'

interface FlipCardRewardProps {
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

export default function FlipCardReward({ rewards, onScratchEnd, customSettings, disabled }: FlipCardRewardProps) {
  const safeRewards = rewards && rewards.length > 0 ? rewards : DEFAULT_REWARDS
  const [winningReward, setWinningReward] = useState<VendorReward | null>(null)
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [cardPrizes, setCardPrizes] = useState<VendorReward[]>([])

  useEffect(() => {
    const selected = selectWeightedReward(safeRewards)
    setWinningReward(selected)
  }, [safeRewards])

  const handleCardClick = (cardIdx: number) => {
    if (disabled || selectedCardIdx !== null || !winningReward) return
    
    // Assign winning reward to the clicked card index, and fill other cards with other rewards
    const otherRewards = safeRewards.filter(r => r.id !== winningReward.id)
    const prizes: VendorReward[] = [winningReward, winningReward, winningReward]
    let otherIdx = 0

    for (let i = 0; i < 3; i++) {
      if (i === cardIdx) {
        prizes[i] = winningReward
      } else {
        prizes[i] = otherRewards[otherIdx % (otherRewards.length || 1)] || winningReward
        otherIdx++
      }
    }

    setCardPrizes(prizes)
    setSelectedCardIdx(cardIdx)
    setIsRevealed(true)

    // Fire confetti after flip starts
    setTimeout(() => {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } })
      }
    }, 250)

    // Complete flip and trigger parent callback
    setTimeout(() => {
      onScratchEnd(winningReward)
    }, 1800)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-5 shadow-2xl text-center select-none font-sans text-white">
      {/* Title */}
      <div className="space-y-1 mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-widest uppercase">
          <Award className="w-3.5 h-3.5 text-amber-400" /> FLIP CARD REWARD
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
          Choose a Golden Card to Flip
        </h3>
        <p className="text-xs text-slate-300 font-medium">
          Tap any card below to flip & reveal your mystery prize.
        </p>
      </div>

      {/* 3 GOLDEN CARDS GRID */}
      <div className="grid grid-cols-3 gap-3 mb-4" style={{ perspective: '1000px' }}>
        {[0, 1, 2].map((cardIdx) => {
          const isSelected = selectedCardIdx === cardIdx
          const cardReward = cardPrizes[cardIdx] || winningReward

          // Determine flip state: selected card flips immediately, others flip slightly later once revealed
          const isFlipped = isSelected || (isRevealed && selectedCardIdx !== null)

          return (
            <div
              key={cardIdx}
              onClick={() => handleCardClick(cardIdx)}
              className="relative aspect-[3/4.2] cursor-pointer"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{
                  duration: 0.7,
                  ease: [0.4, 0, 0.2, 1],
                  delay: isSelected ? 0 : 0.4
                }}
                className="w-full h-full relative rounded-2xl shadow-xl transform-style-preserve-3d"
                style={{ transformStyle: 'preserve-3d' }}
                whileHover={selectedCardIdx === null ? { scale: 1.06, y: -4 } : undefined}
                whileTap={selectedCardIdx === null ? { scale: 0.95 } : undefined}
              >
                {/* CARD BACK (UNFLIPPED) */}
                <div
                  className={`absolute inset-0 rounded-2xl border-2 p-2 flex flex-col items-center justify-between shadow-lg backface-hidden ${
                    customSettings?.flipCardTheme === 'cyber'
                      ? 'bg-gradient-to-b from-purple-600 via-pink-600 to-indigo-950 border-pink-300'
                      : customSettings?.flipCardTheme === 'blue'
                      ? 'bg-gradient-to-b from-blue-600 via-cyan-600 to-slate-900 border-cyan-300'
                      : customSettings?.flipCardTheme === 'emerald'
                      ? 'bg-gradient-to-b from-emerald-600 via-teal-700 to-slate-950 border-emerald-300'
                      : 'bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 border-amber-300'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <div className="w-full flex justify-between text-[9px] font-black text-white/90">
                    <span>VIP</span>
                    <span>★</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-950/40 border border-white/40 flex items-center justify-center text-amber-200">
                    <Trophy className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <span className="text-[9px] font-black text-slate-950 uppercase tracking-wider bg-white/90 px-2 py-0.5 rounded-full shadow-xs truncate max-w-full">
                    {customSettings?.flipCardText || `CARD #${cardIdx + 1}`}
                  </span>
                </div>

                {/* CARD FRONT (REVEALED REWARD) */}
                <div
                  className={`absolute inset-0 rounded-2xl border-2 p-2 flex flex-col items-center justify-between text-center shadow-2xl backface-hidden rotate-y-180 ${
                    isSelected
                      ? 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border-emerald-400 ring-2 ring-emerald-400/50'
                      : 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-slate-700 opacity-90'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <span className={`text-[9px] font-black uppercase tracking-wider ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isSelected ? '★ WINNER ★' : 'REWARD'}
                  </span>
                  
                  <div className="space-y-1 my-auto">
                    <Gift className={`w-6 h-6 mx-auto ${isSelected ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
                    <h4 className="text-xs font-black text-white leading-tight line-clamp-2 px-1">
                      {cardReward?.title || 'Reward Pass'}
                    </h4>
                  </div>

                  <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    isSelected ? 'text-amber-300 bg-amber-950/80 border border-amber-500/40' : 'text-slate-400 bg-slate-800'
                  }`}>
                    {cardReward?.code || 'VIP PASS'}
                  </span>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      {isRevealed ? (
        <div className="py-2.5 px-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Card Flipped! Opening Claim Form...</span>
        </div>
      ) : (
        <p className="text-xs font-bold text-amber-400">
          🎴 Tap any card to flip & reveal your prize!
        </p>
      )}
    </div>
  )
}
