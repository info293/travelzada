import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Redeem your Travelzada voucher',
  description: 'Scan, enter your details and get your unique Travelzada holiday voucher code on email and WhatsApp.',
  robots: { index: false, follow: false },
}

export default function VoucherLayout({ children }: { children: React.ReactNode }) {
  return children
}
