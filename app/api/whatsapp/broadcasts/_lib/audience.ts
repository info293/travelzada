/**
 * Broadcast audience rules (pure — no Firebase): turn raw Firestore rows of one segment into candidates.
 * The loader in ./server.ts fetches the rows; dedupeAudience() in lib/whatsapp/broadcasts.ts cleans them up.
 */
import { isFacebookCopy, websiteStage } from '@/lib/admin/leadStats'
import { isSpamContact } from '@/lib/admin/spam'
import type { AudienceCandidate, AudienceFilters, SegmentId } from '@/lib/whatsapp/broadcasts'

export interface RawRow {
  id: string
  data: Record<string, any>
}

const DAY = 24 * 60 * 60 * 1000

/** Firestore Timestamp | ISO string | millis → ms (0 when unknown) */
export function ms(v: any): number {
  if (!v) return 0
  if (typeof v?.toMillis === 'function') return v.toMillis()
  if (typeof v?.seconds === 'number') return v.seconds * 1000
  if (typeof v === 'number') return v
  const t = Date.parse(String(v))
  return Number.isNaN(t) ? 0 : t
}

/** "2026-12-12" (or ISO) travel date → local midnight ms */
const dayMs = (v: any): number => {
  const s = String(v || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return ms(v)
  const t = new Date(`${s.slice(0, 10)}T00:00:00`).getTime()
  return Number.isNaN(t) ? 0 : t
}

const firstOf = (...vals: any[]) => vals.map((v) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : v)).find((v) => v && String(v).trim())
const str = (v: any) => (v === undefined || v === null ? undefined : String(v).trim() || undefined)
const contains = (hay: any, needle?: string) => !needle || String(hay || '').toLowerCase().includes(needle.toLowerCase())

/** Which collections a segment reads */
export const SEGMENT_COLLECTIONS: Record<SegmentId, string> = {
  website_leads: 'leads',
  ai_planner_leads: 'ai_planner_leads',
  meta_leads: 'meta_lead_crm',
  quotes_not_booked: 'customer_itineraries',
  upcoming_trips: 'customer_itineraries',
  past_customers: 'customer_itineraries',
  whatsapp_contacts: 'whatsapp_chats',
  contact_form: 'contact_messages',
  // Uploaded lists are loaded by loadListAudience / loadUploadAudience in ./server.ts, never by candidatesFor
  upload: 'whatsapp_contact_lists',
  saved_list: 'whatsapp_contact_lists',
}

