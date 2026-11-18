'use client'

import { useRef, type FormEvent, type KeyboardEvent } from 'react'
import { AlertTriangle, FileText, Info, Loader2, Paperclip, Send } from 'lucide-react'

/**
 * The normal message box (reply window open, or "Type a message anyway"):
 * 📎 attach a photo/PDF · type · Templates · Send. Enter sends, Shift+Enter makes a new line.
 */
export default function Composer({
  value,
  onChange,
  onSend,
  onTemplates,
  onAttachFile,
  attaching,
  attachError,
  placeholder,
  oldNumber,
  warning,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onTemplates: () => void
  /** Upload + send a photo or PDF (the typed text becomes its caption) */
  onAttachFile?: (file: File) => void
  attaching?: boolean
  attachError?: string | null
  placeholder: string
  /** Replying from the old number the customer wrote to */
  oldNumber?: boolean
  /** "Type a message anyway" while only a template is allowed */
  warning?: { onUseTemplate: () => void }
  disabled?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!value.trim() || disabled) return
    onSend()
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t border-gray-200 bg-[#f0f2f5]">
      {warning && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span className="flex-1">This will probably not be delivered — right now WhatsApp only allows a template.</span>
          <button type="button" onClick={warning.onUseTemplate} className="font-semibold text-bordeaux-700 underline hover:text-bordeaux-900">
            Use a template instead
          </button>
        </div>
      )}
      {oldNumber && !warning && (
        <p className="flex items-center gap-1.5 px-4 pt-1.5 text-[11.5px] text-gray-500">
          <Info className="w-3 h-3" /> Replying from the number this customer used
        </p>
      )}
      {attachError && <p className="px-4 pt-1.5 text-[11.5px] text-red-600">{attachError}</p>}
      <form onSubmit={submit} className="flex items-end gap-1.5 px-2 py-2 sm:px-3">
        {onAttachFile && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={attaching || disabled}
              className="rounded-full p-2.5 text-gray-500 hover:bg-white hover:text-gray-800 disabled:opacity-50"
              title="Send a photo or PDF"
              aria-label="Attach a photo or PDF"
            >
              {attaching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) onAttachFile(f)
              }}
            />
          </>
        )}
        <textarea
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="max-h-32 min-h-[42px] min-w-0 flex-1 resize-none rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-bordeaux-200 disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={onTemplates}
          disabled={disabled}
          className="inline-flex h-[42px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900 disabled:opacity-50"
          title="Send a ready-made template message"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Templates</span>
        </button>
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="inline-flex h-[42px] items-center gap-1.5 rounded-lg bg-bordeaux-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-bordeaux-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  )
}
