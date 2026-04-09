'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, X, Save, Package } from 'lucide-react'
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

export default function PackageManager({ agentId }: Props) {
  const [packages, setPackages] = useState<AgentPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Package Manager</h2>
          <p className="text-sm text-gray-500">{packages.length} package{packages.length !== 1 ? 's' : ''} uploaded</p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Package
        </button>
      </div>

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
                <button onClick={() => openEditForm(pkg)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
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
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
                Cancel
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

      <style jsx>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.625rem; font-size: 0.875rem; outline: none; }
        .input:focus { ring-width: 2px; ring-color: #7c3aed; border-color: #7c3aed; }
      `}</style>
    </div>
  )
}
