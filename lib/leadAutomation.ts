/**
 * Server-only: Meta lead automation.
 * 1. New lead → email with 3 package options for the destination they asked about.
 * 2. Customer replies (email via IMAP, WhatsApp via webhook) → saved on the lead and flagged in the CRM.
 */
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { sendMail } from '@/lib/mailer'
import { refTag, renderOptionsEmail } from '@/lib/leadEmailTemplate'
import { GRAPH, metaToken } from '@/lib/metaServer'
import {
  AUTOMATION_COLLECTION,
  CRM_COLLECTION,
  LEAD_MESSAGES_COLLECTION,
  humanize,
  leadEmail,
  leadName,
  leadPhone,
  whatsappNumber,
  type AutomationSettings,
  type CrmRecord,
  type LeadMessage,
  type MetaLead,
} from '@/lib/metaLeadsCrm'

const PAGE_ID = process.env.META_PAGE_ID || '341298722393022'
// Links in customer emails must always point at the live site, even when the automation runs locally
const APP_URL = (process.env.LEAD_EMAIL_SITE_URL || 'https://www.travelzada.com').replace(/\/$/, '')
const BUSINESS_WHATSAPP = process.env.BUSINESS_WHATSAPP || '919929962350'
const LEAD_FIELDS =
  'id,created_time,field_data,form_id,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform,is_organic'
const SYSTEM_USER = { uid: 'automation', name: 'Travelzada Automation' }
const MAX_LOOKBACK_MS = 7 * 864e5
const settingsRef = () => doc(db, AUTOMATION_COLLECTION, 'meta-leads')
const replyMailbox = () => process.env.LEAD_REPLY_TO || process.env.IMAP_USER || process.env.SMTP_USER || ''

// ---------- Settings ----------

export async function getAutomationSettings(): Promise<AutomationSettings> {
  const snap = await getDoc(settingsRef())
  return { enabled: false, ...(snap.exists() ? (snap.data() as AutomationSettings) : {}) }
}

export async function saveAutomationSettings(patch: Partial<AutomationSettings>) {
  const current = await getAutomationSettings()
  const next: Partial<AutomationSettings> = { ...patch }
  // Turning it on starts the clock: only leads arriving from now on are emailed automatically
  if (patch.enabled && !current.enabled) next.startAt = new Date().toISOString()
  await setDoc(settingsRef(), stripUndefined(next), { merge: true })
  return getAutomationSettings()
}

// ---------- Meta ----------

type FormQuestion = { key: string; label?: string; options?: { key: string; value: string }[] }
/** Lead plus the human-readable question labels and answers from its form */
type LabeledLead = MetaLead & { questionLabels?: Record<string, string>; answerLabels?: Record<string, string> }

const cleanLabel = (v: string) => v.replace(/[⁠​‌‍]/g, '').trim()

/** Meta stores option answers as internal keys ("anniversary_❤️"); map them back to what the customer saw. */
function withLabels(lead: MetaLead, questions: FormQuestion[] = []): LabeledLead {
  const questionLabels: Record<string, string> = {}
  const answerLabels: Record<string, string> = {}
  for (const f of lead.field_data || []) {
    const q = questions.find((x) => x.key === f.name)
    if (q?.label) questionLabels[f.name] = cleanLabel(q.label)
    answerLabels[f.name] = f.values
      .map((v) => cleanLabel(q?.options?.find((o) => o.key === v)?.value || v.replace(/_/g, ' ')))
      .join(', ')
  }
  return { ...lead, questionLabels, answerLabels }
}

async function pageToken(): Promise<string> {
  const token = metaToken()
  const res = await fetch(`${GRAPH}/${PAGE_ID}?fields=access_token&access_token=${token}`)
  const json = await res.json()
  return json.access_token || token
}

/** Leads created after `sinceIso`, across every lead form on the Page. */
export async function fetchLeadsSince(sinceIso: string): Promise<MetaLead[]> {
  const token = await pageToken()
  const formsRes = await fetch(`${GRAPH}/${PAGE_ID}/leadgen_forms?fields=id,name,questions&limit=100&access_token=${token}`)
  const forms = await formsRes.json()
  if (forms.error) throw new Error(`Meta forms: ${forms.error.message}`)

  const since = Math.floor(new Date(sinceIso).getTime() / 1000)
  const filter = encodeURIComponent(JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: since }]))
  const leads: MetaLead[] = []
  for (const form of forms.data || []) {
    let next: string | undefined = `${GRAPH}/${form.id}/leads?fields=${LEAD_FIELDS}&filtering=${filter}&limit=100&access_token=${token}`
    let pages = 0
    while (next && pages < 10) {
      const res: Response = await fetch(next)
      const json: any = await res.json()
      if (json.error) throw new Error(`Meta leads (${form.name}): ${json.error.message}`)
      for (const l of json.data || []) leads.push(withLabels({ ...l, form_id: l.form_id || form.id, form_name: form.name }, form.questions))
      next = json.paging?.next
      pages++
    }
  }
  return leads
}

