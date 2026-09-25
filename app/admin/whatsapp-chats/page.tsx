'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import WhatsAppChats from '@/components/admin/WhatsAppChats'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function WhatsAppChatsPage() {
  const { currentUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login')
    }
  }, [currentUser, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-4 pb-12">
        <div className="max-w-7xl mx-auto px-4 mb-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Loading WhatsApp Inbox...</span>
            </div>
          }
        >
          <WhatsAppChats />
        </Suspense>
      </main>
    </>
  )
}
