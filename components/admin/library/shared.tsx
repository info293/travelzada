'use client'

/** Small pieces shared by /admin/hotels and /admin/flights */
import type { ReactNode } from 'react'
import { Lock, Star } from 'lucide-react'
import { Badge, cx } from '../ui'
import type { LibrarySource } from '@/lib/library/common'

export const LIBRARY_IMAGE_FOLDER = '/quotes/library'

export function SourceBadge({ source }: { source: LibrarySource }) {
  if (source === 'quote') return <Badge tone="blue">From quotes</Badge>
  if (source === 'package') return <Badge tone="purple">From packages</Badge>
  return <Badge tone="green">Added by staff</Badge>
}

export function Stars({ n, category }: { n: number | null; category?: string }) {
  if (!n) return category ? <span className="text-xs text-gray-500">{category}</span> : <span className="text-xs text-gray-400">—</span>
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" title={`${n}-star`}>
      {Array.from({ length: n }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
      {category && category.toLowerCase() !== `${n}-star` && <span className="ml-1 text-xs text-gray-500">{category}</span>}
    </span>
  )
}

/** Amber box for staff-only data (notes, supplier contact, net rates) */
export function StaffOnlySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"><Lock className="h-3 w-3" /> Only visible in admin</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function FormSection({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('space-y-3', className)}>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export function Thumb({ url, icon }: { url?: string; icon: ReactNode }) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center text-gray-300">{icon}</div>}
    </div>
  )
}

/** Links to the quotes that used a library item */
export function QuoteLinks({ ids, refs }: { ids: string[]; refs: string[] }) {
  if (!ids.length) return <p className="text-xs text-gray-500">Not used in a quote yet.</p>
  // ids and refs are pushed together; after a merge they can drift — then show neutral labels
  if (refs.length !== ids.length) refs = ids.map((id) => id.slice(0, 8))
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.slice().reverse().map((id, i) => (
        <a key={id} href={`/admin/itinerary?quote=${encodeURIComponent(id)}`} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-bordeaux-700 hover:border-bordeaux-300">
          {refs[refs.length - 1 - i] || id.slice(0, 8)}
        </a>
      ))}
    </div>
  )
}

export const selectClass = 'rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bordeaux-200 focus:border-bordeaux-400'
