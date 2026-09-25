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
import { formatPhoneNumber } from '@/lib/whatsapp'

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

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'travelzada_whatsapp_secret_2026'

    console.log('[Meta Webhook GET] Verification request received:', { mode, token, challenge })

    if (mode === 'subscribe' && (token === verifyToken || token === 'travelzada_whatsapp_secret_2026')) {
      console.log('[Meta Webhook GET] Verification successful!')
      return new NextResponse(challenge || '', { status: 200 })
    }

    console.warn('[Meta Webhook GET] Verification failed. Token mismatch or invalid mode.')
    return new NextResponse('Forbidden: Token verification failed', { status: 403 })
  } catch (err: any) {
    console.error('[Meta Webhook GET Error]:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

/**
 * POST: Handles incoming WhatsApp messages, delivery status updates, and Facebook/Instagram Lead Ads (leadgen).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    // 1. Process WhatsApp Business Account events
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value

          if (!value) continue

          const contactName = value.contacts?.[0]?.profile?.name || ''

          // A. Process Inbound WhatsApp Messages
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

          // B. Process Message Status Updates (sent, delivered, read, failed)
          if (value.statuses && value.statuses.length > 0) {
            for (const statusObj of value.statuses) {
              const messageId = statusObj.id
              const newStatus = statusObj.status

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

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 })
    }

    // 2. Process Facebook & Instagram Lead Ads events (page leadgen)
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value?.leadgen_id
            const formId = change.value?.form_id
            const pageId = change.value?.page_id

            console.log(`[Facebook Lead Ad Event] New lead received! Leadgen ID: ${leadgenId}`)

            if (leadgenId && accessToken) {
              const graphUrl = `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${accessToken}`
              const leadRes = await fetch(graphUrl)
              const leadData = await leadRes.json()

              if (leadRes.ok && leadData.field_data) {
                let name = 'Facebook Lead'
                let phone = ''
                let email = ''
                let destination = ''

                for (const field of leadData.field_data) {
                  const fieldName = field.name?.toLowerCase() || ''
                  const fieldValue = field.values?.[0] || ''

                  if (fieldName.includes('name') || fieldName.includes('full_name')) {
                    name = fieldValue
                  } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
                    phone = fieldValue
                  } else if (fieldName.includes('email')) {
                    email = fieldValue
                  } else if (fieldName.includes('destination') || fieldName.includes('package') || fieldName.includes('city')) {
                    destination = fieldValue
                  }
                }

                const cleanPhone = formatPhoneNumber(phone)
                const standardizedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone

                // Save to Firestore `leads` (Appears in Admin Dashboard Leads Tab!)
                await addDoc(collection(db, 'leads'), {
                  name: name || 'Ad Customer',
                  mobile: standardizedPhone || phone,
                  email: email || '',
                  destination: destination || 'Facebook Lead Ad',
                  packageName: destination ? `${destination} Package` : 'Meta Lead Ad Inquiry',
                  sourceUrl: `https://facebook.com/ads/lead/${leadgenId}`,
                  source: 'Facebook Lead Ad',
                  status: 'new',
                  read: false,
                  leadgenId,
                  formId,
                  pageId,
                  createdAt: new Date().toISOString(),
                })

                // Save to `whatsapp_chats`
                if (standardizedPhone) {
                  await setDoc(
                    doc(db, 'whatsapp_chats', standardizedPhone),
                    {
                      phone: standardizedPhone,
                      customerName: name || standardizedPhone,
                      lastMessage: `Lead form submission: ${destination || 'Ad Inquiry'}`,
                      lastMessageTimestamp: new Date().toISOString(),
                      lastDirection: 'inbound',
                      updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                  )
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 })
    }

    return NextResponse.json({ error: 'Not a recognized event' }, { status: 404 })
  } catch (err: any) {
    console.error('[Meta Webhook POST Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
