'use client'

import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import { Button, Card, Field, cx, inputClass } from '@/components/admin/ui'
import { formatPhone, maskPhone } from '@/lib/admin/privacy'
import { prettyDate } from '@/lib/whatsapp/broadcasts'
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_ROWS,
  SAMPLE_SHEET,
  detectColumns,
  parseSheetRows,
  toCsv,
  type ColumnMapping,
  type UploadParseResult,
} from '@/lib/whatsapp/contactLists'
import type { AudiencePreview, UploadPayload } from './api'

/** What the wizard keeps for an uploaded sheet */
export interface UploadState extends UploadPayload {
  /** Bumps on every change (new file / new column mapping) so the server preview refreshes */
  version: number
}

interface Sheet {
  fileName: string
  headers: string[]
  rows: Record<string, unknown>[]
  rawRows: Record<string, unknown>[]
  totalRows: number
}

const FIELDS: { id: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { id: 'phone', label: 'Mobile number', required: true },
  { id: 'name', label: 'Name' },
  { id: 'destination', label: 'Destination' },
  { id: 'travelDate', label: 'Travel date' },
]

function download(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function downloadSampleSheet() {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet(SAMPLE_SHEET)
  ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 24 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
  XLSX.writeFile(wb, 'travelzada-whatsapp-list-sample.xlsx')
}

/**
 * "Upload a list (Excel / CSV)": read the sheet in the browser, map columns, clean + de-duplicate numbers,
 * show a preview and a problems report. The server checks everything again (and opt-outs) — see AudienceStep.
 */
export default function UploadListPanel({
  value,
  onChange,
  preview,
  previewLoading,
  isAdmin,
}: {
  value: UploadState | null
  onChange: (v: UploadState | null) => void
  /** Server preview for this upload (opt-outs etc.) */
  preview: AudiencePreview | null
  previewLoading: boolean
  isAdmin: boolean
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({ name: '', phone: '', destination: '', travelDate: '' })
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UploadParseResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const apply = (s: Sheet, m: ColumnMapping) => {
    const r = parseSheetRows(s.rows, m, { headers: s.headers, rawRows: s.rawRows })
    setResult(r)
    onChange(m.phone && r.contacts.length ? { fileName: s.fileName, contacts: r.contacts, columns: r.columns, version: Date.now() } : null)
  }

  const readFile = async (file: File) => {
    setError('')
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return setError('Upload an Excel (.xlsx / .xls) or CSV file.')
    if (file.size > MAX_UPLOAD_BYTES) return setError(`The file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 2 MB. Remove extra columns or split the sheet.`)
    setReading(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true, dense: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error('The file has no sheets.')
      // Formatted text (what people see) + typed values (numbers stay numbers, so 919876543210 isn't "9.19877E+11")
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '', blankrows: false })
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '', blankrows: false })
      if (!rows.length) throw new Error('The first sheet is empty. Put the headings (Name, Mobile…) in row 1 and people below.')
      if (rows.length > MAX_UPLOAD_ROWS) throw new Error(`The sheet has ${rows.length.toLocaleString('en-IN')} rows — the limit is ${MAX_UPLOAD_ROWS.toLocaleString('en-IN')}. Split it into smaller sheets.`)
      const headers = Object.keys(rows[0]).filter((h) => !/^__EMPTY/.test(h))
      const s: Sheet = { fileName: file.name.slice(0, 120), headers, rows, rawRows, totalRows: rows.length }
      const m = detectColumns(headers)
      setSheet(s)
      setMapping(m)
      apply(s, m)
      if (!m.phone) setError('We could not find the mobile number column — pick it below.')
    } catch (e: any) {
      setSheet(null)
      setResult(null)
      onChange(null)
      setError(e?.message || 'Could not read this file.')
    } finally {
      setReading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const setField = (id: keyof ColumnMapping, header: string) => {
    if (!sheet) return
    const m = { ...mapping }
    // A header can only be used once
    for (const f of FIELDS) if (m[f.id] === header && f.id !== id) m[f.id] = ''
    m[id] = header
    setMapping(m)
    apply(sheet, m)
  }

  const clear = () => {
    setSheet(null)
    setResult(null)
    setError('')
    onChange(null)
  }

  // Server checks (opt-outs) → sheet row numbers
  const serverRows = useMemo(() => {
    if (!result || !preview || !value) return { optedOut: [] as number[], invalid: [] as number[] }
    const toRow = (i: number) => result.rowNumbers[i]
    return { optedOut: (preview.optedOutRows || []).map(toRow).filter(Boolean), invalid: (preview.invalidRows || []).map(toRow).filter(Boolean) }
  }, [result, preview, value])

  const problemsCsv = () => {
    if (!result || !sheet) return
    const rows: (string | number)[][] = [['Row', 'Problem']]
    const all = [
      ...result.problems,
      ...serverRows.optedOut.map((row) => ({ row, reason: 'Opted out — replied STOP to us before (will not be messaged)' })),
      ...serverRows.invalid.map((row) => ({ row, reason: 'Rejected by the server check' })),
    ].sort((a, b) => a.row - b.row)
    for (const p of all) rows.push([p.row, p.reason])
    download(`${sheet.fileName.replace(/\.[^.]+$/, '')}-problems.csv`, new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }))
  }

  const problemCount = (result?.problems.length || 0) + serverRows.optedOut.length + serverRows.invalid.length
  const showPhone = (p: string) => (isAdmin ? formatPhone(p) : maskPhone(p))

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Upload a list of new people</p>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
            Excel or CSV, first sheet only, up to 2 MB / {MAX_UPLOAD_ROWS.toLocaleString('en-IN')} rows. Row 1 = headings: <strong>Name, Mobile</strong>, and
            optionally Destination, Travel date and any other columns (e.g. Notes) — every column can fill a template blank. Indian 10-digit numbers are fine;
            write other countries with their code (+44…).
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => downloadSampleSheet().catch(() => setError('Could not create the sample sheet.'))}>
          <Download className="w-4 h-4" /> Download sample sheet
        </Button>
      </div>

      {!sheet ? (
        <label
          className={cx(
            'mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-bordeaux-300',
            reading && 'pointer-events-none opacity-60'
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) readFile(f)
          }}
        >
          {reading ? <Loader2 className="w-6 h-6 animate-spin text-bordeaux-600" /> : <Upload className="w-6 h-6 text-bordeaux-600" />}
          <span className="text-sm font-semibold text-gray-800">{reading ? 'Reading the sheet…' : 'Choose a file or drop it here'}</span>
          <span className="text-xs text-gray-500">.xlsx · .xls · .csv</span>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) readFile(f)
            }}
          />
        </label>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-gray-800">
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="truncate">{sheet.fileName}</span>
              <span className="shrink-0 text-xs font-normal text-gray-500">· {sheet.totalRows.toLocaleString('en-IN')} rows</span>
            </span>
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200">
              <X className="w-3.5 h-3.5" /> Use another file
            </button>
          </div>

          {/* Column mapping */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Which column is which?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <Field key={f.id} label={`${f.label}${f.required ? ' *' : ''}`}>
                  <select className={cx(inputClass, f.required && !mapping[f.id] && 'border-red-300')} value={mapping[f.id]} onChange={(e) => setField(f.id, e.target.value)}>
                    <option value="">{f.required ? '— pick a column —' : '— none —'}</option>
                    {sheet.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            {result && (result.columns.length > 0 || result.ignoredColumns.length > 0) && (
              <p className="mt-2 text-xs text-gray-500">
                {result.columns.length > 0 && (
                  <>
                    Other columns kept for the message: <strong>{result.columns.map((c) => c.label).join(', ')}</strong>.{' '}
                  </>
                )}
                {result.ignoredColumns.length > 0 && <>Ignored (contact details): {result.ignoredColumns.join(', ')}.</>}
              </p>
            )}
          </div>

          {/* Summary */}
          {result && mapping.phone && (
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-sm text-gray-800">
                <strong className="text-emerald-700">{result.counts.valid.toLocaleString('en-IN')} valid</strong>
                {' · '}
                <span className={result.counts.invalid + result.counts.noNumber ? 'text-red-600 font-semibold' : ''}>{(result.counts.invalid + result.counts.noNumber).toLocaleString('en-IN')} invalid</span>
                {' · '}
                {result.counts.duplicates.toLocaleString('en-IN')} duplicates
                {' · '}
                {previewLoading && !preview ? (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> checking opt-outs…
                  </span>
                ) : (
                  <>{serverRows.optedOut.length.toLocaleString('en-IN')} already opted out</>
                )}{' '}
                <span className="text-xs text-gray-400">(opt-outs checked on server)</span>
              </p>
              {result.counts.noNumber > 0 && <p className="text-xs text-gray-500 mt-1">{result.counts.noNumber} of the invalid rows have no mobile number.</p>}
              {problemCount > 0 && (
                <button type="button" onClick={problemsCsv} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-bordeaux-700 hover:underline">
                  <Download className="w-3.5 h-3.5" /> Download the {problemCount} problem row(s) as CSV
                </button>
              )}
              {result.counts.valid === 0 && (
                <p className="mt-2 flex gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> No valid mobile numbers — check that the right column is picked.
                </p>
              )}
            </div>
          )}

          {/* Preview */}
          {result && result.contacts.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Row</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Mobile</th>
                    <th className="px-3 py-2 font-semibold">Destination</th>
                    <th className="px-3 py-2 font-semibold">Travel date</th>
                    {result.columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 font-semibold whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.contacts.slice(0, 10).map((c, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-gray-400 tabular-nums">{result.rowNumbers[i]}</td>
                      <td className="px-3 py-1.5 text-gray-900 whitespace-nowrap">{c.name || <span className="text-gray-400">No name</span>}</td>
                      <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">{showPhone(c.phone)}</td>
                      <td className="px-3 py-1.5">{c.destination || '—'}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{c.travelDate ? prettyDate(c.travelDate) : '—'}</td>
                      {result.columns.map((col) => (
                        <td key={col.key} className="px-3 py-1.5 max-w-[12rem] truncate">
                          {c.extra?.[col.key] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.contacts.length > 10 && <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">First 10 of {result.contacts.length.toLocaleString('en-IN')} people.</p>}
              {!isAdmin && <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">Numbers are masked — only admins can see them.</p>}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </Card>
  )
}
