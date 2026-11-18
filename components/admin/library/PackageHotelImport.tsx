'use client'

/**
 * One-time seed: read packages (Hotel_Examples, Star_Category, Location_Breakup) → preview the hotels that are not
 * in the library yet → import the ticked ones with source 'package'. Nothing is written until "Import" is clicked.
 */
import { useEffect, useRef, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button, Spinner, cx } from '../ui'
import { Modal } from '../catalog/fields'
import { canonicalDestinationSlug, destinationOf } from '../catalog/packageUtils'
import { createHotel, emptyHotelDraft, guessCategory, hotelsFromPackages, type LibraryHotel, type PackageHotelCandidate } from '@/lib/library/hotels'
import { titleCase } from '@/lib/library/common'

export default function PackageHotelImport({ open, onClose, existing, by, onDone }: {
  open: boolean
  onClose: () => void
  existing: LibraryHotel[]
  by: string
  onDone: (n: number) => void
}) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<PackageHotelCandidate[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const existingRef = useRef(existing)
  existingRef.current = existing

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        const [pk, ds] = await Promise.all([getDocs(collection(db, 'packages')), getDocs(collection(db, 'destinations'))])
        const dests = ds.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        const pkgs = pk.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        const where = (p: any) => {
          const d = destinationOf(p, dests)
          if (d) return { destination: d.name || '', country: d.country || '' }
          const slug = canonicalDestinationSlug(p).replace(/-packages$/, '').replace(/-/g, ' ')
          return { destination: titleCase(slug), country: '' }
        }
        const list = hotelsFromPackages(pkgs, existingRef.current, where)
        if (!alive) return
        setRows(list)
        setPicked(new Set(list.filter((r) => !r.exists).map((r) => r.key)))
      } catch (e: any) {
        if (alive) setError(e?.message || 'Could not read packages.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [open])

  const toggle = (k: string) => setPicked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const fresh = rows.filter((r) => !r.exists)

  const run = async () => {
    const list = rows.filter((r) => picked.has(r.key) && !r.exists)
    setBusy(true)
    setError('')
    let n = 0
    try {
      for (const r of list) {
        setProgress(`Importing ${n + 1} of ${list.length}…`)
        await createHotel(emptyHotelDraft({
          name: r.name, city: r.city, destination: r.destination, country: r.country, starRating: r.starRating,
          category: guessCategory(r.name, r.starRating), source: 'package',
          notes: `Imported from package${r.packages.length > 1 ? 's' : ''}: ${r.packages.join(', ')}`,
          tags: ['from-package'],
        }), by)
        n++
      }
      onDone(n)
      onClose()
    } catch (e: any) {
      setError(`${e?.message || 'Import failed'} (imported ${n} before the error)`)
      if (n) onDone(n)
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Import hotels from packages" width="max-w-3xl"
      footer={<>
        {progress && <span className="mr-auto self-center text-xs text-gray-500">{progress}</span>}
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={run} loading={busy} disabled={!Array.from(picked).some((k) => fresh.some((r) => r.key === k))}>
          Import {Array.from(picked).filter((k) => fresh.some((r) => r.key === k)).length} hotel{picked.size === 1 ? '' : 's'}
        </Button>
      </>}>
      {loading ? <Spinner label="Reading packages…" /> : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Found <b>{rows.length}</b> hotel names in the packages&apos; “Hotel examples” — <b>{fresh.length}</b> are not in the library yet.
            Untick anything that isn&apos;t a real hotel (e.g. “Spice Route Cruises”). Stars come from the package&apos;s star category — check them after importing.
          </p>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-2 text-xs">
            <button type="button" className="font-semibold text-bordeaux-700 hover:underline" onClick={() => setPicked(new Set(fresh.map((r) => r.key)))}>Select all new</button>
            <button type="button" className="font-semibold text-gray-600 hover:underline" onClick={() => setPicked(new Set())}>Select none</button>
          </div>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {rows.map((r) => (
              <li key={r.key} className={cx('flex items-start gap-3 px-3 py-2 text-sm', r.exists && 'bg-gray-50 text-gray-400')}>
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-bordeaux-600" disabled={r.exists} checked={!r.exists && picked.has(r.key)} onChange={() => toggle(r.key)} aria-label={`Import ${r.name}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900">{r.name} {r.exists && <span className="ml-1 text-xs font-normal text-gray-500">already in the library</span>}</div>
                  <div className="text-xs text-gray-500">{[r.city || 'city unknown', r.destination, r.starRating ? `${r.starRating}-star` : ''].filter(Boolean).join(' · ')} · {r.packages.slice(0, 3).join(', ')}{r.packages.length > 3 ? ` +${r.packages.length - 3}` : ''}</div>
                </div>
              </li>
            ))}
            {!rows.length && <li className="px-3 py-6 text-center text-sm text-gray-500">No hotel examples found in the packages.</li>}
          </ul>
        </div>
      )}
    </Modal>
  )
}
