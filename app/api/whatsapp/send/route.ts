export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  formatPhoneNumber,
  WhatsAppApiError,
} from '@/lib/whatsapp'
import { serverWhatsAppEnv, whatsappErrorHint } from '@/lib/whatsappDiagnostics'
import { requireLeadsAccess } from '@/lib/metaServer'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

/**
 * POST /api/whatsapp/send
 * Request Body:
 * {
 *   "to": "+919876543210",
 *   "text": "Hello! Thank you for contacting Travelzada.",
 *   "templateName": "hello_world", // optional
 *   "languageCode": "en_US",      // optional
 *   "components": []               // optional
 * }
 */
export async function POST(req: NextRequest) {
  // Only logged-in staff may send WhatsApp messages from the business number
  const authError = await requireLeadsAccess(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { to, text, templateName, languageCode, components } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient phone number ("to") is required.' },
        { status: 400 }
      )
    }

    if (!text && !templateName) {
      return NextResponse.json(
        { error: 'Either "text" or "templateName" must be provided.' },
        { status: 400 }
      )
    }

    const cleanPhone = formatPhoneNumber(to)
    let apiResponse: any

    // 1. Send via WhatsApp Meta Cloud API
    if (templateName) {
      apiResponse = await sendWhatsAppTemplateMessage(
        cleanPhone,
        templateName,
        languageCode || 'en_US',
        components
      )
    } else {
      apiResponse = await sendWhatsAppTextMessage(cleanPhone, text)
    }

    const whatsappMessageId = apiResponse?.messages?.[0]?.id || `outbound_${Date.now()}`
    const nowIso = new Date().toISOString()
    const sentText = text || `[Template: ${templateName}]`

    // 2. Save outbound message to Firestore `whatsapp_messages`
    await addDoc(collection(db, 'whatsapp_messages'), {
      whatsappMessageId,
      senderPhone: cleanPhone,
      direction: 'outbound',
      type: templateName ? 'template' : 'text',
      text: sentText,
      status: 'sent',
      timestamp: nowIso,
      createdAt: serverTimestamp(),
    })

    // 3. Update active conversation in Firestore `whatsapp_chats`
    const chatDocRef = doc(db, 'whatsapp_chats', cleanPhone)
    await setDoc(
      chatDocRef,
      {
        phone: cleanPhone,
        lastMessage: sentText,
        lastMessageTimestamp: nowIso,
        lastDirection: 'outbound',
        unreadCount: 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      whatsappMessageId,
      recipient: cleanPhone,
      data: apiResponse,
    })
  } catch (err: any) {
    console.error('[WhatsApp Outbound Send Error]:', err)
    // Full details for the browser console: Meta's error, a plain-language hint, and the settings this
    // deployment is running with (token fingerprint only, never the token)
    const meta = err instanceof WhatsAppApiError ? err.meta : undefined
    return NextResponse.json(
      {
        error: err.message || 'Failed to send WhatsApp message',
        hint: whatsappErrorHint(meta?.code, meta?.error_subcode),
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
        server: serverWhatsAppEnv(),
      },
      { status: 500 }
    )
  }
}
