'use client'

import { staffFetch } from '@/lib/admin/staffFetch'
import { SEO_FIELDS, type OptimizeResult, type SeoField, type SeoPatch } from '@/lib/seo/types'

/** Strip things the API doesn't need (and Firestore Timestamps that don't serialise well). */
function slim(draft: Record<string, any>) {
  const out: Record<string, any> = {}
  Object.entries(draft || {}).forEach(([k, v]) => {
    if (k.startsWith('_') || typeof v === 'function') return
    if (v && typeof v === 'object' && typeof (v as any).toDate === 'function') return
    out[k] = v
  })
  return out
}

/** One AI rewrite (takes ~30–90 s). Nothing is saved. */
export function runSeoOptimize(draft: Record<string, any>, packageId?: string, signal?: AbortSignal): Promise<OptimizeResult> {
  return staffFetch<OptimizeResult>('/api/admin/seo/optimize', { packageId: packageId || draft?.id || undefined, package: slim(draft) }, { signal })
}

export const fieldsIn = (patch: SeoPatch): SeoField[] => SEO_FIELDS.filter((f) => patch[f] !== undefined)

export function pickPatch(patch: SeoPatch, selected: Set<SeoField>): SeoPatch {
  const out: SeoPatch = {}
  fieldsIn(patch).forEach((f) => {
    if (selected.has(f)) out[f] = patch[f]
  })
  return out
}
