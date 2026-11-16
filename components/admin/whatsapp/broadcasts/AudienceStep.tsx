'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Search, UserMinus, UserPlus, Users } from 'lucide-react'
import { Badge, Card, Field, cx, inputClass } from '@/components/admin/ui'
import { formatPhone } from '@/lib/admin/privacy'
import {
  META_STAGE_OPTIONS,
  SEGMENTS,
  WEBSITE_STATUS_OPTIONS,
  segmentInfo,
  type AudienceFilters,
  type SegmentId,
} from '@/lib/whatsapp/broadcasts'
import { listContactLists, previewAudience, type AudiencePreview, type SavedContactList, type UploadPayload } from './api'
import UploadPanel from './UploadPanel'

export interface AudienceState {
  segment: SegmentId
  filters: AudienceFilters
  /** Admin only: people (source record paths) left out */
  excludeKeys: string[]
  /** Segment "upload": the parsed sheet */
  upload?: UploadPayload | null
}

export const defaultAudience = (segment: SegmentId = 'website_leads'): AudienceState => ({
  segment,
  filters: { ...(segmentInfo(segment)?.defaults || {}) },
  excludeKeys: [],
  upload: null,
})

/** Short, stable fingerprint of an uploaded list so the live count refreshes when the sheet or mapping changes */
const uploadKey = (u?: UploadPayload | null) =>
  u ? `${u.fileName}|${u.contacts.length}|${u.contacts.map((c) => c.phone + (c.name || '') + (c.destination || '')).join(',').length}|${u.columns.map((c) => c.key).join(',')}` : ''

function SavedListPicker({ listId, notSentOnly, onChange }: { listId?: string; notSentOnly?: boolean; onChange: (patch: { listId?: string; notSentOnly?: boolean }) => void }) {
  const [lists, setLists] = useState<SavedContactList[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    listContactLists()
      .then((r) => setLists(r.lists))
      .catch((e) => setError(e.message || 'Could not load your lists'))
  }, [])
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!lists) return <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading your lists…</p>
  if (!lists.length) return <p className="text-sm text-gray-500">No uploaded lists yet. Choose “Upload a list (Excel / CSV)” to add one.</p>
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {lists.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange({ listId: l.id })}
            className={cx('w-full text-left rounded-xl border p-3 transition-colors', listId === l.id ? 'border-bordeaux-500 bg-bordeaux-50/60 ring-1 ring-bordeaux-300' : 'border-gray-200 hover:border-bordeaux-300')}
          >
            <p className="text-sm font-semibold text-gray-900">{l.name}</p>
            <p className="text-xs text-gray-500">
              {l.count.toLocaleString('en-IN')} people · {l.messaged.toLocaleString('en-IN')} already messaged · uploaded {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {l.uploadedBy ? ` by ${l.uploadedBy}` : ''}
            </p>
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" className="h-4 w-4 accent-bordeaux-600" checked={notSentOnly !== false} onChange={(e) => onChange({ notSentOnly: e.target.checked })} />
        Only people on this list who haven’t been messaged from it yet
      </label>
    </div>
  )
}

