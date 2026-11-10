'use client';

/**
 * Shared helpers for `customer_itineraries` — used by both admin pages built on that collection:
 *   - /admin/quotes    (Sent Quotes)  → status draft | sent (+ quotes marked lost)
 *   - /admin/customers (Customers)    → status confirmed | completed (+ bookings cancelled after confirmation)
 * Status values are unchanged: draft | sent | confirmed | completed | cancelled.
 * A cancelled record counts as a cancelled *booking* only if it was ever booked (see `wasBooked`);
 * otherwise it is a lost quote.
 */
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarClock, MessageCircle, Phone } from 'lucide-react';
import { CustomerItinerary, HistoryEntry } from '../types';
import { Badge, Button, Drawer, Field, inputClass, formatDate, formatINR, toMillis, cx } from '../ui';
import { inboxHref, maskPhone } from '@/lib/admin/privacy';

/** Extra fields written by the quote builder / booking flow that aren't on the base type */
export type ItineraryRecord = CustomerItinerary & {
    quoteRef?: string;
    validUntil?: string;
    fileName?: string;
    bookedAt?: string;
    lostReason?: string;
    lostAt?: string;
};

export type Status = CustomerItinerary['status'];
export const STATUS_OPTIONS: Status[] = ['draft', 'sent', 'confirmed', 'completed', 'cancelled'];

export const STATUS_META: Record<Status, { label: string; tone: 'gray' | 'blue' | 'green' | 'purple' | 'red' }> = {
    draft: { label: 'Quote draft', tone: 'gray' },
    sent: { label: 'Quote sent', tone: 'blue' },
    confirmed: { label: 'Booked', tone: 'green' },
    completed: { label: 'Trip done', tone: 'purple' },
    cancelled: { label: 'Cancelled', tone: 'red' },
};

/** Firestore path of the record — the WhatsApp inbox resolves the number from it */
export const recordRef = (r: { id?: string }) => `customer_itineraries/${r.id}`;

export const DAY = 86400000;
export const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

/** Days from today until a date (negative = in the past, null = no date) */
export function daysUntil(dateStr?: string): number | null {
    const t = toMillis(dateStr);
    if (!t) return null;
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - startOfToday()) / DAY);
}

export function tripCountdown(days: number | null): string {
    if (days === null) return '';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days > 1) return `in ${days} days`;
    if (days === -1) return 'Yesterday';
    return `${Math.abs(days)} days ago`;
}

export const balanceOf = (r: CustomerItinerary) => Math.max(0, (Number(r.totalCost) || 0) - (Number(r.advancePaid) || 0));

export const isQuote = (r: CustomerItinerary) => r.status === 'draft' || r.status === 'sent';

/** Was this record ever a confirmed booking? (bookedAt set, or history shows it was confirmed/booked) */
export function wasBooked(r: ItineraryRecord): boolean {
    if (r.bookedAt) return true;
    return (r.history || []).some((h) => /confirmed|completed|booked/i.test(String(h?.action || '')));
}

/** Belongs on /admin/customers: bookings, trips done, and bookings cancelled after confirmation */
export const isCustomerRecord = (r: ItineraryRecord) =>
    r.status === 'confirmed' || r.status === 'completed' || (r.status === 'cancelled' && wasBooked(r));

/** A quote the customer said no to (cancelled without ever being booked) — shown under Sent Quotes → Lost */
export const isLostQuote = (r: ItineraryRecord) => r.status === 'cancelled' && !wasBooked(r);

const asIso = (v: any): string => v?.toDate?.()?.toISOString?.() || (typeof v === 'string' ? v : '') || '';

