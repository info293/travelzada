'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  RefreshCw,
  Search,
  Download,
  X,
  Phone,
  Mail,
  MessageCircle,
  Facebook,
  Instagram,
  Megaphone,
  FileText,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface MetaFieldData {
  name: string
  values: string[]
}

interface MetaLead {
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

interface MetaForm {
  id: string
  name: string
  status?: string
  locale?: string
  created_time?: string
  leads_count?: number
  questions?: { key: string; label?: string; type?: string }[]
}

interface MetaLeadsResponse {
  page: { id: string; name: string }
  forms: MetaForm[]
  leads: MetaLead[]
  formErrors: { formId: string; formName: string; error: string }[]
  fetchedAt: string
}

type DateRange = 'all' | 'today' | '7d' | '30d'

const fieldValue = (lead: MetaLead, ...keys: string[]) => {
  for (const key of keys) {
    const field = lead.field_data?.find((f) => f.name.toLowerCase() === key)
    if (field?.values?.[0]) return field.values[0]
  }
  return ''
}

const leadName = (lead: MetaLead) =>
  fieldValue(lead, 'full_name', 'name') ||
  [fieldValue(lead, 'first_name'), fieldValue(lead, 'last_name')].filter(Boolean).join(' ') ||
  'Unknown'

const leadPhone = (lead: MetaLead) => fieldValue(lead, 'phone_number', 'phone', 'mobile', 'mobile_number')
const leadEmail = (lead: MetaLead) => fieldValue(lead, 'email', 'email_address')

/** WhatsApp-ready number: digits only, 91 prefixed to 10-digit Indian numbers. */
const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

const humanize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const PlatformBadge = ({ platform }: { platform?: string }) => {
  const p = (platform || '').toLowerCase()
  if (p === 'ig' || p === 'instagram')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
        <Instagram className="w-3 h-3" /> Instagram
      </span>
    )
  if (p === 'fb' || p === 'facebook')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        <Facebook className="w-3 h-3" /> Facebook
      </span>
    )
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{platform || '—'}</span>
}

