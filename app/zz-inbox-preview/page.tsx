import { notFound } from 'next/navigation'
import InboxPreview from './InboxPreview'

/**
 * DEV ONLY — QA preview of the WhatsApp inbox UI with mock data (no Firestore, nothing is sent).
 * /zz-inbox-preview?state=list|open|closed|fill|done|oldnumber|mobile-list|mobile-chat[&admin=1][&menu=1]
 */
export const dynamic = 'force-dynamic'

export const metadata = { robots: { index: false, follow: false } }

export default function InboxPreviewPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const one = (k: string) => {
    const v = searchParams[k]
    return Array.isArray(v) ? v[0] : v
  }
  return <InboxPreview state={one('state') || 'list'} admin={one('admin') === '1'} menu={one('menu') === '1'} />
}
