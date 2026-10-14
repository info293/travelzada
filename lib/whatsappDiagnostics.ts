/**
 * Server-only: safe-to-share details about the WhatsApp setup of the running deployment.
 * Never returns the access token itself, only enough to tell which token is loaded.
 */

const GRAPH = 'https://graph.facebook.com/v20.0'

/** Which settings this deployment is actually running with */
export function serverWhatsAppEnv() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || ''
  return {
    deployment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    tokenSet: !!token,
    // First/last characters only, enough to compare with your .env
    tokenFingerprint: token ? `${token.slice(0, 6)}…${token.slice(-4)} (${token.length} chars)` : null,
    tokenHasWhitespaceOrQuotes: /[\s"']/.test(token),
  }
}

/** Plain-language fix for the Meta errors seen when sending */
export function whatsappErrorHint(code?: number, subcode?: number): string | undefined {
  switch (code) {
    case 190:
      return subcode === 463
        ? 'The access token has EXPIRED. Put the permanent System User token in WHATSAPP_ACCESS_TOKEN (Vercel → Settings → Environment Variables) and redeploy.'
        : 'The access token is INVALID or was revoked. Check WHATSAPP_ACCESS_TOKEN on this deployment (Vercel → Settings → Environment Variables), compare tokenFingerprint with your local .env, then redeploy.'
    case 10:
    case 200:
      return 'The token has no permission for this WhatsApp account. Use the System User token (travelzada_api) with whatsapp_business_messaging, assigned to the WhatsApp account.'
    case 100:
      return 'Invalid parameter, usually a wrong WHATSAPP_PHONE_NUMBER_ID on this deployment. It should be 1342447552283055 (+91 85298 70220).'
    case 131047:
      return 'Outside the 24-hour window: the customer has not messaged you in the last 24 hours. Send an approved template first.'
    case 131030:
      return 'The recipient is not on the allowed list of the test number.'
    case 131026:
      return 'The recipient cannot receive WhatsApp messages (not on WhatsApp, old app version, or blocked you).'
    case 131042:
      return 'Payment problem on the WhatsApp account. Add a payment method in Meta Billing.'
    case 132001:
      return 'Template not found in this WhatsApp account or language.'
    case 133010:
      return 'The phone number is not registered on the Cloud API.'
    case 2:
    case 1:
    case 4:
      return 'Temporary problem on Meta’s side. Try again in a minute.'
    default:
      return undefined
  }
}

/** Live check of the token and phone number this deployment uses */
export async function runWhatsAppDiagnostics() {
  const env = serverWhatsAppEnv()
  const token = process.env.WHATSAPP_ACCESS_TOKEN || ''
  const checks: Record<string, unknown> = {}

  if (!token) return { env, ok: false, problems: ['WHATSAPP_ACCESS_TOKEN is not set on this deployment.'], checks }

  const problems: string[] = []
  try {
    const dbg = await (await fetch(`${GRAPH}/debug_token?input_token=${token}&access_token=${token}`)).json()
    const d = dbg.data || {}
    checks.token = dbg.error
      ? { error: dbg.error.message, code: dbg.error.code }
      : {
          valid: d.is_valid,
          type: d.type,
          expiresAt: d.expires_at ? new Date(d.expires_at * 1000).toISOString() : 'never',
          hasMessagingPermission: (d.scopes || []).includes('whatsapp_business_messaging'),
          error: d.error?.message,
        }
    if (dbg.error || !d.is_valid) problems.push(`Token is not valid: ${dbg.error?.message || d.error?.message || 'unknown reason'}`)
    else {
      if (d.type !== 'SYSTEM_USER') problems.push(`Token type is ${d.type}, not SYSTEM_USER, so it will expire. Use the permanent System User token.`)
      if (!(d.scopes || []).includes('whatsapp_business_messaging')) problems.push('Token is missing the whatsapp_business_messaging permission.')
    }
  } catch (e: any) {
    problems.push(`Could not reach Meta to check the token: ${e.message}`)
  }

  if (env.phoneNumberId) {
    try {
      const ph = await (
        await fetch(`${GRAPH}/${env.phoneNumberId}?fields=display_phone_number,verified_name,status,health_status&access_token=${token}`)
      ).json()
      checks.phoneNumber = ph.error
        ? { error: ph.error.message, code: ph.error.code }
        : {
            number: ph.display_phone_number,
            name: ph.verified_name,
            status: ph.status,
            canSend: ph.health_status?.can_send_message,
          }
      if (ph.error) problems.push(`Phone number ID ${env.phoneNumberId} could not be read: ${ph.error.message}`)
      else if (ph.health_status?.can_send_message && ph.health_status.can_send_message !== 'AVAILABLE')
        problems.push(`Meta says this number can_send_message = ${ph.health_status.can_send_message}`)
    } catch (e: any) {
      problems.push(`Could not reach Meta to check the phone number: ${e.message}`)
    }
  } else problems.push('WHATSAPP_PHONE_NUMBER_ID is not set on this deployment.')

  if (env.tokenHasWhitespaceOrQuotes) problems.push('The token contains spaces or quotes. Remove them in the environment variable.')

  return { env, ok: problems.length === 0, problems, checks, checkedAt: new Date().toISOString() }
}
