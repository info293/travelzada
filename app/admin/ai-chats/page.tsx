'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import AIPlannerChats from '@/components/admin/AIPlannerChats'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AIPlannerChatsPage() {
    const { currentUser, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !currentUser) {
            router.push('/login')
        }
    }, [currentUser, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
        )
    }

    if (!currentUser) return null

    return (
        <>
            <Header />
            <main className="min-h-screen bg-gray-50 pt-4">
                {/* Back to admin */}
                <div className="max-w-6xl mx-auto px-6 mb-2">
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Admin Dashboard
                    </Link>
                </div>
                <AIPlannerChats />
            </main>
        </>
    )
}
