import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your decor design | Travelzada',
  description: 'Review your venue decor design, comment, approve and book.',
  robots: { index: false, follow: false },
}

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return children
}
