'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, Send, Copy, Check, FileText, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import {
  formatDateTime,
  formatINR,
  humanize,
  leadName,
  stageInfo,
  type CrmRecord,
  type MetaForm,
  type MetaLead,
} from '@/lib/metaLeadsCrm'

export interface AiProposal {
  title: string
  overview: string
  destination: string
  packageDocId: string | null
  packageName: string
  travelDate: string
  nights: number
  adults: number
  children: number
  hotelCategory: string
  hotels: { city: string; hotelName: string; nights: number; roomType: string; mealPlan: string }[]
  pricePerPerson: number
  totalPrice: number
  priceNote: string
  inclusions: string[]
  exclusions: string[]
  dayWisePlan: { day: string; title: string; description: string }[]
  whatsappMessage: string
  changesFromPrevious: string
}

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  proposal?: AiProposal | null
  nextSteps?: string[]
  at: string
}

const SKIP_ANSWER_KEYS = ['phone_number', 'email', 'phone', 'mobile']

/** Everything Claude needs about this lead, without phone/email. */
function buildLeadContext(lead: MetaLead | null, form: MetaForm | null, record: CrmRecord) {
  const lines: string[] = []
  lines.push(`Customer name: ${lead ? leadName(lead) : record.name}`)
  lines.push(`Lead received: ${formatDateTime(record.leadCreatedAt)}`)
  if (lead) {
    lines.push(`Source: ${lead.platform === 'ig' ? 'Instagram' : lead.platform === 'fb' ? 'Facebook' : lead.platform || '?'} ad`)
    lines.push(`Campaign: ${lead.campaign_name || '?'} | Ad: ${lead.ad_name || '?'} | Form: ${lead.form_name || '?'}`)
    lines.push('Form answers:')
    for (const f of lead.field_data || []) {
      if (SKIP_ANSWER_KEYS.includes(f.name.toLowerCase())) continue
      const label = form?.questions?.find((q) => q.key === f.name)?.label || humanize(f.name)
      lines.push(`- ${label}: ${f.values.join(', ')}`)
    }
  }
  lines.push(`\nCRM stage: ${stageInfo(record.stage).label}${record.lostReason ? ` (lost: ${record.lostReason})` : ''}`)
  if (record.priority) lines.push(`Priority: ${record.priority}`)
  const t = record.travel || {}
  const travel = Object.entries(t).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (travel.length) lines.push(`Trip requirements: ${travel.map(([k, v]) => `${humanize(k)}: ${v}`).join('; ')}`)

  const proposals = record.proposals || []
  if (proposals.length) {
    lines.push('\nProposals already sent:')
    for (const p of proposals) {
      lines.push(
        `- Proposal #${p.number} (${p.status}) on ${formatDateTime(p.sentAt)}: ${p.destination}${p.packageName ? ` / ${p.packageName}` : ''}` +
          `${p.nights ? `, ${p.nights}N` : ''}, ${p.adults} adults${p.children ? ` + ${p.children} children` : ''}, ` +
          `${formatINR(p.pricePerPerson)}/person, total ${formatINR(p.totalPrice)}${p.notes ? `. Notes: ${p.notes}` : ''}`
      )
    }
  }

  const activities = [...(record.activities || [])].sort((a, b) => a.at.localeCompare(b.at)).slice(-30)
  if (activities.length) {
    lines.push('\nTimeline (oldest first):')
    for (const a of activities) {
      lines.push(`- ${formatDateTime(a.at)} ${a.type}${a.outcome ? `: ${a.outcome}` : ''}${a.notes ? ` — ${a.notes}` : ''}`)
    }
  }
  return lines.join('\n')
}

