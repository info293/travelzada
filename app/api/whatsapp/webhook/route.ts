export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  increment,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore'

/**
 * GET: Webhook Verification Endpoint required by Meta Dashboard setup.
 * Meta sends hub.mode, hub.verify_token, and hub.challenge parameters.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

    console.log('[WhatsApp Webhook GET] Handshake request received:', { mode, token, challenge })

    if (!verifyToken) {
      console.warn('[WhatsApp Webhook GET] WHATSAPP_VERIFY_TOKEN is not configured in .env')
      return new NextResponse('Server configuration error: WHATSAPP_VERIFY_TOKEN missing', { status: 500 })
    }

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook GET] Verification successful!')
      return new NextResponse(challenge || '', { status: 200 })
    }

    console.warn('[WhatsApp Webhook GET] Verification failed. Token mismatch or invalid mode.')
    return new NextResponse('Forbidden: Token verification failed', { status: 403 })
  } catch (err: any) {
    console.error('[WhatsApp Webhook GET Error]:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

/**
 * POST: Handles incoming WhatsApp messages, media, interactive responses, and status updates from Meta.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate that the request is from a WhatsApp business account
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value

          if (!value) continue

          const contactName = value.contacts?.[0]?.profile?.name || ''

          // 1. Process Inbound Messages
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              const senderPhone = message.from // Customer phone number
              const messageId = message.id
              const messageTimestamp = message.timestamp
                ? new Date(parseInt(message.timestamp) * 1000).toISOString()
                : new Date().toISOString()
              const messageType = message.type || 'text'

              let messageText = ''
              let mediaUrl = null

              if (messageType === 'text') {
                messageText = message.text?.body || ''
              } else if (messageType === 'image') {
                messageText = message.image?.caption || '[Image]'
                mediaUrl = message.image?.id || null
              } else if (messageType === 'audio') {
                messageText = '[Voice Message]'
              } else if (messageType === 'document') {
                messageText = message.document?.filename || '[Document]'
              } else if (messageType === 'location') {
                messageText = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`
              } else if (messageType === 'button') {
                messageText = message.button?.text || '[Button Click]'
              } else if (messageType === 'interactive') {
                messageText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[Interactive Reply]'
              } else {
                messageText = `[${messageType}]`
              }

              console.log(`[WhatsApp Inbound] Message from ${senderPhone} (${contactName}): "${messageText}"`)

              // Save message to Firestore `whatsapp_messages` collection
              await addDoc(collection(db, 'whatsapp_messages'), {
                whatsappMessageId: messageId,
                senderPhone,
                senderName: contactName || senderPhone,
                direction: 'inbound',
                type: messageType,
                text: messageText,
                mediaUrl,
                status: 'received',
                timestamp: messageTimestamp,
                createdAt: serverTimestamp(),
              })

              // Create or update chat entry in `whatsapp_chats` collection
              const chatDocRef = doc(db, 'whatsapp_chats', senderPhone)
              await setDoc(
                chatDocRef,
                {
                  phone: senderPhone,
                  customerName: contactName || senderPhone,
                  lastMessage: messageText,
                  lastMessageTimestamp: messageTimestamp,
                  lastDirection: 'inbound',
                  unreadCount: increment(1),
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              )
            }
          }

          // 2. Process Message Status Updates (sent, delivered, read, failed)
          if (value.statuses && value.statuses.length > 0) {
            for (const statusObj of value.statuses) {
              const messageId = statusObj.id
              const newStatus = statusObj.status // 'sent' | 'delivered' | 'read' | 'failed'
              const recipientPhone = statusObj.recipient_id

              console.log(`[WhatsApp Status Update] Message ${messageId} to ${recipientPhone} is now ${newStatus}`)

              // Query matching message in `whatsapp_messages` and update status
              const q = query(
                collection(db, 'whatsapp_messages'),
                where('whatsappMessageId', '==', messageId)
              )
              const querySnapshot = await getDocs(q)
              querySnapshot.forEach(async (docSnap) => {
                await updateDoc(doc(db, 'whatsapp_messages', docSnap.id), {
                  status: newStatus,
                  updatedAt: serverTimestamp(),
                })
              })
            }
          }
        }
      }

      // Meta requires immediate 200 OK response to prevent retry attempts
      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 })
    }

    return NextResponse.json({ error: 'Not a valid WhatsApp event' }, { status: 404 })
  } catch (err: any) {
    console.error('[WhatsApp Webhook POST Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
