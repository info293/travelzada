'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ConversationAgent from '@/components/ConversationAgent'
import TripForm from '@/components/TripForm'
import BestSellers from '@/components/BestSellers'

function AIPlannerContent() {
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    destination: '',
    travelDate: '',
    days: '',
    budget: '',
    hotelType: '',
  })
  const [isTripDetailsVisible, setIsTripDetailsVisible] = useState(false)

  // Check for destination parameter from URL
  useEffect(() => {
    const destinationParam = searchParams.get('destination')
    if (destinationParam) {
      setFormData((prev) => ({ ...prev, destination: destinationParam }))
    }
  }, [searchParams])

  const handleTripDetailsRequest = useCallback(() => {
    setIsTripDetailsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Tell us your vibe. AI will plan your trip.
          </h1>
          <p className="text-xl text-gray-600">
            Takes 30 seconds
          </p>
        </div>
      </section>

      {/* Conversation Agent */}
      <section className="py-8 px-4 md:px-12">
        <div className="max-w-4xl mx-auto">
          <ConversationAgent 
            formData={formData}
            setFormData={setFormData}
            onTripDetailsRequest={handleTripDetailsRequest}
          />
        </div>
      </section>

      {/* Trip Form */}
      {isTripDetailsVisible && (
        <section id="trip-details" className="py-8 px-4 md:px-12">
          <div className="max-w-4xl mx-auto">
            <TripForm 
              formData={formData}
              setFormData={setFormData}
            />
          </div>
        </section>
      )}

      {/* Best Sellers Section */}
      <section className="py-16 px-4 md:px-12 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">
            Not sure where to go?
          </h2>
          <BestSellers />
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default function AIPlannerPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
        <Footer />
      </main>
    }>
      <AIPlannerContent />
    </Suspense>
  )
}

