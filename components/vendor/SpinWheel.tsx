'use client'

import React, { useState, useRef } from 'react'
import { VendorReward } from '@/components/admin/types'
import { Lock, Plane, Building2, Bus, Gift, CreditCard } from 'lucide-react'

interface SpinWheelProps {
  rewards: VendorReward[]
  onSpinEnd: (winningReward: VendorReward) => void
  disabled?: boolean
}

// Slice color palette matching reference image:
// Electric Blue (Flights), Soft Purple (Hotels), Crimson Red (Bus), Vibrant Amber (Merchandise), Emerald Green (Voucher)
const EXACT_SLICE_COLORS = ['#1D70F5', '#8B5CF6', '#E12D39', '#F59E0B', '#10B981']

export default function SpinWheel({ rewards, onSpinEnd, disabled }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [winner, setWinner] = useState<VendorReward | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const safeRewards = rewards && rewards.length > 0 ? rewards : [
    { id: '1', title: '₹250 OFF Flights', code: 'FLY250', color: '#1D70F5' },
    { id: '2', title: '₹250 OFF Hotels', code: 'STAY250', color: '#8B5CF6' },
    { id: '3', title: '10% OFF Bus Tickets', code: 'BUS10', color: '#E12D39' },
    { id: '4', title: 'Free Travel Merchandise', code: 'GIFTFREE', color: '#F59E0B' },
    { id: '5', title: '₹1000 Discount Voucher', code: 'SAVE1000', color: '#10B981' },
  ]

  const totalSlices = safeRewards.length
  const sliceAngle = 360 / totalSlices

  // Helper to split long titles into 2 compact lines so text never overlaps center hub
  const splitTitle = (title: string) => {
    const words = title.trim().split(/\s+/)
    if (words.length <= 1 || title.length <= 8) {
      return [title]
    }
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }

  // Helper to return slice icon
  const getSliceIcon = (title: string, index: number) => {
    const lower = title.toLowerCase()
    if (lower.includes('flight') || lower.includes('air') || lower.includes('fly')) return <Plane className="w-5 h-5 text-white stroke-[2.2]" />
    if (lower.includes('hotel') || lower.includes('stay') || lower.includes('room')) return <Building2 className="w-5 h-5 text-white stroke-[2.2]" />
    if (lower.includes('bus') || lower.includes('ticket')) return <Bus className="w-5 h-5 text-white stroke-[2.2]" />
    if (lower.includes('merchandise') || lower.includes('free') || lower.includes('gift')) return <Gift className="w-5 h-5 text-white stroke-[2.2]" />
    if (lower.includes('voucher') || lower.includes('discount') || lower.includes('off') || lower.includes('₹') || lower.includes('%')) return <CreditCard className="w-5 h-5 text-white stroke-[2.2]" />
    
    const fallbacks = [
      <Plane key="1" className="w-5 h-5 text-white stroke-[2.2]" />,
      <Building2 key="2" className="w-5 h-5 text-white stroke-[2.2]" />,
      <Bus key="3" className="w-5 h-5 text-white stroke-[2.2]" />,
      <Gift key="4" className="w-5 h-5 text-white stroke-[2.2]" />,
      <CreditCard key="5" className="w-5 h-5 text-white stroke-[2.2]" />
    ]
    return fallbacks[index % fallbacks.length]
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

    const fullSpins = 5
    const sliceCenterAngle = selectedIndex * sliceAngle + sliceAngle / 2
    const targetRotation = (360 * fullSpins) + (270 - sliceCenterAngle)

    const totalNewRotation = rotationAngle + (targetRotation - (rotationAngle % 360)) + (360 * fullSpins)
    setRotationAngle(totalNewRotation)

    let tickCount = 0
    const tickInterval = setInterval(() => {
      tickCount++
      playTickSound()
      if (tickCount > 25) clearInterval(tickInterval)
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
    <div className="w-full flex flex-col items-center justify-center select-none py-0.5 font-sans">
      
      {/* Outer Gaming Box Container matching reference image (Dark Deep Navy/Purple container with rounded corners) */}
      <div className="w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#1b1754] via-[#161248] to-[#0e0a30] border border-indigo-900/80 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Confetti & Particle Sparks Background Graphic */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:18px_18px] pointer-events-none" />

        {/* Top Header Inside Dark Container */}
        <div className="mb-2 space-y-0.5 relative z-10">
          <p className="text-[10px] font-medium text-indigo-200/90 tracking-widest uppercase flex items-center justify-center gap-1.5">
            <span className="text-indigo-400">→</span> <span>TAP TO SPIN</span> <span className="text-indigo-400">←</span>
          </p>
          <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wider uppercase drop-shadow-xs">
            {winner ? 'REWARD UNLOCKED!' : 'DAILY SPINS LEFT : '}
            {!winner && <span className="text-amber-400">1</span>}
          </h3>
        </div>

        {/* Wheel Graphic Wrapper */}
        <div className="relative w-64 h-64 sm:w-76 sm:h-76 flex items-center justify-center my-1 z-10">
          
          {/* Top Pointer Arrow (Red with White Stroke) */}
          <div className="absolute -top-3.5 z-40 flex flex-col items-center pointer-events-none filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
            <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 38L2 9C0.5 4.5 3.5 0 8 0H24C28.5 0 31.5 4.5 30 9L16 38Z" fill="#E12D39" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Glowing Neon Golden Outer Rim Frame */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#fff394] via-[#f59e0b] to-[#a15104] p-3.5 shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center border-2 border-amber-200">
            
            {/* Glowing White Bulbs around Rim */}
            {[...Array(14)].map((_, i) => {
              const angle = (i * 360) / 14
              const rad = (angle * Math.PI) / 180
              const r = 47.8
              const x = 50 + r * Math.cos(rad)
              const y = 50 + r * Math.sin(rad)
              return (
                <span
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-white border border-amber-300 shadow-[0_0_10px_#ffffff]"
                  style={{
                    top: `${y}%`,
                    left: `${x}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )
            })}

            {/* SVG Wheel (Rotates on Spin) */}
            <div
              className="w-full h-full rounded-full transition-transform duration-[5500ms] ease-[cubic-bezier(0.18,0.89,0.22,1)] shadow-inner"
              style={{ transform: `rotate(${rotationAngle}deg)` }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full rounded-full overflow-hidden">
                <g transform="translate(200, 200)">
                  {safeRewards.map((reward, i) => {
                    // Offset startAngle by -126 deg so top slice (Flights) centers at -90 deg (exact top)
                    const startAngle = i * sliceAngle - 126
                    const endAngle = (i + 1) * sliceAngle - 126
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const radius = 196
                    const x1 = radius * Math.cos(startRad)
                    const y1 = radius * Math.sin(startRad)
                    const x2 = radius * Math.cos(endRad)
                    const y2 = radius * Math.sin(endRad)

                    const pathData = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
                    const bgColor = reward.color || EXACT_SLICE_COLORS[i % EXACT_SLICE_COLORS.length]

                    const midAngle = startAngle + sliceAngle / 2
                    const textRad = (midAngle * Math.PI) / 180
                    
                    // Content Center Position (unrotated, completely horizontal icon + multi-line text)
                    const contentDist = 118
                    const cx = contentDist * Math.cos(textRad)
                    const cy = contentDist * Math.sin(textRad)

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
                        
                        {/* Completely Horizontal Unrotated Icon & Text Content Group */}
                        <g transform={`translate(${cx}, ${cy})`} filter="url(#textShadowFilter)">
                          {/* White Category Icon */}
                          <g transform="translate(-10, -26)">
                            {getSliceIcon(reward.title, i)}
                          </g>

                          {/* Crisp Horizontal Text Lines */}
                          {titleLines.length === 1 ? (
                            <text
                              textAnchor="middle"
                              y="8"
                              fill="#FFFFFF"
                              fontSize="12.5"
                              fontWeight="600"
                              className="font-sans select-none"
                              style={{ textShadow: '0px 1.5px 3px rgba(0,0,0,0.85)' }}
                            >
                              {titleLines[0]}
                            </text>
                          ) : (
                            <>
                              <text
                                textAnchor="middle"
                                y="4"
                                fill="#FFFFFF"
                                fontSize="12"
                                fontWeight="600"
                                className="font-sans select-none"
                                style={{ textShadow: '0px 1.5px 3px rgba(0,0,0,0.85)' }}
                              >
                                {titleLines[0]}
                              </text>
                              <text
                                textAnchor="middle"
                                y="18"
                                fill="#FFFFFF"
                                fontSize="11.5"
                                fontWeight="500"
                                className="font-sans select-none"
                                style={{ textShadow: '0px 1.5px 3px rgba(0,0,0,0.85)' }}
                              >
                                {titleLines[1]}
                              </text>
                            </>
                          )}
                        </g>
                      </g>
                    )
                  })}
                </g>
                <defs>
                  <filter id="textShadowFilter" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.9" />
                  </filter>
                </defs>
              </svg>
            </div>

          </div>

          {/* 3D Glossy Golden Center Hub SPIN Button */}
          <div className="absolute z-30 w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-[#fff7a1] bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#92400e] shadow-[0_4px_15px_rgba(0,0,0,0.5)] flex items-center justify-center p-1 pointer-events-none">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#d97706] border border-white/80 shadow-inner flex items-center justify-center">
              <span className="text-xs sm:text-sm font-semibold text-gray-950 uppercase tracking-wider drop-shadow-xs">
                SPIN
              </span>
            </div>
          </div>

        </div>

        {/* 3D Coral-Pink/Red "SPIN NOW!" CTA Button with Gloss Highlight */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || !!winner || disabled}
          className={`w-full max-w-[240px] sm:max-w-[270px] mt-3 py-2.5 sm:py-3 px-5 rounded-full font-semibold text-sm sm:text-base tracking-wider uppercase transition-all shadow-[0_6px_16px_rgba(225,45,57,0.4)] active:scale-95 border-t border-red-200 relative z-10 cursor-pointer overflow-hidden ${
            isSpinning || winner || disabled
              ? 'bg-slate-700 text-slate-300 cursor-not-allowed opacity-80'
              : 'bg-gradient-to-r from-[#ff5e62] via-[#ff4365] to-[#e12d39] text-white hover:brightness-110'
          }`}
        >
          {/* Top Gloss Light Reflection Overlay */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full pointer-events-none" />
          <span className="relative z-10">{isSpinning ? 'SPINNING...' : winner ? 'CLAIM PRIZE' : 'SPIN NOW!'}</span>
        </button>

        {/* Lock Security Caption */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-indigo-200/80 font-normal mt-2.5 relative z-10">
          <Lock className="w-3 h-3 text-indigo-300" />
          <span>Assured rewards on every spin</span>
        </div>

      </div>

    </div>
  )
}

