'use client'

/**
 * The customer-facing quote PDF, built as A4 pages (794 × 1123 CSS px) of plain HTML.
 * Used twice: scaled down as a live preview in the builder, and mounted offscreen by
 * renderProposalPdf() which captures every [data-proposal-page] with html2canvas.
 *
 * html2canvas-safe rules followed here: no object-fit (photos are background-image divs),
 * no clip-path / filters / backdrop-filter, every SVG icon gets an explicit colour
 * (currentColor does not survive SVG serialisation), no CSS line-clamp (text is truncated in JS).
 * Anything that should be clickable in the PDF carries data-pdf-link="<url>".
 */
import { CSSProperties, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
    BadgeCheck, BedDouble, Calendar, CalendarDays, Camera, Car, Check, ClipboardList, Clock, CreditCard, Gift,
    Globe, Headphones, Heart, HeartHandshake, Info, Mail, MapPin, MessageCircle, Moon, Phone, Plane, Quote,
    Route, ShieldCheck, Sparkles, Star, Sun, Users, Utensils, Wallet, X,
} from 'lucide-react'
import {
    CONTACT, PAGE_H, PAGE_W, TZ, formatLongDate, formatRupees, formatShortDate, nightsBetween, whatsappLink,
    type ProposalData, type ProposalFlight, type ProposalHotel,
} from './types'

const SANS = "var(--font-sans), Figtree, 'Segoe UI', system-ui, sans-serif"
const DISPLAY = "var(--font-display), 'Cormorant Garamond', Georgia, serif"

const PAD_X = 48
const CONTENT_W = PAGE_W - PAD_X * 2 // 698
const FOOTER_H = 64
const HEADER_FIRST = 196
const HEADER_CONT = 152 // logo row + one-line title + breathing room
const INLINE_TITLE_H = 64 // title of a section that starts part-way down a page
const BLOCK_GAP = 18
const SAFETY = 14

const clip = (s: string | undefined, n: number) => {
    const t = String(s || '').replace(/\s+/g, ' ').trim()
    return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}

const bgImage = (src?: string, fallback = `linear-gradient(150deg, ${TZ.wineLight} 0%, ${TZ.wine} 40%, ${TZ.mauve} 75%, ${TZ.coffee} 100%)`) =>
    src ? `url("${src}"), ${fallback}` : fallback

function Ico({ icon: Icon, size = 22, color, stroke = 2 }: { icon: LucideIcon; size?: number; color: string; stroke?: number }) {
    return <Icon size={size} color={color} strokeWidth={stroke} style={{ display: 'block', flexShrink: 0 }} />
}

/* ------------------------------------------------------------------ */
/* Page chrome                                                         */
/* ------------------------------------------------------------------ */

function Footer({ pageNo, total, quoteRef, dark }: { pageNo: number; total: number; quoteRef: string; dark?: boolean }) {
    const c = dark ? 'rgba(255,255,255,0.78)' : TZ.granite
    return (
        <div
            style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: FOOTER_H, padding: `0 ${PAD_X}px`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, color: c,
                borderTop: dark ? '1px solid rgba(255,255,255,0.14)' : `1px solid ${TZ.line}`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span data-pdf-link="https://www.travelzada.com" style={{ fontWeight: 700, color: dark ? '#fff' : TZ.wine }}>{CONTACT.website}</span>
                <span data-pdf-link={CONTACT.phoneHref}>{CONTACT.phone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span>Quote {quoteRef}</span>
                <span style={{ fontWeight: 700, color: dark ? '#fff' : TZ.coffee }}>{pageNo} / {total}</span>
            </div>
        </div>
    )
}

function Page({ children, pageNo, total, quoteRef, background = '#ffffff', dark }: { children: ReactNode; pageNo: number; total: number; quoteRef: string; background?: string; dark?: boolean }) {
    return (
        <div
            data-proposal-page=""
            style={{
                width: PAGE_W, height: PAGE_H, position: 'relative', overflow: 'hidden', background,
                fontFamily: SANS, color: TZ.coffee, boxSizing: 'border-box', WebkitFontSmoothing: 'antialiased',
            }}
        >
            {children}
            <Footer pageNo={pageNo} total={total} quoteRef={quoteRef} dark={dark} />
        </div>
    )
}

function LogoPill({ src, height = 34 }: { src: string; height?: number }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', borderRadius: 999, padding: '10px 20px', boxShadow: '0 4px 14px rgba(15,4,6,0.12)' }}>
            {src ? <img src={src} alt="Travelzada" style={{ height, width: 'auto', display: 'block' }} /> : <span style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 700, color: TZ.wine }}>Travelzada</span>}
        </div>
    )
}

function SectionHeader({ logo, eyebrow, title, cont, compact, icon }: { logo: string; eyebrow: string; title: string; cont?: boolean; compact?: boolean; icon: LucideIcon }) {
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cont || compact ? HEADER_CONT : HEADER_FIRST, padding: `36px ${PAD_X}px 0`, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {logo ? <img src={logo} alt="Travelzada" style={{ height: 34, width: 'auto', display: 'block' }} /> : <span style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 700, color: TZ.wine }}>Travelzada</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: TZ.roseSoft, color: TZ.wine, borderRadius: 999, padding: '8px 16px', fontSize: 15, fontWeight: 700 }}>
                    <Ico icon={icon} size={18} color={TZ.wine} />
                    {eyebrow}
                </div>
            </div>
            {cont || compact ? (
                <div style={{ marginTop: 22, fontFamily: DISPLAY, fontSize: 34, fontWeight: 700, lineHeight: 1.1, color: TZ.coffee }}>
                    {title} {cont && <span style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, color: TZ.granite }}>· continued</span>}
                </div>
            ) : (
                <div style={{ marginTop: 34 }}>
                    <div style={{ width: 56, height: 5, borderRadius: 4, background: TZ.wine, marginBottom: 16 }} />
                    <div style={{ fontFamily: DISPLAY, fontSize: 50, fontWeight: 700, lineHeight: 1.02, color: TZ.coffee, letterSpacing: -0.5 }}>{title}</div>
                </div>
            )}
        </div>
    )
}

