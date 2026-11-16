import { notFound } from 'next/navigation'
import QuotePreviewClient from './QuotePreviewClient'

/**
 * DEV-ONLY QA page for the quote PDF design. 404 in production.
 *   /zz-quote-preview                  Kashmir sample (2 options: Premium 4★ & Luxury 5★)
 *   /zz-quote-preview?sample=maldives  4-resort comparison sample
 *   /zz-quote-preview?sample=single    single-option quote
 *   /zz-quote-preview?p=3              only page 3 (for screenshots)
 *   /zz-quote-preview?pdf=1            builds the real PDF in the page and prints its size (no download)
 */
export const dynamic = 'force-dynamic'

export const metadata = { robots: { index: false, follow: false } }

export default function QuotePreviewPage({ searchParams }: { searchParams: { p?: string; sample?: string; pdf?: string } }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const page = parseInt(String(searchParams?.p || ''), 10)
  const sample = String(searchParams?.sample || 'kashmir').toLowerCase()
  return <QuotePreviewClient page={Number.isFinite(page) && page > 0 ? page : 0} sample={sample} pdfCheck={searchParams?.pdf === '1'} />
}
