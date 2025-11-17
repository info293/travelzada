import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function PressPage() {
  const pressReleases = [
    {
      date: 'March 15, 2024',
      title: 'Travelzada Launches AI-Powered Travel Planning Platform',
      excerpt: 'Revolutionary new platform uses artificial intelligence to create personalized travel itineraries in seconds.',
    },
    {
      date: 'February 10, 2024',
      title: 'Travelzada Expands to 50+ Destinations Worldwide',
      excerpt: 'Company announces major expansion, now offering premium travel planning services across five continents.',
    },
    {
      date: 'January 5, 2024',
      title: 'Travelzada Raises $5M in Seed Funding',
      excerpt: 'Funding round led by leading venture capital firms to accelerate product development and market expansion.',
    },
  ]

  const mediaKit = {
    logo: 'Travelzada Brand Logo',
    brandGuidelines: 'Download our brand guidelines and logo assets',
    highResImages: 'Access high-resolution images and press photos',
    companyFactSheet: 'Company overview and key statistics',
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Press & Media
          </h1>
          <p className="text-xl text-gray-600">
            Latest news, press releases, and media resources from Travelzada.
          </p>
        </div>
      </section>

      {/* Press Contact */}
      <section className="py-12 px-4 md:px-12 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Press Inquiries</h2>
            <p className="text-gray-700 mb-6">
              For media inquiries, interview requests, or press-related questions, please contact our press team.
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                <a href="mailto:press@travelzada.com" className="text-primary hover:underline">
                  press@travelzada.com
                </a>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                <a href="tel:+911234567890" className="text-primary hover:underline">
                  +91 123 456 7890
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Latest Press Releases</h2>
          <div className="space-y-6">
            {pressReleases.map((release, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <p className="text-sm text-gray-500 mb-2">{release.date}</p>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{release.title}</h3>
                <p className="text-gray-700 mb-4">{release.excerpt}</p>
                <Link
                  href="/contact"
                  className="text-primary font-semibold hover:underline inline-flex items-center gap-2"
                >
                  Read More →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section className="py-16 px-4 md:px-12 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Media Kit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(mediaKit).map(([key, value], index) => (
              <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {key.split(/(?=[A-Z])/).join(' ')}
                </h3>
                <p className="text-gray-600 mb-4">{value}</p>
                <Link
                  href="/contact"
                  className="text-primary font-semibold hover:underline inline-flex items-center gap-2"
                >
                  Download →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Information */}
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">About Travelzada</h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              Travelzada is a leading AI-powered travel planning platform that helps travelers create 
              personalized, premium itineraries in seconds. Founded in 2023, we combine cutting-edge 
              artificial intelligence with deep travel expertise to revolutionize how people plan their journeys.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our platform serves travelers across 50+ destinations worldwide, offering everything from 
              quick weekend getaways to comprehensive multi-week adventures. We're committed to making 
              premium travel planning accessible, efficient, and enjoyable for everyone.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">50+</div>
                <div className="text-gray-600">Destinations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">10K+</div>
                <div className="text-gray-600">Happy Travelers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">2023</div>
                <div className="text-gray-600">Founded</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

