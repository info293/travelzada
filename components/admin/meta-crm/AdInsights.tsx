'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  Target,
  Send,
  Radio,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  AD_COACH_COLLECTION,
  META_STAGE_EVENTS,
  STAGES,
  formatDateTime,
  formatINR,
  humanize,
  salesStats,
  type CrmRecord,
  type MetaLead,
} from '@/lib/metaLeadsCrm'

type Row = Record<string, any>

interface InsightsData {
  account: { name: string; currency: string; amountSpent: number; balance: number }
  campaigns: Row[]
  totals: Row | null
  byCampaign: Row[]
  ageGender: Row[]
  region: Row[]
  placement: Row[]
  device: Row[]
  hour: Row[]
  daily: Row[]
  ads: Row[]
  adsets: Row[]
  errors: string[]
  fetchedAt: string
  empty?: boolean
}

interface CoachReport {
  headline: string
  healthScore: number
  summary: string
  keyFindings: { title: string; detail: string; impact: 'high' | 'medium' | 'low' }[]
  actions: {
    priority: number
    category: string
    title: string
    why: string
    howToApply: string
    expectedImpact: string
    effort: 'quick' | 'medium' | 'big'
  }[]
  audienceInsights: string
  creativeIdeas: { angle: string; format: string; primaryText: string; headline: string; description: string }[]
  formImprovements: string[]
  salesProcessTips: string[]
  dataGaps: string[]
}

interface SavedReport {
  id: string
  createdAt: string
  createdBy: string
  preset: string
  question?: string
  report: CoachReport
}

const PRESETS = [
  { id: 'maximum', label: 'All time' },
  { id: 'last_90d', label: 'Last 90 days' },
  { id: 'last_30d', label: 'Last 30 days' },
  { id: 'last_14d', label: 'Last 14 days' },
  { id: 'last_7d', label: 'Last 7 days' },
]

const presetStart = (preset: string) => {
  const days = { last_90d: 90, last_30d: 30, last_14d: 14, last_7d: 7 }[preset]
  return days ? Date.now() - days * 864e5 : 0
}

const money = (n?: number | null) => (n ? formatINR(Math.round(n)) : '—')
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—')
const IMPACT_TONE = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600' }
const RANK_TONE = (r?: string) =>
  !r || r === 'UNKNOWN'
    ? 'bg-gray-100 text-gray-500'
    : r.startsWith('ABOVE')
      ? 'bg-emerald-100 text-emerald-700'
      : r === 'AVERAGE'
        ? 'bg-sky-100 text-sky-700'
        : 'bg-red-100 text-red-700'

/** Lead → booking funnel from the CRM for a set of leads */
function funnel(leads: MetaLead[], records: Record<string, CrmRecord>) {
  const f = { leads: 0, contacted: 0, connected: 0, quoted: 0, won: 0, revenue: 0, lost: 0 }
  for (const l of leads) {
    const rec = records[l.id]
    const s = salesStats(rec, l.created_time)
    f.leads++
    if (s.firstContactAt || (rec && rec.stage !== 'new')) f.contacted++
    if (s.callConnected) f.connected++
    if (s.quoteSent) f.quoted++
    if (rec?.stage === 'won') {
      f.won++
      f.revenue += rec.dealValue || s.latestQuote || 0
    }
    if (rec?.stage === 'lost') f.lost++
  }
  return f
}

const groupBy = <T,>(items: T[], key: (t: T) => string | undefined) => {
  const map: Record<string, T[]> = {}
  for (const i of items) {
    const k = key(i) || 'unknown'
    ;(map[k] ||= []).push(i)
  }
  return map
}

