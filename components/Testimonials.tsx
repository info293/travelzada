import Link from 'next/link'

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
    <section className="py-24 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-cream via-white to-cream relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-block mb-4">
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Testimonials</span>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-ink mb-6">
          What Our Travelers Say
        </h2>
        <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto">
          Join thousands of satisfied travelers who've experienced the perfect trip
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white rounded-3xl p-8 shadow-lg text-left border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    className="w-16 h-16 rounded-full border-4 border-primary/10 group-hover:border-primary/30 transition-colors" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-ink text-base">{testimonial.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed text-base italic">"{testimonial.quote}"</p>
            </div>
          ))}
        </div>

        <Link
          href="/ai-planner"
          className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-full text-base font-semibold shadow-xl hover:bg-primary-dark hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          PLAN MY TRIP
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </section>
  )
}

