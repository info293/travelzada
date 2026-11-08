'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bordeaux-900'
const TAP = { scale: 0.94 }
const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18 }
/** Multi-keyframe "pop" when a card becomes selected. Springs only support two keyframes, so this is a timed tween. */
const POP = { duration: 0.38, ease: 'easeOut' as const }

/** Keyboard shortcut number shown on desktop */
function KeyHint({ n, selected }: { n?: number; selected?: boolean }) {
  if (!n || n > 9) return null
  return (
    <span
      aria-hidden="true"
      className={`hidden md:flex absolute top-2 right-2 w-5 h-5 rounded-md text-[10px] font-bold items-center justify-center ${
        selected ? 'bg-bordeaux-100 text-bordeaux-700' : 'bg-white/10 text-white/60'
      }`}
    >
      {n}
    </span>
  )
}

/** Big emoji card (occasion, budget, nights) */
export function EmojiCard({
  emoji,
  label,
  sub,
  selected,
  onClick,
  n,
  className = '',
}: {
  emoji: string
  label: string
  sub?: string
  selected?: boolean
  onClick: () => void
  n?: number
  className?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={TAP}
      whileHover={{ y: -3 }}
      animate={selected ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={selected ? POP : SPRING}
      aria-pressed={!!selected}
      className={`relative min-h-[64px] w-full rounded-3xl border-2 px-3 py-4 sm:py-5 flex flex-col items-center justify-center text-center gap-1 transition-colors ${FOCUS} ${
        selected ? 'bg-white border-white text-bordeaux-900 shadow-xl shadow-black/25' : 'bg-white/[0.07] border-white/15 text-white hover:bg-white/[0.12] hover:border-white/30'
      } ${className}`}
    >
      <KeyHint n={n} selected={selected} />
      <motion.span
        className="text-3xl sm:text-4xl leading-none"
        animate={selected ? { rotate: [0, -12, 12, 0], scale: [1, 1.25, 1] } : {}}
        transition={{ duration: 0.45 }}
        aria-hidden="true"
      >
        {emoji}
      </motion.span>
      <span className="font-semibold text-[15px] sm:text-base leading-tight">{label}</span>
      {sub && <span className={`text-[11px] sm:text-xs leading-tight ${selected ? 'text-bordeaux-700/80' : 'text-white/60'}`}>{sub}</span>}
    </motion.button>
  )
}

/** Full-photo tile (vibe, destination) */
export function PhotoTile({
  image,
  emoji,
  label,
  sub,
  badge,
  selected,
  onClick,
  n,
  eager,
  className = '',
}: {
  image?: string
  emoji?: string
  label: string
  sub?: string
  badge?: string
  selected?: boolean
  onClick: () => void
  n?: number
  eager?: boolean
  className?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={TAP}
      whileHover={{ y: -4 }}
      animate={selected ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={selected ? POP : SPRING}
      aria-pressed={!!selected}
      aria-label={[label, sub, badge].filter(Boolean).join(', ')}
      className={`group relative min-h-[64px] w-full overflow-hidden rounded-3xl text-left bg-bordeaux-800 ring-2 transition-shadow ${FOCUS} ${
        selected ? 'ring-[#D4AF37] shadow-2xl shadow-black/40' : 'ring-white/10 hover:ring-white/40'
      } ${className}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-bordeaux-600 to-bordeaux-900" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/0" />
      <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
      {badge && (
        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/95 text-bordeaux-900 text-[11px] font-bold px-2 py-0.5 shadow">{badge}</span>
      )}
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={SPRING}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#D4AF37] text-bordeaux-950 flex items-center justify-center shadow-lg"
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </motion.span>
      )}
      {!selected && n && n <= 9 && (
        <span aria-hidden="true" className="hidden md:flex absolute top-2.5 right-2.5 w-5 h-5 rounded-md bg-black/40 text-white/80 text-[10px] font-bold items-center justify-center">
          {n}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
        <span className="flex items-center gap-1.5 font-semibold text-[15px] sm:text-lg leading-tight drop-shadow">
          {emoji && <span aria-hidden="true">{emoji}</span>}
          {label}
        </span>
        {sub && <span className="block mt-0.5 text-[11px] sm:text-xs text-white/80 line-clamp-2">{sub}</span>}
      </span>
    </motion.button>
  )
}

/** Small pill (stars, must-haves) */
export function Chip({
  children,
  selected,
  onClick,
  n,
  className = '',
}: {
  children: React.ReactNode
  selected?: boolean
  onClick: () => void
  n?: number
  className?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={TAP}
      animate={selected ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={selected ? POP : SPRING}
      aria-pressed={!!selected}
      className={`relative min-h-[48px] rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${FOCUS} ${
        selected ? 'bg-white border-white text-bordeaux-900 shadow-lg shadow-black/20' : 'bg-white/[0.07] border-white/15 text-white hover:bg-white/[0.12] hover:border-white/30'
      } ${className}`}
    >
      {children}
      {n && n <= 9 ? (
        <span aria-hidden="true" className={`hidden md:inline text-[10px] font-bold ml-1 ${selected ? 'text-bordeaux-400' : 'text-white/40'}`}>
          {n}
        </span>
      ) : null}
    </motion.button>
  )
}

export const focusRing = FOCUS
