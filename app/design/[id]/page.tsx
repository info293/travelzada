'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  BadgeCheck, CalendarCheck, Camera, Check, FileDown, ImagePlus, Loader2, Lock, MapPin, MessageCircle, MessageSquarePlus, Send,
  ShieldCheck, SlidersHorizontal, X,
} from 'lucide-react'
import CompareSlider from '@/components/ai-images/CompareSlider'
import { useAuth } from '@/contexts/AuthContext'
import { downloadDesignSheet } from '@/lib/decorSheet'
import {
  appendToDesign, designTotal, fileToJpeg, formatINR, toDataUrl, updateDesign, uploadImage, watchDesign, type DesignComment, type DesignDoc,
} from '@/lib/decorStore'

const NAME_KEY = 'decor-customer-name'
const STATUS_LABEL: Record<DesignDoc['status'], string> = {
  shared: 'Awaiting your approval',
  approved: 'Design approved',
  booked: 'Booked',
  delivered: 'Event delivered',
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-primary/5 md:p-6 ${className}`}>{children}</section>
}

export default function DesignPage() {
  const { id } = useParams<{ id: string }>()
  const { currentUser } = useAuth()
  const [design, setDesign] = useState<DesignDoc | null | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [active, setActive] = useState(0)
  const [mode, setMode] = useState<'compare' | 'comment'>('compare')
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null)
  const [draftText, setDraftText] = useState('')
  const [myName, setMyName] = useState('')
  const [replyText, setReplyText] = useState<Record<string, string>>({})

  const [approveOpen, setApproveOpen] = useState(false)
  const [approveName, setApproveName] = useState('')
  const [approvePhone, setApprovePhone] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [eventDate, setEventDate] = useState('')
  const [guests, setGuests] = useState('')
  const [bookingNote, setBookingNote] = useState('')

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const angleInput = useRef<HTMLInputElement>(null)
  const deliveredInput = useRef<HTMLInputElement>(null)

  useEffect(() => watchDesign(id, setDesign, (err) => setLoadError(err.message)), [id])
  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY) || ''
    setMyName(saved)
    setApproveName(saved)
  }, [])
  // Once approved, the page always shows the approved option
  useEffect(() => {
    if (design?.approval) setActive(design.approval.optionIndex)
  }, [design?.approval])

  if (loadError || design === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream p-6 text-center">
        <div>
          <h1 className="mb-2 font-display text-3xl text-ink">Design not found</h1>
          <p className="text-sm text-gray-500">{loadError ?? 'This link may have been removed. Please ask your decorator for a new one.'}</p>
        </div>
      </main>
    )
  }
  if (!design) {
    return <main className="flex min-h-screen items-center justify-center bg-cream"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
  }

  const isVendor = currentUser?.uid === design.vendorId
  const role: 'customer' | 'vendor' = isVendor ? 'vendor' : 'customer'
  const locked = design.status !== 'shared'
  const option = design.options[Math.min(active, design.options.length - 1)]
  const { total, unpriced } = designTotal(design.items)
  const advance = (total * design.advancePercent) / 100
  const comments = design.comments.filter((c) => c.optionIndex === active)
  const openCount = design.comments.filter((c) => !c.resolved).length
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''
  const authorName = isVendor ? design.vendorName : myName.trim() || 'Customer'

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label)
    setError(null)
    try {
      await fn()
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  // ── Comments ──
  const saveComments = (next: DesignComment[]) => updateDesign(design.id, { comments: next })

  const addComment = () => {
    if (!draftPin || !draftText.trim()) return
    if (!isVendor) localStorage.setItem(NAME_KEY, myName.trim())
    const comment: DesignComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      optionIndex: active, x: draftPin.x, y: draftPin.y,
      text: draftText.trim().slice(0, 500), author: role, name: authorName, at: Date.now(), resolved: false, replies: [],
    }
    run('Saving your comment…', async () => {
      await saveComments([...design.comments, comment])
      setDraftPin(null)
      setDraftText('')
    })
  }

  const addReply = (commentId: string) => {
    const text = (replyText[commentId] || '').trim()
    if (!text) return
    run('Saving your reply…', async () => {
      await saveComments(design.comments.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, { text: text.slice(0, 500), author: role, name: authorName, at: Date.now() }] } : c
      ))
      setReplyText((prev) => ({ ...prev, [commentId]: '' }))
    })
  }

  const toggleResolved = (commentId: string) =>
    run('Updating…', () => saveComments(design.comments.map((c) => (c.id === commentId ? { ...c, resolved: !c.resolved } : c))))

  // ── Approval & booking ──
  const approve = () => {
    if (!approveName.trim() || approvePhone.replace(/\D/g, '').length < 8) return setError('Enter your name and phone number to approve.')
    if (!agreed) return setError('Please tick the box to confirm.')
    localStorage.setItem(NAME_KEY, approveName.trim())
    run('Locking your design…', async () => {
      await updateDesign(design.id, {
        status: 'approved',
        approval: { optionIndex: active, name: approveName.trim(), phone: approvePhone.trim(), at: Date.now() },
      })
      setApproveOpen(false)
    })
  }

  const requestBooking = () => {
    if (!eventDate) return setError('Choose your event date.')
    run('Sending your booking request…', () =>
      updateDesign(design.id, {
        booking: { eventDate, guests: guests.trim(), note: bookingNote.trim().slice(0, 500), advanceAmount: advance, status: 'requested', at: Date.now() },
      })
    )
  }

  // ── Vendor tools ──
  const vendorToken = async () => `Bearer ${await currentUser?.getIdToken()}`
  const renderView = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/ai-images/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await vendorToken() },
      body: JSON.stringify({
        ...body,
        source: await toDataUrl(option.url),
        itemIds: design.items.filter((i) => !i.id.startsWith('c-')).map((i) => i.id),
        customItems: design.items.filter((i) => i.id.startsWith('c-')).map((i) => ({ id: i.id.slice(2), name: i.name, category: i.category, imageUrl: i.imageUrl, qty: i.qty })),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Could not create the view')
    return data.url as string
  }

  const addAngle = (file: File) =>
    run('Decorating the new angle… (about a minute)', async () => {
      const photo = await fileToJpeg(file)
      const url = await renderView({ mode: 'angle', image: photo.dataUrl, aspect: photo.aspect })
      await appendToDesign(design.id, 'views', { label: 'Another angle', url: await uploadImage(url, '/decor-designs', `view_${Date.now()}`) })
    })

  const addCloseup = () =>
    run('Creating the table close-up… (about a minute)', async () => {
      const url = await renderView({ mode: 'closeup', aspect: design.aspect })
      await appendToDesign(design.id, 'views', { label: 'Table close-up', url: await uploadImage(url, '/decor-designs', `view_${Date.now()}`) })
    })

  const addDelivered = (file: File) =>
    run('Uploading the event photo…', async () => {
      const url = await uploadImage(file, '/decor-designs', `delivered_${Date.now()}`)
      await appendToDesign(design.id, 'delivered', { url, at: Date.now() })
      await updateDesign(design.id, { status: 'delivered' })
    })

  const whatsappVendor = design.vendorPhone
    ? `https://wa.me/${design.vendorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${design.vendorName}, about my decor design "${design.title}": ${pageUrl}`)}`
    : null

  return (
    <main className="min-h-screen bg-cream pb-16">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{design.vendorName}</p>
            <h1 className="font-display text-2xl text-ink md:text-3xl">{design.title}</h1>
            <p className="text-sm text-gray-500">{[design.eventLabel, design.styleLabel].filter(Boolean).join(' · ')}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${locked ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {locked ? <Lock className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            {isVendor && design.status === 'shared' ? 'Waiting for customer approval' : STATUS_LABEL[design.status]}
          </span>
        </div>
      </header>

      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-12">
        {/* ── Left: the design ── */}
        <div className="space-y-6 lg:col-span-8">
          <Card>
            {!locked && design.options.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {design.options.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setActive(i); setDraftPin(null) }}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      i === active ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-primary/40'
                    }`}
                  >
                    {o.title}
                  </button>
                ))}
              </div>
            )}

            <div className="relative overflow-hidden rounded-2xl bg-gray-100" style={{ aspectRatio: String(design.aspect || 1.5) }}>
              {mode === 'compare' ? (
                <CompareSlider before={design.hallUrl} after={option.url} alt={option.title} fill beforeLabel="Now" afterLabel="Your design" />
              ) : (
                <div
                  className="relative h-full w-full cursor-crosshair"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDraftPin({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height })
                  }}
                >
                  <img src={option.url} alt={option.title} className="h-full w-full object-cover" draggable={false} />
                  {comments.map((c, i) => (
                    <span
                      key={c.id}
                      className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg ${c.resolved ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                    >
                      {i + 1}
                    </span>
                  ))}
                  {draftPin && (
                    <span
                      className="absolute -translate-x-1/2 -translate-y-full text-accent drop-shadow-lg"
                      style={{ left: `${draftPin.x * 100}%`, top: `${draftPin.y * 100}%` }}
                    >
                      <MapPin className="h-8 w-8 fill-accent text-white" />
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">{option.title}</h2>
                <p className="text-sm text-gray-500">{option.concept}</p>
              </div>
              <div className="flex rounded-xl border border-gray-200 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => { setMode('compare'); setDraftPin(null) }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${mode === 'compare' ? 'bg-ink text-white' : 'text-gray-600'}`}
                >
                  <SlidersHorizontal className="h-4 w-4" /> Compare
                </button>
                <button
                  type="button"
                  onClick={() => setMode('comment')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${mode === 'comment' ? 'bg-ink text-white' : 'text-gray-600'}`}
                >
                  <MessageSquarePlus className="h-4 w-4" /> Comment{openCount ? ` (${openCount})` : ''}
                </button>
              </div>
            </div>

            {mode === 'comment' && (
              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                {draftPin ? (
                  <div className="space-y-2">
                    {!isVendor && (
                      <input
                        value={myName}
                        onChange={(e) => setMyName(e.target.value)}
                        maxLength={60}
                        placeholder="Your name"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    )}
                    <div className="flex gap-2">
                      <input
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addComment()}
                        maxLength={500}
                        autoFocus
                        placeholder="What should change here? e.g. make this stage bigger"
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                      <button type="button" onClick={addComment} disabled={!draftText.trim() || !!busy} className="rounded-xl bg-primary px-3 text-white disabled:bg-gray-300">
                        <Send className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => { setDraftPin(null); setDraftText('') }} className="rounded-xl border border-gray-200 px-3 text-gray-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Tap the exact spot on the picture you want to talk about.</p>
                )}
              </div>
            )}

            {comments.length > 0 && (
              <ul className="mt-4 space-y-3">
                {comments.map((c, i) => (
                  <li key={c.id} className={`rounded-2xl border p-3 ${c.resolved ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${c.resolved ? 'bg-emerald-500' : 'bg-primary'}`}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">{c.text}</p>
                        <p className="text-xs text-gray-400">{c.name} · {new Date(c.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{c.resolved ? ' · resolved' : ''}</p>
                        {c.replies.map((r, ri) => (
                          <div key={ri} className={`mt-2 rounded-xl px-3 py-2 text-sm ${r.author === 'vendor' ? 'bg-primary/5' : 'bg-gray-50'}`}>
                            <p className="text-ink">{r.text}</p>
                            <p className="text-xs text-gray-400">{r.name}</p>
                          </div>
                        ))}
                        <div className="mt-2 flex gap-2">
                          <input
                            value={replyText[c.id] || ''}
                            onChange={(e) => setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addReply(c.id)}
                            maxLength={500}
                            placeholder="Reply…"
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                          />
                          <button type="button" onClick={() => addReply(c.id)} disabled={!(replyText[c.id] || '').trim() || !!busy} className="rounded-lg bg-ink px-2.5 text-white disabled:bg-gray-300">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => toggleResolved(c.id)} className="rounded-lg border border-gray-200 px-2.5 text-xs text-gray-600 hover:border-emerald-400">
                            {c.resolved ? 'Reopen' : 'Resolve'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Extra views */}
          {(design.views.length > 0 || isVendor) && (
            <Card>
              <h2 className="mb-1 flex items-center gap-2 font-display text-xl text-ink"><Camera className="h-5 w-5 text-primary" /> More views of this design</h2>
              <p className="mb-4 text-sm text-gray-500">The same decor from other parts of the hall, so nothing is a surprise on the day.</p>
              {design.views.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {design.views.map((v, i) => (
                    <figure key={i} className="overflow-hidden rounded-2xl border border-gray-200">
                      <a href={v.url} target="_blank" rel="noreferrer"><img src={v.url} alt={v.label} className="aspect-[4/3] w-full object-cover" /></a>
                      <figcaption className="px-3 py-2 text-sm font-medium text-ink">{v.label}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              {isVendor && (
                <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-primary/5 p-3">
                  <span className="w-full text-xs font-semibold uppercase tracking-wide text-primary">Decorator tools · for “{option.title}”</span>
                  <button type="button" disabled={!!busy} onClick={() => angleInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm hover:shadow disabled:opacity-50">
                    <ImagePlus className="h-4 w-4" /> Add another angle (upload hall photo)
                  </button>
                  <button type="button" disabled={!!busy} onClick={addCloseup} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm hover:shadow disabled:opacity-50">
                    <Camera className="h-4 w-4" /> Add table close-up
                  </button>
                  <input ref={angleInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) addAngle(f) }} />
                </div>
              )}
            </Card>
          )}

          {/* Designed vs delivered */}
          {(design.delivered.length > 0 || (isVendor && locked)) && (
            <Card>
              <h2 className="mb-1 flex items-center gap-2 font-display text-xl text-ink"><BadgeCheck className="h-5 w-5 text-emerald-600" /> Designed vs delivered</h2>
              <p className="mb-4 text-sm text-gray-500">The approved design next to the real setup on the event day.</p>
              {design.delivered.map((d, i) => (
                <div key={i} className="mb-4 overflow-hidden rounded-2xl bg-gray-100" style={{ aspectRatio: String(design.aspect || 1.5) }}>
                  <CompareSlider before={option.url} after={d.url} alt="Delivered setup" fill beforeLabel="Designed" afterLabel="Delivered" />
                </div>
              ))}
              {isVendor && (
                <>
                  <button type="button" disabled={!!busy} onClick={() => deliveredInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-ink hover:border-primary/40 disabled:opacity-50">
                    <ImagePlus className="h-4 w-4" /> Upload photo of the real setup
                  </button>
                  <input ref={deliveredInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) addDelivered(f) }} />
                </>
              )}
            </Card>
          )}
        </div>

        {/* ── Right: price, approval, booking ── */}
        <div className="space-y-6 lg:col-span-4">
          <Card>
            <h2 className="mb-3 font-display text-xl text-ink">What you get</h2>
            <ul className="divide-y divide-gray-100">
              {design.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-11 w-11 flex-shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">idea</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.category}{item.qty > 1 ? ` · ×${item.qty}` : ''}</p>
                  </div>
                  <span className="text-sm font-medium text-ink">{item.price === null ? <span className="text-xs font-normal text-amber-600">to be quoted</span> : formatINR(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Decor total</span><span className="text-lg font-semibold text-ink">{formatINR(total)}</span></div>
              {unpriced > 0 && <p className="text-xs text-amber-600">+ {unpriced} item{unpriced > 1 ? 's' : ''} your decorator will quote separately</p>}
              <div className="flex justify-between text-gray-500"><span>Booking advance ({design.advancePercent}%)</span><span>{formatINR(advance)}</span></div>
            </div>
          </Card>

          {/* Approval */}
          {!locked && !isVendor && (
            <Card className="border-primary/30">
              <h2 className="mb-1 font-display text-xl text-ink">Happy with “{option.title}”?</h2>
              <p className="mb-4 text-sm text-gray-500">Approving locks this picture, the item list and the price as your agreed design.</p>
              {approveOpen ? (
                <div className="space-y-3">
                  <input value={approveName} onChange={(e) => setApproveName(e.target.value)} maxLength={60} placeholder="Your full name" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                  <input value={approvePhone} onChange={(e) => setApprovePhone(e.target.value.replace(/[^0-9+ ]/g, ''))} maxLength={16} inputMode="tel" placeholder="Phone number" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary" />
                    I approve this design, these items and this price. I understand the picture is an AI preview and small details may differ.
                  </label>
                  <button type="button" onClick={approve} disabled={!!busy} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <ShieldCheck className="h-5 w-5" /> Approve & lock design
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setApproveOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 font-semibold text-white shadow-lg shadow-primary/30">
                  <Check className="h-5 w-5" /> This is what I want
                </button>
              )}
              {openCount > 0 && <p className="mt-3 text-xs text-amber-600">You have {openCount} open comment{openCount > 1 ? 's' : ''}. You may want them answered before approving.</p>}
            </Card>
          )}

          {design.approval && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <h2 className="mb-1 flex items-center gap-2 font-display text-xl text-ink"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Design approved</h2>
              <p className="text-sm text-gray-600">
                “{design.options[design.approval.optionIndex].title}” was approved by {design.approval.name} on{' '}
                {new Date(design.approval.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => run('Preparing your design sheet…', () => downloadDesignSheet(design, pageUrl))}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3 font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
              >
                <FileDown className="h-5 w-5" /> Download design sheet (PDF)
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Approved decor design — ${design.title} (${design.vendorName}). Total ${formatINR(total)}.\n${pageUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-6 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <MessageCircle className="h-4 w-4" /> Share on WhatsApp
              </a>
            </Card>
          )}

          {/* Booking */}
          {design.approval && (
            <Card>
              <h2 className="mb-1 flex items-center gap-2 font-display text-xl text-ink"><CalendarCheck className="h-5 w-5 text-primary" /> Booking</h2>
              {design.booking ? (
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium text-ink">Event date:</span> {design.booking.eventDate}{design.booking.guests ? ` · ${design.booking.guests} guests` : ''}</p>
                  {design.booking.note && <p>{design.booking.note}</p>}
                  <p><span className="font-medium text-ink">Advance:</span> {formatINR(design.booking.advanceAmount)}</p>
                  {design.booking.status === 'advance_received' ? (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 font-medium text-emerald-700">Advance received — your booking is confirmed.</p>
                  ) : isVendor ? (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => run('Confirming…', () => updateDesign(design.id, { status: 'booked', booking: { ...design.booking, status: 'advance_received' } }))}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" /> Mark advance received
                    </button>
                  ) : (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                      Booking requested. Pay the advance to {design.vendorName} directly; they will confirm it here.
                    </p>
                  )}
                </div>
              ) : isVendor ? (
                <p className="text-sm text-gray-500">The customer has approved the design but not requested a booking yet.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Reserve your date with this exact design.</p>
                  <input type="date" value={eventDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setEventDate(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                  <input value={guests} onChange={(e) => setGuests(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" maxLength={5} placeholder="Number of guests" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                  <textarea value={bookingNote} onChange={(e) => setBookingNote(e.target.value)} rows={2} maxLength={500} placeholder="Anything your decorator should know" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                  <button type="button" onClick={requestBooking} disabled={!!busy} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 font-semibold text-white shadow-lg shadow-primary/30 disabled:opacity-60">
                    Request booking · advance {formatINR(advance)}
                  </button>
                </div>
              )}
            </Card>
          )}

          {whatsappVendor && !isVendor && (
            <a href={whatsappVendor} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-ink hover:border-emerald-400">
              <MessageCircle className="h-4 w-4 text-emerald-600" /> Chat with {design.vendorName}
            </a>
          )}

          <p className="px-2 text-xs leading-relaxed text-gray-400">
            The pictures on this page are AI previews of the agreed decor. The real setup will match the listed items, colours and arrangement; small details such as exact flower counts may differ.
          </p>
        </div>
      </div>

      {(busy || error) && (
        <div className={`fixed bottom-4 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-xl ${error ? 'bg-red-600' : 'bg-ink'}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 cursor-pointer" onClick={() => setError(null)} />}
          {busy ?? error}
        </div>
      )}
    </main>
  )
}
