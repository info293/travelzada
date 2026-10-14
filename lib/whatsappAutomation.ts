/**
 * Server-only: WhatsApp automation for Meta leads.
 *  - New lead → approved template "tz_lead_welcome" with a personalised proposal PDF as the header.
 *  - Customer taps a button → options sent as images ("Show me options"), callback flagged ("Call me back"),
 *    or lead closed ("Not interested").
 *  - No reply in 2 days → one "tz_followup" template.
 */
import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GRAPH, metaToken } from '@/lib/metaServer'
import {
  CRM_COLLECTION,
  STAGES,
  leadPhone,
  whatsappNumber,
  type CrmRecord,
  type MetaLead,
} from '@/lib/metaLeadsCrm'
import {
  fetchLead,
  fetchLeadsSince,
  getAutomationSettings,
  leadFacts,
  leadFirstName,
  pickPackages,
  saveAutomationSettings,
} from '@/lib/leadAutomation'
import { generateProposalPdf } from '@/lib/leadProposalPdf'
import {
  sendWhatsAppImageMessage,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
  uploadWhatsAppMedia,
} from '@/lib/whatsapp'

export const WELCOME_TEMPLATE = 'tz_lead_welcome'
export const FOLLOWUP_TEMPLATE = 'tz_followup'
const TEMPLATE_LANGUAGE = 'en'
const WABA_ID = process.env.WHATSAPP_WABA_ID || '1644894666204677'
const APP_ID = process.env.META_APP_ID || '1388719913348091'
const SITE_URL = (process.env.LEAD_EMAIL_SITE_URL || 'https://www.travelzada.com').replace(/\/$/, '')
const PHONE_DISPLAY = process.env.BUSINESS_PHONE_DISPLAY || '+91 85298 70220'
const SUPPORT_EMAIL = 'info@travelzada.com'
const FOLLOW_UP_AFTER_MS = 2 * 864e5
const SYSTEM_USER = { uid: 'automation', name: 'Travelzada Automation' }

const WELCOME_BODY =
  'Hi {{1}} 👋\n\nThank you for your interest in a {{2}} holiday with Travelzada! ✈️\n\n' +
  "We've attached your personalised {{2}} proposal with handpicked packages, hotels and prices. Everything can be customised to your dates and budget.\n\n" +
  'Tap "Show me options" to see them here on WhatsApp, or "Call me back" and our travel expert will call you.'
const FOLLOWUP_BODY =
  'Hi {{1}}, just checking in about your {{2}} trip 🌴\n\n' +
  'Prices for {{2}} change quickly around peak season. Would you like us to share the latest options and offers?\n\n' +
  'Just tap a button below or reply here.'

const BUTTONS = { options: 'show me options', callback: 'call me back', notInterested: 'not interested' }

// ---------- Templates ----------

export async function getTemplateStatuses(): Promise<Record<string, { status: string; reason?: string }>> {
  const res = await fetch(
    `${GRAPH}/${WABA_ID}/message_templates?fields=name,status,rejected_reason&limit=100&access_token=${metaToken()}`
  )
  const json = await res.json()
  if (json.error) throw new Error(`Templates: ${json.error.message}`)
  const out: Record<string, { status: string; reason?: string }> = {}
  for (const t of json.data || []) {
    if ([WELCOME_TEMPLATE, FOLLOWUP_TEMPLATE].includes(t.name)) {
      out[t.name] = { status: t.status, ...(t.rejected_reason && t.rejected_reason !== 'NONE' ? { reason: t.rejected_reason } : {}) }
    }
  }
  return out
}

/** Uploads a sample file with Meta's resumable upload API and returns the handle templates need for examples. */
async function uploadSampleHandle(data: ArrayBuffer, filename: string, mime: string): Promise<string> {
  const token = metaToken()
  const start = await (
    await fetch(
      `${GRAPH}/${APP_ID}/uploads?file_name=${encodeURIComponent(filename)}&file_length=${data.byteLength}&file_type=${encodeURIComponent(mime)}&access_token=${token}`,
      { method: 'POST' }
    )
  ).json()
  if (!start.id) throw new Error(`Upload session: ${start.error?.message || 'failed'}`)
  const done = await (
    await fetch(`${GRAPH}/${start.id}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${token}`, file_offset: '0' },
      body: Buffer.from(data),
    })
  ).json()
  if (!done.h) throw new Error(`Upload: ${done.error?.message || 'failed'}`)
  return done.h
}

