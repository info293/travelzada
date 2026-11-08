'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { Crown } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSION_LABELS, type PermissionKey } from '@/lib/admin/nav'
import { roleLabel, type TeamUser } from '@/components/admin/UsersSection'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, formatDate } from '@/components/admin/ui'

interface UserData extends TeamUser {
  phoneNumber?: string
  address?: string
}

export default function UserDetailsPage() {
  const params = useParams()
  const id = String(params?.id || '')
  const { currentUser, isAdmin } = useAuth()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', id))
        if (userDoc.exists()) setUser({ id: userDoc.id, ...userDoc.data() } as UserData)
        else setError('User not found')
      } catch (err) {
        console.error('Error fetching user:', err)
        setError('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [id])

  const isSelf = user?.id === currentUser?.uid

  const handleAdminToggle = async () => {
    if (!user) return
    const toAdmin = user.role !== 'admin'
    if (!toAdmin && isSelf) return alert("You can't remove your own admin access.")
    const msg = toAdmin
      ? `Make ${user.email} an admin? Admins can see and change everything.`
      : `Remove admin access from ${user.email}? They will keep only the pages in their permissions.`
    if (!confirm(msg)) return
    setUpdating(true)
    try {
      const role = toAdmin ? 'admin' : 'user'
      await updateDoc(doc(db, 'users', user.id), { role })
      setUser((prev) => (prev ? { ...prev, role } : prev))
    } catch (err) {
      console.error(err)
      alert('Failed to update role')
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusChange = async () => {
    if (!user) return
    if (isSelf) return alert("You can't deactivate your own account.")
    const newStatus = user.isActive === false
    if (!confirm(`${newStatus ? 'Activate' : 'Deactivate'} this user?`)) return
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'users', user.id), { isActive: newStatus })
      setUser((prev) => (prev ? { ...prev, isActive: newStatus } : prev))
    } catch (err) {
      console.error(err)
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <Spinner label="Loading user…" />

  if (error || !user) {
    return (
      <Card>
        <EmptyState
          title={error || 'User not found'}
          action={<Link href="/admin/users" className="text-sm font-semibold text-bordeaux-600 hover:underline">Back to Team &amp; Roles</Link>}
        />
      </Card>
    )
  }

  const r = roleLabel(user)
  const active = user.isActive !== false

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={user.displayName || 'No name'}
        description={user.email}
        actions={
          <>
            <Link href="/admin/users" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-2">All people</Link>
            {!isSelf && (
              <Button variant={active ? 'secondary' : 'primary'} loading={updating} onClick={handleStatusChange} className={active ? '!text-red-700' : ''}>
                {active ? 'Deactivate user' : 'Activate user'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-5 mb-6">
              <div className="relative">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-gray-100" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-bordeaux-50 text-bordeaux-700 flex items-center justify-center text-2xl font-bold border-4 border-gray-100">
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-white ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={r.tone}>{user.role === 'admin' && <Crown className="w-3 h-3" />}{r.label}</Badge>
                <Badge tone={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Badge>
                <Badge>ID: {user.id.slice(0, 8)}…</Badge>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              {[
                ['Joined', formatDate(user.createdAt)],
                ['Last login', user.lastLogin ? formatDate(user.lastLogin, true) : 'Never'],
                ['Phone', user.phoneNumber || 'Not provided'],
                ['Address', user.address || 'Not provided'],
                ['Email verified', user.emailVerified ? 'Yes' : 'No'],
                ['Account type', user.role || 'user'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{k}</dt>
                  <dd className="text-gray-900 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Dashboard access</h3>
            {user.role === 'admin' ? (
              <p className="text-sm text-gray-600">Admin: can open every page.</p>
            ) : user.permissions?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.map((p) => <Badge key={p} tone="blue">{PERMISSION_LABELS[p as PermissionKey] || p}</Badge>)}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No dashboard access.</p>
            )}
            <p className="text-xs text-gray-500 mt-3">Change roles and pages from <Link href="/admin/users" className="text-bordeaux-600 font-semibold hover:underline">Team &amp; Roles</Link> → Edit access.</p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Account actions</h3>
            {isAdmin ? (
              <div className="space-y-3">
                <Button
                  variant={user.role === 'admin' ? 'secondary' : 'primary'}
                  className="w-full"
                  loading={updating}
                  disabled={isSelf && user.role === 'admin'}
                  onClick={handleAdminToggle}
                >
                  <Crown className="w-4 h-4" /> {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                </Button>
                <p className="text-xs text-gray-500">
                  {isSelf && user.role === 'admin' ? "You can't remove your own admin access." : 'Admins have full access to the dashboard.'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Only admins can change roles.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
