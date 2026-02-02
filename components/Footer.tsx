import Link from 'next/link'
import Image from 'next/image'
import FooterSEO from '@/components/FooterSEO'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  // Structured Data for SEO
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "name": "Travelzada",
    "legalName": "Sadaya Trips LLP",
    "url": "https://www.travelzada.com",
    "logo": "https://www.travelzada.com/images/logo/Travelzada Logo April (1).png",
    "description": "AI-powered travel planning platform for premium couple trips and honeymoons. Plan your perfect journey with AI precision and human expertise.",
    "foundingDate": "2023",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Plot No. 18, Friends Colony, Malviya Nagar",
      "addressLocality": "Jaipur",
      "addressRegion": "Rajasthan",
      "postalCode": "302017",
      "addressCountry": "IN"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-9929962350",
      "contactType": "customer service",
      "email": "info@travelzada.com",
      "areaServed": "IN",
      "availableLanguage": ["English", "Hindi"]
    },
    "sameAs": [
      "https://facebook.com/travelzada",
      "https://linkedin.com/company/travelzada"
    ]
  }

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c') }}
      />

      <footer className="bg-gradient-to-br from-gray-900 via-ink to-gray-900 text-white border-t border-white/5" role="contentinfo" aria-label="Site Footer">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 py-16">
          <FooterSEO />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-4">
              <Link href="/" className="inline-block mb-6 group" aria-label="Travelzada Home">
                <Image
                  src="/images/logo/Travelzada Logo April (1).png"
                  alt="Travelzada - AI Travel Planning Platform"
                  width={180}
                  height={60}
                  className="h-12 w-auto object-contain transition-transform group-hover:scale-105 brightness-0 invert drop-shadow-sm"
                />
              </Link>
              <p className="text-base text-white/80 leading-relaxed mb-6 max-w-sm">
                AI-powered travel planning for couples. Create perfect honeymoons and romantic getaways with precision and care.
              </p>

              {/* Contact Information */}
              <address className="not-italic mb-6 text-sm text-white/70 space-y-2">
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:info@travelzada.com" className="hover:text-white transition-colors">
                    info@travelzada.com
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:+919929962350" className="hover:text-white transition-colors">
                    +91 99299 62350
                  </a>
                </p>
              </address>

              {/* Social Icons */}
              <div className="flex gap-4" role="group" aria-label="Social media links">
                <a
                  href="https://facebook.com/travelzada"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow Travelzada on Facebook"
                  className="group relative"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/50">
                    <svg className="w-5 h-5 transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                </a>
                <a
                  href="https://linkedin.com/company/travelzada"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow Travelzada on LinkedIn"
                  className="group relative"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/50">
                    <svg className="w-5 h-5 transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                    </svg>
                  </div>
                </a>
              </div>
            </div>

            {/* Company Links */}
            <nav className="lg:col-span-2" aria-labelledby="footer-company">
              <h3 id="footer-company" className="font-bold text-lg mb-5 text-white">Company</h3>
              <ul className="space-y-3" role="list">
                <li>
                  <Link href="/about" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Learn about Travelzada">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/our-story" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Our journey and mission">
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Join our team">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/reviews" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Customer testimonials and reviews">
                    Reviews
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Quick Links */}
            <nav className="lg:col-span-2" aria-labelledby="footer-services">
              <h3 id="footer-services" className="font-bold text-lg mb-5 text-white">Services</h3>
              <ul className="space-y-3" role="list">
                <li>
                  <Link href="/ai-trip-planner" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="AI-powered trip planner">
                    AI Planner
                  </Link>
                </li>
                <li>
                  <Link href="/destinations" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Browse travel destinations">
                    Destinations
                  </Link>
                </li>
                <li>
                  <Link href="/case-study" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Success stories and case studies">
                    Case Studies
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Travel tips and guides">
                    Blog
                  </Link>
                </li>
              </ul>
            </nav>



            {/* Legal Links */}
            <nav className="lg:col-span-2" aria-labelledby="footer-legal">
              <h3 id="footer-legal" className="font-bold text-lg mb-5 text-white">Legal</h3>
              <ul className="space-y-3" role="list">
                <li>
                  <Link href="/terms-and-conditions" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Terms and conditions of service">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Cancellation and refund policy">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all" title="Privacy policy and data protection">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/60">
              <p>
                © {currentYear} <span itemProp="name">Travelzada</span> (Sadaya Trips LLP). All rights reserved.
              </p>
              <p className="flex items-center gap-1">
                Crafted with <span className="text-red-400" aria-label="love">❤️</span> for travelers
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
