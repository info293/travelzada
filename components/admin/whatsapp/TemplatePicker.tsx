'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, FileText, Info, Loader2, Send, Sparkles, X } from 'lucide-react'
import {
  CATEGORY_LABEL,
  FIRST_CONTACT_TEMPLATES,
  REOPEN_TEMPLATES,
  STAGE_FILTERS,
  STAGE_LABEL,
  type CatalogTemplate,
  type VariableSource,
} from '@/lib/whatsapp/templateCatalog'
import WhatsAppPhonePreview from './templates/WhatsAppPhonePreview'
import TemplateFields from './templates/TemplateFields'
import { useLiveTemplates } from './templates/useLiveTemplates'
import { groupByStage, searchTemplates } from './templates/templateList'
import { useTemplateForm, type TemplateSendPayload } from './templates/useTemplateForm'

export type { TemplateSendPayload }

/**
 * Modal to pick an approved WhatsApp template and fill it in, with a live preview of the customer's phone.
 * Uses the template catalog (plain-English titles + field labels); live GetGabs data decides what is approved and
 * how many values each template takes.
 */
export default function TemplatePicker({
  open,
  onClose,
  customerFirstName,
  autofill,
  initialTemplate,
  recommend = 'first',
  onSend,
}: {
  open: boolean
  onClose: () => void
  customerFirstName?: string
  /** Values we already know (customer name, destination from the lead, your name…) */
  autofill?: Partial<Record<VariableSource, string>>
  /** Open straight on this template's form */
  initialTemplate?: string
  /** Which recommendations to show on top: a brand-new customer, or re-opening a quiet chat */
  recommend?: 'first' | 'reopen'
  /** Resolves when the send finished (either way); the picker closes itself afterwards */
  onSend: (payload: TemplateSendPayload) => Promise<void>
}) {
  const live = useLiveTemplates(open)
  const form = useTemplateForm({ live, enabled: open, initialName: initialTemplate })
  const { choose, templates, availability, detail, selected, selectedAvail, needsDetail, isMeta, values, setValues, headerMedia, setHeaderMedia, showErrors, missing, canSend, sending } =
    form
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('all')

  const fill = useMemo(() => ({ ...(customerFirstName ? { customer_first_name: customerFirstName } : {}), ...autofill }), [customerFirstName, autofill])

  // Reset each time the picker opens (optionally straight onto a template)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      choose(initialTemplate)
      setQuery('')
      setStage('all')
    }
  }

  const visible = templates.filter((t) => t.stage !== 'internal')
  const filtered = searchTemplates(visible, query, stage)
  const groups = groupByStage(filtered)
  const recommended = (recommend === 'reopen' ? REOPEN_TEMPLATES : FIRST_CONTACT_TEMPLATES)
    .map((t) => templates.find((x) => x.name === t.name))
    .filter((t): t is CatalogTemplate => !!t && availability(t).ok)

  if (!open) return null

  const handleSend = async () => {
    // Closes after the send finished (either way), as before; stays open when a field is missing
    const result = await form.send(async (payload) => {
      await onSend(payload)
      return true
    })
    if (result !== false) onClose()
  }

  const TemplateCard = ({ t, highlight }: { t: CatalogTemplate; highlight?: boolean }) => {
    const a = availability(t)
    return (
      <button
        type="button"
        disabled={!a.ok}
        onClick={() => choose(t.name)}
        className={`w-full rounded-xl border p-3 text-left transition-colors ${
          !a.ok
            ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
            : highlight
              ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:bg-emerald-50'
              : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
        }`}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900">{t.title}</span>
          <span className={`shrink-0 rounded px-1.5 text-[10px] font-semibold ${t.category === 'MARKETING' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
            {CATEGORY_LABEL[t.category] || t.category}
          </span>
        </span>
        <span className="mt-0.5 block text-xs text-gray-600">{t.purpose}</span>
        {a.reason ? (
          <span className="mt-1 block text-[11px] font-medium text-red-600">{a.reason}</span>
        ) : t.wordingKnown === false ? (
          <span className="mt-1 block text-[11px] font-medium text-amber-700">Wording unknown — check GetGabs</span>
        ) : (
          <span className="mt-1 block text-[11px] text-gray-400">{t.whenToUse}</span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-[92vh] w-full max-w-5xl flex-col rounded-t-2xl bg-white shadow-xl sm:h-[88vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {selected && (
              <button
                type="button"
                onClick={() => choose(undefined)}
                className="-ml-1 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Back to all templates"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-gray-900">
              <FileText className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="truncate">{selected ? selected.title : 'Choose a WhatsApp message'}</span>
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={selected ? `/admin/whatsapp-templates?t=${encodeURIComponent(selected.name)}` : '/admin/whatsapp-templates'}
              target="_blank"
              className="hidden items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 sm:inline-flex"
            >
              <BookOpen className="w-3.5 h-3.5" /> Template guide
            </Link>
            <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!selected ? (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="mb-3 text-xs text-gray-500">
              WhatsApp only allows pre-approved messages until the customer replies. Pick one, fill in the highlighted parts, and check the phone preview
              before sending. Once they reply you can chat freely for 24 hours.
            </p>
            {live.note && (
              <p className="mb-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Info className="w-4 h-4 shrink-0" /> {live.note}
              </p>
            )}
            {live.error && (
              <p className="mb-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {live.error} You can still send the templates from our guide.
              </p>
            )}

            {live.loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading approved templates…
              </div>
            ) : (
              <>
                {!query && stage === 'all' && recommended.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                      <Sparkles className="w-3.5 h-3.5" /> {recommend === 'reopen' ? 'Best to restart the conversation' : 'Best for a first message'}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {recommended.map((t) => (
                        <TemplateCard key={t.name} t={t} highlight />
                      ))}
                    </div>
                  </div>
                )}

                <div className="sticky top-0 z-10 -mx-5 mb-3 space-y-2 bg-white/95 px-5 pb-2 pt-1 backdrop-blur">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search: quote, payment, itinerary, Bali…"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[{ value: 'all', label: 'All' }, ...STAGE_FILTERS.filter((f) => f.value !== 'internal')].map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setStage(f.value)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          stage === f.value ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {groups.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">No templates match.</p>
                ) : (
                  groups.map(([s, list]) => (
                    <div key={s} className="mb-4">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{STAGE_LABEL[s]}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {list.map((t) => (
                          <TemplateCard key={t.name} t={t} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
            <div className="px-5 py-4 lg:overflow-y-auto">
              <div className="mb-4 rounded-xl bg-gray-50 px-3 py-2.5">
                <p className="text-sm text-gray-800">{selected.purpose}</p>
                {selected.whenToUse && <p className="mt-0.5 text-xs text-gray-500">When: {selected.whenToUse}</p>}
              </div>
              {!selectedAvail.ok && (
                <p className="mb-4 flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {selectedAvail.reason || 'This template cannot be sent from the inbox.'}
                </p>
              )}
              {(selected.note || (detail.error && !isMeta)) && (
                <p className="mb-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <Info className="w-4 h-4 shrink-0" />
                  {[selected.note, detail.error && `Couldn't double-check it in GetGabs (${detail.error}).`].filter(Boolean).join(' ')}
                </p>
              )}
              {needsDetail ? (
                detail.error ? null : (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading the template’s fields from GetGabs…
                  </div>
                )
              ) : (
                <>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Fill in</p>
                  <TemplateFields
                    template={selected}
                    values={values}
                    onChange={setValues}
                    headerMedia={headerMedia}
                    onHeaderMedia={setHeaderMedia}
                    autofill={fill}
                    showErrors={showErrors}
                  />
                </>
              )}
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 lg:overflow-y-auto lg:border-l lg:border-t-0">
              <p className="mb-2 text-center text-xs font-semibold text-gray-500">What the customer will see</p>
              <WhatsAppPhonePreview template={selected} values={values} headerMedia={headerMedia} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          {selected && (
            <p className="mr-auto min-w-0 flex-1 text-xs">
              {missing.length ? (
                <span className="text-gray-500">
                  Still to fill: <span className={showErrors ? 'font-semibold text-red-600' : 'font-medium text-gray-700'}>{missing.map((m) => m.label).join(' · ')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to send — check the preview
                </span>
              )}
            </p>
          )}
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          {selected && (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send on WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
