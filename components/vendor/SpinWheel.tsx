'use client'

import React, { useState, useRef } from 'react'
import { VendorReward } from '@/components/admin/types'

interface SpinWheelProps {
  rewards: VendorReward[]
  onSpinEnd: (winningReward: VendorReward) => void
  disabled?: boolean
}

const DEFAULT_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']

export default function SpinWheel({ rewards, onSpinEnd, disabled }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [winner, setWinner] = useState<VendorReward | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const safeRewards = rewards && rewards.length === 5 ? rewards : [
    { id: '1', title: '10% OFF Trip', code: 'PROMO10', color: '#EF4444' },
    { id: '2', title: 'Free Hotel Pass', code: 'FREEPASS', color: '#F59E0B' },
    { id: '3', title: '₹1000 Cashback', code: 'SAVE1000', color: '#10B981' },
    { id: '4', title: 'Surprise Hamper', code: 'GIFT2025', color: '#3B82F6' },
    { id: '5', title: '20% OFF Luxury', code: 'LUCKY20', color: '#8B5CF6' },
  ]

  const sliceAngle = 360 / safeRewards.length

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
    const selectedIndex = Math.floor(Math.random() * safeRewards.length)
    const winningReward = safeRewards[selectedIndex]

    const fullSpins = 3
    const sliceCenterAngle = selectedIndex * sliceAngle + sliceAngle / 2
    const targetRotation = (360 * fullSpins) + (270 - sliceCenterAngle)

    const totalNewRotation = rotationAngle + (targetRotation - (rotationAngle % 360)) + (360 * fullSpins)
    setRotationAngle(totalNewRotation)

    let tickCount = 0
    const tickInterval = setInterval(() => {
      tickCount++
      playTickSound()
      if (tickCount > 22) clearInterval(tickInterval)
    }, 220)

    setTimeout(() => {
      clearInterval(tickInterval)
      setIsSpinning(false)
      setWinner(winningReward)

      try {
        const confetti = (window as any).confetti || require('canvas-confetti')
        if (confetti) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.55 },
            colors: ['#F59E0B', '#10B981', '#7C3AED', '#EF4444', '#3B82F6']
          })
        }
      } catch (e) {
        // Fallback
      }

      onSpinEnd(winningReward)
    }, 5500)
  }

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">
      
      {/* Outer Wheel Container */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
        
        {/* Top Pointer Arrow */}
        <div className="absolute -top-3 z-30 flex flex-col items-center">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-red-600 filter drop-shadow-md" />
        </div>

        {/* Outer Wheel Border */}
        <div className="absolute inset-0 rounded-full border-8 border-amber-400 bg-amber-400 shadow-xl flex items-center justify-center p-1 overflow-hidden">
          
          {/* Lights */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 360) / 12
            const rad = (angle * Math.PI) / 180
            const r = 46.5
            const x = 50 + r * Math.cos(rad)
            const y = 50 + r * Math.sin(rad)
            return (
              <span
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full bg-white border border-amber-600 shadow animate-pulse"
                style={{
                  top: `${y}%`,
                  left: `${x}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )
          })}

          {/* SVG Wheel */}
          <div
            className="w-full h-full rounded-full transition-transform duration-[5500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{ transform: `rotate(${rotationAngle}deg)` }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full rounded-full">
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
                  const bgColor = reward.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]

                  const midAngle = startAngle + sliceAngle / 2
                  const textRad = (midAngle * Math.PI) / 180
                  const textDist = 125
                  const tx = textDist * Math.cos(textRad)
                  const ty = textDist * Math.sin(textRad)

                  return (
                    <g key={reward.id || i}>
                      <path
                        d={pathData}
                        fill={bgColor}
                        stroke="#FFFFFF"
                        strokeWidth="3"
                      />
                      <g transform={`translate(${tx}, ${ty}) rotate(${midAngle + 90})`}>
                        <text
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="15"
                          fontWeight="bold"
                          className="font-sans drop-shadow select-none"
                        >
                          {reward.title}
                        </text>
                        {reward.code && (
                          <text
                            y="18"
                            textAnchor="middle"
                            fill="#FEF08A"
                            fontSize="11"
                            fontWeight="bold"
                            className="font-mono tracking-wider drop-shadow"
                          >
                            {reward.code}
                          </text>
                        )}
                      </g>
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* Center Spin Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || !!winner || disabled}
          className={`absolute z-40 w-18 h-18 sm:w-22 sm:h-22 rounded-full border-4 border-white shadow-2xl flex flex-col items-center justify-center transition-transform active:scale-95 ${
            isSpinning || !!winner || disabled
              ? 'bg-gray-400 cursor-not-allowed opacity-90'
              : 'bg-gradient-to-tr from-amber-500 to-yellow-400 hover:brightness-105 cursor-pointer shadow-lg'
          }`}
        >
          <span className="text-xs sm:text-sm font-extrabold text-slate-950 uppercase tracking-wide">
            {isSpinning ? 'SPINNING...' : winner ? 'WON!' : 'SPIN'}
          </span>
        </button>
      </div>

      {/* Helper text */}
      <p className="mt-2 text-xs font-bold text-gray-600 text-center">
        {isSpinning
          ? 'Spinning for your reward...'
          : winner
          ? `You won "${winner.title}"!`
          : 'Tap SPIN button to reveal your reward.'}
      </p>
    </div>
  )
}