export async function fetchLead(leadId: string): Promise<MetaLead> {
  const token = await pageToken()
  const res = await fetch(`${GRAPH}/${leadId}?fields=${LEAD_FIELDS}&access_token=${token}`)
  const lead = await res.json()
  if (lead.error) throw new Error(`Meta lead: ${lead.error.message}`)
  if (lead.form_id) {
    const f = await (await fetch(`${GRAPH}/${lead.form_id}?fields=name,questions&access_token=${token}`)).json()
    if (f.name) lead.form_name = f.name
    return withLabels(lead, f.questions)
  }
  return withLabels(lead)
}

// ---------- CRM record (server side) ----------

async function ensureRecord(lead: MetaLead): Promise<CrmRecord> {
  const ref = doc(db, CRM_COLLECTION, lead.id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const rec = snap.data() as CrmRecord
    if (!rec.phoneNorm && rec.phone) await updateDoc(ref, { phoneNorm: whatsappNumber(rec.phone) })
    return rec
  }
  const now = new Date().toISOString()
  const rec: CrmRecord = {
    leadId: lead.id,
    name: leadName(lead),
    phone: leadPhone(lead),
    phoneNorm: whatsappNumber(leadPhone(lead)),
    email: leadEmail(lead),
    formName: lead.form_name || '',
    campaignName: lead.campaign_name || '',
    platform: lead.platform || '',
    leadCreatedAt: lead.created_time,
    stage: 'new',
    priority: 'warm',
    assignedTo: null,
    nextFollowUp: null,
    travel: {},
    activities: [],
    proposals: [],
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(ref, rec)
  return rec
}

// ---------- Package options ----------

const STOP_WORDS = new Set([
  'package', 'packages', 'couple', 'couples', 'leads', 'lead', 'jaipur', 'copy', 'tz', 'mix', 'the', 'and', 'for', 'with', 'trip',
  'tour', 'holiday', 'night', 'nights', 'days', 'sept', 'september', 'oct', 'october', 'nov', 'dec', 'jan', 'feb',
])

interface PackageOption {
  docId: string
  name: string
  duration: string
  price: string
  overview: string
  image?: string
  hotels?: string
  url: string
}

export async function pickPackages(lead: MetaLead, count = 3): Promise<{ destination: string; options: PackageOption[] }> {
  const hint = [lead.form_name, lead.campaign_name, ...(lead.field_data || []).filter((f) => /destination|place|where/i.test(f.name)).flatMap((f) => f.values)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const tokens = Array.from(new Set(hint.split(/[^a-z]+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t))))

  const [pkgSnap, destSnap] = await Promise.all([getDocs(collection(db, 'packages')), getDocs(collection(db, 'destinations'))])
  const destinations: Record<string, any>[] = destSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const packages: Record<string, any>[] = pkgSnap.docs.map((d) => ({ docId: d.id, ...d.data() }))

  const matchingDest = destinations.find((d) => tokens.some((t) => String(d.name || '').toLowerCase().includes(t)))
  const linkedIds: string[] = Array.isArray(matchingDest?.packageIds) ? matchingDest!.packageIds : []
  let matches = packages.filter(
    (p) =>
      linkedIds.includes(p.Destination_ID) ||
      tokens.some((t) => `${p.Destination_Name || ''} ${p.Destination_ID || ''} ${p.Location_Breakup || ''}`.toLowerCase().includes(t))
  )

  // Prefer packages that match the occasion the customer mentioned (honeymoon, anniversary, birthday...)
  const occasion = (lead.field_data || []).find((f) => /occasion/i.test(f.name))?.values[0]?.toLowerCase() || ''
  const score = (p: Record<string, any>) => {
    const text = `${p.Destination_Name} ${p.Occasion} ${p.Theme} ${p.Travel_Type}`.toLowerCase()
    let s = 0
    for (const w of occasion.split(/[^a-z]+/).filter((w) => w.length > 3)) if (text.includes(w)) s += 3
    if (p.Primary_Image_URL) s += 1
    return s
  }
  matches = matches.sort((a, b) => score(b) - score(a) || Number(a.Price_Min_INR || 0) - Number(b.Price_Min_INR || 0))

  // Three different price points where possible: best match, cheaper, premium
  const chosen: Record<string, any>[] = []
  for (const p of matches) {
    if (chosen.length >= count) break
    if (!chosen.some((c) => c.Destination_Name === p.Destination_Name)) chosen.push(p)
  }

  const destSlugFor = (p: Record<string, any>) =>
    destinations.find((d) => Array.isArray(d.packageIds) && d.packageIds.includes(p.Destination_ID))?.slug || matchingDest?.slug
  const options = chosen.map((p) => {
    const slug = destSlugFor(p)
    const min = Number(p.Price_Min_INR) || 0
    return {
      docId: p.docId,
      name: p.Destination_Name || 'Holiday package',
      duration: p.Duration || (p.Duration_Nights ? `${p.Duration_Nights}N / ${p.Duration_Nights + 1}D` : ''),
      price: formatPrice(p.Price_Range_INR, min),
      overview: String(p.Overview || '').slice(0, 220),
      image: p.Primary_Image_URL || undefined,
      hotels: p.Star_Category ? `${p.Star_Category} stays${p.Meal_Plan ? ` · ${p.Meal_Plan}` : ''}` : undefined,
      url: slug ? `${APP_URL}/destinations/${slug}/${p.Slug || p.docId}` : `${APP_URL}/destinations`,
    }
  })

  const destination =
    matchingDest?.name ||
    (tokens[0] ? tokens[0].charAt(0).toUpperCase() + tokens[0].slice(1) : '') ||
    'your dream destination'
  return { destination, options }
}

/** "59000" → "Starting ₹59,000"; ranges and text are kept, with ₹ added if missing */
function formatPrice(range: unknown, min: number) {
  const raw = String(range ?? '').trim()
  if (/^\d+(\.\d+)?$/.test(raw)) return `Starting ₹${Number(raw).toLocaleString('en-IN')}`
  if (raw) return raw.includes('₹') || /inr|rs\b/i.test(raw) ? raw : `₹${raw}`
  return min ? `Starting ₹${min.toLocaleString('en-IN')}` : 'Price on request'
}

// ---------- Email ----------

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)


