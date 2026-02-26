import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TailoredItineraryWizard from '@/components/tailored-travel/TailoredItineraryWizard'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Tailored Travel Planner | Travelzada',
    description: 'Design your perfect custom itinerary with Travelzada in a few easy steps.',
}

export default function TailoredTravelPage() {
    return (
        <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-hidden bg-gray-50">
            {/* Soft Light Background */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <img
                    src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
                    alt="Travel Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-10"
                />
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]"></div>
            </div>

            <Header />

            <div className="flex-1 pb-16 flex flex-col justify-center">
                <TailoredItineraryWizard />
            </div>

            <Footer />
        </main>
    )
}
