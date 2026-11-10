'use client'

/**
 * Data for the admin Overview: reads every lead / message source in parallel and turns it into
 *  - 4 KPIs (new today, waiting for first contact, follow-ups due, unread WhatsApp), each with a per-source breakdown
 *  - one combined "Who to contact now" list
 *  - this-month numbers and upcoming confirmed trips.
 *
 * Firestore reads come back first and render immediately; the live Meta lead list (GET /api/facebook/meta-leads,
 * which pages through every lead form on Meta) is merged in when it arrives, with a timeout and a graceful
 * "Meta leads unavailable" fallback. Spam contact messages and old Facebook copies in `leads` are excluded everywhere.
 */
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { toMillis } from '@/components/admin/ui'
import { isSpamContact } from '@/lib/admin/spam'
import {
  daysSince, isFacebookCopy, isWebsiteFollowUpDue, isoDay, phoneKey, startOfMonth, startOfToday, websiteStage,
} from '@/lib/admin/leadStats'
import { ensureCrmRecord, leadName, leadPhone, fieldValue, type CrmRecord, type MetaLead } from '@/lib/metaLeadsCrm'

const DAY = 86400000
/** "Waiting for first contact" ignores leads older than this */
const WAITING_WINDOW_DAYS = 30
const META_TIMEOUT_MS = 12000
/** A sent quote with no booking after this many days needs a follow-up call */
export const QUOTE_FOLLOW_UP_DAYS = 3

export type ActionSource = 'Meta' | 'Website' | 'AI Planner' | 'Contact' | 'WhatsApp' | 'Quote'

export interface ActionItem {
  key: string
  source: ActionSource
  name: string
  snippet: string
  /** 0 = follow-up due/overdue, 1 = waiting (new lead, unread message) */
  urgency: 0 | 1
  /** ms: due date for follow-ups, received time for new items */
  at: number
  reasons: string[]
  href: string
  /** Firestore path the WhatsApp inbox resolves the number from */
  refPath?: string
  phone?: string
  /** Runs before opening the inbox (creates the Meta CRM record the ref points at) */
  prepare?: () => Promise<unknown>
}

export interface Breakdown { label: string; value: number | null }
export interface Kpi { value: number; parts: Breakdown[] }

export interface TripRow {
  id: string
  clientName: string
  destination: string
  travelDate: string
  totalCost: number
  balance: number
}

interface WebLead { id: string; col: 'leads' | 'ai_planner_leads'; name: string; phone: string; trip: string; status: string; followUpAt: string; createdAt: number }
interface ContactRow { id: string; name: string; phone: string; trip: string; message: string; status: 'new' | 'read' | 'replied'; createdAt: number }
interface ChatRow { id: string; name: string; phone: string; lastMessage: string; at: number; unread: number }
interface Itin { id: string; status: string; clientName: string; clientPhone: string; destination: string; travelDate: string; totalCost: number; advancePaid: number; createdAt: number; updatedAt: number; sentAt: number; confirmedAt: number }

type MetaState = { status: 'off' | 'loading' | 'ok' | 'error'; leads: MetaLead[]; error?: string }

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.warn('[Overview]', e)
    return fallback
  }
}

const docsOf = (name: string, ...constraints: any[]) =>
  safe(async () => (await getDocs(constraints.length ? query(collection(db, name), ...constraints) : collection(db, name))).docs, [] as any[])

function contactStatus(raw: any, read: boolean): ContactRow['status'] {
  const s = String(raw || '').toLowerCase()
  if (s === 'replied' || s === 'closed' || s === 'contacted') return 'replied'
  if (s === 'read' || read) return 'read'
  return 'new'
}

const snippet = (s?: string, n = 90) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

