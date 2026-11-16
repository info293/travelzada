'use client'

/**
 * The customer-facing quote PDF ("Quote Template v2" house style on white pages), built as A4 pages
 * (794 × 1123 CSS px) of plain HTML. Used twice: scaled down as a live preview in the builder, and mounted
 * offscreen by renderProposalPdf() which captures every [data-proposal-page] with html2canvas.
 *
 * Page set:  cover (arch photo) → "What we've put together" (price + at a glance + stays table + flights,
 * or per-option cards for 3–4 options) → "Your choice of stays" (2 options: side-by-side cards; 3–4: comparison
 * table + choose-if cards) → per-option showcase (photo mosaic, about, amenities, rooms) → "Your journey, day by
 * day" → "Say yes, and we'll handle the rest" (inclusions, payment, cancellation, CTA band).
 * Everything after the cover is a measured flow: blocks are measured in a hidden layer, then packed into pages.
 *
 * html2canvas-safe rules followed here: no object-fit (photos are background-image divs), no clip-path /
 * filters / backdrop-filter, every SVG icon gets an explicit colour, no CSS line-clamp (text is truncated in JS),
 * arch frame = border-radius + overflow hidden. Anything clickable in the PDF carries data-pdf-link="<url>".
 */
import { CSSProperties, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, Image as ImageIcon, MapPin, Minus, Plane, Star, Utensils } from 'lucide-react'
import {
    CONTACT, HS, PAGE_H, PAGE_W, formatLongDate, formatRupees, formatShortDate, whatsappLink,
    type ProposalData, type ProposalFlight, type ProposalImage, type ProposalStay, type StayOption,
} from './types'

const SANS = "var(--font-sans), Figtree, 'Segoe UI', system-ui, sans-serif"
const DISPLAY = "var(--font-display), 'Cormorant Garamond', Georgia, serif"
const SCRIPT = "var(--font-script), 'Pinyon Script', 'Brush Script MT', cursive"

const PAD_X = 56
const CONTENT_W = PAGE_W - PAD_X * 2 // 682
const CONTENT_TOP = 112
const FOOTER_H = 60
const CONT_H = 40
const SECTION_GAP = 40
const BLOCK_GAP = 20
const SAFETY = 6
const BASE_AVAIL = PAGE_H - FOOTER_H - CONTENT_TOP - SAFETY

const clip = (s: string | undefined, n: number) => {
    const t = String(s || '').replace(/\s+/g, ' ').trim()
    return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}
const pad2 = (n: number) => String(n).padStart(2, '0')
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const numWord = (n: number) => NUM_WORDS[n] || String(n)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Ico({ icon: Icon, size = 16, color, stroke = 2 }: { icon: LucideIcon; size?: number; color: string; stroke?: number }) {
    return <Icon size={size} color={color} strokeWidth={stroke} style={{ display: 'block', flexShrink: 0 }} />
}

function travellersLabel(adults: number, children: number) {
    const a = `${adults} adult${adults === 1 ? '' : 's'}`
    return children ? `${a}, ${children} child${children === 1 ? '' : 'ren'}` : a
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, color = HS.tan, size = 11.5, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
    return <div style={{ fontSize: size, fontWeight: 700, letterSpacing: 2.2, textTransform: 'uppercase', color, lineHeight: 1.35, ...style }}>{children}</div>
}

/** Photo as a background-image div (html2canvas has no object-fit). Empty url → cream block with a small icon. */
function Photo({ img, width, height, radius = 16, caption, style, contain }: { img?: ProposalImage | string; width: number | string; height: number; radius?: number | string; caption?: string; style?: CSSProperties; contain?: boolean }) {
    const url = typeof img === 'string' ? img : img?.url || ''
    const cap = caption ?? (typeof img === 'object' ? img?.caption : '')
    return (
        <div
            style={{
                position: 'relative', width, height, borderRadius: radius, overflow: 'hidden', flexShrink: 0,
                backgroundColor: HS.cream, backgroundImage: url ? `url("${url}")` : undefined,
                backgroundSize: contain ? 'contain' : 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                ...style,
            }}
        >
            {!url && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ico icon={ImageIcon} size={Math.min(30, Math.max(16, height / 6))} color={HS.tan} stroke={1.5} />
                </div>
            )}
            {cap && (
                <div style={{ position: 'absolute', left: 10, bottom: 10, maxWidth: '85%', background: 'rgba(255,255,255,0.93)', color: HS.ink, borderRadius: 999, padding: '5px 11px', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {clip(cap, 34)}
                </div>
            )}
        </div>
    )
}

function SectionHead({ eyebrow, title, italic, subtitle, script }: { eyebrow?: string; title: string; italic?: string; subtitle?: string; script?: string }) {
    return (
        <div>
            {script && <div style={{ fontFamily: SCRIPT, fontSize: 44, lineHeight: 1.15, color: HS.tan, marginBottom: 2 }}>{script}</div>}
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <div style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 500, lineHeight: 1.08, color: HS.ink, letterSpacing: -0.3, marginTop: eyebrow ? 8 : 0 }}>
                {title}{italic && <> <span style={{ fontStyle: 'italic', color: HS.wine }}>{italic}</span></>}
            </div>
            {subtitle && <div style={{ fontSize: 15.5, lineHeight: 1.5, color: HS.inkSoft, marginTop: 8 }}>{subtitle}</div>}
        </div>
    )
}

function Badge({ children, tone = 'wine' }: { children: ReactNode; tone?: 'wine' | 'cream' | 'outline' }) {
    const s = tone === 'wine' ? { background: HS.wine, color: '#fff', border: `1px solid ${HS.wine}` }
        : tone === 'cream' ? { background: HS.cream, color: HS.ink, border: `1px solid ${HS.cream}` }
            : { background: 'transparent', color: HS.tan, border: `1px solid ${HS.tan}` }
    return <span style={{ display: 'inline-block', borderRadius: 999, padding: '4px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', lineHeight: 1.3, whiteSpace: 'nowrap', ...s }}>{children}</span>
}

function Stars({ n, color = HS.tan, size = 12 }: { n: number; color?: string; size?: number }) {
    return (
        <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: Math.max(0, Math.min(5, n)) }).map((_, i) => <Star key={i} size={size} color={color} fill={color} strokeWidth={1.5} style={{ display: 'block' }} />)}
        </div>
    )
}

function Dot({ color = HS.tan, top = 9 }: { color?: string; top?: number }) {
    return <div style={{ width: 6, height: 6, borderRadius: 999, background: color, marginTop: top, flexShrink: 0 }} />
}

/* ------------------------------------------------------------------ */
/* Page chrome                                                         */
/* ------------------------------------------------------------------ */

function Logo({ src, height = 30 }: { src: string; height?: number }) {
    return src
        ? <img src={src} alt="Travelzada" style={{ height, width: 'auto', display: 'block' }} />
        : <span style={{ fontFamily: DISPLAY, fontSize: height * 0.9, fontWeight: 700, color: HS.wine, lineHeight: 1 }}>Travelzada</span>
}

