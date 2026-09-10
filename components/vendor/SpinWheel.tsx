'use client'

import React, { useState, useRef } from 'react'
import { VendorReward, VendorRewardCustomSettings } from '@/components/admin/types'
import { selectWeightedRewardIndex } from '@/lib/rewardAlgorithm'
import { Lock } from 'lucide-react'

interface SpinWheelProps {
  rewards: VendorReward[]
  onSpinEnd: (winningReward: VendorReward) => void
  customSettings?: VendorRewardCustomSettings
  disabled?: boolean
}

// Slice color palette matching reference image media_1788717179530.png EXACTLY
const REFERENCE_SLICE_COLORS = [
  '#FF9500', // 1. Vibrant Orange (Try Again)
  '#00A896', // 2. Deep Teal (Jackpot!)
  '#FF5A00', // 3. Orange-Red (Spin Again!)
  '#E6193C', // 4. Crimson Red (Go!)
  '#48BB78', // 5. Emerald Green (Winner!)
  '#6B21A8', // 6. Deep Purple (Lucky!)
  '#0077B6', // 7. Vibrant Cyan-Blue (Lucky!)
  '#E02470', // 8. Hot Pink / Magenta (You Win!)
]

const DEFAULT_REWARDS: VendorReward[] = [
  { id: '1', title: 'Try Again', code: 'TRYAGAIN', color: '#FF9500', description: 'Better luck on next turn' },
  { id: '2', title: 'Jackpot!', code: 'JACKPOT', color: '#00A896', description: 'Exclusive mega jackpot pass' },
  { id: '3', title: 'Spin Again!', code: 'SPINAGAIN', color: '#FF5A00', description: 'Extra bonus spin' },
  { id: '4', title: 'Go!', code: 'GO2025', color: '#E6193C', description: 'Instant travel discount' },
  { id: '5', title: 'Winner!', code: 'WINNER', color: '#48BB78', description: 'Special winner reward pass' },
  { id: '6', title: 'Lucky!', code: 'LUCKYPASS', color: '#6B21A8', description: 'Lucky pass reward' },
  { id: '7', title: 'Prize!', code: 'PRIZE100', color: '#0077B6', description: 'Surprise travel gift' },
  { id: '8', title: 'You Win!', code: 'YOUWIN', color: '#E02470', description: 'Flat discount voucher' },
]

