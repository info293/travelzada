'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, UserCircle, Phone, Mail, MapPin, Search } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { AgentCustomer } from '@/lib/types/agent'

interface Props {
  agentId: string
}

export default function CustomerRecords({ agentId }: Props) {
  const [customers, setCustomers] = useState<AgentCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const q = query(
        collection(db, 'agent_customers'),
        where('agentId', '==', agentId)
      )
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AgentCustomer))
      list.sort((a, b) => (b.totalTrips || 0) - (a.totalTrips || 0))
      setCustomers(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const filtered = customers.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s)
    )
  })

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer Records</h2>
          <p className="text-sm text-gray-500">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <UserCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No customers yet</p>
          <p className="text-sm text-gray-400 mt-1">Customers appear automatically when they submit a booking through your planner.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
          {filtered.map(customer => (
            <div key={customer.id} className="flex items-center gap-4 p-4 bg-white hover:bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-700">
                  {customer.name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{customer.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="w-3 h-3" />
                    <a href={`mailto:${customer.email}`} className="hover:text-purple-600">{customer.email}</a>
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{customer.totalTrips} trip{customer.totalTrips !== 1 ? 's' : ''}</p>
                {customer.totalSpend > 0 && (
                  <p className="text-xs text-gray-400">₹{customer.totalSpend.toLocaleString('en-IN')} spent</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
