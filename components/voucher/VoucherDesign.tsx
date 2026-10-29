'use client'

import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Playfair_Display, Manrope } from 'next/font/google'
import {
  VOUCHER_ASSISTANCE_EMAIL,
  cardRedeemUrl,
  formatLongDate,
  formatVoucherDate,
  inr,
  termsFor,
  voucherConfig,
  type VoucherType,
} from '@/lib/vouchers'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '800'], style: ['normal', 'italic'], display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' })

export const VOUCHER_NAVY = '#0E3A86'
export const VOUCHER_PAGE_BG = '#E9EDF5'
const GOLD_ON_WHITE = '#9C7431'
const GOLD_LINE = '#DCC48F'
const CREAM = '#FFFDF8'
const DESIGN_WIDTH = 1000

export const voucherFontClass = manrope.className
export const voucherDisplayFont = playfair.style.fontFamily

const LOGO = '/images/logo/Travelzada Logo April (1).png'
const STUB_STEPS = ['Scan to redeem', 'Enter your details', 'You will get a unique code on your email']

/** Renders a fixed-width (1000px) design scaled down to fit its container, so it looks identical on phones. */
export function ScaledVoucher({ children, fixed = false }: { children: React.ReactNode; fixed?: boolean }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>()

  useLayoutEffect(() => {
    if (fixed) return
    const update = () => {
      if (!outer.current || !inner.current) return
      const s = Math.min(1, outer.current.clientWidth / DESIGN_WIDTH)
      setScale(s)
      setHeight(inner.current.offsetHeight * s)
    }
    update()
    const ro = new ResizeObserver(update)
    if (outer.current) ro.observe(outer.current)
    if (inner.current) ro.observe(inner.current)
    return () => ro.disconnect()
  }, [fixed])

  if (fixed) return <div style={{ width: DESIGN_WIDTH }}>{children}</div>
  return (
    <div ref={outer} className="w-full" style={{ height }}>
      <div ref={inner} style={{ width: DESIGN_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}

function useQr(url: string) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 0, width: 360, errorCorrectionLevel: 'M', color: { dark: '#0B1B3A', light: '#FFFFFF' } })
      .then(setSrc)
      .catch(() => setSrc(''))
  }, [url])
  return src
}

/** Half-circle cut-outs where the perforation meets the top and bottom edges */
function Notches({ left, bg }: { left: number | string; bg: string }) {
  const style = (top: boolean): React.CSSProperties => ({
    position: 'absolute',
    left,
    [top ? 'top' : 'bottom']: -22,
    width: 44,
    height: 44,
    marginLeft: -22,
    borderRadius: '50%',
    background: bg,
  })
  return (
    <>
      <span style={style(true)} />
      <span style={style(false)} />
    </>
  )
}

function PlaneIcon({ size = 26, color = '#E03B3B' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M21.5 12c0-.8-.7-1.4-1.5-1.4h-5.2L9.6 2.5H7.4l2.6 8.1H5.1L3.3 8.3H1.6l1.1 3.7-1.1 3.7h1.7l1.8-2.3H10l-2.6 8.1h2.2l5.2-8.1H20c.8 0 1.5-.6 1.5-1.4z" />
    </svg>
  )
}

const panelBg = (type: VoucherType) => {
  const { panel, panelDeep } = voucherConfig(type).theme
  return `linear-gradient(160deg, ${panel} 0%, ${panelDeep} 100%)`
}

export interface VoucherFrontProps {
  type: VoucherType
  code: string
  recipientName?: string
  validUntil?: string
  pageBg?: string
}