function Chip({ icon, children, tone = 'light' }: { icon?: LucideIcon; children: ReactNode; tone?: 'light' | 'glass' | 'rose' | 'white' }) {
    const styles: Record<string, { bg: string; fg: string; border?: string }> = {
        light: { bg: TZ.mist, fg: TZ.coffee, border: `1px solid ${TZ.line}` },
        glass: { bg: 'rgba(255,255,255,0.16)', fg: '#ffffff', border: '1px solid rgba(255,255,255,0.32)' },
        rose: { bg: TZ.roseSoft, fg: TZ.wine },
        white: { bg: '#ffffff', fg: TZ.coffee },
    }
    const s = styles[tone]
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: s.bg, color: s.fg, border: s.border, borderRadius: 999, padding: '9px 16px', fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
            {icon && <Ico icon={icon} size={18} color={s.fg} />}
            {children}
        </span>
    )
}

function travellersLabel(adults: number, children: number) {
    const a = `${adults} Adult${adults === 1 ? '' : 's'}`
    return children ? `${a}, ${children} Child${children === 1 ? '' : 'ren'}` : a
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'TZ'
}

/* ------------------------------------------------------------------ */
/* Page 1 — Cover                                                      */
/* ------------------------------------------------------------------ */

function CoverPage({ d, pageNo, total }: { d: ProposalData; pageNo: number; total: number }) {
    const t = d.trip
    const waText = `Hi ${d.designer.name.split(' ')[0] || 'Travelzada'}! I'm ${d.client.name}. I'm looking at my ${t.destination || 'trip'} quote (${d.quoteRef}).`
    return (
        <Page pageNo={pageNo} total={total} quoteRef={d.quoteRef} background={TZ.coffee} dark>
            {/* Hero photo */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: bgImage(t.heroImage), backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 260, backgroundImage: 'linear-gradient(180deg, rgba(15,4,6,0.62) 0%, rgba(15,4,6,0) 100%)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 760, backgroundImage: 'linear-gradient(180deg, rgba(15,4,6,0) 0%, rgba(15,4,6,0.55) 30%, rgba(15,4,6,0.92) 62%, rgba(15,4,6,0.97) 100%)' }} />

            {/* Top bar */}
            <div style={{ position: 'absolute', top: 36, left: PAD_X, right: PAD_X, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <LogoPill src={d.logoUrl} />
                <div style={{ textAlign: 'right', color: '#fff' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85, letterSpacing: 1.5, textTransform: 'uppercase' }}>Personalised quote</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{d.quoteRef}</div>
                </div>
            </div>

            {/* Bottom content */}
            <div style={{ position: 'absolute', left: PAD_X, right: PAD_X, bottom: FOOTER_H + 30 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: TZ.wine, color: '#fff', borderRadius: 999, padding: '10px 20px', fontSize: 18, fontWeight: 700 }}>
                    <Ico icon={Heart} size={18} color="#ffffff" />
                    Prepared for {clip(d.client.name, 40)}
                </div>
                <div style={{ marginTop: 20, fontFamily: DISPLAY, fontSize: 68, lineHeight: 1.0, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>{clip(t.title, 70)}</div>
                {t.destination && (
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, color: TZ.rose, fontSize: 22, fontWeight: 600 }}>
                        <Ico icon={MapPin} size={22} color={TZ.rose} />
                        {t.destination}
                    </div>
                )}
                <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {t.durationLabel && <Chip tone="glass" icon={Moon}>{t.durationLabel}</Chip>}
                    {t.travelDate && <Chip tone="glass" icon={Calendar}>{formatLongDate(t.travelDate)}</Chip>}
                    <Chip tone="glass" icon={Users}>{travellersLabel(t.adults, t.children)}</Chip>
                    {t.tripType && <Chip tone="glass" icon={Sparkles}>{t.tripType}</Chip>}
                    {t.starCategory && <Chip tone="glass" icon={Star}>{clip(t.starCategory, 22)}</Chip>}
                </div>

                {/* Travel designer strip */}
                <div style={{ marginTop: 30, background: '#fff', borderRadius: 26, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>
                    <div style={{ width: 60, height: 60, borderRadius: 999, background: TZ.wine, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
                        {initials(d.designer.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: TZ.granite, letterSpacing: 1.2, textTransform: 'uppercase' }}>Your travel designer</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: TZ.coffee, marginTop: 2 }}>{clip(d.designer.name, 32)}</div>
                        <div style={{ fontSize: 16, color: TZ.granite, marginTop: 2 }}>{d.designer.phone} · {d.designer.email}</div>
                    </div>
                    <div data-pdf-link={whatsappLink(waText, d.designer.whatsapp)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: TZ.whatsapp, color: '#fff', borderRadius: 999, padding: '14px 20px', fontSize: 17, fontWeight: 800, flexShrink: 0 }}>
                        <Ico icon={MessageCircle} size={20} color="#ffffff" />
                        Chat now
                    </div>
                </div>
            </div>
        </Page>
    )
}

/* ------------------------------------------------------------------ */
/* Flow blocks                                                         */
/* ------------------------------------------------------------------ */

interface FlowBlock { key: string; node: ReactNode; keepWithNext?: boolean }
interface FlowSection { key: string; eyebrow: string; title: string; icon: LucideIcon; blocks: FlowBlock[]; compact?: boolean }

function SubHeading({ icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 6 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: TZ.roseSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ico icon={icon} size={22} color={TZ.wine} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: TZ.coffee }}>{title}</div>
            {hint && <div style={{ fontSize: 16, color: TZ.granite, fontWeight: 600 }}>· {hint}</div>}
        </div>
    )
}

/* --- Trip at a glance --- */

function GlanceIntro({ d }: { d: ProposalData }) {
    const t = d.trip
    return (
        <div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2, color: TZ.coffee }}>{clip(t.title, 80)}</div>
            {t.route.length > 1 && <RouteLine stops={t.route.slice(0, 7)} />}
            {t.overview && <div style={{ marginTop: 12, fontSize: 19, lineHeight: 1.55, color: '#43383C' }}>{clip(t.overview, 200)}</div>}
        </div>
    )
}

