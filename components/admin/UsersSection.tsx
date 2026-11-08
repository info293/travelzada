'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, deleteField, doc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore'
import { Check, Copy, Crown, RefreshCw, ShieldAlert, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { db } from '@/lib/firebase'
import { PERMISSION_LABELS, STAFF_ROLE_PRESETS, type PermissionKey } from '@/lib/admin/nav'
import { classifyUser } from '@/lib/admin/botDetection'
import {
  Badge, Button, Card, Drawer, EmptyState, Field, FilterChips, SearchInput, Table, Td, Th, Toolbar, cx, formatDate,
  inputClass, timeAgo, toMillis,
} from './ui'

/** A `users/{uid}` doc as stored in Firestore (fields vary by how the account was created). */
export interface TeamUser {
  id: string
  email?: string
  displayName?: string
  photoURL?: string
  role?: string // 'user' | 'admin' | 'agent' | 'subagent'
  permissions?: string[]
  staffRole?: string
  isActive?: boolean
  createdAt?: any
  lastLogin?: any
  emailVerified?: boolean
  agentId?: string
  agentStatus?: string
}

interface UsersSectionProps {
  users: TeamUser[]
  fetchUsers: () => Promise<void>
  currentUser: any
  isAdmin: boolean
}

type Segment = 'team' | 'customers' | 'agents'
const ALL_PERMS = Object.keys(PERMISSION_LABELS) as PermissionKey[]
const NO_KEEP = new Set<string>()

export const isTeamMember = (u: TeamUser) => u.role === 'admin' || u.role === 'subagent' || (u.permissions?.length ?? 0) > 0
const segmentOf = (u: TeamUser): Segment => (isTeamMember(u) ? 'team' : u.role === 'agent' ? 'agents' : 'customers')

export function roleLabel(u: TeamUser): { label: string; tone: 'wine' | 'purple' | 'blue' | 'gray' | 'amber' } {
  if (u.role === 'admin') return { label: 'Admin', tone: 'wine' }
  if (u.role === 'subagent') return { label: 'Sub-agent', tone: 'purple' }
  if (u.role === 'agent') return { label: 'Travel agent', tone: 'purple' }
  if (u.permissions?.length) {
    const preset = STAFF_ROLE_PRESETS.find((p) => p.id === u.staffRole)
    if (!preset) return { label: 'Custom access', tone: 'amber' }
    const same = preset.permissions.length === u.permissions.length && preset.permissions.every((p) => u.permissions!.includes(p))
    return { label: same ? preset.label : `${preset.label} (customised)`, tone: 'blue' }
  }
  return { label: 'Customer', tone: 'gray' }
}

const initials = (u: TeamUser) => (u.displayName || u.email || '?').charAt(0).toUpperCase()

function Avatar({ u }: { u: TeamUser }) {
  return u.photoURL ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={u.photoURL} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-bordeaux-50 text-bordeaux-700 flex items-center justify-center text-sm font-bold shrink-0">{initials(u)}</div>
  )
}

