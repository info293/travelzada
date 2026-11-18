/**
 * Server-only: WhatsApp automation for Meta leads. Sends from the active inbox provider (`inboxProvider()`):
 *
 * GetGabs (+91 88900 59568, default):
 *  - New lead → approved GetGabs template GETGABS_WELCOME_TEMPLATE (default "tz_enquiry_received"). The personalised
 *    proposal PDF is uploaded to ImageKit; it goes in the template header when that template has a DOCUMENT header,
 *    otherwise it is sent as a document as soon as the customer taps a button (their 24-hour window is then open).
 *  - Buttons (via the GetGabs webhook): "Share my dates" → proposal PDF + ask for dates, "Call me back" → lead Hot,
 *    "Yes, send ideas" / "Show me options" → proposal PDF + options as images, "Change destination" → ask which one,
 *    "Stop messages" → opted out (see handleOptOutReply), "Not interested" → lead Lost. Replies are free-form.
 *  - No reply in 2 days → one GETGABS_FOLLOWUP_TEMPLATE (default "tz_lead_followup_day5").
 *
 * Meta Cloud API (+91 85298 70220, WHATSAPP_INBOX_PROVIDER=meta):
 *  - New lead → "tz_lead_welcome" with the proposal PDF as the header; "tz_followup" after 2 days;
 *    buttons "Show me options" / "Call me back" / "Not interested".
 *
 * Numbers in `whatsapp_optouts` never get the automated welcome / follow-up.
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
import {
  businessNumberFor,
  getGabsMessageId,
  getGetGabsTemplate,
  inboxProvider,
  listGetGabsTemplates,
  sendGetGabsMedia,
  sendGetGabsTemplate,
  sendGetGabsText,
} from '@/lib/getgabs'
import { WHATSAPP_BUSINESS_NUMBERS, type WhatsAppChannel } from '@/lib/getgabsTemplates'
import {
  buttonValueKey,
  dynamicUrlButtons,
  getCatalogTemplate,
  reconcileWithLive,
  type CatalogTemplate,
  type VariableSource,
} from '@/lib/whatsapp/templateCatalog'
import {
  buildComponents,
  hasMediaHeader,
  missingFields,
  previewText,
  type HeaderMediaValue,
  type TemplateValues,
} from '@/components/admin/whatsapp/templates/templateSend'
import { isOptedOut } from '@/lib/whatsapp/broadcasts'

// ---------- Configuration ----------

/** Meta Cloud API templates (exist only on the Meta number +91 85298 70220) */
export const WELCOME_TEMPLATE = 'tz_lead_welcome'
export const FOLLOWUP_TEMPLATE = 'tz_followup'
const TEMPLATE_LANGUAGE = 'en'

/**
 * GetGabs templates (approved on +91 88900 59568). Override with env without a code change.
 * Welcome: any template works; if it has a DOCUMENT header the proposal PDF goes in it, an IMAGE header gets the
 * first package photo. Variables are filled from the catalog's `source`s (first name, destination, trip type…)
 * plus GETGABS_FIXED_VALUES below.
 */
export const GETGABS_WELCOME_TEMPLATE = process.env.WHATSAPP_AUTO_WELCOME_TEMPLATE?.trim() || 'tz_enquiry_received'
export const GETGABS_FOLLOWUP_TEMPLATE = process.env.WHATSAPP_AUTO_FOLLOWUP_TEMPLATE?.trim() || 'tz_lead_followup_day5'
const GETGABS_TEMPLATE_LANGUAGE = 'en'
/** tz_enquiry_received {{4}}: "Your personal travel designer will share a free, day-by-day itinerary within {{4}}." */
const WELCOME_ITINERARY_ETA = process.env.WHATSAPP_AUTO_ITINERARY_ETA?.trim() || '24 hours'
/** Values for template variables that have no customer source, by template name → {{index}} */
const GETGABS_FIXED_VALUES: Record<string, Record<number, string>> = {
  tz_enquiry_received: { 4: WELCOME_ITINERARY_ETA },
}
/** ImageKit folder for the proposal PDFs (GetGabs needs a public https link for documents) */
const PROPOSAL_FOLDER = '/proposals'
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload'

