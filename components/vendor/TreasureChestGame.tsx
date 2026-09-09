'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Trophy, Gift, Award, CheckCircle2, Lock, Key } from 'lucide-react'
import confetti from 'canvas-confetti'

interface TreasureChestGameProps {
  onGameComplete: (points: number) => void
  timerSeconds?: number
  customImages?: string[]
}

interface ChestItem {
  id: number
  name: string
  symbol: string
  points: number
  opened: boolean
}

const DEFAULT_CHEST_PRIZES = [
  { name: 'Island Treasure', symbol: '🏖️', points: 300 },
  { name: 'VIP Flight Pass', symbol: '✈️', points: 350 },
  { name: 'Luxury Suite', symbol: '🏨', points: 400 },
  { name: 'Golden Trophy', symbol: '🏆', points: 500 },
  { name: 'Diamond Crown', symbol: '👑', points: 600 },
  { name: 'Secret Jackpot', symbol: '💎', points: 700 },
]

export default function TreasureChestGame({
  onGameComplete,
  timerSeconds = 60,
  customImages = [],
}: TreasureChestGameProps) {
  const [picksLeft, setPicksLeft] = useState(3)
  const [totalPoints, setTotalPoints] = useState(0)
  const [chests, setChests] = useState<ChestItem[]>([])
  const [lastOpenedItem, setLastOpenedItem] = useState<{ name: string; points: number } | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const shuffled = [...DEFAULT_CHEST_PRIZES].sort(() => Math.random() - 0.5)
    const initialChests: ChestItem[] = shuffled.slice(0, 6).map((item, idx) => ({
      id: idx,
      name: item.name,
      symbol: item.symbol,
      points: item.points,
      opened: false,
    }))
    setChests(initialChests)
  }, [])

  const playPopSound = () => {
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
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, audioCtxRef.current.currentTime)
        gain.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime)
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

  const handleChestClick = (chestId: number) => {
    if (picksLeft <= 0) return
    const target = chests.find((c) => c.id === chestId)
    if (!target || target.opened) return

    playPopSound()

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.55 },
        colors: ['#F59E0B', '#10B981', '#6366F1'],
      })
    }

    const updatedChests = chests.map((c) => (c.id === chestId ? { ...c, opened: true } : c))
    setChests(updatedChests)

    const pointsAwarded = target.points
    const newTotal = totalPoints + pointsAwarded
    setTotalPoints(newTotal)
    setLastOpenedItem({ name: target.name, points: pointsAwarded })

    const remainingPicks = picksLeft - 1
    setPicksLeft(remainingPicks)

    if (remainingPicks <= 0) {
      setTimeout(() => {
        onGameComplete(newTotal)
      }, 1800)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl relative select-none font-sans text-white">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider uppercase text-white">MYSTERY TREASURE CHEST</h2>
            <p className="text-[10px] text-slate-400 font-medium">Tap chests to unbox hidden rewards!</p>
          </div>
        </div>

        <div className="bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-black text-emerald-300 flex items-center gap-1">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>KEYS LEFT: {picksLeft}</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-5 shadow-inner">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">TOTAL REWARD SCORE</span>
          <span className="text-2xl font-black text-emerald-400">{totalPoints} PTS</span>
        </div>
        {lastOpenedItem && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">LAST UNBOXED</span>
            <span className="text-sm font-black text-amber-300">{lastOpenedItem.name} (+{lastOpenedItem.points})</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {chests.map((chest, idx) => {
          const customPhoto = customImages[idx]

          return (
            <motion.button
              key={chest.id}
              type="button"
              onClick={() => handleChestClick(chest.id)}
              disabled={chest.opened || picksLeft <= 0}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={!chest.opened && picksLeft > 0 ? { scale: 1.05, y: -2 } : undefined}
              whileTap={!chest.opened && picksLeft > 0 ? { scale: 0.95 } : undefined}
              className={`relative aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2.5 cursor-pointer shadow-lg overflow-hidden ${
                chest.opened
                  ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-gradient-to-b from-amber-600 via-amber-500 to-amber-700 border-amber-300 hover:border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              }`}
            >
              <AnimatePresence mode="wait">
                {chest.opened ? (
                  <motion.div
                    key="opened"
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                    className="flex flex-col items-center justify-center text-center"
                  >
                    {customPhoto && customPhoto.trim() !== '' ? (
                      <img
                        src={customPhoto}
                        alt={chest.name}
                        className="w-10 h-10 object-cover rounded-lg border border-emerald-400 mb-1 shadow-sm"
                      />
                    ) : (
                      <span className="text-3xl sm:text-4xl mb-1 filter drop-shadow-md">
                        {chest.symbol}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-emerald-300 truncate max-w-[85px]">
                      +{chest.points} PTS
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="closed"
                    className="flex flex-col items-center justify-center text-center space-y-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-amber-200/40 flex items-center justify-center text-amber-200 shadow-inner">
                      <Gift className="w-6 h-6 text-amber-200 animate-bounce" />
                    </div>
                    <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider bg-amber-300 px-2 py-0.5 rounded-full shadow-xs">
                      CHEST #{idx + 1}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {!chest.opened && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              )}
            </motion.button>
          )
        })}
      </div>

      {picksLeft > 0 ? (
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-center shadow-inner">
          <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Select any {picksLeft} treasure chest{picksLeft > 1 ? 's' : ''} to unlock!</span>
          </p>
        </div>
      ) : (
        <div className="w-full py-3.5 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl text-center shadow-lg flex items-center justify-center gap-2">
          <Award className="w-5 h-5 text-amber-300" />
          <span>TREASURES UNLOCKED! CLAIMING VOUCHER...</span>
        </div>
      )}
    </div>
  )
}
