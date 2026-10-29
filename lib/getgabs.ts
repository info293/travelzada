/**
 * Server-only: GetGabs WhatsApp API (sender +91 88900 59568).
 * Requires GETGABS_API_KEY, GETGABS_SENDER, GETGABS_CAMPAIGN_ID in env.
 * Template components use the same shape as Meta's Cloud API.
 */

const BASE = 'https://app.getgabs.com'

function config() {
  const apiKey = process.env.GETGABS_API_KEY?.trim()
  const sender = process.env.GETGABS_SENDER?.trim()
  const campaignId = process.env.GETGABS_CAMPAIGN_ID?.trim()
  if (!apiKey || !sender || !campaignId) {
    throw new Error('GetGabs is not configured (GETGABS_API_KEY, GETGABS_SENDER, GETGABS_CAMPAIGN_ID).')
  }
  return { apiKey, sender, campaignId }
}

export const isGetGabsConfigured = () => !!(process.env.GETGABS_API_KEY && process.env.GETGABS_SENDER && process.env.GETGABS_CAMPAIGN_ID)

/** "+91 98765-43210" / "9876543210" → "919876543210" */
export function getGabsNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

export async function sendGetGabsTemplate(to: string, templateName: string, components: any[] = [], languageCode = 'en') {
  const { apiKey, sender, campaignId } = config()
  const res = await fetch(`${BASE}/whatsappbusiness/send-templated-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      sender,
      campaign_id: campaignId,
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: getGabsNumber(to),
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, ...(components.length ? { components } : {}) },
    }),
  })
  const text = await res.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text.slice(0, 500) }
  }
  const failed = !res.ok || data?.error || data?.status === false || data?.success === false || data?.status === 'error'
  if (failed) {
    const msg = data?.error?.message || data?.error || data?.message || data?.raw || `HTTP ${res.status}`
    console.error('[GetGabs] send failed:', templateName, data)
    throw new Error(`GetGabs: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`)
  }
  return data
}

async function sessionToken(apiKey: string) {
  const res = await fetch(`${BASE}/partners/getSessionToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error(`GetGabs session: ${json.message || json.error || 'failed'}`)
  return json.access_token as string
}

/**
 * Looks a template up in GetGabs. Returns null when it doesn't exist or was never submitted to Meta (no template_id).
 * GetGabs doesn't expose approval status here.
 */
export async function findGetGabsTemplate(name: string): Promise<{ name: string; category: string; language: string } | null> {
  const { apiKey } = config()
  const token = await sessionToken(apiKey)
  const res = await fetch(`${BASE}/partners/api/template/fetchAll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ adminauthToken: apiKey, searchValue: name }),
  })
  const json = await res.json()
  const t = (json.data || []).find((x: any) => x.template_name === name && x.template_id)
  return t ? { name: t.template_name, category: t.category, language: t.language } : null
}
