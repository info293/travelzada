'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { maskPhone, formatPhone } from '@/lib/admin/privacy'
import { FIRST_CONTACT_TEMPLATES, REOPEN_TEMPLATES } from '@/lib/whatsapp/templateCatalog'
import { missingFields, type HeaderMediaValue, type TemplateValues } from '@/components/admin/whatsapp/templates/TemplateFields'
import InboxView, { type InboxConversation } from '@/components/admin/whatsapp/inbox/InboxView'
import { filterChats, needsReply, type ChatFilter } from '@/components/admin/whatsapp/inbox/ChatList'
import type { StartStep } from '@/components/admin/whatsapp/inbox/StartFlow'
import { realName, recordLink, type LocalMessage, type WhatsAppChat, type WhatsAppMessage } from '@/components/admin/whatsapp/inbox/types'

const H = 60 * 60 * 1000
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

const CHATS: WhatsAppChat[] = [
  { id: '919876543210', phone: '919876543210', customerName: 'Asha Verma', lastMessage: 'Can we add a sunset dinner on day 3?', lastMessageTimestamp: ago(6 * H), lastDirection: 'inbound', unreadCount: 2, channel: 'getgabs', sourceRef: 'meta_lead_crm/abc123' },
  { id: '919812345678', phone: '919812345678', customerName: 'Rohit & Meera', lastMessage: 'Thanks, we will check and get back', lastMessageTimestamp: ago(30 * H), lastDirection: 'inbound', unreadCount: 0, channel: 'getgabs', sourceRef: 'leads/xyz789' },
  { id: '919900112210', phone: '919900112210', customerName: '919900112210', lastMessage: 'Hi, is the Maldives package still available?', lastMessageTimestamp: ago(2 * H), lastDirection: 'inbound', unreadCount: 1, channel: 'meta' },
  { id: '919811122233', phone: '919811122233', customerName: 'Kabir Malhotra', lastMessage: 'Your itinerary is ready ✨', lastMessageTimestamp: ago(50 * H), lastDirection: 'outbound', unreadCount: 0, channel: 'getgabs' },
  { id: '919833344455', phone: '919833344455', customerName: 'Sneha Iyer', lastMessage: 'Perfect, booking it!', lastMessageTimestamp: ago(4 * 24 * H), lastDirection: 'inbound', unreadCount: 0, channel: 'getgabs' },
  { id: '919844455566', phone: '919844455566', customerName: 'Arjun Nair', lastMessage: '📄 Bali-Honeymoon-Quote.pdf', lastMessageTimestamp: ago(6 * 24 * H), lastDirection: 'outbound', unreadCount: 0, channel: 'getgabs' },
]

const NEW_CHAT: WhatsAppChat = { id: '919855566677', phone: '919855566677', customerName: 'Priya Sharma', isNew: true, ref: 'leads/new123', unreadCount: 0, lastMessage: 'New conversation', lastMessageTimestamp: ago(0) }

/** Asha: window open (last inbound 6h ago), one failed message, a document, a reply quote, a template */
const OPEN_MESSAGES: WhatsAppMessage[] = [
  { id: 'm1', senderPhone: '919876543210', direction: 'inbound', type: 'text', text: "Hi! We're planning our honeymoon to Bali in February. Can you help?", timestamp: ago(28 * H), channel: 'getgabs', status: 'received' },
  { id: 'm2', senderPhone: '919876543210', direction: 'outbound', type: 'template', templateName: 'tz_enquiry_received', text: "Hi Asha, thank you for reaching out to Travelzada! 💛\n\nWe've received your request for a honeymoon trip to Bali.", timestamp: ago(27.5 * H), channel: 'getgabs', status: 'read' },
  { id: 'm3', senderPhone: '919876543210', direction: 'outbound', type: 'document', text: '[Document] Bali-Honeymoon-Quote.pdf', fileName: 'Bali-Honeymoon-Quote.pdf', mediaUrl: 'https://example.com/Bali-Honeymoon-Quote.pdf', timestamp: ago(27 * H), channel: 'getgabs', status: 'delivered' },
  { id: 'm4', senderPhone: '919876543210', direction: 'inbound', type: 'text', text: 'This looks lovely 😍 Can we add a sunset dinner on day 3?', replyToText: 'Bali-Honeymoon-Quote.pdf', timestamp: ago(6 * H), channel: 'getgabs', status: 'received' },
  { id: 'm5', senderPhone: '919876543210', direction: 'outbound', type: 'text', text: 'Of course! Let me check availability at Jimbaran Bay.', timestamp: ago(5.5 * H), channel: 'getgabs', status: 'read' },
  {
    id: 'm6',
    senderPhone: '919876543210',
    direction: 'outbound',
    type: 'text',
    text: 'Done — added the sunset dinner. The total stays the same 🎉',
    timestamp: ago(1 * H),
    channel: 'getgabs',
    status: 'failed',
    errorCode: 131047,
    errorHint: "More than 24 hours have passed since the customer last replied, so WhatsApp only allows a template message. Send a template, and once they reply you can chat freely again.",
  },
]

