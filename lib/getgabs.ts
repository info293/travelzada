/**
 * Server-only: GetGabs WhatsApp API (sender +91 88900 59568).
 * Requires GETGABS_API_KEY, GETGABS_SENDER, GETGABS_CAMPAIGN_ID in env.
 * Message / template components use the same shape as Meta's Cloud API.
 * Docs: https://documenter.getpostman.com/view/40451098/2sAYJ1k2VV
 */

import { classifyGetGabsError, getGabsErrorHint, type GetGabsErrorKind } from '@/lib/whatsappDiagnostics'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp'
import {
  summarizeGetGabsSkeleton,
  WHATSAPP_BUSINESS_NUMBERS,
  type GetGabsTemplateListItem,
  type GetGabsTemplateSummary,
  type WhatsAppChannel,
} from '@/lib/getgabsTemplates'

const BASE = 'https://app.getgabs.com'

function config() {
  const apiKey = process.env.GETGABS_API_KEY?.trim()
  const sender = process.env.GETGABS_SENDER?.trim()
  const campaignId = process.env.GETGABS_CAMPAIGN_ID?.trim()
  if (!apiKey || !sender || !campaignId) {
    throw new GetGabsApiError('GetGabs is not configured (GETGABS_API_KEY, GETGABS_SENDER, GETGABS_CAMPAIGN_ID).', {
      kind: 'not_configured',
    })
  }
  return { apiKey, sender, campaignId }
}

export const isGetGabsConfigured = () => !!(process.env.GETGABS_API_KEY && process.env.GETGABS_SENDER && process.env.GETGABS_CAMPAIGN_ID)

/**
 * Which connection the admin inbox sends from: WHATSAPP_INBOX_PROVIDER = "getgabs" | "meta".
 * Default: GetGabs when it is configured, else Meta.
 */
export function inboxProvider(): WhatsAppChannel {
  const v = process.env.WHATSAPP_INBOX_PROVIDER?.trim().toLowerCase()
  if (v === 'meta') return 'meta'
  if (v === 'getgabs') return 'getgabs'
  return isGetGabsConfigured() ? 'getgabs' : 'meta'
}

/** Digits of the business number a channel sends from */
export function businessNumberFor(channel: WhatsAppChannel): string {
  if (channel === 'getgabs') {
    const s = (process.env.GETGABS_SENDER || '').replace(/\D/g, '')
    return s.length >= 10 ? normalizeWhatsAppNumber(s) : WHATSAPP_BUSINESS_NUMBERS.getgabs.digits
  }
  return WHATSAPP_BUSINESS_NUMBERS.meta.digits
}

/** "+91 98765-43210" / "9876543210" → "919876543210" */
export function getGabsNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

/* ------------------------------------------------------------------------------------------------
 * Errors
 * ---------------------------------------------------------------------------------------------- */

/** A failed GetGabs call, with a plain-language `hint` for staff */
export class GetGabsApiError extends Error {
  kind: GetGabsErrorKind
  hint?: string
  httpStatus?: number
  /** Meta error code when GetGabs passed one through */
  metaCode?: number
  raw?: any
  constructor(message: string, opts: { kind?: GetGabsErrorKind; httpStatus?: number; metaCode?: number; raw?: any } = {}) {
    super(message)
    this.name = 'GetGabsApiError'
    this.httpStatus = opts.httpStatus
    this.metaCode = opts.metaCode
    this.raw = opts.raw
    this.kind = opts.kind || classifyGetGabsError(message, opts.httpStatus, opts.metaCode)
    this.hint = getGabsErrorHint(this.kind, this.metaCode)
  }
}

const isFailure = (res: Response, data: any) =>
  !res.ok || !!data?.error || data?.status === false || data?.success === false || data?.status === 'error' || !!data?.errors

function errorFrom(res: Response, data: any, what: string) {
  const err = data?.error ?? data?.errors?.[0]
  const msg =
    (typeof err === 'object' && (err?.error_data?.details || err?.message || err?.title)) ||
    (typeof err === 'string' && err) ||
    (typeof data?.message === 'string' && data.message) ||
    data?.raw ||
    `HTTP ${res.status}`
  const metaCode = typeof err === 'object' && Number.isFinite(Number(err?.code)) ? Number(err.code) : undefined
  return new GetGabsApiError(`GetGabs: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`, {
    httpStatus: res.status,
    metaCode,
    raw: { what, data },
  })
}

async function readJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text.slice(0, 500) }
  }
}

