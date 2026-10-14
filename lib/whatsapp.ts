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