function PageFooter({ pageNo, footnote }: { pageNo: number; footnote?: ReactNode }) {
    return (
        <div style={{ position: 'absolute', left: PAD_X, right: PAD_X, bottom: 0, height: FOOTER_H, borderTop: `1px solid ${HS.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ fontSize: 12.5, color: HS.inkSoft, minWidth: 0, lineHeight: 1.4 }}>{footnote}</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, color: HS.ink, flexShrink: 0 }}>{pad2(pageNo)}</div>
        </div>
    )
}

function Page({ children, pageNo, footnote, d, header = true }: { children: ReactNode; pageNo: number; footnote?: ReactNode; d: ProposalData; header?: boolean }) {
    return (
        <div
            data-proposal-page=""
            style={{ width: PAGE_W, height: PAGE_H, position: 'relative', overflow: 'hidden', background: '#ffffff', fontFamily: SANS, color: HS.ink, boxSizing: 'border-box', WebkitFontSmoothing: 'antialiased' }}
        >
            {header && (
                <>
                    <div style={{ position: 'absolute', top: 30, left: PAD_X, right: PAD_X, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Logo src={d.logoUrl} height={30} />
                        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2.2, textTransform: 'uppercase', color: HS.muted }}>
                            {clip(d.runningLabel, 40)} · {d.quoteRef}
                        </div>
                    </div>
                    <div style={{ position: 'absolute', top: 80, left: PAD_X, right: PAD_X, height: 1, background: HS.line }} />
                </>
            )}
            {children}
            <PageFooter pageNo={pageNo} footnote={footnote} />
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Cover                                                               */
/* ------------------------------------------------------------------ */

function CoverPage({ d, pageNo }: { d: ProposalData; pageNo: number }) {
    const c = d.cover
    const t = d.trip
    const n = d.stayOptions.length
    const archW = 600
    const archH = 560
    const archTop = 124
    const archLeft = (PAGE_W - archW) / 2
    const ring = 11
    const titleSize = c.title.length > 16 ? 60 : c.title.length > 11 ? 74 : 92
    const allSingleCity = d.stayOptions.every((o) => new Set(o.hotels.map((h) => h.city.trim().toLowerCase()).filter(Boolean)).size <= 1)
    const eyebrow = n >= 3
        ? `${numWord(n)} ${allSingleCity ? 'resorts' : 'stay options'} compared${t.nights ? ` · ${numWord(t.nights)} nights` : ''}`
        : c.eyebrow
    const nights = t.nights || 0
    const facts: Array<[string, string]> = ([
        ['Travel dates', c.dateRange || (t.travelDate ? formatLongDate(t.travelDate) : 'Flexible')],
        ['Travellers', travellersLabel(t.adults, t.children)],
        ['Duration', nights ? `${nights}N / ${nights + 1}D` : t.durationLabel],
        [n >= 2 ? 'Options' : 'Room', n >= 2 ? `${cap(numWord(n))} ${allSingleCity ? 'resorts' : 'stays'}` : c.roomsLabel],
        ['Hotels', n >= 2 ? (d.stayOptions.map((o) => o.starRating).filter(Boolean).length ? Array.from(new Set(d.stayOptions.map((o) => o.starRating).filter(Boolean))).sort().join(' & ') + '-star' : '') : c.hotelsLabel],
    ] as Array<[string, string]>).filter(([, v]) => v)
    const phoneLink = `tel:+${d.designer.whatsapp}`
    return (
        <Page d={d} pageNo={pageNo} header={false} footnote={<span>Your planner · <b style={{ color: HS.ink }}>{clip(d.designer.name, 30)}</b> · <span data-pdf-link={phoneLink}>{d.designer.phone}</span></span>}>
            {/* Top bar */}
            <div style={{ position: 'absolute', top: 34, left: PAD_X, right: PAD_X, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Logo src={d.logoUrl} height={36} />
                <div style={{ textAlign: 'right' }}>
                    <Eyebrow color={HS.tan} size={11}>Quote · {d.quoteRef}</Eyebrow>
                    <div style={{ fontSize: 13, color: HS.inkSoft, marginTop: 3 }}>Prepared {formatLongDate(d.quoteDate)}</div>
                </div>
            </div>

            {/* Arch photo with a thin tan outline */}
            <div style={{ position: 'absolute', left: archLeft - ring, top: archTop - ring, width: archW + ring * 2, height: archH + ring * 2, border: `1px solid ${HS.tan}`, borderRadius: `${archW / 2 + ring}px ${archW / 2 + ring}px ${24 + ring}px ${24 + ring}px`, boxSizing: 'border-box' }} />
            <Photo img={t.heroImage} width={archW} height={archH} radius={`${archW / 2}px ${archW / 2}px 24px 24px`} style={{ position: 'absolute', left: archLeft, top: archTop }} />

            {/* Title block */}
            <div style={{ position: 'absolute', left: PAD_X, right: PAD_X, top: archTop + archH + 38, textAlign: 'center' }}>
                <Eyebrow size={11.5}>{clip(eyebrow, 70)}</Eyebrow>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
                    <span style={{ fontFamily: DISPLAY, fontSize: titleSize, fontWeight: 500, lineHeight: 1.05, color: HS.ink, letterSpacing: -1 }}>{clip(c.title, 26)}</span>
                    {c.script && <span style={{ fontFamily: SCRIPT, fontSize: Math.round(titleSize * 0.6), lineHeight: 1, color: HS.tan }}>{clip(c.script, 22)}</span>}
                </div>
                {c.subtitle && <div style={{ fontSize: 16, color: HS.inkSoft, marginTop: 6 }}>{clip(c.subtitle, 90)}</div>}
            </div>

            {/* Facts row */}
            <div style={{ position: 'absolute', left: PAD_X, right: PAD_X, top: 922, borderTop: `1px solid ${HS.line}`, borderBottom: `1px solid ${HS.line}`, display: 'flex', padding: '14px 0' }}>
                {facts.map(([label, value], i) => (
                    <div key={label} style={{ flex: i === 0 ? 1.45 : 1, minWidth: 0, padding: '0 10px', borderLeft: i ? `1px solid ${HS.line}` : undefined, textAlign: 'center' }}>
                        <Eyebrow size={10} color={HS.muted}>{label}</Eyebrow>
                        <div style={{ fontSize: 15, fontWeight: 600, color: HS.ink, marginTop: 4, lineHeight: 1.3 }}>{clip(value, 30)}</div>
                    </div>
                ))}
            </div>
        </Page>
    )
}

/* ------------------------------------------------------------------ */
/* Overview blocks                                                     */
/* ------------------------------------------------------------------ */

function PriceGlance({ d, option, multi }: { d: ProposalData; option: StayOption; multi: boolean }) {
    const t = d.trip
    const pax = t.adults + t.children
    const label = multi ? `Your quote · ${option.label}` : `Total package · ${travellersLabel(t.adults, t.children)}`
    const glance = d.extras.atAGlance.slice(0, 7)
    return (
        <div style={{ display: 'flex', gap: 18, alignItems: 'stretch' }}>
            <div style={{ width: 316, flexShrink: 0, boxSizing: 'border-box', background: HS.dark, color: HS.darkText, borderRadius: 22, padding: '24px 24px 22px' }}>
                <Eyebrow color={HS.darkMuted} size={11}>{clip(label, 48)}</Eyebrow>
                <div style={{ fontFamily: DISPLAY, fontSize: option.price > 0 ? 52 : 40, fontWeight: 500, lineHeight: 1, marginTop: 12 }}>{option.price > 0 ? formatRupees(option.price) : 'On request'}</div>
                {option.price > 0 && pax > 1 && <div style={{ fontSize: 14.5, color: HS.darkMuted, marginTop: 8 }}>{formatRupees(option.perPerson)} per person{t.children ? ' (avg.)' : ''}</div>}
                {d.price.note && <div style={{ fontSize: 13, color: HS.darkMuted, marginTop: 4 }}>{clip(d.price.note, 70)}</div>}
                {d.price.advancePaid > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(248,242,234,0.18)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <div><div style={{ color: HS.darkMuted }}>Advance paid</div><div style={{ fontWeight: 700, marginTop: 2 }}>{formatRupees(d.price.advancePaid)}</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ color: HS.darkMuted }}>Balance</div><div style={{ fontWeight: 700, marginTop: 2 }}>{formatRupees(d.price.balance)}</div></div>
                    </div>
                )}
                {d.extras.chips.length > 0 && (
                    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {d.extras.chips.slice(0, 4).map((c, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid rgba(248,242,234,0.35)', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                <Ico icon={Check} size={12} color={HS.darkText} stroke={2.5} /> {clip(c, 24)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0, background: '#fff', border: `1px solid ${HS.line}`, borderRadius: 22, padding: '24px 26px' }}>
                <Eyebrow>At a glance</Eyebrow>
                <div style={{ marginTop: 8 }}>
                    {glance.map((g, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', borderTop: i ? `1px solid ${HS.line}` : undefined }}>
                            <Dot />
                            <div style={{ fontSize: 14.5, lineHeight: 1.5, color: HS.ink }}>{clip(g, 90)}</div>
                        </div>
                    ))}
                    {!glance.length && <div style={{ fontSize: 15, color: HS.inkSoft, lineHeight: 1.5 }}>{clip(d.trip.overview || d.trip.title, 260)}</div>}
                </div>
            </div>
        </div>
    )
}

function ListHeader({ title, right }: { title: string; right?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, paddingBottom: 8 }}>
            <Eyebrow>{title}</Eyebrow>
            {right && <div style={{ fontSize: 12.5, color: HS.muted, fontStyle: 'italic', textAlign: 'right' }}>{right}</div>}
        </div>
    )
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parseIso = (s?: string) => {
    if (!s) return null
    const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
    return Number.isNaN(d.getTime()) ? null : d
}
/** "12 – 13 Dec" / "31 Dec – 2 Jan" */
function stayDates(h: ProposalStay) {
    const a = parseIso(h.checkIn)
    if (!a) return ''
    const b = parseIso(h.checkOut)
    if (!b) return `${a.getDate()} ${MON[a.getMonth()]}`
    return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MON[b.getMonth()]}` : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`
}

function StayRow({ h, last }: { h: ProposalStay; last: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '10px 0', borderTop: `1px solid ${HS.line}`, borderBottom: last ? `1px solid ${HS.line}` : undefined }}>
            <div style={{ width: 62, flexShrink: 0, fontFamily: DISPLAY, fontSize: 34, fontWeight: 500, lineHeight: 1, color: HS.ink }}>{h.nights ? `${h.nights}N` : '—'}</div>
            <div style={{ width: 150, flexShrink: 0 }}>
                <div style={{ fontSize: 11.5, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: 700, color: HS.tan }}>{clip(h.city, 22) || 'Stay'}</div>
                {h.checkIn && <div style={{ fontSize: 12.5, color: HS.muted, marginTop: 3 }}>{stayDates(h)}</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.15, color: HS.ink }}>{clip(h.hotelName, 48) || 'Hotel to be confirmed'}</div>
                {h.roomType && <div style={{ fontSize: 13.5, color: HS.tan, marginTop: 3 }}>{clip(h.roomType, 50)}</div>}
            </div>
            <div style={{ width: 150, flexShrink: 0, textAlign: 'right', fontSize: 13.5, color: HS.inkSoft, lineHeight: 1.35 }}>{clip(h.mealPlan, 40)}</div>
        </div>
    )
}

function MiniFlight({ f }: { f: ProposalFlight }) {
    const code = (city: string) => {
        const c = String(city || '').trim()
        const paren = c.match(/\(([A-Za-z]{3})\)/)
        if (paren) return paren[1].toUpperCase()
        if (/^[A-Z]{3}$/.test(c)) return c
        return c.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '—'
    }
    return (
        <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 12.5, color: HS.muted, fontWeight: 600 }}>{[f.airline, f.flightNumber?.toUpperCase()].filter(Boolean).join(' · ') || 'Flight'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{code(f.departureCity)}</div>
                    {f.departureTime && <div style={{ fontSize: 13.5, color: HS.inkSoft, marginTop: 4 }}>{f.departureTime}</div>}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, borderTop: `1px dashed ${HS.tan}` }} />
                    <Ico icon={Plane} size={16} color={HS.tan} />
                    <div style={{ flex: 1, borderTop: `1px dashed ${HS.tan}` }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{code(f.arrivalCity)}</div>
                    {f.arrivalTime && <div style={{ fontSize: 13.5, color: HS.inkSoft, marginTop: 4 }}>{f.arrivalTime}</div>}
                </div>
            </div>
        </div>
    )
}

function FlightCard({ label, date, shot, flight }: { label: string; date: string; shot?: ProposalImage; flight?: ProposalFlight }) {
    return (
        <div style={{ flex: 1, minWidth: 0, border: `1px solid ${HS.line}`, borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: HS.ink, whiteSpace: 'nowrap', overflow: 'hidden' }}>{clip(label, 32)}</div>
                {date && <div style={{ fontSize: 12.5, color: HS.muted, whiteSpace: 'nowrap' }}>{formatShortDate(date)}</div>}
            </div>
            {shot ? (
                <div style={{ padding: '0 14px 14px' }}>
                    <Photo img={shot.url} width="100%" height={150} radius={12} contain caption="" />
                </div>
            ) : flight ? (
                <div style={{ borderTop: `1px solid ${HS.line}` }}><MiniFlight f={flight} /></div>
            ) : (
                <div style={{ borderTop: `1px solid ${HS.line}`, padding: '16px 18px', fontSize: 13.5, color: HS.inkSoft }}>Flight details are shared once your tickets are booked.</div>
            )}
        </div>
    )
}

function FlightsBlock({ d }: { d: ProposalData }) {
    const fi = d.flightInfo
    if (!fi.included) {
        return (
            <div style={{ background: HS.cream, borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Ico icon={Plane} size={18} color={HS.tan} />
                <div style={{ fontSize: 14.5, color: HS.inkSoft }}>Flights are <b style={{ color: HS.ink }}>not included</b> in this price — we&apos;re happy to add them whenever you like.</div>
            </div>
        )
    }
    const flights = d.flights
    if (!fi.outbound && !fi.inbound && flights.length > 2) {
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                {flights.slice(0, 6).map((f, i) => (
                    <div key={i} style={{ width: (CONTENT_W - 14) / 2, boxSizing: 'border-box', border: `1px solid ${HS.line}`, borderRadius: 20, background: '#fff' }}>
                        <div style={{ padding: '12px 18px 0', fontSize: 12.5, color: HS.muted }}>{f.date ? formatShortDate(f.date) : `Flight ${i + 1}`}</div>
                        <MiniFlight f={f} />
                    </div>
                ))}
            </div>
        )
    }
    return (
        <div style={{ display: 'flex', gap: 14 }}>
            <FlightCard label={fi.outboundLabel} date={fi.outboundDate} shot={fi.outbound} flight={flights[0]} />
            <FlightCard label={fi.inboundLabel} date={fi.inboundDate} shot={fi.inbound} flight={flights.length > 1 ? flights[flights.length - 1] : undefined} />
        </div>
    )
}

/** "3N Beach Villa" (one place) or "1N Srinagar" (multi-city) lines for an option */
function stayLines(o: StayOption) {
    const multiCity = new Set(o.hotels.map((h) => h.city.trim().toLowerCase()).filter(Boolean)).size > 1
    return o.hotels.map((h) => `${h.nights ? `${h.nights}N ` : ''}${multiCity ? h.city : h.roomType || h.hotelName || h.city}`.trim()).filter(Boolean)
}

function MiniFact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div style={{ minWidth: 0 }}>
            <Eyebrow size={10} color={HS.muted}>{label}</Eyebrow>
            <div style={{ fontSize: 14, fontWeight: 600, color: HS.ink, marginTop: 3, lineHeight: 1.4 }}>{children}</div>
        </div>
    )
}

function OptionSummaryCard({ o, i, pax, compact }: { o: StayOption; i: number; pax: number; compact?: boolean }) {
    const lines = stayLines(o)
    return (
        <div style={{ display: 'flex', border: `1px solid ${HS.line}`, borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
            <div style={{ width: 6, flexShrink: 0, background: o.isQuoted ? HS.wine : HS.tan }} />
            <div style={{ flex: 1, minWidth: 0, padding: compact ? '15px 22px' : '18px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Eyebrow>Option {i + 1}</Eyebrow>
                            {o.isQuoted && <Badge>Your quote</Badge>}
                        </div>
                        <div style={{ fontFamily: DISPLAY, fontSize: compact ? 24 : 26, fontWeight: 600, marginTop: 4, lineHeight: 1.12 }}>{clip(o.label, 52)}</div>
                        <div style={{ fontSize: 13.5, color: HS.inkSoft, marginTop: 4 }}>{[o.location, o.starRating ? `${o.starRating}-star` : ''].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>{o.price > 0 ? formatRupees(o.price) : 'On request'}</div>
                        <div style={{ fontSize: 12.5, color: HS.muted, marginTop: 2 }}>{clip(o.priceNote, 40) || (o.price > 0 && pax > 1 ? `${formatRupees(o.perPerson)} per person` : '')}</div>
                    </div>
                </div>
                {(lines.length > 0 || o.transfer || o.mealSummary) && (
                    <div style={{ display: 'flex', gap: 28, marginTop: compact ? 10 : 12, paddingTop: compact ? 10 : 12, borderTop: `1px solid ${HS.line}` }}>
                        {lines.length > 0 && <div style={{ flex: 1.4, minWidth: 0 }}><MiniFact label="Your stay">{clip(lines.join(' · '), 90)}</MiniFact></div>}
                        {o.transfer && <div style={{ flex: 1, minWidth: 0 }}><MiniFact label="Transfer">{clip(o.transfer, 40)}</MiniFact></div>}
                        {o.mealSummary && <div style={{ flex: 1, minWidth: 0 }}><MiniFact label="Meal plan">{clip(o.mealSummary, 40)}</MiniFact></div>}
                    </div>
                )}
                {o.description && !compact && <div style={{ fontSize: 14, color: HS.inkSoft, marginTop: 10, lineHeight: 1.5 }}>{clip(o.description, 120)}</div>}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Choice of stays (2 options) / comparison (3–4)                      */
/* ------------------------------------------------------------------ */

function diffLabel(o: StayOption, quoted: StayOption, pax: number) {
    if (o.isQuoted || !o.price || !quoted.price) return ''
    const diff = o.price - quoted.price
    if (!diff) return 'Same price'
    const who = pax === 2 ? 'for two' : 'in total'
    return `${diff > 0 ? '+' : '−'}${formatRupees(Math.abs(diff))} ${who}`
}

function optionTag(o: StayOption, quoted: StayOption) {
    if (o.isQuoted) return 'Your quote'
    if (o.price && quoted.price) return o.price > quoted.price ? 'Upgrade' : o.price < quoted.price ? 'Saver' : 'Alternative'
    return 'Alternative'
}

function ChoiceCard({ o, quoted, dark, pax }: { o: StayOption; quoted: StayOption; dark: boolean; pax: number }) {
    const fg = dark ? HS.darkText : HS.ink
    const soft = dark ? HS.darkMuted : HS.inkSoft
    const accent = dark ? HS.darkMuted : HS.tan
    const rule = dark ? 'rgba(248,242,234,0.18)' : HS.line
    const diff = diffLabel(o, quoted, pax)
    return (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', background: dark ? HS.dark : '#fff', border: dark ? `1px solid ${HS.dark}` : `1px solid ${HS.line}`, borderRadius: 22, padding: '24px 24px 22px', color: fg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                    <Eyebrow color={accent} size={11}>{clip(o.label, 34)}</Eyebrow>
                    {o.starRating > 0 && <div style={{ marginTop: 6 }}><Stars n={o.starRating} color={accent} size={11} /></div>}
                </div>
                <Badge tone={o.isQuoted ? 'wine' : dark ? 'cream' : 'outline'}>{optionTag(o, quoted)}</Badge>
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 42, fontWeight: 500, lineHeight: 1, marginTop: 14 }}>{o.price > 0 ? formatRupees(o.price) : 'On request'}</div>
            <div style={{ fontSize: 13.5, color: soft, marginTop: 6 }}>
                {o.price > 0 && pax > 1 ? `${formatRupees(o.perPerson)} per person` : ''}{diff ? `${o.price > 0 && pax > 1 ? ' · ' : ''}${diff}` : ''}
            </div>
            <div style={{ height: 1, background: rule, margin: '16px 0 4px' }} />
            {o.hotels.slice(0, 6).map((h, i) => (
                <div key={h.id || i} style={{ padding: '9px 0', borderTop: i ? `1px solid ${rule}` : undefined }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase', color: accent }}>{[clip(h.city, 20), h.nights ? `${h.nights}N` : ''].filter(Boolean).join(' · ')}</div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>{clip(h.hotelName, 40) || 'To be confirmed'}</div>
                    {h.roomType && <div style={{ fontSize: 12.5, color: soft, marginTop: 1 }}>{clip(h.roomType, 44)}</div>}
                </div>
            ))}
            {(o.mealSummary || o.transfer) && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {o.mealSummary && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: soft }}><Ico icon={Utensils} size={14} color={accent} /> {clip(o.mealSummary, 46)}</div>}
                    {o.transfer && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: soft }}><Ico icon={Plane} size={14} color={accent} /> {clip(o.transfer, 46)}</div>}
                </div>
            )}
            <div style={{ flex: 1 }} />
            {o.chooseIf && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${rule}` }}>
                    <Eyebrow color={accent} size={10.5}>Choose this if</Eyebrow>
                    <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18, lineHeight: 1.35, marginTop: 6 }}>{clip(o.chooseIf, 150)}</div>
                </div>
            )}
        </div>
    )
}

