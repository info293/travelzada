'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, CheckCheck, Clock, FileText, Loader2, MessageSquare, Paperclip, RotateCcw, X } from 'lucide-react'
import { whatsappFailureText } from '@/lib/whatsappDiagnostics'
import { TEMPLATE_INSTEAD_CODES, dayLabel, formatClock, isHttpsMedia, type LocalMessage, type WhatsAppMessage } from './types'

export interface SystemNotice {
  id: string
  text: string
  /** One-off notices can be dismissed */
  onDismiss?: () => void
}

/** Small centred grey line, like WhatsApp's date chips */
export function SystemLine({ children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void }) {
  return (
    <div className="flex justify-center py-1">
      <span className="inline-flex max-w-[85%] items-center gap-2 rounded-lg bg-white/90 px-3 py-1 text-center text-[11.5px] text-gray-600 shadow-sm">
        <span>{children}</span>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="text-gray-400 hover:text-gray-700" aria-label="Dismiss">
            <X className="w-3 h-3" />
          </button>
        )}
      </span>
    </div>
  )
}

/** "Not sent · Why? · Retry" (+ "Send a template instead" when only a template can go through) */
function FailedRow({ why, onRetry, onTemplate, defaultOpen }: { why: React.ReactNode; onRetry: () => void; onTemplate?: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[11.5px]">
        <span className="inline-flex items-center gap-1 font-semibold text-red-600">
          <AlertCircle className="w-3.5 h-3.5" /> Not sent
        </span>
        <span className="text-gray-300">·</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="font-medium text-gray-600 underline decoration-dotted hover:text-gray-900">
          Why?
        </button>
        <span className="text-gray-300">·</span>
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-semibold text-bordeaux-700 hover:underline">
          <RotateCcw className="w-3 h-3" /> Retry
        </button>
        {onTemplate && (
          <>
            <span className="text-gray-300">·</span>
            <button type="button" onClick={onTemplate} className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline">
              <FileText className="w-3 h-3" /> Send a template instead
            </button>
          </>
        )}
      </div>
      {open && <p className="mt-1 rounded-md bg-red-50 px-2 py-1.5 text-[11.5px] leading-snug text-red-800">{why}</p>}
    </div>
  )
}

