import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Travel Blog | Travelzada - Tips, Guides & Destination Insights',
    description: 'Read the latest travel tips, destination guides, and travel insights from Travelzada. Get expert advice for your next trip.',
    alternates: {
        canonical: '/blog',
    },
    openGraph: {
        title: 'Travel Blog | Travelzada',
        description: 'Travel tips, destination guides, and insights from Travelzada.',
        type: 'website',
    },
}

export default function BlogLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
