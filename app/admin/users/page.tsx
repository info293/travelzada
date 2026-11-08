'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { Crown, ShieldCheck, Users, Building2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import UsersSection, { isTeamMember, type TeamUser } from '@/components/admin/UsersSection'
import { PageHeader, Spinner, StatCard, StatRow, toMillis } from '@/components/admin/ui'

export default function UsersPage() {
  const { currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // No orderBy: docs without createdAt would be silently dropped. Sort client-side instead.
  const fetchUsers = useCallback(async () => {
    try {
      setError('')
      const snapshot = await getDocs(collection(db, 'users'))
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamUser)
      list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      setUsers(list)
    } catch (e: any) {
      console.error('Error fetching users:', e)
      setError(e?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const stats = useMemo(() => ({
    admins: users.filter((u) => u.role === 'admin').length,
    staff: users.filter((u) => u.role !== 'admin' && u.role !== 'subagent' && isTeamMember(u)).length,
    customers: users.filter((u) => !isTeamMember(u) && u.role !== 'agent').length,
    agents: users.filter((u) => u.role === 'agent' || u.role === 'subagent').length,
  }), [users])

  return (
    <div>
      <PageHeader title="Team & Roles" description="Who can log in to the dashboard and what each person can open." />
      {loading ? <Spinner label="Loading people…" /> : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <StatRow>
            <StatCard label="Admins" value={stats.admins} icon={<Crown className="w-5 h-5" />} />
            <StatCard label="Staff with a role" value={stats.staff} tone="blue" icon={<ShieldCheck className="w-5 h-5" />} />
            <StatCard label="Website customers" value={stats.customers} tone="gray" icon={<Users className="w-5 h-5" />} />
            <StatCard label="Agents & sub-agents" value={stats.agents} tone="purple" icon={<Building2 className="w-5 h-5" />} />
          </StatRow>
          <UsersSection users={users} fetchUsers={fetchUsers} currentUser={currentUser} isAdmin={isAdmin} />
        </>
      )}
    </div>
  )
}
