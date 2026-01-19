'use client'

import { useState, useMemo } from 'react'
import { deleteDoc, doc, updateDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Destination } from './types'

interface DestinationsSectionProps {
    destinations: Destination[]
    fetchDestinations: () => Promise<void>
}

type SortField = 'name' | 'country' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export default function DestinationsSection({
    destinations,
    fetchDestinations,
}: DestinationsSectionProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [countryFilter, setCountryFilter] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('name')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
    const [showForm, setShowForm] = useState(false)
    const [editingDestination, setEditingDestination] = useState<Destination | null>(null)
    const [formData, setFormData] = useState<Partial<Destination>>({})
    const [packageIdsInput, setPackageIdsInput] = useState('')

    const countries = useMemo(() => [...new Set(destinations.map(d => d.country))].filter(Boolean).sort(), [destinations])

    const filteredAndSorted = useMemo(() => {
        let result = [...destinations]

        if (countryFilter !== 'all') {
            result = result.filter(d => d.country === countryFilter)
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(d =>
                d.name?.toLowerCase().includes(query) ||
                d.country?.toLowerCase().includes(query) ||
                d.description?.toLowerCase().includes(query)
            )
        }

        result.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break
                case 'country': cmp = (a.country || '').localeCompare(b.country || ''); break
                default: cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            }
            return sortDirection === 'desc' ? -cmp : cmp
        })

        return result
    }, [destinations, countryFilter, searchQuery, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('asc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1">{sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : <span className="text-gray-300">↕</span>}</span>
    )

    const handleEdit = (destination: Destination) => {
        setEditingDestination(destination)
        setFormData(destination)
        setPackageIdsInput(destination.packageIds?.join(', ') || '')
        setShowForm(true)
    }

    const handleNew = () => {
        setEditingDestination(null)
        setFormData({ featured: false })
        setPackageIdsInput('')
        setShowForm(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const now = new Date().toISOString()
            const packageIds = packageIdsInput.split(',').map(id => id.trim()).filter(Boolean)

            const data: any = {
                name: formData.name || '',
                country: formData.country || '',
                region: formData.region || 'International',
                description: formData.description || '',
                image: formData.image || '',
                slug: formData.slug || formData.name?.toLowerCase().replace(/\s+/g, '-') || '',
                featured: formData.featured || false,
                packageIds,
                bestTimeToVisit: formData.bestTimeToVisit || '',
                duration: formData.duration || '',
                currency: formData.currency || '',
                language: formData.language || '',
                rating: formData.rating || null,
                updatedAt: now,
            }

            if (!editingDestination?.id) data.createdAt = now

            if (editingDestination?.id) {
                await updateDoc(doc(db, 'destinations', editingDestination.id), data)
            } else {
                await addDoc(collection(db, 'destinations'), data)
            }

            setShowForm(false)
            setEditingDestination(null)
            setFormData({})
            setPackageIdsInput('')
            fetchDestinations()
        } catch (e) { console.error(e); alert('Error saving destination') }
    }

    const handleDelete = async (destination: Destination) => {
        if (!confirm(`Delete destination ${destination.name}?`)) return
        if (destination.id) {
            try {
                await deleteDoc(doc(db, 'destinations', destination.id))
                fetchDestinations()
                alert('Deleted!')
            } catch (e) { console.error(e); alert('Error deleting') }
        }
    }

    const handleToggleFeatured = async (destination: Destination) => {
        if (destination.id) {
            try {
                await updateDoc(doc(db, 'destinations', destination.id), { featured: !destination.featured })
                fetchDestinations()
            } catch (e) { console.error(e) }
        }
    }

    if (showForm) {
        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">{editingDestination ? 'Edit Destination' : 'Add New Destination'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                            <input type="text" value={formData.country || ''} onChange={(e) => setFormData({ ...formData, country: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                            <select
                                value={formData.region || 'International'}
                                onChange={(e) => setFormData({ ...formData, region: e.target.value as 'India' | 'International' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="International">International</option>
                                <option value="India">India</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                            <input type="text" value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="auto-generated-from-name" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
                            <input type="url" value={formData.image || ''} onChange={(e) => setFormData({ ...formData, image: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Best Time to Visit</label>
                            <input type="text" value={formData.bestTimeToVisit || ''} onChange={(e) => setFormData({ ...formData, bestTimeToVisit: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                            <input type="text" value={formData.duration || ''} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="e.g., 5-7 days" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                            <input type="text" value={formData.currency || ''} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                            <input type="text" value={formData.language || ''} onChange={(e) => setFormData({ ...formData, language: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating (4.0 - 5.0)</label>
                            <input type="number" min="4.0" max="5.0" step="0.1" value={formData.rating || ''} onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || undefined })} placeholder="e.g., 4.8" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                        <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Package IDs (comma-separated)</label>
                        <input type="text" value={packageIdsInput} onChange={(e) => setPackageIdsInput(e.target.value)} placeholder="PKG_001, PKG_002" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="featured" checked={formData.featured || false} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} className="w-4 h-4" />
                        <label htmlFor="featured" className="text-sm text-gray-700">Featured Destination</label>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark">Save</button>
                        <button type="button" onClick={() => { setShowForm(false); setEditingDestination(null); setFormData({}) }} className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Cancel</button>
                    </div>
                </form>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900">Destinations ({filteredAndSorted.length})</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-48" />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Countries</option>
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button onClick={handleNew} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark">+ Add New</button>
                            <button onClick={fetchDestinations} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700">🔄</button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('country')}>Country <SortIcon field="country" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packages</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Featured</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSorted.map((dest) => (
                                <tr key={dest.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <img src={dest.image} alt={dest.name} className="w-16 h-12 object-cover rounded-lg" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{dest.name}</div>
                                        <div className="text-sm text-gray-500">{dest.slug}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{dest.country}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dest.region === 'India' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {dest.region || 'International'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{dest.packageIds?.length || 0}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleToggleFeatured(dest)} className={`px-2 py-1 rounded-full text-xs font-semibold ${dest.featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{dest.featured ? 'Yes' : 'No'}</button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEdit(dest)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold">Edit</button>
                                            <button onClick={() => handleDelete(dest)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSorted.length === 0 && (
                        <div className="text-center py-12 text-gray-500">{destinations.length === 0 ? 'No destinations yet' : 'No destinations match your filters'}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
