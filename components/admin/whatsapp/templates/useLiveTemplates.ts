'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { GetGabsTemplateListItem, GetGabsTemplateSummary } from '@/lib/getgabsTemplates'
import type { WhatsAppTemplateSummary } from '@/lib/whatsapp'
import { getCatalogTemplate, reconcileWithLive, type CatalogTemplate } from '@/lib/whatsapp/templateCatalog'

export interface LiveTemplates {
  loading: boolean
  error?: string
  note?: string
  provider: 'getgabs' | 'meta'
  /** GetGabs: approved (submitted) templates, AUTHENTICATION hidden */
  list: GetGabsTemplateListItem[]
  /** Meta provider only: Meta's approved templates (with body text) */
  metaTemplates: WhatsAppTemplateSummary[]
  /** Names approved in GetGabs */
  approved: Set<string>
}

async function authHeaders(user: any): Promise<Record<string, string>> {
  const idToken = await user?.getIdToken?.()
  return idToken ? { Authorization: `Bearer ${idToken}` } : {}
}

/** The live approved template list (GET /api/whatsapp/templates), loaded when `enabled` */
export function useLiveTemplates(enabled = true): LiveTemplates {
  const { currentUser } = useAuth()
  const [state, setState] = useState<Omit<LiveTemplates, 'approved'>>({ loading: true, provider: 'getgabs', list: [], metaTemplates: [] })

  useEffect(() => {
    if (!enabled || !currentUser) return
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: undefined }))
    ;(async () => {
      try {
        const res = await fetch('/api/whatsapp/templates', { headers: await authHeaders(currentUser) })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) throw new Error([data.error || `HTTP ${res.status}`, data.hint].filter(Boolean).join(' '))
        if (data.provider === 'meta') setState({ loading: false, provider: 'meta', list: [], metaTemplates: data.templates || [], note: data.note })
        else setState({ loading: false, provider: 'getgabs', list: data.templates || [], metaTemplates: [], note: data.note })
      } catch (e: any) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e?.message || 'Could not load the approved templates' }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, currentUser])

  const approved = useMemo(() => new Set(state.list.map((t) => t.name)), [state.list])
  return { ...state, approved }
}

/**
 * The selected template, checked against GetGabs' payload skeleton (variable count, header type, link buttons).
 * Until the skeleton arrives (or if it fails) the catalog entry is used as is.
 */
export function useLiveTemplateDetail(name: string | undefined, enabled = true) {
  const { currentUser } = useAuth()
  const [state, setState] = useState<{ loading: boolean; error?: string; live?: GetGabsTemplateSummary }>({ loading: false })

  useEffect(() => {
    if (!enabled || !name || !currentUser) {
      setState({ loading: false })
      return
    }
    let cancelled = false
    setState({ loading: true })
    ;(async () => {
      try {
        const res = await fetch(`/api/whatsapp/templates?${new URLSearchParams({ name })}`, { headers: await authHeaders(currentUser) })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || !data.template) throw new Error([data.error || `HTTP ${res.status}`, data.hint].filter(Boolean).join(' '))
        setState({ loading: false, live: data.template })
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, error: e?.message || 'Could not check this template in GetGabs' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [name, enabled, currentUser])

  const template: CatalogTemplate | undefined = useMemo(() => {
    const entry = getCatalogTemplate(name)
    if (state.live && state.live.name === name) return reconcileWithLive(entry, state.live)
    return entry
  }, [name, state.live])

  return { ...state, template }
}
