'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CornerUpLeft,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  MessageCircle,
  Phone,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { Badge, Card, EmptyState, FilterChips, PageHeader, SearchInput, cx } from '@/components/admin/ui'
import {
  CATEGORY_LABEL,
  STAGE_FILTERS,
  STAGE_LABEL,
  buttonValueKey,
  exampleValues,
  type CatalogButton,
  type CatalogTemplate,
} from '@/lib/whatsapp/templateCatalog'
import WhatsAppPhonePreview from './WhatsAppPhonePreview'
import { useLiveTemplateDetail, useLiveTemplates, type LiveTemplates } from './useLiveTemplates'
import { allTemplates, groupByStage, searchTemplates } from './templateList'
import { urlPrefix } from './templateSend'

const SOURCE_LABEL: Record<string, string> = {
  customer_first_name: 'chat name',
  destination: 'lead',
  package_name: 'lead',
  trip_type: 'lead',
  travel_date: 'lead',
  nights: 'lead',
  agent_name: 'your name',
}

type Status = 'checking' | 'approved' | 'missing' | 'unknown'

function liveStatus(live: LiveTemplates, name: string): Status {
  if (live.loading) return 'checking'
  if (live.error || live.provider !== 'getgabs') return 'unknown'
  return live.approved.has(name) ? 'approved' : 'missing'
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'approved')
    return (
      <Badge tone="green">
        <CheckCircle2 className="w-3 h-3" /> Approved in GetGabs
      </Badge>
    )
  if (status === 'missing')
    return (
      <Badge tone="red">
        <XCircle className="w-3 h-3" /> Not approved
      </Badge>
    )
  if (status === 'checking')
    return (
      <Badge>
        <Loader2 className="w-3 h-3 animate-spin" /> Checking…
      </Badge>
    )
  return <Badge>Status unknown</Badge>
}

const CategoryBadge = ({ category }: { category: string }) => (
  <Badge tone={category === 'MARKETING' ? 'purple' : 'blue'}>{CATEGORY_LABEL[category] || category}</Badge>
)

function buttonExplain(b: CatalogButton, i: number, values: Record<number, string>) {
  if (b.type === 'QUICK_REPLY') return `Customer taps it to reply “${b.text}”. Their answer arrives in the inbox.`
  if (b.type === 'PHONE_NUMBER') return `Calls ${b.phone || 'our number'}.`
  if (b.urlHasVariable) return `Opens ${urlPrefix(b)}${values[buttonValueKey(i)] || '…'} — you fill in the end of the link.`
  return `Opens ${b.url}`
}

