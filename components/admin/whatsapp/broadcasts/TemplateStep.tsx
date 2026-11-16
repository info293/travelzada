'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw, Search, Users, Type } from 'lucide-react'
import { Badge, Card, cx, inputClass } from '@/components/admin/ui'
import WhatsAppPhonePreview from '@/components/admin/whatsapp/templates/WhatsAppPhonePreview'
import TemplateFields, {
  buildComponents,
  missingFields,
  previewText,
  type HeaderMediaValue,
  type MissingField,
  type TemplateValues,
} from '@/components/admin/whatsapp/templates/TemplateFields'
import {
  CATEGORY_LABEL,
  getCatalogTemplate,
  humanizeTemplateName,
  reconcileWithLive,
  type CatalogTemplate,
  type VariableSource,
} from '@/lib/whatsapp/templateCatalog'
import {
  RECIPIENT_SOURCES,
  fillTokens,
  mappingFallbacks,
  sourceInfo,
  sourceToken,
  columnToken,
  type RecipientFields,
  type RecipientSource,
  type VariableMapping,
} from '@/lib/whatsapp/broadcasts'
import { getLiveTemplate, listApprovedTemplates, type ApprovedTemplate, type AudiencePerson, type DraftTemplatePayload } from './api'
import type { SheetColumn } from '@/lib/whatsapp/contactLists'

/** A variable filled per customer (from their record, or from an uploaded sheet's column) */
const isPerCustomer = (m?: VariableMapping) => m?.mode === 'source' || m?.mode === 'column'

/** Catalog auto-fill source → the per-recipient source a broadcast can use */
const CATALOG_TO_RECIPIENT: Partial<Record<VariableSource, RecipientSource>> = {
  customer_first_name: 'first_name',
  destination: 'destination',
  package_name: 'package',
  travel_date: 'travel_date',
}

export interface TemplateDraft {
  template: CatalogTemplate
  payload: DraftTemplatePayload
  missing: MissingField[]
  /** Values for the phone preview, filled for the sample recipient */
  sampleValues: TemplateValues
  headerMedia: HeaderMediaValue
}

export interface TemplateStepState {
  name: string
  language: string
  mappings: Record<number, VariableMapping>
  fixed: TemplateValues
  headerMedia: HeaderMediaValue
}

export const emptyTemplateState = (): TemplateStepState => ({ name: '', language: '', mappings: {}, fixed: {}, headerMedia: {} })

export const sampleOf = (p?: AudiencePerson | null): RecipientFields => ({
  name: p?.name || 'Priya Sharma',
  destination: p?.destination,
  package: p?.package,
  travelDate: p?.travelDate,
  extra: p?.extra,
})

/**
 * Step 2 — pick an approved template, fill the fixed parts, and choose which variables are filled per customer.
 * Live phone preview with a sample recipient (name only).
 */
