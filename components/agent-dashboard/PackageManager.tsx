'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, X, Save, Package, Upload, CheckCircle, AlertCircle, Star, MapPin, Clock, Users, Calendar, Download, Maximize2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { AgentPackage, HotelEntry } from '@/lib/types/agent'

interface Props {
  agentId: string
}

const EMPTY_FORM = {
  title: '',
  destination: '',
  destinationCountry: 'India',
  overview: '',
  durationDays: '',
  durationNights: '',
  pricePerPerson: '',
  maxGroupSize: '20',
  minGroupSize: '1',
  travelType: 'Leisure',
  theme: '',
  mood: '',
  starCategory: '3-Star',
  inclusions: '',
  exclusions: '',
  highlights: '',
  dayWiseItinerary: '',
  primaryImageUrl: '',
  seasonalAvailability: 'Year Round',
}

const MEAL_PLANS = ['Breakfast', 'Half Board', 'Full Board', 'All Inclusive', 'Room Only']
const TRAVEL_TYPES = ['Leisure', 'Adventure', 'Honeymoon', 'Family', 'Corporate', 'Pilgrimage', 'Wildlife']
const STAR_CATEGORIES = ['3-Star', '4-Star', '5-Star', 'Luxury', 'Budget', 'Homestay']
const THEMES = ['Beach', 'Wildlife', 'Cultural', 'Hills', 'Desert', 'Adventure', 'Wellness', 'Heritage', 'Backpacking']
const MOODS = ['Relaxing', 'Adventurous', 'Romantic', 'Family Fun', 'Spiritual', 'Exploratory']

interface CsvResult { success: number; failed: number; errors: string[] }

interface DayItem {
  id: string
  title: string
  description: string
  tags: string[]
}

// Minimal CSV parser — handles quoted fields containing commas/newlines
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []
  const headers = splitCsvRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = splitCsvRow(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim() })
    rows.push(row)
  }
  return rows
}

