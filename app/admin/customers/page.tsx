'use client'

import CustomerRecordsManager from '@/components/admin/CustomerRecordsManager'

/** Customers: confirmed bookings only (customer_itineraries). Quotes live at /admin/quotes. Auth, permissions and chrome come from app/admin/layout.tsx. */
export default function CustomersPage() {
  return <CustomerRecordsManager />
}
