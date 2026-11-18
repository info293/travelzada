'use client'

/**
 * /admin/flights — reusable flight sectors (from quotes or added by staff), with a Routes view (from → to, grouped).
 * Anyone with the page permission can add / edit; only admins can delete or merge.
 */
import { Fragment, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { ChevronDown, ChevronRight, Download, GitMerge, Pencil, Plane, Plus, Route, Trash2, TrendingUp } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Button, Card, EmptyState, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow, Table, Td, Th, Toolbar,
  cx, exportToCsv, formatDate, formatINR, timeAgo,
} from '../ui'
import { ConfirmDialog } from '../catalog/fields'
import { Segmented } from '../proposal/builder/fields'
import {
  FLIGHTS_COLLECTION, deleteFlight, fareRange, groupRoutes, mergeFlights, routeLabel, toFlight, type FlightRoute, type LibraryFlight,
} from '@/lib/library/flights'
import { matchesWords } from '@/lib/library/common'
import { invalidateLibrary } from '@/lib/library/cache'
import FlightForm from './FlightForm'
import MergeModal from './MergeModal'
import { SourceBadge, selectClass } from './shared'

type View = 'sectors' | 'routes'
type SourceFilter = 'all' | 'quote' | 'admin'

const fareText = (lo: number | null, hi: number | null) => (lo === null ? '—' : hi !== null && hi !== lo ? `${formatINR(lo)} – ${formatINR(hi)}` : formatINR(lo))

