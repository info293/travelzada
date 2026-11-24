'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Copy, ExternalLink, ImageOff, Layers, MapPin, Package, Pencil, Plus, RefreshCw, SearchCheck, Sparkles, Trash2, Upload } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import PackageForm from '@/components/admin/PackageForm'
import SeoAuditBadge from '@/components/admin/seo/SeoAuditBadge'
import SeoReviewDrawer from '@/components/admin/seo/SeoReviewDrawer'
import BulkSeoFixer from '@/components/admin/seo/BulkSeoFixer'
import { runSeoOptimize } from '@/components/admin/seo/api'
import { auditCatalog, isDuplicateAudit } from '@/lib/seo/packageAudit'
import type { OptimizeResult, SeoPatch } from '@/lib/seo/types'
import ImportPackagesModal from '@/components/admin/catalog/ImportPackagesModal'
import VersionsModal from '@/components/admin/catalog/ai/VersionsModal'
import { ConfirmDialog, MainTag } from '@/components/admin/catalog/fields'
import {
  buildPackagePayload,
  codePrefix,
  computeSuggestions,
  destinationOf,
  nextPackageCode,
  normalizeForEdit,
  packageGaps,
  packageImage,
  packageSiteUrl,
  toNum,
} from '@/components/admin/catalog/packageUtils'
import type { DestinationRecord, PackageDraft } from '@/components/admin/catalog/types'
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  FilterChips,
  PageHeader,
  SearchInput,
  Spinner,
  StatCard,
  Table,
  Td,
  Th,
  Toolbar,
  cx,
  formatINR,
  inputClass,
  timeAgo,
  toMillis,
} from '@/components/admin/ui'

type SortKey = 'updated' | 'name' | 'dest' | 'duration' | 'price' | 'tags' | 'seo'
type Sort = { key: SortKey; dir: 'asc' | 'desc' }
/** Direction used the first time a column is clicked */
const FIRST_DIR: Record<SortKey, 'asc' | 'desc'> = { updated: 'desc', name: 'asc', dest: 'asc', duration: 'asc', price: 'asc', tags: 'asc', seo: 'asc' }
const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'updated-desc', label: 'Recently updated' },
  { value: 'updated-asc', label: 'Oldest updated' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'dest-asc', label: 'Destination A–Z' },
  { value: 'duration-asc', label: 'Shortest trip' },
  { value: 'duration-desc', label: 'Longest trip' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'tags-asc', label: 'Main packages first' },
  { value: 'tags-desc', label: 'Versions first' },
  { value: 'seo-asc', label: 'SEO score: worst first' },
  { value: 'seo-desc', label: 'SEO score: best first' },
]
type Editor = { draft: PackageDraft; original: PackageDraft | null; destinationId: string; snapshot: string }

const priceOf = (p: PackageDraft) => toNum(p.Price_Min_INR) ?? (Number(String(p.Price_Range_INR || '').replace(/[^0-9]/g, '')) || undefined)

function setUrlParam(key: string, value?: string) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('edit')
  url.searchParams.delete('new')
  if (value) url.searchParams.set(key, value)
  window.history.replaceState(null, '', url.toString())
}