/** Front of the voucher: boarding pass with QR stub */
export const VoucherFront = forwardRef<HTMLDivElement, VoucherFrontProps>(function VoucherFront(
  { type, code, recipientName, validUntil, pageBg = VOUCHER_PAGE_BG },
  ref
) {
  const cfg = voucherConfig(type)
  const qr = useQr(cardRedeemUrl(code))
  const label = (t: string) => <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#5B6577]">{t}</div>
  const bigCode = { fontFamily: playfair.style.fontFamily, fontWeight: 800, fontSize: 64, color: VOUCHER_NAVY }

  return (
    <div ref={ref} className={manrope.className} style={{ background: pageBg, padding: 20 }}>
      <div className="relative flex rounded-[22px] overflow-hidden shadow-[0_18px_40px_-24px_rgba(14,58,134,0.45)]" style={{ minHeight: 440 }}>
        {/* Main pass */}
        <div className="flex-1 bg-white px-[34px] pt-[30px] pb-[22px] flex flex-col">
          <div className="flex items-start justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Travelzada" style={{ height: 34, width: 'auto' }} crossOrigin="anonymous" />
            <div className="text-right">
              <div className="text-[12.5px] font-bold tracking-[0.38em] uppercase" style={{ color: GOLD_ON_WHITE }}>
                Boarding Pass
              </div>
              <div className="text-[13px] text-[#4B5563] mt-1.5">Premium Travel Voucher · {cfg.label}</div>
            </div>
          </div>

          <div className="h-px bg-[#E3E7EF] mt-6" />

          <div className="flex items-center justify-between mt-7">
            <div>
              {label('From')}
              <div className="leading-none mt-1.5" style={bigCode}>IND</div>
              <div className="text-[13px] text-[#4B5563] mt-1">India</div>
            </div>
            <div className="flex-1 flex items-center justify-center gap-4 px-10 -mt-3">
              <span className="flex-1 max-w-[90px] border-t-2 border-dashed border-[#B9C3D6]" />
              <PlaneIcon />
              <span className="flex-1 max-w-[90px] border-t-2 border-dashed border-[#B9C3D6]" />
            </div>
            <div className="text-right">
              {label('To')}
              <div className="leading-none mt-1.5" style={bigCode}>ANY</div>
              <div className="text-[13px] text-[#4B5563] mt-1">{cfg.destinationsBlurb}</div>
            </div>
          </div>

          <div className="h-px bg-[#E3E7EF] mt-7" />

          <div className="grid grid-cols-4 gap-4 mt-5">
            <div>
              {label('Passenger')}
              <div className="text-[15.5px] text-[#111827] mt-1.5 truncate">{recipientName || 'Valued guest'}</div>
            </div>
            <div>
              {label('Class')}
              <div className="text-[15.5px] font-medium mt-1.5" style={{ color: VOUCHER_NAVY }}>{cfg.label}</div>
            </div>
            <div>
              {label('Voucher code')}
              <div className="text-[15px] font-mono tracking-wide text-[#111827] mt-1.5">{code}</div>
            </div>
            <div>
              {label('Valid until')}
              <div className="text-[15.5px] text-[#111827] mt-1.5">{validUntil ? formatVoucherDate(validUntil) : '—'}</div>
            </div>
          </div>

          <div className="h-px bg-[#E3E7EF] mt-5" />

          <div className="flex items-end justify-between gap-6 mt-auto pt-4">
            <div className="text-[12.5px] leading-[1.55] text-[#4B5563] max-w-[560px]">
              Min. spend {inr(cfg.minSpend)} per couple, excluding flights · Book within {cfg.bookWithinMonths} months · Travel by{' '}
              {formatLongDate(cfg.travelBy)} · T&amp;C overleaf
            </div>
            <div className="text-[13px] font-bold text-[#D93434] whitespace-nowrap">Bon voyage!</div>
          </div>
        </div>

        {/* Stub */}
        <div className="relative w-[280px] flex-none px-[28px] pt-[28px] pb-[24px] flex flex-col text-white border-l-[3px] border-dotted border-white/90" style={{ background: panelBg(type) }}>
          <div className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: cfg.theme.accent }}>
            {cfg.label} Voucher
          </div>
          <div className="leading-none mt-3" style={{ fontFamily: playfair.style.fontFamily, fontWeight: 800, fontSize: 46 }}>
            {inr(cfg.amount)}
          </div>
          <div className="text-[13.5px] text-white/85 mt-1.5">off your luxury holiday</div>

          <div className="mt-5 bg-white rounded-[14px] p-2.5 self-start" style={{ width: 128, height: 128, border: `3px solid ${cfg.theme.accent}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr && <img src={qr} alt={`QR code to redeem ${code}`} className="w-full h-full" />}
          </div>

          <ol className="mt-5 grid gap-2.5">
            {STUB_STEPS.map((s, i) => (
              <li key={s} className="flex items-start gap-2.5 text-[13.5px] leading-[1.35] text-white/95">
                <span
                  className="flex-none w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11.5px] font-semibold"
                  style={{ border: `1.5px solid ${cfg.theme.accent}`, color: cfg.theme.accent }}
                >
                  {i + 1}
                </span>
                <span className="pt-[2px]">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <Notches left="calc(100% - 281.5px)" bg={pageBg} />
      </div>
    </div>
  )
})

/** Back of the voucher: summary panel + terms & conditions */
export const VoucherBack = forwardRef<HTMLDivElement, { type: VoucherType; pageBg?: string }>(function VoucherBack(
  { type, pageBg = VOUCHER_PAGE_BG },
  ref
) {
  const cfg = voucherConfig(type)
  const terms = termsFor(type)
  const split = Math.ceil(terms.length / 2)
  const facts: [string, React.ReactNode][] = [
    ['Min. spend', <>
      <div className="text-[19px] font-bold leading-snug">{inr(cfg.minSpend)} per couple</div>
      <div className="text-[14px] text-white/80">excluding flights</div>
    </>],
    ['Travel by', <div className="text-[19px] font-semibold">{formatLongDate(cfg.travelBy)}</div>],
  ]

  return (
    <div ref={ref} className={manrope.className} style={{ background: pageBg, padding: 20 }}>
      <div
        className="relative flex rounded-[22px] overflow-hidden shadow-[0_18px_40px_-24px_rgba(14,58,134,0.45)]"
        style={{ minHeight: 500, border: `1px solid ${GOLD_LINE}` }}
      >
        <div className="w-[250px] flex-none px-[28px] pt-[32px] pb-[26px] flex flex-col text-white border-r-[3px] border-dotted border-white/80" style={{ background: panelBg(type) }}>
          <div className="text-[12.5px] font-bold tracking-[0.3em] uppercase leading-[1.6]" style={{ color: cfg.theme.accent }}>
            {cfg.label}
            <br />
            Voucher
          </div>
          <div className="leading-none mt-4" style={{ fontFamily: playfair.style.fontFamily, fontWeight: 800, fontSize: 50 }}>
            {inr(cfg.amount)}
          </div>
          <div className="text-[19px] text-white/90 mt-2 leading-snug" style={{ fontFamily: playfair.style.fontFamily, fontStyle: 'italic', fontWeight: 700 }}>
            off on your luxury holiday
          </div>

          <div className="grid gap-4 mt-14">
            {facts.map(([k, v]) => (
              <div key={k}>
                <div className="text-[12px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: cfg.theme.accent }}>{k}</div>
                {v}
              </div>
            ))}
          </div>
          <div className="mt-auto pt-8">
            <div className="text-[12px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: cfg.theme.accent }}>For assistance</div>
            <div className="text-[14.5px]">{VOUCHER_ASSISTANCE_EMAIL}</div>
          </div>
        </div>

        <div className="flex-1 px-[44px] pt-[32px] pb-[26px]" style={{ background: CREAM }}>
          <div className="flex items-center justify-between">
            <div style={{ fontFamily: playfair.style.fontFamily, fontWeight: 700, fontSize: 38, color: VOUCHER_NAVY }}>Terms &amp; Conditions</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Travelzada" style={{ height: 30, width: 'auto' }} crossOrigin="anonymous" />
          </div>
          <div className="h-[1.5px] mt-5 mb-5" style={{ background: GOLD_LINE }} />
          <div className="grid grid-cols-2 gap-x-8">
            {[terms.slice(0, split), terms.slice(split)].map((col, ci) => (
              <ol key={ci} className="grid gap-2 content-start text-[12.6px] leading-[1.48] text-[#374151]">
                {col.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="flex-none w-5 text-right tabular-nums">{ci * split + i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            ))}
          </div>
        </div>

        <Notches left={251.5} bg={pageBg} />
      </div>
    </div>
  )
})
