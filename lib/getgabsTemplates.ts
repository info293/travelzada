/**
 * GetGabs WhatsApp helpers that are safe to import from client components (no env, no network):
 * inbox channels / business numbers, and turning a GetGabs `fetchJson` template skeleton into
 * fillable variables + the `components` array to send.
 */

/** Which WhatsApp connection a message / chat belongs to. Records without a channel are from the old Meta number. */
export type WhatsAppChannel = 'getgabs' | 'meta'

export const WHATSAPP_BUSINESS_NUMBERS: Record<WhatsAppChannel, { digits: string; display: string; short: string; label: string }> = {
  getgabs: { digits: '918890059568', display: '+91 88900 59568', short: '88900', label: 'GetGabs' },
  meta: { digits: '918529870220', display: '+91 85298 70220', short: '85298', label: 'Meta' },
}

export const channelOf = (x?: { channel?: string | null } | null): WhatsAppChannel => (x?.channel === 'getgabs' ? 'getgabs' : 'meta')

/* ------------------------------------------------------------------------------------------------
 * Templates
 * ---------------------------------------------------------------------------------------------- */

/** One row of GetGabs `template/fetchAll` (only rows with a template_id, i.e. submitted to Meta) */
export interface GetGabsTemplateListItem {
  name: string
  language: string
  category: string
  templateId: string
}

export type GetGabsHeaderMedia = 'document' | 'image' | 'video'

export interface GetGabsTemplateSummary extends GetGabsTemplateListItem {
  /** Media header that needs a public link (DOCUMENT / IMAGE / VIDEO) */
  headerMedia?: GetGabsHeaderMedia
  /** Sample values of text header params (rare) */
  headerTextParams: string[]
  /** Sample values of the body params {{1}}, {{2}}, … in order */
  bodyParams: string[]
  /** Dynamic URL buttons: the sample value of the URL suffix */
  buttons: { index: number; subType: string; sample: string }[]
  supported: boolean
  unsupportedReason?: string
}

export interface GetGabsTemplateValues {
  headerLink?: string
  headerFilename?: string
  headerText?: string[]
  body?: string[]
  buttons?: string[]
}

const lower = (s: any) => String(s || '').toLowerCase()

/**
 * GetGabs `fetchJson` returns a ready-to-send payload skeleton with SAMPLE values, e.g.
 * { template: { components: [ {type:"HEADER",parameters:[{type:"DOCUMENT",document:{link:""}}]},
 *   {type:"BODY",parameters:[{type:"text",text:"Priya"},…]}, {type:"button",sub_type:"URL",index:0,parameters:[…]} ] } }
 * (It may also return Meta's template definition shape with `format` / `example`; both are handled.)
 */
