'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Loader2, MessageCircle, Phone, User, X, CalendarDays } from 'lucide-react'
import { HONEYPOT_FIELD } from '@/lib/spamGuard'
import { formatINR, getPlannerSessionId, whatsappLink, type PlannerPrefs } from './shared'

export interface LeadPackage {
  id?: string
  name: string
  destination?: string
  nights?: number
  pricePerPerson?: number
}

interface LeadSheetProps {
  open: boolean
  onClose: () => void
  pkg?: LeadPackage | null
  prefs?: PlannerPrefs | null
  query?: string
  activityId?: string | null
  shownMatches?: Array<{ id: string; name: string; score: number }>
  source: 'AI Planner' | 'AI Planner – Smart search'
}

/** Bottom sheet (mobile) / centred card (desktop): name + phone (+ optional date) → lead → WhatsApp */
export default function LeadSheet({ open, onClose, pkg, prefs, query, activityId, shownMatches, source }: LeadSheetProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const startedAt = useRef(Date.now())
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    startedAt.current = Date.now()
    setStatus('idle')
    setError(null)
    const t = setTimeout(() => nameRef.current?.focus(), 250)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const waText = pkg
    ? `Hi Travelzada! I'm ${name || 'interested'} — please share the "${pkg.name}" plan${pkg.nights ? ` (${pkg.nights} nights)` : ''}${travelDate ? ` for ${travelDate}` : ''}.`
    : `Hi Travelzada! I'm ${name || 'planning a trip'} — please help me plan a couple trip${query ? `: "${query}"` : ''}.`

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) return setError('Please tell us your name.')
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid 10-digit mobile number.')
    setStatus('sending')
    try {
      const res = await fetch('/api/planner/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          travelDate: travelDate || undefined,
          packageId: pkg?.id,
          packageName: pkg?.name,
          prefs: prefs || {},
          query: query || undefined,
          activityId: activityId || undefined,
          shownMatches,
          sessionId: getPlannerSessionId(),
          source,
          honeypot,
          startedAt: startedAt.current,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.')
      setStatus('done')
    } catch (err) {
      setError((err as Error).message)
      setStatus('idle')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Get this plan on WhatsApp"
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] relative"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-gray-200" />
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
              <X className="w-4 h-4" />
            </button>

            {status === 'done' ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-3" />
                <h3 className="text-xl font-semibold text-gray-900">Done, {name.split(' ')[0]}!</h3>
                <p className="text-gray-600 mt-1.5 text-sm leading-relaxed">
                  Our trip expert will WhatsApp you the full plan{pkg ? <> for <b className="text-gray-800">{pkg.name}</b></> : ''} shortly — usually within an hour (10am–8pm).
                </p>
                <a
                  href={whatsappLink(waText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#1fb857] text-white font-semibold py-3.5 shadow-lg"
                >
                  <MessageCircle className="w-5 h-5" /> Chat on WhatsApp now
                </a>
                <button onClick={onClose} className="mt-3 text-sm text-gray-500 hover:text-gray-800">
                  Keep browsing
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h3 className="text-xl font-semibold text-gray-900 pr-10">Get this plan on WhatsApp</h3>
                {pkg ? (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium text-bordeaux-600">{pkg.name}</span>
                    {pkg.pricePerPerson ? ` · ${formatINR(pkg.pricePerPerson)} per person` : ''}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">A trip expert will send you options that fit you two.</p>
                )}

                <div className="mt-5 space-y-3">
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 focus-within:border-bordeaux-400 focus-within:ring-4 focus-within:ring-bordeaux-50 px-4 py-3">
                    <User className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                      ref={nameRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      className="w-full outline-none text-base text-gray-900 placeholder-gray-400 bg-transparent"
                    />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 focus-within:border-bordeaux-400 focus-within:ring-4 focus-within:ring-bordeaux-50 px-4 py-3">
                    <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-gray-500 text-base">+91</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="WhatsApp number"
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full outline-none text-base text-gray-900 placeholder-gray-400 bg-transparent"
                    />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 focus-within:border-bordeaux-400 px-4 py-3">
                    <CalendarDays className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                      type="date"
                      value={travelDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setTravelDate(e.target.value)}
                      className="w-full outline-none text-base text-gray-900 bg-transparent"
                      aria-label="Travel date (optional)"
                    />
                    <span className="text-xs text-gray-400 shrink-0">optional</span>
                  </label>
                  {/* Honeypot — hidden from people, bots fill it */}
                  <input
                    type="text"
                    name={HONEYPOT_FIELD}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] w-px h-px opacity-0"
                  />
                </div>

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-bordeaux-600 hover:bg-bordeaux-700 disabled:opacity-70 text-white font-semibold py-3.5 shadow-lg shadow-bordeaux-600/20"
                >
                  {status === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                  {status === 'sending' ? 'Sending…' : 'Send me the plan'}
                </button>
                <p className="mt-3 text-[11px] text-center text-gray-400">Free, no spam. We only use your number to share this trip.</p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
