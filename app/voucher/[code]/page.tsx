'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ScaledVoucher, VoucherBack, VoucherFront, VOUCHER_NAVY, VOUCHER_PAGE_BG, voucherFontClass, voucherDisplayFont } from '@/components/voucher/VoucherDesign'
import { REDEEM_STEPS, destinationOptions, formatVoucherDate, inr, normalizeCardCode, voucherConfig, type VoucherType } from '@/lib/vouchers'
import { HONEYPOT_FIELD } from '@/lib/spamGuard'

interface CardInfo {
  code: string
  type: VoucherType
  recipientName: string
  validUntil: string
  travelUntil: string
}

const WHATSAPP = 'https://wa.me/919929962350'

export default function RedeemVoucherPage({ params }: { params: { code: string } }) {
  const cardCode = normalizeCardCode(params.code)
  const [card, setCard] = useState<CardInfo | null>(null)
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ name: '', phone: '', email: '', destination: '', travelMonth: 'Flexible', notes: '', agree: false })
  const [honeypot, setHoneypot] = useState('')
  const startedAt = useRef(Date.now())
  const [tried, setTried] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ code: string; alreadyClaimed: boolean; bookBy?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/vouchers/card/${encodeURIComponent(cardCode)}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error || 'Voucher not found')
        setCard(json.card)
        setUnavailable(json.unavailableReason)
        if (json.card.recipientName) setForm((f) => ({ ...f, name: f.name || json.card.recipientName }))
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [cardCode])

  const cfg = voucherConfig(card?.type)
  const months = useMemo(() => {
    const out = ['Flexible']
    const now = new Date()
    const limit = card?.travelUntil ? new Date(card.travelUntil) : null
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      if (limit && d > limit) break
      out.push(d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }))
    }
    return out
  }, [card?.travelUntil])

  const phoneDigits = form.phone.replace(/\D/g, '')
  const valid = {
    name: form.name.trim().length > 1,
    phone: /^[6-9]\d{9}$/.test(phoneDigits),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
    agree: form.agree,
  }
  const alreadyRedeemed = !!unavailable && /already been redeemed/i.test(unavailable)
  const canRedeem = !!card && (!unavailable || alreadyRedeemed)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!Object.values(valid).every(Boolean)) {
      setError('Please complete the highlighted fields.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/vouchers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardCode,
          name: form.name,
          phone: phoneDigits,
          email: form.email,
          destination: form.destination,
          travelMonth: form.travelMonth,
          notes: form.notes,
          [HONEYPOT_FIELD]: honeypot,
          elapsedMs: Date.now() - startedAt.current,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong')
      setResult(json)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const copyCode = () => {
    if (!result) return
    navigator.clipboard?.writeText(result.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const input = (bad: boolean) =>
    `w-full box-border mt-1.5 border rounded-[12px] bg-[#F4F6FA] outline-none text-[16px] text-[#0B1B3A] px-3.5 py-3 transition focus:bg-white focus:border-[#0E3A86] ${
      tried && bad ? 'border-rose-500 bg-rose-50/60' : 'border-[#D5DBE6]'
    }`

  return (
    <>
      <Header />
      <main className={`${voucherFontClass} min-h-screen text-[#0B1B3A] pt-24 md:pt-28 pb-16`} style={{ background: VOUCHER_PAGE_BG }}>
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="py-32 flex justify-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-[#0E3A86] rounded-full animate-spin" />
            </div>
          ) : loadError || !card ? (
            <NotFound message={loadError} code={cardCode} />
          ) : (
            <>
              <div className="text-center mb-7 sm:mb-9">
                <div className="text-[12px] font-bold tracking-[0.3em] uppercase text-[#9C7431]">{cfg.label} voucher</div>
                <h1 className="mt-2 text-[clamp(30px,4.4vw,48px)] leading-[1.08]" style={{ fontFamily: voucherDisplayFont, fontWeight: 800, color: VOUCHER_NAVY }}>
                  {result ? 'Your voucher is confirmed' : `${inr(cfg.amount)} off your luxury holiday`}
                </h1>
                {!result && (
                  <p className="text-[15.5px] text-[#4B5563] mt-3 max-w-[560px] mx-auto">
                    {card.recipientName ? `${card.recipientName}, enter` : 'Enter'} your details below to get your unique voucher code on email and WhatsApp.
                  </p>
                )}
              </div>

              <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* Voucher + steps */}
                <div className="lg:col-span-7 grid gap-6">
                  <ScaledVoucher>
                    <VoucherFront type={card.type} code={card.code} recipientName={card.recipientName} validUntil={card.validUntil} />
                  </ScaledVoucher>

                  <section className="bg-white rounded-[20px] p-6 sm:p-7 shadow-[0_10px_30px_-22px_rgba(14,58,134,0.5)]">
                    <h2 className="text-[22px]" style={{ fontFamily: voucherDisplayFont, fontWeight: 700, color: VOUCHER_NAVY }}>
                      Steps to redeem
                    </h2>
                    <ol className="mt-4 grid gap-3.5">
                      {REDEEM_STEPS.map((s, i) => {
                        const done = result ? i <= 2 : i === 0
                        return (
                          <li key={i} className="flex gap-3.5 items-start">
                            <span
                              className={`flex-none w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold ${
                                done ? 'bg-[#0E3A86] text-white' : 'bg-[#E9EDF5] text-[#0E3A86]'
                              }`}
                            >
                              {done ? '✓' : i + 1}
                            </span>
                            <span className="text-[15px] leading-[1.55] text-[#374151] pt-0.5">
                              <strong className="text-[#0B1B3A]">{s.title}</strong> {s.text}
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  </section>
                </div>

                {/* Form / result */}
                <div className="lg:col-span-5 lg:sticky lg:top-28">
                  <div className="bg-white rounded-[22px] p-6 sm:p-8 shadow-[0_24px_60px_-34px_rgba(14,58,134,0.6)]">
                    {result ? (
                      <div>
                        <div className="w-14 h-14 rounded-full bg-[#0E3A86] text-white flex items-center justify-center text-[24px]">✓</div>
                        <h2 className="mt-4 text-[28px] leading-tight" style={{ fontFamily: voucherDisplayFont, fontWeight: 700, color: VOUCHER_NAVY }}>
                          {result.alreadyClaimed ? 'You already redeemed this voucher' : `Thank you, ${form.name.split(/\s|&/)[0]}!`}
                        </h2>
                        <p className="text-[15px] text-[#4B5563] mt-2 leading-relaxed">
                          {result.alreadyClaimed
                            ? 'Here is the voucher code we issued to this mobile number.'
                            : 'Your unique voucher code is below. We have also sent it to your email and WhatsApp.'}
                        </p>

                        <div className="mt-5 rounded-[16px] p-5 text-center text-white" style={{ background: VOUCHER_NAVY }}>
                          <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#E4C47E]">Your voucher code</div>
                          <div className="font-mono text-[26px] font-bold tracking-[0.12em] mt-2 break-all">{result.code}</div>
                          <button onClick={copyCode} className="mt-3 text-[13px] font-semibold bg-white/15 hover:bg-white/25 rounded-full px-4 py-1.5 transition">
                            {copied ? 'Copied ✓' : 'Copy code'}
                          </button>
                        </div>

                        <div className="mt-4 divide-y divide-[#EEF1F6] border border-[#E3E7EF] rounded-[14px] text-[14.5px]">
                          {[
                            ['Value', `${inr(cfg.amount)} off`],
                            ['Min. spend', `${inr(cfg.minSpend)} per couple, excl. flights`],
                            ['Book by', formatVoucherDate(result.bookBy || card.validUntil)],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4 px-4 py-3">
                              <span className="text-[#6B7280]">{k}</span>
                              <span className="font-semibold text-right">{v}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-[14px] text-[#374151] mt-4 leading-relaxed">
                          <strong>What happens next:</strong> a Travelzada travel expert will call you within 24 hours to plan your holiday.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-3 mt-5">
                          <Link
                            href={`/voucher/code/${result.code}`}
                            className="text-center rounded-full py-3 px-4 font-semibold text-white transition hover:opacity-90"
                            style={{ background: VOUCHER_NAVY }}
                          >
                            View my voucher
                          </Link>
                          <a
                            href={`${WHATSAPP}?text=${encodeURIComponent(`Hi Travelzada! I just redeemed my voucher ${result.code}. I'd like to plan my holiday.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-center rounded-full py-3 px-4 font-semibold border border-[#0E3A86] text-[#0E3A86] hover:bg-[#F4F6FA] transition"
                          >
                            Chat on WhatsApp
                          </a>
                          <a
                            href={`/api/vouchers/code/${encodeURIComponent(result.code)}/pdf`}
                            className="sm:col-span-2 text-center rounded-full py-2.5 px-4 text-[14.5px] font-semibold text-[#0E3A86] hover:underline"
                          >
                            Download voucher PDF ↓
                          </a>
                        </div>
                      </div>
                    ) : !canRedeem ? (
                      <div>
                        <h2 className="text-[26px]" style={{ fontFamily: voucherDisplayFont, fontWeight: 700, color: VOUCHER_NAVY }}>
                          Voucher unavailable
                        </h2>
                        <p className="text-[15px] text-[#4B5563] mt-3">{unavailable}</p>
                        <a
                          href={WHATSAPP}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 block text-center rounded-full py-3.5 font-semibold text-white"
                          style={{ background: VOUCHER_NAVY }}
                        >
                          Talk to us on WhatsApp
                        </a>
                      </div>
                    ) : (
                      <form onSubmit={submit} className="grid gap-4" noValidate>
                        <div>
                          <h2 className="text-[26px] leading-tight" style={{ fontFamily: voucherDisplayFont, fontWeight: 700, color: VOUCHER_NAVY }}>
                            Enter your details
                          </h2>
                          <p className="text-[14px] text-[#6B7280] mt-1">It takes under a minute.</p>
                          {alreadyRedeemed && (
                            <p className="text-[13.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
                              This voucher has already been redeemed. If it was you, enter the same mobile number to see your code again.
                            </p>
                          )}
                        </div>

                        <input
                          type="text"
                          name={HONEYPOT_FIELD}
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                          tabIndex={-1}
                          autoComplete="off"
                          aria-hidden="true"
                          className="absolute left-[-9999px] w-px h-px opacity-0"
                        />

                        <label className="block">
                          <span className="text-[14px] font-semibold">Your name</span>
                          <input className={input(!valid.name)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Riya Sharma" autoComplete="name" />
                        </label>

                        <label className="block">
                          <span className="text-[14px] font-semibold">WhatsApp number</span>
                          <div className={`${input(!valid.phone)} flex items-center !p-0 overflow-hidden`}>
                            <span className="px-3.5 text-[15px] font-semibold text-[#0E3A86] border-r border-[#D5DBE6]">+91</span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              className="flex-1 min-w-0 bg-transparent outline-none px-3.5 py-3 text-[16px]"
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s]/g, '').slice(0, 12) })}
                              placeholder="98765 43210"
                              autoComplete="tel-national"
                            />
                          </div>
                          {tried && !valid.phone && <span className="text-[12.5px] text-rose-600 mt-1 block">Enter a valid 10-digit mobile number.</span>}
                        </label>

                        <label className="block">
                          <span className="text-[14px] font-semibold">Email</span>
                          <input type="email" className={input(!valid.email)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="riya@gmail.com" autoComplete="email" />
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="block">
                            <span className="text-[14px] font-semibold">Destination</span>
                            <select className={`${input(false)} cursor-pointer`} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}>
                              <option value="">Not sure yet</option>
                              {destinationOptions(card.type).map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-[14px] font-semibold">When</span>
                            <select className={`${input(false)} cursor-pointer`} value={form.travelMonth} onChange={(e) => setForm({ ...form, travelMonth: e.target.value })}>
                              {months.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="block">
                          <span className="text-[14px] font-semibold">Anything we should know?</span> <span className="text-[12.5px] text-[#6B7280]">Optional</span>
                          <textarea rows={2} className={`${input(false)} resize-none`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anniversary trip, prefer a private pool villa..." />
                        </label>

                        <label className="flex gap-2.5 items-start text-[13.5px] text-[#374151] cursor-pointer">
                          <input type="checkbox" className="mt-1 w-4 h-4 accent-[#0E3A86]" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} />
                          <span className={tried && !valid.agree ? 'text-rose-600' : ''}>
                            I agree to the <a href="#terms" className="underline font-semibold">voucher terms &amp; conditions</a> and to be contacted on WhatsApp, phone and email.
                          </span>
                        </label>

                        {error && <div className="text-rose-700 text-[14px] bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div>}

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full rounded-full py-4 text-[16px] font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
                          style={{ background: VOUCHER_NAVY }}
                        >
                          {submitting ? 'Generating your code…' : 'Get my voucher code'}
                        </button>
                        <p className="text-[12.5px] text-center text-[#6B7280]">We never share your number. No spam.</p>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              <section id="terms" className="mt-10 scroll-mt-28">
                <ScaledVoucher>
                  <VoucherBack type={card.type} />
                </ScaledVoucher>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

function NotFound({ message, code }: { message: string; code: string }) {
  return (
    <div className="max-w-[520px] mx-auto text-center py-20">
      <h1 className="text-[34px]" style={{ fontFamily: voucherDisplayFont, fontWeight: 800, color: VOUCHER_NAVY }}>
        Voucher not found
      </h1>
      <p className="text-[15.5px] text-[#4B5563] mt-3">{message || `We could not find voucher ${code}.`}</p>
      <div className="flex flex-wrap justify-center gap-3 mt-7">
        <Link href="/voucher" className="rounded-full py-3 px-6 font-semibold text-white" style={{ background: VOUCHER_NAVY }}>
          Enter a code
        </Link>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="rounded-full py-3 px-6 font-semibold border border-[#0E3A86] text-[#0E3A86]">
          WhatsApp us
        </a>
      </div>
    </div>
  )
}
