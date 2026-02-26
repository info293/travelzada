'use client'

import { useState } from 'react'

export default function Step5Contact({
    data,
    updateData,
    onSubmit,
    onPrev,
    isSubmitting
}: {
    data: any,
    updateData: (data: any) => void,
    onSubmit: () => void,
    onPrev: () => void,
    isSubmitting: boolean
}) {
    const [phoneNumber, setPhoneNumber] = useState(data.contactPhone || '')
    const [name, setName] = useState(data.contactName || '')
    const [error, setError] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Basic validation
        if (!name.trim()) {
            setError('Please enter your name.')
            return
        }
        if (!phoneNumber || phoneNumber.length < 10) {
            setError('Please enter a valid phone number.')
            return
        }

        setError('')
        updateData({ contactName: name, contactPhone: phoneNumber })
        onSubmit()
    }

    return (
        <div className="animate-fade-in-up">
            <div className="max-w-4xl mx-auto bg-white/40 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-gray-200/50 overflow-hidden flex flex-col md:flex-row">

                {/* Left Side: Branding / Incentive */}
                <div className="w-full md:w-5/12 bg-gradient-to-br from-primary to-accent p-8 md:p-10 lg:p-12 text-white flex flex-col justify-center relative overflow-hidden">
                    {/* Decorative shapes */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-2xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/20 rounded-full blur-2xl -ml-20 -mb-20"></div>

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight drop-shadow-md">
                            Your Personalized Journey Awaits!
                        </h2>
                        <p className="text-white/90 mb-8 text-lg drop-shadow-sm font-medium">
                            We've gathered all your preferences. Provide your details to instantly receive your tailor-made itinerary.
                        </p>

                        <ul className="space-y-4">
                            <li className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">✨</span>
                                <span className="opacity-90">AI-crafted based on your exact vibe</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">👨‍💻</span>
                                <span className="opacity-90">Reviewed by a human travel expert</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">📱</span>
                                <span className="opacity-90">Seamless delivery via WhatsApp/Email</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full md:w-7/12 p-8 md:p-10 lg:p-12 bg-white flex flex-col justify-center relative">
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">Sign up to get your itinerary</h3>
                    <p className="text-gray-500 mb-8 font-medium">No spam. Just your dream trip details.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/20 text-red-200 rounded-xl text-sm font-bold border border-red-500/30 backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-lg text-gray-900 placeholder-gray-400"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                                WhatsApp Number
                            </label>
                            <div className="flex rounded-xl overflow-hidden border border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all bg-gray-50">
                                <span className="inline-flex items-center px-5 py-4 bg-gray-100 border-r border-gray-200 text-gray-600 font-bold text-lg">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full px-5 py-4 bg-transparent border-none transition-colors outline-none font-bold text-lg text-gray-900 placeholder-gray-400"
                                    placeholder="98765 43210"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-5 bg-gray-900 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-0.5 hover:bg-gray-800 transition-all duration-300 flex justify-center items-center disabled:opacity-70 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:shadow-none"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Itinerary...
                                    </>
                                ) : (
                                    'Get My Free Itinerary ✨'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={onPrev}
                                disabled={isSubmitting}
                                className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Go Back
                            </button>
                        </div>

                        <p className="text-xs text-center text-white/50 mt-4">
                            By continuing, you agree to Travelzada's Terms of Service and Privacy Policy.
                        </p>
                    </form>
                </div>

            </div>
        </div>
    )
}
