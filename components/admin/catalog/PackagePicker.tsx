'use client'

/** Searchable multi-select of packages, storing their Destination_ID codes (destinations.packageIds). */
import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { SearchInput, cx } from '@/components/admin/ui'
import { packageImage } from './packageUtils'
import type { PackageDraft } from './types'

export default function PackagePicker({
  value,
  onChange,
  packages,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  packages: PackageDraft[]
}) {
  const [q, setQ] = useState('')
  const [onlySelected, setOnlySelected] = useState(false)
  const byCode = useMemo(() => {
    const m = new Map<string, PackageDraft>()
    packages.forEach((p) => p.Destination_ID && m.set(String(p.Destination_ID), p))
    return m
  }, [packages])

  const selected = new Set(value)
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return packages
      .filter((p) => p.Destination_ID)
      .filter((p) => !onlySelected || selected.has(String(p.Destination_ID)))
      .filter((p) => !s || [p.Destination_Name, p.Destination_ID, p.Slug].some((v) => String(v || '').toLowerCase().includes(s)))
      .sort((a, b) => Number(selected.has(String(b.Destination_ID))) - Number(selected.has(String(a.Destination_ID))) || String(a.Destination_Name || '').localeCompare(String(b.Destination_Name || '')))
      .slice(0, 200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, q, onlySelected, value])

  const toggle = (code: string) => onChange(selected.has(code) ? value.filter((v) => v !== code) : [...value, code])
  const missing = value.filter((v) => !byCode.has(v))

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((code) => {
            const p = byCode.get(code)
            return (
              <span key={code} className={cx('inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium', p ? 'bg-bordeaux-50 text-bordeaux-800' : 'bg-amber-50 text-amber-800')} title={p ? code : 'No package has this code'}>
                <span className="truncate">{p?.Destination_Name || code}</span>
                <button type="button" onClick={() => toggle(code)} className="rounded-full p-0.5 hover:bg-white/70" aria-label={`Remove ${code}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
      {missing.length > 0 && <p className="text-xs text-amber-700">{missing.length} linked code{missing.length > 1 ? 's' : ''} no longer match a package (shown in amber). Remove them to tidy up.</p>}

      <div className="flex items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search packages to add…" className="flex-1" />
        <button type="button" onClick={() => setOnlySelected((s) => !s)} className={cx('shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold', onlySelected ? 'border-bordeaux-600 bg-bordeaux-600 text-white' : 'border-gray-300 text-gray-700')}>
          Selected ({value.length})
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200">
        {list.length === 0 && <p className="px-4 py-6 text-center text-xs text-gray-500">No packages found</p>}
        {list.map((p) => {
          const code = String(p.Destination_ID)
          const on = selected.has(code)
          const img = packageImage(p.Primary_Image_URL)
          return (
            <button key={p.id || code} type="button" onClick={() => toggle(code)} className={cx('flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-left last:border-0', on ? 'bg-bordeaux-50/50' : 'hover:bg-gray-50')}>
              <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-bordeaux-600 bg-bordeaux-600 text-white' : 'border-gray-300 bg-white')}>
                {on && <Check className="h-3 w-3" />}
              </span>
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded-lg bg-gray-100 object-cover" />
              ) : (
                <span className="h-8 w-8 shrink-0 rounded-lg bg-gray-100" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{p.Destination_Name || 'Untitled'}</span>
                <span className="block text-[11px] text-gray-500"><span className="font-mono">{code}</span>{p.Duration ? ` · ${p.Duration}` : ''}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
