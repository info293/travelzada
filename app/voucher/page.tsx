'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { VOUCHER_NAVY, VOUCHER_PAGE_BG, voucherDisplayFont, voucherFontClass } from '@/components/voucher/VoucherDesign'
import { REDEEM_STEPS } from '@/lib/vouchers'

export default function VoucherEntryPage() {
  const router = useRouter()
  const [code, setCode] = useState('')

  const go = (e: React.FormEvent) => {
    e.preventDefault()
    const c = code.trim().toUpperCase().replace(/\s+/g, '')
    if (!c) return
    // Personal codes look like TZI-7KQ4-M2XP; printed cards like TZ-INT-0001
    router.push(/^TZ[DI]-/.test(c) ? `/voucher/code/${encodeURIComponent(c)}` : `/voucher/${encodeURIComponent(c)}`)
  }

  return (
    <>
      <Header />
      <main className={`${voucherFontClass} min-h-screen pt-28 pb-16 text-[#0B1B3A]`} style={{ background: VOUCHER_PAGE_BG }}>
        <div className="max-w-[620px] mx-auto px-4 sm:px-6 text-center">
          <div className="text-[12px] font-bold tracking-[0.3em] uppercase text-[#9C7431]">Travelzada vouchers</div>
          <h1 className="mt-2 text-[clamp(32px,5vw,50px)] leading-[1.08]" style={{ fontFamily: voucherDisplayFont, fontWeight: 800, color: VOUCHER_NAVY }}>
            Redeem your voucher
          </h1>
          <p className="text-[15.5px] text-[#4B5563] mt-3">Enter the code printed on your voucher, or the personal code we sent you.</p>

          <form onSubmit={go} className="mt-8 bg-white rounded-[20px] p-5 sm:p-6 shadow-[0_20px_50px_-30px_rgba(14,58,134,0.55)] flex flex-col sm:flex-row gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="TZ-INT-0001"
              className="flex-1 min-w-0 border border-[#D5DBE6] rounded-full px-5 py-3.5 font-mono text-[17px] tracking-wider uppercase outline-none focus:border-[#0E3A86] bg-[#F4F6FA] focus:bg-white"
              aria-label="Voucher code"
            />
            <button type="submit" className="rounded-full px-7 py-3.5 font-semibold text-white" style={{ background: VOUCHER_NAVY }}>
              Continue
            </button>
          </form>

          <ol className="mt-10 text-left bg-white rounded-[20px] p-6 sm:p-7 grid gap-3.5">
            {REDEEM_STEPS.map((s, i) => (
              <li key={i} className="flex gap-3.5 items-start">
                <span className="flex-none w-7 h-7 rounded-full bg-[#E9EDF5] text-[#0E3A86] flex items-center justify-center text-[13px] font-bold">{i + 1}</span>
                <span className="text-[15px] leading-[1.55] text-[#374151] pt-0.5">
                  <strong className="text-[#0B1B3A]">{s.title}</strong> {s.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </main>
      <Footer />
    </>
  )
}
