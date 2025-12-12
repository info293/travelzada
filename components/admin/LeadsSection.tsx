'use client'

import { useState, useMemo } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Lead } from './types'
import type { ReactNode } from 'react'

interface LeadsSectionProps {
    leads: Lead[]
    fetchLeads: () => Promise<void>
    startLeadDetailsEdit: (lead: Lead) => void
    setViewModal: (modal: { isOpen: boolean; title: string; content: ReactNode | null }) => void
}

type SortField = 'name' | 'createdAt' | 'status' | 'packageName'
type SortDirection = 'asc' | 'desc'

export default function LeadsSection({
    leads,
    fetchLeads,
    startLeadDetailsEdit,
    setViewModal,
}: LeadsSectionProps) {
    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<string>('all')

    // Sort states
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    // Get unique statuses for filter dropdown
    const statuses = useMemo(() => {
        const uniqueStatuses = [...new Set(leads.map(l => l.status))]
        return uniqueStatuses.sort()
    }, [leads])

    // Filter and sort leads
    const filteredAndSortedLeads = useMemo(() => {
        let result = [...leads]

        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(lead => lead.status === statusFilter)
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(lead =>
                lead.name.toLowerCase().includes(query) ||
                lead.mobile.includes(query) ||
                lead.packageName?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query) ||
                lead.destination?.toLowerCase().includes(query)
            )
        }

        // Apply date filter
        if (dateFilter !== 'all') {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

            result = result.filter(lead => {
                const leadDate = new Date(lead.createdAt)
                switch (dateFilter) {
                    case 'today':
                        return leadDate >= today
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                        return leadDate >= weekAgo
                    case 'month':
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                        return leadDate >= monthAgo
                    default:
                        return true
                }
            })
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name)
                    break
                case 'status':
                    comparison = a.status.localeCompare(b.status)
                    break
                case 'packageName':
                    comparison = (a.packageName || '').localeCompare(b.packageName || '')
                    break
                case 'createdAt':
                default:
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
            }
            return sortDirection === 'desc' ? -comparison : comparison
        })

        return result
    }, [leads, statusFilter, searchQuery, dateFilter, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1 inline-block">
            {sortField === field ? (
                sortDirection === 'desc' ? '↓' : '↑'
            ) : (
                <span className="text-gray-300">↕</span>
            )}
        </span>
    )

    const handleStatusChange = async (lead: Lead) => {
        if (lead.id) {
            try {
                await updateDoc(doc(db, 'leads', lead.id), {
                    status: lead.status === 'new' ? 'contacted' : lead.status === 'contacted' ? 'converted' : 'new',
                })
                fetchLeads()
            } catch (error) {
                console.error('Error updating lead status:', error)
                alert('Error updating lead status. Please try again.')
            }
        }
    }

    const handleDelete = async (lead: Lead) => {
        if (lead.id && confirm('Are you sure you want to delete this lead?')) {
            try {
                await deleteDoc(doc(db, 'leads', lead.id))
                fetchLeads()
                alert('Lead deleted successfully!')
            } catch (error) {
                console.error('Error deleting lead:', error)
                alert('Error deleting lead. Please try again.')
            }
        }
    }

    const handleView = async (lead: Lead) => {
        setViewModal({
            isOpen: true,
            title: `Lead from ${lead.name}`,
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Name</p>
                            <p className="text-gray-900">{lead.name}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Mobile</p>
                            <a href={`tel:${lead.mobile}`} className="text-primary hover:underline">{lead.mobile}</a>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Email</p>
                            <p className="text-gray-900">{lead.email || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Package</p>
                            <p className="text-gray-900">{lead.packageName || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Destination</p>
                            <p className="text-gray-900">{lead.destination || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Travel Date</p>
                            <p className="text-gray-900">{lead.travelDate || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Travelers</p>
                            <p className="text-gray-900">{lead.travelersCount || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Travel Type</p>
                            <p className="text-gray-900">{lead.travelType || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Budget</p>
                            <p className="text-gray-900">{lead.budget || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Status</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${lead.status === 'new' ? 'bg-green-100 text-green-800' :
                                    lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                        lead.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                }`}>
                                {lead.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Date</p>
                            <p className="text-gray-900">{new Date(lead.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    {lead.notes && (
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Notes</p>
                            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{lead.notes}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">Source URL</p>
                        <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                            {lead.sourceUrl}
                        </a>
                    </div>
                </div>
            ),
        })

        // Mark as read
        if (lead.id && !lead.read) {
            try {
                await updateDoc(doc(db, 'leads', lead.id), {
                    read: true,
                    status: lead.status === 'new' ? 'contacted' : lead.status,
                })
                fetchLeads()
            } catch (error) {
                console.error('Error updating lead:', error)
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header with filters */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            Leads ({filteredAndSortedLeads.length}{filteredAndSortedLeads.length !== leads.length ? ` of ${leads.length}` : ''})
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search leads..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-48"
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                <option value="all">All Status</option>
                                {statuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>

                            {/* Date Filter */}
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                            </select>

                            {/* Refresh Button */}
                            <button
                                onClick={fetchLeads}
                                className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('name')}
                                >
                                    Name <SortIcon field="name" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('packageName')}
                                >
                                    Package <SortIcon field="packageName" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source URL</th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('status')}
                                >
                                    Status <SortIcon field="status" />
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    Date <SortIcon field="createdAt" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSortedLeads.map((lead) => (
                                <tr
                                    key={lead.id}
                                    className={`hover:bg-gray-50 ${!lead.read ? 'bg-blue-50' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{lead.name}</div>
                                        {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <a href={`tel:${lead.mobile}`} className="text-sm text-primary hover:underline">{lead.mobile}</a>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{lead.packageName || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a
                                            href={lead.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold truncate max-w-xs block"
                                            title={lead.sourceUrl}
                                        >
                                            {lead.sourceUrl.length > 40 ? `${lead.sourceUrl.substring(0, 40)}...` : lead.sourceUrl}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lead.status === 'new' ? 'bg-green-100 text-green-800' :
                                                lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                                    lead.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">
                                            {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => startLeadDetailsEdit(lead)}
                                                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-semibold transition-colors"
                                            >
                                                {lead.destination || lead.travelDate || lead.travelersCount ? 'Edit' : 'Add'}
                                            </button>
                                            <button
                                                onClick={() => handleView(lead)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold transition-colors"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(lead)}
                                                className="text-green-600 hover:text-green-800 text-sm font-semibold"
                                            >
                                                {lead.status === 'new' ? 'Mark Contacted' : lead.status === 'contacted' ? 'Mark Converted' : 'Reset'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lead)}
                                                className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSortedLeads.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-500 mb-4">
                                {leads.length === 0 ? 'No leads yet' : 'No leads match your filters'}
                            </div>
                            <div className="text-sm text-gray-400">
                                {leads.length === 0
                                    ? 'Leads will appear here when users submit the enquiry form.'
                                    : 'Try adjusting your search or filter criteria.'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
