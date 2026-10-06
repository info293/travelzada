'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { Download, ExternalLink, MessageCircle, Plus } from 'lucide-react'
import {
  CALL_OUTCOMES,
  LOST_REASONS,
  PRIORITIES,
  STAGES,
  addActivity,
  changeStage,
  ensureCrmRecord,
  formatDate,
  formatINR,
  salesStats,
  stageInfo,
  updateCrmFields,
  whatsappNumber,
  leadName,
  leadPhone,
  type CrmRecord,
  type CrmUserRef,
  type MetaLead,
  type StageId,
} from '@/lib/metaLeadsCrm'

type Stats = ReturnType<typeof salesStats>

export interface Ctx {
  lead: MetaLead
  rec?: CrmRecord
  s: Stats
}

type EditKind =
  | { type: 'text' } // Remarks → saved as a note
  | { type: 'select'; options: { value: string; label: string }[]; current: (c: Ctx) => string }
  | { type: 'datetime'; current: (c: Ctx) => string }

export interface Column {
  key: string
  header: string
  width: number
  group: 'meta' | 'answer' | 'sales'
  value: (c: Ctx) => string
  tone?: (c: Ctx) => string
  edit?: EditKind
}

const answer = (lead: MetaLead, ...keys: string[]) => {
  for (const k of keys) {
    const f = lead.field_data?.find((x) => x.name.toLowerCase() === k.toLowerCase())
    if (f) return f.values.join(', ').replace(/_/g, ' ')
  }
  return ''
}

const dt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : ''

const yesNo = (v: boolean) => (v ? 'Yes' : 'No')
const yesNoTone = (v: boolean) => (v ? 'text-emerald-700 font-semibold' : 'text-red-500')

const toLocalInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/** Follow-up slot n (1-based): the date it was done, or the scheduled date if it's the next one due */
const followUpCell = (c: Ctx, n: number) => {
  const done = c.s.followUpDates[n - 1]
  if (done) return formatDate(done)
  const isNextSlot = c.s.followUpsDone === n - 1
  if (isNextSlot && c.rec?.nextFollowUp && !['won', 'lost'].includes(c.rec.stage)) return `Due ${dt(c.rec.nextFollowUp)}`
  return ''
}

export const STANDARD_ANSWERS = [
  'traveling_from_jaipur?',
  'no_of_people_travelling?',
  'occasion_for_your_trip?',
  'conditional_question_1',
  'conditional_question_2',
  'travel_date?',
  'full_name',
  'phone_number',
  'email',
  'city',
]

