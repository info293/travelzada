'use client'

import React, { useState, useRef } from 'react'
import { VendorReward } from '@/components/admin/types'

interface SpinWheelProps {
  rewards: VendorReward[]
  onSpinEnd: (winningReward: VendorReward) => void
  disabled?: boolean
}

// Slice color palette matching reference image:
// Vibrant Orange, Dark Slate Navy, Electric Blue, Emerald Green, Magenta Pink, Purple
const SLICE_COLORS = ['#F97316', '#1E2D4A', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#EA580C', '#2563EB']

export default function SpinWheel({ rewards, onSpinEnd, disabled }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [winner, setWinner] = useState<VendorReward | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const safeRewards = rewards && rewards.length > 0 ? rewards : [
    { id: '1', title: '10% OFF', code: 'PROMO10', color: '#F97316' },
    { id: '2', title: 'Free Stay', code: 'FREEPASS', color: '#1E2D4A' },
    { id: '3', title: '₹1000 OFF', code: 'SAVE1000', color: '#3B82F6' },
    { id: '4', title: 'Gift Pass', code: 'GIFT2025', color: '#10B981' },
    { id: '5', title: '20% OFF', code: 'LUCKY20', color: '#EC4899' },
  ]

  const totalSlices = safeRewards.length
  const sliceAngle = 360 / totalSlices

  // Helper to split long titles into 2 compact lines so text never overlaps center hub
  const splitTitle = (title: string) => {
    const words = title.trim().split(/\s+/)
    if (words.length <= 1 || title.length <= 9) {
      return [title]
    }
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }

  const playTickSound = () => {
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
        osc.frequency.setValueAtTime(750, audioContextRef.current.currentTime)
        osc.frequency.exponentialRampToValueAtTime(160, audioContextRef.current.currentTime + 0.04)
        gain.gain.setValueAtTime(0.18, audioContextRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.04)
        osc.connect(gain)
        gain.connect(audioContextRef.current.destination)
        osc.start()
        osc.stop(audioContextRef.current.currentTime + 0.04)
      }
    } catch (e) {
      // Ignore
    }
  }

  const handleSpin = () => {
    if (isSpinning || disabled || winner) return

    setIsSpinning(true)
    const selectedIndex = Math.floor(Math.random() * totalSlices)
    const winningReward = safeRewards[selectedIndex]

    const fullSpins = 4
    const sliceCenterAngle = selectedIndex * sliceAngle + sliceAngle / 2
    const targetRotation = (360 * fullSpins) + (270 - sliceCenterAngle)

    const totalNewRotation = rotationAngle + (targetRotation - (rotationAngle % 360)) + (360 * fullSpins)
    setRotationAngle(totalNewRotation)

    let tickCount = 0
    const tickInterval = setInterval(() => {
      tickCount++
      playTickSound()
      if (tickCount > 24) clearInterval(tickInterval)
    }, 200)

    setTimeout(() => {
      clearInterval(tickInterval)
      setIsSpinning(false)
      setWinner(winningReward)

      try {
        const confetti = (window as any).confetti || require('canvas-confetti')
        if (confetti) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#F97316', '#3B82F6', '#EC4899', '#FEF08A', '#10B981']
          })
        }
      } catch (e) {
        // Fallback
      }

      onSpinEnd(winningReward)
    }, 5500)
  }

  return (
    <div className="w-full flex flex-col items-center justify-center select-none py-1">
      
      {/* Outer Card Container with dark navy gaming background */}
      <div className="w-full max-w-xs sm:max-w-sm bg-gradient-to-b from-[#1b273e] via-[#141f33] to-[#0f1726] border border-slate-700/60 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center text-center">
        
        {/* Top Header Labels */}
        <div className="mb-2 space-y-0.5">
          <p className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">Tap to spin</p>
          <h3 className="text-sm sm:text-base font-black text-white tracking-widest uppercase drop-shadow-sm">
            {winner ? 'REWARD UNLOCKED!' : 'DAILY SPINS LEFT : 1'}
          </h3>
        </div>

        {/* Wheel Wrapper */}
        <div className="relative w-64 h-64 sm:w-76 sm:h-76 flex items-center justify-center my-1">
          
          {/* Metallic Stopper / Red Pointer Arrow at Top */}
          <div className="absolute -top-3.5 z-40 flex flex-col items-center pointer-events-none drop-shadow-xl">
            <svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 34L2 6C0.5 3 2.5 0 6 0H22C25.5 0 27.5 3 26 6L14 34Z" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Outer Metallic Ring Frame */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-200 via-slate-400 to-slate-600 p-3.5 shadow-2xl flex items-center justify-center border-2 border-slate-300">
            
            {/* Metallic Studs / Rivets around Outer Ring */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * 360) / 8
              const rad = (angle * Math.PI) / 180
              const r = 46.5
              const x = 50 + r * Math.cos(rad)
              const y = 50 + r * Math.sin(rad)
              return (
                <span
                  key={i}
                  className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-b from-white via-slate-200 to-slate-400 border border-slate-500 shadow-sm"
                  style={{
                    top: `${y}%`,
                    left: `${x}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )
            })}

            {/* SVG Wheel (Rotates) */}
            <div
              className="w-full h-full rounded-full transition-transform duration-[5500ms] ease-[cubic-bezier(0.18,0.89,0.22,1)]"
              style={{ transform: `rotate(${rotationAngle}deg)` }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full rounded-full overflow-hidden">
                <g transform="translate(200, 200)">
                  {safeRewards.map((reward, i) => {
                    const startAngle = i * sliceAngle
                    const endAngle = (i + 1) * sliceAngle
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const radius = 195
                    const x1 = radius * Math.cos(startRad)
                    const y1 = radius * Math.sin(startRad)
                    const x2 = radius * Math.cos(endRad)
                    const y2 = radius * Math.sin(endRad)

                    const pathData = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
                    const bgColor = reward.color || SLICE_COLORS[i % SLICE_COLORS.length]

                    const midAngle = (startAngle + sliceAngle / 2) % 360
                    const textRad = (midAngle * Math.PI) / 180
                    
                    // Golden coin position right near the outer metallic rim
                    const coinDist = 158
                    const cx = coinDist * Math.cos(textRad)
                    const cy = coinDist * Math.sin(textRad)

                    // Text center position safely distanced away from center SPIN hub
                    const textDist = 118
                    const tx = textDist * Math.cos(textRad)
                    const ty = textDist * Math.sin(textRad)

                    // Smart Radial Text Rotation: Auto-flip text so it is NEVER upside down!
                    let textRotation = midAngle
                    if (midAngle > 90 && midAngle < 270) {
                      textRotation += 180
                    }

                    const titleLines = splitTitle(reward.title)

                    return (
                      <g key={reward.id || i}>
                        {/* Slice Sector */}
                        <path
                          d={pathData}
                          fill={bgColor}
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                        />
                        
                        {/* Golden Star Coin Graphic near Outer Rim */}
                        <g transform={`translate(${cx}, ${cy}) rotate(${midAngle + 90})`}>
                          <circle r="11" fill="url(#goldGradient)" stroke="#FFFFFF" strokeWidth="1.5" className="drop-shadow-sm" />
                          <circle r="7.5" fill="#FBBF24" />
                          <text textAnchor="middle" y="3.5" fill="#78350F" fontSize="9.5" fontWeight="900">★</text>
                        </g>

                        {/* Text Label - Multi-line, Crisp, High-Contrast & Clear of Center Hub */}
                        <g transform={`translate(${tx}, ${ty}) rotate(${textRotation})`} filter="url(#textShadowFilter)">
                          {titleLines.length === 1 ? (
                            <text
                              textAnchor="middle"
                              y="0"
                              fill="#FFFFFF"
                              fontSize="13.5"
                              fontWeight="900"
                              letterSpacing="0.02em"
                              className="font-sans select-none"
                              style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.95), 0px 0px 3px #000000' }}
                            >
                              {titleLines[0]}
                            </text>
                          ) : (
                            <>
                              <text
                                textAnchor="middle"
                                y="-7"
                                fill="#FFFFFF"
                                fontSize="12.5"
                                fontWeight="900"
                                letterSpacing="0.02em"
                                className="font-sans select-none"
                                style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.95), 0px 0px 3px #000000' }}
                              >
                                {titleLines[0]}
                              </text>
                              <text
                                textAnchor="middle"
                                y="8"
                                fill="#FFFFFF"
                                fontSize="12.5"
                                fontWeight="900"
                                letterSpacing="0.02em"
                                className="font-sans select-none"
                                style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.95), 0px 0px 3px #000000' }}
                              >
                                {titleLines[1]}
                              </text>
                            </>
                          )}

                          {reward.code && (
                            <text
                              y={titleLines.length === 1 ? '15' : '21'}
                              textAnchor="middle"
                              fill="#FEF08A"
                              fontSize="10"
                              fontWeight="800"
                              className="font-mono tracking-wider"
                              style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.95), 0px 0px 2px #000000' }}
                            >
                              {reward.code}
                            </text>
                          )}
                        </g>
                      </g>
                    )
                  })}
                </g>
                <defs>
                  {/* High contrast text shadow filter */}
                  <filter id="textShadowFilter" x="-40%" y="-40%" width="180%" height="180%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.98" />
                  </filter>

                  {/* Gold Gradient for Coin */}
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

          </div>

          {/* Center Hub SPIN Badge */}
          <div className="absolute z-30 w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-slate-300 bg-gradient-to-b from-slate-200 to-slate-400 shadow-xl flex items-center justify-center p-1 pointer-events-none">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-2 border-amber-100 shadow-inner flex items-center justify-center">
              <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest drop-shadow-xs">
                SPIN
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Prominent Orange "SPIN NOW!" CTA Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || !!winner || disabled}
          className={`w-full max-w-[220px] sm:max-w-[260px] mt-3 py-3 sm:py-3.5 px-6 rounded-full font-black text-base sm:text-lg tracking-wider uppercase transition shadow-xl border-t border-amber-200 active:scale-95 ${
            isSpinning || winner || disabled
              ? 'bg-slate-600 text-slate-300 border-slate-500 cursor-not-allowed opacity-80'
              : 'bg-gradient-to-b from-amber-400 via-orange-500 to-orange-600 text-white hover:brightness-110 cursor-pointer shadow-orange-950/40'
          }`}
        >
          {isSpinning ? 'SPINNING...' : winner ? 'CLAIM PRIZE' : 'SPIN NOW!'}
        </button>

      </div>

    </div>
  )
}
