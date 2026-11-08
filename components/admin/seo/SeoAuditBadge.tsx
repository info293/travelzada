'use client'

/** SEO score pill for a package row. Click → list of issues (+ optional "Fix with AI"). */
import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cx } from '@/components/admin/ui'
import { gradeLabel, type PackageAudit, type SeoSeverity } from '@/lib/seo/packageAudit'

const PILL = { good: 'bg-emerald-50 text-emerald-700 border-emerald-200', fix: 'bg-amber-50 text-amber-800 border-amber-200', poor: 'bg-red-50 text-red-700 border-red-200' }
const DOT: Record<SeoSeverity, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-gray-300' }

export default function SeoAuditBadge({ audit, onFix, fixDisabled }: { audit?: PackageAudit; onFix?: () => void; fixDisabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    const onScroll = (e: Event) => ref.current && !ref.current.contains(e.target as Node) && close()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])
  const toggle = () => {
    // Fixed position so the table's overflow container never clips the popover
    const r = ref.current?.getBoundingClientRect()
    if (r) {
      const width = 320
      const below = window.innerHeight - r.bottom > 300
      setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), top: below ? r.bottom + 6 : Math.max(8, r.top - 306) })
    }
    setOpen((o) => !o)
  }
  if (!audit) return <span className="text-xs text-gray-400">—</span>

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={toggle}
        title={`${gradeLabel(audit.grade)} — ${audit.issues.length} issue${audit.issues.length === 1 ? '' : 's'}`}
        className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums', PILL[audit.grade])}
      >
        {audit.score}
        {audit.similarity[0] && audit.similarity[0].score >= 0.3 && <span className="font-semibold">· dup</span>}
      </button>
      {open && (
        <div style={{ top: pos.top, left: pos.left }} className="fixed z-[55] w-80 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xl">
          <p className="text-sm font-semibold text-gray-900">
            SEO score {audit.score}/100 · <span className={audit.grade === 'good' ? 'text-emerald-700' : audit.grade === 'fix' ? 'text-amber-700' : 'text-red-700'}>{gradeLabel(audit.grade)}</span>
          </p>
          {audit.issues.length ? (
            <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
              {audit.issues.map((i, k) => (
                <li key={i.id + k} className="flex gap-2 text-xs text-gray-700">
                  <span className={cx('mt-1 h-2 w-2 shrink-0 rounded-full', DOT[i.severity])} />
                  {i.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-gray-500">No issues found.</p>
          )}
          {onFix && audit.grade !== 'good' && (
            <button
              type="button"
              disabled={fixDisabled}
              onClick={() => {
                setOpen(false)
                onFix()
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-bordeaux-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-bordeaux-700 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" /> Fix with AI
            </button>
          )}
        </div>
      )}
    </div>
  )
}
