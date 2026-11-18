'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp'
import { whatsappErrorHint } from '@/lib/whatsappDiagnostics'
import { useAuth } from '@/contexts/AuthContext'
import { usePhoneAccess, maskPhone, formatPhone, resolveRefPhone } from '@/lib/admin/privacy'
import TemplatePicker from '@/components/admin/whatsapp/TemplatePicker'
import { readLeadAutofill, type Autofill } from '@/components/admin/whatsapp/templates/leadAutofill'
import { useLiveTemplates } from '@/components/admin/whatsapp/templates/useLiveTemplates'
import { pickStartTemplates, useTemplateForm } from '@/components/admin/whatsapp/templates/useTemplateForm'
import { getCatalogTemplate } from '@/lib/whatsapp/templateCatalog'
import { channelOf, WHATSAPP_BUSINESS_NUMBERS, type WhatsAppChannel } from '@/lib/getgabsTemplates'
import InboxView, { type InboxConversation } from '@/components/admin/whatsapp/inbox/InboxView'
import { filterChats, needsReply, type ChatFilter } from '@/components/admin/whatsapp/inbox/ChatList'
import { useHelpCard } from '@/components/admin/whatsapp/inbox/HelpCard'
import type { SystemNotice } from '@/components/admin/whatsapp/inbox/MessageList'
import type { StartStep } from '@/components/admin/whatsapp/inbox/StartFlow'
import type { ReplyState } from '@/components/admin/whatsapp/inbox/StatusPill'
import {
  DAY_MS,
  isMediaPayload,
  isPhoneLike,
  isTemplatePayload,
  realName,
  recordLink,
  type LocalMessage,
  type SendPayload,
  type WhatsAppChat,
  type WhatsAppMessage,
} from '@/components/admin/whatsapp/inbox/types'

/** Message statuses that can't change any more */
const FINAL_STATUS = ['read', 'failed', 'received']
const STATUS_POLL_MS = 20_000
const MAX_ATTACH_MB = 4

/** "our new number" / "our old number" (+ the digits for admins) */
const numberName = (ch: WhatsAppChannel, canSeePhone: boolean) =>
  `our ${ch === 'getgabs' ? 'new' : 'old'} number${canSeePhone ? ` ${WHATSAPP_BUSINESS_NUMBERS[ch].display}` : ''}`

/**
 * Live WhatsApp inbox. All data + behaviour lives here; the screen itself is `InboxView` (components/admin/whatsapp/inbox),
 * which the dev-only /zz-inbox-preview page renders with mock data.
 */
