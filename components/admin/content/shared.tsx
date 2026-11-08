'use client'

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, Star, X, AlertCircle } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { cx, toMillis } from '@/components/admin/ui'
import type { BlogPost, BlogSection } from './types'

/* ───────────────────────── helpers ───────────────────────── */

/** Clean URL slug: "Bali & Ubud: 5 Days!" → "bali-ubud-5-days" */
export function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Exactly the fallback the public blog route uses when a post has no `slug` field. Keep in sync with app/blog. */
export function legacyTitleSlug(title: string): string {
  return String(title || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/** Category segment of the public URL, same formula as app/blog/page.tsx#getBlogUrl */
export function categorySegment(category?: string): string {
  return category ? category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'general'
}

export function blogPath(post: Pick<BlogPost, 'category' | 'slug' | 'title'>): string {
  return `/blog/${categorySegment(post.category)}/${post.slug || legacyTitleSlug(post.title)}`
}

export const SITE_URL = 'https://www.travelzada.com'

/** Plain text of every block, used for the `content` fallback field and read-time */
export function blocksToText(blocks: BlogSection[]): string {
  const out: string[] = []
  for (const b of blocks) {
    const t = (b.text || b.content || '').trim()
    switch (b.type) {
      case 'heading': if (t) out.push(`## ${t}`); break
      case 'subheading': if (t) out.push(`### ${t}`); break
      case 'intro': case 'paragraph': case 'cta': if (t) out.push(t); break
      case 'quote': if (t) out.push(`"${t}"${b.author ? ` — ${b.author}` : ''}`); break
      case 'list': (b.items || []).filter(Boolean).forEach((i) => out.push(`- ${i}`)); break
      case 'faq':
        (b.faqs || []).forEach((f) => { if (f.question) out.push(`### ${f.question}`); if (f.answer) out.push(f.answer) })
        if (b.question) out.push(`### ${b.question}`)
        if (b.answer) out.push(b.answer)
        break
      default: break
    }
  }
  return out.join('\n\n')
}

/** Turns a legacy plain-text body (## / ### / - markers) into blocks */
export function textToBlocks(text: string): BlogSection[] {
  const blocks: BlogSection[] = []
  let list: string[] | null = null
  const flushList = () => { if (list?.length) blocks.push({ type: 'list', items: list }); list = null }
  String(text || '').replace(/<[^>]+>/g, '\n').split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
    if (/^[-*]\s+/.test(line)) { (list ||= []).push(line.replace(/^[-*]\s+/, '')); return }
    flushList()
    if (line.startsWith('### ')) blocks.push({ type: 'subheading', text: line.slice(4) })
    else if (line.startsWith('## ')) blocks.push({ type: 'heading', text: line.slice(3) })
    else blocks.push({ type: blocks.length === 0 ? 'intro' : 'paragraph', text: line })
  })
  flushList()
  return blocks
}

export function wordCount(s: string): number {
  return (String(s || '').replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length
}

export function readTimeFor(text: string): string {
  return `${Math.max(1, Math.round(wordCount(text) / 200))} min read`
}

/** Display date string stored in `date` (the public site prints it as-is and parses it for schema.org) */
export function displayDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Returns yyyy-mm-dd if the stored `date` string has a real year and parses; otherwise '' */
export function dateToInput(value?: string): string {
  if (!value || !/\d{4}/.test(value)) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function inputToDisplayDate(v: string): string {
  const [y, m, d] = v.split('-').map(Number)
  return displayDate(new Date(y, (m || 1) - 1, d || 1))
}

/** Drops undefined values (Firestore rejects them) */
export function clean<T extends Record<string, any>>(obj: T): T {
  const out: any = {}
  Object.keys(obj).forEach((k) => { if (obj[k] !== undefined) out[k] = obj[k] })
  return out
}

/* ───────────────────────── small UI pieces ───────────────────────── */

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx('flex items-start justify-between gap-3', disabled ? 'opacity-50' : 'cursor-pointer')}>
      {(label || hint) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-gray-800">{label}</span>}
          {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors', checked ? 'bg-bordeaux-600' : 'bg-gray-300')}
      >
        <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </label>
  )
}

export function Collapsible({ title, hint, children, defaultOpen = false, className }: { title: ReactNode; hint?: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cx('rounded-xl border border-gray-200 bg-white', className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900">{title}</span>
          {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
        </span>
        <ChevronDown className={cx('w-4 h-4 text-gray-500 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">{children}</div>}
    </div>
  )
}

/** Type and press Enter / comma to add a chip */
export function ChipInput({ value, onChange, placeholder = 'Type and press Enter' }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  const add = (raw: string) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    parts.forEach((p) => { if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p) })
    onChange(next)
    setDraft('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-bordeaux-200 focus-within:border-bordeaux-400">
      {value.map((chip) => (
        <span key={chip} className="inline-flex items-center gap-1 rounded-full bg-bordeaux-50 text-bordeaux-700 px-2 py-0.5 text-xs font-medium">
          {chip}
          <button type="button" onClick={() => onChange(value.filter((c) => c !== chip))} className="hover:text-bordeaux-900" aria-label={`Remove ${chip}`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(draft) }
          else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? '' : placeholder}
        className="flex-1 min-w-[8rem] border-0 bg-transparent px-1 py-0.5 text-sm focus:outline-none"
      />
    </div>
  )
}

export function Stars({ value, onChange, size = 'sm' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-7 h-7' : 'w-4 h-4'
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star className={cx(cls, n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-0.5 hover:scale-110 transition-transform">{icon}</button>
        ) : <span key={n}>{icon}</span>
      })}
    </div>
  )
}

export function Avatar({ src, name, size = 40 }: { src?: string; name?: string; size?: number }) {
  const initials = String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name || ''} style={{ width: size, height: size }} className="rounded-full object-cover bg-gray-100 shrink-0" />
  ) : (
    <div style={{ width: size, height: size }} className="rounded-full bg-bordeaux-100 text-bordeaux-700 font-semibold flex items-center justify-center shrink-0 text-sm">{initials}</div>
  )
}

/** Small transient message in the corner: const { flash, Flash } = useFlash() */
export function useFlash() {
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setMsg({ text, tone })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), tone === 'error' ? 6000 : 2500)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const Flash = () =>
    msg ? (
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[70] flex justify-center sm:justify-end pointer-events-none">
        <div className={cx('pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg', msg.tone === 'ok' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white')}>
          {msg.tone === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      </div>
    ) : null
  return { flash, Flash }
}

/**
 * Read a whole collection newest-first. Sorted on the client (not with orderBy) so documents that are
 * missing the date field still show up.
 */
export async function fetchNewestFirst<T>(name: string, field: string): Promise<Array<T & { id: string }>> {
  const snap = await getDocs(collection(db, name))
  const rows = snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))
  return rows.sort((a: any, b: any) => toMillis(b[field]) - toMillis(a[field]))
}
