'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import {
  STAGES,
  formatDateTime,
  formatINR,
  isFollowUpOverdue,
  leadName,
  salesStats,
  type CrmRecord,
  type CrmUserRef,
  type MetaLead,
} from '@/lib/metaLeadsCrm'
import { useMetaAds } from './useCrm'
import { AdRoiTable, LeadInsights } from './AdPerformance'

interface Props {
  leads: MetaLead[]
  records: Record<string, CrmRecord>
  team: CrmUserRef[]
}

interface Row {
  key: string
  name: string
  assigned: number
  untouched: number
  contacted: number
  withProposal: number
  quoted: number
  won: number
  wonValue: number
  lost: number
  open: number
  overdue: number
  activities: number
  responseHours: number[]
}

const emptyRow = (key: string, name: string): Row => ({
  key,
  name,
  assigned: 0,
  untouched: 0,
  contacted: 0,
  withProposal: 0,
  quoted: 0,
  won: 0,
  wonValue: 0,
  lost: 0,
  open: 0,
  overdue: 0,
  activities: 0,
  responseHours: [],
})

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—')
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const fmtHours = (h: number | null) => (h === null ? '—' : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`)

/** Leads are worked once anything other than system events (assignment) has been logged. */
const firstContactAt = (rec?: CrmRecord) =>
  rec?.activities
    ?.filter((a) => ['call', 'whatsapp', 'email', 'meeting', 'proposal'].includes(a.type))
    .map((a) => a.at)
    .sort()[0]

const latestQuote = (rec?: CrmRecord) => rec?.proposals?.slice(-1)[0]?.totalPrice || 0

export default function MetaLeadsReports({ leads, records, team }: Props) {
  const { campaigns, ads, loading: adsLoading, error: adsError } = useMetaAds(leads)

  const callTotals = useMemo(() => {
    let attempts = 0
    let connectedLeads = 0
    let calledLeads = 0
    let followUps = 0
    let modifications = 0
    for (const lead of leads) {
      const s = salesStats(records[lead.id], lead.created_time)
      attempts += s.callAttempts
      if (s.callAttempts) calledLeads++
      if (s.callConnected) connectedLeads++
      followUps += s.followUpsDone
      modifications += s.modifications
    }
    const spend = Object.values(campaigns).reduce((sum, c) => sum + (c.insights?.spend || 0), 0)
    return { attempts, connectedLeads, calledLeads, followUps, modifications, spend }
  }, [leads, records, campaigns])

  const report = useMemo(() => {
    const rows: Record<string, Row> = {}
    team.forEach((t) => (rows[t.uid] = emptyRow(t.uid, t.name)))
    rows.__unassigned = emptyRow('__unassigned', 'Unassigned')

    const stageCounts: Record<string, number> = Object.fromEntries(STAGES.map((s) => [s.id, 0]))
    const lostReasons: Record<string, number> = {}
    const campaigns: Record<string, { leads: number; contacted: number; won: number; wonValue: number }> = {}
    const overdueList: { lead: MetaLead; rec: CrmRecord }[] = []
    const totals = emptyRow('total', 'Total')

    for (const lead of leads) {
      const rec = records[lead.id]
      const stage = rec?.stage || 'new'
      stageCounts[stage] = (stageCounts[stage] || 0) + 1

      const owner = rec?.assignedTo
      const rowKey = owner?.uid || '__unassigned'
      if (!rows[rowKey]) rows[rowKey] = emptyRow(rowKey, owner?.name || 'Unknown')
      const contactedAt = firstContactAt(rec)
      const overdue = isFollowUpOverdue(rec)

      for (const row of [rows[rowKey], totals]) {
        row.assigned++
        if (stage === 'new') row.untouched++
        if (contactedAt || !['new'].includes(stage)) row.contacted++
        if (rec?.proposals?.length) {
          row.withProposal++
          row.quoted += latestQuote(rec)
        }
        if (stage === 'won') {
          row.won++
          row.wonValue += rec?.dealValue || latestQuote(rec)
        }
        if (stage === 'lost') row.lost++
        if (!['won', 'lost'].includes(stage)) row.open++
        if (overdue) row.overdue++
        if (contactedAt) row.responseHours.push((new Date(contactedAt).getTime() - new Date(lead.created_time).getTime()) / 36e5)
      }

      // Count activities by who logged them (a lead can be worked by several people)
      rec?.activities?.forEach((a) => {
        if (['stage_change', 'assignment'].includes(a.type)) return
        const r = rows[a.by?.uid] || (rows[a.by?.uid] = emptyRow(a.by?.uid, a.by?.name || 'Unknown'))
        r.activities++
        totals.activities++
      })

      if (stage === 'lost') {
        const reason = rec?.lostReason || 'Other'
        lostReasons[reason] = (lostReasons[reason] || 0) + 1
      }

      const campaign = lead.campaign_name || 'Unknown campaign'
      const c = (campaigns[campaign] ||= { leads: 0, contacted: 0, won: 0, wonValue: 0 })
      c.leads++
      if (contactedAt || stage !== 'new') c.contacted++
      if (stage === 'won') {
        c.won++
        c.wonValue += rec?.dealValue || latestQuote(rec)
      }

      if (overdue && rec) overdueList.push({ lead, rec })
    }

    overdueList.sort((a, b) => String(a.rec.nextFollowUp).localeCompare(String(b.rec.nextFollowUp)))

    return {
      rows: Object.values(rows).filter((r) => r.assigned || r.activities),
      totals,
      stageCounts,
      lostReasons: Object.entries(lostReasons).sort((a, b) => b[1] - a[1]),
      campaigns: Object.entries(campaigns).sort((a, b) => b[1].leads - a[1].leads),
      overdueList,
    }
  }, [leads, records, team])

  const { totals } = report
  const maxStage = Math.max(1, ...Object.values(report.stageCounts))

  const kpis = [
    { label: 'Leads', value: totals.assigned },
    { label: 'Contacted', value: `${totals.contacted} (${pct(totals.contacted, totals.assigned)})` },
    { label: 'Proposals sent', value: totals.withProposal },
    { label: 'Total quoted', value: formatINR(totals.quoted) },
    { label: 'Won', value: `${totals.won} (${pct(totals.won, totals.assigned)})` },
    { label: 'Revenue won', value: formatINR(totals.wonValue) },
    { label: 'Avg first response', value: fmtHours(avg(totals.responseHours)) },
    { label: 'Overdue follow-ups', value: totals.overdue },
    { label: 'Call attempts', value: `${callTotals.attempts} (${callTotals.calledLeads} leads)` },
    { label: 'Call connect rate', value: pct(callTotals.connectedLeads, callTotals.calledLeads) },
    { label: 'Follow-ups done', value: callTotals.followUps },
    { label: 'Quote modifications', value: callTotals.modifications },
    { label: 'Ad spend', value: callTotals.spend ? formatINR(Math.round(callTotals.spend)) : '—' },
    { label: 'Cost per lead', value: callTotals.spend && totals.assigned ? formatINR(Math.round(callTotals.spend / totals.assigned)) : '—' },
    { label: 'Cost per booking', value: callTotals.spend && totals.won ? formatINR(Math.round(callTotals.spend / totals.won)) : '—' },
    { label: 'ROAS', value: callTotals.spend ? `${(totals.wonValue / callTotals.spend).toFixed(1)}x` : '—' },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Pipeline by stage</h3>
          <div className="space-y-2">
            {STAGES.map((s) => {
              const n = report.stageCounts[s.id] || 0
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-gray-600">{s.label}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded">
                    <div className={`h-6 rounded ${s.color}`} style={{ width: `${(n / maxStage) * 100}%`, minWidth: n ? '1.5rem' : 0 }} />
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-gray-900">
                    {n} <span className="text-xs font-normal text-gray-400">{pct(n, totals.assigned)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lost reasons */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Why leads were lost</h3>
          {report.lostReasons.length === 0 ? (
            <p className="text-sm text-gray-500">No lost leads yet.</p>
          ) : (
            <ul className="space-y-2">
              {report.lostReasons.map(([reason, n]) => (
                <li key={reason} className="flex justify-between text-sm">
                  <span className="text-gray-700">{reason}</span>
                  <span className="font-semibold text-gray-900">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Ad spend → bookings */}
      <AdRoiTable leads={leads} records={records} campaigns={campaigns} ads={ads} loading={adsLoading} error={adsError} />

      {/* Salesperson performance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Salesperson performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
              <tr>
                {['Salesperson', 'Leads', 'Untouched', 'Contacted', 'Proposals', 'Quoted', 'Won', 'Revenue', 'Lost', 'Conversion', 'Overdue', 'Activities', 'Avg response'].map((h) => (
                  <th key={h} className={`px-4 py-2 ${h === 'Salesperson' ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...report.rows, totals].map((r) => (
                <tr key={r.key} className={r.key === 'total' ? 'bg-gray-50 font-semibold' : ''}>
                  <td className="px-4 py-2 text-gray-900">{r.name}</td>
                  <td className="px-4 py-2 text-right">{r.assigned}</td>
                  <td className={`px-4 py-2 text-right ${r.untouched ? 'text-amber-600' : ''}`}>{r.untouched}</td>
                  <td className="px-4 py-2 text-right">{r.contacted}</td>
                  <td className="px-4 py-2 text-right">{r.withProposal}</td>
                  <td className="px-4 py-2 text-right">{formatINR(r.quoted)}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{r.won}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{formatINR(r.wonValue)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{r.lost}</td>
                  <td className="px-4 py-2 text-right">{pct(r.won, r.assigned)}</td>
                  <td className={`px-4 py-2 text-right ${r.overdue ? 'text-red-600 font-semibold' : ''}`}>{r.overdue}</td>
                  <td className="px-4 py-2 text-right">{r.activities}</td>
                  <td className="px-4 py-2 text-right">{fmtHours(avg(r.responseHours))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-2 text-xs text-gray-400 border-t border-gray-100">
          Lead counts are by assigned salesperson. Activities are counted for whoever logged them. Avg response = time from lead
          arriving to the first call / WhatsApp / email / meeting / proposal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign performance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Campaign performance</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Campaign</th>
                <th className="px-4 py-2 text-right">Leads</th>
                <th className="px-4 py-2 text-right">Contacted</th>
                <th className="px-4 py-2 text-right">Won</th>
                <th className="px-4 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.campaigns.map(([name, c]) => (
                <tr key={name}>
                  <td className="px-4 py-2 text-gray-900">{name}</td>
                  <td className="px-4 py-2 text-right">{c.leads}</td>
                  <td className="px-4 py-2 text-right">{c.contacted}</td>
                  <td className="px-4 py-2 text-right">
                    {c.won} <span className="text-xs text-gray-400">{pct(c.won, c.leads)}</span>
                  </td>
                  <td className="px-4 py-2 text-right">{formatINR(c.wonValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Overdue follow-ups */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-red-50">
            <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Overdue follow-ups ({report.overdueList.length})
            </h3>
          </div>
          {report.overdueList.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No overdue follow-ups. 🎉</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {report.overdueList.map(({ lead, rec }) => (
                <li key={lead.id}>
                  <Link href={`/admin/meta-leads/${lead.id}`} className="flex justify-between gap-3 px-5 py-2.5 hover:bg-gray-50">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{leadName(lead)}</div>
                      <div className="text-xs text-gray-500">{rec.assignedTo?.name || 'Unassigned'}</div>
                    </div>
                    <div className="text-xs text-red-600 text-right">{formatDateTime(rec.nextFollowUp)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Form answers & daily trend */}
      <LeadInsights leads={leads} records={records} />
    </div>
  )
}
