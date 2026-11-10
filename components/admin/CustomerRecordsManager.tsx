'use client';

/**
 * Customers = confirmed bookings only (Firestore `customer_itineraries`).
 *   shown here: status confirmed | completed, and cancelled records that were booked first (see `wasBooked`).
 *   NOT shown: quotes (draft | sent) and lost quotes — those live in Sent Quotes (/admin/quotes, QuotesManager).
 * Status values are unchanged: draft | sent | confirmed | completed | cancelled.
 */
import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Download, IndianRupee, MessageCircle, Phone, Plane, RefreshCw, Trash2, Users, Wallet, CalendarDays, FileText } from 'lucide-react';
import {
    PageHeader, StatRow, StatCard, Card, Toolbar, SearchInput, FilterChips, Button, Table, Th, Td,
    EmptyState, Spinner, formatDate, formatINR, exportToCsv, toMillis, cx,
} from './ui';
import { PhoneLink, inboxHref, redactForExport, usePhoneAccess } from '@/lib/admin/privacy';
import {
    ItineraryRecord, Status, STATUS_META, recordRef, daysUntil, tripCountdown, balanceOf, isCustomerRecord,
    useItineraryRecords, statusChangePatch, writeRecord, RecordDrawer,
} from './quotes/records';

interface CustomerRecordsManagerProps {
    onRefresh?: () => void;
}

/** Statuses a booking can move between from the row (quotes are handled in Sent Quotes) */
const BOOKING_STATUSES: Status[] = ['confirmed', 'completed', 'cancelled'];

type View = 'upcoming' | 'balance' | 'completed' | 'cancelled' | 'all';

/** Last day of the trip: latest hotel check-out / flight date, else the travel date */
function tripEndDays(r: ItineraryRecord): number | null {
    const dates = [
        ...(r.hotels || []).map((h) => h.checkOut),
        ...(r.flights || []).map((f) => f.date),
    ].map((d) => daysUntil(d)).filter((d): d is number => d !== null);
    const start = daysUntil(r.travelDate);
    if (start !== null) dates.push(start);
    return dates.length ? Math.max(...dates) : null;
}

const isTravellingNow = (r: ItineraryRecord) => {
    if (r.status !== 'confirmed') return false;
    const start = daysUntil(r.travelDate);
    const end = tripEndDays(r);
    return start !== null && end !== null && start <= 0 && end >= 0;
};

/** Booked trip that hasn't finished yet (or has no date yet) */
const isUpcomingBooking = (r: ItineraryRecord) => {
    if (r.status !== 'confirmed') return false;
    const end = tripEndDays(r);
    return end === null || end >= 0;
};

