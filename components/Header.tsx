'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { currentUser, isAdmin, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu when clicking outside or on a link
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/ai-planner', label: 'AI Planner', isAI: true },
    { href: '/destinations', label: 'Destinations' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  const SparkleIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <span
      className={`${className} inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm`}
    />
  )

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

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          {navItems.map((item) => {
            const isAI = (item as any).isAI
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-all duration-200 ${
                  isAI
                    ? 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-200 shadow-sm hover:shadow-md'
                    : 'hover:text-primary'
                }`}
              >
                {isAI && <SparkleIcon className="w-3.5 h-3.5" />}
                <span>{item.label}</span>
                {isAI && (
                  <span className="text-[10px] uppercase tracking-wide text-purple-500 font-semibold">
                    
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <span className="hidden sm:inline-block text-sm text-gray-600">
                {currentUser.email}
              </span>
              <button
                onClick={logout}
                className="hidden sm:inline-block px-5 py-2 rounded-full text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-block text-sm font-medium text-gray-600 hover:text-primary"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-block px-5 py-2 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-[73px] left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40 md:hidden">
            <nav className="flex flex-col py-4">
              {navItems.map((item) => {
                const isAI = (item as any).isAI
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-6 py-3 text-base font-medium transition-colors ${
                      isAI
                        ? 'text-purple-700 bg-purple-50/60 border-y border-purple-100 flex items-center gap-2'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    {isAI && <SparkleIcon className="w-4 h-4" />}
                    {item.label}
                    {isAI && (
                      <span className="ml-2 text-[11px] uppercase tracking-wide text-purple-500 font-semibold">
                        AI
                      </span>
                    )}
                  </Link>
                )
              })}
              <div className="border-t border-gray-200 mt-2 pt-2 px-6 space-y-2">
                {currentUser ? (
                  <>
                    <div className="py-2 text-base font-medium text-gray-700">
                      {currentUser.email}
                    </div>
                    <button
                      onClick={() => {
                        logout()
                        setIsMobileMenuOpen(false)
                      }}
                      className="block w-full text-center py-2 px-4 rounded-full text-base font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-2 text-base font-medium text-gray-700 hover:text-primary transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center py-2 px-4 rounded-full text-base font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}