export default function MetaLeadsSection() {
  const { currentUser } = useAuth()
  const [data, setData] = useState<MetaLeadsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null)

  const [search, setSearch] = useState('')
  const [formFilter, setFormFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [selectedLead, setSelectedLead] = useState<MetaLead | null>(null)
  const [showRaw, setShowRaw] = useState(false)

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

  const formsById = useMemo(() => {
    const map: Record<string, MetaForm> = {}
    data?.forms.forEach((f) => (map[f.id] = f))
    return map
  }, [data])

  const campaigns = useMemo(() => {
    const set = new Set<string>()
    data?.leads.forEach((l) => l.campaign_name && set.add(l.campaign_name))
    return Array.from(set).sort()
  }, [data])

  const filteredLeads = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    const minTime =
      dateRange === 'today' ? startOfToday : dateRange === '7d' ? now - 7 * 864e5 : dateRange === '30d' ? now - 30 * 864e5 : 0
    const q = search.trim().toLowerCase()

    return data.leads.filter((lead) => {
      if (formFilter !== 'all' && lead.form_id !== formFilter) return false
      if (campaignFilter !== 'all' && lead.campaign_name !== campaignFilter) return false
      if (platformFilter !== 'all' && (lead.platform || '').toLowerCase() !== platformFilter) return false
      if (minTime && new Date(lead.created_time).getTime() < minTime) return false
      if (!q) return true
      const haystack = [
        lead.id,
        lead.form_name,
        lead.ad_name,
        lead.adset_name,
        lead.campaign_name,
        ...(lead.field_data || []).flatMap((f) => f.values),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [data, search, formFilter, campaignFilter, platformFilter, dateRange])

  const stats = useMemo(() => {
    const leads = data?.leads || []
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    const weekAgo = Date.now() - 7 * 864e5
    return {
      total: leads.length,
      today: leads.filter((l) => new Date(l.created_time).getTime() >= startOfToday).length,
      week: leads.filter((l) => new Date(l.created_time).getTime() >= weekAgo).length,
      facebook: leads.filter((l) => ['fb', 'facebook'].includes((l.platform || '').toLowerCase())).length,
      instagram: leads.filter((l) => ['ig', 'instagram'].includes((l.platform || '').toLowerCase())).length,
      organic: leads.filter((l) => l.is_organic).length,
    }
  }, [data])

  const questionLabel = (lead: MetaLead, key: string) =>
    formsById[lead.form_id]?.questions?.find((q) => q.key === key)?.label || humanize(key)

  const exportCsv = () => {
    const fieldKeys = Array.from(new Set(filteredLeads.flatMap((l) => (l.field_data || []).map((f) => f.name))))
    const metaCols = [
      'id', 'created_time', 'form_name', 'form_id', 'campaign_name', 'campaign_id',
      'adset_name', 'adset_id', 'ad_name', 'ad_id', 'platform', 'is_organic', 'partner_name',
    ] as const
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = [...metaCols, ...fieldKeys].map(escape).join(',')
    const rows = filteredLeads.map((lead) =>
      [
        ...metaCols.map((c) => lead[c]),
        ...fieldKeys.map((k) => lead.field_data?.find((f) => f.name === k)?.values.join(' | ')),
      ]
        .map(escape)
        .join(',')
    )
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meta-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statCards = [
    { label: 'Total Leads', value: stats.total, className: 'text-gray-900' },
    { label: 'Today', value: stats.today, className: 'text-emerald-600' },
    { label: 'Last 7 Days', value: stats.week, className: 'text-primary' },
    { label: 'Facebook', value: stats.facebook, className: 'text-blue-600' },
    { label: 'Instagram', value: stats.instagram, className: 'text-pink-600' },
    { label: 'Organic', value: stats.organic, className: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              Meta Ads Leads {data && `(${filteredLeads.length})`}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Live from Meta Lead Ads{data?.page.name ? ` · ${data.page.name}` : ''}
              {data?.fetchedAt ? ` · Updated ${formatDate(data.fetchedAt)}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-200">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white px-4 py-3">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className={`text-2xl font-bold ${s.className}`}>{loading && !data ? '—' : s.value}</div>
            </div>
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

      {/* Filters + Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email, campaign, answers..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
          </div>
          <select
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">All forms</option>
            {data?.forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All platforms</option>
              <option value="fb">Facebook</option>
              <option value="ig">Instagram</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Lead</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Form</th>
                <th className="px-4 py-3 text-left">Campaign / Ad</th>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !data && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin inline mr-2" /> Loading leads from Meta...
                  </td>
                </tr>
              )}
              {data && filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {data.leads.length === 0 ? 'No leads found on your Meta lead forms yet.' : 'No leads match these filters.'}
                  </td>
                </tr>
              )}
              {filteredLeads.map((lead) => {
                const phone = leadPhone(lead)
                const email = leadEmail(lead)
                const name = leadName(lead)
                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(lead.created_time)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{name}</div>
                      {lead.is_organic && <span className="text-[10px] font-medium text-amber-700">ORGANIC</span>}
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-gray-700">{lead.form_name || lead.form_id}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{lead.campaign_name || (lead.campaign_id ? `Campaign ${lead.campaign_id}` : '—')}</div>
                      {lead.ad_name && <div className="text-xs text-gray-500">{lead.ad_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <PlatformBadge platform={lead.platform} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {phone && (
                          <Link
                            href={`/admin/whatsapp-chats?phone=${whatsappNumber(phone)}&name=${encodeURIComponent(name)}`}
                            title="Chat on WhatsApp"
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setSelectedLead(lead)
                            setShowRaw(false)
                          }}
                          title="View all details"
                          className="p-2 rounded-lg text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{leadName(selectedLead)}</h3>
                <p className="text-xs text-gray-500">{formatDate(selectedLead.created_time)}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Form Answers
                </h4>
                <dl className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {(selectedLead.field_data || []).map((f) => (
                    <div key={f.name} className="grid grid-cols-3 gap-4 px-4 py-2">
                      <dt className="text-gray-500 text-sm">{questionLabel(selectedLead, f.name)}</dt>
                      <dd className="col-span-2 text-sm text-gray-900 break-words">{f.values.join(', ') || '—'}</dd>
                    </div>
                  ))}
                  {!selectedLead.field_data?.length && <p className="px-4 py-2 text-sm text-gray-500">No answers.</p>}
                </dl>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-blue-600" /> Ad & Source
                </h4>
                <dl className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {(
                    [
                      ['Form', selectedLead.form_name, selectedLead.form_id],
                      ['Campaign', selectedLead.campaign_name, selectedLead.campaign_id],
                      ['Ad Set', selectedLead.adset_name, selectedLead.adset_id],
                      ['Ad', selectedLead.ad_name, selectedLead.ad_id],
                      ['Platform', selectedLead.platform, undefined],
                      ['Organic', selectedLead.is_organic === undefined ? undefined : selectedLead.is_organic ? 'Yes' : 'No (paid ad)', undefined],
                      ['Partner', selectedLead.partner_name, undefined],
                      ['Lead ID', selectedLead.id, undefined],
                    ] as [string, string | undefined, string | undefined][]
                  )
                    .filter(([, value, id]) => value || id)
                    .map(([label, value, id]) => (
                      <div key={label} className="grid grid-cols-3 gap-4 px-4 py-2">
                        <dt className="text-gray-500 text-sm">{label}</dt>
                        <dd className="col-span-2 text-sm text-gray-900 break-words">
                          {value || '—'}
                          {id && <span className="block text-xs text-gray-400">ID: {id}</span>}
                        </dd>
                      </div>
                    ))}
                </dl>
              </section>

              {!!selectedLead.custom_disclaimer_responses?.length && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Consent / Disclaimer Responses</h4>
                  <dl className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                    {selectedLead.custom_disclaimer_responses.map((d) => (
                      <div key={d.checkbox_key} className="grid grid-cols-3 gap-4 px-4 py-2">
                        <dt className="text-gray-500 text-sm">{humanize(d.checkbox_key)}</dt>
                        <dd className="col-span-2 text-sm text-gray-900">{d.is_checked === '1' ? 'Checked' : 'Not checked'}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <section>
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1"
                >
                  {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Raw data from Meta
                </button>
                {showRaw && (
                  <pre className="mt-2 p-3 bg-gray-900 text-gray-100 text-xs rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLead, null, 2)}
                  </pre>
                )}
              </section>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {leadPhone(selectedLead) && (
                  <>
                    <Link
                      href={`/admin/whatsapp-chats?phone=${whatsappNumber(leadPhone(selectedLead))}&name=${encodeURIComponent(leadName(selectedLead))}`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </Link>
                    <a
                      href={`tel:${leadPhone(selectedLead)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Phone className="w-4 h-4" /> Call
                    </a>
                  </>
                )}
                {leadEmail(selectedLead) && (
                  <a
                    href={`mailto:${leadEmail(selectedLead)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Mail className="w-4 h-4" /> Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
