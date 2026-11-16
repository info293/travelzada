'use client'

/**
 * Editable "After" value for one SEO field in the AI review panel. Lets staff fix the AI's wording before
 * applying it. Field shapes match what the public package page reads:
 *   strings (title, description, keywords, overview, alt text), Highlights: string[],
 *   FAQ_Items: {question, answer}[], Why_Book_With_Us: {label, description}[],
 *   Day_Wise_Itinerary_Details: {day, title, description, activities[]}[] (day numbers are fixed).
 */
import { useEffect, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cx } from '@/components/admin/ui'
import type { SeoField } from '@/lib/seo/types'

const box =
  'w-full rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-bordeaux-400 focus:outline-none focus:ring-2 focus:ring-bordeaux-100'

/** Textarea that grows with its content */
function AutoText({ value, onChange, rows = 2, placeholder, className }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return <textarea ref={ref} value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(box, 'resize-none leading-relaxed', className)} />
}

/** "52 chars · aim 50–60" in green/amber */
function Count({ n, unit, min, max }: { n: number; unit: string; min?: number; max?: number }) {
  const ok = (min === undefined || n >= min) && (max === undefined || n <= max)
  return (
    <p className={cx('mt-1 text-[11px]', ok ? 'text-emerald-700' : 'text-amber-700')}>
      {n} {unit}
      {(min !== undefined || max !== undefined) && <span className="text-gray-400"> · aim {min ?? 0}–{max ?? '∞'}</span>}
    </p>
  )
}

const RowButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
    <Trash2 className="h-3.5 w-3.5" />
  </button>
)
const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs font-semibold text-bordeaux-700 hover:underline">
    <Plus className="h-3.5 w-3.5" /> {label}
  </button>
)

