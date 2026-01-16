import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
    title: 'Refund Policy | Travelzada',
    description: 'Refund Policy for Travelzada services.',
}

export default function RefundPolicyPage() {
    return (
        <main className="min-h-screen bg-white">
            <Header />
            <section className="relative py-20 px-4 md:px-12 bg-[#fcfcfc] border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">Refund Policy</h1>
                </div>
            </section>
            <section className="py-16 px-4 md:px-12">
                <div className="max-w-4xl mx-auto space-y-8 prose prose-lg text-gray-600">
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancellation Policy</h2>
                            <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                <li>Cancellations made more than 30 days prior to travel may be refundable as per hotel, cab, and flight policies.</li>
                                <li>No refund will be provided for any non-refundable component once booked.</li>
                                <li>Bookings become non-refundable within 15 days prior to the travel date.</li>
                                <li>Cancellations due to medical emergencies will be considered only upon submission of valid supporting documents and refunds will be processed strictly as per supplier policies.</li>
                                <li>Cancellations due to weather conditions, natural calamities, or unforeseen circumstances will be governed by airline, hotel, and government guidelines.</li>
                                <li>A standard service fee of INR 1,000 will be charged on all cancellations.</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </section>
            <Footer />
        </main>
    )
}
