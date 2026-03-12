'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface ReviewListProps {
  destinationName?: string
  packageId?: string
  refreshTrigger?: number // Used to trigger a refetch when a new review is submitted
}

export default function ReviewList({ destinationName, packageId, refreshTrigger = 0 }: ReviewListProps) {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchReviews = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (destinationName) params.append('destinationName', destinationName)
        if (packageId) params.append('packageId', packageId)

        const res = await fetch(`/api/reviews?${params.toString()}`)
        const data = await res.json()
        if (isMounted) {
          setReviews(data.reviews || [])
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchReviews()

    return () => {
      isMounted = false
    }
  }, [destinationName, packageId, refreshTrigger])

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse flex gap-5">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3 py-1">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/6" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="space-y-2 mt-4">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white border text-center border-gray-100 rounded-3xl p-10 flex flex-col items-center justify-center h-full min-h-[300px]">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-gray-900 mb-1">No reviews yet</h4>
        <p className="text-gray-500 text-sm max-w-[250px]">
          Be the first to share your experience {destinationName ? `in ${destinationName}` : ''}!
        </p>
      </div>
    )
  }

  // Generate a color based on string hash for avatars
  const getColor = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = hash % 360
    return `hsl(${hue}, 70%, 85%)`
  }

  const getDarkColor = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = hash % 360
    return `hsl(${hue}, 80%, 30%)`
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          {/* Subtle top-right decoration */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

          <div className="flex gap-4 md:gap-6 relative">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-lg md:text-xl"
                style={{
                  backgroundColor: getColor(review.name),
                  color: getDarkColor(review.name),
                }}
              >
                {review.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <h4 className="font-bold text-gray-900 truncate pr-4 text-base md:text-lg">
                  {review.name}
                  <span className="inline-flex items-center justify-center ml-2 bg-green-50 text-green-600 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase align-middle">
                    <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Verified
                  </span>
                </h4>
                {review.createdAt && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              {/* Stars */}
              <div className="flex mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-4 h-4 md:w-5 md:h-5 ${
                      star <= review.rating ? 'text-yellow-400' : 'text-gray-200'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {review.packageName && !packageId && (
                <div className="mb-3 inline-block bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">
                  <span className="text-xs font-medium text-gray-500">
                    Traveled on:{' '}
                    <span className="text-primary font-semibold">{review.packageName}</span>
                  </span>
                </div>
              )}

              <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                "{review.review}"
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