function CompareTable({ options, pax }: { options: StayOption[]; pax: number }) {
    const labelW = 128
    const colW = (CONTENT_W - labelW) / options.length
    const rows: Array<{ label: string; cell: (o: StayOption) => ReactNode; strong?: boolean }> = [
        { label: 'Meal plan', cell: (o) => clip(o.mealSummary, 40) },
        { label: 'Getting there', cell: (o) => clip(o.transfer, 40) },
        { label: 'Your rooms', cell: (o) => stayLines(o).slice(0, 4).map((l, i) => <div key={i}>{clip(l, 34)}</div>) },
        { label: 'Where', cell: (o) => clip(o.location, 40) },
        { label: 'Hotel class', cell: (o) => (o.starRating ? <Stars n={o.starRating} /> : '') },
        { label: 'Your quote', cell: (o) => (o.price > 0 ? <><div>{formatRupees(o.price)}</div>{pax > 1 && <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 500, color: HS.muted, marginTop: 2 }}>{formatRupees(o.perPerson)} per person</div>}</> : 'On request'), strong: true },
    ]
    const shown = rows.filter((r) => r.strong || options.some((o) => { const v = r.cell(o); return Array.isArray(v) ? v.length > 0 : !!v }))
    return (
        <div>
            <div style={{ display: 'flex' }}>
                <div style={{ width: labelW, flexShrink: 0 }} />
                {options.map((o, i) => (
                    <div key={o.id} style={{ width: colW, boxSizing: 'border-box', padding: '14px 12px 12px', background: o.isQuoted ? HS.cream : 'transparent', borderRadius: '16px 16px 0 0' }}>
                        <Badge tone={o.isQuoted ? 'wine' : 'outline'}>Option {i + 1}</Badge>
                        <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, lineHeight: 1.15, marginTop: 8 }}>{clip(o.label, 40)}</div>
                    </div>
                ))}
            </div>
            {shown.map((r, ri) => (
                <div key={r.label} style={{ display: 'flex', borderTop: `1px solid ${HS.line}`, borderBottom: ri === shown.length - 1 ? `1px solid ${HS.line}` : undefined }}>
                    <div style={{ width: labelW, flexShrink: 0, padding: '12px 0', fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: HS.muted }}>{r.label}</div>
                    {options.map((o) => (
                        <div key={o.id} style={{ width: colW, boxSizing: 'border-box', padding: '12px', background: o.isQuoted ? HS.cream : 'transparent', fontSize: r.strong ? 19 : 13.5, fontFamily: r.strong ? DISPLAY : SANS, fontWeight: r.strong ? 600 : 500, color: HS.ink, lineHeight: 1.4, borderRadius: ri === shown.length - 1 ? '0 0 16px 16px' : 0 }}>
                            {r.cell(o) || <span style={{ color: HS.muted }}>—</span>}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

function ChooseIfRow({ items }: { items: Array<{ o: StayOption; i: number }> }) {
    return (
        <div style={{ display: 'flex', gap: 12 }}>
            {items.map(({ o, i }) => (
                <div key={o.id} style={{ width: (CONTENT_W - 12) / 2, boxSizing: 'border-box', background: HS.cream, borderRadius: 18, padding: '16px 20px' }}>
                    <Eyebrow size={10.5}>Option {i + 1} · {clip(o.label, 30)}</Eyebrow>
                    <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18, lineHeight: 1.35, color: HS.ink, marginTop: 8 }}>…{clip(o.chooseIf, 160)}</div>
                </div>
            ))}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Option showcase                                                     */
/* ------------------------------------------------------------------ */

function ShowcaseHead({ o, i, total }: { o: StayOption; i: number; total: number }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Eyebrow>{total > 1 ? `Option ${i + 1}` : 'Your stay'}</Eyebrow>
                    {o.isQuoted && total > 1 && <Badge>Your quote</Badge>}
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: o.label.length > 30 ? 33 : o.label.length > 22 ? 38 : 42, fontWeight: 500, lineHeight: 1.08, marginTop: 6, letterSpacing: -0.3 }}>{clip(o.label, 52)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                    {o.location && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: HS.inkSoft }}><Ico icon={MapPin} size={14} color={HS.tan} /> {clip(o.location, 50)}</div>}
                    {o.mealSummary && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: HS.cream, borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 600, color: HS.ink }}><Ico icon={Utensils} size={13} color={HS.tan} /> {clip(o.mealSummary, 34)}</span>}
                </div>
            </div>
            {o.starRating > 0 && (
                <div style={{ flexShrink: 0, border: `1px solid ${HS.line}`, borderRadius: 16, padding: '10px 18px', textAlign: 'center' }}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{o.starRating}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}><Stars n={o.starRating} size={10} /></div>
                    <Eyebrow size={9.5} color={HS.muted} style={{ marginTop: 4 }}>Star</Eyebrow>
                </div>
            )}
        </div>
    )
}

