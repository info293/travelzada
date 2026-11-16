'use client'

import { Suspense } from 'react'
import TemplatesLibrary from '@/components/admin/whatsapp/templates/TemplatesLibrary'
import { Spinner } from '@/components/admin/ui'

/** Every WhatsApp template with a phone preview. Auth, permissions and chrome come from app/admin/layout.tsx. */
export default function WhatsAppTemplatesPage() {
  return (
    // TemplatesLibrary reads ?t=<template> via useSearchParams, which needs a Suspense boundary
    <Suspense fallback={<Spinner label="Loading templates…" />}>
      <TemplatesLibrary />
    </Suspense>
  )
}