export function buildOptionsEmail(lead: MetaLead, destination: string, options: PackageOption[]) {
  const pretty = (v: string) => v.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase())
  const facts = (lead.field_data || [])
    .filter((f) => !['full_name', 'first_name', 'last_name', 'phone_number', 'email', 'city'].includes(f.name.toLowerCase()) && !/^conditional/i.test(f.name))
    .map((f) => ({
      label: (lead as LabeledLead).questionLabels?.[f.name]?.replace(/\?$/, '') || humanize(f.name),
      value: (lead as LabeledLead).answerLabels?.[f.name] || pretty(f.values.join(', ')),
    }))
    .filter((x) => x.value)
  return renderOptionsEmail({
    leadId: lead.id,
    firstName: (leadName(lead).split(' ')[0] || 'there').replace(/^./, (c) => c.toUpperCase()),
    destination,
    platform: lead.platform,
    facts,
    options,
    siteUrl: APP_URL,
    replyTo: replyMailbox() || 'info@travelzada.com',
    whatsappNumber: BUSINESS_WHATSAPP,
  })
}

const newMessageId = (leadId: string) => `<tz-lead-${leadId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@travelzada.com>`

/** Sends the "options" email for one lead. Skips if already sent unless `force`. */
export async function sendOptionsEmail(
  lead: MetaLead,
  opts: { force?: boolean; testRecipient?: string; by?: { uid: string; name: string }; sample?: boolean } = {}
) {
  const rec = await ensureRecord(lead)
  // A lead that only got a TEST copy still gets the real email once test mode is switched off
  const alreadySent = rec.autoEmail?.sentAt && !rec.autoEmail.error && (!rec.autoEmail.test || !!opts.testRecipient)
  if (alreadySent && !opts.force) return { skipped: 'already sent' }
  const email = leadEmail(lead)
  if (!email && !opts.testRecipient) return { skipped: 'lead has no email' }

  const { destination, options } = await pickPackages(lead)
  const { subject, html, text } = buildOptionsEmail(lead, destination, options)
  const to = opts.testRecipient || email
  const messageId = newMessageId(lead.id)
  const now = new Date().toISOString()
  const by = opts.by || SYSTEM_USER
  const ref = doc(db, CRM_COLLECTION, lead.id)

  try {
    const sentId = await sendMail({
      to,
      subject: opts.testRecipient ? `[TEST for ${email || 'no email'}] ${subject}` : subject,
      html,
      text,
      replyTo: replyMailbox() || undefined,
      messageId,
      fromName: 'Travelzada',
    })
    if (!sentId) throw new Error('SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS)')
    // Sample emails are only a preview for the team: nothing is recorded on the customer's lead
    if (opts.sample) return { sent: true, to, options: options.length, sample: true }

    await addDoc(collection(db, LEAD_MESSAGES_COLLECTION), stripUndefined({
      leadId: lead.id,
      channel: 'email',
      direction: 'outbound',
      subject,
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      to,
      text,
      html,
      messageId,
      at: now,
      auto: by.uid === SYSTEM_USER.uid,
      test: !!opts.testRecipient,
      by,
    } satisfies LeadMessage))
    await updateDoc(ref, {
      autoEmail: stripUndefined({ sentAt: now, to, messageId, packageIds: options.map((o) => o.docId), test: !!opts.testRecipient }),
      activities: arrayUnion({
        id: `${Date.now().toString(36)}auto`,
        type: 'email',
        outcome: `Trip options email sent${opts.testRecipient ? ' (TEST)' : ''}`,
        notes: `${options.length} ${destination} option(s): ${options.map((o) => o.name).join(', ') || 'custom itinerary note'}`,
        at: now,
        by,
      }),
      updatedAt: now,
    })
    return { sent: true, to, options: options.length }
  } catch (err: any) {
    if (opts.sample) return { error: String(err.message || err) }
    await updateDoc(ref, { autoEmail: { sentAt: now, to, error: String(err.message || err), test: !!opts.testRecipient }, updatedAt: now })
    return { error: String(err.message || err) }
  }
}

