'use client';

/**
 * Sent Quotes (/admin/quotes): quotes shared with customers — `customer_itineraries` with status draft | sent.
 * Records are created automatically by the quote PDF builder (/admin/itinerary).
 *  - "Mark as booked" → status confirmed (+ advance received, bookedAt, history "Booked") → moves to Customers.
 *  - "Mark as lost"   → status cancelled + lostReason (never booked, so it does NOT show in Customers → Cancelled).
 */
import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AlarmClock, CheckCircle2, Clock, Download, FileText, IndianRupee, Plus, RefreshCw, Send, Trash2, X, XCircle } from 'lucide-react';
import {
    PageHeader, StatRow, StatCard, Card, Toolbar, SearchInput, FilterChips, Button, Table, Th, Td, Field, inputClass,
    Badge, EmptyState, Spinner, formatDate, formatINR, exportToCsv, toMillis, timeAgo, cx,
} from '../ui';
import { PhoneLink, WhatsAppInboxButton, redactForExport, usePhoneAccess } from '@/lib/admin/privacy';
import {
    ItineraryRecord, STATUS_META, recordRef, daysUntil, isQuote, isLostQuote, DAY,
    useItineraryRecords, statusChangePatch, writeRecord, RecordDrawer, Dialog,
} from './records';

type View = 'all' | 'sent' | 'draft' | 'expiring' | 'expired' | 'stale' | 'lost';

const LOST_REASONS = ['Price too high', 'Booked with another agency', 'No reply', 'Plans changed / trip cancelled', 'Dates not available', 'Other'];

const validDays = (r: ItineraryRecord) => daysUntil(r.validUntil);
const isExpired = (r: ItineraryRecord) => { const d = validDays(r); return d !== null && d < 0; };
const isExpiringSoon = (r: ItineraryRecord) => { const d = validDays(r); return d !== null && d >= 0 && d <= 7; };
const ageDays = (r: ItineraryRecord) => { const t = toMillis(r.createdAt); return t ? Math.floor((Date.now() - t) / DAY) : 0; };
const isStale = (r: ItineraryRecord) => ageDays(r) > 7;