export default function AdminPackagesPage() {
  const { currentUser, isAdmin } = useAuth()
  const [packages, setPackages] = useState<PackageDraft[]>([])
  const [destinations, setDestinations] = useState<DestinationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [search, setSearch] = useState('')
  const [destFilter, setDestFilter] = useState('all')
  const [budget, setBudget] = useState('all')
  const [attention, setAttention] = useState(false)
  const [sort, setSort] = useState<Sort>({ key: 'updated', dir: 'desc' })

  const [editor, setEditor] = useState<Editor | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toDelete, setToDelete] = useState<PackageDraft | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [versionsFor, setVersionsFor] = useState<PackageDraft | null>(null)
  const [toast, setToast] = useState('')
  const deepLinkDone = useRef(false)

  // SEO & GEO
  const [seoFilter, setSeoFilter] = useState<'all' | 'fix' | 'dup'>('all')
  const [rowFix, setRowFix] = useState<{ pkg: PackageDraft; loading: boolean; error: string; result: OptimizeResult | null } | null>(null)
  const [savingFix, setSavingFix] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const rowAbort = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const [ps, ds] = await Promise.all([getDocs(collection(db, 'packages')), getDocs(collection(db, 'destinations'))])
      const pkgs = ps.docs.map((d) => ({ id: d.id, ...d.data() }) as PackageDraft)
      pkgs.sort((a, b) => toMillis(b.Last_Updated) - toMillis(a.Last_Updated))
      setPackages(pkgs)
      setDestinations(ds.docs.map((d) => ({ id: d.id, ...d.data() }) as DestinationRecord))
    } catch (e) {
      console.error('Error loading packages:', e)
      setLoadError('Could not load packages. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const destOf = useMemo(() => {
    const m = new Map<string, DestinationRecord | undefined>()
    packages.forEach((p) => m.set(p.id!, destinationOf(p, destinations)))
    return m
  }, [packages, destinations])

  const suggestions = useMemo(() => computeSuggestions(packages), [packages])

  // ---------- SEO & GEO ----------
  const audits = useMemo(() => auditCatalog(packages), [packages])
  const seoGood = useMemo(() => packages.filter((p) => audits.get(p.id!)?.grade === 'good').length, [packages, audits])
  const seoDup = useMemo(() => packages.filter((p) => isDuplicateAudit(audits.get(p.id!))).length, [packages, audits])

  /** Save AI-rewritten text fields only (never prices, nights, hotels…). */
  const saveSeoPatch = useCallback(async (p: PackageDraft, patch: SeoPatch) => {
    if (!p.id || !Object.keys(patch).length) return
    const payload: Record<string, any> = { ...patch, Last_Updated: new Date().toISOString() }
    await updateDoc(doc(db, 'packages', p.id), payload)
    setPackages((ps) => ps.map((x) => (x.id === p.id ? ({ ...x, ...payload } as PackageDraft) : x)))
  }, [])

  const aiBusy = bulkBusy || !!rowFix?.loading

  const runRowFix = useCallback(async (p: PackageDraft) => {
    rowAbort.current?.abort()
    const ctrl = new AbortController()
    rowAbort.current = ctrl
    setRowFix({ pkg: p, loading: true, error: '', result: null })
    try {
      const result = await runSeoOptimize(p as Record<string, any>, p.id, ctrl.signal)
      if (!ctrl.signal.aborted) setRowFix({ pkg: p, loading: false, error: '', result })
    } catch (e) {
      if (!ctrl.signal.aborted) setRowFix({ pkg: p, loading: false, error: (e as Error)?.message || 'Something went wrong.', result: null })
    }
  }, [])

  const closeRowFix = useCallback(() => {
    rowAbort.current?.abort()
    rowAbort.current = null
    setRowFix(null)
  }, [])

  const applyRowFix = async (patch: SeoPatch) => {
    if (!rowFix) return
    setSavingFix(true)
    try {
      await saveSeoPatch(rowFix.pkg, patch)
      setRowFix(null)
      setToast('SEO changes saved')
    } catch (e) {
      console.error('Error saving SEO changes:', e)
      setToast('Could not save the SEO changes. Please try again.')
    } finally {
      setSavingFix(false)
    }
  }

  // ---------- editor ----------
  const openEditor = useCallback((draft: PackageDraft, original: PackageDraft | null, destinationId: string) => {
    setSaveError('')
    setEditor({ draft, original, destinationId, snapshot: JSON.stringify(draft) })
  }, [])

  const openEdit = useCallback(
    (p: PackageDraft) => {
      openEditor(normalizeForEdit(p), p, destinationOf(p, destinations)?.id || '')
      setUrlParam('edit', p.id)
    },
    [destinations, openEditor],
  )

  const openNew = useCallback(() => {
    const destId = destFilter !== 'all' && destFilter !== 'none' ? destFilter : ''
    openEditor({}, null, destId)
    setUrlParam('new', '1')
  }, [destFilter, openEditor])

  const duplicate = (p: PackageDraft) => {
    const copy = normalizeForEdit({ ...p })
    delete copy.id
    delete copy.Created_By
    delete copy.Last_Updated
    copy.Destination_Name = `${p.Destination_Name || 'Package'} (copy)`
    copy.Destination_ID = nextPackageCode(codePrefix(String(p.Destination_ID || '')) || 'PKG', packages)
    copy.Slug = ''
    copy.SEO_Title = ''
    openEditor(copy, null, destinationOf(p, destinations)?.id || '')
  }

  const closeEditor = () => {
    if (saving) return
    if (editor && JSON.stringify(editor.draft) !== editor.snapshot && !window.confirm('Discard your unsaved changes?')) return
    setEditor(null)
    setUrlParam('edit')
  }

  // Deep links: /admin/packages?edit=<id> or ?new=1
  useEffect(() => {
    if (loading || deepLinkDone.current) return
    deepLinkDone.current = true
    const params = new URLSearchParams(window.location.search)
    const id = params.get('edit')
    if (id) {
      const p = packages.find((x) => x.id === id || x.Slug === id || x.Destination_ID === id)
      if (p) openEdit(p)
    } else if (params.get('new')) openNew()
  }, [loading, packages, openEdit, openNew])

  const save = async () => {
    if (!editor) return
    setSaving(true)
    setSaveError('')
    const { draft, original, destinationId } = editor
    const isNew = !draft.id
    try {
      const payload = buildPackagePayload(draft, { isNew, userEmail: currentUser?.email, original })
      if (isNew) await addDoc(collection(db, 'packages'), payload)
      else await updateDoc(doc(db, 'packages', draft.id!), payload)

      // Keep the destination's explicit package list in sync. Destinations with an empty list
      // match packages by name on the site, so we never start a list for them.
      const newCode = String(payload.Destination_ID)
      const oldCode = String(original?.Destination_ID || '')
      const oldLinked = oldCode ? destinations.find((d) => (d.packageIds || []).includes(oldCode)) : undefined
      const newDest = destinations.find((d) => d.id === destinationId)
      const updates = new Map<string, string[]>()
      if (oldLinked && (oldLinked.id !== newDest?.id || oldCode !== newCode)) {
        const rest = (oldLinked.packageIds || []).filter((x) => x !== oldCode)
        if (rest.length) updates.set(oldLinked.id!, rest)
      }
      if (newDest && (newDest.packageIds || []).length) {
        const base = updates.get(newDest.id!) ?? newDest.packageIds!
        if (!base.includes(newCode)) updates.set(newDest.id!, [...base, newCode])
      }
      await Promise.all(
        Array.from(updates.entries()).map(([id, packageIds]) => updateDoc(doc(db, 'destinations', id), { packageIds, updatedAt: new Date().toISOString() })),
      )

      setEditor(null)
      setUrlParam('edit')
      setToast(isNew ? 'Package created' : 'Changes saved')
      load()
    } catch (e) {
      console.error('Error saving package:', e)
      setSaveError('Could not save the package. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete?.id) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'packages', toDelete.id))
      setPackages((ps) => ps.filter((p) => p.id !== toDelete.id))
      setToast('Package deleted')
      setToDelete(null)
    } catch (e) {
      console.error('Error deleting package:', e)
      alert('Could not delete the package. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // ---------- filtering ----------
  const budgetOptions = useMemo(() => {
    const counts = new Map<string, number>()
    packages.forEach((p) => {
      const b = String(p.Budget_Category || '').trim()
      if (b) counts.set(b, (counts.get(b) || 0) + 1)
    })
    return [{ value: 'all', label: 'All budgets', count: packages.length }, ...Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: value, count }))]
  }, [packages])

  const needsAttention = useMemo(() => packages.filter((p) => packageGaps(p).some((g) => g === 'photo' || g === 'price')).length, [packages])
  const recentlyUpdated = useMemo(() => packages.filter((p) => Date.now() - toMillis(p.Last_Updated) < 30 * 864e5).length, [packages])
  const unassigned = useMemo(() => packages.filter((p) => !destOf.get(p.id!)).length, [packages, destOf])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = packages.filter((p) => {
      const d = destOf.get(p.id!)
      if (destFilter === 'none' && d) return false
      if (destFilter !== 'all' && destFilter !== 'none' && d?.id !== destFilter) return false
      if (budget !== 'all' && String(p.Budget_Category || '').trim() !== budget) return false
      if (attention && !packageGaps(p).some((g) => g === 'photo' || g === 'price')) return false
      if (seoFilter === 'fix' && audits.get(p.id!)?.grade === 'good') return false
      if (seoFilter === 'dup' && !isDuplicateAudit(audits.get(p.id!))) return false
      if (!q) return true
      return [p.Destination_Name, p.Destination_ID, p.Slug, p.Occasion, p.Travel_Type, d?.name].some((v) => String(v || '').toLowerCase().includes(q))
    })
    // Value for the chosen column; empty values always go last
    const valueOf = (p: PackageDraft): string | number | undefined => {
      switch (sort.key) {
        case 'name': return String(p.Destination_Name || '').trim().toLowerCase() || undefined
        case 'dest': return destOf.get(p.id!)?.name?.toLowerCase()
        case 'duration': return toNum(p.Duration_Nights) ?? (Number(String(p.Duration || '').match(/(\d+)\s*N/i)?.[1]) || undefined)
        case 'price': return priceOf(p)
        case 'tags': return p.Parent_Package_ID ? 2 : p.Is_Main ? 1 : undefined // Main → Version → untagged
        case 'seo': return audits.get(p.id!)?.score
        default: return toMillis(p.Last_Updated) || undefined
      }
    }
    const mul = sort.dir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      const va = valueOf(a)
      const vb = valueOf(b)
      if (va === undefined && vb === undefined) return 0
      if (va === undefined) return 1
      if (vb === undefined) return -1
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * mul
    })
    return list
  }, [packages, destOf, search, destFilter, budget, attention, sort, seoFilter, audits])

  const sortedDestinations = useMemo(() => [...destinations].sort((a, b) => String(a.name).localeCompare(String(b.name))), [destinations])
  const others = useMemo(() => (editor ? packages.filter((p) => p.id !== editor.draft.id) : packages), [packages, editor])

  const editorDest = editor ? destinations.find((d) => d.id === editor.destinationId) : undefined
  const destinationNote = editorDest
    ? (editorDest.packageIds || []).length
      ? `Will be listed on the ${editorDest.name} page.`
      : `${editorDest.name} lists packages by name — include “${editorDest.name}” in the package name so it shows up there.`
    : undefined

  /** Header click: same column → reverse, new column → its natural direction */
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: FIRST_DIR[key] }))

  // ---------- render ----------
  const actions = (p: PackageDraft) => (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <IconBtn title="Edit" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></IconBtn>
      <IconBtn title={aiBusy ? 'AI is busy with another package' : 'Fix SEO & GEO with AI'} onClick={() => !aiBusy && runRowFix(p)}>
        <Sparkles className={cx('h-4 w-4', aiBusy ? 'opacity-40' : 'text-bordeaux-600')} />
      </IconBtn>
      {isAdmin && !p.Parent_Package_ID && (
        <IconBtn title="Create versions (different nights, hotels, occasion, season)" onClick={() => setVersionsFor(p)}><Layers className="h-4 w-4 text-bordeaux-600" /></IconBtn>
      )}
      <IconBtn title="Duplicate" onClick={() => duplicate(p)}><Copy className="h-4 w-4" /></IconBtn>
      <a href={packageSiteUrl(p)} target="_blank" rel="noreferrer" title="View on site" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
        <ExternalLink className="h-4 w-4" />
      </a>
      <IconBtn title="Delete" danger onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></IconBtn>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Packages"
        description="Holiday packages shown on the website and suggested by the AI trip planner."
        actions={
          <>
            <Button variant="ghost" onClick={() => { setLoading(true); load() }} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="secondary" onClick={() => setBulkOpen(true)} disabled={loading || !!rowFix?.loading} title="Rewrite weak and duplicate package pages for SEO & GEO">
              <Sparkles className="h-4 w-4 text-bordeaux-600" /> Fix all weak pages with AI
            </Button>
            <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import</Button>
            <Button onClick={openNew}><Plus className="h-4 w-4" /> New package</Button>
          </>
        }
      />

      {loading ? (
        <Spinner label="Loading packages…" />
      ) : loadError ? (
        <Card><EmptyState title="Something went wrong" description={loadError} action={<Button onClick={() => { setLoading(true); load() }}>Try again</Button>} /></Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Packages" value={packages.length} icon={<Package className="h-5 w-5" />} onClick={() => { setAttention(false); setDestFilter('all'); setBudget('all'); setSeoFilter('all') }} />
            <StatCard
              label="SEO health"
              value={<>{seoGood}<span className="text-base font-semibold text-gray-400">/{packages.length} good</span></>}
              hint={`${packages.length - seoGood} need fixing · ${seoDup} duplicates`}
              tone={seoGood === packages.length ? 'green' : seoDup ? 'red' : 'amber'}
              icon={<SearchCheck className="h-5 w-5" />}
              onClick={() => { setSeoFilter('fix'); setSort({ key: 'seo', dir: 'asc' }) }}
            />
            <StatCard label="Updated in 30 days" value={recentlyUpdated} tone="blue" icon={<RefreshCw className="h-5 w-5" />} onClick={() => setSort({ key: 'updated', dir: 'desc' })} />
            <StatCard label="Missing photo or price" value={needsAttention} tone={needsAttention ? 'amber' : 'green'} icon={<AlertTriangle className="h-5 w-5" />} onClick={() => setAttention(true)} />
            <StatCard label="Not on a destination" value={unassigned} tone={unassigned ? 'amber' : 'green'} icon={<MapPin className="h-5 w-5" />} onClick={() => setDestFilter('none')} />
          </div>

          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, code, occasion…" className="md:w-80" />
            <div className="flex flex-wrap items-center gap-2">
              <select value={destFilter} onChange={(e) => setDestFilter(e.target.value)} className={cx(inputClass, 'w-auto py-1.5')}>
                <option value="all">All destinations</option>
                <option value="none">Not on a destination</option>
                {sortedDestinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select
                value={`${sort.key}-${sort.dir}`}
                onChange={(e) => { const [key, dir] = e.target.value.split('-'); setSort({ key: key as SortKey, dir: dir as Sort['dir'] }) }}
                className={cx(inputClass, 'w-auto py-1.5')}
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </Toolbar>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <FilterChips options={budgetOptions} value={budget} onChange={setBudget} />
            <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
            <FilterChips
              options={[
                { value: 'all', label: 'Any SEO' },
                { value: 'fix', label: 'SEO: needs fixing', count: packages.length - seoGood },
                { value: 'dup', label: 'SEO: duplicates', count: seoDup },
              ]}
              value={seoFilter}
              onChange={setSeoFilter}
            />
            {attention && (
              <button type="button" onClick={() => setAttention(false)} className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                Missing photo or price ✕
              </button>
            )}
          </div>

          <Card padded={false}>
            {visible.length === 0 ? (
              <EmptyState
                icon={<Package className="h-6 w-6" />}
                title={packages.length ? 'No packages match' : 'No packages yet'}
                description={packages.length ? 'Try a different search or clear the filters.' : 'Create your first package or import a spreadsheet.'}
                action={packages.length ? <Button variant="secondary" onClick={() => { setSearch(''); setDestFilter('all'); setBudget('all'); setAttention(false); setSeoFilter('all') }}>Clear filters</Button> : <Button onClick={openNew}><Plus className="h-4 w-4" /> New package</Button>}
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <thead>
                      <tr>
                        <SortTh k="name" sort={sort} onSort={sortBy}>Package</SortTh>
                        <SortTh k="dest" sort={sort} onSort={sortBy}>Destination</SortTh>
                        <SortTh k="duration" sort={sort} onSort={sortBy}>Duration</SortTh>
                        <SortTh k="price" sort={sort} onSort={sortBy}>Price from</SortTh>
                        <SortTh k="tags" sort={sort} onSort={sortBy}>Tags</SortTh>
                        <SortTh k="seo" sort={sort} onSort={sortBy}>SEO</SortTh>
                        <SortTh k="updated" sort={sort} onSort={sortBy}>Updated</SortTh>
                        <Th className="text-right">Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((p) => {
                        const d = destOf.get(p.id!)
                        const price = priceOf(p)
                        return (
                          <tr key={p.id} onClick={() => openEdit(p)} className="cursor-pointer hover:bg-gray-50/80">
                            <Td>
                              <div className="flex items-center gap-3">
                                <Thumb url={p.Primary_Image_URL} />
                                <div className="min-w-0">
                                  <p className="max-w-[320px] truncate font-semibold text-gray-900">{p.Destination_Name || 'Untitled'}</p>
                                  <p className="font-mono text-xs text-gray-500">{p.Destination_ID}</p>
                                </div>
                              </div>
                            </Td>
                            <Td>{d ? <span className="text-gray-800">{d.name}</span> : <span className="text-xs text-amber-700">Not linked</span>}</Td>
                            <Td className="whitespace-nowrap">{p.Duration || '—'}</Td>
                            <Td className="whitespace-nowrap tabular-nums">{price ? formatINR(price) : <span className="text-xs text-amber-700">No price</span>}</Td>
                            <Td>
                              <div className="flex max-w-[220px] flex-wrap gap-1">
                                {!isAdmin ? (
                                  <span className="text-gray-300">—</span>
                                ) : p.Parent_Package_ID ? (
                                  <span className="flex flex-col items-start gap-0.5">
                                    <span title={p.Version_Label}><Badge>Version</Badge></span>
                                    {(() => {
                                      const main = packages.find((x) => x.id === p.Parent_Package_ID)
                                      const name = main?.Destination_Name || p.Parent_Package_Name || p.Parent_Package_Code || 'Main package'
                                      return main ? (
                                        <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(main) }} className="max-w-[200px] truncate text-left text-[11px] font-semibold text-bordeaux-700 hover:underline" title={`Open the Main package: ${name}`}>
                                          of {name}
                                        </button>
                                      ) : (
                                        <span className="max-w-[200px] truncate text-[11px] text-gray-400" title="The Main package was deleted">of {name} (deleted)</span>
                                      )
                                    })()}
                                  </span>
                                ) : p.Is_Main ? (
                                  <MainTag />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </div>
                            </Td>
                            <Td><SeoAuditBadge audit={audits.get(p.id!)} onFix={() => runRowFix(p)} fixDisabled={aiBusy} /></Td>
                            <Td className="whitespace-nowrap text-xs text-gray-500">{timeAgo(p.Last_Updated)}</Td>
                            <Td>{actions(p)}</Td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <ul className="divide-y divide-gray-100 md:hidden">
                  {visible.map((p) => {
                    const d = destOf.get(p.id!)
                    const price = priceOf(p)
                    return (
                      <li key={p.id} onClick={() => openEdit(p)} className="flex gap-3 p-3 active:bg-gray-50">
                        <Thumb url={p.Primary_Image_URL} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold text-gray-900">{p.Destination_Name || 'Untitled'}</p>
                            <SeoAuditBadge audit={audits.get(p.id!)} onFix={() => runRowFix(p)} fixDisabled={aiBusy} />
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {[d?.name, p.Duration, price ? formatINR(price) : null].filter(Boolean).join(' · ')}
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="font-mono text-[11px] text-gray-400">{p.Destination_ID}</span>
                            {actions(p)}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <p className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500">
                  Showing {visible.length} of {packages.length}
                </p>
              </>
            )}
          </Card>
        </>
      )}

      <Drawer
        open={!!editor}
        onClose={closeEditor}
        width="max-w-3xl"
        title={
          editor?.draft.id ? (
            <span className="flex items-center gap-2">
              Edit package <span className="font-mono text-xs font-normal text-gray-500">{editor.original?.Destination_ID}</span>
            </span>
          ) : (
            'New package'
          )
        }
      >
        {editor && (
          <PackageForm
              error={saveError}
              formData={editor.draft}
              setFormData={(updater) => setEditor((e) => (e ? { ...e, draft: updater(e.draft) } : e))}
              editingPackage={editor.draft.id ? { id: editor.draft.id } : null}
              onSubmit={save}
              onCancel={closeEditor}
              saving={saving}
              suggestions={suggestions}
              otherPackages={others}
              destinations={destinations}
              destinationId={editor.destinationId}
              onDestinationChange={(id) => setEditor((e) => (e ? { ...e, destinationId: id } : e))}
              destinationNote={destinationNote}
            />
        )}
      </Drawer>

      <SeoReviewDrawer
        open={!!rowFix}
        title={rowFix ? `SEO & GEO — ${rowFix.pkg.Destination_Name || 'Package'}` : undefined}
        loading={rowFix?.loading}
        error={rowFix?.error}
        result={rowFix?.result || null}
        before={(rowFix?.pkg as Record<string, any>) || {}}
        applyLabel="Apply & save"
        applying={savingFix}
        onApply={applyRowFix}
        onRetry={() => rowFix && runRowFix(rowFix.pkg)}
        onClose={closeRowFix}
      />

      <BulkSeoFixer
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        packages={packages as Array<Record<string, any>>}
        audits={audits}
        onSave={(p, patch) => saveSeoPatch(p as PackageDraft, patch)}
        onBusyChange={setBulkBusy}
      />

      <ImportPackagesModal open={importOpen} onClose={() => setImportOpen(false)} existing={packages} userEmail={currentUser?.email} onImported={load} />

      <VersionsModal
        main={versionsFor}
        packages={packages}
        destinations={destinations}
        userEmail={currentUser?.email}
        onClose={() => setVersionsFor(null)}
        onSaved={() => { setToast("Versions created"); load() }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete package?"
        message={<>“<b>{toDelete?.Destination_Name}</b>” will be removed from the website. This can't be undone.</>}
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => !deleting && setToDelete(null)}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}
    </div>
  )
}

function SortTh({ k, sort, onSort, children }: { k: SortKey; sort: Sort; onSort: (k: SortKey) => void; children: React.ReactNode }) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <Th onClick={() => onSort(k)} className={active ? 'text-gray-900' : undefined}>
      <span className="inline-flex items-center gap-1" title="Click to sort">
        {children}
        <Icon className={cx('h-3.5 w-3.5', active ? 'text-bordeaux-600' : 'text-gray-300')} />
      </span>
    </Th>
  )
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={cx('rounded-lg p-1.5 text-gray-500 hover:bg-gray-100', danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:text-gray-800')}>
      {children}
    </button>
  )
}

function Thumb({ url, size = 'md' }: { url?: string; size?: 'md' | 'lg' }) {
  const src = packageImage(url)
  const cls = size === 'lg' ? 'h-16 w-16' : 'h-11 w-11'
  if (!src) return <div className={cx(cls, 'flex shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400')}><ImageOff className="h-4 w-4" /></div>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className={cx(cls, 'shrink-0 rounded-xl object-cover bg-gray-100')} />
}
