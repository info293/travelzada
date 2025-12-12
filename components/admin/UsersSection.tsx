'use client'

import { useState, useMemo } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { User } from './types'

interface UsersSectionProps {
    users: User[]
    fetchUsers: () => Promise<void>
}

type SortField = 'email' | 'displayName' | 'createdAt' | 'role' | 'lastLogin'
type SortDirection = 'asc' | 'desc'

export default function UsersSection({
    users,
    fetchUsers,
}: UsersSectionProps) {
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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

    const handleToggleRole = async (user: User) => {
        if (!confirm(`Change ${user.email} role to ${user.role === 'admin' ? 'user' : 'admin'}?`)) return
        if (user.id) {
            try {
                await updateDoc(doc(db, 'users', user.id), { role: user.role === 'admin' ? 'user' : 'admin' })
                fetchUsers()
            } catch (e) { console.error(e); alert('Error updating role') }
        }
    }

    const handleToggleActive = async (user: User) => {
        if (user.id) {
            try {
                await updateDoc(doc(db, 'users', user.id), { isActive: !user.isActive })
                fetchUsers()
            } catch (e) { console.error(e); alert('Error updating status') }
        }
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>Joined <SortIcon field="createdAt" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lastLogin')}>Last Login <SortIcon field="lastLogin" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSorted.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
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
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleToggleRole(user)} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-semibold">
                                                {user.role === 'admin' ? 'Demote' : 'Promote'}
                                            </button>
                                            <button onClick={() => handleToggleActive(user)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${user.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
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
        </div>
    )
}
