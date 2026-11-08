'use client'

/**
 * Website Leads: enquiries from package pages (`leads`) and the AI trip planner (`ai_planner_leads`), merged.
 *
 * Pipeline (stored in the existing `status` field):
 *   new → contacted → quoted → follow-up → converted | lost
 * Older values are read leniently (e.g. "booked" → converted). Extra fields written here:
 *   followUpAt   'YYYY-MM-DD' next follow-up date
 *   statusUpdatedAt / convertedAt  serverTimestamp, used for "converted this month"
 *
 * Facebook lead-ad copies that the old sync wrote into `leads` (source "Facebook Lead Ad" / leadgenId) are hidden by
 * default because they are worked on the Meta Leads page; a chip keeps them reachable.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  collection, getDocs, query, orderBy, updateDoc, deleteDoc, doc, deleteField, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  BellRing, CalendarDays, CheckCircle2, Download, ExternalLink, FileText, Mail, MessageCircle, MessagesSquare,
  Pencil, Phone, PhoneOff, RefreshCw, Sparkles, Trash2, UserPlus, Users, Wallet,
} from 'lucide-react'
import {
  PageHeader, StatRow, StatCard, Card, Toolbar, SearchInput, FilterChips, Button, Table, Th, Td, Drawer, Field,
  inputClass, Badge, EmptyState, Spinner, formatDate, timeAgo, toMillis, waLink, exportToCsv, cx,
} from '@/components/admin/ui'

// ---------------------------------------------------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------------------------------------------------

type LeadCollection = 'leads' | 'ai_planner_leads'
type SourceKind = 'website' | 'ai' | 'facebook'

interface Lead {
  id: string
  _collection: LeadCollection
  name: string
  mobile: string
  email: string
  destination: string
  packageName: string
  travelDate: string
  travelersCount?: number
  travelType: string
  budget: string
  notes: string
  sourceUrl: string
  source: SourceKind
  status: string
  read: boolean
  followUpAt: string
  createdAt: any
  convertedAt: any
  statusUpdatedAt: any
}

const PIPELINE = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quote sent' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
] as const
type Stage = (typeof PIPELINE)[number]['value']
const STAGE_LABEL: Record<Stage, string> = Object.fromEntries(PIPELINE.map((p) => [p.value, p.label])) as Record<Stage, string>

const STAGE_STYLE: Record<Stage, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-800 border-amber-200',
  quoted: 'bg-purple-50 text-purple-700 border-purple-200',
  'follow-up': 'bg-orange-50 text-orange-700 border-orange-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-gray-100 text-gray-500 border-gray-200',
}

/** Read any historical status value into one of the pipeline stages */
function toStage(raw?: string): Stage {
  const s = String(raw || '').trim().toLowerCase().replace(/[_\s]+/g, '-')
  if (!s || s === 'new' || s === 'unread' || s === 'pending') return 'new'
  if (['contacted', 'read', 'in-progress', 'interested'].includes(s)) return 'contacted'
  if (['quoted', 'quote-sent', 'proposal-sent', 'sent'].includes(s)) return 'quoted'
  if (['follow-up', 'followup', 'follow-up-due', 'callback'].includes(s)) return 'follow-up'
  if (['converted', 'booked', 'confirmed', 'won', 'closed-won'].includes(s)) return 'converted'
  if (['lost', 'closed', 'not-interested', 'spam', 'junk', 'rejected'].includes(s)) return 'lost'
  return 'contacted'
}

const SOURCE_META: Record<SourceKind, { label: string; tone: 'wine' | 'purple' | 'blue' }> = {
  website: { label: 'Website', tone: 'wine' },
  ai: { label: 'AI Planner', tone: 'purple' },
  facebook: { label: 'Facebook ad', tone: 'blue' },
}

const DAY = 86400000
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** 'YYYY-MM-DD' for date inputs / query params, '' if not parseable */
function toDateInput(value?: string): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const t = new Date(value)
  if (Number.isNaN(t.getTime())) return ''
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

