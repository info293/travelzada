import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function CareersPage() {
  const openPositions = [
    {
      title: 'Senior Travel Planner',
      department: 'Operations',
      location: 'Mumbai, India',
      type: 'Full-time',
      description: 'Join our team of travel experts to create exceptional itineraries for our clients.',
    },
    {
      title: 'AI/ML Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'Help us build and improve our AI-powered travel planning algorithms.',
    },
    {
      title: 'Customer Success Manager',
      department: 'Support',
      location: 'Mumbai, India',
      type: 'Full-time',
      description: 'Ensure our customers have the best possible experience with Travelzada.',
    },
    {
      title: 'Content Writer',
      department: 'Marketing',
      location: 'Remote',
      type: 'Part-time',
      description: 'Create engaging travel content for our blog and marketing materials.',
    },
  ]

  const benefits = [
    { icon: '🏥', title: 'Health Insurance', description: 'Comprehensive health coverage for you and your family' },
    { icon: '✈️', title: 'Travel Benefits', description: 'Discounted travel packages and travel credits' },
    { icon: '📚', title: 'Learning & Development', description: 'Continuous learning opportunities and skill development' },
    { icon: '🏖️', title: 'Flexible Time Off', description: 'Generous PTO and flexible working arrangements' },
    { icon: '💻', title: 'Remote Work', description: 'Work from anywhere with our remote-friendly culture' },
    { icon: '🎯', title: 'Career Growth', description: 'Clear career paths and advancement opportunities' },
  ]

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Join Our Team
          </h1>
          <p className="text-xl text-gray-600">
            Help us revolutionize travel planning and create unforgettable experiences for travelers worldwide.
          </p>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-16 px-4 md:px-12 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Work at Travelzada?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Open Positions</h2>
          <div className="space-y-6">
            {openPositions.map((position, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{position.title}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                      <span className="bg-gray-100 px-3 py-1 rounded-full">{position.department}</span>
                      <span className="bg-gray-100 px-3 py-1 rounded-full">{position.location}</span>
                      <span className="bg-gray-100 px-3 py-1 rounded-full">{position.type}</span>
                    </div>
                    <p className="text-gray-700">{position.description}</p>
                  </div>
                  <Link
                    href="/contact"
                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors whitespace-nowrap"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {openPositions.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No open positions at the moment</h3>
              <p className="text-gray-600 mb-6">Check back soon for new opportunities!</p>
              <Link
                href="/contact"
                className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors inline-block"
              >
                Send Us Your Resume
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* General Application */}
      <section className="py-16 px-4 md:px-12 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Don't See a Match?</h2>
          <p className="text-gray-600 mb-8 text-lg">
            We're always looking for talented individuals to join our team. Even if you don't see a position 
            that matches your skills, we'd love to hear from you!
          </p>
          <Link
            href="/contact"
            className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors inline-block"
          >
            Get in Touch
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}

