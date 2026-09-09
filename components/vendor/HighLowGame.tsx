'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ArrowDown, Sparkles, Trophy, Award, RefreshCw } from 'lucide-react'
import confetti from 'canvas-confetti'

interface HighLowGameProps {
  onGameComplete: (points: number) => void
  timerSeconds?: number
  customImages?: string[]
}

const CARDS_DECK = [
  { rank: 2, label: '2', name: 'Goa Beach', image: '🏖️' },
  { rank: 3, label: '3', name: 'Manali Snow', image: '🏔️' },
  { rank: 4, label: '4', name: 'Kerala Backwaters', image: '🌴' },
  { rank: 5, label: '5', name: 'Jaipur Fort', image: '🏰' },
  { rank: 6, label: '6', name: 'Bali Resort', image: '🌺' },
  { rank: 7, label: '7', name: 'Singapore Cruise', image: '🚢' },
  { rank: 8, label: '8', name: 'Dubai Safari', image: '🐪' },
  { rank: 9, label: '9', name: 'Maldives Overwater', image: '🌊' },
  { rank: 10, label: '10', name: 'Paris Eiffel', image: '🗼' },
  { rank: 11, label: 'J', name: 'Swiss Alps VIP', image: '⛷️' },
  { rank: 12, label: 'Q', name: 'Tokyo Neon', image: '🏮' },
  { rank: 13, label: 'K', name: 'London Eye', image: '🎡' },
  { rank: 14, label: 'A', name: 'World Jackpot Pass', image: '👑' },
]

export default function HighLowGame({
  onGameComplete,
  timerSeconds = 60,
  customImages = [],
}: HighLowGameProps) {
  const [roundsLeft, setRoundsLeft] = useState(5)
  const [streak, setStreak] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [currentCard, setCurrentCard] = useState(CARDS_DECK[4])
  const [nextCard, setNextCard] = useState<typeof CARDS_DECK[0] | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)

  const playCardSound = (isWin: boolean) => {
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
        osc.frequency.setValueAtTime(isWin ? 659.25 : 220, audioCtxRef.current.currentTime)
        gain.gain.setValueAtTime(0.06, audioCtxRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.12)
        osc.connect(gain)
        gain.connect(audioCtxRef.current.destination)
        osc.start()
        osc.stop(audioCtxRef.current.currentTime + 0.12)
      }
    } catch {
      // Audio error ignored
    }
  }

  const handlePredict = (guess: 'higher' | 'lower') => {
    if (isRevealing || roundsLeft <= 0) return

    setIsRevealing(true)

    // Draw random new card different from current
    let drawn = CARDS_DECK[Math.floor(Math.random() * CARDS_DECK.length)]
    while (drawn.rank === currentCard.rank) {
      drawn = CARDS_DECK[Math.floor(Math.random() * CARDS_DECK.length)]
    }

    setNextCard(drawn)

    const isHigher = drawn.rank > currentCard.rank
    const isCorrect = (guess === 'higher' && isHigher) || (guess === 'lower' && !isHigher)

    playCardSound(isCorrect)

    setTimeout(() => {
      if (isCorrect) {
        const newStreak = streak + 1
        setStreak(newStreak)
        const base = 150
        const pointsWon = base * newStreak
        setTotalPoints((prev) => prev + pointsWon)
        setResultMessage(`✨ CORRECT! ${drawn.label} is ${isHigher ? 'HIGHER' : 'LOWER'}! (+${pointsWon} PTS)`)

        if (typeof confetti === 'function') {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } })
        }
      } else {
        setStreak(0)
        const consolation = 50
        setTotalPoints((prev) => prev + consolation)
        setResultMessage(`❌ Incorrect! ${drawn.label} was ${isHigher ? 'HIGHER' : 'LOWER'}! (+50 PTS)`)
      }

      setCurrentCard(drawn)
      setNextCard(null)
      setIsRevealing(false)

      const remaining = roundsLeft - 1
      setRoundsLeft(remaining)

      if (remaining <= 0) {
        setTimeout(() => {
          onGameComplete(totalPoints + (isCorrect ? 150 * (streak + 1) : 50))
        }, 1600)
      }
    }, 800)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-5 shadow-2xl relative select-none font-sans text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider uppercase text-white">LUCKY HIGHER OR LOWER</h2>
            <p className="text-[10px] text-slate-400 font-medium">Predict next card rank for combo score!</p>
          </div>
        </div>

        <div className="bg-indigo-500/20 border border-indigo-500/40 px-3 py-1 rounded-full text-xs font-black text-indigo-300">
          ROUNDS LEFT: {roundsLeft}
        </div>
      </div>

      {/* Score & Streak Header */}
      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-5 shadow-inner">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">TOTAL SCORE</span>
          <span className="text-2xl font-black text-indigo-400">{totalPoints} PTS</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">WIN STREAK</span>
          <span className="text-lg font-black text-amber-300">🔥 {streak}x MULTIPLIER</span>
        </div>
      </div>

      {/* CENTER CARD SHOWCASE */}
      <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 p-6 rounded-3xl border-2 border-indigo-500/30 shadow-2xl flex flex-col items-center justify-center relative mb-5 min-h-[220px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.rank}
            initial={{ rotateY: -90, scale: 0.8 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className="w-36 h-48 bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-amber-400 rounded-2xl p-3 shadow-[0_0_25px_rgba(245,158,11,0.4)] flex flex-col justify-between items-center text-center relative"
          >
            {/* Top Rank Badge */}
            <div className="w-full flex justify-between items-center">
              <span className="text-xl font-black text-amber-400">{currentCard.label}</span>
              <span className="text-xs font-bold text-slate-400">RANK #{currentCard.rank}</span>
            </div>

            {/* Destination Symbol */}
            <div className="my-auto flex flex-col items-center">
              <span className="text-5xl filter drop-shadow-md mb-1">{currentCard.image}</span>
              <span className="text-xs font-black text-white">{currentCard.name}</span>
            </div>

            {/* Bottom Rank */}
            <div className="w-full text-right">
              <span className="text-xl font-black text-amber-400">{currentCard.label}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Result Announcement */}
      {resultMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 bg-slate-950/90 border border-indigo-500/50 rounded-xl text-center mb-4 shadow-lg"
        >
          <p className="text-xs font-bold text-indigo-200">{resultMessage}</p>
        </motion.div>
      )}

      {/* Action Buttons: HIGHER vs LOWER */}
      {roundsLeft > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handlePredict('higher')}
            disabled={isRevealing}
            className="py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 active:scale-95 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ArrowUp className="w-5 h-5 stroke-[3]" />
            <span>HIGHER ⬆️</span>
          </button>

          <button
            type="button"
            onClick={() => handlePredict('lower')}
            disabled={isRevealing}
            className="py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:brightness-110 active:scale-95 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ArrowDown className="w-5 h-5 stroke-[3]" />
            <span>LOWER ⬇️</span>
          </button>
        </div>
      ) : (
        <div className="w-full py-3.5 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl text-center shadow-lg flex items-center justify-center gap-2">
          <Award className="w-5 h-5 text-amber-300" />
          <span>PREDICTIONS COMPLETE! UNLOCKING VOUCHER...</span>
        </div>
      )}
    </div>
  )
}
