'use client'

/**
 * Right-side drawer that shows an AI SEO rewrite for review. Rendered in a portal above everything (it can be
 * opened from inside the package editor drawer) and its Escape key does not reach the editor underneath.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/admin/ui'
import type { OptimizeResult, SeoField, SeoPatch } from '@/lib/seo/types'
import SeoReviewPanel from './SeoReviewPanel'
import { fieldsIn, pickPatch } from './api'

export default function SeoReviewDrawer({
  open,
  title,
  loading,
  error,
  result,
  before,
  applyLabel = 'Apply selected',
  applying,
  onApply,
  onRetry,
  onClose,
}: {
  open: boolean
  title?: string
  loading?: boolean
  error?: string
  result: OptimizeResult | null
  before: Record<string, any>
  applyLabel?: string
  applying?: boolean
  onApply: (patch: SeoPatch) => void
  onRetry?: () => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<SeoField>>(new Set())
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => setSelected(new Set(result ? fieldsIn(result.patch) : [])), [result])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.stopImmediatePropagation()
      if (!applying) onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, applying, onClose])

  if (!open || !mounted) return null
  const toggle = (f: SeoField, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      if (on) n.add(f)
      else n.delete(f)
      return n
    })

  return createPortal(
    <div className="fixed inset-0 z-[75]">
      <div className="absolute inset-0 bg-gray-900/40" onClick={() => !applying && !loading && onClose()} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2 font-semibold text-gray-900">
            <Sparkles className="h-4 w-4 shrink-0 text-bordeaux-600" />
            <span className="truncate">{title || 'Review SEO & GEO changes'}</span>
          </div>
          <button type="button" onClick={onClose} disabled={applying} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-sm text-gray-600">
              <Loader2 className="h-6 w-6 animate-spin text-bordeaux-600" />
              <p className="font-medium">Rewriting this page so it is unique and easy for Google & AI search to quote…</p>
              <p className="text-xs text-gray-500">Usually 30–90 seconds. Prices, nights, hotels and inclusions are never changed.</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
              {onRetry && <div className="mt-3"><Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button></div>}
            </div>
          ) : result ? (
            <SeoReviewPanel result={result} before={before} selected={selected} onToggle={toggle} />
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-3">
          <p className="text-xs text-gray-500">Only the ticked text fields change. Nothing else in the package is touched.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={applying}>Cancel</Button>
            <Button onClick={() => result && onApply(pickPatch(result.patch, selected))} disabled={!result || loading || !selected.size} loading={applying}>
              {applyLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
