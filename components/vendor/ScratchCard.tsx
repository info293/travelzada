'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VendorReward, VendorRewardCustomSettings } from '@/components/admin/types'
import { selectWeightedReward } from '@/lib/rewardAlgorithm'
import { Gift, Ticket, Trophy, MousePointerClick, RefreshCw, CheckCircle2 } from 'lucide-react'

interface ScratchCardProps {
  rewards: VendorReward[]
  onScratchEnd: (winningReward: VendorReward) => void
  customSettings?: VendorRewardCustomSettings
  disabled?: boolean
}

const DEFAULT_REWARDS: VendorReward[] = [
  { id: '1', title: '10% OFF Booking', code: 'OFF10', color: '#FF7A00', description: '10% discount on next holiday package' },
  { id: '2', title: 'Free Hotel Pass', code: 'HOTELPASS', color: '#00B4D8', description: 'Complimentary room upgrade' },
  { id: '3', title: '₹1000 Cashback', code: 'SAVE1000', color: '#FF4D6D', description: 'Flat ₹1000 cashback' },
  { id: '4', title: 'Surprise Gift', code: 'GIFT2025', color: '#E63946', description: 'Special travel gift hamper' },
]

export default function ScratchCard({ rewards, onScratchEnd, customSettings, disabled }: ScratchCardProps) {
  const safeRewards = rewards && rewards.length > 0 ? rewards : DEFAULT_REWARDS

  const [winningReward, setWinningReward] = useState<VendorReward | null>(null)
  const [isScratchComplete, setIsScratchComplete] = useState(false)
  const [scratchPercent, setScratchPercent] = useState(0)
  const [isScratching, setIsScratching] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Pick winning reward using Weighted Probability Algorithm on initial load
  useEffect(() => {
    const selected = selectWeightedReward(safeRewards)
    setWinningReward(selected)
  }, [])

  // Initialize Canvas Overlay Cover
  useEffect(() => {
    initCanvas()
    window.addEventListener('resize', initCanvas)
    return () => window.removeEventListener('resize', initCanvas)
  }, [])

  const initCanvas = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const width = rect.width || 320
    const height = rect.height || 220

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Draw metallic scratch surface based on customSettings
    const grad = ctx.createLinearGradient(0, 0, width, height)
    if (customSettings?.scratchPattern === 'silver') {
      grad.addColorStop(0, '#94A3B8')
      grad.addColorStop(0.3, '#F1F5F9')
      grad.addColorStop(0.5, '#64748B')
      grad.addColorStop(0.8, '#E2E8F0')
      grad.addColorStop(1, '#334155')
    } else if (customSettings?.scratchPattern === 'diamond') {
      grad.addColorStop(0, '#7E22CE')
      grad.addColorStop(0.3, '#E9D5FF')
      grad.addColorStop(0.5, '#A855F7')
      grad.addColorStop(0.8, '#FCD34D')
      grad.addColorStop(1, '#581C87')
    } else {
      grad.addColorStop(0, '#F59E0B') // Amber 500
      grad.addColorStop(0.3, '#FCD34D') // Yellow 300
      grad.addColorStop(0.5, '#D97706') // Amber 600
      grad.addColorStop(0.8, '#FBBF24') // Amber 400
      grad.addColorStop(1, '#92400E') // Amber 800
    }

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Add subtle scratch pattern lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = 2
    for (let i = -height; i < width + height; i += 16) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + height, height)
      ctx.stroke()
    }

    // Outer decorative border inside canvas
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 4
    ctx.strokeRect(8, 8, width - 16, height - 16)

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(14, 14, width - 28, height - 28)

    // Decorative center emblem / text
    ctx.fillStyle = '#1E1B4B'
    ctx.font = '900 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎫 SCRATCH HERE 🎫', width / 2, height / 2 - 12)

    ctx.fillStyle = '#312E81'
    ctx.font = '700 12px sans-serif'
    ctx.fillText('Swipe or drag to reveal your prize!', width / 2, height / 2 + 16)
  }

  // Play tick sound when scratching
  const playScratchSound = () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) audioContextRef.current = new AudioCtx()
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }
      if (audioContextRef.current) {
        const osc = audioContextRef.current.createOscillator()
        const gain = audioContextRef.current.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(300 + Math.random() * 400, audioContextRef.current.currentTime)
        gain.gain.setValueAtTime(0.04, audioContextRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.03)
        osc.connect(gain)
        gain.connect(audioContextRef.current.destination)
        osc.start()
        osc.stop(audioContextRef.current.currentTime + 0.03)
      }
    } catch (e) {
      // Ignore audio error
    }
  }

  const triggerConfetti = () => {
    try {
      const confetti = (window as any).confetti || require('canvas-confetti')
      if (confetti) {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'],
        })
      }
    } catch (e) {
      // Ignore fallback
    }
  }

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current
    if (!canvas || isScratchComplete) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const imageData = ctx.getImageData(0, 0, width, height)
    const pixels = imageData.data

    let transparentPixels = 0
    const totalPixels = pixels.length / 4

    // Sample every 4th pixel for performance
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) {
        transparentPixels += 4
      }
    }

    const percent = Math.min(100, Math.round((transparentPixels / totalPixels) * 100))
    setScratchPercent(percent)

    if (percent > 45 && !isScratchComplete && winningReward) {
      finishScratch()
    }
  }

  const finishScratch = () => {
    if (isScratchComplete || !winningReward) return
    setIsScratchComplete(true)
    setScratchPercent(100)

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    triggerConfetti()
    setTimeout(() => {
      onScratchEnd(winningReward)
    }, 1200)
  }

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    } else {
      return null
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startScratching = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || isScratchComplete) return
    isDrawingRef.current = true
    setIsScratching(true)
    const pos = getCanvasPos(e)
    if (pos) {
      lastPosRef.current = pos
      scratchAt(pos.x, pos.y)
    }
  }

  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()

    if (lastPosRef.current) {
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(x, y)
      ctx.lineWidth = 44
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
    } else {
      ctx.arc(x, y, 22, 0, Math.PI * 2)
      ctx.fill()
    }

    lastPosRef.current = { x, y }
    playScratchSound()
  }

  const scratchMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || disabled || isScratchComplete) return
    const pos = getCanvasPos(e)
    if (pos) {
      scratchAt(pos.x, pos.y)
      checkScratchPercentage()
    }
  }

  const stopScratching = () => {
    isDrawingRef.current = false
    setIsScratching(false)
    lastPosRef.current = null
    checkScratchPercentage()
  }

  return (
    <div className="w-full flex flex-col items-center justify-center select-none py-1 font-sans">
      <div className="w-full max-w-sm sm:max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Card Header Title */}
        <div className="relative z-10 space-y-1 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-widest uppercase">
            <Ticket className="w-3.5 h-3.5 text-amber-400" /> SCRATCH CARD REWARD
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
            Scratch to Reveal Prize
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            Swipe or drag across the golden card surface below.
          </p>
        </div>

        {/* SCRATCH CARD CONTAINER */}
        <div
          ref={containerRef}
          className="relative w-full aspect-[4/2.6] sm:aspect-[4/2.4] rounded-2xl overflow-hidden border-4 border-amber-400/70 shadow-[0_8px_30px_rgba(245,158,11,0.3)] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 cursor-pointer"
        >
          {/* UNDERNEATH REWARD CONTENT */}
          {winningReward && (
            <motion.div
              animate={isScratchComplete ? { scale: [0.95, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full flex flex-col items-center justify-center text-center p-3 rounded-xl bg-gradient-to-br from-amber-500/20 via-blue-600/20 to-purple-600/20 border border-amber-300/40 space-y-2 relative z-0"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shadow-lg transform -rotate-3">
                <Gift className="w-7 h-7 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-[9px] font-black uppercase text-amber-300 tracking-widest block">
                  CONGRATULATIONS! YOU WON
                </span>
                <h4 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight mt-0.5">
                  {winningReward.title}
                </h4>
                {winningReward.description && (
                  <p className="text-xs text-blue-100 font-medium mt-0.5 line-clamp-2">
                    {winningReward.description}
                  </p>
                )}
              </div>

              {winningReward.code && (
                <div className="inline-block px-3 py-1 bg-black/60 border border-amber-400/50 rounded-lg text-amber-300 font-mono text-xs font-bold shadow-inner">
                  CODE: {winningReward.code}
                </div>
              )}
            </motion.div>
          )}

          {/* OVERLAY HTML5 CANVAS SCRATCH LAYER */}
          <canvas
            ref={canvasRef}
            onMouseDown={startScratching}
            onMouseMove={scratchMove}
            onMouseUp={stopScratching}
            onMouseLeave={stopScratching}
            onTouchStart={startScratching}
            onTouchMove={scratchMove}
            onTouchEnd={stopScratching}
            className={`absolute inset-0 w-full h-full z-10 touch-none transition-opacity duration-500 ${
              isScratchComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          />
        </div>

        {/* PROGRESS & QUICK REVEAL BUTTON */}
        <div className="w-full relative z-10 mt-4 space-y-3">
          {!isScratchComplete ? (
            <>
              {/* Scratch Progress Bar */}
              <div className="w-full space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-200">
                  <span>Scratch Progress</span>
                  <span>{scratchPercent}% Scratched</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-200 rounded-full"
                    style={{ width: `${scratchPercent}%` }}
                  />
                </div>
              </div>

              {/* Quick Reveal Button */}
              <button
                type="button"
                onClick={finishScratch}
                disabled={disabled}
                className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
              >
                <MousePointerClick className="w-4 h-4" />
                <span>Quick Reveal / Scratch All</span>
              </button>
            </>
          ) : (
            <div className="py-2 px-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Prize Revealed! Proceeding to claim...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
