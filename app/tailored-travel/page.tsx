import Link from 'next/link'
import { ArrowRight, FileSearch } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TripGame from '@/components/tailored-travel/game/TripGame'
import SmartSearch from '@/components/tailored-travel/smart/SmartSearch'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'AI Trip Planner for Couples | Travelzada',
    description:
        'Find your perfect honeymoon, anniversary or birthday trip in 60 seconds — a few fun taps and we reveal the one romantic package made for you two, for Bali, Kashmir, Andaman, Thailand, Kerala and more.',
}

export default function TailoredTravelPage() {
    return (
        <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-x-hidden bg-gray-50">
            <Header />

            {/* Hero: the "find your perfect trip" game */}
            <TripGame />

            {/* Prefer to type? */}
            <div className="pt-12 sm:pt-16">
                <SmartSearch />
            </div>

            {/* Compare another agent's itinerary */}
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
                <Link
                    href="/tailored-travel/compare"
                    className="group flex items-center gap-4 rounded-3xl bg-gradient-to-r from-bordeaux-700 to-bordeaux-500 p-5 sm:p-6 text-white shadow-xl shadow-bordeaux-900/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bordeaux-300"
                >
                    <span className="shrink-0 w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                        <FileSearch className="w-6 h-6" />
                    </span>
                    <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-base sm:text-lg">Got an itinerary from another travel agent?</span>
                        <span className="block text-sm text-white/85 mt-0.5">Upload it — we&apos;ll show what&apos;s included and match it.</span>
                    </span>
                    <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <Footer />
        </main>
    )
}
