'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, Loader2, Sparkles, Upload, Video } from 'lucide-react'
import { documentFilename, isHttpsUrl } from '@/lib/getgabsTemplates'
import { buttonValueKey, dynamicUrlButtons, type CatalogTemplate, type VariableSource } from '@/lib/whatsapp/templateCatalog'
import {
  hasMediaHeader,
  initialValues,
  urlPrefix,
  urlSuffix,
  type HeaderMediaValue,
  type TemplateValues,
} from './templateSend'

export {
  buildComponents,
  previewText,
  missingFields,
  initialValues,
  cleanVariable,
  urlSuffix,
  type MissingField,
  type TemplateValues,
  type HeaderMediaValue,
  type TemplateAutofill,
} from './templateSend'

const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100'

const MEDIA_ACCEPT: Record<string, string> = { DOCUMENT: 'application/pdf', IMAGE: 'image/jpeg,image/png', VIDEO: 'video/mp4' }
const MAX_UPLOAD_MB = 4

/** DOM id of a field, so a parent can scroll to / focus the first missing one */
export const fieldDomId = (key: string) => `tpl-field-${key}`

function Label({ children, required, auto }: { children: React.ReactNode; required?: boolean; auto?: boolean }) {
  return (
    <span className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-gray-800">
      {children}
      {required && <span className="text-red-500" aria-label="required">*</span>}
      {auto && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
          <Sparkles className="w-2.5 h-2.5" /> Auto-filled — check it
        </span>
      )}
    </span>
  )
}

/**
 * One clearly-titled input per template variable (+ the file link for PDF / image headers and the end of a
 * dynamic link button). Empty fields are auto-filled from `autofill` when the template changes.
 */