function PriceCard({ d }: { d: ProposalData }) {
    const p = d.price
    const t = d.trip
    const pax = t.adults + t.children
    const items: Array<{ icon: LucideIcon; label: string; on: boolean }> = [
        { icon: BedDouble, label: 'Stay', on: d.included.stay },
        { icon: Utensils, label: 'Meals', on: d.included.meals },
        { icon: Car, label: 'Transfers', on: d.included.transfers },
        { icon: Camera, label: 'Sightseeing', on: d.included.sightseeing },
        { icon: Plane, label: 'Flights', on: d.included.flights },
    ]
    return (
        <div style={{ borderRadius: 30, padding: '28px 30px', color: '#fff', backgroundImage: `linear-gradient(135deg, ${TZ.wineLight} 0%, ${TZ.wine} 45%, ${TZ.mauve} 100%)`, boxShadow: '0 14px 34px rgba(101,25,38,0.28)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.85 }}>Total trip price</div>
                    <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.08, marginTop: 6, letterSpacing: -1 }}>{p.total > 0 ? formatRupees(p.total) : 'On request'}</div>
                    <div style={{ fontSize: 18, marginTop: 6, opacity: 0.92 }}>
                        for {travellersLabel(t.adults, t.children)}
                        {p.perPerson > 0 && pax > 1 && <> · <b>{formatRupees(p.perPerson)}</b> per person{t.children ? ' (avg.)' : ''}</>}
                    </div>
                    {p.note && <div style={{ fontSize: 15, marginTop: 6, opacity: 0.8 }}>{clip(p.note, 90)}</div>}
                </div>
                {p.total > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 22, padding: '16px 20px', minWidth: 210, alignSelf: 'flex-start' }}>
                        {p.advancePaid > 0 ? (
                            <>
                                <div style={{ fontSize: 14, opacity: 0.8, fontWeight: 600 }}>Advance paid</div>
                                <div style={{ fontSize: 24, fontWeight: 800 }}>{formatRupees(p.advancePaid)}</div>
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.22)', margin: '10px 0' }} />
                                <div style={{ fontSize: 14, opacity: 0.8, fontWeight: 600 }}>Balance due</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#FFE3EA' }}>{formatRupees(p.balance)}</div>
                            </>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}>
                                    <Ico icon={Wallet} size={20} color="#ffffff" /> Easy booking
                                </div>
                                <div style={{ fontSize: 15, opacity: 0.88, marginTop: 6, lineHeight: 1.4 }}>Block your dates with a small advance. Pay the rest before you travel.</div>
                            </>
                        )}
                    </div>
                )}
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                {items.map((it) => (
                    <div key={it.label} style={{ flex: 1, borderRadius: 18, padding: '12px 6px', textAlign: 'center', background: it.on ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)', border: it.on ? '1px solid rgba(255,255,255,0.3)' : '1px dashed rgba(255,255,255,0.22)', opacity: it.on ? 1 : 0.55 }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}><Ico icon={it.on ? it.icon : X} size={26} color="#ffffff" /></div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{it.label}</div>
                        <div style={{ fontSize: 12, marginTop: 1, opacity: 0.8 }}>{it.on ? 'Included' : 'Not included'}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function FactsGrid({ d }: { d: ProposalData }) {
    const t = d.trip
    const facts: Array<{ icon: LucideIcon; label: string; value: string }> = [
        { icon: Moon, label: 'Duration', value: t.durationLabel },
        { icon: CalendarDays, label: 'Travel date', value: t.travelDate ? formatLongDate(t.travelDate) : 'Flexible' },
        { icon: Users, label: 'Travellers', value: travellersLabel(t.adults, t.children) },
        { icon: BedDouble, label: 'Hotels', value: t.starCategory || '' },
        { icon: Utensils, label: 'Meal plan', value: t.mealPlan || '' },
        { icon: Sun, label: 'Best time to go', value: t.bestTime || '' },
        { icon: Car, label: 'Transfers', value: t.transferType || '' },
        { icon: Star, label: 'Guest rating', value: t.rating ? `${t.rating} / 5` : '' },
    ].filter((f) => f.value).slice(0, 6)
    if (!facts.length) return null
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {facts.map((f) => (
                <div key={f.label} style={{ width: (CONTENT_W - 24) / 3, boxSizing: 'border-box', background: TZ.mist, border: `1px solid ${TZ.line}`, borderRadius: 22, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Ico icon={f.icon} size={21} color={TZ.wine} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: TZ.granite, fontWeight: 600 }}>{f.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: TZ.coffee, lineHeight: 1.25, marginTop: 2 }}>{clip(f.value, 34)}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function HighlightsBlock({ items }: { items: string[] }) {
    return (
        <div>
            <SubHeading icon={Sparkles} title="Trip highlights" />
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {items.map((h, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: TZ.roseSoft, color: TZ.wine, borderRadius: 999, padding: '10px 16px', fontSize: 17, fontWeight: 700 }}>
                        <Ico icon={Heart} size={16} color={TZ.wine} />
                        {clip(h, 46)}
                    </span>
                ))}
            </div>
        </div>
    )
}

function RouteLine({ stops }: { stops: string[] }) {
    return (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Ico icon={Route} size={20} color={TZ.wine} />
            {stops.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${TZ.line}`, borderRadius: 999, padding: '6px 14px 6px 6px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 999, background: TZ.wine, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                        <span style={{ fontSize: 16.5, fontWeight: 700 }}>{clip(s, 28)}</span>
                    </div>
                    {i < stops.length - 1 && <div style={{ width: 18, borderTop: `2px dashed ${TZ.rose}` }} />}
                </div>
            ))}
        </div>
    )
}

/* --- Day by day --- */

function DayCard({ day, index, date, isLast }: { day: ProposalData['days'][number]; index: number; date?: string; isLast: boolean }) {
    const num = (String(day.day).match(/\d+/) || [String(index + 1)])[0]
    const acts = (day.activities || []).filter(Boolean).slice(0, 6)
    return (
        <div style={{ display: 'flex', gap: 18 }}>
            <div style={{ width: 76, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 76, height: 76, borderRadius: 24, background: index === 0 || isLast ? TZ.wine : TZ.coffee, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, opacity: 0.85 }}>DAY</div>
                    <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{num}</div>
                </div>
                {!isLast && <div style={{ flex: 1, width: 0, borderLeft: `3px dotted ${TZ.rose}`, marginTop: 8, minHeight: 20 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, background: '#fff', border: `1px solid ${TZ.line}`, borderRadius: 26, padding: '20px 24px', boxShadow: '0 2px 10px rgba(15,4,6,0.04)' }}>
                {date && <div style={{ fontSize: 15, fontWeight: 700, color: TZ.wine, letterSpacing: 0.6, textTransform: 'uppercase' }}>{date}</div>}
                <div style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.22, color: TZ.coffee, marginTop: date ? 4 : 0 }}>{clip(day.title, 90) || `Day ${num}`}</div>
                {day.description && day.description.trim() !== day.title.trim() && (
                    <div style={{ fontSize: 18.5, lineHeight: 1.55, color: '#43383C', marginTop: 8 }}>{clip(day.description, 820)}</div>
                )}
                {acts.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {acts.map((a, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TZ.mist, border: `1px solid ${TZ.line}`, borderRadius: 999, padding: '7px 14px', fontSize: 15.5, fontWeight: 600, color: TZ.mauve }}>
                                <Ico icon={Check} size={15} color={TZ.green} stroke={3} />
                                {clip(a, 44)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

/* --- Stays & flights --- */

function HotelCard({ h, nightsFallback }: { h: ProposalHotel; nightsFallback?: number }) {
    const nights = nightsBetween(h.checkIn, h.checkOut) || nightsFallback || 0
    return (
        <div style={{ display: 'flex', alignItems: 'stretch', background: '#fff', border: `1px solid ${TZ.line}`, borderRadius: 26, overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,4,6,0.04)' }}>
            <div style={{ width: 10, background: TZ.wine, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, padding: '20px 22px' }}>
                {h.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 800, color: TZ.wine, letterSpacing: 1, textTransform: 'uppercase' }}>
                        <Ico icon={MapPin} size={16} color={TZ.wine} /> {clip(h.city, 30)}
                    </div>
                )}
                <div style={{ fontSize: 25, fontWeight: 800, color: TZ.coffee, marginTop: 4, lineHeight: 1.2 }}>{clip(h.hotelName, 60) || 'Hotel to be confirmed'}</div>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {h.roomType && <Chip icon={BedDouble}>{clip(h.roomType, 34)}</Chip>}
                    {h.mealPlan && <Chip icon={Utensils}>{clip(h.mealPlan, 34)}</Chip>}
                </div>
            </div>
            <div style={{ width: 170, flexShrink: 0, background: TZ.mist, borderLeft: `2px dashed ${TZ.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 10px', textAlign: 'center' }}>
                {nights > 0 && (
                    <>
                        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: TZ.wine }}>{nights}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TZ.coffee }}>Night{nights === 1 ? '' : 's'}</div>
                    </>
                )}
                {(h.checkIn || h.checkOut) && (
                    <div style={{ fontSize: 14, color: TZ.granite, marginTop: 8, lineHeight: 1.35, fontWeight: 600 }}>
                        {h.checkIn && <div>In: {formatShortDate(h.checkIn)}</div>}
                        {h.checkOut && <div>Out: {formatShortDate(h.checkOut)}</div>}
                    </div>
                )}
                {!nights && !h.checkIn && !h.checkOut && <Ico icon={BedDouble} size={36} color={TZ.wine} />}
            </div>
        </div>
    )
}

const cityCode = (city: string) => {
    const c = String(city || '').trim()
    const paren = c.match(/\(([A-Za-z]{3})\)/)
    if (paren) return paren[1].toUpperCase()
    if (/^[A-Z]{3}$/.test(c)) return c
    return c.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '—'
}

function FlightCard({ f }: { f: ProposalFlight }) {
    return (
        <div style={{ background: '#fff', border: `1px solid ${TZ.line}`, borderRadius: 26, overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,4,6,0.04)' }}>
            <div style={{ background: TZ.coffee, color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 800 }}>
                    <Ico icon={Plane} size={20} color={TZ.rose} />
                    {clip(f.airline, 30) || 'Flight'}
                    {f.flightNumber && <span style={{ fontWeight: 600, opacity: 0.75 }}>· {f.flightNumber.toUpperCase()}</span>}
                </div>
                {f.date && <div style={{ fontSize: 16, fontWeight: 700 }}>{formatShortDate(f.date)}</div>}
            </div>
            <div style={{ padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 190 }}>
                    <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: TZ.coffee }}>{cityCode(f.departureCity)}</div>
                    <div style={{ fontSize: 16, color: TZ.granite, fontWeight: 600, marginTop: 4 }}>{clip(f.departureCity, 24)}</div>
                    {f.departureTime && <div style={{ fontSize: 20, fontWeight: 800, color: TZ.wine, marginTop: 4 }}>{f.departureTime}</div>}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: TZ.rose }} />
                    <div style={{ flex: 1, borderTop: `2px dashed ${TZ.rose}` }} />
                    <div style={{ width: 46, height: 46, borderRadius: 999, background: TZ.roseSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ico icon={Plane} size={22} color={TZ.wine} />
                    </div>
                    <div style={{ flex: 1, borderTop: `2px dashed ${TZ.rose}` }} />
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: TZ.rose }} />
                </div>
                <div style={{ width: 190, textAlign: 'right' }}>
                    <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: TZ.coffee }}>{cityCode(f.arrivalCity)}</div>
                    <div style={{ fontSize: 16, color: TZ.granite, fontWeight: 600, marginTop: 4 }}>{clip(f.arrivalCity, 24)}</div>
                    {f.arrivalTime && <div style={{ fontSize: 20, fontWeight: 800, color: TZ.wine, marginTop: 4 }}>{f.arrivalTime}</div>}
                </div>
            </div>
        </div>
    )
}