/** Manual reply from the CRM, threaded onto the last email with this lead. */
export async function sendLeadReply(leadId: string, body: string, by: { uid: string; name: string }): Promise<{ to: string; test: boolean }> {
  const recSnap = await getDoc(doc(db, CRM_COLLECTION, leadId))
  if (!recSnap.exists()) throw new Error('Lead not found in CRM')
  const rec = recSnap.data() as CrmRecord
  // Test mode: every CRM email goes to the team's test address, never the customer
  const { testRecipient } = await getAutomationSettings()
  if (!rec.email && !testRecipient) throw new Error('This lead has no email address')
  const to = testRecipient || rec.email

  const history = (await getDocs(query(collection(db, LEAD_MESSAGES_COLLECTION), where('leadId', '==', leadId))))
    .docs.map((d) => d.data() as LeadMessage)
    .sort((a, b) => a.at.localeCompare(b.at))
  const last = history[history.length - 1]
  const baseSubject = (last?.subject || `Your trip with Travelzada ${refTag(leadId)}`).replace(/^(re:\s*)+/i, '')
  const withRef = baseSubject.includes(refTag(leadId)) ? baseSubject : `${baseSubject} ${refTag(leadId)}`
  const subject = `Re: ${testRecipient && !/\[TEST for /i.test(withRef) ? `[TEST for ${rec.email || 'no email'}] ` : ''}${withRef}`
  const references = history.map((m) => m.messageId).filter(Boolean) as string[]
  const messageId = newMessageId(leadId)
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;line-height:1.6">${esc(body).replace(/\n/g, '<br>')}<br><br>Warm regards,<br>${esc(by.name)}<br>Team Travelzada</div>`

  const sentId = await sendMail({
    to,
    subject,
    html,
    text: `${body}\n\nWarm regards,\n${by.name}\nTeam Travelzada`,
    replyTo: replyMailbox() || undefined,
    messageId,
    inReplyTo: last?.messageId,
    references,
    fromName: 'Travelzada',
  })
  if (!sentId) throw new Error('SMTP is not configured')
  const now = new Date().toISOString()
  await addDoc(collection(db, LEAD_MESSAGES_COLLECTION), stripUndefined({
    leadId, channel: 'email', direction: 'outbound', subject, from: process.env.SMTP_FROM || '', to, text: body,
    messageId, inReplyTo: last?.messageId, at: now, by, test: !!testRecipient || undefined,
  } satisfies LeadMessage))
  await updateDoc(doc(db, CRM_COLLECTION, leadId), {
    activities: arrayUnion({
      id: `${Date.now().toString(36)}mail`,
      type: 'email',
      outcome: testRecipient ? `(TEST) Email sent to test address ${to}` : 'Email sent',
      notes: body.slice(0, 500),
      at: now,
      by,
    }),
    updatedAt: now,
  })
  return { to, test: !!testRecipient }
}

