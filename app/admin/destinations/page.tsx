'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { ExternalLink, Globe2, ImageOff, Map as MapIcon, Package, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import DestinationForm, { validateDestination, type DestinationErrors } from '@/components/admin/catalog/DestinationForm'
import { ConfirmDialog } from '@/components/admin/catalog/fields'
import { packageImage, packagesForDestination, slugify } from '@/components/admin/catalog/packageUtils'
import type { DestinationRecord, PackageDraft } from '@/components/admin/catalog/types'
import { Badge, Button, Card, Drawer, EmptyState, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow, Toolbar, cx } from '@/components/admin/ui'

type RegionFilter = 'all' | 'India' | 'International' | 'featured'
type Editor = { draft: Partial<DestinationRecord>; snapshot: string }

export default function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState<DestinationRecord[]>([])
  const [packages, setPackages] = useState<PackageDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState<RegionFilter>('all')

  const [editor, setEditor] = useState<Editor | null>(null)
  const [errors, setErrors] = useState<DestinationErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toDelete, setToDelete] = useState<DestinationRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const [ds, ps] = await Promise.all([getDocs(collection(db, 'destinations')), getDocs(collection(db, 'packages'))])
      setDestinations(ds.docs.map((d) => ({ id: d.id, ...d.data() }) as DestinationRecord).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))))
      setPackages(ps.docs.map((d) => ({ id: d.id, ...d.data() }) as PackageDraft))
    } catch (e) {
      console.error('Error loading destinations:', e)
      setLoadError('Could not load destinations. Check your connection and try again.')
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

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    destinations.forEach((d) => m.set(d.id!, packagesForDestination(d, packages).length))
    return m
  }, [destinations, packages])

  /** Follow the convention already used by existing slugs (e.g. "bali-packages"). */
  const slugSuffix = useMemo(() => {
    const withSuffix = destinations.filter((d) => String(d.slug || '').endsWith('-packages')).length
    return withSuffix > destinations.length / 2 ? '-packages' : ''
  }, [destinations])
  const suggestSlug = (name?: string) => (name ? slugify(name) + slugSuffix : '')

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return destinations.filter((d) => {
      if (region === 'featured' && !d.featured) return false
      if ((region === 'India' || region === 'International') && (d.region || 'International') !== region) return false
      return !q || [d.name, d.country, d.slug].some((v) => String(v || '').toLowerCase().includes(q))
    })
  }, [destinations, search, region])

  const regionOptions: Array<{ value: RegionFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: destinations.length },
    { value: 'India', label: 'India', count: destinations.filter((d) => d.region === 'India').length },
    { value: 'International', label: 'International', count: destinations.filter((d) => (d.region || 'International') === 'International').length },
    { value: 'featured', label: 'Featured', count: destinations.filter((d) => d.featured).length },
  ]

  const open = (d: Partial<DestinationRecord>) => {
    setErrors({})
    setSaveError('')
    setEditor({ draft: d, snapshot: JSON.stringify(d) })
  }

  const close = () => {
    if (saving) return
    if (editor && JSON.stringify(editor.draft) !== editor.snapshot && !window.confirm('Discard your unsaved changes?')) return
    setEditor(null)
  }

  const save = async () => {
    if (!editor) return
    const d = editor.draft
    const slug = String(d.slug || '').trim() || suggestSlug(d.name)
    const errs = validateDestination(d, destinations, slug)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    setSaveError('')
    try {
      const now = new Date().toISOString()
      // Same shape the old admin wrote and the site reads.
      const data: Record<string, any> = {
        name: String(d.name || '').trim(),
        country: String(d.country || '').trim(),
        region: d.region || 'International',
        description: d.description || '',
        image: d.image || '',
        slug,
        featured: !!d.featured,
        packageIds: (d.packageIds || []).filter(Boolean),
        bestTimeToVisit: d.bestTimeToVisit || '',
        duration: d.duration || '',
        currency: d.currency || '',
        language: d.language || '',
        highlights: d.highlights || [],
        activities: d.activities || [],
        budgetRange: d.budgetRange || {},
        hotelTypes: d.hotelTypes || [],
        rating: typeof d.rating === 'number' && Number.isFinite(d.rating) ? d.rating : null,
        airportCities: (d.airportCities || []).filter((r) => r.cityName?.trim() || r.url?.trim()),
        fromIndiaCities: (d.fromIndiaCities || []).filter((r) => r.cityName?.trim() || r.url?.trim()),
        travelGuides: (d.travelGuides || []).filter((r) => r.title?.trim() || r.description?.trim()),
        faqs: (d.faqs || []).filter((r) => r.question?.trim() || r.answer?.trim()),
        updatedAt: now,
      }
      if (d.id) await updateDoc(doc(db, 'destinations', d.id), data)
      else await addDoc(collection(db, 'destinations'), { ...data, createdAt: now })
      setEditor(null)
      setToast(d.id ? 'Changes saved' : 'Destination created')
      load()
    } catch (e) {
      console.error('Error saving destination:', e)
      setSaveError('Could not save the destination. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete?.id) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'destinations', toDelete.id))
      setDestinations((ds) => ds.filter((d) => d.id !== toDelete.id))
      setToast('Destination deleted')
      setToDelete(null)
    } catch (e) {
      console.error('Error deleting destination:', e)
      alert('Could not delete the destination. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const linkedCount = destinations.filter((d) => (d.packageIds || []).length).length
  const empty = destinations.filter((d) => !counts.get(d.id!)).length

  return (
    <div>
      <PageHeader
        title="Destinations"
        description="Destination pages and the packages each one lists."
        actions={
          <>
            <Button variant="ghost" onClick={() => { setLoading(true); load() }} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={() => open({ region: 'International', packageIds: [] })}><Plus className="h-4 w-4" /> New destination</Button>
          </>
        }
      />

      {loading ? (
        <Spinner label="Loading destinations…" />
      ) : loadError ? (
        <Card><EmptyState title="Something went wrong" description={loadError} action={<Button onClick={() => { setLoading(true); load() }}>Try again</Button>} /></Card>
      ) : (
        <>
          <StatRow>
            <StatCard label="Destinations" value={destinations.length} icon={<MapIcon className="h-5 w-5" />} onClick={() => setRegion('all')} />
            <StatCard label="Featured" value={regionOptions[3].count} tone="amber" icon={<Star className="h-5 w-5" />} onClick={() => setRegion('featured')} />
            <StatCard label="Hand-picked packages" value={linkedCount} hint="Others match packages by name" tone="blue" icon={<Package className="h-5 w-5" />} />
            <StatCard label="No packages showing" value={empty} tone={empty ? 'red' : 'green'} icon={<Globe2 className="h-5 w-5" />} />
          </StatRow>

          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search destination or country…" className="md:w-80" />
            <FilterChips options={regionOptions} value={region} onChange={setRegion} />
          </Toolbar>

          {visible.length === 0 ? (
            <Card>
              <EmptyState icon={<MapIcon className="h-6 w-6" />} title={destinations.length ? 'No destinations match' : 'No destinations yet'} description={destinations.length ? 'Try a different search or filter.' : 'Add your first destination page.'} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((d) => {
                const n = counts.get(d.id!) || 0
                const img = packageImage(d.image)
                const manual = (d.packageIds || []).length > 0
                return (
                  <Card key={d.id} padded={false} className="group overflow-hidden">
                    <button type="button" onClick={() => open({ ...d })} className="block w-full text-left">
                      <div className="relative h-36 bg-gray-100">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400"><ImageOff className="h-6 w-6" /></div>
                        )}
                        <div className="absolute left-3 top-3 flex gap-1.5">
                          <Badge tone={d.region === 'India' ? 'amber' : 'blue'}>{d.region || 'International'}</Badge>
                          {d.featured && <Badge tone="wine"><Star className="h-3 w-3" /> Featured</Badge>}
                        </div>
                      </div>
                      <div className="p-4 pb-2">
                        <p className="truncate font-semibold text-gray-900">{d.name || 'Untitled'}</p>
                        <p className="truncate text-xs text-gray-500">{d.country}{d.slug ? ` · /${d.slug}` : ''}</p>
                        <p className={cx('mt-2 text-xs font-medium', n ? 'text-gray-700' : 'text-red-600')}>
                          {n} package{n === 1 ? '' : 's'} <span className="font-normal text-gray-400">· {manual ? 'hand-picked' : 'matched by name'}</span>
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center justify-end gap-0.5 px-3 pb-3">
                      <button type="button" onClick={() => open({ ...d })} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <a href={`/destinations/${d.slug || slugify(d.name)}`} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="View on site"><ExternalLink className="h-4 w-4" /></a>
                      <button type="button" onClick={() => setToDelete(d)} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <Drawer
        open={!!editor}
        onClose={close}
        width="max-w-2xl"
        title={editor?.draft.id ? `Edit ${editor.draft.name || 'destination'}` : 'New destination'}
        footer={
          <>
            {Object.keys(errors).length > 0 && <span className="mr-auto self-center text-xs font-medium text-red-600">Fix the highlighted fields</span>}
            <Button variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editor?.draft.id ? 'Save changes' : 'Create destination'}</Button>
          </>
        }
      >
        {editor && (
          <>
            {saveError && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{saveError}</p>}
            <DestinationForm
              draft={editor.draft}
              set={(patch) => {
                setEditor((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e))
                if (Object.keys(patch).some((k) => (errors as any)[k])) setErrors((er) => { const n = { ...er }; Object.keys(patch).forEach((k) => delete (n as any)[k]); return n })
              }}
              packages={packages}
              errors={errors}
              suggestedSlug={suggestSlug(editor.draft.name)}
            />
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete destination?"
        message={<>The <b>{toDelete?.name}</b> page will disappear from the website. Its packages are not deleted.</>}
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => !deleting && setToDelete(null)}
      />

      {toast && <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  )
}
