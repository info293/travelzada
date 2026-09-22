export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  formatPhoneNumber,
} from '@/lib/whatsapp'
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
    return NextResponse.json(
      { error: err.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    )
  }
}
