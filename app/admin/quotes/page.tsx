'use client'

import QuotesManager from '@/components/admin/quotes/QuotesManager'

/** Sent Quotes: quote PDFs shared with customers (customer_itineraries, status draft | sent). Auth, permissions and chrome come from app/admin/layout.tsx. */
export default function QuotesPage() {
  return <QuotesManager />
}
