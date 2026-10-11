'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, MessageCircle, X } from 'lucide-react'
import { createDesign, designTotal, formatINR, uploadImage, type DesignItem } from '@/lib/decorStore'

const PROFILE_KEY = 'decor-vendor-profile'

/** Saves the current designs as a customer-facing page and hands the vendor a link to send. */
export default function ShareDesign({
  vendorId, defaultVendorName, hallDataUrl, aspect, options, items, eventLabel, styleLabel, onClose,
}: {
  vendorId: string
  defaultVendorName: string
  hallDataUrl: string
  aspect: number
  options: { title: string; concept: string; url: string; hd: boolean }[]
  items: DesignItem[]
  eventLabel: string
  styleLabel: string
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [vendorName, setVendorName] = useState(defaultVendorName)
  const [vendorPhone, setVendorPhone] = useState('')
  const [advancePercent, setAdvancePercent] = useState('25')
  const [picked, setPicked] = useState<number[]>(options.map((_, i) => i))
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
      if (saved.vendorName) setVendorName(saved.vendorName)
      if (saved.vendorPhone) setVendorPhone(saved.vendorPhone)
    } catch { /* no saved profile */ }
  }, [])

  const { total, unpriced } = designTotal(items)

  const share = async () => {
    if (!title.trim()) return setError('Add the customer or event name.')
    if (!vendorName.trim()) return setError('Add your business name.')
    if (picked.length === 0) return setError('Choose at least one design to share.')
    setError(null)
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ vendorName, vendorPhone }))
      const stamp = Date.now()
      setSaving('Uploading the venue photo…')
      const hallUrl = await uploadImage(hallDataUrl, '/decor-designs', `hall_${stamp}`)
      const chosen = picked.map((i) => options[i])
      const uploaded = []
      for (let i = 0; i < chosen.length; i++) {
        setSaving(`Uploading design ${i + 1} of ${chosen.length}…`)
        uploaded.push({ ...chosen[i], url: await uploadImage(chosen[i].url, '/decor-designs', `design_${stamp}_${i}`) })
      }
      setSaving('Creating the customer page…')
      const id = await createDesign({
        vendorId,
        vendorName: vendorName.trim(),
        vendorPhone: vendorPhone.trim(),
        title: title.trim(),
        eventLabel,
        styleLabel,
        hallUrl,
        aspect,
        options: uploaded,
        items,
        advancePercent: Math.min(100, Math.max(0, Number(advancePercent) || 0)),
      })
      setLink(`${window.location.origin}/design/${id}`)
    } catch (err: any) {
      setError(err.message || 'Could not share the design')
    } finally {
      setSaving(null)
    }
  }

  const whatsappText = link ? encodeURIComponent(`Hello! Here is your decor design for ${title} from ${vendorName}. Please review it, add your comments and approve the one you like:\n${link}`) : ''

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink">{link ? 'Ready to send' : 'Share with customer'}</h2>
            <p className="text-sm text-gray-500">
              {link ? 'Your customer can compare, comment, approve and book from this link.' : 'Creates a page your customer can open on their phone — no login needed.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {link ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{link}</span>
              <button
                type="button"
                onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" /> Send on WhatsApp
              </a>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-ink hover:border-primary/40"
              >
                <ExternalLink className="h-4 w-4" /> Open page
              </a>
            </div>
            <p className="text-xs text-gray-400">Find it again any time under “My designs”.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Customer / event</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="e.g. Sharma wedding reception, 14 Feb"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Your business name</span>
                <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} maxLength={80} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Your WhatsApp number</span>
                <input value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value.replace(/[^0-9+ ]/g, ''))} maxLength={16} placeholder="+91…" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
              </label>
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Designs to share</span>
              <div className="grid grid-cols-3 gap-2">
                {options.map((o, i) => {
                  const on = picked.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPicked(on ? picked.filter((p) => p !== i) : [...picked, i].sort())}
                      className={`relative overflow-hidden rounded-xl border-2 text-left ${on ? 'border-primary' : 'border-transparent opacity-50'}`}
                    >
                      <img src={o.url} alt={o.title} className="aspect-[4/3] w-full object-cover" />
                      <span className="block truncate px-1.5 py-1 text-[11px] font-medium text-ink">{o.title}{o.hd ? ' · HD' : ''}</span>
                      {on && <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-white"><Check className="h-3 w-3" /></span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Decor total ({items.length} items)</span>
                <span className="font-semibold text-ink">{formatINR(total)}</span>
              </div>
              {unpriced > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  {unpriced} item{unpriced > 1 ? 's have' : ' has'} no price (generic ideas). The customer will see “to be quoted”. Add them to your catalogue to price them.
                </p>
              )}
              <label className="mt-3 flex items-center justify-between gap-3">
                <span className="text-gray-600">Booking advance</span>
                <span className="flex items-center gap-1">
                  <input
                    value={advancePercent}
                    onChange={(e) => setAdvancePercent(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                    inputMode="numeric"
                    className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
                  />
                  <span className="text-gray-500">%</span>
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={share}
              disabled={!!saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 font-semibold text-white shadow-lg shadow-primary/30 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-5 w-5 animate-spin" />} {saving ?? 'Create customer link'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
