'use client'

/**
 * Planner Activity: every AI planner search and every uploaded itinerary (`planner_activity`), including people
 * who never left a phone number. Sales use it to see demand, competitor quotes, and to open leads that came from it.
 *
 * Doc shape (lib/planner/records.ts): { type, summary, details, matches[], fileUrl, fileName, sessionId, ip,
 * userAgent, leadId, createdAt }. Itinerary uploads keep `details.extraction` + `details.comparison`.
 * Deep link: /admin/planner-activity?id=<activityId>
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Download, ExternalLink, FileText, MessageCircle, RefreshCw, Search, Sparkles, Upload, UserCheck, Users } from 'lucide-react'
import {
  PageHeader, StatRow, StatCard, Card, Toolbar, SearchInput, FilterChips, Button, Table, Th, Td, Drawer, Badge, EmptyState,
  Spinner, formatDate, timeAgo, toMillis, waLink, exportToCsv, cx,
} from '@/components/admin/ui'

type ActivityType = 'smart_search' | 'wizard_search' | 'itinerary_upload' | string

interface Activity {
  id: string
  type: ActivityType
  summary: string
  details: Record<string, any>
  matches: Array<{ id: string; name: string; score: number }>
  fileUrl: string | null
  fileName: string | null
  sessionId: string | null
  ip: string | null
  userAgent: string | null
  leadId: string | null
  createdAt: any
}

type Filter = 'all' | 'itinerary_upload' | 'smart_search' | 'wizard_search' | 'leads' | 'anonymous'

const TYPE_META: Record<string, { label: string; tone: 'wine' | 'purple' | 'blue' | 'gray' }> = {
  itinerary_upload: { label: 'Itinerary upload', tone: 'wine' },
  smart_search: { label: 'Smart search', tone: 'purple' },
  wizard_search: { label: 'Wizard search', tone: 'blue' },
}
const typeMeta = (t: string) => TYPE_META[t] || { label: t || 'Other', tone: 'gray' as const }

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  included: { label: '✓ Included', cls: 'bg-emerald-50 text-emerald-700' },
  similar: { label: '≈ Similar', cls: 'bg-amber-50 text-amber-800' },
  not_included: { label: '✕ Not in ours', cls: 'bg-gray-100 text-gray-600' },
}

const DAY = 86400000
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }

function destinationOf(a: Activity): string {
  const x = a.details?.extraction
  if (x?.destinations?.length) return x.destinations.slice(0, 3).join(', ')
  const p = a.details?.prefs || a.details?.preferences || a.details
  const d = p?.destinations
  if (Array.isArray(d) && d.length) return d.slice(0, 3).join(', ')
  if (typeof p?.destination === 'string') return p.destination
  return x?.country || ''
}

function competitorPrice(a: Activity): string {
  const p = a.details?.extraction?.price
  if (!p) return ''
  const cur = String(p.currency || 'INR').toUpperCase()
  const fmt = (n: number) => (cur === 'INR' ? '₹' + Math.round(n).toLocaleString('en-IN') : `${cur} ${Math.round(n).toLocaleString('en-IN')}`)
  if (p.total) return `${fmt(p.total)} total`
  if (p.perPerson) return `${fmt(p.perPerson)} pp`
  return p.text || ''
}

function mapDoc(id: string, d: any): Activity {
  return {
    id,
    type: d.type || '',
    summary: d.summary || '',
    details: d.details && typeof d.details === 'object' ? d.details : {},
    matches: Array.isArray(d.matches) ? d.matches : [],
    fileUrl: d.fileUrl || null,
    fileName: d.fileName || null,
    sessionId: d.sessionId || null,
    ip: d.ip || null,
    userAgent: d.userAgent || null,
    leadId: d.leadId || null,
    createdAt: d.createdAt || d.createdAtIso || null,
  }
}

export default function PlannerActivityPage() {
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Activity | null>(null)

  const load = useCallback(async () => {
    if (!db) return
    setLoading(true)
    setLoadError(null)
    try {
      let snap
      try {
        snap = await getDocs(query(collection(db, 'planner_activity'), orderBy('createdAt', 'desc'), limit(1000)))
      } catch {
        snap = await getDocs(collection(db, 'planner_activity'))
      }
      const list = snap.docs.map((d) => mapDoc(d.id, d.data()))
      list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      setItems(list)
    } catch (e) {
      console.error('[Planner activity] load error', e)
      setLoadError('Could not load planner activity.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Deep link ?id=
  useEffect(() => {
    if (!items.length) return
    const id = new URLSearchParams(window.location.search).get('id')
    if (!id) return
    const hit = items.find((a) => a.id === id)
    if (hit) setOpen(hit)
    else if (db) getDoc(doc(db, 'planner_activity', id)).then((s) => s.exists() && setOpen(mapDoc(s.id, s.data()))).catch(() => {})
  }, [items])

  const stats = useMemo(() => {
    const today = startOfToday()
    const week = Date.now() - 7 * DAY
    const month = Date.now() - 30 * DAY
    const recent = items.filter((a) => toMillis(a.createdAt) >= month)
    return {
      uploadsToday: items.filter((a) => a.type === 'itinerary_upload' && toMillis(a.createdAt) >= today).length,
      uploads7d: items.filter((a) => a.type === 'itinerary_upload' && toMillis(a.createdAt) >= week).length,
      searches7d: items.filter((a) => a.type !== 'itinerary_upload' && toMillis(a.createdAt) >= week).length,
      leadPct: recent.length ? Math.round((recent.filter((a) => a.leadId).length / recent.length) * 100) : 0,
      leads30d: recent.filter((a) => a.leadId).length,
      anonymous: items.filter((a) => !a.leadId).length,
    }
  }, [items])

  const counts = useMemo(() => ({
    all: items.length,
    itinerary_upload: items.filter((a) => a.type === 'itinerary_upload').length,
    smart_search: items.filter((a) => a.type === 'smart_search').length,
    wizard_search: items.filter((a) => a.type === 'wizard_search').length,
    leads: items.filter((a) => a.leadId).length,
    anonymous: items.filter((a) => !a.leadId).length,
  }), [items])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((a) => {
      if (filter === 'leads' && !a.leadId) return false
      if (filter === 'anonymous' && a.leadId) return false
      if (['itinerary_upload', 'smart_search', 'wizard_search'].includes(filter) && a.type !== filter) return false
      if (!q) return true
      return [a.summary, destinationOf(a), a.matches[0]?.name, a.fileName, a.details?.extraction?.agency, a.details?.query, a.details?.text]
        .some((v) => String(v || '').toLowerCase().includes(q))
    })
  }, [items, filter, search])

  const handleExport = () => {
    exportToCsv(`travelzada-planner-activity-${new Date().toISOString().slice(0, 10)}.csv`, visible.map((a) => ({
      When: formatDate(a.createdAt, true),
      Type: typeMeta(a.type).label,
      Summary: a.summary,
      Destination: destinationOf(a),
      'Their price': competitorPrice(a),
      Agency: a.details?.extraction?.agency || '',
      'Top match': a.matches[0]?.name || '',
      'Match %': a.details?.comparison?.matchPercent ?? a.matches[0]?.score ?? '',
      Lead: a.leadId ? 'Yes' : 'No',
      'Lead ID': a.leadId || '',
      File: a.fileUrl || '',
      Session: a.sessionId || '',
    })))
  }

  const filterOptions: Array<{ value: Filter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'itinerary_upload', label: 'Itinerary uploads', count: counts.itinerary_upload },
    { value: 'smart_search', label: 'Smart searches', count: counts.smart_search },
    { value: 'wizard_search', label: 'Wizard searches', count: counts.wizard_search },
    { value: 'leads', label: 'Became leads', count: counts.leads },
    { value: 'anonymous', label: 'Anonymous', count: counts.anonymous },
  ]

  return (
    <div>
      <PageHeader
        title="Planner Activity"
        description="Every AI planner search and uploaded itinerary — even people who didn't leave a number. Use it to spot demand and follow up on leads."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={!visible.length}><Download className="w-4 h-4" /> Export CSV</Button>
            <Button variant="secondary" onClick={load} loading={loading}>{!loading && <RefreshCw className="w-4 h-4" />} Refresh</Button>
          </>
        }
      />

      <StatRow>
        <StatCard label="Uploads today" value={stats.uploadsToday} hint={`${stats.uploads7d} in the last 7 days`} icon={<Upload className="w-5 h-5" />} tone="wine" onClick={() => setFilter('itinerary_upload')} />
        <StatCard label="Searches (7 days)" value={stats.searches7d} hint="Smart + wizard searches" icon={<Search className="w-5 h-5" />} tone="purple" onClick={() => setFilter('smart_search')} />
        <StatCard label="Turned into leads" value={`${stats.leadPct}%`} hint={`${stats.leads30d} leads in the last 30 days`} icon={<UserCheck className="w-5 h-5" />} tone="green" onClick={() => setFilter('leads')} />
        <StatCard label="Anonymous" value={stats.anonymous} hint="No phone number left" icon={<Users className="w-5 h-5" />} tone="gray" onClick={() => setFilter('anonymous')} />
      </StatRow>

      <div className="mb-3 overflow-x-auto no-scrollbar">
        <FilterChips options={filterOptions} value={filter} onChange={setFilter} />
      </div>
      <Toolbar>
        <p className="text-xs text-gray-500">Anonymous rows have no contact details — they show what people look for and what other agencies quote.</p>
        <SearchInput value={search} onChange={setSearch} placeholder="Search destination, agency, package…" className="w-full md:w-80" />
      </Toolbar>

      {loadError && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadError}</p>}

      <Card padded={false}>
        {loading && !items.length ? (
          <Spinner label="Loading planner activity…" />
        ) : !visible.length ? (
          <EmptyState
            icon={<Sparkles className="w-5 h-5" />}
            title={items.length ? 'Nothing matches these filters' : 'No planner activity yet'}
            description={items.length ? 'Try another filter or search.' : 'Searches on the AI planner and itineraries uploaded at /tailored-travel/compare will appear here.'}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Type</Th>
                <Th>Summary</Th>
                <Th>Destination</Th>
                <Th>Top match</Th>
                <Th>File</Th>
                <Th>Lead</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => {
                const m = typeMeta(a.type)
                const pct = a.details?.comparison?.matchPercent
                return (
                  <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(a)}>
                    <Td className="whitespace-nowrap"><span title={formatDate(a.createdAt, true)}>{timeAgo(a.createdAt)}</span></Td>
                    <Td><Badge tone={m.tone}>{m.label}</Badge></Td>
                    <Td className="max-w-xs"><div className="truncate text-gray-900" title={a.summary}>{a.summary || '—'}</div></Td>
                    <Td className="whitespace-nowrap">{destinationOf(a) || <span className="text-gray-400">—</span>}</Td>
                    <Td className="max-w-[14rem]">
                      {a.matches[0] ? (
                        <div className="truncate" title={a.matches[0].name}>
                          {a.matches[0].name} <span className="text-xs text-gray-400">{typeof pct === 'number' ? `${pct}%` : a.matches[0].score ? `${a.matches[0].score}` : ''}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </Td>
                    <Td>
                      {a.fileUrl ? (
                        <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-bordeaux-700 hover:underline">
                          <FileText className="w-4 h-4" /> Open
                        </a>
                      ) : <span className="text-gray-400">—</span>}
                    </Td>
                    <Td>
                      {a.leadId ? (
                        <Link href={`/admin/leads?lead=${a.leadId}`} onClick={(e) => e.stopPropagation()}><Badge tone="green"><UserCheck className="w-3 h-3" /> Lead</Badge></Link>
                      ) : <Badge tone="gray">Anonymous</Badge>}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
      {!!visible.length && <p className="mt-3 text-xs text-gray-500">Showing {visible.length} of {items.length}</p>}

      <ActivityDrawer activity={open} onClose={() => setOpen(null)} />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------------

function ActivityDrawer({ activity: a, onClose }: { activity: Activity | null; onClose: () => void }) {
  const [lead, setLead] = useState<{ name: string; mobile: string } | null>(null)
  useEffect(() => {
    setLead(null)
    if (!a?.leadId || !db) return
    getDoc(doc(db, 'leads', a.leadId)).then((s) => {
      if (s.exists()) { const d = s.data() as any; setLead({ name: d.name || '', mobile: d.mobile || d.phone || '' }) }
    }).catch(() => {})
  }, [a?.leadId])

  if (!a) return null
  const x = a.details?.extraction
  const c = a.details?.comparison
  const prefs = a.details?.prefs || a.details?.preferences
  const statusById = new Map<string, any>((c?.items || []).map((i: any) => [i.id, i]))
  const other = Object.fromEntries(Object.entries(a.details || {}).filter(([k]) => !['extraction', 'comparison', 'prefs', 'preferences', 'pastedText'].includes(k)))

  return (
    <Drawer
      open={!!a}
      onClose={onClose}
      width="max-w-2xl"
      title={<span className="flex items-center gap-2">{typeMeta(a.type).label} <span className="text-xs font-normal text-gray-500">{formatDate(a.createdAt, true)}</span></span>}
    >
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap gap-2">
          {a.fileUrl && (
            <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-bordeaux-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-bordeaux-700">
              <FileText className="w-4 h-4" /> Open file
            </a>
          )}
          {a.leadId && (
            <Link href={`/admin/leads?lead=${a.leadId}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50">
              <UserCheck className="w-4 h-4" /> Open lead{lead?.name ? ` · ${lead.name}` : ''}
            </Link>
          )}
          {lead?.mobile && (
            <a
              href={waLink(lead.mobile, `Hi ${lead.name.split(' ')[0] || 'there'}, this is Travelzada 👋 Thanks for sharing your ${destinationOf(a) || ''} itinerary! I'm preparing your matched quote — when are you planning to travel?`)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
        </div>

        <p className="text-gray-900 font-medium">{a.summary}</p>

        {x && (
          <Block title="Their itinerary (extracted)">
            <KV rows={[
              ['Title', x.title], ['From (agency)', x.agency], ['Customer', x.customerName], ['Destinations', (x.destinations || []).join(', ')],
              ['Nights / days', [x.nights && `${x.nights}N`, x.daysCount && `${x.daysCount}D`].filter(Boolean).join(' / ')],
              ['Dates', x.travelDatesText || x.startDate], ['Travellers', x.travellersText], ['Quoted price', competitorPrice(a)],
              ['Price as written', x.price?.text], ['Flights', x.flightsIncluded], ['Visa', x.visaIncluded], ['Read quality', x.confidence],
            ]} />
            {(x.hotels || []).length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Hotels</p>
                <ul className="space-y-1">
                  {x.hotels.map((h: any, i: number) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span>{[h.name, h.city, h.stars && `${h.stars}★`, h.nights && `${h.nights}N`, h.roomType, h.mealPlan].filter(Boolean).join(' · ')}</span>
                      {statusById.get(`h${i}`) && <StatusPill item={statusById.get(`h${i}`)} />}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Block>
        )}

        {c && (
          <Block title={`Comparison${c.status ? ` · ${c.status === 'no_match' ? 'no matching destination' : c.status}` : ''}${typeof c.matchPercent === 'number' ? ` · ${c.matchPercent}% match` : ''}`}>
            {c.summary && <p className="text-gray-700">{c.summary}</p>}
            {(c.highlights || []).length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-gray-600">{c.highlights.map((h: string) => <li key={h}>{h}</li>)}</ul>
            )}
            {c.alternativesNote && <p className="mt-2 text-gray-600">{c.alternativesNote}</p>}
          </Block>
        )}

        {x && (x.days || []).length > 0 && (
          <Block title="Day by day">
            <div className="space-y-3">
              {x.days.map((d: any, di: number) => (
                <div key={di}>
                  <p className="font-semibold text-gray-900">Day {d.day}: {d.title}</p>
                  <ul className="mt-1 space-y-1">
                    {(d.items || []).map((it: string, ii: number) => {
                      const s = statusById.get(`d${di}-${ii}`)
                      return (
                        <li key={ii} className="flex items-start justify-between gap-2">
                          <span className="text-gray-700">{it}{s?.ourOffer && <span className="block text-xs text-gray-500">Ours: {s.ourOffer}</span>}</span>
                          {s && <StatusPill item={s} />}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </Block>
        )}

        {x && ((x.inclusions || []).length > 0 || (x.exclusions || []).length > 0) && (
          <Block title="Their inclusions / exclusions">
            <div className="grid sm:grid-cols-2 gap-3">
              <ul className="space-y-1">
                {(x.inclusions || []).map((it: string, i: number) => (
                  <li key={i} className="flex items-start justify-between gap-2"><span>✓ {it}</span>{statusById.get(`i${i}`) && <StatusPill item={statusById.get(`i${i}`)} />}</li>
                ))}
              </ul>
              <ul className="space-y-1 text-gray-500">{(x.exclusions || []).map((it: string, i: number) => <li key={i}>✕ {it}</li>)}</ul>
            </div>
            {(x.notes || []).length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-gray-500">{x.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}</ul>}
          </Block>
        )}

        {prefs && (
          <Block title="Preferences used for matching">
            <KV rows={Object.entries(prefs).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)])} />
          </Block>
        )}

        {a.matches.length > 0 && (
          <Block title="Packages we showed">
            <ol className="list-decimal pl-5 space-y-0.5">
              {a.matches.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/packages?edit=${m.id}`} className="text-bordeaux-700 hover:underline">{m.name}</Link>
                  <span className="text-xs text-gray-400"> · score {m.score}</span>
                </li>
              ))}
            </ol>
          </Block>
        )}

        {Object.keys(other).length > 0 && (
          <Block title="Other details">
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-xs text-gray-600">{JSON.stringify(other, null, 2)}</pre>
          </Block>
        )}

        {a.details?.pastedText && (
          <Block title="Pasted text">
            <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-xs text-gray-600">{a.details.pastedText}</pre>
          </Block>
        )}

        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 space-y-0.5">
          {a.fileName && <p>File: {a.fileName}{a.fileUrl && <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-bordeaux-700"><ExternalLink className="w-3 h-3" /></a>}</p>}
          <p>Session: {a.sessionId || '—'} · IP: {a.ip || '—'}</p>
          {a.userAgent && <p className="truncate" title={a.userAgent}>Device: {a.userAgent}</p>}
          <p>Activity ID: {a.id}</p>
        </div>
      </div>
    </Drawer>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </section>
  )
}

function KV({ rows }: { rows: Array<[string, any]> }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '' && v !== 'unknown')
  if (!shown.length) return <p className="text-gray-400">—</p>
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
      {shown.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-gray-500">{k}</dt>
          <dd className="text-gray-900 break-words">{String(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

function StatusPill({ item }: { item: { status: string } }) {
  const s = STATUS_STYLE[item.status]
  if (!s) return null
  return <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', s.cls)}>{s.label}</span>
}
