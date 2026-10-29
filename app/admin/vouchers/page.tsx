'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { ArrowLeft, Copy, ExternalLink, Printer, RefreshCw, Search, Send, Ticket } from 'lucide-react'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import {
  CLAIM_STATUSES,
  VOUCHER_CARDS_COLLECTION,
  VOUCHER_CLAIMS_COLLECTION,
  VOUCHER_TYPES,
  addMonths,
  cardRedeemUrl,
  formatVoucherDate,
  inr,
  isClaimExpired,
  voucherConfig,
  type VoucherCard,
  type VoucherClaim,
  type VoucherType,
} from '@/lib/vouchers'

type Tab = 'claims' | 'cards' | 'settings'

export default function AdminVouchersPage() {
  const { currentUser, loading, isAdmin, permissions } = useAuth()
  const router = useRouter()
  const canView = isAdmin || permissions.includes('leads')
  const [tab, setTab] = useState<Tab>('claims')
  const [claims, setClaims] = useState<VoucherClaim[]>([])
  const [cards, setCards] = useState<VoucherCard[]>([])

  useEffect(() => {
    if (loading) return
    if (!currentUser) router.push('/login')
    else if (!canView) router.push('/admin')
  }, [currentUser, loading, canView, router])

  useEffect(() => {
    if (!currentUser || !canView) return
    const u1 = onSnapshot(query(collection(db, VOUCHER_CLAIMS_COLLECTION), orderBy('createdAt', 'desc')), (s) =>
      setClaims(s.docs.map((d) => d.data() as VoucherClaim))
    )
    const u2 = onSnapshot(query(collection(db, VOUCHER_CARDS_COLLECTION), orderBy('code', 'asc')), (s) =>
      setCards(s.docs.map((d) => d.data() as VoucherCard))
    )
    return () => {
      u1()
      u2()
    }
  }, [currentUser, canView])

  const authFetch = async (url: string, init?: RequestInit) => {
    const token = await currentUser!.getIdToken()
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) } })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (!currentUser || !canView) return null

  const stats = [
    { label: 'Cards issued', value: cards.length },
    { label: 'Codes claimed', value: claims.length },
    { label: 'Active', value: claims.filter((c) => c.status === 'active' && !isClaimExpired(c)).length },
    { label: 'Applied to bookings', value: claims.filter((c) => c.status === 'applied').length },
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pt-4 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Ticket className="w-6 h-6 text-blue-700" /> Vouchers
              </h1>
              <p className="text-sm text-gray-500 mt-1">Printed voucher cards, customer codes and redemptions.</p>
            </div>
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {(['claims', 'cards', 'settings'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${tab === t ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t === 'claims' ? 'Customer codes' : t === 'cards' ? 'Voucher cards' : 'WhatsApp'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {stats.map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            {tab === 'claims' && <ClaimsTab claims={claims} authFetch={authFetch} />}
            {tab === 'cards' && <CardsTab cards={cards} createdBy={currentUser.email || currentUser.uid} />}
            {tab === 'settings' && <SettingsTab authFetch={authFetch} />}
          </div>
        </div>
      </main>
    </>
  )
}

type AuthFetch = (url: string, init?: RequestInit) => Promise<any>

// ─── Customer codes ──────────────────────────────────────────────────────────

function ClaimsTab({ claims, authFetch }: { claims: VoucherClaim[]; authFetch: AuthFetch }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'applied' | 'cancelled' | 'expired'>('all')
  const [applying, setApplying] = useState<VoucherClaim | null>(null)
  const [busy, setBusy] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return claims.filter((c) => {
      const s = isClaimExpired(c) ? 'expired' : c.status
      if (status !== 'all' && s !== status) return false
      if (!q) return true
      return [c.code, c.cardCode, c.name, c.phone, c.email, c.destination, c.bookingRef].some((v) => v?.toLowerCase().includes(q))
    })
  }, [claims, search, status])

  const setClaimStatus = async (c: VoucherClaim, next: VoucherClaim['status'], extra: Partial<VoucherClaim> = {}) => {
    setBusy(c.code)
    try {
      await updateDoc(doc(db, VOUCHER_CLAIMS_COLLECTION, c.code), { status: next, ...extra, updatedAt: new Date().toISOString() })
    } catch (e: any) {
      alert(`Could not update: ${e.message}`)
    } finally {
      setBusy('')
    }
  }

  const resend = async (c: VoucherClaim) => {
    setBusy(c.code)
    try {
      const { notifications } = await authFetch('/api/admin/vouchers', { method: 'POST', body: JSON.stringify({ action: 'resend', code: c.code }) })
      alert(`Email: ${notifications.email}\nWhatsApp: ${notifications.whatsapp}`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl">
      <div className="p-4 flex flex-wrap gap-3 border-b border-gray-100">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, phone, email, booking ref…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="applied">Applied</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-500">No customer codes yet. They appear here as soon as someone scans a voucher and submits their details.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                {['Code', 'Customer', 'Voucher', 'Trip', 'Claimed', 'Book by', 'Sent', 'Status', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => {
                const expired = isClaimExpired(c)
                const st = expired
                  ? { label: 'Expired', className: 'bg-rose-50 text-rose-700 border-rose-200' }
                  : CLAIM_STATUSES.find((s) => s.id === c.status)!
                return (
                  <tr key={c.code} className="align-top hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 whitespace-nowrap">
                      {c.code}
                      <button onClick={() => navigator.clipboard?.writeText(c.code)} className="ml-1.5 text-gray-400 hover:text-blue-600 align-middle" title="Copy">
                        <Copy className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <a href={`https://wa.me/${c.phoneNorm}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline block">
                        +91 {c.phone}
                      </a>
                      <a href={`mailto:${c.email}`} className="text-gray-500 hover:underline block truncate max-w-[200px]">{c.email}</a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold">{inr(c.amount)} · {voucherConfig(c.type).label}</div>
                      <div className="text-gray-500 font-mono text-xs">{c.cardCode}</div>
                    </td>
                    <td className="px-4 py-3 min-w-[150px]">
                      <div>{c.destination || <span className="text-gray-400">Not sure yet</span>}</div>
                      <div className="text-gray-500 text-xs">{c.travelMonth}</div>
                      {c.notes && <div className="text-gray-500 text-xs mt-1 max-w-[220px]">“{c.notes}”</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatVoucherDate(c.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatVoucherDate(c.bookBy)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {(['email', 'whatsapp'] as const).map((k) => {
                        const v = c.notifications?.[k]
                        const ok = v?.startsWith('sent')
                        return (
                          <div key={k} title={v || 'pending'} className={ok ? 'text-emerald-700' : v ? 'text-rose-600' : 'text-gray-400'}>
                            {ok ? '✓' : v ? '✕' : '…'} {k === 'email' ? 'Email' : 'WhatsApp'}
                          </div>
                        )
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-semibold border rounded-full px-2.5 py-1 whitespace-nowrap ${st.className}`}>{st.label}</span>
                      {c.status === 'applied' && (
                        <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                          {c.bookingRef}
                          {c.bookingValue ? ` · ${inr(c.bookingValue)}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 items-start">
                        {c.status === 'active' && (
                          <button disabled={busy === c.code} onClick={() => setApplying(c)} className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap">
                            Apply to booking
                          </button>
                        )}
                        {c.status !== 'active' && (
                          <button disabled={busy === c.code} onClick={() => setClaimStatus(c, 'active')} className="text-xs font-semibold text-gray-600 hover:underline">
                            Reactivate
                          </button>
                        )}
                        {c.status === 'active' && (
                          <button
                            disabled={busy === c.code}
                            onClick={() => confirm(`Cancel voucher ${c.code}?`) && setClaimStatus(c, 'cancelled')}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                        <button disabled={busy === c.code} onClick={() => resend(c)} className="text-xs font-semibold text-gray-600 hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                          <Send className="w-3 h-3" /> {busy === c.code ? 'Working…' : 'Resend code'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {applying && (
        <ApplyModal
          claim={applying}
          onClose={() => setApplying(null)}
          onSave={async (bookingRef, bookingValue, adminNote) => {
            await setClaimStatus(applying, 'applied', {
              bookingRef,
              ...(bookingValue ? { bookingValue } : {}),
              ...(adminNote ? { adminNote } : {}),
              appliedAt: new Date().toISOString(),
            })
            setApplying(null)
          }}
        />
      )}
    </div>
  )
}

function ApplyModal({ claim, onClose, onSave }: { claim: VoucherClaim; onClose: () => void; onSave: (ref: string, value: number, note: string) => Promise<void> }) {
  const [ref, setRef] = useState('')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const amount = Number(value.replace(/\D/g, '')) || 0
  const belowMin = amount > 0 && amount < claim.minSpend

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Apply {claim.code}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {inr(claim.amount)} off for {claim.name}. Minimum package value {inr(claim.minSpend)} per couple, excluding flights.
        </p>
        <div className="grid gap-3 mt-5">
          <label className="text-sm font-medium text-gray-700">
            Booking reference
            <input value={ref} onChange={(e) => setRef(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500" placeholder="e.g. TZ-BK-1042" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Package value excl. flights (₹)
            <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500" placeholder="75000" />
          </label>
          {belowMin && <p className="text-xs text-rose-600">Below the {inr(claim.minSpend)} minimum spend. This booking is not eligible.</p>}
          <label className="text-sm font-medium text-gray-700">
            Note
            <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Optional" />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            disabled={!ref.trim() || belowMin}
            onClick={() => onSave(ref.trim(), amount, note.trim())}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-700 disabled:opacity-50"
          >
            Mark as applied
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Voucher cards ───────────────────────────────────────────────────────────

function CardsTab({ cards, createdBy }: { cards: VoucherCard[]; createdBy: string }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ type: 'international' as VoucherType, quantity: 1, recipientName: '', issuedAt: today, maxClaims: 1, note: '' })
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | VoucherType>('all')

  const shown = cards.filter((c) => filter === 'all' || c.type === filter)
  const cfg = VOUCHER_TYPES[form.type]
  const issued = new Date(`${form.issuedAt}T00:00:00+05:30`)

  const create = async () => {
    const qty = Math.min(200, Math.max(1, Math.floor(form.quantity)))
    setCreating(true)
    try {
      const existing = await getDocs(query(collection(db, VOUCHER_CARDS_COLLECTION), where('type', '==', form.type)))
      let seq = existing.docs.reduce((max, d) => Math.max(max, Number(d.id.split('-').pop()) || 0), 0)
      const batch = writeBatch(db)
      const codes: string[] = []
      for (let i = 0; i < qty; i++) {
        const code = `${cfg.cardPrefix}-${String(++seq).padStart(4, '0')}`
        codes.push(code)
        const card: VoucherCard = {
          code,
          type: form.type,
          ...(form.recipientName.trim() ? { recipientName: form.recipientName.trim() } : {}),
          issuedAt: issued.toISOString(),
          validUntil: addMonths(issued, cfg.bookWithinMonths).toISOString(),
          travelUntil: new Date(cfg.travelBy).toISOString(),
          maxClaims: Math.max(1, Math.floor(form.maxClaims)),
          claimCount: 0,
          status: 'active',
          ...(form.note.trim() ? { note: form.note.trim() } : {}),
          createdAt: new Date().toISOString(),
          createdBy,
        }
        batch.set(doc(db, VOUCHER_CARDS_COLLECTION, code), card)
      }
      await batch.commit()
      setSelected(codes)
      setForm((f) => ({ ...f, recipientName: '', note: '' }))
    } catch (e: any) {
      alert(`Could not create cards: ${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  const toggle = (code: string) => setSelected((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]))
  const printUrl = (codes: string[]) => `/admin/vouchers/print?codes=${encodeURIComponent(codes.join(','))}`

  return (
    <div className="grid lg:grid-cols-3 gap-5 items-start">
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="font-bold text-gray-900">Create voucher cards</h2>
        <p className="text-xs text-gray-500 mt-1">Each card gets its own code and QR, e.g. {cfg.cardPrefix}-0001.</p>
        <div className="grid gap-3 mt-4 text-sm">
          <label className="font-medium text-gray-700">
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VoucherType })} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5">
              {Object.values(VOUCHER_TYPES).map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}: {inr(t.amount)} off, min {inr(t.minSpend)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="font-medium text-gray-700">
              Quantity
              <input type="number" min={1} max={200} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5" />
            </label>
            <label className="font-medium text-gray-700" title="How many different people can redeem the same card">
              Uses per card
              <input type="number" min={1} value={form.maxClaims} onChange={(e) => setForm({ ...form, maxClaims: Number(e.target.value) })} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5" />
            </label>
          </div>
          <label className="font-medium text-gray-700">
            Recipient name <span className="text-gray-400 font-normal">(optional, printed as Passenger)</span>
            <input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5" placeholder="Riya & Aarav" />
          </label>
          <label className="font-medium text-gray-700">
            Issue date
            <input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value || today })} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5" />
          </label>
          <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
            Valid until (book by): <strong>{formatVoucherDate(addMonths(issued, cfg.bookWithinMonths).toISOString())}</strong>
            <br />
            Travel by: <strong>{formatVoucherDate(cfg.travelBy)}</strong>
          </div>
          <label className="font-medium text-gray-700">
            Internal note
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5" placeholder="e.g. Wedding expo, Jaipur" />
          </label>
          <button onClick={create} disabled={creating} className="mt-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl py-3 disabled:opacity-60">
            {creating ? 'Creating…' : `Create ${Math.max(1, form.quantity || 1)} card${form.quantity > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="all">All types</option>
            <option value="international">International</option>
            <option value="domestic">Domestic</option>
          </select>
          <button
            onClick={() => setSelected(selected.length === shown.length ? [] : shown.map((c) => c.code))}
            className="text-sm font-semibold text-gray-600 hover:underline"
          >
            {selected.length === shown.length && shown.length > 0 ? 'Clear selection' : 'Select all'}
          </button>
          <div className="flex-1" />
          <a
            href={selected.length ? printUrl(selected) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 ${selected.length ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}
          >
            <Printer className="w-4 h-4" /> Print / download {selected.length || ''}
          </a>
        </div>

        {shown.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">No voucher cards yet. Create your first batch on the left.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  {['', 'Card', 'Recipient', 'Valid until', 'Redeemed', 'Status', ''].map((h, i) => (
                    <th key={i} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((c) => {
                  const expired = new Date(c.validUntil).getTime() < Date.now()
                  return (
                    <tr key={c.code} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.includes(c.code)} onChange={() => toggle(c.code)} className="w-4 h-4 accent-blue-700" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono font-semibold text-gray-900">{c.code}</div>
                        <div className="text-xs text-gray-500">{inr(voucherConfig(c.type).amount)} · {voucherConfig(c.type).label}</div>
                      </td>
                      <td className="px-4 py-3">
                        {c.recipientName || <span className="text-gray-400">—</span>}
                        {c.note && <div className="text-xs text-gray-500">{c.note}</div>}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${expired ? 'text-rose-600' : 'text-gray-600'}`}>{formatVoucherDate(c.validUntil)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{c.claimCount || 0} / {c.maxClaims}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => updateDoc(doc(db, VOUCHER_CARDS_COLLECTION, c.code), { status: c.status === 'active' ? 'disabled' : 'active' })}
                          className={`text-xs font-semibold border rounded-full px-2.5 py-1 ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                          title="Click to toggle"
                        >
                          {c.status === 'active' ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-3 text-gray-500">
                          <a href={`/voucher/${c.code}`} target="_blank" rel="noopener noreferrer" title="Open redeem page" className="hover:text-blue-700">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => navigator.clipboard?.writeText(cardRedeemUrl(c.code))} title="Copy redeem link" className="hover:text-blue-700">
                            <Copy className="w-4 h-4" />
                          </button>
                          <a href={printUrl([c.code])} target="_blank" rel="noopener noreferrer" title="Print" className="hover:text-blue-700">
                            <Printer className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WhatsApp template ───────────────────────────────────────────────────────

type TemplateInfo = { category: string; language: string } | null

function SettingsTab({ authFetch }: { authFetch: AuthFetch }) {
  const [state, setState] = useState<{ configured?: boolean; found?: { text: TemplateInfo; image: TemplateInfo }; error?: string } | null>(null)

  const load = () => {
    setState(null)
    authFetch('/api/admin/vouchers').then(setState).catch((e) => setState({ error: e.message }))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const badge = (name: string, info: TemplateInfo | undefined, note: string) => (
    <div className="flex flex-wrap items-center gap-3 py-3 border-t border-gray-100">
      <code className="bg-gray-100 px-1.5 rounded text-sm">{name}</code>
      {info ? (
        <span className="text-xs font-bold uppercase rounded-full px-3 py-1 bg-emerald-50 text-emerald-700">
          Found · {info.category} · {info.language}
        </span>
      ) : (
        <span className="text-xs font-bold uppercase rounded-full px-3 py-1 bg-amber-50 text-amber-700">Not found</span>
      )}
      <span className="text-xs text-gray-500">{note}</span>
    </div>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">WhatsApp voucher message (GetGabs)</h2>
        <button onClick={load} className="text-gray-400 hover:text-blue-700" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Voucher codes go out on WhatsApp from the GetGabs number <strong>+91 88900 59568</strong>. Customer replies arrive in the GetGabs Team Inbox.
        Templates are managed in GetGabs → Templates. The email always includes the voucher image and a PDF.
      </p>
      <div className="mt-4">
        {!state ? (
          <span className="text-sm text-gray-400">Checking…</span>
        ) : state.error ? (
          <span className="text-sm text-rose-600">{state.error}</span>
        ) : !state.configured ? (
          <span className="text-xs font-bold uppercase rounded-full px-3 py-1 bg-rose-50 text-rose-700">GetGabs keys missing in env</span>
        ) : (
          <>
            {badge('tz_voucher_image', state.found?.image, 'Preferred: voucher picture + code (live site only)')}
            {badge('tz_voucher_code', state.found?.text, 'Fallback: code as text')}
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        If a WhatsApp send fails (e.g. template still awaiting Meta approval), the code is still emailed. Use “Resend code” on the customer row once it is approved.
      </p>
    </div>
  )
}
