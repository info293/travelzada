'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  Phone,
  Mail,
  MessageCircle,
  Megaphone,
  FileText,
  AlertTriangle,
  RefreshCw,
  Plus,
  Send,
  PhoneCall,
  Users,
  StickyNote,
  ArrowRightLeft,
  UserCheck,
  CalendarClock,
  Save,
  X,
} from 'lucide-react'
import {
  ACTIVITY_TYPES,
  CALL_OUTCOMES,
  LOST_REASONS,
  PRIORITIES,
  PROPOSAL_STATUSES,
  STAGES,
  addActivity,
  addProposal,
  assignLead,
  changeStage,
  ensureCrmRecord,
  fieldValue,
  formatDate,
  formatDateTime,
  formatHours,
  formatINR,
  salesStats,
  type CrmRecord,
  type MetaAdInfo,
  type MetaCampaignInfo,
  humanize,
  isFollowUpOverdue,
  leadEmail,
  leadName,
  leadPhone,
  setProposalStatus,
  stageInfo,
  updateCrmFields,
  whatsappNumber,
  type ActivityTypeId,
  type CrmActivity,
  type CrmTravel,
  type MetaForm,
  type MetaLead,
  type PriorityId,
  type ProposalStatusId,
  type StageId,
} from '@/lib/metaLeadsCrm'
import { useCrmRecord, useCurrentUserRef, useMetaAds, useSalesTeam } from './useCrm'
import ItineraryGenerator, { type GeneratedItinerarySummary, type ItineraryPrefill } from '@/components/admin/ItineraryGenerator'
import AiSalesAssistant, { type AiProposal } from './AiSalesAssistant'
import LeadConversation from './LeadConversation'

/** Form answers like "2", "2_people", "4 adults" → 2 / 4 */
const parseCount = (v: string) => {
  const n = parseInt(String(v).replace(/[^0-9]/g, ' ').trim().split(/\s+/)[0] || '', 10)
  return isNaN(n) ? undefined : n
}
/** Only real YYYY-MM-DD dates can go into the builder's date input */
const isoDateOrUndefined = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined)

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Everything Claude generated → itinerary builder: package (with Claude's name, duration, hotels category,
 * overview, inclusions/exclusions and price replacing the catalog values on the PDF), day-wise plan, hotels
 * with check-in/out dates, group size, travel date and notes.
 */
function aiProposalToPrefill(p: AiProposal, base: ItineraryPrefill): ItineraryPrefill {
  const startDate = isoDateOrUndefined(p.travelDate) || base.travelDate
  let offset = 0
  const hotels = (p.hotels || []).map((h) => {
    const checkIn = startDate ? addDays(startDate, offset) : ''
    offset += h.nights || 0
    return {
      city: h.city,
      hotelName: h.hotelName,
      checkIn,
      checkOut: startDate ? addDays(startDate, offset) : '',
      roomType: h.roomType,
      mealPlan: h.mealPlan,
    }
  })
  const pax = (p.adults || 0) + (p.children || 0)

  return {
    ...base,
    travelDate: startDate,
    destinationName: p.destination,
    packageDocId: p.packageDocId || undefined,
    adults: p.adults,
    children: p.children,
    totalCost: p.totalPrice,
    customItinerary: p.dayWisePlan,
    hotels,
    autoAdvance: true,
    packageOverrides: {
      Destination_Name: p.packageName || p.title,
      ...(p.overview ? { Overview: p.overview } : {}),
      ...(p.nights ? { Duration: `${p.nights} Nights / ${p.nights + 1} Days`, Duration_Nights: p.nights, Duration_Days: p.nights + 1 } : {}),
      ...(p.hotelCategory ? { Star_Category: p.hotelCategory } : {}),
      ...(p.inclusions?.length ? { Inclusions: p.inclusions.join('\n') } : {}),
      ...(p.exclusions?.length ? { Exclusions: p.exclusions.join('\n') } : {}),
      Price_Range_INR: `${formatINR(p.pricePerPerson)} per person${pax ? ` · ${formatINR(p.totalPrice)} for ${pax}` : ''}`,
    },
    notes: [p.title, p.priceNote, p.changesFromPrevious && `Changes: ${p.changesFromPrevious}`, base.notes]
      .filter(Boolean)
      .join('\n'),
  }
}