export default function WhatsAppChats() {
  const { currentUser, loading: authLoading } = useAuth()
  const { canSeePhone } = usePhoneAccess()
  const router = useRouter()

  const searchParams = useSearchParams()
  const phoneParam = searchParams.get('phone')
  const refParam = searchParams.get('ref')
  const nameParam = searchParams.get('name')
  // ?template=tz_quote_sent (from the Templates page): open the picker on it once a chat is selected
  const templateParam = searchParams.get('template')

  const [chats, setChats] = useState<WhatsAppChat[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tempChat, setTempChat] = useState<WhatsAppChat | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all')
  const [linkState, setLinkState] = useState<{ state: 'idle' | 'resolving' | 'error'; message?: string }>({ state: 'idle' })
  const [templateOpen, setTemplateOpen] = useState(false)
  const [pickerTemplate, setPickerTemplate] = useState<string | undefined>()
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(() => (/^[a-z0-9_]{1,80}$/.test(templateParam || '') ? templateParam : null))
  const [leadAutofill, setLeadAutofill] = useState<Autofill>({})
  const [forceText, setForceText] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [provider, setProvider] = useState<WhatsAppChannel>('getgabs')
  const [attach, setAttach] = useState<{ busy: boolean; error?: string }>({ busy: false })
  const [refreshing, setRefreshing] = useState(false)
  const [startStep, setStartStep] = useState<StartStep>('choose')
  const [startDone, setStartDone] = useState<{ ok: boolean; title: string } | undefined>()
  const handledLinkKey = useRef('')
  const help = useHelpCard()

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
          message: 'To start a new WhatsApp chat, open the customer from their lead and tap "Chat on WhatsApp".',
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

  // Trip details (destination, package, dates…) from the lead this chat is linked to, to pre-fill templates.
  // Only trip fields are read — never the phone number.
  const linkedRef = selectedChat?.ref || selectedChat?.sourceRef
  useEffect(() => {
    setLeadAutofill({})
    if (!linkedRef) return
    let cancelled = false
    readLeadAutofill(linkedRef)
      .then((a) => !cancelled && setLeadAutofill(a))
      .catch((e) => console.warn('[WhatsApp] could not read the linked lead for auto-fill', e))
    return () => {
      cancelled = true
    }
  }, [linkedRef])

  // ?template= from the Templates page: open the picker on that template once a chat is open
  useEffect(() => {
    if (!pendingTemplate || !selectedChat) return
    setPickerTemplate(pendingTemplate)
    setTemplateOpen(true)
    setPendingTemplate(null)
  }, [pendingTemplate, selectedChat])

  const openTemplatePicker = (name?: string) => {
    setPickerTemplate(name)
    setTemplateOpen(true)
  }

  const chatLocalMessages = localMessages.filter((m) => m.chatId === selectedId)

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
  const pollStatus = useCallback(
    async (ids: string[]) => {
      if (!currentUser || !ids.length) return
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
    },
    [currentUser]
  )
  useEffect(() => {
    if (!currentUser || !pendingKey) return
    const ids = pendingKey.split(',')
    let stopped = false
    const poll = async () => {
      if (stopped || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return
      await pollStatus(ids)
    }
    const first = setTimeout(poll, 5000)
    const timer = setInterval(poll, STATUS_POLL_MS)
    return () => {
      stopped = true
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [pendingKey, currentUser, pollStatus])

  // ⋯ → Refresh delivery ticks: ask now instead of waiting for the next poll
  const refreshStatus = async () => {
    setRefreshing(true)
    try {
      await pollStatus(pendingKey ? pendingKey.split(',') : [])
    } finally {
      setTimeout(() => setRefreshing(false), 600)
    }
  }

  const windowMsLeft = lastInboundMs ? lastInboundMs + DAY_MS - Date.now() : 0
  const windowOpen = windowMsLeft > 0
  const showTextBox = windowOpen || forceText

  // Send (text, media or template) through the server, always by reference so the browser never sends the number.
  // Resolves to 'sent' or 'failed' (a failure with a Firestore record shows up as a "Not sent" bubble via the listener).
  const sendMessage = async (payload: SendPayload, opts: { retryOf?: string; replaceLocalId?: string } = {}): Promise<'sent' | 'failed'> => {
    const chat = selectedChat
    if (!chat) return 'failed'
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const text = isTemplatePayload(payload)
      ? payload.previewText || `[Template: ${payload.templateName}]`
      : isMediaPayload(payload)
        ? payload.media.caption || (payload.media.kind === 'document' ? `📄 ${payload.media.filename || 'Document'}` : '🖼️ Photo')
        : payload.text
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
    let ok = false
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
        ok = true
        if (data.tookControl) setNotice('Another app was handling this chat — the website took over and sent your message.')
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
    return ok ? 'sent' : 'failed'
  }

  const handleSendText = () => {
    const text = inputText.trim()
    if (!text || !selectedChat) return
    setInputText('')
    sendMessage({ text })
  }

  // 📎 Upload a photo / PDF (same uploader as template file headers) and send it; the typed text becomes the caption
  const handleAttach = async (file: File) => {
    if (!selectedChat) return
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    const isImage = /^image\/(jpeg|png)$/.test(file.type)
    if (!isPdf && !isImage) {
      setAttach({ busy: false, error: 'Please choose a JPG or PNG photo, or a PDF.' })
      return
    }
    if (file.size > MAX_ATTACH_MB * 1024 * 1024) {
      setAttach({ busy: false, error: `That file is ${(file.size / 1048576).toFixed(1)} MB. Please use a file under ${MAX_ATTACH_MB} MB.` })
      return
    }
    setAttach({ busy: true })
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', '/whatsapp')
      fd.append('fileName', file.name.replace(/[^\w.\-]+/g, '-').slice(-100) || `wa_${Date.now()}`)
      const res = await fetch('/api/imagekit/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || `Upload failed (HTTP ${res.status})`)
      const caption = inputText.trim() || undefined
      setInputText('')
      setAttach({ busy: false })
      sendMessage({ media: { kind: isPdf ? 'document' : 'image', link: data.url, caption, filename: isPdf ? file.name : undefined } })
    } catch (e: any) {
      setAttach({ busy: false, error: e?.message || 'Upload failed. Please try again.' })
    }
  }

  const retryRecord = (msg: WhatsAppMessage) => {
    if (msg.type === 'template') {
      if (msg.templateName) {
        sendMessage(
          { templateName: msg.templateName, languageCode: msg.languageCode || 'en_US', components: msg.components || [], previewText: msg.text },
          { retryOf: msg.id }
        )
      } else openTemplatePicker()
    } else if ((msg.type === 'image' || msg.type === 'document') && msg.mediaUrl && /^https:\/\//i.test(msg.mediaUrl)) {
      const isCaption = !/^\[(Image|Document)\]/.test(msg.text)
      sendMessage(
        { media: { kind: msg.type, link: msg.mediaUrl, caption: isCaption ? msg.text : undefined, filename: msg.fileName } },
        { retryOf: msg.id }
      )
    } else sendMessage({ text: msg.text }, { retryOf: msg.id })
  }

  const startNewChat = (phone: string, name: string) => {
    if (!canSeePhone) return
    const target = normalizeWhatsAppNumber(phone)
    if (target.length < 10) return
    const existing = chats.find((c) => c.id === target || String(c.phone).endsWith(target.slice(-10)))
    if (existing) {
      setTempChat(null)
      setSelectedId(existing.id)
    } else {
      setTempChat({ id: target, phone: target, customerName: name.trim() || undefined, isNew: true, unreadCount: 0 })
      setSelectedId(target)
    }
    setLinkState({ state: 'idle' })
  }

  // Search: admins by name or number; everyone else by name only. Then All / Unread / Needs reply.
  const allChats = useMemo(() => (tempChat?.isNew && !chats.some((c) => c.id === tempChat.id) ? [tempChat, ...chats] : chats), [chats, tempChat])
  const searchedChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allChats
    const digits = q.replace(/\D/g, '')
    return allChats.filter(
      (c) =>
        realName(c).toLowerCase().includes(q) ||
        (canSeePhone && digits.length >= 3 && String(c.phone || c.id).includes(digits))
    )
  }, [allChats, searchQuery, canSeePhone])
  const visibleChats = useMemo(() => filterChats(searchedChats, chatFilter), [searchedChats, chatFilter])
  const counts = useMemo(
    () => ({ unread: allChats.filter((c) => (c.unreadCount || 0) > 0).length, needsReply: allChats.filter(needsReply).length }),
    [allChats]
  )

  const firstName = realName(selectedChat).split(/\s+/)[0] || ''
  // Pre-filled template fields: customer's first name (only a real name, never a number), your name, trip details
  const agentFirstName = (currentUser?.displayName || '').trim().split(/\s+/)[0] || ''
  const autofill: Autofill = {
    ...leadAutofill,
    ...(firstName ? { customer_first_name: firstName } : {}),
    ...(agentFirstName && !isPhoneLike(agentFirstName) ? { agent_name: agentFirstName } : {}),
  }
  // New customer (never wrote to this number) vs. a conversation whose 24-hour window closed
  const startMode: 'first' | 'reopen' = lastInboundMs || lastOtherInboundMs || messages.some((m) => m.direction === 'outbound') ? 'reopen' : 'first'
  const pendingTitle = pendingTemplate ? getCatalogTemplate(pendingTemplate)?.title || pendingTemplate : ''

  // Inline "start a conversation" flow (shown instead of the message box when only a template is allowed)
  const startVisible = !!selectedChat && !loadingMessages && !showTextBox
  const startLive = useLiveTemplates(startVisible)
  const startForm = useTemplateForm({ live: startLive, enabled: startVisible })
  const startPicks = useMemo(() => pickStartTemplates(startMode, startLive), [startMode, startLive])
  const chooseStart = startForm.choose

  // Reset per-chat UI when switching chats
  useEffect(() => {
    setForceText(false)
    setNotice(null)
    setAttach({ busy: false })
    setStartStep('choose')
    setStartDone(undefined)
    chooseStart(undefined)
  }, [selectedId, chooseStart])

  const sendStart = async () => {
    const title = startForm.selected?.title || 'Message'
    const result = await startForm.send((payload) => sendMessage(payload))
    if (result === false) return // something still to fill
    setStartDone({ ok: result === 'sent', title })
    setStartStep('done')
  }

  // ── What the screen shows ───────────────────────────────────────────────────────────────────────

  const replyState: ReplyState = loadingMessages
    ? { kind: 'loading' }
    : windowOpen
      ? { kind: 'open', hoursLeft: Math.max(1, Math.ceil(windowMsLeft / 3600000)) }
      : { kind: 'closed', isNew: startMode === 'first' }

  const startReason = lastInboundMs
    ? "It's been more than 24 hours since the customer last wrote, so WhatsApp asks you to start with a template message."
    : lastOtherInboundMs && provider === 'getgabs'
      ? `The customer has only written to our old number. Replies now come from our new number ${WHATSAPP_BUSINESS_NUMBERS.getgabs.display}, so the first one must be a template message.`
      : "This customer hasn't written to us yet, so the first message must be a template message."

  const conversation: InboxConversation | null = selectedChat
    ? (() => {
        const chat = selectedChat
        const name = displayName(chat)
        const chatOnOld = !chat.isNew && (channelOf(chat) !== provider || messages.some((m) => channelOf(m) !== provider))
        const numberLines: string[] = []
        if (replyChannel !== provider)
          numberLines.push(`The customer wrote to it, so your reply goes from it too. Template messages always go from ${numberName(provider, canSeePhone)}.`)
        else numberLines.push('Template messages also go from this number.')
        if (chatOnOld && replyChannel === provider) numberLines.push('Earlier messages in this chat were on our old number.')

        const quoteRef = chat.ref || chat.sourceRef || (!chat.isNew ? `whatsapp_chats/${chat.id}` : '')
        const quoteQuery = new URLSearchParams()
        if (quoteRef) quoteQuery.set('ref', quoteRef)
        else if (canSeePhone) quoteQuery.set('phone', chat.phone)
        if (realName(chat)) quoteQuery.set('name', realName(chat))
        if (leadAutofill.destination) quoteQuery.set('destination', leadAutofill.destination)

        const notices: SystemNotice[] = []
        if (movedToNewNumber)
          notices.push({ id: 'moved', text: `Replies now go from our new number ${WHATSAPP_BUSINESS_NUMBERS.getgabs.display} — the customer will see a new number.` })
        if (notice) notices.push({ id: 'notice', text: notice, onDismiss: () => setNotice(null) })

        const f = startForm
        return {
          header: {
            chat,
            name,
            replyState,
            onBack: () => setSelectedId(null),
            menu: {
              canSeePhone,
              phoneText: canSeePhone ? formatPhone(selectedPhone) : maskPhone(selectedPhone),
              record: recordLink(linkedRef),
              quoteHref: quoteQuery.toString() ? `/admin/itinerary?${quoteQuery}` : null,
              numberInfo: { title: `Your replies go from ${numberName(replyChannel, canSeePhone)}`, lines: numberLines },
              typeAnyway: windowOpen || loadingMessages ? undefined : { active: forceText, onToggle: () => setForceText((v) => !v) },
              onRefresh: refreshStatus,
              refreshing,
              onHelp: help.show,
            },
          },
          messages: {
            messages,
            localMessages: chatLocalMessages,
            loading: loadingMessages,
            customerName: name,
            notices,
            onRetry: retryRecord,
            onRetryLocal: (m: LocalMessage) => sendMessage(m.payload, { replaceLocalId: m.localId }),
            onSendTemplate: () => openTemplatePicker(),
          },
          bottom:
            showTextBox || loadingMessages
              ? {
                  kind: 'composer',
                  props: {
                    value: inputText,
                    onChange: setInputText,
                    onSend: handleSendText,
                    onTemplates: () => openTemplatePicker(),
                    onAttachFile: handleAttach,
                    attaching: attach.busy,
                    attachError: attach.error,
                    placeholder: `Message ${name}`,
                    oldNumber: windowOpen && replyChannel !== provider,
                    warning: !windowOpen && forceText && !loadingMessages ? { onUseTemplate: () => setForceText(false) } : undefined,
                    disabled: loadingMessages,
                  },
                }
              : {
                  kind: 'start',
                  props: {
                    mode: startMode,
                    reason: startReason,
                    customerName: name,
                    step: startStep,
                    picks: startPicks,
                    autofill,
                    onPick: (t: string) => {
                      f.choose(t)
                      setStartStep('fill')
                    },
                    onMore: () => openTemplatePicker(),
                    fill: f.selected
                      ? {
                          template: f.selected,
                          values: f.values,
                          onValues: f.setValues,
                          headerMedia: f.headerMedia,
                          onHeaderMedia: f.setHeaderMedia,
                          showErrors: f.showErrors,
                          missing: f.missing,
                          problem: f.selectedAvail.ok ? undefined : f.selectedAvail.reason || 'This message cannot be sent from the inbox.',
                          note:
                            [f.selected.note, f.detail.error && !f.isMeta && `Couldn't double-check this message online (${f.detail.error}).`].filter(Boolean).join(' ') ||
                            undefined,
                          loadingFields: f.needsDetail && !f.detail.error,
                          canSend: f.canSend,
                          sending: f.sending,
                          onBack: () => {
                            f.choose(undefined)
                            setStartStep('choose')
                          },
                          onSend: sendStart,
                        }
                      : undefined,
                    done: startDone,
                    onAgain: () => {
                      f.choose(undefined)
                      setStartDone(undefined)
                      setStartStep('choose')
                    },
                  },
                },
        }
      })()
    : null

  return (
    <InboxView
      list={{
        chats: visibleChats,
        totalCounts: counts,
        loading: loadingChats,
        selectedId,
        onSelect: (id) => {
          setSelectedId(id)
          setLinkState({ state: 'idle' })
        },
        search: searchQuery,
        onSearch: setSearchQuery,
        filter: chatFilter,
        onFilter: setChatFilter,
        canSeePhone,
        displayName,
        isOldNumber: (c) => !c.isNew && channelOf(c) !== provider,
        onNewChat: canSeePhone ? startNewChat : undefined,
        pendingTemplateTitle: pendingTemplate && !selectedChat ? pendingTitle : undefined,
        onCancelPendingTemplate: () => setPendingTemplate(null),
      }}
      help={{ visible: help.visible, onDismiss: help.dismiss }}
      conversation={linkState.state === 'resolving' || (linkState.state === 'error' && !selectedChat) ? null : conversation}
      placeholder={
        linkState.state === 'resolving'
          ? { state: 'resolving' }
          : linkState.state === 'error' && !selectedChat
            ? { state: 'error', message: linkState.message, onBack: () => setLinkState({ state: 'idle' }) }
            : { state: 'empty' }
      }
    >
      {selectedChat && (
        <TemplatePicker
          open={templateOpen}
          onClose={() => setTemplateOpen(false)}
          customerFirstName={firstName}
          autofill={autofill}
          initialTemplate={pickerTemplate}
          recommend={startMode}
          onSend={async (payload) => {
            await sendMessage(payload)
          }}
        />
      )}
    </InboxView>
  )
}
