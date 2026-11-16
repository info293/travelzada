'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, PageHeader } from '@/components/admin/ui'
import BroadcastList from './BroadcastList'
import BroadcastWizard from './BroadcastWizard'
import BroadcastDetail from './BroadcastDetail'

/**
 * WhatsApp → Broadcasts. One URL, three views: list (default), `?new=1` (wizard), `?id=<broadcastId>` (detail).
 * The id in the URL is a Firestore id — never a phone number.
 */
export default function BroadcastsPage() {
  const { currentUser, isAdmin } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id')
  const isNew = params.get('new') === '1'
  const autoSend = params.get('send') === '1'
  const go = (q: string) => router.push(`/admin/whatsapp-broadcasts${q ? `?${q}` : ''}`)

  if (!currentUser) return null

  return (
    <div>
      <PageHeader
        title={isNew ? 'New broadcast' : 'WhatsApp broadcasts'}
        description={
          isNew
            ? 'Send one approved template to a list of customers from +91 88900 59568. Every message is tracked and shows in the inbox.'
            : 'Send an approved template to a group of customers and track who got it, read it and replied.'
        }
        actions={
          !isNew && !id ? (
            <Button onClick={() => go('new=1')}>
              <Plus className="w-4 h-4" /> New broadcast
            </Button>
          ) : undefined
        }
      />
      {isNew ? (
        <BroadcastWizard isAdmin={!!isAdmin} onCancel={() => go('')} onCreated={(newId, send) => router.replace(`/admin/whatsapp-broadcasts?id=${newId}${send ? '&send=1' : ''}`)} />
      ) : id ? (
        <BroadcastDetail key={id} id={id} isAdmin={!!isAdmin} autoSend={autoSend} onBack={() => go('')} />
      ) : (
        <BroadcastList onOpen={(bid) => go(`id=${bid}`)} onNew={() => go('new=1')} />
      )}
    </div>
  )
}
