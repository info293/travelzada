export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GRAPH, metaToken, requireLeadsAccess } from '@/lib/metaServer'
import { CRM_COLLECTION, META_STAGE_EVENTS, STAGES, type CrmRecord, type StageId } from '@/lib/metaLeadsCrm'

const MAX_EVENT_AGE_MS = 7 * 864e5 // Meta rejects server events older than 7 days

interface CrmEvent {
  leadId: string
  stage: StageId
  at: string
  value?: number
}

/**
 * Conversions API for CRM: tells Meta how far each lead got in the sales pipeline, so Meta can optimise
 * ad delivery for people who actually book (Events Manager → dataset → "conversion leads").
 *
 * POST { leadId, stage, value? }  → send one stage change (called by the CRM when a stage changes)
 * POST { mode: 'backfill' }       → send every stage change from the last 7 days that wasn't sent yet
 * GET                             → configuration status
 *
 * Only active when META_CRM_DATASET_ID is set. META_CAPI_TEST_CODE sends to Events Manager → Test events only.
 */
export async function GET(req: NextRequest) {
  const authError = await requireLeadsAccess(req)
  if (authError) return authError
  return NextResponse.json({
    configured: !!process.env.META_CRM_DATASET_ID,
    datasetId: process.env.META_CRM_DATASET_ID || null,
    testMode: !!process.env.META_CAPI_TEST_CODE,
    events: META_STAGE_EVENTS,
  })
}

export async function POST(req: NextRequest) {
  try {
    const authError = await requireLeadsAccess(req)
    if (authError) return authError

    const datasetId = process.env.META_CRM_DATASET_ID
    if (!datasetId) return NextResponse.json({ skipped: true, reason: 'META_CRM_DATASET_ID is not set' })
    const token = metaToken()
    if (!token) return NextResponse.json({ error: 'META_LEADS_ACCESS_TOKEN is missing.' }, { status: 400 })

    const body = await req.json()
    let events: CrmEvent[] = []

    if (body.mode === 'backfill') {
      const snap = await getDocs(collection(db, CRM_COLLECTION))
      const cutoff = Date.now() - MAX_EVENT_AGE_MS
      snap.forEach((d) => {
        const rec = d.data() as CrmRecord & { metaEvents?: Record<string, { ok: boolean }> }
        for (const a of rec.activities || []) {
          if (a.type !== 'stage_change' || new Date(a.at).getTime() < cutoff) continue
          const toLabel = a.outcome?.split('→')[1]?.trim()
          const stage = STAGES.find((s) => s.label === toLabel)?.id
          if (!stage || !META_STAGE_EVENTS[stage] || rec.metaEvents?.[stage]?.ok) continue
          events.push({
            leadId: d.id,
            stage,
            at: a.at,
            value: stage === 'won' ? rec.dealValue || rec.proposals?.slice(-1)[0]?.totalPrice : undefined,
          })
        }
      })
    } else {
      const leadId = String(body.leadId || '')
      const stage = body.stage as StageId
      if (!/^\d+$/.test(leadId) || !META_STAGE_EVENTS[stage]) {
        return NextResponse.json({ skipped: true, reason: 'Stage is not sent to Meta' })
      }
      const rec = (await getDoc(doc(db, CRM_COLLECTION, leadId))).data() as CrmRecord | undefined
      events = [
        {
          leadId,
          stage,
          at: new Date().toISOString(),
          value: stage === 'won' ? Number(body.value) || rec?.dealValue || rec?.proposals?.slice(-1)[0]?.totalPrice : undefined,
        },
      ]
    }

    if (!events.length) return NextResponse.json({ success: true, sent: 0, message: 'Nothing new to send.' })

    // Graph API accepts up to 1,000 events per request
    let sent = 0
    const failures: string[] = []
    for (let i = 0; i < events.length; i += 500) {
      const batch = events.slice(i, i + 500)
      const result = await sendEvents(datasetId, token, batch)
      await Promise.all(
        batch.map((e) =>
          updateDoc(doc(db, CRM_COLLECTION, e.leadId), {
            [`metaEvents.${e.stage}`]: {
              eventName: META_STAGE_EVENTS[e.stage],
              sentAt: new Date().toISOString(),
              ok: result.ok,
              test: !!process.env.META_CAPI_TEST_CODE,
              ...(result.ok ? {} : { error: result.error }),
            },
          }).catch(() => undefined)
        )
      )
      if (result.ok) sent += result.received ?? batch.length
      else failures.push(result.error)
    }

    return NextResponse.json({
      success: failures.length === 0,
      sent,
      total: events.length,
      testMode: !!process.env.META_CAPI_TEST_CODE,
      ...(failures.length ? { error: failures[0] } : {}),
    })
  } catch (err: any) {
    console.error('[Meta CRM Events Error]:', err)
    return NextResponse.json({ error: err.message || 'Failed to send CRM events to Meta' }, { status: 500 })
  }
}

async function sendEvents(datasetId: string, token: string, events: CrmEvent[]) {
  const data = events.map((e) => ({
    event_name: META_STAGE_EVENTS[e.stage],
    event_time: Math.floor(new Date(e.at).getTime() / 1000),
    action_source: 'system_generated',
    event_id: `${e.leadId}_${e.stage}`,
    // lead_id must be sent as a JSON integer; a placeholder is swapped for the raw digits below
    // because Meta lead IDs can exceed JavaScript's safe integer range
    user_data: { lead_id: `__LEAD_ID_${e.leadId}__` },
    custom_data: {
      event_source: 'crm',
      lead_event_source: 'Travelzada CRM',
      ...(e.value ? { value: e.value, currency: 'INR' } : {}),
    },
  }))
  const payload = JSON.stringify({
    data,
    ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}),
  }).replace(/"__LEAD_ID_(\d+)__"/g, '$1')

  const res = await fetch(`${GRAPH}/${datasetId}/events?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  })
  const json = await res.json()
  if (!res.ok || json.error) {
    return { ok: false as const, error: json.error?.error_user_msg || json.error?.message || `HTTP ${res.status}` }
  }
  return { ok: true as const, received: json.events_received as number | undefined }
}
