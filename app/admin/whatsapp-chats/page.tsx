'use client'

import { Suspense } from 'react'
import WhatsAppChats from '@/components/admin/WhatsAppChats'
import { Spinner } from '@/components/admin/ui'

/** Live WhatsApp inbox. Auth, permissions and chrome come from app/admin/layout.tsx. */
export default function WhatsAppChatsPage() {
  return (
    // WhatsAppChats reads ?ref=&name= (or admin-only ?phone=) via useSearchParams, which needs a Suspense boundary
    <Suspense fallback={<Spinner label="Loading WhatsApp inbox…" />}>
      <WhatsAppChats />
    </Suspense>
  )
}
