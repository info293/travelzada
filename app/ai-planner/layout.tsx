import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'AI Trip Planner | Travelzada - Plan Your Perfect Trip in Seconds',
    description: 'Use our AI-powered trip planner to create personalized travel itineraries in seconds. Just tell us your vibe and get instant, tailored travel plans.',
    alternates: {
        canonical: '/ai-planner',
    },
    openGraph: {
        title: 'AI Trip Planner | Travelzada',
        description: 'Create personalized travel itineraries in seconds with AI.',
        type: 'website',
    },
}

export default function AIPlannerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
