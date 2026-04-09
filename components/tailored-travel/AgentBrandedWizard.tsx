'use client'

import TailoredItineraryWizard from './TailoredItineraryWizard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'
import Link from 'next/link'

interface AgentInfo {
  id: string
  companyName: string
  contactName: string
  agentSlug: string
  logoUrl?: string | null
  fallbackToTravelzada: boolean
}

interface Props {
  agent: AgentInfo
}

export default function AgentBrandedWizard({ agent }: Props) {
  return (
    <main className="min-h-screen flex flex-col pt-16 md:pt-24 relative overflow-x-hidden bg-gray-50">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <img
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
          alt="Travel planning background"
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" />
      </div>

      <Header />

      {/* Agent branding banner */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 mt-4 mb-2">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {agent.logoUrl ? (
              <img
                src={agent.logoUrl}
                alt={`${agent.companyName} logo`}
                className="w-10 h-10 rounded-full object-cover border border-gray-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                {agent.companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{agent.companyName}</p>
              <p className="text-xs text-gray-500">Powered by Travelzada AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <span>A</span>
              <div className="w-4 h-px bg-gray-300" />
              <Link href="/" className="hover:text-purple-600 transition-colors">
                <svg viewBox="0 0 87 22" className="w-16 h-4 fill-current text-gray-400 hover:text-purple-600">
                  <text y="16" fontFamily="serif" fontSize="14" fontWeight="bold">Travelzada</text>
                </svg>
              </Link>
            </div>
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
              Verified Agent
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 pb-16 flex flex-col justify-center">
        <TailoredItineraryWizard agentSlug={agent.agentSlug} />
      </div>

      <Footer />
    </main>
  )
}
