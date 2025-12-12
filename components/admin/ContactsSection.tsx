'use client'

import { useState, useMemo } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ContactMessage } from './types'
import type { ReactNode } from 'react'

interface ContactsSectionProps {
    contactMessages: ContactMessage[]
    fetchContactMessages: () => Promise<void>
    setViewModal: (modal: { isOpen: boolean; title: string; content: ReactNode | null }) => void
}

type SortField = 'name' | 'createdAt' | 'status' | 'destination'
type SortDirection = 'asc' | 'desc'

export default function ContactsSection({
    contactMessages,
    fetchContactMessages,
    setViewModal,
}: ContactsSectionProps) {
    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<string>('all')

    // Sort states
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    // Get unique statuses
    const statuses = useMemo(() => {
        const uniqueStatuses = [...new Set(contactMessages.map(m => m.status))]
        return uniqueStatuses.sort()
    }, [contactMessages])

    // Filter and sort
    const filteredAndSortedMessages = useMemo(() => {
        let result = [...contactMessages]

        if (statusFilter !== 'all') {
            result = result.filter(msg => msg.status === statusFilter)
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(msg =>
                msg.name.toLowerCase().includes(query) ||
                msg.email.toLowerCase().includes(query) ||
                msg.phone?.includes(query) ||
                msg.destination?.toLowerCase().includes(query) ||
                msg.message?.toLowerCase().includes(query)
            )
        }

        if (dateFilter !== 'all') {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

            result = result.filter(msg => {
                const msgDate = new Date(msg.createdAt)
                switch (dateFilter) {
                    case 'today':
                        return msgDate >= today
                    case 'week':
                        return msgDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                    case 'month':
                        return msgDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                    default:
                        return true
                }
            })
        }

        result.sort((a, b) => {
            let comparison = 0
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name)
                    break
                case 'status':
                    comparison = a.status.localeCompare(b.status)
                    break
                case 'destination':
                    comparison = (a.destination || '').localeCompare(b.destination || '')
                    break
                case 'createdAt':
                default:
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
            }
            return sortDirection === 'desc' ? -comparison : comparison
        })

        return result
    }, [contactMessages, statusFilter, searchQuery, dateFilter, sortField, sortDirection])

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
            {sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : <span className="text-gray-300">↕</span>}
        </span>
    )

    const handleView = async (message: ContactMessage) => {
        setViewModal({
            isOpen: true,
            title: `Contact Message from ${message.name}`,
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Name</p>
                            <p className="text-gray-900">{message.name}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Email</p>
                            <a href={`mailto:${message.email}`} className="text-primary hover:underline">{message.email}</a>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Phone</p>
                            <a href={`tel:${message.phone}`} className="text-primary hover:underline">{message.phone || 'N/A'}</a>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Date</p>
                            <p className="text-gray-900">{new Date(message.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">Destination</p>
                        <p className="text-gray-900 font-medium">{message.destination}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">Message</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">{message.message}</p>
                    </div>
                </div>
            ),
        })

        if (message.id && !message.read) {
            try {
                await updateDoc(doc(db, 'contact_messages', message.id), { read: true, status: 'read' })
                fetchContactMessages()
            } catch (error) {
                console.error('Error updating message:', error)
            }
        }
    }

    const handleDelete = async (message: ContactMessage) => {
        if (!confirm(`Are you sure you want to delete this message from ${message.name}?`)) return
        try {
            if (message.id) {
                await deleteDoc(doc(db, 'contact_messages', message.id))
                fetchContactMessages()
                alert('Message deleted successfully!')
            }
        } catch (error) {
            console.error('Error deleting message:', error)
            alert('Error deleting message. Please try again.')
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header with filters */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            Contact Messages ({filteredAndSortedMessages.length}{filteredAndSortedMessages.length !== contactMessages.length ? ` of ${contactMessages.length}` : ''})
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-48"
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
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
                            <button
                                onClick={fetchContactMessages}
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                                    Name <SortIcon field="name" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('destination')}>
                                    Destination <SortIcon field="destination" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                                    Status <SortIcon field="status" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                                    Date <SortIcon field="createdAt" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSortedMessages.map((message) => (
                                <tr key={message.id} className={`hover:bg-gray-50 ${!message.read ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{message.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{message.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{message.phone || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 max-w-xs truncate" title={message.destination}>
                                            {message.destination}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${message.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                message.status === 'read' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-green-100 text-green-800'
                                            }`}>
                                            {message.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {message.createdAt ? new Date(message.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        }) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleView(message)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold transition-colors"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleDelete(message)}
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
                    {filteredAndSortedMessages.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-500 mb-4">
                                {contactMessages.length === 0 ? 'No contact messages yet' : 'No messages match your filters'}
                            </div>
                            <div className="text-sm text-gray-400">
                                {contactMessages.length === 0
                                    ? 'Messages will appear here when users submit the contact form.'
                                    : 'Try adjusting your search or filter criteria.'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
