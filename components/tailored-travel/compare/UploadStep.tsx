'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ClipboardPaste, FileText, ImageIcon, Lock, Sparkles, Upload, X, Approximately } from './icons'
import { cx } from './utils'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp,image/heic'

export default function UploadStep({ onSubmit, error }: { onSubmit: (input: { file?: File; text?: string }) => void; error: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [text, setText] = useState('')

  const pick = (files: FileList | null) => {
    const f = files?.[0]
    if (f) onSubmit({ file: f })
  }

  return (
    <div className="mx-auto max-w-3xl px-4">
      {/* Hero */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bordeaux-50 px-3 py-1 text-xs font-semibold text-bordeaux-700 ring-1 ring-bordeaux-100">
          <Sparkles className="h-3.5 w-3.5" /> Free · takes about a minute
        </span>
        <h1 className="mt-4 font-serif text-3xl leading-tight text-gray-900 sm:text-4xl md:text-5xl">
          Got an itinerary from someone else?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-gray-600 sm:text-lg">
          Upload it. We&apos;ll read it, find the closest Travelzada trip, and tell you honestly what we include, what&apos;s similar and what we can add.
        </p>
      </div>

      {/* Drop zone / paste */}
      <div className="mt-8 rounded-3xl bg-white p-3 shadow-[0_8px_30px_rgba(101,25,38,0.08)] ring-1 ring-gray-200/80 sm:p-4">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1 text-sm font-semibold">
          {(['file', 'text'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cx('flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all', mode === m ? 'bg-white text-bordeaux-700 shadow-sm' : 'text-gray-500 hover:text-gray-800')}
            >
              {m === 'file' ? <Upload className="h-4 w-4" /> : <ClipboardPaste className="h-4 w-4" />}
              {m === 'file' ? 'Upload file' : 'Paste text'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'file' ? (
            <motion.div key="file" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files) }}
                className={cx(
                  'group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all sm:py-16',
                  dragging ? 'border-bordeaux-500 bg-bordeaux-50' : 'border-bordeaux-200 bg-bordeaux-50/40 hover:border-bordeaux-400 hover:bg-bordeaux-50',
                )}
              >
                <motion.div
                  animate={dragging ? { scale: 1.1, rotate: -4 } : { scale: 1, rotate: 0 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bordeaux-600 text-white shadow-lg shadow-bordeaux-600/30"
                >
                  <Upload className="h-7 w-7" />
                </motion.div>
                <p className="mt-4 text-lg font-semibold text-gray-900">
                  <span className="sm:hidden">Tap to choose your itinerary</span>
                  <span className="hidden sm:inline">Drop your itinerary here, or click to choose</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">PDF, screenshot or photo · up to 10 MB</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-medium text-gray-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-gray-200"><FileText className="h-3.5 w-3.5 text-bordeaux-600" /> PDF</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-gray-200"><ImageIcon className="h-3.5 w-3.5 text-bordeaux-600" /> JPG · PNG · WEBP</span>
                </div>
              </button>
              <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
              <p className="mt-2 text-center text-xs text-gray-500">Word file? Save it as PDF or take a screenshot first.</p>
            </motion.div>
          ) : (
            <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                maxLength={30000}
                placeholder={'Paste the itinerary you got on WhatsApp or email…\n\nDay 1: Arrival in Bali, private transfer to Ubud hotel…\nDay 2: Kintamani volcano tour, coffee plantation…\nHotel: …  Price: ₹…'}
                className="w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-bordeaux-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux-100"
              />
              <button
                type="button"
                disabled={text.trim().length < 40}
                onClick={() => onSubmit({ text: text.trim() })}
                className="mt-3 w-full rounded-2xl bg-bordeaux-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-bordeaux-600/25 transition-all hover:bg-bordeaux-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Compare my itinerary
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100" role="alert">
            {error}
          </motion.p>
        )}

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <Lock className="h-3.5 w-3.5" /> Private. We only use it to build your quote — never shared.
        </p>
      </div>

      {/* What you'll get */}
      <div className="mt-10">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400">What you&apos;ll get</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { t: 'What we read', d: 'Destination, nights, hotels, price you were quoted — at a glance.' },
            { t: 'Our closest trip', d: 'The Travelzada package that fits best, with photos and price.' },
            { t: 'Honest day-by-day check', d: 'Every item marked included, similar or not included — add anything you want.' },
          ].map((s, i) => (
            <div key={s.t} className="rounded-2xl bg-white p-4 ring-1 ring-gray-200/80">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bordeaux-600 text-xs font-bold text-white">{i + 1}</span>
              <p className="mt-2 font-semibold text-gray-900">{s.t}</p>
              <p className="mt-1 text-sm text-gray-500">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-4 max-w-md rounded-2xl bg-white p-4 ring-1 ring-gray-200/80" aria-hidden>
          <p className="text-xs font-semibold text-gray-400">EXAMPLE · Day 2</p>
          {[
            { label: 'Kintamani volcano sunrise tour', chip: 'bg-emerald-50 text-emerald-700', icon: <Check className="h-3 w-3" />, s: 'Included' },
            { label: 'Private dinner at Jimbaran beach', chip: 'bg-amber-50 text-amber-800', icon: <Approximately className="h-3 w-3" />, s: 'Similar' },
            { label: 'Couple spa, 2 hours', chip: 'bg-gray-100 text-gray-600', icon: <X className="h-3 w-3" />, s: 'Not in ours', add: true },
          ].map((r) => (
            <div key={r.label} className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-gray-700">{r.label}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', r.chip)}>{r.icon}{r.s}</span>
                {r.add && <span className="rounded-full border border-bordeaux-300 px-2 py-0.5 text-[11px] font-semibold text-bordeaux-700">+ Add</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
