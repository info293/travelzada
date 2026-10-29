/**
 * Server-only: a customer's personal voucher as PNG images (front + T&C) and a 2-page PDF.
 * Used for the WhatsApp image header, the email (inline image + PDF attachment) and the download link.
 */
import React from 'react'
import { readFile } from 'fs/promises'
import path from 'path'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import {
  VOUCHER_ASSISTANCE_EMAIL,
  claimViewUrl,
  formatLongDate,
  formatVoucherDate,
  inr,
  termsFor,
  voucherConfig,
  type VoucherType,
} from '@/lib/vouchers'

export interface VoucherArtworkInput {
  code: string
  type: VoucherType
  name: string
  bookBy: string
  travelBy: string
}

export const FRONT_SIZE = { width: 1200, height: 630 }
export const BACK_SIZE = { width: 1200, height: 800 }

const NAVY = '#0E3A86'
const GOLD_ON_WHITE = '#9C7431'
const GOLD_LINE = '#DCC48F'
const CREAM = '#FFFDF8'
const PAGE_BG = '#E9EDF5'
const INK = '#374151'
const MUTED = '#5B6577'

// ---------- Assets (cached per server instance) ----------

type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800; style: 'normal' | 'italic' }
let fontsPromise: Promise<FontDef[]> | null = null

async function googleFont(family: string, weight: FontDef['weight'], style: FontDef['style'] = 'normal'): Promise<FontDef> {
  const axis = style === 'italic' ? `ital,wght@1,${weight}` : `wght@${weight}`
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${axis}`)).text()
  const url = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1]
  if (!url) throw new Error(`Font not found: ${family} ${weight} ${style}`)
  return { name: family, data: await (await fetch(url)).arrayBuffer(), weight, style }
}

function loadFonts() {
  fontsPromise ??= Promise.all<FontDef>([
    googleFont('Manrope', 400),
    googleFont('Manrope', 600),
    googleFont('Manrope', 700),
    googleFont('Playfair Display', 800),
    googleFont('Playfair Display', 700, 'italic'),
    googleFont('Noto Sans', 700), // fallback for ₹
    googleFont('Noto Sans', 400),
  ]).catch((e) => {
    fontsPromise = null
    throw e
  })
  return fontsPromise
}

let logoPromise: Promise<string | null> | null = null
function loadLogo() {
  logoPromise ??= (async () => {
    const file = 'Travelzada Logo April (1).png'
    try {
      const buf = await readFile(path.join(process.cwd(), 'public', 'images', 'logo', file))
      return `data:image/png;base64,${buf.toString('base64')}`
    } catch {
      try {
        const res = await fetch(`https://www.travelzada.com/images/logo/${encodeURIComponent(file)}`)
        if (!res.ok) return null
        return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
      } catch {
        return null
      }
    }
  })()
  return logoPromise
}

// ---------- Pieces ----------

const row = (style: React.CSSProperties = {}): React.CSSProperties => ({ display: 'flex', flexDirection: 'row', ...style })
const col = (style: React.CSSProperties = {}): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', ...style })
const panelBg = (type: VoucherType) => {
  const t = voucherConfig(type).theme
  return `linear-gradient(160deg, ${t.panel} 0%, ${t.panelDeep} 100%)`
}

function Logo({ src, height }: { src: string | null; height: number }) {
  if (src) return <img src={src} height={height} width={Math.round(height * 3.38)} alt="" />
  return <div style={{ fontSize: height * 0.8, fontWeight: 700, color: NAVY }}>Travelzada</div>
}

function Label({ children, color = MUTED }: { children: string; color?: string }) {
  return <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 2.5, textTransform: 'uppercase', color }}>{children}</div>
}

function Plane() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="#E03B3B">
      <path d="M21.5 12c0-.8-.7-1.4-1.5-1.4h-5.2L9.6 2.5H7.4l2.6 8.1H5.1L3.3 8.3H1.6l1.1 3.7-1.1 3.7h1.7l1.8-2.3H10l-2.6 8.1h2.2l5.2-8.1H20c.8 0 1.5-.6 1.5-1.4z" />
    </svg>
  )
}

// ---------- Front ----------

