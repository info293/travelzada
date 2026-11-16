'use client'

import { Fragment, type ReactNode } from 'react'
import { ArrowLeft, BadgeCheck, CornerUpLeft, ExternalLink, FileText, Image as ImageIcon, List, Mic, MoreVertical, Phone, Play, Video } from 'lucide-react'
import { buttonValueKey, type CatalogButton, type CatalogTemplate } from '@/lib/whatsapp/templateCatalog'
import { documentFilename } from '@/lib/getgabsTemplates'

/* ------------------------------------------------------------------------------------------------
 * WhatsApp text formatting: *bold*, _italic_, ~strike~, ```mono```, line breaks.
 * Unfilled variables render as highlighted chips: [Customer's first name]
 * ---------------------------------------------------------------------------------------------- */

// Private-use character as an invisible marker for "unfilled variable" chips. NOT '\u0000': the minifier inlines
// it as `\0`, and `\0` followed by a digit (e.g. `${CHIP}0`) becomes an octal escape, which breaks `next build`.
const CHIP = ''

function withChips(text: string, chipLabels: string[], keyPrefix: string): ReactNode[] {
  const parts = text.split(new RegExp(`${CHIP}(\\d+)${CHIP}`))
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <span key={`${keyPrefix}-c${i}`} className="mx-px inline rounded bg-amber-100 px-1 py-px text-[0.92em] font-medium text-amber-800 ring-1 ring-amber-300">
        [{chipLabels[Number(p)]}]
      </span>
    ) : (
      <Fragment key={`${keyPrefix}-t${i}`}>{p}</Fragment>
    )
  )
}

function formatWhatsApp(text: string, chipLabels: string[]): ReactNode[] {
  const re = /```([\s\S]+?)```|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...withChips(text.slice(last, m.index), chipLabels, `s${k++}`))
    const key = `f${k++}`
    if (m[1] !== undefined) out.push(<code key={key} className="font-mono text-[0.92em]">{withChips(m[1], chipLabels, key)}</code>)
    else if (m[2] !== undefined) out.push(<strong key={key} className="font-semibold">{withChips(m[2], chipLabels, key)}</strong>)
    else if (m[3] !== undefined) out.push(<em key={key}>{withChips(m[3], chipLabels, key)}</em>)
    else out.push(<s key={key}>{withChips(m[4], chipLabels, key)}</s>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(...withChips(text.slice(last), chipLabels, `s${k++}`))
  return out
}

/** Body text with filled values; unfilled variables become chip sentinels */
function fillBody(template: CatalogTemplate, values: Record<number, string>) {
  const chipLabels: string[] = []
  const text = template.body.replace(/\{\{\s*(\d+)\s*\}\}/g, (all, n) => {
    const idx = Number(n)
    const val = String(values[idx] ?? '').replace(/\s*\n\s*/g, ' ').trim()
    if (val) return val
    const label = template.variables.find((v) => v.index === idx)?.label || `Value ${idx}`
    chipLabels.push(label)
    return `${CHIP}${chipLabels.length - 1}${CHIP}`
  })
  return { text, chipLabels }
}

/* ------------------------------------------------------------------------------------------------
 * Pieces
 * ---------------------------------------------------------------------------------------------- */

const WALLPAPER: React.CSSProperties = {
  backgroundColor: '#efeae2',
  backgroundImage:
    'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.025) 1px, transparent 1px)',
  backgroundSize: '18px 18px, 18px 18px',
  backgroundPosition: '0 0, 9px 9px',
}

function ButtonIcon({ b }: { b: CatalogButton }) {
  const cls = 'w-[1.05em] h-[1.05em] shrink-0'
  if (b.type === 'URL') return <ExternalLink className={cls} />
  if (b.type === 'PHONE_NUMBER') return <Phone className={cls} />
  return <CornerUpLeft className={cls} />
}

function ButtonRows({ buttons, compact, hrefFor }: { buttons: CatalogButton[]; compact: boolean; hrefFor: (b: CatalogButton, i: number) => string | undefined }) {
  if (!buttons.length) return null
  // WhatsApp shows up to 3 buttons; with more, the first 2 + "See all options"
  const shown = buttons.length > 3 ? buttons.slice(0, 2) : buttons
  const row = `flex items-center justify-center gap-1.5 border-t border-gray-200/80 font-medium text-[#0a7cff] ${compact ? 'py-1' : 'py-2'}`
  return (
    <div className="-mx-2 mt-1">
      {shown.map((b, i) => {
        const href = hrefFor(b, i)
        return (
          <div key={i} className={row} title={b.type === 'URL' ? href : b.type === 'QUICK_REPLY' ? 'Quick reply: the customer taps it to answer' : b.phone}>
            <ButtonIcon b={b} />
            <span className="truncate">{b.text}</span>
          </div>
        )
      })}
      {buttons.length > 3 && (
        <div className={row}>
          <List className="w-[1.05em] h-[1.05em]" />
          <span>See all options</span>
        </div>
      )}
    </div>
  )
}

