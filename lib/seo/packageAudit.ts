/**
 * SEO / GEO health check for one package page (pure; safe on client and server).
 *
 * `auditPackage(pkg, allPackages)` scores a package 0–100 and lists what to fix. Rules mirror what the public
 * page renders (app/destinations/[slug]/[packageId]): title/description meta, Overview, Highlights, day plan,
 * FAQ (also used for FAQ schema), alt text, gallery — plus duplicate-content similarity vs every other package.
 *
 * For a whole list use `auditCatalog(packages)` — it builds the shingle sets once (≈86² comparisons is instant).
 */
import { DUPLICATE_AT, SIMILAR_AT, jaccard, packageText, shingles, type SimilarityHit } from './similarity'

export type SeoSeverity = 'high' | 'medium' | 'low'
export type SeoGrade = 'good' | 'fix' | 'poor'

export interface SeoIssue {
  id: string
  severity: SeoSeverity
  message: string
}

export interface PackageAudit {
  score: number
  grade: SeoGrade
  issues: SeoIssue[]
  /** Most similar other packages, highest first (top 3) */
  similarity: SimilarityHit[]
}

type Pkg = Record<string, any> & { id?: string }

const PENALTY: Record<SeoSeverity, number> = { high: 18, medium: 9, low: 3 }

/** Issue ids that mean "this page competes with another page" (used for the Duplicates filter) */
export const DUPLICATE_ISSUES = ['duplicate-content', 'similar-content', 'seo-title-duplicate', 'seo-description-duplicate', 'faq-duplicated', 'days-duplicated']

const words = (s: unknown) => String(s || '').trim().split(/\s+/).filter(Boolean).length
const norm = (s: unknown) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function nightsOf(p: Pkg): number {
  return num(p.Duration_Nights) || num(String(p.Duration || '').match(/(\d+)\s*N/i)?.[1]) || Math.max(num(p.Duration_Days) - 1, 0)
}

/** Structured days (falls back to the old "Day 1: … | Day 2: …" text). */
export function daysOf(p: Pkg): Array<{ day: number; title: string; description: string; activities: string[] }> {
  const details = Array.isArray(p.Day_Wise_Itinerary_Details) ? p.Day_Wise_Itinerary_Details : []
  if (details.length) {
    return details.map((d: any, i: number) => ({
      day: num(d?.day) || i + 1,
      title: String(d?.title ?? d?.Title ?? d?.Day_Title ?? ''),
      description: String(d?.description ?? d?.Description ?? ''),
      activities: Array.isArray(d?.activities) ? d.activities.map(String) : [],
    }))
  }
  return String(p.Day_Wise_Itinerary || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item, i) => {
      const m = item.match(/Day\s*\d+\s*[:\-–]\s*(.+)/i)
      return { day: i + 1, title: (m ? m[1] : item).trim(), description: '', activities: [] }
    })
}

/** Words a page title should contain to be about this destination: the destination + the places stayed in. */
export function placeWords(p: Pkg): string[] {
  const out = new Set<string>()
  const code = String(p.Destination_ID || '').split('_')[0].toUpperCase()
  const byCode: Record<string, string> = { BAL: 'bali', KER: 'kerala', GOA: 'goa', KASH: 'kashmir', RAJ: 'rajasthan', THAI: 'thailand', VIET: 'vietnam', DUBAI: 'dubai', MAL: 'maldives', EUR: 'europe', LAD: 'ladakh', AND: 'andaman', BAKU: 'baku', SING: 'singapore' }
  if (byCode[code]) out.add(byCode[code])
  const name = String(p.Destination_Name || '')
  // Capitalised words of the package name that look like places (skip generic marketing words)
  const generic = /^(the|a|an|and|in|with|of|for|to|tour|trip|package|packages|holiday|honeymoon|escape|getaway|romance|romantic|special|luxury|premium|grand|royal|elite|imperial|majestic|regal|eternal|serene|blissful|perfect|platinum|signature|intimate|couple|couples|journey|retreat|experience|anniversary|adventure|full|on|ride|temple|family|group|nights?|days?|\d+n|\d+d)$/i
  name.split(/[\s,–—&+\-|/()]+/).forEach((w) => {
    if (w.length > 2 && /^[A-Z]/.test(w) && !generic.test(w)) out.add(w.toLowerCase())
  })
  String(p.Location_Breakup || '')
    .split(/[,+/|]/)
    .map((s) => s.replace(/\d+\s*N\b/gi, '').trim())
    .filter((s) => s && s.length > 2)
    .forEach((s) => out.add(s.toLowerCase()))
  return Array.from(out)
}

