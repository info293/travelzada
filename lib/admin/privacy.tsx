'use client'

/**
 * Customer phone privacy in the admin.
 *
 * Rule (owner's decision): only admins (role === 'admin') may SEE a customer's phone number.
 * Everyone else contacts customers ONLY through the business WhatsApp inbox (/admin/whatsapp-chats):
 * no visible number, no tel: links, no personal wa.me links, no phone column in exports.
 *
 * Links into the inbox carry a reference to the lead (`?ref=leads/abc123`), never the number, so it does not
 * show up in the address bar or browser history. The inbox resolves the reference to the number itself.
 *
 * NOTE: this hides numbers in the UI. Firestore itself must also stop serving these collections to non-admins
 * for the protection to be complete (see firestore security rules).
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

/** Collections a `ref` may point at, and where the phone lives in each */
export const PHONE_REF_FIELDS: Record<string, string[]> = {
  leads: ['mobile', 'phone', 'phoneNumber'],
  ai_planner_leads: ['mobile', 'phone', 'phoneNumber'],
  contact_messages: ['phone', 'mobile'],
  customer_itineraries: ['clientPhone', 'phone'],
  meta_lead_crm: ['phone', 'phoneNorm'],
  vendor_leads: ['userPhone', 'phone', 'mobile'],
  voucher_claims: ['phoneNorm', 'phone', 'mobile'],
  vouchers: ['phone', 'mobile', 'recipientPhone'],
  whatsapp_chats: ['phone'],
}

export function usePhoneAccess() {
  const { isAdmin } = useAuth()
  return { canSeePhone: !!isAdmin }
}

/** "+91 98765 43210" → "+91 ••••• ••210" */
export function maskPhone(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const last = digits.slice(-3)
  const cc = digits.length > 10 ? '+' + digits.slice(0, digits.length - 10) + ' ' : ''
  return `${cc}••••• ••${last}`
}

/** Pretty full number for admins: "+91 98765 43210" */
export function formatPhone(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  return '+' + digits
}

export interface InboxTarget {
  /** Firestore path of the record the number belongs to, e.g. "leads/abc123" (preferred — keeps the number out of the URL) */
  ref?: string
  /** Display name for a new conversation */
  name?: string
  /** Only used when there is no ref (admins only) */
  phone?: string
}

/** URL of the WhatsApp inbox opened on this customer's chat */
export function inboxHref({ ref, name, phone }: InboxTarget, canSeePhone = false): string {
  const q = new URLSearchParams()
  if (ref) q.set('ref', ref)
  else if (phone && canSeePhone) q.set('phone', phone)
  if (name) q.set('name', name)
  const s = q.toString()
  return `/admin/whatsapp-chats${s ? `?${s}` : ''}`
}

/** Resolve `?ref=collection/id` to the stored phone number (null if not allowed / not found). */
export async function resolveRefPhone(ref?: string | null): Promise<{ phone: string; name: string } | null> {
  const m = String(ref || '').match(/^([a-z_]+)\/([A-Za-z0-9_\-+]+)$/)
  if (!m || !PHONE_REF_FIELDS[m[1]]) return null
  const snap = await getDoc(doc(db, m[1], m[2]))
  if (!snap.exists()) return null
  const data = snap.data() as Record<string, any>
  const phone = PHONE_REF_FIELDS[m[1]].map((f) => data[f]).find((v) => v && String(v).replace(/\D/g, '').length >= 8)
  if (!phone) return null
  const name = data.name || data.clientName || data.fullName || data.customerName || data.userName || ''
  return { phone: String(phone), name: String(name) }
}

/**
 * The one way to show a customer's phone in the admin.
 * Admins: full number + "Chat" (inbox) + optional call icon. Everyone else: masked number + "Chat" only.
 * Clicking the number itself always opens the WhatsApp inbox on that customer.
 */
