export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GRAPH, metaToken, requireLeadsAccess } from '@/lib/metaServer'
import { CRM_COLLECTION } from '@/lib/metaLeadsCrm'
import {
  fetchLead,
  fetchLeadsSince,
  getAutomationSettings,
  runAutomation,
  saveAutomationSettings,
  sendLeadReply,
  sendOptionsEmail,
} from '@/lib/leadAutomation'

const PAGE_ID = process.env.META_PAGE_ID || '341298722393022'

const isCron = (req: NextRequest) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}` || req.nextUrl.searchParams.get('key') === secret
}

/**
 * GET with CRON_SECRET (Vercel Cron / cron-job.org): runs the automation.
 * GET from the CRM: returns settings and status.
 */
export async function GET(req: NextRequest) {
  try {
    if (isCron(req)) return NextResponse.json({ success: true, ...(await runAutomation('scheduled')) })
    const authError = await requireLeadsAccess(req)
    if (authError) return authError
    const settings = await getAutomationSettings()
    return NextResponse.json({
      settings,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      imapUser: process.env.IMAP_USER || process.env.SMTP_USER || null,
      replyTo: process.env.LEAD_REPLY_TO || process.env.IMAP_USER || process.env.SMTP_USER || null,
      cronConfigured: !!process.env.CRON_SECRET,
      pageSubscribed: await pageSubscribedToLeads(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Automation status failed' }, { status: 500 })
  }
}

/**
 * POST from the CRM:
 *  { action: 'run' }                               run now (new leads + inbox)
 *  { action: 'save', settings: {...} }             enabled / testRecipient
 *  { action: 'send', leadId, force?, test? }       send the options email to one lead
 *  { action: 'reply', leadId, text, by }           email reply from the CRM
 *  { action: 'markRead', leadId }                  clear the "new reply" flag
 *  { action: 'subscribePage' }                     instant new-lead events from the Facebook Page
 */
export async function POST(req: NextRequest) {
  try {
    const authError = await requireLeadsAccess(req)
    if (authError) return authError
    const body = await req.json()
    const leadId = String(body.leadId || '')
    const validLead = /^\d+$/.test(leadId)

    switch (body.action) {
      case 'run':
        return NextResponse.json({ success: true, ...(await runAutomation('manual')) })

      case 'save': {
        const s = body.settings || {}
        const testRecipient = typeof s.testRecipient === 'string' ? s.testRecipient.trim() : undefined
        if (testRecipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient)) {
          return NextResponse.json({ error: 'Test recipient is not a valid email address.' }, { status: 400 })
        }
        const settings = await saveAutomationSettings({
          ...(typeof s.enabled === 'boolean' ? { enabled: s.enabled } : {}),
          ...(testRecipient !== undefined ? { testRecipient } : {}),
        })
        return NextResponse.json({ success: true, settings })
      }

      case 'send': {
        if (!validLead) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
        const settings = await getAutomationSettings()
        if (body.test && !settings.testRecipient) {
          return NextResponse.json({ error: 'Save a test email address first.' }, { status: 400 })
        }
        const lead = await fetchLead(leadId)
        const by = body.by?.uid ? { uid: String(body.by.uid), name: String(body.by.name || 'Sales') } : undefined
        const result = await sendOptionsEmail(lead, {
          force: !!body.force,
          // Test mode: never email the customer from the CRM
          testRecipient: settings.testRecipient || undefined,
          by,
        })
        if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 })
        return NextResponse.json({ success: true, ...result })
      }

      case 'sendSample': {
        // Preview: the options email for the newest lead with an email, sent only to the test address
        const settings = await getAutomationSettings()
        if (!settings.testRecipient) return NextResponse.json({ error: 'Save a test email address first.' }, { status: 400 })
        const leads = await fetchLeadsSince(new Date(Date.now() - 90 * 864e5).toISOString())
        const lead = leads
          .filter((l) => (l.field_data || []).some((f) => f.name === 'email' && f.values[0]))
          .sort((a, b) => String(b.created_time).localeCompare(String(a.created_time)))[0]
        if (!lead) return NextResponse.json({ error: 'No lead with an email address in the last 90 days.' }, { status: 404 })
        const result = await sendOptionsEmail(lead, { force: true, sample: true, testRecipient: settings.testRecipient })
        if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 })
        return NextResponse.json({ success: true, ...result, formName: lead.form_name })
      }

      case 'reply': {
        const text = String(body.text || '').trim()
        if (!validLead || !text) return NextResponse.json({ error: 'Lead and message are required' }, { status: 400 })
        const sent = await sendLeadReply(leadId, text.slice(0, 10000), {
          uid: String(body.by?.uid || 'sales'),
          name: String(body.by?.name || 'Travelzada Sales'),
        })
        return NextResponse.json({ success: true, ...sent })
      }

      case 'markRead':
        if (!validLead) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
        await updateDoc(doc(db, CRM_COLLECTION, leadId), { unreadReplies: 0 })
        return NextResponse.json({ success: true })

      case 'subscribePage': {
        const token = await pageAccessToken()
        const res = await fetch(`${GRAPH}/${PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token=${token}`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok || json.error) return NextResponse.json({ error: json.error?.message || 'Could not subscribe the Page' }, { status: 502 })
        return NextResponse.json({ success: true, pageSubscribed: await pageSubscribedToLeads() })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[Lead Automation Error]:', err)
    return NextResponse.json({ error: err.message || 'Automation failed' }, { status: 500 })
  }
}

async function pageAccessToken() {
  const token = metaToken()
  const json = await (await fetch(`${GRAPH}/${PAGE_ID}?fields=access_token&access_token=${token}`)).json()
  return json.access_token || token
}

async function pageSubscribedToLeads(): Promise<boolean> {
  try {
    const token = await pageAccessToken()
    const json = await (await fetch(`${GRAPH}/${PAGE_ID}/subscribed_apps?access_token=${token}`)).json()
    return (json.data || []).some((a: any) => (a.subscribed_fields || []).includes('leadgen'))
  } catch {
    return false
  }
}
