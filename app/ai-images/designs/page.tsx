'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, ExternalLink, Loader2, MessageCircle, Trash2 } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { deleteDesign, designTotal, formatINR, listDesigns, type DesignDoc } from '@/lib/decorStore'

const STATUS: Record<DesignDoc['status'], { label: string; className: string }> = {
  shared: { label: 'Waiting for approval', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
  booked: { label: 'Booked', className: 'bg-primary/10 text-primary' },
  delivered: { label: 'Delivered', className: 'bg-gray-100 text-gray-700' },
}

export default function MyDesignsPage() {
  const { currentUser, loading: authLoading } = useAuth()
  const [designs, setDesigns] = useState<DesignDoc[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return
    listDesigns(currentUser.uid).then(setDesigns).catch((err) => setError(err.message))
  }, [currentUser])

  const link = (id: string) => `${window.location.origin}/design/${id}`

  const remove = async (design: DesignDoc) => {
    if (!window.confirm(`Delete the design "${design.title}"? The customer's link will stop working.`)) return
    await deleteDesign(design.id)
    setDesigns((prev) => prev?.filter((d) => d.id !== design.id) ?? null)
  }

  return (
    <main className="min-h-screen bg-cream">
      <Header />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-24">
        <Link href="/ai-images" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to the studio
        </Link>
        <h1 className="mb-1 font-display text-4xl text-ink">My designs</h1>
        <p className="mb-8 text-gray-500">Every design you have shared with a customer, and where it stands.</p>

        {authLoading || (currentUser && designs === null && !error) ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : !currentUser ? (
          <p className="text-gray-600">Please <Link href="/login" className="font-medium text-primary underline">log in</Link> to see your designs.</p>
        ) : error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : designs!.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
            <p className="mb-4 text-gray-600">You have not shared a design yet.</p>
            <Link href="/ai-images" className="inline-flex rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 font-semibold text-white">Create your first design</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {designs!.map((d) => {
              const open = d.comments.filter((c) => !c.resolved).length
              const shown = d.options[d.approval?.optionIndex ?? 0]
              return (
                <li key={d.id} className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-lg shadow-primary/5 sm:flex-row sm:items-center">
                  <img src={shown?.url} alt="" className="h-28 w-full flex-shrink-0 rounded-2xl object-cover sm:w-40" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-xl text-ink">{d.title}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[d.status].className}`}>{STATUS[d.status].label}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {[d.eventLabel, `${d.options.length} design${d.options.length > 1 ? 's' : ''}`, formatINR(designTotal(d.items).total)].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Shared {new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {d.approval ? ` · approved by ${d.approval.name}` : ''}
                      {d.booking ? ` · event ${d.booking.eventDate}` : ''}
                    </p>
                    {open > 0 && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"><MessageCircle className="h-3.5 w-3.5" /> {open} open comment{open > 1 ? 's' : ''}</p>
                    )}
                    {d.booking?.status === 'requested' && <p className="mt-1 text-xs font-medium text-amber-600">Booking requested — confirm the advance</p>}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/design/${d.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-medium text-white">
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </Link>
                    <button
                      type="button"
                      onClick={async () => { await navigator.clipboard.writeText(link(d.id)); setCopied(d.id); setTimeout(() => setCopied(null), 2000) }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-primary/40"
                    >
                      <Copy className="h-3.5 w-3.5" /> {copied === d.id ? 'Copied' : 'Link'}
                    </button>
                    <button type="button" onClick={() => remove(d)} title="Delete design" className="rounded-xl border border-gray-200 px-2.5 text-gray-400 hover:border-red-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <Footer />
    </main>
  )
}
