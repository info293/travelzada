export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { formatPhoneNumber } from '@/lib/whatsapp'

/**
 * POST or GET /api/facebook/sync-leads
 * Fetches past Facebook Lead Ad submissions from Meta Graph API and imports them into Firestore.
 */
export async function POST(req: NextRequest) {
  return handleSync(req)
}

export async function GET(req: NextRequest) {
  return handleSync(req)
}

async function handleSync(req: NextRequest) {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const defaultPageId = '341298722393022' // Travelzada.Official Page ID

    if (!accessToken) {
      return NextResponse.json(
        { error: 'WHATSAPP_ACCESS_TOKEN is missing in environment variables.' },
        { status: 400 }
      )
    }

    // 1. Get Page Access Token if available
    let pageAccessToken = accessToken

    try {
      const pageTokenUrl = `https://graph.facebook.com/v20.0/${defaultPageId}?fields=access_token,name&access_token=${accessToken}`
      const pageRes = await fetch(pageTokenUrl)
      const pageData = await pageRes.json()

      if (pageData.access_token) {
        pageAccessToken = pageData.access_token
      }
    } catch {
      // Fallback
    }

    let totalImported = 0
    let totalSkipped = 0

    // Fetch existing leadgen IDs in Firestore to prevent duplicates
    const existingLeadsSnap = await getDocs(collection(db, 'leads'))
    const existingLeadgenIds = new Set<string>()
    existingLeadsSnap.forEach((d) => {
      const data = d.data()
      if (data.leadgenId) {
        existingLeadgenIds.add(data.leadgenId)
      }
    })

    // Helper to process an array of raw lead objects from Meta
    const processLeadItems = async (leadItems: any[], formName = 'Meta Lead Ad') => {
      for (const leadItem of leadItems) {
        const leadgenId = leadItem.id
        const createdTime = leadItem.created_time || new Date().toISOString()

        if (existingLeadgenIds.has(leadgenId)) {
          totalSkipped++
          continue
        }

        let name = 'Facebook Lead'
        let phone = ''
        let email = ''
        let destination = ''

        if (leadItem.field_data && Array.isArray(leadItem.field_data)) {
          for (const field of leadItem.field_data) {
            const fieldName = field.name?.toLowerCase() || ''
            const fieldValue = field.values?.[0] || ''

            if (fieldName.includes('name') || fieldName.includes('full_name')) {
              name = fieldValue
            } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
              phone = fieldValue
            } else if (fieldName.includes('email')) {
              email = fieldValue
            } else if (
              fieldName.includes('destination') ||
              fieldName.includes('package') ||
              fieldName.includes('city')
            ) {
              destination = fieldValue
            }
          }
        }

        const cleanPhone = formatPhoneNumber(phone)
        const standardizedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone

        // Save into Firestore `leads` collection
        await addDoc(collection(db, 'leads'), {
          name: name || 'Ad Customer',
          mobile: standardizedPhone || phone,
          email: email || '',
          destination: destination || formName,
          packageName: destination ? `${destination} Package` : formName,
          sourceUrl: `https://facebook.com/ads/lead/${leadgenId}`,
          source: 'Facebook Lead Ad',
          status: 'new',
          read: false,
          leadgenId,
          pageId: defaultPageId,
          createdAt: createdTime,
        })

        // Save into `whatsapp_chats` collection for instant WhatsApp messaging
        if (standardizedPhone) {
          await setDoc(
            doc(db, 'whatsapp_chats', standardizedPhone),
            {
              phone: standardizedPhone,
              customerName: name || standardizedPhone,
              lastMessage: `Lead Form: ${destination || formName}`,
              lastMessageTimestamp: createdTime,
              lastDirection: 'inbound',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        }

        existingLeadgenIds.add(leadgenId)
        totalImported++
      }
    }

    // Method A: Fetch directly via Page Leads API endpoint
    const directLeadsUrl = `https://graph.facebook.com/v20.0/${defaultPageId}/leads?fields=created_time,field_data,id&access_token=${pageAccessToken}`
    const directRes = await fetch(directLeadsUrl)
    const directData = await directRes.json()

    if (directRes.ok && directData.data && Array.isArray(directData.data)) {
      await processLeadItems(directData.data, 'Facebook Lead Ad')
    } else {
      console.log('[Sync Leads] Direct page leads fetch returned:', directData)

      // Method B: Fetch leadgen forms
      const formsUrl = `https://graph.facebook.com/v20.0/${defaultPageId}/leadgen_forms?access_token=${pageAccessToken}`
      const formsRes = await fetch(formsUrl)
      const formsData = await formsRes.json()

      if (formsRes.ok && formsData.data) {
        for (const form of formsData.data) {
          const formLeadsUrl = `https://graph.facebook.com/v20.0/${form.id}/leads?fields=created_time,field_data,id&access_token=${pageAccessToken}`
          const formLeadsRes = await fetch(formLeadsUrl)
          const formLeadsData = await formLeadsRes.json()

          if (formLeadsRes.ok && formLeadsData.data) {
            await processLeadItems(formLeadsData.data, form.name || 'Lead Ad Form')
          }
        }
      } else {
        console.warn('[Sync Leads] Forms fetch failed:', formsData)
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: totalImported,
      skippedCount: totalSkipped,
      message: `🎉 Successfully synced ${totalImported} new Meta leads! (${totalSkipped} existing leads skipped)`,
    })
  } catch (err: any) {
    console.error('[Sync Meta Leads Error]:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to sync Meta leads' },
      { status: 500 }
    )
  }
}
