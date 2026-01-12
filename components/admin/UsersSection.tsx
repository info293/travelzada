'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { User } from './types'

interface UsersSectionProps {
    users: User[]
    fetchUsers: () => Promise<void>
    currentUser: any
    isAdmin: boolean
}

type SortField = 'email' | 'displayName' | 'createdAt' | 'role' | 'lastLogin'
type SortDirection = 'asc' | 'desc'

export default function UsersSection({
    users,
    fetchUsers,
    currentUser,
    isAdmin,
}: UsersSectionProps) {
    const router = useRouter()
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    // Permissions Management State
    const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null)
    const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

    const ALL_TABS = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'packages', label: 'Packages' },
        { id: 'blogs', label: 'Blogs' },
        { id: 'destinations', label: 'Destinations' },
        { id: 'users', label: 'Users' },
        { id: 'leads', label: 'Leads' },
        { id: 'contacts', label: 'Contact Messages' },
        { id: 'subscribers', label: 'Newsletter' },
        { id: 'careers', label: 'Careers' },
        { id: 'testimonials', label: 'Testimonials' },
        { id: 'ai-generator', label: 'AI Generator' },
        { id: 'create-itinerary', label: 'Itinerary' },
        { id: 'customer-records', label: 'CRM' },
    ]

    const filteredAndSorted = useMemo(() => {
        let result = [...users]

        if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter)

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(u =>
                u.email.toLowerCase().includes(query) ||
                u.displayName?.toLowerCase().includes(query)
            )
        }

        if (dateFilter !== 'all') {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            result = result.filter(u => {
                const date = new Date(u.createdAt)
                switch (dateFilter) {
                    case 'today': return date >= today
                    case 'week': return date >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                    case 'month': return date >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                    default: return true
                }
            })
        }

        result.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case 'email': cmp = a.email.localeCompare(b.email); break
                case 'displayName': cmp = (a.displayName || '').localeCompare(b.displayName || ''); break
                case 'role': cmp = a.role.localeCompare(b.role); break
                case 'lastLogin': cmp = new Date(a.lastLogin || 0).getTime() - new Date(b.lastLogin || 0).getTime(); break
                default: cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            }
            return sortDirection === 'desc' ? -cmp : cmp
        })

        return result
    }, [users, roleFilter, searchQuery, dateFilter, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('desc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1">{sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : <span className="text-gray-300">↕</span>}</span>
    )

    const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'admin', currentRole: 'user' | 'admin') => {
        if (!userId) {
            alert('User ID is required')
            return
        }

        if (newRole === currentRole) {
            return // No change needed
        }

        if (!confirm(`Are you sure you want to change this user's role from ${currentRole} to ${newRole}?`)) {
            return
        }

        try {
            const userRef = doc(db, 'users', userId)
            await updateDoc(userRef, {
                role: newRole,
            })

            // Refresh users list
            await fetchUsers()

            // If updating own role, show special message
            if (userId === currentUser?.uid) {
                alert(`Your role has been updated to ${newRole}. Please refresh the page or sign out and sign back in for the changes to take effect.`)
            } else {
                alert(`User role updated to ${newRole} successfully!`)
            }
        } catch (error) {
            console.error('Error updating user role:', error)
            alert(`Error updating user role: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleSyncUser = async () => {
        try {
            if (!currentUser) {
                alert('Please log in first to sync your user data.')
                return
            }

            // Create/update current user's document
            const userRef = doc(db, 'users', currentUser.uid)
            await setDoc(userRef, {
                email: currentUser.email,
                displayName: currentUser.displayName || '',
                photoURL: currentUser.photoURL || '',
                role: isAdmin ? 'admin' : 'user',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isActive: true,
            }, { merge: true })

            alert('User document created/updated! Refreshing...')
            fetchUsers()
        } catch (error: any) {
            console.error('Error syncing user:', error)
            alert(`Error syncing user: ${error.message}. Check console for details.`)
        }
    }

    const handleToggleActive = async (user: User) => {
        if (user.id) {
            try {
                await updateDoc(doc(db, 'users', user.id), { isActive: !user.isActive })
                fetchUsers()
            } catch (e) {
                console.error(e);
                alert('Error updating status')
            }
        }
    }

    const handleOpenPermissions = (user: User) => {
        setEditingPermissionsUser(user)
        setSelectedPermissions(user.permissions || [])
        setPermissionsModalOpen(true)
    }

    const handleSavePermissions = async () => {
        if (!editingPermissionsUser?.id) return

        try {
            const userRef = doc(db, 'users', editingPermissionsUser.id)
            await updateDoc(userRef, {
                permissions: selectedPermissions
            })

            await fetchUsers()
            setPermissionsModalOpen(false)
            setEditingPermissionsUser(null)
            alert('Permissions updated successfully')
        } catch (error) {
            console.error('Error updating permissions:', error)
            alert('Error updating permissions')
        }
    }

    const togglePermission = (tabId: string) => {
        setSelectedPermissions(prev =>
            prev.includes(tabId)
                ? prev.filter(p => p !== tabId)
                : [...prev, tabId]
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900">Users ({filteredAndSorted.length}{filteredAndSorted.length !== users.length ? ` of ${users.length}` : ''})</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-48" />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                            </select>
                            <button onClick={fetchUsers} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">🔄 Refresh</button>
                            <button
                                onClick={handleSyncUser}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                            >
                                + Sync Current User
                            </button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>Email <SortIcon field="email" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('displayName')}>Name <SortIcon field="displayName" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('role')}>Role <SortIcon field="role" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>Joined <SortIcon field="createdAt" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lastLogin')}>Last Login <SortIcon field="lastLogin" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSorted.map((user) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/admin/users/${user.id}`)}
                                >
                                    <td className="px-6 py-4">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                                {(user.displayName || user.email)[0].toUpperCase()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                                    <td className="px-6 py-4 text-gray-700">{user.displayName || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>{user.role}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.role === 'admin' ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">All Access</span>
                                            ) : user.permissions && user.permissions.length > 0 ? (
                                                <>
                                                    {user.permissions.slice(0, 2).map(p => (
                                                        <span key={p} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs capitalize">
                                                            {p.replace('-', ' ')}
                                                        </span>
                                                    ))}
                                                    {user.permissions.length > 2 && (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">+{user.permissions.length - 2}</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-gray-400 text-xs">None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={user.role}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    const newRole = e.target.value as 'user' | 'admin'
                                                    handleUpdateUserRole(user.id!, newRole, user.role)
                                                }}
                                                className={`text-xs px-3 py-1.5 border rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                                                    : 'bg-gray-100 text-gray-800 border-gray-300'
                                                    }`}
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleOpenPermissions(user)
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                                >
                                                    Permissions
                                                </button>
                                            )}
                                            {user.id === currentUser?.uid && (
                                                <span className="text-xs text-gray-500 italic">(You)</span>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleToggleActive(user)
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${user.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                                            >
                                                {user.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSorted.length === 0 && (
                        <div className="text-center py-12 text-gray-500">{users.length === 0 ? 'No users yet' : 'No users match your filters'}</div>
                    )}
                </div>
            </div>

            {/* Permissions Modal */}
            {permissionsModalOpen && editingPermissionsUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPermissionsModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Manage Permissions</h3>
                            <button onClick={() => setPermissionsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-1">Editing permissions for:</p>
                                <p className="font-medium text-gray-900">{editingPermissionsUser.email}</p>
                            </div>

                            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                                <p className="text-sm font-semibold text-gray-700">Allowed Tabs:</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {ALL_TABS.map((tab) => (
                                        <label key={tab.id} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.includes(tab.id)}
                                                onChange={() => togglePermission(tab.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{tab.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setPermissionsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSavePermissions}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-semibold mb-2">👤 Role Management:</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Use the dropdown in the "Actions" column to change user roles</li>
                        <li>Users with "Admin" role have full access to all tabs automatically</li>
                        <li>For regular "User" role, click "Permissions" to assign specific tabs (e.g., only Leads or CRM)</li>
                        <li>If you change your own role/permissions, please refresh the page for changes to take effect</li>
                    </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-semibold mb-2">💡 Note:</p>
                    <p className="text-xs text-yellow-700">
                        User documents are created automatically when users sign up. If you signed up before this feature was added,
                        click "Sync Current User" to create your user document. You can also check the browser console (F12) for any errors.
                    </p>
                </div>
            </div>
        </div>
    )
}