export default function UsersSection({ users, fetchUsers, currentUser, isAdmin }: UsersSectionProps) {
  const router = useRouter()
  const [segment, setSegment] = useState<Segment>('team')
  const [search, setSearch] = useState('')
  const [hideBots, setHideBots] = useState(true)
  const [editing, setEditing] = useState<TeamUser | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c = { team: 0, customers: 0, agents: 0 }
    users.forEach((u) => c[segmentOf(u)]++)
    return c
  }, [users])

  const botIds = useMemo(() => {
    // Only website customers are flagged here; agents are checked on the Travel Agents page.
    const s = new Set<string>()
    users.forEach((u) => {
      if (segmentOf(u) === 'customers' && u.id !== currentUser?.uid && classifyUser(u, NO_KEEP).bot) s.add(u.id)
    })
    return s
  }, [users, currentUser?.uid])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => segmentOf(u) === segment)
      .filter((u) => !(segment === 'customers' && hideBots && botIds.has(u.id)))
      .filter((u) => !q || `${u.displayName || ''} ${u.email || ''} ${roleLabel(u).label}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (segment === 'team') {
          const rank = (u: TeamUser) => (u.role === 'admin' ? 0 : u.role === 'subagent' ? 2 : 1)
          if (rank(a) !== rank(b)) return rank(a) - rank(b)
        }
        return toMillis(b.createdAt) - toMillis(a.createdAt)
      })
  }, [users, segment, search, hideBots, botIds])

  const toggleActive = async (u: TeamUser) => {
    if (u.id === currentUser?.uid) return alert("You can't deactivate your own account.")
    if (!confirm(`${u.isActive === false ? 'Activate' : 'Deactivate'} ${u.email}?`)) return
    setBusyId(u.id)
    try {
      await updateDoc(doc(db, 'users', u.id), { isActive: u.isActive === false })
      await fetchUsers()
    } catch (e: any) {
      alert('Error updating status: ' + (e?.message || e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card padded={false}>
        <div className="p-4 border-b border-gray-100">
          <Toolbar>
            <FilterChips<Segment>
              value={segment}
              onChange={setSegment}
              options={[
                { value: 'team', label: 'Team', count: counts.team },
                { value: 'customers', label: 'Customers', count: counts.customers },
                { value: 'agents', label: 'Agents', count: counts.agents },
              ]}
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {segment === 'customers' && botIds.size > 0 && (
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 whitespace-nowrap">
                  <input type="checkbox" checked={hideBots} onChange={(e) => setHideBots(e.target.checked)} className="w-4 h-4 accent-bordeaux-600" />
                  Hide suspected bots ({botIds.size})
                </label>
              )}
              <SearchInput value={search} onChange={setSearch} placeholder="Search name or email…" className="sm:w-64" />
              <Button variant="secondary" onClick={fetchUsers}><RefreshCw className="w-4 h-4" /></Button>
              {isAdmin && <Button onClick={() => setAddOpen(true)}><UserPlus className="w-4 h-4" /> Add team member</Button>}
            </div>
          </Toolbar>
          {segment === 'customers' && (
            <p className="text-xs text-gray-500">People who signed up on the website. Give someone a role to move them to Team.</p>
          )}
          {segment === 'agents' && (
            <p className="text-xs text-gray-500">B2B agent logins. Approve and manage agents on the <Link href="/admin/agents" className="text-bordeaux-600 font-semibold hover:underline">Travel Agents</Link> page.</p>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Users className="w-5 h-5" />} title={search ? 'No one matches your search' : segment === 'team' ? 'No team members yet' : 'Nobody here yet'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>{segment === 'agents' ? 'Agent status' : 'Role'}</Th>
                {segment === 'team' && <Th className="hidden lg:table-cell">Access</Th>}
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Joined</Th>
                <Th className="hidden md:table-cell">Last login</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const r = roleLabel(u)
                const me = u.id === currentUser?.uid
                return (
                  <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/users/${u.id}`)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar u={u} />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {u.displayName || <span className="text-gray-400 font-normal">No name</span>}
                            {me && <span className="ml-1.5 text-xs font-normal text-gray-500">(you)</span>}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        {botIds.has(u.id) && <Badge tone="red"><ShieldAlert className="w-3 h-3" /> Suspected bot</Badge>}
                      </div>
                    </Td>
                    <Td>{segment === 'agents' ? <Badge tone={u.agentStatus === 'active' ? 'green' : 'amber'}>{u.agentStatus || 'pending'}</Badge> : <Badge tone={r.tone}>{u.role === 'admin' && <Crown className="w-3 h-3" />}{r.label}</Badge>}</Td>
                    {segment === 'team' && (
                      <Td className="hidden lg:table-cell">
                        {u.role === 'admin' ? <span className="text-xs text-gray-500">Everything</span> : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(u.permissions || []).slice(0, 3).map((p) => <Badge key={p}>{PERMISSION_LABELS[p as PermissionKey]?.split(/[ ,(]/)[0] || p}</Badge>)}
                            {(u.permissions?.length || 0) > 3 && <Badge>+{u.permissions!.length - 3}</Badge>}
                            {!u.permissions?.length && <span className="text-xs text-gray-400">Agent dashboard only</span>}
                          </div>
                        )}
                      </Td>
                    )}
                    <Td><Badge tone={u.isActive === false ? 'red' : 'green'}>{u.isActive === false ? 'Inactive' : 'Active'}</Badge></Td>
                    <Td className="hidden md:table-cell whitespace-nowrap text-gray-500">{formatDate(u.createdAt)}</Td>
                    <Td className="hidden md:table-cell whitespace-nowrap text-gray-500">{u.lastLogin ? timeAgo(u.lastLogin) : 'Never'}</Td>
                    <Td className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && segment !== 'agents' && (
                          <Button size="sm" variant="secondary" onClick={() => setEditing(u)}>
                            {segment === 'team' ? 'Edit access' : 'Give access'}
                          </Button>
                        )}
                        {!me && (
                          <Button size="sm" variant="ghost" loading={busyId === u.id} onClick={() => toggleActive(u)} className={u.isActive === false ? '!text-emerald-700' : '!text-red-600'}>
                            {u.isActive === false ? 'Activate' : 'Deactivate'}
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="bg-bordeaux-50/40 border-bordeaux-100">
        <p className="text-sm font-semibold text-gray-900 mb-1.5">How access works</p>
        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
          <li><strong>Admins</strong> can open everything, including Travel Agents and this page.</li>
          <li>Everyone else only sees the pages their role allows. Pick a ready-made role, then fine-tune the ticks if needed.</li>
          <li>Changes apply the next time the person loads the dashboard.</li>
          <li>To add someone new, they first sign up at <code>/signup</code>; then use <em>Add team member</em>.</li>
        </ul>
      </Card>

      <AccessEditor
        user={editing}
        currentUid={currentUser?.uid}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); await fetchUsers() }}
      />

      <AddMemberDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        users={users}
        onFound={(u) => { setAddOpen(false); setEditing(u) }}
      />
    </div>
  )
}

