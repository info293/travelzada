'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Reaction } from './logic'

/** Short playful reaction after an answer. Auto-hides after ~2.8s; tap to dismiss. */
export default function ReactionBubble({ reaction, id, onDone }: { reaction: Reaction | null; id: number; onDone: () => void }) {
  useEffect(() => {
    if (!reaction) return
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [reaction, id, onDone])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 sm:bottom-24 z-30 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {reaction && (
          <motion.button
            key={id}
            type="button"
            onClick={onDone}
            aria-label={`${reaction.text} (tap to dismiss)`}
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="pointer-events-auto max-w-md inline-flex items-center gap-2.5 rounded-2xl bg-white text-gray-900 shadow-2xl shadow-black/30 pl-3 pr-4 py-2.5 text-sm font-medium text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/60"
          >
            <motion.span
              className="text-2xl leading-none"
              initial={{ rotate: -20, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.05 }}
              aria-hidden="true"
            >
              {reaction.emoji}
            </motion.span>
            <span>{reaction.text}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
