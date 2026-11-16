'use client'

import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PHONE_REF_FIELDS } from '@/lib/admin/privacy'
import type { VariableSource } from '@/lib/whatsapp/templateCatalog'

export type Autofill = Partial<Record<VariableSource, string>>

const str = (v: any) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')

function prettyDate(v: any): string {
  const s = str(v)
  if (!s) return ''
  if (/^\d{4}-\d{2}(-\d{2})?/.test(s)) {
    const d = new Date(s.length === 7 ? `${s}-01` : s)
    if (!isNaN(d.getTime()))
      return s.length === 7
        ? d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return s
}

/**
 * Trip details from the record a chat is linked to (`leads/abc`, `ai_planner_leads/xyz`, …) to pre-fill template
 * fields. Only trip fields are read out — never the phone number.
 */
export async function readLeadAutofill(ref?: string | null): Promise<Autofill> {
  const m = String(ref || '').match(/^([a-z_]+)\/([A-Za-z0-9_\-+]+)$/)
  if (!m || m[1] === 'whatsapp_chats' || !PHONE_REF_FIELDS[m[1]]) return {}
  const snap = await getDoc(doc(db, m[1], m[2]))
  if (!snap.exists()) return {}
  const d = snap.data() as Record<string, any>
  const pkg = str(d.packageName) || str(d.packageContext) || str(d.packageTitle) || str(d.tripName)
  const destination = str(d.destination) || str(d.destinationName) || pkg.replace(/\s*(package|tour|trip)s?$/i, '')
  const tripType = str(d.travelType) || str(d.tripType) || str(d.occasion)
  const nights = str(d.nights) || (str(d.duration).match(/(\d+)\s*N/i)?.[1] ?? '')
  const out: Autofill = {}
  if (destination && !/custom trip/i.test(destination)) out.destination = destination
  if (pkg && !/custom trip/i.test(pkg)) out.package_name = pkg
  if (tripType) out.trip_type = tripType.toLowerCase()
  const date = prettyDate(d.travelDate || d.startDate || d.travelMonth)
  if (date) out.travel_date = date
  if (/^\d{1,2}$/.test(nights)) out.nights = nights
  return out
}
