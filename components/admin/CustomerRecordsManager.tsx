'use client';

/**
 * Customers: every quote PDF sent (draft / sent) and every booking (confirmed / completed),
 * stored in Firestore `customer_itineraries`. Records are created by the quote PDF builder.
 * Status values are unchanged: draft | sent | confirmed | completed | cancelled.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarClock, Download, FileText, IndianRupee, MessageCircle, Phone, Plane, RefreshCw, Trash2, Users, Wallet } from 'lucide-react';
import { CustomerItinerary, HistoryEntry } from './types';
import {
    PageHeader, StatRow, StatCard, Card, Toolbar, SearchInput, FilterChips, Button, Table, Th, Td, Drawer, Field, inputClass,
    Badge, EmptyState, Spinner, formatDate, formatINR, waLink, exportToCsv, toMillis, cx,
} from './ui';

interface CustomerRecordsManagerProps {
    onRefresh?: () => void;
}

type Status = CustomerItinerary['status'];
const STATUS_OPTIONS: Status[] = ['draft', 'sent', 'confirmed', 'completed', 'cancelled'];

/** Plain-English labels so sales can tell a quote from a booking at a glance */
const STATUS_META: Record<Status, { label: string; tone: 'gray' | 'blue' | 'green' | 'purple' | 'red'; kind: 'Quote' | 'Booking' | 'Cancelled' }> = {
    draft: { label: 'Quote draft', tone: 'gray', kind: 'Quote' },
    sent: { label: 'Quote sent', tone: 'blue', kind: 'Quote' },
    confirmed: { label: 'Booked', tone: 'green', kind: 'Booking' },
    completed: { label: 'Trip done', tone: 'purple', kind: 'Booking' },
    cancelled: { label: 'Cancelled', tone: 'red', kind: 'Cancelled' },
};

type View = 'all' | 'quotes' | 'booked' | 'completed' | 'cancelled' | 'balance';

const DAY = 86400000;
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

/** Days from today until the travel date (negative = in the past, null = no date) */
function daysUntil(dateStr?: string): number | null {
    const t = toMillis(dateStr);
    if (!t) return null;
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - startOfToday()) / DAY);
}

function tripCountdown(days: number | null): string {
    if (days === null) return '';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days > 1) return `in ${days} days`;
    if (days === -1) return 'Yesterday';
    return `${Math.abs(days)} days ago`;
}

const balanceOf = (r: CustomerItinerary) => Math.max(0, (Number(r.totalCost) || 0) - (Number(r.advancePaid) || 0));
const isActiveBooking = (r: CustomerItinerary) => r.status === 'confirmed';

