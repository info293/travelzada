import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TailoredItineraryWizard from '@/components/tailored-travel/TailoredItineraryWizard'
import SmartSearch from '@/components/tailored-travel/smart/SmartSearch'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'AI Trip Planner for Couples | Travelzada',
    description:
        'Describe your honeymoon, anniversary or birthday trip in one line and get hand-picked romantic packages for Bali, Kashmir, Andaman, Thailand, Kerala and more — with honest prices per person.',
}

export default function TailoredTravelPage() {
    return (
        <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-x-hidden bg-gray-50">
            {/* Soft Light Background */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <img
                    src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-10"
                />
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]"></div>
            </div>

            <Header />

            {/* Hero: describe your trip in one line */}
            <SmartSearch />

            {/* Step-by-step planner */}
            <section id="plan-step-by-step" className="scroll-mt-24 pt-12 sm:pt-16 pb-16 flex-1 flex flex-col">
                <div className="text-center px-4 mb-4 sm:mb-6">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Prefer to plan step by step?</h2>
                    <p className="mt-1 text-sm sm:text-base text-gray-600">Pick a place, your nights and budget — we'll match the best trips.</p>
                </div>
                <TailoredItineraryWizard />
            </section>

            <Footer />
        </main>
    )
}
