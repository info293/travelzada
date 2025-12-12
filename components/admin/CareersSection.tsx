'use client'

import { useState, useMemo } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { JobApplication } from './types'
import type { ReactNode } from 'react'

interface CareersSectionProps {
    jobApplications: JobApplication[]
    fetchJobApplications: () => Promise<void>
    setViewModal: (modal: { isOpen: boolean; title: string; content: ReactNode | null }) => void
}

type SortField = 'name' | 'createdAt' | 'status' | 'position'
type SortDirection = 'asc' | 'desc'

export default function CareersSection({
    jobApplications,
    fetchJobApplications,
    setViewModal,
}: CareersSectionProps) {
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    const statuses = useMemo(() => [...new Set(jobApplications.map(a => a.status))].sort(), [jobApplications])
    const positions = useMemo(() => [...new Set(jobApplications.map(a => a.position))].sort(), [jobApplications])

    const filteredAndSorted = useMemo(() => {
        let result = [...jobApplications]

        if (statusFilter !== 'all') {
            result = result.filter(app => app.status === statusFilter)
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(app =>
                app.name.toLowerCase().includes(query) ||
                app.email.toLowerCase().includes(query) ||
                app.position?.toLowerCase().includes(query)
            )
        }

        if (dateFilter !== 'all') {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            result = result.filter(app => {
                const date = new Date(app.createdAt)
                switch (dateFilter) {
                    case 'today': return date >= today
                    case 'week': return date >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                    case 'month': return date >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                    default: return true
                }
            })
        }

        result.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case 'name': cmp = a.name.localeCompare(b.name); break
                case 'status': cmp = a.status.localeCompare(b.status); break
                case 'position': cmp = (a.position || '').localeCompare(b.position || ''); break
                default: cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            }
            return sortDirection === 'desc' ? -cmp : cmp
        })

        return result
    }, [jobApplications, statusFilter, searchQuery, dateFilter, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('desc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1">{sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : <span className="text-gray-300">↕</span>}</span>
    )

    const handleView = async (app: JobApplication) => {
        setViewModal({
            isOpen: true,
            title: `Application from ${app.name}`,
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-sm font-semibold text-gray-500 mb-1">Name</p><p className="text-gray-900">{app.name}</p></div>
                        <div><p className="text-sm font-semibold text-gray-500 mb-1">Email</p><a href={`mailto:${app.email}`} className="text-primary hover:underline">{app.email}</a></div>
                        <div><p className="text-sm font-semibold text-gray-500 mb-1">Phone</p><p className="text-gray-900">{app.phone || 'N/A'}</p></div>
                        <div><p className="text-sm font-semibold text-gray-500 mb-1">Position</p><p className="text-gray-900 font-medium">{app.position}</p></div>
                        <div><p className="text-sm font-semibold text-gray-500 mb-1">LinkedIn</p>{app.linkedin ? <a href={app.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Profile</a> : <span className="text-gray-400">N/A</span>}</div>
                        <div><p className="text-sm font-semibold text-gray-500 mb-1">Date</p><p className="text-gray-900">{new Date(app.createdAt).toLocaleString()}</p></div>
                    </div>
                    <div><p className="text-sm font-semibold text-gray-500 mb-1">Cover Letter</p><p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border">{app.coverLetter}</p></div>
                </div>
            ),
        })
        if (app.id && !app.read) {
            try {
                await updateDoc(doc(db, 'job_applications', app.id), { read: true, status: 'reviewed' })
                fetchJobApplications()
            } catch (e) { console.error(e) }
        }
    }

    const handleDelete = async (app: JobApplication) => {
        if (!confirm(`Delete application from ${app.name}?`)) return
        if (app.id) {
            try {
                await deleteDoc(doc(db, 'job_applications', app.id))
                fetchJobApplications()
                alert('Deleted!')
            } catch (e) { console.error(e); alert('Error deleting.') }
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900">Job Applications ({filteredAndSorted.length}{filteredAndSorted.length !== jobApplications.length ? ` of ${jobApplications.length}` : ''})</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-48" />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Status</option>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                            </select>
                            <button onClick={fetchJobApplications} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">🔄 Refresh</button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('position')}>Position <SortIcon field="position" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LinkedIn</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>Date <SortIcon field="createdAt" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSorted.map((app) => (
                                <tr key={app.id} className={`hover:bg-gray-50 ${!app.read ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-gray-900">{app.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{app.email}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{app.position}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{app.phone || 'N/A'}</td>
                                    <td className="px-6 py-4">{app.linkedin ? <a href={app.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-semibold">View</a> : <span className="text-gray-400 text-sm">N/A</span>}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${app.status === 'new' ? 'bg-blue-100 text-blue-800' : app.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{app.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleView(app)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold">View</button>
                                            <button onClick={() => handleDelete(app)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSorted.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            {jobApplications.length === 0 ? 'No applications yet' : 'No applications match your filters'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
