const activities = [
  {
    name: 'Adventure',
    description: 'Summit landings, heli-skiing, desert flying dinners, deep sea expeditions.',
    icon: '🛩️',
  },
  {
    name: 'Relaxation',
    description: 'Wellness residencies, Ayurvedic retreats, zero-gravity floats, forest bathing.',
    icon: '🌿',
  },
  {
    name: 'Cultural',
    description: 'Museum lock-ins, heritage walks, ateliers with master artisans.',
    icon: '🏛️',
  },
  {
    name: 'Foodie',
    description: 'Chef’s tables, secret hawker lanes, vineyard rescues, progressive terroir menus.',
    icon: '🍽️',
  },
]

export default function ExploreByActivity() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="text-xs uppercase tracking-[0.6em] text-gray-400 mb-3">Discover</p>
            <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 max-w-2xl">
              Choose the lens through which you want to feel the world.
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Need hybrid interests? Our studio layers multiple experiences seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((activity) => (
            <div
              key={activity.name}
              className="group border border-gray-100 rounded-[32px] p-6 md:p-8 hover:border-primary/30 hover:shadow-2xl transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl">
                  {activity.icon}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-primary mb-1">Category</p>
                  <h3 className="text-2xl font-semibold text-gray-900">{activity.name}</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{activity.description}</p>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm mt-4">
                Craft itinerary
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

