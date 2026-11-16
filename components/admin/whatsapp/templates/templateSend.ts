/**
 * Pure helpers (client-safe) to turn a catalog template + the values staff typed into what GetGabs needs.
 * Re-exported from TemplateFields.tsx.
 */

import { documentFilename, isHttpsUrl } from '@/lib/getgabsTemplates'
import { buttonValueKey, dynamicUrlButtons, type CatalogButton, type CatalogTemplate, type VariableSource } from '@/lib/whatsapp/templateCatalog'

export type TemplateValues = Record<number, string>
export type HeaderMediaValue = { url?: string; filename?: string }
export type TemplateAutofill = Partial<Record<VariableSource, string>>

/** WhatsApp rejects variables with line breaks, tabs or long runs of spaces */
export const cleanVariable = (s?: string) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim()

export const hasMediaHeader = (t: CatalogTemplate) => !!t.header && t.header.type !== 'TEXT'

/** Fixed part of a dynamic URL button, e.g. "https://www.travelzada.com/shared-plan/" */
export const urlPrefix = (b: CatalogButton) => String(b.url || '').split('{{1}}')[0]

/** Staff may paste the whole link: keep only the part that goes after the fixed prefix */
export function urlSuffix(b: CatalogButton, raw?: string): string {
  let v = cleanVariable(raw)
  if (!v) return ''
  const prefix = urlPrefix(b)
  const loose = (s: string) => s.replace(/^https?:\/\/(www\.)?/i, '').toLowerCase()
  if (prefix && /^https?:\/\//i.test(v) && loose(v).startsWith(loose(prefix))) v = v.replace(/^https?:\/\/(www\.)?/i, '').slice(loose(prefix).length)
  else if (/^https?:\/\//i.test(v)) {
    try {
      v = new URL(v).pathname.split('/').filter(Boolean).pop() || v
    } catch {
      /* keep as typed */
    }
  }
  return v.replace(/^\/+/, '').split(/[?#]/)[0]
}

/** Empty values filled from what we know about the customer / agent */
export function initialValues(t: CatalogTemplate, autofill?: TemplateAutofill, current: TemplateValues = {}): TemplateValues {
  const out: TemplateValues = { ...current }
  for (const v of t.variables) {
    const auto = v.source ? autofill?.[v.source] : undefined
    if (auto && !String(out[v.index] ?? '').trim()) out[v.index] = auto
  }
  return out
}

export interface MissingField {
  key: string
  label: string
}

/** What still needs filling before the template can be sent */
export function missingFields(t: CatalogTemplate, values: TemplateValues, headerMedia?: HeaderMediaValue): MissingField[] {
  const out: MissingField[] = []
  if (hasMediaHeader(t) && !isHttpsUrl(headerMedia?.url)) out.push({ key: 'header', label: t.header?.hint || 'File link' })
  for (const v of t.variables) if (!cleanVariable(values[v.index])) out.push({ key: `v${v.index}`, label: v.label })
  for (const { button, index } of dynamicUrlButtons(t))
    if (!urlSuffix(button, values[buttonValueKey(index)])) out.push({ key: `b${index}`, label: button.urlVariable?.label || `${button.text} link` })
  return out
}

/** Cloud-API-shaped `components` for GetGabs `send-templated-message` */
export function buildComponents(t: CatalogTemplate, values: TemplateValues, headerMedia?: HeaderMediaValue): any[] {
  const text = (s?: string) => ({ type: 'text', text: cleanVariable(s) || '-' })
  const components: any[] = []
  if (hasMediaHeader(t)) {
    const link = String(headerMedia?.url || '').trim()
    const type = t.header!.type
    components.push({
      type: 'header',
      parameters: [
        type === 'DOCUMENT'
          ? { type: 'document', document: { link, filename: cleanVariable(headerMedia?.filename) || documentFilename(link, t.name) } }
          : type === 'IMAGE'
            ? { type: 'image', image: { link } }
            : { type: 'video', video: { link } },
      ],
    })
  }
  const vars = [...t.variables].sort((a, b) => a.index - b.index)
  if (vars.length) components.push({ type: 'body', parameters: vars.map((v) => text(values[v.index])) })
  for (const { button, index } of dynamicUrlButtons(t))
    components.push({ type: 'button', sub_type: 'url', index: String(index), parameters: [text(urlSuffix(button, values[buttonValueKey(index)]))] })
  return components
}

/** The message as plain text, stored on the inbox record so staff can read what was sent */
export function previewText(t: CatalogTemplate, values: TemplateValues, headerMedia?: HeaderMediaValue): string {
  const lines: string[] = []
  if (t.header?.type === 'TEXT' && t.header.text) lines.push(`*${t.header.text}*`)
  else if (hasMediaHeader(t) && headerMedia?.url) {
    lines.push(
      t.header!.type === 'DOCUMENT'
        ? `📄 ${cleanVariable(headerMedia.filename) || documentFilename(headerMedia.url, t.name)}`
        : `${t.header!.type === 'IMAGE' ? '🖼️ Image' : '🎬 Video'}: ${headerMedia.url}`
    )
  }
  if (t.wordingKnown === false || !t.body) {
    lines.push(`[${t.name}]`)
    t.variables.forEach((v) => lines.push(`${v.label}: ${cleanVariable(values[v.index]) || '-'}`))
  } else {
    lines.push(t.body.replace(/\{\{\s*(\d+)\s*\}\}/g, (all, n) => cleanVariable(values[Number(n)]) || all))
  }
  if (t.footer) lines.push(t.footer)
  const btns = (t.buttons || []).map((b, i) =>
    b.type === 'URL' ? `🔗 ${b.text}${b.urlHasVariable ? ` (${urlPrefix(b)}${urlSuffix(b, values[buttonValueKey(i)])})` : ''}` : `↩ ${b.text}`
  )
  if (btns.length) lines.push(btns.join(' · '))
  return lines.join('\n\n')
}
