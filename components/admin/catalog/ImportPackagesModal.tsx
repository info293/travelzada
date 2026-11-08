'use client'

/** Bulk import packages from an Excel/CSV sheet or a JSON array. Tucked away behind the "Import" button. */
import { useMemo, useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { CheckCircle2, Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react'
import { db } from '@/lib/firebase'
import { Button, cx, inputClass } from '@/components/admin/ui'
import { Modal, Segmented } from './fields'
import { durationLabel, nightsFrom, priceRangeLabel, splitList, toNum } from './packageUtils'
import type { PackageDraft } from './types'

const NUMBER_FIELDS = ['Price_Min_INR', 'Price_Max_INR', 'Duration_Nights', 'Duration_Days'] as const
const LIST_FIELDS = ['Highlights'] as const
const JSON_FIELDS = ['Day_Wise_Itinerary_Details', 'Guest_Reviews', 'FAQ_Items', 'Why_Book_With_Us', 'Booking_Policies'] as const

const TEMPLATE_HEADERS = [
  'Destination_ID', 'Destination_Name', 'Overview', 'Duration_Nights', 'Price_Min_INR', 'Price_Max_INR', 'Primary_Image_URL',
  'Occasion', 'Travel_Type', 'Mood', 'Theme', 'Budget_Category', 'Star_Category', 'Meal_Plan', 'Hotel_Examples', 'Location_Breakup',
  'Highlights', 'Inclusions', 'Exclusions', 'Day_Wise_Itinerary', 'Slug', 'SEO_Title', 'SEO_Description',
]
const TEMPLATE_ROW = [
  'BAL_101', 'Romantic Bali Escape', 'Beaches, temples and a private pool villa.', 5, 48500, 65000, 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600',
  'Honeymoon, Anniversary', 'Couple', 'Romantic', 'Beach / Culture', 'Premium', '4-Star', 'Breakfast Only', 'The Anvaya, Amadea Resort', '3N Seminyak + 2N Ubud',
  'Sunset dinner cruise | Private pool villa | Ubud temple tour', 'Hotel stay with breakfast, Private airport transfers', 'Flights, Visa', 'Day 1: Arrival | Day 2: Ubud tour | Day 3: Nusa Penida | Day 4: Spa day | Day 5: Free day | Day 6: Departure', '', '', '',
]

const SAMPLE_JSON = [
  {
    Destination_ID: 'BAL_101',
    Destination_Name: 'Romantic Bali Escape',
    Overview: 'Beaches, temples and a private pool villa.',
    Duration_Nights: 5,
    Price_Min_INR: 48500,
    Primary_Image_URL: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600',
    Occasion: 'Honeymoon',
    Travel_Type: 'Couple',
    Mood: 'Romantic',
    Highlights: ['Sunset dinner cruise', 'Private pool villa'],
    Inclusions: 'Hotel stay with breakfast, Private airport transfers',
    Exclusions: 'Flights, Visa',
    Day_Wise_Itinerary_Details: [
      { day: 1, title: 'Arrival', description: 'Airport pickup and check-in.', activities: ['Airport pickup'] },
      { day: 2, title: 'Ubud tour', description: 'Temples and rice terraces.', activities: [] },
    ],
  },
]

function cleanRow(raw: Record<string, any>): PackageDraft {
  const p: Record<string, any> = {}
  Object.entries(raw).forEach(([k, v]) => {
    const key = String(k).trim()
    if (!key || v === '' || v === null || v === undefined) return
    p[key] = typeof v === 'string' ? v.trim() : v
  })
  NUMBER_FIELDS.forEach((k) => {
    if (k in p) {
      const n = toNum(p[k])
      if (n === undefined) delete p[k]
      else p[k] = n
    }
  })
  LIST_FIELDS.forEach((k) => {
    if (typeof p[k] === 'string') p[k] = splitList(p[k], /\s*\|\s*|\r?\n/)
  })
  JSON_FIELDS.forEach((k) => {
    if (typeof p[k] === 'string') {
      try {
        p[k] = JSON.parse(p[k])
      } catch {
        delete p[k]
      }
    }
  })
  if (p.Destination_ID) p.Destination_ID = String(p.Destination_ID).trim()
  return p as PackageDraft
}

/** Same auto-fill rules as the editor, applied to imported rows. */
function prepare(p: PackageDraft, email?: string | null): Record<string, any> {
  const out: Record<string, any> = { ...p }
  const nights = nightsFrom(p)
  if (nights !== undefined) {
    out.Duration_Nights = nights
    if (out.Duration_Days === undefined) out.Duration_Days = nights + 1
    if (!out.Duration) out.Duration = durationLabel(nights)
  }
  if (!out.Price_Range_INR) {
    const label = priceRangeLabel(toNum(p.Price_Min_INR), toNum(p.Price_Max_INR))
    if (label) out.Price_Range_INR = label
  }
  if (!out.Day_Wise_Itinerary && Array.isArray(p.Day_Wise_Itinerary_Details)) {
    out.Day_Wise_Itinerary = p.Day_Wise_Itinerary_Details.map((d: any, i: number) => `Day ${i + 1}: ${d.title || ''}`).join(' | ')
  }
  if (out.Primary_Image_URL && !out.Meta_Image_URL) out.Meta_Image_URL = out.Primary_Image_URL
  out.Last_Updated = new Date().toISOString().split('T')[0]
  out.Created_By = email || 'Bulk Import'
  delete out.id
  return out
}

export default function ImportPackagesModal({
  open,
  onClose,
  existing,
  userEmail,
  onImported,
}: {
  open: boolean
  onClose: () => void
  existing: PackageDraft[]
  userEmail?: string | null
  onImported: () => void
}) {
  const [mode, setMode] = useState<'excel' | 'json'>('excel')
  const [json, setJson] = useState('')
  const [rows, setRows] = useState<PackageDraft[] | null>(null)
  const [parseError, setParseError] = useState('')
  const [fileName, setFileName] = useState('')
  const [skipDupes, setSkipDupes] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null)

  const existingCodes = useMemo(() => new Set(existing.map((p) => String(p.Destination_ID || '').toLowerCase())), [existing])

  const check = useMemo(() => {
    if (!rows) return null
    const invalid: string[] = []
    const dupes: number[] = []
    const valid: number[] = []
    const seen = new Set<string>()
    rows.forEach((p, i) => {
      const code = String(p.Destination_ID || '').toLowerCase()
      if (!code || !p.Destination_Name) {
        invalid.push(`Row ${i + 1}: needs Destination_ID (package code) and Destination_Name (package name)`)
        return
      }
      if (existingCodes.has(code) || seen.has(code)) dupes.push(i)
      seen.add(code)
      valid.push(i)
    })
    return { invalid, dupes, valid }
  }, [rows, existingCodes])

  const toImport = check ? check.valid.filter((i) => !(skipDupes && check.dupes.includes(i))) : []

  const reset = () => {
    setRows(null)
    setParseError('')
    setResult(null)
    setFileName('')
    setProgress(0)
  }

  const close = () => {
    if (busy) return
    reset()
    setJson('')
    onClose()
  }

  const parseJson = (text: string) => {
    setResult(null)
    try {
      const data = JSON.parse(text)
      const arr = Array.isArray(data) ? data : [data]
      if (!arr.length) throw new Error('The list is empty')
      setRows(arr.map((r: any) => cleanRow(r || {})))
      setParseError('')
    } catch (e) {
      setRows(null)
      setParseError(`That isn't valid JSON: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const onFile = async (file?: File | null) => {
    if (!file) return
    reset()
    setFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
      if (!data.length) throw new Error('No rows found in the first sheet')
      setRows(data.map(cleanRow))
    } catch (e) {
      setParseError(`Couldn't read that file: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_ROW]), 'Packages')
    XLSX.writeFile(wb, 'travelzada-packages-template.xlsx')
  }

  const runImport = async () => {
    if (!rows || !toImport.length) return
    setBusy(true)
    setProgress(0)
    const errors: string[] = []
    let ok = 0
    for (let n = 0; n < toImport.length; n++) {
      const p = rows[toImport[n]]
      try {
        await addDoc(collection(db, 'packages'), prepare(p, userEmail))
        ok++
      } catch (e) {
        errors.push(`${p.Destination_ID}: ${e instanceof Error ? e.message : 'failed'}`)
      }
      setProgress(n + 1)
    }
    setBusy(false)
    setResult({ ok, errors })
    if (ok) onImported()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import packages"
      width="max-w-3xl"
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
            <Button onClick={runImport} loading={busy} disabled={!toImport.length}>
              <Upload className="h-4 w-4" />
              {busy ? `Importing ${progress}/${toImport.length}…` : `Import ${toImport.length || ''} package${toImport.length === 1 ? '' : 's'}`}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 py-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="font-semibold text-gray-900">{result.ok} package{result.ok === 1 ? '' : 's'} imported</p>
          {result.errors.length > 0 && (
            <ul className="mx-auto max-w-lg space-y-1 rounded-xl bg-red-50 p-3 text-left text-xs text-red-700">
              {result.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Segmented
            value={mode}
            onChange={(m) => { setMode(m); reset() }}
            options={[{ value: 'excel', label: 'Excel / CSV' }, { value: 'json', label: 'JSON' }]}
          />

          {mode === 'excel' ? (
            <div className="space-y-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-8 text-center hover:border-bordeaux-400 hover:bg-bordeaux-50/30">
                <FileSpreadsheet className="h-7 w-7 text-bordeaux-600" />
                <span className="text-sm font-semibold text-gray-800">{fileName || 'Choose an .xlsx, .xls or .csv file'}</span>
                <span className="text-xs text-gray-500">First sheet is used. One package per row; column names = field names.</span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
              </label>
              <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-xs font-semibold text-bordeaux-700 hover:underline">
                <Download className="h-3.5 w-3.5" /> Download template
              </button>
              <p className="text-xs text-gray-500">Tip: separate highlights with “|”. Nights and prices should be plain numbers — duration and price label are filled in for you.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"><FileJson className="h-4 w-4" /> Paste a JSON array of packages</span>
                <button type="button" onClick={() => { const s = JSON.stringify(SAMPLE_JSON, null, 2); setJson(s); parseJson(s) }} className="text-xs font-semibold text-bordeaux-700 hover:underline">
                  Load example
                </button>
              </div>
              <textarea value={json} onChange={(e) => { setJson(e.target.value); setRows(null); setParseError('') }} onBlur={() => json.trim() && parseJson(json)} rows={12} className={cx(inputClass, 'font-mono text-xs')} placeholder='[ { "Destination_ID": "BAL_101", "Destination_Name": "…", … } ]' />
              <Button size="sm" variant="secondary" onClick={() => parseJson(json)} disabled={!json.trim()}>Check JSON</Button>
            </div>
          )}

          {parseError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{parseError}</p>}

          {check && rows && (
            <div className="space-y-2 rounded-xl border border-gray-200 p-3 text-sm">
              <p className="font-semibold text-gray-900">
                Found {rows.length} row{rows.length === 1 ? '' : 's'} · <span className="text-emerald-700">{toImport.length} ready to import</span>
              </p>
              {check.dupes.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-amber-800">
                  <input type="checkbox" checked={skipDupes} onChange={(e) => setSkipDupes(e.target.checked)} className="accent-bordeaux-600" />
                  Skip {check.dupes.length} package{check.dupes.length === 1 ? '' : 's'} whose code already exists ({check.dupes.slice(0, 5).map((i) => rows[i].Destination_ID).join(', ')}{check.dupes.length > 5 ? '…' : ''})
                </label>
              )}
              {check.invalid.length > 0 && (
                <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-red-700">
                  {check.invalid.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
              <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50">
                {check.valid.slice(0, 50).map((i) => (
                  <div key={i} className={cx('flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-1.5 text-xs last:border-0', skipDupes && check.dupes.includes(i) && 'opacity-40 line-through')}>
                    <span className="truncate font-medium text-gray-800">{rows[i].Destination_Name}</span>
                    <span className="shrink-0 font-mono text-gray-500">{rows[i].Destination_ID}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