/** Rohit & Meera: last inbound 30h ago → only a template */
const CLOSED_MESSAGES: WhatsAppMessage[] = [
  { id: 'c1', senderPhone: '919812345678', direction: 'inbound', type: 'text', text: 'Hi, can you share options for Kerala in March?', timestamp: ago(34 * H), channel: 'getgabs', status: 'received' },
  { id: 'c2', senderPhone: '919812345678', direction: 'outbound', type: 'text', text: 'Sure! Sharing 3 options with houseboat + Munnar stays.', timestamp: ago(33 * H), channel: 'getgabs', status: 'read' },
  { id: 'c3', senderPhone: '919812345678', direction: 'inbound', type: 'text', text: 'Thanks, we will check and get back', timestamp: ago(30 * H), channel: 'getgabs', status: 'received' },
]

/** Customer ••210: wrote to the OLD number 2h ago → reply goes from the old number */
const OLD_MESSAGES: WhatsAppMessage[] = [
  { id: 'o1', senderPhone: '919900112210', direction: 'inbound', type: 'text', text: 'Hi, is the Maldives package still available?', timestamp: ago(2 * H), channel: 'meta', status: 'received' },
]

const LOCAL_SENDING: LocalMessage = {
  localId: 'local_1',
  chatId: '919876543210',
  text: 'Sending the updated PDF now…',
  payload: { text: 'Sending the updated PDF now…' },
  status: 'sending',
  timestamp: ago(0),
}

const noop = () => {}

