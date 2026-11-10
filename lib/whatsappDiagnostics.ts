/**
 * Plain-language explanations for WhatsApp Cloud API errors, shown to staff when a send fails.
 * Safe to import from both server routes and client components (no server-only dependencies).
 */

/**
 * 131070 — another app connected to the business number currently controls this chat.
 * Kept in one constant so the wording / fix can be updated in one place.
 */
export const WHATSAPP_131070_HINT =
  "Another app connected to this WhatsApp number (for example Meta's AI agent or a partner chatbot) is handling this chat, so a normal reply can't be sent. You can still send a template message now. To fix it permanently, an admin should open Meta Business Suite → Settings → Conversation Routing and either remove the other app or make the Travelzada website app the 'escalation' partner."

/** 131047 — free-form text is only allowed within 24 hours of the customer's last message */
export const WHATSAPP_24H_HINT =
  'Outside the 24-hour window: the customer has not messaged you in the last 24 hours, so WhatsApp only allows an approved template. Use "Send template" — once the customer replies you can chat freely again.'

/** Plain-language fix for the Meta errors seen when sending */
export function whatsappErrorHint(code?: number | null, subcode?: number | null): string | undefined {
  switch (code) {
    case 190:
      return subcode === 463
        ? 'The WhatsApp access token has EXPIRED. Ask the admin to put the permanent System User token in WHATSAPP_ACCESS_TOKEN (Vercel → Settings → Environment Variables) and redeploy.'
        : 'The WhatsApp access token is invalid, expired or was revoked. Ask the admin to update WHATSAPP_ACCESS_TOKEN on this deployment (Vercel → Settings → Environment Variables) and redeploy.'
    case 10:
    case 200:
      return 'The token has no permission for this WhatsApp account. Use the System User token (travelzada_api) with whatsapp_business_messaging, assigned to the WhatsApp account.'
    case 100:
      return 'Invalid parameter: usually a wrong template variable/language, a malformed number, or a wrong WHATSAPP_PHONE_NUMBER_ID on this deployment (it should be 1342447552283055, +91 85298 70220).'
    case 131047:
      return WHATSAPP_24H_HINT
    case 131070:
      return WHATSAPP_131070_HINT
    case 131026:
      return 'This number cannot receive WhatsApp messages: it is not on WhatsApp, is using an old app version, or has blocked the business number.'
    case 131048:
      return 'Meta limited sending because of spam signals (too many messages blocked or reported recently). Wait a while and send fewer, more relevant messages.'
    case 131049:
      return 'Meta did not deliver this message to keep the customer’s experience healthy (limit on marketing messages per person). Try again later, or wait for the customer to message you.'
    case 131056:
      return 'Too many messages sent to this customer in a short time. Wait a minute and try again.'
    case 130429:
    case 80007:
      return 'Rate limit reached on the WhatsApp number. Wait a minute and try again.'
    case 131000:
      return 'Something went wrong on WhatsApp’s side while sending. Try again; if it keeps failing, ask the admin to check the WhatsApp Manager.'
    case 131030:
      return 'The recipient is not on the allowed list of the test number.'
    case 131021:
      return 'You cannot message the business number itself.'
    case 131042:
      return 'Payment problem on the WhatsApp account. Add a payment method in Meta Billing.'
    case 131051:
      return 'This message type is not supported by WhatsApp.'
    case 132000:
      return 'The number of template variables does not match the template. Fill in every variable.'
    case 132001:
      return 'Template not found in this WhatsApp account or language.'
    case 132015:
    case 132016:
      return 'This template is paused or disabled by Meta. Pick another template.'
    case 133010:
      return 'The phone number is not registered on the Cloud API.'
    case 2494191:
      return "This app is not allowed to take control of the chat (it is not the 'escalation' partner in Conversation Routing). Send a template instead."
    case 368:
      return 'The WhatsApp account is temporarily blocked for policy violations. Check WhatsApp Manager → Account quality.'
    case 130472:
      return "The customer's number is part of a Meta experiment. Try again later."
    case 2:
    case 1:
    case 4:
      return 'Temporary problem on Meta’s side. Try again in a minute.'
    default:
      return undefined
  }
}

