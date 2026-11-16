'use client'

/**
 * "Upload a list (Excel / CSV)" — parse a sheet of new people in the browser, map its columns, clean the numbers
 * and hand the result to the wizard. The server re-checks every number, removes opted-out people and saves the
 * list for reuse. Numbers are shown in full to admins only.
 */
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import { Button, Card, Field, cx, inputClass } from '@/components/admin/ui'
import { formatPhone, maskPhone } from '@/lib/admin/privacy'
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
import type { UploadPayload } from './api'

interface SheetData {
  fileName: string
  headers: string[]
  rows: Record<string, unknown>[]
  rawRows: Record<string, unknown>[]
}

const FIELD_LABELS: { key: keyof ColumnMapping; label: string; required?: boolean; help: string }[] = [
  { key: 'phone', label: 'Mobile number', required: true, help: 'WhatsApp number — 10 digits is fine, we add +91' },
  { key: 'name', label: 'Name', help: 'Used for "Hi Priya" in the message' },
  { key: 'destination', label: 'Destination', help: 'Optional — can be used in the message' },
  { key: 'travelDate', label: 'Travel date', help: 'Optional — can be used in the message' },
]

function downloadBlob(data: BlobPart, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Sample .xlsx with the right columns and two fake rows */
export function downloadSampleSheet() {
  const ws = XLSX.utils.aoa_to_sheet(SAMPLE_SHEET)
  ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 26 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  downloadBlob(out, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'travelzada-broadcast-sample.xlsx')
}

async function readSheet(file: File): Promise<SheetData> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('This file has no sheets.')
  // Text as Excel shows it (keeps "98765 43210", avoids 9.87E+09) + raw values (numbers stored as numbers)
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '' })
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' })
  const headerRow = (XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false })[0] || []) as unknown[]
  const headers = headerRow.map((h) => String(h ?? '').trim()).filter(Boolean)
  if (!headers.length || !rows.length) throw new Error('The sheet is empty. Put column names in row 1 and people from row 2.')
  return { fileName: file.name, headers, rows, rawRows }
}

