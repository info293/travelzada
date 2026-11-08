'use client'

/**
 * /tailored-travel/compare — upload an itinerary from anywhere, see honestly what our closest trip includes,
 * tick what you want added, and leave your number for a matched quote.
 *
 * upload → analysing (POST /api/planner/itinerary/analyze) → results (+ additions tray) → quote sheet
 * (POST /api/planner/itinerary/lead) → done
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HONEYPOT_FIELD } from '@/lib/spamGuard'
import type { Addition, AnalyzeResponse, ClassifiedItem } from '@/lib/planner/itinerary'
import UploadStep from './UploadStep'
import AnalysingStep from './AnalysingStep'
import ResultsView from './ResultsView'
import QuoteSheet, { type QuoteForm } from './QuoteSheet'
import { ArrowRight, Check, ChevronDown, ChevronUp, MessageCircle, PartyPopper, X } from './icons'
import { WHATSAPP_NUMBER, cx, getSessionId, shrinkImage } from './utils'

type Phase = 'upload' | 'analysing' | 'results' | 'done'

export default function ItineraryCompare() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [data, setData] = useState<AnalyzeResponse | null>(null)
  const [additions, setAdditions] = useState<Map<string, Addition>>(new Map())
  const [trayOpen, setTrayOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)
  const [leadName, setLeadName] = useState('')
  const [sessionId, setSessionId] = useState('')

  useEffect(() => setSessionId(getSessionId()), [])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [phase])

  const analyse = useCallback(async ({ file, text }: { file?: File; text?: string }) => {
    setError(null)
    setFileName(file ? file.name : null)
    setPhase('analysing')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 150_000)
    try {
      const fd = new FormData()
      if (file) fd.append('file', await shrinkImage(file))
      if (text) fd.append('text', text)
      fd.append('sessionId', sessionId || getSessionId())
      fd.append(HONEYPOT_FIELD, '')
      const res = await fetch('/api/planner/itinerary/analyze', { method: 'POST', body: fd, signal: ctrl.signal })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.')
      setData(json as AnalyzeResponse)
      setAdditions(new Map())
      setPhase('results')
    } catch (e) {
      const msg = (e as Error)?.name === 'AbortError' ? 'This is taking longer than usual. Please try again, or send the itinerary to us on WhatsApp.' : (e as Error)?.message
      setError(msg || 'Something went wrong. Please try again.')
      setPhase('upload')
    } finally {
      clearTimeout(timer)
    }
  }, [sessionId])

  const toggle = useCallback((i: ClassifiedItem) => {
    setAdditions((prev) => {
      const next = new Map(prev)
      if (next.has(i.id)) next.delete(i.id)
      else next.set(i.id, { id: i.id, item: i.label, kind: i.kind, day: i.day, status: i.status, ourOffer: i.ourOffer })
      return next
    })
  }, [])

  const list = useMemo(() => Array.from(additions.values()), [additions])
  const added = useMemo(() => new Set(additions.keys()), [additions])

  const destination = data ? data.extraction.destinations.slice(0, 2).join(' & ') || data.extraction.country || data.bestPackage?.destination || '' : ''
  const defaultDate = data?.extraction.startDate && data.extraction.startDate > new Date().toISOString().slice(0, 10) ? data.extraction.startDate : ''

  const submitLead = async (f: QuoteForm) => {
    if (!data) return
    setSubmitting(true)
    setLeadError(null)
    try {
      const res = await fetch('/api/planner/itinerary/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: data.activityId,
          sessionId,
          name: f.name,
          phone: f.phone,
          email: f.email,
          travelDate: f.travelDate,
          note: f.note,
          additions: list,
          bestPackageId: data.bestPackage?.id || null,
          context: { extraction: data.extraction, comparison: data.comparison, bestPackage: data.bestPackage, fileUrl: data.fileUrl },
          [HONEYPOT_FIELD]: f.honeypot,
          startedAt: f.startedAt,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not send. Please try again.')
      setLeadName(f.name.trim().split(/\s+/)[0])
      setSheetOpen(false)
      setPhase('done')
    } catch (e) {
      setLeadError((e as Error)?.message || 'Could not send. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const restart = () => {
    setData(null)
    setAdditions(new Map())
    setError(null)
    setPhase('upload')
  }

  const waText = `Hi Travelzada! I'm ${leadName || 'here'}. I just compared my ${destination || ''} itinerary on your website and asked for a matched quote${list.length ? ` with ${list.length} addition${list.length === 1 ? '' : 's'}` : ''}.`.replace(/\s+/g, ' ')

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div key={phase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {phase === 'upload' && <UploadStep onSubmit={analyse} error={error} />}
          {phase === 'analysing' && <AnalysingStep fileName={fileName} />}
          {phase === 'results' && data && <ResultsView data={data} added={added} onToggle={toggle} onRestart={restart} />}
          {phase === 'done' && (
            <div className="mx-auto max-w-md px-4">
              <div className="rounded-3xl bg-white p-6 text-center shadow-[0_8px_30px_rgba(101,25,38,0.08)] ring-1 ring-gray-200/80 sm:p-8">
                <motion.div initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                  <Check className="h-8 w-8" />
                </motion.div>
                <h2 className="mt-5 font-serif text-2xl text-gray-900">Thank you{leadName ? `, ${leadName}` : ''}!</h2>
                <p className="mt-2 text-gray-600">
                  Our travel designer will send your matched quote{destination ? ` for ${destination}` : ''} shortly{list.length ? `, with the ${list.length} thing${list.length === 1 ? '' : 's'} you added` : ''}.
                </p>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
                >
                  <MessageCircle className="h-5 w-5" /> Chat with us on WhatsApp
                </a>
                <button type="button" onClick={() => setPhase('results')} className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  Back to my comparison
                </button>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400"><PartyPopper className="h-3.5 w-3.5" /> Usually within a few hours (10am–8pm)</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Sticky additions tray + CTA */}
      {phase === 'results' && data && (
        <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-3xl px-3 pb-3">
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="overflow-hidden rounded-3xl bg-white shadow-[0_-8px_40px_rgba(15,4,6,0.18)] ring-1 ring-gray-200">
              <AnimatePresence initial={false}>
                {trayOpen && list.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <ul className="max-h-56 space-y-1.5 overflow-y-auto border-b border-gray-100 p-3">
                      {list.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-bordeaux-50/60 px-3 py-2 text-sm">
                          <span className="min-w-0 truncate text-gray-800">{a.day ? <span className="font-semibold text-bordeaux-700">Day {a.day} · </span> : null}{a.item}</span>
                          <button type="button" onClick={() => setAdditions((p) => { const n = new Map(p); n.delete(a.id); return n })} className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-white hover:text-gray-700" aria-label={`Remove ${a.item}`}>
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2 p-2.5">
                <button
                  type="button"
                  onClick={() => list.length && setTrayOpen((o) => !o)}
                  className={cx('flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 py-2 text-left', list.length ? 'hover:bg-gray-50' : 'cursor-default')}
                >
                  <motion.span key={list.length} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', list.length ? 'bg-bordeaux-600 text-white' : 'bg-gray-100 text-gray-400')}>
                    {list.length}
                  </motion.span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">Your additions</span>
                    <span className="block truncate text-xs text-gray-500">{list.length ? 'Tap to see' : 'Tap “Add to my trip” on any item'}</span>
                  </span>
                  {list.length > 0 && (trayOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />)}
                </button>
                <button
                  type="button"
                  onClick={() => { setLeadError(null); setSheetOpen(true) }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-bordeaux-600/25 transition-all hover:bg-bordeaux-700 active:scale-[0.98] sm:px-5"
                >
                  Get my matched quote <ArrowRight className="hidden h-4 w-4 sm:block" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      <QuoteSheet
        key={data?.activityId || 'sheet'}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={submitLead}
        additions={list}
        defaultDate={defaultDate}
        submitting={submitting}
        error={leadError}
      />
    </>
  )
}
