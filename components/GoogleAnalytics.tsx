'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

// Google Analytics Account ID: 375765240
// Using GA4 Measurement ID format (G-XXXXXXXXXX)
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-5JQNQ4BRCJ'

// Separate component for page tracking that uses useSearchParams
// This MUST be wrapped in Suspense to prevent SSR bailout
function PageTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

    // Track page view
    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      })
    }
  }, [pathname, searchParams])

  return null
}

// Main GoogleAnalytics component - only loads scripts
// Page tracking is handled by PageTracker wrapped in Suspense
export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
      {/* PageTracker is wrapped in Suspense to prevent useSearchParams from causing SSR bailout */}
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
    </>
  )
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
  }
}