/** POST a JSON body (with api_key) to a public GetGabs endpoint */
async function postPublic(path: string, body: Record<string, any>, what: string) {
  const { apiKey } = config()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...body, api_key: apiKey }),
    cache: 'no-store',
  })
  const data = await readJson(res)
  if (isFailure(res, data)) {
    console.error(`[GetGabs] ${what} failed:`, res.status, data)
    throw errorFrom(res, data, what)
  }
  return data
}

/* ------------------------------------------------------------------------------------------------
 * Partner session token (Authorization: Bearer …), valid 24h — cached ~23h in memory
 * ---------------------------------------------------------------------------------------------- */

let tokenCache: { token: string; exp: number } | null = null

async function sessionToken(apiKey: string, fresh = false): Promise<string> {
  if (!fresh && tokenCache && Date.now() < tokenCache.exp) return tokenCache.token
  const res = await fetch(`${BASE}/partners/getSessionToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
    cache: 'no-store',
  })
  const json = await readJson(res)
  if (!json.access_token) {
    tokenCache = null
    throw new GetGabsApiError(`GetGabs session: ${json.message || json.error || `HTTP ${res.status}`}`, { kind: 'auth', httpStatus: res.status })
  }
  const ttl = Math.min(Number(json.expires_in) || 86400, 86400) * 1000
  tokenCache = { token: json.access_token, exp: Date.now() + ttl - 60 * 60 * 1000 }
  return tokenCache.token
}

/** POST to a partner endpoint (Bearer session token + adminauthToken). Retries once with a fresh token on 401. */
async function postPartner(path: string, body: Record<string, any>, what: string) {
  const { apiKey } = config()
  for (let attempt = 0; ; attempt++) {
    const token = await sessionToken(apiKey, attempt > 0)
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ adminauthToken: apiKey, ...body }),
      cache: 'no-store',
    })
    const data = await readJson(res)
    if ((res.status === 401 || res.status === 403) && attempt === 0) {
      tokenCache = null
      continue
    }
    if (isFailure(res, data)) {
      console.error(`[GetGabs] ${what} failed:`, res.status, data)
      throw errorFrom(res, data, what)
    }
    return data
  }
}

/* ------------------------------------------------------------------------------------------------
 * Sending
 * ---------------------------------------------------------------------------------------------- */

export async function sendGetGabsTemplate(to: string, templateName: string, components: any[] = [], languageCode = 'en') {
  const { sender, campaignId } = config()
  return postPublic(
    '/whatsappbusiness/send-templated-message',
    {
      sender,
      campaign_id: campaignId,
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: getGabsNumber(to),
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, ...(components.length ? { components } : {}) },
    },
    `template ${templateName}`
  )
}

/** Free-form text (only inside the customer's 24-hour window on +91 88900 59568) */
export async function sendGetGabsText(to: string, body: string, previewUrl = true) {
  return postPublic(
    '/sendservicemessages/sendmessages',
    {
      to: getGabsNumber(to),
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'text',
      text: { body, preview_url: previewUrl },
    },
    'text message'
  )
}

/** Image or document by public link (only inside the 24-hour window) */
export async function sendGetGabsMedia(
  to: string,
  media: { kind: 'image' | 'document'; link: string; caption?: string; filename?: string }
) {
  const payload =
    media.kind === 'image'
      ? { type: 'image', image: { link: media.link, ...(media.caption ? { caption: media.caption } : {}) } }
      : {
          type: 'document',
          document: {
            link: media.link,
            filename: media.filename || 'document.pdf',
            ...(media.caption ? { caption: media.caption } : {}),
          },
        }
  return postPublic(
    '/sendservicemessages/sendmessages',
    { to: getGabsNumber(to), messaging_product: 'whatsapp', recipient_type: 'individual', ...payload },
    `${media.kind} message`
  )
}

/** The WhatsApp message id ("wamid…") from a GetGabs send response, if any */
export const getGabsMessageId = (data: any): string | undefined =>
  data?.messages?.[0]?.id || data?.message_id || data?.data?.messages?.[0]?.id || data?.data?.message_id || undefined

/* ------------------------------------------------------------------------------------------------
 * Delivery status (GetGabs has no status webhook for API sends) — POST getmessgageinfobyid (sic)
 * ---------------------------------------------------------------------------------------------- */

export type GetGabsDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed'

export async function getGetGabsMessageStatus(
  messageId: string
): Promise<{ status: GetGabsDeliveryStatus; raw: string; errorMessage: string | null }> {
  const data = await postPublic('/whatsappbusiness/getmessgageinfobyid', { message_id: messageId }, 'message status')
  const raw = String(data?.message?.status ?? data?.data?.status ?? '').toLowerCase()
  const errorMessage = data?.message?.error_message ?? data?.data?.error_message ?? null
  const status: GetGabsDeliveryStatus = /read|seen/.test(raw)
    ? 'read'
    : /deliver/.test(raw)
      ? 'delivered'
      : /fail|error|undeliver|reject/.test(raw) || errorMessage
        ? 'failed'
        : 'sent'
  return { status, raw, errorMessage: errorMessage ? String(errorMessage) : null }
}

/* ------------------------------------------------------------------------------------------------
 * Templates
 * ---------------------------------------------------------------------------------------------- */

const TEMPLATE_LIST_TTL = 10 * 60 * 1000
const SKELETON_TTL = 30 * 60 * 1000
let templateListCache: { at: number; list: GetGabsTemplateListItem[] } | null = null
const skeletonCache = new Map<string, { at: number; data: any }>()

/**
 * All templates submitted to Meta (rows with a template_id; GetGabs doesn't expose approval status here),
 * every page of `fetchAll`, de-duplicated by name + language. Cached 10 minutes in memory.
 */
export async function listGetGabsTemplates(opts: { fresh?: boolean } = {}): Promise<GetGabsTemplateListItem[]> {
  if (!opts.fresh && templateListCache && Date.now() - templateListCache.at < TEMPLATE_LIST_TTL) return templateListCache.list
  const rows: any[] = []
  let lastPage = 1
  for (let page = 1; page <= lastPage && page <= 30; page++) {
    const json = await postPartner(`/partners/api/template/fetchAll?page=${page}`, {}, 'template list')
    rows.push(...(json.data || []))
    lastPage = Number(json.last_page) || 1
  }
  const byKey = new Map<string, GetGabsTemplateListItem>()
  for (const r of rows) {
    if (!r?.template_id || !r?.template_name) continue // never submitted to Meta
    const item: GetGabsTemplateListItem = {
      name: String(r.template_name),
      language: String(r.language || 'en'),
      category: String(r.category || '').toUpperCase(),
      templateId: String(r.template_id),
    }
    byKey.set(`${item.name}|${item.language}`, item)
  }
  const list = Array.from(byKey.values()).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  templateListCache = { at: Date.now(), list }
  return list
}

/** Ready-to-send payload skeleton (with sample values) of one template — `fetchJson`, cached 30 min */
export async function getGetGabsTemplateSkeleton(templateName: string): Promise<any> {
  const hit = skeletonCache.get(templateName)
  if (hit && Date.now() - hit.at < SKELETON_TTL) return hit.data
  const data = await postPartner('/partners/api/template/fetchJson', { template_name: templateName }, `template json ${templateName}`)
  // Never keep credentials from the skeleton around
  if (data && typeof data === 'object') {
    delete data.api_key
    delete data.sender
  }
  skeletonCache.set(templateName, { at: Date.now(), data })
  return data
}

/** One template with its variables (header link / body params / URL buttons) derived from the skeleton */
export async function getGetGabsTemplate(name: string, language?: string): Promise<GetGabsTemplateSummary | null> {
  const list = await listGetGabsTemplates()
  const row = list.find((t) => t.name === name && (!language || t.language === language)) || list.find((t) => t.name === name)
  if (!row) return null
  return summarizeGetGabsSkeleton(row, await getGetGabsTemplateSkeleton(row.name))
}

/**
 * Looks a template up in GetGabs. Returns null when it doesn't exist or was never submitted to Meta (no template_id).
 * GetGabs doesn't expose approval status here.
 */
export async function findGetGabsTemplate(name: string): Promise<{ name: string; category: string; language: string } | null> {
  const t = (await listGetGabsTemplates()).find((x) => x.name === name)
  return t ? { name: t.name, category: t.category, language: t.language } : null
}

/* ------------------------------------------------------------------------------------------------
 * Inbound webhook ("Webhook URL for All Chats") — flat JSON, one message per POST
 * ---------------------------------------------------------------------------------------------- */

export interface GetGabsWebhookEvent {
  messageId: string
  /** Customer number, normalised to the inbox chat id ("91…") */
  from: string
  direction: 'inbound' | 'outbound'
  type: string
  subType?: string
  text: string
  mediaUrl: string | null
  timestamp: string
  profileName?: string
  /** WhatsApp id of the message this one replies to */
  replyToId?: string
  replyToText?: string
  buttonPayload?: string
  agentId?: string
  referralSourceType?: string
  referralSourceDomain?: string
  /** Raw delivery/event status from GetGabs ("success", "delivered", …) */
  status?: string
}

const MEDIA_LABEL: Record<string, string> = {
  image: '[Image]',
  video: '[Video]',
  audio: '[Voice Message]',
  voice: '[Voice Message]',
  document: '[Document]',
  sticker: '[Sticker]',
}

function tryJson(s: any): any {
  if (typeof s !== 'string') return s && typeof s === 'object' ? s : null
  const t = s.trim()
  if (!t.startsWith('{') && !t.startsWith('[')) return null
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

const str = (v: any) => (v === undefined || v === null ? '' : String(v)).trim()
/** GetGabs docs use placeholder strings like "(e.g. ad)" — ignore those */
const real = (v: any) => {
  const s = str(v)
  return s && !/^\(e\.g\./i.test(s) ? s : undefined
}

/** Pure parser for one GetGabs webhook payload. Returns null when it isn't a chat message event. */
export function parseGetGabsWebhook(payload: any): GetGabsWebhookEvent | null {
  if (!payload || typeof payload !== 'object') return null
  const messageId = str(payload.message_id || payload.messageId || payload.wamid || payload.id)
  const fromRaw = str(payload.message_from || payload.profile_wa_id || payload.from || payload.wa_id)
  if (!messageId || !fromRaw) return null
  const from = normalizeWhatsAppNumber(fromRaw)
  if (from.replace(/\D/g, '').length < 8) return null

  const type = str(payload.message_type || payload.type || 'text').toLowerCase()
  const subType = real(payload.message_sub_type)?.toLowerCase()
  const direction: 'inbound' | 'outbound' = str(payload.direction).toLowerCase() === 'outbound' ? 'outbound' : 'inbound'
  const rawText = typeof payload.message_text === 'string' ? payload.message_text : str(payload.message_text ?? payload.text ?? '')

  let text = rawText
  let mediaUrl: string | null = null
  let buttonPayload: string | undefined
  let replyToId = real(payload.targeted_message_id)

  const json = tryJson(rawText)
  if (json && !Array.isArray(json)) {
    // Button / interactive replies: message_text is Meta's raw message object as a JSON string
    text =
      str(json.button?.text) ||
      str(json.interactive?.button_reply?.title) ||
      str(json.interactive?.list_reply?.title) ||
      str(json.text?.body) ||
      str(json.image?.caption || json.video?.caption || json.document?.caption) ||
      str(json.document?.filename) ||
      (json.location ? `[Location: ${json.location.latitude}, ${json.location.longitude}]` : '') ||
      (json.order ? '[Order]' : '') ||
      (json.interactive?.nfm_reply ? '[Form reply]' : '') ||
      `[${type}]`
    buttonPayload = real(json.button?.payload) || real(json.interactive?.button_reply?.id) || real(json.interactive?.list_reply?.id)
    replyToId = replyToId || real(json.context?.id)
  } else if (/^https?:\/\//i.test(rawText.trim()) && (MEDIA_LABEL[type] || type === 'file')) {
    // Media: message_text is a GetGabs media URL (https://app.getgabs.com/customers/mediafile/<id>.jpeg)
    mediaUrl = rawText.trim()
    text = MEDIA_LABEL[type] || '[File]'
  } else if (!text && MEDIA_LABEL[type]) {
    text = MEDIA_LABEL[type]
  } else if (!text) {
    text = `[${type}]`
  }

  let replyToText: string | undefined
  const reply = tryJson(payload.replyformsg)
  if (reply && !Array.isArray(reply)) {
    replyToId = replyToId || real(reply.message_id)
    replyToText = real(reply.message_text)
  }

  const ts = Number(payload.timestamp)
  const timestamp =
    Number.isFinite(ts) && ts > 0
      ? new Date(ts < 1e12 ? ts * 1000 : ts).toISOString()
      : typeof payload.timestamp === 'string' && !isNaN(Date.parse(payload.timestamp))
        ? new Date(payload.timestamp).toISOString()
        : new Date().toISOString()

  return {
    messageId,
    from,
    direction,
    type: type || 'text',
    ...(subType ? { subType } : {}),
    text: text.slice(0, 4096),
    mediaUrl,
    timestamp,
    ...(real(payload.profile_name) ? { profileName: real(payload.profile_name)!.replace(/^~\s*/, '') } : {}),
    ...(replyToId ? { replyToId } : {}),
    ...(replyToText ? { replyToText: replyToText.slice(0, 300) } : {}),
    ...(buttonPayload ? { buttonPayload } : {}),
    ...(payload.sub_user_assigned_id !== undefined && payload.sub_user_assigned_id !== null
      ? { agentId: str(payload.sub_user_assigned_id) }
      : {}),
    ...(real(payload.referral_source_type) ? { referralSourceType: real(payload.referral_source_type) } : {}),
    ...(real(payload.referral_source_domain) ? { referralSourceDomain: real(payload.referral_source_domain) } : {}),
    ...(real(payload.status) ? { status: real(payload.status)!.toLowerCase() } : {}),
  }
}
