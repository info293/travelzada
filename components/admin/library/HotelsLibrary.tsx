'use client'

/**
 * /admin/hotels — every hotel we use (captured from quotes, added by staff, or imported from packages).
 * Anyone with the page permission can add / edit; only admins can delete or merge.
 */
import { useMemo, useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { BedDouble, Building2, Download, GitMerge, MapPin, PackagePlus, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Badge, Button, Card, EmptyState, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow, Table, Td, Th, Toolbar,
  cx, exportToCsv, formatDate, timeAgo,
} from '../ui'
import { ConfirmDialog } from '../catalog/fields'
import { HOTELS_COLLECTION, deleteHotel, hotelNameKey, mergeHotels, toHotel, type LibraryHotel } from '@/lib/library/hotels'
import { matchesWords, normaliseText } from '@/lib/library/common'
import { invalidateLibrary } from '@/lib/library/cache'
import HotelForm from './HotelForm'
import MergeModal from './MergeModal'
import PackageHotelImport from './PackageHotelImport'
import { SourceBadge, Stars, Thumb, selectClass } from './shared'

type SourceFilter = 'all' | 'quote' | 'admin' | 'package' | 'dupes'
type SortKey = 'used' | 'recent' | 'name'

export default function HotelsLibrary() {
  const { currentUser, isAdmin } = useAuth()
  const by = (currentUser as any)?.email || 'admin'
  const [hotels, setHotels] = useState<LibraryHotel[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [q, setQ] = useState('')
  const [dest, setDest] = useState('')
  const [city, setCity] = useState('')
  const [stars, setStars] = useState('')
  const [source, setSource] = useState<SourceFilter>('all')
  const [sort, setSort] = useState<SortKey>('used')
  const [editing, setEditing] = useState<LibraryHotel | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [mergeMode, setMergeMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [mergePair, setMergePair] = useState<[LibraryHotel, LibraryHotel] | null>(null)
  const [deleting, setDeleting] = useState<LibraryHotel | null>(null)
  const [busy, setBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!currentUser) return
    return onSnapshot(collection(db, HOTELS_COLLECTION), (s) => {
      setHotels(s.docs.map((d) => toHotel(d.id, d.data())))
      setReady(true)
    }, (e) => { setLoadError(e.message); setReady(true) })
  }, [currentUser])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t) }, [toast])

  /* ---- derived */
  const dupeKeys = useMemo(() => {
    const count = new Map<string, number>()
    hotels.forEach((h) => { const k = hotelNameKey(h.name); count.set(k, (count.get(k) || 0) + 1) })
    return new Set(Array.from(count.entries()).filter(([, n]) => n > 1).map(([k]) => k))
  }, [hotels])
  const destinations = useMemo(() => Array.from(new Set(hotels.map((h) => h.destination).filter(Boolean))).sort(), [hotels])
  const cities = useMemo(() => Array.from(new Set(hotels.filter((h) => !dest || h.destination === dest).map((h) => h.city).filter(Boolean))).sort(), [hotels, dest])
  const stats = useMemo(() => {
    const fromQuotes = hotels.filter((h) => h.source === 'quote').length
    const byStaff = hotels.filter((h) => h.source === 'admin').length
    const fromPackages = hotels.filter((h) => h.source === 'package').length
    const top = hotels.reduce<LibraryHotel | null>((a, h) => (!a || h.usageCount > a.usageCount ? h : a), null)
    return { fromQuotes, byStaff, fromPackages, top, cities: new Set(hotels.map((h) => normaliseText(h.city)).filter(Boolean)).size }
  }, [hotels])

  const list = useMemo(() => {
    const out = hotels.filter((h) => {
      if (dest && h.destination !== dest) return false
      if (city && h.city !== city) return false
      if (stars === 'none' ? !!h.starRating : stars && String(h.starRating || '') !== stars) return false
      if (source === 'dupes' ? !dupeKeys.has(hotelNameKey(h.name)) : source !== 'all' && h.source !== source) return false
      if (q && !matchesWords(`${h.name} ${h.city} ${h.area} ${h.destination} ${h.category} ${h.tags.join(' ')} ${h.roomTypes.join(' ')}`, q)) return false
      return true
    })
    out.sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'recent' ? (b.lastUsedAt || b.updatedAt).localeCompare(a.lastUsedAt || a.updatedAt)
        : b.usageCount - a.usageCount || a.name.localeCompare(b.name)))
    if (source === 'dupes') out.sort((a, b) => hotelNameKey(a.name).localeCompare(hotelNameKey(b.name)))
    return out
  }, [hotels, dest, city, stars, source, q, sort, dupeKeys])

  /* ---- actions */
  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (h: LibraryHotel) => { setEditing(h); setFormOpen(true) }
  const toggleSelect = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)))
  const startMerge = () => {
    const pair = selected.map((id) => hotels.find((h) => h.id === id)).filter(Boolean) as LibraryHotel[]
    if (pair.length === 2) setMergePair([pair[0], pair[1]])
  }
  const doDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try { await deleteHotel(deleting.id); invalidateLibrary(); setToast(`Deleted ${deleting.name}`); setDeleting(null) } catch (e: any) { setToast(e?.message || 'Delete failed') } finally { setBusy(false) }
  }
  const exportCsv = () => exportToCsv(`travelzada-hotels-${new Date().toISOString().slice(0, 10)}.csv`, list.map((h) => ({
    name: h.name, city: h.city, destination: h.destination, country: h.country, stars: h.starRating ?? '', category: h.category, area: h.area,
    address: h.address, roomTypes: h.roomTypes.join('; '), mealPlans: h.mealPlans.join('; '), amenities: h.amenities.join('; '),
    highlights: h.highlights.join('; '), images: h.images.length, website: h.website, googleMapsUrl: h.googleMapsUrl,
    supplierName: h.supplier?.name, supplierPhone: h.supplier?.phone, supplierEmail: h.supplier?.email,
    priceMin: h.typicalPricePerNight?.min ?? '', priceMax: h.typicalPricePerNight?.max ?? '', priceNote: h.typicalPricePerNight?.note ?? '',
    tags: h.tags.join('; '), usageCount: h.usageCount, lastUsed: h.lastUsedAt, source: h.source, slug: h.slug, publishable: h.publishable ? 'yes' : 'no',
    notes: h.notes,
  })))

  const describe = (h: LibraryHotel) => (
    <div className="flex gap-3">
      <Thumb url={h.images[0]?.url} icon={<BedDouble className="h-5 w-5" />} />
      <div className="min-w-0 text-xs text-gray-600">
        <div className="text-sm font-semibold text-gray-900">{h.name}</div>
        <div>{[h.city, h.destination].filter(Boolean).join(' · ') || 'No city'}</div>
        <div>Used {h.usageCount}× · {h.roomTypes.length} room types · {h.images.length} photos</div>
        <div className="mt-1"><SourceBadge source={h.source} /></div>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Hotels"
        description="Every hotel from our quotes, packages and team — reused when building itineraries."
        actions={<>
          <Button variant="secondary" onClick={exportCsv} disabled={!list.length}><Download className="h-4 w-4" /> CSV</Button>
          {isAdmin && <Button variant="secondary" onClick={() => setImportOpen(true)}><PackagePlus className="h-4 w-4" /> Import from packages</Button>}
          {isAdmin && <Button variant={mergeMode ? 'primary' : 'secondary'} onClick={() => { setMergeMode((m) => !m); setSelected([]) }}><GitMerge className="h-4 w-4" /> {mergeMode ? 'Done merging' : 'Merge duplicates'}</Button>}
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Add hotel</Button>
        </>}
      />

      <StatRow>
        <StatCard label="Hotels" value={hotels.length} hint={`${stats.cities} cities`} icon={<Building2 className="h-5 w-5" />} onClick={() => setSource('all')} />
        <StatCard label="From quotes / by staff" value={`${stats.fromQuotes} / ${stats.byStaff}`} hint={stats.fromPackages ? `+ ${stats.fromPackages} from packages` : 'captured automatically from quotes'} icon={<BedDouble className="h-5 w-5" />} tone="blue" onClick={() => setSource('quote')} />
        <StatCard label="Destinations covered" value={destinations.length} hint={destinations.slice(0, 3).join(', ') || '—'} icon={<MapPin className="h-5 w-5" />} tone="green" />
        <StatCard label="Most used" value={stats.top?.usageCount ? `${stats.top.usageCount}×` : '—'} hint={stats.top?.usageCount ? stats.top.name : 'no quotes yet'} icon={<TrendingUp className="h-5 w-5" />} tone="amber" onClick={stats.top ? () => openEdit(stats.top!) : undefined} />
      </StatRow>

      <Card padded={false}>
        <div className="p-4 border-b border-gray-100">
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder="Search name, city, room type, tag…" className="md:w-80" />
            <div className="flex flex-wrap gap-2">
              <select className={selectClass} value={dest} onChange={(e) => { setDest(e.target.value); setCity('') }} aria-label="Destination">
                <option value="">All destinations</option>
                {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className={selectClass} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
                <option value="">All cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className={selectClass} value={stars} onChange={(e) => setStars(e.target.value)} aria-label="Stars">
                <option value="">Any stars</option>
                {[3, 4, 5].map((n) => <option key={n} value={String(n)}>{n}-star</option>)}
                <option value="none">Not rated</option>
              </select>
              <select className={selectClass} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
                <option value="used">Most used</option>
                <option value="recent">Recently used</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </Toolbar>
          <FilterChips<SourceFilter>
            value={source}
            onChange={setSource}
            options={[
              { value: 'all', label: 'All', count: hotels.length },
              { value: 'quote', label: 'From quotes', count: stats.fromQuotes },
              { value: 'admin', label: 'Added by staff', count: stats.byStaff },
              { value: 'package', label: 'From packages', count: stats.fromPackages },
              { value: 'dupes', label: 'Possible duplicates', count: hotels.filter((h) => dupeKeys.has(hotelNameKey(h.name))).length },
            ]}
          />
          {mergeMode && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-bordeaux-50 px-3 py-2 text-sm text-bordeaux-800">
              <span>Tick two hotels that are the same place ({selected.length}/2 selected).</span>
              <Button size="sm" onClick={startMerge} disabled={selected.length !== 2}><GitMerge className="h-3.5 w-3.5" /> Merge selected</Button>
            </div>
          )}
        </div>

        {!ready ? <Spinner /> : loadError ? (
          <EmptyState title="Could not load hotels" description={loadError} />
        ) : !list.length ? (
          <EmptyState icon={<BedDouble className="h-6 w-6" />} title={hotels.length ? 'No hotels match these filters' : 'No hotels yet'}
            description={hotels.length ? 'Try clearing the search or filters.' : 'Hotels are added automatically when a quote is saved in Create Itinerary — or add one now.'}
            action={!hotels.length ? <Button onClick={openNew}><Plus className="h-4 w-4" /> Add hotel</Button> : undefined} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    {mergeMode && <Th className="w-8" />}
                    <Th>Hotel</Th>
                    <Th>Where</Th>
                    <Th>Rooms &amp; meals</Th>
                    <Th className="text-right">Used</Th>
                    <Th>Last used</Th>
                    <Th>Source</Th>
                    <Th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((h) => (
                    <tr key={h.id} className={cx('hover:bg-gray-50/60', selected.includes(h.id) && 'bg-bordeaux-50/50')}>
                      {mergeMode && <Td><input type="checkbox" checked={selected.includes(h.id)} onChange={() => toggleSelect(h.id)} aria-label={`Select ${h.name}`} className="h-4 w-4 rounded border-gray-300 text-bordeaux-600" /></Td>}
                      <Td>
                        <button type="button" onClick={() => openEdit(h)} className="flex items-center gap-3 text-left">
                          <Thumb url={h.images[0]?.url} icon={<BedDouble className="h-5 w-5" />} />
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 hover:text-bordeaux-700">{h.name}</div>
                            <Stars n={h.starRating} category={h.category} />
                          </div>
                        </button>
                      </Td>
                      <Td><div className="text-gray-900">{h.city || <span className="text-gray-400">—</span>}</div><div className="text-xs text-gray-500">{[h.area, h.destination].filter(Boolean).join(' · ')}</div></Td>
                      <Td className="text-xs text-gray-600 max-w-[16rem]">
                        <div className="truncate">{h.roomTypes.join(', ') || <span className="text-gray-400">No room types</span>}</div>
                        <div className="truncate text-gray-400">{h.mealPlans.join(', ')}</div>
                      </Td>
                      <Td className="text-right tabular-nums font-semibold">{h.usageCount}</Td>
                      <Td className="text-xs whitespace-nowrap" >{h.lastUsedAt ? <span title={formatDate(h.lastUsedAt, true)}>{timeAgo(h.lastUsedAt)}</span> : <span className="text-gray-400">never</span>}</Td>
                      <Td><SourceBadge source={h.source} />{h.publishable && <Badge tone="wine" className="ml-1">Web-ready</Badge>}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => openEdit(h)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label={`Edit ${h.name}`}><Pencil className="h-4 w-4" /></button>
                          {isAdmin && <button type="button" onClick={() => setDeleting(h)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${h.name}`}><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {list.map((h) => (
                <li key={h.id} className={cx('flex items-start gap-3 p-4', selected.includes(h.id) && 'bg-bordeaux-50/50')}>
                  {mergeMode && <input type="checkbox" checked={selected.includes(h.id)} onChange={() => toggleSelect(h.id)} aria-label={`Select ${h.name}`} className="mt-1 h-4 w-4 rounded border-gray-300 text-bordeaux-600" />}
                  <button type="button" onClick={() => openEdit(h)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <Thumb url={h.images[0]?.url} icon={<BedDouble className="h-5 w-5" />} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900">{h.name}</div>
                      <div className="text-xs text-gray-500">{[h.city, h.destination].filter(Boolean).join(' · ') || 'No city'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Stars n={h.starRating} category={h.category} />
                        <span>Used {h.usageCount}×</span>
                        <span>{h.lastUsedAt ? timeAgo(h.lastUsedAt) : 'never used'}</span>
                        <SourceBadge source={h.source} />
                      </div>
                    </div>
                  </button>
                  {isAdmin && <button type="button" onClick={() => setDeleting(h)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${h.name}`}><Trash2 className="h-4 w-4" /></button>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {toast && <div className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white shadow-lg" role="status">{toast}</div>}

      <HotelForm open={formOpen} hotel={editing} all={hotels} by={by} destinations={destinations}
        onClose={() => setFormOpen(false)}
        onSaved={() => { invalidateLibrary(); setToast(editing ? 'Hotel saved' : 'Hotel added') }}
        onOpenExisting={(h) => { setEditing(h); setFormOpen(true) }} />

      <MergeModal<LibraryHotel> open={!!mergePair} items={mergePair} noun="hotel" describe={describe}
        onClose={() => setMergePair(null)}
        onMerge={async (keep, drop) => {
          await mergeHotels(keep, drop, by)
          invalidateLibrary()
          setSelected([])
          setToast(`Merged ${drop.name} into ${keep.name}`)
        }} />

      <ConfirmDialog open={!!deleting} title="Delete hotel?" busy={busy} onClose={() => setDeleting(null)} onConfirm={doDelete}
        message={deleting ? <>Delete <b>{deleting.name}</b>{deleting.usageCount ? ` (used in ${deleting.usageCount} quote${deleting.usageCount === 1 ? '' : 's'})` : ''}? Quotes keep their own copy of the hotel; only the library entry is removed. If it is a duplicate, use “Merge duplicates” instead to keep its usage.</> : ''} />

      {isAdmin && <PackageHotelImport open={importOpen} onClose={() => setImportOpen(false)} existing={hotels} by={by} onDone={(n) => { invalidateLibrary(); setToast(`Imported ${n} hotel${n === 1 ? '' : 's'} from packages`) }} />}
    </div>
  )
}