export default function SpinWheel({ rewards, onSpinEnd, customSettings, disabled }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [winner, setWinner] = useState<VendorReward | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const safeRewards = rewards && rewards.length >= 6 ? rewards : DEFAULT_REWARDS
  const totalSlices = safeRewards.length
  const sliceAngle = 360 / totalSlices

  // Helper to split titles into 2 stacked lines along slice radius matching image
  const splitTitleIntoTwoLines = (title: string) => {
    const words = title.trim().split(/\s+/)
    if (words.length <= 1) return [title]
    if (words.length === 2) return [words[0], words[1]]
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }

  // Audio synthesizer tick sound on wheel spin
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
        osc.frequency.setValueAtTime(880, audioContextRef.current.currentTime)
        osc.frequency.exponentialRampToValueAtTime(190, audioContextRef.current.currentTime + 0.04)
        gain.gain.setValueAtTime(0.2, audioContextRef.current.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.04)
        osc.connect(gain)
        gain.connect(audioContextRef.current.destination)
        osc.start()
        osc.stop(audioContextRef.current.currentTime + 0.04)
      }
    } catch (e) {
      // Audio fallback
    }
  }

  const handleSpin = () => {
    if (isSpinning || disabled || winner) return

    setIsSpinning(true)
    const selectedIndex = selectWeightedRewardIndex(safeRewards)
    const winningReward = safeRewards[selectedIndex]

    // Calculate exact target rotation so winning slice stops precisely under the top pointer (270deg / 12 o'clock)
    const fullSpins = 6
    const midAngle = selectedIndex * sliceAngle + sliceAngle / 2

    // We want midAngle + deltaRotation = 270 (mod 360)
    const targetDelta = ((270 - midAngle - (rotationAngle % 360)) % 360 + 360) % 360
    const totalNewRotation = rotationAngle + (360 * fullSpins) + targetDelta

    setRotationAngle(totalNewRotation)

    let tickCount = 0
    const tickInterval = setInterval(() => {
      tickCount++
      playTickSound()
      if (tickCount > 28) clearInterval(tickInterval)
    }, 180)

    setTimeout(() => {
      clearInterval(tickInterval)
      setIsSpinning(false)
      setWinner(winningReward)

      try {
        const confetti = (window as any).confetti || require('canvas-confetti')
        if (confetti) {
          confetti({
            particleCount: 160,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#FF9500', '#00A896', '#E6193C', '#48BB78', '#6B21A8', '#E02470', '#FFD700']
          })
        }
      } catch (e) {
        // Fallback
      }

      onSpinEnd(winningReward)
    }, 5500)
  }

  return (
    <div className="w-full flex flex-col items-center justify-center select-none py-1 font-sans">
      
      {/* Outer Container */}
      <div className="w-full max-w-sm sm:max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Header Title */}
        <div className="mb-3 space-y-1 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide font-sans">
            Spin the Wheel
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-300 tracking-wide">
            Spin to reveal your guaranteed reward offer!
          </p>
        </div>

        {/* Wheel Graphic Wrapper */}
        <div className="relative w-[270px] h-[270px] sm:w-[320px] sm:h-[320px] flex items-center justify-center my-2 z-10">
          
          {/* Radial Light Rays Backdrop SVG */}
          <div className="absolute inset-0 -m-6 flex items-center justify-center pointer-events-none opacity-40">
            <svg viewBox="0 0 500 500" className="w-full h-full animate-[spin_25s_linear_infinite]">
              {[...Array(12)].map((_, i) => (
                <polygon
                  key={i}
                  points="250,250 210,0 290,0"
                  fill="url(#goldRayGrad)"
                  transform={`rotate(${i * 30} 250 250)`}
                />
              ))}
              <defs>
                <linearGradient id="goldRayGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#FFF59D" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Top Golden Pointer Arrow (Glowing Golden Shield Arrow pointing downwards) */}
          <div className="absolute -top-5 z-40 flex flex-col items-center pointer-events-none filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.8)]">
            <svg width="44" height="50" viewBox="0 0 44 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Golden Outer Shield Rim */}
              <path d="M22 50L2 12C-1.5 6 3 0 9 0H35C41 0 45.5 6 42 12L22 50Z" fill="url(#pointerGoldGrad)" stroke="#FFE57F" strokeWidth="2.5" />
              {/* Inner Glossy White/Yellow Core */}
              <path d="M22 42L8 12C6 8.5 8.5 4 12.5 4H31.5C35.5 4 38 8.5 36 12L22 42Z" fill="url(#pointerInnerGrad)" />
              <defs>
                <linearGradient id="pointerGoldGrad" x1="0" y1="0" x2="0" y2="50" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFF59D" />
                  <stop offset="0.4" stopColor="#F59E0B" />
                  <stop offset="1" stopColor="#78350F" />
                </linearGradient>
                <linearGradient id="pointerInnerGrad" x1="0" y1="0" x2="0" y2="42" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#FFF394" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Glowing Golden Double Rim Frame with Light Bulbs */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#FFF59D] via-[#F59E0B] to-[#78350F] p-4 shadow-[0_0_55px_rgba(245,158,11,0.65)] flex items-center justify-center border-4 border-[#FFE57F]">
            
            {/* 16 Glowing Circular Yellow/White Bulb Lights around Rim */}
            {[...Array(16)].map((_, i) => {
              const angle = (i * 360) / 16
              const rad = (angle * Math.PI) / 180
              const r = 48.2
              const x = 50 + r * Math.cos(rad)
              const y = 50 + r * Math.sin(rad)
              return (
                <span
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-amber-100 border border-amber-300 shadow-[0_0_10px_#ffffff] transition-all"
                  style={{
                    top: `${y}%`,
                    left: `${x}%`,
                    transform: 'translate(-50%, -50%)',
                    animation: isSpinning ? `pulse 0.35s infinite alternate ${i * 0.04}s` : 'none'
                  }}
                />
              )
            })}

            {/* Main Rotating SVG Wheel */}
            <div
              className="w-full h-full rounded-full transition-transform duration-[5500ms] ease-[cubic-bezier(0.15,0.85,0.25,1)] shadow-2xl"
              style={{ transform: `rotate(${rotationAngle}deg)` }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full rounded-full overflow-hidden">
                <g transform="translate(200, 200)">
                  {safeRewards.map((reward, i) => {
                    const startAngle = i * sliceAngle
                    const endAngle = (i + 1) * sliceAngle
                    const midAngle = startAngle + sliceAngle / 2

                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const radius = 196
                    const x1 = radius * Math.cos(startRad)
                    const y1 = radius * Math.sin(startRad)
                    const x2 = radius * Math.cos(endRad)
                    const y2 = radius * Math.sin(endRad)

                    const pathData = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
                    const sliceColor = reward.color || REFERENCE_SLICE_COLORS[i % REFERENCE_SLICE_COLORS.length]

                    const lines = splitTitleIntoTwoLines(reward.title)

                    return (
                      <g key={reward.id || i}>
                        {/* Slice Sector Fill */}
                        <path
                          d={pathData}
                          fill={sliceColor}
                          stroke="#FFFFFF"
                          strokeWidth="3.2"
                        />
                        
                        {/* Radial Slice Text Group (Radiates cleanly from center hub to outer rim) */}
                        <g transform={`rotate(${midAngle})`}>
                          {lines.length === 1 ? (
                            <text
                              x="118"
                              y="5"
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize={totalSlices > 8 ? "12" : "14.5"}
                              fontWeight="900"
                              className="font-black select-none tracking-wider"
                              style={{
                                filter: 'drop-shadow(0px 2.5px 3px rgba(0,0,0,0.9))',
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                              }}
                            >
                              {lines[0]}
                            </text>
                          ) : (
                            <>
                              <text
                                x="94"
                                y="5"
                                textAnchor="middle"
                                fill="#FFFFFF"
                                fontSize={totalSlices > 8 ? "11.5" : "13.5"}
                                fontWeight="900"
                                className="font-black select-none tracking-wider"
                                style={{
                                  filter: 'drop-shadow(0px 2.5px 3px rgba(0,0,0,0.9))',
                                  fontFamily: 'system-ui, -apple-system, sans-serif'
                                }}
                              >
                                {lines[0]}
                              </text>
                              <text
                                x="142"
                                y="5"
                                textAnchor="middle"
                                fill="#FFFFFF"
                                fontSize={totalSlices > 8 ? "11.5" : "13.5"}
                                fontWeight="900"
                                className="font-black select-none tracking-wider"
                                style={{
                                  filter: 'drop-shadow(0px 2.5px 3px rgba(0,0,0,0.9))',
                                  fontFamily: 'system-ui, -apple-system, sans-serif'
                                }}
                              >
                                {lines[1]}
                              </text>
                            </>
                          )}
                        </g>
                      </g>
                    )
                  })}
                </g>
              </svg>
            </div>

          </div>

          {/* 3D Glossy Metallic Golden Center Hub with Shiny Sphere Gem */}
          <div className="absolute z-30 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#854d0e] bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#78350f] shadow-[0_6px_22px_rgba(0,0,0,0.85)] flex items-center justify-center p-1 pointer-events-none">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#ffe066] via-[#f59e0b] to-[#b45309] border-2 border-amber-200 shadow-inner flex items-center justify-center">
              {/* Inner Glossy 3D Golden Ball */}
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-[#ffffff] via-[#f59e0b] to-[#78350f] border border-amber-200 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6)]" />
            </div>
          </div>

        </div>

        {/* 3D Arcade Glossy "SPIN NOW!" CTA Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || !!winner || disabled}
          className={`w-full max-w-[250px] sm:max-w-[280px] mt-3 py-3 px-6 rounded-full font-black text-sm sm:text-base tracking-widest uppercase transition-all shadow-[0_8px_22px_rgba(225,45,57,0.55)] active:scale-95 border-t-2 border-red-200 relative z-10 cursor-pointer overflow-hidden ${
            isSpinning || winner || disabled
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-80 shadow-none'
              : 'bg-gradient-to-r from-[#ff5e62] via-[#ff4365] to-[#e12d39] text-white hover:brightness-110 hover:shadow-[0_10px_28px_rgba(225,45,57,0.75)]'
          }`}
        >
          {/* Top Gloss Light Reflection */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25 rounded-t-full pointer-events-none" />
          <span className="relative z-10 font-black tracking-widest flex items-center justify-center gap-2">
            {isSpinning ? 'SPINNING...' : winner ? 'PRIZE CLAIMED!' : customSettings?.spinnerText || 'SPIN NOW!'}
          </span>
        </button>

        {/* Security Caption */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-purple-200/80 font-medium mt-2.5 relative z-10">
          <Lock className="w-3 h-3 text-amber-400" />
          <span>Assured rewards on every spin • 100% Free</span>
        </div>

      </div>

    </div>
  )
}
