'use client'

import { useEffect, useState } from 'react'

interface ReviewSummaryProps {
  destinationName?: string
  packageId?: string
  refreshTrigger?: number
  onWriteReviewClick: () => void
}

export default function ReviewSummary({
  destinationName,
  packageId,
  refreshTrigger = 0,
  onWriteReviewClick,
}: ReviewSummaryProps) {
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchStats = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (destinationName) params.append('destinationName', destinationName)
        if (packageId) params.append('packageId', packageId)

        const res = await fetch(`/api/reviews?${params.toString()}`)
        const data = await res.json()
        const reviews = data.reviews || []

        if (isMounted) {
          if (reviews.length === 0) {
            setStats({
              total: 0,
              average: 0,
              distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            })
            return
          }

          let sum = 0
          const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

          reviews.forEach((r: any) => {
            sum += r.rating
            if (r.rating >= 1 && r.rating <= 5) {
              dist[r.rating as keyof typeof dist]++
            }
          })

          setStats({
            total: reviews.length,
            average: parseFloat((sum / reviews.length).toFixed(1)),
            distribution: dist,
          })
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchStats()

    return () => {
      isMounted = false
    }
  }, [destinationName, packageId, refreshTrigger])

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-6" />
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-4 bg-gray-200 rounded" />
              <div className="h-2 flex-1 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Review Summary</h3>

      {/* Aggregate Rating */}
      <div className="flex items-center gap-5 mb-8">
        <div className="flex flex-col items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl border border-primary/20">
          <span className="text-3xl font-black text-primary leading-none">
            {stats.total > 0 ? stats.average : '0.0'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mt-1">Out of 5</span>
        </div>
        <div>
          <div className="flex mb-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-6 h-6 ${
                  star <= Math.round(stats.average) ? 'text-yellow-400' : 'text-gray-200'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-gray-500 font-medium">Based on {stats.total} review{stats.total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="space-y-3 mb-8">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.distribution[star as keyof typeof stats.distribution] || 0
          const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0

          return (
            <div key={star} className="flex items-center gap-3 text-sm group">
              <div className="flex items-center gap-1 font-medium text-gray-600 w-6">
                {star} <span className="text-xs text-gray-400">★</span>
              </div>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-8 text-right text-gray-400 font-medium text-xs">{count}</div>
            </div>
          )
        })}
      </div>

      {/* Write a Review Button */}
      <button
        onClick={onWriteReviewClick}
        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-primary text-primary px-6 py-3.5 rounded-xl font-bold hover:bg-primary/5 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Write a Review
      </button>
    </div>
  )
}
