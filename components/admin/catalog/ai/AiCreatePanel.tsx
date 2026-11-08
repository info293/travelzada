'use client'

/**
 * "✨ Create with AI" — shown at the top of a NEW package. The admin picks destination / nights / occasion /
 * hotel category (+ optional price and angle); the server designs a package that differs from what we already
 * sell there and the draft fills the form (not saved).
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Button, cx, inputClass } from '../../ui'
import { FormField } from '../fields'
import { canonicalDestinationSlug, destinationOf, packagesForDestination, toNum } from '../packageUtils'
import type { DestinationRecord, PackageDraft } from '../types'
import { staffFetch } from '@/lib/admin/staffFetch'
import type { SimilarityHit } from '@/lib/seo/similarity'

export const AI_OCCASIONS = ['Honeymoon', 'Anniversary', 'Birthday', 'Proposal', 'Babymoon', 'Couple getaway'] as const

export interface AiCreateResponse {
  draft: PackageDraft
  destinationId: string
  destinationName: string
  similarity: { max: number; label: string; top: SimilarityHit[] }
  attempts: number
  differentiator: string
  checks: string[]
  existing: Array<{ id: string; code: string; title: string; nights?: number }>
}

interface Props {
  destinations?: DestinationRecord[]
  otherPackages: PackageDraft[]
  /** Destination already picked in the form */
  destinationId?: string
  onDraft: (res: AiCreateResponse) => void
}

