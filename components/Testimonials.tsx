const testimonials = [
  {
    name: 'Sarah L.',
    rating: 5,
    quote: 'Travelzada made our anniversary trip unforgettable. The AI planner was spot-on, and the human touch made all the difference. Flawless!',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
  },
  {
    name: 'Mark T.',
    rating: 5,
    quote: 'As a solo traveler, I used to spend weeks planning. Now, I just tell Travelzada what I like, it creates the perfect itinerary in minutes. Game-changer!',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
  },
  {
    name: 'Emily C.',
    rating: 5,
    quote: 'The best part is getting one perfect itinerary, not twenty confusing options. It saved so much time and stress. Highly recommend!',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 px-4 md:px-8 lg:px-12 bg-cream">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-10">What Our Travelers Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm text-left border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-semibold text-ink">{testimonial.name}</p>
                  <p className="text-yellow-500 text-sm">{'★'.repeat(testimonial.rating)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">“{testimonial.quote}”</p>
            </div>
          ))}
        </div>

        <a
          href="/ai-planner"
          className="inline-flex items-center justify-center bg-primary text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          PLAN MY TRIP
        </a>
      </div>
    </section>
  )
}