export default function AdInsights({ leads, records }: { leads: MetaLead[]; records: Record<string, CrmRecord> }) {
  const { currentUser } = useAuth()
  const [preset, setPreset] = useState('maximum')
  const [scope, setScope] = useState<'lead' | 'all'>('lead')
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const idToken = await currentUser!.getIdToken()
      const res = await fetch(url, {
        ...init,
        headers: { ...(init?.headers || {}), Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
      return json
    },
    [currentUser]
  )

  const load = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      setData(await authedFetch(`/api/facebook/meta-insights?preset=${preset}&scope=${scope}`))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser, authedFetch, preset, scope])

  useEffect(() => {
    load()
  }, [load])

  // CRM leads in the same date range as the Meta numbers
  const rangeLeads = useMemo(() => {
    const start = presetStart(preset)
    return start ? leads.filter((l) => new Date(l.created_time).getTime() >= start) : leads
  }, [leads, preset])

  const crm = useMemo(() => {
    const total = funnel(rangeLeads, records)
    const byCampaign = Object.fromEntries(
      Object.entries(groupBy(rangeLeads, (l) => l.campaign_id)).map(([k, ls]) => [k, funnel(ls, records)])
    )
    const byAd = Object.fromEntries(Object.entries(groupBy(rangeLeads, (l) => l.ad_id)).map(([k, ls]) => [k, funnel(ls, records)]))
    const byPlatform = Object.fromEntries(
      Object.entries(groupBy(rangeLeads, (l) => (l.platform === 'ig' ? 'instagram' : l.platform === 'fb' ? 'facebook' : l.platform))).map(
        ([k, ls]) => [k, funnel(ls, records)]
      )
    )
    const byHour = Object.fromEntries(
      Object.entries(groupBy(rangeLeads, (l) => String(new Date(l.created_time).getHours()).padStart(2, '0'))).map(([k, ls]) => [
        k,
        funnel(ls, records),
      ])
    )
    const answers: Record<string, Record<string, ReturnType<typeof funnel>>> = {}
    const answerGroups: Record<string, Record<string, MetaLead[]>> = {}
    for (const l of rangeLeads) {
      for (const f of l.field_data || []) {
        if (['full_name', 'phone_number', 'email', 'first_name', 'last_name'].includes(f.name)) continue
        const v = (f.values[0] || '—').toLowerCase().replace(/_/g, ' ').trim()
        ;((answerGroups[f.name] ||= {})[v] ||= []).push(l)
      }
    }
    for (const [q, vals] of Object.entries(answerGroups)) {
      if (Object.keys(vals).length > 15) continue // free-text questions aren't useful as groups
      answers[q] = Object.fromEntries(Object.entries(vals).map(([v, ls]) => [v, funnel(ls, records)]))
    }
    const lostReasons: Record<string, number> = {}
    const responseHours: number[] = []
    for (const l of rangeLeads) {
      const rec = records[l.id]
      if (rec?.stage === 'lost') lostReasons[rec.lostReason || 'Other'] = (lostReasons[rec.lostReason || 'Other'] || 0) + 1
      const h = salesStats(rec, l.created_time).firstResponseHours
      if (h !== undefined) responseHours.push(h)
    }
    const avgResponseHours = responseHours.length ? responseHours.reduce((a, b) => a + b, 0) / responseHours.length : null
    return { total, byCampaign, byAd, byPlatform, byHour, answers, lostReasons, avgResponseHours }
  }, [rangeLeads, records])

  const totals = data?.totals
  const kpis = totals
    ? [
        { label: 'Spend', value: money(totals.spend) },
        { label: 'Reach', value: totals.reach.toLocaleString('en-IN') },
        { label: 'Frequency', value: totals.frequency.toFixed(2), warn: totals.frequency > 3 },
        { label: 'CTR', value: `${totals.ctr.toFixed(2)}%` },
        { label: 'CPM', value: money(totals.cpm) },
        { label: 'Meta leads', value: totals.leads },
        { label: 'Cost / lead', value: money(totals.cpl) },
        { label: 'Cost / quote', value: crm.total.quoted ? money(totals.spend / crm.total.quoted) : '—' },
        { label: 'Bookings (CRM)', value: crm.total.won },
        { label: 'Cost / booking', value: crm.total.won ? money(totals.spend / crm.total.won) : '—' },
        { label: 'Revenue (CRM)', value: money(crm.total.revenue) },
        { label: 'ROAS', value: totals.spend ? `${(crm.total.revenue / totals.spend).toFixed(1)}x` : '—' },
      ]
    : []

  // Compact payload for Claude: Meta insights + CRM outcomes
  const coachData = useMemo(() => {
    if (!data || data.empty) return null
    const slim = (rows: Row[], keys: string[]) =>
      rows.map((r) => Object.fromEntries(['spend', 'impressions', 'clicks', 'ctr', 'cpm', 'leads', 'cpl', ...keys].map((k) => [k, r[k]])))
    return {
      account: data.account,
      totals: data.totals,
      campaigns: data.byCampaign.map((c) => {
        const meta = data.campaigns.find((x) => x.id === c.campaign_id)
        return {
          ...slim([c], ['campaign_name', 'frequency'])[0],
          status: meta?.effective_status,
          objective: meta?.objective,
          dailyBudget: meta?.daily_budget ? Number(meta.daily_budget) / 100 : null,
          crm: crm.byCampaign[c.campaign_id] || null,
        }
      }),
      adsets: data.adsets,
      ads: data.ads.map((a) => ({
        ...slim([a], ['ad_name', 'adset_name', 'campaign_name', 'frequency', 'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking'])[0],
        video: a.video,
        crm: crm.byAd[a.ad_id] || null,
      })),
      breakdowns: {
        ageGender: slim(data.ageGender, ['age', 'gender']),
        region: slim(data.region, ['region']),
        placement: slim(data.placement, ['publisher_platform', 'platform_position']),
        device: slim(data.device, ['impression_device']),
        hourMeta: slim(data.hour, ['hourly_stats_aggregated_by_advertiser_time_zone']),
        daily: slim(data.daily, ['date_start', 'frequency']),
      },
      crm: {
        totals: crm.total,
        byPlatform: crm.byPlatform,
        byHourLeadArrived: crm.byHour,
        formAnswers: crm.answers,
        lostReasons: crm.lostReasons,
        avgFirstResponseHours: crm.avgResponseHours,
      },
    }
  }, [data, crm])

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Meta Ad Insights {data?.account ? `· ${data.account.name}` : ''}</h3>
          <p className="text-xs text-gray-500">
            {data?.fetchedAt ? `Updated ${formatDateTime(data.fetchedAt)}` : 'Live from Meta Ads Manager'}
            {data?.account ? ` · Account balance ${formatINR(Math.round(data.account.balance))} · Lifetime spend ${formatINR(Math.round(data.account.amountSpent))}` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <select value={scope} onChange={(e) => setScope(e.target.value as 'lead' | 'all')} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
            <option value="lead">Lead campaigns</option>
            <option value="all">All campaigns</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}
      {!!data?.errors?.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">Some data could not be loaded: {data.errors.join(' · ')}</div>
      )}
      {loading && !data && (
        <div className="p-12 text-center text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2" /> Loading insights from Meta...
        </div>
      )}
      {data?.empty && <p className="text-sm text-gray-500">No campaigns in this scope.</p>}

      {data && !data.empty && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className={`bg-white rounded-xl border shadow-sm p-3 ${k.warn ? 'border-amber-300' : 'border-gray-200'}`}>
                <div className="text-[11px] text-gray-500">{k.label}</div>
                <div className={`text-lg font-bold ${k.warn ? 'text-amber-600' : 'text-gray-900'}`}>{k.value}</div>
              </div>
            ))}
          </div>

          <AdCoach coachData={coachData} preset={preset} authedFetch={authedFetch} createdBy={currentUser?.email || ''} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownCard
              title="Age & gender"
              note="Meta totals. Booking outcomes aren't available per age."
              rows={data.ageGender.map((r) => ({ ...r, label: `${r.age} · ${r.gender}` }))}
            />
            <BreakdownCard
              title="Placements"
              rows={data.placement.map((r) => ({ ...r, label: `${humanize(r.publisher_platform)} · ${humanize(r.platform_position)}` }))}
            />
            <BreakdownCard title="Regions" rows={data.region.map((r) => ({ ...r, label: r.region }))} />
            <BreakdownCard title="Devices" rows={data.device.map((r) => ({ ...r, label: humanize(r.impression_device) }))} />
          </div>

          <PlatformFunnel byPlatform={crm.byPlatform} />
          <HourCard metaHours={data.hour} crmHours={crm.byHour} />
          <DailyTrend daily={data.daily} />
          <AdsQuality ads={data.ads} crmByAd={crm.byAd} />
          <Targeting adsets={data.adsets} campaigns={data.campaigns} byCampaign={data.byCampaign} crmByCampaign={crm.byCampaign} />
        </>
      )}

      <CrmToMeta records={records} authedFetch={authedFetch} />
    </div>
  )
}

