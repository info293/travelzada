'use client'

import Header from '@/components/Header'
import Hero from '@/components/Hero'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import WhyTravelzada from '@/components/WhyTravelzada'
import Packages from '@/components/Packages'
import Footer from '@/components/Footer'
import SchemaMarkup, { generateOrganizationSchema } from '@/components/SchemaMarkup'
import FAQ from '@/components/FAQ'
import DynamicOccasionRails from '@/components/DynamicOccasionRails'
import DestinationRail from '@/components/DestinationRail'
import DestinationSlugCacheInitializer from '@/components/DestinationSlugCacheInitializer'

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
      <DestinationSlugCacheInitializer />
      <main className="min-h-screen bg-cream pt-16 md:pt-24">
        <Header />
        <Hero />
        <HowItWorks />
        <Testimonials />

        {/* India Destinations Rail */}
        <DestinationRail
          region="India"
          title="Explore India"
          subtitle="Handpicked luxury journeys across the country."
          tagLabel="Incredible India"
        />

        {/* International Destinations Rail */}
        <DestinationRail
          region="International"
          title="World Destinations"
          subtitle="Curated global adventures beyond borders."
          tagLabel="International"
        />

        {/* Dynamic Occasions */}
        <DynamicOccasionRails />
        <Packages />
        {/* Testimonials moved up */}
        <WhyTravelzada />
        <FAQ />
        <Footer />
      </main>
    </>
  )
}

