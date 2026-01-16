import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
    title: 'Privacy Policy | Travelzada',
    description: 'Privacy Policy for Travelzada services.',
}

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-white">
            <Header />
            <section className="relative py-20 px-4 md:px-12 bg-[#fcfcfc] border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">Privacy Policy</h1>
                </div>
            </section>
            <section className="py-16 px-4 md:px-12">
                <div className="max-w-4xl mx-auto space-y-8 prose prose-lg text-gray-600">
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                            <p className="mb-4">We collect information that you provide directly to us when you plan or book a trip, including:</p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                <li>Personal identification information (Name, email address, phone number, etc.)</li>
                                <li>Travel preferences and requirements</li>
                                <li>Passport and visa details for booking purposes</li>
                                <li>Payment information (processed securely by our payment partners)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
                            <p className="mb-4">We use the information we collect to:</p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                <li>Process your bookings and provide travel services</li>
                                <li>Communicate with you about your trip, updates, and offers</li>
                                <li>Improve our AI planner and personalized recommendations</li>
                                <li>Comply with legal obligations and safety standards</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
                            <p className="mb-4">We may share your information with:</p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                <li>Service providers (Airlines, hotels, transport providers) to fulfill your booking</li>
                                <li>Legal authorities if required by law</li>
                                <li>Third-party processors for secure payment handling</li>
                            </ul>
                            <p className="mt-4">We do not sell your personal information to third parties.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
                            <p className="text-gray-700">
                                We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Contact Us</h2>
                            <p className="text-gray-700 mb-2">
                                If you have any questions about this Privacy Policy, please contact us:
                            </p>
                            <div className="text-gray-700">
                                <p><strong>Email:</strong> info@travelzada.com</p>
                                <p><strong>Address:</strong> SADAYA TRIPS LLP, Plot No. 18, Friends Colony, Malviya Nagar, Jaipur – 302017, Rajasthan, India</p>
                            </div>
                        </section>
                    </div>
                </div>
            </section>
            <Footer />
        </main>
    )
}
