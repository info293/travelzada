'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import {
  Building2, Users, CheckCircle, XCircle, Clock, ExternalLink, IndianRupee, Ban, RefreshCw, ShieldAlert,
  Trash2, Download, AlertTriangle,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { classifyAgent, classifyUser, type AgentContext, type Classification } from '@/lib/admin/botDetection'
import {
  Badge, Button, Card, Drawer, EmptyState, Field, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow,
  StatusBadge, Table, Td, Th, Toolbar, cx, formatDate, formatINR, inputClass,
} from '@/components/admin/ui'

interface AgentRow {
  id: string
  companyName: string
  contactName: string
  email: string
  agentSlug: string
  phone: string
  fallbackToTravelzada?: boolean
  agencyType: string
  status: string
  subscriptionPlan: string
  commissionRate: number
  totalPackages: number
  liveBookings: number
  totalRevenue: number
  createdAt: any
  adminNotes?: string
  rejectionReason?: string
}

type RawDoc = { id: string; [k: string]: any }

interface BotData {
  agents: RawDoc[]
  users: RawDoc[]
  ctx: AgentContext
}

const EMPTY_CTX: AgentContext = { packages: {}, bookings: {}, customers: {}, subagents: {} }

const countBy = (arr: RawDoc[], key = 'agentId') =>
  arr.reduce<Record<string, number>>((m, x) => {
    const k = x[key]
    if (k) m[k] = (m[k] || 0) + 1
    return m
  }, {})

async function loadBotData(): Promise<BotData> {
  const read = async (name: string) => (await getDocs(collection(db, name))).docs.map((d) => ({ id: d.id, ...d.data() }) as RawDoc)
  const [agents, users, packages, bookings, customers] = await Promise.all([
    read('agents'), read('users'), read('agent_packages'), read('agent_bookings'), read('agent_customers'),
  ])
  const ctx: AgentContext = {
    packages: countBy(packages),
    bookings: countBy(bookings),
    customers: countBy(customers),
    subagents: countBy(users.filter((u) => u.role === 'subagent')),
  }
  return { agents, users, ctx }
}

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended' | 'rejected'

