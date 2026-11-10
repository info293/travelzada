'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp'
import { whatsappErrorHint, whatsappFailureText } from '@/lib/whatsappDiagnostics'
import { useAuth } from '@/contexts/AuthContext'
import { usePhoneAccess, maskPhone, formatPhone, resolveRefPhone } from '@/lib/admin/privacy'
import TemplatePicker, { type TemplateSendPayload } from '@/components/admin/whatsapp/TemplatePicker'
import { channelOf, WHATSAPP_BUSINESS_NUMBERS, type WhatsAppChannel } from '@/lib/getgabsTemplates'
import {
  MessageSquare,
  Send,
  Phone,
  User,
  CheckCheck,
  Check,
  Search,
  Loader2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  FileText,
  Plus,
  X,
  Lock,
  Clock,
  Paperclip,
  Info,
} from 'lucide-react'

interface WhatsAppChat {
  id: string // phone number (digits, with country code)
  phone: string
  customerName?: string
  lastMessage?: string
  lastMessageTimestamp?: string
  lastDirection?: 'inbound' | 'outbound'
  unreadCount?: number
  updatedAt?: any
  /** Connection of the last activity: "getgabs" (+91 88900 59568) or "meta"/missing (old number +91 85298 70220) */
  channel?: WhatsAppChannel
  lastInboundAt?: string
  /** Client-only: record the conversation was opened from (e.g. "leads/abc"), used to send by reference */
  ref?: string
  /** Client-only: not yet in Firestore */
  isNew?: boolean
}

interface WhatsAppMessage {
  id: string
  whatsappMessageId?: string
  senderPhone: string
  senderName?: string
  direction: 'inbound' | 'outbound'
  type: string
  text: string
  status?: 'sent' | 'delivered' | 'read' | 'received' | 'failed'
  timestamp: string
  errorCode?: number | null
  errorTitle?: string | null
  errorDetails?: string | null
  templateName?: string
  languageCode?: string
  components?: any[]
  superseded?: boolean
  /** Missing on records from before the GetGabs move (= old Meta number) */
  channel?: WhatsAppChannel
  mediaUrl?: string | null
  fileName?: string
  replyToText?: string
  errorKind?: string
  errorHint?: string
}

type SendPayload = { text: string } | TemplateSendPayload

/** A message sent from this browser that is still in flight, or failed without a Firestore record */
interface LocalMessage {
  localId: string
  chatId: string
  text: string
  payload: SendPayload
  status: 'sending' | 'failed'
  timestamp: string
  error?: string
  hint?: string
  canSendTemplate?: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

/** A "name" that is really just a phone number (the webhook falls back to the number when there's no profile name) */
const isPhoneLike = (s?: string | null) => !!s && !/[a-z]/i.test(s) && s.replace(/\D/g, '').length >= 7

const realName = (chat?: WhatsAppChat | null) => (chat?.customerName && !isPhoneLike(chat.customerName) ? chat.customerName.trim() : '')

const isTemplatePayload = (p: SendPayload): p is TemplateSendPayload => 'templateName' in p

/** Message statuses that can't change any more */
const FINAL_STATUS = ['read', 'failed', 'received']
const STATUS_POLL_MS = 20_000
const isHttpsMedia = (u?: string | null) => !!u && /^https:///i.test(u)

export default function WhatsAppChats() {
  const { currentUser, loading: authLoading } = useAuth()
  const { canSeePhone } = usePhoneAccess()
  const router = useRouter()

  const searchParams = useSearchParams()
  const phoneParam = searchParams.get('phone')
  const refParam = searchParams.get('ref')
  const nameParam = searchParams.get('name')

  const [chats, setChats] = useState<WhatsAppChat[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tempChat, setTempChat] = useState<WhatsAppChat | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [linkState, setLinkState] = useState<{ state: 'idle' | 'resolving' | 'error'; message?: string }>({ state: 'idle' })
  const [templateOpen, setTemplateOpen] = useState(false)
  const [forceText, setForceText] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newChatPhone, setNewChatPhone] = useState('')
  const [newChatName, setNewChatName] = useState('')
  const [provider, setProvider] = useState<WhatsAppChannel>('getgabs')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const handledLinkKey = useRef('')