export function candidatesFor(segment: SegmentId, f: AudienceFilters, rows: RawRow[], now = Date.now()): AudienceCandidate[] {
  const col = SEGMENT_COLLECTIONS[segment]
  const createdOk = (d: Record<string, any>, field = 'createdAt') => !f.createdWithinDays || ms(d[field]) >= now - f.createdWithinDays * DAY
  const out: AudienceCandidate[] = []
  const push = (r: RawRow, c: Omit<AudienceCandidate, 'refPath'>) => out.push({ refPath: `${col}/${r.id}`, ...c })
  const today = new Date(now).setHours(0, 0, 0, 0)

  switch (segment) {
    case 'website_leads': {
      const statuses = f.statuses?.length ? f.statuses : ['new', 'contacted', 'quoted', 'follow-up']
      for (const r of rows) {
        const d = r.data
        if (isFacebookCopy(d)) continue
        if (!statuses.includes(websiteStage(d.status))) continue
        if (!createdOk(d)) continue
        const destination = firstOf(d.destinations, d.destination, d.country)
        if (f.destination && !contains([destination, d.packageName, d.message].join(' '), f.destination)) continue
        push(r, { name: d.name || d.fullName || '', rawPhone: firstOf(d.mobile, d.phone, d.phoneNumber), destination: str(destination), package: str(d.packageName), travelDate: str(d.travelDate), sortAt: ms(d.createdAt) })
      }
      break
    }
    case 'ai_planner_leads': {
      for (const r of rows) {
        const d = r.data
        if (!createdOk(d)) continue
        if (['lost', 'converted'].includes(websiteStage(d.status))) continue
        const pkg = typeof d.packageContext === 'string' ? d.packageContext.split('\n')[0].slice(0, 120) : undefined
        push(r, { name: d.name || '', rawPhone: firstOf(d.mobile, d.phone, d.phoneNumber), destination: str(firstOf(d.destination, d.destinations)), package: str(pkg), sortAt: ms(d.createdAt) })
      }
      break
    }
    case 'meta_leads': {
      const stages = f.stages?.length ? f.stages : ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation']
      for (const r of rows) {
        const d = r.data
        if (!stages.includes(String(d.stage || 'new'))) continue
        if (f.createdWithinDays && ms(d.leadCreatedAt || d.createdAt) < now - f.createdWithinDays * DAY) continue
        push(r, { name: d.name || '', rawPhone: firstOf(d.phone, d.phoneNorm), destination: str(firstOf(d.travel?.destination, d.travel?.destinations)), sortAt: ms(d.leadCreatedAt || d.createdAt) })
      }
      break
    }
    case 'quotes_not_booked': {
      // Anyone with a booking (confirmed / completed) is left out even if they also have an open quote
      const booked = new Set(
        rows.filter((r) => ['confirmed', 'completed'].includes(r.data.status)).map((r) => String(r.data.clientPhone || '').replace(/\D/g, '').slice(-10)).filter(Boolean)
      )
      const minAge = (f.minAgeDays ?? 2) * DAY
      const maxAge = (f.maxAgeDays ?? 60) * DAY
      for (const r of rows) {
        const d = r.data
        if (d.status !== 'sent') continue
        const sent = ms(d.sentAt) || ms(d.updatedAt) || ms(d.createdAt)
        if (!sent || now - sent < minAge || now - sent > maxAge) continue
        if (booked.has(String(d.clientPhone || '').replace(/\D/g, '').slice(-10))) continue
        push(r, { name: d.clientName || '', rawPhone: firstOf(d.clientPhone, d.phone), destination: str(d.destinationName), package: str(d.packageName), travelDate: str(d.travelDate), sortAt: sent })
      }
      break
    }
    case 'upcoming_trips': {
      const until = today + (f.nextDays || 30) * DAY
      for (const r of rows) {
        const d = r.data
        if (d.status !== 'confirmed') continue
        const t = dayMs(d.travelDate)
        if (!t || t < today || t > until) continue
        push(r, { name: d.clientName || '', rawPhone: firstOf(d.clientPhone, d.phone), destination: str(d.destinationName), package: str(d.packageName), travelDate: str(d.travelDate), sortAt: t })
      }
      break
    }
    case 'past_customers': {
      for (const r of rows) {
        const d = r.data
        const t = dayMs(d.travelDate)
        const past = d.status === 'completed' || (d.status === 'confirmed' && !!t && t < today)
        if (!past) continue
        push(r, { name: d.clientName || '', rawPhone: firstOf(d.clientPhone, d.phone), destination: str(d.destinationName), package: str(d.packageName), travelDate: str(d.travelDate), sortAt: t || ms(d.updatedAt) })
      }
      break
    }
    case 'whatsapp_contacts': {
      const since = now - (f.lastDays || 30) * DAY
      for (const r of rows) {
        const d = r.data
        const last = ms(d.lastInboundAt)
        if (!last || last < since) continue
        // The doc id is the number
        push(r, { name: d.customerName || '', rawPhone: d.phone || r.id, sortAt: last })
      }
      break
    }
    case 'contact_form': {
      for (const r of rows) {
        const d = r.data
        if (!createdOk(d)) continue
        if (isSpamContact(d) || /spam|junk/i.test(String(d.status || ''))) continue
        if (f.destination && !contains([d.destination, d.message].join(' '), f.destination)) continue
        push(r, { name: d.name || '', rawPhone: firstOf(d.phone, d.mobile), destination: str(d.destination), sortAt: ms(d.createdAt) })
      }
      break
    }
  }
  return out
}
