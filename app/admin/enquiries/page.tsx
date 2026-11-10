'use client'

/**
 * Contact Messages: what people send from the Contact Us form (Firestore `contact_messages`).
 * Inbox layout: list on the left, the open message on the right (a drawer on phones).
 * Status values kept from the old admin: new | read | replied. Opening a message marks it read.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs, query, orderBy, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CheckCheck, Download, FileText, Inbox, Mail, MailOpen, MessageCircle, RefreshCw, Trash2 } from 'lucide-react'
import {
  PageHeader, Card, Toolbar, SearchInput, FilterChips, Button, Drawer, Badge, EmptyState, Spinner,
  formatDate, timeAgo, toMillis, exportToCsv, cx,
} from '@/components/admin/ui'
import { PhoneLink, inboxHref, redactForExport, usePhoneAccess } from '@/lib/admin/privacy'

type MsgStatus = 'new' | 'read' | 'replied'

interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string
  destination: string
  occasion: string
  when: string
  message: string
  status: MsgStatus
  read: boolean
  createdAt: any
  repliedAt: any
}

const STATUS_LABEL: Record<MsgStatus, string> = { new: 'Unread', read: 'Read', replied: 'Replied' }
const STATUS_TONE: Record<MsgStatus, 'blue' | 'gray' | 'green'> = { new: 'blue', read: 'gray', replied: 'green' }

function normalizeStatus(raw: any, read: boolean): MsgStatus {
  const s = String(raw || '').toLowerCase()
  if (s === 'replied' || s === 'closed' || s === 'contacted') return 'replied'
  if (s === 'read' || read) return 'read'
  return 'new'
}

const firstName = (n: string) => (n || '').trim().split(/\s+/)[0] || 'there'
const hasPhone = (p?: string) => String(p || '').replace(/\D/g, '').length >= 10

/** Firestore path of the message — the WhatsApp inbox / quote builder resolve the number from it */
const msgRef = (m: ContactMessage) => `contact_messages/${m.id}`
function replyMailto(m: ContactMessage) {
  const subject = `Re: Your enquiry${m.destination ? ` about ${m.destination}` : ''} | Travelzada`
  const quoted = m.message ? `\n\n\n---\nYou wrote:\n${m.message}` : ''
  const body = `Hi ${firstName(m.name)},\n\nThank you for contacting Travelzada.${quoted}`
  return `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
/** Only admins get the number in the URL; everyone else passes a ref the quote builder resolves */
function quoteHref(m: ContactMessage, canSeePhone: boolean) {
  const p = new URLSearchParams()
  if (m.name) p.set('name', m.name)
  if (hasPhone(m.phone)) {
    p.set('ref', msgRef(m)) // lets the builder open the WhatsApp inbox on this message
    if (canSeePhone) p.set('phone', m.phone)
  }
  if (m.email) p.set('email', m.email)
  if (m.destination) p.set('destination', m.destination)
  const qs = p.toString()
  return `/admin/itinerary${qs ? `?${qs}` : ''}`
}

type Filter = 'all' | MsgStatus

export default function EnquiriesPage() {
  const { canSeePhone } = usePhoneAccess()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const load = useCallback(async () => {
    if (!db) return
    setLoading(true)
    setError(null)
    try {
      let snap
      try {
        snap = await getDocs(query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc')))
      } catch {
        snap = await getDocs(collection(db, 'contact_messages'))
      }
      const list: ContactMessage[] = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          destination: data.destination || data.subject || '',
          occasion: data.occasion || '',
          when: data.when || '',
          message: data.message || '',
          status: normalizeStatus(data.status, !!data.read),
          read: !!data.read,
          createdAt: data.createdAt || null,
          repliedAt: data.repliedAt || null,
        }
      })
      list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      setMessages(list)
    } catch (e) {
      console.error('Error fetching contact messages:', e)
      setError('Could not load messages.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const patch = useCallback(async (m: ContactMessage, payload: Record<string, any>, local: Partial<ContactMessage>) => {
    if (!db) return
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...local } : x)))
    try {
      await updateDoc(doc(db, 'contact_messages', m.id), payload)
    } catch (e) {
      console.error('Contact message update failed', e)
      alert('Could not save the change. Please try again.')
      load()
    }
  }, [load])

  const open = (m: ContactMessage) => {
    setSelectedId(m.id)
    // Only use the drawer below the lg breakpoint (it also locks page scroll while open)
    setMobileOpen(typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches)
    if (m.status === 'new') patch(m, { read: true, status: 'read' }, { read: true, status: 'read' })
  }

  const markReplied = (m: ContactMessage) => {
    if (m.status === 'replied') return
    patch(m, { read: true, status: 'replied', repliedAt: serverTimestamp() }, { read: true, status: 'replied', repliedAt: new Date().toISOString() })
  }
  const markUnread = (m: ContactMessage) => patch(m, { read: false, status: 'new' }, { read: false, status: 'new' })

  const remove = async (m: ContactMessage) => {
    if (!db) return
    if (!window.confirm(`Delete the message from ${m.name || m.email}? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'contact_messages', m.id))
      setMessages((prev) => prev.filter((x) => x.id !== m.id))
      if (selectedId === m.id) { setSelectedId(null); setMobileOpen(false) }
    } catch (e) {
      console.error('Delete failed', e)
      alert('Could not delete the message. Please try again.')
    }
  }

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return messages
    // Phone digits are searchable for admins only
    return messages.filter((m) => [m.name, m.email, canSeePhone ? m.phone : '', m.destination, m.message, m.occasion].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [messages, search, canSeePhone])

  const counts = useMemo(() => ({
    all: searched.length,
    new: searched.filter((m) => m.status === 'new').length,
    read: searched.filter((m) => m.status === 'read').length,
    replied: searched.filter((m) => m.status === 'replied').length,
  }), [searched])

  const visible = useMemo(() => (filter === 'all' ? searched : searched.filter((m) => m.status === filter)), [searched, filter])
  const selected = messages.find((m) => m.id === selectedId) || null
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const handleExport = () => exportToCsv(`travelzada-contact-messages-${new Date().toISOString().slice(0, 10)}.csv`, redactForExport(visible.map((m) => ({
    Name: m.name, Email: m.email, Phone: m.phone, Destination: m.destination, Occasion: m.occasion, When: m.when,
    Status: STATUS_LABEL[m.status], Received: formatDate(m.createdAt, true), Message: m.message,
  })), canSeePhone, ['Phone']))

  return (
    <div>
      <PageHeader
        title="Contact Messages"
        description="Messages from the Contact Us form. Reply on WhatsApp or email, then mark them replied."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={!visible.length}><Download className="w-4 h-4" /> Export CSV</Button>
            <Button variant="secondary" onClick={load} loading={loading}>{!loading && <RefreshCw className="w-4 h-4" />} Refresh</Button>
          </>
        }
      />

      <Toolbar>
        <FilterChips
          options={[
            { value: 'all' as Filter, label: 'All', count: counts.all },
            { value: 'new' as Filter, label: 'Unread', count: counts.new },
            { value: 'read' as Filter, label: 'Needs reply', count: counts.read },
            { value: 'replied' as Filter, label: 'Replied', count: counts.replied },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, destination…" className="w-full md:w-80" />
      </Toolbar>

      {error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,400px)_1fr]">
        <Card padded={false} className="overflow-hidden">
          {loading && !messages.length ? (
            <Spinner label="Loading messages…" />
          ) : !visible.length ? (
            <EmptyState icon={<Inbox className="w-5 h-5" />} title={messages.length ? 'No messages here' : 'No messages yet'} description={messages.length ? 'Try another filter or search.' : 'Contact Us form submissions will show up here.'} />
          ) : (
            <ul className="divide-y divide-gray-100 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
              {visible.map((m) => {
                const active = m.id === selectedId
                const unread = m.status === 'new'
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => open(m)}
                      className={cx('w-full text-left px-4 py-3 border-l-4 transition-colors', active ? 'bg-bordeaux-50 border-l-bordeaux-600' : unread ? 'border-l-bordeaux-400 hover:bg-gray-50' : 'border-l-transparent hover:bg-gray-50')}
                    >
                      <div className="flex items-center gap-2">
                        {unread && <span className="w-2 h-2 rounded-full bg-bordeaux-600 shrink-0" />}
                        <span className={cx('truncate text-sm', unread ? 'font-bold text-gray-900' : 'font-medium text-gray-800')}>{m.name || m.email || 'Unknown'}</span>
                        <span className="ml-auto shrink-0 text-xs text-gray-400">{timeAgo(m.createdAt)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {m.destination && <span className="truncate text-xs font-medium text-bordeaux-700">{m.destination}</span>}
                        {m.status === 'replied' && <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <p className={cx('mt-0.5 text-xs line-clamp-2', unread ? 'text-gray-700' : 'text-gray-500')}>{m.message || '(no message)'}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Desktop reading pane */}
        <div className="hidden lg:block">
          <Card className="lg:sticky lg:top-32">
            {selected ? (
              <MessageDetail m={selected} onReplied={() => markReplied(selected)} onUnread={() => markUnread(selected)} onDelete={() => remove(selected)} />
            ) : (
              <EmptyState icon={<MailOpen className="w-5 h-5" />} title="Pick a message" description="Select a message on the left to read and reply." />
            )}
          </Card>
        </div>
      </div>

      {/* Phone / tablet: open message in a drawer */}
      <div className="lg:hidden">
        <Drawer open={mobileOpen && !!selected} onClose={closeMobile} title={selected?.name || 'Message'}>
          {selected && <MessageDetail m={selected} onReplied={() => markReplied(selected)} onUnread={() => markUnread(selected)} onDelete={() => remove(selected)} />}
        </Drawer>
      </div>
    </div>
  )
}

function MessageDetail({ m, onReplied, onUnread, onDelete }: { m: ContactMessage; onReplied: () => void; onUnread: () => void; onDelete: () => void }) {
  const btn = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors'
  const { canSeePhone } = usePhoneAccess()
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{m.name || 'Unknown'}</h2>
          <p className="text-xs text-gray-500">{formatDate(m.createdAt, true)} · {timeAgo(m.createdAt)}</p>
        </div>
        <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div><dt className="text-xs text-gray-500">Phone</dt><dd>{m.phone ? <PhoneLink phone={m.phone} name={m.name} refPath={msgRef(m)} /> : '—'}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-gray-500">Email</dt><dd className="truncate">{m.email ? <a href={`mailto:${m.email}`} className="font-medium text-gray-900 hover:text-bordeaux-700">{m.email}</a> : '—'}</dd></div>
        {m.destination && <div><dt className="text-xs text-gray-500">Destination</dt><dd className="font-medium text-gray-900">{m.destination}</dd></div>}
        {(m.occasion || m.when) && <div><dt className="text-xs text-gray-500">Occasion / when</dt><dd className="font-medium text-gray-900">{[m.occasion, m.when].filter(Boolean).join(' · ')}</dd></div>}
      </dl>

      <div className="mt-4 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">{m.message || '(no message)'}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        {hasPhone(m.phone) && (
          // Replies go through the business WhatsApp inbox (call icon is next to the number, admins only)
          <Link href={inboxHref({ ref: msgRef(m), name: m.name }, canSeePhone)} onClick={onReplied} className={cx(btn, 'bg-emerald-600 text-white hover:bg-emerald-700')}>
            <MessageCircle className="w-4 h-4" /> Reply on WhatsApp
          </Link>
        )}
        {m.email && (
          <a href={replyMailto(m)} onClick={onReplied} className={cx(btn, 'border border-gray-300 text-gray-800 hover:bg-gray-50')}>
            <Mail className="w-4 h-4" /> Reply by email
          </a>
        )}
        <Link href={quoteHref(m, canSeePhone)} className={cx(btn, 'bg-bordeaux-600 text-white hover:bg-bordeaux-700')}>
          <FileText className="w-4 h-4" /> Create quote PDF
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        {m.status !== 'replied' ? (
          <Button variant="secondary" size="sm" onClick={onReplied}><CheckCheck className="w-4 h-4" /> Mark replied</Button>
        ) : (
          <span className="text-xs text-emerald-700">Replied{m.repliedAt ? ` ${timeAgo(m.repliedAt)}` : ''}</span>
        )}
        <Button variant="ghost" size="sm" onClick={onUnread}><Mail className="w-4 h-4" /> Mark unread</Button>
        <Button variant="ghost" size="sm" className="ml-auto text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
      </div>
    </div>
  )
}
