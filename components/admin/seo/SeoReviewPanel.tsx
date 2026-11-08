'use client'

/**
 * Before → after review of an AI SEO rewrite, one checkbox per field. Used by SeoFixButton (package editor),
 * the per-row "Fix SEO" on /admin/packages and the bulk fixer.
 */
import { AlertTriangle, ArrowRight, Info } from 'lucide-react'
import { Badge, cx } from '@/components/admin/ui'
import { daysOf } from '@/lib/seo/packageAudit'
import { SIMILAR_AT, similarityLabel, type SimilarityHit } from '@/lib/seo/similarity'
import { SEO_FIELD_LABELS, type OptimizeResult, type SeoField } from '@/lib/seo/types'
import { fieldsIn } from './api'

const pct = (n?: number) => `${Math.round((n || 0) * 100)}%`
export const simTone = (n?: number) => ((n || 0) >= 0.5 ? 'red' : (n || 0) >= SIMILAR_AT ? 'amber' : 'green') as 'red' | 'amber' | 'green'

export function SimilarityLine({ before, after }: { before?: SimilarityHit; after?: SimilarityHit }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-600">Closest other page:</span>
      <Badge tone={simTone(before?.score)}>{pct(before?.score)} {similarityLabel(before?.score || 0)}</Badge>
      <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
      <Badge tone={simTone(after?.score)}>{pct(after?.score)} {similarityLabel(after?.score || 0)}</Badge>
      {(after?.name || before?.name) && <span className="truncate text-xs text-gray-500">({after?.name || before?.name})</span>}
    </div>
  )
}

export function ReviewSummary({ result }: { result: OptimizeResult }) {
  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <SimilarityLine before={result.similarity_before[0]} after={result.similarity_after[0]} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-600">SEO score:</span>
        <b className="tabular-nums">{result.audit_before.score}</b>
        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
        <b className="tabular-nums text-emerald-700">{result.audit_after_estimate.score}</b>
        <span className="text-xs text-gray-500">(if every field is applied · {Math.round(result.ms / 1000)} s{result.attempts > 1 ? ', 2 passes' : ''})</span>
      </div>
      {result.warnings.map((w) => (
        <p key={w} className="flex gap-1.5 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</p>
      ))}
      {result.notes.map((n) => (
        <p key={n} className="flex gap-1.5 text-xs text-gray-600"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{n}</p>
      ))}
    </div>
  )
}

function Value({ field, value, muted }: { field: SeoField; value: any; muted?: boolean }) {
  const cls = cx('text-sm', muted ? 'text-gray-500' : 'text-gray-900')
  const empty = <span className="text-xs italic text-gray-400">empty</span>
  if (field === 'Day_Wise_Itinerary_Details') {
    const days = daysOf({ Day_Wise_Itinerary_Details: value })
    if (!days.length) return empty
    return (
      <ol className={cx('space-y-2', cls)}>
        {days.map((d) => (
          <li key={d.day}>
            <p className="font-semibold">Day {d.day}: {d.title}</p>
            {d.description && <p className="mt-0.5 whitespace-pre-line">{d.description}</p>}
            {!!d.activities.length && <p className="mt-0.5 text-xs text-gray-500">{d.activities.join(' · ')}</p>}
          </li>
        ))}
      </ol>
    )
  }
  if (field === 'FAQ_Items') {
    const items = Array.isArray(value) ? value : []
    if (!items.length) return empty
    return (
      <ul className={cx('space-y-2', cls)}>
        {items.map((f: any, i: number) => (
          <li key={i}><p className="font-semibold">{f?.question}</p><p className="mt-0.5">{f?.answer}</p></li>
        ))}
      </ul>
    )
  }
  if (field === 'Why_Book_With_Us') {
    const items = Array.isArray(value) ? value : []
    if (!items.length) return empty
    return (
      <ul className={cx('space-y-1.5', cls)}>
        {items.map((w: any, i: number) => <li key={i}><b>{w?.label}</b> — {w?.description}</li>)}
      </ul>
    )
  }
  if (field === 'Highlights') {
    const items = Array.isArray(value) ? value : []
    if (!items.length) return empty
    return <ul className={cx('list-disc space-y-0.5 pl-4', cls)}>{items.map((h: any, i: number) => <li key={i}>{String(h)}</li>)}</ul>
  }
  const s = String(value ?? '').trim()
  if (!s) return empty
  const len = field === 'SEO_Title' || field === 'SEO_Description' ? ` · ${s.length} chars` : field === 'Overview' ? ` · ${s.split(/\s+/).length} words` : ''
  return (
    <div className={cls}>
      <p className="whitespace-pre-line">{s}</p>
      {len && <p className="mt-0.5 text-[11px] text-gray-400">{len.slice(3)}</p>}
    </div>
  )
}

export default function SeoReviewPanel({
  result,
  before,
  selected,
  onToggle,
}: {
  result: OptimizeResult
  /** The package as it is now (for the "before" column) */
  before: Record<string, any>
  selected: Set<SeoField>
  onToggle: (field: SeoField, on: boolean) => void
}) {
  const fields = fieldsIn(result.patch)
  return (
    <div className="space-y-4">
      <ReviewSummary result={result} />
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{selected.size} of {fields.length} fields selected</span>
        <span className="flex gap-3">
          <button type="button" className="font-semibold text-bordeaux-700 hover:underline" onClick={() => fields.forEach((f) => onToggle(f, true))}>Select all</button>
          <button type="button" className="font-semibold text-gray-600 hover:underline" onClick={() => fields.forEach((f) => onToggle(f, false))}>None</button>
        </span>
      </div>
      {fields.map((f) => {
        const on = selected.has(f)
        return (
          <div key={f} className={cx('rounded-xl border p-3 transition-colors', on ? 'border-bordeaux-200 bg-white' : 'border-gray-200 bg-gray-50/60')}>
            <label className="mb-2 flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={on} onChange={(e) => onToggle(f, e.target.checked)} className="h-4 w-4 accent-bordeaux-600" />
              <span className="text-sm font-semibold text-gray-900">{SEO_FIELD_LABELS[f]}</span>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="max-h-72 overflow-y-auto rounded-lg bg-gray-50 p-2.5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Before</p>
                <Value field={f} value={f === 'Day_Wise_Itinerary_Details' ? daysOf(before || {}) : before?.[f]} muted />
              </div>
              <div className={cx('max-h-72 overflow-y-auto rounded-lg p-2.5', on ? 'bg-emerald-50/60' : 'bg-gray-50')}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">After</p>
                <Value field={f} value={result.patch[f]} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
