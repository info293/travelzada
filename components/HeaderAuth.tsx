'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface HeaderAuthProps {
    isScrolled: boolean
    isMobileMenuOpen: boolean
    setIsMobileMenuOpen: (open: boolean) => void
    isAdmin: boolean
}

export default function HeaderAuth({
    isScrolled,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isAdmin
}: HeaderAuthProps) {
    const { currentUser, logout } = useAuth()

    return (
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
    )
}

// Mobile menu auth section - exported separately
export function MobileMenuAuth({
    onClose,
    currentUser,
    logout
}: {
    onClose: () => void
    currentUser: any
    logout: () => void
}) {
    return (
        <div className="border-t border-gray-200 mt-2 pt-2 px-6 space-y-2">
            {currentUser ? (
                <>
                    <div className="py-2 text-base font-medium text-gray-700">
                        {currentUser.email}
                    </div>
                    <button
                        onClick={() => {
                            logout()
                            onClose()
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
                        onClick={onClose}
                        className="block py-2 text-base font-medium text-gray-700 hover:text-primary transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/signup"
                        onClick={onClose}
                        className="block w-full text-center py-2 px-4 rounded-full text-base font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
                    >
                        Sign Up
                    </Link>
                </>
            )}
        </div>
    )
}