/** Submits both templates to Meta for approval (skips ones that already exist). */
export async function submitTemplates() {
  const existing = await getTemplateStatuses()
  const results: Record<string, string> = {}

  if (!existing[WELCOME_TEMPLATE]) {
    const sample = await buildProposal({ id: 'sample', created_time: new Date().toISOString(), form_id: '', form_name: 'Bali Couple Package', field_data: [] } as MetaLead, 'Priya')
    const handle = await uploadSampleHandle(sample.pdf, 'Travelzada-Bali-Proposal.pdf', 'application/pdf')
    results[WELCOME_TEMPLATE] = await createTemplate({
      name: WELCOME_TEMPLATE,
      language: TEMPLATE_LANGUAGE,
      category: 'MARKETING',
      components: [
        { type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [handle] } },
        { type: 'BODY', text: WELCOME_BODY, example: { body_text: [['Priya', 'Bali']] } },
        { type: 'FOOTER', text: 'Travelzada · Curated holidays from Jaipur' },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'Show me options' },
            { type: 'QUICK_REPLY', text: 'Call me back' },
            {
              type: 'URL',
              text: 'View packages',
              url: `${SITE_URL}/destinations/{{1}}`,
              example: [`${SITE_URL}/destinations/bali-packages`],
            },
          ],
        },
      ],
    })
  } else results[WELCOME_TEMPLATE] = `already exists (${existing[WELCOME_TEMPLATE].status})`

  if (!existing[FOLLOWUP_TEMPLATE]) {
    results[FOLLOWUP_TEMPLATE] = await createTemplate({
      name: FOLLOWUP_TEMPLATE,
      language: TEMPLATE_LANGUAGE,
      category: 'MARKETING',
      components: [
        { type: 'BODY', text: FOLLOWUP_BODY, example: { body_text: [['Priya', 'Bali']] } },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'Show me options' },
            { type: 'QUICK_REPLY', text: 'Call me back' },
            { type: 'QUICK_REPLY', text: 'Not interested' },
          ],
        },
      ],
    })
  } else results[FOLLOWUP_TEMPLATE] = `already exists (${existing[FOLLOWUP_TEMPLATE].status})`

  return results
}

