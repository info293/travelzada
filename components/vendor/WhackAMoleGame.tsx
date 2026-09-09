'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trophy, Award, RefreshCw, Clock } from 'lucide-react'
import confetti from 'canvas-confetti'

interface WhackAMoleGameProps {
  onGameComplete: (points: number) => void
  timerSeconds?: number
  customImages?: string[]
}

interface HoleItem {
  id: number
  type: 'suit' | 'passport' | 'ticket' | 'trophy' | 'cloud'
  symbol: string
  name: string
  points: number
  active: boolean
}

const ITEMS_POOL: Omit<HoleItem, 'id' | 'active'>[] = [
  { type: 'suit', symbol: '🧳', name: 'Suitcase', points: 150 },
  { type: 'passport', symbol: '🛂', name: 'Passport', points: 250 },
  { type: 'ticket', symbol: '🎫', name: 'Flight Pass', points: 200 },
  { type: 'trophy', symbol: '🏆', name: 'Jackpot Trophy', points: 500 },
  { type: 'cloud', symbol: '🌩️', name: 'Storm Cloud', points: -50 },
]

export default function WhackAMoleGame({
  onGameComplete,
  timerSeconds = 30,
  customImages = [],
}: WhackAMoleGameProps) {
  const [timeLeft, setTimeLeft] = useState(timerSeconds)
  const [totalPoints, setTotalPoints] = useState(0)
  const [activeHoles, setActiveHoles] = useState<(HoleItem | null)[]>(Array(9).fill(null))
  const [hitFeedback, setHitFeedback] = useState<{ holeIdx: number; text: string } | null>(null)
  const [gameEnded, setGameEnded] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const playWhackSound = (isBad: boolean) => {
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
        osc.type = isBad ? 'sawtooth' : 'sine'
        osc.frequency.setValueAtTime(isBad ? 180 : 520, audioCtxRef.current.currentTime)
        gain.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.1)
        osc.connect(gain)
        gain.connect(audioCtxRef.current.destination)
        osc.start()
        osc.stop(audioCtxRef.current.currentTime + 0.1)
      }
    } catch {
      // Audio error ignored
    }
  }

  // Timer countdown
  useEffect(() => {
    if (gameEnded) return

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!)
          clearInterval(gameIntervalRef.current!)
          setGameEnded(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [gameEnded])

  // Random item pop loop
  useEffect(() => {
    if (gameEnded) return

    gameIntervalRef.current = setInterval(() => {
      const randomHole = Math.floor(Math.random() * 9)
      const randomItem = ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)]

      setActiveHoles((prev) => {
        const copy = [...prev]
        copy[randomHole] = {
          id: Date.now(),
          ...randomItem,
          active: true,
        }
        return copy
      })

      // Hide pop after 1.1s
      setTimeout(() => {
        setActiveHoles((prev) => {
          const copy = [...prev]
          if (copy[randomHole]?.id === copy[randomHole]?.id) {
            copy[randomHole] = null
          }
          return copy
        })
      }, 1100)
    }, 700)

    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current)
    }
  }, [gameEnded])

  // Finish game callback when timer reaches 0
  useEffect(() => {
    if (gameEnded) {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } })
      }
      setTimeout(() => {
        onGameComplete(Math.max(100, totalPoints))
      }, 1600)
    }
  }, [gameEnded, totalPoints, onGameComplete])

  const handleWhack = (holeIdx: number) => {
    if (gameEnded) return
    const item = activeHoles[holeIdx]
    if (!item) return

    const isBad = item.type === 'cloud'
    playWhackSound(isBad)

    const pointsEarned = item.points
    setTotalPoints((prev) => Math.max(0, prev + pointsEarned))
    setHitFeedback({
      holeIdx,
      text: pointsEarned > 0 ? `+${pointsEarned}` : `${pointsEarned}`,
    })

    // Remove item immediately from hole
    setActiveHoles((prev) => {
      const copy = [...prev]
      copy[holeIdx] = null
      return copy
    })

    setTimeout(() => setHitFeedback(null), 800)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl relative select-none font-sans text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider uppercase text-white">WHACK-A-SUITCASE</h2>
            <p className="text-[10px] text-slate-400 font-medium">Tap luggage before it vanishes!</p>
          </div>
        </div>

        <div className="bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-black text-amber-300 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>TIME: {timeLeft}s</span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-5 shadow-inner">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">WHACK SCORE</span>
          <span className="text-2xl font-black text-amber-400">{totalPoints} PTS</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">TARGET</span>
          <span className="text-xs font-bold text-slate-300">Tap 🧳 🛂 🎫 🏆 (Avoid 🌩️)</span>
        </div>
      </div>

      {/* 3x3 LUGGAGE HOLES GRID */}
      <div className="grid grid-cols-3 gap-3 mb-5 p-3 bg-slate-950 rounded-3xl border-2 border-slate-800 shadow-inner">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((holeIdx) => {
          const item = activeHoles[holeIdx]
          const isFeedback = hitFeedback?.holeIdx === holeIdx
          const customPhoto = customImages[holeIdx]

          return (
            <div
              key={holeIdx}
              onClick={() => handleWhack(holeIdx)}
              className="relative aspect-square bg-slate-900 rounded-2xl border-2 border-slate-800 flex flex-col items-center justify-end p-2 cursor-pointer overflow-hidden shadow-inner group active:scale-95 transition"
            >
              {/* Hole Rim Shadow */}
              <div className="absolute bottom-0 inset-x-0 h-10 bg-slate-950 rounded-b-2xl border-t border-slate-800/80 pointer-events-none" />

              {/* Popping Luggage Item */}
              <AnimatePresence>
                {item && (
                  <motion.div
                    initial={{ y: 50, scale: 0.5, opacity: 0 }}
                    animate={{ y: -5, scale: 1, opacity: 1 }}
                    exit={{ y: 50, scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="relative z-10 flex flex-col items-center pointer-events-none"
                  >
                    {customPhoto && customPhoto.trim() !== '' ? (
                      <img
                        src={customPhoto}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-xl border-2 border-amber-400 shadow-lg mb-1"
                      />
                    ) : (
                      <span className="text-4xl sm:text-5xl filter drop-shadow-lg mb-1">
                        {item.symbol}
                      </span>
                    )}
                    <span className="text-[9px] font-black text-slate-200 bg-slate-950/90 px-2 py-0.5 rounded-full border border-slate-700 truncate max-w-[70px]">
                      {item.name}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Points Hit Floating Feedback */}
              <AnimatePresence>
                {isFeedback && (
                  <motion.div
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -30, scale: 1.3 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-2 z-30 pointer-events-none font-black text-sm px-2.5 py-0.5 rounded-full shadow-lg border bg-amber-400 text-slate-950 border-amber-200"
                  >
                    {hitFeedback.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Game Footer */}
      {!gameEnded ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
          <p className="text-xs font-bold text-amber-300">
            ⚡ Quick! Whack suitcases & items as fast as you can!
          </p>
        </div>
      ) : (
        <div className="w-full py-3.5 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl text-center shadow-lg flex items-center justify-center gap-2">
          <Award className="w-5 h-5 text-amber-300" />
          <span>TIME UP! UNLOCKING REWARD VOUCHER...</span>
        </div>
      )}
    </div>
  )
}
