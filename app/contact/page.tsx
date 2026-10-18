'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SchemaMarkup, { generateContactPageSchema, generateBreadcrumbSchema, generateWebPageSchema } from '@/components/SchemaMarkup'
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import emailjs from '@emailjs/browser'

interface Destination {
  id?: string
  name: string
  slug: string
  country: string
}

const defaultOccasions = [
  'Honeymoon',
  'Minimoon',
  'Proposal',
  'Surprise trip',
  'Wedding night',
  'Luxury getaway',
  'Wedding blessings',
  'Anniversary',
  'Babymoon',
  'Trip for parents'
]

const staticDestinations: string[] = [
  'Andaman & Nicobar',
  'Bali',
  'Bhutan',
  'Dubai',
  'Georgia',
  'Goa',
  'Kashmir',
  'Kerala',
  'Malaysia',
  'Maldives',
  'Nepal',
  'North-East India',
  'Rajasthan',
  'Singapore',
  'Sri Lanka',
  'Tamil Nadu',
  'Thailand',
  'Vietnam',
  'Baku'
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    occasion: 'Honeymoon',
    when: 'Flexible',
    destination: '',
    message: ''
  })

  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [tried, setTried] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)

  // Dynamic next 12 months options
  const [months, setMonths] = useState<string[]>(['Flexible'])

  useEffect(() => {
    document.title = 'Contact Travelzada — Plan a journey designed for two'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Tell us your occasion and dream destination. A personal travel designer curates a free, itemised itinerary for the two of you within 24 hours.'
      )
    }

    // Populate months
    const now = new Date()
    const generatedMonths = ['Flexible']
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      generatedMonths.push(d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }))
    }
    setMonths(generatedMonths)

    // Populate initial static destinations
    setDestinations(staticDestinations.map(name => ({ name, slug: name.toLowerCase().replace(/\s+/g, '-'), country: '' })))

    // Fetch live Firestore destinations if available
    if (db) {
      getDocs(collection(db, 'destinations'))
        .then(snap => {
          if (!snap.empty) {
            const list: Destination[] = []
            snap.forEach(doc => {
              const d = doc.data() as any
              if (d.name) {
                list.push({ id: doc.id, name: d.name, slug: d.slug || doc.id, country: d.country || '' })
              }
            })
            if (list.length > 0) {
              setDestinations(list)
            }
          }
        })
        .catch(() => {})
    }

    // Window resize handler for mobile floating bar
    const handleResize = () => setIsNarrow(window.innerWidth < 760)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const phoneValid = formData.phone.replace(/\D/g, '').length >= 10
  const nameValid = formData.name.trim().length > 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)

    if (!nameValid || !phoneValid) {
      setError('Please provide your names and a valid 10-digit WhatsApp number.')
      return
    }

    setIsSubmitting(true)
    setError('')

    const cleanName = formData.name.trim()
    const cleanPhone = formData.phone.trim()
    const cleanEmail = formData.email.trim().toLowerCase() || `${cleanPhone}@travelzada.guest`
    const cleanDest = formData.destination.trim() || 'Open to ideas'
    const fullMessage = formData.message.trim() || `Occasion: ${formData.occasion}, When: ${formData.when}, Destination: ${cleanDest}`

    try {
      if (typeof window === 'undefined' || !db) {
        throw new Error('Database is currently not available. Please chat with us on WhatsApp.')
      }

      // Save to Firestore contact_messages
      await addDoc(collection(db, 'contact_messages'), {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        occasion: formData.occasion,
        when: formData.when,
        destination: cleanDest,
        message: fullMessage,
        status: 'new',
        createdAt: serverTimestamp(),
        read: false,
      })

      // Send email notification to travelzada team
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead_notification',
          data: {
            name: cleanName,
            mobile: cleanPhone,
            email: cleanEmail,
            packageName: `Contact Enquiry: ${formData.occasion} - ${cleanDest}`,
            message: fullMessage,
            sourceUrl: typeof window !== 'undefined' ? window.location.href : 'Contact Page',
          },
        }),
      }).catch((emailError) => {
        console.error('Failed to send lead notification email:', emailError)
      })

      // Backup EmailJS dispatch
      emailjs
        .send(
          'service_6e9dvlb',
          'template_qz05lkd',
          {
            name: cleanName,
            mobile: cleanPhone,
            email: cleanEmail,
            packageName: `Contact Enquiry: ${formData.occasion} - ${cleanDest}`,
            message: fullMessage,
            sourceUrl: 'Contact Us Page',
          },
          'gIP99fUwF6iBneHVb'
        )
        .catch(() => {})

      setIsSubmitting(false)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Error submitting contact form:', err)
      setError(err.message || 'Something went wrong. Please connect with us directly on WhatsApp.')
      setIsSubmitting(false)
    }
  }

  const contactSchema = generateContactPageSchema()
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' },
    { name: 'Contact' }
  ])
  const webPageSchema = generateWebPageSchema({
    name: 'Contact Travelzada — Plan a journey designed for two',
    description: 'Get in touch with a real travel designer for couples. Personalised itineraries, romantic getaways and honeymoons.',
    url: 'https://www.travelzada.com/contact',
    websiteUrl: 'https://www.travelzada.com',
  })

  // Format first name for the thank-you screen
  const firstName = formData.name.split(/&|\band\b|,/i)[0].trim() || 'you two'

  // Pre-filled WhatsApp message
  const waLeadMsg = encodeURIComponent(
    `Hi Travelzada! We are ${formData.name || 'planning a trip'}. We are looking to plan a ${formData.occasion || 'romantic getaway'} to ${formData.destination || 'a special place'} around ${formData.when || 'soon'}. Could you help us with a personalised itinerary?`
  )

  return (
    <>
      <SchemaMarkup schema={contactSchema} id="contact-schema" />
      <SchemaMarkup schema={breadcrumbSchema} id="breadcrumb-schema-contact" />
      <SchemaMarkup schema={webPageSchema} id="webpage-schema-contact" />

      <Header />

      <main className="font-figtree text-[#3B2A20] bg-[#F6F1E6] text-[16px] antialiased selection:bg-[#E8DCC3] min-h-screen">

        {/* ─────────────────────────────────────────────────────────────
            1. HERO & INTERACTIVE PLANNER FORM
        ───────────────────────────────────────────────────────────── */}
        <section className="relative bg-[#2B1D17] text-[#F6F1E6] overflow-hidden pt-24 md:pt-28">
          {/* Background Hero Image */}
          <div className="absolute inset-0">
            <img
              src="/images/contact/contact-hero.jpg"
              alt="Romantic candlelight dinner for two"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
          </div>

          {/* Luxury Scrim Vignette Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(43,29,23,0.95) 0%, rgba(43,29,23,0.82) 42%, rgba(43,29,23,0.58) 100%), linear-gradient(180deg, rgba(43,29,23,0.65) 0%, rgba(43,29,23,0.15) 26%, rgba(43,29,23,0) 70%, rgba(43,29,23,0.92) 100%)'
            }}
          />

          <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8 py-12 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* Left Column: Heading & Contact Channels */}
            <div className="animate-[tzRise_0.8s_ease_both]">
              <div className="text-[12.5px] font-semibold tracking-[0.3em] uppercase text-[#E8DCC3]">
                Contact us
              </div>
              <h1 className="font-cormorant font-normal text-[clamp(46px,6.2vw,90px)] leading-[0.98] tracking-[-0.01em] mt-5 text-balance">
                Let's plan something{' '}
                <span className="font-pinyon font-normal text-[#E8DCC3] text-[0.92em] tracking-normal">
                  for two
                </span>
              </h1>
              <p className="text-[clamp(16.5px,1.4vw,18.5px)] leading-relaxed text-[#F6F1E6] mt-6 max-w-[470px]">
                Tell us the occasion and a few details. A real travel designer gets back to you with a free, personalised itinerary.
              </p>

              {/* Contact Channels */}
              <div className="grid gap-3 mt-8 sm:mt-11 max-w-[470px]">
                {/* WhatsApp */}
                <a
                  href="https://wa.me/919929962350"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-[16px] bg-[#F6F1E6]/10 border border-[#F6F1E6]/25 backdrop-blur-md text-[#F6F1E6] hover:bg-[#F6F1E6]/20 hover:border-[#F6F1E6]/50 transition group"
                >
                  <span className="flex-none w-11 h-11 rounded-full bg-[#F6F1E6] text-[#3B2A20] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z" />
                    </svg>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11.5px] font-semibold tracking-[0.16em] uppercase text-[#E8DCC3]">
                      WhatsApp
                    </span>
                    <span className="block text-[17px] font-medium mt-0.5">
                      +91 99299 62350
                    </span>
                  </span>
                  <span className="text-[#E8DCC3] group-hover:translate-x-1 transition-transform text-[18px]">
                    →
                  </span>
                </a>

                {/* Direct Call */}
                <a
                  href="tel:+919929962350"
                  className="flex items-center gap-4 p-4 rounded-[16px] bg-[#F6F1E6]/10 border border-[#F6F1E6]/25 backdrop-blur-md text-[#F6F1E6] hover:bg-[#F6F1E6]/20 hover:border-[#F6F1E6]/50 transition group"
                >
                  <span className="flex-none w-11 h-11 rounded-full bg-[#F6F1E6] text-[#3B2A20] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
                    </svg>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11.5px] font-semibold tracking-[0.16em] uppercase text-[#E8DCC3]">
                      Direct Call
                    </span>
                    <span className="block text-[17px] font-medium mt-0.5">
                      +91 99299 62350
                    </span>
                  </span>
                  <span className="text-[#E8DCC3] group-hover:translate-x-1 transition-transform text-[18px]">
                    →
                  </span>
                </a>

                {/* Email */}
                <a
                  href="mailto:info@travelzada.com"
                  className="flex items-center gap-4 p-4 rounded-[16px] bg-[#F6F1E6]/10 border border-[#F6F1E6]/25 backdrop-blur-md text-[#F6F1E6] hover:bg-[#F6F1E6]/20 hover:border-[#F6F1E6]/50 transition group"
                >
                  <span className="flex-none w-11 h-11 rounded-full bg-[#F6F1E6] text-[#3B2A20] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18v12H3zM3 7l9 6 9-6" />
                    </svg>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11.5px] font-semibold tracking-[0.16em] uppercase text-[#E8DCC3]">
                      Email
                    </span>
                    <span className="block text-[17px] font-medium mt-0.5 truncate">
                      info@travelzada.com
                    </span>
                  </span>
                  <span className="text-[#E8DCC3] group-hover:translate-x-1 transition-transform text-[18px]">
                    →
                  </span>
                </a>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap mt-7 text-[14.5px] text-[#F6F1E6]/90">
                <Link href="/reviews" className="hover:underline flex items-center gap-1.5">
                  <strong className="font-semibold text-amber-300">★ 4.9</strong>
                  <span>from 500+ couples</span>
                </Link>
                <span className="w-1 h-1 rounded-full bg-[#E8DCC3]" />
                <span>No payment until you love the plan</span>
              </div>
            </div>

            {/* Right Column: Form Card or Confirmation */}
            <div className="bg-white text-[#3B2A20] rounded-[24px] p-6 sm:p-10 shadow-[0_40px_80px_-36px_rgba(0,0,0,0.7)] animate-[tzRise_0.8s_0.1s_ease_both]">
              {!submitted ? (
                <div>
                  <h2 className="font-cormorant font-semibold text-[clamp(30px,2.8vw,38px)] leading-[1.05]">
                    Plan your trip
                  </h2>
                  <div className="text-[15px] text-[#7A4F34] mt-1.5">
                    Takes 30 seconds. We'll take it from there.
                  </div>

                  <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-5 mt-6">
                    {/* Names */}
                    <label className="block">
                      <div className="text-[14px] font-semibold">Your names</div>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Riya &amp; Aarav"
                        className={`w-full box-border mt-2 border rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[16px] text-[#3B2A20] p-3.5 transition focus:bg-white focus:border-[#B88A5A] ${
                          tried && !nameValid ? 'border-rose-600 bg-rose-50/50' : 'border-[#E8DCC3]'
                        }`}
                      />
                      {tried && !nameValid && (
                        <div className="text-[13px] text-rose-600 mt-1 font-medium">
                          Please tell us who is travelling.
                        </div>
                      )}
                    </label>

                    {/* WhatsApp Mobile */}
                    <label className="block">
                      <div className="text-[14px] font-semibold">WhatsApp number</div>
                      <div
                        className={`flex items-center mt-2 border rounded-[12px] bg-[#F6F1E6] overflow-hidden focus-within:bg-white focus-within:border-[#B88A5A] transition ${
                          tried && !phoneValid ? 'border-rose-600 bg-rose-50/50' : 'border-[#E8DCC3]'
                        }`}
                      >
                        <span className="flex-none px-3.5 text-[15.5px] font-semibold text-[#7A4F34] border-r border-[#E8DCC3]">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^\d\s]/g, '') })}
                          placeholder="98765 43210"
                          className="flex-1 min-w-0 border-none bg-transparent outline-none font-figtree text-[16px] text-[#3B2A20] p-3.5"
                        />
                      </div>
                      {tried && !phoneValid && (
                        <div className="text-[13px] text-rose-600 mt-1 font-medium">
                          Enter a valid 10-digit mobile number.
                        </div>
                      )}
                    </label>

                    {/* Occasion & When (2-column layout) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Occasion select */}
                      <label className="block">
                        <div className="text-[14px] font-semibold">Occasion</div>
                        <select
                          value={formData.occasion}
                          onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                          className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[15.5px] text-[#3B2A20] p-3.5 cursor-pointer focus:border-[#B88A5A] focus:bg-white transition"
                        >
                          {defaultOccasions.map((occ) => (
                            <option key={occ} value={occ}>
                              {occ}
                            </option>
                          ))}
                        </select>
                      </label>

                      {/* When select */}
                      <label className="block">
                        <div className="text-[14px] font-semibold">When</div>
                        <select
                          value={formData.when}
                          onChange={(e) => setFormData({ ...formData, when: e.target.value })}
                          className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[15.5px] text-[#3B2A20] p-3.5 cursor-pointer focus:border-[#B88A5A] focus:bg-white transition"
                        >
                          {months.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Where to? (Destination) */}
                    <label className="block">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-[14px] font-semibold">Where to?</span>
                        <span className="text-[12.5px] text-[#7A4F34]">Select or type any place</span>
                      </div>
                      <input
                        type="text"
                        list="destinations-list"
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        placeholder="Bali, Kashmir, Kerala, or help us choose..."
                        className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[16px] text-[#3B2A20] p-3.5 transition focus:bg-white focus:border-[#B88A5A]"
                      />
                      <datalist id="destinations-list">
                        {destinations.map((d) => (
                          <option key={d.name} value={d.name} />
                        ))}
                      </datalist>
                    </label>

                    {/* Email (Optional for itinerary PDF) */}
                    <label className="block">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-[14px] font-semibold">Email address</span>
                        <span className="text-[12.5px] text-[#7A4F34]">Optional for itinerary copy</span>
                      </div>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="riya.aarav@gmail.com"
                        className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[16px] text-[#3B2A20] p-3.5 transition focus:bg-white focus:border-[#B88A5A]"
                      />
                    </label>

                    {/* Optional wishlist / note */}
                    <label className="block">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-[14px] font-semibold">Special wishlist or notes</span>
                        <span className="text-[12.5px] text-[#7A4F34]">Optional</span>
                      </div>
                      <textarea
                        rows={2}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Candlelight dinner, private pool villa, relaxed pace..."
                        className="w-full box-border mt-2 border border-[#E8DCC3] rounded-[12px] bg-[#F6F1E6] outline-none font-figtree text-[15px] text-[#3B2A20] p-3 transition focus:bg-white focus:border-[#B88A5A] resize-none"
                      />
                    </label>

                    {error && (
                      <div className="text-rose-600 text-[14px] font-medium bg-rose-50 p-3 rounded-xl border border-rose-200">
                        {error}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full mt-2 font-figtree text-[16px] font-semibold text-[#F6F1E6] bg-[#3B2A20] disabled:bg-gray-400 border-none rounded-full py-4 px-6 cursor-pointer transition hover:bg-[#7A4F34] hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span>Connecting with personal designer...</span>
                      ) : (
                        <span>Get our free itinerary</span>
                      )}
                    </button>

                    <div className="text-[13px] text-[#7A4F34] text-center mt-1">
                      Free planning. We never share your number or spam you.
                    </div>
                  </form>
                </div>
              ) : (
                /* Success Screen */
                <div className="animate-[tzRise_0.5s_ease_both]">
                  <div className="w-14 h-14 rounded-full bg-[#3B2A20] text-[#F6F1E6] flex items-center justify-center text-[24px]">
                    ✓
                  </div>
                  <h3 className="font-cormorant font-semibold text-[clamp(32px,3vw,40px)] leading-[1.05] mt-5">
                    Thank you, {firstName}!
                  </h3>
                  <p className="text-[16px] leading-relaxed text-[#7A4F34] mt-2.5">
                    Your personal travel designer has received your brief and will connect with you on WhatsApp shortly.
                  </p>

                  <div className="mt-5 border border-[#E8DCC3] rounded-[16px] overflow-hidden divide-y divide-[#E8DCC3]/60 bg-[#F6F1E6]/40">
                    <div className="flex justify-between gap-4 p-3.5 text-[15px]">
                      <span className="text-[#7A4F34]">Occasion</span>
                      <span className="font-semibold">{formData.occasion}</span>
                    </div>
                    <div className="flex justify-between gap-4 p-3.5 text-[15px]">
                      <span className="text-[#7A4F34]">Destination</span>
                      <span className="font-semibold">{formData.destination || 'Open to recommendations'}</span>
                    </div>
                    <div className="flex justify-between gap-4 p-3.5 text-[15px]">
                      <span className="text-[#7A4F34]">When</span>
                      <span className="font-semibold">{formData.when}</span>
                    </div>
                    <div className="flex justify-between gap-4 p-3.5 text-[15px]">
                      <span className="text-[#7A4F34]">WhatsApp</span>
                      <span className="font-semibold">+91 {formData.phone}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <a
                      href={`https://wa.me/919929962350?text=${waLeadMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 text-[15.5px] font-semibold text-[#F6F1E6] bg-[#3B2A20] rounded-full py-3.5 px-6 hover:bg-[#7A4F34] transition shadow-md"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                      Chat now on WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false)
                        setTried(false)
                      }}
                      className="flex-initial text-[15px] font-semibold text-[#3B2A20] bg-transparent border border-[#D6B08C] rounded-full py-3.5 px-6 hover:bg-[#F6F1E6] transition cursor-pointer"
                    >
                      Edit details
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            2. WHAT HAPPENS NEXT
        ───────────────────────────────────────────────────────────── */}
        <section className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28">
          <div className="text-center max-w-[680px] mx-auto">
            <div className="font-pinyon text-[clamp(30px,3vw,40px)] text-[#7A4F34] leading-none">
              what happens next
            </div>
            <h2 className="font-cormorant font-normal text-[clamp(36px,4.4vw,58px)] leading-[1.04] tracking-[-0.01em] mt-2.5">
              After you hit send
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 mt-12 sm:mt-16">
            {/* Step 1 */}
            <div className="border-t border-[#D6B08C] pt-6">
              <div className="font-cormorant font-normal text-[52px] leading-none text-[#B88A5A]">
                01
              </div>
              <h3 className="text-[19px] font-semibold mt-4 text-[#3B2A20]">
                We read your brief
              </h3>
              <p className="text-[15.5px] leading-relaxed text-[#7A4F34] mt-2 max-w-[340px]">
                A real travel designer goes through every detail you shared to understand your pace, style and budget.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border-t border-[#D6B08C] pt-6">
              <div className="font-cormorant font-normal text-[52px] leading-none text-[#B88A5A]">
                02
              </div>
              <h3 className="text-[19px] font-semibold mt-4 text-[#3B2A20]">
                We message you
              </h3>
              <p className="text-[15.5px] leading-relaxed text-[#7A4F34] mt-2 max-w-[340px]">
                On WhatsApp, to ask a few quick questions and curate handpicked boutique stays and private transfers.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border-t border-[#D6B08C] pt-6">
              <div className="font-cormorant font-normal text-[52px] leading-none text-[#B88A5A]">
                03
              </div>
              <h3 className="text-[19px] font-semibold mt-4 text-[#3B2A20]">
                Your free itinerary
              </h3>
              <p className="text-[15.5px] leading-relaxed text-[#7A4F34] mt-2 max-w-[340px]">
                Day by day, 100% itemised with transparent pricing. Swap hotels or dates as much as you like. No payment until you love it.
              </p>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. VISIT US IN JAIPUR (MAP & OFFICE INFO)
        ───────────────────────────────────────────────────────────── */}
        <section className="bg-[#E8DCC3]">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div>
              <div className="text-[12.5px] font-semibold tracking-[0.24em] uppercase text-[#7A4F34]">
                Visit us
              </div>
              <h2 className="font-cormorant font-normal text-[clamp(36px,4.2vw,56px)] leading-[1.04] tracking-[-0.01em] mt-3.5">
                Come say hello in Jaipur
              </h2>

              <div className="grid gap-5 mt-7">
                <div>
                  <div className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#7A4F34]">
                    Headquarters
                  </div>
                  <div className="text-[17px] leading-relaxed mt-1 max-w-[380px] text-[#3B2A20]">
                    Travelzada (Sadaya Trips LLP)<br />
                    4th Floor, Bhamashah Techno Hub, Malviya Nagar, Jaipur, Rajasthan 302017
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <div className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#7A4F34]">
                      Call &amp; WhatsApp
                    </div>
                    <a
                      href="tel:+919929962350"
                      className="block text-[17px] font-medium mt-1 hover:text-[#7A4F34] transition"
                    >
                      +91 99299 62350
                    </a>
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#7A4F34]">
                      Email
                    </div>
                    <a
                      href="mailto:info@travelzada.com"
                      className="block text-[17px] font-medium mt-1 hover:text-[#7A4F34] transition"
                    >
                      info@travelzada.com
                    </a>
                  </div>
                </div>
              </div>

              <a
                href="https://www.google.com/maps/search/?api=1&query=Bhamashah%20Techno%20Hub%20Malviya%20Nagar%20Jaipur%20302017"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 mt-8 text-[15px] font-semibold text-[#F6F1E6] bg-[#3B2A20] px-6 py-3.5 rounded-full transition hover:bg-[#7A4F34] hover:-translate-y-0.5 shadow-sm"
              >
                <span>Open in Google Maps</span>
                <span>↗</span>
              </a>
            </div>

            {/* Styled Map Embed */}
            <div className="h-[clamp(320px,34vw,440px)] rounded-[20px] overflow-hidden bg-[#D6B08C] outline outline-1 outline-[#D6B08C] outline-offset-[6px] shadow-md">
              <iframe
                title="Travelzada Jaipur Office Map"
                src="https://www.google.com/maps?q=Bhamashah%20Techno%20Hub%2C%20Malviya%20Nagar%2C%20Jaipur%20302017&output=embed"
                loading="lazy"
                className="w-full h-full border-0 block"
                style={{ filter: 'grayscale(0.4) sepia(0.18) contrast(0.96)' }}
              />
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. MOBILE FLOATING ACTION BAR
        ───────────────────────────────────────────────────────────── */}
        {isNarrow && (
          <>
            <div className="h-[84px] bg-[#3B2A20]" />
            <div className="fixed left-3 right-3 bottom-3 z-50 flex gap-2 bg-[#F6F1E6] rounded-full p-1.5 shadow-[0_18px_40px_-14px_rgba(43,29,23,0.55),0_0_0_1px_#E8DCC3] animate-[tzRise_0.4s_ease_both]">
              <a
                href="tel:+919929962350"
                className="flex-1 flex items-center justify-center font-figtree text-[15.5px] font-semibold text-[#3B2A20] bg-[#E8DCC3] rounded-full h-[52px] hover:bg-[#D6B08C] transition"
              >
                Call us
              </a>
              <a
                href="https://wa.me/919929962350"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-[1.4] flex items-center justify-center gap-2 font-figtree text-[15.5px] font-semibold text-[#F6F1E6] bg-[#3B2A20] rounded-full h-[52px] hover:bg-[#7A4F34] transition"
              >
                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                WhatsApp us
              </a>
            </div>
          </>
        )}

      </main>

      <Footer />
    </>
  )
}