const WABA_ID = process.env.WHATSAPP_WABA_ID || '1644894666204677'
const APP_ID = process.env.META_APP_ID || '1388719913348091'
const SITE_URL = (process.env.LEAD_EMAIL_SITE_URL || 'https://www.travelzada.com').replace(/\/$/, '')
const SUPPORT_EMAIL = 'info@travelzada.com'
const FOLLOW_UP_AFTER_MS = 2 * 864e5
const SYSTEM_USER = { uid: 'automation', name: 'Travelzada Automation' }

/** Number printed on the proposal PDF: the one the customer is messaged from */
const phoneDisplay = () => process.env.BUSINESS_PHONE_DISPLAY || WHATSAPP_BUSINESS_NUMBERS[inboxProvider()].display

const WELCOME_BODY =
  'Hi {{1}} 👋\n\nThank you for your interest in a {{2}} holiday with Travelzada! ✈️\n\n' +
  "We've attached your personalised {{2}} proposal with handpicked packages, hotels and prices. Everything can be customised to your dates and budget.\n\n" +
  'Tap "Show me options" to see them here on WhatsApp, or "Call me back" and our travel expert will call you.'
const FOLLOWUP_BODY =
  'Hi {{1}}, just checking in about your {{2}} trip 🌴\n\n' +
  'Prices for {{2}} change quickly around peak season. Would you like us to share the latest options and offers?\n\n' +
  'Just tap a button below or reply here.'

type ButtonAction = 'options' | 'callback' | 'notInterested' | 'dates' | 'changeDestination' | 'stop'
/** Quick-reply button text (lowercase) → action, and the channels it applies to */
const BUTTONS: Record<string, { action: ButtonAction; channels: WhatsAppChannel[] }> = {
  // Meta templates (tz_lead_welcome / tz_followup)
  'show me options': { action: 'options', channels: ['meta', 'getgabs'] },
  'call me back': { action: 'callback', channels: ['meta', 'getgabs'] },
  'not interested': { action: 'notInterested', channels: ['meta', 'getgabs'] },
  // GetGabs templates (tz_enquiry_received / tz_lead_followup_day5)
  'share my dates': { action: 'dates', channels: ['getgabs'] },
  'yes, send ideas': { action: 'options', channels: ['getgabs'] },
  'change destination': { action: 'changeDestination', channels: ['getgabs'] },
  'stop messages': { action: 'stop', channels: ['getgabs'] },
}

/** The templates the automation uses with the active provider */
export function automationTemplates() {
  const provider = inboxProvider()
  return provider === 'getgabs'
    ? { provider, welcome: GETGABS_WELCOME_TEMPLATE, followup: GETGABS_FOLLOWUP_TEMPLATE }
    : { provider, welcome: WELCOME_TEMPLATE, followup: FOLLOWUP_TEMPLATE }
}

// ---------- Templates ----------

/**
 * Status of the welcome + follow-up templates of the active provider. GetGabs doesn't expose approval status:
 * a template it lists (submitted to Meta through GetGabs) is reported as APPROVED.
 */