const titleCase = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export default function AiCreatePanel({ destinations = [], otherPackages, destinationId = '', onDraft }: Props) {
  const [open, setOpen] = useState(true)
  const [dest, setDest] = useState(destinationId ? `id:${destinationId}` : '')
  const [nights, setNights] = useState(5)
  const [occasion, setOccasion] = useState<string>('Honeymoon')
  const [stars, setStars] = useState(4)
  const [price, setPrice] = useState('')
  const [angle, setAngle] = useState('')
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (destinationId && !dest) setDest(`id:${destinationId}`)
  }, [destinationId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!busy) return
    const t0 = Date.now()
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(t)
  }, [busy])

  // Destination records + destinations that only exist as packages (no destination page yet)
  const options = useMemo(() => {
    const recs = [...destinations].sort((a, b) => String(a.name).localeCompare(String(b.name))).map((d) => ({ value: `id:${d.id}`, label: d.name }))
    const loose = new Set<string>()
    otherPackages.forEach((p) => {
      if (destinationOf(p, destinations)) return
      const base = canonicalDestinationSlug(p).replace(/-packages$/, '')
      if (base && base !== 'packages') loose.add(titleCase(base))
    })
    const known = new Set(recs.map((r) => r.label.toLowerCase()))
    return [...recs, ...Array.from(loose).filter((n) => !known.has(n.toLowerCase())).sort().map((n) => ({ value: `name:${n}`, label: `${n} (no destination page)` }))]
  }, [destinations, otherPackages])

  const existing = useMemo(() => {
    if (dest.startsWith('id:')) {
      const rec = destinations.find((d) => d.id === dest.slice(3))
      return rec ? packagesForDestination(rec, otherPackages) : []
    }
    if (dest.startsWith('name:')) {
      const n = dest.slice(5).toLowerCase()
      return otherPackages.filter((p) => !destinationOf(p, destinations) && canonicalDestinationSlug(p).replace(/-packages$/, '').replace(/-/g, ' ') === n)
    }
    return []
  }, [dest, destinations, otherPackages])

  const destLabel = options.find((o) => o.value === dest)?.label.replace(/ \(no destination page\)$/, '') || ''

  const generate = async () => {
    if (!dest) return setError('Pick a destination first.')
    setError('')
    setBusy(true)
    setElapsed(0)
    try {
      const res = await staffFetch<AiCreateResponse>('/api/admin/packages/ai-create', {
        ...(dest.startsWith('id:') ? { destinationId: dest.slice(3) } : { destinationName: dest.slice(5) }),
        nights,
        occasion,
        stars,
        targetPrice: toNum(price),
        angle: angle.trim(),
      })
      onDraft(res)
      setOpen(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-bordeaux-200 bg-gradient-to-br from-bordeaux-50 to-white p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-bordeaux-600 text-white"><Sparkles className="h-4 w-4" /></span>
          <span>
            <span className="block text-sm font-bold text-gray-900">✨ Create with AI</span>
            <span className="block text-xs text-gray-600">A complete new package that is different from the ones we already sell there.</span>
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Destination" required>
              <select value={dest} onChange={(e) => setDest(e.target.value)} className={inputClass} disabled={busy}>
                <option value="">— Choose destination —</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Occasion">
              <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className={inputClass} disabled={busy}>
                {AI_OCCASIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Nights" hint={`${nights}N / ${nights + 1}D`}>
              <select value={nights} onChange={(e) => setNights(Number(e.target.value))} className={inputClass} disabled={busy}>
                {[3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n} nights</option>)}
              </select>
            </FormField>
            <FormField label="Hotel category">
              <div className="flex gap-1">
                {[3, 4, 5].map((s) => (
                  <button key={s} type="button" disabled={busy} onClick={() => setStars(s)}
                    className={cx('flex-1 rounded-xl border px-2 py-2 text-sm font-semibold', stars === s ? 'border-bordeaux-500 bg-bordeaux-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50')}>
                    {s}★
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Target price / person (₹)" hint="Optional">
              <input type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="e.g. 28000" disabled={busy} />
            </FormField>
          </div>

          <FormField label="Angle / must include" hint="Optional — e.g. “luxury villas + spa”, “offbeat Gurez valley”, “houseboat + tea estates”.">
            <input value={angle} onChange={(e) => setAngle(e.target.value)} maxLength={400} className={inputClass} placeholder="offbeat — Gurez or Pahalgam meadows" disabled={busy} />
          </FormField>

          {dest && (
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-semibold text-gray-700">
                Your existing {destLabel} packages: {existing.length}
                {existing.length > 0 && <span className="font-normal text-gray-500"> — the AI will avoid these themes, routes and wording</span>}
              </p>
              {existing.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-gray-600">
                  {existing.map((p) => (
                    <li key={p.id || p.Destination_ID} className="flex items-center justify-between gap-2">
                      <span className="truncate"><span className="font-mono text-gray-400">{p.Destination_ID}</span> {p.Destination_Name}</span>
                      <span className="shrink-0 text-gray-400">{toNum(p.Duration_Nights) ?? p.Duration ?? ''}{toNum(p.Duration_Nights) ? 'N' : ''} · {p.Star_Category || '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={generate} loading={busy} disabled={busy || !dest}>
              <Sparkles className="h-4 w-4" /> {busy ? 'Designing package…' : 'Create package with AI'}
            </Button>
            {busy && <span className="text-xs text-gray-500">{elapsed}s — researching routes, writing the itinerary and checking it's unique (usually 1–2 minutes)</span>}
            {error && <span className="text-xs font-medium text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

/** Banner shown above the form after an AI draft was applied. */
export function AiDraftBanner({ res, onDismiss }: { res: AiCreateResponse; onDismiss: () => void }) {
  const pct = Math.round(res.similarity.max * 100)
  const top = res.similarity.top[0]
  const tone = res.similarity.label === 'unique' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : res.similarity.label === 'too similar' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'
  return (
    <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">AI draft — check price, hotels and dates before saving. Nothing is saved until you click “Create package”.</p>
        <button type="button" onClick={onDismiss} className="shrink-0 text-xs font-semibold text-amber-700 hover:underline">Hide</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx('rounded-full border px-2.5 py-0.5 text-xs font-semibold', tone)}>
          {res.similarity.label === 'unique' ? 'Unique ✓' : res.similarity.label === 'too similar' ? 'Too similar ⚠' : 'Duplicate ✕'} {pct}% max overlap{top ? ` with “${top.name}”` : ''}
        </span>
        <span className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800">Price is a suggestion</span>
        {res.attempts > 1 && <span className="text-xs text-amber-700">Rewritten once to be more unique</span>}
      </div>
      {res.differentiator && <p className="text-xs"><b>What's different:</b> {res.differentiator}</p>}
      {res.checks.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs">
          {res.checks.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
    </div>
  )
}
