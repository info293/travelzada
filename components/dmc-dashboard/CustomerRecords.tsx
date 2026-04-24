'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, UserCircle, Phone, Mail, Search, Tag, MessageCircle,
  ChevronDown, ChevronUp, Pencil, Check, IndianRupee, BookOpen,
  SortAsc
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'

interface Customer {
  id: string
  agentId: string
  name: string
  email: string
  phone?: string
  totalTrips: number
  totalSpend: number
  notes?: string
  tags?: string[]
  createdAt?: any
  updatedAt?: any
}

interface Props {
  agentId: string
}

const AVAILABLE_TAGS = ['VIP', 'Repeat', 'Corporate', 'High-value', 'First-time', 'Group', 'Honeymoon']

const TAG_COLORS: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-800',
  Repeat: 'bg-blue-100 text-blue-800',
  Corporate: 'bg-indigo-100 text-indigo-800',
  'High-value': 'bg-emerald-100 text-emerald-800',
  'First-time': 'bg-purple-100 text-purple-800',
  Group: 'bg-orange-100 text-orange-800',
  Honeymoon: 'bg-pink-100 text-pink-800',
}

type SortKey = 'trips' | 'spend' | 'name'

export default function CustomerRecords({ agentId }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('trips')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'agent_customers'), where('agentId', '==', agentId))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))
      setCustomers(list)
    } catch { } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  async function updateCustomer(id: string, updates: Partial<Customer>) {
    await updateDoc(doc(db, 'agent_customers', id), { ...updates, updatedAt: serverTimestamp() })
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const filtered = customers
    .filter(c => {
      if (tagFilter && !c.tags?.includes(tagFilter)) return false
      if (!search) return true
      const s = search.toLowerCase()
      return c.name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.phone?.toLowerCase().includes(s)
    })
    .sort((a, b) => {
      if (sortKey === 'trips') return (b.totalTrips || 0) - (a.totalTrips || 0)
      if (sortKey === 'spend') return (b.totalSpend || 0) - (a.totalSpend || 0)
      return (a.name || '').localeCompare(b.name || '')
    })

  // All tags in use
  const usedTags = Array.from(new Set(customers.flatMap(c => c.tags || [])))

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-gray-600"
          >
            <option value="trips">Sort: Most Trips</option>
            <option value="spend">Sort: Most Spend</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
            />
          </div>
        </div>
      </div>

      {/* Tag filters */}
      {usedTags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTagFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${!tagFilter ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {usedTags.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${tagFilter === tag ? 'bg-primary text-white' : TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <UserCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No customers found</p>
          <p className="text-sm text-gray-400 mt-1">Customers appear automatically when they submit a booking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => (
            <div key={customer.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {customer.name?.charAt(0).toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    {customer.tags?.map(tag => (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="w-3 h-3" />
                      <a href={`mailto:${customer.email}`} onClick={e => e.stopPropagation()} className="hover:text-primary">
                        {customer.email}
                      </a>
                    </span>
                    {customer.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />{customer.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{customer.totalTrips} trip{customer.totalTrips !== 1 ? 's' : ''}</p>
                  {customer.totalSpend > 0 && (
                    <p className="text-xs text-gray-400">₹{customer.totalSpend.toLocaleString('en-IN')}</p>
                  )}
                </div>

                {expandedId === customer.id
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </div>

              {/* Expanded */}
              {expandedId === customer.id && (
                <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/50">
                  {/* Quick contact */}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl hover:border-primary hover:text-primary transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />Email
                    </a>
                    {customer.phone && (
                      <>
                        <a
                          href={`tel:${customer.phone}`}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl hover:border-primary hover:text-primary transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />Call
                        </a>
                        <a
                          href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          className="flex items-center gap-1.5 text-xs font-semibold bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl hover:bg-green-100 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />WhatsApp
                        </a>
                      </>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                      <BookOpen className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xl font-bold text-gray-900">{customer.totalTrips}</p>
                      <p className="text-xs text-gray-500">Total Trips</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                      <IndianRupee className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xl font-bold text-gray-900">
                        {customer.totalSpend > 0 ? `₹${customer.totalSpend.toLocaleString('en-IN')}` : '—'}
                      </p>
                      <p className="text-xs text-gray-500">Total Spend</p>
                    </div>
                  </div>

                  {/* Tags editor */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_TAGS.map(tag => {
                        const active = customer.tags?.includes(tag)
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              const current = customer.tags || []
                              const next = active ? current.filter(t => t !== tag) : [...current, tag]
                              updateCustomer(customer.id, { tags: next })
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                              active
                                ? `${TAG_COLORS[tag] || 'bg-gray-200 text-gray-700'} border-transparent`
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <CustomerNotesEditor
                    customerId={customer.id}
                    initialNotes={customer.notes || ''}
                    onSave={(id, notes) => updateCustomer(id, { notes })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CustomerNotesEditor({
  customerId, initialNotes, onSave,
}: {
  customerId: string
  initialNotes: string
  onSave: (id: string, notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(customerId, notes)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
        <Pencil className="w-3.5 h-3.5" />Notes
      </p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        placeholder="Add notes about this customer's preferences, budget, travel style…"
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-50 flex items-center gap-1"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3 text-green-600" /> : null}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save notes'}
      </button>
    </div>
  )
}