/* --- Inclusions / policies / notes --- */

function ListColumn({ title, items, good }: { title: string; items: string[]; good: boolean }) {
    const fg = good ? TZ.green : TZ.red
    const bg = good ? TZ.greenSoft : TZ.redSoft
    return (
        <div style={{ flex: 1, minWidth: 0, background: '#fff', border: `1px solid ${TZ.line}`, borderRadius: 26, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 999, background: fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ico icon={good ? Check : X} size={22} color="#ffffff" stroke={3} />
                </div>
                <div style={{ fontSize: 23, fontWeight: 800 }}>{title}</div>
            </div>
            {items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderTop: i ? `1px solid ${TZ.mist}` : undefined }}>
                    <div style={{ width: 24, height: 24, borderRadius: 999, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <Ico icon={good ? Check : X} size={14} color={fg} stroke={3} />
                    </div>
                    <div style={{ fontSize: 17.5, lineHeight: 1.45, color: '#3B3135' }}>{clip(it, 130)}</div>
                </div>
            ))}
        </div>
    )
}

function IncExcBlock({ inc, exc }: { inc: string[]; exc: string[] }) {
    return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {inc.length > 0 && <ListColumn title="What's included" items={inc} good />}
            {exc.length > 0 && <ListColumn title="Not included" items={exc} good={false} />}
        </div>
    )
}

