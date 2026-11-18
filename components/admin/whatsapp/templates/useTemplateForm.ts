'use client'

import { useCallback, useMemo, useState } from 'react'
import { buildTemplateComponents, type WhatsAppTemplateSummary } from '@/lib/whatsapp'
import {
  FIRST_CONTACT_TEMPLATES,
  REOPEN_TEMPLATES,
  getCatalogTemplate,
  humanizeTemplateName,
  type CatalogTemplate,
  type VariableSource,
} from '@/lib/whatsapp/templateCatalog'
import { buildComponents, fieldDomId, missingFields, previewText, type HeaderMediaValue, type TemplateValues } from './TemplateFields'
import { useLiveTemplateDetail, type LiveTemplates } from './useLiveTemplates'
import { allTemplates } from './templateList'

export interface TemplateSendPayload {
  templateName: string
  languageCode: string
  components: any[]
  previewText: string
}

/* ------------------------------------------------------------------------------------------------
 * Meta Cloud API provider (WHATSAPP_INBOX_PROVIDER=meta): Meta gives the body text, so convert it to a catalog
 * shape and reuse the same form + preview.
 * ---------------------------------------------------------------------------------------------- */

export function catalogFromMeta(m: WhatsAppTemplateSummary): { template: CatalogTemplate; keys: string[] } {
  const keys = Array.from(new Set([...m.headerVariables, ...m.bodyVariables]))
  const pos = (s?: string) => String(s || '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (all, k) => (keys.includes(k) ? `{{${keys.indexOf(k) + 1}}}` : all))
  const entry = getCatalogTemplate(m.name)
  const headerHasVars = m.headerVariables.length > 0
  const template: CatalogTemplate = {
    name: m.name,
    title: entry?.title || humanizeTemplateName(m.name),
    category: (m.category as any) || entry?.category || 'UTILITY',
    language: m.language,
    purpose: entry?.purpose || 'Approved template from WhatsApp Manager.',
    whenToUse: entry?.whenToUse || '',
    stage: entry?.stage || (m.category === 'MARKETING' ? 'campaign' : 'lead'),
    header: m.headerText && !headerHasVars ? { type: 'TEXT', text: m.headerText } : undefined,
    body: [headerHasVars && m.headerText ? `*${pos(m.headerText)}*` : '', pos(m.bodyText)].filter(Boolean).join('\n\n'),
    footer: m.footerText,
    buttons: [],
    variables: keys.map(
      (k, i) =>
        (entry && entry.variables.length === keys.length && entry.variables[i]) || {
          index: i + 1,
          label: /^\d+$/.test(k) ? (i === 0 ? "Customer's first name" : `Value ${k}`) : humanizeTemplateName(k),
          help: '',
          example: '',
          ...(i === 0 ? { source: 'customer_first_name' as VariableSource } : {}),
        }
    ),
    notSendableReason: m.supported ? undefined : `This template ${m.unsupportedReason}.`,
    wordingKnown: true,
  }
  return { template, keys }
}

/**
 * The 2–3 best templates to start (or restart) a conversation that are actually sendable right now.
 * While the live list is still loading (or failed) the catalog's picks are trusted.
 */
export function pickStartTemplates(mode: 'first' | 'reopen', live: Pick<LiveTemplates, 'loading' | 'error' | 'provider' | 'approved'>): CatalogTemplate[] {
  const preferred = mode === 'reopen' ? REOPEN_TEMPLATES : FIRST_CONTACT_TEMPLATES
  const backup = mode === 'reopen' ? FIRST_CONTACT_TEMPLATES : REOPEN_TEMPLATES
  const ok = (t: CatalogTemplate) => !t.notSendableReason && (live.loading || !!live.error || live.provider !== 'getgabs' || live.approved.has(t.name))
  const seen = new Set<string>()
  return [...preferred, ...backup].filter((t) => ok(t) && !seen.has(t.name) && seen.add(t.name)).slice(0, 3)
}

/**
 * State + logic of "fill in a template and send it": which template is chosen, its values, header file,
 * live checks against GetGabs (or Meta's own templates), what is still missing, and building the send payload.
 * Shared by the template picker (modal) and the inbox's inline "start a conversation" flow.
 */
export function useTemplateForm({ live, enabled, initialName }: { live: LiveTemplates; enabled: boolean; initialName?: string }) {
  const [selectedName, setSelectedName] = useState<string | undefined>(initialName)
  const [values, setValues] = useState<TemplateValues>({})
  const [headerMedia, setHeaderMedia] = useState<HeaderMediaValue>({})
  const [sending, setSending] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  // Fresh form per template. Done in handlers / during render (not in an effect) so it can't wipe what
  // TemplateFields auto-fills in its own effect.
  const choose = useCallback((name?: string) => {
    setSelectedName(name)
    setValues({})
    setHeaderMedia({})
    setShowErrors(false)
  }, [])

  const isMeta = live.provider === 'meta' && !live.loading
  const metaMap = useMemo(() => new Map(live.metaTemplates.map((m) => [m.name, catalogFromMeta(m)])), [live.metaTemplates])

  const templates = useMemo(() => {
    if (isMeta) return Array.from(metaMap.values()).map((x) => x.template)
    return allTemplates(live.list)
  }, [isMeta, metaMap, live.list])

  /** Can it be picked? Disabled: not approved / not sendable. */
  const availability = (t: CatalogTemplate): { ok: boolean; reason?: string } => {
    if (t.notSendableReason) return { ok: false, reason: t.notSendableReason }
    if (isMeta) return { ok: true }
    if (live.loading) return { ok: true }
    if (live.error) return { ok: !!getCatalogTemplate(t.name) }
    return live.approved.has(t.name) ? { ok: true } : { ok: false, reason: 'Not approved in GetGabs yet' }
  }

  // Selected template, checked against GetGabs (counts / header / link buttons)
  const detail = useLiveTemplateDetail(selectedName, enabled && !isMeta && !!selectedName && !live.loading && live.approved.has(selectedName))
  const metaSelected = isMeta && selectedName ? metaMap.get(selectedName) : undefined
  const selected: CatalogTemplate | undefined = metaSelected?.template || detail.template || templates.find((t) => t.name === selectedName)
  const selectedAvail = selected ? availability(selected) : { ok: false }
  // Templates we only know from GetGabs need their skeleton before they can be filled in
  const needsDetail = !!selected && !isMeta && !getCatalogTemplate(selected.name) && !detail.live
  const missing = selected ? missingFields(selected, values, headerMedia) : []
  const canSend = !!selected && selectedAvail.ok && !needsDetail && !detail.loading && !sending

  /**
   * Validate and send. Returns false (and highlights + scrolls to the first empty field) when something is missing,
   * otherwise awaits `onSend` and returns what it returned.
   */
  const send = async <R,>(onSend: (payload: TemplateSendPayload) => Promise<R>): Promise<R | false> => {
    if (!selected || !canSend) return false
    if (missing.length) {
      setShowErrors(true)
      document.getElementById(fieldDomId(missing[0].key))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    setSending(true)
    try {
      const text = previewText(selected, values, headerMedia)
      if (metaSelected) {
        const meta = live.metaTemplates.find((m) => m.name === selected.name)!
        const named: Record<string, string> = {}
        metaSelected.keys.forEach((k, i) => (named[k] = String(values[i + 1] ?? '').trim()))
        return await onSend({ templateName: meta.name, languageCode: meta.language, components: buildTemplateComponents(meta, named), previewText: text })
      }
      return await onSend({ templateName: selected.name, languageCode: selected.language || 'en', components: buildComponents(selected, values, headerMedia), previewText: text })
    } finally {
      setSending(false)
    }
  }

  return {
    selectedName,
    choose,
    isMeta,
    templates,
    availability,
    detail,
    selected,
    selectedAvail,
    needsDetail,
    values,
    setValues,
    headerMedia,
    setHeaderMedia,
    showErrors,
    missing,
    canSend,
    sending,
    send,
  }
}

export type TemplateForm = ReturnType<typeof useTemplateForm>
