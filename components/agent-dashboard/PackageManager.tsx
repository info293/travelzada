'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, X, Save, Package, Upload, CheckCircle, AlertCircle, Star, MapPin, Clock, Users, Calendar } from 'lucide-react'
import { AgentPackage } from '@/lib/types/agent'

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

const TRAVEL_TYPES = ['Leisure', 'Adventure', 'Honeymoon', 'Family', 'Corporate', 'Pilgrimage', 'Wildlife']
const STAR_CATEGORIES = ['3-Star', '4-Star', '5-Star', 'Luxury', 'Budget', 'Homestay']
const THEMES = ['Beach', 'Wildlife', 'Cultural', 'Hills', 'Desert', 'Adventure', 'Wellness', 'Heritage', 'Backpacking']
const MOODS = ['Relaxing', 'Adventurous', 'Romantic', 'Family Fun', 'Spiritual', 'Exploratory']

interface CsvResult { success: number; failed: number; errors: string[] }

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

  function openNewForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
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
        dayWiseItinerary: form.dayWiseItinerary,
        primaryImageUrl: form.primaryImageUrl,
        seasonalAvailability: form.seasonalAvailability,
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

      {/* Slide-over form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-900">{editingId ? 'Edit Package' : 'New Package'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Package Title *</label>
                  <input name="title" value={form.title} onChange={handleChange} placeholder="Andaman Luxury 5N 6D" className="input" />
                </div>
                <div>
                  <label className="label">Destination *</label>
                  <input name="destination" value={form.destination} onChange={handleChange} placeholder="Andaman Islands" className="input" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input name="destinationCountry" value={form.destinationCountry} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="label">Duration (Days)</label>
                  <input name="durationDays" type="number" value={form.durationDays} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="label">Duration (Nights) *</label>
                  <input name="durationNights" type="number" value={form.durationNights} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="label">Price per Person (₹) *</label>
                  <input name="pricePerPerson" type="number" value={form.pricePerPerson} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="label">Max Group Size</label>
                  <input name="maxGroupSize" type="number" value={form.maxGroupSize} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="label">Travel Type</label>
                  <select name="travelType" value={form.travelType} onChange={handleChange} className="input">
                    {TRAVEL_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Star Category</label>
                  <select name="starCategory" value={form.starCategory} onChange={handleChange} className="input">
                    {STAR_CATEGORIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Theme</label>
                  <select name="theme" value={form.theme} onChange={handleChange} className="input">
                    <option value="">Select theme</option>
                    {THEMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Mood / Vibe</label>
                  <select name="mood" value={form.mood} onChange={handleChange} className="input">
                    <option value="">Select mood</option>
                    {MOODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Seasonal Availability</label>
                  <input name="seasonalAvailability" value={form.seasonalAvailability} onChange={handleChange} placeholder="Oct-Mar" className="input" />
                </div>
                <div className="col-span-2">
                  <label className="label">Primary Image URL</label>
                  <input name="primaryImageUrl" value={form.primaryImageUrl} onChange={handleChange} placeholder="https://..." className="input" />
                </div>
                <div className="col-span-2">
                  <label className="label">Overview / Description</label>
                  <textarea name="overview" value={form.overview} onChange={handleChange} rows={3} placeholder="Describe this package..." className="input resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="label">Highlights (one per line)</label>
                  <textarea name="highlights" value={form.highlights} onChange={handleChange} rows={3} placeholder="Scuba diving at Neil Island&#10;Havelock sunrise cruise" className="input resize-none" />
                </div>
                <div>
                  <label className="label">Inclusions (one per line)</label>
                  <textarea name="inclusions" value={form.inclusions} onChange={handleChange} rows={4} placeholder="Flights&#10;Accommodation&#10;Daily breakfast" className="input resize-none" />
                </div>
                <div>
                  <label className="label">Exclusions (one per line)</label>
                  <textarea name="exclusions" value={form.exclusions} onChange={handleChange} rows={4} placeholder="Personal expenses&#10;Travel insurance" className="input resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="label">Day-Wise Itinerary</label>
                  <textarea name="dayWiseItinerary" value={form.dayWiseItinerary} onChange={handleChange} rows={8} placeholder="Day 1: Arrive in Port Blair...&#10;Day 2: Havelock Island..." className="input resize-none" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="py-2 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => setPreviewPkg(formAsPackage())}
                className="py-2 px-4 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 text-sm font-semibold hover:bg-indigo-100 flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-2 rounded-xl text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Package'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      <style jsx>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.625rem; font-size: 0.875rem; outline: none; }
        .input:focus { ring-width: 2px; ring-color: #7c3aed; border-color: #7c3aed; }
      `}</style>
    </div>
  )
}
