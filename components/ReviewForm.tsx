'use client'

import { useState } from 'react'

interface ReviewFormProps {
  destinationName: string
  packageId?: string
  packageName?: string
  onReviewSubmitted?: () => void
}

export default function ReviewForm({
  destinationName,
  packageId,
  packageName,
  onReviewSubmitted,
}: ReviewFormProps) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    setErrorMessage('')

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          rating,
          review,
          destinationName,
          packageId: packageId || null,
          packageName: packageName || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Something went wrong.')
        setStatus('error')
      } else {
        setStatus('success')
        setName('')
        setRating(0)
        setReview('')
        onReviewSubmitted?.()
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-1">Write a Review</h3>
        <p className="text-sm text-gray-500">
          Share your experience for{' '}
          <span className="font-semibold text-primary">{packageName || destinationName}</span>
        </p>
      </div>

      {status === 'success' ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          {/* Animated checkmark */}
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5 animate-bounce-once">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-2">Thank you for your review!</h4>
          <p className="text-gray-600 text-sm max-w-xs">
            Your review has been submitted and is pending approval. It will appear here once our team verifies it.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-6 text-primary font-semibold hover:underline text-sm"
          >
            Write another review
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya S."
              required
              minLength={2}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors placeholder-gray-400"
            />
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Rating *</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-125 focus:outline-none"
                  aria-label={`Rate ${star} stars`}
                >
                  <svg
                    className={`w-9 h-9 transition-colors duration-100 ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-400'
                        : 'text-gray-200'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
              {(hoveredRating || rating) > 0 && (
                <span className="ml-2 text-sm font-semibold text-gray-600">
                  {starLabels[hoveredRating || rating]}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Review *</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell others about your experience — what did you love? What could be better?"
              required
              minLength={10}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors placeholder-gray-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{review.length} characters (min 10)</p>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-4 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit Review
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Reviews are moderated before appearing publicly. We typically approve within 24 hours.
          </p>
        </form>
      )}
    </div>
  )
}
