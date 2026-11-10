'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, CheckCircle2, ExternalLink, MessageCircle } from 'lucide-react'
import { Badge, Card, EmptyState, cx, timeAgo } from '@/components/admin/ui'
import { useOpenInbox } from '@/lib/admin/privacy'
import type { ActionItem, ActionSource } from './useOverviewData'

const SOURCE_TONE: Record<ActionSource, 'blue' | 'wine' | 'purple' | 'amber' | 'green' | 'gray'> = {
  Meta: 'blue',
  Website: 'wine',
  'AI Planner': 'purple',
  Contact: 'amber',
  WhatsApp: 'green',
  Quote: 'gray',
}

/** "Who to contact now": one list across Meta, website, AI planner, contact form, WhatsApp and stale quotes. */
export default function ActionList({ items, max = 10, metaNote }: { items: ActionItem[]; max?: number; metaNote?: string }) {
  const shown = items.slice(0, max)
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-3">
        <div>
          <h2 className="font-semibold text-gray-900">Who to contact now</h2>
          <p className="text-xs text-gray-500">
            Overdue follow-ups first, then the newest people waiting for a reply
            {items.length > max ? ` · showing ${max} of ${items.length}` : ''}
          </p>
        </div>
        {metaNote && <span className="text-xs text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">{metaNote}</span>}
      </div>
      {!shown.length ? (
        <EmptyState title="All caught up" description="No follow-ups due and nobody waiting for a reply." icon={<CheckCircle2 className="w-5 h-5" />} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {shown.map((it) => <Row key={it.key} it={it} />)}
        </ul>
      )}
      {items.length > max && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3 border-t border-gray-100 text-sm">
          {Array.from(new Set(items.slice(max).map((i) => i.source))).map((s) => (
            <Link key={s} href={MORE_HREF[s]} className="font-semibold text-bordeaux-600 hover:underline inline-flex items-center gap-1">
              More {s} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

const MORE_HREF: Record<ActionSource, string> = {
  Meta: '/admin/meta-leads',
  Website: '/admin/leads',
  'AI Planner': '/admin/leads',
  Contact: '/admin/enquiries',
  WhatsApp: '/admin/whatsapp-chats',
  Quote: '/admin/quotes',
}

function Row({ it }: { it: ActionItem }) {
  const openInbox = useOpenInbox()
  const [busy, setBusy] = useState(false)
  const overdue = it.urgency === 0
  const canChat = !!it.refPath && (it.source === 'WhatsApp' || String(it.phone || '').replace(/\D/g, '').length >= 8)
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <div className={cx('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0', overdue ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700')}>
        {(it.name || '?').charAt(0).toUpperCase()}
      </div>
      <Link href={it.href} className="min-w-0 flex-1 group">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-bordeaux-700">{it.name || 'Unknown'}</p>
          <Badge tone={SOURCE_TONE[it.source]}>{it.source}</Badge>
        </div>
        <p className="text-xs text-gray-500 truncate">{it.snippet || '—'}</p>
        <p className="text-xs mt-0.5">
          <span className={cx('font-semibold', overdue ? 'text-red-600' : 'text-gray-700')}>{it.reasons.join(' · ')}</span>
          {!overdue && it.at ? <span className="text-gray-400"> · {timeAgo(it.at)}</span> : null}
        </p>
      </Link>
      <div className="flex items-center gap-1.5 shrink-0">
        {canChat && it.source !== 'WhatsApp' && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try { await openInbox({ ref: it.refPath, name: it.name }, it.prepare) } finally { setBusy(false) }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            title="Open WhatsApp chat"
          >
            <MessageCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">WhatsApp</span>
          </button>
        )}
        <Link
          href={it.href}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
            it.source === 'WhatsApp' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          )}
          title={it.source === 'WhatsApp' ? 'Reply in the WhatsApp inbox' : 'Open record'}
        >
          {it.source === 'WhatsApp' ? <MessageCircle className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{it.source === 'WhatsApp' ? 'Reply' : 'Open'}</span>
        </Link>
      </div>
    </li>
  )
}
