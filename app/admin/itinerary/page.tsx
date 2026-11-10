'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import ItineraryGenerator, { type ItineraryPrefill } from '@/components/admin/ItineraryGenerator'
import { PageHeader, Spinner } from '@/components/admin/ui'

/** yyyy-mm-dd, or a parseable date string converted to yyyy-mm-dd; '' when not a date */
function toIsoDate(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/) // 14/02/2027 (Indian order)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const toCount = (raw: string | null) => {
  const n = parseInt(String(raw ?? '').replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Reads ?name=&phone=&email=&destination=&date=&adults=&children= (links from leads) into a builder prefill.
 * Links made for non-admins carry `ref=<collection>/<id>` instead of `phone=`: the builder resolves the number from it
 * and keeps it masked (lib/admin/privacy.tsx).
 */
function ItineraryBuilder() {
  const sp = useSearchParams()
  const key = sp.toString()

  const prefill = useMemo<ItineraryPrefill | undefined>(() => {
    if (!key) return undefined
    const get = (k: string) => (sp.get(k) || '').trim()
    const rawDate = get('date')
    const isoDate = toIsoDate(rawDate)
    const p: ItineraryPrefill = {
      clientName: get('name') || undefined,
      clientPhone: get('phone') || undefined,
      clientPhoneRef: get('ref') || undefined,
      clientEmail: get('email') || undefined,
      destinationName: get('destination') || undefined,
      travelDate: isoDate || undefined,
      adults: toCount(sp.get('adults')) || undefined,
      children: toCount(sp.get('children')),
      notes: rawDate && !isoDate ? `Travel date (from enquiry): ${rawDate}` : undefined,
    }
    return p
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Remount when the query changes so the new prefill is applied
  return <ItineraryGenerator key={key || 'blank'} prefill={prefill} />
}

export default function AdminItineraryPage() {
  return (
    <div>
      <PageHeader
        title="Create quote PDF"
        description="Build a beautiful, branded itinerary for a customer — then download it or share it on WhatsApp."
      />
      <Suspense fallback={<Spinner label="Loading builder…" />}>
        <ItineraryBuilder />
      </Suspense>
    </div>
  )
}
