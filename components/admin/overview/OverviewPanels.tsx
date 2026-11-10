'use client'

import Link from 'next/link'
import { ArrowRight, Plane } from 'lucide-react'
import { Card, EmptyState, formatDate, formatINR } from '@/components/admin/ui'
import type { Breakdown, TripRow } from './useOverviewData'

/** "Meta 3 · Website 1 · Contact 0"; null values (source unavailable) show as "n/a" / "…" */
export function breakdownText(parts: Breakdown[], pending = false) {
  return parts.map((p) => `${p.label} ${p.value === null ? (pending ? '…' : 'n/a') : p.value}`).join(' · ')
}

interface MonthProps {
  leads: Breakdown[] | null
  quotes: { made: number; sent: number } | null
  bookings: { count: number; value: number; balance: number } | null
  metaPending: boolean
}

/** Compact strip: leads received by source, quotes, bookings + value, balance still to collect. */
export function MonthStrip({ leads, quotes, bookings, metaPending }: MonthProps) {
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' })
  const cells: Array<{ label: string; value: string; hint?: string; href: string }> = []
  if (leads && leads.length) {
    const total = leads.reduce((s, p) => s + (p.value || 0), 0)
    cells.push({ label: 'Leads received', value: String(total), hint: breakdownText(leads, metaPending), href: '/admin/leads' })
  }
  if (quotes) cells.push({ label: 'Quotes', value: String(quotes.made), hint: `${quotes.sent} marked sent`, href: '/admin/quotes' })
  if (bookings) {
    cells.push({ label: 'Bookings confirmed', value: String(bookings.count), hint: `${formatINR(bookings.value)} booked`, href: '/admin/customers' })
    cells.push({ label: 'Balance to collect', value: formatINR(bookings.balance), hint: 'All confirmed trips', href: '/admin/customers' })
  }
  if (!cells.length) return null
  return (
    <Card padded={false}>
      <div className="px-5 pt-4 pb-1">
        <h2 className="font-semibold text-gray-900">This month <span className="font-normal text-gray-500">· {monthName}</span></h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
        {cells.map((c) => (
          <Link key={c.label} href={c.href} className="px-5 py-3 hover:bg-gray-50">
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{c.value}</p>
            {c.hint && <p className="text-xs text-gray-500 truncate">{c.hint}</p>}
          </Link>
        ))}
      </div>
    </Card>
  )
}

/** Confirmed bookings travelling in the next 30 days. */
export function UpcomingTrips({ trips }: { trips: TripRow[] }) {
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="font-semibold text-gray-900">Upcoming trips</h2>
          <p className="text-xs text-gray-500">Confirmed bookings travelling in the next 30 days</p>
        </div>
        <Link href="/admin/customers" className="text-sm font-semibold text-bordeaux-600 hover:underline inline-flex items-center gap-1">Bookings <ArrowRight className="w-4 h-4" /></Link>
      </div>
      {!trips.length ? (
        <EmptyState title="No trips in the next 30 days" description="Confirmed bookings with a travel date show up here." icon={<Plane className="w-5 h-5" />} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {trips.slice(0, 8).map((t) => {
            const days = Math.round((new Date(/^\d{4}-\d{2}-\d{2}$/.test(t.travelDate) ? `${t.travelDate}T00:00:00` : t.travelDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
            return (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.clientName}</p>
                  <p className="text-xs text-gray-500 truncate">{t.destination || '—'} · {formatDate(t.travelDate)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${days <= 7 ? 'text-red-600' : 'text-gray-600'}`}>{days <= 0 ? 'Today' : `in ${days} day${days === 1 ? '' : 's'}`}</p>
                  {t.balance > 0 && <p className="text-xs text-amber-700">{formatINR(t.balance)} due</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
