import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ItineraryCompare from '@/components/tailored-travel/compare/ItineraryCompare'

export const metadata: Metadata = {
  title: 'Compare Your Itinerary | Travelzada',
  description:
    'Got an itinerary from another agency or a friend? Upload it and see, honestly, what a matching Travelzada trip includes, what is similar and what we can add.',
}

export default function CompareItineraryPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <Header />
      <div className="flex-1 pt-20 md:pt-28 pb-32">
        <ItineraryCompare />
      </div>
      <Footer />
    </main>
  )
}
