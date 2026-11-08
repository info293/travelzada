'use client'

/**
 * "✨ Fix SEO & GEO with AI" for the package editor. Runs the optimizer on the current draft, shows a
 * before → after review, and hands the ticked fields to `onApply` (the editor merges them into the draft;
 * this component never saves to Firestore).
 */
import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/admin/ui'
import type { OptimizeResult } from '@/lib/seo/types'
import SeoReviewDrawer from './SeoReviewDrawer'
import { runSeoOptimize } from './api'

export default function SeoFixButton({ draft, packageId, onApply }: { draft: Record<string, any>; packageId?: string; onApply: (patch: Record<string, any>) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [before, setBefore] = useState<Record<string, any>>({})
  const abort = useRef<AbortController | null>(null)

  const run = useCallback(async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setOpen(true)
    setLoading(true)
    setError('')
    setResult(null)
    setBefore(draft)
    try {
      const r = await runSeoOptimize(draft, packageId, ctrl.signal)
      if (!ctrl.signal.aborted) setResult(r)
    } catch (e) {
      if (!ctrl.signal.aborted) setError((e as Error)?.message || 'Something went wrong.')
    } finally {
      if (abort.current === ctrl) setLoading(false)
    }
  }, [draft, packageId])

  const close = useCallback(() => {
    abort.current?.abort()
    abort.current = null
    setLoading(false)
    setOpen(false)
  }, [])

  const missingName = !String(draft?.Destination_Name || '').trim()

  return (
    <>
      <Button type="button" variant="secondary" onClick={run} disabled={loading || missingName} title={missingName ? 'Give the package a name first' : 'Rewrite the page text so it is unique and search-friendly'}>
        ✨ Fix SEO & GEO with AI
      </Button>
      <SeoReviewDrawer
        open={open}
        loading={loading}
        error={error}
        result={result}
        before={before}
        applyLabel="Apply selected to form"
        onRetry={run}
        onClose={close}
        onApply={(patch) => {
          onApply(patch)
          setOpen(false)
        }}
      />
    </>
  )
}
