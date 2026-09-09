'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()

  // Auth state - only accessed after mount to prevent SSR issues
  const auth = useAuth()
  const currentUser = isMounted ? auth.currentUser : null
  const isAdmin    = isMounted ? auth.isAdmin    : false
  const isAgent    = isMounted ? auth.isAgent    : false
  const isSubAgent = isMounted ? auth.isSubAgent : false
  const agentSlug  = isMounted ? auth.agentSlug  : null
  const subAgentName = isMounted ? auth.subAgentName : null
  const logout = auth.logout

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Derive role label + dashboard link
  const roleLabel  = isAdmin ? 'Admin' : isAgent ? 'DMC Agent' : isSubAgent ? 'Travel Agent' : 'Member'
  const roleColor  = isAdmin ? 'bg-red-100 text-red-700' : isAgent ? 'bg-purple-100 text-purple-700' : isSubAgent ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
  const dashLink   = isAdmin ? '/admin' : isAgent ? '/dmc-dashboard' : isSubAgent ? '/travel-agent-dashboard' : null
  const dashLabel  = isAdmin ? 'Admin Panel' : isAgent ? 'DMC Dashboard' : isSubAgent ? 'Agent Dashboard' : null
  const displayName = isSubAgent && subAgentName ? subAgentName : currentUser?.email || ''
  const initials = displayName.charAt(0).toUpperCase()

  // Mark as mounted after first render (client-side only)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setScrollY(currentScrollY)
      setIsScrolled(currentScrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // Static nav items
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/tailored-travel', label: 'AI Planner' },
    { href: '/destinations', label: 'Destinations' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
    ...(isMounted && isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  const isLinkActive = (href: string) => {
    if (!pathname) return false
    if (href === '/') return pathname === '/'
    if (href === '/tailored-travel') {
      return (
        pathname === '/tailored-travel' ||
        pathname.startsWith('/tailored-travel/') ||
        pathname === '/ai-trip-planner' ||
        pathname.startsWith('/ai-trip-planner/')
      )
    }
    if (href === '/destinations') {
      return (
        pathname === '/destinations' ||
        pathname.startsWith('/destinations/') ||
        pathname === '/packages' ||
        pathname.startsWith('/packages/')
      )
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

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
      <div
        className={`max-w-6xl mx-auto px-4 md:px-6 lg:px-0 ${headerHeight} flex items-center justify-between transition-all duration-500`}
      >
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
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const active = isLinkActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-1.5 transition-colors duration-300 ${
                  active
                    ? 'text-primary font-semibold'
                    : 'text-gray-600 hover:text-primary font-medium group'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-primary-dark transition-all duration-300 ${
                    active ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </Link>
            )
          })}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {isMounted && currentUser && (
            <div ref={userMenuRef} className="relative hidden sm:block">
              {/* Avatar button */}
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {initials}
                </div>
                <span className="text-sm text-gray-700 font-medium max-w-[140px] truncate">
                  {displayName}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                  {/* Role header */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-400 truncate">
                      {currentUser.email}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${roleColor}`}
                    >
                      {roleLabel}
                    </span>
                  </div>

                  {/* Dashboard link (role-specific) */}
                  {dashLink && (
                    <Link
                      href={dashLink}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7h18M3 12h18M3 17h18"
                        />
                      </svg>
                      {dashLabel}
                    </Link>
                  )}

                  {/* Sign Out */}
                  <button
                    onClick={() => {
                      logout()
                      setUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className={`fixed left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg z-40 md:hidden transition-all duration-300 ${
              isScrolled ? 'top-[65px]' : 'top-[73px]'
            }`}
          >
            <nav className="flex flex-col py-4">
              {navItems.map((item) => {
                const active = isLinkActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-6 py-3 text-base font-medium transition-colors flex items-center justify-between ${
                      active
                        ? 'text-primary bg-primary/5 font-semibold border-l-4 border-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                )
              })}
              {isMounted && currentUser && (
                <div className="border-t border-gray-200 mt-2 pt-2 px-6 space-y-2">
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {displayName}
                      </p>
                      <span
                        className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${roleColor}`}
                      >
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                  {dashLink && (
                    <Link
                      href={dashLink}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-base font-semibold text-primary hover:underline"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7h18M3 12h18M3 17h18"
                        />
                      </svg>
                      {dashLabel}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="block w-full text-center py-2 px-4 rounded-full text-base font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  )
}