export default function QuotesManager() {
    const { canSeePhone } = usePhoneAccess();
    const { records: allRecords, isLoading, fetchRecords, patchRecord, removeRecord } = useItineraryRecords();
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<View>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ text: string; link?: { href: string; label: string } } | null>(null);

    // Book / lose dialogs
    const [bookFor, setBookFor] = useState<ItineraryRecord | null>(null);
    const [bookTotal, setBookTotal] = useState(0);
    const [bookAdvance, setBookAdvance] = useState(0);
    const [bookNote, setBookNote] = useState('');
    const [loseFor, setLoseFor] = useState<ItineraryRecord | null>(null);
    const [loseReason, setLoseReason] = useState(LOST_REASONS[0]);
    const [loseDetails, setLoseDetails] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const quotes = useMemo(() => allRecords.filter(isQuote), [allRecords]);
    const lost = useMemo(() => allRecords.filter(isLostQuote), [allRecords]);
    // Drawer can show open quotes and lost quotes
    const selected = useMemo(() => allRecords.find((r) => r.id === selectedId && (isQuote(r) || isLostQuote(r))) || null, [allRecords, selectedId]);

    const showToast = (text: string, link?: { href: string; label: string }) => {
        setToast({ text, link });
        window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 8000);
    };

    // ---- Stats -------------------------------------------------------------
    const stats = useMemo(() => {
        const sent = quotes.filter((r) => r.status === 'sent').length;
        return {
            open: quotes.length,
            sent,
            drafts: quotes.length - sent,
            value: quotes.reduce((s, r) => s + (Number(r.totalCost) || 0), 0),
            expiring: quotes.filter(isExpiringSoon).length,
            expired: quotes.filter(isExpired).length,
            stale: quotes.filter(isStale).length,
        };
    }, [quotes]);

    const counts: Record<View, number> = {
        all: quotes.length,
        sent: stats.sent,
        draft: stats.drafts,
        expiring: stats.expiring,
        expired: stats.expired,
        stale: stats.stale,
        lost: lost.length,
    };

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const base = view === 'lost' ? lost : quotes;
        const list = base.filter((r) => {
            if (view === 'sent' && r.status !== 'sent') return false;
            if (view === 'draft' && r.status !== 'draft') return false;
            if (view === 'expiring' && !isExpiringSoon(r)) return false;
            if (view === 'expired' && !isExpired(r)) return false;
            if (view === 'stale' && !isStale(r)) return false;
            if (!q) return true;
            return [r.clientName, r.clientEmail, canSeePhone ? r.clientPhone : '', r.packageName, r.destinationName, r.quoteRef]
                .some((v) => String(v || '').toLowerCase().includes(q));
        });
        return list.sort((a, b) => toMillis(b.lostAt || b.createdAt) - toMillis(a.lostAt || a.createdAt));
    }, [quotes, lost, view, searchTerm, canSeePhone]);

    // ---- Writes --------------------------------------------------------------
    const markSent = async (r: ItineraryRecord) => {
        if (!r.id) return;
        setBusyId(r.id);
        try {
            const patch = statusChangePatch(r, 'sent', new Date().toISOString(), 'Quote sent', 'Marked as sent to the customer');
            await writeRecord(r.id, patch);
            patchRecord(r.id, patch);
        } catch (e) {
            console.error('Error marking quote sent:', e);
            alert('Failed to update the quote');
        } finally {
            setBusyId(null);
        }
    };

    const openBook = (r: ItineraryRecord) => {
        setBookFor(r);
        setBookTotal(Number(r.totalCost) || 0);
        setBookAdvance(Number(r.advancePaid) || 0);
        setBookNote('');
    };

    const confirmBook = async () => {
        const r = bookFor;
        if (!r?.id) return;
        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const totalCost = Math.max(0, Number(bookTotal) || 0);
            const advancePaid = Math.max(0, Number(bookAdvance) || 0);
            const details = [
                `Booked from Sent Quotes${r.quoteRef ? ` (${r.quoteRef})` : ''}`,
                `Total ${formatINR(totalCost)} · advance received ${formatINR(advancePaid)}`,
                bookNote.trim(),
            ].filter(Boolean).join('. ');
            const patch: Partial<ItineraryRecord> = {
                ...statusChangePatch(r, 'confirmed', now, 'Booked', details),
                bookedAt: now,
                totalCost,
                advancePaid,
                balanceDue: totalCost - advancePaid,
            };
            await writeRecord(r.id, patch);
            patchRecord(r.id, patch);
            if (selectedId === r.id) setSelectedId(null);
            setBookFor(null);
            showToast(`${r.clientName || 'Customer'} marked as booked and moved to Customers.`, { href: '/admin/customers', label: 'View in Customers' });
        } catch (e) {
            console.error('Error marking booked:', e);
            alert('Failed to mark as booked');
        } finally {
            setIsSaving(false);
        }
    };

    const openLose = (r: ItineraryRecord) => {
        setLoseFor(r);
        setLoseReason(LOST_REASONS[0]);
        setLoseDetails('');
    };

    const confirmLose = async () => {
        const r = loseFor;
        if (!r?.id) return;
        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const reason = [loseReason, loseDetails.trim()].filter(Boolean).join(' — ');
            const patch: Partial<ItineraryRecord> = {
                ...statusChangePatch(r, 'cancelled', now, 'Marked as lost', reason),
                lostReason: reason,
                lostAt: now,
            };
            await writeRecord(r.id, patch);
            patchRecord(r.id, patch);
            if (selectedId === r.id) setSelectedId(null);
            setLoseFor(null);
            showToast(`Quote for ${r.clientName || 'customer'} marked as lost.`);
        } catch (e) {
            console.error('Error marking lost:', e);
            alert('Failed to mark as lost');
        } finally {
            setIsSaving(false);
        }
    };

    const reopen = async (r: ItineraryRecord) => {
        if (!r.id) return;
        setBusyId(r.id);
        try {
            const patch: Partial<ItineraryRecord> = {
                ...statusChangePatch(r, 'sent', new Date().toISOString(), 'Quote reopened', r.lostReason ? `Was lost: ${r.lostReason}` : undefined),
                lostReason: '',
            };
            await writeRecord(r.id, patch);
            patchRecord(r.id, patch);
        } catch (e) {
            console.error('Error reopening quote:', e);
            alert('Failed to reopen the quote');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (r: ItineraryRecord) => {
        if (!r.id || !db) return;
        if (!confirm(`Delete the quote for ${r.clientName}? This cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, 'customer_itineraries', r.id));
            removeRecord(r.id);
            if (selectedId === r.id) setSelectedId(null);
        } catch (e) {
            console.error('Error deleting quote:', e);
            alert('Failed to delete quote');
        }
    };

    const closeRecord = useCallback(() => setSelectedId(null), []);

    const handleExport = () => {
        exportToCsv(
            `travelzada-quotes-${new Date().toISOString().slice(0, 10)}.csv`,
            redactForExport(filtered.map((r) => ({
                Name: r.clientName,
                Phone: r.clientPhone,
                Email: r.clientEmail,
                Package: r.packageName || r.destinationName,
                Destination: r.destinationName,
                'Travel date': r.travelDate,
                Adults: r.adults,
                Children: r.children,
                Status: isLostQuote(r) ? 'Lost' : STATUS_META[r.status]?.label || r.status,
                'Quote ref': r.quoteRef,
                'Quoted (INR)': r.totalCost,
                'Valid until': r.validUntil,
                Created: r.createdAt,
                'Created by': r.createdBy,
                'Lost reason': r.lostReason,
                Notes: r.notes,
            })), canSeePhone, ['Phone']),
        );
    };

    const viewOptions: Array<{ value: View; label: string; count: number }> = [
        { value: 'all', label: 'All', count: counts.all },
        { value: 'sent', label: 'Awaiting reply', count: counts.sent },
        { value: 'draft', label: 'Drafts', count: counts.draft },
        { value: 'expiring', label: 'Expiring this week', count: counts.expiring },
        { value: 'expired', label: 'Expired', count: counts.expired },
        { value: 'stale', label: 'Needs follow-up', count: counts.stale },
        { value: 'lost', label: 'Lost', count: counts.lost },
    ];

    const bookBalance = Math.max(0, (Number(bookTotal) || 0) - (Number(bookAdvance) || 0));

    const quoteActions = (r: ItineraryRecord, inDrawer = false) => {
        if (isLostQuote(r)) {
            return (
                <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); reopen(r); }} loading={busyId === r.id}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reopen
                </Button>
            );
        }
        return (
            <>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); openBook(r); }} title="Customer said yes — move to Customers">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark as booked
                </Button>
                {r.status === 'draft' && !inDrawer && (
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); markSent(r); }} loading={busyId === r.id} title="You shared the PDF with the customer">
                        <Send className="w-3.5 h-3.5" /> Mark sent
                    </Button>
                )}
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openLose(r); }} title="Customer said no">
                    <XCircle className="w-3.5 h-3.5" /> Mark as lost
                </Button>
            </>
        );
    };

    return (
        <div>
            <PageHeader
                title="Sent Quotes"
                description="Quotes shared with customers — follow up and mark as booked"
                actions={
                    <>
                        <Button variant="secondary" onClick={handleExport} disabled={!filtered.length}>
                            <Download className="w-4 h-4" /> Export CSV
                        </Button>
                        <Button variant="secondary" onClick={fetchRecords} loading={isLoading}>
                            {!isLoading && <RefreshCw className="w-4 h-4" />} Refresh
                        </Button>
                        <Link href="/admin/itinerary" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-bordeaux-600 text-white hover:bg-bordeaux-700 shadow-sm">
                            <Plus className="w-4 h-4" /> Create quote
                        </Link>
                    </>
                }
            />

            <StatRow>
                <StatCard label="Open quotes" value={stats.open} hint={`${stats.sent} awaiting reply · ${stats.drafts} draft${stats.drafts === 1 ? '' : 's'}`} icon={<FileText className="w-5 h-5" />} tone="blue" onClick={() => setView('all')} />
                <StatCard label="Quoted value" value={formatINR(stats.value)} hint="Total of all open quotes" icon={<IndianRupee className="w-5 h-5" />} tone="wine" />
                <StatCard label="Expiring this week" value={stats.expiring} hint={`${stats.expired} already expired`} icon={<AlarmClock className="w-5 h-5" />} tone="amber" onClick={() => setView('expiring')} />
                <StatCard label="Older than 7 days" value={stats.stale} hint="Needs a follow-up call" icon={<Clock className="w-5 h-5" />} tone="red" onClick={() => setView('stale')} />
            </StatRow>

            <Toolbar>
                <FilterChips options={viewOptions} value={view} onChange={setView} />
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder={canSeePhone ? 'Search name, phone, package, quote no…' : 'Search name, package, quote no…'} className="w-full md:w-80" />
            </Toolbar>

            <Card padded={false}>
                {isLoading && !allRecords.length ? (
                    <Spinner label="Loading quotes…" />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={<FileText className="w-5 h-5" />}
                        title={quotes.length === 0 && view !== 'lost' ? 'No open quotes' : 'Nothing matches'}
                        description={quotes.length === 0 && view !== 'lost' ? 'Every quote PDF you create is saved here automatically.' : 'Try another filter or search term.'}
                        action={quotes.length === 0 && view !== 'lost' ? (
                            <Link href="/admin/itinerary" className="text-sm font-semibold text-bordeaux-700 hover:underline">Create a quote</Link>
                        ) : undefined}
                    />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Customer</Th>
                                <Th>Trip</Th>
                                <Th className="text-right">Quoted</Th>
                                <Th>{view === 'lost' ? 'Lost' : 'Sent / validity'}</Th>
                                <Th>Status</Th>
                                <Th className="text-right">Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => {
                                const vd = validDays(r);
                                const lostRow = isLostQuote(r);
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
                                                {r.travelDate ? formatDate(r.travelDate) : 'No date'} · {r.adults || 0} adult{r.adults === 1 ? '' : 's'}{r.children > 0 ? ` + ${r.children} child${r.children === 1 ? '' : 'ren'}` : ''}
                                            </div>
                                        </Td>
                                        <Td className="text-right whitespace-nowrap">
                                            <div className="font-semibold text-gray-900">{formatINR(r.totalCost)}</div>
                                            {r.quoteRef && <div className="font-mono text-[11px] text-gray-400">{r.quoteRef}</div>}
                                        </Td>
                                        <Td className="whitespace-nowrap">
                                            {lostRow ? (
                                                <>
                                                    <div className="text-gray-900 max-w-[16rem] truncate" title={r.lostReason}>{r.lostReason || '—'}</div>
                                                    <div className="text-xs text-gray-500">{r.lostAt ? timeAgo(r.lostAt) : ''}</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className={cx('text-gray-900', isStale(r) && 'font-semibold text-red-700')}>{timeAgo(r.createdAt)}</div>
                                                    {vd !== null && (
                                                        <div className={cx('text-xs', vd < 0 ? 'font-semibold text-red-700' : vd <= 7 ? 'font-semibold text-amber-700' : 'text-gray-500')}>
                                                            {vd < 0 ? `Expired ${formatDate(r.validUntil)}` : vd === 0 ? 'Expires today' : `Valid till ${formatDate(r.validUntil)}`}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </Td>
                                        <Td>
                                            {lostRow ? <Badge tone="red">Lost</Badge> : <Badge tone={STATUS_META[r.status].tone}>{r.status === 'sent' ? 'Awaiting reply' : 'Draft'}</Badge>}
                                        </Td>
                                        <Td className="text-right">
                                            <div className="flex flex-wrap justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                {r.clientPhone && !lostRow && (
                                                    <WhatsAppInboxButton name={r.clientName} refPath={recordRef(r)} label="WhatsApp" className="!px-2.5 !py-1.5 !text-xs" />
                                                )}
                                                {quoteActions(r)}
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

            <RecordDrawer
                record={selected}
                canSeePhone={canSeePhone}
                onClose={closeRecord}
                onPatched={patchRecord}
                extraActions={selected ? quoteActions(selected, true) : undefined}
            />

            {/* Mark as booked */}
            <Dialog
                open={!!bookFor}
                onClose={() => !isSaving && setBookFor(null)}
                title={<>Mark as booked{bookFor?.clientName ? ` — ${bookFor.clientName}` : ''}</>}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setBookFor(null)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={confirmBook} loading={isSaving}><CheckCircle2 className="w-4 h-4" /> Confirm booking</Button>
                    </>
                }
            >
                <p className="text-sm text-gray-600">The quote moves to <b>Customers</b> as a confirmed booking.</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Final price (₹)"><input type="number" min={0} className={inputClass} value={bookTotal} onChange={(e) => setBookTotal(parseFloat(e.target.value) || 0)} /></Field>
                    <Field label="Advance received (₹)" hint="Optional"><input type="number" min={0} className={inputClass} value={bookAdvance} onChange={(e) => setBookAdvance(parseFloat(e.target.value) || 0)} autoFocus /></Field>
                </div>
                <div className={cx('rounded-xl border px-3 py-2 text-sm font-semibold', bookBalance > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
                    Balance due: {formatINR(bookBalance)}
                </div>
                <Field label="Note (optional)"><input className={inputClass} value={bookNote} onChange={(e) => setBookNote(e.target.value)} placeholder="e.g. Paid by UPI, ref 1234" /></Field>
            </Dialog>

            {/* Mark as lost */}
            <Dialog
                open={!!loseFor}
                onClose={() => !isSaving && setLoseFor(null)}
                title={<>Mark as lost{loseFor?.clientName ? ` — ${loseFor.clientName}` : ''}</>}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setLoseFor(null)} disabled={isSaving}>Cancel</Button>
                        <Button variant="danger" onClick={confirmLose} loading={isSaving}><XCircle className="w-4 h-4" /> Mark as lost</Button>
                    </>
                }
            >
                <Field label="Why didn't they book?">
                    <select className={inputClass} value={loseReason} onChange={(e) => setLoseReason(e.target.value)}>
                        {LOST_REASONS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                </Field>
                <Field label="Details (optional)"><input className={inputClass} value={loseDetails} onChange={(e) => setLoseDetails(e.target.value)} placeholder="e.g. Went with MakeMyTrip at ₹62,000" /></Field>
                <p className="text-xs text-gray-500">Lost quotes are kept under the <b>Lost</b> filter and can be reopened.</p>
            </Dialog>

            {toast && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-2xl max-w-[calc(100vw-2rem)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{toast.text}</span>
                    {toast.link && (
                        <Link href={toast.link.href} className="font-semibold text-emerald-300 hover:underline whitespace-nowrap">{toast.link.label}</Link>
                    )}
                    <button type="button" onClick={() => setToast(null)} className="p-1 rounded text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
}