async function createTemplate(body: Record<string, unknown>) {
  const res = await fetch(`${GRAPH}/${WABA_ID}/message_templates?access_token=${metaToken()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (json.error) throw new Error(`${body.name}: ${json.error.error_user_msg || json.error.message}`)
  return `submitted (${json.status || 'PENDING'})`
}

// ---------- Proposal ----------

async function buildProposal(lead: MetaLead, firstName?: string) {
  const { destination, options, destSlug } = await pickPackages(lead)
  const pdf = await generateProposalPdf({
    leadId: lead.id,
    customerName: firstName || leadFirstName(lead),
    destination,
    facts: leadFacts(lead),
    options,
    siteUrl: SITE_URL,
    phoneDisplay: PHONE_DISPLAY,
    email: SUPPORT_EMAIL,
  })
  return { pdf, destination, options, destSlug }
}

// ---------- Recording ----------

/** Saves an outbound WhatsApp message so it shows in the WhatsApp inbox and on the lead */
async function recordOutbound(to: string, customerName: string, text: string, type: string, apiResponse: any) {
  const now = new Date().toISOString()
  await addDoc(collection(db, 'whatsapp_messages'), {
    whatsappMessageId: apiResponse?.messages?.[0]?.id || `outbound_${Date.now()}`,
    senderPhone: to,
    direction: 'outbound',
    type,
    text,
    status: 'sent',
    timestamp: now,
    createdAt: serverTimestamp(),
  })
  await setDoc(
    doc(db, 'whatsapp_chats', to),
    { phone: to, customerName, lastMessage: text.slice(0, 200), lastMessageTimestamp: now, lastDirection: 'outbound', updatedAt: serverTimestamp() },
    { merge: true }
  )
  return apiResponse?.messages?.[0]?.id as string | undefined
}

const activity = (outcome: string, notes?: string, by = SYSTEM_USER) => ({
  id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  type: 'whatsapp',
  outcome,
  ...(notes ? { notes } : {}),
  at: new Date().toISOString(),
  by,
})

// ---------- Welcome ----------

/**
 * Sends the welcome template with the lead's proposal PDF.
 * `testPhone`: send to this number instead of the customer. `sample`: don't record anything on the lead.
 */
export async function sendWhatsAppWelcome(lead: MetaLead, opts: { testPhone?: string; sample?: boolean; force?: boolean } = {}) {
  const ref = doc(db, CRM_COLLECTION, lead.id)
  const snap = await getDoc(ref)
  const rec = snap.exists() ? (snap.data() as CrmRecord) : null
  const prior = rec?.whatsappAuto
  const alreadySent = prior?.sentAt && !prior.error && (!prior.test || !!opts.testPhone)
  if (alreadySent && !opts.force && !opts.sample) return { skipped: 'already sent' }

  const customerPhone = whatsappNumber(leadPhone(lead))
  const to = opts.testPhone ? whatsappNumber(opts.testPhone) : customerPhone
  if (!to) return { skipped: 'lead has no phone number' }

  const statuses = await getTemplateStatuses()
  if (statuses[WELCOME_TEMPLATE]?.status !== 'APPROVED') {
    return { error: `Template "${WELCOME_TEMPLATE}" is not approved yet (${statuses[WELCOME_TEMPLATE]?.status || 'not submitted'})` }
  }

  const now = new Date().toISOString()
  const firstName = leadFirstName(lead)
  try {
    const { pdf, destination, destSlug } = await buildProposal(lead)
    const filename = `Travelzada-${destination.replace(/[^a-z0-9]+/gi, '-')}-Proposal.pdf`
    const mediaId = await uploadWhatsAppMedia(pdf, filename, 'application/pdf')
    const api = await sendWhatsAppTemplateMessage(to, WELCOME_TEMPLATE, TEMPLATE_LANGUAGE, [
      { type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename } }] },
      { type: 'body', parameters: [{ type: 'text', text: firstName }, { type: 'text', text: destination }] },
      { type: 'button', sub_type: 'url', index: '2', parameters: [{ type: 'text', text: destSlug || '?ref=whatsapp' }] },
    ])
    const text = WELCOME_BODY.replace(/\{\{1\}\}/g, firstName).replace(/\{\{2\}\}/g, destination)
    const messageId = await recordOutbound(to, opts.testPhone ? `TEST · ${firstName}` : leadFirstName(lead), `📄 ${filename}\n\n${text}`, 'template', api)

    if (opts.testPhone) await saveAutomationSettings({ whatsappTestLeadId: lead.id })
    if (opts.sample) return { sent: true, to, sample: true, destination }

    await updateDoc(ref, {
      whatsappAuto: { sentAt: now, to, ...(messageId ? { messageId } : {}), destination, test: !!opts.testPhone },
      activities: arrayUnion(activity(`WhatsApp welcome + proposal PDF sent${opts.testPhone ? ' (TEST)' : ''}`, `${destination} proposal: ${filename}`)),
      updatedAt: now,
    })
    return { sent: true, to, destination }
  } catch (err: any) {
    const error = String(err.message || err)
    if (!opts.sample && snap.exists()) await updateDoc(ref, { whatsappAuto: { sentAt: now, to, error, test: !!opts.testPhone }, updatedAt: now })
    return { error }
  }
}

// ---------- Button replies ----------

/** Called by the webhook for every inbound message; acts on the template's quick-reply buttons. */
export async function handleWhatsAppButton(senderPhone: string, text: string) {
  const action = Object.entries(BUTTONS).find(([, label]) => text.trim().toLowerCase() === label)?.[0]
  if (!action) return false

  const settings = await getAutomationSettings()
  const from = senderPhone.replace(/\D/g, '')
  const isTest = !!settings.whatsappTestPhone && whatsappNumber(settings.whatsappTestPhone) === from && !!settings.whatsappTestLeadId
  let leadId = isTest ? settings.whatsappTestLeadId! : null
  if (!leadId) {
    const snap = await getDocs(query(collection(db, CRM_COLLECTION), where('phoneNorm', '==', from), limit(1)))
    if (snap.empty) return false
    leadId = snap.docs[0].id
  }
  const ref = doc(db, CRM_COLLECTION, leadId)
  const recSnap = await getDoc(ref)
  const rec = recSnap.exists() ? (recSnap.data() as CrmRecord) : null
  const name = rec?.name?.split(' ')[0] || 'there'
  const tag = isTest ? ' (TEST)' : ''

  if (action === 'options') {
    const lead = await fetchLead(leadId)
    const { destination, options } = await pickPackages(lead)
    await reply(from, `Here are your handpicked ${destination} options, ${name} ✨`)
    for (const [i, o] of options.entries()) {
      const caption = `*Option ${i + 1}: ${o.name}*\n${[o.duration, o.hotels].filter(Boolean).join(' · ')}\n${o.price.replace('Starting ', 'Starting from ')}\n\nView itinerary: ${o.url}`
      if (o.image) {
        const api = await sendWhatsAppImageMessage(from, o.image, caption)
        await recordOutbound(from, name, `🖼️ ${caption}`, 'image', api)
      } else await reply(from, caption)
    }
    await reply(from, 'Reply with *1*, *2* or *3* to choose an option, or tell us what you would like to change (dates, hotels, budget). Our travel expert will get back to you shortly.')
    if (rec) await updateDoc(ref, { activities: arrayUnion(activity(`Customer tapped "Show me options"${tag}`, `${options.length} options sent automatically`)), updatedAt: new Date().toISOString() })
  }

  if (action === 'callback') {
    await reply(from, `Thank you, ${name}! 🙏 Our travel expert will call you shortly. If you prefer a particular time, just reply here.`)
    if (rec)
      await updateDoc(ref, {
        ...(isTest ? {} : { priority: 'hot', nextFollowUp: new Date().toISOString() }),
        activities: arrayUnion(activity(`Customer asked for a call back${tag}`, isTest ? undefined : 'Marked Hot · follow-up due now')),
        updatedAt: new Date().toISOString(),
      })
  }

  if (action === 'notInterested') {
    await reply(from, `No problem, ${name}. Thank you for letting us know! Whenever you plan your next holiday, just message us here 😊`)
    if (rec) {
      const fromLabel = STAGES.find((s) => s.id === rec.stage)?.label || 'New'
      await updateDoc(ref, {
        ...(isTest || ['won', 'lost'].includes(rec.stage) ? {} : { stage: 'lost', lostReason: 'Not interested', nextFollowUp: null }),
        activities: arrayUnion(
          isTest
            ? activity('Customer tapped "Not interested" (TEST)')
            : { ...activity('Customer tapped "Not interested"'), type: 'stage_change', outcome: `${fromLabel} → Lost`, notes: 'Reason: Not interested (WhatsApp button)' }
        ),
        updatedAt: new Date().toISOString(),
      })
    }
  }
  return true
}

async function reply(to: string, text: string) {
  const api = await sendWhatsAppTextMessage(to, text)
  await recordOutbound(to, '', text, 'text', api)
}

// ---------- Scheduled work ----------

/** New leads since WhatsApp automation was switched on → welcome; 2 days without reply → follow-up. */
export async function runWhatsAppAutomation(leadsHint?: MetaLead[]) {
  const settings = await getAutomationSettings()
  const summary = { welcomed: 0, followedUp: 0, failed: 0, errors: [] as string[] }
  if (!settings.whatsappEnabled) return summary
  const testPhone = settings.whatsappTestPhone || undefined

  const since = new Date(Math.max(new Date(settings.whatsappStartAt || Date.now()).getTime(), Date.now() - 7 * 864e5)).toISOString()
  const leads = (leadsHint || (await fetchLeadsSince(since))).filter((l) => new Date(l.created_time).getTime() >= new Date(since).getTime())
  for (const lead of leads) {
    const r = await sendWhatsAppWelcome(lead, { testPhone })
    if ('sent' in r) summary.welcomed++
    else if ('error' in r) {
      summary.failed++
      summary.errors.push(`${lead.id}: ${r.error}`)
    }
    if (testPhone && 'sent' in r) break // one test message per run is enough
  }

  // Follow-ups (real customers only)
  if (!testPhone) {
    const statuses = await getTemplateStatuses().catch(() => ({} as Record<string, { status: string }>))
    if (statuses[FOLLOWUP_TEMPLATE]?.status === 'APPROVED') {
      const all = await getDocs(collection(db, CRM_COLLECTION))
      for (const d of all.docs) {
        const rec = d.data() as CrmRecord
        const w = rec.whatsappAuto
        if (!w?.sentAt || w.error || w.test || w.followUpSentAt) continue
        if (Date.now() - new Date(w.sentAt).getTime() < FOLLOW_UP_AFTER_MS) continue
        if (['won', 'lost'].includes(rec.stage)) continue
        if (rec.lastReplyAt && rec.lastReplyAt > w.sentAt) continue
        const firstName = (rec.name || '').split(' ')[0] || 'there'
        const destination = w.destination || 'dream'
        try {
          const api = await sendWhatsAppTemplateMessage(w.to, FOLLOWUP_TEMPLATE, TEMPLATE_LANGUAGE, [
            { type: 'body', parameters: [{ type: 'text', text: firstName }, { type: 'text', text: destination }] },
          ])
          await recordOutbound(w.to, firstName, FOLLOWUP_BODY.replace(/\{\{1\}\}/g, firstName).replace(/\{\{2\}\}/g, destination), 'template', api)
          await updateDoc(d.ref, {
            'whatsappAuto.followUpSentAt': new Date().toISOString(),
            activities: arrayUnion(activity('WhatsApp follow-up sent (no reply in 2 days)')),
            updatedAt: new Date().toISOString(),
          })
          summary.followedUp++
        } catch (err: any) {
          await updateDoc(d.ref, { 'whatsappAuto.followUpSentAt': new Date().toISOString(), 'whatsappAuto.followUpError': String(err.message || err) })
          summary.failed++
          summary.errors.push(`follow-up ${d.id}: ${err.message || err}`)
        }
      }
    }
  }
  return summary
}

/** Sends the welcome for the newest lead to the test phone (nothing recorded on that lead). */
export async function sendWhatsAppSample() {
  const settings = await getAutomationSettings()
  if (!settings.whatsappTestPhone) throw new Error('Save a test WhatsApp number first.')
  const leads = await fetchLeadsSince(new Date(Date.now() - 90 * 864e5).toISOString())
  const lead = leads.filter((l) => leadPhone(l)).sort((a, b) => String(b.created_time).localeCompare(String(a.created_time)))[0]
  if (!lead) throw new Error('No lead with a phone number in the last 90 days.')
  const r = await sendWhatsAppWelcome(lead, { testPhone: settings.whatsappTestPhone, sample: true })
  if ('error' in r) throw new Error(r.error)
  return { ...r, formName: lead.form_name }
}

/** Instant welcome from the Meta leadgen webhook */
export async function processNewLeadWhatsApp(lead: MetaLead) {
  const settings = await getAutomationSettings()
  if (!settings.whatsappEnabled) return { skipped: 'WhatsApp automation disabled' }
  if (settings.whatsappStartAt && new Date(lead.created_time).getTime() < new Date(settings.whatsappStartAt).getTime()) return { skipped: 'older than start' }
  return sendWhatsAppWelcome(lead, { testPhone: settings.whatsappTestPhone || undefined })
}