/** Loads every customer_itineraries doc (newest first). Pages filter client-side. */
export function useItineraryRecords() {
    const [records, setRecords] = useState<ItineraryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!db) return;
            const q = query(collection(db, 'customer_itineraries'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data: ItineraryRecord[] = [];
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
                    createdAt: asIso(d.createdAt),
                    updatedAt: asIso(d.updatedAt),
                    createdBy: d.createdBy || '',
                    quoteRef: d.quoteRef || '',
                    validUntil: asIso(d.validUntil),
                    fileName: d.fileName || '',
                    bookedAt: asIso(d.bookedAt) || undefined,
                    lostReason: d.lostReason || '',
                    lostAt: asIso(d.lostAt) || undefined,
                });
            });
            setRecords(data);
        } catch (error) {
            console.error('Error fetching customer itineraries:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    /** Patch one record locally after a write */
    const patchRecord = useCallback((id: string, patch: Partial<ItineraryRecord>) => {
        setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }, []);
    const removeRecord = useCallback((id: string) => {
        setRecords((prev) => prev.filter((r) => r.id !== id));
    }, []);

    return { records, isLoading, fetchRecords, patchRecord, removeRecord };
}

/**
 * Fields to write when a record's status changes: history entry, and `bookedAt` the first time it becomes a booking
 * (so a later cancellation is still recognised as a cancelled booking, not a lost quote).
 */
export function statusChangePatch(record: ItineraryRecord, newStatus: Status, now: string, action?: string, details?: string): Partial<ItineraryRecord> {
    const entry: HistoryEntry = {
        action: action || `Status changed to ${newStatus}`,
        timestamp: now,
        details: details || `Previous status: ${record.status}`,
    };
    const patch: Partial<ItineraryRecord> = {
        status: newStatus,
        history: [...(record.history || []), entry],
        updatedAt: now,
    };
    if ((newStatus === 'confirmed' || newStatus === 'completed') && !record.bookedAt) patch.bookedAt = now;
    return patch;
}

/** Updates the Firestore doc with a patch (JSON-safe) */
export async function writeRecord(id: string, patch: Partial<ItineraryRecord>) {
    if (!db) throw new Error('Database not ready');
    const clean = JSON.parse(JSON.stringify(patch));
    await updateDoc(doc(db, 'customer_itineraries', id), clean);
}

/** Details + edit drawer shared by Customers and Sent Quotes (fewer clicks than a separate view/edit mode). */
export function RecordDrawer({
    record,
    canSeePhone,
    onClose,
    onPatched,
    extraActions,
}: {
    record: ItineraryRecord | null;
    canSeePhone: boolean;
    onClose: () => void;
    onPatched: (id: string, patch: Partial<ItineraryRecord>) => void;
    /** Extra buttons in the action row (e.g. Mark as booked) */
    extraActions?: React.ReactNode;
}) {
    const [editForm, setEditForm] = useState<Partial<ItineraryRecord>>({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        if (record) {
            setEditForm({ ...record });
            setNewNote('');
        }
        // Reset only when another record is opened
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record?.id]);

    const handleAddNote = async () => {
        if (!record?.id || !newNote.trim()) return;
        setIsUpdating(true);
        try {
            const now = new Date().toISOString();
            const historyEntry: HistoryEntry = { action: 'Note added', timestamp: now, details: newNote.trim() };
            const updatedHistory = [...(record.history || []), historyEntry];
            const stamp = `[${new Date().toLocaleDateString('en-IN')}] ${newNote.trim()}`;
            const updatedNotes = record.notes ? `${record.notes}\n\n${stamp}` : stamp;
            const patch = { notes: updatedNotes, history: updatedHistory, updatedAt: now };
            await writeRecord(record.id, patch);
            setNewNote('');
            onPatched(record.id, patch);
            setEditForm((f) => ({ ...f, notes: updatedNotes }));
        } catch (error) {
            console.error('Error adding note:', error);
            alert('Failed to add note');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEditSave = async () => {
        if (!record?.id) return;
        setIsUpdating(true);
        try {
            const now = new Date().toISOString();
            const totalCost = Number(editForm.totalCost) || 0;
            const advancePaid = Number(editForm.advancePaid) || 0;
            const newStatus = (editForm.status || record.status) as Status;
            let history = [...(record.history || []), { action: 'Record updated', timestamp: now, details: 'Details modified by admin' } as HistoryEntry];
            const extra: Partial<ItineraryRecord> = {};
            if (newStatus !== record.status) {
                const sp = statusChangePatch({ ...record, history }, newStatus, now);
                history = sp.history || history;
                if (sp.bookedAt) extra.bookedAt = sp.bookedAt;
            }
            const patch: Partial<ItineraryRecord> = {
                clientName: editForm.clientName || '',
                clientEmail: editForm.clientEmail || '',
                // Only admins can change the number (non-admins see it masked + read-only)
                clientPhone: (canSeePhone ? editForm.clientPhone : record.clientPhone) || '',
                packageName: editForm.packageName || '',
                destinationName: editForm.destinationName || '',
                travelDate: editForm.travelDate || '',
                adults: Number(editForm.adults) || 0,
                children: Number(editForm.children) || 0,
                totalCost,
                advancePaid,
                balanceDue: totalCost - advancePaid,
                notes: editForm.notes || '',
                status: newStatus,
                history,
                updatedAt: now,
                ...extra,
            };
            await writeRecord(record.id, patch);
            onPatched(record.id, patch);
            onClose();
        } catch (error) {
            console.error('Error updating record:', error);
            alert('Failed to update record');
        } finally {
            setIsUpdating(false);
        }
    };

    const editBalance = (Number(editForm.totalCost) || 0) - (Number(editForm.advancePaid) || 0);

    return (
        <Drawer
            open={!!record}
            onClose={onClose}
            width="max-w-2xl"
            title={record ? (
                <span className="flex items-center gap-2">
                    {record.clientName || 'Customer'}
                    <Badge tone={STATUS_META[record.status].tone}>{STATUS_META[record.status].label}</Badge>
                    {record.quoteRef && <span className="font-mono text-xs text-gray-400">{record.quoteRef}</span>}
                </span>
            ) : ''}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleEditSave} loading={isUpdating}>Save changes</Button>
                </>
            }
        >
            {record && (
                <div className="space-y-6">
                    {(record.clientPhone || extraActions) && (
                        <div className="flex flex-wrap gap-2">
                            {record.clientPhone && (
                                <Link href={inboxHref({ ref: recordRef(record), name: record.clientName }, canSeePhone)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                                    <MessageCircle className="w-4 h-4" /> WhatsApp
                                </Link>
                            )}
                            {record.clientPhone && canSeePhone && (
                                <a href={`tel:${record.clientPhone}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50">
                                    <Phone className="w-4 h-4" /> Call
                                </a>
                            )}
                            {extraActions}
                        </div>
                    )}

                    {record.lostReason && record.status === 'cancelled' && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            <b>Lost:</b> {record.lostReason}{record.lostAt ? ` · ${formatDate(record.lostAt)}` : ''}
                        </div>
                    )}

                    <section>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Customer</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Field label="Name"><input className={inputClass} value={editForm.clientName || ''} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} /></Field>
                            <Field label="Phone">
                                {canSeePhone ? (
                                    <input className={inputClass} value={editForm.clientPhone || ''} onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })} />
                                ) : (
                                    <input className={cx(inputClass, 'bg-gray-50 text-gray-500')} value={maskPhone(record.clientPhone)} placeholder="Not provided" readOnly title="Only admins can see or change the number" />
                                )}
                            </Field>
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
                        {(record.validUntil || record.fileName) && (
                            <p className="mt-2 text-xs text-gray-500">
                                {record.validUntil && <>Quote valid till {formatDate(record.validUntil)}</>}
                                {record.validUntil && record.fileName && ' · '}
                                {record.fileName && <span className="font-mono">{record.fileName}</span>}
                            </p>
                        )}
                    </section>

                    <section>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Status & payment</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Field label="Status" className="sm:col-span-3" hint="Quotes (draft / sent) live in Sent Quotes; Booked / Trip done live in Customers.">
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

                    {(record.hotels?.length > 0 || record.flights?.length > 0) && (
                        <section className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-900">Hotels & flights</h4>
                            {record.hotels?.map((h, i) => (
                                <div key={`h${i}`} className="rounded-xl bg-gray-50 p-3 text-sm">
                                    <div className="font-medium text-gray-900">{h.hotelName}{h.city ? ` · ${h.city}` : ''}</div>
                                    <div className="text-xs text-gray-500">{formatDate(h.checkIn)} → {formatDate(h.checkOut)}{h.roomType ? ` · ${h.roomType}` : ''}{h.mealPlan ? ` · ${h.mealPlan}` : ''}</div>
                                </div>
                            ))}
                            {record.flights?.map((f, i) => (
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

                    {record.customerReview && (
                        <section>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer review</h4>
                            <div className="rounded-xl bg-amber-50 p-3 text-sm">
                                <div className="text-amber-500">{'★'.repeat(record.customerReview.rating)}<span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - record.customerReview.rating))}</span></div>
                                <div className="mt-1 text-gray-700">{record.customerReview.comment}</div>
                                <div className="mt-1 text-xs text-gray-400">{formatDate(record.customerReview.date)}</div>
                            </div>
                        </section>
                    )}

                    <section>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-gray-400" /> History</h4>
                        {record.history?.length ? (
                            <ol className="space-y-2 max-h-56 overflow-y-auto">
                                {[...record.history].reverse().map((h, i) => (
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
                        <p className="mt-3 text-xs text-gray-400">
                            Created {formatDate(record.createdAt, true)}{record.createdBy ? ` by ${record.createdBy}` : ''}
                            {record.bookedAt ? ` · Booked ${formatDate(record.bookedAt, true)}` : ''}
                        </p>
                    </section>
                </div>
            )}
        </Drawer>
    );
}

/** Small centred dialog (Mark as booked / Mark as lost) */
export function Dialog({ open, title, onClose, children, footer }: { open: boolean; title: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
            <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
                <div className="border-b border-gray-200 px-5 py-4 font-semibold text-gray-900">{title}</div>
                <div className="p-5 space-y-4">{children}</div>
                {footer && <div className="border-t border-gray-200 px-5 py-3 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>
    );
}