export function useOverviewData() {
  const { currentUser, isAdmin, permissions } = useAuth()
  const can = (p: string) => isAdmin || permissions.includes(p)
  const access = {
    leads: can('leads'),
    contacts: can('contacts'),
    whatsapp: can('whatsapp') || can('leads'),
    quotes: can('create-itinerary') || can('customer-records'),
    bookings: can('customer-records'),
  }

  const [loading, setLoading] = useState(true)
  const [web, setWeb] = useState<WebLead[]>([])
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [spamCount, setSpamCount] = useState(0)
  const [crm, setCrm] = useState<Record<string, CrmRecord>>({})
  const [chats, setChats] = useState<ChatRow[]>([])
  const [itins, setItins] = useState<Itin[]>([])
  const [meta, setMeta] = useState<MetaState>({ status: access.leads ? 'loading' : 'off', leads: [] })

  // Firestore sources (parallel)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const monthTs = Timestamp.fromMillis(startOfMonth())
      const [leadDocs, aiDocs, unreadMsgDocs, monthMsgDocs, crmDocs, chatDocs, itinDocs] = await Promise.all([
        access.leads ? docsOf('leads') : Promise.resolve([]),
        access.leads ? docsOf('ai_planner_leads') : Promise.resolve([]),
        access.contacts ? docsOf('contact_messages', where('read', '==', false)) : Promise.resolve([]),
        access.contacts ? docsOf('contact_messages', where('createdAt', '>=', monthTs)) : Promise.resolve([]),
        access.leads ? docsOf('meta_lead_crm') : Promise.resolve([]),
        access.whatsapp ? docsOf('whatsapp_chats', where('unreadCount', '>', 0)) : Promise.resolve([]),
        access.quotes || access.bookings ? docsOf('customer_itineraries') : Promise.resolve([]),
      ])
      if (cancelled) return

      const mapWeb = (d: any, col: WebLead['col']): WebLead | null => {
        const x = d.data()
        if (col === 'leads' && isFacebookCopy(x)) return null
        return {
          id: d.id, col,
          name: x.name || x.fullName || x.customerName || 'Unknown',
          phone: x.mobile || x.phone || x.phoneNumber || '',
          trip: x.destination || x.packageName || x.packageContext || x.selectedDestination || '',
          status: x.status || 'new',
          followUpAt: x.followUpAt || '',
          createdAt: toMillis(x.createdAt),
        }
      }
      setWeb([...leadDocs.map((d: any) => mapWeb(d, 'leads')), ...aiDocs.map((d: any) => mapWeb(d, 'ai_planner_leads'))].filter(Boolean) as WebLead[])

      const seen = new Map<string, ContactRow>()
      let spam = 0
      for (const d of [...unreadMsgDocs, ...monthMsgDocs]) {
        if (seen.has(d.id)) continue
        const x = d.data()
        if (isSpamContact(x)) { seen.set(d.id, null as any); spam++; continue }
        seen.set(d.id, {
          id: d.id, name: x.name || x.email || 'Unknown', phone: x.phone || '', trip: x.destination || x.subject || '',
          message: x.message || '', status: contactStatus(x.status, !!x.read), createdAt: toMillis(x.createdAt),
        })
      }
      setContacts(Array.from(seen.values()).filter(Boolean))
      setSpamCount(spam)

      const crmMap: Record<string, CrmRecord> = {}
      crmDocs.forEach((d: any) => (crmMap[d.id] = { ...(d.data() as CrmRecord), leadId: d.id }))
      setCrm(crmMap)

      setChats(chatDocs.map((d: any) => {
        const x = d.data()
        return { id: d.id, name: x.customerName || x.name || x.phone || d.id, phone: x.phone || d.id, lastMessage: x.lastMessage || '', at: toMillis(x.lastMessageTimestamp || x.updatedAt), unread: Number(x.unreadCount) || 0 }
      }))

      setItins(itinDocs.map((d: any) => {
        const x = d.data()
        return {
          id: d.id, status: String(x.status || 'draft'), clientName: x.clientName || x.name || '—', clientPhone: x.clientPhone || '',
          destination: x.destinationName || x.packageName || '', travelDate: x.travelDate || '',
          totalCost: Number(x.totalCost) || 0, advancePaid: Number(x.advancePaid) || 0,
          createdAt: toMillis(x.createdAt), updatedAt: toMillis(x.updatedAt), sentAt: toMillis(x.sentAt), confirmedAt: toMillis(x.confirmedAt || x.bookedAt),
        }
      }))
      setLoading(false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.leads, access.contacts, access.whatsapp, access.quotes, access.bookings])

  // Live Meta leads (slow external call) — in parallel, with timeout
  useEffect(() => {
    if (!access.leads || !currentUser) { setMeta({ status: access.leads ? 'loading' : 'off', leads: [] }); return }
    let cancelled = false
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), META_TIMEOUT_MS)
    ;(async () => {
      try {
        const idToken = await currentUser.getIdToken()
        const res = await fetch('/api/facebook/meta-leads', { headers: { Authorization: `Bearer ${idToken}` }, signal: ctrl.signal })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) setMeta({ status: 'error', leads: [], error: json.error || `HTTP ${res.status}` })
        else setMeta({ status: 'ok', leads: Array.isArray(json.leads) ? json.leads : [] })
      } catch (e: any) {
        if (!cancelled) setMeta({ status: 'error', leads: [], error: e?.name === 'AbortError' ? 'timed out' : e?.message || 'failed' })
      } finally {
        clearTimeout(timer)
      }
    })()
    return () => { cancelled = true; clearTimeout(timer); ctrl.abort() }
  }, [access.leads, currentUser])

  const computed = useMemo(() => {
    const today = startOfToday()
    const endOfToday = today + DAY
    const month = startOfMonth()
    const todayIso = isoDay()
    const metaOk = meta.status === 'ok'
    const items: ActionItem[] = []

    // ---- Meta ----
    const metaById = new Map(meta.leads.map((l) => [l.id, l]))
    const metaNew: ActionItem[] = []
    const metaFollow: ActionItem[] = []
    let metaToday = 0
    let metaMonth = 0
    if (access.leads) {
      for (const l of meta.leads) {
        const created = toMillis(l.created_time)
        if (created >= today) metaToday++
        if (created >= month) metaMonth++
        const rec = crm[l.id]
        if (!rec || rec.stage === 'new') {
          metaNew.push({
            key: `meta:${l.id}`, source: 'Meta', name: leadName(l), urgency: 1, at: created, reasons: ['New lead'],
            snippet: snippet(rec?.travel?.destination || fieldValue(l, 'destination', 'where_would_you_like_to_go?', 'travel_destination') || l.form_name || l.campaign_name || ''),
            href: `/admin/meta-leads/${l.id}`, refPath: `meta_lead_crm/${l.id}`, phone: leadPhone(l),
            prepare: rec ? undefined : () => ensureCrmRecord(l),
          })
        }
      }
      for (const rec of Object.values(crm)) {
        // CRM records Meta no longer returns (older than Meta's retention) still count when untouched
        if (rec.stage === 'new' && !metaById.has(rec.leadId)) {
          metaNew.push({ key: `meta:${rec.leadId}`, source: 'Meta', name: rec.name || 'Unknown', urgency: 1, at: toMillis(rec.leadCreatedAt), reasons: ['New lead'], snippet: snippet(rec.travel?.destination || rec.formName || rec.campaignName), href: `/admin/meta-leads/${rec.leadId}`, refPath: `meta_lead_crm/${rec.leadId}`, phone: rec.phone })
        }
        const due = toMillis(rec.nextFollowUp)
        if (due && due < endOfToday && rec.stage !== 'won' && rec.stage !== 'lost') {
          const d = daysSince(due)
          metaFollow.push({ key: `meta:${rec.leadId}`, source: 'Meta', name: rec.name || 'Unknown', urgency: 0, at: due, reasons: [d ? `Follow-up overdue ${d}d` : 'Follow-up due today'], snippet: snippet(rec.travel?.destination || rec.formName || rec.campaignName), href: `/admin/meta-leads/${rec.leadId}`, refPath: `meta_lead_crm/${rec.leadId}`, phone: rec.phone })
        }
      }
    }
    // "Waiting for first contact" only counts leads from the last ${WAITING_WINDOW_DAYS} days — older untouched leads are cold,
    // not today's work (they're still on the Meta Leads / Website Leads pages)
    const fresh = (at: number) => !!at && at >= Date.now() - WAITING_WINDOW_DAYS * DAY
    const metaNewFresh = metaNew.filter((i) => fresh(i.at))
    // a lead both new and with a follow-up date shows once (as follow-up)
    const metaFollowKeys = new Set(metaFollow.map((i) => i.key))
    items.push(...metaFollow, ...metaNewFresh.filter((i) => !metaFollowKeys.has(i.key)))

    // ---- Website + AI planner ----
    let webToday = 0, webNew = 0, webFollow = 0, webMonth = 0, aiMonth = 0
    for (const l of web) {
      const source: ActionSource = l.col === 'ai_planner_leads' ? 'AI Planner' : 'Website'
      if (l.createdAt >= today) webToday++
      if (l.createdAt >= month) { if (source === 'AI Planner') aiMonth++; else webMonth++ }
      const base = { key: `${l.col}:${l.id}`, source, name: l.name, snippet: snippet(l.trip), href: `/admin/leads?lead=${l.id}`, refPath: `${l.col}/${l.id}`, phone: l.phone }
      if (isWebsiteFollowUpDue(l.status, l.followUpAt)) {
        webFollow++
        const d = l.followUpAt ? daysSince(l.followUpAt) : 0
        items.push({ ...base, urgency: 0, at: l.followUpAt ? new Date(`${l.followUpAt}T00:00:00`).getTime() : l.createdAt, reasons: [l.followUpAt && l.followUpAt < todayIso ? `Follow-up overdue ${d}d` : 'Follow-up due today'] })
      } else if (websiteStage(l.status) === 'new' && fresh(l.createdAt)) {
        webNew++
        items.push({ ...base, urgency: 1, at: l.createdAt, reasons: ['New lead'] })
      }
    }
    // A brand-new lead with a follow-up date still counts as "waiting for first contact"
    webNew += web.filter((l) => websiteStage(l.status) === 'new' && fresh(l.createdAt) && isWebsiteFollowUpDue(l.status, l.followUpAt)).length

    // ---- Contact Us (spam already removed) ----
    let contactToday = 0, contactMonth = 0
    const contactUnread = contacts.filter((m) => m.status === 'new' && fresh(m.createdAt))
    for (const m of contacts) {
      if (m.createdAt >= today) contactToday++
      if (m.createdAt >= month) contactMonth++
    }
    for (const m of contactUnread) {
      items.push({ key: `contact:${m.id}`, source: 'Contact', name: m.name, urgency: 1, at: m.createdAt, reasons: ['Unread message'], snippet: snippet(m.trip ? `${m.trip} — ${m.message}` : m.message), href: `/admin/enquiries?msg=${m.id}`, refPath: m.phone ? `contact_messages/${m.id}` : undefined, phone: m.phone })
    }

    // ---- WhatsApp ----
    const unreadChats = chats.filter((c) => c.unread > 0)
    for (const c of unreadChats) {
      items.push({ key: `wa:${c.id}`, source: 'WhatsApp', name: c.name, urgency: 1, at: c.at, reasons: [`Unread WhatsApp${c.unread > 1 ? ` (${c.unread})` : ''}`], snippet: snippet(c.lastMessage), href: `/admin/whatsapp-chats?ref=${encodeURIComponent(`whatsapp_chats/${c.id}`)}`, refPath: `whatsapp_chats/${c.id}`, phone: c.phone })
    }

    // ---- Quotes sent > N days ago (no booking yet) ----
    const staleQuotes = access.quotes
      ? itins.filter((q) => q.status === 'sent' && (q.sentAt || q.updatedAt || q.createdAt) && (q.sentAt || q.updatedAt || q.createdAt) < today - (QUOTE_FOLLOW_UP_DAYS - 1) * DAY)
      : []
    for (const q of staleQuotes) {
      const sent = q.sentAt || q.updatedAt || q.createdAt
      items.push({ key: `quote:${q.id}`, source: 'Quote', name: q.clientName, urgency: 0, at: sent, reasons: [`Quote sent ${daysSince(sent)}d ago`], snippet: snippet(q.destination), href: '/admin/quotes', refPath: q.clientPhone ? `customer_itineraries/${q.id}` : undefined, phone: q.clientPhone })
    }

    // ---- Merge the same customer across sources (same phone) and sort by urgency ----
    items.sort((a, b) => a.urgency - b.urgency || (a.urgency === 0 ? a.at - b.at : b.at - a.at))
    const byPhone = new Map<string, ActionItem>()
    const actions: ActionItem[] = []
    for (const it of items) {
      const k = phoneKey(it.phone)
      const prev = k ? byPhone.get(k) : undefined
      if (prev) {
        for (const r of it.reasons) if (!prev.reasons.includes(r)) prev.reasons.push(r)
        continue
      }
      const copy = { ...it, reasons: [...it.reasons] }
      if (k) byPhone.set(k, copy)
      actions.push(copy)
    }

    const metaNewCount = metaNewFresh.length
    const kpis = {
      newToday: {
        value: (metaOk ? metaToday : 0) + webToday + contactToday,
        parts: [
          ...(access.leads ? [{ label: 'Meta', value: metaOk ? metaToday : null }, { label: 'Website', value: webToday }] : []),
          ...(access.contacts ? [{ label: 'Contact', value: contactToday }] : []),
        ],
      } as Kpi,
      waiting: {
        value: metaNewCount + webNew + contactUnread.length,
        parts: [
          ...(access.leads ? [{ label: 'Meta', value: metaOk ? metaNewCount : null }, { label: 'Website', value: webNew }] : []),
          ...(access.contacts ? [{ label: 'Contact', value: contactUnread.length }] : []),
        ],
      } as Kpi,
      followUps: {
        value: metaFollow.length + webFollow + staleQuotes.length,
        parts: [
          ...(access.leads ? [{ label: 'Meta', value: metaFollow.length }, { label: 'Website', value: webFollow }] : []),
          ...(access.quotes ? [{ label: 'Quotes', value: staleQuotes.length }] : []),
        ],
      } as Kpi,
      whatsapp: { value: unreadChats.length, parts: [{ label: 'messages', value: unreadChats.reduce((s, c) => s + c.unread, 0) }] } as Kpi,
    }

    // ---- This month ----
    const isBooking = (q: Itin) => q.status === 'confirmed' || q.status === 'completed'
    const bookedThisMonth = itins.filter((q) => isBooking(q) && (q.confirmedAt || q.updatedAt || q.createdAt) >= month)
    const monthStats = {
      leads: [
        ...(access.leads ? [{ label: 'Meta', value: metaOk ? metaMonth : null }, { label: 'Website', value: webMonth }, { label: 'AI Planner', value: aiMonth }] : []),
        ...(access.contacts ? [{ label: 'Contact', value: contactMonth }] : []),
      ] as Breakdown[],
      quotesMade: itins.filter((q) => (q.status === 'draft' || q.status === 'sent') && q.createdAt >= month).length,
      quotesSent: itins.filter((q) => q.status === 'sent' && (q.sentAt || q.updatedAt || q.createdAt) >= month).length,
      bookings: bookedThisMonth.length,
      bookedValue: bookedThisMonth.reduce((s, q) => s + q.totalCost, 0),
      balance: itins.filter(isBooking).reduce((s, q) => s + Math.max(0, q.totalCost - q.advancePaid), 0),
    }

    // ---- Upcoming confirmed trips (next 30 days) ----
    const trips: TripRow[] = itins
      .filter((q) => q.status === 'confirmed' && q.travelDate)
      .map((q) => ({ q, t: new Date(/^\d{4}-\d{2}-\d{2}$/.test(q.travelDate) ? `${q.travelDate}T00:00:00` : q.travelDate).getTime() }))
      .filter(({ t }) => !Number.isNaN(t) && t >= today && t < today + 31 * DAY)
      .sort((a, b) => a.t - b.t)
      .map(({ q }) => ({ id: q.id, clientName: q.clientName, destination: q.destination, travelDate: q.travelDate, totalCost: q.totalCost, balance: Math.max(0, q.totalCost - q.advancePaid) }))

    return { kpis, actions, monthStats, trips }
  }, [meta, crm, web, contacts, chats, itins, access.leads, access.contacts, access.quotes])

  return { loading, access, meta, spamCount, ...computed }
}
