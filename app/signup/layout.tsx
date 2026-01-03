import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Sign Up | Travelzada - Create Your Account',
    description: 'Create your free Travelzada account to access AI-powered travel planning, exclusive deals, and personalized travel recommendations.',
    alternates: {
        canonical: '/signup',
    },
    robots: {
        index: false,
        follow: true,
    },
}

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