export default function UploadPanel({
  value,
  onChange,
  isAdmin,
}: {
  /** The parsed list currently used for the broadcast (null = nothing uploaded yet) */
  value: UploadPayload | null
  onChange: (v: UploadPayload | null) => void
  isAdmin: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [result, setResult] = useState<UploadParseResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)

  const apply = (s: SheetData, m: ColumnMapping) => {
    setMapping(m)
    if (!m.phone) {
      setResult(null)
      onChange(null)
      return
    }
    const r = parseSheetRows(s.rows, m, { headers: s.headers, rawRows: s.rawRows })
    setResult(r)
    onChange(r.contacts.length ? { fileName: s.fileName, contacts: r.contacts, columns: r.columns } : null)
  }

  const handleFile = async (file?: File | null) => {
    if (!file) return
    setError('')
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return setError('Please upload an Excel (.xlsx / .xls) or CSV file.')
    if (file.size > MAX_UPLOAD_BYTES) return setError(`The file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB. Split it into smaller files.`)
    setBusy(true)
    try {
      const s = await readSheet(file)
      if (s.rows.length > MAX_UPLOAD_ROWS) setError(`Only the first ${MAX_UPLOAD_ROWS.toLocaleString('en-IN')} rows are read — split bigger sheets.`)
      setSheet(s)
      apply(s, detectColumns(s.headers))
    } catch (e: any) {
      setError(e?.message || 'Could not read this file.')
      setSheet(null)
      setResult(null)
      onChange(null)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const reset = () => {
    setSheet(null)
    setMapping(null)
    setResult(null)
    setError('')
    onChange(null)
  }

  const downloadProblems = () => {
    if (!result?.problems.length) return
    downloadBlob(toCsv([['Row', 'Problem'], ...result.problems.map((p) => [p.row, p.reason])]), 'text/csv;charset=utf-8', 'broadcast-list-problems.csv')
  }

  const showPhone = (p: string) => (isAdmin ? formatPhone(p) : maskPhone(p))

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Upload your list</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Excel or CSV · row 1 = column names · up to {MAX_UPLOAD_ROWS.toLocaleString('en-IN')} rows. Only the mobile number is required.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={downloadSampleSheet}>
          <Download className="w-3.5 h-3.5" /> Download sample sheet
        </Button>
      </div>

      {!sheet ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className={cx(
            'mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            drag ? 'border-bordeaux-500 bg-bordeaux-50' : 'border-gray-300 bg-gray-50 hover:border-bordeaux-300 hover:bg-bordeaux-50/40'
          )}
        >
          {busy ? <Loader2 className="w-8 h-8 animate-spin text-bordeaux-600" /> : <Upload className="w-8 h-8 text-bordeaux-600" />}
          <p className="mt-3 text-sm font-semibold text-gray-900">{busy ? 'Reading the sheet…' : 'Drop your Excel / CSV here, or click to choose'}</p>
          <p className="mt-1 text-xs text-gray-500">Columns we understand: Name, Mobile, Destination, Travel date — any other columns can be used in the message too.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-gray-800">
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="truncate">{sheet.fileName}</span>
              <span className="shrink-0 text-xs font-normal text-gray-500">· {sheet.rows.length.toLocaleString('en-IN')} rows</span>
            </span>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200">
              <X className="w-3.5 h-3.5" /> Choose another file
            </button>
          </div>

          {/* Column mapping */}
          <div>
            <p className="text-sm font-semibold text-gray-900">Which column is which?</p>
            <p className="text-xs text-gray-500 mb-2">We matched these automatically — change any that are wrong.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELD_LABELS.map((f) => (
                <Field key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} hint={f.help}>
                  <select
                    className={cx(inputClass, f.required && !mapping?.[f.key] && 'border-red-300')}
                    value={mapping?.[f.key] || ''}
                    onChange={(e) => mapping && apply(sheet, { ...mapping, [f.key]: e.target.value })}
                  >
                    <option value="">{f.required ? 'Choose the mobile number column' : '— Not in this sheet —'}</option>
                    {sheet.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            {mapping && !mapping.phone && <p className="mt-2 text-xs text-red-600">Pick the column that has the mobile numbers.</p>}
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Ready to message', value: result.counts.valid, tone: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Invalid number', value: result.counts.invalid, tone: result.counts.invalid ? 'text-red-700 bg-red-50' : 'text-gray-600 bg-gray-50' },
                  { label: 'No number', value: result.counts.noNumber, tone: 'text-gray-600 bg-gray-50' },
                  { label: 'Duplicates', value: result.counts.duplicates, tone: 'text-gray-600 bg-gray-50' },
                ].map((c) => (
                  <div key={c.label} className={cx('rounded-xl px-3 py-2', c.tone)}>
                    <p className="text-lg font-bold tabular-nums">{c.value.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] font-medium">{c.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">People who replied STOP before are removed on the next step (checked on the server).</p>
              {result.problems.length > 0 && (
                <button type="button" onClick={downloadProblems} className="inline-flex items-center gap-1.5 text-xs font-semibold text-bordeaux-700 hover:underline">
                  <Download className="w-3.5 h-3.5" /> Download the {result.problems.length} problem row{result.problems.length === 1 ? '' : 's'} to fix them
                </button>
              )}
              {result.columns.length > 0 && (
                <p className="text-xs text-gray-600">
                  Extra columns you can use in the message: <b>{result.columns.map((c) => c.label).join(', ')}</b>
                </p>
              )}
              {result.ignoredColumns.length > 0 && (
                <p className="text-xs text-gray-500">Ignored (look like other contact details): {result.ignoredColumns.join(', ')}</p>
              )}

              {result.contacts.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 text-left text-gray-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Row</th>
                        <th className="px-3 py-2 font-semibold">Name</th>
                        <th className="px-3 py-2 font-semibold">Mobile</th>
                        <th className="px-3 py-2 font-semibold">Destination</th>
                        <th className="px-3 py-2 font-semibold">Travel date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.contacts.slice(0, 10).map((c, i) => (
                        <tr key={c.phone}>
                          <td className="px-3 py-1.5 text-gray-400 tabular-nums">{result.rowNumbers[i]}</td>
                          <td className="px-3 py-1.5 text-gray-900">{c.name || <span className="text-gray-400">No name</span>}</td>
                          <td className="px-3 py-1.5 tabular-nums text-gray-700">{showPhone(c.phone)}</td>
                          <td className="px-3 py-1.5 text-gray-700">{c.destination || '—'}</td>
                          <td className="px-3 py-1.5 text-gray-700">{c.travelDate || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.contacts.length > 10 && <p className="px-3 py-2 text-[11px] text-gray-500">…and {(result.contacts.length - 10).toLocaleString('en-IN')} more</p>}
                </div>
              ) : (
                <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> No valid mobile numbers found — check you picked the right column.
                </p>
              )}
              {value && (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> List ready — the count on the right is after removing anyone who opted out.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold">Only message people who agreed to hear from Travelzada</p>
        <p className="mt-1">
          WhatsApp watches how people react to messages from new numbers. If many block or report you, it limits — or bans — your WhatsApp number.
          Start with a small list, use a friendly first-contact template, and never upload bought lists. At most 250 new people a day.
        </p>
      </div>
    </Card>
  )
}
