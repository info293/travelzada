export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { formatPhoneNumber } from '@/lib/whatsapp'

/**
 * GET: Webhook Verification required by Meta Webhooks for Facebook Lead Ads (leadgen).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'travelzada_whatsapp_secret_2026'

    console.log('[Facebook Lead Ads Webhook GET] Verification request:', { mode, token, challenge })

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Facebook Lead Ads Webhook GET] Verification successful!')
      return new NextResponse(challenge || '', { status: 200 })
    }

    return new NextResponse('Forbidden: Token verification failed', { status: 403 })
  } catch (err: any) {
    console.error('[Facebook Lead Ads Webhook GET Error]:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

/**
 * POST: Handles incoming Lead Ad form submissions from Facebook & Instagram.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    console.log('[Facebook Lead Ads Webhook POST] Event received:', JSON.stringify(body))

    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value?.leadgen_id
            const formId = change.value?.form_id
            const pageId = change.value?.page_id
            const createdTime = change.value?.created_time

            console.log(`[Lead Ad Event] New lead received! Leadgen ID: ${leadgenId}`)

            if (leadgenId && accessToken) {
              // 1. Fetch full lead details from Meta Graph API
              const graphUrl = `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${accessToken}`
              const leadRes = await fetch(graphUrl)
              const leadData = await leadRes.json()

              if (leadRes.ok && leadData.field_data) {
                let name = 'Facebook Lead'
                let phone = ''
                let email = ''
                let destination = ''

                // Parse field data from lead form
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

                console.log(`[Parsed Lead Ad Data] Name: ${name}, Phone: ${standardizedPhone}, Email: ${email}`)

                // 2. Save lead into Firestore `leads` collection (Appears in Admin Dashboard Leads Tab!)
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

                // 3. Create or update WhatsApp Chat entry in `whatsapp_chats`
                if (standardizedPhone) {
                  const chatDocRef = doc(db, 'whatsapp_chats', standardizedPhone)
                  await setDoc(
                    chatDocRef,
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
              } else {
                console.error('[Meta Lead Fetch Error]:', leadData)
              }
            }
          }
        }
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 })
    }

    return NextResponse.json({ error: 'Not a page event' }, { status: 404 })
  } catch (err: any) {
    console.error('[Facebook Lead Ads Webhook Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
