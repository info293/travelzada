const blogPosts = [
  {
    title: 'Designing sabbaticals that reset your rhythm',
    description: 'A concierge framework for 60-day sabbaticals that weave in wellness, culture, and time in nature.',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80',
    author: 'Editorial Atelier',
  },
  {
    title: 'A food lover’s guide to Southeast Asia',
    description: 'Taste your way through private kitchens, secret hawker stalls, and chef’s tables from Bangkok to Saigon.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
    author: 'Priya Menon',
  },
  {
    title: 'How to plan a stress-free family sabbatical',
    description: 'Our blueprint for multi-generation journeys where every age group feels seen.',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&q=80',
    author: 'Rahul Kumar',
  },
]

export default function BlogSection() {
  return (
    <section className="py-20 md:py-24 px-4 md:px-12 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Dispatches</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900">Stories from the Travelzada journal</h2>
          </div>
          <a href="/blog" className="text-primary font-semibold flex items-center gap-2 hover:gap-3 transition-all">
            View all articles
            <span>→</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <article className="md:col-span-2 rounded-[32px] overflow-hidden relative shadow-lg">
            <img
              src={blogPosts[0].image}
              alt={blogPosts[0].title}
              className="w-full h-[380px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
            <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end text-white">
              <p className="text-sm uppercase tracking-[0.5em] text-white/70 mb-3">Longform</p>
              <h3 className="text-3xl md:text-4xl font-semibold mb-3 max-w-2xl">{blogPosts[0].title}</h3>
              <p className="text-white/80 max-w-2xl">{blogPosts[0].description}</p>
            </div>
          </article>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {blogPosts.slice(1).map((post) => (
            <article
              key={post.title}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100"
            >
              <div className="h-56 overflow-hidden">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6 space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{post.author}</p>
                <h3 className="text-2xl font-semibold text-gray-900">{post.title}</h3>
                <p className="text-gray-600 text-sm">{post.description}</p>
                <a href="/blog" className="text-primary font-semibold flex items-center gap-2 hover:gap-3 transition-all text-sm">
                  Continue reading
                  <span>→</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}


