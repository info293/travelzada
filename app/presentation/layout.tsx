import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Travelzada × BNI Jaipur Swastik',
  description: 'Travelzada: journeys designed for you and your better half. Our story, our travellers and how we grow.',
  robots: { index: false, follow: false },
}

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  return children
}
