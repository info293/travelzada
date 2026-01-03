import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import GoogleAnalytics from '@/components/GoogleAnalytics'

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
  alternates: {
    canonical: '/',
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
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
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
              '@type': 'Organization',
              name: 'Travelzada',
              url: 'https://www.travelzada.com/',
              logo: 'https://www.travelzada.com/images/logo/Travelzada%20Logo%20April%20(1).png',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+919929962350',
                contactType: 'customer support',
                email: 'info@travelzada.com',
              },
              sameAs: [
                'https://facebook.com',
                'https://x.com',
                'https://instagram.com',
                'https://youtube.com',
              ],
            }),
          }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}


