'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Send } from 'lucide-react'
import { Button, cx } from '@/components/admin/ui'
import { MAX_BROADCAST_RECIPIENTS, isListSegment } from '@/lib/whatsapp/broadcasts'
import AudienceStep, { defaultAudience, type AudienceState } from './AudienceStep'
import TemplateStep, { emptyTemplateState, type TemplateDraft, type TemplateStepState } from './TemplateStep'
import ReviewStep, { type ReviewState } from './ReviewStep'
import { BroadcastApiError, broadcastAction, createBroadcast, type AudiencePreview } from './api'

const STEPS = ['Audience', 'Message', 'Review & send']

/**
 * New broadcast: Audience → Message → Review. On confirm the server rebuilds the audience, saves the broadcast and
 * its recipients, and (unless scheduled) it starts sending — `onCreated(id, autoSend)` opens the detail view,
 * which drives the sending while the tab is open.
 */
export default function BroadcastWizard({ isAdmin, onCancel, onCreated }: { isAdmin: boolean; onCancel: () => void; onCreated: (id: string, autoSend: boolean) => void }) {
  const [step, setStep] = useState(0)
  const [audience, setAudience] = useState<AudienceState>(defaultAudience())
  const [preview, setPreview] = useState<AudiencePreview | null>(null)
  const [tpl, setTpl] = useState<TemplateStepState>(emptyTemplateState())
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const [review, setReview] = useState<ReviewState>({ name: '', schedule: false, scheduledAt: '', consent: false, listConsent: false, confirmText: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  /** Server said the list has more new people than today's safety limit allows */
  const [capOffer, setCapOffer] = useState<{ message: string; wouldSend: number } | null>(null)
  const listSeg = isListSegment(audience.segment)

  const sample = preview?.people[0] || null
  const count = preview?.count || 0
  const canNext0 = !!preview && count > 0 && count <= MAX_BROADCAST_RECIPIENTS
  const canNext1 = !!draft && draft.missing.length === 0
  const scheduledMs = review.schedule && review.scheduledAt ? new Date(review.scheduledAt).getTime() : 0
  const canSend =
    canNext0 &&
    canNext1 &&
    !!review.name.trim() &&
    Number(review.confirmText) === count &&
    (!review.schedule || scheduledMs > Date.now()) &&
    (draft?.template.category !== 'MARKETING' || review.consent) &&
    (!listSeg || !!review.listConsent)

  const goReview = () => {
    if (!review.name && draft) {
      const d = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      setReview((r) => ({ ...r, name: `${draft.template.title} · ${d}` }))
    }
    setStep(2)
  }

  const submit = async (acceptDailyCap = false) => {
    if (!draft || !preview) return
    setSubmitting(true)
    setError('')
    setCapOffer(null)
    try {
      const created = await createBroadcast({
        ...(audience.segment === 'upload' && audience.upload ? audience.upload : {}),
        listConsent: listSeg ? !!review.listConsent : undefined,
        acceptDailyCap: acceptDailyCap || undefined,
        ...draft.payload,
        name: review.name.trim(),
        segment: audience.segment,
        filters: audience.filters,
        excludeKeys: isAdmin ? audience.excludeKeys : undefined,
        scheduledAt: review.schedule && scheduledMs ? new Date(scheduledMs).toISOString() : null,
        marketingConsent: review.consent,
      })
      // The server rebuilt the list. Start now only if it is still the number the user confirmed.
      let autoSend = false
      // With the daily limit accepted the server sends to fewer people than the preview — that's expected
      if (!review.schedule && (created.total === count || (acceptDailyCap && created.total > 0))) {
        await broadcastAction(created.id, 'start', { confirmCount: created.total })
        autoSend = true
      }
      onCreated(created.id, autoSend)
    } catch (e: any) {
      if (e instanceof BroadcastApiError && e.status === 409 && e.data?.code === 'daily_cap' && !acceptDailyCap) {
        const wouldSend = Number(e.data.wouldSend) || 0
        if (wouldSend > 0) setCapOffer({ message: e.message, wouldSend })
        else setError(e.message)
      } else {
        setError([e.message, e.hint].filter(Boolean).join(' '))
      }
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Stepper */}
      <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cx(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-bordeaux-600 text-white' : 'bg-gray-200 text-gray-600'
              )}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={cx('font-semibold', i === step ? 'text-gray-900' : 'text-gray-500')}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-gray-300" />}
          </li>
        ))}
      </ol>

      <div className={step === 0 ? '' : 'hidden'}>
        <AudienceStep value={audience} onChange={setAudience} isAdmin={isAdmin} onPreview={setPreview} />
      </div>
      {step >= 1 && (
        <div className={step === 1 ? '' : 'hidden'}>
          <TemplateStep value={tpl} onChange={setTpl} sample={sample} onDraft={setDraft} columns={listSeg ? preview?.columns || preview?.list?.columns || [] : []} />
        </div>
      )}
      {step === 2 && preview && draft && <ReviewStep value={review} onChange={setReview} audience={preview} draft={draft} sample={sample} isAdmin={isAdmin} listSegment={listSeg} />}

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {capOffer && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="min-w-[220px] flex-1">
            {capOffer.message} You can send to the first <strong>{capOffer.wouldSend}</strong> now — the rest stay in the saved list (pick “A list you uploaded before” tomorrow).
          </p>
          <Button onClick={() => submit(true)} loading={submitting}>
            <Send className="w-4 h-4" /> Send to {capOffer.wouldSend} today
          </Button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <Button variant="ghost" onClick={step === 0 ? onCancel : () => setStep(step - 1)} disabled={submitting}>
          <ArrowLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step === 0 && (
          <Button onClick={() => setStep(1)} disabled={!canNext0}>
            Next: message <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {step === 1 && (
          <Button onClick={goReview} disabled={!canNext1}>
            Next: review <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {step === 2 && (
          <Button onClick={() => submit()} disabled={!canSend} loading={submitting}>
            <Send className="w-4 h-4" /> {review.schedule ? `Schedule for ${count} people` : `Send to ${count} people`}
          </Button>
        )}
      </div>
    </div>
  )
}
