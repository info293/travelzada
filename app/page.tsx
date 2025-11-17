import Header from '@/components/Header'
import Hero from '@/components/Hero'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import WhyTravelzada from '@/components/WhyTravelzada'
import TrendingDestinations from '@/components/TrendingDestinations'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-cream pt-24">
      <Header />
      <Hero />
      <HowItWorks />
      <Testimonials />
      <WhyTravelzada />
      <TrendingDestinations />
      <Footer />
    </main>
  )
}

