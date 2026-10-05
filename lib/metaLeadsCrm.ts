/**
 * Meta Leads CRM
 * Leads themselves are fetched live from Meta (see /api/facebook/meta-leads).
 * Everything the sales team does with a lead is stored in Firestore `meta_lead_crm/{metaLeadId}`.
 */
import { auth, db } from '@/lib/firebase'
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore'

export const CRM_COLLECTION = 'meta_lead_crm'
export const AD_COACH_COLLECTION = 'meta_ad_coach_reports'

// ---------- Meta lead types ----------

export interface MetaFieldData {
  name: string
  values: string[]
}

export interface MetaLead {
  id: string
  created_time: string
  field_data?: MetaFieldData[]
  form_id: string
  form_name?: string
  ad_id?: string
  ad_name?: string
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
  platform?: string
  is_organic?: boolean
  partner_name?: string
  custom_disclaimer_responses?: { checkbox_key: string; is_checked: string }[]
}

export interface MetaForm {
  id: string
  name: string
  status?: string
  locale?: string
  created_time?: string
  leads_count?: number
  questions?: { key: string; label?: string; type?: string }[]
}

// ---------- CRM types ----------

export const STAGES = [
  { id: 'new', label: 'New', color: 'bg-gray-100 text-gray-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { id: 'qualified', label: 'Qualified', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'bg-purple-100 text-purple-700' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-700' },
  { id: 'won', label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
] as const

export type StageId = (typeof STAGES)[number]['id']

/**
 * CRM stage → event name sent to Meta (Conversions API for CRM). "New" isn't sent: Meta already knows about the lead.
 * In Events Manager, pick one of these (e.g. "Qualified Lead") as the conversion-leads optimisation event.
 */
export const META_STAGE_EVENTS: Partial<Record<StageId, string>> = {
  contacted: 'Contacted',
  qualified: 'Qualified Lead',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  won: 'Converted',
  lost: 'Lost',
}

/** Fire-and-forget: report a stage change to Meta. The server skips it unless META_CRM_DATASET_ID is configured. */
export function sendStageToMeta(leadId: string, stage: StageId, value?: number) {
  if (!META_STAGE_EVENTS[stage] || typeof window === 'undefined') return
  auth?.currentUser
    ?.getIdToken()
    .then((idToken) =>
      fetch('/api/facebook/crm-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ leadId, stage, value }),
      })
    )
    .catch((err) => console.warn('Could not send stage to Meta:', err))
}

export const stageInfo = (id?: string) => STAGES.find((s) => s.id === id) || STAGES[0]

export const LOST_REASONS = [
  'Not reachable',
  'Price too high',
  'Booked with competitor',
  'Plan cancelled / postponed',
  'Not interested',
  'Invalid / fake lead',
  'Other',
]

export const PRIORITIES = [
  { id: 'hot', label: 'Hot', color: 'bg-red-100 text-red-700' },
  { id: 'warm', label: 'Warm', color: 'bg-amber-100 text-amber-700' },
  { id: 'cold', label: 'Cold', color: 'bg-sky-100 text-sky-700' },
] as const

export type PriorityId = (typeof PRIORITIES)[number]['id']

export const ACTIVITY_TYPES = [
  { id: 'call', label: 'Call' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'note', label: 'Note' },
] as const

export type ActivityTypeId = (typeof ACTIVITY_TYPES)[number]['id'] | 'stage_change' | 'assignment' | 'proposal'

export const CALL_OUTCOMES = [
  'Connected - interested',
  'Connected - follow up later',
  'Connected - not interested',
  'No answer',
  'Busy / call back',
  'Switched off / unreachable',
  'Wrong number',
]

