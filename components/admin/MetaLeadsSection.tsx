'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  RefreshCw,
  Search,
  Download,
  Phone,
  Mail,
  MessageCircle,
  Facebook,
  Instagram,
  Megaphone,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  List,
  Columns3,
  PhoneCall,
} from 'lucide-react'
import {
  CALL_OUTCOMES,
  PRIORITIES,
  STAGES,
  addActivity,
  assignLead,
  changeStage,
  ensureCrmRecord,
  formatDate,
  formatDateTime,
  formatHours,
  formatINR,
  humanize,
  isFollowUpOverdue,
  leadEmail,
  leadName,
  leadPhone,
  salesStats,
  stageInfo,
  whatsappNumber,
  type CrmRecord,
  type MetaForm,
  type MetaLead,
} from '@/lib/metaLeadsCrm'
import { useCrmRecords, useCurrentUserRef, useMetaAds, useSalesTeam } from './meta-crm/useCrm'
import MetaLeadsReports from './meta-crm/MetaLeadsReports'

type Stats = ReturnType<typeof salesStats>

/** Optional table columns: the sales sheet columns (derived from the CRM log) and every raw Meta field. */
const SHEET_COLUMNS: { id: string; label: string; render: (s: Stats, rec?: CrmRecord) => string }[] = [
  { id: 'callAttempts', label: 'Call Attempts', render: (s) => String(s.callAttempts) },
  { id: 'callConnected', label: 'Call Connected', render: (s) => (s.callAttempts ? (s.callConnected ? 'Yes' : 'No') : '—') },
  { id: 'remarks', label: 'Remarks', render: (s) => s.latestRemark || '—' },
  { id: 'quoteSent', label: 'Quote Sent', render: (s) => (s.quoteSent ? 'Yes' : 'No') },
  { id: 'quoteDate', label: 'Quote Date', render: (s) => formatDate(s.lastQuoteDate) },
  { id: 'latestQuote', label: 'Latest Quote', render: (s) => formatINR(s.latestQuote) },
  { id: 'modifications', label: 'Modifications', render: (s) => String(s.modifications) },
  { id: 'followUps', label: 'Follow-ups Done', render: (s) => String(s.followUpsDone) },
  { id: 'firstResponse', label: 'First Response', render: (s) => formatHours(s.firstResponseHours) },
  { id: 'priority', label: 'Priority', render: (_s, rec) => PRIORITIES.find((p) => p.id === rec?.priority)?.label || '—' },
  { id: 'lostReason', label: 'Lost Reason', render: (_s, rec) => rec?.lostReason || '—' },
]

const META_COLUMNS: { id: keyof MetaLead; label: string }[] = [
  { id: 'id', label: 'Lead ID' },
  { id: 'ad_name', label: 'Ad Name' },
  { id: 'ad_id', label: 'Ad ID' },
  { id: 'adset_name', label: 'Ad Set Name' },
  { id: 'adset_id', label: 'Ad Set ID' },
  { id: 'campaign_id', label: 'Campaign ID' },
  { id: 'form_id', label: 'Form ID' },
  { id: 'is_organic', label: 'Organic' },
]

const DEFAULT_COLUMNS = ['callAttempts', 'callConnected', 'quoteDate', 'followUps', 'remarks']
const COLUMNS_STORAGE_KEY = 'metaLeadsCrm.columns'

interface MetaLeadsResponse {
  page: { id: string; name: string }
  forms: MetaForm[]
  leads: MetaLead[]
  formErrors: { formId: string; formName: string; error: string }[]
  fetchedAt: string
}

type DateRange = 'all' | 'today' | '7d' | '30d'
type FollowUpFilter = 'all' | 'overdue' | 'today' | 'none'

const PlatformBadge = ({ platform }: { platform?: string }) => {
  const p = (platform || '').toLowerCase()
  if (p === 'ig' || p === 'instagram')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
        <Instagram className="w-3 h-3" /> IG
      </span>
    )
  if (p === 'fb' || p === 'facebook')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        <Facebook className="w-3 h-3" /> FB
      </span>
    )
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{platform || '—'}</span>
}

