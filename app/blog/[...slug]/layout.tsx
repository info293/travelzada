import { Metadata } from 'next'

interface LayoutProps {
    children: React.ReactNode
    params: { slug: string[] }
}

export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata> {
    const slugPath = params.slug.join('/')

    return {
        alternates: {
            canonical: `/blog/${slugPath}`,
        },
    }
}

export default function BlogPostLayout({ children }: LayoutProps) {
    return children
}