  // Which connection replies go from (WHATSAPP_INBOX_PROVIDER on the server; GetGabs by default)
  useEffect(() => {
    if (authLoading || !currentUser) return
    let cancelled = false
    ;(async () => {
      try {
        const idToken = await currentUser.getIdToken()
        const res = await fetch('/api/whatsapp/status', { headers: { Authorization: `Bearer ${idToken}` } })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && (data.provider === 'meta' || data.provider === 'getgabs')) setProvider(data.provider)
      } catch {
        /* keep the default */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, currentUser])

  const selectedChat: WhatsAppChat | null = useMemo(() => {
    if (!selectedId) return null
    const real = chats.find((c) => c.id === selectedId)
    if (real) return tempChat?.id === selectedId && tempChat.ref ? { ...real, ref: tempChat.ref } : real
    return tempChat?.id === selectedId ? tempChat : null
  }, [selectedId, chats, tempChat])
  const selectedPhone = selectedChat?.phone || selectedChat?.id || ''

  /** What staff see instead of the number: name, else "Customer ••210" (admins: full number) */
  const displayName = useCallback(
    (chat?: WhatsAppChat | null) => {
      if (!chat) return ''
      const name = realName(chat)
      if (name) return name
      const phone = chat.phone || chat.id
      return canSeePhone ? formatPhone(phone) : `Customer ${maskPhone(phone).split(' ').pop() || ''}`.trim()
    },
    [canSeePhone]
  )

  // 1. Subscribe to WhatsApp conversations
  useEffect(() => {
    const q = query(collection(db, 'whatsapp_chats'), orderBy('updatedAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setChats(snapshot.docs.map((d) => ({ id: d.id, phone: d.id, ...d.data() })) as WhatsAppChat[])
        setLoadingChats(false)
      },
      (err) => {
        console.error('Error fetching WhatsApp chats:', err)
        setLoadingChats(false)
      }
    )
    return () => unsubscribe()
  }, [])

  // 2. Deep link: ?ref=<collection>/<id>&name=  (preferred)  or  ?phone=&name=  (admins)
  useEffect(() => {
    if (authLoading || loadingChats) return
    if (!refParam && !phoneParam) return
    const key = `${refParam}|${phoneParam}|${nameParam}`
    if (handledLinkKey.current === key) return
    handledLinkKey.current = key

    // Never leave a customer's number in a non-admin's address bar / history
    const cleanUrl = () => {
      if (!phoneParam || canSeePhone) return
      const q = new URLSearchParams()
      if (refParam) q.set('ref', refParam)
      if (nameParam) q.set('name', nameParam)
      const s = q.toString()
      router.replace(`/admin/whatsapp-chats${s ? `?${s}` : ''}`)
    }

    ;(async () => {
      let rawPhone = ''
      let recordName = ''
      if (refParam) {
        setLinkState({ state: 'resolving' })
        try {
          const r = await resolveRefPhone(refParam)
          if (r) {
            rawPhone = r.phone
            recordName = r.name
          }
        } catch (e) {
          console.error('Could not resolve WhatsApp link:', e)
        }
        if (!rawPhone) {
          setLinkState({
            state: 'error',
            message: "We couldn't find a WhatsApp number for this customer. The record may have been deleted, or no phone number is saved on it.",
          })
          cleanUrl()
          return
        }
      } else if (phoneParam) {
        rawPhone = phoneParam
      }

      const target = normalizeWhatsAppNumber(rawPhone)
      if (target.length < 8) {
        setLinkState({ state: 'error', message: "This customer's phone number doesn't look valid for WhatsApp." })
        cleanUrl()
        return
      }
      const last10 = target.slice(-10)
      const existing = chats.find(
        (c) => c.id === target || c.phone === target || (last10.length === 10 && String(c.phone || c.id).endsWith(last10))
      )
      const name = [nameParam, recordName].find((n) => n && !isPhoneLike(n))?.trim()

      if (existing) {
        setTempChat(refParam ? { ...existing, ref: refParam } : null)
        setSelectedId(existing.id)
        setLinkState({ state: 'idle' })
      } else if (!refParam && !canSeePhone) {
        // Non-admins can't start a conversation with a typed/pasted number
        setLinkState({
          state: 'error',
          message: 'To start a new WhatsApp conversation, open the customer from their lead and click "Chat on WhatsApp".',
        })
      } else {
        setTempChat({
          id: target,
          phone: target,
          customerName: name || undefined,
          ref: refParam || undefined,
          isNew: true,
          lastMessage: 'New conversation',
          lastMessageTimestamp: new Date().toISOString(),
          unreadCount: 0,
        })
        setSelectedId(target)
        setLinkState({ state: 'idle' })
      }
      cleanUrl()
    })()
  }, [authLoading, loadingChats, refParam, phoneParam, nameParam, canSeePhone, chats, router])

  // 3. Subscribe to messages of the selected chat
  useEffect(() => {
    if (!selectedPhone) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    // Sorted client-side: where + orderBy on different fields would require a Firestore composite index
    const q = query(collection(db, 'whatsapp_messages'), where('senderPhone', '==', selectedPhone))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          (snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WhatsAppMessage[])
            .filter((m) => !m.superseded)
            .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
        )
        setLoadingMessages(false)
      },
      (err) => {
        console.error('Error fetching chat messages:', err)
        setLoadingMessages(false)
      }
    )
    return () => unsubscribe()
  }, [selectedPhone])

  // Reset unread count while the chat is open
  useEffect(() => {
    if (selectedChat && !selectedChat.isNew && (selectedChat.unreadCount || 0) > 0) {
      updateDoc(doc(db, 'whatsapp_chats', selectedChat.id), { unreadCount: 0 }).catch(console.error)
    }
  }, [selectedChat])

  // Reset per-chat UI when switching chats
  useEffect(() => {
    setForceText(false)
    setNotice(null)
  }, [selectedId])

  const chatLocalMessages = localMessages.filter((m) => m.chatId === selectedId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLocalMessages.length])

  // 24-hour customer service window: free-form text only within 24h of the customer's last message TO THE NUMBER WE
  // REPLY FROM (a message to the old Meta number does not open the window for the GetGabs number, and vice versa)
  // Reply from the number the customer last wrote to (if that was within 24h); otherwise the default number.
  // e.g. a customer who just messaged the old 85298 number gets the reply from 85298, not from 88900.
  const replyChannel: WhatsAppChannel = useMemo(() => {
    const last = messages.reduce<{ ms: number; ch: WhatsAppChannel } | null>((best, m) => {
      if (m.direction !== 'inbound') return best
      const ms = Date.parse(m.timestamp) || 0
      return !best || ms > best.ms ? { ms, ch: channelOf(m) } : best
    }, null)
    return last && Date.now() - last.ms < DAY_MS ? last.ch : provider
  }, [messages, provider])
  const lastInboundMs = useMemo(
    () =>
      messages.reduce(
        (max, m) => (m.direction === 'inbound' && channelOf(m) === replyChannel ? Math.max(max, Date.parse(m.timestamp) || 0) : max),
        0
      ),
    [messages, replyChannel]
  )
  const lastOtherInboundMs = useMemo(
    () =>
      messages.reduce(
        (max, m) => (m.direction === 'inbound' && channelOf(m) !== replyChannel ? Math.max(max, Date.parse(m.timestamp) || 0) : max),
        0
      ),
    [messages, replyChannel]
  )
  // Old-number conversation that hasn't been answered from the new number yet
  const movedToNewNumber =
    replyChannel === 'getgabs' && provider === 'getgabs' && !!selectedChat && !selectedChat.isNew && messages.length > 0 && !messages.some((m) => channelOf(m) === 'getgabs')

  // Delivery ticks: GetGabs has no status webhook, so poll recent outbound messages of the open chat
  const pendingStatusIds = useMemo(
    () =>
      messages
        .filter(
          (m) =>
            m.direction === 'outbound' &&
            m.channel === 'getgabs' &&
            !FINAL_STATUS.includes(String(m.status)) &&
            String(m.whatsappMessageId || '').startsWith('wamid') &&
            Date.now() - (Date.parse(m.timestamp) || 0) < DAY_MS
        )
        .slice(-20)
        .map((m) => m.id),
    [messages]
  )
  const pendingKey = pendingStatusIds.join(',')
  useEffect(() => {
    if (!currentUser || !pendingKey) return
    const ids = pendingKey.split(',')
    let stopped = false
    const poll = async () => {
      if (stopped || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return
      try {
        const idToken = await currentUser.getIdToken()
        await fetch('/api/whatsapp/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ ids }),
        })
        // Updates arrive through the Firestore listener
      } catch {
        /* try again next tick */
      }
    }
    const first = setTimeout(poll, 5000)
    const timer = setInterval(poll, STATUS_POLL_MS)
    return () => {
      stopped = true
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [pendingKey, currentUser])

  /** "via GetGabs · 88900" / "Old number 85298 (history)" — the business number itself only for admins */
  const channelBadge = (chat?: WhatsAppChat | null) => {
    if (!chat || chat.isNew) return null
    const ch = channelOf(chat)
    const n = WHATSAPP_BUSINESS_NUMBERS[ch]
    if (ch === provider) return { text: `via ${n.label}${canSeePhone ? ` · ${n.short}` : ''}`, current: true }
    return { text: `Old number${canSeePhone ? ` ${n.short}` : ''} (history)`, current: false }
  }
  const windowMsLeft = lastInboundMs ? lastInboundMs + DAY_MS - Date.now() : 0
  const windowOpen = windowMsLeft > 0
  const showTextBox = windowOpen || forceText

  // Send (text or template) through the server, always by reference so the browser never sends the number
  const sendMessage = async (payload: SendPayload, opts: { retryOf?: string; replaceLocalId?: string } = {}) => {
    const chat = selectedChat
    if (!chat) return
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const text = isTemplatePayload(payload) ? payload.previewText || `[Template: ${payload.templateName}]` : payload.text
    setNotice(null)
    setLocalMessages((list) => [
      ...list.filter((m) => m.localId !== opts.replaceLocalId),
      { localId, chatId: chat.id, text, payload, status: 'sending', timestamp: new Date().toISOString() },
    ])

    const recipient = chat.ref
      ? { ref: chat.ref }
      : !chat.isNew
        ? { ref: `whatsapp_chats/${chat.id}` }
        : { to: chat.phone } // admin-started conversation with a typed number (server allows raw numbers for admins only)

    let failure: Partial<LocalMessage> | null = null
    try {
      const idToken = await currentUser?.getIdToken()
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
        // Text/media go from the number the customer wrote to; templates from the default (GetGabs) number
        body: JSON.stringify({
          ...recipient,
          name: realName(chat) || undefined,
          ...payload,
          ...(isTemplatePayload(payload) ? {} : { channel: replyChannel }),
          retryOf: opts.retryOf,
        }),
      })
      const data = await res.json().catch(() => ({ error: `Server returned HTTP ${res.status} with no JSON body` }))
      if (res.ok) {
        if (data.tookControl) setNotice('This chat was being handled by another app; the website app took control and sent your message.')
      } else if (!data.failedRecordId) {
        // No Firestore record was written — keep the bubble here so the message isn't lost
        failure = {
          error: data.error || 'Unknown error',
          hint: data.hint || whatsappErrorHint(data.code),
          canSendTemplate: !!data.canSendTemplate,
        }
      }
      // With a failedRecordId the "Not delivered" record arrives through the Firestore listener
    } catch (err: any) {
      console.error('Failed to send WhatsApp message:', err)
      failure = { error: err?.message || 'Network error', hint: 'Check your internet connection and try again.' }
    }

    setLocalMessages((list) =>
      failure
        ? list.map((m) => (m.localId === localId ? { ...m, status: 'failed', ...failure } : m))
        : list.filter((m) => m.localId !== localId)
    )
  }

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputText.trim()
    if (!text || !selectedChat) return
    setInputText('')
    sendMessage({ text })
  }

  const retryRecord = (msg: WhatsAppMessage) => {
    if (msg.type === 'template') {
      if (msg.templateName) {
        sendMessage(
          { templateName: msg.templateName, languageCode: msg.languageCode || 'en_US', components: msg.components || [], previewText: msg.text },
          { retryOf: msg.id }
        )
      } else setTemplateOpen(true)
    } else sendMessage({ text: msg.text }, { retryOf: msg.id })
  }

  const startNewChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSeePhone) return
    const target = normalizeWhatsAppNumber(newChatPhone)
    if (target.length < 10) return
    const existing = chats.find((c) => c.id === target || String(c.phone).endsWith(target.slice(-10)))
    if (existing) {
      setTempChat(null)
      setSelectedId(existing.id)
    } else {
      setTempChat({ id: target, phone: target, customerName: newChatName.trim() || undefined, isNew: true, unreadCount: 0 })
      setSelectedId(target)
    }
    setNewChatOpen(false)
    setNewChatPhone('')
    setNewChatName('')
  }

  // Search: admins by name or number; everyone else by name only
  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = tempChat?.isNew && !chats.some((c) => c.id === tempChat.id) ? [tempChat, ...chats] : chats
    if (!q) return list
    const digits = q.replace(/\D/g, '')
    return list.filter(
      (c) =>
        realName(c).toLowerCase().includes(q) ||
        (canSeePhone && digits.length >= 3 && String(c.phone || c.id).includes(digits))
    )
  }, [chats, tempChat, searchQuery, canSeePhone])

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''
    const sameDay = date.toDateString() === new Date().toDateString()
    return sameDay
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  const initial = (chat: WhatsAppChat) => {
    const n = realName(chat)
    return n ? n[0].toUpperCase() : <User className="w-5 h-5" />
  }

  const firstName = realName(selectedChat).split(/\s+/)[0] || ''
  const headerBadge = channelBadge(selectedChat)

  const failedActions = (opts: { onRetry: () => void; canSendTemplate?: boolean }) => (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={opts.onRetry}
        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-red-700 border border-red-200 hover:bg-red-50"
      >
        <RotateCcw className="w-3 h-3" /> Retry
      </button>
      {opts.canSendTemplate && (
        <button
          type="button"
          onClick={() => setTemplateOpen(true)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
        >
          <FileText className="w-3 h-3" /> Send a template instead
        </button>
      )}
    </div>
  )

  return (
    <div>
      {/* Fits under the admin shell's top bar + section tabs (≈ 6.5rem) and main padding */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-10rem)] min-h-[480px] flex">
        {/* Left Sidebar: Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/50">
          <div className="p-4 border-b border-gray-200 bg-white space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={canSeePhone ? 'Search name or number…' : 'Search by name…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>
              {canSeePhone && (
                <button
                  type="button"
                  onClick={() => setNewChatOpen((v) => !v)}
                  className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  title="New chat by number (admin only)"
                >
                  {newChatOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
            </div>
            {canSeePhone && newChatOpen && (
              <form onSubmit={startNewChat} className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2">
                <input
                  type="tel"
                  placeholder="Phone with country code, e.g. +91 98765 43210"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Customer name (optional)"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={normalizeWhatsAppNumber(newChatPhone).length < 10}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Open chat
                </button>
              </form>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingChats ? (
              <div className="flex items-center justify-center p-8 text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-sm">Loading chats...</span>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium text-gray-600">No chats found</p>
                <p className="text-xs text-gray-400 mt-1">Inbound customer messages will appear here live.</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedId === chat.id
                const badge = channelBadge(chat)
                return (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setSelectedId(chat.id)
                      setLinkState({ state: 'idle' })
                    }}
                    className={`w-full text-left p-4 transition-all flex items-start gap-3 relative ${
                      isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-gray-100/80'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {initial(chat)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{displayName(chat)}</span>
                        <span className="text-xs text-gray-400 shrink-0">{formatTime(chat.lastMessageTimestamp)}</span>
                      </div>
                      {badge && !badge.current && (
                        <span className="mb-0.5 inline-block rounded bg-gray-100 px-1.5 text-[10px] text-gray-500">{badge.text}</span>
                      )}
                      <p className="text-xs text-gray-500 truncate">
                        {chat.lastDirection === 'outbound' && <span className="font-medium text-gray-700">You: </span>}
                        {chat.lastMessage || 'No messages'}
                      </p>
                    </div>
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <span className="bg-emerald-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center flex-shrink-0">
                        {chat.unreadCount}
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Area: Chat Window */}
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
          {linkState.state === 'resolving' ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span className="text-sm">Opening the customer&apos;s chat…</span>
            </div>
          ) : linkState.state === 'error' && !selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Couldn&apos;t open this chat</h3>
              <p className="text-sm text-gray-500 max-w-sm mt-1">{linkState.message}</p>
            </div>
          ) : selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    {initial(selectedChat)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                      <span className="truncate">{displayName(selectedChat)}</span>
                      {headerBadge && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            headerBadge.current ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                          title={headerBadge.current ? 'Conversation on the current business number' : 'Earlier messages were on the old business number'}
                        >
                          {headerBadge.text}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {canSeePhone ? (
                        <>
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span className="tabular-nums">{formatPhone(selectedPhone)}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-gray-400" />
                          <span className="tabular-nums">{maskPhone(selectedPhone)}</span>
                          <span className="text-gray-400">· number visible to admins only</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedChat.isNew ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      New conversation
                    </span>
                  ) : windowOpen ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                      title="You can send normal messages until 24 hours after the customer's last message"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Reply window open · {Math.max(1, Math.ceil(windowMsLeft / 3600000))}h left
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3" /> Template only
                    </span>
                  )}
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]/40">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    <span className="text-sm">Loading message history...</span>
                  </div>
                ) : messages.length === 0 && chatLocalMessages.length === 0 ? (
                  <div className="text-center my-auto text-gray-400 p-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-600" />
                    <p className="text-sm font-medium text-gray-600">Start a WhatsApp chat with {displayName(selectedChat)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      The first message to a customer must be an approved template. Once they reply, you can chat freely for 24 hours.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isOutbound = msg.direction === 'outbound'
                      const failed = isOutbound && msg.status === 'failed'
                      return (
                        <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-sm relative ${
                              failed
                                ? 'bg-red-50 text-gray-900 border border-red-200 rounded-br-none'
                                : isOutbound
                                  ? 'bg-emerald-600 text-white rounded-br-none'
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                            }`}
                          >
                            {msg.type === 'template' && (
                              <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${failed ? 'text-red-400' : 'text-emerald-100'}`}>
                                Template{msg.templateName ? ` · ${msg.templateName}` : ''}
                              </p>
                            )}
                            {msg.replyToText && (
                              <p
                                className={`mb-1 border-l-2 pl-2 text-[11px] line-clamp-2 ${
                                  isOutbound && !failed ? 'border-emerald-200 text-emerald-100' : 'border-gray-300 text-gray-500'
                                }`}
                              >
                                {msg.replyToText}
                              </p>
                            )}
                            {isHttpsMedia(msg.mediaUrl) &&
                              (msg.type === 'image' || msg.type === 'sticker' ? (
                                <a href={msg.mediaUrl!} target="_blank" rel="noopener noreferrer" className="block mb-1">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={msg.mediaUrl!} alt="" className="max-h-60 rounded-lg object-cover" loading="lazy" />
                                </a>
                              ) : (
                                <a
                                  href={msg.mediaUrl!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`mb-1 inline-flex items-center gap-1 text-xs underline ${
                                    isOutbound && !failed ? 'text-emerald-50' : 'text-emerald-700'
                                  }`}
                                >
                                  <Paperclip className="w-3 h-3" /> {msg.fileName || `Open ${msg.type === 'text' ? 'attachment' : msg.type}`}
                                </a>
                              ))}
                            {!(isHttpsMedia(msg.mediaUrl) && /^\[(Image|Sticker)\]$/.test(msg.text)) && (
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            )}
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                failed ? 'text-red-500' : isOutbound ? 'text-emerald-100' : 'text-gray-400'
                              }`}
                            >
                              <span>{formatTime(msg.timestamp)}</span>
                              {isOutbound && (
                                <span>
                                  {failed ? (
                                    <span className="font-semibold">✕ Not delivered</span>
                                  ) : msg.status === 'read' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                  ) : msg.status === 'delivered' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                                  )}
                                </span>
                              )}
                            </div>
                            {failed && (
                              <>
                                <p className="mt-1.5 rounded-md bg-white/80 px-2 py-1 text-[11px] leading-snug text-red-700">
                                  {msg.errorHint
                                    ? `Not delivered: ${msg.errorHint}`
                                    : whatsappFailureText(msg.errorCode, msg.errorTitle, msg.errorDetails)}
                                </p>
                                {failedActions({
                                  onRetry: () => retryRecord(msg),
                                  canSendTemplate:
                                    msg.type !== 'template' &&
                                    ([131047, 131070, 2494191].includes(Number(msg.errorCode)) || msg.errorKind === 'outside_window'),
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {chatLocalMessages.map((m) => (
                      <div key={m.localId} className="flex justify-end">
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-sm rounded-br-none ${
                            m.status === 'failed' ? 'bg-red-50 text-gray-900 border border-red-200' : 'bg-emerald-600/80 text-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${m.status === 'failed' ? 'text-red-500' : 'text-emerald-100'}`}>
                            {m.status === 'sending' ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Sending…
                              </>
                            ) : (
                              <span className="font-semibold">✕ Not delivered</span>
                            )}
                          </div>
                          {m.status === 'failed' && (
                            <>
                              <p className="mt-1.5 rounded-md bg-white/80 px-2 py-1 text-[11px] leading-snug text-red-700">
                                {m.hint || m.error}
                                {m.hint && m.error ? <span className="block mt-0.5 text-red-400">({m.error})</span> : null}
                              </p>
                              {failedActions({
                                onRetry: () => sendMessage(m.payload, { replaceLocalId: m.localId }),
                                canSendTemplate: m.canSendTemplate,
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {notice && (
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
                  <span>{notice}</span>
                  <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800" aria-label="Dismiss">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {movedToNewNumber && (
                <div className="px-4 py-2 bg-sky-50 border-t border-sky-200 text-xs text-sky-900 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 text-sky-600" />
                  <span>Replies now go from {WHATSAPP_BUSINESS_NUMBERS.getgabs.display} — the customer will see a new number.</span>
                </div>
              )}

              {windowOpen && replyChannel !== provider && (
                <div className="px-4 py-2 bg-sky-50 border-t border-sky-200 text-xs text-sky-900 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 text-sky-600" />
                  <span>
                    The customer wrote to the {replyChannel === 'meta' ? 'old' : 'other'} number
                    {canSeePhone ? ` ${WHATSAPP_BUSINESS_NUMBERS[replyChannel].display}` : ''}, so your reply goes from that number. Templates still go from{' '}
                    {canSeePhone ? WHATSAPP_BUSINESS_NUMBERS[provider].display : 'the main number'}.
                  </span>
                </div>
              )}

              {/* Composer */}
              {!loadingMessages && !windowOpen && (
                <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 flex flex-wrap items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="flex-1 min-w-[200px] text-xs text-amber-900">
                    {lastInboundMs
                      ? "The customer hasn't messaged in the last 24 hours, so WhatsApp only allows an approved template message."
                      : lastOtherInboundMs && provider === 'getgabs'
                        ? `The customer has only messaged the old number. Replies now go from ${WHATSAPP_BUSINESS_NUMBERS.getgabs.display}, so the first message from it must be an approved template.`
                        : 'This customer has not messaged the business number yet, so the first message must be an approved template.'}{' '}
                    When they reply, you can chat freely for 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTemplateOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <FileText className="w-4 h-4" /> Send template
                  </button>
                  {!forceText && (
                    <button type="button" onClick={() => setForceText(true)} className="text-xs text-amber-800 underline hover:text-amber-950">
                      Type a message anyway
                    </button>
                  )}
                </div>
              )}
              {(showTextBox || loadingMessages) && (
                <form onSubmit={handleSendText} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateOpen(true)}
                    className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-emerald-700"
                    title="Send a template"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    placeholder={`Message ${displayName(selectedChat)}…`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 min-w-0 px-4 py-2.5 bg-gray-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  >
                    <span>Send</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}

              <TemplatePicker
                open={templateOpen}
                onClose={() => setTemplateOpen(false)}
                customerFirstName={firstName}
                onSend={(payload) => sendMessage(payload)}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Select a Conversation</h3>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                Choose a customer from the left, or click a lead&apos;s WhatsApp number / &quot;Chat on WhatsApp&quot; anywhere in the admin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
