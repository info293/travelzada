'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { AlertTriangle, ArrowLeft, CalendarClock, Download, Loader2, MessageCircle, Pause, Play, RefreshCw, RotateCcw, UserMinus, XCircle } from 'lucide-react'
import { db } from '@/lib/firebase'
import { Badge, Button, Card, FilterChips, SearchInput, Spinner, Table, Td, Th, cx, exportToCsv, formatDate, inputClass, timeAgo } from '@/components/admin/ui'
import { formatPhone, inboxHref, redactForExport } from '@/lib/admin/privacy'
import { BROADCASTS_COLLECTION, BROADCAST_STATUS_LABEL, RECIPIENT_STATUS_LABEL, type BroadcastStatus, type RecipientStatus } from '@/lib/whatsapp/broadcasts'
import { BroadcastApiError, broadcastAction, getBroadcast, pollStatus, sendBatch, type BroadcastSummary, type RecipientRow } from './api'
import { ProgressBar, statusTone } from './BroadcastList'

const POLL_MS = 30_000
const newRunId = () => `run_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const RECIPIENT_TONE: Record<RecipientStatus, 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple'> = {
  pending: 'gray',
  sending: 'amber',
  sent: 'blue',
  delivered: 'green',
  read: 'purple',
  failed: 'red',
  skipped: 'gray',
}

type Filter = 'all' | RecipientStatus | 'replied'

/**
 * One broadcast: live funnel, the sending loop (runs only while this tab is open), delivery/read/reply polling,
 * and the recipient list. Non-admins never receive phone numbers from the server.
 */
export default function BroadcastDetail({ id, isAdmin, autoSend, onBack }: { id: string; isAdmin: boolean; autoSend?: boolean; onBack: () => void }) {
  const [b, setB] = useState<BroadcastSummary | null>(null)
  const [recipients, setRecipients] = useState<RecipientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [driving, setDriving] = useState(false)
  const [driveNote, setDriveNote] = useState('')
  const [actionBusy, setActionBusy] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [lastPoll, setLastPoll] = useState<number>(0)
  const runId = useRef(newRunId())
  const stopRef = useRef(false)
  const drivingRef = useRef(false)

  const loadRecipients = useCallback(async () => {
    try {
      const data = await getBroadcast(id)
      setRecipients(data.recipients)
      setB((cur) => cur || data.broadcast)
      setLoadError('')
    } catch (e: any) {
      setLoadError(e.message || 'Could not load the broadcast')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Live broadcast doc (status + counts). No phone numbers live on this doc.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, BROADCASTS_COLLECTION, id),
      (s) => s.exists() && setB({ id: s.id, ...(s.data() as any) }),
      () => {}
    )
    loadRecipients()
    return unsub
  }, [id, loadRecipients])

  // ── Sending loop (this tab only)
  const drive = useCallback(async () => {
    if (drivingRef.current) return
    drivingRef.current = true
    stopRef.current = false
    setDriving(true)
    setError('')
    setDriveNote('')
    let batches = 0
    try {
      while (!stopRef.current) {
        let r
        try {
          r = await sendBatch(id, runId.current)
        } catch (e: any) {
          if (e instanceof BroadcastApiError && e.data?.code === 'locked') {
            setDriveNote('Someone else (or another tab) is sending this broadcast right now.')
            break
          }
          setError([e.message, e.hint].filter(Boolean).join(' '))
          break
        }
        batches++
        if (r.error) setError([r.error, r.hint].filter(Boolean).join(' '))
        if (r.processed || batches % 3 === 0) loadRecipients()
        if (r.done || r.stopped || r.status !== 'sending') break
        if (r.backoffMs) {
          setDriveNote(`WhatsApp asked us to slow down — continuing in ${Math.round(r.backoffMs / 1000)} s…`)
          await sleep(r.backoffMs)
          setDriveNote('')
        }
      }
    } finally {
      drivingRef.current = false
      setDriving(false)
      loadRecipients()
    }
  }, [id, loadRecipients])

  // Start driving right after creation / when asked
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoSend && !autoStarted.current && b?.status === 'sending') {
      autoStarted.current = true
      drive()
    }
  }, [autoSend, b?.status, drive])

  // Scheduled: start when the time comes, while this page is open
  useEffect(() => {
    if (!b || b.status !== 'draft' || !b.scheduledAt || b.preparing) return
    const due = Date.parse(b.scheduledAt) - Date.now()
    const t = setTimeout(async () => {
      try {
        await broadcastAction(id, 'start', { confirmCount: b.counts.total - b.counts.skipped })
        drive()
      } catch (e: any) {
        setError([e.message, e.hint].filter(Boolean).join(' '))
      }
    }, Math.max(0, Math.min(due, 2 ** 31 - 1)))
    return () => clearTimeout(t)
  }, [b?.status, b?.scheduledAt, b?.preparing, id, drive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop the loop when leaving the page; warn before closing the tab while sending
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!drivingRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      stopRef.current = true
    }
  }, [])

  // ── Delivery / read / reply polling while open
  const sentCount = b?.counts?.sent || 0
  useEffect(() => {
    if (!sentCount) return
    let cancelled = false
    const tick = async () => {
      if (document.hidden) return
      try {
        const r = await pollStatus(id)
        if (!cancelled) {
          setLastPoll(Date.now())
          if (r.updated) loadRecipients()
        }
      } catch {
        /* next tick */
      }
    }
    tick()
    const t = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [id, sentCount > 0, loadRecipients]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: string, extra: Record<string, any> = {}, thenDrive = false) => {
    setActionBusy(action)
    setError('')
    try {
      await broadcastAction(id, action, extra)
      if (action === 'pause' || action === 'cancel') stopRef.current = true
      await loadRecipients()
      if (thenDrive) drive()
    } catch (e: any) {
      setError([e.message, e.hint].filter(Boolean).join(' '))
    } finally {
      setActionBusy('')
    }
  }

  const counts = b?.counts
  const toSend = counts ? counts.total - counts.skipped : 0
  const lockFresh = (b?.lockUntil || 0) > Date.now()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recipients.filter((r) => {
      if (filter === 'replied' ? !r.repliedAt : filter !== 'all' && r.status !== filter) return false
      return !q || `${r.name} ${r.destination || ''} ${r.phone || ''}`.toLowerCase().includes(q)
    })
  }, [recipients, filter, search])

  const chipCounts = useMemo(() => {
    const c: Record<string, number> = { all: recipients.length, replied: 0 }
    for (const r of recipients) {
      c[r.status] = (c[r.status] || 0) + 1
      if (r.repliedAt) c.replied++
    }
    return c
  }, [recipients])

  const exportCsv = () => {
    const rows = recipients.map((r) => ({
      name: r.name,
      ...(isAdmin ? { phone: r.phone || '' } : {}),
      status: RECIPIENT_STATUS_LABEL[r.status],
      sentAt: r.sentAt || '',
      deliveredAt: r.deliveredAt || '',
      readAt: r.readAt || '',
      repliedAt: r.repliedAt || '',
      error: r.error || r.skipReason || '',
      destination: r.destination || '',
    }))
    exportToCsv(`broadcast-${(b?.name || id).replace(/[^\w-]+/g, '-').slice(0, 40)}.csv`, redactForExport(rows, isAdmin))
  }

  if (loading && !b) return <Spinner label="Loading broadcast…" />
  if (!b) return <p className="text-sm text-red-600">{loadError || 'Broadcast not found.'}</p>

  const funnel = [
    { label: 'People', value: counts!.total, tone: 'bg-gray-400' },
    { label: 'Sent', value: counts!.sent, tone: 'bg-blue-500' },
    { label: 'Delivered', value: counts!.delivered, tone: 'bg-emerald-500' },
    { label: 'Read', value: counts!.read, tone: 'bg-purple-500' },
    { label: 'Replied', value: counts!.replied, tone: 'bg-bordeaux-600' },
  ]
  const status = b.status as BroadcastStatus

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> All broadcasts
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 truncate">{b.name}</h2>
            <Badge tone={statusTone(status)}>{BROADCAST_STATUS_LABEL[status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {b.templateTitle || b.templateName} · {b.audience?.description} · by {b.createdBy?.email || '—'} · {formatDate(b.createdAt, true)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === 'sending' && (driving || lockFresh) && (
            <Button variant="secondary" onClick={() => act('pause')} loading={actionBusy === 'pause'}>
              <Pause className="w-4 h-4" /> Pause
            </Button>
          )}
          {status === 'sending' && !driving && !lockFresh && (
            <Button onClick={drive}>
              <Play className="w-4 h-4" /> Continue sending here
            </Button>
          )}
          {status === 'paused' && (
            <Button onClick={() => act('resume', {}, true)} loading={actionBusy === 'resume'}>
              <Play className="w-4 h-4" /> Resume
            </Button>
          )}
          {['done', 'paused', 'cancelled'].includes(status) && counts!.failed > 0 && (
            <Button variant="secondary" onClick={() => act('retry_failed')} loading={actionBusy === 'retry_failed'}>
              <RotateCcw className="w-4 h-4" /> Retry failed
            </Button>
          )}
          {['draft', 'sending', 'paused'].includes(status) && (
            <Button
              variant="ghost"
              onClick={() => window.confirm('Cancel this broadcast? People who have not been messaged yet will not get it.') && act('cancel')}
              loading={actionBusy === 'cancel'}
            >
              <XCircle className="w-4 h-4" /> Cancel
            </Button>
          )}
          <Button variant="ghost" onClick={exportCsv} disabled={!recipients.length}>
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Banners */}
      {(driving || (status === 'sending' && lockFresh)) && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          <div>
            <p className="font-semibold">{driving ? 'Sending — keep this tab open.' : 'Being sent from another tab.'}</p>
            <p className="text-xs">About one message per second. You can pause any time; nobody gets the message twice.</p>
          </div>
        </div>
      )}
      {status === 'sending' && !driving && !lockFresh && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>Sending stopped because the tab that was sending was closed. Press <strong>Continue sending here</strong> to finish.</p>
        </div>
      )}
      {driveNote && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{driveNote}</p>}
      {b.pausedReason && status === 'paused' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{b.pausedReason}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {status === 'draft' && (
        <Card>
          {b.scheduledAt ? (
            <p className="flex items-center gap-2 text-sm text-gray-800">
              <CalendarClock className="w-4 h-4 text-bordeaux-600" />
              Scheduled for <strong>{formatDate(b.scheduledAt, true)}</strong>. It starts then only if this page is open somewhere — or send now:
            </p>
          ) : (
            <p className="text-sm text-gray-800">This broadcast hasn&apos;t been sent yet.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              className={cx(inputClass, 'max-w-[200px]')}
              inputMode="numeric"
              placeholder={`Type ${toSend} to confirm`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.replace(/\D/g, ''))}
            />
            <Button disabled={Number(confirmText) !== toSend || !!b.preparing} loading={actionBusy === 'start'} onClick={() => act('start', { confirmCount: toSend }, true)}>
              <Play className="w-4 h-4" /> Send now to {toSend} people
            </Button>
          </div>
        </Card>
      )}

      {/* Funnel */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Progress</p>
          <p className="text-xs text-gray-500 inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> {lastPoll ? `Delivery checked ${timeAgo(lastPoll)}` : 'Delivery is checked every 30 s while this page is open'}
          </p>
        </div>
        <ProgressBar counts={counts!} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {funnel.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{f.label}</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900">{f.value.toLocaleString('en-IN')}</p>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                <div className={cx('h-1.5 rounded-full', f.tone)} style={{ width: `${counts!.total ? Math.round((f.value / counts!.total) * 100) : 0}%` }} />
              </div>
              <p className="text-[11px] text-gray-500">{counts!.total ? Math.round((f.value / counts!.total) * 100) : 0}%</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {counts!.failed} failed · {counts!.skipped} skipped
          {b.audience?.skipped && ` · ${b.audience.skipped.noNumber + b.audience.skipped.invalid + b.audience.skipped.duplicates + b.audience.skipped.optedOut} left out when the list was made (no number / duplicates / opted out)`}
        </p>
      </Card>

      {/* Recipients */}
      <Card padded={false}>
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <FilterChips<Filter>
            value={filter}
            onChange={setFilter}
            options={(['all', 'pending', 'sent', 'delivered', 'read', 'replied', 'failed', 'skipped'] as Filter[]).map((f) => ({
              value: f,
              label: f === 'all' ? 'All' : f === 'replied' ? 'Replied' : RECIPIENT_STATUS_LABEL[f as RecipientStatus],
              count: chipCounts[f] || 0,
            }))}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name" className="md:w-64" />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              {isAdmin && <Th>Number</Th>}
              <Th>Status</Th>
              <Th>Sent</Th>
              <Th>Replied</Th>
              <Th>Details</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 1000).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/60">
                <Td>
                  <p className="font-medium text-gray-900">{r.name || 'No name'}</p>
                  {r.destination && <p className="text-xs text-gray-500">{r.destination}</p>}
                </Td>
                {isAdmin && <Td className="tabular-nums whitespace-nowrap">{r.phone ? formatPhone(r.phone) : '—'}</Td>}
                <Td>
                  <Badge tone={RECIPIENT_TONE[r.status]}>{RECIPIENT_STATUS_LABEL[r.status]}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-xs">{r.sentAt ? timeAgo(r.sentAt) : '—'}</Td>
                <Td className="whitespace-nowrap text-xs">{r.repliedAt ? <Badge tone="wine">Replied {timeAgo(r.repliedAt)}</Badge> : '—'}</Td>
                <Td className="text-xs max-w-sm">
                  {r.status === 'failed' ? (
                    <div>
                      <p className="text-red-700">{r.error}</p>
                      {r.errorHint && <p className="text-gray-500 mt-0.5">{r.errorHint}</p>}
                      {r.interrupted && <p className="text-amber-700 mt-0.5">Not retried automatically — check the chat first.</p>}
                    </div>
                  ) : r.status === 'skipped' ? (
                    <span className="text-gray-500">{r.skipReason || 'Skipped'}</span>
                  ) : r.readAt ? (
                    <span className="text-gray-500">Read {timeAgo(r.readAt)}</span>
                  ) : r.deliveredAt ? (
                    <span className="text-gray-500">Delivered {timeAgo(r.deliveredAt)}</span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="whitespace-nowrap text-right">
                  {(r.refPath || (isAdmin && r.phone)) && r.status !== 'pending' && r.status !== 'skipped' && (
                    <Link
                      href={inboxHref({ ref: r.refPath || undefined, name: r.name, phone: r.refPath ? undefined : r.phone }, isAdmin)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Chat
                    </Link>
                  )}
                  {isAdmin && r.status === 'pending' && ['draft', 'paused', 'sending'].includes(status) && (
                    <button
                      type="button"
                      onClick={() => window.confirm(`Leave ${r.name || 'this person'} out of this broadcast?`) && act('remove_recipient', { recipientId: r.id })}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </Td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <Td className="text-center text-gray-500 py-8">
                  <span>Nobody here.</span>
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