function Front({ v, logo, qr }: { v: VoucherArtworkInput; logo: string | null; qr: string }) {
  const cfg = voucherConfig(v.type)
  const big = { fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 76, color: NAVY, lineHeight: 1 }
  const name = v.name.length > 26 ? `${v.name.slice(0, 25)}…` : v.name
  return (
    <div style={col({ width: '100%', height: '100%', background: PAGE_BG, padding: 26, fontFamily: 'Manrope' })}>
      <div style={row({ flex: 1, borderRadius: 28, overflow: 'hidden', boxShadow: '0 18px 40px -24px rgba(14,58,134,0.45)' })}>
        <div style={col({ flex: 1, background: '#FFFFFF', padding: '34px 40px 28px' })}>
          <div style={row({ justifyContent: 'space-between', alignItems: 'flex-start' })}>
            <Logo src={logo} height={42} />
            <div style={col({ alignItems: 'flex-end' })}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 6, color: GOLD_ON_WHITE }}>BOARDING PASS</div>
              <div style={{ fontSize: 16, color: '#4B5563', marginTop: 6 }}>{`Personal Travel Voucher · ${cfg.label}`}</div>
            </div>
          </div>
          <div style={{ height: 1, background: '#E3E7EF', marginTop: 22 }} />

          <div style={row({ justifyContent: 'space-between', alignItems: 'center', marginTop: 20 })}>
            <div style={col({})}>
              <Label>From</Label>
              <div style={{ ...big, marginTop: 6 }}>IND</div>
              <div style={{ fontSize: 15, color: '#4B5563', marginTop: 4 }}>India</div>
            </div>
            <div style={row({ alignItems: 'center', marginTop: -10 })}>
              <div style={{ width: 90, borderTop: '3px dashed #B9C3D6' }} />
              <div style={row({ margin: '0 16px' })}><Plane /></div>
              <div style={{ width: 90, borderTop: '3px dashed #B9C3D6' }} />
            </div>
            <div style={col({ alignItems: 'flex-end' })}>
              <Label>To</Label>
              <div style={{ ...big, marginTop: 6 }}>ANY</div>
              <div style={{ fontSize: 15, color: '#4B5563', marginTop: 4 }}>{cfg.destinationsBlurb}</div>
            </div>
          </div>
          <div style={{ height: 1, background: '#E3E7EF', marginTop: 20 }} />

          <div style={row({ marginTop: 18 })}>
            {[
              ['Passenger', name],
              ['Class', cfg.label],
              ['Book by', formatVoucherDate(v.bookBy)],
              ['Travel by', formatVoucherDate(v.travelBy)],
            ].map(([k, val]) => (
              <div key={k} style={col({ flex: k === 'Passenger' ? 1.5 : 1, paddingRight: 16 })}>
                <Label>{k}</Label>
                <div style={{ fontSize: 19, color: k === 'Class' ? NAVY : '#111827', fontWeight: 600, marginTop: 6 }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={row({ marginTop: 22, alignItems: 'center', justifyContent: 'space-between', border: `2px dashed ${GOLD_LINE}`, borderRadius: 16, padding: '14px 22px', background: CREAM })}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 3, color: GOLD_ON_WHITE }}>YOUR VOUCHER CODE</div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 5, color: NAVY }}>{v.code}</div>
          </div>

          <div style={row({ marginTop: 'auto', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14 })}>
            <div style={{ fontSize: 14, color: '#4B5563', maxWidth: 560 }}>
              {`Min. spend ${inr(cfg.minSpend)} per couple, excluding flights · T&C apply`}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#D93434' }}>Bon voyage!</div>
          </div>
        </div>

        <div style={col({ width: 300, background: panelBg(v.type), color: '#FFFFFF', padding: '34px 30px 28px', borderLeft: '4px dashed rgba(255,255,255,0.85)' })}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 3, color: cfg.theme.accent }}>{`${cfg.label.toUpperCase()} VOUCHER`}</div>
          <div style={{ fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 62, lineHeight: 1, marginTop: 14 }}>{inr(cfg.amount)}</div>
          <div style={{ fontSize: 17, color: 'rgba(255,255,255,0.88)', marginTop: 8 }}>off your luxury holiday</div>
          <div style={row({ marginTop: 'auto', alignItems: 'center' })}>
            <div style={row({ background: '#FFFFFF', borderRadius: 14, padding: 9, border: `3px solid ${cfg.theme.accent}` })}>
              <img src={qr} width={112} height={112} alt="" />
            </div>
            <div style={col({ marginLeft: 14 })}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Scan to view</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>travelzada.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Back (T&C) ----------

