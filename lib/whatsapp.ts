/**
 * WhatsApp Meta Cloud API Helper Utility
 * API Version: v20.0
 */

export interface WhatsAppSendMessagePayload {
  to: string
  text?: string
  templateName?: string
  languageCode?: string
  components?: any[]
}

/**
 * Format and sanitize phone number for WhatsApp API (e.g. "+91 98765-43210" -> "919876543210")
 */
export function formatPhoneNumber(phone: string): string {
  // Remove non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  return cleaned
}

/** Error from the WhatsApp Cloud API, keeping Meta's full error object for diagnostics */
export class WhatsAppApiError extends Error {
  constructor(message: string, public meta: any, public httpStatus: number) {
    super(message)
    this.name = 'WhatsAppApiError'
  }
}

/**
 * POST to the Cloud API, retrying up to 2 times (after 1s, then 3s) when Meta reports a
 * temporary outage (`is_transient`, e.g. "(#2) Service temporarily unavailable").
 */
async function postToWhatsApp(url: string, accessToken: string, payload: unknown) {
  const delays = [1000, 3000]
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    const transient = !response.ok && (data?.error?.is_transient === true || [1, 2, 4].includes(data?.error?.code))
    if (!transient || attempt >= delays.length) return { response, data }
    console.warn(`[WhatsApp] Temporary Meta error (${data?.error?.message}), retrying in ${delays[attempt] / 1000}s...`)
    await new Promise((r) => setTimeout(r, delays[attempt]))
  }
}
/**
 * Send a WhatsApp Text Message via Meta Cloud API
 */
export async function sendWhatsAppTextMessage(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp API credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN) are missing in environment variables.')
  }

  const recipient = formatPhoneNumber(to)
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  }

  const { response, data } = await postToWhatsApp(url, accessToken, payload)

  if (!response.ok) {
    console.error('[WhatsApp Cloud API Error]:', data)
    throw new WhatsAppApiError(data.error?.message || 'Failed to send WhatsApp text message', data.error, response.status)
  }

  return data
}

/**
 * Send a WhatsApp Template Message via Meta Cloud API
 * Templates are required for starting business-initiated conversations.
 */
export async function sendWhatsAppTemplateMessage(
  to: string,
  templateName: string,
  languageCode = 'en_US',
  components?: any[]
) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp API credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN) are missing in environment variables.')
  }

  const recipient = formatPhoneNumber(to)
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`

  const payload: any = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  }

  if (components && components.length > 0) {
    payload.template.components = components
  }

  const { response, data } = await postToWhatsApp(url, accessToken, payload)

  if (!response.ok) {
    console.error('[WhatsApp Cloud API Error]:', data)
    throw new WhatsAppApiError(data.error?.message || 'Failed to send WhatsApp template message', data.error, response.status)
  }

  return data
}

function credentials() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp API credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN) are missing in environment variables.')
  }
  return { phoneNumberId, accessToken }
}

/** Uploads a file (e.g. a proposal PDF) to WhatsApp and returns its media ID for use in messages. */
export async function uploadWhatsAppMedia(data: ArrayBuffer | Uint8Array, filename: string, mimeType: string): Promise<string> {
  const { phoneNumberId, accessToken } = credentials()
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', mimeType)
  form.append('file', new Blob([data as BlobPart], { type: mimeType }), filename)
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const json = await res.json()
  if (!res.ok || !json.id) throw new Error(json.error?.message || 'Failed to upload media to WhatsApp')
  return json.id as string
}

/** Image message with a caption (only inside the customer's 24-hour window). */
export async function sendWhatsAppImageMessage(to: string, imageUrl: string, caption?: string) {
  const { phoneNumberId, accessToken } = credentials()
  const { response, data } = await postToWhatsApp(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatPhoneNumber(to),
    type: 'image',
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  })
  if (!response.ok) {
    console.error('[WhatsApp Cloud API Error]:', data)
    throw new WhatsAppApiError(data.error?.message || 'Failed to send WhatsApp image message', data.error, response.status)
  }
  return data
}

/* ------------------------------------------------------------------------------------------------
 * Conversation Routing (thread control) — error 131070 means another app connected to the number
 * owns this chat thread. Only an app with the "escalation" role can take control via the API.
 * ---------------------------------------------------------------------------------------------- */

let routingRolesCache: { roles: string[]; isStandby: boolean; at: number } | null = null
const ROUTING_ROLES_TTL = 10 * 60 * 1000

/** This app's routing roles on the business number (GET /{PHONE_NUMBER_ID}/routing_roles), cached 10 min in memory */
export async function getRoutingRoles(): Promise<{ roles: string[]; isStandby: boolean }> {
  if (routingRolesCache && Date.now() - routingRolesCache.at < ROUTING_ROLES_TTL) return routingRolesCache
  const { phoneNumberId, accessToken } = credentials()
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/routing_roles`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new WhatsAppApiError(data?.error?.message || 'Failed to read routing roles', data?.error, res.status)
  routingRolesCache = { roles: Array.isArray(data.roles) ? data.roles : [], isStandby: data.is_standby === true, at: Date.now() }
  return routingRolesCache
}

