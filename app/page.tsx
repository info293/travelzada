import Header from '@/components/Header'
import Hero from '@/components/Hero'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import WhyTravelzada from '@/components/WhyTravelzada'
import Packages from '@/components/Packages'
import Footer from '@/components/Footer'
import SchemaMarkup, { generateOrganizationSchema, generateWebSiteSchema, generateFAQSchema, generateBreadcrumbSchema } from '@/components/SchemaMarkup'
import FAQ from '@/components/FAQ'
import { faqs } from '@/data/faqs'
import DynamicOccasionRails from '@/components/DynamicOccasionRails'
import DestinationRail from '@/components/DestinationRail'
import DestinationSlugCacheInitializer from '@/components/DestinationSlugCacheInitializer'

export default function Home() {
  const websiteSchema = generateWebSiteSchema()
  const faqSchema = generateFAQSchema(faqs)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://www.travelzada.com' }
  ])

  return (
    <>
      <SchemaMarkup schema={websiteSchema} id="website-schema" />
      <SchemaMarkup schema={faqSchema} id="faq-schema" />
      <SchemaMarkup schema={breadcrumbSchema} id="breadcrumb-schema-home" />
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