/** One-line "Not delivered: …" text for a failed message bubble */
export function whatsappFailureText(code?: number | null, title?: string | null, details?: string | null): string {
  const hint = whatsappErrorHint(code ?? undefined)
  if (hint) return `Not delivered: ${hint}`
  return `Not delivered${title ? `: ${title}` : ''}${details ? ` (${details})` : ''}${code ? ` [code ${code}]` : ''}`
}

/* ------------------------------------------------------------------------------------------------
 * GetGabs (BSP for +91 88900 59568). GetGabs passes some Meta error codes through and adds its own
 * plain-text errors, so failures are classified into a few kinds with one plain-language fix each.
 * ---------------------------------------------------------------------------------------------- */

export type GetGabsErrorKind =
  | 'auth'
  | 'invalid_number'
  | 'outside_window'
  | 'template'
  | 'rate_limit'
  | 'not_configured'
  | 'unknown'

export const GETGABS_ERROR_HINTS: Record<GetGabsErrorKind, string | undefined> = {
  auth: 'GetGabs rejected the API key. Ask the admin to check GETGABS_API_KEY (GetGabs → Settings → Developer Tools → API key) on this deployment and redeploy.',
  invalid_number:
    "This number can't receive WhatsApp messages from +91 88900 59568: it is wrong, not on WhatsApp, or has blocked the business number. Check the number with the customer.",
  outside_window:
    'Outside the 24-hour window on +91 88900 59568: the customer has not messaged THIS number in the last 24 hours (messages to the old number do not count), so WhatsApp only allows an approved template. Use "Send template" — once the customer replies you can chat freely again.',
  template:
    'The template was refused: it is not approved in GetGabs yet, or its variables / header link do not match. Fill in every field (a document or image header needs a public https link) or pick another template; check its status in GetGabs → Templates.',
  rate_limit: 'Too many messages in a short time (GetGabs / WhatsApp rate limit). Wait a minute and try again.',
  not_configured:
    'GetGabs is not configured on this deployment. Ask the admin to set GETGABS_API_KEY, GETGABS_SENDER and GETGABS_CAMPAIGN_ID, or set WHATSAPP_INBOX_PROVIDER=meta.',
  unknown: undefined,
}

/** Meta codes that GetGabs may pass through, mapped to a kind */
const META_CODE_KIND: Record<number, GetGabsErrorKind> = {
  131047: 'outside_window',
  131026: 'invalid_number',
  131030: 'invalid_number',
  130429: 'rate_limit',
  80007: 'rate_limit',
  131056: 'rate_limit',
  132000: 'template',
  132001: 'template',
  132012: 'template',
  132015: 'template',
  132016: 'template',
  190: 'auth',
}

/** Classify a GetGabs failure from its message, HTTP status and (optional) Meta error code */
export function classifyGetGabsError(message?: string | null, httpStatus?: number | null, metaCode?: number | null): GetGabsErrorKind {
  if (metaCode && META_CODE_KIND[metaCode]) return META_CODE_KIND[metaCode]
  const m = String(message || '')
  if (/not configured/i.test(m)) return 'not_configured'
  if (httpStatus === 429 || /rate.?limit|too many|throttl/i.test(m)) return 'rate_limit'
  if (httpStatus === 401 || httpStatus === 403 || /api.?key|unauthori[sz]ed|invalid token|authenticat|WABA Account Not Found|access denied/i.test(m))
    return 'auth'
  if (/24.?h|24 hours|re-?engagement|outside.*window|session.*(expired|closed|window)|customer service window|service window/i.test(m))
    return 'outside_window'
  if (/template/i.test(m) || /parameter|does not match|header/i.test(m)) return 'template'
  if (/invalid.*(number|phone|recipient|mobile)|(number|phone|recipient).*(invalid|not valid)|not (a )?(valid )?whatsapp|not on whatsapp|incapable|undeliverable/i.test(m))
    return 'invalid_number'
  return 'unknown'
}

/** Plain-language fix for a GetGabs failure (falls back to the Meta hint for passed-through codes) */
export function getGabsErrorHint(kind?: GetGabsErrorKind | string | null, metaCode?: number | null): string | undefined {
  const hint = kind ? GETGABS_ERROR_HINTS[kind as GetGabsErrorKind] : undefined
  if (hint) return hint
  // Meta hints that talk about Meta tokens / phone number ids don't apply to GetGabs
  if (metaCode && ![190, 10, 200, 100, 133010, 131070, 2494191].includes(metaCode)) return whatsappErrorHint(metaCode)
  return undefined
}
