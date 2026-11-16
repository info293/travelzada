'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { Megaphone, Plus } from 'lucide-react'
import { db } from '@/lib/firebase'
import { Badge, Button, Card, EmptyState, FilterChips, SearchInput, Spinner, StatCard, StatRow, Table, Td, Th, formatDate } from '@/components/admin/ui'
import { BROADCASTS_COLLECTION, BROADCAST_STATUS_LABEL, type BroadcastCounts, type BroadcastStatus } from '@/lib/whatsapp/broadcasts'
import type { BroadcastSummary } from './api'

export const statusTone = (s: BroadcastStatus) =>
  s === 'sending' ? 'blue' : s === 'done' ? 'green' : s === 'paused' ? 'amber' : s === 'cancelled' ? 'red' : 'gray'

/** Stacked bar: read / delivered / sent / failed / skipped out of total */
export function ProgressBar({ counts }: { counts: BroadcastCounts }) {
  const t = Math.max(1, counts.total)
  const seg = [
    { v: counts.read, c: 'bg-purple-500', l: 'Read' },
    { v: counts.delivered - counts.read, c: 'bg-emerald-500', l: 'Delivered' },
    { v: counts.sent - counts.delivered, c: 'bg-blue-500', l: 'Sent' },
    { v: counts.failed, c: 'bg-red-500', l: 'Failed' },
    { v: counts.skipped, c: 'bg-gray-300', l: 'Skipped' },
  ]
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100" title={seg.map((s) => `${s.l}: ${Math.max(0, s.v)}`).join(' · ')}>
      {seg.map((s) => (s.v > 0 ? <div key={s.l} className={s.c} style={{ width: `${(s.v / t) * 100}%` }} /> : null))}
    </div>
  )
}

/** All broadcasts, newest first, with live progress (no phone numbers are stored on these docs). */
export default function BroadcastList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const [rows, setRows] = useState<BroadcastSummary[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | BroadcastStatus>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    return onSnapshot(
      query(collection(db, BROADCASTS_COLLECTION), orderBy('createdAt', 'desc'), limit(200)),
      (s) => {
        setRows(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
        setReady(true)
      },
      (e) => {
        setError(e.message)
        setReady(true)
      }
    )
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(
      (r) => (filter === 'all' || r.status === filter) && (!q || `${r.name} ${r.templateName} ${r.templateTitle || ''} ${r.createdBy?.email || ''}`.toLowerCase().includes(q))
    )
  }, [rows, filter, search])

  const totals = useMemo(() => {
    const since = Date.now() - 30 * 86400000
    const recent = rows.filter((r) => Date.parse(r.createdAt) >= since)
    const sum = (k: keyof BroadcastCounts) => recent.reduce((n, r) => n + (r.counts?.[k] || 0), 0)
    return { count: recent.length, sent: sum('sent'), read: sum('read'), replied: sum('replied') }
  }, [rows])

  if (!ready) return <Spinner label="Loading broadcasts…" />

  return (
    <div>
      <StatRow>
        <StatCard label="Broadcasts (30 days)" value={totals.count} />
        <StatCard label="Messages sent" value={totals.sent.toLocaleString('en-IN')} tone="blue" />
        <StatCard label="Read" value={totals.read.toLocaleString('en-IN')} hint={totals.sent ? `${Math.round((totals.read / totals.sent) * 100)}% of sent` : undefined} tone="purple" />
        <StatCard label="Replied" value={totals.replied.toLocaleString('en-IN')} hint={totals.sent ? `${Math.round((totals.replied / totals.sent) * 100)}% of sent` : undefined} tone="green" />
      </StatRow>

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <FilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: rows.length },
              ...(['sending', 'paused', 'draft', 'done', 'cancelled'] as BroadcastStatus[]).map((s) => ({ value: s, label: BROADCAST_STATUS_LABEL[s], count: rows.filter((r) => r.status === s).length })),
            ]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search broadcasts" className="md:w-64" />
        </div>
        {error ? (
          <p className="p-4 text-sm text-red-600">Could not load broadcasts: {error}</p>
        ) : !filtered.length ? (
          <EmptyState
            icon={<Megaphone className="w-6 h-6" />}
            title={rows.length ? 'No broadcasts match' : 'No broadcasts yet'}
            description="Send one approved WhatsApp template to a list of customers — every message is tracked here and shows in the inbox."
            action={
              <Button onClick={onNew}>
                <Plus className="w-4 h-4" /> New broadcast
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Broadcast</Th>
                <Th>Audience</Th>
                <Th>Created</Th>
                <Th className="min-w-[180px]">Progress</Th>
                <Th className="text-right">Sent</Th>
                <Th className="text-right">Delivered</Th>
                <Th className="text-right">Read</Th>
                <Th className="text-right">Replied</Th>
                <Th className="text-right">Failed</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} onClick={() => onOpen(r.id)} className="cursor-pointer hover:bg-gray-50/70">
                  <Td>
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.templateTitle || r.templateName}</p>
                  </Td>
                  <Td className="text-xs max-w-[220px]">{r.audience?.description || '—'}</Td>
                  <Td className="text-xs whitespace-nowrap">
                    {formatDate(r.createdAt, true)}
                    <p className="text-gray-500">{r.createdBy?.email || '—'}</p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge tone={statusTone(r.status)}>{BROADCAST_STATUS_LABEL[r.status]}</Badge>
                      {r.status === 'draft' && r.scheduledAt && <span className="text-[11px] text-gray-500">for {formatDate(r.scheduledAt, true)}</span>}
                    </div>
                    <ProgressBar counts={r.counts} />
                    <p className="mt-0.5 text-[11px] text-gray-500 tabular-nums">
                      {r.counts.sent + r.counts.failed + r.counts.skipped} / {r.counts.total}
                    </p>
                  </Td>
                  <Td className="text-right tabular-nums">{r.counts.sent}</Td>
                  <Td className="text-right tabular-nums">{r.counts.delivered}</Td>
                  <Td className="text-right tabular-nums">{r.counts.read}</Td>
                  <Td className="text-right tabular-nums">{r.counts.replied}</Td>
                  <Td className="text-right tabular-nums text-red-600">{r.counts.failed || ''}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
