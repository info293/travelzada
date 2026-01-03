import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Login | Travelzada - Sign In to Your Account',
    description: 'Sign in to your Travelzada account for personalized travel recommendations, saved itineraries, and exclusive deals on travel packages.',
    alternates: {
        canonical: '/login',
    },
    robots: {
        index: false,
        follow: true,
    },
}

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