function PolicyCard({ icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
    return (
        <div style={{ background: TZ.mist, border: `1px solid ${TZ.line}`, borderRadius: 26, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Ico icon={icon} size={24} color={TZ.wine} />
                <div style={{ fontSize: 22, fontWeight: 800 }}>{title}</div>
            </div>
            <div style={{ marginTop: 10 }}>
                {items.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 999, background: TZ.wine, marginTop: 10, flexShrink: 0 }} />
                        <div style={{ fontSize: 17.5, lineHeight: 1.5, color: '#3B3135' }}>{clip(p, 260)}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function NotesCard({ notes }: { notes: string[] }) {
    return (
        <div style={{ background: '#FFF8EC', border: '1px solid #F4DDB0', borderRadius: 26, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Ico icon={Info} size={24} color="#A15C00" />
                <div style={{ fontSize: 22, fontWeight: 800, color: '#5B3600' }}>Important notes</div>
            </div>
            {notes.map((n, i) => (
                <div key={i} style={{ fontSize: 17.5, lineHeight: 1.5, color: '#5B3600', marginTop: 8 }}>{clip(n, 300)}</div>
            ))}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Why Travelzada + closing CTA                                        */
/* ------------------------------------------------------------------ */

const WHY_ICONS: LucideIcon[] = [Headphones, HeartHandshake, BadgeCheck, Sparkles, Gift, ShieldCheck]

function WhyPage({ d, pageNo, total }: { d: ProposalData; pageNo: number; total: number }) {
    const why = d.whyUs.slice(0, 6)
    const reviews = d.reviews.slice(0, 2)
    return (
        <Page pageNo={pageNo} total={total} quoteRef={d.quoteRef} background={TZ.mist}>
            <SectionHeader logo={d.logoUrl} eyebrow="Why Travelzada" title="Why couples choose us" icon={Heart} />
            <div style={{ position: 'absolute', top: HEADER_FIRST, left: PAD_X, right: PAD_X }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    {why.map((w, i) => (
                        <div key={i} style={{ width: (CONTENT_W - 14) / 2, boxSizing: 'border-box', background: '#fff', borderRadius: 26, padding: '18px 20px', display: 'flex', gap: 14, border: `1px solid ${TZ.line}` }}>
                            <div style={{ width: 52, height: 52, borderRadius: 16, background: TZ.wine, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Ico icon={WHY_ICONS[i % WHY_ICONS.length]} size={26} color="#ffffff" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>{clip(w.label, 44)}</div>
                                {w.description && <div style={{ fontSize: 16.5, lineHeight: 1.45, color: TZ.granite, marginTop: 4 }}>{clip(w.description, 72)}</div>}
                            </div>
                        </div>
                    ))}
                </div>

                {reviews.length > 0 ? (
                    <div style={{ marginTop: 24 }}>
                        <SubHeading icon={Star} title="What travellers say" />
                        <div style={{ marginTop: 14, display: 'flex', gap: 14 }}>
                            {reviews.map((r, i) => {
                                const stars = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)))
                                return (
                                    <div key={i} style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 26, padding: '20px 22px', border: `1px solid ${TZ.line}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Ico icon={Quote} size={28} color={TZ.rose} />
                                            <div style={{ display: 'flex', gap: 2 }}>
                                                {Array.from({ length: stars }).map((_, k) => <Star key={k} size={17} color="#E8A317" fill="#E8A317" style={{ display: 'block' }} />)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 17, lineHeight: 1.5, color: '#3B3135', marginTop: 10 }}>{clip(r.content, 120)}</div>
                                        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>{clip(r.name, 30)}{r.date && <span style={{ fontWeight: 500, color: TZ.granite }}> · {clip(r.date, 24)}</span>}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div style={{ marginTop: 30 }}>
                        <SubHeading icon={ClipboardList} title="How booking works" />
                        <HowToBook />
                    </div>
                )}
            </div>
        </Page>
    )
}

function HowToBook({ dark }: { dark?: boolean }) {
    const steps = [
        { icon: MessageCircle, title: 'Say yes on WhatsApp', text: 'Tell us the quote number. Want changes? We will tweak it.' },
        { icon: CreditCard, title: 'Pay a small advance', text: 'Your hotels and dates get blocked right away.' },
        { icon: BadgeCheck, title: 'Get your vouchers', text: 'Confirmed bookings & a day-wise plan before you fly.' },
    ]
    return (
        <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
            {steps.map((s, i) => (
                <div key={i} style={{ flex: 1, minWidth: 0, background: dark ? 'rgba(255,255,255,0.1)' : '#fff', border: dark ? '1px solid rgba(255,255,255,0.18)' : `1px solid ${TZ.line}`, borderRadius: 24, padding: '18px 18px', color: dark ? '#fff' : TZ.coffee }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 999, background: dark ? '#fff' : TZ.wine, color: dark ? TZ.wine : '#fff', fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                        <Ico icon={s.icon} size={22} color={dark ? TZ.rose : TZ.wine} />
                    </div>
                    <div style={{ fontSize: 18.5, fontWeight: 800, marginTop: 10, lineHeight: 1.25 }}>{s.title}</div>
                    <div style={{ fontSize: 15.5, marginTop: 4, lineHeight: 1.45, opacity: dark ? 0.82 : 1, color: dark ? '#fff' : TZ.granite }}>{s.text}</div>
                </div>
            ))}
        </div>
    )
}

function CtaPage({ d, pageNo, total }: { d: ProposalData; pageNo: number; total: number }) {
    const t = d.trip
    const waText = `Hi Travelzada! I'd like to go ahead with "${t.title}" (Quote ${d.quoteRef}). Please share the booking details.`
    const mail = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Booking ${d.quoteRef} — ${t.title}`)}`
    return (
        <Page pageNo={pageNo} total={total} quoteRef={d.quoteRef} background={TZ.wine} dark>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 470, backgroundImage: bgImage(t.heroImage), backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 472, backgroundImage: `linear-gradient(180deg, rgba(15,4,6,0.45) 0%, rgba(101,25,38,0.55) 55%, ${TZ.wine} 100%)` }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 470, bottom: 0, backgroundImage: `linear-gradient(180deg, ${TZ.wine} 0%, ${TZ.mauve} 70%, ${TZ.coffee} 100%)` }} />

            <div style={{ position: 'absolute', top: 36, left: PAD_X }}><LogoPill src={d.logoUrl} /></div>

            <div style={{ position: 'absolute', left: PAD_X, right: PAD_X, top: 222, color: '#fff' }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 80, fontWeight: 700, lineHeight: 0.98, letterSpacing: -1 }}>Ready to say yes?</div>
                <div style={{ fontSize: 21, lineHeight: 1.5, marginTop: 16, opacity: 0.92, maxWidth: 620 }}>
                    Your {t.destination || 'dream'} escape is one message away. Reply on WhatsApp and we&apos;ll lock in your dates and hotels.
                </div>

                <div style={{ marginTop: 30, display: 'flex', gap: 12 }}>
                    <div data-pdf-link={whatsappLink(waText, d.designer.whatsapp)} style={{ flex: 1.4, height: 80, borderRadius: 999, background: TZ.whatsapp, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 24, fontWeight: 800, boxShadow: '0 12px 28px rgba(0,0,0,0.28)' }}>
                        <Ico icon={MessageCircle} size={28} color="#ffffff" /> Book on WhatsApp
                    </div>
                    <div data-pdf-link={CONTACT.phoneHref} style={{ flex: 1, height: 80, borderRadius: 999, background: '#fff', color: TZ.wine, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
                        <Ico icon={Phone} size={24} color={TZ.wine} /> Call us
                    </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                    <div data-pdf-link={mail} style={{ flex: 1, height: 58, borderRadius: 999, border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 18, fontWeight: 700 }}>
                        <Ico icon={Mail} size={20} color="#ffffff" /> {CONTACT.email}
                    </div>
                    {t.packageUrl && (
                        <div data-pdf-link={t.packageUrl} style={{ flex: 1, height: 58, borderRadius: 999, border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 18, fontWeight: 700 }}>
                            <Ico icon={Globe} size={20} color="#ffffff" /> View trip online
                        </div>
                    )}
                </div>

                {/* Quote summary */}
                <div style={{ marginTop: 26, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 26, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    {[
                        { label: 'Quote number', value: d.quoteRef, icon: ClipboardList },
                        { label: 'Valid until', value: formatLongDate(d.validUntil), icon: Clock },
                        { label: 'Total price', value: d.price.total > 0 ? formatRupees(d.price.total) : 'On request', icon: Wallet },
                    ].map((q) => (
                        <div key={q.label} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <Ico icon={q.icon} size={24} color={TZ.rose} />
                            <div>
                                <div style={{ fontSize: 14, opacity: 0.78, fontWeight: 600 }}>{q.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 800 }}>{q.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <HowToBook dark />

                <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, opacity: 0.85 }}>
                    <Ico icon={MapPin} size={18} color={TZ.rose} />
                    Travelzada · {CONTACT.address}
                </div>
            </div>
        </Page>
    )
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

function buildFlowSections(d: ProposalData): FlowSection[] {
    const sections: FlowSection[] = []

    // Trip at a glance
    const glance: FlowBlock[] = [
        { key: 'intro', node: <GlanceIntro d={d} /> },
        { key: 'price', node: <PriceCard d={d} /> },
        { key: 'facts', node: <FactsGrid d={d} /> },
    ]
    if (d.highlights.length) glance.push({ key: 'hl', node: <HighlightsBlock items={d.highlights.slice(0, 8)} /> })
    sections.push({ key: 'glance', eyebrow: 'Trip at a glance', title: 'Your trip at a glance', icon: Sparkles, blocks: glance, compact: true })

    // Day by day
    if (d.days.length) {
        const start = d.trip.travelDate ? new Date(d.trip.travelDate + 'T00:00:00') : null
        sections.push({
            key: 'days', eyebrow: `${d.days.length}-day plan`, title: 'Day-by-day itinerary', icon: CalendarDays,
            blocks: d.days.map((day, i) => {
                let date: string | undefined
                if (start && !Number.isNaN(start.getTime())) {
                    const dt = new Date(start); dt.setDate(dt.getDate() + i)
                    date = dt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
                }
                return { key: `day${i}`, node: <DayCard day={day} index={i} date={date} isLast={i === d.days.length - 1} /> }
            }),
        })
    }

    // Stays & flights
    const stays: FlowBlock[] = []
    const hotels = d.hotels.filter((h) => h.hotelName || h.city)
    const flights = d.flights.filter((f) => f.airline || f.departureCity || f.arrivalCity)
    if (hotels.length) {
        const totalNights = hotels.reduce((s, h) => s + nightsBetween(h.checkIn, h.checkOut), 0)
        stays.push({ key: 'hh', keepWithNext: true, node: <SubHeading icon={BedDouble} title="Where you'll stay" hint={totalNights ? `${totalNights} nights` : `${hotels.length} hotel${hotels.length > 1 ? 's' : ''}`} /> })
        hotels.forEach((h, i) => stays.push({ key: `h${i}`, node: <HotelCard h={h} /> }))
    }
    if (flights.length) {
        stays.push({ key: 'fh', keepWithNext: true, node: <SubHeading icon={Plane} title="Your flights" hint={`${flights.length} sector${flights.length > 1 ? 's' : ''}`} /> })
        flights.forEach((f, i) => stays.push({ key: `f${i}`, node: <FlightCard f={f} /> }))
    }
    if (stays.length) {
        const title = hotels.length && flights.length ? 'Stays & flights' : hotels.length ? 'Your stays' : 'Your flights'
        sections.push({ key: 'stays', eyebrow: hotels.length ? 'Hand-picked stays' : 'Flights', title, icon: hotels.length ? BedDouble : Plane, blocks: stays })
    }

    // Inclusions, policies, notes
    const terms: FlowBlock[] = []
    const inc = d.inclusions.slice(0, 14)
    const exc = d.exclusions.slice(0, 14)
    if (inc.length || exc.length) terms.push({ key: 'ie', node: <IncExcBlock inc={inc} exc={exc} /> })
    const pol = d.policies
    if (pol.payment.length) terms.push({ key: 'pp', node: <PolicyCard icon={CreditCard} title="Payment policy" items={pol.payment.slice(0, 6)} /> })
    if (pol.cancellation.length) terms.push({ key: 'pc', node: <PolicyCard icon={ShieldCheck} title="Cancellation policy" items={pol.cancellation.slice(0, 6)} /> })
    if (pol.booking.length) terms.push({ key: 'pb', node: <PolicyCard icon={ClipboardList} title="Booking terms" items={pol.booking.slice(0, 6)} /> })
    const notes = d.notes.split('\n').map((s) => s.trim()).filter(Boolean)
    if (notes.length) terms.push({ key: 'notes', node: <NotesCard notes={notes.slice(0, 10)} /> })
    if (terms.length) sections.push({ key: 'terms', eyebrow: 'The fine print', title: "What's included & policies", icon: ShieldCheck, blocks: terms })

    return sections
}

/** A run of blocks from one section placed on a page; `inline` = the section starts mid-page with its own title */
interface Seg { section: number; indices: number[]; inline: boolean }
interface FlowPageLayout { head: number; cont: boolean; segs: Seg[] }

/**
 * Lays every flow section out across pages in one pass. A section starts on the previous page when its title
 * and first block(s) still fit there (no half-empty pages); otherwise it starts a fresh page with the big header.
 */
function layoutSections(sections: FlowSection[], heights: number[][]): FlowPageLayout[] {
    const pages: FlowPageLayout[] = []
    let page: FlowPageLayout | null = null
    let used = 0
    let avail = 0
    const headerH = (s: FlowSection, cont: boolean) => (cont || s.compact ? HEADER_CONT : HEADER_FIRST)
    const newPage = (k: number, cont: boolean) => {
        page = { head: k, cont, segs: [{ section: k, indices: [], inline: false }] }
        pages.push(page)
        used = 0
        avail = PAGE_H - FOOTER_H - headerH(sections[k], cont) - SAFETY
    }
    sections.forEach((sec, k) => {
        const h = heights[k] || []
        const need = (i: number) => (sec.blocks[i]?.keepWithNext && i + 1 < h.length ? h[i] + BLOCK_GAP + h[i + 1] : h[i] || 0)
        const inlineCost = BLOCK_GAP * 2 + INLINE_TITLE_H + BLOCK_GAP
        if (page && k > 0 && !sec.compact && used + inlineCost + need(0) <= avail) {
            ;(page as FlowPageLayout).segs.push({ section: k, indices: [], inline: true })
            used += inlineCost
        } else {
            newPage(k, false)
        }
        h.forEach((bh, i) => {
            const p = page as FlowPageLayout
            const seg = p.segs[p.segs.length - 1]
            const gap = seg.indices.length ? BLOCK_GAP : 0
            if (seg.indices.length && used + gap + need(i) > avail) newPage(k, true)
            const cur = (page as FlowPageLayout).segs[(page as FlowPageLayout).segs.length - 1]
            used += (cur.indices.length ? BLOCK_GAP : 0) + bh
            cur.indices.push(i)
        })
    })
    return pages
}

function InlineSectionTitle({ section }: { section: FlowSection }) {
    return (
        <div style={{ height: INLINE_TITLE_H, display: 'flex', alignItems: 'flex-end', gap: 14, borderTop: `1px dashed ${TZ.line}`, paddingBottom: 4, boxSizing: 'border-box' }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 700, lineHeight: 1.05, color: TZ.coffee }}>{section.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: TZ.roseSoft, color: TZ.wine, borderRadius: 999, padding: '5px 12px', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <Ico icon={section.icon} size={14} color={TZ.wine} />
                {section.eyebrow}
            </div>
        </div>
    )
}

function FlowPage({ d, sections, layout, pageNo, total }: { d: ProposalData; sections: FlowSection[]; layout: FlowPageLayout; pageNo: number; total: number }) {
    const head = sections[layout.head]
    return (
        <Page pageNo={pageNo} total={total} quoteRef={d.quoteRef}>
            <SectionHeader logo={d.logoUrl} eyebrow={head.eyebrow} title={head.title} cont={layout.cont} compact={head.compact} icon={head.icon} />
            <div style={{ position: 'absolute', top: layout.cont || head.compact ? HEADER_CONT : HEADER_FIRST, left: PAD_X, width: CONTENT_W }}>
                {layout.segs.map((seg) => {
                    const sec = sections[seg.section]
                    return (
                        <div key={sec.key + seg.indices[0]}>
                            {seg.inline && <div style={{ marginTop: BLOCK_GAP * 2, marginBottom: BLOCK_GAP }}><InlineSectionTitle section={sec} /></div>}
                            {seg.indices.map((idx, n) => (
                                <div key={sec.blocks[idx].key} style={{ marginTop: n ? BLOCK_GAP : 0 }}>{sec.blocks[idx].node}</div>
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
    const sections = useMemo(() => buildFlowSections(data), [data])
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

    const pages: Array<{ key: string; render: (no: number, total: number) => ReactNode }> = []
    if (layout) {
        pages.push({ key: 'cover', render: (no, total) => <CoverPage d={data} pageNo={no} total={total} /> })
        layout.forEach((pl, pi) => {
            pages.push({ key: `flow-${pi}`, render: (no, total) => <FlowPage d={data} sections={sections} layout={pl} pageNo={no} total={total} /> })
        })
        pages.push({ key: 'why', render: (no, total) => <WhyPage d={data} pageNo={no} total={total} /> })
        pages.push({ key: 'cta', render: (no, total) => <CtaPage d={data} pageNo={no} total={total} /> })
    }
    const total = pages.length

    useEffect(() => {
        if (layout && onReady) onReady(total)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout, total])

    return (
        <div style={{ position: 'relative', ...containerStyle }}>
            {/* Hidden measuring layer: every flow block at its final width */}
            <div ref={measureRef} aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none', fontFamily: SANS, color: TZ.coffee }}>
                {sections.map((s) => s.blocks.map((b, i) => (
                    <div key={`${s.key}-${b.key}`} data-m={`${s.key}-${i}`} style={{ width: CONTENT_W }}>{b.node}</div>
                )))}
            </div>
            {pages.map((p, i) => (
                <div key={p.key}>
                    {pageWrapper ? pageWrapper(p.render(i + 1, total), i, total) : p.render(i + 1, total)}
                </div>
            ))}
        </div>
    )
}
