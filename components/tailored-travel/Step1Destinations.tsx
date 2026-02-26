'use client'

import { useState } from 'react'

const OPTIONS_EXPERIENCE = [
    { id: 'adventure', label: 'Adventure', icon: '🏂' },
    { id: 'culture', label: 'Culture & Heritage', icon: '🏛️' },
    { id: 'luxury', label: 'Luxury & Relaxation', icon: '✨' },
    { id: 'nature', label: 'Nature & Wildlife', icon: '🌿' },
    { id: 'food', label: 'Food & Culinary', icon: '🍝' },
    { id: 'nightlife', label: 'Nightlife & Parties', icon: '🍸' },
    { id: 'romantic', label: 'Romantic Vibes', icon: '❤️' },
    { id: 'hidden_gems', label: 'Hidden Gems', icon: '🗺️' }
]

export default function Step1Destinations({
    data,
    updateData,
    onNext
}: {
    data: any,
    updateData: (data: any) => void,
    onNext: () => void
}) {
    const [currentDestination, setCurrentDestination] = useState('')

    const handleAddDestination = () => {
        if (currentDestination.trim()) {
            updateData({ destinations: [...data.destinations, currentDestination.trim()] })
            setCurrentDestination('')
        }
    }

    const handleRemoveDestination = (index: number) => {
        const newDestinations = [...data.destinations]
        newDestinations.splice(index, 1)
        updateData({ destinations: newDestinations })
    }

    const toggleExperience = (id: string) => {
        const current = new Set(data.experiences)
        if (current.has(id)) {
            current.delete(id)
        } else {
            current.add(id)
        }
        updateData({ experiences: Array.from(current) })
    }

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight drop-shadow-sm">
                    Where would you like to go?
                </h2>
                <p className="text-lg text-gray-700 font-medium">Tell us your dream destinations and when you want to travel.</p>
            </div>

            <div className="space-y-8 max-w-3xl mx-auto bg-white/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-gray-200/50 shadow-xl">

                {/* Destinations Input */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">
                        Destinations
                    </label>

                    <div className="flex flex-wrap gap-2 mb-3">
                        {data.destinations.map((dest: string, idx: number) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full font-medium shadow-sm"
                            >
                                <span>{dest}</span>
                                <button
                                    onClick={() => handleRemoveDestination(idx)}
                                    className="w-5 h-5 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="relative flex items-center">
                        <div className="absolute left-4 opacity-70 text-gray-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            value={currentDestination}
                            onChange={(e) => setCurrentDestination(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDestination())}
                            placeholder={data.destinations.length === 0 ? "e.g. Bali, Indonesia" : "Add another destination..."}
                            className="w-full pl-12 pr-24 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-lg font-medium outline-none text-gray-900 placeholder-gray-400 shadow-sm"
                        />
                        <button
                            onClick={handleAddDestination}
                            disabled={!currentDestination.trim()}
                            className="absolute right-2 px-6 py-2 bg-gray-900 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-gray-800 transition-colors shadow-md"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Date Selection (Simplified MVP) */}
                <div className="space-y-4 pt-6 border-t border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">
                        When are you traveling?
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {['Flexible', 'Next Month', 'Within 3 Months', 'Decided Dates'].map((dateOption) => {
                            const isSelected = data.dateRange === dateOption
                            return (
                                <button
                                    key={dateOption}
                                    onClick={() => updateData({ dateRange: dateOption })}
                                    className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${isSelected
                                        ? 'border-primary text-primary bg-primary/5 shadow-md scale-[1.02]'
                                        : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                >
                                    <span className="relative z-10">{dateOption}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Experience / Vibe Selection */}
                <div className="space-y-4 pt-6 border-t border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">
                        Choose your experience
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {OPTIONS_EXPERIENCE.map((exp) => {
                            const isSelected = data.experiences.includes(exp.id)
                            return (
                                <button
                                    key={exp.id}
                                    onClick={() => toggleExperience(exp.id)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-full border text-sm font-bold transition-all duration-300 focus:outline-none ${isSelected
                                        ? 'bg-primary border-primary text-white shadow-md shadow-primary/30 scale-105'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                                        }`}
                                >
                                    <span className={isSelected ? 'grayscale-0 drop-shadow-md' : 'grayscale opacity-70'}>{exp.icon}</span>
                                    {exp.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

            </div>

            <div className="mt-12 flex justify-center">
                <button
                    onClick={onNext}
                    disabled={data.destinations.length === 0}
                    className="px-12 py-5 bg-gray-900 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                    Customize Route →
                </button>
            </div>

        </div>
    )
}
