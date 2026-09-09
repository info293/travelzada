'use client'

import Link from 'next/link'
import { useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
    href: string
    label: string
    isAI?: boolean
}

interface HeaderClientProps {
    children: ReactNode // Logo passed from server component
    navItems: NavItem[]
}

export default function HeaderClient({ children, navItems }: HeaderClientProps) {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [scrollY, setScrollY] = useState(0)
    const { currentUser, isAdmin, logout } = useAuth()
    const pathname = usePathname()

    // Add admin link if user is admin
    const allNavItems = isAdmin
        ? [...navItems, { href: '/admin', label: 'Admin' }]
        : navItems

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
            className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ease-out ${isScrolled
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
                {/* Logo - passed from server component */}
                <div className={`transition-transform duration-500 ${logoScale}`}>
                    {children}
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    {allNavItems.map((item) => {
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
                    {currentUser && (
                        <>
                            <span className="hidden sm:inline-block text-sm text-gray-600 font-medium">
                                {currentUser.email}
                            </span>
                            <button
                                onClick={logout}
                                className="hidden sm:inline-block px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                            >
                                Sign Out
                            </button>
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
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <div className={`fixed left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg z-40 md:hidden transition-all duration-300 ${isScrolled ? 'top-[65px]' : 'top-[73px]'}`}>
                        <nav className="flex flex-col py-4">
                            {allNavItems.map((item) => {
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
                            {currentUser && (
                                <div className="border-t border-gray-200 mt-2 pt-2 px-6 space-y-2">
                                    <div className="py-2 text-base font-medium text-gray-700 truncate">
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
                                </div>
                            )}
                        </nav>
                    </div>
                </>
            )}
        </header>
    )
}

