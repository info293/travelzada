'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Play, RefreshCw, Award, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'

interface FortuneWheelGameProps {
  onGameComplete: (points: number) => void
  timerSeconds?: number
  customImages?: string[]
}

const WHEEL_SLICES = [
  { label: '300 PTS', points: 300, color: '#FF7A00', symbol: '🏖️' },
  { label: '500 PTS', points: 500, color: '#00B4D8', symbol: '✈️' },
  { label: '250 PTS', points: 250, color: '#FF4D6D', symbol: '🏨' },
  { label: '1000 PTS', points: 1000, color: '#70E000', symbol: '👑' },
  { label: '400 PTS', points: 400, color: '#7B2CBF', symbol: '💎' },
  { label: '600 PTS', points: 600, color: '#E63946', symbol: '🏆' },
  { label: '350 PTS', points: 350, color: '#0077B6', symbol: '🌴' },
  { label: '800 PTS', points: 800, color: '#D90429', symbol: '⭐' },
]

export default function FortuneWheelGame({
  onGameComplete,
  timerSeconds = 60,
  customImages = [],
}: FortuneWheelGameProps) {
  const [spinsLeft, setSpinsLeft] = useState(3)
  const [totalPoints, setTotalPoints] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [lastWin, setLastWin] = useState<{ label: string; points: number } | null>(null)

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
        osc.type = 'sine'
        osc.frequency.setValueAtTime(520, audioCtxRef.current.currentTime)
        gain.gain.setValueAtTime(0.06, audioCtxRef.current.currentTime)
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

  const handleSpin = () => {
    if (isSpinning || spinsLeft <= 0) return

    playClickSound()
    setIsSpinning(true)
    setLastWin(null)

    const sliceAngle = 360 / WHEEL_SLICES.length
    const randomIndex = Math.floor(Math.random() * WHEEL_SLICES.length)
    const extraRounds = 5 * 360
    const targetAngle = rotation + extraRounds + (360 - randomIndex * sliceAngle - sliceAngle / 2)

    setRotation(targetAngle)

    setTimeout(() => {
      setIsSpinning(false)
      const wonSlice = WHEEL_SLICES[randomIndex]
      playClickSound()

      const newTotal = totalPoints + wonSlice.points
      setTotalPoints(newTotal)
      setLastWin({ label: wonSlice.label, points: wonSlice.points })

      if (typeof confetti === 'function') {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } })
      }

      const remaining = spinsLeft - 1
      setSpinsLeft(remaining)

      if (remaining <= 0) {
        setTimeout(() => {
          onGameComplete(newTotal)
        }, 1800)
      }
    }, 3200)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl relative select-none font-sans text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider uppercase text-white">FORTUNE LUCK WHEEL</h2>
            <p className="text-[10px] text-slate-400 font-medium">Spin wheel to collect reward points!</p>
          </div>
        </div>

        <div className="bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-black text-amber-300">
          SPINS LEFT: {spinsLeft}
        </div>
      </div>

      {/* Score Header */}
      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 mb-5 shadow-inner">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">TOTAL SCORE</span>
          <span className="text-2xl font-black text-amber-400">{totalPoints} PTS</span>
        </div>
        {lastWin && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">WON THIS SPIN</span>
            <span className="text-lg font-black text-emerald-300">+{lastWin.points} PTS</span>
          </div>
        )}
      </div>

      {/* WHEEL CONTAINER */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto mb-5 flex items-center justify-center">
        {/* Top Pointer Ticker */}
        <div className="absolute -top-3 z-30 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />

        {/* Rotating Wheel */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 3.2, ease: [0.15, 0.99, 0.25, 0.99] }}
          className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] overflow-hidden relative"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {WHEEL_SLICES.map((slice, idx) => {
              const sliceAngle = 360 / WHEEL_SLICES.length
              const startAngle = idx * sliceAngle
              const endAngle = (idx + 1) * sliceAngle

              const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180)
              const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180)
              const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180)
              const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180)

              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`

              const textAngle = startAngle + sliceAngle / 2
              const textX = 50 + 32 * Math.cos((Math.PI * textAngle) / 180)
              const textY = 50 + 32 * Math.sin((Math.PI * textAngle) / 180)

              return (
                <g key={idx}>
                  <path d={pathData} fill={slice.color} stroke="#0F172A" strokeWidth="0.8" />
                  <text
                    x={textX}
                    y={textY}
                    fill="#FFFFFF"
                    fontSize="4"
                    fontWeight="900"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                  >
                    {slice.symbol} {slice.points}
                  </text>
                </g>
              )
            })}
          </svg>
        </motion.div>

        {/* Center Golden Pin */}
        <div className="absolute z-20 w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border-2 border-white shadow-xl flex items-center justify-center">
          <Trophy className="w-6 h-6 text-slate-950 fill-slate-950" />
        </div>
      </div>

      {/* Spin Button */}
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
              <span>SPINNING WHEEL...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-slate-950" />
              <span>SPIN FORTUNE WHEEL ({spinsLeft} LEFT)</span>
            </>
          )}
        </button>
      ) : (
        <div className="w-full py-3.5 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl text-center shadow-lg flex items-center justify-center gap-2">
          <Award className="w-5 h-5 text-amber-300" />
          <span>WHEEL COMPLETE! UNLOCKING VOUCHER...</span>
        </div>
      )}
    </div>
  )
}