// ---------- Inbound email (IMAP) ----------

/** Removes the quoted previous message from a reply so only the customer's new text is kept. */
function stripQuoted(text: string) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out: string[] = []
  for (const line of lines) {
    if (/^On .+wrote:\s*$/i.test(line.trim()) || /^-{2,}\s*Original Message/i.test(line.trim()) || /^From:\s/i.test(line.trim())) break
    if (line.trim().startsWith('>')) continue
    out.push(line)
  }
  return out.join('\n').trim()
}

export async function checkInbox(sinceIso?: string): Promise<{ checked: number; matched: number }> {
  const user = process.env.IMAP_USER || process.env.SMTP_USER
  const pass = process.env.IMAP_PASS || process.env.SMTP_PASS
  if (!user || !pass) return { checked: 0, matched: 0 }

  const { ImapFlow } = await import('imapflow')
  const { simpleParser } = await import('mailparser')
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: { user, pass },
    logger: false,
  })

  const since = new Date(sinceIso ? new Date(sinceIso).getTime() - 864e5 : Date.now() - 3 * 864e5)
  let checked = 0
  let matched = 0
  const ownAddresses = [user, process.env.SMTP_FROM, process.env.SMTP_USER].filter(Boolean).map((a) => a!.toLowerCase())

  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    const uids = (await client.search({ since }, { uid: true })) || []
    for (const uid of uids.slice(-200)) {
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true })
      if (!msg || !msg.source) continue
      checked++
      const mail = await simpleParser(msg.source)
      const from = (mail.from?.value?.[0]?.address || '').toLowerCase()
      const messageId = mail.messageId
      if (!from || ownAddresses.includes(from) || !messageId) continue

      // Already stored?
      const dup = await getDocs(query(collection(db, LEAD_MESSAGES_COLLECTION), where('messageId', '==', messageId), limit(1)))
      if (!dup.empty) continue

      const leadId = await matchLead(mail.subject || '', mail.inReplyTo, mail.references, from)
      if (!leadId) continue

      const text = stripQuoted(mail.text || '')
      const at = (mail.date || new Date()).toISOString()
      // Replies to test-mode / sample emails come from the team, not the customer
      const isTest = /\[TEST for /i.test(mail.subject || '')
      await addDoc(collection(db, LEAD_MESSAGES_COLLECTION), stripUndefined({
        test: isTest || undefined,
        leadId,
        channel: 'email',
        direction: 'inbound',
        subject: mail.subject || '',
        from,
        to: user,
        text: text || (mail.text || '').slice(0, 5000),
        messageId,
        inReplyTo: typeof mail.inReplyTo === 'string' ? mail.inReplyTo : undefined,
        at,
      } satisfies LeadMessage))
      await markReply(leadId, 'email', text || mail.subject || '', at, isTest)
      matched++
    }
  } finally {
    lock.release()
    await client.logout().catch(() => undefined)
  }
  return { checked, matched }
}

async function matchLead(subject: string, inReplyTo: unknown, references: unknown, from: string): Promise<string | null> {
  const refs = [
    ...(typeof inReplyTo === 'string' ? [inReplyTo] : []),
    ...(Array.isArray(references) ? references : typeof references === 'string' ? [references] : []),
  ].filter(Boolean) as string[]
  for (let i = 0; i < refs.length; i += 30) {
    const snap = await getDocs(query(collection(db, LEAD_MESSAGES_COLLECTION), where('messageId', 'in', refs.slice(i, i + 30)), limit(1)))
    if (!snap.empty) return (snap.docs[0].data() as LeadMessage).leadId
  }
  const tag = subject.match(/Ref TZ-(\d+)/i)
  if (tag) return tag[1]
  for (const email of Array.from(new Set([from]))) {
    const snap = await getDocs(query(collection(db, CRM_COLLECTION), where('email', '==', email), limit(1)))
    if (!snap.empty) return snap.docs[0].id
  }
  return null
}

