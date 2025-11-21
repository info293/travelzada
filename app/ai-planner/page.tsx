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
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 relative overflow-hidden">
      <Header />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 py-12 md:py-16 px-4 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 mb-6 shadow-sm">
              <span className="w-4 h-4 inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm"></span>
              <span className="text-sm text-purple-700">Powered by AI</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl text-gray-900 mb-4 leading-tight">
              Tell us your vibe.
              <span className="block bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                AI will plan your trip.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 mb-2">
              Takes just 30 seconds
            </p>
            <p className="text-sm text-gray-500">
              Our AI assistant will create a personalized itinerary just for you
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
              <span className="text-sm text-gray-700">✨ Personalized</span>
            </div>
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
              <span className="text-sm text-gray-700">⚡ Instant Results</span>
            </div>
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
              <span className="text-sm text-gray-700">🎯 Tailored to You</span>
            </div>
          </div>
        </div>
      </section>

      {/* Conversation Agent */}
      <section className="relative z-10 py-6 px-4 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-2xl shadow-purple-500/10 p-6 md:p-8 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-100/30 to-indigo-100/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-100/30 to-purple-100/30 rounded-full blur-3xl -ml-24 -mb-24"></div>
            
            <div className="relative z-10">
              <ConversationAgent 
                formData={formData}
                setFormData={setFormData}
                onTripDetailsRequest={handleTripDetailsRequest}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trip Form */}
      {isTripDetailsVisible && (
        <section id="trip-details" className="relative z-10 py-6 px-4 md:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-2xl shadow-purple-500/10 p-6 md:p-8 relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100/30 to-purple-100/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-100/30 to-indigo-100/30 rounded-full blur-3xl -ml-24 -mb-24"></div>
              
              <div className="relative z-10">
                <TripForm 
                  formData={formData}
                  setFormData={setFormData}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers Section */}
      <section className="relative z-10 py-12 md:py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl text-gray-900 mb-3">
              Not sure where to go?
            </h2>
            <p className="text-lg text-gray-600">
              Explore our hand-picked destinations
            </p>
          </div>
          <BestSellers />
        </div>
      </section>

      <Footer />
      
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
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
