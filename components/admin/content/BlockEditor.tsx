'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlignLeft, ArrowDown, ArrowUp, Heading1, Heading2, HelpCircle, Image as ImageIcon, Link2, List, ListTree,
  Megaphone, Minus, Plus, Quote, Sparkles, Trash2, X,
} from 'lucide-react'
import ImageUploader from '@/components/admin/ImageUploader'
import { cx, inputClass } from '@/components/admin/ui'
import type { BlockType, BlogSection } from './types'

export type EditorBlock = BlogSection & { _k: string }

let seq = 0
const key = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`

export const BLOCK_META: Record<BlockType, { label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = {
  intro: { label: 'Intro', hint: 'Opening paragraph, shown larger', icon: Sparkles },
  paragraph: { label: 'Paragraph', hint: 'Regular text', icon: AlignLeft },
  heading: { label: 'Heading', hint: 'Section title (H2)', icon: Heading1 },
  subheading: { label: 'Sub-heading', hint: 'Smaller title (H3)', icon: Heading2 },
  image: { label: 'Image', hint: 'Photo with caption', icon: ImageIcon },
  list: { label: 'Bullet list', hint: 'One point per line', icon: List },
  quote: { label: 'Quote', hint: 'Highlighted quote', icon: Quote },
  cta: { label: 'Call to action', hint: 'Banner with a button', icon: Megaphone },
  faq: { label: 'FAQ', hint: 'Questions & answers (helps Google)', icon: HelpCircle },
  related: { label: 'Related links', hint: 'Links to other pages', icon: Link2 },
  toc: { label: 'Table of contents', hint: 'Auto-built from headings', icon: ListTree },
  divider: { label: 'Divider', hint: 'Horizontal line', icon: Minus },
}
const ORDER: BlockType[] = ['paragraph', 'heading', 'subheading', 'image', 'list', 'quote', 'intro', 'cta', 'faq', 'related', 'toc', 'divider']

/** Firestore sections → editor blocks (normalises legacy `content` → `text`, single question → faqs) */
export function toEditorBlocks(sections?: BlogSection[]): EditorBlock[] {
  return (Array.isArray(sections) ? sections : []).map((s) => {
    const b: EditorBlock = { ...s, _k: key() }
    if (!b.text && b.content) b.text = b.content
    if (b.type === 'faq' && !(b.faqs && b.faqs.length) && (b.question || b.answer)) {
      b.faqs = [{ question: b.question || '', answer: b.answer || '' }]
    }
    return b
  })
}

/** Editor blocks → clean Firestore sections (drops empty items, editor keys, unused fields) */
export function fromEditorBlocks(blocks: EditorBlock[]): BlogSection[] {
  const out: BlogSection[] = []
  for (const { _k, ...b } of blocks) {
    const s: any = { type: b.type }
    const text = (b.text || '').trim()
    switch (b.type) {
      case 'intro': case 'paragraph': case 'heading': case 'subheading':
        if (!text) continue
        s.text = text
        break
      case 'image':
        if (!b.imageUrl) continue
        s.imageUrl = b.imageUrl
        if (b.imageAlt?.trim()) s.imageAlt = b.imageAlt.trim()
        break
      case 'quote':
        if (!text) continue
        s.text = text
        if (b.author?.trim()) s.author = b.author.trim()
        break
      case 'list': {
        const items = (b.items || []).map((i) => i.trim()).filter(Boolean)
        if (!items.length) continue
        s.items = items
        break
      }
      case 'cta':
        if (!text && !b.link) continue
        s.text = text
        if (b.link?.trim()) s.link = b.link.trim()
        if (b.linkText?.trim()) s.linkText = b.linkText.trim()
        break
      case 'faq': {
        const faqs = (b.faqs || []).map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })).filter((f) => f.question && f.answer)
        if (!faqs.length) continue
        s.faqs = faqs
        break
      }
      case 'related': {
        const links = (b.relatedLinks || [])
          .map((l) => ({ title: l.title.trim(), url: l.url.trim(), ...(l.description?.trim() ? { description: l.description.trim() } : {}) }))
          .filter((l) => l.title && l.url)
        if (!links.length) continue
        s.relatedLinks = links
        break
      }
      case 'toc': case 'divider':
        break
      default:
        // Unknown/legacy block type — keep it exactly as it was
        out.push(b as BlogSection)
        continue
    }
    out.push(s)
  }
  return out
}

function newBlock(type: BlockType): EditorBlock {
  const b: EditorBlock = { type, _k: key() }
  if (type === 'list') b.items = ['']
  if (type === 'faq') b.faqs = [{ question: '', answer: '' }]
  if (type === 'related') b.relatedLinks = [{ title: '', url: '' }]
  if (type === 'cta') { b.linkText = 'Explore packages'; b.link = '/destinations' }
  return b
}

/** Auto-growing textarea */
function AutoText({ value, onChange, placeholder, className, minRows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return <textarea ref={ref} rows={minRows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputClass, 'resize-none leading-relaxed', className)} />
}

function AddMenu({ onPick, onClose }: { onPick: (t: BlockType) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [onClose])
  return (
    <div ref={ref} className="absolute left-0 right-0 sm:right-auto sm:w-[28rem] z-20 mt-2 rounded-2xl border border-gray-200 bg-white shadow-xl p-2 grid grid-cols-2 gap-1">
      {ORDER.map((t) => {
        const M = BLOCK_META[t]
        return (
          <button key={t} type="button" onClick={() => onPick(t)} className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-bordeaux-50">
            <M.icon className="w-4 h-4 mt-0.5 text-bordeaux-600 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">{M.label}</span>
              <span className="block text-[11px] text-gray-500 leading-tight">{M.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function BlockEditor({ blocks, onChange }: { blocks: EditorBlock[]; onChange: (b: EditorBlock[]) => void }) {
  /** index to insert after; -1 = at end menu; null = closed */
  const [menuAt, setMenuAt] = useState<number | null>(null)

  const update = (i: number, patch: Partial<BlogSection>) => onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const remove = (i: number) => {
    const b = blocks[i]
    const hasContent = !!(b.text || b.imageUrl || b.items?.some(Boolean) || b.faqs?.some((f) => f.question || f.answer) || b.relatedLinks?.some((l) => l.title || l.url))
    if (hasContent && !confirm(`Remove this ${BLOCK_META[b.type]?.label.toLowerCase() || 'block'}?`)) return
    onChange(blocks.filter((_, j) => j !== i))
  }
  const insert = (type: BlockType, afterIndex: number) => {
    const next = [...blocks]
    next.splice(afterIndex < 0 ? next.length : afterIndex + 1, 0, newBlock(type))
    onChange(next)
    setMenuAt(null)
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
          No content yet. Add your first block below — start with a paragraph.
        </div>
      )}

      {blocks.map((b, i) => {
        const M = BLOCK_META[b.type] || { label: b.type, icon: AlignLeft, hint: '' }
        return (
          <div key={b._k} className="group relative rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
              <M.icon className="w-3.5 h-3.5 text-bordeaux-600" />
              <span className="text-xs font-semibold text-gray-600">{M.label}</span>
              <div className="ml-auto flex items-center gap-0.5">
                <IconBtn label="Insert block below" onClick={() => setMenuAt(menuAt === i ? null : i)}><Plus className="w-3.5 h-3.5" /></IconBtn>
                <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></IconBtn>
                <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><ArrowDown className="w-3.5 h-3.5" /></IconBtn>
                <IconBtn label="Delete block" onClick={() => remove(i)} danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
              </div>
            </div>
            <div className="p-3">
              <BlockFields block={b} onChange={(p) => update(i, p)} />
            </div>
            {menuAt === i && (
              <div className="relative px-3 pb-1">
                <AddMenu onPick={(t) => insert(t, i)} onClose={() => setMenuAt(null)} />
              </div>
            )}
          </div>
        )
      })}

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuAt(menuAt === -1 ? null : -1)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-600 hover:border-bordeaux-300 hover:text-bordeaux-700 hover:bg-bordeaux-50/40 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add block
        </button>
        {menuAt === -1 && <AddMenu onPick={(t) => insert(t, -1)} onClose={() => setMenuAt(null)} />}
      </div>
    </div>
  )
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx('p-1.5 rounded-md text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed', danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-gray-200 hover:text-gray-800')}
    >
      {children}
    </button>
  )
}

function BlockFields({ block: b, onChange }: { block: EditorBlock; onChange: (p: Partial<BlogSection>) => void }) {
  switch (b.type) {
    case 'intro':
      return <AutoText value={b.text || ''} onChange={(v) => onChange({ text: v })} placeholder="Hook the reader in two or three sentences…" className="text-base" minRows={3} />
    case 'paragraph':
      return <AutoText value={b.text || ''} onChange={(v) => onChange({ text: v })} placeholder="Write a paragraph…" minRows={3} />
    case 'heading':
      return <input value={b.text || ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="Section heading" className={cx(inputClass, 'text-lg font-semibold')} />
    case 'subheading':
      return <input value={b.text || ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="Sub-heading" className={cx(inputClass, 'font-semibold')} />
    case 'image':
      return (
        <div className="space-y-2">
          <ImageUploader value={b.imageUrl || ''} onChange={(url) => onChange({ imageUrl: url })} folder="/blogs" />
          <input value={b.imageAlt || ''} onChange={(e) => onChange({ imageAlt: e.target.value })} placeholder="Caption / alt text (describe the photo)" className={inputClass} />
        </div>
      )
    case 'quote':
      return (
        <div className="space-y-2">
          <AutoText value={b.text || ''} onChange={(v) => onChange({ text: v })} placeholder="The quote…" className="italic" />
          <input value={b.author || ''} onChange={(e) => onChange({ author: e.target.value })} placeholder="Who said it? (optional)" className={inputClass} />
        </div>
      )
    case 'list':
      return (
        <div>
          <AutoText value={(b.items || []).join('\n')} onChange={(v) => onChange({ items: v.split('\n') })} placeholder={'First point\nSecond point\nThird point'} minRows={3} />
          <p className="mt-1 text-xs text-gray-500">One point per line.</p>
        </div>
      )
    case 'cta':
      return (
        <div className="space-y-2">
          <AutoText value={b.text || ''} onChange={(v) => onChange({ text: v })} placeholder="Ready to plan your trip? …" />
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={b.linkText || ''} onChange={(e) => onChange({ linkText: e.target.value })} placeholder="Button text" className={inputClass} />
            <input value={b.link || ''} onChange={(e) => onChange({ link: e.target.value })} placeholder="/destinations or https://…" className={inputClass} />
          </div>
        </div>
      )
    case 'faq': {
      const faqs = b.faqs || []
      const set = (next: typeof faqs) => onChange({ faqs: next })
      return (
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="relative rounded-lg bg-gray-50 p-2.5 space-y-2">
              <div className="flex gap-2">
                <input value={f.question} onChange={(e) => set(faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} placeholder={`Question ${i + 1}`} className={cx(inputClass, 'font-medium')} />
                {faqs.length > 1 && (
                  <button type="button" onClick={() => set(faqs.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remove question"><X className="w-4 h-4" /></button>
                )}
              </div>
              <AutoText value={f.answer} onChange={(v) => set(faqs.map((x, j) => (j === i ? { ...x, answer: v } : x)))} placeholder="Answer" />
            </div>
          ))}
          <button type="button" onClick={() => set([...faqs, { question: '', answer: '' }])} className="text-xs font-semibold text-bordeaux-700 hover:underline">+ Add question</button>
        </div>
      )
    }
    case 'related': {
      const links = b.relatedLinks || []
      const set = (next: typeof links) => onChange({ relatedLinks: next })
      return (
        <div className="space-y-3">
          {links.map((l, i) => (
            <div key={i} className="rounded-lg bg-gray-50 p-2.5 space-y-2">
              <div className="flex gap-2">
                <input value={l.title} onChange={(e) => set(links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Link title" className={inputClass} />
                {links.length > 1 && (
                  <button type="button" onClick={() => set(links.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remove link"><X className="w-4 h-4" /></button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={l.url} onChange={(e) => set(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="/blog/… or https://…" className={inputClass} />
                <input value={l.description || ''} onChange={(e) => set(links.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="Short description (optional)" className={inputClass} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => set([...links, { title: '', url: '' }])} className="text-xs font-semibold text-bordeaux-700 hover:underline">+ Add link</button>
        </div>
      )
    }
    case 'toc':
      return <p className="text-sm text-gray-500">A table of contents is built automatically from your headings.</p>
    case 'divider':
      return <hr className="border-gray-200 my-1" />
    default:
      return <AutoText value={b.text || ''} onChange={(v) => onChange({ text: v })} />
  }
}