function Mosaic({ images }: { images: ProposalImage[] }) {
    const imgs = images.slice(0, 6)
    const n = imgs.length
    const G = 10
    let grid: ReactNode
    if (n === 1) grid = <Photo img={imgs[0]} width={CONTENT_W} height={420} />
    else if (n === 2) grid = <div style={{ display: 'flex', gap: G }}>{imgs.map((im, i) => <Photo key={i} img={im} width={(CONTENT_W - G) / 2} height={380} />)}</div>
    else {
        const leftW = Math.round(CONTENT_W * 0.58)
        const rightW = CONTENT_W - leftW - G
        const topH = n === 3 ? 440 : n === 4 ? 390 : 360
        const bottom = imgs.slice(3)
        grid = (
            <div>
                <div style={{ display: 'flex', gap: G }}>
                    <Photo img={imgs[0]} width={leftW} height={topH} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
                        <Photo img={imgs[1]} width={rightW} height={(topH - G) / 2} />
                        <Photo img={imgs[2]} width={rightW} height={(topH - G) / 2} />
                    </div>
                </div>
                {bottom.length > 0 && (
                    <div style={{ display: 'flex', gap: G, marginTop: G }}>
                        {bottom.map((im, i) => <Photo key={i} img={im} width={(CONTENT_W - G * (bottom.length - 1)) / bottom.length} height={bottom.length === 1 ? 170 : 140} />)}
                    </div>
                )}
            </div>
        )
    }
    return (
        <div>
            {grid}
            <div style={{ fontSize: 11.5, fontStyle: 'italic', color: HS.muted, marginTop: 8 }}>* Hotel and room images are illustrative of the category booked; your exact room may differ.</div>
        </div>
    )
}

