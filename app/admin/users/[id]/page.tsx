'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'

interface UserData {
    id: string
    email: string
    displayName?: string
    photoURL?: string
    role: 'user' | 'admin'
    isActive: boolean
    createdAt: any
    lastLogin: any
    phoneNumber?: string
    address?: string
}

export default function UserDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const { currentUser, loading: authLoading, isAdmin, permissions } = useAuth()
    const [user, setUser] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [updating, setUpdating] = useState(false)

    // Fetch user data
    // Fetch user data
    useEffect(() => {
        const fetchUser = async () => {
            if (!params.id) return

            try {
                const userDoc = await getDoc(doc(db, 'users', params.id as string))
                if (userDoc.exists()) {
                    setUser({ id: userDoc.id, ...userDoc.data() } as UserData)
                } else {
                    setError('User not found')
                }
            } catch (err) {
                console.error('Error fetching user:', err)
                setError('Failed to load user data')
            } finally {
                setLoading(false)
            }
        }

        if (!authLoading) {
            if (!currentUser) {
                router.push('/login')
                return
            }
            if (!isAdmin && !permissions?.includes('users')) {
                router.push('/admin')
                return
            }
            fetchUser()
        }
    }, [params.id, authLoading, currentUser, isAdmin, permissions, router])

    const handleRoleChange = async (newRole: 'user' | 'admin') => {
        if (!user || !user.id) return
        if (!confirm(`Change role to ${newRole}?`)) return

        setUpdating(true)
        try {
            await updateDoc(doc(db, 'users', user.id), { role: newRole })
            setUser(prev => prev ? { ...prev, role: newRole } : null)
            alert('Role updated successfully')
        } catch (err) {
            console.error(err)
            alert('Failed to update role')
        } finally {
            setUpdating(false)
        }
    }

    const handleStatusChange = async () => {
        if (!user || !user.id) return
        const newStatus = !user.isActive
        if (!confirm(`${newStatus ? 'Activate' : 'Deactivate'} this user?`)) return

        setUpdating(true)
        try {
            await updateDoc(doc(db, 'users', user.id), { isActive: newStatus })
            setUser(prev => prev ? { ...prev, isActive: newStatus } : null)
        } catch (err) {
            console.error(err)
            alert('Failed to update status')
        } finally {
            setUpdating(false)
        }
    }

    if (authLoading || loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </main>
        )
    }

    if (error || !user) {
        return (
            <main className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || 'User not found'}</h1>
                    <button onClick={() => router.back()} className="text-primary hover:underline">
                        &larr; Back to Users
                    </button>
                </div>
                <Footer />
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <Header />

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Users List
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
                        <div className="flex gap-3">
                            <button
                                onClick={handleStatusChange}
                                disabled={updating}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${user.isActive
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                            >
                                {user.isActive ? 'Deactivate User' : 'Activate User'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Info Card */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="relative">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName} className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold border-4 border-gray-100">
                                            {(user.displayName || user.email || '?')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <span className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{user.displayName || 'No Name'}</h2>
                                    <p className="text-gray-500">{user.email}</p>
                                    <div className="flex gap-2 mt-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">
                                            ID: {user.id.slice(0, 8)}...
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Joined Date</label>
                                    <p className="text-gray-900 font-medium">{user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'Unknown'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Login</label>
                                    <p className="text-gray-900 font-medium">{user.lastLogin?.toDate ? user.lastLogin.toDate().toLocaleString() : 'Never'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                                    <p className="text-gray-900 font-medium">{user.phoneNumber || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</label>
                                    <p className="text-gray-900 font-medium">{user.address || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Activity / Stats Placeholder */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Log</h3>
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                No recent activity found.
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Account Actions</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Role Management</label>
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(e.target.value as 'user' | 'admin')}
                                        disabled={updating}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Admins have full access to the dashboard.
                                    </p>
                                </div>

                                <hr className="border-gray-100" />

                                <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete Account (Coming Soon)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