export async function getTemplateStatuses(): Promise<Record<string, { status: string; reason?: string }>> {
  const { provider, welcome, followup } = automationTemplates()
  if (provider === 'getgabs') {
    const names = new Set((await listGetGabsTemplates()).map((t) => t.name))
    const out: Record<string, { status: string; reason?: string }> = {}
    for (const n of [welcome, followup]) {
      out[n] = names.has(n) ? { status: 'APPROVED' } : { status: 'NOT IN GETGABS', reason: 'Create this template in GetGabs and get it approved' }
    }
    return out
  }
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

/**
 * Meta: submits both templates for approval (skips ones that already exist).
 * GetGabs: templates are created in GetGabs itself; reports which ones are there.
 */
export async function submitTemplates() {
  const existing = await getTemplateStatuses()
  const results: Record<string, string> = {}

  if (inboxProvider() === 'getgabs') {
    for (const [name, s] of Object.entries(existing)) {
      results[name] = s.status === 'APPROVED' ? 'found in GetGabs' : 'missing: create it in GetGabs → Templates'
    }
    return results
  }

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

// ---------- GetGabs templates ----------

/** A GetGabs template as the inbox sees it: catalog wording, live (GetGabs) variable counts / header type */
async function getGabsAutoTemplate(name: string): Promise<CatalogTemplate> {
  const live = await getGetGabsTemplate(name, GETGABS_TEMPLATE_LANGUAGE)
  if (!live) throw new Error(`Template "${name}" is not in GetGabs. Create it in GetGabs and get it approved.`)
  const t = reconcileWithLive(getCatalogTemplate(name), live)
  if (t.notSendableReason) throw new Error(`Template "${name}": ${t.notSendableReason}`)
  return t
}

interface LeadContext {
  firstName: string
  destination: string
  tripType?: string
  packageName?: string
  nights?: string
  price?: string
  destSlug?: string
}

const TRIP_TYPES = ['honeymoon', 'babymoon', 'anniversary', 'birthday', 'family', 'friends', 'group', 'solo', 'corporate', 'couple']

/** "honeymoon" / "family" / … from the lead's occasion answer or form name; "holiday" otherwise */
function leadTripType(lead: MetaLead) {
  const text = [
    ...(lead.field_data || []).filter((f) => /occasion|trip_type|travel_type|purpose/i.test(f.name)).flatMap((f) => f.values),
    lead.form_name,
    lead.campaign_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return TRIP_TYPES.find((w) => text.includes(w)) || 'holiday'
}

function leadContext(lead: MetaLead | null, p: { destination: string; destSlug?: string; options?: { duration?: string; price?: string }[] }, firstName: string): LeadContext {
  const tripType = lead ? leadTripType(lead) : 'holiday'
  const first = p.options?.[0]
  return {
    firstName,
    destination: p.destination,
    tripType,
    packageName: `${p.destination} ${tripType}`,
    nights: first?.duration?.match(/(\d+)\s*N/i)?.[1],
    price: first?.price,
    destSlug: p.destSlug,
  }
}

/** Template values from the lead: by catalog `source`, then GETGABS_FIXED_VALUES, then (unknown wording) name, destination */
function templateValues(t: CatalogTemplate, ctx: LeadContext): TemplateValues {
  const bySource: Partial<Record<VariableSource, string | undefined>> = {
    customer_first_name: ctx.firstName,
    destination: ctx.destination,
    trip_type: ctx.tripType,
    package_name: ctx.packageName,
    nights: ctx.nights,
    price: ctx.price,
  }
  const fixed = GETGABS_FIXED_VALUES[t.name] || {}
  const values: TemplateValues = {}
  for (const v of t.variables) {
    const val = (v.source ? bySource[v.source] : undefined) || fixed[v.index] || (t.wordingKnown === false ? [ctx.firstName, ctx.destination][v.index - 1] : undefined)
    if (val) values[v.index] = val
  }
  // Dynamic URL buttons: only destination pages can be filled automatically
  for (const { button, index } of dynamicUrlButtons(t)) {
    if (ctx.destSlug && /\/destinations\//.test(button.url || '')) values[buttonValueKey(index)] = ctx.destSlug
  }
  return values
}

/** Builds the payload exactly like the inbox does, refusing to send when something can't be filled automatically */
function getGabsPayload(t: CatalogTemplate, ctx: LeadContext, headerMedia?: HeaderMediaValue) {
  const values = templateValues(t, ctx)
  const missing = missingFields(t, values, headerMedia)
  if (missing.length) throw new Error(`Template "${t.name}" needs values the automation can't fill: ${missing.map((m) => m.label).join(', ')}`)
  return { components: buildComponents(t, values, headerMedia), text: previewText(t, values, headerMedia) }
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
    phoneDisplay: phoneDisplay(),
    email: SUPPORT_EMAIL,
  })
  return { pdf, destination, options, destSlug }
}

const proposalFilename = (destination: string) => `Travelzada-${destination.replace(/[^a-z0-9]+/gi, '-')}-Proposal.pdf`

/** Uploads the proposal PDF to ImageKit (same as /api/imagekit/upload) and returns its public https link */
async function uploadProposalPdf(pdf: ArrayBuffer, filename: string): Promise<string> {
  const key = process.env.IMAGEKIT_PRIVATE_KEY
  if (!key) throw new Error('IMAGEKIT_PRIVATE_KEY is not set: the proposal PDF needs a public link for GetGabs.')
  const body = new URLSearchParams()
  body.set('file', Buffer.from(pdf).toString('base64'))
  body.set('fileName', filename)
  body.set('folder', PROPOSAL_FOLDER)
  body.set('useUniqueFileName', 'true')
  const res = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${key}:`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.url) throw new Error(`Proposal upload failed: ${data?.message || `HTTP ${res.status}`}`)
  return String(data.url)
}

// ---------- Recording ----------

const looksLikePhone = (s?: string) => !!s && !/[a-z]/i.test(s) && s.replace(/\D/g, '').length >= 7

/**
 * Saves an outbound WhatsApp message so it shows in the WhatsApp inbox and on the lead
 * (same fields as /api/whatsapp/send; the chat's unread count is left alone so staff still see the customer's tap).
 */
async function recordOutbound(
  channel: WhatsAppChannel,
  to: string,
  customerName: string,
  text: string,
  type: string,
  apiResponse: any,
  extras: Record<string, any> = {}
) {
  const now = new Date().toISOString()
  const businessNumber = businessNumberFor(channel)
  const realId = getGabsMessageId(apiResponse)
  await addDoc(collection(db, 'whatsapp_messages'), {
    whatsappMessageId: realId || `outbound_${Date.now()}`,
    senderPhone: to,
    direction: 'outbound',
    type,
    text,
    ...extras,
    channel,
    businessNumber,
    automated: true,
    status: 'sent',
    timestamp: now,
    createdAt: serverTimestamp(),
  })
  await setDoc(
    doc(db, 'whatsapp_chats', to),
    {
      phone: to,
      ...(customerName && !looksLikePhone(customerName) ? { customerName } : {}),
      lastMessage: text.slice(0, 1000),
      lastMessageTimestamp: now,
      lastDirection: 'outbound',
      lastOutboundAt: now,
      channel,
      businessNumber,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  return realId as string | undefined
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

interface WelcomeSent {
  destination: string
  messageId?: string
  template: string
  filename: string
  proposalUrl?: string
  /** The PDF went out with the welcome itself (document header) */
  proposalInMessage: boolean
}

/** Meta: tz_lead_welcome with the PDF uploaded as WhatsApp media */
async function sendWelcomeMeta(lead: MetaLead, to: string, displayName: string): Promise<WelcomeSent> {
  const firstName = leadFirstName(lead)
  const { pdf, destination, destSlug } = await buildProposal(lead)
  const filename = proposalFilename(destination)
  const mediaId = await uploadWhatsAppMedia(pdf, filename, 'application/pdf')
  const components = [
    { type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename } }] },
    { type: 'body', parameters: [{ type: 'text', text: firstName }, { type: 'text', text: destination }] },
    { type: 'button', sub_type: 'url', index: '2', parameters: [{ type: 'text', text: destSlug || '?ref=whatsapp' }] },
  ]
  const api = await sendWhatsAppTemplateMessage(to, WELCOME_TEMPLATE, TEMPLATE_LANGUAGE, components)
  const text = WELCOME_BODY.replace(/\{\{1\}\}/g, firstName).replace(/\{\{2\}\}/g, destination)
  const messageId = await recordOutbound('meta', to, displayName, `📄 ${filename}\n\n${text}`, 'template', api, {
    templateName: WELCOME_TEMPLATE,
    languageCode: TEMPLATE_LANGUAGE,
    components,
    fileName: filename,
  })
  return { destination, messageId, template: WELCOME_TEMPLATE, filename, proposalInMessage: true }
}

/** GetGabs: the welcome template; the PDF goes to ImageKit and into a DOCUMENT header when the template has one */
async function sendWelcomeGetGabs(lead: MetaLead, to: string, displayName: string, t: CatalogTemplate): Promise<WelcomeSent> {
  const firstName = leadFirstName(lead)
  const { pdf, destination, destSlug, options } = await buildProposal(lead)
  const filename = proposalFilename(destination)
  const headerType = hasMediaHeader(t) ? t.header!.type : undefined

  let proposalUrl: string | undefined
  try {
    proposalUrl = await uploadProposalPdf(pdf, filename)
  } catch (err) {
    if (headerType === 'DOCUMENT') throw err
    console.error('[WhatsApp Automation] proposal upload failed (welcome still sent):', err)
  }
  const headerMedia: HeaderMediaValue | undefined =
    headerType === 'DOCUMENT'
      ? { url: proposalUrl, filename }
      : headerType === 'IMAGE'
        ? { url: options.find((o) => o.image)?.image }
        : undefined

  const { components, text } = getGabsPayload(t, leadContext(lead, { destination, destSlug, options }, firstName), headerMedia)
  const api = await sendGetGabsTemplate(to, t.name, components, t.language || GETGABS_TEMPLATE_LANGUAGE)
  const messageId = await recordOutbound('getgabs', to, displayName, text, 'template', api, {
    templateName: t.name,
    languageCode: t.language || GETGABS_TEMPLATE_LANGUAGE,
    components,
    ...(headerMedia?.url ? { mediaUrl: headerMedia.url, ...(headerType === 'DOCUMENT' ? { fileName: filename } : {}) } : {}),
  })
  return { destination, messageId, template: t.name, filename, proposalUrl, proposalInMessage: headerType === 'DOCUMENT' }
}

/**
 * Sends the welcome (with the lead's proposal PDF) from the active provider.
 * `testPhone`: send to this number instead of the customer. `sample`: don't record anything on the lead.
 */
export async function sendWhatsAppWelcome(lead: MetaLead, opts: { testPhone?: string; sample?: boolean; force?: boolean } = {}) {
  const provider = inboxProvider()
  const ref = doc(db, CRM_COLLECTION, lead.id)
  const snap = await getDoc(ref)
  const rec = snap.exists() ? (snap.data() as CrmRecord) : null
  const prior = rec?.whatsappAuto
  const alreadySent = prior?.sentAt && !prior.error && (!prior.test || !!opts.testPhone)
  if (alreadySent && !opts.force && !opts.sample) return { skipped: 'already sent' }

  const customerPhone = whatsappNumber(leadPhone(lead))
  const to = opts.testPhone ? whatsappNumber(opts.testPhone) : customerPhone
  if (!to) return { skipped: 'lead has no phone number' }
  if (await isOptedOut(to)) return { skipped: 'number opted out of WhatsApp messages (STOP)' }

  // Template must exist / be approved before anything is generated
  let getGabsTemplate: CatalogTemplate | null = null
  if (provider === 'getgabs') {
    try {
      getGabsTemplate = await getGabsAutoTemplate(GETGABS_WELCOME_TEMPLATE)
    } catch (err: any) {
      return { error: String(err.message || err) }
    }
  } else {
    const statuses = await getTemplateStatuses()
    if (statuses[WELCOME_TEMPLATE]?.status !== 'APPROVED') {
      return { error: `Template "${WELCOME_TEMPLATE}" is not approved yet (${statuses[WELCOME_TEMPLATE]?.status || 'not submitted'})` }
    }
  }

  const now = new Date().toISOString()
  const firstName = leadFirstName(lead)
  const displayName = opts.testPhone ? `TEST · ${firstName}` : firstName
  try {
    const sent = getGabsTemplate ? await sendWelcomeGetGabs(lead, to, displayName, getGabsTemplate) : await sendWelcomeMeta(lead, to, displayName)

    if (opts.testPhone) await saveAutomationSettings({ whatsappTestLeadId: lead.id })
    if (opts.sample) return { sent: true, to, sample: true, destination: sent.destination, template: sent.template, provider }

    const tag = opts.testPhone ? ' (TEST)' : ''
    await updateDoc(ref, {
      whatsappAuto: {
        sentAt: now,
        to,
        ...(sent.messageId ? { messageId: sent.messageId } : {}),
        destination: sent.destination,
        test: !!opts.testPhone,
        channel: provider,
        template: sent.template,
        ...(sent.proposalUrl ? { proposalUrl: sent.proposalUrl, proposalFilename: sent.filename } : {}),
        ...(sent.proposalInMessage ? { proposalSentAt: now } : {}),
      },
      activities: arrayUnion(
        sent.proposalInMessage
          ? activity(`WhatsApp welcome + proposal PDF sent${tag}`, `${sent.destination} proposal: ${sent.filename} (${sent.template})`)
          : activity(
              `WhatsApp welcome sent${tag}`,
              `${sent.template} from ${WHATSAPP_BUSINESS_NUMBERS[provider].display}. ${sent.destination} proposal PDF ${sent.proposalUrl ? 'is sent automatically when the customer taps a button' : 'could not be prepared'}.`
            )
      ),
      updatedAt: now,
    })
    return { sent: true, to, destination: sent.destination, template: sent.template, provider }
  } catch (err: any) {
    const error = String(err.message || err)
    if (!opts.sample && snap.exists()) await updateDoc(ref, { whatsappAuto: { sentAt: now, to, error, test: !!opts.testPhone, channel: provider }, updatedAt: now })
    return { error }
  }
}

// ---------- Button replies ----------

const normalizeButton = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Called by the webhooks for every inbound message; acts on the templates' quick-reply buttons.
 * `channel`: the number the customer tapped on: replies go back from that same number (free-form: the customer
 * just messaged, so their 24-hour window is open).
 */
export async function handleWhatsAppButton(senderPhone: string, text: string, channel: WhatsAppChannel = 'meta') {
  const button = BUTTONS[normalizeButton(text || '')]
  if (!button || !button.channels.includes(channel)) return false
  const action = button.action

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
  // GetGabs-only buttons (also on templates staff send by hand): only for leads the automation welcomed
  if (['dates', 'changeDestination'].includes(action) && !isTest && !rec?.whatsappAuto?.sentAt) return false

  const name = rec?.name?.split(' ')[0] || 'there'
  const tag = isTest ? ' (TEST)' : ''
  const chatName = isTest ? '' : rec?.name || ''
  const say = (msg: string) => reply(channel, from, chatName, msg)
  const nowIso = () => new Date().toISOString()
  /** GetGabs: proposal PDF once (always for the test number) */
  const proposal = async () => {
    if (channel !== 'getgabs' || (!isTest && rec?.whatsappAuto?.proposalSentAt)) return null
    const sent = await sendProposalDocument(from, chatName, leadId!, rec)
    if (sent && rec?.whatsappAuto && !isTest) await updateDoc(ref, { 'whatsappAuto.proposalSentAt': nowIso() })
    return sent
  }

  if (action === 'options') {
    const lead = await fetchLead(leadId)
    const { destination, options } = await pickPackages(lead)
    const pdf = await proposal()
    await say(`Here are your handpicked ${destination} options, ${name} ✨`)
    for (const [i, o] of options.entries()) {
      const caption = `*Option ${i + 1}: ${o.name}*\n${[o.duration, o.hotels].filter(Boolean).join(' · ')}\n${o.price.replace('Starting ', 'Starting from ')}\n\nView itinerary: ${o.url}`
      if (o.image) {
        const api = channel === 'getgabs' ? await sendGetGabsMedia(from, { kind: 'image', link: o.image, caption }) : await sendWhatsAppImageMessage(from, o.image, caption)
        await recordOutbound(channel, from, chatName, `🖼️ ${caption}`, 'image', api, { mediaUrl: o.image })
      } else await say(caption)
    }
    await say('Reply with *1*, *2* or *3* to choose an option, or tell us what you would like to change (dates, hotels, budget). Our travel expert will get back to you shortly.')
    if (rec)
      await updateDoc(ref, {
        activities: arrayUnion(activity(`Customer tapped "${text.trim()}"${tag}`, `${options.length} options${pdf ? ' + proposal PDF' : ''} sent automatically`)),
        updatedAt: nowIso(),
      })
  }

  if (action === 'dates') {
    const pdf = await proposal()
    await say(
      `${pdf ? `Here is your personalised ${pdf.destination} proposal, ${name} 📄\n\n` : `Thank you, ${name}! `}` +
        'Please share your travel dates, number of travellers and budget, and our travel designer will tailor the plan for you.'
    )
    if (rec)
      await updateDoc(ref, {
        ...(isTest ? {} : { nextFollowUp: nowIso() }),
        activities: arrayUnion(activity(`Customer tapped "Share my dates"${tag}`, pdf ? 'Proposal PDF sent automatically · follow-up due now' : 'Follow-up due now')),
        updatedAt: nowIso(),
      })
  }

  if (action === 'changeDestination') {
    await say(`Sure, ${name}! Which destination would you like to explore instead? Just type it here and we'll send fresh options.`)
    if (rec)
      await updateDoc(ref, {
        ...(isTest ? {} : { nextFollowUp: nowIso() }),
        activities: arrayUnion(activity(`Customer wants a different destination${tag}`, isTest ? undefined : 'Follow-up due now')),
        updatedAt: nowIso(),
      })
  }

  if (action === 'callback') {
    await say(`Thank you, ${name}! 🙏 Our travel expert will call you shortly. If you prefer a particular time, just reply here.`)
    if (rec)
      await updateDoc(ref, {
        ...(isTest ? {} : { priority: 'hot', nextFollowUp: nowIso() }),
        activities: arrayUnion(activity(`Customer asked for a call back${tag}`, isTest ? undefined : 'Marked Hot · follow-up due now')),
        updatedAt: nowIso(),
      })
  }

  if (action === 'stop') {
    // The webhook's handleOptOutReply has already added the number to whatsapp_optouts
    await say(`Done, ${name}. We won't send you any more updates on WhatsApp. If you change your mind, just reply START.`)
    if (rec) await updateDoc(ref, { activities: arrayUnion(activity(`Customer tapped "Stop messages" (opted out)${tag}`)), updatedAt: nowIso() })
  }

  if (action === 'notInterested') {
    await say(`No problem, ${name}. Thank you for letting us know! Whenever you plan your next holiday, just message us here 😊`)
    if (rec) {
      const fromLabel = STAGES.find((s) => s.id === rec.stage)?.label || 'New'
      await updateDoc(ref, {
        ...(isTest || ['won', 'lost'].includes(rec.stage) ? {} : { stage: 'lost', lostReason: 'Not interested', nextFollowUp: null }),
        activities: arrayUnion(
          isTest
            ? activity('Customer tapped "Not interested" (TEST)')
            : { ...activity('Customer tapped "Not interested"'), type: 'stage_change', outcome: `${fromLabel} → Lost`, notes: 'Reason: Not interested (WhatsApp button)' }
        ),
        updatedAt: nowIso(),
      })
    }
  }
  return true
}

async function reply(channel: WhatsAppChannel, to: string, customerName: string, text: string) {
  const api = channel === 'getgabs' ? await sendGetGabsText(to, text) : await sendWhatsAppTextMessage(to, text)
  await recordOutbound(channel, to, customerName, text, 'text', api)
}

/** GetGabs: sends the proposal PDF (the stored ImageKit link, or a freshly generated one) as a document */
async function sendProposalDocument(to: string, customerName: string, leadId: string, rec: CrmRecord | null) {
  let url = rec?.whatsappAuto?.proposalUrl
  let filename = rec?.whatsappAuto?.proposalFilename
  let destination = rec?.whatsappAuto?.destination || ''
  try {
    if (!url) {
      const p = await buildProposal(await fetchLead(leadId))
      destination = p.destination
      filename = proposalFilename(p.destination)
      url = await uploadProposalPdf(p.pdf, filename)
    }
    filename = filename || 'Travelzada-Proposal.pdf'
    const caption = `Your personalised ${destination || 'trip'} proposal from Travelzada`
    const api = await sendGetGabsMedia(to, { kind: 'document', link: url, filename, caption })
    await recordOutbound('getgabs', to, customerName, `📄 ${filename}\n\n${caption}`, 'document', api, { mediaUrl: url, fileName: filename })
    return { destination: destination || 'trip', url, filename }
  } catch (err) {
    // The text reply still goes out; staff can resend the PDF from the inbox
    console.error('[WhatsApp Automation] proposal PDF send failed:', err)
    return null
  }
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
    const provider = inboxProvider()
    let followUp: ((to: string, firstName: string, destination: string) => Promise<void>) | null = null
    if (provider === 'getgabs') {
      const t = await getGabsAutoTemplate(GETGABS_FOLLOWUP_TEMPLATE).catch(() => null)
      if (t)
        followUp = async (to, firstName, destination) => {
          const { components, text } = getGabsPayload(t, { firstName, destination, tripType: 'holiday', packageName: destination }, undefined)
          const api = await sendGetGabsTemplate(to, t.name, components, t.language || GETGABS_TEMPLATE_LANGUAGE)
          await recordOutbound('getgabs', to, firstName, text, 'template', api, { templateName: t.name, languageCode: t.language || GETGABS_TEMPLATE_LANGUAGE, components })
        }
    } else {
      const statuses = await getTemplateStatuses().catch(() => ({} as Record<string, { status: string }>))
      if (statuses[FOLLOWUP_TEMPLATE]?.status === 'APPROVED')
        followUp = async (to, firstName, destination) => {
          const components = [{ type: 'body', parameters: [{ type: 'text', text: firstName }, { type: 'text', text: destination }] }]
          const api = await sendWhatsAppTemplateMessage(to, FOLLOWUP_TEMPLATE, TEMPLATE_LANGUAGE, components)
          await recordOutbound('meta', to, firstName, FOLLOWUP_BODY.replace(/\{\{1\}\}/g, firstName).replace(/\{\{2\}\}/g, destination), 'template', api, {
            templateName: FOLLOWUP_TEMPLATE,
            languageCode: TEMPLATE_LANGUAGE,
            components,
          })
        }
    }

    if (followUp) {
      const all = await getDocs(collection(db, CRM_COLLECTION))
      for (const d of all.docs) {
        const rec = d.data() as CrmRecord
        const w = rec.whatsappAuto
        if (!w?.sentAt || w.error || w.test || w.followUpSentAt || w.followUpSkipped) continue
        if (Date.now() - new Date(w.sentAt).getTime() < FOLLOW_UP_AFTER_MS) continue
        if (['won', 'lost'].includes(rec.stage)) continue
        if (rec.lastReplyAt && rec.lastReplyAt > w.sentAt) continue
        if (await isOptedOut(w.to)) {
          await updateDoc(d.ref, { 'whatsappAuto.followUpSkipped': 'opted out', updatedAt: new Date().toISOString() })
          continue
        }
        const firstName = (rec.name || '').split(' ')[0] || 'there'
        // Meta: "your {{2}} trip" · GetGabs: "still dreaming about {{2}}?"
        const destination = w.destination || (provider === 'getgabs' ? 'your dream destination' : 'dream')
        try {
          await followUp(w.to, firstName, destination)
          await updateDoc(d.ref, {
            'whatsappAuto.followUpSentAt': new Date().toISOString(),
            activities: arrayUnion(activity(`WhatsApp follow-up sent (no reply in 2 days)${provider === 'getgabs' ? ` · ${GETGABS_FOLLOWUP_TEMPLATE}` : ''}`)),
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
