'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import WhyTravelzada from '@/components/WhyTravelzada'
import Packages from '@/components/Packages'
import Footer from '@/components/Footer'
import LeadForm from '@/components/LeadForm'

export default function Home() {
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [hasShownPopup, setHasShownPopup] = useState(false)

  useEffect(() => {
    // Check if user has already seen the popup in this session
    const popupShown = sessionStorage.getItem('leadPopupShown')
    if (popupShown === 'true') {
      setHasShownPopup(true)
      return
    }

    // Show popup after 5 seconds
    const timer = setTimeout(() => {
      setShowLeadForm(true)
      setHasShownPopup(true)
      sessionStorage.setItem('leadPopupShown', 'true')
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-cream pt-24">
      <Header />
      <Hero />
      <HowItWorks />
      <Testimonials />
      <WhyTravelzada />
      <Packages />
      <Footer />

      <LeadForm
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        sourceUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </main>
  )
}