function TemplateDetail({ template: base, live, onBack }: { template: CatalogTemplate; live: LiveTemplates; onBack: () => void }) {
  const status = liveStatus(live, base.name)
  const detail = useLiveTemplateDetail(base.name, status === 'approved')
  const t = detail.template || base
  const [showExamples, setShowExamples] = useState(true)
  const values = useMemo(() => (showExamples ? exampleValues(t) : {}), [t, showExamples])
  const sendable = !t.notSendableReason && status !== 'missing'
  const hasMedia = t.header && t.header.type !== 'TEXT'

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 lg:hidden">
        <ArrowLeft className="w-4 h-4" /> All templates
      </button>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
            <p className="mt-0.5 font-mono text-xs text-gray-400">{t.name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="wine">{STAGE_LABEL[t.stage]}</Badge>
              <CategoryBadge category={t.category} />
              <StatusBadge status={status} />
              {t.firstContactRank && (
                <Badge tone="amber">
                  <Sparkles className="w-3 h-3" /> Recommended first message
                </Badge>
              )}
            </div>
          </div>
          {sendable ? (
            <Link
              href={`/admin/whatsapp-chats?template=${encodeURIComponent(t.name)}`}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="w-4 h-4" /> Use in a chat
            </Link>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-500">
              {t.notSendableReason || 'Not approved in GetGabs yet — it cannot be sent.'}
            </span>
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 min-w-0 order-2 xl:order-1">
          <Card>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">What it&apos;s for</h3>
            <p className="mt-1 text-sm text-gray-800">{t.purpose}</p>
            <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-400">When to use</h3>
            <p className="mt-1 text-sm text-gray-800">{t.whenToUse}</p>
            {t.category === 'MARKETING' && (
              <p className="mt-3 flex gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-800">
                <Info className="w-4 h-4 shrink-0" /> Marketing message: costs more per message and customers can tap “Stop” to opt out. Don&apos;t send it to people who
                asked not to be contacted.
              </p>
            )}
            {(t.note || detail.error) && (
              <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {[t.note, detail.error && `Couldn't double-check it in GetGabs: ${detail.error}`].filter(Boolean).join(' ')}
              </p>
            )}
          </Card>

          <Card padded={false}>
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-bold text-gray-900">What you fill in</h3>
              <p className="text-xs text-gray-500">Every box you will see when you send this message, with an example.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-100 bg-gray-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-2">Field</th>
                    <th className="px-3 py-2">Example</th>
                    <th className="px-5 py-2 text-right">Auto-filled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hasMedia && (
                    <tr>
                      <td className="px-5 py-2.5">
                        <p className="flex items-center gap-1.5 font-medium text-gray-900">
                          {t.header!.type === 'IMAGE' ? <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5 text-emerald-600" />}
                          {t.header!.hint}
                        </p>
                        <p className="text-xs text-gray-500">Shown at the top of the message. Paste a link or upload the file.</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{t.header!.sampleFilename || (t.header!.type === 'IMAGE' ? 'a photo' : 'a file')}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-gray-400">—</td>
                    </tr>
                  )}
                  {t.variables.map((v) => (
                    <tr key={v.index}>
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-gray-900">{v.label}</p>
                        <p className="text-xs text-gray-500">{v.help}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{v.example}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-emerald-700">{v.source && SOURCE_LABEL[v.source] ? `from ${SOURCE_LABEL[v.source]}` : '—'}</td>
                    </tr>
                  ))}
                  {(t.buttons || []).map((b, i) =>
                    b.urlHasVariable ? (
                      <tr key={`b${i}`}>
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-gray-900">{b.urlVariable?.label || 'End of the link'}</p>
                          <p className="text-xs text-gray-500">{b.urlVariable?.help}</p>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">{b.urlVariable?.example}</td>
                        <td className="px-5 py-2.5 text-right text-xs text-gray-400">—</td>
                      </tr>
                    ) : null
                  )}
                  {!hasMedia && !t.variables.length && !(t.buttons || []).some((b) => b.urlHasVariable) && (
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-gray-500">
                        Nothing — it is sent as it is.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {(t.buttons || []).length > 0 && (
            <Card>
              <h3 className="text-sm font-bold text-gray-900">Buttons the customer sees</h3>
              <ul className="mt-2 space-y-2">
                {t.buttons!.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                      {b.type === 'URL' ? <ExternalLink className="w-3.5 h-3.5" /> : b.type === 'PHONE_NUMBER' ? <Phone className="w-3.5 h-3.5" /> : <CornerUpLeft className="w-3.5 h-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold text-gray-900">{b.text}</span>
                      <span className="block break-words text-xs text-gray-500">{buttonExplain(b, i, values)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="order-1 xl:order-2">
          <div className="xl:sticky xl:top-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">On the customer&apos;s phone</p>
              <button
                type="button"
                onClick={() => setShowExamples((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                {showExamples ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showExamples ? 'Show the blanks' : 'Show an example'}
              </button>
            </div>
            <WhatsAppPhonePreview template={t} values={values} />
            {!showExamples && <p className="text-center text-[11px] text-gray-500">Highlighted boxes are what you fill in.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

/** /admin/whatsapp-templates — every approved message, exactly as the customer sees it */
export default function TemplatesLibrary() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const live = useLiveTemplates()
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<string>('all')
  const [selected, setSelected] = useState<string | null>(searchParams.get('t'))
  const [mobileDetail, setMobileDetail] = useState(!!searchParams.get('t'))

  const templates = useMemo(() => allTemplates(live.list), [live.list])
  const filtered = useMemo(() => searchTemplates(templates, query, stage), [templates, query, stage])
  const groups = useMemo(() => groupByStage(filtered), [filtered])
  const current = templates.find((t) => t.name === selected) || filtered[0] || templates[0]

  // Keep the selection in the URL so a link can be shared with a colleague
  useEffect(() => {
    if (!selected) return
    const q = new URLSearchParams(Array.from(searchParams.entries()))
    if (q.get('t') === selected) return
    q.set('t', selected)
    router.replace(`/admin/whatsapp-templates?${q}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const stageOptions = [
    { value: 'all', label: 'All', count: searchTemplates(templates, query, 'all').length },
    ...STAGE_FILTERS.map((f) => ({ value: f.value, label: f.label, count: searchTemplates(templates, query, f.value).length })).filter((o) => o.count > 0),
  ]
  const approvedCount = templates.filter((t) => live.approved.has(t.name)).length

  return (
    <div>
      <PageHeader
        title="WhatsApp templates"
        description="Every approved message, exactly as the customer sees it"
        actions={
          <span className="text-xs text-gray-500">
            {live.loading ? 'Checking GetGabs…' : live.error ? 'Could not reach GetGabs' : `${approvedCount} approved in GetGabs`}
          </span>
        }
      />

      <Card className="mb-4 bg-emerald-50/60 border-emerald-100">
        <div className="flex gap-3 text-sm text-emerald-900">
          <Info className="w-5 h-5 shrink-0 text-emerald-600" />
          <p>
            <strong>Why templates?</strong> WhatsApp only lets us send a pre-approved message when the customer hasn&apos;t written to us in the last 24 hours —
            including the very first message. You only fill in the highlighted parts (name, destination…). Once the customer replies, you can chat normally
            for 24 hours.
          </p>
        </div>
      </Card>

      {live.error && (
        <p className="mb-4 flex gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {live.error} — showing the template guide without live status.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card padded={false} className={cx('flex flex-col lg:max-h-[calc(100vh-9rem)] lg:sticky lg:top-4', mobileDetail && 'hidden lg:flex')}>
          <div className="space-y-3 border-b border-gray-100 p-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Search: quote, payment, Bali…" />
            <FilterChips options={stageOptions} value={stage} onChange={setStage} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <EmptyState title="No templates match" description="Try another word or filter." />
            ) : (
              groups.map(([s, list]) => (
                <div key={s}>
                  <p className="sticky top-0 z-10 bg-gray-50/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 backdrop-blur">{STAGE_LABEL[s]}</p>
                  {list.map((t) => {
                    const active = current?.name === t.name
                    const status = liveStatus(live, t.name)
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => {
                          setSelected(t.name)
                          setMobileDetail(true)
                        }}
                        className={cx(
                          'block w-full border-l-4 px-4 py-2.5 text-left transition-colors',
                          active ? 'border-bordeaux-600 bg-bordeaux-50/60' : 'border-transparent hover:bg-gray-50'
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-gray-900">{t.title}</span>
                          {t.firstContactRank && <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" aria-label="Recommended first message" />}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">{t.purpose}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1">
                          <span className={cx('rounded px-1.5 text-[10px] font-semibold', t.category === 'MARKETING' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}>
                            {CATEGORY_LABEL[t.category] || t.category}
                          </span>
                          {status === 'approved' && <span className="rounded bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700">Approved</span>}
                          {status === 'missing' && <span className="rounded bg-red-50 px-1.5 text-[10px] font-semibold text-red-700">Not approved</span>}
                          {t.wordingKnown === false && <span className="rounded bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-700">Wording unknown</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </Card>

        <div className={cx('min-w-0', !mobileDetail && 'hidden lg:block')}>
          {current ? <TemplateDetail key={current.name} template={current} live={live} onBack={() => setMobileDetail(false)} /> : null}
        </div>
      </div>
    </div>
  )
}