export default function FlightsLibrary() {
  const { currentUser, isAdmin } = useAuth()
  const by = (currentUser as any)?.email || 'admin'
  const [flights, setFlights] = useState<LibraryFlight[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState<View>('sectors')
  const [q, setQ] = useState('')
  const [airline, setAirline] = useState('')
  const [route, setRoute] = useState('')
  const [source, setSource] = useState<SourceFilter>('all')
  const [editing, setEditing] = useState<LibraryFlight | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [mergeMode, setMergeMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [mergePair, setMergePair] = useState<[LibraryFlight, LibraryFlight] | null>(null)
  const [deleting, setDeleting] = useState<LibraryFlight | null>(null)
  const [busy, setBusy] = useState(false)
  const [openRoutes, setOpenRoutes] = useState<string[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!currentUser) return
    return onSnapshot(collection(db, FLIGHTS_COLLECTION), (s) => {
      setFlights(s.docs.map((d) => toFlight(d.id, d.data())))
      setReady(true)
    }, (e) => { setLoadError(e.message); setReady(true) })
  }, [currentUser])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t) }, [toast])

  const airlines = useMemo(() => Array.from(new Set(flights.map((f) => f.airline).filter(Boolean))).sort(), [flights])
  const allRoutes = useMemo(() => groupRoutes(flights), [flights])
  const stats = useMemo(() => ({
    fromQuotes: flights.filter((f) => f.source === 'quote').length,
    byStaff: flights.filter((f) => f.source !== 'quote').length,
    top: allRoutes[0] || null,
  }), [flights, allRoutes])

  const list = useMemo(() => flights.filter((f) => {
    if (airline && f.airline !== airline) return false
    if (route && routeLabel(f) !== route) return false
    if (source === 'quote' ? f.source !== 'quote' : source === 'admin' ? f.source === 'quote' : false) return false
    if (q && !matchesWords(`${f.airline} ${f.airlineCode} ${f.flightNumber} ${f.fromCity} ${f.fromAirport} ${f.toCity} ${f.toAirport} ${f.via} ${routeLabel(f)}`, q)) return false
    return true
  }).sort((a, b) => b.usageCount - a.usageCount || routeLabel(a).localeCompare(routeLabel(b)) || a.departureTime.localeCompare(b.departureTime)), [flights, airline, route, source, q])
  const routes = useMemo(() => groupRoutes(list), [list])

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (f: LibraryFlight) => { setEditing(f); setFormOpen(true) }
  const toggleSelect = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)))
  const startMerge = () => {
    const pair = selected.map((id) => flights.find((f) => f.id === id)).filter(Boolean) as LibraryFlight[]
    if (pair.length === 2) setMergePair([pair[0], pair[1]])
  }
  const doDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try { await deleteFlight(deleting.id); invalidateLibrary(); setToast('Flight deleted'); setDeleting(null) } catch (e: any) { setToast(e?.message || 'Delete failed') } finally { setBusy(false) }
  }
  const exportCsv = () => exportToCsv(`travelzada-flights-${new Date().toISOString().slice(0, 10)}.csv`, list.map((f) => {
    const [lo, hi] = fareRange(f)
    return {
      airline: f.airline, airlineCode: f.airlineCode, flightNumber: f.flightNumber, fromCity: f.fromCity, fromAirport: f.fromAirport,
      toCity: f.toCity, toAirport: f.toAirport, departure: f.departureTime, arrival: f.arrivalTime, duration: f.duration, stops: f.stops,
      via: f.via, cabin: f.cabin, baggage: f.baggage, refundable: f.refundable === null ? '' : f.refundable ? 'yes' : 'no',
      days: f.daysOfWeek.join(' '), fareLow: lo ?? '', fareHigh: hi ?? '', fareNote: f.typicalFare?.note || '', usageCount: f.usageCount,
      lastUsed: f.lastUsedAt, source: f.source, notes: f.notes,
    }
  }))

  const sectorLine = (f: LibraryFlight) => (
    <div className="min-w-0">
      <div className="font-semibold text-gray-900">{routeLabel(f)} <span className="font-normal text-gray-500">· {[f.airline, f.flightNumber].filter(Boolean).join(' ')}</span></div>
      <div className="text-xs text-gray-500">{f.departureTime || '--:--'} → {f.arrivalTime || '--:--'}{f.duration ? ` · ${f.duration}` : ''} · {f.stops ? `${f.stops} stop${f.stops > 1 ? 's' : ''}${f.via ? ` via ${f.via}` : ''}` : 'non-stop'}</div>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Flights"
        description="Flight sectors from our quotes and team — pick them in Create Itinerary instead of retyping."
        actions={<>
          <Button variant="secondary" onClick={exportCsv} disabled={!list.length}><Download className="h-4 w-4" /> CSV</Button>
          {isAdmin && view === 'sectors' && <Button variant={mergeMode ? 'primary' : 'secondary'} onClick={() => { setMergeMode((m) => !m); setSelected([]) }}><GitMerge className="h-4 w-4" /> {mergeMode ? 'Done merging' : 'Merge duplicates'}</Button>}
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Add flight</Button>
        </>}
      />

      <StatRow>
        <StatCard label="Sectors" value={flights.length} hint={`${airlines.length} airline${airlines.length === 1 ? '' : 's'}`} icon={<Plane className="h-5 w-5" />} onClick={() => { setView('sectors'); setSource('all') }} />
        <StatCard label="From quotes / by staff" value={`${stats.fromQuotes} / ${stats.byStaff}`} hint="captured automatically from quotes" icon={<Plane className="h-5 w-5" />} tone="blue" onClick={() => setSource('quote')} />
        <StatCard label="Routes" value={allRoutes.length} hint={allRoutes.slice(0, 3).map((r) => `${r.from}→${r.to}`).join(', ') || '—'} icon={<Route className="h-5 w-5" />} tone="green" onClick={() => setView('routes')} />
        <StatCard label="Most used route" value={stats.top?.usageCount ? `${stats.top.usageCount}×` : '—'} hint={stats.top ? `${stats.top.from} → ${stats.top.to}` : 'no quotes yet'} icon={<TrendingUp className="h-5 w-5" />} tone="amber" />
      </StatRow>

      <Card padded={false}>
        <div className="border-b border-gray-100 p-4">
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder="Airline, flight no., city or DEL SXR…" className="md:w-80" />
            <div className="flex flex-wrap items-center gap-2">
              <select className={selectClass} value={airline} onChange={(e) => setAirline(e.target.value)} aria-label="Airline">
                <option value="">All airlines</option>
                {airlines.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select className={selectClass} value={route} onChange={(e) => setRoute(e.target.value)} aria-label="Route">
                <option value="">All routes</option>
                {allRoutes.map((r) => <option key={r.key} value={`${r.from || '?'} → ${r.to || '?'}`}>{r.from} → {r.to}</option>)}
              </select>
              <Segmented<View> value={view} onChange={(v) => { setView(v); setMergeMode(false); setSelected([]) }} options={[{ value: 'sectors', label: 'Sectors' }, { value: 'routes', label: 'Routes' }]} />
            </div>
          </Toolbar>
          <FilterChips<SourceFilter> value={source} onChange={setSource} options={[
            { value: 'all', label: 'All', count: flights.length },
            { value: 'quote', label: 'From quotes', count: stats.fromQuotes },
            { value: 'admin', label: 'Added by staff', count: stats.byStaff },
          ]} />
          {mergeMode && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-bordeaux-50 px-3 py-2 text-sm text-bordeaux-800">
              <span>Tick two sectors that are the same flight ({selected.length}/2 selected).</span>
              <Button size="sm" onClick={startMerge} disabled={selected.length !== 2}><GitMerge className="h-3.5 w-3.5" /> Merge selected</Button>
            </div>
          )}
        </div>

        {!ready ? <Spinner /> : loadError ? <EmptyState title="Could not load flights" description={loadError} /> : !list.length ? (
          <EmptyState icon={<Plane className="h-6 w-6" />} title={flights.length ? 'No flights match these filters' : 'No flights yet'}
            description={flights.length ? 'Try clearing the search or filters.' : 'Flight sectors are added automatically when a quote with sectors is saved — or add one now.'}
            action={!flights.length ? <Button onClick={openNew}><Plus className="h-4 w-4" /> Add flight</Button> : undefined} />
        ) : view === 'routes' ? (
          <RoutesView routes={routes} open={openRoutes} onToggle={(k) => setOpenRoutes((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))} onEdit={openEdit} sectorLine={sectorLine} />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    {mergeMode && <Th className="w-8" />}
                    <Th>Sector</Th>
                    <Th>Days</Th>
                    <Th>Fare</Th>
                    <Th className="text-right">Used</Th>
                    <Th>Last used</Th>
                    <Th>Source</Th>
                    <Th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => {
                    const [lo, hi] = fareRange(f)
                    return (
                      <tr key={f.id} className={cx('hover:bg-gray-50/60', selected.includes(f.id) && 'bg-bordeaux-50/50')}>
                        {mergeMode && <Td><input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggleSelect(f.id)} aria-label="Select sector" className="h-4 w-4 rounded border-gray-300 text-bordeaux-600" /></Td>}
                        <Td><button type="button" onClick={() => openEdit(f)} className="flex items-center gap-3 text-left">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bordeaux-50 text-bordeaux-700">
                            {f.screenshots[0] ? <img src={f.screenshots[0].url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Plane className="h-4 w-4" />}
                          </div>
                          {sectorLine(f)}
                        </button></Td>
                        <Td className="text-xs text-gray-500">{f.daysOfWeek.length === 7 ? 'Daily' : f.daysOfWeek.join(' ') || '—'}</Td>
                        <Td className="whitespace-nowrap text-xs">{fareText(lo, hi)}</Td>
                        <Td className="text-right font-semibold tabular-nums">{f.usageCount}</Td>
                        <Td className="whitespace-nowrap text-xs">{f.lastUsedAt ? <span title={formatDate(f.lastUsedAt, true)}>{timeAgo(f.lastUsedAt)}</span> : <span className="text-gray-400">never</span>}</Td>
                        <Td><SourceBadge source={f.source} /></Td>
                        <Td><div className="flex justify-end gap-1">
                          <button type="button" onClick={() => openEdit(f)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Edit flight"><Pencil className="h-4 w-4" /></button>
                          {isAdmin && <button type="button" onClick={() => setDeleting(f)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete flight"><Trash2 className="h-4 w-4" /></button>}
                        </div></Td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
            <ul className="divide-y divide-gray-100 md:hidden">
              {list.map((f) => (
                <li key={f.id} className={cx('flex items-start gap-3 p-4', selected.includes(f.id) && 'bg-bordeaux-50/50')}>
                  {mergeMode && <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggleSelect(f.id)} aria-label="Select sector" className="mt-1 h-4 w-4 rounded border-gray-300 text-bordeaux-600" />}
                  <button type="button" onClick={() => openEdit(f)} className="min-w-0 flex-1 text-left">
                    {sectorLine(f)}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{fareText(...fareRange(f))}</span><span>Used {f.usageCount}×</span><SourceBadge source={f.source} />
                    </div>
                  </button>
                  {isAdmin && <button type="button" onClick={() => setDeleting(f)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete flight"><Trash2 className="h-4 w-4" /></button>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {toast && <div className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white shadow-lg" role="status">{toast}</div>}

      <FlightForm open={formOpen} flight={editing} all={flights} by={by}
        onClose={() => setFormOpen(false)}
        onSaved={() => { invalidateLibrary(); setToast(editing ? 'Flight saved' : 'Flight added') }}
        onOpenExisting={(f) => { setEditing(f); setFormOpen(true) }} />

      <MergeModal<LibraryFlight> open={!!mergePair} items={mergePair} noun="flight" describe={(f) => (
        <div className="text-xs text-gray-600">{sectorLine(f)}<div className="mt-1">Used {f.usageCount}× · {f.fareSamples.length} fares · {f.screenshots.length} screenshots</div><div className="mt-1"><SourceBadge source={f.source} /></div></div>
      )}
        onClose={() => setMergePair(null)}
        onMerge={async (keep, drop) => { await mergeFlights(keep, drop, by); invalidateLibrary(); setSelected([]); setToast('Flights merged') }} />

      <ConfirmDialog open={!!deleting} title="Delete flight?" busy={busy} onClose={() => setDeleting(null)} onConfirm={doDelete}
        message={deleting ? <>Delete <b>{[deleting.airline, deleting.flightNumber].filter(Boolean).join(' ')} {routeLabel(deleting)}</b>{deleting.usageCount ? ` (used in ${deleting.usageCount} quote${deleting.usageCount === 1 ? '' : 's'})` : ''}? Quotes keep their own copy.</> : ''} />
    </div>
  )
}

function RoutesView({ routes, open, onToggle, onEdit, sectorLine }: {
  routes: FlightRoute[]; open: string[]; onToggle: (k: string) => void; onEdit: (f: LibraryFlight) => void; sectorLine: (f: LibraryFlight) => JSX.Element
}) {
  return (
    <Table>
      <thead>
        <tr><Th>Route</Th><Th>Airlines</Th><Th className="text-right">Sectors</Th><Th>Fare range</Th><Th className="text-right">Used</Th><Th>Last used</Th></tr>
      </thead>
      <tbody>
        {routes.map((r) => {
          const isOpen = open.includes(r.key)
          return (
            <Fragment key={r.key}>
              <tr className="cursor-pointer hover:bg-gray-50/60" onClick={() => onToggle(r.key)}>
                <Td>
                  <button type="button" aria-expanded={isOpen} className="flex items-center gap-2 text-left" onClick={(e) => { e.stopPropagation(); onToggle(r.key) }}>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <span><span className="font-semibold text-gray-900">{r.from} → {r.to}</span><span className="block text-xs text-gray-500">{[r.fromCity, r.toCity].filter(Boolean).join(' → ')}</span></span>
                  </button>
                </Td>
                <Td className="text-xs text-gray-600">{r.airlines.join(', ') || '—'}</Td>
                <Td className="text-right tabular-nums">{r.sectors.length}</Td>
                <Td className="whitespace-nowrap text-xs">{fareText(r.fareMin, r.fareMax)}</Td>
                <Td className="text-right font-semibold tabular-nums">{r.usageCount}</Td>
                <Td className="whitespace-nowrap text-xs">{r.lastUsedAt ? timeAgo(r.lastUsedAt) : '—'}</Td>
              </tr>
              {isOpen && r.sectors.map((f) => (
                <tr key={f.id} className="bg-gray-50/60">
                  <Td className="pl-10" ><button type="button" onClick={() => onEdit(f)} className="text-left hover:text-bordeaux-700">{sectorLine(f)}</button></Td>
                  <Td className="text-xs text-gray-500">{f.cabin}{f.baggage ? ` · ${f.baggage}` : ''}</Td>
                  <Td />
                  <Td className="whitespace-nowrap text-xs">{fareText(...fareRange(f))}</Td>
                  <Td className="text-right tabular-nums">{f.usageCount}</Td>
                  <Td className="whitespace-nowrap text-xs">{f.lastUsedAt ? timeAgo(f.lastUsedAt) : 'never'}</Td>
                </tr>
              ))}
            </Fragment>
          )
        })}
      </tbody>
    </Table>
  )
}
