'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Loader2, Send, X, Info, Link as LinkIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  buildTemplateComponents,
  renderTemplateText,
  type WhatsAppTemplateSummary,
} from '@/lib/whatsapp'
import {
  buildGetGabsComponents,
  documentFilename,
  getGabsPreviewText,
  getGabsTemplateFields,
  isHttpsUrl,
  type GetGabsTemplateListItem,
  type GetGabsTemplateSummary,
} from '@/lib/getgabsTemplates'

export interface TemplateSendPayload {
  templateName: string
  languageCode: string
  components: any[]
  previewText: string
}

const CATEGORY_LABEL: Record<string, string> = { UTILITY: 'Utility', MARKETING: 'Marketing' }

/**
 * Modal to pick an approved WhatsApp template and fill in its variables (the first one is prefilled with the
 * customer's first name). Works with GetGabs templates (variables come from GetGabs' sample payload — no body
 * text is available) and with Meta Cloud API templates.
 */
export default function TemplatePicker({
  open,
  onClose,
  customerFirstName,
  onSend,
}: {
  open: boolean
  onClose: () => void
  customerFirstName?: string
  /** Resolves when the send finished (either way); the picker closes itself afterwards */
  onSend: (payload: TemplateSendPayload) => Promise<void>
}) {
  const { currentUser } = useAuth()
  const [provider, setProvider] = useState<'getgabs' | 'meta'>('getgabs')
  const [templates, setTemplates] = useState<WhatsAppTemplateSummary[]>([])
  const [ggTemplates, setGgTemplates] = useState<GetGabsTemplateListItem[]>([])
  const [note, setNote] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  // GetGabs: details (variables) of the selected template, loaded on demand
  const [ggDetail, setGgDetail] = useState<GetGabsTemplateSummary | null>(null)
  const [ggDetailState, setGgDetailState] = useState<{ loading: boolean; error?: string }>({ loading: false })

  const authHeaders = async (): Promise<Record<string, string>> => {
    const idToken = await currentUser?.getIdToken()
    return idToken ? { Authorization: `Bearer ${idToken}` } : {}
  }

  // Load the list once per open
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(undefined)
      try {
        const res = await fetch('/api/whatsapp/templates', { headers: await authHeaders() })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) throw new Error([data.error || `HTTP ${res.status}`, data.hint].filter(Boolean).join(' '))
        setNote(data.note)
        if (data.provider === 'getgabs') {
          setProvider('getgabs')
          const list: GetGabsTemplateListItem[] = data.templates || []
          setGgTemplates(list)
          setSelectedKey((k) => (k && list.some((t) => `${t.name}|${t.language}` === k) ? k : ''))
        } else {
          setProvider('meta')
          const list: WhatsAppTemplateSummary[] = data.templates || []
          setTemplates(list)
          const first = list.find((t) => t.supported)
          setSelectedKey((k) => k || (first ? `${first.name}|${first.language}` : ''))
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e.message || 'Could not load templates')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUser])

  // GetGabs: load the selected template's variables
  useEffect(() => {
    if (!open || provider !== 'getgabs' || !selectedKey) {
      setGgDetail(null)
      return
    }
    const [name, language] = selectedKey.split('|')
    let cancelled = false
    setGgDetail(null)
    setGgDetailState({ loading: true })
    ;(async () => {
      try {
        const q = new URLSearchParams({ name, ...(language ? { language } : {}) })
        const res = await fetch(`/api/whatsapp/templates?${q}`, { headers: await authHeaders() })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || !data.template) throw new Error([data.error || `HTTP ${res.status}`, data.hint].filter(Boolean).join(' '))
        setGgDetail(data.template)
        setGgDetailState({ loading: false })
      } catch (e: any) {
        if (!cancelled) setGgDetailState({ loading: false, error: e.message || 'Could not load this template' })
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider, selectedKey])

  /* ---------------- Meta mode ---------------- */
  const selected = useMemo(
    () => (provider === 'meta' ? templates.find((t) => `${t.name}|${t.language}` === selectedKey) : undefined),
    [provider, templates, selectedKey]
  )
  const allVars = useMemo(
    () => (selected ? Array.from(new Set([...selected.headerVariables, ...selected.bodyVariables])) : []),
    [selected]
  )

  /* ---------------- GetGabs mode ---------------- */
  const ggFields = useMemo(() => (ggDetail ? getGabsTemplateFields(ggDetail) : []), [ggDetail])
  const groupedGg = useMemo(() => {
    const groups = new Map<string, GetGabsTemplateListItem[]>()
    for (const t of ggTemplates) {
      const g = CATEGORY_LABEL[t.category] || t.category || 'Other'
      groups.set(g, [...(groups.get(g) || []), t])
    }
    return Array.from(groups.entries())
  }, [ggTemplates])

  // Prefill the first (body) variable with the customer's first name when a template is chosen
  useEffect(() => {
    if (provider === 'meta') {
      if (!selected) return
      const first = allVars[0]
      setValues(first && customerFirstName ? { [first]: customerFirstName } : {})
    } else {
      setValues(ggDetail?.bodyParams.length && customerFirstName ? { b0: customerFirstName } : {})
    }
  }, [provider, selected, allVars, ggDetail, customerFirstName])

  if (!open) return null

  const ggValues = ggDetail
    ? {
        headerLink: values.headerLink?.trim(),
        headerFilename: ggDetail.headerMedia === 'document' && values.headerLink ? documentFilename(values.headerLink.trim(), ggDetail.name) : undefined,
        headerText: ggDetail.headerTextParams.map((_, i) => values[`h${i}`] || ''),
        body: ggDetail.bodyParams.map((_, i) => values[`b${i}`] || ''),
        buttons: ggDetail.buttons.map((_, i) => values[`u${i}`] || ''),
      }
    : null

  const missing =
    provider === 'meta'
      ? allVars.filter((k) => !values[k]?.trim())
      : ggDetail
        ? [
            ...ggFields.filter((f) => !values[f.key]?.trim()).map((f) => f.key),
            ...(ggDetail.headerMedia && !isHttpsUrl(values.headerLink) ? ['headerLink'] : []),
          ]
        : ['template']

  const preview =
    provider === 'meta'
      ? selected
        ? [selected.headerText && renderTemplateText(selected.headerText, values), renderTemplateText(selected.bodyText, values)]
            .filter(Boolean)
            .join('\n\n')
        : ''
      : ggDetail && ggValues
        ? getGabsPreviewText(ggDetail, ggValues)
        : ''

  const canSend =
    provider === 'meta' ? !!selected && selected.supported && !missing.length : !!ggDetail && ggDetail.supported && !missing.length

  const handleSend = async () => {
    if (!canSend || sending) return
    setSending(true)
    try {
      if (provider === 'meta' && selected) {
        await onSend({
          templateName: selected.name,
          languageCode: selected.language,
          components: buildTemplateComponents(selected, values),
          previewText: preview,
        })
      } else if (ggDetail && ggValues) {
        await onSend({
          templateName: ggDetail.name,
          languageCode: ggDetail.language || 'en',
          components: buildGetGabsComponents(ggDetail, ggValues),
          previewText: preview,
        })
      }
      onClose()
    } finally {
      setSending(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none'
  const listEmpty = provider === 'meta' ? templates.length === 0 : ggTemplates.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <FileText className="w-4 h-4 text-emerald-600" /> Send a WhatsApp template
          </h3>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500">
            Templates are pre-approved by Meta and can be sent at any time. When the customer replies, you can chat freely for 24 hours.
          </p>
          {note && (
            <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Info className="w-4 h-4 shrink-0" /> {note}
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading templates…
            </div>
          ) : loadError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{loadError}</p>
          ) : listEmpty ? (
            <p className="text-sm text-gray-500">No approved templates found in the WhatsApp account.</p>
          ) : provider === 'meta' ? (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-700">Template</span>
                <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} className={inputCls}>
                  {templates.map((t) => (
                    <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`} disabled={!t.supported}>
                      {t.name} ({t.language}){t.category ? ` · ${t.category.toLowerCase()}` : ''}
                      {!t.supported ? ` — not available here: ${t.unsupportedReason}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {allVars.map((k, i) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-700">
                    Variable {`{{${k}}}`}
                    {i === 0 && customerFirstName ? <span className="font-normal text-gray-400"> (customer’s first name)</span> : null}
                  </span>
                  <input value={values[k] || ''} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} className={inputCls} />
                </label>
              ))}

              {selected && (
                <div>
                  <span className="mb-1 block text-xs font-semibold text-gray-700">Preview</span>
                  <div className="rounded-xl bg-[#efeae2]/60 p-3">
                    <p className="whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-sm text-gray-800 shadow-xs">{preview}</p>
                    {selected.footerText && <p className="mt-1 px-1 text-[11px] text-gray-500">{selected.footerText}</p>}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-700">Template</span>
                <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} className={inputCls}>
                  <option value="">Choose a template…</option>
                  {groupedGg.map(([group, list]) => (
                    <optgroup key={group} label={group}>
                      {list.map((t) => (
                        <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>
                          {t.name}
                          {t.language && t.language !== 'en' ? ` (${t.language})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              {ggDetailState.loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading the template’s fields…
                </div>
              ) : ggDetailState.error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{ggDetailState.error}</p>
              ) : ggDetail && !ggDetail.supported ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  This template {ggDetail.unsupportedReason}, so it can’t be sent from the inbox. Send it from GetGabs or pick another one.
                </p>
              ) : ggDetail ? (
                <>
                  {ggDetail.headerMedia && (
                    <label className="block">
                      <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <LinkIcon className="w-3 h-3" />
                        {ggDetail.headerMedia === 'document'
                          ? 'Document link (e.g. the quote PDF)'
                          : ggDetail.headerMedia === 'image'
                            ? 'Image link'
                            : 'Video link'}
                      </span>
                      <input
                        type="url"
                        value={values.headerLink || ''}
                        onChange={(e) => setValues((v) => ({ ...v, headerLink: e.target.value }))}
                        placeholder="https://… (paste a public link)"
                        className={inputCls}
                      />
                      {values.headerLink && !isHttpsUrl(values.headerLink) && (
                        <span className="mt-1 block text-[11px] text-red-600">Paste a public link that starts with https://</span>
                      )}
                      {ggDetail.headerMedia === 'document' && isHttpsUrl(values.headerLink) && (
                        <span className="mt-1 block text-[11px] text-gray-500">
                          Shown to the customer as “{documentFilename(values.headerLink!.trim(), ggDetail.name)}”
                        </span>
                      )}
                    </label>
                  )}

                  {ggFields.map((f, i) => (
                    <label key={f.key} className="block">
                      <span className="mb-1 block text-xs font-semibold text-gray-700">
                        {f.group === 'body' ? `Variable ${f.label}` : f.label}
                        {f.key === 'b0' && customerFirstName ? (
                          <span className="font-normal text-gray-400"> (customer’s first name)</span>
                        ) : null}
                      </span>
                      <input
                        value={values[f.key] || ''}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.sample ? `e.g. ${f.sample}` : undefined}
                        className={inputCls}
                        autoFocus={i === 0 && !customerFirstName}
                      />
                    </label>
                  ))}
                  {!ggFields.length && !ggDetail.headerMedia && (
                    <p className="text-xs text-gray-500">This template has no variables.</p>
                  )}

                  <div>
                    <span className="mb-1 block text-xs font-semibold text-gray-700">What will be sent</span>
                    <div className="rounded-xl bg-[#efeae2]/60 p-3">
                      <p className="whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-sm text-gray-800 shadow-xs">{preview}</p>
                      <p className="mt-1 px-1 text-[11px] text-gray-500">
                        GetGabs doesn’t share the template wording, so this shows the template name and your values.
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send template
          </button>
        </div>
      </div>
    </div>
  )
}
