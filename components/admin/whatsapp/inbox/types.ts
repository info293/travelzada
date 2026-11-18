import type { WhatsAppChannel } from '@/lib/getgabsTemplates'
import type { TemplateSendPayload } from '@/components/admin/whatsapp/templates/useTemplateForm'

export interface WhatsAppChat {
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
  /** Record the conversation was first started from (e.g. "leads/abc"), saved by the send route */
  sourceRef?: string
  /** Client-only: record the conversation was opened from (e.g. "leads/abc"), used to send by reference */
  ref?: string
  /** Client-only: not yet in Firestore */
  isNew?: boolean
}

export interface WhatsAppMessage {
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

export interface MediaSendPayload {
  media: { kind: 'image' | 'document'; link: string; caption?: string; filename?: string }
}

export type SendPayload = { text: string } | TemplateSendPayload | MediaSendPayload

/** A message sent from this browser that is still in flight, or failed without a Firestore record */
export interface LocalMessage {
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

export const DAY_MS = 24 * 60 * 60 * 1000

/** A "name" that is really just a phone number (the webhook falls back to the number when there's no profile name) */
export const isPhoneLike = (s?: string | null) => !!s && !/[a-z]/i.test(s) && s.replace(/\D/g, '').length >= 7

export const realName = (chat?: WhatsAppChat | null) => (chat?.customerName && !isPhoneLike(chat.customerName) ? chat.customerName.trim() : '')

export const isTemplatePayload = (p: SendPayload): p is TemplateSendPayload => 'templateName' in p
export const isMediaPayload = (p: SendPayload): p is MediaSendPayload => 'media' in p

export const isHttpsMedia = (u?: string | null) => !!u && /^https:\/\//i.test(u)

/** Error codes where a normal message can't go through but a template can */
export const TEMPLATE_INSTEAD_CODES = [131047, 131070, 2494191]

export function formatTime(isoString?: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function formatClock(isoString?: string) {
  const date = new Date(String(isoString || ''))
  return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** "Today" / "Yesterday" / "12 Nov 2026" — WhatsApp-style date chips between days */
export function dayLabel(isoString?: string) {
  const date = new Date(String(isoString || ''))
  if (isNaN(date.getTime())) return ''
  const today = new Date()
  const yesterday = new Date(today.getTime() - DAY_MS)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

/** Where in the admin a linked record (e.g. "leads/abc") can be opened */
export function recordLink(ref?: string | null): { href: string; label: string } | null {
  const m = String(ref || '').match(/^([a-z_]+)\/([A-Za-z0-9_\-+]+)$/)
  if (!m) return null
  const [, col, id] = m
  switch (col) {
    case 'meta_lead_crm':
      return { href: `/admin/meta-leads/${encodeURIComponent(id)}`, label: 'Open the lead' }
    case 'leads':
    case 'ai_planner_leads':
      return { href: '/admin/leads', label: 'Open website leads' }
    case 'contact_messages':
      return { href: '/admin/enquiries', label: 'Open enquiries' }
    case 'customer_itineraries':
      return { href: `/admin/itinerary?quote=${encodeURIComponent(id)}`, label: 'Open the quote' }
    case 'vendor_leads':
      return { href: '/admin/vendor', label: 'Open vendor leads' }
    case 'vouchers':
    case 'voucher_claims':
      return { href: '/admin/vouchers', label: 'Open vouchers' }
    default:
      return null
  }
}
