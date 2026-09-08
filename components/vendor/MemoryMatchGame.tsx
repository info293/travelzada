'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plane, Palmtree, Mountain, Camera, Compass, Briefcase, CheckCircle2 } from 'lucide-react'

interface MemoryMatchGameProps {
  onGameComplete: (points: number) => void
  timerSeconds?: number
  customImages?: string[]
}

const DEFAULT_PAIRS = [
  { id: 'pair-1', title: 'Bali Beach', icon: Palmtree, color: 'text-emerald-400', bg: 'bg-emerald-500/20', defaultImg: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80' },
  { id: 'pair-2', title: 'Paris Eiffel', icon: Camera, color: 'text-amber-400', bg: 'bg-amber-500/20', defaultImg: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80' },
  { id: 'pair-3', title: 'Tokyo Mt Fuji', icon: Plane, color: 'text-blue-400', bg: 'bg-blue-500/20', defaultImg: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80' },
  { id: 'pair-4', title: 'Swiss Alps', icon: Mountain, color: 'text-violet-400', bg: 'bg-violet-500/20', defaultImg: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=400&q=80' },
  { id: 'pair-5', title: 'Compass', icon: Compass, color: 'text-rose-400', bg: 'bg-rose-500/20', defaultImg: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80' },
  { id: 'pair-6', title: 'Luggage', icon: Briefcase, color: 'text-cyan-400', bg: 'bg-cyan-500/20', defaultImg: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80' },
]

interface CardItem {
  uniqueId: string
  pairId: string
  title: string
  icon: React.ElementType
  color: string
  bg: string
  image: string
  isFlipped: boolean
  isMatched: boolean
}

export default function MemoryMatchGame({
  onGameComplete,
  timerSeconds = 60,
  customImages = [],
}: MemoryMatchGameProps) {
  const initialTime = timerSeconds > 0 ? timerSeconds : 60

  const [cards, setCards] = useState<CardItem[]>([])
  const [firstSelected, setFirstSelected] = useState<CardItem | null>(null)
  const [matchesCount, setMatchesCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  // Sync timer when vendor configured timerSeconds prop changes
  useEffect(() => {
    if (timerSeconds && timerSeconds > 0) {
      setTimeLeft(timerSeconds)
    }
  }, [timerSeconds])

  // Initialize and shuffle 12 cards (6 pairs)
  useEffect(() => {
    const pairData = DEFAULT_PAIRS.map((defPair, idx) => {
      const customImg = customImages[idx] && customImages[idx].trim() !== '' ? customImages[idx] : defPair.defaultImg
      return {
        ...defPair,
        image: customImg,
      }
    })

    const deck: CardItem[] = []
    pairData.forEach((pair, pairIdx) => {
      deck.push({
        uniqueId: `${pair.id}-A-${pairIdx}`,
        pairId: pair.id,
        title: pair.title,
        icon: pair.icon,
        color: pair.color,
        bg: pair.bg,
        image: pair.image,
        isFlipped: false,
        isMatched: false,
      })
      deck.push({
        uniqueId: `${pair.id}-B-${pairIdx}`,
        pairId: pair.id,
        title: pair.title,
        icon: pair.icon,
        color: pair.color,
        bg: pair.bg,
        image: pair.image,
        isFlipped: false,
        isMatched: false,
      })
    })

    // Shuffle deck
    const shuffled = [...deck].sort(() => Math.random() - 0.5)
    setCards(shuffled)
  }, [customImages])

  const finishGame = useCallback((finalMatches: number, remainingSecs: number) => {
    setIsGameOver(true)
    let points = 0
    if (finalMatches === 6) {
      // Bonus points for completing all 6 pairs before time runs out
      points = 150 + Math.max(0, remainingSecs) * 5
    } else {
      // Partial points for matches found before time expired
      points = finalMatches * 30
    }
    onGameComplete(points)
  }, [onGameComplete])

  // Countdown timer
  useEffect(() => {
    if (isGameOver) return

    if (timeLeft <= 0) {
      finishGame(matchesCount, 0)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isGameOver, matchesCount, finishGame])

  // Card click handler
  const handleCardClick = (clickedCard: CardItem) => {
    if (
      isLocked ||
      isGameOver ||
      clickedCard.isFlipped ||
      clickedCard.isMatched ||
      (firstSelected && firstSelected.uniqueId === clickedCard.uniqueId)
    ) {
      return
    }

    // Flip clicked card
    setCards((prev) =>
      prev.map((c) => (c.uniqueId === clickedCard.uniqueId ? { ...c, isFlipped: true } : c))
    )

    if (!firstSelected) {
      // First card flipped of a pair attempt
      setFirstSelected(clickedCard)
    } else {
      // Second card flipped — evaluate match
      setIsLocked(true)

      if (firstSelected.pairId === clickedCard.pairId) {
        // MATCH FOUND!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.pairId === clickedCard.pairId ? { ...c, isMatched: true, isFlipped: true } : c
            )
          )
          const updatedMatches = matchesCount + 1
          setMatchesCount(updatedMatches)
          setFirstSelected(null)
          setIsLocked(false)

          // Require ALL 6 PAIRS (12 cards) matched to win
          if (updatedMatches === 6) {
            finishGame(6, timeLeft)
          }
        }, 350)
      } else {
        // NOT A MATCH — flip back after 800ms delay
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.uniqueId === firstSelected.uniqueId || c.uniqueId === clickedCard.uniqueId
                ? { ...c, isFlipped: false }
                : c
            )
          )
          setFirstSelected(null)
          setIsLocked(false)
        }, 800)
      }
    }
  }

  // Format timer
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const displayTimer = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`
  const timerPercentage = (timeLeft / initialTime) * 100

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none">
      
      {/* Header bar: Title, timer, and matches progress */}
      <div className="w-full bg-slate-900/85 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            MEMORY MATCH
          </span>
          <p className="text-xs font-bold text-slate-200">
            {matchesCount}/6 Pairs Matched
          </p>
        </div>

        {/* Timer ring */}
        <div className="relative w-11 h-11 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
            <circle
              cx="18"
              cy="18"
              r="14"
              stroke={timeLeft <= 10 ? '#EF4444' : '#F59E0B'}
              strokeWidth="3"
              strokeDasharray={88}
              strokeDashoffset={88 - (88 * timerPercentage) / 100}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-1000 linear"
            />
          </svg>
          <span className={`absolute text-[11px] font-black font-mono ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            {displayTimer}
          </span>
        </div>
      </div>

      {/* 4x3 Grid of 12 Memory Cards */}
      <div className="grid grid-cols-4 gap-2.5 w-full">
        {cards.map((card) => {
          const Icon = card.icon
          const isFlipped = card.isFlipped || card.isMatched

          return (
            <div
              key={card.uniqueId}
              onClick={() => handleCardClick(card)}
              className="relative aspect-[3/4] w-full cursor-pointer"
              style={{ perspective: 1000 }}
            >
              <motion.div
                className="w-full h-full relative"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.35, type: 'spring', stiffness: 300, damping: 22 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* CARD BACK (Face Down - "?" side) */}
                <div
                  className="absolute inset-0 w-full h-full rounded-xl bg-slate-900 border-2 border-slate-700/80 shadow-md flex flex-col items-center justify-center gap-1 group hover:border-amber-400/80 transition"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-amber-400">
                    ?
                  </div>
                </div>

                {/* CARD FRONT (Face Up - Photo / Icon side) */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-xl border-2 overflow-hidden flex flex-col justify-between p-1.5 bg-slate-950 ${
                    card.isMatched
                      ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'border-amber-400 ring-1 ring-amber-400/40'
                  }`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {/* Photo Background */}
                  {card.image && (
                    <img
                      src={card.image}
                      alt={card.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

                  {/* Matched checkmark */}
                  {card.isMatched && (
                    <div className="relative z-10 self-end bg-emerald-500 text-white rounded-full p-0.5 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Icon & Title */}
                  <div className="relative z-10 mt-auto flex items-center gap-1">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${card.color}`} />
                    <span className="text-[9px] font-bold text-white truncate">
                      {card.title}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