export const PROPOSAL_STATUSES = [
  { id: 'sent', label: 'Sent', color: 'bg-purple-100 text-purple-700' },
  { id: 'accepted', label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { id: 'revised', label: 'Revised', color: 'bg-gray-100 text-gray-600' },
] as const

export type ProposalStatusId = (typeof PROPOSAL_STATUSES)[number]['id']

export interface CrmUserRef {
  uid: string
  name: string
}

export interface CrmActivity {
  id: string
  type: ActivityTypeId
  outcome?: string
  notes?: string
  at: string // when it happened (ISO)
  by: CrmUserRef
  followUp?: boolean // logged as a scheduled follow-up
}

export interface CrmProposal {
  id: string
  number: number
  sentAt: string
  destination: string
  packageName?: string
  nights?: number
  adults: number
  children: number
  pricePerPerson: number
  totalPrice: number
  validUntil?: string
  channel: string
  status: ProposalStatusId
  notes?: string
  by: CrmUserRef
}

export interface CrmTravel {
  destination?: string
  travelDate?: string
  nights?: number
  adults?: number
  children?: number
  budget?: number
  hotelCategory?: string
  notes?: string
}

export interface CrmRecord {
  leadId: string
  // Snapshot of the Meta lead so reports work without calling Meta
  name: string
  phone: string
  email: string
  formName?: string
  campaignName?: string
  platform?: string
  leadCreatedAt: string

  stage: StageId
  lostReason?: string
  priority?: PriorityId
  assignedTo?: CrmUserRef | null
  nextFollowUp?: string | null
  travel?: CrmTravel
  dealValue?: number // final booked amount when won
  /** Stage events reported to Meta (Conversions API for CRM), keyed by stage */
  metaEvents?: Partial<Record<StageId, { eventName: string; sentAt: string; ok: boolean; test?: boolean; error?: string }>>
  activities: CrmActivity[]
  proposals: CrmProposal[]
  createdAt: string
  updatedAt: string
}

// ---------- Meta lead helpers ----------

export const fieldValue = (lead: MetaLead, ...keys: string[]) => {
  for (const key of keys) {
    const field = lead.field_data?.find((f) => f.name.toLowerCase() === key)
    if (field?.values?.[0]) return field.values[0]
  }
  return ''
}

export const leadName = (lead: MetaLead) =>
  fieldValue(lead, 'full_name', 'name') ||
  [fieldValue(lead, 'first_name'), fieldValue(lead, 'last_name')].filter(Boolean).join(' ') ||
  'Unknown'

export const leadPhone = (lead: MetaLead) => fieldValue(lead, 'phone_number', 'phone', 'mobile', 'mobile_number')
export const leadEmail = (lead: MetaLead) => fieldValue(lead, 'email', 'email_address')

/** WhatsApp-ready number: digits only, 91 prefixed to 10-digit Indian numbers. */
export const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

export const humanize = (key: string) =>
  key.replace(/\?/g, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const formatDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

export const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const formatINR = (n?: number) =>
  typeof n === 'number' && !isNaN(n) ? `₹${n.toLocaleString('en-IN')}` : '—'

export const isFollowUpOverdue = (rec?: CrmRecord) =>
  !!rec?.nextFollowUp && !['won', 'lost'].includes(rec.stage) && new Date(rec.nextFollowUp).getTime() < Date.now()

/** Call outcomes that count as "Call Connected" */
export const isConnectedOutcome = (outcome?: string) => !!outcome && outcome.startsWith('Connected')

const CONTACT_TYPES: ActivityTypeId[] = ['call', 'whatsapp', 'email', 'meeting']

/**
 * The numbers the sales team used to track by hand in the spreadsheet
 * (Call Attempts, Call Connected, Quote Sent, Quote Date, Modifications, Follow ups, Remarks), derived from the CRM log.
 */
export function salesStats(rec?: CrmRecord, leadCreatedAt?: string) {
  const activities = rec?.activities || []
  const calls = activities.filter((a) => a.type === 'call')
  const proposals = rec?.proposals || []
  const contacts = activities.filter((a) => CONTACT_TYPES.includes(a.type) || a.type === 'proposal').map((a) => a.at).sort()
  const remarks = activities
    .filter((a) => !['stage_change', 'assignment'].includes(a.type) && a.notes && a.type !== 'proposal')
    .sort((a, b) => b.at.localeCompare(a.at))
  const followUps = activities.filter((a) => a.followUp).sort((a, b) => a.at.localeCompare(b.at))
  const created = leadCreatedAt || rec?.leadCreatedAt

  return {
    callAttempts: calls.length,
    callConnected: calls.some((c) => isConnectedOutcome(c.outcome)),
    connectedCalls: calls.filter((c) => isConnectedOutcome(c.outcome)).length,
    quoteSent: proposals.length > 0,
    firstQuoteDate: proposals[0]?.sentAt,
    lastQuoteDate: proposals[proposals.length - 1]?.sentAt,
    latestQuote: proposals[proposals.length - 1]?.totalPrice,
    modifications: Math.max(0, proposals.length - 1),
    followUpsDone: followUps.length,
    followUpDates: followUps.map((f) => f.at),
    latestRemark: remarks[0]?.notes,
    latestRemarkAt: remarks[0]?.at,
    firstContactAt: contacts[0],
    firstResponseHours:
      contacts[0] && created ? (new Date(contacts[0]).getTime() - new Date(created).getTime()) / 36e5 : undefined,
  }
}

export const formatHours = (h?: number | null) =>
  h === null || h === undefined || isNaN(h)
    ? '—'
    : h < 1
      ? `${Math.max(0, Math.round(h * 60))}m`
      : h < 48
        ? `${h.toFixed(1)}h`
        : `${(h / 24).toFixed(1)}d`

// ---------- Meta ads (spend & creative) ----------

export interface AdInsights {
  spend: number
  impressions: number
  clicks: number
  reach: number
  ctr: number
  cpm: number
  metaLeads: number // leads as counted by Meta Ads Manager
}

export interface MetaAdInfo {
  id: string
  name?: string
  status?: string
  effective_status?: string
  campaign_id?: string
  creative?: { title?: string; body?: string; thumbnail_url?: string; image_url?: string }
  insights?: AdInsights
}

export interface MetaCampaignInfo {
  id: string
  name?: string
  status?: string
  effective_status?: string
  objective?: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
  insights?: AdInsights
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

// ---------- Firestore writes ----------

const recordRef = (leadId: string) => doc(db, CRM_COLLECTION, leadId)

/** Creates the CRM record for a Meta lead if it doesn't exist yet. */
export async function ensureCrmRecord(lead: MetaLead): Promise<void> {
  const ref = recordRef(lead.id)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  const now = new Date().toISOString()
  const record: CrmRecord = {
    leadId: lead.id,
    name: leadName(lead),
    phone: leadPhone(lead),
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
  await setDoc(ref, record)
}

export async function addActivity(leadId: string, activity: Omit<CrmActivity, 'id'>) {
  await updateDoc(recordRef(leadId), {
    activities: arrayUnion(stripUndefined({ ...activity, id: newId() })),
    updatedAt: new Date().toISOString(),
  })
}

export async function changeStage(
  record: CrmRecord,
  stage: StageId,
  by: CrmUserRef,
  extra: { lostReason?: string; dealValue?: number } = {}
) {
  if (record.stage === stage) return
  const notes =
    stage === 'lost' && extra.lostReason
      ? `Reason: ${extra.lostReason}`
      : stage === 'won' && extra.dealValue
        ? `Deal value: ${formatINR(extra.dealValue)}`
        : undefined
  await updateDoc(recordRef(record.leadId), {
    stage,
    ...(stage === 'lost' ? { lostReason: extra.lostReason || 'Other', nextFollowUp: null } : { lostReason: null }),
    ...(stage === 'won' ? { dealValue: extra.dealValue ?? null, nextFollowUp: null } : {}),
    activities: arrayUnion(
      stripUndefined({
        id: newId(),
        type: 'stage_change',
        outcome: `${stageInfo(record.stage).label} → ${stageInfo(stage).label}`,
        notes,
        at: new Date().toISOString(),
        by,
      })
    ),
    updatedAt: new Date().toISOString(),
  })
  sendStageToMeta(record.leadId, stage, extra.dealValue)
}

export async function assignLead(record: CrmRecord, assignee: CrmUserRef | null, by: CrmUserRef) {
  await updateDoc(recordRef(record.leadId), {
    assignedTo: assignee,
    activities: arrayUnion({
      id: newId(),
      type: 'assignment',
      outcome: assignee ? `Assigned to ${assignee.name}` : 'Unassigned',
      at: new Date().toISOString(),
      by,
    }),
    updatedAt: new Date().toISOString(),
  })
}

export async function updateCrmFields(
  leadId: string,
  fields: Partial<Pick<CrmRecord, 'priority' | 'nextFollowUp' | 'travel' | 'dealValue'>>
) {
  await updateDoc(recordRef(leadId), { ...stripUndefined(fields), updatedAt: new Date().toISOString() })
}

/** Adds the next numbered proposal and moves the lead to "Proposal Sent" if it was earlier in the pipeline. */
export async function addProposal(record: CrmRecord, proposal: Omit<CrmProposal, 'id' | 'number' | 'status'>) {
  const number = (record.proposals?.length || 0) + 1
  const entry: CrmProposal = { ...proposal, id: newId(), number, status: 'sent' }
  const earlyStages: StageId[] = ['new', 'contacted', 'qualified']
  const advance = earlyStages.includes(record.stage)
  const now = new Date().toISOString()

  // Previously "sent" proposals become "revised" when a new one goes out
  const proposals = (record.proposals || []).map((p) => (p.status === 'sent' ? { ...p, status: 'revised' as const } : p))

  await updateDoc(recordRef(record.leadId), {
    proposals: [...proposals, stripUndefined(entry)],
    ...(advance ? { stage: 'proposal_sent' } : {}),
    activities: arrayUnion(
      stripUndefined({
        id: newId(),
        type: 'proposal',
        outcome: `Proposal #${number} sent via ${proposal.channel} — ${formatINR(proposal.totalPrice)}`,
        notes: `${proposal.destination}${proposal.packageName ? ` · ${proposal.packageName}` : ''} · ${proposal.adults} adults${
          proposal.children ? `, ${proposal.children} children` : ''
        } · ${formatINR(proposal.pricePerPerson)}/person`,
        at: proposal.sentAt,
        by: proposal.by,
      }),
      ...(advance
        ? [
            {
              id: newId(),
              type: 'stage_change',
              outcome: `${stageInfo(record.stage).label} → Proposal Sent`,
              at: now,
              by: proposal.by,
            },
          ]
        : [])
    ),
    updatedAt: now,
  })
  if (advance) sendStageToMeta(record.leadId, 'proposal_sent')
}

export async function setProposalStatus(record: CrmRecord, proposalId: string, status: ProposalStatusId, by: CrmUserRef) {
  const target = record.proposals.find((p) => p.id === proposalId)
  if (!target || target.status === status) return
  await updateDoc(recordRef(record.leadId), {
    proposals: record.proposals.map((p) => (p.id === proposalId ? { ...p, status } : p)),
    activities: arrayUnion({
      id: newId(),
      type: 'proposal',
      outcome: `Proposal #${target.number} marked ${status}`,
      at: new Date().toISOString(),
      by,
    }),
    updatedAt: new Date().toISOString(),
  })
}

/** Firestore rejects `undefined` values, so drop them (including inside nested plain objects) before writing. */
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v && typeof v === 'object' && v.constructor === Object ? stripUndefined(v) : v])
  ) as T
}
