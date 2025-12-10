'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function CareersPage() {
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    position: '',
    coverLetter: '',
  })

  // Set page title and meta description
  useEffect(() => {
    document.title = 'Careers at Travelzada | Join Our Team'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Join the Travelzada team! Explore exciting career opportunities in travel planning, AI/ML engineering, customer success, and more. Work remotely, travel benefits included.')
    }
  }, [])


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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleApplyClick = (positionTitle: string) => {
    setSelectedPosition(positionTitle)
    setFormData(prev => ({ ...prev, position: positionTitle }))
    setShowApplicationForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      if (typeof window === 'undefined' || !db) {
        throw new Error('Database is not available. Please try again later.')
      }

      // Basic validation
      if (!formData.name.trim() || !formData.email.trim() || !formData.coverLetter.trim()) {
        throw new Error('Please fill in all required fields.')
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error('Please enter a valid email address.')
      }

      // LinkedIn URL validation (optional but if provided, should be valid)
      if (formData.linkedin.trim() && !formData.linkedin.trim().includes('linkedin.com')) {
        throw new Error('Please enter a valid LinkedIn profile URL.')
      }

      // Save to Firestore
      await addDoc(collection(db, 'job_applications'), {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || '',
        linkedin: formData.linkedin.trim() || '',
        position: formData.position || 'General Application',
        coverLetter: formData.coverLetter.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
        read: false,
      })

      setIsSubmitting(false)
      setSubmitted(true)

      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false)
        setShowApplicationForm(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          linkedin: '',
          position: '',
          coverLetter: '',
        })
        setSelectedPosition('')
      }, 3000)
    } catch (err: any) {
      console.error('Error submitting application:', err)
      setError(err.message || 'Something went wrong. Please try again later.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Application Form Modal/Overlay */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Job Application</h2>
              <button
                onClick={() => {
                  setShowApplicationForm(false)
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
                  <p className="text-gray-600">Thank you for your interest. We'll review your application and get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="position" className="block text-sm font-semibold text-gray-700 mb-2">
                      Position Applying For *
                    </label>
                    <select
                      id="position"
                      name="position"
                      required
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a position</option>
                      {openPositions.map((pos, idx) => (
                        <option key={idx} value={pos.title}>{pos.title}</option>
                      ))}
                      <option value="General Application">General Application</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="+91 123 456 7890"
                      />
                    </div>

                    <div>
                      <label htmlFor="linkedin" className="block text-sm font-semibold text-gray-700 mb-2">
                        LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        id="linkedin"
                        name="linkedin"
                        value={formData.linkedin}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="coverLetter" className="block text-sm font-semibold text-gray-700 mb-2">
                      Cover Letter *
                    </label>
                    <textarea
                      id="coverLetter"
                      name="coverLetter"
                      required
                      rows={8}
                      value={formData.coverLetter}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Please share your background, relevant experience, and why you want to join Travelzada.</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowApplicationForm(false)
                        setError('')
                      }}
                      className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-20 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
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
      <section className="py-20 px-4 md:px-12 bg-gray-50">
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
                  <button
                    onClick={() => handleApplyClick(position.title)}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors whitespace-nowrap"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {openPositions.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No open positions at the moment</h3>
              <p className="text-gray-600 mb-6">Check back soon for new opportunities!</p>
              <button
                onClick={() => handleApplyClick('General Application')}
                className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors inline-block"
              >
                Submit General Application
              </button>
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
          <button
            onClick={() => handleApplyClick('General Application')}
            className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors inline-block"
          >
            Submit General Application
          </button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
