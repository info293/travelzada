'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, LayoutList, MessageCircle, Sparkles } from 'lucide-react'
import {
  FIRST_CONTACT_TEMPLATES,
  REOPEN_TEMPLATES,
  type CatalogTemplate,
  type VariableSource,
} from '@/lib/whatsapp/templateCatalog'
import WhatsAppPhonePreview from './WhatsAppPhonePreview'
import { initialValues } from './templateSend'
import { useLiveTemplates } from './useLiveTemplates'

/**
 * Shown in the inbox instead of the text box when WhatsApp only allows a template (new chat, or the 24-hour window
 * closed): the 2–3 best templates as cards with a mini phone preview, personalised with what we already know.
 */
export default function StartConversationCard({
  mode,
  reason,
  autofill,
  onPick,
  onSeeAll,
  onTypeAnyway,
}: {
  mode: 'first' | 'reopen'
  /** One line on why only a template is allowed */
  reason: string
  autofill?: Partial<Record<VariableSource, string>>
  onPick: (templateName: string) => void
  onSeeAll: () => void
  onTypeAnyway?: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const live = useLiveTemplates(!collapsed)

  const picks: CatalogTemplate[] = useMemo(() => {
    const preferred = mode === 'reopen' ? REOPEN_TEMPLATES : FIRST_CONTACT_TEMPLATES
    const backup = mode === 'reopen' ? FIRST_CONTACT_TEMPLATES : REOPEN_TEMPLATES
    const ok = (t: CatalogTemplate) => !t.notSendableReason && (live.loading || !!live.error || live.provider !== 'getgabs' || live.approved.has(t.name))
    const seen = new Set<string>()
    return [...preferred, ...backup].filter((t) => ok(t) && !seen.has(t.name) && seen.add(t.name)).slice(0, 3)
  }, [mode, live.loading, live.error, live.provider, live.approved])

  return (
    <div className="border-t border-emerald-200 bg-gradient-to-b from-emerald-50 to-white px-4 py-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            {mode === 'reopen' ? 'Restart the conversation' : 'Start the conversation'}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            {reason} Pick a message below — you&apos;ll see exactly what the customer gets before sending.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-white hover:text-gray-800"
        >
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {collapsed ? 'Show suggestions' : 'Hide'}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 grid max-h-[45vh] gap-2.5 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {picks.map((t, i) => (
            <button
              key={t.name}
              type="button"
              onClick={() => onPick(t.name)}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white p-2.5 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-gray-900">{t.title}</span>
                {i === 0 && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">
                    <Sparkles className="w-2.5 h-2.5" /> Best
                  </span>
                )}
              </span>
              <span className="mb-2 mt-0.5 line-clamp-2 text-[11.5px] text-gray-500">{t.purpose}</span>
              <WhatsAppPhonePreview template={t} values={initialValues(t, autofill)} compact />
              <span className="mt-2 text-center text-xs font-semibold text-emerald-700 group-hover:underline">Use this message →</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSeeAll}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          <LayoutList className="w-4 h-4" /> See all templates
        </button>
        {onTypeAnyway && (
          <button type="button" onClick={onTypeAnyway} className="text-xs text-gray-500 underline hover:text-gray-800">
            Type a message anyway
          </button>
        )}
      </div>
    </div>
  )
}
