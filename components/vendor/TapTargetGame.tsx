'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Crosshair, Zap } from 'lucide-react'

interface TapTargetGameProps {
  onGameComplete: (points: number) => void
  timerSeconds?: number
  customImages?: string[]
}

interface TargetItem {
  id: string
  x: number
  y: number
  size: number
  bg: string
  shadow: string
  image?: string
}

const COLORS = [
  { bg: 'bg-amber-500', shadow: 'shadow-amber-500/50' },
  { bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/50' },
  { bg: 'bg-blue-500', shadow: 'shadow-blue-500/50' },
  { bg: 'bg-violet-500', shadow: 'shadow-violet-500/50' },
  { bg: 'bg-rose-500', shadow: 'shadow-rose-500/50' },
  { bg: 'bg-cyan-500', shadow: 'shadow-cyan-500/50' }
]

const TARGET_INTERVAL = 900
const TARGET_LIFESPAN = 1300
const MAX_TARGETS = 2

const TargetCircle = ({ 
  target, 
  onTap, 
  onRemove 
}: { 
  target: TargetItem
  onTap: (id: string) => void
  onRemove: (id: string) => void 
}) => {
  const [popping, setPopping] = useState(false)

  useEffect(() => {
    if (popping) return
    const timer = setTimeout(() => {
      onRemove(target.id)
    }, TARGET_LIFESPAN)
    return () => clearTimeout(timer)
  }, [target.id, onRemove, popping])

  const handleClick = () => {
    if (popping) return
    setPopping(true)
    onTap(target.id)
    setTimeout(() => {
      onRemove(target.id)
    }, 200)
  }

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={
        popping 
          ? { scale: 0, opacity: 0, filter: 'brightness(2)' } 
          : { scale: 1, opacity: 1, filter: 'brightness(1)' }
      }
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`absolute rounded-full shadow-lg border-2 border-white/40 flex items-center justify-center cursor-crosshair overflow-hidden ${target.bg} ${target.shadow}`}
      style={{
        width: target.size,
        height: target.size,
        left: `${target.x}%`,
        top: `${target.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: popping ? 10 : 1
      }}
    >
      {target.image ? (
        <img src={target.image} alt="Target" className="w-full h-full object-cover rounded-full pointer-events-none" />
      ) : (
        <div className="w-1/2 h-1/2 rounded-full bg-white/40 pointer-events-none" />
      )}
    </motion.button>
  )
}

export default function TapTargetGame({
  onGameComplete,
  timerSeconds = 15,
  customImages = [],
}: TapTargetGameProps) {
  const gameDuration = timerSeconds > 0 ? timerSeconds : 15
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'ended'>('idle')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(gameDuration)
  const [score, setScore] = useState(0)
  const [targets, setTargets] = useState<TargetItem[]>([])

  useEffect(() => {
    if (timerSeconds && timerSeconds > 0) {
      setTimeLeft(timerSeconds)
    }
  }, [timerSeconds])
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const startGame = () => {
    setGameState('countdown')
    setCountdown(3)
    setScore(0)
    setTimeLeft(gameDuration)
    setTargets([])
  }

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timer)
      } else {
        setGameState('playing')
      }
    }
  }, [gameState, countdown])

  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('ended')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      const spawnTarget = () => {
        setTargets(prev => {
          if (prev.length >= MAX_TARGETS) return prev
          
          const validImgs = customImages.filter(img => img && img.trim() !== '')
          const randomImg = validImgs.length > 0 ? validImgs[Math.floor(Math.random() * validImgs.length)] : undefined

          const newTarget: TargetItem = {
            id: Math.random().toString(36).substring(2, 9),
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            size: Math.floor(Math.random() * 16) + 40,
            image: randomImg,
            ...COLORS[Math.floor(Math.random() * COLORS.length)]
          }
          
          return [...prev, newTarget]
        })
      }

      intervalRef.current = setInterval(spawnTarget, TARGET_INTERVAL)
      spawnTarget()

      return () => {
        if (gameTimerRef.current) clearInterval(gameTimerRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
  }, [gameState])

  useEffect(() => {
    if (gameState === 'ended') {
      onGameComplete(score)
    }
  }, [gameState, onGameComplete, score])

  const handleTargetTap = useCallback((id: string) => {
    setScore(s => s + 10)
  }, [])

  const handleTargetRemove = useCallback((id: string) => {
    setTargets(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-black tracking-tight text-slate-100">
            TAP THE TARGETS
          </h2>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score</span>
            <span className="text-2xl font-black text-amber-400 flex items-center gap-1">
              <Zap className="w-5 h-5" />
              {score}
            </span>
          </div>
          
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle 
                cx="24" cy="24" r="20" 
                stroke="currentColor" strokeWidth="4" fill="transparent" 
                className="text-slate-800" 
              />
              <motion.circle 
                cx="24" cy="24" r="20" 
                stroke="currentColor" strokeWidth="4" fill="transparent" 
                className="text-amber-500"
                strokeDasharray="125.6"
                initial={{ strokeDashoffset: 0 }}
                animate={{ 
                  strokeDashoffset: gameState === 'playing' ? 125.6 * (1 - timeLeft / gameDuration) : 0 
                }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </svg>
            <span className="text-sm font-bold text-slate-200">
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      <div 
        className="relative w-full h-[350px] bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-800 select-none cursor-crosshair"
        style={{
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        <AnimatePresence>
          {gameState === 'playing' && targets.map(target => (
            <TargetCircle 
              key={target.id} 
              target={target} 
              onTap={handleTargetTap}
              onRemove={handleTargetRemove}
            />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'countdown' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20"
            >
              <motion.span 
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-8xl font-black text-amber-500 drop-shadow-2xl"
              >
                {countdown}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(gameState === 'idle' || gameState === 'ended') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md z-20"
            >
              <Crosshair className="w-16 h-16 text-amber-500 mb-4 opacity-50" />
              {gameState === 'ended' && (
                <div className="text-center mb-6">
                  <p className="text-slate-400 font-medium mb-1">Final Score</p>
                  <p className="text-5xl font-black text-amber-400">{score}</p>
                </div>
              )}
              <button
                onClick={startGame}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-full transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                {gameState === 'idle' ? 'Start Game' : 'Play Again'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