// ---------- AI Ad Coach ----------

function AdCoach({
  coachData,
  preset,
  authedFetch,
  createdBy,
}: {
  coachData: any
  preset: string
  authedFetch: (url: string, init?: RequestInit) => Promise<any>
  createdBy: string
}) {
  const [reports, setReports] = useState<SavedReport[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, AD_COACH_COLLECTION), orderBy('createdAt', 'desc'), limit(10)))
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedReport, 'id'>) }))
      setReports(list)
      setSelectedId((cur) => cur || list[0]?.id || null)
    } catch (err) {
      console.error('Error loading ad coach reports:', err)
    }
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const run = async () => {
    if (!coachData) return
    setRunning(true)
    setError(null)
    try {
      const json = await authedFetch('/api/ai/ad-coach', {
        method: 'POST',
        body: JSON.stringify({ data: coachData, preset, question, createdBy }),
      })
      setQuestion('')
      await loadReports()
      setSelectedId(json.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const selected = reports.find((r) => r.id === selectedId)

  return (
    <div className="bg-white rounded-xl shadow-lg border border-violet-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" /> AI Ad Coach
          <span className="text-[10px] font-medium text-violet-500 bg-white/70 px-1.5 py-0.5 rounded">Claude</span>
        </h3>
        {reports.length > 0 && (
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-2 py-1 text-xs border border-violet-200 rounded-lg bg-white"
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDateTime(r.createdAt)} · {PRESETS.find((p) => p.id === r.preset)?.label || r.preset}
                {r.createdBy ? ` · ${r.createdBy}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='Optional focus, e.g. "Why are Instagram leads not booking?" or "How do I get cheaper Bali leads?"'
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none"
          />
          <button
            onClick={run}
            disabled={running || !coachData}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Analysing… (1–3 min)' : 'Analyse my ads'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!selected && !running && (
          <p className="text-sm text-gray-500">
            Claude reviews spend, audiences, placements, creatives, timing and what actually booked in your CRM, then gives a
            prioritised action plan and new ad copy. Reports are saved for the whole team.
          </p>
        )}
        {selected && <CoachReportView report={selected.report} question={selected.question} />}
      </div>
    </div>
  )
}

function CoachReportView({ report: r, question }: { report: CoachReport; question?: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }
  const actions = [...r.actions].sort((a, b) => a.priority - b.priority)
  const scoreTone = r.healthScore >= 70 ? 'text-emerald-600' : r.healthScore >= 45 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-5">
      {question && <p className="text-xs text-violet-700">Focus: {question}</p>}
      <div className="flex gap-4 items-start">
        <div className="text-center flex-shrink-0">
          <div className={`text-3xl font-bold ${scoreTone}`}>{r.healthScore}</div>
          <div className="text-[10px] text-gray-500">health / 100</div>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">{r.headline}</p>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{r.summary}</p>
        </div>
      </div>

      <section>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Key findings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {r.keyFindings.map((f) => (
            <div key={f.title} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${IMPACT_TONE[f.impact]}`}>{f.impact}</span>
                <span className="text-sm font-semibold text-gray-900">{f.title}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Action plan</h4>
        <ol className="space-y-3">
          {(showAll ? actions : actions.slice(0, 5)).map((a) => (
            <li key={a.priority + a.title} className="rounded-lg border border-violet-100 bg-violet-50/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">{a.priority}</span>
                <span className="text-sm font-semibold text-gray-900">{a.title}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-gray-200 text-gray-600">{humanize(a.category)}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-gray-200 text-gray-600">{a.effort} effort</span>
              </div>
              <p className="text-xs text-gray-700 mt-2">
                <strong>Why:</strong> {a.why}
              </p>
              <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                <strong>How:</strong> {a.howToApply}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                <strong>Expected:</strong> {a.expectedImpact}
              </p>
            </li>
          ))}
        </ol>
        {actions.length > 5 && (
          <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs font-medium text-violet-700 flex items-center gap-1">
            {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAll ? 'Show fewer' : `Show all ${actions.length} actions`}
          </button>
        )}
      </section>

      {r.audienceInsights && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Audience insights</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.audienceInsights}</p>
        </section>
      )}

      {!!r.creativeIdeas.length && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">New ad copy ideas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {r.creativeIdeas.map((c, i) => {
              const text = `${c.primaryText}\n\nHeadline: ${c.headline}\nDescription: ${c.description}`
              return (
                <div key={i} className="rounded-lg border border-gray-200 p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      {c.angle} <span className="font-normal text-gray-500">· {c.format}</span>
                    </span>
                    <button onClick={() => copy(`c${i}`, text)} className="inline-flex items-center gap-1 text-violet-700">
                      {copied === `c${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied === `c${i}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{c.primaryText}</p>
                  <p className="text-gray-900 font-semibold">{c.headline}</p>
                  <p className="text-gray-500">{c.description}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {(
          [
            ['Lead form improvements', r.formImprovements],
            ['Sales process tips', r.salesProcessTips],
            ['Data gaps to fix', r.dataGaps],
          ] as [string, string[]][]
        ).map(([title, items]) =>
          items.length ? (
            <section key={title}>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">{title}</h4>
              <ul className="list-disc ml-4 space-y-1 text-gray-700">
                {items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
          ) : null
        )}
      </div>
    </div>
  )
}

// ---------- Breakdowns ----------

function BreakdownCard({ title, rows, note }: { title: string; rows: Row[]; note?: string }) {
  const sorted = [...rows].sort((a, b) => b.spend - a.spend)
  const withCpl = sorted.filter((r) => r.cpl)
  const best = withCpl.length > 1 ? Math.min(...withCpl.map((r) => r.cpl)) : null
  const worst = withCpl.length > 1 ? Math.max(...withCpl.map((r) => r.cpl)) : null
  const maxSpend = Math.max(1, ...sorted.map((r) => r.spend))

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {note && <p className="text-[11px] text-gray-500">{note}</p>}
      </div>
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-xs">
          <thead className="text-gray-500 bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Segment</th>
              <th className="px-3 py-2 text-left w-1/4">Spend</th>
              <th className="px-3 py-2 text-right">CTR</th>
              <th className="px-3 py-2 text-right">Leads</th>
              <th className="px-3 py-2 text-right">Cost/lead</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((r) => (
              <tr key={r.label}>
                <td className="px-3 py-1.5 text-gray-800 capitalize whitespace-nowrap">{r.label}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded bg-blue-400" style={{ width: `${(r.spend / maxSpend) * 100}%`, minWidth: 2 }} />
                    <span className="text-gray-600 whitespace-nowrap">{money(r.spend)}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right">{r.ctr ? `${r.ctr.toFixed(2)}%` : '—'}</td>
                <td className="px-3 py-1.5 text-right">{r.leads || '—'}</td>
                <td
                  className={`px-3 py-1.5 text-right font-semibold ${
                    r.cpl && r.cpl === best ? 'text-emerald-700' : r.cpl && r.cpl === worst ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  {r.cpl ? money(r.cpl) : r.spend > 0 ? <span className="text-red-500">no leads</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlatformFunnel({ byPlatform }: { byPlatform: Record<string, ReturnType<typeof funnel>> }) {
  const rows = Object.entries(byPlatform)
  if (!rows.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Facebook vs Instagram: what happens after the lead (CRM)</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 bg-gray-50">
          <tr>
            {['Platform', 'Leads', 'Contacted', 'Call connected', 'Quoted', 'Won', 'Revenue'].map((h) => (
              <th key={h} className={`px-4 py-2 ${h === 'Platform' ? 'text-left' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(([p, f]) => (
            <tr key={p}>
              <td className="px-4 py-2 capitalize font-medium text-gray-900">{p}</td>
              <td className="px-4 py-2 text-right">{f.leads}</td>
              <td className="px-4 py-2 text-right">
                {f.contacted} <span className="text-[10px] text-gray-400">{pct(f.contacted, f.leads)}</span>
              </td>
              <td className="px-4 py-2 text-right">
                {f.connected} <span className="text-[10px] text-gray-400">{pct(f.connected, f.leads)}</span>
              </td>
              <td className="px-4 py-2 text-right">
                {f.quoted} <span className="text-[10px] text-gray-400">{pct(f.quoted, f.leads)}</span>
              </td>
              <td className="px-4 py-2 text-right text-emerald-700">
                {f.won} <span className="text-[10px] text-gray-400">{pct(f.won, f.leads)}</span>
              </td>
              <td className="px-4 py-2 text-right text-emerald-700">{money(f.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HourCard({ metaHours, crmHours }: { metaHours: Row[]; crmHours: Record<string, ReturnType<typeof funnel>> }) {
  const hours = Array.from({ length: 24 }, (_, h) => {
    const key = String(h).padStart(2, '0')
    const meta = metaHours.find((r) => String(r.hourly_stats_aggregated_by_advertiser_time_zone || '').startsWith(key))
    return { h, key, spend: meta?.spend || 0, metaLeads: meta?.leads || 0, crm: crmHours[key] }
  })
  const max = Math.max(1, ...hours.map((x) => Math.max(x.metaLeads, x.crm?.leads || 0)))

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900">When leads arrive (hour of day)</h3>
      <p className="text-[11px] text-gray-500 mb-4">
        Blue: leads per hour (CRM). Green dot: bookings from leads that arrived in that hour. Hover for spend and cost per lead.
      </p>
      <div className="flex items-end gap-1 h-36">
        {hours.map((x) => {
          const leads = x.crm?.leads || x.metaLeads
          return (
            <div
              key={x.h}
              className="flex-1 flex flex-col items-center justify-end h-full group"
              title={`${x.key}:00 · ${leads} leads · ${x.crm?.won || 0} won · spend ${money(x.spend)}${x.metaLeads ? ` · CPL ${money(x.spend / x.metaLeads)}` : ''}`}
            >
              {!!x.crm?.won && <div className="w-2 h-2 rounded-full bg-emerald-500 mb-0.5" />}
              <div className="w-full rounded-t bg-blue-500/80 group-hover:bg-blue-600" style={{ height: `${(leads / max) * 100}%`, minHeight: leads ? 3 : 0 }} />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
    </div>
  )
}

function DailyTrend({ daily }: { daily: Row[] }) {
  if (!daily.length) return null
  const rows = [...daily].sort((a, b) => String(a.date_start).localeCompare(String(b.date_start))).slice(-60)
  const maxSpend = Math.max(1, ...rows.map((r) => r.spend))
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900">Daily trend</h3>
      <p className="text-[11px] text-gray-500 mb-4">
        Bars: spend per day. Number above: leads. Orange: frequency above 3 (people seeing the ad too often).
      </p>
      <div className="flex items-end gap-1 h-40">
        {rows.map((r) => (
          <div
            key={r.date_start}
            className="flex-1 flex flex-col items-center justify-end h-full"
            title={`${r.date_start} · spend ${money(r.spend)} · ${r.leads} leads · CPL ${money(r.cpl)} · CTR ${r.ctr.toFixed(2)}% · frequency ${r.frequency.toFixed(2)}`}
          >
            <span className="text-[9px] text-gray-600">{r.leads || ''}</span>
            <div
              className={`w-full rounded-t ${r.frequency > 3 ? 'bg-orange-400' : 'bg-indigo-400'}`}
              style={{ height: `${(r.spend / maxSpend) * 100}%`, minHeight: r.spend ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{rows[0]?.date_start}</span>
        <span>{rows[rows.length - 1]?.date_start}</span>
      </div>
    </div>
  )
}

function AdsQuality({ ads, crmByAd }: { ads: Row[]; crmByAd: Record<string, ReturnType<typeof funnel>> }) {
  if (!ads.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Ad quality, creative & outcomes</h3>
        <p className="text-[11px] text-gray-500">Rankings compare your ad with competitors for the same audience. Video: % of 3-second+ viewers who reached 25/50/75/100%.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-gray-500 bg-gray-50">
            <tr>
              {['Ad', 'Spend', 'Leads', 'CPL', 'CTR', 'Freq.', 'Quality', 'Engagement', 'Conversion', 'Video 25→100%', 'Quoted', 'Won'].map((h) => (
                <th key={h} className={`px-3 py-2 ${h === 'Ad' ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...ads]
              .sort((a, b) => b.spend - a.spend)
              .map((a) => {
                const crm = crmByAd[a.ad_id]
                const v = a.video || {}
                return (
                  <tr key={a.ad_id}>
                    <td className="px-3 py-2 min-w-[12rem]">
                      <div className="font-medium text-gray-900">{a.ad_name}</div>
                      <div className="text-[10px] text-gray-400">{a.campaign_name}</div>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{money(a.spend)}</td>
                    <td className="px-3 py-2 text-right">{a.leads}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{money(a.cpl)}</td>
                    <td className="px-3 py-2 text-right">{a.ctr.toFixed(2)}%</td>
                    <td className={`px-3 py-2 text-right ${a.frequency > 3 ? 'text-orange-600 font-semibold' : ''}`}>{a.frequency.toFixed(2)}</td>
                    {['quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking'].map((k) => (
                      <td key={k} className="px-3 py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${RANK_TONE(a[k])}`}>
                          {humanize(String(a[k] || 'unknown').toLowerCase())}
                        </span>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-600">
                      {v.p25 ? `${v.p25.toLocaleString('en-IN')} → ${pct(v.p50, v.p25)} → ${pct(v.p75, v.p25)} → ${pct(v.p100, v.p25)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">{crm?.quoted ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{crm?.won ?? '—'}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Targeting({
  adsets,
  campaigns,
  byCampaign,
  crmByCampaign,
}: {
  adsets: Row[]
  campaigns: Row[]
  byCampaign: Row[]
  crmByCampaign: Record<string, ReturnType<typeof funnel>>
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" /> Ad set targeting
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {adsets.map((s) => (
            <div key={s.id} className="p-4 text-xs space-y-1">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-gray-900 text-sm">{s.name}</span>
                <span className="text-gray-500 lowercase">{String(s.status || '').replace(/_/g, ' ')}</span>
              </div>
              {(
                [
                  ['Locations', s.targeting.locations.join(', ') || '—'],
                  ['Age', s.targeting.age],
                  ['Gender', s.targeting.genders],
                  ['Interests', s.targeting.interests.join(', ') || (s.targeting.advantageAudience ? 'Advantage+ audience (Meta decides)' : 'None (broad)')],
                  ['Placements', s.targeting.platforms.join(', ') + (s.targeting.positions.length ? ` · ${s.targeting.positions.join(', ')}` : '')],
                  ['Optimising for', humanize(String(s.optimizationGoal || '').toLowerCase())],
                  ['Bid strategy', humanize(String(s.bidStrategy || 'automatic').toLowerCase())],
                  ['Budget', s.dailyBudget ? `${formatINR(s.dailyBudget)}/day` : s.lifetimeBudget ? `${formatINR(s.lifetimeBudget)} lifetime` : 'Campaign budget'],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-500 w-28 flex-shrink-0">{k}</span>
                  <span className="text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          ))}
          {!adsets.length && <p className="p-4 text-sm text-gray-500">No ad sets in this scope.</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Campaigns</h3>
        </div>
        <table className="w-full text-xs">
          <thead className="text-gray-500 bg-gray-50">
            <tr>
              {['Campaign', 'Status', 'Spend', 'Leads', 'CPL', 'Won'].map((h) => (
                <th key={h} className={`px-3 py-2 ${h === 'Campaign' ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map((c) => {
              const ins = byCampaign.find((b) => b.campaign_id === c.id)
              return (
                <tr key={c.id} className={c.inScope ? '' : 'opacity-50'}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-[10px] text-gray-400">{humanize(String(c.objective || '').replace('OUTCOME_', '').toLowerCase())}</div>
                  </td>
                  <td className="px-3 py-2 text-right lowercase">{String(c.effective_status || '').replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{money(ins?.spend)}</td>
                  <td className="px-3 py-2 text-right">{ins?.leads ?? '—'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{money(ins?.cpl)}</td>
                  <td className="px-3 py-2 text-right text-emerald-700">{crmByCampaign[c.id]?.won ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- CRM → Meta (Conversions API) ----------

function CrmToMeta({
  records,
  authedFetch,
}: {
  records: Record<string, CrmRecord>
  authedFetch: (url: string, init?: RequestInit) => Promise<any>
}) {
  const [status, setStatus] = useState<{ configured: boolean; datasetId: string | null; testMode: boolean } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    authedFetch('/api/facebook/crm-events')
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [authedFetch])

  const counts = useMemo(() => {
    const c: Record<string, { ok: number; failed: number }> = {}
    let lastError: string | undefined
    for (const rec of Object.values(records)) {
      for (const [stage, ev] of Object.entries(rec.metaEvents || {})) {
        if (!ev) continue
        const x = (c[stage] ||= { ok: 0, failed: 0 })
        if (ev.ok) x.ok++
        else {
          x.failed++
          lastError = ev.error
        }
      }
    }
    return { c, lastError }
  }, [records])

  const backfill = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const json = await authedFetch('/api/facebook/crm-events', { method: 'POST', body: JSON.stringify({ mode: 'backfill' }) })
      setResult(json.skipped ? json.reason : json.message || `Sent ${json.sent} of ${json.total} events${json.testMode ? ' (test mode)' : ''}.${json.error ? ` Error: ${json.error}` : ''}`)
    } catch (err: any) {
      setResult(err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-600" /> Send CRM results back to Meta (Conversions API)
        </h3>
        {status && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              status.configured ? (status.testMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700') : 'bg-gray-100 text-gray-600'
            }`}
          >
            {status.configured ? (status.testMode ? 'Test mode' : 'Live') : 'Not connected'}
          </span>
        )}
      </div>
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
        <div className="space-y-2 text-gray-700">
          <p>
            When a lead moves stage in this CRM, Meta is told (by lead ID, no personal data). Meta then learns which people actually
            book and can optimise delivery for them instead of for cheap form-fills.
          </p>
          <div className="text-xs">
            <div className="font-semibold text-gray-800 mb-1">Stage → event sent to Meta</div>
            {STAGES.filter((s) => META_STAGE_EVENTS[s.id]).map((s) => (
              <div key={s.id} className="flex justify-between border-b border-gray-100 py-1">
                <span>{s.label}</span>
                <span className="text-gray-500">
                  “{META_STAGE_EVENTS[s.id]}” · {counts.c[s.id]?.ok || 0} sent
                  {counts.c[s.id]?.failed ? <span className="text-red-600"> · {counts.c[s.id].failed} failed</span> : null}
                </span>
              </div>
            ))}
          </div>
          {counts.lastError && <p className="text-xs text-red-600">Last error: {counts.lastError}</p>}
        </div>
        <div className="space-y-3">
          {status?.configured ? (
            <>
              <p className="text-xs text-gray-600">
                Dataset <code className="bg-gray-100 px-1 rounded">{status.datasetId}</code> is connected. New stage changes are sent
                automatically. Meta only accepts events from the last 7 days, so older history can&apos;t be sent.
              </p>
              <button
                onClick={backfill}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> {syncing ? 'Sending…' : 'Send last 7 days of stage changes'}
              </button>
              {result && <p className="text-xs text-gray-700">{result}</p>}
              <p className="text-xs text-gray-500">
                Next, in Events Manager → your dataset → set up <strong>conversion leads</strong> optimisation and choose
                “Qualified Lead” or “Converted” as the event to optimise for. Meta needs a steady flow of these events to learn.
              </p>
            </>
          ) : (
            <div className="text-xs text-gray-700 space-y-2">
              <p className="font-semibold">To connect (2 minutes):</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>
                  Your ad account already has the dataset <strong>“Travelzada Dataset”</strong> (ID <code className="bg-gray-100 px-1 rounded">391168390698794</code>).
                </li>
                <li>
                  To test first: Events Manager → Travelzada Dataset → <strong>Test events</strong> → copy the test code and add{' '}
                  <code className="bg-gray-100 px-1 rounded">META_CAPI_TEST_CODE=TEST12345</code> to <code>.env</code>.
                </li>
                <li>
                  Add <code className="bg-gray-100 px-1 rounded">META_CRM_DATASET_ID=391168390698794</code> to <code>.env</code> and restart the server.
                </li>
                <li>When test events look right, remove META_CAPI_TEST_CODE to go live.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
