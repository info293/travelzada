'use client'

import { useState, useRef, useEffect } from 'react'
import indianDestinationsData from '@/data/indian-destinations-data.json'

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

interface DestinationOption {
    name: string   // what gets saved to wizard data (e.g. "Kerala")
    label: string  // what the user sees in dropdown (e.g. "Kerala, India")
}

// Fallback destinations from local JSON
const FALLBACK_DESTINATIONS: DestinationOption[] = Array.from(
    new Map(
        indianDestinationsData.destinations.map(
            (d: { name: string; country: string }) => [d.name, { name: d.name, label: `${d.name}, ${d.country}` }]
        )
    ).values()
)

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
    const [showDropdown, setShowDropdown] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const [allDestinations, setAllDestinations] = useState<DestinationOption[]>(FALLBACK_DESTINATIONS)
    const [isLoading, setIsLoading] = useState(true)
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Fetch destinations from Firestore on mount
    useEffect(() => {
        async function fetchFromFirestore() {
            try {
                const { db } = await import('@/lib/firebase')
                const { collection, getDocs } = await import('firebase/firestore')

                if (!db) {
                    setIsLoading(false)
                    return
                }

                const snapshot = await getDocs(collection(db, 'destinations'))
                const options: DestinationOption[] = []
                const seen = new Set<string>()

                snapshot.forEach((doc) => {
                    const d = doc.data()
                    if (d.name && !seen.has(d.name)) {
                        seen.add(d.name)
                        options.push({
                            name: d.name,
                            label: d.country ? `${d.name}, ${d.country}` : d.name
                        })
                    }
                })

                if (options.length > 0) {
                    setAllDestinations(options)
                }
            } catch (err) {
                console.error('Failed to fetch destinations from Firestore, using fallback:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchFromFirestore()
    }, [])

    const filteredDestinations = currentDestination.trim().length > 0
        ? allDestinations.filter(d =>
            d.label.toLowerCase().includes(currentDestination.toLowerCase()) ||
            d.name.toLowerCase().includes(currentDestination.toLowerCase())
        )
        : allDestinations.slice(0, 5)

    const isValidDestination = (value: string) =>
        allDestinations.some(d =>
            d.label.toLowerCase() === value.toLowerCase() ||
            d.name.toLowerCase() === value.toLowerCase()
        )

    const handleAddDestination = (dest?: DestinationOption | string) => {
        let option: DestinationOption | undefined
        if (dest && typeof dest === 'object') {
            option = dest
        } else {
            const value = (typeof dest === 'string' ? dest : currentDestination).trim()
            option = allDestinations.find(d =>
                d.label.toLowerCase() === value.toLowerCase() ||
                d.name.toLowerCase() === value.toLowerCase()
            )
        }
        if (option && data.destinations.length === 0) {
            // Save only the name (e.g. "Kerala"), not "Kerala, India"
            updateData({ destinations: [option.name] })
            setCurrentDestination('')
            setShowDropdown(false)
            setHighlightedIndex(-1)
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightedIndex(prev => Math.min(prev + 1, filteredDestinations.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightedIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (highlightedIndex >= 0 && filteredDestinations[highlightedIndex]) {
                handleAddDestination(filteredDestinations[highlightedIndex])
            } else {
                handleAddDestination()
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false)
        }
    }

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-6 sm:mb-10">
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-4 tracking-tight drop-shadow-sm">
                    Where would you like to go?
                </h2>
                <p className="text-sm sm:text-lg text-gray-700 font-medium px-2">Tell us your dream destinations and when you want to travel.</p>
            </div>

            <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto bg-white/70 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">

                {/* Destinations Input */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">
                        Destinations
                    </label>

                    <div className="flex flex-wrap gap-2.5 mb-3">
                        {data.destinations.map((dest: string, idx: number) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 bg-gradient-to-r from-primary to-[#ff8a3d] text-white px-5 py-3 rounded-2xl font-bold shadow-md shadow-primary/20 text-base"
                            >
                                <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span>{dest}</span>
                                <button
                                    onClick={() => handleRemoveDestination(idx)}
                                    className="w-5 h-5 bg-black/20 rounded-full hover:bg-black/40 flex items-center justify-center transition-colors shrink-0 ml-1"
                                >
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {data.destinations.length === 0 && (
                        <div className="relative">
                            {/* Input row */}
                            <div className="relative flex items-center group">
                                <div className="absolute left-4 opacity-40 text-gray-500 group-focus-within:opacity-100 group-focus-within:text-primary transition-colors">
                                    {isLoading ? (
                                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    )}
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={currentDestination}
                                    onChange={(e) => {
                                        setCurrentDestination(e.target.value)
                                        setShowDropdown(true)
                                        setHighlightedIndex(-1)
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isLoading ? 'Loading destinations...' : 'e.g. Goa, India'}
                                    disabled={isLoading}
                                    autoComplete="off"
                                    className="w-full pl-11 pr-24 py-3 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/10 transition-all text-sm sm:text-base font-medium outline-none text-gray-900 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                <button
                                    onClick={() => handleAddDestination()}
                                    disabled={!currentDestination.trim() || !isValidDestination(currentDestination)}
                                    className="absolute right-2 px-5 py-2 bg-black text-white rounded-xl font-bold disabled:opacity-0 disabled:pointer-events-none hover:bg-gray-800 transition-all shadow-md text-sm tracking-wide"
                                >
                                    ADD
                                </button>
                            </div>

                            {/* Invalid input hint */}
                            {currentDestination.trim().length > 0 && !isValidDestination(currentDestination) && filteredDestinations.length === 0 && (
                                <p className="mt-2 text-xs text-amber-500 font-medium pl-1">
                                    ⚠️ We don't have packages for this destination yet. Please choose from the suggestions.
                                </p>
                            )}

                            {/* Dropdown */}
                            {showDropdown && !isLoading && filteredDestinations.length > 0 && (
                                <div
                                    ref={dropdownRef}
                                    className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden"
                                >
                                    <ul className="max-h-56 overflow-y-auto py-1.5">
                                        {filteredDestinations.map((dest, idx) => (
                                            <li
                                                key={dest.name}
                                                onMouseDown={(e) => {
                                                    e.preventDefault()
                                                    handleAddDestination(dest)
                                                }}
                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm font-medium transition-colors ${highlightedIndex === idx
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <svg className="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span>{dest.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Date Selection */}
                <div className="space-y-4 pt-6 border-t border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">
                        When are you traveling?
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        {['Flexible', 'Next Month', 'Within 3 Months', 'Decided Dates'].map((dateOption) => {
                            const isSelected = data.dateRange === dateOption
                            return (
                                <button
                                    key={dateOption}
                                    onClick={() => updateData({ dateRange: dateOption })}
                                    className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${isSelected
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
                <div className="space-y-4 pt-6 border-t border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">
                        Choose your vibe
                    </label>
                    <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {OPTIONS_EXPERIENCE.map((exp) => {
                            const isSelected = data.experiences.includes(exp.id)
                            return (
                                <button
                                    key={exp.id}
                                    onClick={() => toggleExperience(exp.id)}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border-2 text-xs sm:text-sm font-bold transition-all duration-300 focus:outline-none ${isSelected
                                        ? 'bg-gray-900 border-gray-900 text-white shadow-[0_4px_15px_rgba(0,0,0,0.15)] scale-105'
                                        : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 shadow-sm'
                                        }`}
                                >
                                    <span className={`text-sm sm:text-base ${isSelected ? 'grayscale-0 drop-shadow-sm' : 'grayscale opacity-60'}`}>{exp.icon}</span>
                                    {exp.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

            </div>

            <div className="mt-8 flex justify-center">
                <button
                    onClick={onNext}
                    disabled={data.destinations.length === 0}
                    className="px-10 py-4 bg-gray-900 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                    Customize Route →
                </button>
            </div>

        </div>
    )
}