function MultiChips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
            className={cx(
              'rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
              on ? 'bg-bordeaux-600 text-white border-bordeaux-600' : 'bg-white text-gray-700 border-gray-300 hover:border-bordeaux-300'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const DAY_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last year' },
  { value: 0, label: 'Any time' },
]

/**
 * Step 1 — who gets the message. Live count from the server (numbers are never shown to non-admins).
 * Admins can expand the list and leave individual people out.
 */
export default function AudienceStep({
  value,
  onChange,
  isAdmin,
  onPreview,
}: {
  value: AudienceState
  onChange: (v: AudienceState) => void
  isAdmin: boolean
  /** Latest preview (so the wizard knows the count + a sample recipient) */
  onPreview: (p: AudiencePreview | null) => void
}) {
  const [preview, setPreview] = useState<AudiencePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showList, setShowList] = useState(false)
  const [search, setSearch] = useState('')
  const { segment, filters, excludeKeys } = value
  const setFilters = (patch: Partial<AudienceFilters>) => onChange({ ...value, filters: { ...filters, ...patch } })

  // Live count (debounced)
  const key = JSON.stringify({ segment, filters, u: segment === 'upload' ? uploadKey(value.upload) : '' })
  const waiting = (segment === 'upload' && !value.upload) || (segment === 'saved_list' && !filters.listId)
  useEffect(() => {
    let cancelled = false
    if (waiting) {
      setPreview(null)
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    const t = setTimeout(async () => {
      try {
        const p = await previewAudience(segment, filters, segment === 'upload' ? value.upload : null)
        if (cancelled) return
        setPreview(p)
      } catch (e: any) {
        if (!cancelled) {
          setPreview(null)
          setError(e.message || 'Could not count this audience')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const excluded = useMemo(() => new Set(excludeKeys), [excludeKeys])
  const finalCount = preview ? preview.count - preview.people.filter((p) => excluded.has(p.key)).length : 0
  useEffect(() => {
    onPreview(preview ? { ...preview, people: preview.people.filter((p) => !excluded.has(p.key)), count: finalCount } : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, excludeKeys])

  const skippedTotal = preview ? preview.skipped.noNumber + preview.skipped.invalid + preview.skipped.duplicates + preview.skipped.optedOut : 0
  const people = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = preview?.people || []
    return q ? list.filter((p) => `${p.name} ${p.destination || ''} ${p.phone || ''}`.toLowerCase().includes(q)) : list
  }, [preview, search])

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Who should get this message?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange(defaultAudience(s.id))}
                className={cx(
                  'text-left rounded-xl border p-3 transition-colors',
                  segment === s.id ? 'border-bordeaux-500 bg-bordeaux-50/60 ring-1 ring-bordeaux-300' : 'border-gray-200 bg-white hover:border-bordeaux-300'
                )}
              >
                <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        {segment === 'upload' && (
          <UploadPanel value={value.upload || null} onChange={(upload) => onChange({ ...value, upload, excludeKeys: [] })} isAdmin={isAdmin} />
        )}
        {segment === 'saved_list' && (
          <Card>
            <p className="text-sm font-semibold text-gray-900 mb-3">Pick a list you uploaded</p>
            <SavedListPicker listId={filters.listId} notSentOnly={filters.notSentOnly} onChange={(patch) => setFilters(patch)} />
          </Card>
        )}
        {segment !== 'upload' && segment !== 'saved_list' && (
        <Card>
          <p className="text-sm font-semibold text-gray-900 mb-3">Narrow it down</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {segment === 'website_leads' && (
              <Field label="Lead status" className="sm:col-span-2">
                <MultiChips options={WEBSITE_STATUS_OPTIONS} value={filters.statuses || []} onChange={(statuses) => setFilters({ statuses })} />
              </Field>
            )}
            {segment === 'meta_leads' && (
              <Field label="CRM stage" className="sm:col-span-2">
                <MultiChips options={META_STAGE_OPTIONS} value={filters.stages || []} onChange={(stages) => setFilters({ stages })} />
              </Field>
            )}
            {['website_leads', 'ai_planner_leads', 'meta_leads', 'contact_form'].includes(segment) && (
              <Field label="Enquired">
                <select className={inputClass} value={filters.createdWithinDays ?? 0} onChange={(e) => setFilters({ createdWithinDays: Number(e.target.value) })}>
                  {DAY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {(segment === 'website_leads' || segment === 'contact_form') && (
              <Field label="Destination contains" hint="Optional, e.g. Bali">
                <input className={inputClass} value={filters.destination || ''} onChange={(e) => setFilters({ destination: e.target.value })} placeholder="Any destination" />
              </Field>
            )}
            {segment === 'quotes_not_booked' && (
              <>
                <Field label="Quote sent at least … days ago" hint="Give them time to read it first">
                  <input type="number" min={0} className={inputClass} value={filters.minAgeDays ?? 2} onChange={(e) => setFilters({ minAgeDays: Number(e.target.value) })} />
                </Field>
                <Field label="… and at most … days ago">
                  <input type="number" min={1} className={inputClass} value={filters.maxAgeDays ?? 60} onChange={(e) => setFilters({ maxAgeDays: Number(e.target.value) })} />
                </Field>
              </>
            )}
            {segment === 'upcoming_trips' && (
              <Field label="Travelling in the next … days">
                <input type="number" min={1} max={365} className={inputClass} value={filters.nextDays ?? 30} onChange={(e) => setFilters({ nextDays: Number(e.target.value) })} />
              </Field>
            )}
            {segment === 'whatsapp_contacts' && (
              <Field label="Messaged us in the last … days">
                <input type="number" min={1} className={inputClass} value={filters.lastDays ?? 30} onChange={(e) => setFilters({ lastDays: Number(e.target.value) })} />
              </Field>
            )}
            {segment === 'past_customers' && <p className="text-sm text-gray-500 sm:col-span-2">Everyone whose booking is completed or whose travel date has passed.</p>}
          </div>
        </Card>
        )}

        {preview && preview.count > 0 && (
          <Card padded={false}>
            <button type="button" onClick={() => setShowList((s) => !s)} className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-800">
              <span className="inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-bordeaux-600" /> {showList ? 'Hide' : 'See'} who is included
              </span>
              <span className="text-xs font-normal text-gray-500">{isAdmin ? 'Admins can leave people out' : 'Names only'}</span>
            </button>
            {showList && (
              <div className="border-t border-gray-100">
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className={`${inputClass} pl-9`} placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {people.slice(0, 500).map((p) => {
                    const out = excluded.has(p.key)
                    return (
                      <li key={p.key} className={cx('flex items-center justify-between gap-3 px-5 py-2 text-sm', out && 'opacity-50')}>
                        <div className="min-w-0">
                          <p className={cx('font-medium text-gray-900 truncate', out && 'line-through')}>{p.name || 'No name'}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {[isAdmin && p.phone ? formatPhone(p.phone) : '', p.destination].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onChange({ ...value, excludeKeys: out ? excludeKeys.filter((k) => k !== p.key) : [...excludeKeys, p.key] })}
                            className={cx('shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold', out ? 'text-emerald-700 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50')}
                          >
                            {out ? <UserPlus className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
                            {out ? 'Add back' : 'Remove'}
                          </button>
                        )}
                      </li>
                    )
                  })}
                  {people.length > 500 && <li className="px-5 py-2 text-xs text-gray-500">…and {people.length - 500} more. Search to find someone.</li>}
                </ul>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Live count */}
      <div>
        <Card className="lg:sticky lg:top-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">This broadcast goes to</p>
          {waiting ? (
            <p className="mt-2 text-sm text-gray-500">{segment === 'upload' ? 'Upload a sheet to see how many people it reaches.' : 'Pick a list to see how many people it reaches.'}</p>
          ) : loading && !preview ? (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Counting…
            </div>
          ) : error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : preview ? (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900 tabular-nums flex items-center gap-2">
                {finalCount.toLocaleString('en-IN')} <span className="text-base font-semibold text-gray-500">people</span>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {skippedTotal.toLocaleString('en-IN')} skipped
                {excludeKeys.length > 0 && ` · ${excludeKeys.length} removed by you`}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-600">
                <li className="flex justify-between"><span>No number</span><span className="tabular-nums">{preview.skipped.noNumber}</span></li>
                <li className="flex justify-between"><span>Invalid number</span><span className="tabular-nums">{preview.skipped.invalid}</span></li>
                <li className="flex justify-between"><span>Duplicates (same number)</span><span className="tabular-nums">{preview.skipped.duplicates}</span></li>
                <li className="flex justify-between"><span>Opted out (replied STOP)</span><span className="tabular-nums">{preview.skipped.optedOut}</span></li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">{preview.description}</p>
              {finalCount > preview.max && (
                <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> One broadcast can go to at most {preview.max.toLocaleString('en-IN')} people. Narrow the filters.
                </p>
              )}
              {finalCount === 0 && <p className="mt-3 text-xs text-amber-700">Nobody matches — try wider filters.</p>}
              {preview.dailyCap && (
                <div className={cx('mt-3 rounded-xl p-3 text-xs', preview.dailyCap.newInAudience > preview.dailyCap.left ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-600')}>
                  <p className="font-semibold">New contacts today: {preview.dailyCap.usedToday} of {preview.dailyCap.cap} used</p>
                  <p className="mt-0.5">
                    {preview.dailyCap.newInAudience.toLocaleString('en-IN')} people on this list have never messaged us.
                    {preview.dailyCap.newInAudience > preview.dailyCap.left
                      ? ` Only ${preview.dailyCap.left} can be messaged today — the rest stay in the saved list for tomorrow.`
                      : ''}
                  </p>
                </div>
              )}
              {!isAdmin && <Badge className="mt-3">Numbers are hidden — only admins can see them</Badge>}
            </>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
