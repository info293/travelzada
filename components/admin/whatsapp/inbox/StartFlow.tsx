'use client'

import { ArrowLeft, CheckCircle2, ChevronRight, Info, LayoutList, Loader2, Send, Sparkles, XCircle } from 'lucide-react'
import type { CatalogTemplate, VariableSource } from '@/lib/whatsapp/templateCatalog'
import TemplateFields, { initialValues, type HeaderMediaValue, type MissingField, type TemplateValues } from '@/components/admin/whatsapp/templates/TemplateFields'
import WhatsAppPhonePreview from '@/components/admin/whatsapp/templates/WhatsAppPhonePreview'

export type StartStep = 'choose' | 'fill' | 'done'

export interface StartFillState {
  template: CatalogTemplate
  values: TemplateValues
  onValues: (v: TemplateValues) => void
  headerMedia: HeaderMediaValue
  onHeaderMedia: (m: HeaderMediaValue) => void
  showErrors: boolean
  missing: MissingField[]
  /** Why it can't be sent / a note on the template */
  problem?: string
  note?: string
  /** Fields still loading (template only known from GetGabs) */
  loadingFields?: boolean
  canSend: boolean
  sending: boolean
  onBack: () => void
  onSend: () => void
}

type Autofill = Partial<Record<VariableSource, string>>

/** Short plain-text taste of the message for the cards: known values filled in, the rest as "…" */
function excerpt(t: CatalogTemplate, autofill?: Autofill) {
  const values = initialValues(t, autofill)
  return String(t.body || '')
    .replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => String(values[Number(n)] || '…').trim())
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function Steps({ active }: { active: 1 | 2 | 3 }) {
  const steps = ['Choose a message', 'Fill in the details', 'Send']
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const state = n < active ? 'done' : n === active ? 'now' : 'next'
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                state === 'now' ? 'bg-bordeaux-600 text-white' : state === 'done' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {state === 'done' ? '✓' : n}
            </span>
            <span className={state === 'now' ? 'font-semibold text-gray-900' : 'text-gray-500'}>{label}</span>
            {n < 3 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Replaces the message box when WhatsApp only allows a template (new customer, or 24 hours since they last wrote):
 * 1 Choose a message → 2 Fill in the details (fields + phone preview) → 3 Send.
 */
export default function StartFlow({
  mode,
  reason,
  customerName,
  step,
  picks,
  autofill,
  onPick,
  onMore,
  fill,
  done,
  onAgain,
}: {
  mode: 'first' | 'reopen'
  /** One plain sentence on why a template is needed */
  reason: string
  customerName: string
  step: StartStep
  picks: CatalogTemplate[]
  autofill?: Autofill
  onPick: (name: string) => void
  onMore: () => void
  fill?: StartFillState
  done?: { ok: boolean; title: string }
  onAgain: () => void
}) {
  const active: 1 | 2 | 3 = step === 'choose' ? 1 : step === 'done' || fill?.sending ? 3 : 2

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
        <p className="text-sm font-semibold text-gray-900">{mode === 'reopen' ? `Message ${customerName} again` : `Start a chat with ${customerName}`}</p>
        <Steps active={active} />
      </div>

      {step === 'choose' && (
        <div className="min-h-0 overflow-y-auto px-4 py-3">
          <p className="mb-3 flex items-start gap-1.5 text-[13px] text-gray-600">
            <Info className="mt-0.5 w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span>{reason}</span>
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {picks.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => onPick(t.name)}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-3.5 text-left shadow-sm transition hover:border-bordeaux-300 hover:shadow-md"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-gray-900">{t.title}</span>
                  {i === 0 && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">
                      <Sparkles className="w-2.5 h-2.5" /> Best
                    </span>
                  )}
                </span>
                <span className="mt-1 line-clamp-1 text-[12.5px] text-gray-600">{t.purpose}</span>
                <span className="mt-2 line-clamp-2 rounded-lg bg-[#d9fdd3]/60 px-2.5 py-1.5 text-[12px] italic text-gray-600">{excerpt(t, autofill)}</span>
                <span className="mt-2.5 text-sm font-semibold text-bordeaux-700 group-hover:underline">Use this →</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onMore}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-bordeaux-300 hover:text-bordeaux-700"
          >
            <LayoutList className="w-4 h-4" /> More messages…
          </button>
        </div>
      )}

      {step === 'fill' && fill && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto md:grid md:grid-cols-[minmax(0,1fr)_320px] md:overflow-hidden">
            <div className="px-4 py-3 md:overflow-y-auto">
              <p className="mb-1 text-[15px] font-semibold text-gray-900">{fill.template.title}</p>
              <p className="mb-3 text-[12.5px] text-gray-600">{fill.template.purpose}</p>
              {fill.problem && (
                <p className="mb-3 flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <XCircle className="w-4 h-4 shrink-0" /> {fill.problem}
                </p>
              )}
              {fill.note && (
                <p className="mb-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <Info className="w-4 h-4 shrink-0" /> {fill.note}
                </p>
              )}
              {fill.loadingFields ? (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading the details to fill in…
                </p>
              ) : (
                <TemplateFields
                  template={fill.template}
                  values={fill.values}
                  onChange={fill.onValues}
                  headerMedia={fill.headerMedia}
                  onHeaderMedia={fill.onHeaderMedia}
                  autofill={autofill}
                  showErrors={fill.showErrors}
                />
              )}
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 md:overflow-y-auto md:border-l md:border-t-0">
              <p className="mb-2 text-center text-xs font-semibold text-gray-500">What {customerName} will see</p>
              <WhatsAppPhonePreview template={fill.template} values={fill.values} headerMedia={fill.headerMedia} compact />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 px-4 py-2.5">
            <p className="min-w-0 flex-1 text-xs">
              {fill.missing.length ? (
                <span className="text-gray-600">
                  Still to fill:{' '}
                  <span className={fill.showErrors ? 'font-semibold text-red-600' : 'font-medium text-gray-800'}>{fill.missing.map((m) => m.label).join(' · ')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready — check the preview, then send
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={fill.onBack}
              disabled={fill.sending}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              onClick={fill.onSend}
              disabled={!fill.canSend}
              className="inline-flex items-center gap-2 rounded-lg bg-bordeaux-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-bordeaux-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fill.sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {fill.sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </>
      )}

      {step === 'done' && done && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-4">
          {done.ok ? <CheckCircle2 className="w-8 h-8 shrink-0 text-emerald-500" /> : <XCircle className="w-8 h-8 shrink-0 text-red-500" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">{done.ok ? `“${done.title}” sent` : `“${done.title}” was not sent`}</p>
            <p className="text-xs text-gray-600">
              {done.ok
                ? `When ${customerName} replies, you can chat freely here for 24 hours.`
                : 'Tap “Why?” under the message above to see what went wrong, then try again.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onAgain}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-bordeaux-300 hover:text-bordeaux-700"
          >
            {done.ok ? 'Send another message' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  )
}