export default function AdminAgentsPage() {
  const { currentUser } = useAuth()

  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [showBots, setShowBots] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [commissionInput, setCommissionInput] = useState('')
  const [rejectionInput, setRejectionInput] = useState('')
  const [actionError, setActionError] = useState('')

  const [botData, setBotData] = useState<BotData | null>(null)
  const [botDataError, setBotDataError] = useState('')
  const [cleanupOpen, setCleanupOpen] = useState(false)

  const fetchAgents = useCallback(async (): Promise<AgentRow[]> => {
    try {
      const res = await fetch('/api/admin/agents')
      const data = await res.json()
      if (data.success) {
        const list: AgentRow[] = data.agents.map((a: any) => ({
          ...a,
          companyName: a.companyName || '',
          contactName: a.contactName || '',
          email: a.email || '',
          agentSlug: a.agentSlug || '',
        }))
        setAgents(list)
        return list
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
    return []
  }, [])

  const fetchBotData = useCallback(async () => {
    try {
      setBotDataError('')
      setBotData(await loadBotData())
    } catch (e: any) {
      console.error('[agents] bot data', e)
      setBotDataError(e?.message || 'Could not load data for bot detection')
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    fetchBotData()
  }, [fetchAgents, fetchBotData])

  const classification = useMemo(() => {
    const map: Record<string, Classification> = {}
    const ctx = botData?.ctx || EMPTY_CTX
    for (const a of agents) map[a.id] = classifyAgent(a, ctx)
    return map
  }, [agents, botData])

  // Until related data has loaded we can't know which agents are protected, so don't flag anyone yet.
  const isBot = (id: string) => !!botData && !!classification[id]?.bot
  const botCount = botData ? agents.filter((a) => classification[a.id]?.bot).length : 0

  const selectedAgent = agents.find((a) => a.id === selectedId) || null

  function openAgent(agent: AgentRow) {
    setSelectedId(agent.id)
    setNotesInput(agent.adminNotes || '')
    setCommissionInput(String(agent.commissionRate || 10))
    setRejectionInput('')
    setActionError('')
  }

  async function performAction(agentId: string, action: string, extra: Record<string, any> = {}) {
    setActionLoading(agentId + action)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, approvedBy: currentUser?.email, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchAgents()
    } catch (e: any) {
      console.error(e)
      setActionError(e?.message || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const visibleAgents = agents.filter((a) => (showBots ? true : !isBot(a.id)))
  const filtered = visibleAgents.filter((a) => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    const q = search.trim().toLowerCase()
    const matchSearch = !q || `${a.companyName} ${a.contactName} ${a.email} ${a.agentSlug}`.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const realAgents = agents.filter((a) => !isBot(a.id))
  const stats = {
    total: realAgents.length,
    active: agents.filter((a) => a.status === 'active').length,
    pending: realAgents.filter((a) => a.status === 'pending').length,
    totalRevenue: agents.reduce((s, a) => s + (a.totalRevenue || 0), 0),
  }

  if (loading) return <Spinner label="Loading agents…" />

  const statusCount = (s: string) => visibleAgents.filter((a) => a.status === s).length

  return (
    <div>
      <PageHeader
        title="Travel Agents"
        description="B2B agents using the white-label planner: approve, suspend and set commission."
        actions={
          <>
            <Button variant="secondary" onClick={() => { fetchAgents(); fetchBotData() }}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            <Button variant={botCount ? 'danger' : 'secondary'} onClick={() => setCleanupOpen((o) => !o)}>
              <ShieldAlert className="w-4 h-4" /> Spam cleanup{botData ? ` (${botCount})` : ''}
            </Button>
          </>
        }
      />

      {cleanupOpen && (
        <SpamCleanupPanel
          botData={botData}
          error={botDataError}
          currentUid={currentUser?.uid}
          onClose={() => setCleanupOpen(false)}
          onDone={async () => { await Promise.all([fetchAgents(), fetchBotData()]) }}
        />
      )}

      <StatRow>
        <StatCard label="Agents" value={stats.total} hint={botCount ? `+${botCount} suspected bots hidden` : undefined} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Active" value={stats.active} tone="green" icon={<CheckCircle className="w-5 h-5" />} onClick={() => setFilterStatus('active')} />
        <StatCard label="Pending approval" value={stats.pending} tone="amber" icon={<Clock className="w-5 h-5" />} onClick={() => setFilterStatus('pending')} />
        <StatCard label="Platform revenue" value={formatINR(stats.totalRevenue)} tone="purple" icon={<IndianRupee className="w-5 h-5" />} />
      </StatRow>

      <Card padded={false}>
        <div className="p-4 border-b border-gray-100">
          <Toolbar>
            <FilterChips<StatusFilter>
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'All', count: visibleAgents.length },
                { value: 'pending', label: 'Pending', count: statusCount('pending') },
                { value: 'active', label: 'Active', count: statusCount('active') },
                { value: 'suspended', label: 'Suspended', count: statusCount('suspended') },
                { value: 'rejected', label: 'Rejected', count: statusCount('rejected') },
              ]}
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 whitespace-nowrap">
                <input type="checkbox" checked={showBots} onChange={(e) => setShowBots(e.target.checked)} className="w-4 h-4 accent-bordeaux-600" />
                Show suspected bots{botCount ? ` (${botCount})` : ''}
              </label>
              <SearchInput value={search} onChange={setSearch} placeholder="Search company, email, slug…" className="sm:w-64" />
            </div>
          </Toolbar>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Building2 className="w-5 h-5" />} title="No agents found" description={!showBots && botCount ? 'Suspected bots are hidden. Tick “Show suspected bots” to include them.' : undefined} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th className="hidden md:table-cell">Planner URL</Th>
                <Th>Status</Th>
                <Th className="hidden lg:table-cell">Bookings</Th>
                <Th className="hidden lg:table-cell">Commission</Th>
                <Th className="hidden lg:table-cell">Joined</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => {
                const bot = isBot(agent.id)
                return (
                  <tr
                    key={agent.id}
                    className={cx('cursor-pointer hover:bg-gray-50', selectedId === agent.id && 'bg-bordeaux-50/50', bot && 'opacity-70')}
                    onClick={() => openAgent(agent)}
                  >
                    <Td>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{agent.companyName || '—'}</p>
                        {bot && <Badge tone="red" className="!font-medium" ><ShieldAlert className="w-3 h-3" /> Suspected bot</Badge>}
                      </div>
                      <p className="text-xs text-gray-500">{agent.contactName} · {agent.email}</p>
                      {bot && <p className="text-[11px] text-red-600 mt-0.5">{classification[agent.id]?.reasons.join(', ')}</p>}
                    </Td>
                    <Td className="hidden md:table-cell">
                      <code className="text-xs text-bordeaux-700 bg-bordeaux-50 px-2 py-0.5 rounded">/tailored-travel/{agent.agentSlug}</code>
                    </Td>
                    <Td>
                      <StatusBadge status={agent.status} />
                      {agent.status === 'pending' && !bot && (
                        <div className="flex gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" className="!px-2 !py-0.5 !bg-emerald-600 hover:!bg-emerald-700" loading={actionLoading === agent.id + 'approve'} disabled={!!actionLoading} onClick={() => performAction(agent.id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="secondary" className="!px-2 !py-0.5" disabled={!!actionLoading} onClick={() => performAction(agent.id, 'reject', { rejectionReason: 'Not meeting requirements' })}>Reject</Button>
                        </div>
                      )}
                    </Td>
                    <Td className="hidden lg:table-cell">{agent.liveBookings || 0}</Td>
                    <Td className="hidden lg:table-cell">{agent.commissionRate || 10}%</Td>
                    <Td className="hidden lg:table-cell whitespace-nowrap text-gray-500">{formatDate(agent.createdAt)}</Td>
                    <Td className="text-right">
                      <a href={`/tailored-travel/${agent.agentSlug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-bordeaux-600" title="Open planner">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Drawer
        open={!!selectedAgent}
        onClose={() => setSelectedId(null)}
        title={selectedAgent ? <span className="flex items-center gap-2">{selectedAgent.companyName}<StatusBadge status={selectedAgent.status} /></span> : ''}
        width="max-w-md"
      >
        {selectedAgent && (
          <div className="space-y-5">
            {isBot(selectedAgent.id) && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Suspected bot: {classification[selectedAgent.id]?.reasons.join(', ')}. Remove it with Spam cleanup.</span>
              </div>
            )}

            <dl className="space-y-1.5 text-sm">
              {[
                ['Contact', selectedAgent.contactName],
                ['Email', selectedAgent.email],
                ['Phone', selectedAgent.phone],
                ['Type', selectedAgent.agencyType?.replace('_', ' ')],
                ['Plan', selectedAgent.subscriptionPlan],
                ['Packages', selectedAgent.totalPackages ?? 0],
                ['Bookings', selectedAgent.liveBookings ?? 0],
                ['Joined', formatDate(selectedAgent.createdAt)],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-900 text-right break-all">{v || '—'}</dd>
                </div>
              ))}
            </dl>

            <hr className="border-gray-100" />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Fallback to Travelzada packages</p>
                <p className="text-xs text-gray-500 mt-0.5">Show our packages if the agent has none</p>
              </div>
              <button
                type="button"
                onClick={() => performAction(selectedAgent.id, 'update', { fallbackToTravelzada: !selectedAgent.fallbackToTravelzada })}
                className={cx('relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors', selectedAgent.fallbackToTravelzada ? 'bg-bordeaux-600' : 'bg-gray-200')}
                aria-pressed={!!selectedAgent.fallbackToTravelzada}
              >
                <span className={cx('inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', selectedAgent.fallbackToTravelzada ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>

            <Field label="Commission rate (%)">
              <div className="flex gap-2">
                <input type="number" value={commissionInput} onChange={(e) => setCommissionInput(e.target.value)} min="0" max="50" className={inputClass} />
                <Button variant="secondary" loading={actionLoading === selectedAgent.id + 'update'} onClick={() => performAction(selectedAgent.id, 'update', { commissionRate: Number(commissionInput) })}>Save</Button>
              </div>
            </Field>

            <Field label="Admin notes">
              <textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} rows={3} placeholder="Internal notes about this agent…" className={inputClass} />
              <Button size="sm" variant="ghost" className="mt-1 !text-bordeaux-600" onClick={() => performAction(selectedAgent.id, 'update', { adminNotes: notesInput })}>Save notes</Button>
            </Field>

            <hr className="border-gray-100" />

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</p>
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}

              {selectedAgent.status === 'pending' && (
                <Button className="w-full !bg-emerald-600 hover:!bg-emerald-700" loading={actionLoading === selectedAgent.id + 'approve'} disabled={!!actionLoading} onClick={() => performAction(selectedAgent.id, 'approve')}>
                  <CheckCircle className="w-4 h-4" /> Approve agent
                </Button>
              )}

              {(selectedAgent.status === 'pending' || selectedAgent.status === 'active') && (
                <div className="space-y-1.5">
                  <input value={rejectionInput} onChange={(e) => setRejectionInput(e.target.value)} placeholder="Rejection reason (optional)" className={inputClass} />
                  <Button variant="secondary" className="w-full !text-red-700 !border-red-200" disabled={!!actionLoading} onClick={() => performAction(selectedAgent.id, 'reject', { rejectionReason: rejectionInput })}>
                    <XCircle className="w-4 h-4" /> Reject application
                  </Button>
                </div>
              )}

              {selectedAgent.status === 'active' && (
                <Button variant="danger" className="w-full" disabled={!!actionLoading} onClick={() => performAction(selectedAgent.id, 'suspend')}>
                  <Ban className="w-4 h-4" /> Suspend agent
                </Button>
              )}

              {(selectedAgent.status === 'suspended' || selectedAgent.status === 'rejected') && (
                <Button className="w-full !bg-emerald-600 hover:!bg-emerald-700" disabled={!!actionLoading} onClick={() => performAction(selectedAgent.id, 'reactivate')}>
                  <CheckCircle className="w-4 h-4" /> Reactivate agent
                </Button>
              )}

              <a
                href={`/tailored-travel/${selectedAgent.agentSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4" /> Preview planner URL
              </a>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

// ─── Spam cleanup ────────────────────────────────────────────────────────────

interface Candidate {
  key: string // "agents/{id}" or "users/{id}"
  collection: 'agents' | 'users'
  id: string
  title: string
  subtitle: string
  reasons: string[]
  raw: RawDoc
}

function SpamCleanupPanel({ botData, error, currentUid, onClose, onDone }: {
  botData: BotData | null
  error: string
  currentUid?: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const candidates = useMemo<Candidate[]>(() => {
    if (!botData) return []
    const { agents, users, ctx } = botData
    const botAgentIds = new Set<string>()
    const list: Candidate[] = []
    for (const a of agents) {
      const c = classifyAgent(a, ctx)
      if (!c.bot || a.id === currentUid) continue // protected agents never get here
      botAgentIds.add(a.id)
      list.push({
        key: `agents/${a.id}`, collection: 'agents', id: a.id,
        title: a.companyName || '(no company)', subtitle: `${a.contactName || '—'} · ${a.email || '—'} · ${a.status || '—'}`,
        reasons: c.reasons, raw: a,
      })
    }
    const keptAgentIds = new Set(agents.filter((a) => !botAgentIds.has(a.id)).map((a) => a.id))
    for (const u of users) {
      if (u.id === currentUid) continue
      const c = classifyUser(u, keptAgentIds)
      if (!c.bot) continue
      list.push({
        key: `users/${u.id}`, collection: 'users', id: u.id,
        title: u.displayName || u.email || u.id, subtitle: `${u.role || 'user'} · ${u.email || '—'} · joined ${formatDate(u.createdAt)}`,
        reasons: c.reasons, raw: u,
      })
    }
    return list
  }, [botData, currentUid])

  const [unchecked, setUnchecked] = useState<Set<string>>(new Set())
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState('')
  const [tab, setTab] = useState<'agents' | 'users'>('agents')

  const selected = candidates.filter((c) => !unchecked.has(c.key))
  const agentCands = candidates.filter((c) => c.collection === 'agents')
  const userCands = candidates.filter((c) => c.collection === 'users')
  const shown = tab === 'agents' ? agentCands : userCands
  const selAgents = selected.filter((c) => c.collection === 'agents').length
  const selUsers = selected.length - selAgents

  const toggle = (key: string) => setUnchecked((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const setAll = (list: Candidate[], on: boolean) => setUnchecked((prev) => {
    const next = new Set(prev)
    list.forEach((c) => (on ? next.delete(c.key) : next.add(c.key)))
    return next
  })

  function downloadBackup(items: Candidate[]) {
    const payload = {
      exportedAt: new Date().toISOString(),
      note: 'Backup of Firestore docs deleted by Admin › Travel Agents › Spam cleanup',
      agents: items.filter((c) => c.collection === 'agents').map((c) => c.raw),
      users: items.filter((c) => c.collection === 'users').map((c) => c.raw),
    }
    const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `spam-cleanup-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  async function deleteSelected() {
    if (confirmText !== 'DELETE' || !selected.length) return
    setBusy(true)
    setResult('')
    const items = [...selected]
    try {
      downloadBackup(items)
      let done = 0
      for (let i = 0; i < items.length; i += 400) {
        const chunk = items.slice(i, i + 400)
        const batch = writeBatch(db)
        chunk.forEach((c) => batch.delete(doc(db, c.collection, c.id)))
        await batch.commit()
        done += chunk.length
        setProgress(`Deleted ${done} of ${items.length}…`)
      }
      setResult(`Deleted ${items.length} docs (${selAgents} agents, ${selUsers} users). A backup JSON was downloaded.`)
      setConfirmText('')
      setUnchecked(new Set())
      await onDone()
    } catch (e: any) {
      console.error('[spam cleanup]', e)
      setResult(`Stopped with an error: ${e?.message || e}. Docs deleted before the error stay deleted; the backup has everything that was selected.`)
      await onDone()
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <Card className="mb-6 border-red-200">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-600" /> Spam cleanup</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Fake sign-ups detected by name/email patterns. Agents that are active or have packages, bookings, customers or sub-agents are
            protected and never listed; admins, team members and sub-agents are never listed. Deleting removes the Firestore
            <code className="mx-1 text-xs">agents</code>/<code className="mx-1 text-xs">users</code> docs only (login accounts stay in Firebase Auth).
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !botData ? (
        <Spinner label="Checking agents and users…" />
      ) : candidates.length === 0 ? (
        <EmptyState title="No suspected bots" description="Nothing to clean up right now." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <FilterChips<'agents' | 'users'>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'agents', label: 'Agent docs', count: agentCands.length },
                { value: 'users', label: 'User docs', count: userCands.length },
              ]}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAll(shown, true)}>Select all</Button>
              <Button size="sm" variant="secondary" onClick={() => setAll(shown, false)}>Select none</Button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
            {shown.length === 0 && <p className="p-4 text-sm text-gray-500">None in this list.</p>}
            {shown.map((c) => (
              <label key={c.key} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={!unchecked.has(c.key)} onChange={() => toggle(c.key)} className="mt-1 w-4 h-4 accent-bordeaux-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900 truncate">{c.title}</span>
                  <span className="block text-xs text-gray-500 truncate">{c.subtitle}</span>
                </span>
                <span className="flex flex-wrap justify-end gap-1 max-w-[45%]">
                  {c.reasons.map((r) => <Badge key={r} tone="red">{r}</Badge>)}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">
              <strong>{selected.length}</strong> selected ({selAgents} agents, {selUsers} users). A JSON backup of the selected docs downloads first.
              Type <strong>DELETE</strong> to confirm.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" className={cx(inputClass, 'sm:w-48')} disabled={busy} />
              <Button variant="danger" loading={busy} disabled={confirmText !== 'DELETE' || !selected.length} onClick={deleteSelected}>
                <Trash2 className="w-4 h-4" /> Delete selected
              </Button>
              <Button variant="secondary" disabled={!selected.length || busy} onClick={() => downloadBackup(selected)}>
                <Download className="w-4 h-4" /> Download backup only
              </Button>
            </div>
            {progress && <p className="mt-2 text-sm text-red-700">{progress}</p>}
          </div>
        </>
      )}
      {result && <p className="mt-3 text-sm font-medium text-gray-800">{result}</p>}
    </Card>
  )
}
