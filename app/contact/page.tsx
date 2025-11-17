'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setSubmitted(true)
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      })
    }, 3000)
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 px-4 md:px-12 bg-gradient-to-b from-primary/10 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions about your trip? We're here to help! Reach out to us and we'll get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📧</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                      <a href="mailto:hello@travelzada.com" className="text-primary hover:underline">
                        hello@travelzada.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📞</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                      <a href="tel:+911234567890" className="text-primary hover:underline">
                        +91 123 456 7890
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📍</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                      <p className="text-gray-600">
                        123 Travel Street<br />
                        Mumbai, Maharashtra 400001<br />
                        India
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🕒</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Business Hours</h3>
                      <p className="text-gray-600">
                        Monday - Friday: 9:00 AM - 6:00 PM<br />
                        Saturday: 10:00 AM - 4:00 PM<br />
                        Sunday: Closed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Follow Us</h3>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                    <span className="text-xl">📘</span>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                    <span className="text-xl">🐦</span>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                    <span className="text-xl">📷</span>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                    <span className="text-xl">💼</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">✓</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600">We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
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
                        <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                          Subject *
                        </label>
                        <select
                          id="subject"
                          name="subject"
                          required
                          value={formData.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select a subject</option>
                          <option value="general">General Inquiry</option>
                          <option value="booking">Booking Question</option>
                          <option value="itinerary">Itinerary Help</option>
                          <option value="support">Customer Support</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Tell us how we can help you..."
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}