export default function CustomerRecordsManager({ onRefresh }: CustomerRecordsManagerProps) {
    const [records, setRecords] = useState<CustomerItinerary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<View>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<CustomerItinerary>>({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [newNote, setNewNote] = useState('');

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!db) return;
            const q = query(collection(db, 'customer_itineraries'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data: CustomerItinerary[] = [];
            snapshot.forEach((docSnap) => {
                const d = docSnap.data();
                const totalCost = Number(d.totalCost) || 0;
                const advancePaid = Number(d.advancePaid) || 0;
                data.push({
                    id: docSnap.id,
                    clientName: d.clientName || '',
                    clientEmail: d.clientEmail || '',
                    clientPhone: d.clientPhone || '',
                    packageId: d.packageId || '',
                    packageName: d.packageName || '',
                    destinationName: d.destinationName || '',
                    travelDate: d.travelDate || '',
                    adults: Number(d.adults) || 0,
                    children: Number(d.children) || 0,
                    totalCost,
                    advancePaid,
                    balanceDue: typeof d.balanceDue === 'number' ? d.balanceDue : Math.max(0, totalCost - advancePaid),
                    flights: d.flights || [],
                    hotels: d.hotels || [],
                    customItinerary: d.customItinerary || [],
                    notes: d.notes || '',
                    status: (STATUS_OPTIONS as string[]).includes(d.status) ? d.status : 'draft',
                    history: d.history || [],
                    customerReview: d.customerReview,
                    createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || '',
                    updatedAt: d.updatedAt?.toDate?.()?.toISOString() || d.updatedAt || '',
                    createdBy: d.createdBy || '',
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

    const refresh = useCallback(async () => {
        await fetchRecords();
        onRefresh?.();
    }, [fetchRecords, onRefresh]);

    const selected = useMemo(() => records.find((r) => r.id === selectedId) || null, [records, selectedId]);

    // ---- Stats -------------------------------------------------------------
    const stats = useMemo(() => {
        const upcoming = records.filter((r) => isActiveBooking(r) && (daysUntil(r.travelDate) ?? -1) >= 0);
        const next30 = upcoming.filter((r) => (daysUntil(r.travelDate) ?? 999) <= 30);
        const openQuotes = records.filter((r) => r.status === 'draft' || r.status === 'sent');
        const bookings = records.filter((r) => r.status === 'confirmed' || r.status === 'completed');
        const received = bookings.reduce((s, r) => s + (Number(r.advancePaid) || 0), 0);
        const withBalance = bookings.filter((r) => balanceOf(r) > 0);
        const due = withBalance.reduce((s, r) => s + balanceOf(r), 0);
        return { upcoming: upcoming.length, next30: next30.length, openQuotes: openQuotes.length, quotesValue: openQuotes.reduce((s, r) => s + (Number(r.totalCost) || 0), 0), received, bookings: bookings.length, due, withBalance: withBalance.length };
    }, [records]);

    const counts = useMemo(() => ({
        all: records.length,
        quotes: records.filter((r) => r.status === 'draft' || r.status === 'sent').length,
        booked: records.filter((r) => r.status === 'confirmed').length,
        completed: records.filter((r) => r.status === 'completed').length,
        cancelled: records.filter((r) => r.status === 'cancelled').length,
        balance: records.filter((r) => (r.status === 'confirmed' || r.status === 'completed') && balanceOf(r) > 0).length,
    }), [records]);

    // ---- Filter + sort: upcoming trips first (soonest first), then everything else newest first
    const filteredRecords = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const list = records.filter((r) => {
            if (view === 'quotes' && !(r.status === 'draft' || r.status === 'sent')) return false;
            if (view === 'booked' && r.status !== 'confirmed') return false;
            if (view === 'completed' && r.status !== 'completed') return false;
            if (view === 'cancelled' && r.status !== 'cancelled') return false;
            if (view === 'balance' && !((r.status === 'confirmed' || r.status === 'completed') && balanceOf(r) > 0)) return false;
            if (!q) return true;
            return [r.clientName, r.clientEmail, r.clientPhone, r.packageName, r.destinationName]
                .some((v) => String(v || '').toLowerCase().includes(q));
        });
        const rank = (r: CustomerItinerary) => {
            const d = daysUntil(r.travelDate);
            return r.status !== 'cancelled' && r.status !== 'completed' && d !== null && d >= 0 ? 0 : 1;
        };
        return list.sort((a, b) => {
            const ra = rank(a), rb = rank(b);
            if (ra !== rb) return ra - rb;
            if (ra === 0) return toMillis(a.travelDate) - toMillis(b.travelDate);
            return toMillis(b.createdAt) - toMillis(a.createdAt);
        });
    }, [records, searchTerm, view]);

    // ---- Writes --------------------------------------------------------------
    const handleStatusChange = async (record: CustomerItinerary, newStatus: Status) => {
        if (!record.id || !db || newStatus === record.status) return;
        setIsUpdating(true);
        try {
            const now = new Date().toISOString();
            const historyEntry: HistoryEntry = {
                action: `Status changed to ${newStatus}`,
                timestamp: now,
                details: `Previous status: ${record.status}`,
            };
            const updatedHistory = [...(record.history || []), historyEntry];
            await updateDoc(doc(db, 'customer_itineraries', record.id), { status: newStatus, history: updatedHistory, updatedAt: now });
            setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, status: newStatus, history: updatedHistory, updatedAt: now } : r)));
            if (selectedId === record.id) setEditForm((f) => ({ ...f, status: newStatus }));
            onRefresh?.();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddNote = async () => {
        if (!selected?.id || !db || !newNote.trim()) return;
        setIsUpdating(true);
        try {
            const now = new Date().toISOString();
            const historyEntry: HistoryEntry = { action: 'Note added', timestamp: now, details: newNote.trim() };
            const updatedHistory = [...(selected.history || []), historyEntry];
            const stamp = `[${new Date().toLocaleDateString('en-IN')}] ${newNote.trim()}`;
            const updatedNotes = selected.notes ? `${selected.notes}\n\n${stamp}` : stamp;
            await updateDoc(doc(db, 'customer_itineraries', selected.id), { notes: updatedNotes, history: updatedHistory, updatedAt: now });
            setNewNote('');
            setRecords((prev) => prev.map((r) => (r.id === selected.id ? { ...r, notes: updatedNotes, history: updatedHistory, updatedAt: now } : r)));
            setEditForm((f) => ({ ...f, notes: updatedNotes }));
        } catch (error) {
            console.error('Error adding note:', error);
            alert('Failed to add note');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (record: CustomerItinerary) => {
        if (!record.id || !db) return;
        if (!confirm(`Delete the record for ${record.clientName}? This cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, 'customer_itineraries', record.id));
            setRecords((prev) => prev.filter((r) => r.id !== record.id));
            if (selectedId === record.id) setSelectedId(null);
            onRefresh?.();
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('Failed to delete record');
        }
    };

    const openRecord = (record: CustomerItinerary) => {
        setSelectedId(record.id || null);
        setEditForm({ ...record });
        setNewNote('');
    };
    const closeRecord = useCallback(() => setSelectedId(null), []);

    const handleEditSave = async () => {
        if (!selected?.id || !db) return;
        setIsUpdating(true);
        try {
            const now = new Date().toISOString();
            const totalCost = Number(editForm.totalCost) || 0;
            const advancePaid = Number(editForm.advancePaid) || 0;
            const historyEntry: HistoryEntry = { action: 'Record updated', timestamp: now, details: 'Customer details modified by admin' };
            const updatedHistory = [...(selected.history || []), historyEntry];
            const updateData = {
                clientName: editForm.clientName || '',
                clientEmail: editForm.clientEmail || '',
                clientPhone: editForm.clientPhone || '',
                packageName: editForm.packageName || '',
                destinationName: editForm.destinationName || '',
                travelDate: editForm.travelDate || '',
                adults: Number(editForm.adults) || 0,
                children: Number(editForm.children) || 0,
                totalCost,
                advancePaid,
                balanceDue: totalCost - advancePaid,
                notes: editForm.notes || '',
                status: (editForm.status || 'draft') as Status,
                history: updatedHistory,
                updatedAt: now,
            };
            await updateDoc(doc(db, 'customer_itineraries', selected.id), updateData);
            setRecords((prev) => prev.map((r) => (r.id === selected.id ? { ...r, ...updateData } : r)));
            setSelectedId(null);
            onRefresh?.();
        } catch (error) {
            console.error('Error updating record:', error);
            alert('Failed to update record');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExport = () => {
        exportToCsv(
            `travelzada-customers-${new Date().toISOString().slice(0, 10)}.csv`,
            filteredRecords.map((r) => ({
                Name: r.clientName,
                Phone: r.clientPhone,
                Email: r.clientEmail,
                Package: r.packageName || r.destinationName,
                Destination: r.destinationName,
                'Travel date': r.travelDate,
                Adults: r.adults,
                Children: r.children,
                Status: STATUS_META[r.status]?.label || r.status,
                'Total (INR)': r.totalCost,
                'Received (INR)': r.advancePaid,
                'Balance (INR)': balanceOf(r),
                Created: r.createdAt,
                Notes: r.notes,
            })),
        );
    };

    const waMessage = (r: CustomerItinerary) => {
        const first = (r.clientName || '').split(' ')[0] || 'there';
        const trip = r.packageName || r.destinationName || 'your trip';
        if (r.status === 'confirmed' && balanceOf(r) > 0) {
            return `Hi ${first}, this is Travelzada. A quick reminder about ${trip}${r.travelDate ? ` on ${formatDate(r.travelDate)}` : ''}: the balance of ${formatINR(balanceOf(r))} is pending. Let us know if you need the payment details again.`;
        }
        if (r.status === 'draft' || r.status === 'sent') {
            return `Hi ${first}, this is Travelzada. Did you get a chance to look at the quote for ${trip}? Happy to tweak anything for you.`;
        }
        return `Hi ${first}, this is Travelzada regarding ${trip}.`;
    };

    const viewOptions: Array<{ value: View; label: string; count: number }> = [
        { value: 'all', label: 'All', count: counts.all },
        { value: 'quotes', label: 'Quotes', count: counts.quotes },
        { value: 'booked', label: 'Booked', count: counts.booked },
        { value: 'balance', label: 'Balance due', count: counts.balance },
        { value: 'completed', label: 'Trip done', count: counts.completed },
        { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
    ];

    const editBalance = (Number(editForm.totalCost) || 0) - (Number(editForm.advancePaid) || 0);

    return (
        <div>
            <PageHeader
                title="Customers"
                description="Every quote sent and every booking made. Upcoming trips are listed first."
                actions={
                    <>
                        <Button variant="secondary" onClick={handleExport} disabled={!filteredRecords.length}>
                            <Download className="w-4 h-4" /> Export CSV
                        </Button>
                        <Button variant="secondary" onClick={refresh} loading={isLoading}>
                            {!isLoading && <RefreshCw className="w-4 h-4" />} Refresh
                        </Button>
                        <Link href="/admin/itinerary" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-bordeaux-600 text-white hover:bg-bordeaux-700 shadow-sm">
                            <FileText className="w-4 h-4" /> New quote PDF
                        </Link>
                    </>
                }
            />

            <StatRow>
                <StatCard label="Upcoming trips" value={stats.upcoming} hint={`${stats.next30} in the next 30 days`} icon={<Plane className="w-5 h-5" />} tone="green" onClick={() => setView('booked')} />
                <StatCard label="Open quotes" value={stats.openQuotes} hint={`${formatINR(stats.quotesValue)} quoted`} icon={<FileText className="w-5 h-5" />} tone="blue" onClick={() => setView('quotes')} />
                <StatCard label="Payment received" value={formatINR(stats.received)} hint={`from ${stats.bookings} booking${stats.bookings === 1 ? '' : 's'}`} icon={<Wallet className="w-5 h-5" />} tone="wine" />
                <StatCard label="Balance due" value={formatINR(stats.due)} hint={`${stats.withBalance} booking${stats.withBalance === 1 ? '' : 's'} to collect`} icon={<IndianRupee className="w-5 h-5" />} tone="amber" onClick={() => setView('balance')} />
            </StatRow>

            <Toolbar>
                <FilterChips options={viewOptions} value={view} onChange={setView} />
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search name, phone, email, package…" className="w-full md:w-80" />
            </Toolbar>

            <Card padded={false}>
                {isLoading && !records.length ? (
                    <Spinner label="Loading customers…" />
                ) : filteredRecords.length === 0 ? (
                    <EmptyState
                        icon={<Users className="w-5 h-5" />}
                        title={records.length === 0 ? 'No customers yet' : 'Nothing matches'}
                        description={records.length === 0 ? 'Quotes you create with the quote PDF builder appear here automatically.' : 'Try another filter or search term.'}
                        action={records.length === 0 ? (
                            <Link href="/admin/itinerary" className="text-sm font-semibold text-bordeaux-700 hover:underline">Create a quote PDF</Link>
                        ) : undefined}
                    />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Customer</Th>
                                <Th>Trip</Th>
                                <Th>Travel date</Th>
                                <Th>Status</Th>
                                <Th className="text-right">Payment</Th>
                                <Th className="text-right">Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((r) => {
                                const days = daysUntil(r.travelDate);
                                const soon = r.status === 'confirmed' && days !== null && days >= 0 && days <= 7;
                                const balance = balanceOf(r);
                                const paidPct = r.totalCost > 0 ? Math.min(100, Math.round((r.advancePaid / r.totalCost) * 100)) : 0;
                                const isQuote = r.status === 'draft' || r.status === 'sent';
                                return (
                                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openRecord(r)}>
                                        <Td>
                                            <div className="font-semibold text-gray-900">{r.clientName || 'Unnamed'}</div>
                                            {r.clientPhone && (
                                                <a href={`tel:${r.clientPhone}`} onClick={(e) => e.stopPropagation()} className="text-xs text-gray-500 hover:text-bordeaux-700">
                                                    {r.clientPhone}
                                                </a>
                                            )}
                                        </Td>
                                        <Td>
                                            <div className="text-gray-900">{r.packageName || r.destinationName || '—'}</div>
                                            <div className="text-xs text-gray-500">
                                                {r.adults || 0} adult{r.adults === 1 ? '' : 's'}{r.children > 0 ? ` + ${r.children} child${r.children === 1 ? '' : 'ren'}` : ''}
                                            </div>
                                        </Td>
                                        <Td className="whitespace-nowrap">
                                            <div className="text-gray-900">{r.travelDate ? formatDate(r.travelDate) : '—'}</div>
                                            {days !== null && r.status !== 'cancelled' && (
                                                <div className={cx('text-xs', soon ? 'font-semibold text-amber-700' : 'text-gray-500')}>{tripCountdown(days)}</div>
                                            )}
                                        </Td>
                                        <Td>
                                            <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-start gap-1">
                                                <select
                                                    value={r.status}
                                                    onChange={(e) => handleStatusChange(r, e.target.value as Status)}
                                                    disabled={isUpdating}
                                                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-bordeaux-200"
                                                >
                                                    {STATUS_OPTIONS.map((s) => (
                                                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                                                    ))}
                                                </select>
                                                <Badge tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].kind}</Badge>
                                            </div>
                                        </Td>
                                        <Td className="text-right whitespace-nowrap">
                                            <div className="font-semibold text-gray-900">{formatINR(r.totalCost)}</div>
                                            {isQuote || r.status === 'cancelled' ? (
                                                <div className="text-xs text-gray-400">{isQuote ? 'quoted' : '—'}</div>
                                            ) : (
                                                <>
                                                    <div className="text-xs">
                                                        <span className="text-emerald-700">{formatINR(r.advancePaid)} paid</span>
                                                        {balance > 0 && <span className="text-amber-700"> · {formatINR(balance)} due</span>}
                                                    </div>
                                                    <div className="mt-1 ml-auto h-1.5 w-28 rounded-full bg-gray-100 overflow-hidden">
                                                        <div className={cx('h-full', balance > 0 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${paidPct}%` }} />
                                                    </div>
                                                </>
                                            )}
                                        </Td>
                                        <Td className="text-right">
                                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                {r.clientPhone && (
                                                    <>
                                                        <a href={waLink(r.clientPhone, waMessage(r))} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50">
                                                            <MessageCircle className="w-4 h-4" />
                                                        </a>
                                                        <a href={`tel:${r.clientPhone}`} title="Call" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                                                            <Phone className="w-4 h-4" />
                                                        </a>
                                                    </>
                                                )}
                                                <button type="button" onClick={() => handleDelete(r)} title="Delete" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </Td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Card>

            {/* Details + edit in one drawer: fewer clicks than a separate view/edit mode */}
            <Drawer
                open={!!selected}
                onClose={closeRecord}
                width="max-w-2xl"
                title={selected ? (
                    <span className="flex items-center gap-2">
                        {selected.clientName || 'Customer'}
                        <Badge tone={STATUS_META[selected.status].tone}>{STATUS_META[selected.status].label}</Badge>
                    </span>
                ) : ''}
                footer={
                    <>
                        <Button variant="ghost" onClick={closeRecord}>Cancel</Button>
                        <Button onClick={handleEditSave} loading={isUpdating}>Save changes</Button>
                    </>
                }
            >
                {selected && (
                    <div className="space-y-6">
                        {selected.clientPhone && (
                            <div className="flex flex-wrap gap-2">
                                <a href={waLink(selected.clientPhone, waMessage(selected))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                                    <MessageCircle className="w-4 h-4" /> WhatsApp
                                </a>
                                <a href={`tel:${selected.clientPhone}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50">
                                    <Phone className="w-4 h-4" /> Call
                                </a>
                            </div>
                        )}

                        <section>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Customer</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Field label="Name"><input className={inputClass} value={editForm.clientName || ''} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} /></Field>
                                <Field label="Phone"><input className={inputClass} value={editForm.clientPhone || ''} onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })} /></Field>
                                <Field label="Email"><input type="email" className={inputClass} value={editForm.clientEmail || ''} onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })} /></Field>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Trip</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Field label="Package" className="col-span-2"><input className={inputClass} value={editForm.packageName || ''} onChange={(e) => setEditForm({ ...editForm, packageName: e.target.value })} /></Field>
                                <Field label="Destination" className="col-span-2"><input className={inputClass} value={editForm.destinationName || ''} onChange={(e) => setEditForm({ ...editForm, destinationName: e.target.value })} /></Field>
                                <Field label="Travel date" className="col-span-2"><input type="date" className={inputClass} value={(editForm.travelDate || '').slice(0, 10)} onChange={(e) => setEditForm({ ...editForm, travelDate: e.target.value })} /></Field>
                                <Field label="Adults"><input type="number" min={0} className={inputClass} value={editForm.adults ?? 0} onChange={(e) => setEditForm({ ...editForm, adults: parseInt(e.target.value) || 0 })} /></Field>
                                <Field label="Children"><input type="number" min={0} className={inputClass} value={editForm.children ?? 0} onChange={(e) => setEditForm({ ...editForm, children: parseInt(e.target.value) || 0 })} /></Field>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Status & payment</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Field label="Status" className="sm:col-span-3">
                                    <select className={inputClass} value={editForm.status || 'draft'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Status })}>
                                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                                    </select>
                                </Field>
                                <Field label="Total price (₹)"><input type="number" min={0} className={inputClass} value={editForm.totalCost ?? 0} onChange={(e) => setEditForm({ ...editForm, totalCost: parseFloat(e.target.value) || 0 })} /></Field>
                                <Field label="Received so far (₹)"><input type="number" min={0} className={inputClass} value={editForm.advancePaid ?? 0} onChange={(e) => setEditForm({ ...editForm, advancePaid: parseFloat(e.target.value) || 0 })} /></Field>
                                <Field label="Balance due" hint="Total minus received">
                                    <div className={cx('rounded-xl border px-3 py-2 text-sm font-bold', editBalance > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
                                        {formatINR(editBalance)}
                                    </div>
                                </Field>
                            </div>
                        </section>

                        {(selected.hotels?.length > 0 || selected.flights?.length > 0) && (
                            <section className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-900">Hotels & flights</h4>
                                {selected.hotels?.map((h, i) => (
                                    <div key={`h${i}`} className="rounded-xl bg-gray-50 p-3 text-sm">
                                        <div className="font-medium text-gray-900">{h.hotelName}{h.city ? ` · ${h.city}` : ''}</div>
                                        <div className="text-xs text-gray-500">{formatDate(h.checkIn)} → {formatDate(h.checkOut)}{h.roomType ? ` · ${h.roomType}` : ''}{h.mealPlan ? ` · ${h.mealPlan}` : ''}</div>
                                    </div>
                                ))}
                                {selected.flights?.map((f, i) => (
                                    <div key={`f${i}`} className="rounded-xl bg-gray-50 p-3 text-sm">
                                        <div className="font-medium text-gray-900">{f.airline} {f.flightNumber}</div>
                                        <div className="text-xs text-gray-500">{f.departureCity} → {f.arrivalCity} · {formatDate(f.date)} · {f.departureTime}–{f.arrivalTime}</div>
                                    </div>
                                ))}
                            </section>
                        )}

                        <section>
                            <Field label="Notes">
                                <textarea rows={4} className={inputClass} value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Anything the team should know about this customer…" />
                            </Field>
                            <div className="mt-2 flex gap-2">
                                <input
                                    className={inputClass}
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }}
                                    placeholder="Quick dated note (saved right away)…"
                                />
                                <Button variant="secondary" onClick={handleAddNote} disabled={isUpdating || !newNote.trim()}>Add</Button>
                            </div>
                        </section>

                        {selected.customerReview && (
                            <section>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer review</h4>
                                <div className="rounded-xl bg-amber-50 p-3 text-sm">
                                    <div className="text-amber-500">{'★'.repeat(selected.customerReview.rating)}<span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - selected.customerReview.rating))}</span></div>
                                    <div className="mt-1 text-gray-700">{selected.customerReview.comment}</div>
                                    <div className="mt-1 text-xs text-gray-400">{formatDate(selected.customerReview.date)}</div>
                                </div>
                            </section>
                        )}

                        <section>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-gray-400" /> History</h4>
                            {selected.history?.length ? (
                                <ol className="space-y-2 max-h-56 overflow-y-auto">
                                    {[...selected.history].reverse().map((h, i) => (
                                        <li key={i} className="flex gap-3 text-sm">
                                            <span className="mt-1.5 w-2 h-2 rounded-full bg-bordeaux-500 shrink-0" />
                                            <span>
                                                <span className="font-medium text-gray-900">{h.action}</span>
                                                {h.details && <span className="block text-gray-500">{h.details}</span>}
                                                <span className="block text-xs text-gray-400">{formatDate(h.timestamp, true)}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-gray-500">No history yet.</p>
                            )}
                            <p className="mt-3 text-xs text-gray-400">Created {formatDate(selected.createdAt, true)}{selected.createdBy ? ` by ${selected.createdBy}` : ''}</p>
                        </section>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
