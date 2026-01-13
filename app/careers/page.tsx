'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Job {
  id: string
  title: string
  department: string
  location: string
  type: string
  description: string
  status: 'active' | 'closed'
  createdAt?: string
}

export default function CareersPage() {
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    position: '',
    coverLetter: '',
  })

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        if (!db) return
        const q = query(
          collection(db, 'jobs'),
          where('status', '==', 'active')
        )
        const querySnapshot = await getDocs(q)
        const jobsData: Job[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          jobsData.push({
            id: doc.id,
            title: data.title,
            department: data.department,
            location: data.location,
            type: data.type,
            description: data.description,
            status: data.status,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          } as Job)
        })

        // Sort by createdAt desc client-side to avoid needing a composite index
        jobsData.sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        setJobs(jobsData)
      } catch (err) {
        console.error('Error fetching jobs:', err)
        // Fallback to empty list or handle error silently
      } finally {
        setIsLoadingJobs(false)
      }
    }

    fetchJobs()
  }, [])

  // Set page title and meta description
  useEffect(() => {
    document.title = 'Careers at Travelzada | Join Our Team'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Join the Travelzada team! Explore exciting career opportunities in travel planning, AI/ML engineering, customer success, and more. Work remotely, travel benefits included.')
    }
  }, [])

  const benefits = [
    { icon: '🏥', title: 'Health Insurance', description: 'Comprehensive health coverage for you and your family' },
    { icon: '✈️', title: 'Travel Benefits', description: 'Discounted travel packages and annual travel credits' },
    { icon: '📚', title: 'Learning & Development', description: 'Continuous learning opportunities and skill development budgets' },
    { icon: '🏖️', title: 'Flexible Time Off', description: 'Generous PTO and flexible working arrangements' },
    { icon: '💻', title: 'Remote Work', description: 'Work from anywhere with our remote-friendly culture' },
    { icon: '🎯', title: 'Career Growth', description: 'Clear career paths and rapid advancement opportunities' },
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
    <main className="min-h-screen bg-white font-sans text-ink">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-accent/5 -z-10" />
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white border border-gray-200 text-primary text-sm font-semibold shadow-sm mb-6">
            We're Hiring 🚀
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight tight-leading">
            Shape the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Travel</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join a passionate team dedicated to revolutionizing how the world experiences travel. Build, create, and explore with Travelzada.
          </p>
          <button
            onClick={() => document.getElementById('positions')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white transition-all duration-200 bg-primary border border-transparent rounded-full shadow-lg hover:bg-primary-dark hover:shadow-primary/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            View Open Positions
          </button>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Work at Travelzada?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We believe in taking care of our people so they can take care of our travelers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="group p-8 bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="positions" className="py-24 px-4 bg-gray-50 relative">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Open Positions</h2>
              <p className="text-lg text-gray-600">Find your next role at Travelzada.</p>
            </div>
            <div className="hidden md:block">
              {/* Optional: Add filers here later */}
            </div>
          </div>

          <div className="space-y-4">
            {isLoadingJobs ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading opportunities...</p>
              </div>
            ) : jobs.length > 0 ? (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="group bg-white rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-sm hover:shadow-md border border-gray-100 hover:border-primary/20 transition-all duration-200"
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-2">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {job.department}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        {job.location}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {job.type}
                      </span>
                    </div>
                    <p className="text-gray-600 line-clamp-2 md:line-clamp-1 text-sm">
                      {job.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyClick(job.title)}
                    className="w-full md:w-auto px-6 py-3 bg-white text-gray-900 border border-gray-200 font-semibold rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all duration-200"
                  >
                    Apply Now
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  ✨
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No open roles right now</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  We don't have any specific openings at the moment, but we're always looking for talent!
                </p>
                <button
                  onClick={() => handleApplyClick('General Application')}
                  className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                >
                  Apply Generally
                </button>
              </div>
            )}
          </div>

          {/* General Application CTA if jobs exist */}
          {jobs.length > 0 && (
            <div className="mt-12 text-center">
              <p className="text-gray-600 mb-4">Don't see a perfect fit?</p>
              <button
                onClick={() => handleApplyClick('General Application')}
                className="text-primary font-semibold hover:text-primary-dark transition-colors flex items-center gap-2 mx-auto"
              >
                Submit a General Application
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8 animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-8 py-5 flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Apply for Position</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedPosition || 'General Application'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowApplicationForm(false)
                  setError('')
                }}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 animate-in zoom-in duration-300">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h3>
                  <p className="text-gray-600 max-w-sm mx-auto">
                    Thanks for applying! We've received your details and will be in touch shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800 flex gap-2">
                      <span className="text-lg">📢</span>
                      You are applying for: <strong>{selectedPosition || 'General Roles'}</strong>
                    </p>
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="e.g. Jane Doe"
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="e.g. jane@example.com"
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <div>
                      <label htmlFor="linkedin" className="block text-sm font-semibold text-gray-700 mb-2">
                        LinkedIn Profile (Optional)
                      </label>
                      <input
                        type="url"
                        id="linkedin"
                        name="linkedin"
                        value={formData.linkedin}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="coverLetter" className="block text-sm font-semibold text-gray-700 mb-2">
                      Why are you the perfect fit? *
                    </label>
                    <textarea
                      id="coverLetter"
                      name="coverLetter"
                      required
                      rows={6}
                      value={formData.coverLetter}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                      placeholder="Tell us about your experience and why you'd be a great addition to the team..."
                    />
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">Min. 50 characters</p>
                      <p className="text-xs text-gray-500">{formData.coverLetter.length} chars</p>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 animate-in fade-in">
                      <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="border-t pt-6 flex flex-col-reverse md:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowApplicationForm(false)
                        setError('')
                      }}
                      className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        'Submit Application'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}