/** Flags a customer reply on the CRM record and adds it to the timeline. */
export async function markReply(leadId: string, channel: 'email' | 'whatsapp', text: string, at: string, test = false) {
  const ref = doc(db, CRM_COLLECTION, leadId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const rec = snap.data() as CrmRecord
  await updateDoc(ref, {
    unreadReplies: increment(1),
    lastReplyAt: at,
    lastReplyChannel: channel,
    lastReplySnippet: text.slice(0, 200),
    activities: arrayUnion({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type: channel,
      outcome: `${test ? '(TEST) Reply to test email' : 'Customer replied'} by ${channel === 'email' ? 'email' : 'WhatsApp'}`,
      notes: text.slice(0, 1000),
      at,
      by: test ? { uid: 'test', name: 'Test reply (team)' } : { uid: 'customer', name: rec.name || 'Customer' },
    }),
    updatedAt: new Date().toISOString(),
  })
}

/** Called by the WhatsApp webhook for every inbound message: links it to the matching lead, if any. */
export async function markWhatsAppReply(senderPhone: string, text: string, at: string) {
  const digits = senderPhone.replace(/\D/g, '')
  const snap = await getDocs(query(collection(db, CRM_COLLECTION), where('phoneNorm', '==', digits), limit(1)))
  if (snap.empty) return false
  await markReply(snap.docs[0].id, 'whatsapp', text, at)
  return true
}

// ---------- Full run ----------

export async function runAutomation(trigger: string) {
  const settings = await getAutomationSettings()
  const startedAt = new Date().toISOString()
  const summary = { trigger, newLeads: 0, emailed: 0, skipped: 0, failed: 0, inboxChecked: 0, repliesFound: 0, errors: [] as string[] }

  // Older CRM records need phoneNorm so WhatsApp replies can be linked to them
  try {
    const all = await getDocs(collection(db, CRM_COLLECTION))
    await Promise.all(
      all.docs
        .filter((d) => !d.data().phoneNorm && d.data().phone)
        .map((d) => updateDoc(d.ref, { phoneNorm: whatsappNumber(String(d.data().phone)) }))
    )
  } catch (err: any) {
    summary.errors.push(`Phone backfill: ${err.message || err}`)
  }

  if (settings.enabled) {
    try {
      const since = new Date(Math.max(new Date(settings.startAt || startedAt).getTime(), Date.now() - MAX_LOOKBACK_MS)).toISOString()
      const leads = await fetchLeadsSince(since)
      summary.newLeads = leads.length
      for (const lead of leads) {
        const r = await sendOptionsEmail(lead, { testRecipient: settings.testRecipient || undefined })
        if ('sent' in r) summary.emailed++
        else if ('error' in r) {
          summary.failed++
          summary.errors.push(`${lead.id}: ${r.error}`)
        } else summary.skipped++
      }
    } catch (err: any) {
      summary.errors.push(String(err.message || err))
    }
  }

  try {
    const inbox = await checkInbox(settings.lastInboxCheckAt)
    summary.inboxChecked = inbox.checked
    summary.repliesFound = inbox.matched
  } catch (err: any) {
    summary.errors.push(`Inbox: ${err.message || err}`)
  }

  const text = settings.enabled
    ? `${summary.newLeads} new lead(s), ${summary.emailed} emailed, ${summary.failed} failed · ${summary.repliesFound} new email replies`
    : `Auto-email is off · ${summary.repliesFound} new email replies`
  await setDoc(
    settingsRef(),
    {
      lastRunAt: startedAt,
      lastRunSummary: `${text} (${trigger})`,
      lastInboxCheckAt: summary.errors.some((e) => e.startsWith('Inbox')) ? settings.lastInboxCheckAt || null : startedAt,
      lastError: summary.errors[0] || null,
    },
    { merge: true }
  )
  return summary
}

/** Processes one new lead immediately (Meta leadgen webhook). */
export async function processNewLeadById(leadId: string) {
  const settings = await getAutomationSettings()
  if (!settings.enabled) return { skipped: 'automation disabled' }
  const lead = await fetchLead(leadId)
  if (settings.startAt && new Date(lead.created_time).getTime() < new Date(settings.startAt).getTime()) return { skipped: 'older than start' }
  return sendOptionsEmail(lead, { testRecipient: settings.testRecipient || undefined })
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T
}