export default function SeoFieldEditor({ field, value, onChange }: { field: SeoField; value: any; onChange: (v: any) => void }) {
  // ── Lists ──
  if (field === 'Highlights') {
    const items: string[] = Array.isArray(value) ? value.map((x) => String(x ?? '')) : []
    const set = (next: string[]) => onChange(next)
    return (
      <div className="space-y-1.5">
        {items.map((h, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-2 text-xs text-gray-400">•</span>
            <AutoText rows={1} value={h} onChange={(v) => set(items.map((x, j) => (j === i ? v : x)))} />
            <RowButton label="Remove highlight" onClick={() => set(items.filter((_, j) => j !== i))} />
          </div>
        ))}
        <AddButton label="Add highlight" onClick={() => set([...items, ''])} />
      </div>
    )
  }

  if (field === 'FAQ_Items') {
    const items: Array<{ question: string; answer: string }> = Array.isArray(value)
      ? value.map((f) => ({ question: String(f?.question ?? ''), answer: String(f?.answer ?? '') }))
      : []
    const set = (next: typeof items) => onChange(next)
    return (
      <div className="space-y-3">
        {items.map((f, i) => (
          <div key={i} className="rounded-lg border border-emerald-100 bg-white/60 p-2">
            <div className="flex items-start gap-1.5">
              <AutoText rows={1} value={f.question} placeholder="Question" className="font-semibold" onChange={(v) => set(items.map((x, j) => (j === i ? { ...x, question: v } : x)))} />
              <RowButton label="Remove FAQ" onClick={() => set(items.filter((_, j) => j !== i))} />
            </div>
            <AutoText value={f.answer} placeholder="Answer — start with a direct answer" className="mt-1.5" onChange={(v) => set(items.map((x, j) => (j === i ? { ...x, answer: v } : x)))} />
          </div>
        ))}
        <AddButton label="Add FAQ" onClick={() => set([...items, { question: '', answer: '' }])} />
      </div>
    )
  }

  if (field === 'Why_Book_With_Us') {
    const items: Array<{ label: string; description: string }> = Array.isArray(value)
      ? value.map((w) => ({ label: String(w?.label ?? ''), description: String(w?.description ?? '') }))
      : []
    const set = (next: typeof items) => onChange(next)
    return (
      <div className="space-y-2.5">
        {items.map((w, i) => (
          <div key={i} className="rounded-lg border border-emerald-100 bg-white/60 p-2">
            <div className="flex items-start gap-1.5">
              <input value={w.label} placeholder="Point" onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={cx(box, 'font-semibold')} />
              <RowButton label="Remove point" onClick={() => set(items.filter((_, j) => j !== i))} />
            </div>
            <AutoText value={w.description} placeholder="Short explanation" className="mt-1.5" onChange={(v) => set(items.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
          </div>
        ))}
        <AddButton label="Add point" onClick={() => set([...items, { label: '', description: '' }])} />
      </div>
    )
  }

  if (field === 'Day_Wise_Itinerary_Details') {
    const days: Array<{ day: number; title: string; description: string; activities: string[] }> = Array.isArray(value)
      ? value.map((d, i) => ({
          ...d,
          day: Number(d?.day) || i + 1,
          title: String(d?.title ?? ''),
          description: String(d?.description ?? ''),
          activities: Array.isArray(d?.activities) ? d.activities.map((a: any) => String(a)) : [],
        }))
      : []
    const set = (i: number, patch: Partial<(typeof days)[number]>) => onChange(days.map((d, j) => (j === i ? { ...d, ...patch } : d)))
    return (
      <ol className="space-y-3">
        {days.map((d, i) => (
          <li key={d.day} className="rounded-lg border border-emerald-100 bg-white/60 p-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-md bg-bordeaux-50 px-1.5 py-0.5 text-[11px] font-bold text-bordeaux-700">Day {d.day}</span>
              <input value={d.title} placeholder="Day title" onChange={(e) => set(i, { title: e.target.value })} className={cx(box, 'font-semibold')} />
            </div>
            <AutoText value={d.description} placeholder="What happens on this day" className="mt-1.5" onChange={(v) => set(i, { description: v })} />
            <input
              value={d.activities.join(', ')}
              placeholder="Activities, comma separated"
              onChange={(e) => set(i, { activities: e.target.value.split(',').map((a) => a.trimStart()).filter((a, idx, arr) => a || idx === arr.length - 1) })}
              className={cx(box, 'mt-1.5 text-xs')}
            />
          </li>
        ))}
      </ol>
    )
  }

  // ── Plain text ──
  const s = Array.isArray(value) ? value.join(', ') : String(value ?? '')
  if (field === 'SEO_Title') {
    return (
      <div>
        <AutoText rows={1} value={s} onChange={onChange} />
        <Count n={s.trim().length} unit="chars" min={50} max={60} />
      </div>
    )
  }
  if (field === 'SEO_Description') {
    return (
      <div>
        <AutoText rows={3} value={s} onChange={onChange} />
        <Count n={s.trim().length} unit="chars" min={140} max={160} />
      </div>
    )
  }
  if (field === 'Overview') {
    const words = s.trim() ? s.trim().split(/\s+/).length : 0
    return (
      <div>
        <AutoText rows={8} value={s} onChange={onChange} />
        <Count n={words} unit="words" min={180} max={260} />
      </div>
    )
  }
  if (field === 'SEO_Keywords') {
    const n = s.split(',').map((k) => k.trim()).filter(Boolean).length
    return (
      <div>
        <AutoText rows={2} value={s} onChange={onChange} placeholder="kashmir honeymoon package, srinagar houseboat stay, …" />
        <Count n={n} unit="keywords" min={6} max={10} />
      </div>
    )
  }
  return <AutoText rows={2} value={s} onChange={onChange} />
}

/** Remove empty rows / whitespace before saving an edited value */
export function cleanEditedValue(field: SeoField, value: any): any {
  if (field === 'Highlights') return (Array.isArray(value) ? value : []).map((h) => String(h).trim()).filter(Boolean)
  if (field === 'FAQ_Items') return (Array.isArray(value) ? value : []).map((f) => ({ question: String(f.question).trim(), answer: String(f.answer).trim() })).filter((f) => f.question && f.answer)
  if (field === 'Why_Book_With_Us') return (Array.isArray(value) ? value : []).map((w) => ({ label: String(w.label).trim(), description: String(w.description).trim() })).filter((w) => w.label)
  if (field === 'Day_Wise_Itinerary_Details')
    return (Array.isArray(value) ? value : []).map((d) => ({ ...d, title: String(d.title).trim(), description: String(d.description).trim(), activities: (d.activities || []).map((a: string) => a.trim()).filter(Boolean) }))
  if (field === 'SEO_Keywords') return String(value ?? '').split(',').map((k) => k.trim()).filter(Boolean).join(', ')
  return typeof value === 'string' ? value.trim() : value
}
