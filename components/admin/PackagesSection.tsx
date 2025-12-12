'use client'

import { useState, useMemo } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { DestinationPackage } from './types'
import PackageForm from './PackageForm'

interface PackagesSectionProps {
    packages: DestinationPackage[]
    fetchPackages: () => Promise<void>
    showForm: boolean
    setShowForm: (show: boolean) => void
    showBulkImport: boolean
    setShowBulkImport: (show: boolean) => void
    editingPackage: DestinationPackage | null
    setEditingPackage: (pkg: DestinationPackage | null) => void
    formData: Partial<DestinationPackage>
    setFormData: (updater: (prev: Partial<DestinationPackage>) => Partial<DestinationPackage>) => void
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    handlePackageSubmit: (e: React.FormEvent) => Promise<void>
    handleNewPackage: () => void
    handleEditPackage: (pkg: DestinationPackage) => void
    // Bulk import props
    bulkImportJson: string
    setBulkImportJson: (json: string) => void
    bulkImportStatus: { loading: boolean; success: number; errors: string[]; processing: boolean }
    handleBulkImport: () => Promise<void>
    loadSampleJson: () => void
}

type SortField = 'Destination_Name' | 'Duration' | 'Price_Min_INR' | 'Travel_Type' | 'Last_Updated'
type SortDirection = 'asc' | 'desc'

export default function PackagesSection({
    packages,
    fetchPackages,
    showForm,
    setShowForm,
    showBulkImport,
    setShowBulkImport,
    editingPackage,
    setEditingPackage,
    formData,
    setFormData,
    handleInputChange,
    handlePackageSubmit,
    handleNewPackage,
    handleEditPackage,
    bulkImportJson,
    setBulkImportJson,
    bulkImportStatus,
    handleBulkImport,
    loadSampleJson,
}: PackagesSectionProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [destinationFilter, setDestinationFilter] = useState<string>('all')
    const [travelTypeFilter, setTravelTypeFilter] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('Last_Updated')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    // Get unique values for filters
    const destinations = useMemo(() => [...new Set(packages.map(p => p.Destination_Name))].sort(), [packages])
    const travelTypes = useMemo(() => [...new Set(packages.map(p => p.Travel_Type))].filter(Boolean).sort(), [packages])

    const filteredAndSorted = useMemo(() => {
        let result = [...packages]

        if (destinationFilter !== 'all') {
            result = result.filter(p => p.Destination_Name === destinationFilter)
        }

        if (travelTypeFilter !== 'all') {
            result = result.filter(p => p.Travel_Type === travelTypeFilter)
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(p =>
                p.Destination_Name?.toLowerCase().includes(query) ||
                p.Destination_ID?.toLowerCase().includes(query) ||
                p.Overview?.toLowerCase().includes(query) ||
                p.Travel_Type?.toLowerCase().includes(query)
            )
        }

        result.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case 'Destination_Name': cmp = (a.Destination_Name || '').localeCompare(b.Destination_Name || ''); break
                case 'Duration': cmp = (a.Duration_Days || 0) - (b.Duration_Days || 0); break
                case 'Price_Min_INR': cmp = (a.Price_Min_INR || 0) - (b.Price_Min_INR || 0); break
                case 'Travel_Type': cmp = (a.Travel_Type || '').localeCompare(b.Travel_Type || ''); break
                default: cmp = new Date(a.Last_Updated || 0).getTime() - new Date(b.Last_Updated || 0).getTime()
            }
            return sortDirection === 'desc' ? -cmp : cmp
        })

        return result
    }, [packages, destinationFilter, travelTypeFilter, searchQuery, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('desc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1">{sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : <span className="text-gray-300">↕</span>}</span>
    )

    const handleDeletePackage = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) return
        try {
            await deleteDoc(doc(db, 'packages', id))
            fetchPackages()
            alert('Package deleted successfully!')
        } catch (error) {
            console.error('Error deleting package:', error)
            alert('Error deleting package. Please try again.')
        }
    }

    if (showForm) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <PackageForm
                        formData={formData}
                        handleInputChange={handleInputChange}
                        setFormData={setFormData}
                        editingPackage={editingPackage}
                        onSubmit={handlePackageSubmit}
                        onCancel={() => {
                            setShowForm(false)
                            setEditingPackage(null)
                            setFormData(() => ({}))
                        }}
                    />
                </div>
            </div>
        )
    }

    if (showBulkImport) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Bulk Import Packages (JSON)</h2>
                        <button onClick={() => setShowBulkImport(false)} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <button onClick={loadSampleJson} className="text-sm text-primary hover:underline">Load Sample JSON</button>
                        </div>
                        <textarea
                            value={bulkImportJson}
                            onChange={(e) => setBulkImportJson(e.target.value)}
                            placeholder="Paste your JSON array of packages here..."
                            className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        {bulkImportStatus.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="font-semibold text-red-800 mb-2">Errors:</p>
                                <ul className="list-disc list-inside text-sm text-red-700">
                                    {bulkImportStatus.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        )}
                        {bulkImportStatus.success > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-800">Successfully imported {bulkImportStatus.success} packages!</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={handleBulkImport}
                                disabled={bulkImportStatus.processing || !bulkImportJson.trim()}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {bulkImportStatus.processing ? 'Importing...' : 'Import Packages'}
                            </button>
                            <button onClick={() => setShowBulkImport(false)} className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900">Packages ({filteredAndSorted.length}{filteredAndSorted.length !== packages.length ? ` of ${packages.length}` : ''})</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <input type="text" placeholder="Search packages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-48" />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Destinations</option>
                                {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={travelTypeFilter} onChange={(e) => setTravelTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Types</option>
                                {travelTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button onClick={() => setShowBulkImport(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Bulk Import
                            </button>
                            <button onClick={handleNewPackage} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors">+ Add New</button>
                            <button onClick={fetchPackages} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">🔄</button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Destination_Name')}>Destination <SortIcon field="Destination_Name" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Duration')}>Duration <SortIcon field="Duration" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Price_Min_INR')}>Price <SortIcon field="Price_Min_INR" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('Travel_Type')}>Type <SortIcon field="Travel_Type" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSorted.map((pkg) => (
                                <tr key={pkg.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{pkg.Destination_Name}</div>
                                        <div className="text-sm text-gray-500">{pkg.Destination_ID}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{pkg.Duration}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{pkg.Price_Range_INR}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{pkg.Travel_Type}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEditPackage(pkg)} className="text-primary hover:text-primary-dark text-sm font-semibold">Edit</button>
                                            <button onClick={() => handleDeletePackage(pkg.id!)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSorted.length === 0 && (
                        <div className="text-center py-12 text-gray-500">{packages.length === 0 ? 'No packages found' : 'No packages match your filters'}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