export default function CustomerRecordsManager({ onRefresh }: CustomerRecordsManagerProps) {
    const { canSeePhone } = usePhoneAccess();
    const { records: allRecords, isLoading, fetchRecords, patchRecord, removeRecord } = useItineraryRecords();
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<View>('upcoming');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Bookings only — quotes live in Sent Quotes
    const records = useMemo(() => allRecords.filter(isCustomerRecord), [allRecords]);

    const refresh = useCallback(async () => {
        await fetchRecords();
        onRefresh?.();
    }, [fetchRecords, onRefresh]);

    const selected = useMemo(() => records.find((r) => r.id === selectedId) || null, [records, selectedId]);

    // ---- Stats -------------------------------------------------------------
    const stats = useMemo(() => {
        const future = records.filter((r) => r.status === 'confirmed' && (daysUntil(r.travelDate) ?? -1) >= 0);
        const next30 = future.filter((r) => (daysUntil(r.travelDate) ?? 999) <= 30);
        const now = records.filter(isTravellingNow);
        const next7 = records.filter((r) => r.status === 'confirmed' && !isTravellingNow(r) && (() => { const d = daysUntil(r.travelDate); return d !== null && d >= 0 && d <= 7; })());
        const bookings = records.filter((r) => r.status === 'confirmed' || r.status === 'completed');
        const received = bookings.reduce((s, r) => s + (Number(r.advancePaid) || 0), 0);
        const withBalance = bookings.filter((r) => balanceOf(r) > 0);
        const due = withBalance.reduce((s, r) => s + balanceOf(r), 0);
        return { upcoming: future.length, next30: next30.length, now: now.length, next7: next7.length, received, bookings: bookings.length, due, withBalance: withBalance.length };
    }, [records]);

    const counts = useMemo(() => ({
        upcoming: records.filter(isUpcomingBooking).length,
        balance: records.filter((r) => (r.status === 'confirmed' || r.status === 'completed') && balanceOf(r) > 0).length,
        completed: records.filter((r) => r.status === 'completed').length,
        cancelled: records.filter((r) => r.status === 'cancelled').length,
        all: records.length,
    }), [records]);

    // ---- Filter + sort: travelling now, then soonest trips, then everything else newest first
    const filteredRecords = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const list = records.filter((r) => {
            if (view === 'upcoming' && !isUpcomingBooking(r)) return false;
            if (view === 'balance' && !((r.status === 'confirmed' || r.status === 'completed') && balanceOf(r) > 0)) return false;
            if (view === 'completed' && r.status !== 'completed') return false;
            if (view === 'cancelled' && r.status !== 'cancelled') return false;
            if (!q) return true;
            // Phone is searchable for admins only
            return [r.clientName, r.clientEmail, canSeePhone ? r.clientPhone : '', r.packageName, r.destinationName, r.quoteRef]
                .some((v) => String(v || '').toLowerCase().includes(q));
        });
        const rank = (r: ItineraryRecord) => {
            if (isTravellingNow(r)) return 0;
            const d = daysUntil(r.travelDate);
            if (r.status === 'confirmed' && d !== null && d >= 0) return 1;
            if (r.status === 'confirmed' && d === null) return 2;
            return 3;
        };
        return list.sort((a, b) => {
            const ra = rank(a), rb = rank(b);
            if (ra !== rb) return ra - rb;
            if (ra <= 1) return toMillis(a.travelDate) - toMillis(b.travelDate);
            return toMillis(b.bookedAt || b.createdAt) - toMillis(a.bookedAt || a.createdAt);
        });
    }, [records, searchTerm, view, canSeePhone]);

    // ---- Writes --------------------------------------------------------------
    const handleStatusChange = async (record: ItineraryRecord, newStatus: Status) => {
        if (!record.id || newStatus === record.status) return;
        setIsUpdating(true);
        try {
            const patch = statusChangePatch(record, newStatus, new Date().toISOString());
            await writeRecord(record.id, patch);
            patchRecord(record.id, patch);
            onRefresh?.();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (record: ItineraryRecord) => {
        if (!record.id || !db) return;
        if (!confirm(`Delete the record for ${record.clientName}? This cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, 'customer_itineraries', record.id));
            removeRecord(record.id);
            if (selectedId === record.id) setSelectedId(null);
            onRefresh?.();
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('Failed to delete record');
        }
    };

    const closeRecord = useCallback(() => setSelectedId(null), []);
    const onPatched = useCallback((id: string, patch: Partial<ItineraryRecord>) => {
        patchRecord(id, patch);
        onRefresh?.();
    }, [patchRecord, onRefresh]);

    const handleExport = () => {
        exportToCsv(
            `travelzada-customers-${new Date().toISOString().slice(0, 10)}.csv`,
            redactForExport(filteredRecords.map((r) => ({
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
                'Quote ref': r.quoteRef,
                Booked: r.bookedAt || '',
                Created: r.createdAt,
                Notes: r.notes,
            })), canSeePhone, ['Phone']),
        );
    };

    const viewOptions: Array<{ value: View; label: string; count: number }> = [
        { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
        { value: 'balance', label: 'Balance due', count: counts.balance },
        { value: 'completed', label: 'Trip done', count: counts.completed },
        { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        { value: 'all', label: 'All', count: counts.all },
    ];

    return (
        <div>
            <PageHeader
                title="Customers"
                description="Confirmed bookings — trips, payments and balance due"
                actions={
                    <>
                        <Button variant="secondary" onClick={handleExport} disabled={!filteredRecords.length}>
                            <Download className="w-4 h-4" /> Export CSV
                        </Button>
                        <Button variant="secondary" onClick={refresh} loading={isLoading}>
                            {!isLoading && <RefreshCw className="w-4 h-4" />} Refresh
                        </Button>
                        <Link href="/admin/quotes" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-white text-gray-800 border border-gray-300 hover:bg-gray-50">
                            <FileText className="w-4 h-4" /> Sent Quotes
                        </Link>
                    </>
                }
            />

            <StatRow>
                <StatCard label="Upcoming trips" value={stats.upcoming} hint={`${stats.next30} in the next 30 days`} icon={<Plane className="w-5 h-5" />} tone="green" onClick={() => setView('upcoming')} />
                <StatCard label="Travelling now / next 7 days" value={stats.now + stats.next7} hint={`${stats.now} travelling now · ${stats.next7} leaving soon`} icon={<CalendarDays className="w-5 h-5" />} tone="blue" onClick={() => setView('upcoming')} />
                <StatCard label="Payment received" value={formatINR(stats.received)} hint={`from ${stats.bookings} booking${stats.bookings === 1 ? '' : 's'}`} icon={<Wallet className="w-5 h-5" />} tone="wine" />
                <StatCard label="Balance due" value={formatINR(stats.due)} hint={`${stats.withBalance} booking${stats.withBalance === 1 ? '' : 's'} to collect`} icon={<IndianRupee className="w-5 h-5" />} tone="amber" onClick={() => setView('balance')} />
            </StatRow>

            <Toolbar>
                <FilterChips options={viewOptions} value={view} onChange={setView} />
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder={canSeePhone ? 'Search name, phone, email, package…' : 'Search name, email, package…'} className="w-full md:w-80" />
            </Toolbar>

            <Card padded={false}>
                {isLoading && !records.length ? (
                    <Spinner label="Loading customers…" />
                ) : filteredRecords.length === 0 ? (
                    <EmptyState
                        icon={<Users className="w-5 h-5" />}
                        title={records.length === 0 ? 'No bookings yet' : 'Nothing matches'}
                        description={records.length === 0 ? 'When a customer books, open the quote in Sent Quotes and click “Mark as booked” — it moves here.' : 'Try another filter or search term.'}
                        action={records.length === 0 ? (
                            <Link href="/admin/quotes" className="text-sm font-semibold text-bordeaux-700 hover:underline">Go to Sent Quotes</Link>
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
                                const now = isTravellingNow(r);
                                const soon = r.status === 'confirmed' && days !== null && days >= 0 && days <= 7;
                                const over = r.status === 'confirmed' && !isUpcomingBooking(r);
                                const balance = balanceOf(r);
                                const paidPct = r.totalCost > 0 ? Math.min(100, Math.round((r.advancePaid / r.totalCost) * 100)) : 0;
                                return (
                                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(r.id || null)}>
                                        <Td>
                                            <div className="font-semibold text-gray-900">{r.clientName || 'Unnamed'}</div>
                                            {r.clientPhone && (
                                                <div><PhoneLink phone={r.clientPhone} name={r.clientName} refPath={recordRef(r)} showCall={false} /></div>
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
                                            {r.status !== 'cancelled' && (
                                                now ? <div className="text-xs font-semibold text-emerald-700">Travelling now</div>
                                                : over ? <div className="text-xs font-semibold text-amber-700">Trip over? Mark as Trip done</div>
                                                : days !== null && <div className={cx('text-xs', soon ? 'font-semibold text-amber-700' : 'text-gray-500')}>{tripCountdown(days)}</div>
                                            )}
                                        </Td>
                                        <Td>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={r.status}
                                                    onChange={(e) => handleStatusChange(r, e.target.value as Status)}
                                                    disabled={isUpdating}
                                                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-bordeaux-200"
                                                >
                                                    {BOOKING_STATUSES.map((s) => (
                                                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </Td>
                                        <Td className="text-right whitespace-nowrap">
                                            <div className="font-semibold text-gray-900">{formatINR(r.totalCost)}</div>
                                            {r.status === 'cancelled' ? (
                                                <div className="text-xs text-gray-400">{r.advancePaid > 0 ? `${formatINR(r.advancePaid)} was paid` : '—'}</div>
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
                                                        <Link href={inboxHref({ ref: recordRef(r), name: r.clientName }, canSeePhone)} title="WhatsApp (business inbox)" className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50">
                                                            <MessageCircle className="w-4 h-4" />
                                                        </Link>
                                                        {canSeePhone && (
                                                            <a href={`tel:${r.clientPhone}`} title="Call (admin only)" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                                                                <Phone className="w-4 h-4" />
                                                            </a>
                                                        )}
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

            <RecordDrawer record={selected} canSeePhone={canSeePhone} onClose={closeRecord} onPatched={onPatched} />
        </div>
    );
}