export function PhoneLink({
  phone,
  name,
  refPath,
  showCall = true,
  compact = false,
  className = '',
}: {
  phone?: string | null
  name?: string
  /** Firestore path of the record, e.g. `leads/${id}` */
  refPath?: string
  showCall?: boolean
  compact?: boolean
  className?: string
}) {
  const { canSeePhone } = usePhoneAccess()
  if (!phone && !refPath) return <span className="text-gray-400">—</span>
  const href = inboxHref({ ref: refPath, name, phone: phone || undefined }, canSeePhone)
  const label = phone ? (canSeePhone ? formatPhone(phone) : maskPhone(phone)) : 'WhatsApp'
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -mx-1.5 text-sm font-medium text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 tabular-nums"
        title="Open WhatsApp chat"
      >
        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        {!compact && <span>{label}</span>}
      </Link>
      {canSeePhone && showCall && phone && !compact && (
        <a href={`tel:${String(phone).replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Call (admin only)">
          <Phone className="w-3.5 h-3.5" />
        </a>
      )}
    </span>
  )
}

/** Button version for action rows / drawers */
export function WhatsAppInboxButton({ name, refPath, phone, label = 'Chat on WhatsApp', className = '' }: { name?: string; refPath?: string; phone?: string | null; label?: string; className?: string }) {
  const { canSeePhone } = usePhoneAccess()
  return (
    <Link
      href={inboxHref({ ref: refPath, name, phone: phone || undefined }, canSeePhone)}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 ${className}`}
    >
      <MessageCircle className="w-4 h-4" /> {label}
    </Link>
  )
}

/** Strip phone fields from rows before CSV export when the user isn't an admin */
export function redactForExport<T extends Record<string, any>>(rows: T[], canSeePhone: boolean, fields = ['mobile', 'phone', 'phoneNumber', 'clientPhone', 'phoneNorm']): T[] {
  if (canSeePhone) return rows
  return rows.map((r) => {
    const out: Record<string, any> = { ...r }
    for (const f of fields) if (f in out) out[f] = maskPhone(out[f])
    return out as T
  })
}

/** Phone-like field / column keys (Meta lead form answers such as `phone_number`, sheet columns, etc.) */
export function isPhoneKey(key?: string | null): boolean {
  return /phone|mobile|whatsapp_?(no|num)|contact_?(no|num)/i.test(String(key || ''))
}

/**
 * Open the WhatsApp inbox on a customer, optionally running `prepare()` first — e.g. creating the Firestore record
 * the `ref` points at (a Meta lead's `meta_lead_crm` doc only exists once someone has worked the lead).
 */
export function useOpenInbox() {
  const router = useRouter()
  const { canSeePhone } = usePhoneAccess()
  return useCallback(
    async (target: InboxTarget, prepare?: () => Promise<unknown>) => {
      if (prepare) {
        try {
          await prepare()
        } catch (e) {
          console.warn('[privacy] prepare before opening inbox failed', e)
        }
      }
      router.push(inboxHref(target, canSeePhone))
    },
    [router, canSeePhone]
  )
}

/**
 * PhoneLink for records whose `ref` may not exist yet: same look, but runs `prepare()` before opening the inbox.
 * Admins: full number + call icon. Everyone else: masked number.
 */
export function PreparedPhoneLink({
  phone,
  name,
  refPath,
  prepare,
  showCall = true,
  compact = false,
  className = '',
}: {
  phone?: string | null
  name?: string
  refPath: string
  prepare?: () => Promise<unknown>
  showCall?: boolean
  compact?: boolean
  className?: string
}) {
  const { canSeePhone } = usePhoneAccess()
  const openInbox = useOpenInbox()
  const [busy, setBusy] = useState(false)
  if (!phone) return <span className="text-gray-400">—</span>
  const label = canSeePhone ? formatPhone(phone) : maskPhone(phone)
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={async (e) => {
          e.stopPropagation()
          setBusy(true)
          try {
            await openInbox({ ref: refPath, name }, prepare)
          } finally {
            setBusy(false)
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -mx-1.5 text-sm font-medium text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 tabular-nums disabled:opacity-60"
        title="Open WhatsApp chat"
      >
        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        {!compact && <span>{label}</span>}
      </button>
      {canSeePhone && showCall && !compact && (
        <a href={`tel:${String(phone).replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Call (admin only)">
          <Phone className="w-3.5 h-3.5" />
        </a>
      )}
    </span>
  )
}
