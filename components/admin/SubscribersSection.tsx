'use client'

import { useState, useMemo } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Subscriber } from './types'

interface SubscribersSectionProps {
    subscribers: Subscriber[]
    fetchSubscribers: () => Promise<void>
}

type SortField = 'email' | 'subscribedAt' | 'status' | 'source'
type SortDirection = 'asc' | 'desc'

export default function SubscribersSection({
    subscribers,
    fetchSubscribers,
}: SubscribersSectionProps) {
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('subscribedAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    const statuses = useMemo(() => [...new Set(subscribers.map(s => s.status))].sort(), [subscribers])

    const filteredAndSorted = useMemo(() => {
        let result = [...subscribers]

        if (statusFilter !== 'all') result = result.filter(s => s.status === statusFilter)

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(s => s.email.toLowerCase().includes(query) || s.source?.toLowerCase().includes(query))
        }

        if (dateFilter !== 'all') {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            result = result.filter(s => {
                const date = new Date(s.subscribedAt)
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
                case 'email': cmp = a.email.localeCompare(b.email); break
                case 'status': cmp = a.status.localeCompare(b.status); break
                case 'source': cmp = (a.source || '').localeCompare(b.source || ''); break
                default: cmp = new Date(a.subscribedAt).getTime() - new Date(b.subscribedAt).getTime()
            }
            return sortDirection === 'desc' ? -cmp : cmp
        })

        return result
    }, [subscribers, statusFilter, searchQuery, dateFilter, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('desc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1">{sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : <span className="text-gray-300">↕</span>}</span>
    )

    const handleStatusToggle = async (subscriber: Subscriber) => {
        if (subscriber.id) {
            try {
                await updateDoc(doc(db, 'newsletter_subscribers', subscriber.id), {
                    status: subscriber.status === 'active' ? 'unsubscribed' : 'active'
                })
                fetchSubscribers()
            } catch (e) { console.error(e); alert('Error updating status') }
        }
    }

    const handleDelete = async (subscriber: Subscriber) => {
        if (!confirm(`Delete subscriber ${subscriber.email}?`)) return
        if (subscriber.id) {
            try {
                await deleteDoc(doc(db, 'newsletter_subscribers', subscriber.id))
                fetchSubscribers()
                alert('Deleted!')
            } catch (e) { console.error(e); alert('Error deleting') }
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900">Subscribers ({filteredAndSorted.length}{filteredAndSorted.length !== subscribers.length ? ` of ${subscribers.length}` : ''})</h2>
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
                            <button onClick={fetchSubscribers} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">🔄 Refresh</button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>Email <SortIcon field="email" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('source')}>Source <SortIcon field="source" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('subscribedAt')}>Subscribed <SortIcon field="subscribedAt" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSorted.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{sub.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{sub.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{sub.source || 'Direct'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(sub.subscribedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleStatusToggle(sub)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${sub.status === 'active' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                                                {sub.status === 'active' ? 'Unsubscribe' : 'Reactivate'}
                                            </button>
                                            <button onClick={() => handleDelete(sub)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSorted.length === 0 && (
                        <div className="text-center py-12 text-gray-500">{subscribers.length === 0 ? 'No subscribers yet' : 'No subscribers match your filters'}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