function Back({ type, logo }: { type: VoucherType; logo: string | null }) {
  const cfg = voucherConfig(type)
  const terms = termsFor(type)
  const split = Math.ceil(terms.length / 2)
  return (
    <div style={col({ width: '100%', height: '100%', background: PAGE_BG, padding: 26, fontFamily: 'Manrope' })}>
      <div style={row({ flex: 1, borderRadius: 28, overflow: 'hidden', border: `1px solid ${GOLD_LINE}` })}>
        <div style={col({ width: 290, background: panelBg(type), color: '#FFFFFF', padding: '38px 30px 30px', borderRight: '4px dashed rgba(255,255,255,0.8)' })}>
          <div style={col({ fontSize: 15, fontWeight: 700, letterSpacing: 4, color: cfg.theme.accent })}>
            <div>{cfg.label.toUpperCase()}</div>
            <div style={{ marginTop: 4 }}>VOUCHER</div>
          </div>
          <div style={{ fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 60, lineHeight: 1, marginTop: 18 }}>{inr(cfg.amount)}</div>
          <div style={{ fontFamily: 'Playfair Display', fontStyle: 'italic', fontWeight: 700, fontSize: 24, marginTop: 10, color: 'rgba(255,255,255,0.92)' }}>
            off on your luxury holiday
          </div>
          <div style={col({ marginTop: 60 })}>
            <Label color={cfg.theme.accent}>Min. spend</Label>
            <div style={{ fontSize: 23, fontWeight: 700, marginTop: 6 }}>{`${inr(cfg.minSpend)} per couple`}</div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>excluding flights</div>
            <div style={{ marginTop: 22, display: 'flex' }}><Label color={cfg.theme.accent}>Travel by</Label></div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{formatLongDate(cfg.travelBy)}</div>
          </div>
          <div style={col({ marginTop: 'auto' })}>
            <Label color={cfg.theme.accent}>For assistance</Label>
            <div style={{ fontSize: 17, marginTop: 6 }}>{VOUCHER_ASSISTANCE_EMAIL}</div>
          </div>
        </div>

        <div style={col({ flex: 1, background: CREAM, padding: '36px 46px 30px' })}>
          <div style={row({ justifyContent: 'space-between', alignItems: 'center' })}>
            <div style={{ fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 46, color: NAVY }}>Terms & Conditions</div>
            <Logo src={logo} height={36} />
          </div>
          <div style={{ height: 2, background: GOLD_LINE, marginTop: 20, marginBottom: 22 }} />
          <div style={row({})}>
            {[terms.slice(0, split), terms.slice(split)].map((list, ci) => (
              <div key={ci} style={col({ flex: 1, marginLeft: ci ? 30 : 0 })}>
                {list.map((t, i) => (
                  <div key={i} style={row({ fontSize: 15.5, lineHeight: 1.42, color: INK, marginBottom: 9 })}>
                    <div style={{ width: 28, flexShrink: 0 }}>{`${ci * split + i + 1}.`}</div>
                    <div style={{ flex: 1 }}>{t}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Renderers ----------

export async function renderVoucherImage(v: VoucherArtworkInput, side: 'front' | 'back'): Promise<Buffer> {
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo()])
  const qr = side === 'front'
    ? await QRCode.toDataURL(claimViewUrl(v.code), { margin: 0, width: 300, color: { dark: '#0B1B3A', light: '#FFFFFF' } })
    : ''
  const size = side === 'front' ? FRONT_SIZE : BACK_SIZE
  const svg = await satori(side === 'front' ? <Front v={v} logo={logo} qr={qr} /> : <Back type={v.type} logo={logo} />, { ...size, fonts })
  // Rendered at 2x so text stays sharp in print and on phones
  return new Resvg(svg, { fitTo: { mode: 'width', value: size.width * 2 } }).render().asPng()
}

export async function renderVoucherPdf(v: VoucherArtworkInput): Promise<Buffer> {
  const [front, back] = await Promise.all([renderVoucherImage(v, 'front'), renderVoucherImage(v, 'back')])
  const pt = (px: number) => px * 0.75
  const doc = new jsPDF({ unit: 'pt', format: [pt(FRONT_SIZE.width), pt(FRONT_SIZE.height)], orientation: 'landscape', compress: true })
  doc.setProperties({ title: `Travelzada voucher ${v.code}`, author: 'Travelzada' })
  doc.addImage(`data:image/png;base64,${front.toString('base64')}`, 'PNG', 0, 0, pt(FRONT_SIZE.width), pt(FRONT_SIZE.height))
  doc.addPage([pt(BACK_SIZE.width), pt(BACK_SIZE.height)], 'landscape')
  doc.addImage(`data:image/png;base64,${back.toString('base64')}`, 'PNG', 0, 0, pt(BACK_SIZE.width), pt(BACK_SIZE.height))
  return Buffer.from(doc.output('arraybuffer'))
}
