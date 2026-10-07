import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Venue Decor Studio | Travelzada',
  description: 'Upload a banquet hall or venue photo, pick your decor, and see it styled by AI in three designer variations.',
  robots: { index: false, follow: false },
}

export default function AiImagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
