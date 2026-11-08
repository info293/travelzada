'use client'

/**
 * Form widgets used by the package and destination editors.
 * Replace the old "paste a JSON array here" textareas with friendly editors.
 */
import { ReactNode, useEffect, useState } from 'react'
import { ChevronDown, GripVertical, Plus, Trash2, X, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react'
import { Button, cx, inputClass } from '@/components/admin/ui'

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span className="mt-1 flex items-start gap-1 text-xs font-medium text-red-600">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      {message}
    </span>
  )
}

/** Field with label, optional hint, error and "Auto" badge. Uses a <div> so it can wrap complex widgets. */
export function FormField({
  label,
  hint,
  error,
  required,
  auto,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  error?: string
  required?: boolean
  auto?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-bordeaux-600">*</span>}
        </span>
        {auto && <span className="rounded bg-gray-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-gray-500">Auto</span>}
      </div>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      <FieldError message={error} />
    </div>
  )
}

export const errorInput = (err?: string) => cx(inputClass, err && 'border-red-400 focus:ring-red-100 focus:border-red-400')

export function SectionTitle({ title, description, right }: { title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      {right}
    </div>
  )
}

/** Collapsed-by-default section for rarely used fields */
export function Collapsible({
  title,
  description,
  defaultOpen = false,
  count,
  children,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  count?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {title}
            {!!count && <span className="rounded-full bg-bordeaux-50 px-1.5 py-px text-[11px] font-semibold text-bordeaux-700">{count}</span>}
          </div>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="space-y-4 border-t border-gray-100 px-4 py-4">{children}</div>}
    </div>
  )
}

/** Chip picker. Single or multi select, with "add your own". */
export function ChipSelect({
  value,
  onChange,
  options,
  multi = false,
  allowCustom = true,
  placeholder = 'Add…',
}: {
  value: string[]
  onChange: (v: string[]) => void
  options: string[]
  multi?: boolean
  allowCustom?: boolean
  placeholder?: string
}) {
  const [custom, setCustom] = useState('')
  const lower = value.map((v) => v.toLowerCase())
  const all = [...options]
  value.forEach((v) => {
    if (!all.some((o) => o.toLowerCase() === v.toLowerCase())) all.push(v)
  })
  const toggle = (opt: string) => {
    const on = lower.includes(opt.toLowerCase())
    if (multi) onChange(on ? value.filter((v) => v.toLowerCase() !== opt.toLowerCase()) : [...value, opt])
    else onChange(on ? [] : [opt])
  }
  const addCustom = () => {
    const v = custom.trim()
    if (!v) return
    if (!lower.includes(v.toLowerCase())) onChange(multi ? [...value, v] : [v])
    setCustom('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {all.map((opt) => {
        const on = lower.includes(opt.toLowerCase())
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cx(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              on ? 'border-bordeaux-600 bg-bordeaux-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-bordeaux-300',
            )}
          >
            {opt}
          </button>
        )
      })}
      {allowCustom && (
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          onBlur={addCustom}
          placeholder={placeholder}
          className="w-24 rounded-full border border-dashed border-gray-300 bg-transparent px-3 py-1 text-xs focus:w-36 focus:border-bordeaux-400 focus:outline-none"
        />
      )}
    </div>
  )
}

/** Yes / No / not set */
export function YesNo({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const v = String(value || '')
  return (
    <div className="inline-flex rounded-xl border border-gray-300 bg-white p-0.5">
      {['Yes', 'No'].map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(v === o ? '' : o)}
          className={cx('rounded-lg px-3 py-1 text-xs font-semibold', v === o ? 'bg-bordeaux-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="inline-flex rounded-xl border border-gray-300 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', value === o.value ? 'bg-bordeaux-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left">
      <span className={cx('relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-bordeaux-600' : 'bg-gray-300')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </button>
  )
}

/**
 * Textarea where each line is one item (string[]). Keeps the raw text while typing so blank
 * lines and trailing spaces don't jump around.
 */
export function LinesInput({ value, onChange, rows = 4, placeholder }: { value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) {
  const joined = value.join('\n')
  const [text, setText] = useState(joined)
  useEffect(() => {
    const cleaned = text.split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
    if (cleaned !== joined) setText(joined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined])
  return (
    <textarea
      value={text}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value)
        onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))
      }}
      className={inputClass}
    />
  )
}

export interface RowField<T> {
  key: keyof T & string
  label: string
  placeholder?: string
  type?: 'text' | 'textarea' | 'lines'
  /** grid column span out of 6 on desktop */
  span?: 1 | 2 | 3 | 4 | 5 | 6
}

const SPAN: Record<number, string> = { 1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-3', 4: 'sm:col-span-4', 5: 'sm:col-span-5', 6: 'sm:col-span-6' }

/** Repeating rows of small objects (FAQs, reviews, itinerary days…) */
export function RowsEditor<T extends Record<string, any>>({
  rows,
  onChange,
  fields,
  empty,
  addLabel = 'Add',
  rowTitle,
  emptyText,
}: {
  rows: T[]
  onChange: (rows: T[]) => void
  fields: RowField<T>[]
  empty: () => T
  addLabel?: string
  rowTitle?: (row: T, i: number) => ReactNode
  emptyText?: string
}) {
  const update = (i: number, patch: Partial<T>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {rows.length === 0 && emptyText && <p className="rounded-xl border border-dashed border-gray-300 px-4 py-5 text-center text-xs text-gray-500">{emptyText}</p>}
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-gray-600">
              <GripVertical className="h-3.5 w-3.5 text-gray-300" />
              <span className="truncate">{rowTitle ? rowTitle(row, i) : `#${i + 1}`}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30" title="Move up">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30" title="Move down">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => remove(i)} className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
            {fields.map((f) => (
              <label key={f.key} className={cx('block', SPAN[f.span || 6])}>
                <span className="mb-0.5 block text-[11px] font-medium text-gray-500">{f.label}</span>
                {f.type === 'textarea' ? (
                  <textarea rows={2} value={String(row[f.key] ?? '')} placeholder={f.placeholder} onChange={(e) => update(i, { [f.key]: e.target.value } as Partial<T>)} className={inputClass} />
                ) : f.type === 'lines' ? (
                  <LinesInput rows={3} value={Array.isArray(row[f.key]) ? row[f.key] : []} placeholder={f.placeholder} onChange={(v) => update(i, { [f.key]: v } as Partial<T>)} />
                ) : (
                  <input value={String(row[f.key] ?? '')} placeholder={f.placeholder} onChange={(e) => update(i, { [f.key]: e.target.value } as Partial<T>)} className={inputClass} />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, empty()])}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-bordeaux-400 hover:text-bordeaux-700"
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  )
}

/** Centered modal (for import + confirm dialogs) */
export function Modal({ open, onClose, title, children, footer, width = 'max-w-2xl' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
      <div className={cx('relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', width)}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0 truncate font-semibold text-gray-900">{title}</div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/** "Are you sure?" dialog */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-sm text-gray-600">{message}</div>
    </Modal>
  )
}
