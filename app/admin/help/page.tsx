'use client'

import { useMemo } from 'react'
import { marked } from 'marked'
import { ADMIN_GUIDE_MD } from '@/lib/admin/guide'
import { Card } from '@/components/admin/ui'

export default function AdminHelpPage() {
  const html = useMemo(() => marked.parse(ADMIN_GUIDE_MD, { async: false }) as string, [])
  return (
    <Card className="max-w-4xl">
      <article
        className="admin-guide text-sm text-gray-700 leading-relaxed
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-3
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3
          [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-5 [&_h3]:mb-2
          [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1
          [&_strong]:text-gray-900 [&_hr]:my-6 [&_hr]:border-gray-200
          [&_table]:w-full [&_table]:my-3 [&_table]:text-xs [&_table]:block [&_table]:overflow-x-auto
          [&_th]:bg-gray-50 [&_th]:text-left [&_th]:font-semibold [&_th]:p-2 [&_th]:border [&_th]:border-gray-200
          [&_td]:p-2 [&_td]:border [&_td]:border-gray-200 [&_td]:align-top"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  )
}
