'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, ExternalLink, FileText, HelpCircle, Keyboard, Lock, MoreVertical, Phone, RefreshCw, Smartphone } from 'lucide-react'

export interface ChatMenuProps {
  canSeePhone: boolean
  /** Full number for admins, masked for everyone else */
  phoneText: string
  record?: { href: string; label: string } | null
  quoteHref?: string | null
  /** Which of our WhatsApp numbers this chat uses, in plain words */
  numberInfo: { title: string; lines: string[] }
  /** Only when a normal message isn't allowed right now */
  typeAnyway?: { active: boolean; onToggle: () => void }
  onRefresh: () => void
  refreshing?: boolean
  onHelp: () => void
  /** Open on first render (QA preview) */
  defaultOpen?: boolean
}

/** Everything that isn't needed every minute lives here, behind "⋯" */
export default function ChatMenu({ canSeePhone, phoneText, record, quoteHref, numberInfo, typeAnyway, onRefresh, refreshing, onHelp, defaultOpen }: ChatMenuProps) {
  const [open, setOpen] = useState(!!defaultOpen)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phoneText.replace(/\s+/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the number is visible to copy by hand */
    }
  }

  const item = 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 ${open ? 'bg-gray-100 text-gray-800' : ''}`}
        aria-label="More options"
        aria-expanded={open}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[300px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl" role="menu">
          {/* Customer's number */}
          <div className="flex items-center gap-2.5 px-3 py-2">
            {canSeePhone ? <Phone className="w-4 h-4 shrink-0 text-gray-400" /> : <Lock className="w-4 h-4 shrink-0 text-gray-400" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium tabular-nums text-gray-900">{phoneText || '—'}</p>
              <p className="text-[11px] text-gray-500">{canSeePhone ? "Customer's number" : 'Only admins can see the number'}</p>
            </div>
            {canSeePhone && phoneText && (
              <button type="button" onClick={copy} className="rounded-md px-2 py-1 text-xs font-semibold text-bordeaux-700 hover:bg-bordeaux-50">
                {copied ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Copied
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="my-1 border-t border-gray-100" />

          {record && (
            <Link href={record.href} className={item} onClick={() => setOpen(false)}>
              <ExternalLink className="w-4 h-4 text-gray-400" /> {record.label}
            </Link>
          )}
          {quoteHref && (
            <Link href={quoteHref} className={item} onClick={() => setOpen(false)}>
              <FileText className="w-4 h-4 text-gray-400" /> Create a quote PDF for this customer
            </Link>
          )}

          {/* Which of our numbers */}
          <div className="flex gap-2.5 px-3 py-2">
            <Smartphone className="mt-0.5 w-4 h-4 shrink-0 text-gray-400" />
            <div className="min-w-0">
              <p className="text-sm text-gray-700">{numberInfo.title}</p>
              {numberInfo.lines.map((l) => (
                <p key={l} className="mt-0.5 text-[11px] leading-snug text-gray-500">
                  {l}
                </p>
              ))}
            </div>
          </div>

          <div className="my-1 border-t border-gray-100" />

          {typeAnyway && (
            <button
              type="button"
              className={item}
              onClick={() => {
                typeAnyway.onToggle()
                setOpen(false)
              }}
            >
              <Keyboard className="w-4 h-4 text-gray-400" />
              <span>
                {typeAnyway.active ? 'Back to the template messages' : 'Type a message anyway'}
                {!typeAnyway.active && <span className="block text-[11px] text-gray-500">Advanced — it will probably not be delivered</span>}
              </span>
            </button>
          )}
          <button
            type="button"
            className={item}
            onClick={() => {
              onRefresh()
              setOpen(false)
            }}
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /> Refresh delivery ticks
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              onHelp()
              setOpen(false)
            }}
          >
            <HelpCircle className="w-4 h-4 text-gray-400" /> How WhatsApp messaging works
          </button>
        </div>
      )}
    </div>
  )
}
