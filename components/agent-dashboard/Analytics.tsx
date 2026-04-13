'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, TrendingUp, Package, Users, IndianRupee, BarChart2, MapPin, ArrowUpRight } from 'lucide-react'

interface Props {
  agentId: string
  agentSlug: string
}

interface AnalyticsData {
  totalBookings: number
  confirmedBookings: number
  totalRevenue: number
  commissionPaid: number
  netRevenue: number
  totalPackages: number
  activePackages: number
  totalCustomers: number
  conversionRate: number
  topDestinations: { destination: string; count: number }[]
  bookingsByStatus: { status: string; count: number }[]
  revenueByMonth: { month: string; revenue: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1',
  contacted: '#f59e0b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
  completed: '#6b7280',
}

export default function Analytics({ agentId, agentSlug }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agent/analytics?agentId=${agentId}`)
      const json = await res.json()
      if (json.success) setData(json.analytics)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }

  if (!data) {
    return <p className="text-gray-500 text-sm">Unable to load analytics.</p>
  }

  const statCards = [
    {
      icon: <Package className="w-5 h-5" />,
      label: 'Total Bookings',
      value: data.totalBookings,
      sub: `${data.confirmedBookings} confirmed`,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      icon: <IndianRupee className="w-5 h-5" />,
      label: 'Gross Revenue',
      value: `₹${data.totalRevenue.toLocaleString('en-IN')}`,
      sub: `Net: ₹${data.netRevenue.toLocaleString('en-IN')}`,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Total Customers',
      value: data.totalCustomers,
      sub: `${data.totalPackages} packages (${data.activePackages} active)`,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Conversion Rate',
      value: `${data.conversionRate}%`,
      sub: 'Bookings → Confirmed',
      color: 'text-purple-600 bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-500">Performance overview for your planner</p>
        </div>
        <a
          href={`/tailored-travel/${agentSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          View Live Planner
        </a>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Destinations */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Top Destinations</h3>
          </div>
          {data.topDestinations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No booking data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topDestinations.map((d, i) => (
                <div key={d.destination} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{d.destination}</span>
                      <span className="text-xs font-semibold text-gray-500">{d.count} booking{d.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.round((d.count / data.topDestinations[0].count) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings by Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Bookings by Status</h3>
          </div>
          {data.bookingsByStatus.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No booking data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.bookingsByStatus.map(b => {
                const pct = data.totalBookings > 0
                  ? Math.round((b.count / data.totalBookings) * 100)
                  : 0
                return (
                  <div key={b.status} className="flex items-center gap-3">
                    <div className="w-16 text-xs font-medium text-gray-600 capitalize">{b.status}</div>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: STATUS_COLORS[b.status] || '#94a3b8',
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 w-8 text-right">{b.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      {data.revenueByMonth.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Monthly Revenue
          </h3>
          <div className="flex items-end gap-3 h-36">
            {data.revenueByMonth.map((m, i) => {
              const max = Math.max(...data.revenueByMonth.map(x => x.revenue), 1)
              const pct = (m.revenue / max) * 100
              const [year, month] = m.month.split('-')
              const label = new Date(Number(year), Number(month) - 1)
                .toLocaleDateString('en-IN', { month: 'short' })
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <p className="text-[10px] font-semibold text-gray-500">
                    {m.revenue >= 100000
                      ? `${(m.revenue / 100000).toFixed(1)}L`
                      : m.revenue >= 1000
                      ? `${(m.revenue / 1000).toFixed(0)}K`
                      : m.revenue}
                  </p>
                  <div className="w-full bg-gray-100 rounded-t-lg" style={{ height: '90px', display: 'flex', alignItems: 'flex-end' }}>
                    <div
                      className="w-full bg-purple-500 rounded-t-lg transition-all duration-700"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Extra stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Avg Booking Value',
            value: data.confirmedBookings > 0
              ? `₹${Math.round(data.totalRevenue / data.confirmedBookings).toLocaleString('en-IN')}`
              : '—',
            color: 'bg-teal-50 text-teal-700',
          },
          {
            label: 'Active Packages',
            value: `${data.activePackages} / ${data.totalPackages}`,
            color: 'bg-indigo-50 text-indigo-700',
          },
          {
            label: 'Net Earnings',
            value: `₹${data.netRevenue.toLocaleString('en-IN')}`,
            color: 'bg-emerald-50 text-emerald-700',
          },
          {
            label: 'Commission Paid',
            value: `₹${data.commissionPaid.toLocaleString('en-IN')}`,
            color: 'bg-rose-50 text-rose-700',
          },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Commission tracker */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white">
        <h3 className="font-semibold mb-4">Revenue Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">₹{data.totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs opacity-70 mt-1">Gross Booking Value</p>
          </div>
          <div>
            <p className="text-2xl font-bold">₹{data.commissionPaid.toLocaleString('en-IN')}</p>
            <p className="text-xs opacity-70 mt-1">Travelzada Commission</p>
          </div>
          <div>
            <p className="text-2xl font-bold">₹{data.netRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs opacity-70 mt-1">Your Net Earnings</p>
          </div>
        </div>
      </div>
    </div>
  )
}