/** ISO string -> value for <input type="datetime-local"> in local time. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null)
const toNumber = (v: string) => (v === '' ? undefined : Number(v))

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

const ACTIVITY_ICONS: Record<ActivityTypeId, typeof Phone> = {
  call: PhoneCall,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Users,
  note: StickyNote,
  stage_change: ArrowRightLeft,
  assignment: UserCheck,
  proposal: Send,
}

export default function LeadCrmDetail({ leadId }: { leadId: string }) {
  const { currentUser } = useAuth()
  const me = useCurrentUserRef()
  const team = useSalesTeam()
  const { record, loading: recordLoading } = useCrmRecord(leadId)

  const [lead, setLead] = useState<MetaLead | null>(null)
  const [form, setForm] = useState<MetaForm | null>(null)
  const [leadError, setLeadError] = useState<{ message: string; hint?: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Stage change needing extra input (won → deal value, lost → reason)
  const [pendingStage, setPendingStage] = useState<StageId | null>(null)
  const [lostReason, setLostReason] = useState(LOST_REASONS[0])
  const [dealValue, setDealValue] = useState('')

  // Itinerary builder (the admin "Create Custom Itinerary" tool), pre-filled from this lead or an AI proposal
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderKey, setBuilderKey] = useState(0)
  const [builderPrefill, setBuilderPrefill] = useState<ItineraryPrefill | null>(null)
  const builderRef = useRef<HTMLDivElement>(null)

  const leadAsList = useMemo(() => (lead ? [lead] : null), [lead])
  const { campaigns: campaignInfo, ads: adInfo, error: adsError } = useMetaAds(leadAsList)

  const fetchLead = useCallback(async () => {
    if (!currentUser) return
    setLeadError(null)
    try {
      const idToken = await currentUser.getIdToken()
      const res = await fetch(`/api/facebook/meta-leads?leadId=${leadId}`, { headers: { Authorization: `Bearer ${idToken}` } })
      const json = await res.json()
      if (!res.ok) {
        setLeadError({ message: json.error || 'Failed to load lead from Meta', hint: json.hint })
        return
      }
      setLead(json.lead)
      setForm(json.form)
    } catch (err: any) {
      setLeadError({ message: err.message || 'Failed to load lead from Meta' })
    }
  }, [currentUser, leadId])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  // First time a lead is opened, create its CRM record
  useEffect(() => {
    if (lead && !recordLoading && !record) {
      ensureCrmRecord(lead).catch((err) => console.error('Failed to create CRM record:', err))
    }
  }, [lead, record, recordLoading])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (err: any) {
      console.error('CRM update failed:', err)
      alert(`Could not save: ${err.message || err}`)
    } finally {
      setBusy(false)
    }
  }

  const onStageSelect = (stage: StageId) => {
    if (!record || !me || stage === record.stage) return
    if (stage === 'won' || stage === 'lost') {
      setPendingStage(stage)
      setDealValue(String(record.proposals?.slice(-1)[0]?.totalPrice ?? ''))
      return
    }
    run(() => changeStage(record, stage, me))
  }

  const confirmPendingStage = () => {
    if (!record || !me || !pendingStage) return
    const stage = pendingStage
    run(async () => {
      await changeStage(record, stage, me, {
        lostReason: stage === 'lost' ? lostReason : undefined,
        dealValue: stage === 'won' ? toNumber(dealValue) : undefined,
      })
      setPendingStage(null)
    })
  }

  const name = lead ? leadName(lead) : record?.name || 'Lead'
  const phone = lead ? leadPhone(lead) : record?.phone || ''
  const email = lead ? leadEmail(lead) : record?.email || ''

  if (leadError && !record) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-red-800">Could not load this lead from Meta</p>
          <p className="text-red-700 mt-1">{leadError.message}</p>
          {leadError.hint && <p className="text-red-700 mt-2">{leadError.hint}</p>}
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" /> Loading lead...
      </div>
    )
  }

  const stage = stageInfo(record.stage)
  const overdue = isFollowUpOverdue(record)

  const leadPrefill = (): ItineraryPrefill => {
    const travel = record.travel || {}
    const formPeople = lead ? parseCount(fieldValue(lead, 'no_of_people_travelling?', 'no_of_people_travelling')) : undefined
    const formDate = lead ? fieldValue(lead, 'travel_date?', 'travel_date') : ''
    return {
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      travelDate: isoDateOrUndefined(travel.travelDate) || isoDateOrUndefined(formDate),
      adults: travel.adults ?? formPeople ?? 2,
      children: travel.children ?? 0,
      destinationName: travel.destination || (lead?.form_name?.match(/bali/i) ? 'Bali' : undefined),
      notes: [travel.notes, !isoDateOrUndefined(formDate) && formDate ? `Travel date (from form): ${formDate}` : '']
        .filter(Boolean)
        .join('\n'),
    }
  }

  const openBuilder = (prefill: ItineraryPrefill) => {
    setBuilderPrefill(prefill)
    setBuilderKey((k) => k + 1) // remount so the new prefill is applied
    setBuilderOpen(true)
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const saveAiProposal = (p: AiProposal) =>
    run(() =>
      addProposal(record, {
        sentAt: new Date().toISOString(),
        destination: p.destination,
        packageName: p.packageName,
        nights: p.nights || undefined,
        adults: p.adults,
        children: p.children,
        pricePerPerson: p.pricePerPerson,
        totalPrice: p.totalPrice,
        channel: 'WhatsApp',
        notes: [
          p.title,
          p.hotelCategory && `Hotels: ${p.hotelCategory}`,
          p.inclusions.length && `Includes: ${p.inclusions.join(', ')}`,
          p.changesFromPrevious && `Changes: ${p.changesFromPrevious}`,
          'Drafted with AI assistant',
        ]
          .filter(Boolean)
          .join('\n'),
        by: me!,
      })
    )

  const onItineraryGenerated = (s: GeneratedItinerarySummary) => {
    const pax = (s.adults || 0) + (s.children || 0)
    run(() =>
      addProposal(record, {
        sentAt: new Date().toISOString(),
        destination: s.destinationName,
        packageName: s.packageName,
        nights: s.days > 1 ? s.days - 1 : undefined,
        adults: s.adults,
        children: s.children,
        pricePerPerson: pax ? Math.round(s.totalCost / pax) : s.totalCost,
        totalPrice: s.totalCost,
        channel: 'PDF itinerary',
        notes: [`Itinerary PDF: ${s.fileName}`, s.advancePaid ? `Advance: ${formatINR(s.advancePaid)}` : '', s.notes]
          .filter(Boolean)
          .join('\n'),
        by: me!,
      })
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stage.color}`}>{stage.label}</span>
              {record.stage === 'lost' && record.lostReason && (
                <span className="text-xs text-red-600">({record.lostReason})</span>
              )}
              {record.stage === 'won' && record.dealValue ? (
                <span className="text-xs font-semibold text-emerald-700">{formatINR(record.dealValue)}</span>
              ) : null}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Lead received {formatDateTime(record.leadCreatedAt)}
              {record.formName ? ` · ${record.formName}` : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {phone && (
              <>
                <Link
                  href={`/admin/whatsapp-chats?phone=${whatsappNumber(phone)}&name=${encodeURIComponent(name)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Link>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Phone className="w-4 h-4" /> {phone}
                </a>
              </>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Mail className="w-4 h-4" /> Email
              </a>
            )}
          </div>
        </div>

        {/* Pipeline controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div>
            <label className={labelClass}>Stage</label>
            <select
              value={record.stage}
              disabled={busy}
              onChange={(e) => onStageSelect(e.target.value as StageId)}
              className={inputClass}
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Assigned salesperson</label>
            <select
              value={record.assignedTo?.uid || ''}
              disabled={busy}
              onChange={(e) => {
                if (!me) return
                const assignee = team.find((t) => t.uid === e.target.value) || null
                run(() => assignLead(record, assignee, me))
              }}
              className={inputClass}
            >
              <option value="">Unassigned</option>
              {team.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.name}
                </option>
              ))}
              {record.assignedTo && !team.some((t) => t.uid === record.assignedTo?.uid) && (
                <option value={record.assignedTo.uid}>{record.assignedTo.name}</option>
              )}
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select
              value={record.priority || 'warm'}
              disabled={busy}
              onChange={(e) => run(() => updateCrmFields(record.leadId, { priority: e.target.value as PriorityId }))}
              className={inputClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`${labelClass} ${overdue ? 'text-red-600' : ''}`}>
              Next follow-up {overdue && '· OVERDUE'}
            </label>
            <input
              type="datetime-local"
              value={toLocalInput(record.nextFollowUp)}
              disabled={busy}
              onChange={(e) => run(() => updateCrmFields(record.leadId, { nextFollowUp: fromLocalInput(e.target.value) }))}
              className={`${inputClass} ${overdue ? 'border-red-400 bg-red-50' : ''}`}
            />
          </div>
        </div>

        <SalesSummary record={record} />

        {pendingStage && (
          <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-end gap-3">
            {pendingStage === 'lost' ? (
              <div className="flex-1">
                <label className={labelClass}>Why was this lead lost?</label>
                <select value={lostReason} onChange={(e) => setLostReason(e.target.value)} className={inputClass}>
                  {LOST_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1">
                <label className={labelClass}>Final booking amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 185000"
                />
              </div>
            )}
            <button
              onClick={confirmPendingStage}
              disabled={busy}
              className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${
                pendingStage === 'won' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Mark as {pendingStage === 'won' ? 'Won' : 'Lost'}
            </button>
            <button
              onClick={() => setPendingStage(null)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: lead info + trip requirements */}
        <div className="space-y-6">
          <MetaInfoCard lead={lead} form={form} leadError={leadError} />
          {lead && (lead.ad_id || lead.campaign_id) && (
            <AdCard
              ad={lead.ad_id ? adInfo[lead.ad_id] : undefined}
              campaign={lead.campaign_id ? campaignInfo[lead.campaign_id] : undefined}
              error={adsError}
            />
          )}
          <TripRequirementsCard
            key={`${lead?.id || 'loading'}-${JSON.stringify(record.travel || {})}`}
            leadId={record.leadId}
            travel={record.travel || {}}
            lead={lead}
            disabled={busy}
            onSave={(travel) => run(() => updateCrmFields(record.leadId, { travel }))}
          />
        </div>

        {/* Right: activity, proposals, timeline */}
        <div className="lg:col-span-2 space-y-6">
          <LeadConversation record={record} me={me} />

          <LogActivityCard
            disabled={busy || !me}
            followUpDue={
              !!record.nextFollowUp &&
              !['won', 'lost'].includes(record.stage) &&
              new Date(record.nextFollowUp).getTime() < Date.now() + 864e5
            }
            onSave={(activity, nextFollowUp) =>
              run(async () => {
                await addActivity(record.leadId, { ...activity, by: me! })
                // A completed follow-up clears the scheduled one unless a new date was given
                if (nextFollowUp !== undefined) await updateCrmFields(record.leadId, { nextFollowUp })
                else if (activity.followUp) await updateCrmFields(record.leadId, { nextFollowUp: null })
                if (record.stage === 'new' && activity.type !== 'note' && me) {
                  await changeStage(record, 'contacted', me)
                }
              })
            }
          />

          <ProposalsCard
            proposals={record.proposals || []}
            travel={record.travel || {}}
            lead={lead}
            disabled={busy || !me}
            onAdd={(p) => run(() => addProposal(record, { ...p, by: me! }))}
            onStatus={(id, status) => run(() => setProposalStatus(record, id, status, me!))}
          />

          <TimelineCard activities={record.activities || []} />
        </div>
      </div>

      {/* AI assistant (Claude) */}
      <AiSalesAssistant
        lead={lead}
        form={form}
        record={record}
        disabled={busy || !me}
        onSaveProposal={saveAiProposal}
        onOpenInBuilder={(p) => openBuilder(aiProposalToPrefill(p, leadPrefill()))}
      />

      {/* Itinerary / proposal PDF builder */}
      <div ref={builderRef} className="scroll-mt-4">
        {!builderOpen ? (
          <button
            onClick={() => openBuilder(leadPrefill())}
            className="w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-blue-900">Create Custom Itinerary / Proposal PDF</span>
              <span className="block text-xs text-blue-700">
                Opens the itinerary builder pre-filled with this customer, destination and group size. The generated PDF is saved
                as Proposal #{(record.proposals?.length || 0) + 1}.
              </span>
            </span>
            <FileText className="w-6 h-6 text-blue-600 flex-shrink-0" />
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button onClick={() => setBuilderOpen(false)} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                <X className="w-3 h-3" /> Close itinerary builder
              </button>
            </div>
            <ItineraryGenerator key={builderKey} prefill={builderPrefill || undefined} onGenerated={onItineraryGenerated} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Meta lead info ----------

function MetaInfoCard({
  lead,
  form,
  leadError,
}: {
  lead: MetaLead | null
  form: MetaForm | null
  leadError: { message: string } | null
}) {
  const label = (key: string) => form?.questions?.find((q) => q.key === key)?.label || humanize(key)

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Lead Form Answers
        </h3>
      </div>
      {!lead ? (
        <p className="p-5 text-sm text-gray-500">{leadError ? `Meta data unavailable: ${leadError.message}` : 'Loading from Meta...'}</p>
      ) : (
        <dl className="divide-y divide-gray-100">
          {(lead.field_data || []).map((f) => (
            <div key={f.name} className="px-5 py-2">
              <dt className="text-xs text-gray-500">{label(f.name)}</dt>
              <dd className="text-sm text-gray-900 break-words">{f.values.join(', ') || '—'}</dd>
            </div>
          ))}
          <div className="px-5 py-3 bg-gray-50">
            <div className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-2">
              <Megaphone className="w-3 h-3 text-blue-600" /> Ad & Source
            </div>
            {(
              [
                ['Campaign', lead.campaign_name || lead.campaign_id],
                ['Ad set', lead.adset_name || lead.adset_id],
                ['Ad', lead.ad_name || lead.ad_id],
                ['Form', lead.form_name || lead.form_id],
                ['Platform', lead.platform === 'ig' ? 'Instagram' : lead.platform === 'fb' ? 'Facebook' : lead.platform],
                ['Organic', lead.is_organic === undefined ? undefined : lead.is_organic ? 'Yes' : 'No (paid ad)'],
                ['Lead ID', lead.id],
              ] as [string, string | undefined][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 text-xs py-0.5">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-800 text-right break-all">{v}</span>
                </div>
              ))}
          </div>
        </dl>
      )}
    </div>
  )
}

// ---------- Trip requirements ----------

function TripRequirementsCard({
  travel,
  lead,
  disabled,
  onSave,
}: {
  leadId: string
  travel: CrmTravel
  lead: MetaLead | null
  disabled: boolean
  onSave: (travel: CrmTravel) => void
}) {
  // Pre-fill empty fields from the lead form answers
  const [draft, setDraft] = useState<CrmTravel>(() => ({
    ...travel,
    travelDate: travel.travelDate ?? (lead ? fieldValue(lead, 'travel_date?', 'travel_date') : undefined),
    destination: travel.destination ?? (lead?.form_name?.match(/bali/i) ? 'Bali' : undefined),
  }))
  const set = (patch: Partial<CrmTravel>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Trip Requirements</h3>
      </div>
      <div className="p-5 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Destination</label>
          <input value={draft.destination || ''} onChange={(e) => set({ destination: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Travel date</label>
          <input value={draft.travelDate || ''} onChange={(e) => set({ travelDate: e.target.value })} className={inputClass} placeholder="e.g. 15 Dec 2026" />
        </div>
        <div>
          <label className={labelClass}>Nights</label>
          <input type="number" min={0} value={draft.nights ?? ''} onChange={(e) => set({ nights: toNumber(e.target.value) })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Adults</label>
          <input type="number" min={0} value={draft.adults ?? ''} onChange={(e) => set({ adults: toNumber(e.target.value) })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Children</label>
          <input type="number" min={0} value={draft.children ?? ''} onChange={(e) => set({ children: toNumber(e.target.value) })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Budget (₹)</label>
          <input type="number" min={0} value={draft.budget ?? ''} onChange={(e) => set({ budget: toNumber(e.target.value) })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Hotel category</label>
          <select value={draft.hotelCategory || ''} onChange={(e) => set({ hotelCategory: e.target.value || undefined })} className={inputClass}>
            <option value="">—</option>
            <option>3 Star</option>
            <option>4 Star</option>
            <option>5 Star</option>
            <option>Luxury / Villa</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Special requests / notes</label>
          <textarea rows={2} value={draft.notes || ''} onChange={(e) => set({ notes: e.target.value })} className={inputClass} />
        </div>
        <button
          onClick={() => onSave(draft)}
          disabled={disabled}
          className="col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="w-4 h-4" /> Save requirements
        </button>
      </div>
    </div>
  )
}

// ---------- Log activity ----------

function LogActivityCard({
  disabled,
  followUpDue,
  onSave,
}: {
  disabled: boolean
  followUpDue: boolean
  onSave: (activity: Omit<CrmActivity, 'id' | 'by'>, nextFollowUp?: string | null) => void
}) {
  const [type, setType] = useState<ActivityTypeId>('call')
  const [outcome, setOutcome] = useState(CALL_OUTCOMES[0])
  const [at, setAt] = useState(() => toLocalInput(new Date().toISOString()))
  const [notes, setNotes] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [isFollowUp, setIsFollowUp] = useState(followUpDue)

  useEffect(() => setIsFollowUp(followUpDue), [followUpDue])

  const submit = () => {
    if (type !== 'call' && !notes.trim()) {
      alert('Please add a note describing this activity.')
      return
    }
    onSave(
      {
        type,
        outcome: type === 'call' ? outcome : undefined,
        notes: notes.trim() || undefined,
        at: fromLocalInput(at) || new Date().toISOString(),
        followUp: type !== 'note' && isFollowUp ? true : undefined,
      },
      followUp ? fromLocalInput(followUp) : undefined
    )
    setNotes('')
    setFollowUp('')
    setAt(toLocalInput(new Date().toISOString()))
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Log Communication</h3>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_TYPES.map((t) => {
            const Icon = ACTIVITY_ICONS[t.id]
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border ${
                  type === t.id ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {type === 'call' && (
            <div>
              <label className={labelClass}>Call outcome</label>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={inputClass}>
                {CALL_OUTCOMES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>When</label>
            <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Set next follow-up (optional)</label>
            <input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={inputClass} />
          </div>
        </div>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What was discussed? Customer's feedback, objections, next steps..."
          className={inputClass}
        />
        {type !== 'note' && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isFollowUp}
              onChange={(e) => setIsFollowUp(e.target.checked)}
              className="rounded border-gray-300"
            />
            This is a follow-up
            {followUpDue && <span className="text-xs text-amber-600">(a follow-up is due now)</span>}
          </label>
        )}
        <button
          onClick={submit}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Save activity
        </button>
      </div>
    </div>
  )
}

// ---------- Proposals ----------

interface ProposalDraft {
  sentAt: string
  destination: string
  packageName: string
  nights: string
  adults: string
  children: string
  pricePerPerson: string
  totalPrice: string
  validUntil: string
  channel: string
  notes: string
}

function ProposalsCard({
  proposals,
  travel,
  lead,
  disabled,
  onAdd,
  onStatus,
}: {
  proposals: import('@/lib/metaLeadsCrm').CrmProposal[]
  travel: CrmTravel
  lead: MetaLead | null
  disabled: boolean
  onAdd: (p: Omit<import('@/lib/metaLeadsCrm').CrmProposal, 'id' | 'number' | 'status' | 'by'>) => void
  onStatus: (id: string, status: ProposalStatusId) => void
}) {
  const [open, setOpen] = useState(false)
  const [totalTouched, setTotalTouched] = useState(false)
  const last = proposals[proposals.length - 1]

  const initialDraft = (): ProposalDraft => ({
    sentAt: toLocalInput(new Date().toISOString()),
    destination: last?.destination || travel.destination || (lead?.form_name?.match(/bali/i) ? 'Bali' : ''),
    packageName: last?.packageName || lead?.form_name || '',
    nights: String(last?.nights ?? travel.nights ?? ''),
    adults: String(last?.adults ?? travel.adults ?? 2),
    children: String(last?.children ?? travel.children ?? 0),
    pricePerPerson: '',
    totalPrice: '',
    validUntil: '',
    channel: 'WhatsApp',
    notes: '',
  })
  const [draft, setDraft] = useState<ProposalDraft>(initialDraft)

  const pax = (Number(draft.adults) || 0) + (Number(draft.children) || 0)
  const computedTotal = (Number(draft.pricePerPerson) || 0) * pax
  const total = totalTouched ? Number(draft.totalPrice) || 0 : computedTotal

  const set = (patch: Partial<ProposalDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = () => {
    if (!draft.destination.trim() || !draft.pricePerPerson || pax === 0) {
      alert('Destination, number of people and price per person are required.')
      return
    }
    onAdd({
      sentAt: fromLocalInput(draft.sentAt) || new Date().toISOString(),
      destination: draft.destination.trim(),
      packageName: draft.packageName.trim() || undefined,
      nights: toNumber(draft.nights),
      adults: Number(draft.adults) || 0,
      children: Number(draft.children) || 0,
      pricePerPerson: Number(draft.pricePerPerson),
      totalPrice: total,
      validUntil: draft.validUntil ? new Date(draft.validUntil).toISOString() : undefined,
      channel: draft.channel,
      notes: draft.notes.trim() || undefined,
    })
    setOpen(false)
    setTotalTouched(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900">Proposals / Quotes ({proposals.length})</h3>
        {!open && (
          <button
            onClick={() => {
              setDraft(initialDraft())
              setTotalTouched(false)
              setOpen(true)
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
          >
            <Plus className="w-4 h-4" /> New proposal #{proposals.length + 1}
          </button>
        )}
      </div>

      {open && (
        <div className="p-5 border-b border-gray-200 bg-purple-50/40 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Destination *</label>
            <input value={draft.destination} onChange={(e) => set({ destination: e.target.value })} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Package name</label>
            <input value={draft.packageName} onChange={(e) => set({ packageName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nights</label>
            <input type="number" min={0} value={draft.nights} onChange={(e) => set({ nights: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Adults *</label>
            <input type="number" min={0} value={draft.adults} onChange={(e) => set({ adults: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Children</label>
            <input type="number" min={0} value={draft.children} onChange={(e) => set({ children: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Price / person (₹) *</label>
            <input type="number" min={0} value={draft.pricePerPerson} onChange={(e) => set({ pricePerPerson: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total quoted (₹)</label>
            <input
              type="number"
              min={0}
              value={totalTouched ? draft.totalPrice : computedTotal || ''}
              onChange={(e) => {
                setTotalTouched(true)
                set({ totalPrice: e.target.value })
              }}
              className={inputClass}
            />
            {!totalTouched && pax > 0 && <p className="text-[10px] text-gray-500 mt-0.5">Auto: price × {pax} people</p>}
          </div>
          <div>
            <label className={labelClass}>Sent via</label>
            <select value={draft.channel} onChange={(e) => set({ channel: e.target.value })} className={inputClass}>
              <option>WhatsApp</option>
              <option>Email</option>
              <option>Call</option>
              <option>In person</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Sent on</label>
            <input type="datetime-local" value={draft.sentAt} onChange={(e) => set({ sentAt: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Valid until</label>
            <input type="date" value={draft.validUntil} onChange={(e) => set({ validUntil: e.target.value })} className={inputClass} />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label className={labelClass}>Inclusions / notes</label>
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Flights, hotels, transfers, meals, what changed from the last proposal..."
              className={inputClass}
            />
          </div>
          <div className="col-span-2 sm:col-span-4 flex gap-2">
            <button
              onClick={submit}
              disabled={disabled}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
            >
              <Send className="w-4 h-4" /> Save proposal #{proposals.length + 1} ({formatINR(total)})
            </button>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {proposals.length === 0 && !open ? (
        <p className="p-5 text-sm text-gray-500">No proposals sent yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {[...proposals].reverse().map((p) => {
            const st = PROPOSAL_STATUSES.find((s) => s.id === p.status) || PROPOSAL_STATUSES[0]
            return (
              <div key={p.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">Proposal #{p.number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {p.destination}
                      {p.packageName ? ` · ${p.packageName}` : ''}
                      {p.nights ? ` · ${p.nights}N` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.adults} adults{p.children ? `, ${p.children} children` : ''} · {formatINR(p.pricePerPerson)}/person · via{' '}
                      {p.channel} · {formatDateTime(p.sentAt)} by {p.by?.name}
                      {p.validUntil ? ` · valid until ${formatDate(p.validUntil)}` : ''}
                    </p>
                    {p.notes && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{p.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-gray-900">{formatINR(p.totalPrice)}</div>
                    <select
                      value={p.status}
                      disabled={disabled}
                      onChange={(e) => onStatus(p.id, e.target.value as ProposalStatusId)}
                      className="mt-1 px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white"
                    >
                      {PROPOSAL_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Timeline ----------

function TimelineCard({ activities }: { activities: CrmActivity[] }) {
  const sorted = useMemo(() => [...activities].sort((a, b) => b.at.localeCompare(a.at)), [activities])
  const label = (type: ActivityTypeId) =>
    ACTIVITY_TYPES.find((t) => t.id === type)?.label ||
    { stage_change: 'Stage changed', assignment: 'Assignment', proposal: 'Proposal' }[type as string] ||
    type

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-gray-500" /> Timeline ({activities.length})
        </h3>
      </div>
      {sorted.length === 0 ? (
        <p className="p-5 text-sm text-gray-500">No activity yet. Log the first call or WhatsApp above.</p>
      ) : (
        <ol className="p-5 space-y-4">
          {sorted.map((a) => {
            const Icon = ACTIVITY_ICONS[a.type] || StickyNote
            const system = ['stage_change', 'assignment'].includes(a.type)
            return (
              <li key={a.id} className="flex gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    system ? 'bg-gray-100 text-gray-500' : a.type === 'proposal' ? 'bg-purple-100 text-purple-600' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-gray-900">{label(a.type)}</span>
                    {a.followUp && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">FOLLOW-UP</span>
                    )}
                    {a.outcome && <span className="text-sm text-gray-700">{a.outcome}</span>}
                  </div>
                  {a.notes && <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{a.notes}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(a.at)} · {a.by?.name}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

// ---------- Sales summary (the spreadsheet columns, calculated from the log) ----------

function SalesSummary({ record }: { record: CrmRecord }) {
  const s = salesStats(record)
  const ageDays = (Date.now() - new Date(record.leadCreatedAt).getTime()) / 864e5

  const items: { label: string; value: string; tone?: string; sub?: string }[] = [
    { label: 'Call attempts', value: String(s.callAttempts) },
    {
      label: 'Call connected',
      value: s.callAttempts ? (s.callConnected ? 'Yes' : 'No') : '—',
      tone: s.callAttempts ? (s.callConnected ? 'text-emerald-700' : 'text-red-600') : undefined,
      sub: s.callAttempts ? `${s.connectedCalls} of ${s.callAttempts} calls` : undefined,
    },
    {
      label: 'Quote sent',
      value: s.quoteSent ? 'Yes' : 'No',
      tone: s.quoteSent ? 'text-emerald-700' : 'text-gray-500',
      sub: s.lastQuoteDate ? formatDate(s.lastQuoteDate) : undefined,
    },
    { label: 'Latest quote', value: formatINR(s.latestQuote) },
    { label: 'Modifications', value: String(s.modifications), sub: s.modifications ? 'revised quotes' : undefined },
    {
      label: 'Follow-ups done',
      value: String(s.followUpsDone),
      sub: s.followUpDates.length ? s.followUpDates.map((d) => formatDate(d)).join(', ') : undefined,
    },
    { label: 'First response', value: formatHours(s.firstResponseHours) },
    { label: 'Lead age', value: ageDays < 1 ? `${Math.round(ageDays * 24)}h` : `${Math.floor(ageDays)}d` },
  ]

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
      {items.map((i) => (
        <div key={i.label} className="bg-white px-3 py-2">
          <div className="text-[11px] text-gray-500">{i.label}</div>
          <div className={`text-base font-bold ${i.tone || 'text-gray-900'}`}>{i.value}</div>
          {i.sub && <div className="text-[10px] text-gray-400 truncate" title={i.sub}>{i.sub}</div>}
        </div>
      ))}
    </div>
  )
}

// ---------- The ad this lead came from ----------

function AdCard({ ad, campaign, error }: { ad?: MetaAdInfo; campaign?: MetaCampaignInfo; error: string | null }) {
  const insights = ad?.insights || campaign?.insights
  const cpl = insights && insights.metaLeads ? insights.spend / insights.metaLeads : undefined
  const budget = campaign?.daily_budget
    ? `${formatINR(Number(campaign.daily_budget) / 100)}/day`
    : campaign?.lifetime_budget
      ? `${formatINR(Number(campaign.lifetime_budget) / 100)} lifetime`
      : undefined

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-blue-600" /> The Ad This Lead Came From
        </h3>
      </div>
      {!ad && !campaign ? (
        <p className="p-5 text-sm text-gray-500">{error ? `Ad data unavailable: ${error}` : 'Loading ad from Meta...'}</p>
      ) : (
        <div className="p-5 space-y-3">
          {ad?.creative?.thumbnail_url || ad?.creative?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.creative.image_url || ad.creative.thumbnail_url}
              alt={ad.creative.title || ad.name || 'Ad creative'}
              className="w-full rounded-lg border border-gray-200 object-cover max-h-64"
            />
          ) : null}
          {ad?.creative?.title && <p className="text-sm font-semibold text-gray-900">{ad.creative.title}</p>}
          {ad?.creative?.body && <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-6">{ad.creative.body}</p>}

          <dl className="text-xs space-y-1 pt-2 border-t border-gray-100">
            {(
              [
                ['Ad', ad?.name],
                ['Ad status', ad?.effective_status?.replace(/_/g, ' ').toLowerCase()],
                ['Campaign', campaign?.name],
                ['Campaign status', campaign?.effective_status?.replace(/_/g, ' ').toLowerCase()],
                ['Budget', budget],
                ['Started', campaign?.start_time ? formatDate(campaign.start_time) : undefined],
              ] as [string, string | undefined][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="text-gray-800 text-right">{v}</dd>
                </div>
              ))}
          </dl>

          {insights && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
              <div>
                <div className="text-[10px] text-gray-500">{ad?.insights ? 'Ad spend' : 'Campaign spend'}</div>
                <div className="text-sm font-bold text-gray-900">{formatINR(Math.round(insights.spend))}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Meta leads</div>
                <div className="text-sm font-bold text-gray-900">{insights.metaLeads}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">Cost / lead</div>
                <div className="text-sm font-bold text-blue-700">{cpl ? formatINR(Math.round(cpl)) : '—'}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