/** Take control of the customer's chat thread (works only when this app has the "escalation" role) */
export async function takeThreadControl(to: string) {
  const { phoneNumberId, accessToken } = credentials()
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/thread_control`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: formatPhoneNumber(to), action: 'take' }),
  })
  const data = await res.json()
  if (!res.ok) throw new WhatsAppApiError(data?.error?.message || 'Failed to take thread control', data?.error, res.status)
  return data
}

/**
 * Chat-id format used by the inbox: digits only, with India's country code added to bare 10-digit numbers
 * (and a leading trunk "0" dropped). "+91 98765-43210" / "098765 43210" / "9876543210" → "919876543210".
 */
export function normalizeWhatsAppNumber(phone: string): string {
  let digits = formatPhoneNumber(String(phone || ''))
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10) digits = `91${digits}`
  return digits
}

/**
 * Collections a `ref` ("collection/id") may point at, and where the phone lives in each.
 * Keep in sync with PHONE_REF_FIELDS in lib/admin/privacy.tsx (that module is client-only, so it is not
 * imported from API routes).
 */
export const WHATSAPP_REF_FIELDS: Record<string, string[]> = {
  leads: ['mobile', 'phone', 'phoneNumber'],
  ai_planner_leads: ['mobile', 'phone', 'phoneNumber'],
  contact_messages: ['phone', 'mobile'],
  customer_itineraries: ['clientPhone', 'phone'],
  meta_lead_crm: ['phone', 'phoneNorm'],
  // Keep in sync with PHONE_REF_FIELDS in lib/admin/privacy.tsx (client copy)
  vendor_leads: ['userPhone', 'phone', 'mobile'],
  voucher_claims: ['phoneNorm', 'phone', 'mobile'],
  vouchers: ['phone', 'mobile', 'recipientPhone'],
  whatsapp_chats: ['phone'],
}

/**
 * Server-side: resolve `collection/id` to the record's phone (normalised) and name, so the browser never has
 * to send the raw number. Returns null if the ref is not allowed or has no usable number.
 */
export async function resolveWhatsAppRef(ref?: string | null): Promise<{ phone: string; name: string } | null> {
  const m = String(ref || '').match(/^([a-z_]+)\/([A-Za-z0-9_\-+]+)$/)
  if (!m || !WHATSAPP_REF_FIELDS[m[1]]) return null
  const { db } = await import('@/lib/firebase')
  const { doc, getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, m[1], m[2]))
  let raw: string | undefined
  let name = ''
  if (snap.exists()) {
    const data = snap.data() as Record<string, any>
    raw = WHATSAPP_REF_FIELDS[m[1]].map((f) => data[f]).find((v) => v && String(v).replace(/\D/g, '').length >= 8)
    name = String(data.name || data.clientName || data.fullName || data.customerName || '')
  }
  // whatsapp_chats: the doc id IS the number, but only for a chat that actually exists (no arbitrary numbers)
  if (!raw && snap.exists() && m[1] === 'whatsapp_chats' && /^\d{8,15}$/.test(m[2])) raw = m[2]
  if (!raw) return null
  const phone = normalizeWhatsAppNumber(String(raw))
  return phone.length >= 8 ? { phone, name } : null
}

/* ------------------------------------------------------------------------------------------------
 * Message templates (required outside the customer's 24-hour window)
 * ---------------------------------------------------------------------------------------------- */

export interface WhatsAppTemplateSummary {
  name: string
  language: string
  category?: string
  /** Header text (TEXT headers only) */
  headerText?: string
  bodyText: string
  footerText?: string
  /** Variable keys in the header / body, in order: ["1","2"] or named ["first_name"] */
  headerVariables: string[]
  bodyVariables: string[]
  /** "NAMED" when the template uses {{first_name}} style parameters */
  parameterFormat?: 'NAMED' | 'POSITIONAL'
  /** False when the template needs something this inbox can't fill in (media header, dynamic URL button) */
  supported: boolean
  unsupportedReason?: string
}

/** Fallback when WHATSAPP_BUSINESS_ACCOUNT_ID is not configured (templates can't be listed from Meta) */
export const FALLBACK_WHATSAPP_TEMPLATES: WhatsAppTemplateSummary[] = [
  {
    name: 'hello_world',
    language: 'en_US',
    category: 'UTILITY',
    headerText: 'Hello World',
    bodyText:
      'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.',
    footerText: 'WhatsApp Business Platform sample message',
    headerVariables: [],
    bodyVariables: [],
    supported: true,
  },
]

const VAR_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g

/** "{{1}} and {{name}}" → ["1", "name"] (unique, in order of appearance) */
export function templateVariables(text?: string): string[] {
  const out: string[] = []
  for (const m of Array.from(String(text || '').matchAll(VAR_RE))) if (!out.includes(m[1])) out.push(m[1])
  return out
}

/** Replace {{key}} with the given values (missing values stay as {{key}}) */
export function renderTemplateText(text: string | undefined, values: Record<string, string>): string {
  return String(text || '').replace(VAR_RE, (all: string, k: string) => (values[k] ? values[k] : all))
}

/** Meta `message_templates` item → summary used by the inbox */
export function summarizeTemplate(t: any): WhatsAppTemplateSummary {
  const comps: any[] = t?.components || []
  const header = comps.find((c) => c.type === 'HEADER')
  const body = comps.find((c) => c.type === 'BODY')
  const footer = comps.find((c) => c.type === 'FOOTER')
  const buttons: any[] = comps.find((c) => c.type === 'BUTTONS')?.buttons || []
  let unsupportedReason: string | undefined
  if (header && header.format && header.format !== 'TEXT') unsupportedReason = `needs a ${String(header.format).toLowerCase()} header`
  else if (buttons.some((b) => b.type === 'URL' && /\{\{/.test(b.url || ''))) unsupportedReason = 'has a link button with a variable'
  else if (buttons.some((b) => ['COPY_CODE', 'OTP', 'FLOW', 'CATALOG', 'MPM'].includes(b.type))) unsupportedReason = 'has a special button'
  const headerText: string | undefined = header?.format === 'TEXT' ? header.text : undefined
  return {
    name: t.name,
    language: t.language,
    category: t.category,
    headerText,
    bodyText: body?.text || '',
    footerText: footer?.text,
    headerVariables: templateVariables(headerText),
    bodyVariables: templateVariables(body?.text),
    parameterFormat: t.parameter_format === 'NAMED' ? 'NAMED' : 'POSITIONAL',
    supported: !unsupportedReason,
    unsupportedReason,
  }
}

/** Build the Cloud API `components` array for a template from the filled-in variable values */
export function buildTemplateComponents(tpl: WhatsAppTemplateSummary, values: Record<string, string>): any[] {
  const param = (key: string) => ({
    type: 'text',
    text: values[key] || '-',
    ...(tpl.parameterFormat === 'NAMED' ? { parameter_name: key } : {}),
  })
  const components: any[] = []
  if (tpl.headerVariables.length) components.push({ type: 'header', parameters: tpl.headerVariables.map(param) })
  if (tpl.bodyVariables.length) components.push({ type: 'body', parameters: tpl.bodyVariables.map(param) })
  return components
}

/** Server-side: approved templates of the WhatsApp Business Account (WHATSAPP_BUSINESS_ACCOUNT_ID) */
export async function listApprovedWhatsAppTemplates(): Promise<{
  templates: WhatsAppTemplateSummary[]
  source: 'meta' | 'fallback'
  note?: string
}> {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!wabaId || !accessToken) {
    return {
      templates: FALLBACK_WHATSAPP_TEMPLATES,
      source: 'fallback',
      note: 'Only the built-in sample template is shown. To list your approved templates, the admin needs to set WHATSAPP_BUSINESS_ACCOUNT_ID (WhatsApp Manager → the WhatsApp Business Account ID) on this deployment.',
    }
  }
  const templates: WhatsAppTemplateSummary[] = []
  let url: string | undefined = `https://graph.facebook.com/v20.0/${wabaId}/message_templates?status=APPROVED&limit=100&fields=name,language,status,category,components,parameter_format`
  for (let page = 0; url && page < 5; page++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new WhatsAppApiError(data?.error?.message || 'Failed to list WhatsApp templates', data?.error, res.status)
    for (const t of data.data || []) if (!t.status || t.status === 'APPROVED') templates.push(summarizeTemplate(t))
    url = data.paging?.next
  }
  templates.sort((a, b) => Number(b.supported) - Number(a.supported) || a.name.localeCompare(b.name))
  return { templates, source: 'meta' }
}
