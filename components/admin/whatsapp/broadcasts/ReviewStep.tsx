'use client'

import { useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, FlaskConical, Send, ShieldAlert } from 'lucide-react'
import { Button, Card, Field, cx, inputClass } from '@/components/admin/ui'
import WhatsAppPhonePreview from '@/components/admin/whatsapp/templates/WhatsAppPhonePreview'
import { CATEGORY_LABEL } from '@/lib/whatsapp/templateCatalog'
import { RECIPIENT_SOURCES, type VariableMapping } from '@/lib/whatsapp/broadcasts'
import { sendTest, type AudiencePerson, type AudiencePreview } from './api'
import type { TemplateDraft } from './TemplateStep'

export interface ReviewState {
  name: string
  schedule: boolean
  scheduledAt: string
  consent: boolean
  /** Uploaded lists: "everyone on this list agreed to receive WhatsApp messages" (required) */
  listConsent?: boolean
  confirmText: string
}

const describeMapping = (m?: VariableMapping) =>
  !m
    ? '—'
    : m.mode === 'fixed'
      ? `“${m.text || '—'}”`
      : m.mode === 'column'
        ? `Sheet column “${m.label || m.column}” (else “${m.fallback || '—'}”)`
        : `${RECIPIENT_SOURCES.find((s) => s.id === m.source)?.label || m.source} (else “${m.fallback || '—'}”)`

/**
 * Step 3 — summary, policy warning, optional schedule, admin-only test to their own number,
 * and confirmation by typing the number of people.
 */
export default function ReviewStep({
  value,
  onChange,
  audience,
  draft,
  sample,
  isAdmin,
  listSegment = false,
}: {
  value: ReviewState
  onChange: (v: ReviewState) => void
  audience: AudiencePreview
  draft: TemplateDraft
  sample?: AudiencePerson | null
  isAdmin: boolean
  /** Audience is an uploaded sheet (cold numbers) */
  listSegment?: boolean
}) {
  const [testTo, setTestTo] = useState('')
  const [test, setTest] = useState<{ busy: boolean; ok?: boolean; error?: string }>({ busy: false })
  const marketing = draft.template.category === 'MARKETING'
  const set = (patch: Partial<ReviewState>) => onChange({ ...value, ...patch })

  const runTest = async () => {
    setTest({ busy: true })
    try {
      await sendTest({ ...draft.payload, to: testTo, sample: sample || undefined })
      setTest({ busy: false, ok: true })
    } catch (e: any) {
      setTest({ busy: false, error: [e.message, e.hint].filter(Boolean).join(' ') })
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5 min-w-0">
        <Card>
          <Field label="Broadcast name" hint="Only staff see this — e.g. “Bali Diwali offer, Nov”">
            <input className={inputClass} value={value.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">People</dt>
              <dd className="font-semibold text-gray-900">{audience.count.toLocaleString('en-IN')}</dd>
              <dd className="text-xs text-gray-500">{audience.description}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Message</dt>
              <dd className="font-semibold text-gray-900">{draft.template.title}</dd>
              <dd className="text-xs text-gray-500">
                {CATEGORY_LABEL[draft.template.category] || draft.template.category} template · from +91 88900 59568
              </dd>
            </div>
            {draft.template.variables.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Personalisation</dt>
                {draft.template.variables.map((v) => (
                  <dd key={v.index} className="text-xs text-gray-700">
                    <span className="font-semibold">{v.label}:</span> {describeMapping(draft.payload.variables[String(v.index)])}
                  </dd>
                ))}
              </div>
            )}
          </dl>
        </Card>

        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div className="space-y-1">
            {marketing ? (
              <p>
                <strong>Marketing templates are only for people who agreed to hear from us.</strong> WhatsApp may limit your number if many people block or report
                you. Each marketing message is charged by WhatsApp.
              </p>
            ) : (
              <p>
                <strong>Utility templates must be about something the customer already started</strong> (their enquiry, quote or booking) — not promotions.
                WhatsApp may limit your number if many people block or report you.
              </p>
            )}
            <p className="text-xs">Anyone who replies STOP is left out of future broadcasts automatically.</p>
            {listSegment && (
              <>
                <p className="text-xs">
                  <strong>This is an uploaded list.</strong> People who never messaged us are the most likely to block or report — prefer a friendly first-contact
                  or utility template, and start small.
                </p>
                <label className="mt-2 flex items-start gap-2 text-sm font-medium">
                  <input type="checkbox" className="mt-0.5" checked={!!value.listConsent} onChange={(e) => set({ listConsent: e.target.checked })} />
                  Everyone on this list agreed to receive WhatsApp messages from Travelzada. (Required)
                </label>
              </>
            )}
            {marketing && (
              <label className="mt-2 flex items-start gap-2 text-sm font-medium">
                <input type="checkbox" className="mt-0.5" checked={value.consent} onChange={(e) => set({ consent: e.target.checked })} />
                These people agreed to receive offers from Travelzada on WhatsApp.
              </label>
            )}
          </div>
        </div>

        <Card>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <input type="checkbox" checked={value.schedule} onChange={(e) => set({ schedule: e.target.checked })} />
            <CalendarClock className="w-4 h-4 text-bordeaux-600" /> Send later
          </label>
          {value.schedule && (
            <div className="mt-3 space-y-2">
              <input type="datetime-local" className={inputClass} value={value.scheduledAt} onChange={(e) => set({ scheduledAt: e.target.value })} />
              <p className="text-xs text-gray-500">
                Sending starts at that time <strong>only if someone has this broadcast open in the admin</strong> — there is no background sender. Open it a
                few minutes before.
              </p>
            </div>
          )}
        </Card>

        {isAdmin && (
          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FlaskConical className="w-4 h-4 text-bordeaux-600" /> Send a test to my own number <span className="text-xs font-normal text-gray-500">(admins only)</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">One copy, filled in as it would be for {sample?.name?.split(' ')[0] || 'a sample customer'}. Never sent to customers.</p>
            <div className="mt-3 flex gap-2">
              <input className={inputClass} inputMode="tel" placeholder="Your WhatsApp number" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <Button variant="secondary" loading={test.busy} disabled={testTo.replace(/\D/g, '').length < 10} onClick={runTest}>
                Send test
              </Button>
            </div>
            {test.ok && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Test sent — check your WhatsApp.
              </p>
            )}
            {test.error && <p className="mt-2 text-xs text-red-600">{test.error}</p>}
          </Card>
        )}

        <Card>
          <Field label={`To confirm, type the number of people: ${audience.count}`}>
            <input
              className={cx(inputClass, value.confirmText && Number(value.confirmText) !== audience.count && 'border-red-300')}
              inputMode="numeric"
              value={value.confirmText}
              onChange={(e) => set({ confirmText: e.target.value.replace(/\D/g, '') })}
              placeholder={String(audience.count)}
            />
          </Field>
          {value.schedule && !value.scheduledAt && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" /> Pick a date and time.
            </p>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <Send className="w-3.5 h-3.5" /> About {Math.ceil(audience.count / 60)} minute(s) to send. Keep the tab open while it sends.
          </p>
        </Card>
      </div>

      <div>
        <div className="lg:sticky lg:top-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">What {sample?.name?.split(' ')[0] || 'they'} will see</p>
          <WhatsAppPhonePreview template={draft.template} values={draft.sampleValues} headerMedia={draft.headerMedia} compact />
        </div>
      </div>
    </div>
  )
}