function splitCsvRow(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

export default function PackageManager({ agentId }: Props) {
  const [packages, setPackages] = useState<AgentPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewPkg, setPreviewPkg] = useState<AgentPackage | null>(null)
  const [showFormPreview, setShowFormPreview] = useState(false)

  // Day-wise itinerary items
  const [dayItems, setDayItems] = useState<DayItem[]>([])
  const [hotelEntries, setHotelEntries] = useState<HotelEntry[]>([])
  const [markupEnabled, setMarkupEnabled] = useState(false)
  const [markupPercent, setMarkupPercent] = useState('15')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)

  // CSV state
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState<CsvResult | null>(null)
  const [showCsvGuide, setShowCsvGuide] = useState(false)

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agent/packages?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) setPackages(data.packages)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchPackages() }, [fetchPackages])

  function parseDayItems(text: string): DayItem[] {
    if (!text?.trim()) return []
    const lines = text.split('\n')
    const items: DayItem[] = []
    let current: DayItem | null = null
    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      if (/^day\s*\d+/i.test(line)) {
        if (current) items.push(current)
        current = { id: crypto.randomUUID(), title: line, description: '', tags: [] }
      } else if (current) {
        current.description += (current.description ? '\n' : '') + line
      }
    }
    if (current) items.push(current)
    return items
  }

  function serializeDayItems(items: DayItem[]): string {
    return items.map(d => [d.title, d.description].filter(Boolean).join('\n')).join('\n\n')
  }

  function addDayItem() {
    const idx = dayItems.length + 1
    setDayItems(prev => [...prev, { id: crypto.randomUUID(), title: `Day ${idx}`, description: '', tags: [] }])
  }

  function updateDayItem(id: string, field: 'title' | 'description', value: string) {
    setDayItems(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  function removeDayItem(id: string) {
    setDayItems(prev => prev.filter(d => d.id !== id))
  }

  function addTagToDayItem(id: string, tag: string) {
    const t = tag.trim()
    if (!t) return
    setDayItems(prev => prev.map(d => d.id === id && !d.tags.includes(t) ? { ...d, tags: [...d.tags, t] } : d))
  }

  function removeTagFromDayItem(id: string, tag: string) {
    setDayItems(prev => prev.map(d => d.id === id ? { ...d, tags: d.tags.filter(t => t !== tag) } : d))
  }

  function addHotelEntry() {
    setHotelEntries(prev => [...prev, { id: crypto.randomUUID(), destination: '', nights: 1, hotels: '', mealPlan: 'Breakfast', roomType: '' }])
  }

  function updateHotelEntry(id: string, field: keyof HotelEntry, value: string | number) {
    setHotelEntries(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h))
  }

  function removeHotelEntry(id: string) {
    setHotelEntries(prev => prev.filter(h => h.id !== id))
  }

  function sharePackageOnWhatsApp() {
    const base = Number(form.pricePerPerson) || 0
    const final = markupEnabled ? base * (1 + Number(markupPercent) / 100) : base
    const lines: string[] = [
      `🌍 *${form.title || 'Travel Package'}*`,
      `📍 ${form.destination}${form.destinationCountry ? ', ' + form.destinationCountry : ''}`,
      `🗓️ ${form.durationDays}D / ${form.durationNights}N  |  ⭐ ${form.starCategory}  |  🎒 ${form.travelType}`,
      `💰 *₹${final.toLocaleString('en-IN')} per person*`,
      '',
    ]
    if (form.overview) lines.push(form.overview, '')
    if (form.highlights) {
      lines.push('✨ *Highlights*')
      form.highlights.split('\n').filter(Boolean).forEach(h => lines.push(`  • ${h}`))
      lines.push('')
    }
    if (hotelEntries.length > 0) {
      lines.push('🏨 *Hotels*')
      hotelEntries.forEach(h => {
        lines.push(`  📍 *${h.destination}${h.nights ? ` (${h.nights}N)` : ''}*`)
        lines.push(`     ${h.hotels.split('\n')[0]}`)
        lines.push(`     ${h.mealPlan} · ${h.roomType.split('\n')[0]}`)
      })
      lines.push('')
    }
    if (dayItems.length > 0) {
      lines.push('📅 *Itinerary*')
      dayItems.forEach(d => {
        lines.push(`  *${d.title}*`)
        if (d.description) lines.push(`  ${d.description.split('\n')[0]}`)
      })
      lines.push('')
    }
    if (form.inclusions) {
      lines.push('✅ *Inclusions*')
      form.inclusions.split('\n').filter(Boolean).slice(0, 5).forEach(i => lines.push(`  ✓ ${i}`))
      lines.push('')
    }
    lines.push('_Contact us to book this package!_')
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  function sharePackageAsPdfWA() {
    setShowPdfPreview(true)
  }

  function openNewForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setDayItems([])
    setHotelEntries([])
    setMarkupEnabled(false)
    setMarkupPercent('15')
    setDetailsOpen(true)
    setError('')
    setShowForm(true)
  }

  function openEditForm(pkg: AgentPackage) {
    setForm({
      title: pkg.title,
      destination: pkg.destination,
      destinationCountry: pkg.destinationCountry || 'India',
      overview: pkg.overview,
      durationDays: String(pkg.durationDays),
      durationNights: String(pkg.durationNights),
      pricePerPerson: String(pkg.pricePerPerson),
      maxGroupSize: String(pkg.maxGroupSize),
      minGroupSize: String(pkg.minGroupSize || 1),
      travelType: pkg.travelType,
      theme: pkg.theme,
      mood: pkg.mood,
      starCategory: pkg.starCategory,
      inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions.join('\n') : pkg.inclusions,
      exclusions: Array.isArray(pkg.exclusions) ? pkg.exclusions.join('\n') : pkg.exclusions,
      highlights: Array.isArray(pkg.highlights) ? pkg.highlights.join('\n') : pkg.highlights,
      dayWiseItinerary: pkg.dayWiseItinerary,
      primaryImageUrl: pkg.primaryImageUrl || '',
      seasonalAvailability: pkg.seasonalAvailability || 'Year Round',
    })
    setDayItems(parseDayItems(pkg.dayWiseItinerary || ''))
    setHotelEntries(Array.isArray(pkg.hotels) ? pkg.hotels : [])
    setMarkupEnabled(false)
    setMarkupPercent('15')
    setDetailsOpen(true)
    setEditingId(pkg.id)
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    setError('')
    if (!form.title || !form.destination || !form.pricePerPerson) {
      setError('Title, destination, and price are required.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        agentId,
        title: form.title,
        destination: form.destination,
        destinationCountry: form.destinationCountry,
        overview: form.overview,
        durationDays: Number(form.durationDays),
        durationNights: Number(form.durationNights),
        pricePerPerson: Number(form.pricePerPerson),
        maxGroupSize: Number(form.maxGroupSize) || 20,
        minGroupSize: Number(form.minGroupSize) || 1,
        travelType: form.travelType,
        theme: form.theme,
        mood: form.mood,
        starCategory: form.starCategory,
        inclusions: form.inclusions.split('\n').filter(Boolean),
        exclusions: form.exclusions.split('\n').filter(Boolean),
        highlights: form.highlights.split('\n').filter(Boolean),
        dayWiseItinerary: dayItems.length > 0 ? serializeDayItems(dayItems) : form.dayWiseItinerary,
        hotels: hotelEntries,
        primaryImageUrl: form.primaryImageUrl,
        seasonalAvailability: form.seasonalAvailability,
        markupPercent: markupEnabled ? Number(markupPercent) : 0,
      }

      let res: Response
      if (editingId) {
        res = await fetch(`/api/agent/packages/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/agent/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setShowForm(false)
      fetchPackages()
    } catch (e: any) {
      setError(e.message || 'Failed to save package.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(pkg: AgentPackage) {
    await fetch(`/api/agent/packages/${pkg.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, isActive: !pkg.isActive }),
    })
    fetchPackages()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this package? This cannot be undone.')) return
    await fetch(`/api/agent/packages/${id}?agentId=${agentId}`, { method: 'DELETE' })
    fetchPackages()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setCsvUploading(true)
    setCsvResult(null)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) { setCsvResult({ success: 0, failed: 0, errors: ['CSV has no data rows.'] }); return }

      let success = 0
      const errors: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const rowNum = i + 2 // +1 for header, +1 for 1-indexed
        const title = r['title'] || r['package_title'] || r['name'] || ''
        const destination = r['destination'] || ''
        const durationDays = parseInt(r['duration_days'] || r['trip_duration_days'] || r['days'] || '0') || 0
        const durationNights = parseInt(r['duration_nights'] || r['trip_duration_nights'] || r['nights'] || String(Math.max(0, durationDays - 1))) || 0
        const price = parseInt(r['price_per_person'] || r['price'] || '0') || 0
        const dayWiseItinerary = r['day_wise_itinerary'] || r['itinerary'] || ''

        if (!title || !destination) {
          errors.push(`Row ${rowNum}: missing title or destination`)
          continue
        }

        try {
          const payload = {
            agentId,
            title,
            destination,
            destinationCountry: r['destination_country'] || r['country'] || 'India',
            overview: r['overview'] || r['description'] || '',
            durationDays,
            durationNights,
            pricePerPerson: price,
            maxGroupSize: parseInt(r['max_group_size'] || '20') || 20,
            minGroupSize: parseInt(r['min_group_size'] || '1') || 1,
            travelType: r['travel_type'] || 'Leisure',
            theme: r['theme'] || '',
            mood: r['mood'] || '',
            starCategory: r['star_category'] || '3-Star',
            inclusions: (r['inclusions'] || '').split('|').map((s: string) => s.trim()).filter(Boolean),
            exclusions: (r['exclusions'] || '').split('|').map((s: string) => s.trim()).filter(Boolean),
            highlights: (r['highlights'] || '').split('|').map((s: string) => s.trim()).filter(Boolean),
            dayWiseItinerary,
            primaryImageUrl: r['primary_image_url'] || r['image_url'] || '',
            seasonalAvailability: r['seasonal_availability'] || 'Year Round',
          }
          const res = await fetch('/api/agent/packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (res.ok) success++
          else {
            const d = await res.json()
            errors.push(`Row ${rowNum}: ${d.error || 'upload failed'}`)
          }
        } catch {
          errors.push(`Row ${rowNum}: network error`)
        }
      }

      setCsvResult({ success, failed: errors.length, errors })
      if (success > 0) fetchPackages()
    } catch (err: any) {
      setCsvResult({ success: 0, failed: 0, errors: [err.message || 'Failed to parse CSV'] })
    } finally {
      setCsvUploading(false)
    }
  }

  function formAsPackage(): AgentPackage {
    return {
      id: editingId || '__preview__',
      agentId,
      title: form.title || 'Untitled Package',
      destination: form.destination,
      destinationCountry: form.destinationCountry,
      overview: form.overview,
      durationDays: Number(form.durationDays) || 0,
      durationNights: Number(form.durationNights) || 0,
      pricePerPerson: Number(form.pricePerPerson) || 0,
      maxGroupSize: Number(form.maxGroupSize) || 20,
      minGroupSize: Number(form.minGroupSize) || 1,
      travelType: form.travelType,
      theme: form.theme,
      mood: form.mood,
      starCategory: form.starCategory,
      inclusions: form.inclusions.split('\n').filter(Boolean),
      exclusions: form.exclusions.split('\n').filter(Boolean),
      highlights: form.highlights.split('\n').filter(Boolean),
      dayWiseItinerary: form.dayWiseItinerary,
      primaryImageUrl: form.primaryImageUrl,
      seasonalAvailability: form.seasonalAvailability,
      isActive: true,
    } as AgentPackage
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Package Manager</h2>
          <p className="text-sm text-gray-500">{packages.length} package{packages.length !== 1 ? 's' : ''} uploaded</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <button
            onClick={() => setShowCsvGuide(v => !v)}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload CSV
          </button>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Package
          </button>
        </div>
      </div>

      {/* CSV Guide & Upload */}
      {showCsvGuide && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-blue-900 text-sm">Bulk Upload via CSV</h3>
              <p className="text-xs text-blue-700 mt-1">
                Upload a <code>.csv</code> file to add multiple packages at once. Required columns: <strong>title</strong>, <strong>destination</strong>.
                For multiple inclusions/exclusions/highlights, separate values with a pipe <code>|</code>.
              </p>
            </div>
            <button onClick={() => setShowCsvGuide(false)} className="text-blue-400 hover:text-blue-700 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white border border-blue-200 rounded-xl p-3 overflow-x-auto">
            <p className="text-[11px] font-bold text-gray-500 mb-1.5">Column Reference</p>
            <table className="text-xs text-gray-700 w-full">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="pr-4 pb-1 font-semibold">Column</th>
                  <th className="pr-4 pb-1 font-semibold">Required</th>
                  <th className="pb-1 font-semibold">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['title', 'Yes', 'Andaman 5N 6D'],
                  ['destination', 'Yes', 'Andaman Islands'],
                  ['destination_country', 'No', 'India'],
                  ['duration_days', 'No', '6'],
                  ['duration_nights', 'No', '5'],
                  ['price_per_person', 'No', '25000'],
                  ['travel_type', 'No', 'Leisure'],
                  ['star_category', 'No', '4-Star'],
                  ['theme', 'No', 'Beach'],
                  ['overview', 'No', 'A beautiful island trip…'],
                  ['highlights', 'No', 'Scuba diving|Sunset cruise'],
                  ['inclusions', 'No', 'Flights|Accommodation'],
                  ['exclusions', 'No', 'Travel insurance'],
                  ['day_wise_itinerary', 'No', 'Day 1: Arrive…\\nDay 2: Havelock…'],
                  ['primary_image_url', 'No', 'https://…'],
                  ['seasonal_availability', 'No', 'Oct-Mar'],
                ].map(([col, req, ex]) => (
                  <tr key={col}>
                    <td className="pr-4 py-0.5 font-mono text-blue-700">{col}</td>
                    <td className={`pr-4 py-0.5 font-semibold ${req === 'Yes' ? 'text-red-600' : 'text-gray-400'}`}>{req}</td>
                    <td className="py-0.5 text-gray-500">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={csvUploading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-xl text-sm"
          >
            {csvUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Choose CSV File</>}
          </button>
        </div>
      )}

      {/* CSV upload result */}
      {csvResult && (
        <div className={`rounded-2xl border p-4 ${csvResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {csvResult.failed === 0
              ? <CheckCircle className="w-4 h-4 text-green-600" />
              : <AlertCircle className="w-4 h-4 text-amber-600" />}
            <span className="font-bold text-sm text-gray-900">
              {csvResult.success} package{csvResult.success !== 1 ? 's' : ''} imported
              {csvResult.failed > 0 ? `, ${csvResult.failed} failed` : ' successfully'}
            </span>
            <button onClick={() => setCsvResult(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          {csvResult.errors.length > 0 && (
            <ul className="text-xs text-amber-800 space-y-0.5 ml-6 list-disc">
              {csvResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Package list */}
      {packages.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No packages yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first travel package to get started.</p>
          <button onClick={openNewForm} className="mt-4 text-purple-600 text-sm font-semibold hover:underline">
            + Add your first package
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
          {packages.map(pkg => (
            <div key={pkg.id} className="flex items-center gap-4 p-4 bg-white hover:bg-gray-50">
              {pkg.primaryImageUrl ? (
                <img
                  src={pkg.primaryImageUrl}
                  alt={pkg.title}
                  className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-12 bg-purple-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{pkg.title}</p>
                <p className="text-sm text-gray-500">
                  {pkg.destination} · {pkg.durationNights}N · {pkg.starCategory} · ₹{pkg.pricePerPerson.toLocaleString()}/person
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {pkg.isActive ? 'Active' : 'Paused'}
                </span>
                <button onClick={() => toggleActive(pkg)} title={pkg.isActive ? 'Pause' : 'Activate'} className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50">
                  {pkg.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => setPreviewPkg(pkg)} title="Preview" className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => openEditForm(pkg)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(pkg.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-panel package editor */}
      {showForm && (() => {
        const basePrice = Number(form.pricePerPerson) || 0
        const markup = markupEnabled ? (Number(markupPercent) || 0) : 0
        const finalPrice = basePrice * (1 + markup / 100)
        return (
        <div className="fixed left-0 md:left-60 right-0 top-0 bottom-0 z-50 flex flex-col bg-[#f4f5f9]">

          {/* Main: two columns */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: editor */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-w-0">

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              {/* Package Identity */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">Package Identity</p>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Swiss Alps Luxury Getaway"
                  className="w-full text-2xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-300 mb-4"
                />
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    {form.durationDays || '?'} Days / {form.durationNights || '?'} Nights
                  </span>
                  <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    {form.starCategory}
                  </span>
                  <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    {form.seasonalAvailability || 'Year Round'}
                  </span>
                  {form.travelType && (
                    <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      {form.travelType}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setDetailsOpen(v => !v)}
                  className="mt-4 flex items-center gap-1.5 text-xs text-blue-500 font-semibold hover:text-blue-700"
                >
                  {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {detailsOpen ? 'Hide details' : 'Edit all details'}
                </button>
                {detailsOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Destination *</label>
                      <input name="destination" value={form.destination} onChange={handleChange} placeholder="Andaman Islands" className="input" />
                    </div>
                    <div>
                      <label className="label">Country</label>
                      <input name="destinationCountry" value={form.destinationCountry} onChange={handleChange} className="input" />
                    </div>
                    <div>
                      <label className="label">Days</label>
                      <input name="durationDays" type="number" min="1" value={form.durationDays} onChange={handleChange} className="input" />
                    </div>
                    <div>
                      <label className="label">Nights</label>
                      <input name="durationNights" type="number" min="0" value={form.durationNights} onChange={handleChange} className="input" />
                    </div>
                    <div>
                      <label className="label">Min Group</label>
                      <input name="minGroupSize" type="number" min="1" value={form.minGroupSize} onChange={handleChange} className="input" />
                    </div>
                    <div>
                      <label className="label">Max Group</label>
                      <input name="maxGroupSize" type="number" min="1" value={form.maxGroupSize} onChange={handleChange} className="input" />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Seasonal Availability</label>
                      <input name="seasonalAvailability" value={form.seasonalAvailability} onChange={handleChange} placeholder="Oct–Mar / Year Round" className="input" />
                    </div>
                    <div className="col-span-2">
                      <label className="label mb-2">Travel Type</label>
                      <div className="flex flex-wrap gap-2">
                        {TRAVEL_TYPES.map(t => (
                          <button key={t} type="button" onClick={() => setForm(p => ({ ...p, travelType: t }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.travelType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                          >{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="label mb-2">Star Category</label>
                      <div className="flex flex-wrap gap-2">
                        {STAR_CATEGORIES.map(s => (
                          <button key={s} type="button" onClick={() => setForm(p => ({ ...p, starCategory: s }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.starCategory === s ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200'}`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="label mb-2">Theme</label>
                      <div className="flex flex-wrap gap-2">
                        {THEMES.map(t => (
                          <button key={t} type="button" onClick={() => setForm(p => ({ ...p, theme: form.theme === t ? '' : t }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.theme === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                          >{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="label mb-2">Mood / Vibe</label>
                      <div className="flex flex-wrap gap-2">
                        {MOODS.map(m => (
                          <button key={m} type="button" onClick={() => setForm(p => ({ ...p, mood: form.mood === m ? '' : m }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.mood === m ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-600 border-gray-200'}`}
                          >{m}</button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Cover Image URL</label>
                      <input name="primaryImageUrl" value={form.primaryImageUrl} onChange={handleChange} placeholder="https://..." className="input" />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Overview / Description</label>
                      <textarea name="overview" value={form.overview} onChange={handleChange} rows={3} placeholder="Describe this package…" className="input resize-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Highlights (one per line)</label>
                      <textarea name="highlights" value={form.highlights} onChange={handleChange} rows={3} className="input resize-none text-sm" />
                    </div>
                    <div>
                      <label className="label text-green-700">✓ Inclusions (one per line)</label>
                      <textarea name="inclusions" value={form.inclusions} onChange={handleChange} rows={4} className="input resize-none text-sm" />
                    </div>
                    <div>
                      <label className="label text-red-600">✗ Exclusions (one per line)</label>
                      <textarea name="exclusions" value={form.exclusions} onChange={handleChange} rows={4} className="input resize-none text-sm" />
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing Configuration */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-base">💰</div>
                  <h3 className="font-bold text-gray-900 text-sm">Pricing Configuration</h3>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Cost (per person)</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-gray-400 font-semibold text-lg">₹</span>
                        <input
                          name="pricePerPerson"
                          type="number"
                          value={form.pricePerPerson}
                          onChange={handleChange}
                          className="text-3xl font-bold text-gray-900 border-none outline-none w-40 bg-transparent"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700">Agency Markup</p>
                        <p className="text-[10px] text-gray-400">Apply {markupPercent}% standard profit</p>
                      </div>
                      <input
                        type="number"
                        value={markupPercent}
                        onChange={e => setMarkupPercent(e.target.value)}
                        className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 bg-white"
                      />
                      <span className="text-xs text-gray-400 font-semibold">%</span>
                      <button
                        type="button"
                        onClick={() => setMarkupEnabled(v => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${markupEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${markupEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-purple-600 text-white rounded-2xl p-4 min-w-[160px] flex-shrink-0 text-center shadow-lg shadow-purple-200">
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-2">Final Quotation Price</p>
                    <p className="text-2xl font-bold leading-tight">
                      ₹{finalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] opacity-60 mt-1.5">
                      {markupEnabled ? `Includes ${markup}% markup` : 'No markup applied'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hotels & Accommodation */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-base">🏨</div>
                    <h3 className="font-bold text-gray-900 text-sm">Hotels & Accommodation</h3>
                  </div>
                  <button onClick={addHotelEntry} className="flex items-center gap-1.5 text-xs text-blue-500 font-bold hover:text-blue-700">
                    <Plus className="w-3.5 h-3.5" /> Add Hotel
                  </button>
                </div>

                {hotelEntries.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-sm text-gray-400">No hotels added yet</p>
                    <button onClick={addHotelEntry} className="mt-2 text-xs text-blue-500 font-semibold hover:text-blue-700">+ Add first hotel</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 pr-3">Destination</th>
                          <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 pr-3 w-12">Nights</th>
                          <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 pr-3">Hotel(s)</th>
                          <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 pr-3 w-32">Meal Plan</th>
                          <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 pr-3">Room Type</th>
                          <th className="pb-2 w-6" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {hotelEntries.map(h => (
                          <tr key={h.id} className="group">
                            <td className="py-2 pr-3">
                              <input
                                value={h.destination}
                                onChange={e => updateHotelEntry(h.id, 'destination', e.target.value)}
                                placeholder="Kuta"
                                className="w-full text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min="1"
                                value={h.nights}
                                onChange={e => updateHotelEntry(h.id, 'nights', Number(e.target.value))}
                                className="w-full text-sm text-center text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <textarea
                                value={h.hotels}
                                onChange={e => updateHotelEntry(h.id, 'hotels', e.target.value)}
                                placeholder={'Fairfield by Marriott\nOr: The Sakala Resort'}
                                rows={2}
                                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 resize-none"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <select
                                value={h.mealPlan}
                                onChange={e => updateHotelEntry(h.id, 'mealPlan', e.target.value)}
                                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400"
                              >
                                {MEAL_PLANS.map(m => <option key={m}>{m}</option>)}
                              </select>
                            </td>
                            <td className="py-2 pr-3">
                              <textarea
                                value={h.roomType}
                                onChange={e => updateHotelEntry(h.id, 'roomType', e.target.value)}
                                placeholder={'Room with King Bed\nOr: Deluxe Suite'}
                                rows={2}
                                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 resize-none"
                              />
                            </td>
                            <td className="py-2">
                              <button onClick={() => removeHotelEntry(h.id)} className="p-1 text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Master Itinerary */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Master Itinerary</h3>
                  </div>
                  <button onClick={addDayItem} className="flex items-center gap-1.5 text-xs text-blue-500 font-bold hover:text-blue-700">
                    <Plus className="w-3.5 h-3.5" /> Add New Day
                  </button>
                </div>
                {dayItems.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-sm text-gray-400">No days added yet</p>
                    <button onClick={addDayItem} className="mt-2 text-xs text-blue-500 font-semibold hover:text-blue-700">+ Add Day 1</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayItems.map((day, idx) => (
                      <DayCard
                        key={day.id}
                        day={day}
                        idx={idx}
                        onTitleChange={v => updateDayItem(day.id, 'title', v)}
                        onDescChange={v => updateDayItem(day.id, 'description', v)}
                        onAddTag={tag => addTagToDayItem(day.id, tag)}
                        onRemoveTag={tag => removeTagFromDayItem(day.id, tag)}
                        onRemove={() => removeDayItem(day.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: live preview */}
            <div className="w-80 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700">Live Preview</span>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => setPreviewPkg(formAsPackage())}>
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4">
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                  <div className="relative h-44">
                    {form.primaryImageUrl ? (
                      <img src={form.primaryImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-200 to-indigo-300 flex items-center justify-center">
                        <Package className="w-14 h-14 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white text-[10px] font-bold px-2.5 py-1 rounded-full text-gray-800 shadow">Travelzada</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-0.5">Personalized Itinerary</p>
                      <p className="text-white font-bold text-base leading-snug line-clamp-2">{form.title || 'Your Package Title'}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold text-gray-900 mb-3">Trip Overview</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { emoji: '🏨', label: 'Stay', val: form.starCategory || '–' },
                        { emoji: '✈️', label: 'Type', val: form.travelType || '–' },
                        { emoji: '🌙', label: 'Nights', val: form.durationNights || '–' },
                      ].map(({ emoji, label, val }) => (
                        <div key={label} className="text-center">
                          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-1 text-base">{emoji}</div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{label}</p>
                          <p className="text-[10px] font-bold text-gray-700">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mx-4 mb-4 bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-purple-400 font-semibold uppercase">Starting from</p>
                    <p className="text-xl font-bold text-purple-700">
                      ₹{finalPrice > 0 ? finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '–'}
                    </p>
                    <p className="text-[10px] text-purple-400">per person</p>
                  </div>
                  {dayItems.length > 0 && (
                    <div className="px-4 pb-3">
                      <p className="text-xs font-bold text-gray-700 mb-2">Itinerary ({dayItems.length} days)</p>
                      <div className="space-y-2">
                        {dayItems.slice(0, 3).map((d, i) => (
                          <div key={d.id} className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-purple-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div>
                              <p className="text-[10px] font-bold text-gray-800 leading-tight">{d.title}</p>
                              {d.description && <p className="text-[10px] text-gray-400 leading-snug line-clamp-2 mt-0.5">{d.description}</p>}
                            </div>
                          </div>
                        ))}
                        {dayItems.length > 3 && <p className="text-[10px] text-gray-400 pl-7">+{dayItems.length - 3} more days…</p>}
                      </div>
                    </div>
                  )}
                  {hotelEntries.length > 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-xs font-bold text-gray-700 mb-2">🏨 Hotels ({hotelEntries.length})</p>
                      <div className="space-y-1.5">
                        {hotelEntries.map(h => (
                          <div key={h.id} className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] font-bold text-amber-700">{h.destination}{h.nights ? ` (${h.nights}N)` : ''}</span>
                              <span className="text-[9px] bg-amber-200 text-amber-800 font-semibold px-1.5 py-0.5 rounded-full">{h.mealPlan}</span>
                            </div>
                            {h.hotels && <p className="text-[10px] text-gray-600 leading-snug">{h.hotels.split('\n')[0]}</p>}
                            {h.roomType && <p className="text-[10px] text-gray-400">{h.roomType.split('\n')[0]}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-100 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
              <button
                onClick={() => setPreviewPkg(formAsPackage())}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={sharePackageOnWhatsApp}
                className="flex items-center gap-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-green-200"
                title="Send full package details as formatted text"
              >
                <span>📱</span> WA Text
              </button>
              <button
                onClick={sharePackageAsPdfWA}
                className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 px-4 py-2.5 rounded-xl transition-colors"
                title="Generate PDF then share on WhatsApp"
              >
                <span>📄</span> WA PDF
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? 'Update Package' : 'Publish Package'}
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ── Package Preview Modal ─────────────────────────────────────────── */}
      {previewPkg && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-gray-900 text-sm">Package Preview</span>
                {previewPkg.id === '__preview__' && (
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Unsaved Draft</span>
                )}
              </div>
              <button onClick={() => setPreviewPkg(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hero image */}
            {previewPkg.primaryImageUrl ? (
              <div className="relative h-56 w-full overflow-hidden">
                <img src={previewPkg.primaryImageUrl} alt={previewPkg.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <h2 className="text-2xl font-bold text-white drop-shadow">{previewPkg.title}</h2>
                  <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />{previewPkg.destination}{previewPkg.destinationCountry ? `, ${previewPkg.destinationCountry}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-40 bg-gradient-to-br from-purple-100 to-indigo-100 flex flex-col items-center justify-center">
                <Package className="w-10 h-10 text-purple-300 mb-2" />
                <h2 className="text-xl font-bold text-gray-800">{previewPkg.title}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />{previewPkg.destination}
                </p>
              </div>
            )}

            {/* Key stats row */}
            <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
              {[
                { icon: <Clock className="w-4 h-4" />, label: 'Duration', value: previewPkg.durationNights ? `${previewPkg.durationNights}N / ${previewPkg.durationDays}D` : `${previewPkg.durationDays}D` },
                { icon: <Star className="w-4 h-4" />, label: 'Category', value: previewPkg.starCategory },
                { icon: <Users className="w-4 h-4" />, label: 'Group Size', value: `${previewPkg.minGroupSize || 1}–${previewPkg.maxGroupSize || 20}` },
                { icon: <Calendar className="w-4 h-4" />, label: 'Season', value: previewPkg.seasonalAvailability || 'Year Round' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="px-4 py-3 text-center">
                  <div className="flex justify-center text-gray-400 mb-1">{icon}</div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            <div className="p-6 space-y-5">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {previewPkg.travelType && <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">{previewPkg.travelType}</span>}
                {previewPkg.theme && <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">{previewPkg.theme}</span>}
                {previewPkg.mood && <span className="bg-pink-100 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full">{previewPkg.mood}</span>}
              </div>

              {/* Price */}
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-500 font-medium">Starting from</p>
                  <p className="text-3xl font-bold text-purple-700">₹{(previewPkg.pricePerPerson || 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-purple-500">per person</p>
                </div>
                <div className="bg-purple-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl opacity-60 cursor-default">
                  Request Quote
                </div>
              </div>

              {/* Overview */}
              {previewPkg.overview && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1.5">Overview</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{previewPkg.overview}</p>
                </div>
              )}

              {/* Highlights */}
              {Array.isArray(previewPkg.highlights) && previewPkg.highlights.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Highlights</h4>
                  <ul className="space-y-1.5">
                    {previewPkg.highlights.map((h: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-purple-500 mt-0.5">✦</span>{h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inclusions / Exclusions */}
              {(Array.isArray(previewPkg.inclusions) && previewPkg.inclusions.length > 0 ||
                Array.isArray(previewPkg.exclusions) && previewPkg.exclusions.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {Array.isArray(previewPkg.inclusions) && previewPkg.inclusions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-green-700 mb-2">✓ Inclusions</h4>
                      <ul className="space-y-1">
                        {previewPkg.inclusions.map((inc: string, i: number) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="text-green-500 mt-0.5">•</span>{inc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(previewPkg.exclusions) && previewPkg.exclusions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-red-600 mb-2">✗ Exclusions</h4>
                      <ul className="space-y-1">
                        {previewPkg.exclusions.map((exc: string, i: number) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">•</span>{exc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Day-wise itinerary */}
              {previewPkg.dayWiseItinerary && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Day-Wise Itinerary</h4>
                  <div className="space-y-2">
                    {previewPkg.dayWiseItinerary.split('\n').filter(Boolean).map((line: string, i: number) => (
                      <div key={i} className={`text-sm ${line.toLowerCase().startsWith('day') ? 'font-semibold text-gray-900 mt-3 first:mt-0' : 'text-gray-600 pl-4'}`}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer note */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-xs text-gray-400">
                {previewPkg.id === '__preview__'
                  ? 'This is a draft preview — changes are not saved yet.'
                  : 'This is exactly how customers see this package on your planner page.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && (() => {
        const base = Number(form.pricePerPerson) || 0
        const final = markupEnabled ? base * (1 + Number(markupPercent) / 100) : base
        return (
          <div className="fixed inset-0 z-[70] bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4 print:p-0 print:bg-white print:block">
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl print:shadow-none print:rounded-none print:max-w-full">
              {/* Modal controls — hidden on print */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
                <div>
                  <h3 className="font-bold text-gray-900">Package PDF Preview</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Print or save as PDF, then share via WhatsApp</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.print()
                      setTimeout(() => {
                        const base2 = Number(form.pricePerPerson) || 0
                        const final2 = markupEnabled ? base2 * (1 + Number(markupPercent) / 100) : base2
                        const msg = `📄 *${form.title || 'Travel Package'}* — Detailed itinerary PDF\n📍 ${form.destination} · ${form.durationDays}D/${form.durationNights}N · ₹${final2.toLocaleString('en-IN')}/person\n\nPlease find the attached PDF with complete itinerary, hotels, and pricing details.\n\n_Contact us to book!_`
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                      }, 500)
                    }}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl"
                  >
                    📱 Print & Share on WhatsApp
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50">
                    🖨️ Print / Save PDF
                  </button>
                  <button onClick={() => setShowPdfPreview(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* PDF Content */}
              <div className="p-8 space-y-6 print:p-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-200 pb-5">
                  <div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Travel Package</p>
                    <h1 className="text-2xl font-bold text-gray-900">{form.title || 'Untitled Package'}</h1>
                    <p className="text-gray-500 text-sm mt-1">
                      📍 {form.destination}{form.destinationCountry ? `, ${form.destinationCountry}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Price per Person</p>
                    <p className="text-3xl font-bold text-purple-600">₹{final.toLocaleString('en-IN')}</p>
                    {markupEnabled && <p className="text-xs text-gray-400">Includes {markupPercent}% markup</p>}
                  </div>
                </div>

                {/* Meta pills */}
                <div className="flex flex-wrap gap-2">
                  {[
                    `🗓️ ${form.durationDays}D / ${form.durationNights}N`,
                    `⭐ ${form.starCategory}`,
                    `🎒 ${form.travelType}`,
                    form.theme && `🌿 ${form.theme}`,
                    form.mood && `✨ ${form.mood}`,
                    form.seasonalAvailability && `📅 ${form.seasonalAvailability}`,
                  ].filter(Boolean).map((tag, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">{tag as string}</span>
                  ))}
                </div>

                {/* Overview */}
                {form.overview && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1.5">Overview</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{form.overview}</p>
                  </div>
                )}

                {/* Hotels table */}
                {hotelEntries.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">🏨 Hotels & Accommodation</h3>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-amber-50 border border-amber-100">
                          <th className="text-left text-xs font-bold text-gray-700 px-3 py-2 border border-amber-100">Destination</th>
                          <th className="text-left text-xs font-bold text-gray-700 px-3 py-2 border border-amber-100">Hotel(s)</th>
                          <th className="text-left text-xs font-bold text-gray-700 px-3 py-2 border border-amber-100">Meal Plan</th>
                          <th className="text-left text-xs font-bold text-gray-700 px-3 py-2 border border-amber-100">Room Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hotelEntries.map((h, i) => (
                          <tr key={h.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 border border-gray-100 font-semibold text-gray-800 whitespace-nowrap">
                              {h.destination}{h.nights ? ` (${h.nights}N)` : ''}
                            </td>
                            <td className="px-3 py-2 border border-gray-100 text-gray-700">{h.hotels}</td>
                            <td className="px-3 py-2 border border-gray-100 text-gray-600 whitespace-nowrap">{h.mealPlan}</td>
                            <td className="px-3 py-2 border border-gray-100 text-gray-600">{h.roomType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Inclusions / Exclusions */}
                {(form.inclusions || form.exclusions) && (
                  <div className="grid grid-cols-2 gap-4">
                    {form.inclusions && (
                      <div>
                        <h3 className="text-sm font-bold text-green-700 mb-1.5">✓ Inclusions</h3>
                        <ul className="space-y-1">
                          {form.inclusions.split('\n').filter(Boolean).map((inc, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                              <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>{inc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {form.exclusions && (
                      <div>
                        <h3 className="text-sm font-bold text-red-600 mb-1.5">✗ Exclusions</h3>
                        <ul className="space-y-1">
                          {form.exclusions.split('\n').filter(Boolean).map((exc, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                              <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>{exc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Highlights */}
                {form.highlights && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1.5">✨ Highlights</h3>
                    <ul className="space-y-1">
                      {form.highlights.split('\n').filter(Boolean).map((h, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                          <span className="text-purple-500 mt-0.5 flex-shrink-0">✦</span>{h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Day-wise itinerary */}
                {dayItems.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">📅 Day-Wise Itinerary</h3>
                    <div className="space-y-3">
                      {dayItems.map((d, i) => (
                        <div key={d.id} className="flex gap-3">
                          <span className="w-7 h-7 bg-purple-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{d.title}</p>
                            {d.description && <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{d.description}</p>}
                            {d.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {d.tags.map(t => (
                                  <span key={t} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-200 pt-4 text-center">
                  <p className="text-xs text-gray-400">Powered by Travelzada · This is a preliminary quotation subject to availability</p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <style jsx>{`
        .label { display: block; font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; font-size: 0.875rem; outline: none; background: #fff; transition: border-color 0.15s; }
        .input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
      `}</style>
    </div>
  )
}

interface DayCardProps {
  day: { id: string; title: string; description: string; tags: string[] }
  idx: number
  onTitleChange: (v: string) => void
  onDescChange: (v: string) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onRemove: () => void
}

function DayCard({ day, idx, onTitleChange, onDescChange, onAddTag, onRemoveTag, onRemove }: DayCardProps) {
  const [tagInput, setTagInput] = useState('')

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      onAddTag(tagInput)
      setTagInput('')
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {String(idx + 1).padStart(2, '0')}
        </span>
        <input
          value={day.title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder={`Day ${idx + 1}: Title`}
          className="flex-1 text-sm font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-300"
        />
        <button onClick={onRemove} className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-2">
        <textarea
          value={day.description}
          onChange={e => onDescChange(e.target.value)}
          rows={2}
          placeholder="Describe activities for this day…"
          className="w-full text-sm text-gray-600 bg-transparent border-none outline-none resize-none placeholder:text-gray-300"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {day.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="text-gray-300 hover:text-red-400 ml-0.5">×</button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            placeholder="+ tag, Enter"
            className="text-[10px] text-gray-400 bg-transparent border-none outline-none w-20 placeholder:text-gray-300"
          />
        </div>
      </div>
    </div>
  )
}
