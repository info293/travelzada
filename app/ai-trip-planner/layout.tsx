import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Trip Planner | Travelzada - Plan Your Perfect Trip',
  description: 'Use our AI-powered trip planner to create personalized travel itineraries in seconds. Just tell us your vibe and get instant, tailored travel plans.',
  openGraph: {
    type: 'website',
    url: 'https://www.travelzada.com/ai-trip-planner',
    title: 'AI Trip Planner | Travelzada - Plan Your Perfect Trip',
    description: 'Use our AI-powered trip planner to create personalized travel itineraries in seconds. Just tell us your vibe and get instant, tailored travel plans.',
    images: [{ url: 'https://www.travelzada.com/images/og-homepage.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Trip Planner | Travelzada - Plan Your Perfect Trip',
    description: 'Use our AI-powered trip planner to create personalized travel itineraries in seconds. Just tell us your vibe and get instant, tailored travel plans.',
    images: ['https://www.travelzada.com/images/og-homepage.jpg'],
  }
}

export default function AIPlannerLayout({ children }: { children: React.ReactNode }) {
  return children
}
