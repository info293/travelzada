'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Dices, Play, RefreshCw, Award } from 'lucide-react'
import confetti from 'canvas-confetti'

interface LuckySlotsGameProps {
  onGameComplete: (points: number) => void
  timerSeconds?: number
  customImages?: string[]
}

const DEFAULT_SLOT_ITEMS = [
  { id: 'beach', symbol: '🏖️', name: 'Beach Paradise', points: 150 },
  { id: 'flight', symbol: '✈️', name: 'Flight Ticket', points: 200 },
  { id: 'hotel', symbol: '🏨', name: 'Luxury Hotel', points: 250 },
  { id: 'passport', symbol: '🛂', name: 'Golden Passport', points: 300 },
  { id: 'diamond', symbol: '💎', name: 'VIP Diamond', points: 400 },
  { id: 'trophy', symbol: '🏆', name: 'Jackpot Trophy', points: 500 },
]

export default function LuckySlotsGame({
  onGameComplete,
  timerSeconds = 60,
  customImages = [],
}: LuckySlotsGameProps) {
  const [spinsLeft, setSpinsLeft] = useState(3)
  const [totalPoints, setTotalPoints] = useState(0)
  const [lastWinPoints, setLastWinPoints] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winMessage, setWinMessage] = useState<string | null>(null)

  const [reelIndexes, setReelIndexes] = useState([0, 1, 2])
  const [spinningReels, setSpinningReels] = useState([false, false, false])

  const audioCtxRef = useRef<AudioContext | null>(null)

  const playClickSound = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) audioCtxRef.current = new AudioCtx()
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      if (audioCtxRef.current) {
        const osc = audioCtxRef.current.createOscillator()
        const gain = audioCtxRef.current.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(440, audioCtxRef.current.currentTime)
        gain.gain.setValueAtTime(0.05, audioCtxRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.08)
        osc.connect(gain)
        gain.connect(audioCtxRef.current.destination)
        osc.start()
        osc.stop(audioCtxRef.current.currentTime + 0.08)
      }
    } catch {
      // Audio error ignored
    }
  }

  const triggerJackpotConfetti = () => {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899'],
      })
    }
  }

  const handleSpin = () => {
    if (isSpinning || spinsLeft <= 0) return

    playClickSound()
    setIsSpinning(true)
    setWinMessage(null)
    setSpinningReels([true, true, true])

    const final1 = Math.floor(Math.random() * DEFAULT_SLOT_ITEMS.length)
    const final2 = Math.floor(Math.random() * DEFAULT_SLOT_ITEMS.length)
    const final3 = Math.floor(Math.random() * DEFAULT_SLOT_ITEMS.length)

    setTimeout(() => {
      setReelIndexes((prev) => [final1, prev[1], prev[2]])
      setSpinningReels([false, true, true])
      playClickSound()
    }, 700)

    setTimeout(() => {
      setReelIndexes((prev) => [prev[0], final2, prev[2]])
      setSpinningReels([false, false, true])
      playClickSound()
    }, 1300)

    setTimeout(() => {
      setReelIndexes([final1, final2, final3])
      setSpinningReels([false, false, false])
      setIsSpinning(false)
      playClickSound()

      const item1 = DEFAULT_SLOT_ITEMS[final1]
      const item2 = DEFAULT_SLOT_ITEMS[final2]
      const item3 = DEFAULT_SLOT_ITEMS[final3]

      let award = 0
      let msg = ''

      if (final1 === final2 && final2 === final3) {
        award = item1.points * 3 + 300
        msg = `🎉 JACKPOT! 3x ${item1.name}! (+${award} PTS)`
        triggerJackpotConfetti()
      } else if (final1 === final2 || final2 === final3 || final1 === final3) {
        const matchedItem = final1 === final2 ? item1 : item3
        award = matchedItem.points * 2
        msg = `🎉 DOUBLE MATCH! (+${award} PTS)`
      } else {
        award = Math.max(item1.points, item2.points, item3.points)
        msg = `Nice Spin! (+${award} PTS)`
      }

      setLastWinPoints(award)
      setTotalPoints((prev) => prev + award)
      setWinMessage(msg)

      const remainingSpins = spinsLeft - 1
      setSpinsLeft(remainingSpins)

      if (remainingSpins <= 0) {
        setTimeout(() => {
          onGameComplete(totalPoints + award)
        }, 1800)
      }
    }, 1900)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl relative select-none font-sans text-white">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
            <Dices className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider uppercase text-white">LUCKY TRAVEL SLOTS</h2>
            <p className="text-[10px] text-slate-400 font-medium">Spin reels to unlock big bonus points!</p>
          </div>
        </div>

        <div className="bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-black text-amber-300">
          SPINS LEFT: {spinsLeft}
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-5 shadow-inner">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">TOTAL SCORE</span>
          <span className="text-2xl font-black text-amber-400">{totalPoints} PTS</span>
        </div>
        {winMessage && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">LAST WIN</span>
            <span className="text-lg font-black text-emerald-300">+{lastWinPoints}</span>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-b from-amber-600 via-amber-500 to-amber-700 p-4 rounded-3xl border-4 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] relative mb-5">
        <div className="flex justify-between items-center px-2 mb-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border border-white/60 shadow-sm ${
                isSpinning
                  ? 'bg-amber-200 animate-ping'
                  : 'bg-amber-300'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border-2 border-amber-300/60 shadow-inner">
          {[0, 1, 2].map((reelIdx) => {
            const isReelSpinning = spinningReels[reelIdx]
            const currentItem = DEFAULT_SLOT_ITEMS[reelIndexes[reelIdx]]
            const customPhoto = customImages[reelIdx]

            return (
              <div
                key={reelIdx}
                className="relative h-28 sm:h-32 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-700 rounded-xl flex flex-col items-center justify-center overflow-hidden shadow-md"
              >
                <AnimatePresence mode="wait">
                  {isReelSpinning ? (
                    <motion.div
                      key="spinning"
                      initial={{ y: -60, opacity: 0.6 }}
                      animate={{ y: [ -60, 60, -60 ], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 0.2, ease: 'linear' }}
                      className="text-4xl filter blur-[1px]"
                    >
                      {DEFAULT_SLOT_ITEMS[(reelIndexes[reelIdx] + 1) % DEFAULT_SLOT_ITEMS.length].symbol}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="stopped"
                      initial={{ y: -30, scale: 0.5 }}
                      animate={{ y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="flex flex-col items-center justify-center p-1 text-center"
                    >
                      {customPhoto && customPhoto.trim() !== '' ? (
                        <img
                          src={customPhoto}
                          alt={currentItem.name}
                          className="w-12 h-12 object-cover rounded-lg border border-amber-400/40 shadow-sm mb-1"
                        />
                      ) : (
                        <span className="text-4xl sm:text-5xl mb-1 filter drop-shadow-md">
                          {currentItem.symbol}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-slate-300 truncate max-w-[80px]">
                        {currentItem.name}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 pointer-events-none" />
              </div>
            )
          })}
        </div>
      </div>

      {winMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-center mb-4 shadow-lg"
        >
          <p className="text-xs font-black text-emerald-300 flex items-center justify-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{winMessage}</span>
          </p>
        </motion.div>
      )}

      {spinsLeft > 0 ? (
        <button
          type="button"
          onClick={handleSpin}
          disabled={isSpinning}
          className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isSpinning ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>SPINNING REELS...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-slate-950" />
              <span>SPIN & WIN ({spinsLeft} LEFT)</span>
            </>
          )}
        </button>
      ) : (
        <div className="w-full py-3.5 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl text-center shadow-lg flex items-center justify-center gap-2">
          <Award className="w-5 h-5 text-amber-300" />
          <span>GAME COMPLETE! UNLOCKING REWARD...</span>
        </div>
      )}
    </div>
  )
}
