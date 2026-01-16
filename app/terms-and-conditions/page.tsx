import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
    title: 'Terms and Conditions | Travelzada',
    description: 'Terms and Conditions for Travelzada services.',
}

export default function TermsAndConditionsPage() {
    return (
        <main className="min-h-screen bg-white">
            <Header />
            <section className="relative py-20 px-4 md:px-12 bg-[#fcfcfc] border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">Terms and Conditions</h1>
                </div>
            </section>
            <section className="py-16 px-4 md:px-12">
                <div className="max-w-4xl mx-auto space-y-8 prose prose-lg text-gray-600">
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Policy</h2>
                            <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                <li>All bookings are subject to availability and final confirmation.</li>
                                <li>Prices mentioned are starting prices and may vary at the time of booking.</li>
                                <li>Early booking is strongly recommended to secure preferred hotels, flights, and services.</li>
                                <li>Bookings are confirmed only after receipt of the required advance payment.</li>
                                <li>We do not hold bookings without payment confirmation.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Policy</h2>
                            <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                <li>50% of the total tour cost must be paid at the time of booking.</li>
                                <li>The remaining 50% payment must be completed at least 30 days prior to the travel date.</li>
                                <li>Failure to complete payments within the stipulated timeline may result in cancellation of the booking.</li>
                                <li>Payments can be made via UPI, NEFT, RTGS, or other approved bank transfer methods.</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </section>
            <Footer />
        </main>
    )
}

