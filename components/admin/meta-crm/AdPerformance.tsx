'use client'

import { useMemo, useState } from 'react'
import {
  formatINR,
  humanize,
  salesStats,
  type CrmRecord,
  type MetaAdInfo,
  type MetaCampaignInfo,
  type MetaLead,
} from '@/lib/metaLeadsCrm'

interface FunnelRow {
  key: string
  name: string
  sub?: string
  thumbnail?: string
  status?: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  metaLeads: number
  leads: number
  contacted: number
  connected: number
  quoted: number
  won: number
  revenue: number
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—')
const money = (n: number) => (n ? formatINR(Math.round(n)) : '—')
const ratio = (spend: number, n: number) => (spend && n ? formatINR(Math.round(spend / n)) : '—')
const roas = (revenue: number, spend: number) => (spend ? `${(revenue / spend).toFixed(1)}x` : '—')
const statusTone = (s?: string) =>
  s === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : s ? 'bg-gray-100 text-gray-600' : ''

/** Ad spend → leads → calls → quotes → bookings, per campaign or per ad, with cost per step and ROAS. */
export function AdRoiTable({
  leads,
  records,
  campaigns,
  ads,
  loading,
  error,
}: {
  leads: MetaLead[]
  records: Record<string, CrmRecord>
  campaigns: Record<string, MetaCampaignInfo>
  ads: Record<string, MetaAdInfo>
  loading: boolean
  error: string | null
}) {
  const [level, setLevel] = useState<'campaign' | 'ad'>('campaign')

  const rows = useMemo(() => {
    const map: Record<string, FunnelRow> = {}
    for (const lead of leads) {
      const key = (level === 'campaign' ? lead.campaign_id : lead.ad_id) || 'unknown'
      if (!map[key]) {
        const camp = lead.campaign_id ? campaigns[lead.campaign_id] : undefined
        const ad = lead.ad_id ? ads[lead.ad_id] : undefined
        const info = level === 'campaign' ? camp : ad
        const ins = info?.insights
        map[key] = {
          key,
          name: (level === 'campaign' ? camp?.name || lead.campaign_name : ad?.name || lead.ad_name) || 'Unknown',
          sub: level === 'ad' ? camp?.name || lead.campaign_name : undefined,
          thumbnail: level === 'ad' ? ad?.creative?.thumbnail_url : undefined,
          status: info?.effective_status,
          spend: ins?.spend || 0,
          impressions: ins?.impressions || 0,
          clicks: ins?.clicks || 0,
          ctr: ins?.ctr || 0,
          metaLeads: ins?.metaLeads || 0,
          leads: 0,
          contacted: 0,
          connected: 0,
          quoted: 0,
          won: 0,
          revenue: 0,
        }
      }
      const row = map[key]
      const rec = records[lead.id]
      const s = salesStats(rec, lead.created_time)
      row.leads++
      if (s.firstContactAt || (rec && rec.stage !== 'new')) row.contacted++
      if (s.callConnected) row.connected++
      if (s.quoteSent) row.quoted++
      if (rec?.stage === 'won') {
        row.won++
        row.revenue += rec.dealValue || s.latestQuote || 0
      }
    }
    return Object.values(map).sort((a, b) => b.spend - a.spend || b.leads - a.leads)
  }, [leads, records, campaigns, ads, level])

  const total = rows.reduce(
    (t, r) => ({
      ...t,
      spend: t.spend + r.spend,
      impressions: t.impressions + r.impressions,
      clicks: t.clicks + r.clicks,
      metaLeads: t.metaLeads + r.metaLeads,
      leads: t.leads + r.leads,
      contacted: t.contacted + r.contacted,
      connected: t.connected + r.connected,
      quoted: t.quoted + r.quoted,
      won: t.won + r.won,
      revenue: t.revenue + r.revenue,
    }),
    { key: 'total', name: 'Total', spend: 0, impressions: 0, clicks: 0, ctr: 0, metaLeads: 0, leads: 0, contacted: 0, connected: 0, quoted: 0, won: 0, revenue: 0 } as FunnelRow
  )

  const headers = ['Spend', 'Impr.', 'Clicks', 'CTR', 'Leads', 'Contacted', 'Connected', 'Quoted', 'Won', 'Revenue', 'Cost/Lead', 'Cost/Quote', 'Cost/Booking', 'ROAS']

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-blue-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-blue-900">Ad spend → bookings (ROI)</h3>
          <p className="text-xs text-blue-700/80">Lifetime spend from Meta Ads Manager, joined with what your team did with each lead.</p>
        </div>
        <div className="inline-flex rounded-lg border border-blue-200 overflow-hidden text-xs font-medium bg-white">
          {(['campaign', 'ad'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`px-3 py-1.5 ${level === l ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-50'}`}
            >
              By {l}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="px-5 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">{level === 'campaign' ? 'Campaign' : 'Ad'}</th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-right whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && !rows.some((r) => r.spend) && (
              <tr>
                <td colSpan={headers.length + 1} className="px-4 py-3 text-xs text-gray-500">
                  Loading spend from Meta...
                </td>
              </tr>
            )}
            {[...rows, total].map((r) => (
              <tr key={r.key} className={r.key === 'total' ? 'bg-gray-50 font-semibold' : ''}>
                <td className="px-4 py-2 min-w-[14rem]">
                  <div className="flex items-center gap-2">
                    {r.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.thumbnail} alt="" className="w-9 h-9 rounded object-cover border border-gray-200 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-gray-900 truncate" title={r.name}>
                        {r.name}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {r.status && (
                          <span className={`px-1.5 rounded text-[10px] font-medium ${statusTone(r.status)}`}>
                            {r.status.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        )}
                        {r.sub && <span className="text-[11px] text-gray-400 truncate">{r.sub}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{money(r.spend)}</td>
                <td className="px-3 py-2 text-right">{r.impressions ? r.impressions.toLocaleString('en-IN') : '—'}</td>
                <td className="px-3 py-2 text-right">{r.clicks ? r.clicks.toLocaleString('en-IN') : '—'}</td>
                <td className="px-3 py-2 text-right">{r.impressions ? `${((r.clicks / r.impressions) * 100).toFixed(2)}%` : '—'}</td>
                <td className="px-3 py-2 text-right" title={`Meta counted ${r.metaLeads} leads`}>
                  {r.leads}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.contacted} <span className="text-[10px] text-gray-400">{pct(r.contacted, r.leads)}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  {r.connected} <span className="text-[10px] text-gray-400">{pct(r.connected, r.leads)}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  {r.quoted} <span className="text-[10px] text-gray-400">{pct(r.quoted, r.leads)}</span>
                </td>
                <td className="px-3 py-2 text-right text-emerald-700">
                  {r.won} <span className="text-[10px] text-gray-400">{pct(r.won, r.leads)}</span>
                </td>
                <td className="px-3 py-2 text-right text-emerald-700 whitespace-nowrap">{money(r.revenue)}</td>
                <td className="px-3 py-2 text-right text-blue-700 whitespace-nowrap">{ratio(r.spend, r.leads)}</td>
                <td className="px-3 py-2 text-right text-blue-700 whitespace-nowrap">{ratio(r.spend, r.quoted)}</td>
                <td className="px-3 py-2 text-right text-blue-700 whitespace-nowrap">{ratio(r.spend, r.won)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${r.spend && r.revenue >= r.spend ? 'text-emerald-700' : 'text-gray-700'}`}>
                  {roas(r.revenue, r.spend)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-2 text-xs text-gray-400 border-t border-gray-100">
        Leads = leads available through the API (Meta&apos;s own count is in the tooltip). Connected = at least one call logged as
        &quot;Connected&quot;. ROAS = revenue won ÷ ad spend.
      </p>
    </div>
  )
}

const SKIP_KEYS = ['full_name', 'first_name', 'last_name', 'phone_number', 'email', 'name']

/** What leads answered on the form, with how each answer converts. */
export function LeadInsights({ leads, records }: { leads: MetaLead[]; records: Record<string, CrmRecord> }) {
  const questions = useMemo(() => {
    const byKey: Record<string, Record<string, { count: number; won: number; quoted: number }>> = {}
    for (const lead of leads) {
      const rec = records[lead.id]
      for (const f of lead.field_data || []) {
        if (SKIP_KEYS.includes(f.name.toLowerCase())) continue
        const value = (f.values[0] || '—').trim().replace(/_/g, ' ')
        const q = (byKey[f.name] ||= {})
        const v = (q[value.toLowerCase()] ||= { count: 0, won: 0, quoted: 0 })
        v.count++
        if (rec?.stage === 'won') v.won++
        if (rec?.proposals?.length) v.quoted++
      }
    }
    // Only questions with a manageable number of distinct answers make a useful breakdown
    return Object.entries(byKey)
      .map(([key, values]) => ({
        key,
        values: Object.entries(values).sort((a, b) => b[1].count - a[1].count),
      }))
      .filter((q) => q.values.length > 1 && q.values.length <= 15)
  }, [leads, records])

  const daily = useMemo(() => {
    const days: { label: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = d.getTime() + 864e5
      days.push({
        label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        count: leads.filter((l) => {
          const t = new Date(l.created_time).getTime()
          return t >= d.getTime() && t < next
        }).length,
      })
    }
    return days
  }, [leads])
  const maxDay = Math.max(1, ...daily.map((d) => d.count))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Leads per day (last 30 days)</h3>
        <div className="flex items-end gap-1 h-32">
          {daily.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full group" title={`${d.label}: ${d.count} leads`}>
              <span className="text-[9px] text-gray-500 opacity-0 group-hover:opacity-100">{d.count}</span>
              <div className="w-full rounded-t bg-blue-500/80 group-hover:bg-blue-600" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 3 : 0 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{daily[0]?.label}</span>
          <span>{daily[daily.length - 1]?.label}</span>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">What leads told us (form answers)</h3>
            <p className="text-xs text-gray-500">Which answers turn into quotes and bookings, so you can target better.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200">
            {questions.map((q) => {
              const max = Math.max(...q.values.map(([, v]) => v.count))
              return (
                <div key={q.key} className="bg-white p-5">
                  <div className="text-sm font-semibold text-gray-800 mb-3">{humanize(q.key)}</div>
                  <div className="space-y-2">
                    {q.values.map(([value, v]) => (
                      <div key={value}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-700 capitalize truncate pr-2" title={value}>
                            {value}
                          </span>
                          <span className="text-gray-500 whitespace-nowrap">
                            {v.count} · {v.quoted} quoted · <span className="text-emerald-700">{v.won} won</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded">
                          <div className="h-2 rounded bg-indigo-400" style={{ width: `${(v.count / max) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
