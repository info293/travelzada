'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CustomerItinerary, HistoryEntry } from './types';

interface CustomerRecordsManagerProps {
    onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
};

const STATUS_OPTIONS = ['draft', 'sent', 'confirmed', 'completed', 'cancelled'];

export default function CustomerRecordsManager({ onRefresh }: CustomerRecordsManagerProps) {
    const [records, setRecords] = useState<CustomerItinerary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedRecord, setSelectedRecord] = useState<CustomerItinerary | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editForm, setEditForm] = useState<Partial<CustomerItinerary>>({});

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!db) return;
            const q = query(collection(db, 'customer_itineraries'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data: CustomerItinerary[] = [];
            snapshot.forEach((docSnap) => {
                const docData = docSnap.data();
                data.push({
                    id: docSnap.id,
                    clientName: docData.clientName || '',
                    clientEmail: docData.clientEmail || '',
                    clientPhone: docData.clientPhone || '',
                    packageId: docData.packageId || '',
                    packageName: docData.packageName || '',
                    destinationName: docData.destinationName || '',
                    travelDate: docData.travelDate || '',
                    adults: docData.adults || 0,
                    children: docData.children || 0,
                    totalCost: docData.totalCost || 0,
                    advancePaid: docData.advancePaid || 0,
                    balanceDue: docData.balanceDue || docData.totalCost - docData.advancePaid || 0,
                    flights: docData.flights || [],
                    hotels: docData.hotels || [],
                    customItinerary: docData.customItinerary || [],
                    notes: docData.notes || '',
                    status: docData.status || 'draft',
                    history: docData.history || [],
                    customerReview: docData.customerReview,
                    createdAt: docData.createdAt?.toDate?.()?.toISOString() || docData.createdAt || '',
                    updatedAt: docData.updatedAt?.toDate?.()?.toISOString() || docData.updatedAt || '',
                    createdBy: docData.createdBy || '',
                } as CustomerItinerary);
            });
            setRecords(data);
        } catch (error) {
            console.error('Error fetching customer records:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const filteredRecords = records.filter((record) => {
        const matchesSearch =
            searchTerm === '' ||
            record.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.clientPhone.includes(searchTerm) ||
            record.packageName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleStatusChange = async (record: CustomerItinerary, newStatus: string) => {
        if (!record.id || !db) return;
        setIsUpdating(true);
        try {
            const now = new Date().toISOString();
            const historyEntry: HistoryEntry = {
                action: `Status changed to ${newStatus}`,
                timestamp: now,
                details: `Previous status: ${record.status}`,
            };
            const updatedHistory = [...(record.history || []), historyEntry];

            await updateDoc(doc(db, 'customer_itineraries', record.id), {
                status: newStatus,
                history: updatedHistory,
                updatedAt: now,
            });

            await fetchRecords();
            if (selectedRecord?.id === record.id) {
                setSelectedRecord({ ...record, status: newStatus as any, history: updatedHistory, updatedAt: now });
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddNote = async () => {
        if (!selectedRecord?.id || !db || !newNote.trim()) return;
        setIsUpdating(true);
        try {
            const now = new Date().toISOString();
            const historyEntry: HistoryEntry = {
                action: 'Note added',
                timestamp: now,
                details: newNote.trim(),
            };
            const updatedHistory = [...(selectedRecord.history || []), historyEntry];
            const updatedNotes = selectedRecord.notes
                ? `${selectedRecord.notes}\n\n[${new Date().toLocaleDateString()}] ${newNote.trim()}`
                : `[${new Date().toLocaleDateString()}] ${newNote.trim()}`;

            await updateDoc(doc(db, 'customer_itineraries', selectedRecord.id), {
                notes: updatedNotes,
                history: updatedHistory,
                updatedAt: now,
            });

            setNewNote('');
            await fetchRecords();
            setSelectedRecord({ ...selectedRecord, notes: updatedNotes, history: updatedHistory, updatedAt: now });
        } catch (error) {
            console.error('Error adding note:', error);
            alert('Failed to add note');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (record: CustomerItinerary) => {
        if (!record.id || !db) return;
        if (!confirm(`Are you sure you want to delete the record for ${record.clientName}?`)) return;

        try {
            await deleteDoc(doc(db, 'customer_itineraries', record.id));
            await fetchRecords();
            if (selectedRecord?.id === record.id) {
                setSelectedRecord(null);
                setIsDetailModalOpen(false);
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('Failed to delete record');
        }
    };

    const openDetailModal = (record: CustomerItinerary) => {
        setSelectedRecord(record);
        setEditForm({ ...record });
        setIsEditMode(false);
        setIsDetailModalOpen(true);
    };

    const handleEditSave = async () => {
        if (!selectedRecord?.id || !db) return;
        setIsUpdating(true);
        try {
            const now = new Date().toISOString();
            const balanceDue = (editForm.totalCost || 0) - (editForm.advancePaid || 0);

            const historyEntry: HistoryEntry = {
                action: 'Record updated',
                timestamp: now,
                details: 'Customer details modified by admin',
            };
            const updatedHistory = [...(selectedRecord.history || []), historyEntry];

            const updateData = {
                clientName: editForm.clientName || '',
                clientEmail: editForm.clientEmail || '',
                clientPhone: editForm.clientPhone || '',
                packageName: editForm.packageName || '',
                destinationName: editForm.destinationName || '',
                travelDate: editForm.travelDate || '',
                adults: Number(editForm.adults) || 0,
                children: Number(editForm.children) || 0,
                totalCost: Number(editForm.totalCost) || 0,
                advancePaid: Number(editForm.advancePaid) || 0,
                balanceDue: balanceDue,
                notes: editForm.notes || '',
                status: editForm.status || 'draft',
                history: updatedHistory,
                updatedAt: now,
            };

            await updateDoc(doc(db, 'customer_itineraries', selectedRecord.id), updateData);

            await fetchRecords();
            setSelectedRecord({ ...selectedRecord, ...updateData, history: updatedHistory });
            setIsEditMode(false);
            alert('Record updated successfully!');
        } catch (error) {
            console.error('Error updating record:', error);
            alert('Failed to update record');
        } finally {
            setIsUpdating(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Stats
    const stats = {
        total: records.length,
        draft: records.filter((r) => r.status === 'draft').length,
        sent: records.filter((r) => r.status === 'sent').length,
        confirmed: records.filter((r) => r.status === 'confirmed').length,
        completed: records.filter((r) => r.status === 'completed').length,
        cancelled: records.filter((r) => r.status === 'cancelled').length,
        totalRevenue: records.filter((r) => r.status === 'completed').reduce((sum, r) => sum + r.totalCost, 0),
        pendingRevenue: records.filter((r) => ['sent', 'confirmed'].includes(r.status)).reduce((sum, r) => sum + r.balanceDue, 0),
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Customer Records</h2>
                    <p className="text-gray-500">Manage custom itineraries and customer relationships</p>
                </div>
                <button
                    onClick={fetchRecords}
                    disabled={isLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-500">Total Records</div>
                </div>
                <div className="bg-gray-50 rounded-lg shadow p-4">
                    <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
                    <div className="text-xs text-gray-500">Draft</div>
                </div>
                <div className="bg-blue-50 rounded-lg shadow p-4">
                    <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                    <div className="text-xs text-blue-500">Sent</div>
                </div>
                <div className="bg-green-50 rounded-lg shadow p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
                    <div className="text-xs text-green-500">Confirmed</div>
                </div>
                <div className="bg-purple-50 rounded-lg shadow p-4">
                    <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
                    <div className="text-xs text-purple-500">Completed</div>
                </div>
                <div className="bg-red-50 rounded-lg shadow p-4">
                    <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                    <div className="text-xs text-red-500">Cancelled</div>
                </div>
                <div className="bg-emerald-50 rounded-lg shadow p-4">
                    <div className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</div>
                    <div className="text-xs text-emerald-500">Completed Revenue</div>
                </div>
                <div className="bg-amber-50 rounded-lg shadow p-4">
                    <div className="text-lg font-bold text-amber-600">{formatCurrency(stats.pendingRevenue)}</div>
                    <div className="text-xs text-amber-500">Pending Balance</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, or package..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading records...</div>
                ) : filteredRecords.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {records.length === 0 ? 'No customer records yet. Generate itineraries to see them here.' : 'No records match your search.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Package</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Travel Date</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Travelers</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Total Cost</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Balance</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetailModal(record)}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{record.clientName}</div>
                                            <div className="text-xs text-gray-500">{record.clientPhone}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-900">{record.packageName || record.destinationName}</div>
                                            <div className="text-xs text-gray-500">{record.packageId}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{formatDate(record.travelDate)}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {record.adults}A {record.children > 0 && `+ ${record.children}C`}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(record.totalCost)}</td>
                                        <td className="px-4 py-3">
                                            <span className={record.balanceDue > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                                {formatCurrency(record.balanceDue)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={record.status}
                                                onChange={(e) => handleStatusChange(record, e.target.value)}
                                                disabled={isUpdating}
                                                className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[record.status]} border-0 cursor-pointer`}
                                            >
                                                {STATUS_OPTIONS.map((status) => (
                                                    <option key={status} value={status}>
                                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(record.createdAt)}</td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleDelete(record)}
                                                className="text-red-600 hover:text-red-800 text-xs"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail/Edit Modal */}
            {isDetailModalOpen && selectedRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">
                                {isEditMode ? 'Edit Customer Record' : 'Customer Record Details'}
                            </h3>
                            <div className="flex gap-2">
                                {!isEditMode && (
                                    <button
                                        onClick={() => {
                                            setEditForm({ ...selectedRecord });
                                            setIsEditMode(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                    >
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        setIsEditMode(false);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 text-2xl px-2"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {isEditMode ? (
                                /* EDIT MODE */
                                <>
                                    {/* Customer Info - Editable */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-4">Customer Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                                                <input
                                                    type="text"
                                                    value={editForm.clientName || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={editForm.clientEmail || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                                                <input
                                                    type="text"
                                                    value={editForm.clientPhone || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Package Info - Editable */}
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-4">Package & Travel Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Package Name</label>
                                                <input
                                                    type="text"
                                                    value={editForm.packageName || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, packageName: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Travel Date</label>
                                                <input
                                                    type="date"
                                                    value={editForm.travelDate || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, travelDate: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Adults</label>
                                                <input
                                                    type="number"
                                                    value={editForm.adults || 0}
                                                    onChange={(e) => setEditForm({ ...editForm, adults: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Children</label>
                                                <input
                                                    type="number"
                                                    value={editForm.children || 0}
                                                    onChange={(e) => setEditForm({ ...editForm, children: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Info - Editable */}
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-4">Financial Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Total Cost (INR)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.totalCost || 0}
                                                    onChange={(e) => setEditForm({ ...editForm, totalCost: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Advance Paid (INR)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.advancePaid || 0}
                                                    onChange={(e) => setEditForm({ ...editForm, advancePaid: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Balance Due (Auto-calculated)</label>
                                                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-bold text-amber-700">
                                                    {formatCurrency((editForm.totalCost || 0) - (editForm.advancePaid || 0))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status - Editable */}
                                    <div className="bg-purple-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-4">Status</h4>
                                        <select
                                            value={editForm.status || 'draft'}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                        >
                                            {STATUS_OPTIONS.map((status) => (
                                                <option key={status} value={status}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Notes - Editable */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">Notes</label>
                                        <textarea
                                            value={editForm.notes || ''}
                                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            placeholder="Add notes about this customer..."
                                        />
                                    </div>

                                    {/* Save/Cancel Buttons */}
                                    <div className="flex gap-3 pt-4 border-t">
                                        <button
                                            onClick={handleEditSave}
                                            disabled={isUpdating}
                                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {isUpdating ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditMode(false)}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* VIEW MODE */
                                <>
                                    {/* Customer Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="text-xs text-gray-500 mb-1">Customer Name</div>
                                            <div className="font-semibold text-gray-900">{selectedRecord.clientName}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="text-xs text-gray-500 mb-1">Email</div>
                                            <div className="font-semibold text-gray-900">{selectedRecord.clientEmail || '-'}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="text-xs text-gray-500 mb-1">Phone</div>
                                            <div className="font-semibold text-gray-900">{selectedRecord.clientPhone}</div>
                                        </div>
                                    </div>

                                    {/* Package Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <div className="text-xs text-blue-500 mb-1">Package</div>
                                            <div className="font-semibold text-blue-900">{selectedRecord.packageName || selectedRecord.destinationName}</div>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <div className="text-xs text-blue-500 mb-1">Travel Date</div>
                                            <div className="font-semibold text-blue-900">{formatDate(selectedRecord.travelDate)}</div>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <div className="text-xs text-blue-500 mb-1">Adults</div>
                                            <div className="font-semibold text-blue-900">{selectedRecord.adults}</div>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <div className="text-xs text-blue-500 mb-1">Children</div>
                                            <div className="font-semibold text-blue-900">{selectedRecord.children}</div>
                                        </div>
                                    </div>

                                    {/* Financial Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <div className="text-xs text-green-500 mb-1">Total Cost</div>
                                            <div className="font-bold text-2xl text-green-900">{formatCurrency(selectedRecord.totalCost)}</div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <div className="text-xs text-green-500 mb-1">Advance Paid</div>
                                            <div className="font-bold text-2xl text-green-900">{formatCurrency(selectedRecord.advancePaid)}</div>
                                        </div>
                                        <div className={`rounded-lg p-4 ${selectedRecord.balanceDue > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                                            <div className={`text-xs mb-1 ${selectedRecord.balanceDue > 0 ? 'text-amber-500' : 'text-green-500'}`}>Balance Due</div>
                                            <div className={`font-bold text-2xl ${selectedRecord.balanceDue > 0 ? 'text-amber-900' : 'text-green-900'}`}>
                                                {formatCurrency(selectedRecord.balanceDue)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hotels */}
                                    {selectedRecord.hotels && selectedRecord.hotels.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-3">Hotels</h4>
                                            <div className="space-y-2">
                                                {selectedRecord.hotels.map((hotel, idx) => (
                                                    <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                                                        <div className="font-medium">{hotel.hotelName} - {hotel.city}</div>
                                                        <div className="text-gray-500">
                                                            {formatDate(hotel.checkIn)} to {formatDate(hotel.checkOut)} • {hotel.roomType} • {hotel.mealPlan}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Flights */}
                                    {selectedRecord.flights && selectedRecord.flights.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-3">Flights</h4>
                                            <div className="space-y-2">
                                                {selectedRecord.flights.map((flight, idx) => (
                                                    <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                                                        <div className="font-medium">{flight.airline} {flight.flightNumber}</div>
                                                        <div className="text-gray-500">
                                                            {flight.departureCity} → {flight.arrivalCity} • {formatDate(flight.date)} • {flight.departureTime} - {flight.arrivalTime}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">Notes</h4>
                                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap min-h-[60px]">
                                            {selectedRecord.notes || 'No notes yet.'}
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                type="text"
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Add a quick note..."
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            />
                                            <button
                                                onClick={handleAddNote}
                                                disabled={isUpdating || !newNote.trim()}
                                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                                            >
                                                Add Note
                                            </button>
                                        </div>
                                    </div>

                                    {/* History */}
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">History</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {selectedRecord.history && selectedRecord.history.length > 0 ? (
                                                [...selectedRecord.history].reverse().map((entry, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 text-sm">
                                                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                                        <div>
                                                            <div className="font-medium text-gray-900">{entry.action}</div>
                                                            {entry.details && <div className="text-gray-500">{entry.details}</div>}
                                                            <div className="text-xs text-gray-400">{formatDate(entry.timestamp)}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-gray-500 text-sm">No history yet.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Customer Review */}
                                    {selectedRecord.customerReview && (
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-3">Customer Review</h4>
                                            <div className="bg-yellow-50 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-yellow-500">{'★'.repeat(selectedRecord.customerReview.rating)}</span>
                                                    <span className="text-gray-400">{'★'.repeat(5 - selectedRecord.customerReview.rating)}</span>
                                                </div>
                                                <div className="text-gray-700">{selectedRecord.customerReview.comment}</div>
                                                <div className="text-xs text-gray-400 mt-2">{formatDate(selectedRecord.customerReview.date)}</div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