function MediaHeader({
  template,
  headerMedia,
  compact,
}: {
  template: CatalogTemplate
  headerMedia?: { url?: string; filename?: string }
  compact: boolean
}) {
  const h = template.header
  if (!h) return null
  const url = String(headerMedia?.url || '').trim()
  const hasUrl = /^https:\/\//i.test(url)

  if (h.type === 'TEXT') return <p className="mb-1 font-semibold text-gray-900">{h.text}</p>

  if (h.type === 'IMAGE') {
    return hasUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={`-mx-1 -mt-0.5 mb-1.5 w-[calc(100%+0.5rem)] rounded-md object-cover ${compact ? 'max-h-20' : 'max-h-56'}`} />
    ) : (
      <div className={`-mx-1 -mt-0.5 mb-1.5 flex flex-col items-center justify-center gap-1 rounded-md bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500 ${compact ? 'h-16' : 'h-36'}`}>
        <ImageIcon className={compact ? 'w-5 h-5' : 'w-8 h-8'} />
        {!compact && <span className="px-3 text-center text-[11px]">Picture goes here{h.hint ? ` — ${h.hint.replace(/\s*\(.*\)$/, '')}` : ''}</span>}
      </div>
    )
  }

  if (h.type === 'VIDEO') {
    return (
      <div className={`-mx-1 -mt-0.5 mb-1.5 flex items-center justify-center rounded-md bg-gray-800 text-white ${compact ? 'h-16' : 'h-36'}`}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
          {hasUrl ? <Play className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </span>
      </div>
    )
  }

  // DOCUMENT
  const filename = headerMedia?.filename || (hasUrl ? documentFilename(url, template.name) : h.sampleFilename || 'Document.pdf')
  const ext = (filename.split('.').pop() || 'pdf').toUpperCase().slice(0, 4)
  return (
    <div className="-mx-1 -mt-0.5 mb-1.5 overflow-hidden rounded-md bg-[#f5f6f6]">
      {!compact && (
        <div className="flex h-24 items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
          <div className="h-16 w-12 rounded-sm bg-white shadow-sm ring-1 ring-gray-200 p-1.5 space-y-1">
            <div className="h-1 w-full rounded bg-gray-200" />
            <div className="h-1 w-4/5 rounded bg-gray-200" />
            <div className="h-1 w-full rounded bg-gray-200" />
            <div className="h-1 w-3/5 rounded bg-gray-200" />
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="flex h-7 w-6 shrink-0 items-center justify-center rounded-sm bg-red-500 text-[7px] font-bold text-white">{ext}</span>
        <div className="min-w-0">
          <p className={`truncate font-medium text-gray-800 ${hasUrl || !compact ? '' : 'italic'}`}>{filename}</p>
          <p className="text-[0.8em] text-gray-500">{hasUrl ? `${ext} · tap to open` : 'Attach the file link'}</p>
        </div>
        {!hasUrl && <FileText className="ml-auto w-4 h-4 shrink-0 text-amber-500" />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Main component
 * ---------------------------------------------------------------------------------------------- */

/**
 * A realistic mock of how a template message looks on the customer's phone.
 * `values` maps {{n}} → text; URL-button end-of-link values use `buttonValueKey(buttonIndex)`.
 */
export default function WhatsAppPhonePreview({
  template,
  values,
  headerMedia,
  businessName = 'Travelzada',
  compact = false,
}: {
  template: CatalogTemplate
  values: Record<number, string>
  headerMedia?: { url?: string; filename?: string }
  businessName?: string
  compact?: boolean
}) {
  const { text, chipLabels } = fillBody(template, values)
  const time = '10:42'
  const hrefFor = (b: CatalogButton, i: number) => {
    if (b.type !== 'URL' || !b.url) return undefined
    if (!b.urlHasVariable) return b.url
    const v = String(values[buttonValueKey(i)] || '').trim()
    return b.url.replace(/\{\{1\}\}/, v || `[${b.urlVariable?.label || 'end of link'}]`)
  }

  const bubble = (
    <div className={`relative max-w-[88%] ${compact ? 'text-[10.5px] leading-snug' : 'text-[13.5px] leading-[1.35]'}`}>
      {/* tail */}
      <span
        aria-hidden
        className="absolute -left-1.5 top-0 h-0 w-0 border-r-[8px] border-t-[8px] border-r-transparent border-t-white"
      />
      <div className={`rounded-lg rounded-tl-none bg-white shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${compact ? 'px-1.5 pt-1 pb-0.5' : 'px-2 pt-1.5 pb-1'}`}>
        <MediaHeader template={template} headerMedia={headerMedia} compact={compact} />
        {template.wordingKnown === false ? (
          <div className="space-y-0.5 text-gray-800">
            <p className="rounded bg-amber-50 px-1.5 py-1 text-[0.85em] text-amber-800 ring-1 ring-amber-200">
              Wording not in our guide — check this template in GetGabs. The values you fill in:
            </p>
            {template.variables.map((v) => (
              <p key={v.index}>
                <span className="text-gray-500">{v.label}: </span>
                {values[v.index]?.trim() ? values[v.index] : withChips(`${CHIP}0${CHIP}`, [v.label], `u${v.index}`)}
              </p>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[#111b21]">{formatWhatsApp(text, chipLabels)}</p>
        )}
        {template.footer && <p className={`mt-1 text-gray-500 ${compact ? 'text-[9px]' : 'text-[11.5px]'}`}>{template.footer}</p>}
        <div className={`flex justify-end text-gray-400 ${compact ? 'text-[8.5px] -mt-0.5' : 'text-[10.5px] -mt-0.5'}`}>
          <span>{time}</span>
        </div>
        <ButtonRows buttons={template.buttons || []} compact={compact} hrefFor={hrefFor} />
      </div>
      {template.carouselCards?.length ? (
        <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
          {template.carouselCards.map((c, i) => (
            <div key={i} className={`shrink-0 overflow-hidden rounded-lg bg-white shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${compact ? 'w-28' : 'w-44'}`}>
              <div className={`flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500 ${compact ? 'h-12' : 'h-24'}`}>
                <ImageIcon className="w-5 h-5" />
                {!compact && <span className="ml-1 text-[10px]">{c.imageHint}</span>}
              </div>
              <p className="px-2 py-1 text-[#111b21]">{c.body}</p>
              <div className="px-2">
                <ButtonRows buttons={c.buttons} compact hrefFor={(b) => b.url} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-xl ring-1 ring-black/5" style={WALLPAPER}>
        <div className="max-h-44 overflow-hidden p-2 pl-3">{bubble}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#efeae2] to-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[2.4rem] bg-gray-900 p-2.5 shadow-xl">
      <div className="overflow-hidden rounded-[1.9rem] bg-white">
        {/* status bar */}
        <div className="flex items-center justify-between bg-[#008069] px-5 pt-2 text-[10px] font-medium text-white/90">
          <span>{time}</span>
          <span className="h-4 w-16 rounded-full bg-gray-900" aria-hidden />
          <span className="tracking-tighter">●●● ▮</span>
        </div>
        {/* chat header */}
        <div className="flex items-center gap-2 bg-[#008069] px-2 pb-2 pt-1.5 text-white">
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#008069]">
            {businessName.trim()[0]?.toUpperCase() || 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-semibold leading-tight">
              <span className="truncate">{businessName}</span>
              <BadgeCheck className="w-4 h-4 shrink-0 fill-[#25d366] text-[#008069]" aria-label="Verified business" />
            </p>
            <p className="truncate text-[10.5px] text-white/80">Business account</p>
          </div>
          <Video className="w-4 h-4 shrink-0 opacity-90" />
          <Phone className="w-4 h-4 shrink-0 opacity-90" />
          <MoreVertical className="w-4 h-4 shrink-0 opacity-90" />
        </div>
        {/* chat */}
        <div className="h-[460px] overflow-y-auto px-3 py-3" style={WALLPAPER}>
          <div className="mb-3 flex justify-center">
            <span className="rounded-md bg-white/90 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-gray-500 shadow-sm">Today</span>
          </div>
          <div className="mb-3 mx-auto max-w-[90%] rounded-md bg-[#fff5c4] px-2 py-1 text-center text-[10.5px] leading-snug text-gray-600 shadow-sm">
            This business uses a secure service from Meta to manage this chat.
          </div>
          {bubble}
        </div>
        {/* input bar */}
        <div className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-2">
          <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-[12px] text-gray-400">Message</div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Mic className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
