export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  sendWhatsAppImageMessage,
  normalizeWhatsAppNumber,
  resolveWhatsAppRef,
  getRoutingRoles,
  takeThreadControl,
  WhatsAppApiError,
} from '@/lib/whatsapp'
import { whatsappErrorHint } from '@/lib/whatsappDiagnostics'
import {
  inboxProvider,
  businessNumberFor,
  sendGetGabsText,
  sendGetGabsMedia,
  sendGetGabsTemplate,
  getGabsMessageId,
  GetGabsApiError,
} from '@/lib/getgabs'
import { isHttpsUrl } from '@/lib/getgabsTemplates'
import { requireLeadsAccess } from '@/lib/metaServer'
import { db } from '@/lib/firebase'
import { collection, addDoc, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

/**
 * POST /api/whatsapp/send   (staff only: admin or "leads" permission)
 * Request Body:
 * {
 *   "ref": "leads/abc123",          // preferred: record the number belongs to (resolved server-side)
 *   "to": "+919876543210",          // alternative raw number: admins, or an existing inbox chat
 *   "name": "Asha Verma",           // optional: saved as the chat's customer name
 *   "text": "Hello!",               // free-form text (only inside the customer's 24-hour window)
 *   "media": { "kind": "image" | "document", "link": "https://…", "caption"?: "…", "filename"?: "Quote.pdf" },
 *   "templateName": "hello_world",  // or a template (works any time)
 *   "languageCode": "en_US",
 *   "components": [],
 *   "previewText": "Hi Asha, …",    // optional: rendered template text to show in the inbox
 *   "retryOf": "<whatsapp_messages id of an earlier failed record>"
 * }
 * Sent from the active provider (WHATSAPP_INBOX_PROVIDER: "getgabs" → +91 88900 59568, "meta" → +91 85298 70220).
 * Messages are stored with `channel` and `businessNumber`.
 * Errors: { error, code, subcode, errorKind?, hint, canSendTemplate?, failedRecordId?, meta?, provider }
 */

/** True when the caller's profile has role "admin" (same logic as requireLeadsAccess / AuthContext) */
async function callerIsAdmin(req: NextRequest): Promise<boolean> {
  try {
    const idToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travelzada'
    if (!idToken || !apiKey) return false
    const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    const user = (await lookupRes.json()).users?.[0]
    if (!lookupRes.ok || !user) return false
    const userDocRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.localId}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    )
    if (userDocRes.ok) return ((await userDocRes.json()).fields?.role?.stringValue || 'user') === 'admin'
    const email = String(user.email || '').toLowerCase()
    return ['admin@travelzada.com', 'admin@example.com'].includes(email) || email.split('@')[0].includes('admin')
  } catch {
    return false
  }
}

const looksLikePhone = (s?: string) => !!s && !/[a-z]/i.test(s) && s.replace(/\D/g, '').length >= 7

function errorJson(status: number, body: Record<string, any>) {
  return NextResponse.json(body, { status })
}

