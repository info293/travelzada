'use client'

/** "Merge duplicates": pick which of two records to keep; the other's data, usage and quote links move into it. */
import { useEffect, useState, type ReactNode } from 'react'
import { Button, cx } from '../ui'
import { Modal } from '../catalog/fields'

export default function MergeModal<T extends { id: string; usageCount: number }>({ open, items, describe, onClose, onMerge, noun }: {
  open: boolean
  items: [T, T] | null
  describe: (t: T) => ReactNode
  onClose: () => void
  onMerge: (keep: T, drop: T) => Promise<void>
  noun: string
}) {
  const [keepId, setKeepId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (open && items) { setKeepId(items[0].usageCount >= items[1].usageCount ? items[0].id : items[1].id); setError('') }
  }, [open, items])
  if (!items) return null
  const keep = items.find((x) => x.id === keepId) || items[0]
  const drop = items.find((x) => x.id !== keep.id) || items[1]
  const run = async () => {
    setBusy(true)
    setError('')
    try { await onMerge(keep, drop); onClose() } catch (e: any) { setError(e?.message || 'Merge failed.') } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Merge two ${noun}s`} width="max-w-2xl"
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={run} loading={busy}>Merge &amp; delete the other</Button>
      </>}>
      <p className="mb-3 text-sm text-gray-600">Choose the {noun} to <b>keep</b>. Room types, photos, notes, usage and quote links of the other one are added to it, its old name is remembered (future quotes typed with it land here), and then it is <b>deleted</b>. This can&apos;t be undone.</p>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
        {items.map((it) => (
          <label key={it.id} className={cx('block cursor-pointer rounded-2xl border p-3 transition-colors', it.id === keep.id ? 'border-bordeaux-500 bg-bordeaux-50/60' : 'border-gray-200 hover:border-bordeaux-300')}>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <input type="radio" name="keep" checked={it.id === keep.id} onChange={() => setKeepId(it.id)} className="text-bordeaux-600" />
              {it.id === keep.id ? <span className="text-bordeaux-700">Keep this one</span> : <span className="text-red-600">Merge into the other &amp; delete</span>}
            </div>
            {describe(it)}
          </label>
        ))}
      </div>
    </Modal>
  )
}
