'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const { currentUser, isAdmin, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setScrollY(currentScrollY)
      setIsScrolled(currentScrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
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
      className={`${className} inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm animate-pulse`}
    />
  )

  // Calculate dynamic values based on scroll
  const headerHeight = isScrolled ? 'py-2.5' : 'py-4'
  const logoScale = isScrolled ? 'scale-95' : 'scale-100'
  const backdropBlur = isScrolled ? 'backdrop-blur-xl' : 'backdrop-blur-none'
  const bgOpacity = isScrolled ? 'bg-white/95' : 'bg-white'
  const shadowIntensity = Math.min(scrollY / 10, 1)

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ease-out ${
        isScrolled 
          ? `${bgOpacity} ${backdropBlur} shadow-lg border-b border-gray-200/50` 
          : 'bg-white/80 backdrop-blur-sm'
      }`}
      style={{
        boxShadow: isScrolled 
          ? `0 10px 40px -10px rgba(0, 0, 0, ${0.1 * shadowIntensity}), 0 0 0 1px rgba(0, 0, 0, ${0.05 * shadowIntensity})`
          : 'none',
      }}
    >
      <div className={`max-w-6xl mx-auto px-4 md:px-6 lg:px-0 ${headerHeight} flex items-center justify-between transition-all duration-500`}>
        <Link 
          href="/" 
          className={`flex items-center transition-transform duration-500 ${logoScale} hover:scale-105`}
        >
          <Image
            src="/images/logo/Travelzada Logo April (1).png"
            alt="Travelzada Logo"
            width={150}
            height={50}
            className={`h-8 w-auto object-contain transition-all duration-500 ${
              isScrolled ? 'h-7' : 'h-8'
            }`}
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          {navItems.map((item, index) => {
            const isAI = (item as any).isAI
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`header-nav-item relative transition-all duration-300 ${
                  isAI
                    ? 'ai-planner-btn inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-200 shadow-sm hover:shadow-md hover:scale-105 overflow-hidden group/ai'
                    : 'text-gray-600 hover:text-primary group'
                }`}
              >
                {!isAI && (
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary-dark transition-all duration-300 group-hover:w-full"></span>
                )}
                {isAI && (
                  <>
                    {/* Sparkle icon */}
                    <SparkleIcon className="w-3.5 h-3.5 relative z-10" />
                    {/* Text that scrolls out, then AI Planner scrolls back in */}
                    <div className="relative z-10 overflow-hidden min-w-[100px] h-5">
                      <div className="relative h-full">
                        {/* Original text that scrolls out */}
                        <span className="ai-text-original absolute left-0 top-0 inline-block">
                          {item.label}
                        </span>
                        {/* AI Planner text that scrolls in after delay */}
                        <span className="ai-text-new absolute left-0 top-0 inline-block opacity-0 translate-y-full">
                          {item.label}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                {!isAI && <span className="relative z-10">{item.label}</span>}
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
                className="hidden sm:inline-block px-5 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
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
          <div className={`fixed left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg z-40 md:hidden transition-all duration-300 ${
            isScrolled ? 'top-[65px]' : 'top-[73px]'
          }`}>
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