export async function POST(req: NextRequest) {
  // Only logged-in staff may send WhatsApp messages from the business number
  const authError = await requireLeadsAccess(req)
  if (authError) return authError

  let body: any
  try {
    body = await req.json()
  } catch {
    return errorJson(400, { error: 'Invalid JSON body.', code: 'bad_request' })
  }
  const { to, ref, name, text, templateName, languageCode, components, previewText, retryOf } = body || {}
  const media =
    body?.media && typeof body.media === 'object'
      ? {
          kind: body.media.kind === 'document' ? ('document' as const) : ('image' as const),
          link: String(body.media.link || '').trim(),
          caption: body.media.caption ? String(body.media.caption).slice(0, 1024) : undefined,
          filename: body.media.filename ? String(body.media.filename).slice(0, 200) : undefined,
        }
      : null

  if (!text && !templateName && !media) {
    return errorJson(400, { error: 'Either "text", "media" or "templateName" must be provided.', code: 'bad_request' })
  }
  if (media && !isHttpsUrl(media.link)) {
    return errorJson(400, { error: 'The attachment needs a public https:// link.', code: 'bad_request' })
  }

  // Reply from the number the customer actually wrote to: the inbox passes `channel` for text/media when the
  // customer's last message (within 24h) went to a different business number than the default one.
  // Templates always go from the default number (GetGabs), where they are approved.
  const requested = body?.channel === 'meta' || body?.channel === 'getgabs' ? (body.channel as 'meta' | 'getgabs') : null
  const metaConfigured = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN)
  const provider: 'meta' | 'getgabs' =
    !templateName && requested === 'meta' && metaConfigured ? 'meta' : !templateName && requested === 'getgabs' ? 'getgabs' : inboxProvider()
  const businessNumber = businessNumberFor(provider)
  if (media && provider === 'meta' && media.kind === 'document') {
    return errorJson(400, { error: 'Sending documents is only supported from the GetGabs number.', code: 'bad_request' })
  }

  // ── 1. Work out the recipient. Prefer `ref` so the browser never has to know the number.
  let cleanPhone = ''
  let refName = ''
  try {
    if (ref) {
      const resolved = await resolveWhatsAppRef(String(ref))
      if (!resolved) {
        return errorJson(404, {
          error: 'Could not find a WhatsApp number for this customer.',
          code: 'ref_not_found',
          hint: 'The record may have been deleted or has no valid phone number.',
        })
      }
      cleanPhone = resolved.phone
      refName = resolved.name
    } else if (to) {
      cleanPhone = normalizeWhatsAppNumber(String(to))
      // Raw numbers: admins anywhere; other staff only for a conversation that already exists in the inbox
      if (!(await callerIsAdmin(req))) {
        const chat = cleanPhone ? await getDoc(doc(db, 'whatsapp_chats', cleanPhone)) : null
        if (!chat?.exists()) {
          return errorJson(403, {
            error: 'Only admins can message a new number directly.',
            code: 'forbidden',
            hint: 'Open the customer from their lead and use "Chat on WhatsApp".',
          })
        }
      }
    } else {
      return errorJson(400, { error: 'A recipient ("ref" or "to") is required.', code: 'bad_request' })
    }
  } catch (err: any) {
    console.error('[WhatsApp Send] recipient lookup failed:', err)
    return errorJson(500, { error: 'Could not look up the customer.', code: 'lookup_failed' })
  }
  if (cleanPhone.length < 8) {
    return errorJson(400, { error: 'This phone number is not valid for WhatsApp.', code: 'invalid_number' })
  }

  const isTemplate = !!templateName
  const msgType = isTemplate ? 'template' : media ? media.kind : 'text'
  const lang = languageCode || (provider === 'getgabs' ? 'en' : 'en_US')
  const sentText = isTemplate
    ? String(previewText || `[Template: ${templateName}]`)
    : media
      ? media.caption || (media.kind === 'document' ? `[Document] ${media.filename || ''}`.trim() : '[Image]')
      : String(text)
  const send = (): Promise<any> => {
    if (provider === 'getgabs') {
      if (isTemplate) return sendGetGabsTemplate(cleanPhone, templateName, Array.isArray(components) ? components : [], lang)
      if (media) return sendGetGabsMedia(cleanPhone, media)
      return sendGetGabsText(cleanPhone, String(text))
    }
    if (isTemplate) return sendWhatsAppTemplateMessage(cleanPhone, templateName, lang, components)
    if (media) return sendWhatsAppImageMessage(cleanPhone, media.link, media.caption)
    return sendWhatsAppTextMessage(cleanPhone, text)
  }
  // Stored on every message record (sent or failed)
  const messageExtras = {
    ...(isTemplate ? { templateName, languageCode: lang, components: components || [] } : {}),
    ...(media ? { mediaUrl: media.link, ...(media.filename ? { fileName: media.filename } : {}) } : {}),
    channel: provider,
    businessNumber,
  }

  const supersede = async () => {
    if (typeof retryOf === 'string' && /^[A-Za-z0-9]{10,40}$/.test(retryOf)) {
      await updateDoc(doc(db, 'whatsapp_messages', retryOf), { superseded: true }).catch(() => {})
    }
  }

  try {
    // ── 2. Send via the active provider
    let apiResponse: any
    let tookControl = false
    try {
      apiResponse = await send()
    } catch (err) {
      // Meta 131070: another app owns this chat thread. Templates aren't affected; for free-form messages we can
      // take control ONLY if this app has the "escalation" routing role — then resend once.
      const code = err instanceof WhatsAppApiError ? err.meta?.code : undefined
      if (provider !== 'meta' || code !== 131070 || isTemplate) throw err
      const roles = await getRoutingRoles().catch(() => ({ roles: [] as string[] }))
      if (!roles.roles.includes('escalation')) throw err
      try {
        await takeThreadControl(cleanPhone)
      } catch (takeErr) {
        console.error('[WhatsApp Send] take thread control failed:', takeErr)
        throw err // report the original 131070 (with its template fallback), not the take-control error
      }
      apiResponse = await send() // resend ONCE; if this fails too, it is reported as-is
      tookControl = true
    }

    const whatsappMessageId = getGabsMessageId(apiResponse) || `outbound_${Date.now()}`
    const nowIso = new Date().toISOString()

    // ── 3. Save outbound message to `whatsapp_messages` (only after the provider accepted it)
    await addDoc(collection(db, 'whatsapp_messages'), {
      whatsappMessageId,
      senderPhone: cleanPhone,
      direction: 'outbound',
      type: msgType,
      text: sentText,
      ...messageExtras,
      status: 'sent',
      timestamp: nowIso,
      createdAt: serverTimestamp(),
    })

    // ── 4. Update the conversation in `whatsapp_chats`
    const customerName = [name, refName].find((n) => n && !looksLikePhone(String(n)))
    await setDoc(
      doc(db, 'whatsapp_chats', cleanPhone),
      {
        phone: cleanPhone,
        ...(customerName ? { customerName: String(customerName) } : {}),
        ...(ref && !String(ref).startsWith('whatsapp_chats/') ? { sourceRef: String(ref) } : {}),
        lastMessage: sentText,
        lastMessageTimestamp: nowIso,
        lastDirection: 'outbound',
        lastOutboundAt: nowIso,
        channel: provider,
        businessNumber,
        unreadCount: 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
    await supersede()

    return NextResponse.json({
      success: true,
      whatsappMessageId,
      provider,
      // The number itself is only echoed back for raw-number (admin) sends
      ...(ref ? {} : { recipient: cleanPhone }),
      ...(tookControl ? { tookControl: true } : {}),
    })
  } catch (err: any) {
    console.error('[WhatsApp Outbound Send Error]:', err)
    const meta = err instanceof WhatsAppApiError ? err.meta : undefined
    const gg = err instanceof GetGabsApiError ? err : undefined
    const code: number | undefined = meta?.code ?? gg?.metaCode
    const errorKind = gg?.kind
    const hint = gg ? gg.hint : whatsappErrorHint(code, meta?.error_subcode)
    const canSendTemplate =
      !isTemplate && (code === 131047 || code === 131070 || code === 2494191 || errorKind === 'outside_window')

    // Keep a "failed" record (never "sent") so other staff see the attempt and the reason
    let failedRecordId: string | undefined
    try {
      const rec = await addDoc(collection(db, 'whatsapp_messages'), {
        whatsappMessageId: `failed_${Date.now()}`,
        senderPhone: cleanPhone,
        direction: 'outbound',
        type: msgType,
        text: sentText,
        ...messageExtras,
        status: 'failed',
        errorCode: code ?? null,
        errorTitle: meta?.message || err?.message || 'Failed to send',
        errorDetails: meta?.error_data?.details || null,
        ...(errorKind ? { errorKind } : {}),
        ...(hint ? { errorHint: hint } : {}),
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp(),
      })
      failedRecordId = rec.id
      await supersede()
    } catch (e) {
      console.error('[WhatsApp Send] could not store failed record:', e)
    }

    return errorJson(code === 131070 ? 409 : errorKind === 'rate_limit' ? 429 : 500, {
      error: err?.message || 'Failed to send WhatsApp message',
      code: code ?? null,
      subcode: meta?.error_subcode ?? null,
      ...(errorKind ? { errorKind } : {}),
      hint,
      canSendTemplate,
      failedRecordId,
      provider,
      meta: meta
        ? {
            code: meta.code,
            subcode: meta.error_subcode,
            type: meta.type,
            message: meta.message,
            details: meta.error_data?.details,
            isTransient: meta.is_transient,
            fbtraceId: meta.fbtrace_id,
            httpStatus: err.httpStatus,
          }
        : undefined,
    })
  }
}
