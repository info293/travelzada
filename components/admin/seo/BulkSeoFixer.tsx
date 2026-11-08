'use client'

/**
 * "Fix all weak pages with AI": runs the SEO & GEO optimizer over every package whose grade isn't "good"
 * (duplicates first), strictly one AI call at a time.
 *   - Review each (default): shows before → after; admin applies the ticked fields or skips.
 *   - Auto-apply: saves straight away, except results that are still too similar to another page — those
 *     are held and can be reviewed at the end.
 * Pausable (finishes the current package, then waits) and cancellable (aborts the call in flight).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Pause, Play, SkipForward, Sparkles, Square, X, XCircle } from 'lucide-react'
import { Badge, Button, cx } from '@/components/admin/ui'
import type { PackageAudit } from '@/lib/seo/packageAudit'
import { SIMILAR_AT } from '@/lib/seo/similarity'
import type { OptimizeResult, SeoField, SeoPatch } from '@/lib/seo/types'
import SeoReviewPanel, { SimilarityLine } from './SeoReviewPanel'
import { fieldsIn, pickPatch, runSeoOptimize } from './api'

type Pkg = Record<string, any> & { id?: string }
type Mode = 'review' | 'auto'
type Status = 'queued' | 'running' | 'review' | 'applied' | 'skipped' | 'held' | 'failed' | 'cancelled'
interface Item {
  id: string
  name: string
  pkg: Pkg
  audit?: PackageAudit
  status: Status
  result?: OptimizeResult
  error?: string
}
type Decision = { apply: boolean; patch?: SeoPatch }

const STATUS: Record<Status, { label: string; tone: 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'purple' }> = {
  queued: { label: 'Waiting', tone: 'gray' },
  running: { label: 'Rewriting…', tone: 'blue' },
  review: { label: 'Needs your review', tone: 'purple' },
  applied: { label: 'Saved', tone: 'green' },
  skipped: { label: 'Skipped', tone: 'gray' },
  held: { label: 'Held — still similar', tone: 'amber' },
  failed: { label: 'Failed', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
}

export function weakPackages(packages: Pkg[], audits: Map<string, PackageAudit>): Pkg[] {
  const top = (p: Pkg) => audits.get(String(p.id))?.similarity[0]?.score ?? 0
  return packages
    .filter((p) => p.id && audits.get(String(p.id)) && audits.get(String(p.id))!.grade !== 'good')
    .sort((a, b) => {
      const da = top(a) >= SIMILAR_AT ? 1 : 0
      const dbb = top(b) >= SIMILAR_AT ? 1 : 0
      if (da !== dbb) return dbb - da
      if (da && dbb) return top(b) - top(a)
      return (audits.get(String(a.id))!.score) - (audits.get(String(b.id))!.score)
    })
}

export default function BulkSeoFixer({
  open,
  onClose,
  packages,
  audits,
  onSave,
  onBusyChange,
}: {
  open: boolean
  onClose: () => void
  packages: Pkg[]
  audits: Map<string, PackageAudit>
  /** Save the ticked fields of one package (updateDoc + Last_Updated). Throw to mark it failed. */
  onSave: (pkg: Pkg, patch: SeoPatch) => Promise<void>
  onBusyChange?: (busy: boolean) => void
}) {
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup')
  const [mode, setMode] = useState<Mode>('review')
  const [limit, setLimit] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [paused, setPaused] = useState(false)
  const [selected, setSelected] = useState<Set<SeoField>>(new Set())
  const [reviewingHeld, setReviewingHeld] = useState<string | null>(null)
  const [savingHeld, setSavingHeld] = useState(false)
  const [savingReview, setSavingReview] = useState(false)

  const pausedRef = useRef(false)
  const cancelRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const decideRef = useRef<((d: Decision) => void) | null>(null)
  const resumeRef = useRef<(() => void) | null>(null)

  const queue = useMemo(() => weakPackages(packages, audits), [packages, audits])
  const dupCount = useMemo(() => queue.filter((p) => (audits.get(String(p.id))?.similarity[0]?.score ?? 0) >= SIMILAR_AT).length, [queue, audits])

  useEffect(() => {
    if (open && phase === 'setup') setLimit(queue.length)
  }, [open, phase, queue.length])
  useEffect(() => onBusyChange?.(phase === 'running'), [phase, onBusyChange])

  const patchItem = (id: string, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const waitIfPaused = () =>
    pausedRef.current && !cancelRef.current
      ? new Promise<void>((res) => {
          resumeRef.current = res
        })
      : Promise.resolve()

  const start = async () => {
    const chosen: Item[] = queue.slice(0, Math.max(1, limit || queue.length)).map((p) => ({
      id: String(p.id),
      name: String(p.Destination_Name || 'Untitled'),
      pkg: p,
      audit: audits.get(String(p.id)),
      status: 'queued',
    }))
    cancelRef.current = false
    pausedRef.current = false
    setPaused(false)
    setItems(chosen)
    setPhase('running')

    for (const it of chosen) {
      await waitIfPaused()
      if (cancelRef.current) break
      patchItem(it.id, { status: 'running' })
      const ctrl = new AbortController()
      abortRef.current = ctrl
      let result: OptimizeResult
      try {
        result = await runSeoOptimize(it.pkg, it.id, ctrl.signal)
      } catch (e) {
        if (cancelRef.current) break
        patchItem(it.id, { status: 'failed', error: (e as Error)?.message || 'Failed' })
        continue
      } finally {
        abortRef.current = null
      }
      if (cancelRef.current) break

      const stillSimilar = (result.similarity_after[0]?.score ?? 0) >= SIMILAR_AT
      if (mode === 'auto') {
        if (stillSimilar) {
          patchItem(it.id, { status: 'held', result })
          continue
        }
        try {
          await onSave(it.pkg, result.patch)
          patchItem(it.id, { status: 'applied', result })
        } catch (e) {
          patchItem(it.id, { status: 'failed', result, error: (e as Error)?.message || 'Could not save' })
        }
        continue
      }

      // Review each
      setSelected(new Set(fieldsIn(result.patch)))
      patchItem(it.id, { status: 'review', result })
      const decision = await new Promise<Decision>((res) => {
        decideRef.current = res
      })
      decideRef.current = null
      if (decision.apply && decision.patch && Object.keys(decision.patch).length) {
        try {
          await onSave(it.pkg, decision.patch)
          patchItem(it.id, { status: 'applied' })
        } catch (e) {
          patchItem(it.id, { status: 'failed', error: (e as Error)?.message || 'Could not save' })
        }
      } else {
        patchItem(it.id, { status: cancelRef.current ? 'cancelled' : 'skipped' })
      }
      if (cancelRef.current) break
    }
    setItems((list) => list.map((x) => (x.status === 'queued' || x.status === 'running' ? { ...x, status: 'cancelled' } : x)))
    setPhase('done')
  }

  const pause = () => {
    pausedRef.current = true
    setPaused(true)
  }
  const resume = () => {
    pausedRef.current = false
    setPaused(false)
    resumeRef.current?.()
    resumeRef.current = null
  }
  const cancel = useCallback(() => {
    cancelRef.current = true
    abortRef.current?.abort()
    decideRef.current?.({ apply: false })
    resumeRef.current?.()
    resumeRef.current = null
  }, [])

  const close = () => {
    if (phase === 'running') {
      if (!window.confirm('Stop fixing pages? Packages already saved stay saved.')) return
      cancel()
    }
    setPhase('setup')
    setItems([])
    setReviewingHeld(null)
    onClose()
  }

  const decide = async (apply: boolean, result?: OptimizeResult) => {
    if (!decideRef.current) return
    setSavingReview(apply)
    decideRef.current({ apply, patch: apply && result ? pickPatch(result.patch, selected) : undefined })
  }
  useEffect(() => {
    if (!items.some((i) => i.status === 'review')) setSavingReview(false)
  }, [items])

  const saveHeld = async (it: Item) => {
    if (!it.result) return
    setSavingHeld(true)
    try {
      await onSave(it.pkg, pickPatch(it.result.patch, selected))
      patchItem(it.id, { status: 'applied' })
      setReviewingHeld(null)
    } catch (e) {
      patchItem(it.id, { error: (e as Error)?.message || 'Could not save' })
    } finally {
      setSavingHeld(false)
    }
  }

  if (!open) return null

  const done = items.filter((i) => !['queued', 'running', 'review'].includes(i.status)).length
  const current = items.find((i) => i.status === 'review')
  const held = reviewingHeld ? items.find((i) => i.id === reviewingHeld) : undefined
  const toggle = (f: SeoField, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      if (on) n.add(f)
      else n.delete(f)
      return n
    })
  const count = (s: Status) => items.filter((i) => i.status === s).length

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-gray-900/50" onClick={phase === 'running' ? undefined : close} />
      <div className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Sparkles className="h-4 w-4 text-bordeaux-600" /> Fix weak pages with AI
          </div>
          <button type="button" onClick={close} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {phase !== 'setup' && (
          <div className="border-b border-gray-100 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-gray-800">
                {phase === 'done' ? 'Finished' : paused ? 'Paused — will stop after the current package' : 'Working'} · {done} of {items.length}
              </span>
              {phase === 'running' && (
                <div className="flex gap-2">
                  {paused ? (
                    <Button size="sm" variant="secondary" onClick={resume}><Play className="h-3.5 w-3.5" /> Resume</Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={pause}><Pause className="h-3.5 w-3.5" /> Pause</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={cancel}><Square className="h-3.5 w-3.5" /> Cancel</Button>
                </div>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-bordeaux-600 transition-all" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'setup' ? (
            <div className="mx-auto max-w-xl space-y-5">
              <p className="text-sm text-gray-700">
                <b>{queue.length}</b> package page{queue.length === 1 ? '' : 's'} need SEO work{dupCount ? <>, including <b>{dupCount}</b> that read like duplicates of another page (these go first)</> : ''}.
                The AI rewrites only the text fields — title, description, keywords, overview, highlights, day texts, FAQs, why-book and alt text. Prices, nights, hotels, meals and inclusions are never changed.
              </p>
              {queue.length === 0 ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Every package already looks good.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <ModeOption checked={mode === 'review'} onChange={() => setMode('review')} title="Review each (recommended)" text="See before → after for every package, then Apply or Skip." />
                    <ModeOption checked={mode === 'auto'} onChange={() => setMode('auto')} title="Auto-apply" text={`Saves each result automatically. Results that are still ≥${Math.round(SIMILAR_AT * 100)}% similar to another page are held for you to review at the end.`} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    Fix the first
                    <input type="number" min={1} max={queue.length} value={limit} onChange={(e) => setLimit(Math.max(1, Math.min(queue.length, Number(e.target.value) || 1)))} className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm" />
                    of {queue.length} packages
                  </label>
                  <p className="text-xs text-gray-500">One package at a time, about 30–90 seconds each (~{Math.ceil((Math.max(1, limit) * 60) / 60)} min in total). Keep this tab open.</p>
                  <ol className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-2 text-sm">
                    {queue.slice(0, Math.max(1, limit)).map((p, i) => {
                      const a = audits.get(String(p.id))
                      const s = a?.similarity[0]?.score ?? 0
                      return (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span className="truncate"><span className="mr-1.5 text-gray-400">{i + 1}.</span>{p.Destination_Name}</span>
                          <span className="flex shrink-0 gap-1">
                            {s >= SIMILAR_AT && <Badge tone={s >= 0.5 ? 'red' : 'amber'}>{Math.round(s * 100)}% similar</Badge>}
                            <Badge>{a?.score ?? '—'}</Badge>
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </>
              )}
            </div>
          ) : current?.result ? (
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-900">{current.name}</p>
              <SeoReviewPanel result={current.result} before={current.pkg} selected={selected} onToggle={toggle} />
            </div>
          ) : held?.result ? (
            <div>
              <button type="button" onClick={() => setReviewingHeld(null)} className="mb-3 text-xs font-semibold text-bordeaux-700 hover:underline">← Back to summary</button>
              <p className="mb-3 text-sm font-semibold text-gray-900">{held.name}</p>
              <SeoReviewPanel result={held.result} before={held.pkg} selected={selected} onToggle={toggle} />
            </div>
          ) : (
            <div className="space-y-4">
              {phase === 'done' && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <SummaryTile icon={<CheckCircle2 className="h-4 w-4" />} label="Saved" value={count('applied')} tone="text-emerald-700" />
                  <SummaryTile icon={<SkipForward className="h-4 w-4" />} label="Skipped / cancelled" value={count('skipped') + count('cancelled')} tone="text-gray-700" />
                  <SummaryTile icon={<AlertTriangle className="h-4 w-4" />} label="Held (still similar)" value={count('held')} tone="text-amber-700" />
                  <SummaryTile icon={<XCircle className="h-4 w-4" />} label="Failed" value={count('failed')} tone="text-red-700" />
                </div>
              )}
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {items.map((it) => (
                  <li key={it.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{it.name}</p>
                      {it.result && <SimilarityLine before={it.result.similarity_before[0]} after={it.result.similarity_after[0]} />}
                      {it.error && <p className="text-xs text-red-700">{it.error}</p>}
                      {it.result?.warnings.map((w) => <p key={w} className="text-xs text-amber-800">{w}</p>)}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {it.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-bordeaux-600" />}
                      <Badge tone={STATUS[it.status].tone}>{STATUS[it.status].label}</Badge>
                      {it.status === 'held' && phase === 'done' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelected(new Set(fieldsIn(it.result!.patch)))
                            setReviewingHeld(it.id)
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          {phase === 'setup' ? (
            <>
              <Button variant="secondary" onClick={close}>Close</Button>
              <Button onClick={start} disabled={!queue.length}><Sparkles className="h-4 w-4" /> Start ({Math.min(Math.max(1, limit), queue.length)})</Button>
            </>
          ) : current?.result ? (
            <>
              <span className="mr-auto text-xs text-gray-500">{selected.size} field{selected.size === 1 ? '' : 's'} selected</span>
              <Button variant="secondary" onClick={() => decide(false)} disabled={savingReview}>Skip</Button>
              <Button onClick={() => decide(true, current.result)} disabled={!selected.size} loading={savingReview}>Apply & save</Button>
            </>
          ) : held?.result ? (
            <>
              <Button variant="secondary" onClick={() => setReviewingHeld(null)} disabled={savingHeld}>Back</Button>
              <Button onClick={() => saveHeld(held)} disabled={!selected.size} loading={savingHeld}>Apply & save</Button>
            </>
          ) : (
            <Button variant={phase === 'done' ? 'primary' : 'secondary'} onClick={close}>{phase === 'done' ? 'Done' : 'Close'}</Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ModeOption({ checked, onChange, title, text }: { checked: boolean; onChange: () => void; title: string; text: string }) {
  return (
    <label className={cx('flex cursor-pointer gap-3 rounded-xl border p-3', checked ? 'border-bordeaux-300 bg-bordeaux-50/50' : 'border-gray-200 hover:border-gray-300')}>
      <input type="radio" checked={checked} onChange={onChange} className="mt-0.5 accent-bordeaux-600" />
      <span>
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-600">{text}</span>
      </span>
    </label>
  )
}

function SummaryTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className={cx('flex items-center gap-1.5 text-xs font-medium', tone)}>{icon}{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  )
}