// ─── Access editor ───────────────────────────────────────────────────────────

function AccessEditor({ user, currentUid, onClose, onSaved }: { user: TeamUser | null; currentUid?: string; onClose: () => void; onSaved: () => Promise<void> }) {
  // Key the inner form by user id so state resets for each person
  return (
    <Drawer open={!!user} onClose={onClose} title={user ? `Access · ${user.displayName || user.email}` : ''} width="max-w-2xl">
      {user && <AccessForm key={user.id} user={user} currentUid={currentUid} onCancel={onClose} onSaved={onSaved} />}
    </Drawer>
  )
}

function AccessForm({ user, currentUid, onCancel, onSaved }: { user: TeamUser; currentUid?: string; onCancel: () => void; onSaved: () => Promise<void> }) {
  const isSelf = user.id === currentUid
  const wasAdmin = user.role === 'admin'
  const [makeAdmin, setMakeAdmin] = useState(wasAdmin)
  const [presetId, setPresetId] = useState<string>(user.staffRole || (user.permissions?.length ? 'custom' : ''))
  const [perms, setPerms] = useState<string[]>(user.permissions || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const preset = STAFF_ROLE_PRESETS.find((p) => p.id === presetId)
  const customised = !!preset && !(preset.permissions.length === perms.length && preset.permissions.every((p) => perms.includes(p)))

  const choosePreset = (id: string) => {
    const p = STAFF_ROLE_PRESETS.find((x) => x.id === id)
    setPresetId(id)
    if (p) setPerms([...p.permissions])
  }
  const togglePerm = (k: string) => setPerms((prev) => (prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k]))

  const toggleAdmin = () => {
    if (makeAdmin && isSelf) {
      setError("You can't remove your own admin access. Ask another admin to do it.")
      return
    }
    if (!makeAdmin && !confirm(`Make ${user.email} an admin? Admins can see and change everything, including team access and agent approvals.`)) return
    if (makeAdmin && !confirm(`Remove admin access from ${user.email}? They will only keep the pages ticked below.`)) return
    setError('')
    setMakeAdmin(!makeAdmin)
  }

  const save = async () => {
    if (isSelf && wasAdmin && !makeAdmin) return setError("You can't remove your own admin access.")
    setSaving(true)
    setError('')
    try {
      const update: Record<string, any> = {
        permissions: perms,
        staffRole: perms.length ? presetId || 'custom' : deleteField(),
      }
      if (makeAdmin && !wasAdmin) update.role = 'admin'
      // Only demote admins back to a normal user; agents / sub-agents keep their role
      if (!makeAdmin && wasAdmin) update.role = 'user'
      await updateDoc(doc(db, 'users', user.id), update)
      await onSaved()
    } catch (e: any) {
      setError(e?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const removeFromTeam = async () => {
    if (isSelf) return setError("You can't remove yourself from the team.")
    if (!confirm(`Remove all dashboard access for ${user.email}?`)) return
    setSaving(true)
    try {
      const update: Record<string, any> = { permissions: [], staffRole: deleteField() }
      if (wasAdmin) update.role = 'user'
      await updateDoc(doc(db, 'users', user.id), update)
      await onSaved()
    } catch (e: any) {
      setError(e?.message || 'Could not save')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Avatar u={user} />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{user.displayName || 'No name'}</p>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
        </div>
        <Badge tone={roleLabel(user).tone} className="ml-auto">{roleLabel(user).label}</Badge>
      </div>

      {/* Admin toggle */}
      <div className={cx('rounded-xl border p-4 flex items-start gap-3', makeAdmin ? 'border-bordeaux-300 bg-bordeaux-50' : 'border-gray-200')}>
        <Crown className={cx('w-5 h-5 mt-0.5 shrink-0', makeAdmin ? 'text-bordeaux-600' : 'text-gray-400')} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Admin</p>
          <p className="text-xs text-gray-500 mt-0.5">Full access to every page, including Travel Agents and Team &amp; Roles.{isSelf && wasAdmin ? ' This is you, so it cannot be turned off here.' : ''}</p>
        </div>
        <button
          type="button"
          onClick={toggleAdmin}
          disabled={isSelf && wasAdmin}
          className={cx('relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-60', makeAdmin ? 'bg-bordeaux-600' : 'bg-gray-200')}
          aria-pressed={makeAdmin}
        >
          <span className={cx('inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', makeAdmin ? 'translate-x-5' : 'translate-x-0')} />
        </button>
      </div>

      <div className={cx(makeAdmin && 'opacity-50 pointer-events-none')}>
        <p className="text-sm font-semibold text-gray-900 mb-2">Role</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {STAFF_ROLE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choosePreset(p.id)}
              className={cx('text-left rounded-xl border p-3 transition-colors', presetId === p.id ? 'border-bordeaux-500 bg-bordeaux-50 ring-2 ring-bordeaux-100' : 'border-gray-200 hover:border-bordeaux-300')}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                {presetId === p.id && <Check className="w-4 h-4 text-bordeaux-600" />}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">{p.description}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPresetId('custom')}
            className={cx('text-left rounded-xl border p-3 transition-colors', presetId === 'custom' ? 'border-bordeaux-500 bg-bordeaux-50 ring-2 ring-bordeaux-100' : 'border-gray-200 hover:border-bordeaux-300')}
          >
            <span className="text-sm font-semibold text-gray-900">Custom</span>
            <span className="block text-xs text-gray-500 mt-0.5">Pick the pages yourself below.</span>
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">Pages they can open {customised && <span className="ml-1 text-xs font-normal text-amber-700">(customised from {preset?.label})</span>}</p>
            <span className="text-xs text-gray-500">{perms.length} selected</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {ALL_PERMS.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={perms.includes(k)} onChange={() => togglePerm(k)} className="w-4 h-4 accent-bordeaux-600" />
                <span className="text-gray-700">{PERMISSION_LABELS[k]}</span>
              </label>
            ))}
          </div>
          {perms.some((p) => !ALL_PERMS.includes(p as PermissionKey)) && (
            <p className="mt-2 text-xs text-gray-500">Also has old keys: {perms.filter((p) => !ALL_PERMS.includes(p as PermissionKey)).join(', ')} (kept as is).</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
        {!isSelf && (isTeamMember(user)) ? (
          <Button variant="ghost" className="!text-red-600" disabled={saving} onClick={removeFromTeam}>Remove all access</Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button loading={saving} onClick={save}><ShieldCheck className="w-4 h-4" /> Save access</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Add team member ─────────────────────────────────────────────────────────

function AddMemberDrawer({ open, onClose, users, onFound }: { open: boolean; onClose: () => void; users: TeamUser[]; onFound: (u: TeamUser) => void }) {
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.travelzada.com'
  const invite = `Hi! I'd like to add you to the Travelzada team dashboard.\n\n1. Create your account at ${origin}/signup using ${email.trim() || 'your work email'}\n2. Reply to me once you're signed up and I'll give you access.\n3. After that, open ${origin}/admin to start.`

  const close = () => {
    setEmail('')
    setNotFound(false)
    setError('')
    onClose()
  }

  const find = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = email.trim()
    if (!raw) return
    setSearching(true)
    setNotFound(false)
    setError('')
    try {
      const local = users.find((u) => (u.email || '').toLowerCase() === raw.toLowerCase())
      if (local) {
        onFound(local)
        setEmail('')
        return
      }
      const variants = Array.from(new Set([raw, raw.toLowerCase()]))
      for (const v of variants) {
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', v), limit(1)))
        if (!snap.empty) {
          const d = snap.docs[0]
          onFound({ id: d.id, ...d.data() } as TeamUser)
          setEmail('')
          return
        }
      }
      setNotFound(true)
    } catch (err: any) {
      setError(err?.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <Drawer open={open} onClose={close} title="Add team member" width="max-w-lg">
      <form onSubmit={find} className="space-y-4">
        <p className="text-sm text-gray-600">Enter the email they signed up with. You&apos;ll then choose their role.</p>
        <Field label="Email">
          <div className="flex gap-2">
            <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setNotFound(false) }} className={inputClass} placeholder="name@example.com" autoFocus />
            <Button type="submit" loading={searching}>Find</Button>
          </div>
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {notFound && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">No account with that email yet</p>
          <p className="text-sm text-amber-800 mt-1">
            Ask them to sign up at <code className="font-semibold">/signup</code> first, then add them here.
            Accounts can only be created by the person themselves.
          </p>
          <p className="text-xs font-semibold text-gray-700 mt-4 mb-1">Invite message</p>
          <textarea readOnly value={invite} rows={6} className={cx(inputClass, 'text-xs bg-white')} />
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => {
              navigator.clipboard?.writeText(invite).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              })
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy message'}
          </Button>
        </div>
      )}
    </Drawer>
  )
}
