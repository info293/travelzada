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

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight drop-shadow-sm">
                    Who's going on this trip?
                </h2>
                <p className="text-lg text-gray-700 font-medium">Select your travel group and what you need included.</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">

                {/* Group Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {GROUP_OPTIONS.map((group) => {
                        const isSelected = data.groupType === group.id
                        return (
                            <button
                                key={group.id}
                                onClick={() => updateData({ groupType: group.id })}
                                className={`group flex flex-col items-center justify-center p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden ${isSelected
                                    ? 'bg-primary/5 border-primary shadow-md scale-105'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                                    }`}
                            >
                                <div className={`text-6xl mb-5 transition-transform duration-300 ${isSelected ? 'scale-110 drop-shadow-md' : 'grayscale opacity-70 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                                    {group.icon}
                                </div>
                                <h3 className={`font-bold text-2xl mb-2 transition-colors ${isSelected ? 'text-primary' : 'text-gray-900 group-hover:text-primary'}`}>
                                    {group.label}
                                </h3>
                                <p className="text-sm text-gray-500 font-medium">{group.description}</p>
                            </button>
                        )
                    })}
                </div>

                {/* Inclusions Selection */}
                <div className="bg-white/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-gray-200/50 mt-8">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-5">
                        What do you need us to book?
                    </label>
                    <div className="flex flex-wrap gap-4">
                        {INCLUSION_OPTIONS.map((item) => {
                            const isSelected = data.inclusions.includes(item.id)
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleInclusion(item.id)}
                                    className={`relative flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-300 overflow-hidden ${isSelected
                                        ? 'bg-primary border-primary text-white shadow-md shadow-primary/30 scale-105'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                                        }`}
                                >
                                    <span className={`text-xl transition-all ${isSelected ? 'grayscale-0 drop-shadow-md scale-110' : 'grayscale opacity-70'}`}>{item.icon}</span>
                                    <span className="relative z-10 font-bold text-base">{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

            </div>

            <div className="mt-12 flex justify-center gap-4">
                <button
                    onClick={onPrev}
                    className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-full font-bold text-lg hover:bg-gray-50 transition-all shadow-sm"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!data.groupType}
                    className="px-10 py-4 bg-gray-900 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-gray-800 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                    Hotel Preferences →
                </button>
            </div>

        </div>
    )
}