export default function TemplateFields({
  template,
  values,
  onChange,
  headerMedia,
  onHeaderMedia,
  autofill,
  showErrors = false,
}: {
  template: CatalogTemplate
  values: TemplateValues
  onChange: (values: TemplateValues) => void
  headerMedia?: HeaderMediaValue
  onHeaderMedia?: (media: HeaderMediaValue) => void
  autofill?: Partial<Record<VariableSource, string>>
  /** Highlight empty required fields (e.g. after a send attempt) */
  showErrors?: boolean
}) {
  const [upload, setUpload] = useState<{ busy: boolean; error?: string }>({ busy: false })
  const fileRef = useRef<HTMLInputElement>(null)

  // Auto-fill empty fields when the template (or what we know) changes
  const autofillKey = JSON.stringify(autofill || {})
  useEffect(() => {
    const next = initialValues(template, autofill, values)
    if (template.variables.some((v) => next[v.index] !== values[v.index])) onChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.name, autofillKey])

  const set = (key: number, v: string) => onChange({ ...values, [key]: v })
  const isAuto = (idx: number, source?: VariableSource) => !!source && !!autofill?.[source] && values[idx] === autofill[source]

  const media = hasMediaHeader(template) ? template.header! : null
  const mediaUrl = String(headerMedia?.url || '')
  const urlButtons = dynamicUrlButtons(template)

  const doUpload = async (file: File) => {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUpload({ busy: false, error: `That file is ${(file.size / 1048576).toFixed(1)} MB. Please use a file under ${MAX_UPLOAD_MB} MB, or paste a link.` })
      return
    }
    setUpload({ busy: true })
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', '/whatsapp')
      fd.append('fileName', file.name.replace(/[^\w.\-]+/g, '-').slice(-100) || `wa_${Date.now()}`)
      const res = await fetch('/api/imagekit/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || `Upload failed (HTTP ${res.status})`)
      onHeaderMedia?.({ url: data.url, filename: media?.type === 'DOCUMENT' ? file.name : undefined })
      setUpload({ busy: false })
    } catch (e: any) {
      setUpload({ busy: false, error: e?.message || 'Upload failed. Paste a public link instead.' })
    }
  }

  const MediaIcon = media?.type === 'IMAGE' ? ImageIcon : media?.type === 'VIDEO' ? Video : FileText

  return (
    <div className="space-y-4">
      {media && (
        <div id={fieldDomId('header')} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2">
          <Label required>
            <MediaIcon className="w-3.5 h-3.5 text-emerald-600" />
            {media.hint || 'File link (must be a public https link)'}
          </Label>
          <p className="text-[11.5px] leading-snug text-gray-500">
            Shown at the top of the message.{' '}
            {media.type === 'DOCUMENT'
              ? 'Paste a PDF link anyone can open (e.g. the quote PDF from the admin), or upload the PDF.'
              : media.type === 'IMAGE'
                ? 'Paste a JPG/PNG link anyone can open, or upload the picture.'
                : 'Paste an MP4 link anyone can open, or upload the video.'}
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => onHeaderMedia?.({ ...headerMedia, url: e.target.value })}
              placeholder="https://…"
              className={`${inputCls} ${(showErrors || mediaUrl) && !isHttpsUrl(mediaUrl) ? 'border-red-300' : ''}`}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={upload.busy || !onHeaderMedia}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {upload.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={MEDIA_ACCEPT[media.type]}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) doUpload(f)
              }}
            />
          </div>
          {upload.error && <p className="text-[11.5px] text-red-600">{upload.error}</p>}
          {mediaUrl && !isHttpsUrl(mediaUrl) && <p className="text-[11.5px] text-red-600">The link must start with https:// and be public (no Google Drive “request access” links).</p>}
          {media.type === 'DOCUMENT' && isHttpsUrl(mediaUrl) && (
            <label className="block">
              <span className="mb-0.5 block text-[12px] font-medium text-gray-700">File name the customer sees</span>
              <input
                value={headerMedia?.filename ?? ''}
                onChange={(e) => onHeaderMedia?.({ ...headerMedia, filename: e.target.value })}
                placeholder={documentFilename(mediaUrl.trim(), template.name)}
                className={inputCls}
              />
            </label>
          )}
          {isHttpsUrl(mediaUrl) && (
            <a href={mediaUrl.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-700 hover:underline">
              <CheckCircle2 className="w-3 h-3" /> Open the file to check it
            </a>
          )}
        </div>
      )}

      {template.variables.map((v, i) => {
        const val = values[v.index] ?? ''
        const empty = !String(val).trim()
        const long = v.maxLength && val.length > v.maxLength
        return (
          <label key={v.index} id={fieldDomId(`v${v.index}`)} className="block">
            <Label required auto={isAuto(v.index, v.source)}>
              {v.label}
            </Label>
            <span className="mb-1 block text-[11.5px] leading-snug text-gray-500">{v.help}</span>
            <input
              value={val}
              onChange={(e) => set(v.index, e.target.value)}
              placeholder={v.example ? `e.g. ${v.example}` : undefined}
              className={`${inputCls} ${showErrors && empty ? 'border-red-300 bg-red-50/40' : ''}`}
              autoFocus={i === 0 && empty && !media}
            />
            {long ? (
              <span className="mt-0.5 block text-[11px] text-amber-700">
                {val.length} characters — try to keep it under {v.maxLength} so the message reads well.
              </span>
            ) : null}
          </label>
        )
      })}

      {urlButtons.map(({ button, index }) => {
        const key = buttonValueKey(index)
        const raw = values[key] ?? ''
        const suffix = urlSuffix(button, raw)
        return (
          <label key={key} id={fieldDomId(`b${index}`)} className="block rounded-xl border border-sky-100 bg-sky-50/50 p-3">
            <Label required>
              <LinkIcon className="w-3.5 h-3.5 text-sky-600" />
              {button.urlVariable?.label || 'End of the link'}
            </Label>
            <span className="mb-1 block text-[11.5px] leading-snug text-gray-600">
              The <strong>“{button.text}”</strong> button opens <span className="font-mono text-[11px]">{urlPrefix(button)}…</span>.{' '}
              {button.urlVariable?.help}
            </span>
            <input
              value={raw}
              onChange={(e) => set(key, e.target.value)}
              placeholder={button.urlVariable?.example ? `e.g. ${button.urlVariable.example}` : undefined}
              className={`${inputCls} ${showErrors && !suffix ? 'border-red-300 bg-red-50/40' : ''}`}
            />
            {suffix && (
              <span className="mt-1 flex items-center gap-1 break-all text-[11px] text-sky-800">
                <ExternalLink className="w-3 h-3 shrink-0" /> {urlPrefix(button)}
                {suffix}
              </span>
            )}
          </label>
        )
      })}

      {!media && !template.variables.length && !urlButtons.length && <p className="text-sm text-gray-500">Nothing to fill in — this message is sent as it is.</p>}
    </div>
  )
}
