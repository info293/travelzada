import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import HreflangTags from '@/components/HreflangTags'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Travelzada - Plan your perfect trip in seconds',
  description: 'One best itinerary, made just for you',
  metadataBase: new URL('https://www.travelzada.com'),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.travelzada.com/',
    siteName: 'Travelzada',
    title: 'Travelzada - Plan your perfect trip in seconds',
    description: 'AI-powered travel planning for couples. Curated packages for Bali, Kashmir, Kerala, Singapore & more.',
    images: [{ url: 'https://www.travelzada.com/images/og-homepage.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Travelzada - Plan your perfect trip in seconds',
    description: 'AI-powered travel planning for couples.',
    images: ['https://www.travelzada.com/images/og-homepage.jpg'],
  },
  icons: {
    icon: '/images/logo/icons.png',
    shortcut: '/images/logo/icons.png',
    apple: '/images/logo/icons.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${playfair.variable}`}>
        <GoogleAnalytics />
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "ucs8nglt5k");
            `,
          }}
        />
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'TravelAgency',
              name: 'Travelzada',
              url: 'https://www.travelzada.com/',
              logo: 'https://www.travelzada.com/images/logo/Travelzada%20Logo%20April%20(1).png',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+919929962350',
                contactType: 'customer support',
                email: 'info@travelzada.com',
              },
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Plot No. 18, Friends Colony, Malviya Nagar',
                addressLocality: 'Jaipur',
                addressRegion: 'Rajasthan',
                postalCode: '302017',
                addressCountry: 'IN'
              },
              hasMap: 'https://www.google.com/maps/search/?api=1&query=Travelzada+Malviya+Nagar+Jaipur',
              sameAs: [
                'https://facebook.com/travelzada',
                'https://linkedin.com/company/travelzada',
              ],
            }),
          }}
        />
        <Suspense fallback={null}>
          <HreflangTags />
          <AuthProvider>{children}</AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}


