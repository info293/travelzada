import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-ink text-white py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <p className="text-2xl font-bold mb-4">Travelzada</p>
          <p className="text-sm text-white/70">
            Plan premium journeys with AI precision and a human touch.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-4">About Us</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link href="/story" className="hover:text-white transition-colors">
                Our Story
              </Link>
            </li>
            <li>
              <Link href="/careers" className="hover:text-white transition-colors">
                Careers
              </Link>
            </li>
            <li>
              <Link href="/press" className="hover:text-white transition-colors">
                Press
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-4">Links</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link href="/ai-planner" className="hover:text-white transition-colors">
                AI Planner
              </Link>
            </li>
            <li>
              <Link href="/destinations" className="hover:text-white transition-colors">
                Destinations
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-white transition-colors">
                Blog
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-4">Connect</h3>
          <div className="flex gap-4 text-xl">
            <a href="#" aria-label="Facebook">
              📘
            </a>
            <a href="#" aria-label="Twitter">
              🐦
            </a>
            <a href="#" aria-label="Instagram">
              📷
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-white/60">
        © {new Date().getFullYear()} Travelzada. All rights reserved.
      </div>
    </footer>
  )
}