function AboutBlock({ title, text }: { title: string; text: string }) {
    return (
        <div>
            <Eyebrow>{title}</Eyebrow>
            <div style={{ fontSize: 15, lineHeight: 1.65, color: HS.inkSoft, marginTop: 8 }}>{clip(text, 620)}</div>
        </div>
    )
}

function AmenityChips({ items }: { items: string[] }) {
    return (
        <div>
            <Eyebrow>Highlights &amp; amenities</Eyebrow>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {items.slice(0, 16).map((a, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${HS.line}`, borderRadius: 999, padding: '7px 14px', fontSize: 13.5, color: HS.ink }}>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: HS.tan, display: 'inline-block' }} /> {clip(a, 36)}
                    </span>
                ))}
            </div>
        </div>
    )
}

const hasRoomDetails = (h: ProposalStay) => h.bullets.length > 0 || h.images.length > 0 || !!h.sizeSqm

function RoomCard({ h, travellers }: { h: ProposalStay; travellers: string }) {
    const title = h.roomType || h.hotelName || 'Your room'
    const sub = h.roomType ? h.hotelName : ''
    const meta = [stayDates(h), h.mealPlan, h.nights ? `${h.nights} night${h.nights === 1 ? '' : 's'}` : '', travellers].filter(Boolean).join(' · ')
    const img = h.images[0]
    if (!hasRoomDetails(h)) {
        // Compact row for stays without photos / highlights
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, border: `1px solid ${HS.line}`, borderRadius: 16, padding: '13px 20px', background: '#fff' }}>
                <div style={{ width: 120, flexShrink: 0 }}>{h.city && <Eyebrow size={10.5}>{clip(h.city, 18)}</Eyebrow>}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>{clip(title, 46)}</div>
                    {sub && <div style={{ fontSize: 12.5, color: HS.tan, marginTop: 1 }}>{clip(sub, 56)}</div>}
                </div>
                <div style={{ width: 210, flexShrink: 0, textAlign: 'right', fontSize: 12.5, color: HS.inkSoft, lineHeight: 1.4 }}>{clip([stayDates(h), h.mealPlan, h.nights ? `${h.nights}N` : ''].filter(Boolean).join(' · '), 60)}</div>
            </div>
        )
    }
    return (
        <div style={{ display: 'flex', gap: 20, border: `1px solid ${HS.line}`, borderRadius: 20, padding: 20, background: '#fff' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                {h.city && <Eyebrow size={10.5}>{clip(h.city, 30)}</Eyebrow>}
                <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, lineHeight: 1.15, marginTop: 4 }}>{clip(title, 50)}</div>
                {sub && <div style={{ fontSize: 13.5, color: HS.tan, marginTop: 2 }}>{clip(sub, 56)}</div>}
                {meta && <div style={{ fontSize: 13, color: HS.inkSoft, marginTop: 8 }}>{clip(meta, 110)}</div>}
                {h.sizeSqm && <div style={{ fontSize: 13, color: HS.ink, fontWeight: 700, marginTop: 6 }}>{clip(h.sizeSqm, 20)}{/\d$/.test(h.sizeSqm.trim()) ? ' m²' : ''}</div>}
                {h.bullets.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                        {h.bullets.slice(0, 6).map((b, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <Dot top={8} />
                                <div style={{ fontSize: 14, lineHeight: 1.5, color: HS.ink }}>{clip(b, 90)}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {img && <Photo img={img} width={230} height={170} radius={14} />}
        </div>
    )
}

function IncludedWithStay({ items }: { items: string[] }) {
    return (
        <div style={{ background: HS.cream, borderRadius: 20, padding: '20px 24px' }}>
            <Eyebrow>Included with your stay</Eyebrow>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 8 }}>
                {items.slice(0, 14).map((it, i) => (
                    <div key={i} style={{ width: '50%', boxSizing: 'border-box', paddingRight: 14, display: 'flex', gap: 8, marginTop: 6 }}>
                        <div style={{ marginTop: 3 }}><Ico icon={Check} size={14} color={HS.wine} stroke={2.5} /></div>
                        <div style={{ fontSize: 14, lineHeight: 1.45, color: HS.ink }}>{clip(it, 70)}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Day by day                                                          */
/* ------------------------------------------------------------------ */

function DayPhotos({ photos }: { photos: ProposalImage[] }) {
    if (photos.length === 1) return <Photo img={photos[0]} width={CONTENT_W} height={260} radius={20} />
    return (
        <div style={{ display: 'flex', gap: 12 }}>
            {photos.slice(0, 2).map((p, i) => <Photo key={i} img={p} width={(CONTENT_W - 12) / 2} height={250} radius={20} />)}
        </div>
    )
}

function DayRow({ day, index, date, thumb, last }: { day: ProposalData['days'][number]; index: number; date?: string; thumb?: ProposalImage; last?: boolean }) {
    const num = Number((String(day.day).match(/\d+/) || [String(index + 1)])[0]) || index + 1
    const acts = (day.activities || []).filter(Boolean).slice(0, 6)
    return (
        <div style={{ display: 'flex', gap: 20, padding: '18px 0 20px', borderTop: `1px solid ${HS.line}`, borderBottom: last ? `1px solid ${HS.line}` : undefined }}>
            <div style={{ width: 100, flexShrink: 0 }}>
                <div style={{ fontSize: 11.5, letterSpacing: 2, fontWeight: 800, color: HS.wine }}>DAY {pad2(num)}</div>
                {date && <div style={{ fontSize: 13.5, color: HS.inkSoft, marginTop: 4 }}>{date}</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 23, fontWeight: 600, lineHeight: 1.2, color: HS.ink }}>{clip(day.title, 80) || `Day ${num}`}</div>
                {day.description && <div style={{ fontSize: 14.5, lineHeight: 1.6, color: HS.inkSoft, marginTop: 6 }}>{clip(day.description, 650)}</div>}
                {acts.length > 0 && <div style={{ fontSize: 12.5, color: HS.tan, fontWeight: 700, marginTop: 8, lineHeight: 1.5 }}>{acts.map((a) => clip(a, 40)).join('   ·   ')}</div>}
            </div>
            {(day.location || thumb) && (
                <div style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    {day.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, color: HS.tan, textAlign: 'right' }}>
                            <Ico icon={MapPin} size={12} color={HS.tan} /> {clip(day.location, 20)}
                        </div>
                    )}
                    {thumb && <Photo img={thumb} width={140} height={96} radius={12} caption="" style={{ marginTop: day.location ? 10 : 0 }} />}
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Closing                                                             */
/* ------------------------------------------------------------------ */

function IncExc({ inc, exc }: { inc: string[]; exc: string[] }) {
    const col = (title: string, items: string[], good: boolean) => (
        <div style={{ flex: 1, minWidth: 0, background: good ? HS.cream : '#fff', border: good ? `1px solid ${HS.cream}` : `1px solid ${HS.line}`, borderRadius: 20, padding: '20px 22px' }}>
            <Eyebrow color={good ? HS.wine : HS.tan}>{title}</Eyebrow>
            <div style={{ marginTop: 8 }}>
                {items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        <div style={{ marginTop: 3 }}><Ico icon={good ? Check : Minus} size={14} color={good ? HS.wine : HS.tan} stroke={2.5} /></div>
                        <div style={{ fontSize: 14, lineHeight: 1.45, color: HS.ink }}>{clip(it, 110)}</div>
                    </div>
                ))}
            </div>
        </div>
    )
    return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {inc.length > 0 && col('Included', inc, true)}
            {exc.length > 0 && col('Not included', exc, false)}
        </div>
    )
}

function TwoTexts({ items }: { items: Array<{ title: string; text: string }> }) {
    return (
        <div style={{ display: 'flex', gap: 28 }}>
            {items.map((it) => (
                <div key={it.title} style={{ flex: 1, minWidth: 0 }}>
                    <Eyebrow>{it.title}</Eyebrow>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: HS.inkSoft, marginTop: 8 }}>{clip(it.text, 560)}</div>
                </div>
            ))}
        </div>
    )
}

function GoodToKnow({ items }: { items: string[] }) {
    return (
        <div>
            <Eyebrow>Good to know</Eyebrow>
            <div style={{ marginTop: 6 }}>
                {items.map((n, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginTop: 5 }}>
                        <Dot top={8} />
                        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: HS.inkSoft }}>{clip(n, 220)}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function TermsLine({ url }: { url: string }) {
    return (
        <div style={{ fontSize: 13.5, color: HS.inkSoft }}>
            Full inclusions, notes and terms: <span data-pdf-link={url} style={{ color: HS.wine, fontWeight: 700 }}>{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
        </div>
    )
}

function CtaBand({ d }: { d: ProposalData }) {
    const quoted = d.stayOptions.find((o) => o.isQuoted) || d.stayOptions[0]
    const first = d.designer.name.split(' ')[0] || 'Travelzada'
    const waText = `Hi ${first}! I'd like to confirm my ${d.cover.title} trip${d.stayOptions.length > 1 ? ` — ${quoted.label}` : ''} (Quote ${d.quoteRef}).`
    return (
        <div style={{ background: HS.dark, color: HS.darkText, borderRadius: 26, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ minWidth: 0 }}>
                <Eyebrow color={HS.darkMuted} size={11}>This price is held until</Eyebrow>
                <div style={{ fontFamily: DISPLAY, fontSize: 38, fontWeight: 500, lineHeight: 1.05, marginTop: 6 }}>{formatLongDate(d.validUntil)}</div>
                <div style={{ fontSize: 13.5, color: HS.darkMuted, marginTop: 8, lineHeight: 1.5, maxWidth: 330 }}>{clip(d.extras.peakLine, 140)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                <div data-pdf-link={whatsappLink(waText, d.designer.whatsapp)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: HS.cream, color: HS.ink, borderRadius: 999, padding: '15px 24px', fontSize: 16, fontWeight: 800 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: '#25D366', display: 'inline-block' }} /> Confirm on WhatsApp
                </div>
                <div style={{ fontSize: 13, color: HS.darkMuted }}>
                    or call {clip(d.designer.name, 24)} · <span data-pdf-link={CONTACT.phoneHref} style={{ color: HS.darkText, fontWeight: 700 }}>{d.designer.phone}</span>
                </div>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Flow sections                                                       */
/* ------------------------------------------------------------------ */

/** gap = space above this block when it follows another block on the same page (default BLOCK_GAP) */
interface FlowBlock { key: string; node: ReactNode; keepWithNext?: boolean; gap?: number }
const gapOf = (b?: FlowBlock) => (b?.gap ?? BLOCK_GAP)
interface FlowSection { key: string; contTitle: string; blocks: FlowBlock[]; breakBefore?: boolean; footnote?: ReactNode }

function buildSections(d: ProposalData): FlowSection[] {
    const sections: FlowSection[] = []
    const opts = d.stayOptions
    const n = opts.length
    const quoted = opts.find((o) => o.isQuoted) || opts[0]
    const pax = d.trip.adults + d.trip.children
    const travellers = travellersLabel(d.trip.adults, d.trip.children)
    const replyNote = "Reply with the option you like — we'll lock it in."

    /* What we've put together */
    const ov: FlowBlock[] = [{
        key: 'head', keepWithNext: true,
        node: <SectionHead eyebrow={clip([n >= 3 ? `${numWord(n)} options for you` : '', d.trip.title, d.trip.durationLabel].filter(Boolean).join(' · '), 80)} title="What we've" italic="put together" />,
    }]
    if (n <= 2) {
        ov.push({ key: 'price', node: <PriceGlance d={d} option={quoted} multi={n === 2} /> })
        if (quoted.hotels.length) {
            const totalN = quoted.hotels.reduce((s, h) => s + h.nights, 0)
            ov.push({ key: 'sh', keepWithNext: true, node: <ListHeader title="Where you'll stay" right={[totalN ? `${totalN} nights` : '', n === 2 ? clip(quoted.label, 30) : ''].filter(Boolean).join(' · ')} /> })
            quoted.hotels.forEach((h, i) => ov.push({ key: `s${i}`, gap: 0, node: <StayRow h={h} last={i === quoted.hotels.length - 1} /> }))
        }
    } else {
        opts.forEach((o, i) => ov.push({ key: `o${i}`, gap: i ? 14 : BLOCK_GAP, node: <OptionSummaryCard o={o} i={i} pax={pax} compact={n >= 4} /> }))
    }
    if (d.flightInfo.show) {
        ov.push({ key: 'fh', keepWithNext: true, node: <ListHeader title="Flights" right={d.flightInfo.included ? d.flightInfo.fareNote : ''} /> })
        ov.push({ key: 'fl', gap: 2, node: <FlightsBlock d={d} /> })
    }
    sections.push({ key: 'overview', contTitle: "What we've put together", blocks: ov, footnote: `Prices in INR for ${travellers} · quote ${d.quoteRef} valid until ${formatLongDate(d.validUntil)}` })

    /* Choice of stays / comparison */
    if (n === 2) {
        const sameRoute = opts.every((o) => o.hotels.map((h) => h.city.toLowerCase()).join('|') === quoted.hotels.map((h) => h.city.toLowerCase()).join('|'))
        sections.push({
            key: 'choice', contTitle: 'Your choice of stays', breakBefore: true, footnote: replyNote,
            blocks: [
                { key: 'head', keepWithNext: true, node: <SectionHead eyebrow="Two ways to stay" title="Your choice" italic="of stays" subtitle={sameRoute && quoted.hotels.length > 1 ? 'Same route, same days. Only the hotels change.' : 'Same dates — pick the stay that feels right.'} /> },
                { key: 'cards', node: <div style={{ display: 'flex', gap: 18, alignItems: 'stretch' }}>{opts.map((o, i) => <ChoiceCard key={o.id} o={o} quoted={quoted} dark={i === 1} pax={pax} />)}</div> },
            ],
        })
    } else if (n >= 3) {
        const withChoose = opts.map((o, i) => ({ o, i })).filter((x) => x.o.chooseIf)
        const rows: FlowBlock[] = []
        for (let k = 0; k < withChoose.length; k += 2) rows.push({ key: `ci${k}`, gap: k ? 12 : 4, node: <ChooseIfRow items={withChoose.slice(k, k + 2)} /> })
        sections.push({
            key: 'compare', contTitle: 'Your options compared', breakBefore: true, footnote: replyNote,
            blocks: [
                { key: 'head', keepWithNext: true, node: <SectionHead eyebrow="Side by side · everything that changes" title="Your options" italic="compared" /> },
                { key: 'table', node: <CompareTable options={opts} pax={pax} /> },
                ...(rows.length ? [{ key: 'cih', keepWithNext: true, node: <ListHeader title="Choose this if…" /> }, ...rows] : []),
            ],
        })
    }

    /* Per-option showcase + rooms */
    opts.forEach((o, i) => {
        const showcase = d.extras.showcase && (o.images.length > 0 || o.amenities.length > 0)
        const rooms = o.hotels.some(hasRoomDetails) || o.included.length > 0
        if (showcase) {
            const blocks: FlowBlock[] = [{ key: 'head', keepWithNext: true, node: <ShowcaseHead o={o} i={i} total={n} /> }]
            if (o.images.length) blocks.push({ key: 'mosaic', node: <Mosaic images={o.images} /> })
            if (o.description) blocks.push({ key: 'about', node: <AboutBlock title={n > 1 ? 'Why we picked it' : 'About your stay'} text={o.description} /> })
            if (o.amenities.length) blocks.push({ key: 'amen', node: <AmenityChips items={o.amenities} /> })
            sections.push({ key: `show${i}`, contTitle: o.label, breakBefore: true, blocks })
        }
        if (rooms) {
            const blocks: FlowBlock[] = [{ key: 'head', keepWithNext: true, node: <SectionHead eyebrow={n > 1 ? `Option ${i + 1} · ${clip(o.label, 40)}` : clip(o.label, 50)} title="Where you'll" italic="sleep" /> }]
            o.hotels.forEach((h, k) => {
                blocks.push({ key: `r${k}`, gap: k > 0 && !hasRoomDetails(h) ? 10 : BLOCK_GAP, node: <RoomCard h={h} travellers={travellers} /> })
                const next = o.hotels[k + 1]
                if (next && next.checkIn && next.city.trim().toLowerCase() === h.city.trim().toLowerCase()) {
                    blocks.push({ key: `rc${k}`, node: <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18, color: HS.inkSoft, textAlign: 'center' }}>Your room changes on {formatShortDate(next.checkIn)} — we&apos;ll move your bags for you.</div> })
                }
            })
            if (o.included.length) blocks.push({ key: 'inc', node: <IncludedWithStay items={o.included} /> })
            sections.push({ key: `rooms${i}`, contTitle: "Where you'll sleep", breakBefore: !showcase, blocks })
        }
    })

    /* Day by day */
    if (d.days.length) {
        const start = d.trip.travelDate ? new Date(d.trip.travelDate + 'T00:00:00') : null
        const featured = new Set(d.dayPhotos.map((p) => p.url))
        const cities = Array.from(new Set(quoted.hotels.map((h) => h.city).filter(Boolean)))
        const blocks: FlowBlock[] = [{
            key: 'head', keepWithNext: true,
            node: <SectionHead eyebrow={`${d.days.length} days`} title="Your journey," italic="day by day" subtitle={[d.trip.durationLabel, cities.length > 1 ? cities.join(' → ') : ''].filter(Boolean).join(' · ')} />,
        }]
        if (d.dayPhotos.length) blocks.push({ key: 'photos', node: <DayPhotos photos={d.dayPhotos} /> })
        d.days.forEach((day, i) => {
            let date: string | undefined
            if (start && !Number.isNaN(start.getTime())) {
                const dt = new Date(start)
                dt.setDate(dt.getDate() + i)
                date = dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
            }
            const thumb = (day.images || []).find((im) => !featured.has(im.url))
            blocks.push({ key: `d${i}`, gap: i === 0 && !d.dayPhotos.length ? BLOCK_GAP : i === 0 ? 24 : 0, node: <DayRow day={day} index={i} date={date} thumb={thumb} last={i === d.days.length - 1} /> })
        })
        sections.push({ key: 'days', contTitle: 'Your journey, day by day', breakBefore: true, blocks, footnote: cities.length > 1 ? 'Drive times are approximate and depend on weather and road conditions.' : undefined })
    }

    /* Closing */
    const closing: FlowBlock[] = [{ key: 'head', keepWithNext: true, node: <SectionHead script="ready when you are" title="Say yes, and we'll" italic="handle the rest" /> }]
    const inc = d.inclusions.slice(0, 12)
    const exc = d.exclusions.slice(0, 12)
    if (inc.length || exc.length) closing.push({ key: 'ie', node: <IncExc inc={inc} exc={exc} /> })
    closing.push({ key: 'pc', node: <TwoTexts items={[{ title: 'Payment', text: d.extras.paymentText }, { title: 'Cancellation', text: d.extras.cancellationText }]} /> })
    const notes = [...d.policies.booking.slice(0, 4), ...d.notes.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8)]
    if (notes.length) closing.push({ key: 'gtk', node: <GoodToKnow items={notes} /> })
    closing.push({ key: 'terms', node: <TermsLine url={d.extras.termsUrl} /> })
    closing.push({ key: 'cta', node: <CtaBand d={d} /> })
    sections.push({ key: 'closing', contTitle: "Say yes, and we'll handle the rest", breakBefore: true, blocks: closing, footnote: d.extras.ratingLine })

    return sections
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

interface Seg { section: number; indices: number[] }
interface FlowPageLayout { segs: Seg[]; cont: number | null }

/** Packs measured blocks into pages. Sections with breakBefore start a fresh page; keepWithNext glues a heading to what follows. */
function layoutSections(sections: FlowSection[], heights: number[][]): FlowPageLayout[] {
    const pages: FlowPageLayout[] = []
    let page: FlowPageLayout | null = null
    let used = 0
    let avail = 0
    const newPage = (cont: number | null) => {
        page = { segs: [], cont }
        pages.push(page)
        used = 0
        avail = BASE_AVAIL - (cont !== null ? CONT_H : 0)
    }
    sections.forEach((sec, k) => {
        const h = heights[k] || []
        if (!h.length) return
        const need = (i: number) => (sec.blocks[i]?.keepWithNext && i + 1 < h.length ? h[i] + gapOf(sec.blocks[i + 1]) + h[i + 1] : h[i] || 0)
        if (!page || sec.breakBefore || used + SECTION_GAP + need(0) > avail) newPage(null)
        else used += SECTION_GAP
        ;(page as unknown as FlowPageLayout).segs.push({ section: k, indices: [] })
        h.forEach((bh, i) => {
            let p = page as unknown as FlowPageLayout
            let seg = p.segs[p.segs.length - 1]
            if (seg.indices.length && used + gapOf(sec.blocks[i]) + need(i) > avail) {
                newPage(k)
                p = page as unknown as FlowPageLayout
                p.segs.push({ section: k, indices: [] })
                seg = p.segs[0]
            }
            used += (seg.indices.length ? gapOf(sec.blocks[i]) : 0) + bh
            seg.indices.push(i)
        })
    })
    return pages
}

function FlowPage({ d, sections, layout, pageNo }: { d: ProposalData; sections: FlowSection[]; layout: FlowPageLayout; pageNo: number }) {
    const footSec = [...layout.segs].reverse().map((s) => sections[s.section]).find((s) => s.footnote)
    const footnote = footSec?.footnote || `Travelzada · ${CONTACT.website} · ${CONTACT.phone}`
    return (
        <Page d={d} pageNo={pageNo} footnote={footnote}>
            <div style={{ position: 'absolute', top: CONTENT_TOP, left: PAD_X, width: CONTENT_W }}>
                {layout.cont !== null && (
                    <div style={{ height: CONT_H, boxSizing: 'border-box' }}>
                        <Eyebrow color={HS.muted} size={10.5}>{clip(sections[layout.cont].contTitle, 60)} · continued</Eyebrow>
                    </div>
                )}
                {layout.segs.map((seg, si) => {
                    const sec = sections[seg.section]
                    return (
                        <div key={sec.key + '-' + seg.indices[0]} style={{ marginTop: si ? SECTION_GAP : 0 }}>
                            {seg.indices.map((idx, n) => (
                                <div key={sec.blocks[idx].key} style={{ marginTop: n ? gapOf(sec.blocks[idx]) : 0 }}>{sec.blocks[idx].node}</div>
                            ))}
                        </div>
                    )
                })}
            </div>
        </Page>
    )
}

export interface ProposalDocumentProps {
    data: ProposalData
    /** Called once pages are laid out (and again after every re-layout) with the page count */
    onReady?: (pageCount: number) => void
    /** Wrap each page, e.g. to scale it down for a preview */
    pageWrapper?: (page: ReactNode, index: number, total: number) => ReactNode
    /** Style for the element that holds the pages (e.g. a grid for the preview) */
    containerStyle?: CSSProperties
}

export default function ProposalDocument({ data, onReady, pageWrapper, containerStyle }: ProposalDocumentProps) {
    const sections = useMemo(() => buildSections(data), [data])
    const measureRef = useRef<HTMLDivElement>(null)
    const [layout, setLayout] = useState<FlowPageLayout[] | null>(null)
    const [fontTick, setFontTick] = useState(0)

    useEffect(() => {
        let alive = true
        if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
            ;(document as any).fonts.ready.then(() => alive && setFontTick((t) => t + 1))
        }
        return () => { alive = false }
    }, [])

    useLayoutEffect(() => {
        const root = measureRef.current
        if (!root) return
        const heights = sections.map((s) =>
            s.blocks.map((_, i) => {
                const el = root.querySelector(`[data-m="${s.key}-${i}"]`) as HTMLElement | null
                return (el?.offsetHeight || 0) + 1
            }),
        )
        const next = layoutSections(sections, heights)
        setLayout((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }, [sections, fontTick])

    const pages: Array<{ key: string; render: (no: number) => ReactNode }> = []
    if (layout) {
        pages.push({ key: 'cover', render: (no) => <CoverPage d={data} pageNo={no} /> })
        layout.forEach((pl, pi) => {
            pages.push({ key: `flow-${pi}`, render: (no) => <FlowPage d={data} sections={sections} layout={pl} pageNo={no} /> })
        })
    }
    const total = pages.length

    useEffect(() => {
        if (layout && onReady) onReady(total)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout, total])

    return (
        <div style={{ position: 'relative', ...containerStyle }}>
            {/* Hidden measuring layer: every flow block at its final width */}
            <div ref={measureRef} aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none', fontFamily: SANS, color: HS.ink }}>
                {sections.map((s) => s.blocks.map((b, i) => (
                    <div key={`${s.key}-${b.key}`} data-m={`${s.key}-${i}`} style={{ width: CONTENT_W }}>{b.node}</div>
                )))}
            </div>
            {pages.map((p, i) => (
                <div key={p.key}>
                    {pageWrapper ? pageWrapper(p.render(i + 1), i, total) : p.render(i + 1)}
                </div>
            ))}
        </div>
    )
}
