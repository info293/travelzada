'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    collection,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import UsersSection from '@/components/admin/UsersSection'
import type { User } from '@/components/admin/types'

export default function UsersPage() {
    const router = useRouter()
    const { currentUser, loading: authLoading, isAdmin, permissions } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    // Auth & Permission Check
    useEffect(() => {
        if (!authLoading) {
            if (!currentUser) {
                router.push('/login')
                return
            }
            if (!isAdmin && !permissions?.includes('users')) {
                router.push('/admin') // Redirect to admin dashboard if no permission
                return
            }
            // Authorized, fetch users
            fetchUsers()
        }
    }, [currentUser, authLoading, isAdmin, permissions, router])


    const fetchUsers = async () => {
        try {
            const usersRef = collection(db, 'users')
            const q = query(usersRef, orderBy('createdAt', 'desc'))
            const snapshot = await getDocs(q)
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[]
            setUsers(usersData)
        } catch (error) {
            console.error('Error fetching users:', error)
            alert('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    if (authLoading || loading) {
        return (
            <main className="min-h-screen bg-white">
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Users...</p>
                    </div>
                </div>
                <Footer />
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <Header />

            <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/admin')}
                        className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
                    <p className="text-gray-600">Manage all registered users, roles, and account statuses.</p>
                </div>

                <UsersSection
                    users={users}
                    fetchUsers={fetchUsers}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                />
            </div>

            <Footer />
        </main>
    )
}