const phoneDigits = (p?: string) => String(p || '').replace(/\D/g, '')
const hasPhone = (p?: string) => phoneDigits(p).length >= 10
const tripOf = (l: Lead) => l.destination || l.packageName
const firstName = (n: string) => (n || '').trim().split(/\s+/)[0] || 'there'

function waMessage(l: Lead): string {
  const trip = tripOf(l)
  const tripText = trip && !/custom trip/i.test(trip) ? ` for ${trip.replace(/\s*package$/i, '')}` : ''
  return `Hi ${firstName(l.name)}, this is Travelzada 👋 Thanks for your enquiry${tripText}! I'd love to plan this for you. When are you planning to travel, and how many of you will be going?`
}

function quoteHref(l: Lead): string {
  const p = new URLSearchParams()
  const set = (k: string, v?: string | number) => { if (v !== undefined && v !== null && String(v).trim()) p.set(k, String(v).trim()) }
  set('name', l.name)
  if (hasPhone(l.mobile)) set('phone', l.mobile)
  set('email', l.email)
  set('destination', tripOf(l) && !/custom trip/i.test(tripOf(l)) ? tripOf(l).replace(/\s*package$/i, '') : '')
  set('date', toDateInput(l.travelDate))
  if (l.travelersCount && l.travelersCount > 0) set('adults', l.travelersCount)
  const qs = p.toString()
  return `/admin/itinerary${qs ? `?${qs}` : ''}`
}

const isOpen = (l: Lead) => { const s = toStage(l.status); return s !== 'converted' && s !== 'lost' }
const isFollowUpDue = (l: Lead) => {
  if (!isOpen(l)) return false
  if (l.followUpAt) return l.followUpAt <= todayIso()
  return toStage(l.status) === 'follow-up'
}

function mapDoc(id: string, data: any, col: LeadCollection): Lead {
  const countRaw = typeof data.travelersCount === 'number'
    ? data.travelersCount
    : parseInt(data.travelersCount || data.members || data.totalGuests || data.peopleCount || data.adults || '', 10)
  const isFb = col === 'leads' && (data.source === 'Facebook Lead Ad' || !!data.leadgenId)
  return {
    id,
    _collection: col,
    name: data.name || '',
    mobile: data.mobile || data.phone || '',
    email: data.email || '',
    destination: data.destination || '',
    packageName: (col === 'ai_planner_leads' ? data.packageContext : data.packageName) || data.packageName || '',
    travelDate: data.travelDate || '',
    travelersCount: Number.isNaN(countRaw) ? undefined : countRaw,
    travelType: data.travelType || '',
    budget: data.budget || '',
    notes: data.notes || data.message || '',
    sourceUrl: data.sourceUrl || '',
    source: col === 'ai_planner_leads' ? 'ai' : isFb ? 'facebook' : 'website',
    status: data.status || 'new',
    read: !!data.read,
    followUpAt: data.followUpAt || '',
    createdAt: data.createdAt || null,
    convertedAt: data.convertedAt || null,
    statusUpdatedAt: data.statusUpdatedAt || null,
  }
}

async function fetchCollection(col: LeadCollection): Promise<Lead[]> {
  if (!db) return []
  let snap
  try {
    snap = await getDocs(query(collection(db, col), orderBy('createdAt', 'desc')))
  } catch {
    // Mixed createdAt types (string vs Timestamp) or missing index: fall back to an unordered read
    snap = await getDocs(collection(db, col))
  }
  return snap.docs.map((d) => mapDoc(d.id, d.data(), col))
}

type DateRange = 'today' | '7d' | '30d' | 'all'
type SourceFilter = 'all' | SourceKind
type StageFilter = 'all' | Stage | 'due'

interface EditForm {
  name: string
  mobile: string
  email: string
  destination: string
  travelDate: string
  travelersCount: string
  travelType: string
  budget: string
  notes: string
  followUpAt: string
  status: Stage
}

// ---------------------------------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------------------------------

