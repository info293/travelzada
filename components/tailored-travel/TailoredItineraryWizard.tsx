'use client'

import { useState } from 'react'
import Step1Destinations from './Step1Destinations'
import Step2Route from './Step2Route'
import Step3Group from './Step3Group'
import Step4Stay from './Step4Stay'
import Step5Contact from './Step5Contact'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import WizardSidePanel from './WizardSidePanel'

export default function TailoredItineraryWizard() {
    const [currentStep, setCurrentStep] = useState(1)
    const [direction, setDirection] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()

    // Centralized State for the Wizard
    const [wizardData, setWizardData] = useState({
        destinations: [] as string[],
        dateRange: 'Flexible',
        experiences: [] as string[],
        routeItems: [] as any[], // mapped from destinations in Step 2 {destination, nights}
        groupType: '',
        inclusions: ['hotels', 'flights'] as string[],
        hotelTypes: ['4-star'] as string[],
        passengers: {
            adults: 2,
            kids: 0,
            rooms: 1
        },
        contactName: '',
        contactPhone: ''
    })

    const updateData = (newData: Partial<typeof wizardData>) => {
        setWizardData(prev => ({ ...prev, ...newData }))
    }

    const handleNext = () => {
        setDirection(1)
        setCurrentStep(prev => prev + 1)
    }

    const handlePrev = () => {
        setDirection(-1)
        setCurrentStep(prev => prev - 1)
    }

    // Submits lead to Firebase
    const handleSubmit = async () => {
        setIsSubmitting(true)
        setError(null)

        try {
            const leadId = uuidv4()
            await addDoc(collection(db, 'tailored_leads'), {
                leadId,
                status: 'new',
                ...wizardData,
                createdAt: serverTimestamp(),
                source: 'tailored_travel_wizard'
            })

            // Assuming we just want to save it as a lead for now based on user instruction
            // Route to a success page or back home with a success state
            alert("Success! Your itinerary request has been submitted. Our team will contact you shortly on WhatsApp.")
            router.push('/')

        } catch (err: any) {
            console.error("Error submitting tailored itinerary lead:", err)
            setError("Something went wrong saving your request. Please try again.")
            setIsSubmitting(false)
        }
    }

    // Calculate Progress Percent
    const progressPercent = ((currentStep - 1) / 4) * 100

    return (
        <div className="w-full max-w-[90rem] mx-auto py-4 md:py-8 px-4 md:px-8 flex-1 flex flex-col">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1 w-full relative z-10 transition-all duration-500 min-h-[700px]">

                {/* LEFT COLUMN: WIZARD FORM */}
                <div className="w-full lg:w-[55%] flex flex-col relative z-20">
                    <div className="bg-white/80 backdrop-blur-3xl border border-gray-200/50 shadow-2xl shadow-gray-200/50 rounded-[2.5rem] p-6 lg:p-8 text-gray-900 flex-1 flex flex-col relative overflow-hidden">

                        {/* Progress Bar Container */}
                        <div className="mb-12 max-w-3xl mx-auto w-full px-4 md:px-0 mt-6 relative z-10">
                            <div className="flex justify-between text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider relative z-10">
                                <span className={`transition-colors ${currentStep >= 1 ? 'text-gray-900 drop-shadow-sm' : ''}`}>Start</span>
                                <span className={`transition-colors ${currentStep >= 2 ? 'text-gray-900 drop-shadow-sm' : ''}`}>Route</span>
                                <span className={`transition-colors ${currentStep >= 3 ? 'text-gray-900 drop-shadow-sm' : ''}`}>Group</span>
                                <span className={`transition-colors ${currentStep >= 4 ? 'text-gray-900 drop-shadow-sm' : ''}`}>Stay</span>
                                <span className={`transition-colors ${currentStep >= 5 ? 'text-gray-900 drop-shadow-sm' : ''}`}>Finish</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden relative shadow-inner">
                                <div
                                    className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all duration-700 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>

                        {error && (
                            <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-medium">
                                {error}
                            </div>
                        )}

                        {/* Step Rendering with Framer Motion */}
                        <div className="px-4 relative overflow-hidden min-h-[600px]">
                            <AnimatePresence mode="wait" custom={direction} initial={false}>
                                <motion.div
                                    key={currentStep}
                                    custom={direction}
                                    variants={{
                                        enter: (dir: number) => ({
                                            x: dir > 0 ? 800 : -800,
                                            opacity: 0
                                        }),
                                        center: {
                                            zIndex: 1,
                                            x: 0,
                                            opacity: 1
                                        },
                                        exit: (dir: number) => ({
                                            zIndex: 0,
                                            x: dir < 0 ? 800 : -800,
                                            opacity: 0
                                        })
                                    }}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 }
                                    }}
                                    className="w-full"
                                >
                                    {currentStep === 1 && (
                                        <Step1Destinations
                                            data={wizardData}
                                            updateData={updateData}
                                            onNext={handleNext}
                                        />
                                    )}
                                    {currentStep === 2 && (
                                        <Step2Route
                                            data={wizardData}
                                            updateData={updateData}
                                            onNext={handleNext}
                                            onPrev={handlePrev}
                                        />
                                    )}
                                    {currentStep === 3 && (
                                        <Step3Group
                                            data={wizardData}
                                            updateData={updateData}
                                            onNext={handleNext}
                                            onPrev={handlePrev}
                                        />
                                    )}
                                    {currentStep === 4 && (
                                        <Step4Stay
                                            data={wizardData}
                                            updateData={updateData}
                                            onNext={handleNext}
                                            onPrev={handlePrev}
                                        />
                                    )}
                                    {currentStep === 5 && (
                                        <Step5Contact
                                            data={wizardData}
                                            updateData={updateData}
                                            onSubmit={handleSubmit}
                                            onPrev={handlePrev}
                                            isSubmitting={isSubmitting}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: MAP & SUMMARY */}
                <WizardSidePanel currentStep={currentStep} data={wizardData} />

            </div>
        </div>
    )
}
