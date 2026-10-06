'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, MessageCircle, Send, RefreshCw, MessagesSquare, ChevronDown, ChevronUp } from 'lucide-react'
import {
  CRM_COLLECTION,
  LEAD_MESSAGES_COLLECTION,
  formatDateTime,
  whatsappNumber,
  type CrmRecord,
  type CrmUserRef,
  type LeadMessage,
} from '@/lib/metaLeadsCrm'

interface Item {
  key: string
  channel: 'email' | 'whatsapp'
  direction: 'inbound' | 'outbound'
  at: string
  subject?: string
  text: string
  html?: string
  meta?: string
}

export default function LeadConversation({ record, me }: { record: CrmRecord; me: CrmUserRef | null }) {
  const { currentUser } = useAuth()
  const [emails, setEmails] = useState<LeadMessage[]>([])
  const [whatsapp, setWhatsapp] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const phone = record.phoneNorm || (record.phone ? whatsappNumber(record.phone) : '')
  // In test mode every CRM email goes to the test address instead of the customer
  const [testRecipient, setTestRecipient] = useState<string | null>(null)
  const sendTo = testRecipient || record.email

  useEffect(() => {
    if (!currentUser) return
    currentUser
      .getIdToken()
      .then((t) => fetch('/api/automation/meta-leads', { headers: { Authorization: `Bearer ${t}` } }))
      .then((r) => r.json())
      .then((j) => setTestRecipient(j?.settings?.testRecipient || null))
      .catch(() => undefined)
  }, [currentUser])

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, LEAD_MESSAGES_COLLECTION), where('leadId', '==', record.leadId)), (snap) =>
      setEmails(snap.docs.map((d) => ({ id: d.id, ...(d.data() as LeadMessage) })))
    )
    return () => unsub()
  }, [record.leadId])

  useEffect(() => {
    if (!phone) return
    const unsub = onSnapshot(query(collection(db, 'whatsapp_messages'), where('senderPhone', '==', phone)), (snap) =>
      setWhatsapp(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
    return () => unsub()
  }, [phone])

  // Opening the lead marks its replies as seen
  useEffect(() => {
    if (record.unreadReplies) updateDoc(doc(db, CRM_COLLECTION, record.leadId), { unreadReplies: 0 }).catch(() => undefined)
  }, [record.leadId, record.unreadReplies])

  const items: Item[] = useMemo(() => {
    const e: Item[] = emails.map((m) => ({
      key: `e-${m.id || m.messageId}`,
      channel: 'email',
      direction: m.direction,
      at: m.at,
      subject: m.subject,
      text: m.text,
      html: m.html,
      meta: m.direction === 'outbound' ? `to ${m.to}${m.auto ? ' · automatic' : m.by?.name ? ` · ${m.by.name}` : ''}${m.test ? ' · TEST (not sent to customer)' : ''}` : `from ${m.from}${m.test ? ' · TEST reply' : ''}`,
    }))
    const w: Item[] = whatsapp.map((m) => ({
      key: `w-${m.id}`,
      channel: 'whatsapp',
      direction: m.direction === 'outbound' ? 'outbound' : 'inbound',
      at: m.timestamp || '',
      text: m.text || '',
      meta: m.direction === 'outbound' ? `sent${m.status ? ` · ${m.status}` : ''}` : 'from customer',
    }))
    return [...e, ...w].sort((a, b) => a.at.localeCompare(b.at))
  }, [emails, whatsapp])

  const call = async (key: string, body: Record<string, unknown>, ok: string) => {
    if (!currentUser) return
    setBusy(key)
    setNotice(null)
    try {
      const idToken = await currentUser.getIdToken()
      const res = await fetch('/api/automation/meta-leads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, leadId: record.leadId, by: me }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setNotice(json.skipped ? `Not sent: ${json.skipped}` : ok)
      return true
    } catch (err: any) {
      setNotice(`Error: ${err.message}`)
      return false
    } finally {
      setBusy(null)
    }
  }

  const auto = record.autoEmail

  return (
    <div className="bg-white rounded-xl shadow-lg border border-fuchsia-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-fuchsia-100 bg-fuchsia-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <MessagesSquare className="w-4 h-4 text-fuchsia-600" /> Conversation ({items.length})
        </h3>
        <div className="flex gap-2">
          {sendTo && (
            <button
              onClick={() =>
                (!auto?.sentAt || auto.error || window.confirm('The trip-options email was already sent. Send it again?')) &&
                call('options', { action: 'send', force: true }, `Trip-options email sent to ${sendTo}${testRecipient ? ' (test mode)' : ''}.`)
              }
              disabled={!!busy || !me}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-fuchsia-300 text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" /> {busy === 'options' ? 'Sending…' : auto?.sentAt && !auto.error ? 'Resend options email' : 'Send options email'}
            </button>
          )}
          {phone && (
            <Link
              href={`/admin/whatsapp-chats?phone=${phone}&name=${encodeURIComponent(record.name)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </Link>
          )}
        </div>
      </div>

      <div className="px-5 py-2 text-xs border-b border-gray-100 bg-gray-50 text-gray-600">
        {auto?.error ? (
          <span className="text-red-600">Automatic email failed ({formatDateTime(auto.sentAt)}): {auto.error}</span>
        ) : auto?.sentAt ? (
          <span>
            Trip-options email sent {formatDateTime(auto.sentAt)} to {auto.to}
            {auto.test ? ' (test address)' : ''}.
          </span>
        ) : record.email ? (
          <span>Trip-options email not sent yet.</span>
        ) : (
          <span>This lead has no email address. Use WhatsApp or a call.</span>
        )}
      </div>

      {testRecipient && (
        <div className="px-5 py-2 text-xs font-medium bg-amber-50 border-b border-amber-200 text-amber-800">
          TEST MODE is on: emails from this panel go to {testRecipient}, not to the customer ({record.email || 'no email'}).
        </div>
      )}

      <div className="max-h-[28rem] overflow-y-auto p-5 space-y-3 bg-gray-50/40">
        {items.length === 0 && <p className="text-sm text-gray-500">No emails or WhatsApp messages with this customer yet.</p>}
        {items.map((it) => {
          const out = it.direction === 'outbound'
          const open = openKey === it.key
          return (
            <div key={it.key} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm border ${
                  out
                    ? it.channel === 'email'
                      ? 'bg-fuchsia-50 border-fuchsia-100 rounded-br-sm'
                      : 'bg-emerald-50 border-emerald-100 rounded-br-sm'
                    : 'bg-white border-gray-200 rounded-bl-sm shadow-sm'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
                  {it.channel === 'email' ? <Mail className="w-3 h-3" /> : <MessageCircle className="w-3 h-3 text-emerald-600" />}
                  <span className="font-medium">{out ? 'Travelzada' : record.name || 'Customer'}</span>
                  <span>· {formatDateTime(it.at)}</span>
                  {it.meta && <span className="truncate">· {it.meta}</span>}
                </div>
                {it.subject && <div className="text-xs font-semibold text-gray-800 mb-0.5">{it.subject}</div>}
                <div className={`text-gray-800 whitespace-pre-wrap break-words ${open ? '' : 'line-clamp-6'}`}>{it.text}</div>
                {(it.text.length > 400 || it.text.split('\n').length > 6) && (
                  <button onClick={() => setOpenKey(open ? null : it.key)} className="mt-1 text-[11px] text-fuchsia-700 flex items-center gap-0.5">
                    {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {open ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {sendTo && (
        <div className="p-4 border-t border-gray-100 space-y-2">
          <textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={testRecipient ? `TEST MODE: this goes to ${testRecipient}, not the customer` : `Reply by email to ${record.email}… (sent in the same email thread)`}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{notice}</span>
            <button
              onClick={async () => {
                if (await call('reply', { action: 'reply', text: reply }, `Email sent to ${sendTo}${testRecipient ? ' (test mode)' : ''}.`)) setReply('')
              }}
              disabled={!!busy || !reply.trim() || !me}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50"
            >
              {busy === 'reply' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send email
            </button>
          </div>
        </div>
      )}
      {!sendTo && notice && <p className="px-4 pb-3 text-xs text-gray-500">{notice}</p>}
    </div>
  )
}
