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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('[WhatsApp Cloud API Error]:', data)
    throw new Error(data.error?.message || 'Failed to send WhatsApp text message')
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('[WhatsApp Cloud API Error]:', data)
    throw new Error(data.error?.message || 'Failed to send WhatsApp template message')
  }

  return data
}
