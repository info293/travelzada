'use client'

/**
 * Small, shared building blocks for every admin page so they all look and behave the same.
 * Brand: wine (#651926). Keep pages simple: PageHeader → (StatRow) → Toolbar → table/cards.
 */
import { ReactNode, useEffect } from 'react'
import { Loader2, Search, X } from 'lucide-react'

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={cx('bg-white rounded-2xl border border-gray-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)]', padded && 'p-5', className)}>{children}</div>
}

type Tone = 'gray' | 'wine' | 'green' | 'amber' | 'red' | 'blue' | 'purple'
const TONES: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700',
  wine: 'bg-bordeaux-50 text-bordeaux-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-purple-50 text-purple-700',
}

export function Badge({ children, tone = 'gray', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', TONES[tone], className)}>{children}</span>
}

/** Maps common status words to a badge colour */
export function statusTone(status?: string): Tone {
  const s = String(status || '').toLowerCase()
  if (['new', 'pending', 'draft', 'unread'].includes(s)) return 'blue'
  if (['contacted', 'follow-up', 'followup', 'quoted', 'sent', 'in-progress', 'reviewing'].includes(s)) return 'amber'
  if (['converted', 'booked', 'confirmed', 'active', 'published', 'paid', 'completed', 'redeemed', 'hired', 'subscribed'].includes(s)) return 'green'
  if (['lost', 'closed', 'rejected', 'cancelled', 'suspended', 'expired', 'spam', 'unsubscribed'].includes(s)) return 'red'
  return 'gray'
}

export function StatusBadge({ status }: { status?: string }) {
  return <Badge tone={statusTone(status)}>{status || '—'}</Badge>
}

export function StatCard({ label, value, hint, icon, tone = 'wine', onClick }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: Tone; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx('text-left bg-white rounded-2xl border border-gray-200/80 p-4 transition-all', onClick && 'hover:border-bordeaux-300 hover:shadow-md cursor-pointer', !onClick && 'cursor-default')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
        {icon && <div className={cx('shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', TONES[tone])}>{icon}</div>}
      </div>
    </button>
  )
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{children}</div>
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-bordeaux-600 text-white hover:bg-bordeaux-700 shadow-sm',
  secondary: 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function Button({ children, variant = 'primary', size = 'md', loading, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        BTN[variant],
        className,
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bordeaux-200 focus:border-bordeaux-400"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

/** Row of filter chips, e.g. status filters with counts */
export function FilterChips<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: string; count?: number }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
            value === o.value ? 'bg-bordeaux-600 text-white border-bordeaux-600' : 'bg-white text-gray-700 border-gray-300 hover:border-bordeaux-300',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cx('ml-1.5', value === o.value ? 'text-bordeaux-100' : 'text-gray-400')}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">{children}</div>
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && <div className="w-12 h-12 rounded-2xl bg-bordeaux-50 text-bordeaux-600 flex items-center justify-center mb-3">{icon}</div>}
      <p className="font-semibold text-gray-900">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-gray-500">
      <Loader2 className="w-5 h-5 animate-spin text-bordeaux-600" />
      {label}
    </div>
  )
}

/** Simple right-side drawer for details / edit forms */
export function Drawer({ open, onClose, title, children, footer, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
      <div className={cx('absolute right-0 top-0 h-full w-full bg-white shadow-2xl flex flex-col', width)}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="font-semibold text-gray-900 min-w-0 truncate">{title}</div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-gray-200 px-5 py-3 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/** Labelled form field wrapper */
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  )
}

export const inputClass = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bordeaux-200 focus:border-bordeaux-400'

/** Table wrapper with consistent header styling. Use <Th>/<Td>. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  )
}
export function Th({ children, className, onClick }: { children?: ReactNode; className?: string; onClick?: () => void }) {
  return <th onClick={onClick} className={cx('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap', onClick && 'cursor-pointer select-none hover:text-gray-800', className)}>{children}</th>
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx('px-4 py-3 border-b border-gray-100 align-top text-gray-700', className)}>{children}</td>
}

/** Format Firestore Timestamp | ISO string | Date | millis into "8 Nov 2026" (or with time) */
export function formatDate(value: any, withTime = false): string {
  if (!value) return '—'
  let d: Date
  if (typeof value?.toDate === 'function') d = value.toDate()
  else if (typeof value?.seconds === 'number') d = new Date(value.seconds * 1000)
  else d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-IN', withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

export function toMillis(value: any): number {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** "2h ago", "3d ago" */
export function timeAgo(value: any): string {
  const ms = toMillis(value)
  if (!ms) return '—'
  const diff = Date.now() - ms
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return formatDate(ms)
}

export const formatINR = (n: any) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/** Quick WhatsApp / call links for an Indian phone number */
export function waLink(phone?: string, text?: string) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const full = digits.length === 10 ? '91' + digits : digits
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function exportToCsv(filename: string, rows: Array<Record<string, any>>) {
  if (!rows.length) return
  const headerSet = new Set<string>()
  rows.forEach((r) => Object.keys(r).forEach((k) => headerSet.add(k)))
  const headers = Array.from(headerSet)
  const esc = (v: any) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
