'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full bg-white transition-all duration-300 ${
        isScrolled ? 'shadow-sm border-b border-gray-100' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-0 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-ink tracking-tight">
          Travelzada
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          {[
            { href: '/', label: 'Home' },
            { href: '/ai-planner', label: 'AI Planner' },
            { href: '/destinations', label: 'Destinations' },
            { href: '/blog', label: 'Blog' },
            { href: '/contact', label: 'Contact' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-block text-sm font-medium text-gray-600 hover:text-primary"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  )
}

