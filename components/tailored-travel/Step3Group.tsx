'use client'

const GROUP_OPTIONS = [
    { id: 'solo', label: 'Going Solo', icon: '👤', description: 'Just me and my backpack' },
    { id: 'couple', label: 'Partner/Couple', icon: '💑', description: 'Romantic getaway for two' },
    { id: 'friends', label: 'Friends Group', icon: '🎉', description: 'Making memories together' },
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', description: 'Fun for all ages' },
]

const INCLUSION_OPTIONS = [
    { id: 'flights', label: 'Flights', icon: '✈️' },
    { id: 'hotels', label: 'Hotels', icon: '🏨' },
    { id: 'activities', label: 'Activities', icon: '🎫' },
    { id: 'transfers', label: 'Transfers', icon: '🚗' },
    { id: 'visa', label: 'Visa Support', icon: '🛂' },
]

export default function Step3Group({
    data,
    updateData,
    onNext,
    onPrev
}: {
    data: any,
    updateData: (data: any) => void,
    onNext: () => void,
    onPrev: () => void
}) {

    const toggleInclusion = (id: string) => {
        const current = new Set(data.inclusions)
        if (current.has(id)) {
            current.delete(id)
        } else {
            current.add(id)
        }
        updateData({ inclusions: Array.from(current) })
    }

    const handleGroupSelection = (id: string) => {
        const newPassengers = { ...data.passengers }
        if (id === 'solo') {
            newPassengers.adults = 1
            newPassengers.rooms = 1
        } else if (id === 'couple') {
            newPassengers.adults = 2
            newPassengers.rooms = 1
        } else if (id === 'family') {
            newPassengers.adults = 2
            if (newPassengers.kids === 0) newPassengers.kids = 1
            newPassengers.rooms = 1
        } else if (id === 'friends') {
            newPassengers.adults = 4
            newPassengers.rooms = 2
        }

        updateData({
            groupType: id,
            passengers: newPassengers
        })
    }

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight drop-shadow-sm">
                    Who's going on this trip?
                </h2>
                <p className="text-base text-gray-700 font-medium">Select your travel group and what you need included.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Group Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {GROUP_OPTIONS.map((group) => {
                        const isSelected = data.groupType === group.id
                        return (
                            <button
                                key={group.id}
                                onClick={() => handleGroupSelection(group.id)}
                                className={`group flex flex-col items-center justify-center p-5 md:p-6 rounded-[1.5rem] border-2 transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${isSelected
                                    ? 'bg-gradient-to-br from-primary/10 to-[#f85cb5]/10 border-primary shadow-[0_8px_30px_rgba(0,0,0,0.08)] scale-[1.02] z-10'
                                    : 'bg-white/70 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-lg shadow-sm'
                                    }`}
                            >
                                <div className={`text-4xl mb-3 transition-transform duration-500 ease-out ${isSelected ? 'scale-110 drop-shadow-md' : 'grayscale opacity-60 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                                    {group.icon}
                                </div>
                                <h3 className={`font-black text-lg md:text-xl mb-1.5 transition-colors tracking-tight ${isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                    {group.label}
                                </h3>
                                <p className={`text-xs font-medium transition-colors ${isSelected ? 'text-primary' : 'text-gray-500'}`}>{group.description}</p>

                                {/* Selection Indicator */}
                                <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary text-white scale-100 opacity-100' : 'border-gray-300 scale-75 opacity-0 group-hover:opacity-50'}`}>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Inclusions Selection */}
                <div className="bg-white/70 backdrop-blur-2xl rounded-[1.5rem] p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#3abef9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        What should we book for you?
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                        {INCLUSION_OPTIONS.map((item) => {
                            const isSelected = data.inclusions.includes(item.id)
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleInclusion(item.id)}
                                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all duration-300 overflow-hidden ${isSelected
                                        ? 'bg-gray-900 border-gray-900 text-white shadow-[0_4px_15px_rgba(0,0,0,0.15)] scale-105'
                                        : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 shadow-sm'
                                        }`}
                                >
                                    <span className={`text-lg transition-all ${isSelected ? 'grayscale-0 drop-shadow-sm scale-110' : 'grayscale opacity-60'}`}>{item.icon}</span>
                                    <span className="relative z-10 font-bold text-sm tracking-wide">{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

            </div>

            <div className="mt-8 flex justify-center gap-3">
                <button
                    onClick={onPrev}
                    className="px-8 py-3 bg-white text-gray-700 border-2 border-transparent rounded-full font-bold text-base hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!data.groupType}
                    className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all text-center disabled:opacity-30 disabled:hover:scale-100"
                >
                    Hotel Preferences →
                </button>
            </div>

        </div>
    )
}
