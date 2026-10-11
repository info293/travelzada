'use client'

import { useRef, useState } from 'react'
import { ChevronsLeftRight } from 'lucide-react'

/** Draggable before/after. `fill` stretches to the parent box; otherwise the "after" image sets the size. */
export default function CompareSlider({
  before, after, alt, fill, beforeLabel = 'Before', afterLabel = 'After',
}: {
  before: string
  after: string
  alt: string
  fill?: boolean
  beforeLabel?: string
  afterLabel?: string
}) {
  const [pos, setPos] = useState(50)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const move = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }

  return (
    <div
      ref={boxRef}
      className={`relative cursor-ew-resize touch-none select-none overflow-hidden ${fill ? 'h-full w-full' : 'inline-block max-w-full'}`}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX) }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => { dragging.current = false }}
      onPointerCancel={() => { dragging.current = false }}
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={after}
        alt={alt}
        draggable={false}
        className={fill ? 'h-full w-full object-cover' : 'block max-h-[85vh] max-w-full rounded-xl'}
      />
      <img
        src={before}
        alt={beforeLabel}
        draggable={false}
        className={`absolute inset-0 h-full w-full object-cover ${fill ? '' : 'rounded-xl'}`}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-lg">
          <ChevronsLeftRight className="h-4 w-4" />
        </div>
      </div>
      {pos > 12 && <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-medium text-white">{beforeLabel}</span>}
      {pos < 88 && <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-medium text-white">{afterLabel}</span>}
    </div>
  )
}
