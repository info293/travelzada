'use client'

import { useEffect, useState } from 'react'
import { FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react'
import { Card, cx, formatDate } from '@/components/admin/ui'
import type { AudienceFilters } from '@/lib/whatsapp/broadcasts'
import { listContactLists, type SavedContactList } from './api'

/** "A list you uploaded before": pick a saved list (name · people · date). No numbers are loaded here. */
export default function SavedListPicker({ filters, onChange }: { filters: AudienceFilters; onChange: (patch: Partial<AudienceFilters>) => void }) {
  const [lists, setLists] = useState<SavedContactList[] | null>(null)
  const [state, setState] = useState<{ loading: boolean; error?: string }>({ loading: true })

  const load = async () => {
    setState({ loading: true })
    try {
      const { lists } = await listContactLists()
      setLists(lists)
      setState({ loading: false })
    } catch (e: any) {
      setState({ loading: false, error: e.message || 'Could not load your lists' })
    }
  }
  useEffect(() => {
    load()
  }, [])

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-900">Pick an uploaded list</p>
        <button type="button" onClick={load} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Reload">
          <RefreshCw className={cx('w-4 h-4', state.loading && 'animate-spin')} />
        </button>
      </div>
      {state.loading && !lists ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading lists…
        </div>
      ) : state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : !lists?.length ? (
        <p className="text-sm text-gray-500">No lists yet. Lists are saved automatically when you send a broadcast to an uploaded sheet.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onChange({ listId: l.id })}
              className={cx(
                'w-full text-left rounded-xl border p-3 transition-colors flex items-start gap-3',
                filters.listId === l.id ? 'border-bordeaux-500 bg-bordeaux-50/60 ring-1 ring-bordeaux-300' : 'border-gray-200 hover:border-bordeaux-300'
              )}
            >
              <FileSpreadsheet className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 truncate">{l.name}</span>
                <span className="block text-xs text-gray-500">
                  {l.count.toLocaleString('en-IN')} people · uploaded {formatDate(l.createdAt)}
                  {l.uploadedBy ? ` by ${l.uploadedBy}` : ''}
                </span>
                <span className="block text-xs text-gray-500">
                  {l.messaged > 0 ? `${l.messaged.toLocaleString('en-IN')} already messaged · ${Math.max(0, l.count - l.messaged).toLocaleString('en-IN')} not yet` : 'Nobody messaged yet'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      <label className="mt-3 flex items-center gap-2 text-sm text-gray-800">
        <input type="checkbox" checked={!!filters.notSentOnly} onChange={(e) => onChange({ notSentOnly: e.target.checked })} />
        Only people not messaged from this list yet <span className="text-xs text-gray-500">(e.g. the rest held back by yesterday’s limit)</span>
      </label>
    </Card>
  )
}
