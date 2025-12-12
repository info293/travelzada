'use client'

import { useState, useMemo } from 'react'
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Testimonial } from './types'

interface TestimonialsSectionProps {
    testimonials: Testimonial[]
    fetchTestimonials: () => Promise<void>
}

type SortField = 'name' | 'createdAt' | 'rating'
type SortDirection = 'asc' | 'desc'

export default function TestimonialsSection({
    testimonials,
    fetchTestimonials,
}: TestimonialsSectionProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [ratingFilter, setRatingFilter] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [showForm, setShowForm] = useState(false)
    const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
    const [formData, setFormData] = useState<Partial<Testimonial>>({})

    const filteredAndSorted = useMemo(() => {
        let result = [...testimonials]

        if (ratingFilter !== 'all') {
            result = result.filter(t => t.rating === Number(ratingFilter))
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(t => t.name.toLowerCase().includes(query) || t.quote.toLowerCase().includes(query))
        }

        result.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case 'name': cmp = a.name.localeCompare(b.name); break
                case 'rating': cmp = a.rating - b.rating; break
                default: cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            }
            return sortDirection === 'desc' ? -cmp : cmp
        })

        return result
    }, [testimonials, searchQuery, ratingFilter, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('desc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1">{sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : <span className="text-gray-300">↕</span>}</span>
    )

    const handleEdit = (testimonial: Testimonial) => {
        setEditingTestimonial(testimonial)
        setFormData(testimonial)
        setShowForm(true)
    }

    const handleNew = () => {
        setEditingTestimonial(null)
        setFormData({ rating: 5, featured: false })
        setShowForm(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const now = new Date().toISOString()
            const data: any = {
                name: formData.name || '',
                rating: formData.rating || 5,
                quote: formData.quote || '',
                featured: formData.featured || false,
                updatedAt: now,
            }
            if (!editingTestimonial?.id) data.createdAt = now

            if (editingTestimonial?.id) {
                await updateDoc(doc(db, 'testimonials', editingTestimonial.id), data)
            } else {
                await addDoc(collection(db, 'testimonials'), data)
            }

            setShowForm(false)
            setEditingTestimonial(null)
            setFormData({})
            fetchTestimonials()
        } catch (e) { console.error(e); alert('Error saving testimonial') }
    }

    const handleDelete = async (testimonial: Testimonial) => {
        if (!confirm(`Delete testimonial from ${testimonial.name}?`)) return
        if (testimonial.id) {
            try {
                await deleteDoc(doc(db, 'testimonials', testimonial.id))
                fetchTestimonials()
                alert('Deleted!')
            } catch (e) { console.error(e); alert('Error deleting') }
        }
    }

    const handleToggleFeatured = async (testimonial: Testimonial) => {
        if (testimonial.id) {
            try {
                await updateDoc(doc(db, 'testimonials', testimonial.id), { featured: !testimonial.featured })
                fetchTestimonials()
            } catch (e) { console.error(e) }
        }
    }

    return (
        <div className="space-y-6">
            {showForm ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">{editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating *</label>
                            <select value={formData.rating || 5} onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quote *</label>
                            <textarea value={formData.quote || ''} onChange={(e) => setFormData({ ...formData, quote: e.target.value })} required rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="featured" checked={formData.featured || false} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} className="w-4 h-4" />
                            <label htmlFor="featured" className="text-sm text-gray-700">Featured</label>
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors">Save</button>
                            <button type="button" onClick={() => { setShowForm(false); setEditingTestimonial(null); setFormData({}) }} className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <h2 className="text-xl font-bold text-gray-900">Testimonials ({filteredAndSorted.length})</h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative">
                                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-48" />
                                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                                <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                    <option value="all">All Ratings</option>
                                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                                </select>
                                <button onClick={handleNew} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors">+ Add New</button>
                                <button onClick={fetchTestimonials} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">🔄 Refresh</button>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('rating')}>Rating <SortIcon field="rating" /></th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Featured</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>Date <SortIcon field="createdAt" /></th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredAndSorted.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className={`text-lg ${i < t.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={t.quote}>{t.quote}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleToggleFeatured(t)} className={`px-2 py-1 rounded-full text-xs font-semibold ${t.featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{t.featured ? 'Yes' : 'No'}</button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEdit(t)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold">Edit</button>
                                                <button onClick={() => handleDelete(t)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredAndSorted.length === 0 && (
                            <div className="text-center py-12 text-gray-500">{testimonials.length === 0 ? 'No testimonials yet' : 'No testimonials match your filters'}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
