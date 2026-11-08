'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { Copy, Download, Mail, MailX, RefreshCw, RotateCcw, Trash2, TrendingUp, UserCheck } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Badge, Button, Card, EmptyState, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow, Table, Td, Th, Toolbar,
  cx, exportToCsv, formatDate, inputClass, timeAgo, toMillis,
} from '@/components/admin/ui'
import { fetchNewestFirst, useFlash } from '@/components/admin/content/shared'
import type { Subscriber } from '@/components/admin/content/types'

type Filter = 'all' | 'active' | 'unsubscribed'
const PAGE = 100
const SOURCE_LABELS: Record<string, string> = { blog_page: 'Blog page', footer: 'Footer', homepage: 'Homepage', unknown: 'Unknown' }
const isActive = (s: Subscriber) => s.status !== 'unsubscribed'
const sourceLabel = (s?: string) => SOURCE_LABELS[s || 'unknown'] || String(s).replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export default function AdminSubscribersPage() {
  const { currentUser } = useAuth()
  const [rows, setRows] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [source, setSource] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(PAGE)
  const [busy, setBusy] = useState(false)
  const { flash, Flash } = useFlash()

  const load = useCallback(async () => {
    try {
      const data = await fetchNewestFirst<Omit<Subscriber, 'id'>>('newsletter_subscribers', 'subscribedAt')
      setRows(data.map((d) => ({ ...d, email: d.email || '', status: d.status || 'active', source: d.source || 'unknown' })))
    } catch (e) {
      console.error('Error loading subscribers:', e)
      flash('Could not load subscribers', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [flash])

  useEffect(() => { if (currentUser) load() }, [currentUser, load])


  const counts = useMemo(() => {
    const monthAgo = Date.now() - 30 * 86400000
    return {
      all: rows.length,
      active: rows.filter(isActive).length,
      unsubscribed: rows.filter((s) => !isActive(s)).length,
      recent: rows.filter((s) => toMillis(s.subscribedAt) >= monthAgo).length,
    }
  }, [rows])

  const sources = useMemo(() => Array.from(new Set(rows.map((r) => r.source || 'unknown'))).sort(), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((s) => {
      if (filter === 'active' && !isActive(s)) return false
      if (filter === 'unsubscribed' && isActive(s)) return false
      if (source && (s.source || 'unknown') !== source) return false
      return !q || s.email.toLowerCase().includes(q)
    })
  }, [rows, filter, source, search])

  useEffect(() => { setLimit(PAGE); setSelected(new Set()) }, [filter, source, search])

  const visible = filtered.slice(0, limit)
  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id))
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((s) => s.id)))
  const toggleOne = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const setStatus = async (ids: string[], status: 'active' | 'unsubscribed') => {
    if (!ids.length) return
    setBusy(true)
    const now = new Date().toISOString()
    try {
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db)
        ids.slice(i, i + 400).forEach((id) => batch.update(doc(db, 'newsletter_subscribers', id), status === 'unsubscribed' ? { status, unsubscribedAt: now } : { status }))
        await batch.commit()
      }
      setRows((l) => l.map((s) => (ids.includes(s.id) ? { ...s, status, ...(status === 'unsubscribed' ? { unsubscribedAt: now } : {}) } : s)))
      setSelected(new Set())
      flash(status === 'unsubscribed' ? `${ids.length} unsubscribed` : `${ids.length} re-subscribed`)
    } catch (e) {
      console.error(e)
      flash('Could not update', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (ids: string[]) => {
    if (!ids.length) return
    const label = ids.length === 1 ? rows.find((r) => r.id === ids[0])?.email || 'this subscriber' : `${ids.length} subscribers`
    if (!confirm(`Permanently delete ${label}? Tip: “Unsubscribe” keeps a record so they aren't added back by mistake.`)) return
    setBusy(true)
    try {
      if (ids.length === 1) await deleteDoc(doc(db, 'newsletter_subscribers', ids[0]))
      else {
        for (let i = 0; i < ids.length; i += 400) {
          const batch = writeBatch(db)
          ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, 'newsletter_subscribers', id)))
          await batch.commit()
        }
      }
      setRows((l) => l.filter((s) => !ids.includes(s.id)))
      setSelected(new Set())
      flash(ids.length === 1 ? 'Subscriber deleted' : `${ids.length} deleted`)
    } catch (e) {
      console.error(e)
      flash('Could not delete', 'error')
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    const list = selected.size ? filtered.filter((s) => selected.has(s.id)) : filtered
    if (!list.length) return
    exportToCsv(`newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`, list.map((s) => ({
      Email: s.email,
      Status: s.status,
      Source: sourceLabel(s.source),
      'Subscribed on': formatDate(s.subscribedAt, true),
      'Unsubscribed on': s.unsubscribedAt ? formatDate(s.unsubscribedAt, true) : '',
    })))
  }

  const copyEmails = async () => {
    const list = (selected.size ? filtered.filter((s) => selected.has(s.id)) : filtered.filter(isActive)).map((s) => s.email)
    try {
      await navigator.clipboard.writeText(list.join(', '))
      flash(`${list.length} email${list.length === 1 ? '' : 's'} copied`)
    } catch {
      flash('Could not copy', 'error')
    }
  }

  const selIds = Array.from(selected)

  return (
    <div>
      <PageHeader
        title="Newsletter"
        description="People who subscribed from the website."
        actions={
          <>
            <Button variant="ghost" onClick={() => { setRefreshing(true); load() }} disabled={refreshing}><RefreshCw className={cx('w-4 h-4', refreshing && 'animate-spin')} /> Refresh</Button>
            <Button variant="secondary" onClick={copyEmails} disabled={!filtered.length}><Copy className="w-4 h-4" /> Copy emails</Button>
            <Button onClick={exportCsv} disabled={!filtered.length}><Download className="w-4 h-4" /> Export CSV</Button>
          </>
        }
      />

      <StatRow>
        <StatCard label="Total" value={counts.all} icon={<Mail className="w-5 h-5" />} onClick={() => setFilter('all')} />
        <StatCard label="Active" value={counts.active} tone="green" icon={<UserCheck className="w-5 h-5" />} onClick={() => setFilter('active')} />
        <StatCard label="Last 30 days" value={counts.recent} tone="blue" icon={<TrendingUp className="w-5 h-5" />} hint="new sign-ups" />
        <StatCard label="Unsubscribed" value={counts.unsubscribed} tone="red" icon={<MailX className="w-5 h-5" />} onClick={() => setFilter('unsubscribed')} />
      </StatRow>

      <Toolbar>
        <FilterChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'unsubscribed', label: 'Unsubscribed', count: counts.unsubscribed },
          ]}
        />
        <div className="flex flex-col sm:flex-row gap-2">
          {sources.length > 1 && (
            <select value={source} onChange={(e) => setSource(e.target.value)} className={cx(inputClass, 'sm:w-44')}>
              <option value="">All sources</option>
              {sources.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
            </select>
          )}
          <SearchInput value={search} onChange={setSearch} placeholder="Search email…" className="sm:w-64" />
        </div>
      </Toolbar>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-bordeaux-50 border border-bordeaux-100 px-4 py-2.5">
          <span className="text-sm font-semibold text-bordeaux-800 mr-auto">{selected.size} selected</span>
          <Button size="sm" variant="secondary" onClick={() => setStatus(selIds, 'unsubscribed')} disabled={busy}><MailX className="w-3.5 h-3.5" /> Unsubscribe</Button>
          <Button size="sm" variant="secondary" onClick={() => setStatus(selIds, 'active')} disabled={busy}><RotateCcw className="w-3.5 h-3.5" /> Re-subscribe</Button>
          <Button size="sm" variant="danger" onClick={() => remove(selIds)} disabled={busy}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <Card padded={false}>
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={<Mail className="w-6 h-6" />}
            title={rows.length ? 'No subscribers match' : 'No subscribers yet'}
            description={rows.length ? 'Try a different search or filter.' : 'Sign-ups from the blog newsletter form will appear here.'}
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="w-10"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all" className="rounded border-gray-300 text-bordeaux-600 focus:ring-bordeaux-300" /></Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th className="hidden sm:table-cell">Source</Th>
                  <Th className="hidden md:table-cell">Subscribed</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} className={cx('hover:bg-gray-50/70', selected.has(s.id) && 'bg-bordeaux-50/40')}>
                    <Td><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} aria-label={`Select ${s.email}`} className="rounded border-gray-300 text-bordeaux-600 focus:ring-bordeaux-300" /></Td>
                    <Td>
                      <a href={`mailto:${s.email}`} className="font-medium text-gray-900 hover:text-bordeaux-700 break-all">{s.email}</a>
                      <span className="block md:hidden text-xs text-gray-500 mt-0.5">{timeAgo(s.subscribedAt)}</span>
                    </Td>
                    <Td>{isActive(s) ? <Badge tone="green">Active</Badge> : <Badge tone="red">Unsubscribed</Badge>}</Td>
                    <Td className="hidden sm:table-cell whitespace-nowrap">{sourceLabel(s.source)}</Td>
                    <Td className="hidden md:table-cell whitespace-nowrap text-gray-500" >
                      <span title={formatDate(s.subscribedAt, true)}>{formatDate(s.subscribedAt)}</span>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      {isActive(s) ? (
                        <button type="button" onClick={() => setStatus([s.id], 'unsubscribed')} disabled={busy} title="Unsubscribe" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"><MailX className="w-4 h-4" /></button>
                      ) : (
                        <button type="button" onClick={() => setStatus([s.id], 'active')} disabled={busy} title="Re-subscribe" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"><RotateCcw className="w-4 h-4" /></button>
                      )}
                      <button type="button" onClick={() => remove([s.id])} disabled={busy} title="Delete" className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              <span>Showing {visible.length} of {filtered.length}</span>
              {filtered.length > limit && <Button size="sm" variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>Show more</Button>}
            </div>
          </>
        )}
      </Card>

      <Flash />
    </div>
  )
}
