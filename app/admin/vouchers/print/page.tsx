'use client'

import React, { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { Download, Printer } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { ScaledVoucher, VoucherBack, VoucherFront } from '@/components/voucher/VoucherDesign'
import { VOUCHER_CARDS_COLLECTION, type VoucherCard } from '@/lib/vouchers'

function PrintVouchers() {
  const params = useSearchParams()
  const { currentUser, loading } = useAuth()
  const [cards, setCards] = useState<VoucherCard[] | null>(null)
  const [downloading, setDownloading] = useState(false)
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (loading || !currentUser) return
    const codes = (params.get('codes') || '').split(',').map((c) => c.trim()).filter(Boolean)
    Promise.all(codes.map((c) => getDoc(doc(db, VOUCHER_CARDS_COLLECTION, c)))).then((snaps) =>
      setCards(snaps.filter((s) => s.exists()).map((s) => s.data() as VoucherCard))
    )
  }, [params, currentUser, loading])

  const downloadPngs = async () => {
    if (!cards) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      for (const card of cards) {
        for (const side of ['front', 'back'] as const) {
          const el = refs.current[`${card.code}-${side}`]
          if (!el) continue
          const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: null })
          const a = document.createElement('a')
          a.href = canvas.toDataURL('image/png')
          a.download = `${card.code}-${side}.png`
          a.click()
          await new Promise((r) => setTimeout(r, 300))
        }
      }
    } finally {
      setDownloading(false)
    }
  }

  if (loading || cards === null) return <div className="p-10 text-gray-500">{!loading && !currentUser ? 'Please log in as admin.' : 'Loading vouchers…'}</div>
  if (cards.length === 0) return <div className="p-10 text-gray-500">No voucher cards found.</div>

  return (
    <div className="bg-gray-100 min-h-screen print:bg-white">
      <style>{`@page { size: A4 landscape; margin: 8mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @media print { .voucher-sheet { break-after: page; } }`}</style>
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <div className="font-semibold text-gray-900">{cards.length} voucher{cards.length > 1 ? 's' : ''} · front and back</div>
        <div className="flex-1" />
        <button onClick={downloadPngs} disabled={downloading} className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-60">
          <Download className="w-4 h-4" /> {downloading ? 'Preparing…' : 'Download PNGs'}
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 bg-gray-900 text-white">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      <div className="flex flex-col items-center gap-8 py-8 print:py-0 print:gap-0">
        {cards.map((card) => (
          <React.Fragment key={card.code}>
            <div className="voucher-sheet">
              <ScaledVoucher fixed>
                <VoucherFront
                  ref={(el) => { refs.current[`${card.code}-front`] = el }}
                  type={card.type}
                  code={card.code}
                  recipientName={card.recipientName}
                  validUntil={card.validUntil}
                />
              </ScaledVoucher>
            </div>
            <div className="voucher-sheet">
              <ScaledVoucher fixed>
                <VoucherBack ref={(el) => { refs.current[`${card.code}-back`] = el }} type={card.type} />
              </ScaledVoucher>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default function PrintVouchersPage() {
  return (
    <Suspense fallback={<div className="p-10 text-gray-500">Loading…</div>}>
      <PrintVouchers />
    </Suspense>
  )
}