const lastActivity = (rec?: CrmRecord) =>
  rec?.activities
    ?.filter((a) => !['stage_change', 'assignment'].includes(a.type))
    .sort((a, b) => b.at.localeCompare(a.at))[0]

const columnLabel = (id: string) =>
  SHEET_COLUMNS.find((c) => c.id === id)?.label ||
  META_COLUMNS.find((c) => `meta:${c.id}` === id)?.label ||
  (id.startsWith('answer:') ? humanize(id.slice(7)) : id)

const columnValue = (id: string, lead: MetaLead, rec?: CrmRecord): string => {
  const sheet = SHEET_COLUMNS.find((c) => c.id === id)
  if (sheet) return sheet.render(salesStats(rec, lead.created_time), rec)
  if (id.startsWith('meta:')) {
    const v = lead[id.slice(5) as keyof MetaLead]
    return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v ? String(v) : '—'
  }
  if (id.startsWith('answer:')) {
    const key = id.slice(7)
    return lead.field_data?.find((f) => f.name === key)?.values.join(', ') || '—'
  }
  return '—'
}

export default function MetaLeadsSection() {
  const router = useRouter()
  const { currentUser, isAdmin } = useAuth()
  const me = useCurrentUserRef()
  const team = useSalesTeam()
  const { records } = useCrmRecords()

  const [data, setData] = useState<MetaLeadsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null)
  const [view, setView] = useState<'leads' | 'reports'>('leads')

  const [search, setSearch] = useState('')
  const [formFilter, setFormFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>(isAdmin ? 'all' : 'mine')
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>('all')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLUMNS_STORAGE_KEY)
      if (saved) setVisibleColumns(JSON.parse(saved))
    } catch {}
  }, [])

  const toggleColumn = (id: string) =>
    setVisibleColumns((cols) => {
      const next = cols.includes(id) ? cols.filter((c) => c !== id) : [...cols, id]
      try {
        localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })

  const { campaigns: campaignInfo } = useMetaAds(data?.leads || null)

  // Every form question across all forms, so each answer can be shown as its own column
  const answerKeys = useMemo(
    () => Array.from(new Set((data?.leads || []).flatMap((l) => (l.field_data || []).map((f) => f.name)))),
    [data]
  )

  const quickLogCall = async (lead: MetaLead, outcome: string) => {
    if (!me || !outcome) return
    setAssigning(lead.id)
    try {
      await ensureCrmRecord(lead)
      await addActivity(lead.id, { type: 'call', outcome, at: new Date().toISOString(), by: me })
      const rec = records[lead.id]
      if (!rec || rec.stage === 'new') {
        await changeStage(
          rec || ({ leadId: lead.id, stage: 'new', activities: [], proposals: [] } as unknown as CrmRecord),
          'contacted',
          me
        )
      }
    } catch (err: any) {
      alert(`Could not log call: ${err.message || err}`)
    } finally {
      setAssigning(null)
    }
  }

  const fetchLeads = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      const idToken = await currentUser.getIdToken()
      const res = await fetch('/api/facebook/meta-leads', { headers: { Authorization: `Bearer ${idToken}` } })
      const json = await res.json()
      if (!res.ok) {
        setError({ message: json.error || 'Failed to load Meta leads', hint: json.hint })
        return
      }
      setData(json)
    } catch (err: any) {
      setError({ message: err.message || 'Failed to load Meta leads' })
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const campaigns = useMemo(() => {
    const set = new Set<string>()
    data?.leads.forEach((l) => l.campaign_name && set.add(l.campaign_name))
    return Array.from(set).sort()
  }, [data])

  // Everything except the stage filter, so the stage chips can show counts
  const baseFiltered = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    const endOfToday = startOfToday + 864e5
    const minTime =
      dateRange === 'today' ? startOfToday : dateRange === '7d' ? now - 7 * 864e5 : dateRange === '30d' ? now - 30 * 864e5 : 0
    const q = search.trim().toLowerCase()

    return data.leads.filter((lead) => {
      const rec = records[lead.id]
      if (formFilter !== 'all' && lead.form_id !== formFilter) return false
      if (campaignFilter !== 'all' && lead.campaign_name !== campaignFilter) return false
      if (platformFilter !== 'all' && (lead.platform || '').toLowerCase() !== platformFilter) return false
      if (minTime && new Date(lead.created_time).getTime() < minTime) return false

      if (ownerFilter === 'mine' && rec?.assignedTo?.uid !== me?.uid) return false
      if (ownerFilter === 'unassigned' && rec?.assignedTo) return false
      if (!['all', 'mine', 'unassigned'].includes(ownerFilter) && rec?.assignedTo?.uid !== ownerFilter) return false

      if (followUpFilter === 'overdue' && !isFollowUpOverdue(rec)) return false
      if (followUpFilter === 'today') {
        const t = rec?.nextFollowUp ? new Date(rec.nextFollowUp).getTime() : NaN
        if (!(t < endOfToday) || ['won', 'lost'].includes(rec?.stage || '')) return false
      }
      if (followUpFilter === 'none' && (rec?.nextFollowUp || ['won', 'lost'].includes(rec?.stage || ''))) return false

      if (!q) return true
      const haystack = [
        lead.id,
        lead.form_name,
        lead.ad_name,
        lead.adset_name,
        lead.campaign_name,
        rec?.assignedTo?.name,
        ...(lead.field_data || []).flatMap((f) => f.values),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [data, records, search, formFilter, campaignFilter, platformFilter, dateRange, ownerFilter, followUpFilter, me])

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    baseFiltered.forEach((l) => {
      const s = records[l.id]?.stage || 'new'
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [baseFiltered, records])

  const filteredLeads = useMemo(
    () => (stageFilter === 'all' ? baseFiltered : baseFiltered.filter((l) => (records[l.id]?.stage || 'new') === stageFilter)),
    [baseFiltered, stageFilter, records]
  )

  const stats = useMemo(() => {
    const leads = data?.leads || []
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    const recs = leads.map((l) => records[l.id])
    return {
      total: leads.length,
      today: leads.filter((l) => new Date(l.created_time).getTime() >= startOfToday).length,
      untouched: recs.filter((r) => !r || r.stage === 'new').length,
      overdue: recs.filter((r) => isFollowUpOverdue(r)).length,
      proposals: recs.filter((r) => r?.proposals?.length).length,
      won: recs.filter((r) => r?.stage === 'won').length,
      revenue: recs.reduce((sum, r) => sum + (r?.stage === 'won' ? r.dealValue || r.proposals?.slice(-1)[0]?.totalPrice || 0 : 0), 0),
      spend: Object.values(campaignInfo).reduce((sum, c) => sum + (c.insights?.spend || 0), 0),
    }
  }, [data, records, campaignInfo])

  const quickAssign = async (lead: MetaLead, uid: string) => {
    if (!me) return
    setAssigning(lead.id)
    try {
      await ensureCrmRecord(lead)
      const rec: CrmRecord =
        records[lead.id] ||
        ({ leadId: lead.id, stage: 'new', activities: [], proposals: [] } as unknown as CrmRecord)
      await assignLead(rec, team.find((t) => t.uid === uid) || null, me)
    } catch (err: any) {
      alert(`Could not assign: ${err.message || err}`)
    } finally {
      setAssigning(null)
    }
  }

  const exportCsv = () => {
    const fieldKeys = Array.from(new Set(filteredLeads.flatMap((l) => (l.field_data || []).map((f) => f.name))))
    // Same order as the sales team's sheet: Meta fields, form answers, then sales tracking columns
    const metaCols = [
      'id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name',
      'form_id', 'form_name', 'is_organic', 'platform',
    ] as const
    const crmCols = [
      'Stage', 'Assigned To', 'Priority', 'Remarks', 'Call Connected', 'Call Attempts', 'Quote Sent', 'Quote Date',
      'Latest Quote', 'Modifications', 'Follow-ups Done', 'Follow-up Dates', 'Next Follow-up', 'First Response',
      'Deal Value', 'Lost Reason', 'Total Activities',
    ]
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = [...metaCols, ...fieldKeys, ...crmCols].map(escape).join(',')
    const rows = filteredLeads.map((lead) => {
      const rec = records[lead.id]
      const s = salesStats(rec, lead.created_time)
      return [
        ...metaCols.map((c) => lead[c]),
        ...fieldKeys.map((k) => lead.field_data?.find((f) => f.name === k)?.values.join(' | ')),
        stageInfo(rec?.stage).label,
        rec?.assignedTo?.name,
        rec?.priority,
        s.latestRemark,
        s.callAttempts ? (s.callConnected ? 'Yes' : 'No') : '',
        s.callAttempts,
        s.quoteSent ? 'Yes' : 'No',
        s.lastQuoteDate ? formatDate(s.lastQuoteDate) : '',
        s.latestQuote,
        s.modifications,
        s.followUpsDone,
        s.followUpDates.map((d) => formatDate(d)).join(' | '),
        rec?.nextFollowUp ? formatDateTime(rec.nextFollowUp) : '',
        s.firstResponseHours !== undefined ? formatHours(s.firstResponseHours) : '',
        rec?.dealValue,
        rec?.lostReason,
        rec?.activities?.length || 0,
      ]
        .map(escape)
        .join(',')
    })
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meta-leads-crm-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statCards = [
    { label: 'Total Leads', value: stats.total, className: 'text-gray-900' },
    { label: 'New Today', value: stats.today, className: 'text-emerald-600' },
    { label: 'Untouched', value: stats.untouched, className: 'text-amber-600', onClick: () => { setStageFilter('new'); setView('leads') } },
    { label: 'Overdue Follow-ups', value: stats.overdue, className: 'text-red-600', onClick: () => { setFollowUpFilter('overdue'); setStageFilter('all'); setView('leads') } },
    { label: 'Proposals Sent', value: stats.proposals, className: 'text-purple-600' },
    { label: 'Won', value: `${stats.won} · ${formatINR(stats.revenue)}`, className: 'text-emerald-700' },
    { label: 'Ad Spend', value: stats.spend ? formatINR(Math.round(stats.spend)) : '—', className: 'text-blue-700', onClick: () => setView('reports') },
    { label: 'Cost / Lead', value: stats.spend && stats.total ? formatINR(Math.round(stats.spend / stats.total)) : '—', className: 'text-blue-700', onClick: () => setView('reports') },
  ]

  const selectClass = 'px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              Meta Leads CRM
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Live from Meta Lead Ads{data?.page.name ? ` · ${data.page.name}` : ''}
              {data?.fetchedAt ? ` · Updated ${formatDateTime(data.fetchedAt)}` : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setView('leads')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium ${view === 'leads' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" /> Leads
              </button>
              <button
                onClick={() => setView('reports')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium ${view === 'reports' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <BarChart3 className="w-4 h-4" /> Reports
              </button>
            </div>
            <button
              onClick={exportCsv}
              disabled={!filteredLeads.length}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-px bg-gray-200">
          {statCards.map((s) => (
            <button
              key={s.label}
              onClick={s.onClick}
              disabled={!s.onClick}
              className={`bg-white px-4 py-3 text-left ${s.onClick ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
            >
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className={`text-xl font-bold ${s.className}`}>{loading && !data ? '—' : s.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">Could not load leads from Meta</p>
            <p className="text-red-700 mt-1">{error.message}</p>
            {error.hint && <p className="text-red-700 mt-2">{error.hint}</p>}
          </div>
        </div>
      )}

      {data && data.formErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold">Some forms could not be loaded:</p>
          <ul className="list-disc ml-5 mt-1">
            {data.formErrors.map((fe) => (
              <li key={fe.formId}>
                {fe.formName}: {fe.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'reports' && data && <MetaLeadsReports leads={data.leads} records={records} team={team} />}

      {view === 'leads' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Pipeline chips */}
          <div className="px-4 pt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setStageFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${stageFilter === 'all' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              All {baseFiltered.length}
            </button>
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStageFilter(s.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  stageFilter === s.id ? 'border-gray-900 ring-1 ring-gray-900 ' + s.color : 'border-transparent ' + s.color + ' opacity-80 hover:opacity-100'
                }`}
              >
                {s.label} {stageCounts[s.id] || 0}
              </button>
            ))}
            <button
              onClick={() => setShowColumnPicker((v) => !v)}
              className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${showColumnPicker ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <Columns3 className="w-4 h-4" /> Columns ({visibleColumns.length})
            </button>
          </div>

          {showColumnPicker && (
            <div className="mx-4 mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {(
                [
                  ['Sales tracking', SHEET_COLUMNS.map((c) => ({ id: c.id, label: c.label }))],
                  ['Ad details', META_COLUMNS.map((c) => ({ id: `meta:${c.id}`, label: c.label }))],
                  ['Form answers', answerKeys.map((k) => ({ id: `answer:${k}`, label: humanize(k) }))],
                ] as [string, { id: string; label: string }[]][]
              ).map(([group, cols]) => (
                <div key={group}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{group}</div>
                  <div className="space-y-1">
                    {cols.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer text-gray-700">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(c.id)}
                          onChange={() => toggleColumn(c.id)}
                          className="rounded border-gray-300"
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, answers, salesperson..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className={selectClass}>
              <option value="all">All salespeople</option>
              <option value="mine">My leads</option>
              <option value="unassigned">Unassigned</option>
              {team.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.name}
                </option>
              ))}
            </select>
            <select value={followUpFilter} onChange={(e) => setFollowUpFilter(e.target.value as FollowUpFilter)} className={selectClass}>
              <option value="all">Any follow-up</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today (incl. overdue)</option>
              <option value="none">No follow-up set</option>
            </select>
            <select value={formFilter} onChange={(e) => setFormFilter(e.target.value)} className={selectClass}>
              <option value="all">All forms</option>
              {data?.forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className={selectClass}>
              <option value="all">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white">
                <option value="all">FB + IG</option>
                <option value="fb">Facebook</option>
                <option value="ig">Instagram</option>
              </select>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} className="px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white">
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Lead</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left">Salesperson</th>
                  <th className="px-4 py-3 text-left">Follow-up</th>
                  <th className="px-4 py-3 text-left">Last activity</th>
                  {visibleColumns.map((id) => (
                    <th key={id} className="px-4 py-3 text-left whitespace-nowrap">
                      {columnLabel(id)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && !data && (
                  <tr>
                    <td colSpan={8 + visibleColumns.length} className="px-4 py-12 text-center text-gray-500">
                      <RefreshCw className="w-5 h-5 animate-spin inline mr-2" /> Loading leads from Meta...
                    </td>
                  </tr>
                )}
                {data && filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={8 + visibleColumns.length} className="px-4 py-12 text-center text-gray-500">
                      {data.leads.length === 0 ? 'No leads found on your Meta lead forms yet.' : 'No leads match these filters.'}
                    </td>
                  </tr>
                )}
                {filteredLeads.map((lead) => {
                  const rec = records[lead.id]
                  const phone = leadPhone(lead)
                  const email = leadEmail(lead)
                  const name = leadName(lead)
                  const stage = stageInfo(rec?.stage)
                  const priority = PRIORITIES.find((p) => p.id === rec?.priority)
                  const overdue = isFollowUpOverdue(rec)
                  const last = lastActivity(rec)
                  const open = () => router.push(`/admin/meta-leads/${lead.id}`)

                  return (
                    <tr key={lead.id} onClick={open} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{name}</span>
                          {priority && rec && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${priority.color}`}>{priority.label}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{formatDateTime(lead.created_time)}</div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {phone && (
                          <a href={`tel:${phone}`} className="flex items-center gap-1 text-gray-700 hover:text-primary">
                            <Phone className="w-3 h-3" /> {phone}
                          </a>
                        )}
                        {email && (
                          <a href={`mailto:${email}`} className="flex items-center gap-1 text-gray-500 hover:text-primary text-xs mt-0.5">
                            <Mail className="w-3 h-3" /> {email}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[14rem]">
                        <div className="flex items-center gap-1.5">
                          <PlatformBadge platform={lead.platform} />
                          <span className="text-xs text-gray-700 truncate" title={lead.campaign_name}>
                            {lead.campaign_name || '—'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5" title={lead.form_name}>
                          {lead.form_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                        {rec?.proposals?.length ? (
                          <div className="text-[11px] text-purple-700 mt-1">
                            {rec.proposals.length} proposal{rec.proposals.length > 1 ? 's' : ''} · {formatINR(rec.proposals.slice(-1)[0].totalPrice)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={rec?.assignedTo?.uid || ''}
                          disabled={assigning === lead.id || !me}
                          onChange={(e) => quickAssign(lead, e.target.value)}
                          className={`px-2 py-1 text-xs border rounded-lg bg-white max-w-[9rem] ${rec?.assignedTo ? 'border-gray-300' : 'border-amber-300 text-amber-700'}`}
                        >
                          <option value="">Unassigned</option>
                          {team.map((t) => (
                            <option key={t.uid} value={t.uid}>
                              {t.name}
                            </option>
                          ))}
                          {rec?.assignedTo && !team.some((t) => t.uid === rec.assignedTo?.uid) && (
                            <option value={rec.assignedTo.uid}>{rec.assignedTo.name}</option>
                          )}
                        </select>
                      </td>
                      <td className={`px-4 py-3 text-xs whitespace-nowrap ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {rec?.nextFollowUp && !['won', 'lost'].includes(rec.stage) ? (
                          <>
                            {overdue && 'Overdue · '}
                            {formatDateTime(rec.nextFollowUp)}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[12rem]">
                        {last ? (
                          <>
                            <div className="truncate capitalize" title={last.outcome || last.notes}>
                              {last.type}
                              {last.outcome ? `: ${last.outcome}` : ''}
                            </div>
                            <div className="text-gray-400">
                              {formatDateTime(last.at)} · {last.by?.name}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">No activity</span>
                        )}
                      </td>
                      {visibleColumns.map((id) => {
                        const value = columnValue(id, lead, rec)
                        return (
                          <td
                            key={id}
                            className={`px-4 py-3 text-xs text-gray-700 ${id === 'remarks' ? 'max-w-[16rem]' : 'whitespace-nowrap max-w-[14rem]'} ${
                              value === 'Yes' ? 'text-emerald-700 font-semibold' : value === 'No' ? 'text-red-600' : ''
                            }`}
                          >
                            <div className={id === 'remarks' ? 'line-clamp-2' : 'truncate'} title={value}>
                              {value}
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <div
                            className={`relative p-2 rounded-lg text-blue-600 hover:bg-blue-50 ${assigning === lead.id ? 'opacity-50' : ''}`}
                            title="Log a call attempt"
                          >
                            <PhoneCall className="w-4 h-4" />
                            <select
                              value=""
                              disabled={assigning === lead.id || !me}
                              onChange={(e) => quickLogCall(lead, e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              aria-label="Log call outcome"
                            >
                              <option value="" disabled>
                                Log call outcome…
                              </option>
                              {CALL_OUTCOMES.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </div>
                          {phone && (
                            <Link
                              href={`/admin/whatsapp-chats?phone=${whatsappNumber(phone)}&name=${encodeURIComponent(name)}`}
                              title="Chat on WhatsApp"
                              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Link>
                          )}
                          <Link
                            href={`/admin/meta-leads/${lead.id}`}
                            title="Open CRM"
                            className="p-2 rounded-lg text-primary hover:bg-primary/10"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
