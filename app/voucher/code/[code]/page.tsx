'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ScaledVoucher, VoucherBack, VOUCHER_NAVY, VOUCHER_PAGE_BG, voucherDisplayFont, voucherFontClass } from '@/components/voucher/VoucherDesign'
import { formatVoucherDate, inr, normalizeCardCode, voucherConfig, type VoucherType } from '@/lib/vouchers'

interface PersonalVoucher {
  code: string
  cardCode: string
  type: VoucherType
  amount: number
  minSpend: number
  name: string
  phoneMasked: string
  status: 'active' | 'applied' | 'cancelled' | 'expired'
  bookBy: string
  travelBy: string
  createdAt: string
}

const STATUS: Record<PersonalVoucher['status'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-400/20 text-emerald-200' },
  applied: { label: 'Applied to booking', className: 'bg-sky-400/20 text-sky-100' },
  cancelled: { label: 'Cancelled', className: 'bg-white/15 text-white/70' },
  expired: { label: 'Expired', className: 'bg-rose-400/20 text-rose-100' },
}

export default function PersonalVoucherPage({ params }: { params: { code: string } }) {
  const code = normalizeCardCode(params.code)
  const [voucher, setVoucher] = useState<PersonalVoucher | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/vouchers/code/${encodeURIComponent(code)}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error || 'Voucher code not found.')
        setVoucher(json.voucher)
      })
      .catch((e) => setError(e.message))
  }, [code])

  const cfg = voucherConfig(voucher?.type)
  const status = voucher ? STATUS[voucher.status] : null

  return (
    <>
      <Header />
      <main className={`${voucherFontClass} min-h-screen pt-28 pb-16 text-[#0B1B3A]`} style={{ background: VOUCHER_PAGE_BG }}>
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
          {error ? (
            <div className="max-w-[520px] mx-auto text-center py-16">
              <h1 className="text-[34px]" style={{ fontFamily: voucherDisplayFont, fontWeight: 800, color: VOUCHER_NAVY }}>Code not found</h1>
              <p className="text-[15.5px] text-[#4B5563] mt-3">{error}</p>
              <Link href="/voucher" className="inline-block mt-7 rounded-full py-3 px-6 font-semibold text-white" style={{ background: VOUCHER_NAVY }}>
                Try another code
              </Link>
            </div>
          ) : !voucher || !status ? (
            <div className="py-32 flex justify-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-[#0E3A86] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="max-w-[620px] mx-auto rounded-[24px] overflow-hidden text-white shadow-[0_30px_60px_-34px_rgba(14,58,134,0.8)]" style={{ background: VOUCHER_NAVY }}>
                <div className="p-7 sm:p-9 text-center">
                  <div className="flex justify-center">
                    <span className={`text-[12px] font-bold uppercase tracking-[0.14em] rounded-full px-3 py-1 ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="text-[12px] font-bold tracking-[0.3em] uppercase text-[#E4C47E] mt-5">{cfg.label} voucher · {voucher.name}</div>
                  <div className="mt-3 leading-none" style={{ fontFamily: voucherDisplayFont, fontWeight: 800, fontSize: 'clamp(44px,8vw,60px)' }}>
                    {inr(voucher.amount)}
                  </div>
                  <div className="text-[15px] text-white/85 mt-2">off your luxury holiday</div>

                  <div className="mt-7 border-2 border-dashed border-white/40 rounded-[16px] py-4 px-3">
                    <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/70">Your voucher code</div>
                    <div className="font-mono text-[clamp(22px,5vw,30px)] font-bold tracking-[0.12em] mt-1.5 break-all">{voucher.code}</div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(voucher.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })}
                      className="mt-2.5 text-[13px] font-semibold bg-white/15 hover:bg-white/25 rounded-full px-4 py-1.5 transition"
                    >
                      {copied ? 'Copied ✓' : 'Copy code'}
                    </button>
                  </div>
                </div>
                <div className="bg-white text-[#0B1B3A] grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#EEF1F6] text-center">
                  {[
                    ['Min. spend', `${inr(voucher.minSpend)}`],
                    ['Book by', formatVoucherDate(voucher.bookBy)],
                    ['Travel by', formatVoucherDate(voucher.travelBy)],
                    ['Mobile', voucher.phoneMasked],
                  ].map(([k, v]) => (
                    <div key={k} className="px-3 py-4">
                      <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280]">{k}</div>
                      <div className="text-[14.5px] font-semibold mt-1">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-[14.5px] text-[#4B5563] mt-6 max-w-[560px] mx-auto">
                Minimum spend is per couple, excluding flights. Share this code with your Travelzada travel expert. It is applied when your booking is confirmed.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-5">
                <a
                  href={`/api/vouchers/code/${encodeURIComponent(voucher.code)}/pdf`}
                  className="rounded-full py-3 px-7 font-semibold border border-[#0E3A86] text-[#0E3A86] bg-white hover:bg-[#F4F6FA] transition"
                >
                  Download PDF
                </a>
                <a
                  href={`https://wa.me/919929962350?text=${encodeURIComponent(`Hi Travelzada! My voucher code is ${voucher.code}. I'd like to plan my holiday.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full py-3 px-7 font-semibold text-white"
                  style={{ background: VOUCHER_NAVY }}
                >
                  Plan my holiday on WhatsApp
                </a>
              </div>

              <section className="mt-12">
                <ScaledVoucher>
                  <VoucherBack type={voucher.type} />
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