export function buildColumns(extraAnswerKeys: string[]): Column[] {
  const meta = (key: keyof MetaLead, width = 140, fmt?: (v: any) => string): Column => ({
    key,
    header: key,
    width,
    group: 'meta',
    value: ({ lead }) => (fmt ? fmt(lead[key]) : lead[key] === undefined || lead[key] === null ? '' : String(lead[key])),
  })
  const ans = (key: string, width = 140): Column => ({
    key,
    header: key,
    width,
    group: 'answer',
    value: ({ lead }) => answer(lead, key, key.replace(/\?$/, ''), `${key.replace(/\?$/, '')}?`),
  })

  return [
    meta('id', 150),
    meta('created_time', 130, (v) => dt(v)),
    meta('ad_id', 150),
    meta('ad_name', 160),
    meta('adset_id', 150),
    meta('adset_name', 160),
    meta('campaign_id', 150),
    meta('campaign_name', 190),
    meta('form_id', 140),
    meta('form_name', 230),
    meta('is_organic', 80, (v) => (v === undefined ? '' : v ? 'true' : 'false')),
    meta('platform', 70),
    ans('traveling_from_jaipur?', 150),
    ans('no_of_people_travelling?', 150),
    ans('occasion_for_your_trip?', 160),
    ans('conditional_question_1', 150),
    ans('conditional_question_2', 150),
    ans('travel_date?', 120),
    ans('full_name', 160),
    ans('phone_number', 130),
    ans('email', 200),
    ans('city', 110),
    ...extraAnswerKeys.map((k) => ans(k)),
    {
      key: 'lead_status',
      header: 'lead_status',
      width: 100,
      group: 'sales',
      value: ({ rec }) => (rec ? PRIORITIES.find((p) => p.id === rec.priority)?.label || '' : ''),
      tone: ({ rec }) => (rec?.priority === 'hot' ? 'text-red-600 font-semibold' : rec?.priority === 'cold' ? 'text-sky-600' : ''),
      edit: {
        type: 'select',
        options: PRIORITIES.map((p) => ({ value: p.id, label: p.label })),
        current: ({ rec }) => rec?.priority || 'warm',
      },
    },
    {
      key: 'remarks',
      header: 'Remarks',
      width: 240,
      group: 'sales',
      value: ({ s }) => s.latestRemark || '',
      edit: { type: 'text' },
    },
    {
      key: 'call_connected',
      header: 'Call Connected',
      width: 110,
      group: 'sales',
      value: ({ s }) => (s.callAttempts ? yesNo(s.callConnected) : ''),
      tone: ({ s }) => (s.callAttempts ? yesNoTone(s.callConnected) : ''),
    },
    {
      key: 'call_attempts',
      header: 'Call Attempt',
      width: 110,
      group: 'sales',
      value: ({ s }) => (s.callAttempts ? String(s.callAttempts) : ''),
      edit: {
        type: 'select',
        options: CALL_OUTCOMES.map((o) => ({ value: o, label: `Log call: ${o}` })),
        current: () => '',
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      group: 'sales',
      value: ({ rec }) => stageInfo(rec?.stage).label + (rec?.stage === 'lost' && rec.lostReason ? ` (${rec.lostReason})` : ''),
      tone: ({ rec }) => `px-1 rounded ${stageInfo(rec?.stage).color}`,
      edit: {
        type: 'select',
        options: STAGES.map((st) => ({ value: st.id, label: st.label })),
        current: ({ rec }) => rec?.stage || 'new',
      },
    },
    {
      key: 'quote_sent',
      header: 'Quotae send',
      width: 100,
      group: 'sales',
      value: ({ s }) => yesNo(s.quoteSent),
      tone: ({ s }) => yesNoTone(s.quoteSent),
    },
    {
      key: 'quote_date',
      header: 'Quote Date',
      width: 110,
      group: 'sales',
      value: ({ s }) => (s.lastQuoteDate ? formatDate(s.lastQuoteDate) : ''),
    },
    {
      key: 'follow_up_1',
      header: 'Follow up',
      width: 150,
      group: 'sales',
      value: (c) => followUpCell(c, 1),
      tone: (c) => (followUpCell(c, 1).startsWith('Due') ? 'text-amber-600 italic' : ''),
      edit: { type: 'datetime', current: ({ rec }) => toLocalInput(rec?.nextFollowUp) },
    },
    {
      key: 'modifications',
      header: 'Modifications',
      width: 110,
      group: 'sales',
      value: ({ s }) => (s.quoteSent ? String(s.modifications) : ''),
    },
    {
      key: 'follow_up_2',
      header: 'Follow up',
      width: 150,
      group: 'sales',
      value: (c) => followUpCell(c, 2),
      tone: (c) => (followUpCell(c, 2).startsWith('Due') ? 'text-amber-600 italic' : ''),
      edit: { type: 'datetime', current: ({ rec }) => toLocalInput(rec?.nextFollowUp) },
    },
    {
      key: 'booking',
      header: 'Booking',
      width: 140,
      group: 'sales',
      value: ({ rec, s }) =>
        rec?.stage === 'won' ? `Yes${rec.dealValue || s.latestQuote ? ` · ${formatINR(rec.dealValue || s.latestQuote)}` : ''}` : rec?.stage === 'lost' ? 'No' : '',
      tone: ({ rec }) => (rec?.stage === 'won' ? 'text-emerald-700 font-semibold' : rec?.stage === 'lost' ? 'text-red-500' : ''),
      edit: {
        type: 'select',
        options: [
          { value: 'yes', label: 'Yes – booked' },
          { value: 'no', label: 'No – lost' },
        ],
        current: ({ rec }) => (rec?.stage === 'won' ? 'yes' : rec?.stage === 'lost' ? 'no' : ''),
      },
    },
    {
      key: 'email_chat',
      header: 'Email chat',
      width: 100,
      group: 'sales',
      value: ({ rec }) => {
        const n = (rec?.activities || []).filter((a) => a.type === 'email').length
        const fresh = !!rec?.unreadReplies && rec.lastReplyChannel === 'email'
        return n ? `Yes (${n})${fresh ? ' ↩ new reply' : ''}` : ''
      },
      tone: ({ rec }) => (rec?.unreadReplies && rec.lastReplyChannel === 'email' ? 'text-fuchsia-700 font-semibold' : ''),
      edit: { type: 'select', options: [{ value: 'log', label: 'Log an email sent' }], current: () => '' },
    },
    {
      key: 'w_chat',
      header: 'W Chat',
      width: 100,
      group: 'sales',
      value: ({ rec }) => {
        const n = (rec?.activities || []).filter((a) => a.type === 'whatsapp').length
        const fresh = !!rec?.unreadReplies && rec.lastReplyChannel === 'whatsapp'
        return n ? `Yes (${n})${fresh ? ' ↩ new reply' : ''}` : ''
      },
      tone: ({ rec }) => (rec?.unreadReplies && rec.lastReplyChannel === 'whatsapp' ? 'text-fuchsia-700 font-semibold' : ''),
      edit: { type: 'select', options: [{ value: 'log', label: 'Log a WhatsApp chat' }], current: () => '' },
    },
  ]
}

const colLetter = (i: number) => {
  let s = ''
  let n = i + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const GROUP_TONE = { meta: 'bg-blue-50', answer: 'bg-amber-50', sales: 'bg-emerald-50' }

export default function LeadsSheet({
  leads,
  records,
  me,
}: {
  leads: MetaLead[]
  records: Record<string, CrmRecord>
  me: CrmUserRef | null
}) {
  const extraAnswerKeys = useMemo(
    () =>
      Array.from(new Set(leads.flatMap((l) => (l.field_data || []).map((f) => f.name)))).filter(
        (k) => !STANDARD_ANSWERS.some((s) => s.replace(/\?$/, '') === k.replace(/\?$/, ''))
      ),
    [leads]
  )
  const columns = useMemo(() => buildColumns(extraAnswerKeys), [extraAnswerKeys])
  const rows: Ctx[] = useMemo(
    () => leads.map((lead) => ({ lead, rec: records[lead.id], s: salesStats(records[lead.id], lead.created_time) })),
    [leads, records]
  )

  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSel((s) => ({ r: Math.min(s.r, Math.max(0, rows.length - 1)), c: s.c }))
  }, [rows.length])

  // Keep the selected cell visible
  useEffect(() => {
    gridRef.current?.querySelector(`[data-cell="${sel.r}-${sel.c}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [sel])

  const startEdit = useCallback(
    (r: number, c: number) => {
      const col = columns[c]
      const row = rows[r]
      if (!col?.edit || !row || !me) return
      setSel({ r, c })
      setDraft(col.edit.type === 'text' ? '' : col.edit.current(row))
      setEditing(true)
    },
    [columns, rows, me]
  )

  const commit = async (value: string) => {
    const col = columns[sel.c]
    const row = rows[sel.r]
    setEditing(false)
    gridRef.current?.focus()
    if (!col?.edit || !row || !me) return
    const { lead } = row
    const minimal = { leadId: lead.id, stage: 'new', activities: [], proposals: [] } as unknown as CrmRecord
    setSaving(`${sel.r}-${sel.c}`)
    try {
      await ensureCrmRecord(lead)
      const rec = records[lead.id] || minimal
      const now = new Date().toISOString()
      const followUpDue = !!rec.nextFollowUp && new Date(rec.nextFollowUp).getTime() < Date.now() + 864e5

      switch (col.key) {
        case 'lead_status':
          if (value) await updateCrmFields(lead.id, { priority: value as CrmRecord['priority'] })
          break
        case 'remarks':
          if (value.trim()) await addActivity(lead.id, { type: 'note', notes: value.trim(), at: now, by: me })
          break
        case 'call_attempts':
          if (!value) break
          await addActivity(lead.id, { type: 'call', outcome: value, at: now, by: me, ...(followUpDue ? { followUp: true } : {}) })
          if (followUpDue) await updateCrmFields(lead.id, { nextFollowUp: null })
          if (rec.stage === 'new') await changeStage(rec, 'contacted', me)
          break
        case 'status':
          await setStage(rec, value as StageId, me)
          break
        case 'booking':
          if (value === 'yes') await setStage(rec, 'won', me)
          if (value === 'no') await setStage(rec, 'lost', me)
          break
        case 'follow_up_1':
        case 'follow_up_2':
          await updateCrmFields(lead.id, { nextFollowUp: value ? new Date(value).toISOString() : null })
          break
        case 'email_chat':
        case 'w_chat': {
          if (value !== 'log') break
          const notes = window.prompt(`What was ${col.key === 'email_chat' ? 'emailed' : 'discussed on WhatsApp'}? (optional)`) || undefined
          await addActivity(lead.id, {
            type: col.key === 'email_chat' ? 'email' : 'whatsapp',
            notes,
            at: now,
            by: me,
            ...(followUpDue ? { followUp: true } : {}),
          })
          if (followUpDue) await updateCrmFields(lead.id, { nextFollowUp: null })
          if (rec.stage === 'new') await changeStage(rec, 'contacted', me)
          break
        }
      }
    } catch (err: any) {
      alert(`Could not save: ${err.message || err}`)
    } finally {
      setSaving(null)
    }
  }

  const cellText = (r: number, c: number) => (rows[r] && columns[c] ? columns[c].value(rows[r]) : '')

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing) return
    const maxR = rows.length - 1
    const maxC = columns.length - 1
    const move = (dr: number, dc: number) => {
      e.preventDefault()
      setSel((s) => ({ r: Math.max(0, Math.min(maxR, s.r + dr)), c: Math.max(0, Math.min(maxC, s.c + dc)) }))
    }
    if (e.key === 'ArrowDown') move(1, 0)
    else if (e.key === 'ArrowUp') move(-1, 0)
    else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) move(0, 1)
    else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) move(0, -1)
    else if (e.key === 'Home') move(0, -maxC)
    else if (e.key === 'End') move(0, maxC)
    else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      startEdit(sel.r, sel.c)
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      navigator.clipboard?.writeText(cellText(sel.r, sel.c)).catch(() => {})
    }
  }

  const downloadExcel = () => {
    const header = columns.map((c) => c.header)
    const body = rows.map((row) => columns.map((c) => c.value(row)))
    const ws = XLSX.utils.aoa_to_sheet([header, ...body])
    ws['!cols'] = columns.map((c) => ({ wch: Math.round(c.width / 7) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Meta Leads')
    XLSX.writeFile(wb, `meta-leads-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const selCol = columns[sel.c]
  const selRow = rows[sel.r]

  return (
    <div className="border-t border-gray-200">
      {/* Formula bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-gray-50 text-xs">
        <span className="w-16 px-2 py-1 bg-white border border-gray-300 rounded font-mono text-gray-700 text-center">
          {colLetter(sel.c)}
          {sel.r + 2}
        </span>
        <span className="text-gray-400 font-serif italic">fx</span>
        <div className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded truncate text-gray-800 min-h-[26px]" title={selRow && selCol ? cellText(sel.r, sel.c) : ''}>
          {selRow && selCol ? cellText(sel.r, sel.c) : ''}
        </div>
        <button
          onClick={downloadExcel}
          disabled={!rows.length}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-emerald-600 text-emerald-700 font-medium hover:bg-emerald-50 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> Download Excel
        </button>
      </div>

      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="overflow-auto max-h-[70vh] outline-none text-[12px] font-[Calibri,Segoe_UI,Arial,sans-serif]"
      >
        <table className="border-collapse" style={{ tableLayout: 'fixed', width: 44 + columns.reduce((s, c) => s + c.width, 0) }}>
          <colgroup>
            <col style={{ width: 44 }} />
            {columns.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20">
            {/* Column letters */}
            <tr>
              <th className="sticky left-0 z-30 bg-gray-200 border border-gray-300 h-6" />
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={`border border-gray-300 h-6 font-normal text-gray-600 ${sel.c === i ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100'}`}
                >
                  {colLetter(i)}
                </th>
              ))}
            </tr>
            {/* Field names (row 1) */}
            <tr>
              <th className={`sticky left-0 z-30 border border-gray-300 font-normal text-gray-600 ${'bg-gray-100'}`}>1</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`border border-gray-300 px-2 py-1.5 text-left font-semibold text-gray-800 truncate ${GROUP_TONE[c.group]}`}
                  title={c.edit ? `${c.header} (editable: double-click or Enter)` : c.header}
                >
                  {c.header}
                  {c.edit && <span className="ml-1 text-[10px] text-emerald-600">✎</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={row.lead.id} className="group">
                <td
                  className={`sticky left-0 z-10 border border-gray-300 text-center text-gray-500 ${sel.r === r ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100'}`}
                >
                  <div className="relative">
                    {r + 2}
                    <Link
                      href={`/admin/meta-leads/${row.lead.id}`}
                      title="Open lead CRM"
                      className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-gray-100 text-primary"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </td>
                {columns.map((col, c) => {
                  const selected = sel.r === r && sel.c === c
                  const isEditing = selected && editing
                  const text = col.value(row)
                  const busy = saving === `${r}-${c}`
                  return (
                    <td
                      key={col.key}
                      data-cell={`${r}-${c}`}
                      onClick={() => {
                        setSel({ r, c })
                        setEditing(false)
                      }}
                      onDoubleClick={() => startEdit(r, c)}
                      className={`relative border border-gray-200 px-1.5 h-[26px] whitespace-nowrap overflow-hidden text-ellipsis ${
                        selected ? 'outline outline-2 -outline-offset-1 outline-emerald-600 z-10' : ''
                      } ${sel.r === r && !selected ? 'bg-emerald-50/40' : 'bg-white'} ${busy ? 'opacity-50' : ''}`}
                      title={text}
                    >
                      {isEditing && col.edit ? (
                        <CellEditor
                          edit={col.edit}
                          draft={draft}
                          setDraft={setDraft}
                          onCommit={commit}
                          onCancel={() => {
                            setEditing(false)
                            gridRef.current?.focus()
                          }}
                        />
                      ) : (
                        <span className={col.tone?.(row) || 'text-gray-800'}>
                          {col.key === 'w_chat' && leadPhone(row.lead) ? (
                            <span className="inline-flex items-center gap-1">
                              {text}
                              <Link
                                href={`/admin/whatsapp-chats?phone=${whatsappNumber(leadPhone(row.lead))}&name=${encodeURIComponent(leadName(row.lead))}`}
                                onClick={(e) => e.stopPropagation()}
                                title="Open WhatsApp chat"
                                className="text-emerald-600 hover:text-emerald-800"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </Link>
                            </span>
                          ) : (
                            text
                          )}
                        </span>
                      )}
                      {selected && !isEditing && col.edit && me && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit(r, c)
                          }}
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded bg-emerald-600 text-white"
                          title="Edit"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-gray-500">
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1 border-t border-gray-200 bg-gray-100 text-[11px] text-gray-600">
        <span>
          {rows.length} rows · Click a cell, use arrow keys to move, <kbd className="px-1 bg-white border rounded">Enter</kbd> or double-click to
          edit green ✎ columns, <kbd className="px-1 bg-white border rounded">Ctrl+C</kbd> copies a cell
        </span>
        <span className="flex gap-3">
          <span className="inline-flex items-center gap-1">
            <i className="w-2.5 h-2.5 bg-blue-100 border border-blue-200" /> Meta ad
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="w-2.5 h-2.5 bg-amber-100 border border-amber-200" /> Form answers
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-200" /> Sales tracking (saved to CRM)
          </span>
        </span>
      </div>
    </div>
  )
}

/** Stage change from the sheet; won asks for the booking amount, lost for the reason. */
async function setStage(rec: CrmRecord, stage: StageId, me: CrmUserRef) {
  if (!stage || rec.stage === stage) return
  if (stage === 'won') {
    const amount = window.prompt('Final booking amount (₹)?', String(rec.proposals?.slice(-1)[0]?.totalPrice ?? ''))
    if (amount === null) return
    await changeStage(rec, 'won', me, { dealValue: Number(amount.replace(/[^0-9.]/g, '')) || undefined })
    return
  }
  if (stage === 'lost') {
    const reason = window.prompt(`Why was it lost?\n${LOST_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nType a number or a reason:`, '1')
    if (reason === null) return
    const n = Number(reason)
    await changeStage(rec, 'lost', me, { lostReason: LOST_REASONS[n - 1] || reason || 'Other' })
    return
  }
  await changeStage(rec, stage, me)
}

function CellEditor({
  edit,
  draft,
  setDraft,
  onCommit,
  onCancel,
}: {
  edit: EditKind
  draft: string
  setDraft: (v: string) => void
  onCommit: (v: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement & HTMLSelectElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  const keys = (e: KeyboardEvent<HTMLElement>) => {
    e.stopPropagation()
    if (e.key === 'Escape') onCancel()
    if (e.key === 'Enter') onCommit(draft)
  }
  const cls = 'absolute inset-0 w-full h-full px-1 text-[12px] border-2 border-emerald-600 bg-white outline-none z-20'

  if (edit.type === 'select') {
    return (
      <select
        ref={ref}
        value={draft}
        onChange={(e) => onCommit(e.target.value)}
        onKeyDown={keys}
        onBlur={onCancel}
        className={cls}
      >
        <option value="">—</option>
        {edit.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <input
      ref={ref}
      type={edit.type === 'datetime' ? 'datetime-local' : 'text'}
      value={draft}
      placeholder={edit.type === 'text' ? 'Type a remark, Enter to save' : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={keys}
      onBlur={() => (edit.type === 'datetime' && draft ? onCommit(draft) : onCancel())}
      className={cls}
    />
  )
}