export default function AiSalesAssistant({
  lead,
  form,
  record,
  disabled,
  onSaveProposal,
  onOpenInBuilder,
}: {
  lead: MetaLead | null
  form: MetaForm | null
  record: CrmRecord
  disabled: boolean
  onSaveProposal: (p: AiProposal) => Promise<void>
  onOpenInBuilder: (p: AiProposal) => void
}) {
  const { currentUser } = useAuth()
  const storageKey = `metaLeadsCrm.ai.${record.leadId}`
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep the conversation per lead in this browser (convenience only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setTurns(JSON.parse(saved))
    } catch {}
  }, [storageKey])
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(turns.slice(-30)))
    } catch {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, storageKey])

  const nextNumber = (record.proposals?.length || 0) + 1
  const destinationHint = record.travel?.destination || lead?.form_name || lead?.campaign_name || ''

  const quickPrompts = useMemo(
    () => [
      'Recommend the best package and price for this lead',
      nextNumber === 1 ? 'Draft the first proposal (version 1)' : `Draft proposal version ${nextNumber} based on the customer's latest feedback`,
      'Make a budget-friendly version',
      'Upgrade to a premium / 5-star version',
      'Write a WhatsApp follow-up message',
      'Customer says the price is too high — how do I respond?',
    ],
    [nextNumber]
  )

  const ask = async (prompt: string) => {
    const text = prompt.trim()
    if (!text || thinking || !currentUser) return
    const userTurn: ChatTurn = { role: 'user', content: text, at: new Date().toISOString() }
    const history = [...turns, userTurn]
    setTurns(history)
    setInput('')
    setThinking(true)
    setError(null)
    try {
      const idToken = await currentUser.getIdToken()
      const res = await fetch('/api/ai/sales-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          leadContext: buildLeadContext(lead, form, record),
          destinationHint,
          messages: history.map((t) => ({
            role: t.role,
            content:
              t.role === 'assistant' && t.proposal
                ? `${t.content}\n\n[I drafted: ${t.proposal.title} — ${t.proposal.packageName}, ${t.proposal.nights}N, ` +
                  `${formatINR(t.proposal.pricePerPerson)}/person, total ${formatINR(t.proposal.totalPrice)}]`
                : t.content,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI request failed')
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', content: json.reply, proposal: json.proposal, nextSteps: json.suggestedNextSteps, at: new Date().toISOString() },
      ])
    } catch (err: any) {
      setError(err.message || 'AI request failed')
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-violet-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" /> AI Sales Assistant
          <span className="text-[10px] font-medium text-violet-500 bg-white/70 px-1.5 py-0.5 rounded">Claude</span>
        </h3>
        {turns.length > 0 && (
          <button
            onClick={() => setTurns([])}
            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
            title="Start a new conversation"
          >
            <RotateCcw className="w-3 h-3" /> New chat
          </button>
        )}
      </div>

      <div ref={scrollRef} className="max-h-[32rem] overflow-y-auto p-5 space-y-4 bg-gray-50/50">
        {turns.length === 0 && (
          <p className="text-sm text-gray-500">
            Ask anything about this lead. Claude reads the form answers, the full CRM history and your package catalog, then picks
            packages, prices them for the group, and drafts proposals you can save or open in the itinerary builder.
          </p>
        )}
        {turns.map((t, i) =>
          t.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600 text-white px-4 py-2 text-sm whitespace-pre-wrap">
                {t.content}
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-3">
              <div className="max-w-[95%] rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap">
                {t.content}
              </div>
              {t.proposal && (
                <ProposalPreview
                  proposal={t.proposal}
                  number={nextNumber}
                  disabled={disabled}
                  onSave={() => onSaveProposal(t.proposal!)}
                  onOpenInBuilder={() => onOpenInBuilder(t.proposal!)}
                />
              )}
              {!!t.nextSteps?.length && i === turns.length - 1 && (
                <div className="flex flex-wrap gap-2">
                  {t.nextSteps.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      disabled={thinking}
                      className="text-xs px-3 py-1.5 rounded-full border border-violet-200 text-violet-700 bg-white hover:bg-violet-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {thinking && (
          <div className="flex items-center gap-2 text-sm text-violet-700">
            <Sparkles className="w-4 h-4 animate-pulse" /> Claude is working on it… (can take up to a minute)
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-3">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => ask(p)}
              disabled={thinking}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(input)
              }
            }}
            placeholder='e.g. "Customer wants 6 nights, 4-star, budget ₹1.5L for 2 — make version 2 with Nusa Penida"'
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
          />
          <button
            onClick={() => ask(input)}
            disabled={thinking || !input.trim()}
            className="self-end inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Ask
          </button>
        </div>
      </div>
    </div>
  )
}

function ProposalPreview({
  proposal: p,
  number,
  disabled,
  onSave,
  onOpenInBuilder,
}: {
  proposal: AiProposal
  number: number
  disabled: boolean
  onSave: () => Promise<void>
  onOpenInBuilder: () => void
}) {
  const [showPlan, setShowPlan] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.whatsappMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-violet-50 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-gray-900">{p.title}</div>
          <div className="text-xs text-gray-600 mt-0.5">
            {p.destination} · {p.packageName} · {p.nights}N · {p.hotelCategory} · {p.adults} adults
            {p.children ? ` + ${p.children} children` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">{formatINR(p.totalPrice)}</div>
          <div className="text-xs text-gray-500">{formatINR(p.pricePerPerson)} / person</div>
        </div>
      </div>
      <div className="p-4 space-y-3 text-sm">
        {p.changesFromPrevious && (
          <p className="text-xs text-violet-800 bg-violet-50 rounded-lg px-3 py-2">
            <strong>What changed:</strong> {p.changesFromPrevious}
          </p>
        )}
        {p.overview && <p className="text-xs text-gray-700">{p.overview}</p>}
        {p.priceNote && <p className="text-xs text-gray-500">{p.priceNote}</p>}
        {!!p.hotels?.length && (
          <div className="text-xs">
            <div className="font-semibold text-gray-700 mb-1">Hotels</div>
            <ul className="space-y-0.5 text-gray-600">
              {p.hotels.map((h) => (
                <li key={h.city + h.hotelName}>
                  {h.nights}N · {h.city}: <span className="text-gray-800">{h.hotelName}</span> · {h.roomType} · {h.mealPlan}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-semibold text-gray-700 mb-1">Inclusions</div>
            <ul className="list-disc ml-4 text-gray-600 space-y-0.5">
              {p.inclusions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-1">Exclusions</div>
            <ul className="list-disc ml-4 text-gray-600 space-y-0.5">
              {p.exclusions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <button onClick={() => setShowPlan((v) => !v)} className="text-xs font-medium text-violet-700 flex items-center gap-1">
          {showPlan ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Day-wise plan ({p.dayWisePlan.length} days)
        </button>
        {showPlan && (
          <ol className="space-y-2 text-xs">
            {p.dayWisePlan.map((d) => (
              <li key={d.day + d.title}>
                <span className="font-semibold text-gray-800">
                  {d.day}: {d.title}
                </span>
                <p className="text-gray-600">{d.description}</p>
              </li>
            ))}
          </ol>
        )}
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-emerald-800">WhatsApp message</span>
            <button onClick={copy} className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-emerald-900 whitespace-pre-wrap">{p.whatsappMessage}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={async () => {
              await onSave()
              setSaved(true)
            }}
            disabled={disabled || saved}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saved ? 'Saved to proposals' : `Save as Proposal #${number}`}
          </button>
          <button
            onClick={onOpenInBuilder}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50"
          >
            <FileText className="w-4 h-4" /> Open in Itinerary Builder (PDF)
          </button>
        </div>
      </div>
    </div>
  )
}