export function summarizeGetGabsSkeleton(row: GetGabsTemplateListItem, skeleton: any): GetGabsTemplateSummary {
  const comps: any[] = Array.isArray(skeleton?.template?.components)
    ? skeleton.template.components
    : Array.isArray(skeleton?.components)
      ? skeleton.components
      : []
  const out: GetGabsTemplateSummary = { ...row, headerTextParams: [], bodyParams: [], buttons: [], supported: true }
  const textOf = (p: any) => String(p?.text ?? p?.xmpl?.[0] ?? '')

  for (const c of comps) {
    const type = lower(c?.type)
    if (type === 'header') {
      const params: any[] = c.parameters || []
      const media = params.map((p) => lower(p?.type)).find((t) => t === 'document' || t === 'image' || t === 'video')
      const format = lower(c.format)
      if (media) out.headerMedia = media as GetGabsHeaderMedia
      else if (['document', 'image', 'video'].includes(format)) out.headerMedia = format as GetGabsHeaderMedia
      else if (format === 'location') {
        out.supported = false
        out.unsupportedReason = 'has a location header'
      }
      out.headerTextParams = params.filter((p) => lower(p?.type) === 'text').map(textOf)
      if (!params.length && c.example?.header_text) out.headerTextParams = [...c.example.header_text].map(String)
    } else if (type === 'body') {
      const params: any[] = c.parameters || []
      out.bodyParams = params.length ? params.map(textOf) : (c.example?.body_text?.[0] || []).map(String)
    } else if (type === 'button') {
      const sub = lower(c.sub_type)
      if (sub === 'url') {
        out.buttons.push({ index: Number(c.index) || 0, subType: c.sub_type || 'URL', sample: textOf(c.parameters?.[0]) })
      } else if (sub && sub !== 'quick_reply') {
        out.supported = false
        out.unsupportedReason = `has a ${sub.replace(/_/g, ' ')} button`
      }
    } else if (type === 'buttons') {
      // Meta definition shape: URL buttons with a {{1}} suffix need a value
      ;(c.buttons || []).forEach((b: any, i: number) => {
        if (lower(b.type) === 'url' && /\{\{/.test(b.url || '')) out.buttons.push({ index: i, subType: 'URL', sample: String(b.example?.[0] || '') })
      })
    } else if (type === 'carousel') {
      out.supported = false
      out.unsupportedReason = 'is a carousel (send it from GetGabs)'
    } else if (type === 'limited_time_offer') {
      out.supported = false
      out.unsupportedReason = 'has a limited-time offer'
    }
  }
  if (lower(row.category) === 'authentication') {
    out.supported = false
    out.unsupportedReason = 'is an authentication (OTP) template'
  }
  return out
}

/** Every variable the staff member has to fill in, in display order */
export function getGabsTemplateFields(t: GetGabsTemplateSummary) {
  const fields: { key: string; label: string; sample: string; group: 'header' | 'body' | 'button' }[] = []
  t.headerTextParams.forEach((s, i) => fields.push({ key: `h${i}`, label: `Header {{${i + 1}}}`, sample: s, group: 'header' }))
  t.bodyParams.forEach((s, i) => fields.push({ key: `b${i}`, label: `{{${i + 1}}}`, sample: s, group: 'body' }))
  t.buttons.forEach((b, i) => fields.push({ key: `u${i}`, label: `Link button ${b.index + 1} (end of the link)`, sample: b.sample, group: 'button' }))
  return fields
}

/** File name WhatsApp shows for a document header: from the link, else "<template>.pdf" */
export function documentFilename(link: string, templateName: string) {
  try {
    const last = decodeURIComponent(new URL(link).pathname.split('/').pop() || '')
    if (/\.[a-z0-9]{2,5}$/i.test(last)) return last.slice(-120)
  } catch {
    /* not a URL */
  }
  return `${templateName.replace(/^tz_/, '').replace(/_/g, '-') || 'document'}.pdf`
}

export const isHttpsUrl = (s?: string) => /^https:\/\/[^\s]+\.[^\s]+/i.test(String(s || '').trim())

/** Build the Cloud-API-shaped `components` GetGabs expects for `send-templated-message` */
export function buildGetGabsComponents(t: GetGabsTemplateSummary, v: GetGabsTemplateValues): any[] {
  const text = (s?: string) => ({ type: 'text', text: String(s ?? '').trim() || '-' })
  const components: any[] = []
  if (t.headerMedia) {
    const link = String(v.headerLink || '').trim()
    const media =
      t.headerMedia === 'document'
        ? { type: 'document', document: { link, filename: v.headerFilename || documentFilename(link, t.name) } }
        : t.headerMedia === 'image'
          ? { type: 'image', image: { link } }
          : { type: 'video', video: { link } }
    components.push({ type: 'header', parameters: [media] })
  } else if (t.headerTextParams.length) {
    components.push({ type: 'header', parameters: t.headerTextParams.map((_, i) => text(v.headerText?.[i])) })
  }
  if (t.bodyParams.length) components.push({ type: 'body', parameters: t.bodyParams.map((_, i) => text(v.body?.[i])) })
  t.buttons.forEach((b, i) =>
    components.push({ type: 'button', sub_type: b.subType.toLowerCase(), index: String(b.index), parameters: [text(v.buttons?.[i])] })
  )
  return components
}

/** GetGabs gives no template body text, so the inbox shows the template name + the filled values */
export function getGabsPreviewText(t: GetGabsTemplateSummary, v: GetGabsTemplateValues): string {
  const lines = [`[${t.name}]`]
  if (t.headerMedia && v.headerLink) {
    const kind = t.headerMedia[0].toUpperCase() + t.headerMedia.slice(1)
    lines.push(`${kind}: ${t.headerMedia === 'document' ? v.headerFilename || documentFilename(v.headerLink, t.name) : v.headerLink}`)
  }
  ;(v.headerText || []).forEach((s, i) => s && lines.push(`Header ${i + 1}: ${s}`))
  t.bodyParams.forEach((_, i) => lines.push(`${i + 1}. ${String(v.body?.[i] ?? '').trim() || '-'}`))
  t.buttons.forEach((b, i) => lines.push(`Link button: …/${String(v.buttons?.[i] ?? '').trim()}`))
  return lines.join('\n')
}