export default function WebsiteLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<SourceFilter>('all')
  const [range, setRange] = useState<DateRange>('all')
  const [stage, setStage] = useState<StageFilter>('all')
  const [editing, setEditing] = useState<Lead | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    // Each collection is read independently so a rules error on one doesn't hide the other
    const [web, ai] = await Promise.allSettled([fetchCollection('leads'), fetchCollection('ai_planner_leads')])
    const all = [...(web.status === 'fulfilled' ? web.value : []), ...(ai.status === 'fulfilled' ? ai.value : [])]
    all.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    setLeads(all)
    if (web.status === 'rejected' || ai.status === 'rejected') {
      console.error('[Website leads] load error', web.status === 'rejected' ? web.reason : '', ai.status === 'rejected' ? ai.reason : '')
      setLoadError(web.status === 'rejected' && ai.status === 'rejected' ? 'Could not load leads.' : `Could not load ${web.status === 'rejected' ? 'website' : 'AI planner'} leads; showing the rest.`)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /** Optimistic local update + Firestore write */
  const patchLead = useCallback(async (lead: Lead, payload: Record<string, any>, local: Partial<Lead>) => {
    if (!db) return
    setLeads((prev) => prev.map((l) => (l.id === lead.id && l._collection === lead._collection ? { ...l, ...local } : l)))
    try {
      await updateDoc(doc(db, lead._collection, lead.id), payload)
    } catch (e) {
      console.error('Lead update failed', e)
      alert('Could not save the change. Please try again.')
      load()
    }
  }, [load])

  const setLeadStage = useCallback((lead: Lead, next: Stage) => {
    if (toStage(lead.status) === next && lead.status === next) return
    const now = new Date().toISOString()
    const payload: Record<string, any> = { status: next, read: true, statusUpdatedAt: serverTimestamp() }
    const local: Partial<Lead> = { status: next, read: true, statusUpdatedAt: now }
    if (next === 'converted') { payload.convertedAt = serverTimestamp(); local.convertedAt = now }
    // A closed lead no longer needs a reminder
    if ((next === 'converted' || next === 'lost') && lead.followUpAt) { payload.followUpAt = deleteField(); local.followUpAt = '' }
    patchLead(lead, payload, local)
  }, [patchLead])

  /** Calling or WhatsApp-ing a brand-new lead counts as contacting them */
  const touch = useCallback((lead: Lead) => {
    if (toStage(lead.status) === 'new') setLeadStage(lead, 'contacted')
    else if (!lead.read) patchLead(lead, { read: true }, { read: true })
  }, [patchLead, setLeadStage])

  const handleDelete = useCallback(async (lead: Lead) => {
    if (!db) return
    if (!window.confirm(`Delete the lead from ${lead.name || lead.mobile || 'this person'}? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, lead._collection, lead.id))
      setLeads((prev) => prev.filter((l) => !(l.id === lead.id && l._collection === lead._collection)))
      if (editing?.id === lead.id) { setEditing(null); setForm(null) }
    } catch (e) {
      console.error('Delete failed', e)
      alert('Could not delete the lead. Please try again.')
    }
  }, [editing])

  const openEdit = useCallback((lead: Lead) => {
    setEditing(lead)
    setFormError(null)
    setForm({
      name: lead.name,
      mobile: hasPhone(lead.mobile) ? lead.mobile : '',
      email: lead.email,
      destination: lead.destination || lead.packageName,
      travelDate: toDateInput(lead.travelDate),
      travelersCount: lead.travelersCount ? String(lead.travelersCount) : '',
      travelType: lead.travelType,
      budget: lead.budget,
      notes: lead.notes,
      followUpAt: lead.followUpAt,
      status: toStage(lead.status),
    })
    if (!lead.read) patchLead(lead, { read: true }, { read: true })
  }, [patchLead])
  const closeEdit = useCallback(() => { setEditing(null); setForm(null) }, [])
  /** Call / WhatsApp from inside the drawer: same as touch(), and keep the open form in sync */
  const drawerTouch = () => {
    if (!editing) return
    touch(editing)
    if (toStage(editing.status) === 'new') {
      setEditing({ ...editing, status: 'contacted', read: true })
      setForm((f) => (f && f.status === 'new' ? { ...f, status: 'contacted' } : f))
    }
  }

  const saveEdit = async () => {
    if (!editing || !form || !db) return
    setFormError(null)
    const payload: Record<string, any> = {}
    const local: Partial<Lead> = {}
    const assign = (key: keyof EditForm & keyof Lead, value: string) => {
      const v = value.trim()
      payload[key] = v ? v : deleteField()
      ;(local as any)[key] = v
    }
    if (!form.name.trim()) { setFormError('Name is required'); return }
    payload.name = form.name.trim(); local.name = form.name.trim()
    // Keep "Not provided" placeholders from the AI planner unless a real number is typed
    if (form.mobile.trim()) { payload.mobile = form.mobile.trim(); local.mobile = form.mobile.trim() }
    assign('email', form.email)
    assign('destination', form.destination)
    assign('travelDate', form.travelDate)
    assign('travelType', form.travelType)
    assign('budget', form.budget)
    assign('notes', form.notes)
    assign('followUpAt', form.followUpAt)
    if (form.travelersCount.trim()) {
      const n = parseInt(form.travelersCount.trim(), 10)
      if (Number.isNaN(n) || n <= 0) { setFormError('Travellers must be a positive number'); return }
      payload.travelersCount = n; local.travelersCount = n
    } else {
      payload.travelersCount = deleteField(); local.travelersCount = undefined
    }
    if (form.status !== toStage(editing.status)) {
      const now = new Date().toISOString()
      payload.status = form.status; local.status = form.status
      payload.statusUpdatedAt = serverTimestamp(); local.statusUpdatedAt = now
      if (form.status === 'converted') { payload.convertedAt = serverTimestamp(); local.convertedAt = now }
    }
    payload.read = true; local.read = true
    setSaving(true)
    try {
      await updateDoc(doc(db, editing._collection, editing.id), payload)
      setLeads((prev) => prev.map((l) => (l.id === editing.id && l._collection === editing._collection ? { ...l, ...local } : l)))
      closeEdit()
    } catch (e: any) {
      console.error('Lead save failed', e)
      setFormError(e?.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ---- Derived lists ---------------------------------------------------------------------------------------------
  const fbCount = useMemo(() => leads.filter((l) => l.source === 'facebook').length, [leads])

  /** Search + source + date filters (status chips are counted on this set) */
  const baseList = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qDigits = phoneDigits(search)
    const since = range === 'today' ? startOfToday() : range === '7d' ? Date.now() - 7 * DAY : range === '30d' ? Date.now() - 30 * DAY : 0
    return leads.filter((l) => {
      if (source === 'all' ? l.source === 'facebook' : l.source !== source) return false
      if (since && toMillis(l.createdAt) < since) return false
      if (!q) return true
      if (qDigits.length >= 4 && phoneDigits(l.mobile).includes(qDigits)) return true
      return [l.name, l.email, l.destination, l.packageName, l.notes, l.budget].some((v) => String(v || '').toLowerCase().includes(q))
    })
  }, [leads, search, source, range])

  const stageCounts = useMemo(() => {
    const c: Record<string, number> = { all: baseList.length, due: 0 }
    PIPELINE.forEach((p) => { c[p.value] = 0 })
    baseList.forEach((l) => { c[toStage(l.status)]++; if (isFollowUpDue(l)) c.due++ })
    return c
  }, [baseList])

  const visible = useMemo(() => {
    const list = baseList.filter((l) => (stage === 'all' ? true : stage === 'due' ? isFollowUpDue(l) : toStage(l.status) === stage))
    if (stage === 'due') list.sort((a, b) => (a.followUpAt || '0').localeCompare(b.followUpAt || '0'))
    return list
  }, [baseList, stage])

  const stats = useMemo(() => {
    const working = leads.filter((l) => l.source !== 'facebook')
    const today = startOfToday()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return {
      newToday: working.filter((l) => toMillis(l.createdAt) >= today).length,
      notContacted: working.filter((l) => toStage(l.status) === 'new').length,
      unread: working.filter((l) => !l.read).length,
      due: working.filter(isFollowUpDue).length,
      convertedMonth: working.filter((l) => toStage(l.status) === 'converted' && toMillis(l.convertedAt || l.statusUpdatedAt || l.createdAt) >= monthStart).length,
      openTotal: working.filter(isOpen).length,
    }
  }, [leads])

  const handleExport = () => {
    exportToCsv(`travelzada-website-leads-${todayIso()}.csv`, visible.map((l) => ({
      Name: l.name,
      Phone: l.mobile,
      Email: l.email,
      'Destination / package': tripOf(l),
      'Travel date': l.travelDate,
      Travellers: l.travelersCount ?? '',
      'Travel type': l.travelType,
      Budget: l.budget,
      Source: SOURCE_META[l.source].label,
      Status: STAGE_LABEL[toStage(l.status)],
      'Next follow-up': l.followUpAt,
      Received: formatDate(l.createdAt, true),
      Notes: l.notes,
      Page: l.sourceUrl,
    })))
  }

  const resetFilters = () => { setSearch(''); setSource('all'); setRange('all'); setStage('all') }

  // ---- Render ----------------------------------------------------------------------------------------------------
  const sourceOptions: Array<{ value: SourceFilter; label: string; count?: number }> = [
    { value: 'all', label: 'All sources' },
    { value: 'website', label: 'Website' },
    { value: 'ai', label: 'AI Planner' },
    ...(fbCount ? [{ value: 'facebook' as SourceFilter, label: 'Old Facebook copies', count: fbCount }] : []),
  ]
  const rangeOptions: Array<{ value: DateRange; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'all', label: 'All time' },
  ]
  const stageOptions: Array<{ value: StageFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: stageCounts.all },
    ...PIPELINE.map((p) => ({ value: p.value as StageFilter, label: p.label, count: stageCounts[p.value] })),
    { value: 'due', label: '⏰ Follow-up due', count: stageCounts.due },
  ]

  return (
    <div>
      <PageHeader
        title="Website Leads"
        description="Enquiries from package pages and the AI trip planner. Call or WhatsApp them, then send a quote."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={!visible.length}><Download className="w-4 h-4" /> Export CSV</Button>
            <Button variant="secondary" onClick={load} loading={loading}>{!loading && <RefreshCw className="w-4 h-4" />} Refresh</Button>
          </>
        }
      />

      <StatRow>
        <StatCard label="New today" value={stats.newToday} hint={stats.unread ? `${stats.unread} unread overall` : 'All caught up'} icon={<UserPlus className="w-5 h-5" />} tone="blue" onClick={() => { setRange('today'); setStage('all') }} />
        <StatCard label="Not contacted yet" value={stats.notContacted} hint="Call these first" icon={<PhoneOff className="w-5 h-5" />} tone="red" onClick={() => { setRange('all'); setStage('new') }} />
        <StatCard label="Follow-ups due" value={stats.due} hint="Today or overdue" icon={<BellRing className="w-5 h-5" />} tone="amber" onClick={() => { setRange('all'); setStage('due') }} />
        <StatCard label="Converted this month" value={stats.convertedMonth} hint={`${stats.openTotal} leads still open`} icon={<CheckCircle2 className="w-5 h-5" />} tone="green" onClick={() => { setRange('all'); setStage('converted') }} />
      </StatRow>

      <div className="mb-3 overflow-x-auto no-scrollbar">
        <FilterChips options={stageOptions} value={stage} onChange={setStage} />
      </div>

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <select value={source} onChange={(e) => setSource(e.target.value as SourceFilter)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-bordeaux-200">
            {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}{o.count ? ` (${o.count})` : ''}</option>)}
          </select>
          <div className="inline-flex rounded-xl border border-gray-300 bg-white p-0.5">
            {rangeOptions.map((o) => (
              <button key={o.value} type="button" onClick={() => setRange(o.value)} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', range === o.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100')}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, destination…" className="w-full md:w-80" />
      </Toolbar>

      {source === 'facebook' && (
        <p className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          These are old copies of Facebook ad leads. Work Facebook / Instagram leads on the{' '}
          <Link href="/admin/meta-leads" className="font-semibold underline">Meta Leads</Link> page so nobody calls the same person twice.
        </p>
      )}
      {loadError && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</p>}

      <Card padded={false}>
        {loading && !leads.length ? (
          <Spinner label="Loading leads…" />
        ) : !visible.length ? (
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title={leads.length ? 'No leads match these filters' : 'No website leads yet'}
            description={leads.length ? 'Try a different status, source or date range.' : 'Enquiries from package pages and the AI planner will show up here.'}
            action={leads.length ? <Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button> : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Lead</Th>
                    <Th>Trip</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((l) => (
                    <tr key={`${l._collection}/${l.id}`} className={cx('group hover:bg-gray-50', !l.read && 'bg-bordeaux-50/40')}>
                      <Td className={cx('border-l-4', !l.read ? 'border-l-bordeaux-500' : 'border-l-transparent')}>
                        <LeadIdentity lead={l} onOpen={() => openEdit(l)} onTouch={() => touch(l)} />
                      </Td>
                      <Td><TripSummary lead={l} /></Td>
                      <Td>
                        <StageSelect lead={l} onChange={(s) => setLeadStage(l, s)} />
                        <FollowUpLine lead={l} />
                      </Td>
                      <Td className="text-right">
                        <RowActions lead={l} onTouch={() => touch(l)} onEdit={() => openEdit(l)} onDelete={() => handleDelete(l)} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-gray-100">
              {visible.map((l) => (
                <li key={`${l._collection}/${l.id}`} className={cx('p-4 border-l-4', !l.read ? 'border-l-bordeaux-500 bg-bordeaux-50/40' : 'border-l-transparent')}>
                  <LeadIdentity lead={l} onOpen={() => openEdit(l)} onTouch={() => touch(l)} />
                  <div className="mt-2"><TripSummary lead={l} /></div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>
                      <StageSelect lead={l} onChange={(s) => setLeadStage(l, s)} />
                      <FollowUpLine lead={l} />
                    </div>
                    <RowActions lead={l} onTouch={() => touch(l)} onEdit={() => openEdit(l)} onDelete={() => handleDelete(l)} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      {!!visible.length && <p className="mt-3 text-xs text-gray-500">Showing {visible.length} of {stageCounts.all} lead{stageCounts.all === 1 ? '' : 's'}</p>}

      {/* Edit drawer */}
      <Drawer
        open={!!editing && !!form}
        onClose={closeEdit}
        title={editing ? <span className="flex items-center gap-2">{editing.name || 'Lead'} <Badge tone={SOURCE_META[editing.source].tone}>{SOURCE_META[editing.source].label}</Badge></span> : ''}
        footer={
          <>
            {editing && <Button variant="ghost" className="mr-auto text-red-600 hover:bg-red-50" onClick={() => handleDelete(editing)}><Trash2 className="w-4 h-4" /> Delete</Button>}
            <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
            <Button onClick={saveEdit} loading={saving}>Save</Button>
          </>
        }
      >
        {editing && form && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {hasPhone(editing.mobile) && (
                <>
                  <a href={waLink(editing.mobile, waMessage(editing))} target="_blank" rel="noopener noreferrer" onClick={drawerTouch} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <a href={`tel:${editing.mobile}`} onClick={drawerTouch} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                  <Link href={`/admin/whatsapp-chats?phone=${encodeURIComponent(phoneDigits(editing.mobile))}&name=${encodeURIComponent(editing.name)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50">
                    <MessagesSquare className="w-4 h-4" /> Open in inbox
                  </Link>
                </>
              )}
              <Link href={quoteHref(editing)} className="inline-flex items-center gap-1.5 rounded-xl bg-bordeaux-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-bordeaux-700">
                <FileText className="w-4 h-4" /> Create quote PDF
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Stage })}>
                  {PIPELINE.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
              <Field label="Next follow-up">
                <input type="date" className={inputClass} value={form.followUpAt} onChange={(e) => setForm({ ...form, followUpAt: e.target.value })} />
              </Field>
            </div>
            <div className="-mt-2 flex flex-wrap gap-1.5">
              {[['Tomorrow', 1], ['In 3 days', 3], ['Next week', 7]].map(([label, days]) => (
                <button key={label} type="button" onClick={() => { const d = new Date(Date.now() + Number(days) * DAY); setForm({ ...form, followUpAt: toDateInput(d.toISOString()) }) }} className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-bordeaux-300">
                  {label}
                </button>
              ))}
              {form.followUpAt && <button type="button" onClick={() => setForm({ ...form, followUpAt: '' })} className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-700">Clear</button>}
            </div>

            <Field label="Notes" hint="Call outcome, preferences, what was promised…">
              <textarea rows={4} className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phone"><input className={inputClass} value={form.mobile} placeholder={hasPhone(editing.mobile) ? '' : 'Not provided'} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
              <Field label="Email" className="col-span-2"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Destination / package" className="col-span-2"><input className={inputClass} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field>
              <Field label="Travel date"><input type="date" className={inputClass} value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} /></Field>
              <Field label="Travellers"><input type="number" min={1} className={inputClass} value={form.travelersCount} onChange={(e) => setForm({ ...form, travelersCount: e.target.value })} /></Field>
              <Field label="Trip type">
                <select className={inputClass} value={form.travelType} onChange={(e) => setForm({ ...form, travelType: e.target.value })}>
                  <option value="">—</option>
                  {['Honeymoon', 'Couple', 'Family', 'Friends', 'Solo', 'Group', 'Corporate'].map((t) => <option key={t} value={t}>{t}</option>)}
                  {form.travelType && !['Honeymoon', 'Couple', 'Family', 'Friends', 'Solo', 'Group', 'Corporate'].includes(form.travelType) && <option value={form.travelType}>{form.travelType}</option>}
                </select>
              </Field>
              <Field label="Budget"><input className={inputClass} placeholder="e.g. ₹80,000 per couple" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field>
            </div>

            {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 space-y-1">
              <p>Received {formatDate(editing.createdAt, true)} ({timeAgo(editing.createdAt)}) via {SOURCE_META[editing.source].label}</p>
              {editing.sourceUrl && (
                <p className="truncate">
                  From page:{' '}
                  <a href={editing.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-bordeaux-700 hover:underline inline-flex items-center gap-1">
                    {editing.sourceUrl.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70)} <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------------
// Row pieces
// ---------------------------------------------------------------------------------------------------------------------

function LeadIdentity({ lead, onOpen, onTouch }: { lead: Lead; onOpen: () => void; onTouch: () => void }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {!lead.read && <span className="w-2 h-2 rounded-full bg-bordeaux-600 shrink-0" title="Unread" />}
        <button type="button" onClick={onOpen} className={cx('text-left truncate hover:text-bordeaux-700', lead.read ? 'font-medium text-gray-900' : 'font-bold text-gray-900')}>
          {lead.name || 'Unnamed'}
        </button>
        <Badge tone={SOURCE_META[lead.source].tone} className="!text-[10px]">
          {lead.source === 'ai' && <Sparkles className="w-3 h-3" />}{SOURCE_META[lead.source].label}
        </Badge>
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
        {hasPhone(lead.mobile) ? (
          <a href={`tel:${lead.mobile}`} onClick={onTouch} className="font-medium text-gray-700 hover:text-bordeaux-700 tabular-nums">{lead.mobile}</a>
        ) : (
          <span className="italic text-gray-400">No phone</span>
        )}
        <span>·</span>
        <span title={formatDate(lead.createdAt, true)}>{timeAgo(lead.createdAt)}</span>
      </div>
    </div>
  )
}

function TripSummary({ lead }: { lead: Lead }) {
  const trip = tripOf(lead)
  const bits = [
    lead.travelDate && (toDateInput(lead.travelDate) ? formatDate(toDateInput(lead.travelDate)) : lead.travelDate),
    lead.travelersCount ? `${lead.travelersCount} traveller${lead.travelersCount === 1 ? '' : 's'}` : '',
    lead.travelType,
  ].filter(Boolean)
  return (
    <div className="min-w-0 max-w-xs">
      <div className="text-gray-900 truncate" title={trip}>{trip || <span className="text-gray-400">Not specified</span>}</div>
      {(bits.length > 0 || lead.budget) && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
          {bits.length > 0 && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />{bits.join(' · ')}</span>}
          {lead.budget && <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" />{lead.budget}</span>}
        </div>
      )}
      {lead.notes && <div className="mt-0.5 text-xs text-gray-400 truncate" title={lead.notes}>“{lead.notes}”</div>}
    </div>
  )
}

function StageSelect({ lead, onChange }: { lead: Lead; onChange: (s: Stage) => void }) {
  const stage = toStage(lead.status)
  return (
    <select
      value={stage}
      onChange={(e) => onChange(e.target.value as Stage)}
      className={cx('rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-bordeaux-200 cursor-pointer', STAGE_STYLE[stage])}
      aria-label="Lead status"
    >
      {PIPELINE.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
    </select>
  )
}

function FollowUpLine({ lead }: { lead: Lead }) {
  if (!lead.followUpAt || !isOpen(lead)) return null
  const today = todayIso()
  const overdue = lead.followUpAt < today
  const isToday = lead.followUpAt === today
  return (
    <div className={cx('mt-1 inline-flex items-center gap-1 text-xs', overdue ? 'font-semibold text-red-600' : isToday ? 'font-semibold text-amber-700' : 'text-gray-500')}>
      <BellRing className="w-3 h-3" />
      {overdue ? 'Overdue · ' : isToday ? 'Today · ' : ''}{formatDate(lead.followUpAt)}
    </div>
  )
}

function RowActions({ lead, onTouch, onEdit, onDelete }: { lead: Lead; onTouch: () => void; onEdit: () => void; onDelete: () => void }) {
  const icon = 'p-2 rounded-lg transition-colors'
  const phoneOk = hasPhone(lead.mobile)
  return (
    <div className="inline-flex items-center justify-end gap-0.5">
      {phoneOk && (
        <>
          <a href={waLink(lead.mobile, waMessage(lead))} target="_blank" rel="noopener noreferrer" onClick={onTouch} title="WhatsApp" className={cx(icon, 'text-emerald-600 hover:bg-emerald-50')}>
            <MessageCircle className="w-4 h-4" />
          </a>
          <a href={`tel:${lead.mobile}`} onClick={onTouch} title="Call" className={cx(icon, 'text-gray-600 hover:bg-gray-100')}>
            <Phone className="w-4 h-4" />
          </a>
        </>
      )}
      {lead.email && (
        <a href={`mailto:${lead.email}?subject=${encodeURIComponent(`Your ${tripOf(lead) ? tripOf(lead).replace(/\s*package$/i, '') + ' ' : ''}trip with Travelzada`)}`} title="Email" className={cx(icon, 'text-gray-600 hover:bg-gray-100')}>
          <Mail className="w-4 h-4" />
        </a>
      )}
      <Link href={quoteHref(lead)} title="Create quote PDF" className={cx(icon, 'text-bordeaux-600 hover:bg-bordeaux-50')}>
        <FileText className="w-4 h-4" />
      </Link>
      <button type="button" onClick={onEdit} title="Edit details & follow-up" className={cx(icon, 'text-gray-600 hover:bg-gray-100')}>
        <Pencil className="w-4 h-4" />
      </button>
      <button type="button" onClick={onDelete} title="Delete" className={cx(icon, 'text-gray-400 hover:text-red-600 hover:bg-red-50')}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
