'use client'

import { useState } from 'react'

const faqs = [
    {
        question: 'How does the AI Trip Planner work?',
        answer:
            'Our AI analyzes your preferences—such as travel dates, budget, and interests—to generate a personalized day-by-day itinerary instantly. You can then customize it further with the help of our human experts.',
    },
    {
        question: 'Is Travelzada free to use?',
        answer:
            'Yes! You can generate unlimited AI itineraries for free. We only charge if you choose to book your trip through us, where you get access to exclusive deals and 24/7 support.',
    },
    {
        question: 'Can I customize the recommended packages?',
        answer:
            'Absolutely. All our packages are 100% customizable. You can add or remove activities, change hotels, or adjust the duration to fit your needs.',
    },
    {
        question: 'What happens after I book a trip?',
        answer:
            'Once you book, you’ll receive a detailed confirmation and a dedicated trip coordinator who will handle all logistics, including transfers, check-ins, and special requests.',
    },
    {
        question: 'Do you offer support during the trip?',
        answer:
            'Yes, we provide 24/7 on-trip support. Whether you need a last-minute change or face an emergency, our team is just a message away.',
    },
]

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <section className="py-16 md:py-24 px-4 md:px-8 lg:px-12 bg-white relative overflow-hidden">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12 md:mb-16">
                    <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] text-primary font-semibold mb-3 block">
                        Got Questions?
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-lg text-gray-600">
                        Everything you need to know about planning your perfect trip.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`border border-gray-200 rounded-2xl transition-all duration-300 ${openIndex === index ? 'bg-gray-50 shadow-sm ring-1 ring-primary/10' : 'bg-white hover:border-gray-300'
                                }`}
                        >
                            <button
                                onClick={() => toggleAccordion(index)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                                aria-expanded={openIndex === index}
                            >
                                <span className={`text-lg font-medium transition-colors ${openIndex === index ? 'text-primary' : 'text-gray-900'}`}>
                                    {faq.question}
                                </span>
                                <span className="ml-4 flex-shrink-0">
                                    <svg
                                        className={`w-6 h-6 transform transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-primary' : 'text-gray-400'}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="p-6 pt-0 text-gray-600 leading-relaxed border-t border-transparent">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