interface Prepared {
  pkg: Pkg
  shingles: Set<string>
  title: string
  desc: string
  faqKeys: string[]
  dayKeys: string[]
}

function prepare(p: Pkg): Prepared {
  return {
    pkg: p,
    shingles: shingles(packageText(p)),
    title: norm(p.SEO_Title),
    desc: norm(p.SEO_Description),
    faqKeys: (Array.isArray(p.FAQ_Items) ? p.FAQ_Items : []).map((f: any) => norm(f?.answer)).filter((s: string) => s.length > 30),
    dayKeys: daysOf(p).map((d) => norm(d.description)).filter((s) => s.length > 40),
  }
}

function auditPrepared(me: Prepared, others: Prepared[]): PackageAudit {
  const p = me.pkg
  const issues: SeoIssue[] = []
  const add = (id: string, severity: SeoSeverity, message: string) => issues.push({ id, severity, message })
  const nights = nightsOf(p)

  // --- Duplicate content (biggest reason pages are left out of Google's index)
  const similarity = others
    .map((o) => ({ id: String(o.pkg.id || ''), name: String(o.pkg.Destination_Name || ''), score: jaccard(me.shingles, o.shingles) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  const top = similarity[0]
  if (top && top.score >= DUPLICATE_AT) add('duplicate-content', 'high', `Duplicate content: ${Math.round(top.score * 100)}% the same wording as “${top.name}”. Google will likely index only one of them.`)
  else if (top && top.score >= SIMILAR_AT) add('similar-content', 'medium', `Too similar (${Math.round(top.score * 100)}%) to “${top.name}”. Rewrite so each page has its own angle.`)

  // --- Overview
  const ow = words(p.Overview)
  if (!ow) add('overview-missing', 'high', 'No overview text.')
  else if (ow < 60) add('overview-thin', 'high', `Overview is very thin (${ow} words). Aim for 180–260 words.`)
  else if (ow < 120) add('overview-thin', 'medium', `Overview is short (${ow} words). Aim for 180–260 words.`)

  // --- SEO title
  const title = String(p.SEO_Title || '').trim()
  if (!title) add('seo-title-missing', 'high', 'No SEO title — the page falls back to the package name.')
  else {
    const len = title.length
    if (len < 40 || len > 70) add('seo-title-length', 'medium', `SEO title is ${len} characters (aim for 50–60).`)
    else if (len < 50 || len > 60) add('seo-title-length', 'low', `SEO title is ${len} characters (aim for 50–60).`)
    const t = title.toLowerCase()
    const places = placeWords(p)
    if (places.length && !places.some((w) => t.includes(w))) add('seo-title-destination', 'medium', 'SEO title does not name the destination.')
    const hasNights = nights ? new RegExp(`\\b${nights}\\s*(n\\b|nights?)|\\b${nights + 1}\\s*(d\\b|days?)`, 'i').test(title) : false
    const theme = /honeymoon|anniversary|family|couple|romantic|adventure|luxury|backwater|beach|wildlife|temple|island|trek|culture/i.test(title)
    if (!hasNights && !theme) add('seo-title-angle', 'low', 'SEO title has neither the duration (e.g. “4N/5D”) nor a theme (honeymoon, family…).')
    if (others.some((o) => o.title && o.title === me.title)) add('seo-title-duplicate', 'high', 'Same SEO title as another package.')
  }

  // --- Meta description
  const desc = String(p.SEO_Description || '').trim()
  if (!desc) add('seo-description-missing', 'high', 'No SEO description.')
  else {
    const len = desc.length
    if (len < 110 || len > 175) add('seo-description-length', 'medium', `SEO description is ${len} characters (aim for 140–160).`)
    else if (len < 140 || len > 160) add('seo-description-length', 'low', `SEO description is ${len} characters (aim for 140–160).`)
    if (others.some((o) => o.desc && o.desc === me.desc)) add('seo-description-duplicate', 'high', 'Same SEO description as another package.')
  }

  // --- Keywords
  const kw = String(p.SEO_Keywords || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!kw.length) add('keywords-missing', 'low', 'No SEO keywords.')
  else if (kw.length < 3) add('keywords-few', 'low', `Only ${kw.length} SEO keyword${kw.length === 1 ? '' : 's'}.`)

  // --- Highlights
  const hl = Array.isArray(p.Highlights) ? p.Highlights.filter((h: unknown) => String(h || '').trim()) : []
  if (!hl.length) add('highlights-missing', 'medium', 'No highlights — the page shows generic placeholders.')
  else if (hl.length < 4) add('highlights-few', 'low', `Only ${hl.length} highlights (aim for 5–8).`)

  // --- Day plan
  const days = daysOf(p)
  const described = days.filter((d) => d.description.trim().length > 20)
  if (!days.length) add('days-missing', 'high', 'No day-wise itinerary.')
  else if (!described.length) add('days-no-details', 'medium', 'Day-wise plan has titles only — no descriptions (page shows generic filler text).')
  else if (described.length < days.length) add('days-partial', 'low', `${days.length - described.length} of ${days.length} days have no description.`)
  if (days.length && nights && days.length !== nights + 1) add('days-count', 'low', `Itinerary has ${days.length} days but the package is ${nights}N/${nights + 1}D.`)
  const dayInternal = new Set<string>()
  const repeatedWithin = me.dayKeys.some((k) => (dayInternal.has(k) ? true : (dayInternal.add(k), false)))
  const sharedDays = me.dayKeys.filter((k) => others.some((o) => o.dayKeys.includes(k))).length
  if (sharedDays || repeatedWithin) add('days-duplicated', 'medium', sharedDays ? `${sharedDays} day description${sharedDays === 1 ? ' is' : 's are'} copied word-for-word from another package.` : 'Some days repeat the same description.')

  // --- FAQ (also feeds FAQ schema)
  const faqs = Array.isArray(p.FAQ_Items) ? p.FAQ_Items.filter((f: any) => String(f?.question || '').trim() && String(f?.answer || '').trim()) : []
  if (!faqs.length) add('faq-missing', 'high', 'No FAQs — the page shows generic default FAQs (shared with other pages).')
  else if (faqs.length < 5) add('faq-few', 'medium', `Only ${faqs.length} FAQs (aim for 6 specific to this package).`)
  const sharedFaqs = me.faqKeys.filter((k) => others.some((o) => o.faqKeys.includes(k))).length
  if (sharedFaqs >= 2) add('faq-duplicated', 'medium', `${sharedFaqs} FAQ answers are identical to another package's.`)
  else if (sharedFaqs === 1) add('faq-duplicated', 'low', '1 FAQ answer is identical to another package’s.')

  // --- Why book, images
  const why = Array.isArray(p.Why_Book_With_Us) ? p.Why_Book_With_Us.filter((w: any) => String(w?.label || '').trim()) : []
  if (!why.length) add('why-missing', 'low', 'No “Why book with us” points.')
  if (!String(p.Image_Alt_Text || '').trim()) add('alt-missing', 'low', 'Main image has no alt text.')
  const gallery = Array.isArray(p.Gallery_Images) ? p.Gallery_Images.filter((u: unknown) => String(u || '').trim()) : []
  if (!gallery.length) add('gallery-missing', 'low', 'No gallery images of its own (page reuses stock photos).')

  const order: Record<SeoSeverity, number> = { high: 0, medium: 1, low: 2 }
  issues.sort((a, b) => order[a.severity] - order[b.severity])
  const score = Math.max(0, Math.min(100, 100 - issues.reduce((s, i) => s + PENALTY[i.severity], 0)))
  const highs = issues.filter((i) => i.severity === 'high').length
  const grade: SeoGrade =
    (top && top.score >= DUPLICATE_AT) || score < 50 ? 'poor' : score >= 80 && highs === 0 && !(top && top.score >= SIMILAR_AT) ? 'good' : 'fix'
  return { score, grade, issues, similarity }
}

/** Audit one package against the rest of the catalog (`allPackages` may include `pkg` itself; it is skipped by id). */
export function auditPackage(pkg: Pkg, allPackages: Pkg[]): PackageAudit {
  const others = allPackages.filter((o) => !(pkg.id && o.id === pkg.id) && o !== pkg).map(prepare)
  return auditPrepared(prepare(pkg), others)
}

/** Audit every package (shared work done once). Keyed by package id. */
export function auditCatalog(packages: Pkg[]): Map<string, PackageAudit> {
  const prepared = packages.map(prepare)
  const out = new Map<string, PackageAudit>()
  prepared.forEach((me, i) => {
    out.set(String(me.pkg.id || i), auditPrepared(me, prepared.filter((_, j) => j !== i)))
  })
  return out
}

export const isDuplicateAudit = (a?: PackageAudit) => !!a?.issues.some((i) => DUPLICATE_ISSUES.includes(i.id) && i.severity !== 'low')
export const gradeTone = (g: SeoGrade) => (g === 'good' ? 'green' : g === 'fix' ? 'amber' : 'red') as 'green' | 'amber' | 'red'
export const gradeLabel = (g: SeoGrade) => (g === 'good' ? 'Good' : g === 'fix' ? 'Needs fixing' : 'Poor')