export default function TemplateStep({
  value,
  onChange,
  sample,
  onDraft,
  columns = [],
}: {
  value: TemplateStepState
  onChange: (v: TemplateStepState) => void
  sample?: AudiencePerson | null
  onDraft: (d: TemplateDraft | null) => void
  /** Uploaded lists: extra sheet columns a variable can be filled from */
  columns?: SheetColumn[]
}) {
  const [approved, setApproved] = useState<ApprovedTemplate[]>([])
  const [listState, setListState] = useState<{ loading: boolean; error?: string; hint?: string }>({ loading: true })
  const [template, setTemplate] = useState<CatalogTemplate | null>(null)
  const [tplState, setTplState] = useState<{ loading: boolean; error?: string }>({ loading: false })
  const [category, setCategory] = useState<'ALL' | 'MARKETING' | 'UTILITY'>('ALL')
  const [search, setSearch] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const loadList = async (fresh = false) => {
    setListState({ loading: true })
    try {
      const { templates } = await listApprovedTemplates(fresh)
      setApproved(templates)
      setListState({ loading: false })
    } catch (e: any) {
      setListState({ loading: false, error: e.message, hint: e.hint })
    }
  }
  useEffect(() => {
    loadList()
  }, [])

  // Load + reconcile the chosen template with what GetGabs really expects
  useEffect(() => {
    if (!value.name) {
      setTemplate(null)
      return
    }
    let cancelled = false
    setTplState({ loading: true })
    getLiveTemplate(value.name, value.language || undefined)
      .then(({ template: live }) => {
        if (cancelled) return
        const t = reconcileWithLive(getCatalogTemplate(value.name), live)
        setTemplate(t)
        setTplState({ loading: false })
        // Default mappings: variables the catalog knows how to auto-fill come from each customer
        if (!Object.keys(value.mappings).length) {
          const mappings: Record<number, VariableMapping> = {}
          for (const v of t.variables) {
            const src = v.source ? CATALOG_TO_RECIPIENT[v.source] : undefined
            if (src) mappings[v.index] = { mode: 'source', source: src, fallback: sourceInfo(src)?.fallback }
          }
          onChange({ ...value, mappings })
        }
      })
      .catch((e: any) => {
        if (!cancelled) setTplState({ loading: false, error: [e.message, e.hint].filter(Boolean).join(' ') })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.name, value.language])

  const options = useMemo(() => {
    const q = search.trim().toLowerCase()
    return approved
      .map((a) => ({ a, entry: getCatalogTemplate(a.name) }))
      .filter(({ a, entry }) => !entry?.notSendableReason && entry?.stage !== 'internal' && (category === 'ALL' || a.category === category))
      .filter(({ a, entry }) => !q || `${a.name} ${entry?.title || ''} ${entry?.purpose || ''}`.toLowerCase().includes(q))
      .sort((x, y) => (x.entry?.stage === 'campaign' ? -1 : 0) - (y.entry?.stage === 'campaign' ? -1 : 0) || x.a.name.localeCompare(y.a.name))
  }, [approved, category, search])

  // ── Derived send payload
  const derived = useMemo<TemplateDraft | null>(() => {
    if (!template) return null
    const isSource = (idx: number) => isPerCustomer(value.mappings[idx])
    const fieldsTemplate: CatalogTemplate = { ...template, variables: template.variables.filter((v) => !isSource(v.index)) }
    const withTokens: TemplateValues = { ...value.fixed }
    const variables: Record<string, VariableMapping> = {}
    for (const v of template.variables) {
      const m = value.mappings[v.index]
      if (m?.mode === 'source') {
        withTokens[v.index] = sourceToken(m.source)
        variables[String(v.index)] = m
      } else if (m?.mode === 'column') {
        withTokens[v.index] = columnToken(m.column)
        variables[String(v.index)] = m
      } else {
        variables[String(v.index)] = { mode: 'fixed', text: String(value.fixed[v.index] ?? '') }
      }
    }
    const media = value.headerMedia
    const componentsTemplate = buildComponents(template, withTokens, media)
    const previewTemplate = previewText(template, withTokens, media)
    const fallbacks = mappingFallbacks(variables)
    const s = sampleOf(sample)
    const sampleValues: TemplateValues = {}
    for (const [k, v] of Object.entries(withTokens)) sampleValues[Number(k)] = fillTokens(String(v ?? ''), s, fallbacks)
    const kind = template.header && template.header.type !== 'TEXT' ? (template.header.type.toLowerCase() as 'image' | 'document' | 'video') : null
    return {
      template,
      headerMedia: media,
      sampleValues,
      missing: missingFields(fieldsTemplate, value.fixed, media),
      payload: {
        templateName: template.name,
        language: value.language || template.language,
        templateTitle: template.title,
        variables,
        componentsTemplate,
        previewTemplate,
        headerMedia: kind && media.url ? { kind, link: media.url.trim(), ...(media.filename ? { filename: media.filename } : {}) } : null,
      },
    }
  }, [template, value, sample])

  useEffect(() => {
    onDraft(derived)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived])

  const pick = (a: ApprovedTemplate) => {
    setShowErrors(false)
    onChange({ name: a.name, language: a.language, mappings: {}, fixed: {}, headerMedia: {} })
  }

  const fieldsTemplate = template ? { ...template, variables: template.variables.filter((v) => !isPerCustomer(value.mappings[v.index])) } : null

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5 min-w-0">
        {/* Template list */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-gray-900">Pick an approved message</p>
            <div className="flex items-center gap-1.5">
              {(['ALL', 'MARKETING', 'UTILITY'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cx('rounded-full px-3 py-1 text-xs font-semibold border', category === c ? 'bg-bordeaux-600 text-white border-bordeaux-600' : 'bg-white text-gray-700 border-gray-300')}
                >
                  {c === 'ALL' ? 'All' : CATEGORY_LABEL[c]}
                </button>
              ))}
              <button type="button" onClick={() => loadList(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Reload from GetGabs">
                <RefreshCw className={cx('w-4 h-4', listState.loading && 'animate-spin')} />
              </button>
            </div>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={`${inputClass} pl-9`} placeholder="Search templates" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {listState.loading && !approved.length ? (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading approved templates…
            </div>
          ) : listState.error ? (
            <p className="text-sm text-red-600">
              {listState.error} {listState.hint}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 max-h-80 overflow-y-auto pr-1">
              {options.map(({ a, entry }) => (
                <button
                  key={`${a.name}|${a.language}`}
                  type="button"
                  onClick={() => pick(a)}
                  className={cx(
                    'text-left rounded-xl border p-3 transition-colors',
                    value.name === a.name ? 'border-bordeaux-500 bg-bordeaux-50/60 ring-1 ring-bordeaux-300' : 'border-gray-200 hover:border-bordeaux-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{entry?.title || humanizeTemplateName(a.name)}</p>
                    <Badge tone={a.category === 'MARKETING' ? 'purple' : 'blue'}>{CATEGORY_LABEL[a.category] || a.category}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{entry?.purpose || 'Approved in GetGabs — wording not in our guide.'}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">{a.name}</p>
                </button>
              ))}
              {!options.length && <p className="text-sm text-gray-500">No approved templates match.</p>}
            </div>
          )}
        </Card>

        {/* Fill in */}
        {value.name && (
          <Card>
            {tplState.loading ? (
              <div className="flex items-center gap-2 py-6 justify-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading the template…
              </div>
            ) : tplState.error ? (
              <p className="text-sm text-red-600">{tplState.error}</p>
            ) : template && fieldsTemplate ? (
              <div className="space-y-5">
                {template.variables.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Personalise for each customer</p>
                    <p className="text-xs text-gray-500 mb-3">Choose what each blank in the message is filled with.</p>
                    <div className="space-y-2">
                      {template.variables.map((v) => {
                        const m = value.mappings[v.index]
                        const isSource = isPerCustomer(m)
                        return (
                          <div key={v.index} className="rounded-xl border border-gray-200 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[13px] font-semibold text-gray-800">{v.label}</p>
                              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const mappings = { ...value.mappings }
                                    delete mappings[v.index]
                                    onChange({ ...value, mappings })
                                  }}
                                  className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold', !isSource ? 'bg-gray-900 text-white' : 'text-gray-600')}
                                >
                                  <Type className="w-3 h-3" /> Same for everyone
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const src = (v.source && CATALOG_TO_RECIPIENT[v.source]) || 'first_name'
                                    onChange({ ...value, mappings: { ...value.mappings, [v.index]: { mode: 'source', source: src, fallback: sourceInfo(src)?.fallback } } })
                                  }}
                                  className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold', isSource ? 'bg-gray-900 text-white' : 'text-gray-600')}
                                >
                                  <Users className="w-3 h-3" /> From each customer
                                </button>
                              </div>
                            </div>
                            {isSource && m && m.mode !== 'fixed' ? (
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <select
                                  className={inputClass}
                                  value={m.mode === 'column' ? `col:${m.column}` : m.source}
                                  onChange={(e) => {
                                    const raw = e.target.value
                                    if (raw.startsWith('col:')) {
                                      const col = columns.find((c) => c.key === raw.slice(4))
                                      onChange({ ...value, mappings: { ...value.mappings, [v.index]: { mode: 'column', column: raw.slice(4), label: col?.label, fallback: '' } } })
                                      return
                                    }
                                    const src = raw as RecipientSource
                                    onChange({ ...value, mappings: { ...value.mappings, [v.index]: { mode: 'source', source: src, fallback: sourceInfo(src)?.fallback } } })
                                  }}
                                >
                                  {RECIPIENT_SOURCES.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label} → {s.help.toLowerCase()}
                                    </option>
                                  ))}
                                  {columns.length > 0 && (
                                    <optgroup label="From your uploaded sheet">
                                      {columns.map((c) => (
                                        <option key={c.key} value={`col:${c.key}`}>
                                          Sheet column: {c.label}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                                <label className="flex items-center gap-2 text-xs text-gray-600">
                                  <span className="shrink-0">If missing, use</span>
                                  <input
                                    className={inputClass}
                                    value={m.fallback ?? ''}
                                    onChange={(e) => onChange({ ...value, mappings: { ...value.mappings, [v.index]: { ...m, fallback: e.target.value } } })}
                                  />
                                </label>
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-gray-500">Type it below.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Fill in the rest</p>
                  <TemplateFields
                    template={fieldsTemplate}
                    values={value.fixed}
                    onChange={(fixed) => onChange({ ...value, fixed })}
                    headerMedia={value.headerMedia}
                    onHeaderMedia={(headerMedia) => onChange({ ...value, headerMedia })}
                    showErrors={showErrors}
                  />
                </div>

                {derived && derived.missing.length > 0 && (
                  <button type="button" onClick={() => setShowErrors(true)} className="flex w-full gap-2 rounded-xl bg-amber-50 p-3 text-left text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Still to fill in: {derived.missing.map((m) => m.label).join(', ')}
                  </button>
                )}
                {template.wordingKnown === false && (
                  <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> The exact wording of this template isn&apos;t in our guide — check it in GetGabs before sending.
                  </p>
                )}
              </div>
            ) : null}
          </Card>
        )}
      </div>

      {/* Preview */}
      <div>
        <div className="lg:sticky lg:top-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Preview for {sampleOf(sample).name.split(' ')[0]}</p>
          {derived ? (
            <WhatsAppPhonePreview template={derived.template} values={derived.sampleValues} headerMedia={derived.headerMedia} compact />
          ) : (
            <Card>
              <p className="text-sm text-gray-500">Pick a template to see how it looks on the customer&apos;s phone.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
