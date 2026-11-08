'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import LeadCrmDetail from '@/components/admin/meta-crm/LeadCrmDetail'

/** One Meta lead's CRM record. Auth, permissions and chrome come from app/admin/layout.tsx. */
export default function MetaLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>()
  return (
    <div>
      {/* Detail pages have no sub-tab of their own, so keep a small way back to the list */}
      <Link href="/admin/meta-leads" className="inline-flex items-center gap-1 mb-4 text-sm font-medium text-gray-500 hover:text-bordeaux-700">
        <ChevronLeft className="w-4 h-4" /> All Meta leads
      </Link>
      <LeadCrmDetail leadId={leadId} />
    </div>
  )
}
