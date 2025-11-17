const features = [
  {
    title: 'One itinerary, not twenty',
    description: 'We send one perfect plan so you never sift through endless options.',
  },
  {
    title: 'Clear reasoning',
    description: 'Every recommendation comes with the why—so you can decide with confidence.',
  },
  {
    title: 'AI + human touch',
    description: 'Smart automation paired with a real planner to personalize every detail.',
  },
]

export default function WhyTravelzada() {
  return (
    <section className="py-20 px-4 md:px-8 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-10">Why Travelzada</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {features.map((feature) => (
            <div key={feature.title} className="bg-cream rounded-2xl p-6 text-left border border-white shadow-sm">
              <h3 className="text-lg font-semibold text-ink mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
        <a
          href="/ai-planner"
          className="inline-flex items-center justify-center bg-primary text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          TRY AI PLANNER
        </a>
      </div>
    </section>
  )
}


