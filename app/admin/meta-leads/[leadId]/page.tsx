'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import LeadCrmDetail from '@/components/admin/meta-crm/LeadCrmDetail'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function MetaLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const { currentUser, loading, isAdmin, permissions } = useAuth()
  const router = useRouter()
  const canViewLeads = isAdmin || permissions.includes('leads')

  useEffect(() => {
    if (loading) return
    if (!currentUser) router.push('/login')
    else if (!canViewLeads) router.push('/admin')
  }, [currentUser, loading, canViewLeads, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!currentUser || !canViewLeads) return null

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-4 pb-12">
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <Link
            href="/admin/meta-leads"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Meta Leads
          </Link>
        </div>
        <div className="max-w-7xl mx-auto px-4">
          <LeadCrmDetail leadId={leadId} />
        </div>
      </main>
    </>
  )
}
