'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { HONEYPOT_FIELD } from '@/lib/spamGuard'
import type { Addition } from '@/lib/planner/itinerary'
import { Loader2, Lock, X } from './icons'
import { cx } from './utils'

export interface QuoteForm {
  name: string
  phone: string
  email: string
  travelDate: string
  note: string
  honeypot: string
  startedAt: number
}

export default function QuoteSheet({
  open, onClose, onSubmit, additions, defaultDate, submitting, error,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (f: QuoteForm) => void
  additions: Addition[]
  defaultDate: string
  submitting: boolean
  error: string | null
}) {
  const startedAt = useRef(Date.now())
  const [f, setF] = useState({ name: '', phone: '', email: '', travelDate: defaultDate, note: '', honeypot: '' })
  useEffect(() => {
    if (open) startedAt.current = Date.now()
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const phoneOk = f.phone.replace(/\D/g, '').length >= 10
  const input = 'w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-bordeaux-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-bordeaux-100'
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Get my matched quote">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <motion.form
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        onSubmit={(e) => { e.preventDefault(); if (f.name.trim() && phoneOk) onSubmit({ ...f, startedAt: startedAt.current }) }}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-gray-900">Get my matched quote</h2>
            <p className="mt-1 text-sm text-gray-600">
              {additions.length ? `Our travel designer will price the trip with your ${additions.length} addition${additions.length === 1 ? '' : 's'}.` : 'Our travel designer will send you a quote for the matched trip.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="-mr-1 rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 space-y-3">
          <input className={input} placeholder="Your name *" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} />
          <input className={input} placeholder="Mobile number (WhatsApp) *" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required maxLength={20} />
          <input className={input} placeholder="Email (optional)" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={120} />
          <label className="block">
            <span className="mb-1 block px-1 text-xs font-medium text-gray-500">Travel date (optional)</span>
            <input className={input} type="date" min={today} value={f.travelDate} onChange={(e) => setF({ ...f, travelDate: e.target.value })} />
          </label>
          <textarea className={cx(input, 'resize-none')} rows={3} placeholder="Anything else? e.g. it's our honeymoon, we want a pool villa…" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={1000} />
          {/* Bot trap — hidden from people */}
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={f.honeypot} onChange={(e) => setF({ ...f, honeypot: e.target.value })} className="hidden" aria-hidden />
        </div>

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !f.name.trim() || !phoneOk}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-bordeaux-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-bordeaux-600/25 transition-all hover:bg-bordeaux-700 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
        >
          {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
          {submitting ? 'Sending…' : 'Send me the quote'}
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500"><Lock className="h-3.5 w-3.5" /> No spam. We&apos;ll only contact you about this trip.</p>
      </motion.form>
    </div>
  )
}
