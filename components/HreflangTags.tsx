'use client'

import { usePathname } from 'next/navigation'

export default function HreflangTags() {
  const pathname = usePathname()
  const cleanedPath = pathname === '/' ? '' : (pathname || '')
  const currentUrl = `https://www.travelzada.com${cleanedPath}`

  return (
    <>
      <link rel="alternate" hrefLang="en-IN" href={currentUrl} />
      <link rel="alternate" hrefLang="x-default" href={currentUrl} />
    </>
  )
}