export default function InboxPreview({ state, admin, menu }: { state: string; admin: boolean; menu: boolean }) {
  const canSeePhone = admin
  const mobile = state.startsWith('mobile')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ChatFilter>('all')
  const [helpVisible, setHelpVisible] = useState(state === 'list' || state === 'mobile-list')

  // Which chat / messages each state shows
  const scenario = useMemo(() => {
    switch (state) {
      case 'open':
      case 'mobile-chat':
        return { chat: CHATS[0], messages: OPEN_MESSAGES, windowHoursLeft: 18, old: false, step: 'choose' as StartStep }
      case 'closed':
        return { chat: CHATS[1], messages: CLOSED_MESSAGES, windowHoursLeft: 0, old: false, step: 'choose' as StartStep }
      case 'fill':
        return { chat: NEW_CHAT, messages: [], windowHoursLeft: 0, old: false, step: 'fill' as StartStep }
      case 'done':
        return { chat: CHATS[1], messages: CLOSED_MESSAGES, windowHoursLeft: 0, old: false, step: 'done' as StartStep }
      case 'oldnumber':
        return { chat: CHATS[2], messages: OLD_MESSAGES, windowHoursLeft: 22, old: true, step: 'choose' as StartStep }
      default:
        return null
    }
  }, [state])

  const fillTemplate = state === 'fill' ? FIRST_CONTACT_TEMPLATES[0] : REOPEN_TEMPLATES[0]
  const [values, setValues] = useState<TemplateValues>({})
  const [headerMedia, setHeaderMedia] = useState<HeaderMediaValue>({})
  const [text, setText] = useState('')
  // Client-only: the mock times are relative to "now", which would differ between the server and browser render
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const displayName = (c: WhatsAppChat) =>
    realName(c) || (canSeePhone ? formatPhone(c.phone) : `Customer ${maskPhone(c.phone).split(' ').pop() || ''}`.trim())

  const allChats = state === 'fill' ? [NEW_CHAT, ...CHATS] : CHATS
  const searched = allChats.filter((c) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const digits = q.replace(/\D/g, '')
    return realName(c).toLowerCase().includes(q) || (canSeePhone && digits.length >= 3 && c.phone.includes(digits))
  })

  const autofill = { customer_first_name: realName(scenario?.chat).split(/\s+/)[0] || '', destination: 'Bali', agent_name: 'Ananya' }

  const conversation: InboxConversation | null = scenario
    ? (() => {
        const { chat } = scenario
        const name = displayName(chat)
        const open = scenario.windowHoursLeft > 0
        const isNew = !!chat.isNew
        const missing = missingFields(fillTemplate, values, headerMedia)
        return {
          header: {
            chat,
            name,
            replyState: open ? { kind: 'open', hoursLeft: scenario.windowHoursLeft } : { kind: 'closed', isNew },
            onBack: noop,
            menu: {
              canSeePhone,
              phoneText: canSeePhone ? formatPhone(chat.phone) : maskPhone(chat.phone),
              record: recordLink(chat.ref || chat.sourceRef),
              quoteHref: '/admin/itinerary?ref=whatsapp_chats%2F' + chat.id,
              numberInfo: scenario.old
                ? {
                    title: `Your replies go from our old number${canSeePhone ? ' +91 85298 70220' : ''}`,
                    lines: [`The customer wrote to it, so your reply goes from it too. Template messages always go from our new number${canSeePhone ? ' +91 88900 59568' : ''}.`],
                  }
                : { title: `Your replies go from our new number${canSeePhone ? ' +91 88900 59568' : ''}`, lines: ['Template messages also go from this number.'] },
              typeAnyway: open ? undefined : { active: false, onToggle: noop },
              onRefresh: noop,
              onHelp: () => setHelpVisible(true),
              defaultOpen: menu,
            },
          },
          messages: {
            messages: scenario.messages,
            localMessages: state === 'open' ? [LOCAL_SENDING] : [],
            loading: false,
            customerName: name,
            notices: state === 'open' ? [{ id: 'notice', text: 'Another app was handling this chat — the website took over and sent your message.', onDismiss: noop }] : [],
            onRetry: noop,
            onRetryLocal: noop,
            onSendTemplate: noop,
            whyOpenId: 'm6',
          },
          bottom: open
            ? {
                kind: 'composer',
                props: {
                  value: text,
                  onChange: setText,
                  onSend: () => setText(''),
                  onTemplates: noop,
                  onAttachFile: noop,
                  placeholder: `Message ${name}`,
                  oldNumber: scenario.old,
                },
              }
            : {
                kind: 'start',
                props: {
                  mode: isNew ? 'first' : 'reopen',
                  reason: isNew
                    ? "This customer hasn't written to us yet, so the first message must be a template message."
                    : "It's been more than 24 hours since the customer last wrote, so WhatsApp asks you to start with a template message.",
                  customerName: name,
                  step: scenario.step,
                  picks: (isNew ? FIRST_CONTACT_TEMPLATES : REOPEN_TEMPLATES).slice(0, 3),
                  autofill,
                  onPick: noop,
                  onMore: noop,
                  fill: {
                    template: fillTemplate,
                    values,
                    onValues: setValues,
                    headerMedia,
                    onHeaderMedia: setHeaderMedia,
                    showErrors: false,
                    missing,
                    canSend: true,
                    sending: false,
                    onBack: noop,
                    onSend: noop,
                  },
                  done: { ok: true, title: fillTemplate.title },
                  onAgain: noop,
                },
              },
        }
      })()
    : null

  if (!mounted) return <div className="min-h-screen bg-gray-100" />

  const states = ['list', 'open', 'closed', 'fill', 'done', 'oldnumber', 'mobile-list', 'mobile-chat']
  const href = (s: string, a = admin) => `/zz-inbox-preview?state=${s}${a ? '&admin=1' : ''}${menu ? '&menu=1' : ''}`

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-2">
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-700">Inbox preview (dev only, mock data):</span>
        {states.map((s) => (
          <Link key={s} href={href(s)} className={`rounded px-1.5 py-0.5 ${s === state ? 'bg-gray-800 text-white' : 'hover:bg-white'}`}>
            {s}
          </Link>
        ))}
        <span className="mx-1 text-gray-300">|</span>
        <Link href={href(state, !admin)} className="rounded px-1.5 py-0.5 hover:bg-white">
          {admin ? 'admin ✓ (switch to staff)' : 'staff (switch to admin)'}
        </Link>
      </div>
      <InboxView
        forceMobile={mobile}
        className="h-[calc(100vh-3rem)] min-h-[480px]"
        list={{
          chats: filterChats(searched, filter),
          totalCounts: { unread: allChats.filter((c) => (c.unreadCount || 0) > 0).length, needsReply: allChats.filter(needsReply).length },
          loading: false,
          selectedId: scenario?.chat.id || null,
          onSelect: noop,
          search,
          onSearch: setSearch,
          filter,
          onFilter: setFilter,
          canSeePhone,
          displayName,
          isOldNumber: (c) => !c.isNew && c.channel === 'meta',
          onNewChat: canSeePhone ? noop : undefined,
        }}
        help={{ visible: helpVisible, onDismiss: () => setHelpVisible(false) }}
        conversation={state === 'mobile-list' ? null : conversation}
        placeholder={{ state: 'empty' }}
      />
    </div>
  )
}
