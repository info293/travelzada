'use client'

/** WhatsApp → Broadcasts. Auth, permissions and admin chrome come from app/admin/layout.tsx. */
import { Suspense } from 'react'
import { Spinner } from '@/components/admin/ui'
import BroadcastsPage from '@/components/admin/whatsapp/broadcasts/BroadcastsPage'

export default function AdminWhatsAppBroadcastsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BroadcastsPage />
    </Suspense>
  )
}
