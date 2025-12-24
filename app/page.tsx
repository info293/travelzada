'use client'

import Header from '@/components/Header'
import Hero from '@/components/Hero'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import WhyTravelzada from '@/components/WhyTravelzada'
import Packages from '@/components/Packages'
import Footer from '@/components/Footer'
import SchemaMarkup, { generateOrganizationSchema } from '@/components/SchemaMarkup'

export default function Home() {
  // Generate Organization schema for SEO
  const organizationSchema = generateOrganizationSchema({
    name: 'Travelzada',
    url: 'https://www.travelzada.com',
    description: 'Plan your perfect trip in seconds with Travelzada. AI-powered travel planning with human expertise. Discover amazing destinations, curated packages, and personalized itineraries.',
    socialMedia: [
      // Add your social media URLs here when available
      // 'https://www.facebook.com/travelzada',
      // 'https://www.instagram.com/travelzada',
      // 'https://www.twitter.com/travelzada',
    ],
  })

  return (
    <>
      <SchemaMarkup schema={organizationSchema} />
      <main className="min-h-screen bg-cream pt-16 md:pt-24">
        <Header />
        <Hero />
        <HowItWorks />
        <Testimonials />
        <Packages />
        <WhyTravelzada />
        <Footer />
      </main>
    </>
  )
}