function Ticks({ status }: { status?: WhatsAppMessage['status'] }) {
  if (status === 'read') return <CheckCheck className="w-4 h-4 text-sky-500" aria-label="Read" />
  if (status === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400" aria-label="Delivered" />
  return <Check className="w-4 h-4 text-gray-400" aria-label="Sent" />
}

export function MessageBubble({
  msg,
  onRetry,
  onSendTemplate,
  whyOpen,
}: {
  msg: WhatsAppMessage
  onRetry: () => void
  onSendTemplate: () => void
  /** QA preview: start with "Why?" expanded */
  whyOpen?: boolean
}) {
  const out = msg.direction === 'outbound'
  const failed = out && msg.status === 'failed'
  const media = isHttpsMedia(msg.mediaUrl)
  const templateInstead = failed && msg.type !== 'template' && (TEMPLATE_INSTEAD_CODES.includes(Number(msg.errorCode)) || msg.errorKind === 'outside_window')
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] sm:max-w-[65%] ${failed ? 'w-fit' : ''}`}>
        <div
          className={`relative rounded-lg px-2.5 pb-1.5 pt-1.5 text-[14px] leading-snug text-gray-900 shadow-sm ${
            out ? `rounded-tr-none ${failed ? 'bg-[#fdecec] ring-1 ring-red-200' : 'bg-[#d9fdd3]'}` : 'rounded-tl-none bg-white'
          }`}
        >
          {msg.type === 'template' && (
            <p className="mb-0.5 text-[10.5px] font-semibold text-emerald-700" title={msg.templateName || undefined}>
              Template message
            </p>
          )}
          {msg.replyToText && <p className="mb-1 line-clamp-2 rounded border-l-4 border-emerald-400 bg-black/5 px-2 py-1 text-[12px] text-gray-600">{msg.replyToText}</p>}
          {media &&
            (msg.type === 'image' || msg.type === 'sticker' ? (
              <a href={msg.mediaUrl!} target="_blank" rel="noopener noreferrer" className="mb-1 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={msg.mediaUrl!} alt="" className="max-h-60 rounded-md object-cover" loading="lazy" />
              </a>
            ) : (
              <a
                href={msg.mediaUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-1 flex items-center gap-2 rounded-md bg-black/5 px-2 py-1.5 text-[13px] text-gray-800 hover:bg-black/10"
              >
                <Paperclip className="w-4 h-4 shrink-0 text-gray-500" />
                <span className="truncate">{msg.fileName || `Open ${msg.type === 'text' ? 'attachment' : msg.type}`}</span>
              </a>
            ))}
          {/* Hide auto placeholders ("[Image]", "[Document] file.pdf") when the attachment itself is shown above */}
          {!(media && /^\[(Image|Sticker|Document)\]/.test(msg.text) && !/\n/.test(msg.text)) && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-gray-500">
            <span>{formatClock(msg.timestamp)}</span>
            {out && !failed && <Ticks status={msg.status} />}
          </div>
        </div>
        {failed && (
          <FailedRow
            defaultOpen={whyOpen}
            why={msg.errorHint ? msg.errorHint : whatsappFailureText(msg.errorCode, msg.errorTitle, msg.errorDetails)}
            onRetry={onRetry}
            onTemplate={templateInstead ? onSendTemplate : undefined}
          />
        )}
      </div>
    </div>
  )
}

export function LocalBubble({ m, onRetry, onSendTemplate }: { m: LocalMessage; onRetry: () => void; onSendTemplate: () => void }) {
  const failed = m.status === 'failed'
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] sm:max-w-[65%]">
        <div className={`rounded-lg rounded-tr-none px-2.5 pb-1.5 pt-1.5 text-[14px] leading-snug text-gray-900 shadow-sm ${failed ? 'bg-[#fdecec] ring-1 ring-red-200' : 'bg-[#d9fdd3]/70'}`}>
          <p className="whitespace-pre-wrap break-words">{m.text}</p>
          {!failed && (
            <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-gray-500">
              <Clock className="w-3 h-3" /> Sending…
            </div>
          )}
        </div>
        {failed && (
          <FailedRow
            why={
              <>
                {m.hint || m.error}
                {m.hint && m.error ? <span className="mt-0.5 block text-red-500">({m.error})</span> : null}
              </>
            }
            onRetry={onRetry}
            onTemplate={m.canSendTemplate ? onSendTemplate : undefined}
          />
        )}
      </div>
    </div>
  )
}

/** The conversation: date chips, bubbles, in-flight/failed local messages and small system lines */
export default function MessageList({
  messages,
  localMessages,
  loading,
  customerName,
  notices = [],
  onRetry,
  onRetryLocal,
  onSendTemplate,
  whyOpenId,
}: {
  messages: WhatsAppMessage[]
  localMessages: LocalMessage[]
  loading: boolean
  customerName: string
  notices?: SystemNotice[]
  onRetry: (msg: WhatsAppMessage) => void
  onRetryLocal: (m: LocalMessage) => void
  onSendTemplate: () => void
  whyOpenId?: string
}) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, localMessages.length, notices.length])

  let lastDay = ''
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#efeae2] px-3 py-3 sm:px-6">
      {loading ? (
        <div className="flex h-full items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-bordeaux-600" />
          <span className="text-sm">Loading messages…</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {messages.length === 0 && localMessages.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <MessageSquare className="mb-2 w-10 h-10 text-gray-400/60" />
              <p className="text-sm font-medium text-gray-700">No messages with {customerName} yet</p>
              <p className="mt-0.5 text-xs text-gray-500">Pick a first message below to say hello.</p>
            </div>
          )}
          {messages.map((msg) => {
            const day = dayLabel(msg.timestamp)
            const chip = day && day !== lastDay
            lastDay = day || lastDay
            return (
              <Fragment key={msg.id}>
                {chip && <SystemLine>{day}</SystemLine>}
                <MessageBubble msg={msg} onRetry={() => onRetry(msg)} onSendTemplate={onSendTemplate} whyOpen={whyOpenId === msg.id} />
              </Fragment>
            )
          })}
          {localMessages.map((m) => (
            <LocalBubble key={m.localId} m={m} onRetry={() => onRetryLocal(m)} onSendTemplate={onSendTemplate} />
          ))}
          {notices.map((n) => (
            <SystemLine key={n.id} onDismiss={n.onDismiss}>
              {n.text}
            </SystemLine>
          ))}
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
