'use client'

import { useRef, useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { CheckCircle2, Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react'
import { db } from '@/lib/firebase'
import { Button, Drawer, cx, inputClass } from '@/components/admin/ui'
import { Toggle, blocksToText, displayDate, legacyTitleSlug, readTimeFor, slugify } from './shared'
import type { BlogPost, BlogSection } from './types'

const SAMPLE_BLOGS: Array<Partial<BlogPost>> = [
  {
    title: '10 Best Travel Destinations for 2025',
    subtitle: 'Discover the most amazing places to visit this year',
    description: 'From tropical paradises to cultural hubs, here are the top destinations you should add to your travel bucket list.',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
    author: 'Travel Expert',
    category: 'Travel Tips',
    sectionHeader: 'Travel Guides',
    isFeatured: true,
    sectionOrder: 1,
    keywords: ['travel', 'destinations', '2025'],
    blogStructure: [
      { type: 'intro', text: 'As we step into 2025, the world of travel continues to evolve. Whether you are seeking adventure, relaxation or culture, this list has something for every traveller.' },
      { type: 'heading', text: 'Top Destinations for 2025' },
      { type: 'paragraph', text: 'From hidden gems to classic favourites with fresh perspectives, these places offer unforgettable experiences.' },
      { type: 'image', imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Rice terraces in Bali' },
      { type: 'subheading', text: '1. Bali, Indonesia' },
      { type: 'paragraph', text: 'Beaches, temples and a vibrant arts scene — Bali offers something for everyone.' },
      { type: 'list', items: ['Book stays early in peak season', 'Explore beyond the tourist areas', 'Try local family-run warungs'] },
      { type: 'quote', text: 'Travel is the only thing you buy that makes you richer.', author: 'Anonymous' },
      { type: 'divider' },
      { type: 'faq', faqs: [
        { question: 'What is the best time to visit?', answer: 'Shoulder seasons (spring and autumn) usually mean good weather, fewer crowds and better prices.' },
        { question: 'Do I need travel insurance?', answer: 'Yes, it is highly recommended for international trips.' },
      ] },
      { type: 'cta', text: 'Ready to explore? Browse our curated holiday packages.', link: '/destinations', linkText: 'Explore Packages' },
    ],
  },
  {
    title: 'How to Plan the Perfect Honeymoon',
    subtitle: 'A complete guide to planning your dream romantic getaway',
    description: 'Everything you need to know about planning a honeymoon you will cherish forever.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    author: 'Romance Travel',
    category: 'Honeymoon',
    sectionHeader: 'Travel Guides',
    isFeatured: false,
    sectionOrder: 2,
    blogStructure: [
      { type: 'intro', text: 'Your honeymoon is one of the most special trips you will ever take. With careful planning it can be everything you dreamed of.' },
      { type: 'heading', text: 'Setting Your Budget' },
      { type: 'paragraph', text: 'Consider flights, stays, meals, activities and a buffer for surprises before you shortlist destinations.' },
      { type: 'cta', text: 'Let us plan your honeymoon for you.', link: '/destinations', linkText: 'View Honeymoon Packages' },
    ],
  },
]

const BLOG_HEADERS = ['Slug', 'Title', 'Subtitle', 'Description', 'Content', 'Image URL', 'Author', 'Category', 'Read Time', 'Meta Title', 'Meta Description', 'Keywords (comma separated)', 'Section Header', 'Section Order', 'Is Featured']
const SECTION_HEADERS = ['Blog Slug', 'Order', 'Type', 'Text', 'Image URL', 'Image Alt', 'List Items (comma separated)', 'Quote Author', 'FAQ Question', 'FAQ Answer', 'Link', 'Link Text']

type Result = { success: number; errors: string[] }

/** Builds a Firestore-ready blog document from loose input (shared by JSON + Excel import) */
function buildDoc(input: any, publish: boolean, now: string): Record<string, any> {
  const structure: BlogSection[] | undefined = Array.isArray(input.blogStructure) && input.blogStructure.length ? input.blogStructure : undefined
  const content = typeof input.content === 'string' && input.content.trim() ? input.content : structure ? blocksToText(structure) : ''
  const firstText = structure?.find((s) => (s.type === 'intro' || s.type === 'paragraph') && (s.text || s.content))
  const description = input.description || String(firstText?.text || firstText?.content || content).replace(/\s+/g, ' ').slice(0, 155)
  const keywords = Array.isArray(input.keywords) ? input.keywords : typeof input.keywords === 'string' ? input.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : undefined
  const d: Record<string, any> = {
    title: String(input.title).trim(),
    subtitle: input.subtitle || '',
    description,
    content,
    image: input.image,
    author: input.author || 'Travelzada Team',
    authorImage: input.authorImage || '',
    date: input.date || displayDate(),
    category: input.category || 'Travel Tips',
    sectionHeader: input.sectionHeader || '',
    isFeatured: input.isFeatured === true || input.isFeatured === 'true',
    sectionOrder: input.sectionOrder !== undefined && input.sectionOrder !== '' ? Number(input.sectionOrder) || 0 : 999,
    readTime: input.readTime || readTimeFor(content),
    likes: 0, views: 0, comments: 0, shares: 0,
    featured: false,
    published: typeof input.published === 'boolean' ? input.published : publish,
    createdAt: now,
    updatedAt: now,
    schemaType: input.schemaType || 'BlogPosting',
    slug: input.slug ? slugify(input.slug) : slugify(input.title),
  }
  if (input.authorSlug) d.authorSlug = input.authorSlug
  if (structure) d.blogStructure = structure
  if (input.metaTitle) d.metaTitle = input.metaTitle
  if (input.metaDescription) d.metaDescription = input.metaDescription
  if (keywords?.length) d.keywords = keywords
  if (input.canonicalUrl) d.canonicalUrl = input.canonicalUrl
  if (input.ogImage) d.ogImage = input.ogImage
  return d
}

export default function BlogImport({ open, onClose, existing, onImported }: { open: boolean; onClose: () => void; existing: BlogPost[]; onImported: () => void }) {
  const [mode, setMode] = useState<'excel' | 'json'>('excel')
  const [json, setJson] = useState('')
  const [publish, setPublish] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const takenSlugs = () => new Set(existing.map((b) => b.slug || legacyTitleSlug(b.title)))

  async function importAll(items: any[], label: (i: number) => string) {
    const taken = takenSlugs()
    const errors: string[] = []
    let success = 0
    const now = new Date().toISOString()
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        if (!item || typeof item !== 'object') throw new Error('Not an object')
        if (!item.title || typeof item.title !== 'string') throw new Error('Title is required')
        if (!item.image || typeof item.image !== 'string') throw new Error('Image URL is required')
        if (item.blogStructure && !Array.isArray(item.blogStructure)) throw new Error('blogStructure must be an array')
        const d = buildDoc(item, publish, now)
        if (!d.content && !d.blogStructure) throw new Error('Content is required (content or blogStructure)')
        if (taken.has(d.slug)) throw new Error(`URL slug “${d.slug}” is already used`)
        await addDoc(collection(db, 'blogs'), d)
        taken.add(d.slug)
        success++
      } catch (e: any) {
        errors.push(`${label(i)}${item?.title ? ` (${String(item.title).slice(0, 40)})` : ''}: ${e?.message || 'Unknown error'}`)
      }
    }
    setResult({ success, errors })
    if (success) onImported()
  }

  async function runJson() {
    setResult(null)
    let data: any
    try { data = JSON.parse(json) } catch (e: any) { setResult({ success: 0, errors: [`Invalid JSON: ${e?.message}`] }); return }
    if (!Array.isArray(data)) data = [data]
    if (!data.length) { setResult({ success: 0, errors: ['The JSON array is empty'] }); return }
    setBusy(true)
    try { await importAll(data, (i) => `Post ${i + 1}`) } finally { setBusy(false) }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx')
    const blogRows = SAMPLE_BLOGS.map((b) => [
      slugify(b.title || ''), b.title, b.subtitle, b.description, '', b.image, b.author, b.category, '',
      `${b.title} | Travelzada`, b.description, (b.keywords || []).join(', '), b.sectionHeader, b.sectionOrder, !!b.isFeatured,
    ])
    const sectionRows: any[][] = []
    SAMPLE_BLOGS.forEach((b) => {
      const s = slugify(b.title || '')
      let order = 1
      ;(b.blogStructure || []).forEach((sec) => {
        if (sec.type === 'faq') {
          ;(sec.faqs || []).forEach((f) => sectionRows.push([s, order++, 'faq', '', '', '', '', '', f.question, f.answer, '', '']))
          return
        }
        sectionRows.push([s, order++, sec.type, sec.text || '', sec.imageUrl || '', sec.imageAlt || '', (sec.items || []).join(', '), sec.author || '', '', '', sec.link || '', sec.linkText || ''])
      })
    })
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.aoa_to_sheet([BLOG_HEADERS, ...blogRows])
    ws1['!cols'] = BLOG_HEADERS.map(() => ({ wch: 22 }))
    XLSX.utils.book_append_sheet(wb, ws1, 'Blogs')
    const ws2 = XLSX.utils.aoa_to_sheet([SECTION_HEADERS, ...sectionRows])
    ws2['!cols'] = SECTION_HEADERS.map(() => ({ wch: 26 }))
    XLSX.utils.book_append_sheet(wb, ws2, 'Blog Sections')
    XLSX.writeFile(wb, 'travelzada-blog-template-v2.xlsx')
  }

  async function runExcel(file: File) {
    setResult(null)
    setBusy(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const blogsSheet = wb.Sheets['Blogs'] || wb.Sheets[wb.SheetNames[0]]
      const sectionsSheet = wb.Sheets['Blog Sections'] || (wb.SheetNames[1] ? wb.Sheets[wb.SheetNames[1]] : undefined)
      const rows = XLSX.utils.sheet_to_json<any>(blogsSheet)
      const sections = sectionsSheet ? XLSX.utils.sheet_to_json<any>(sectionsSheet) : []

      const items = rows.map((row) => {
        const title = row['Title'] ? String(row['Title']) : ''
        const slug = row['Slug'] ? String(row['Slug']) : slugify(title)
        const mine = sections.filter((s) => String(s['Blog Slug'] || '') === slug).sort((a, b) => (Number(a['Order']) || 0) - (Number(b['Order']) || 0))
        const structure: BlogSection[] = []
        mine.forEach((s) => {
          const type = String(s['Type'] || '').toLowerCase().trim() as BlogSection['type']
          const text = s['Text'] ? String(s['Text']) : ''
          switch (type) {
            case 'image': structure.push({ type, imageUrl: s['Image URL'] || '', imageAlt: s['Image Alt'] || '' }); break
            case 'list': structure.push({ type, items: String(s['List Items (comma separated)'] || '').split(',').map((x) => x.trim()).filter(Boolean) }); break
            case 'quote': structure.push({ type, text, author: s['Quote Author'] || '' }); break
            case 'cta': structure.push({ type, text, link: s['Link'] || '', linkText: s['Link Text'] || '' }); break
            case 'faq': {
              const faq = { question: String(s['FAQ Question'] || ''), answer: String(s['FAQ Answer'] || '') }
              const prev = structure[structure.length - 1]
              if (prev?.type === 'faq') prev.faqs = [...(prev.faqs || []), faq] // consecutive FAQ rows → one FAQ block
              else structure.push({ type, faqs: [faq] })
              break
            }
            case 'divider': case 'toc': structure.push({ type }); break
            default: structure.push({ type: (type || 'paragraph') as BlogSection['type'], text })
          }
        })
        return {
          title,
          slug,
          subtitle: row['Subtitle'] || '',
          description: row['Description'] || '',
          content: row['Content'] ? String(row['Content']) : '',
          image: row['Image URL'] || '',
          author: row['Author'] || '',
          category: row['Category'] || 'General',
          readTime: row['Read Time'] || '',
          metaTitle: row['Meta Title'] || '',
          metaDescription: row['Meta Description'] || '',
          keywords: row['Keywords (comma separated)'] ? String(row['Keywords (comma separated)']) : '',
          sectionHeader: row['Section Header'] || 'Travel Guides',
          sectionOrder: row['Section Order'],
          isFeatured: row['Is Featured'],
          blogStructure: structure,
        }
      })
      if (!items.length) setResult({ success: 0, errors: ['No rows found in the “Blogs” sheet'] })
      else await importAll(items, (i) => `Row ${i + 2}`)
    } catch (e) {
      console.error('Excel import failed:', e)
      setResult({ success: 0, errors: ['Could not read the file. Make sure it matches the template.'] })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const close = () => { if (busy) return; setResult(null); onClose() }

  return (
    <Drawer open={open} onClose={close} title="Import posts" width="max-w-2xl"
      footer={mode === 'json' ? (
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>Close</Button>
          <Button onClick={runJson} loading={busy} disabled={!json.trim()}><Upload className="w-4 h-4" /> Import JSON</Button>
        </>
      ) : <Button variant="secondary" onClick={close} disabled={busy}>Close</Button>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {([['excel', 'Excel sheet', FileSpreadsheet], ['json', 'JSON', FileJson]] as const).map(([m, label, Icon]) => (
            <button key={m} type="button" onClick={() => { setMode(m); setResult(null) }}
              className={cx('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold', mode === m ? 'border-bordeaux-500 bg-bordeaux-50 text-bordeaux-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <Toggle checked={publish} onChange={setPublish} label="Publish imported posts right away" hint="Turn off to import them as drafts" />

        {mode === 'excel' ? (
          <div className="space-y-4">
            <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-5">
              <li>Download the template. It has two sheets: <b>Blogs</b> (one row per post) and <b>Blog Sections</b> (the content blocks, linked by slug).</li>
              <li>Fill it in — Title and Image URL are required. Slugs that already exist are skipped.</li>
              <li>Upload it here.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={downloadTemplate}><Download className="w-4 h-4" /> Download template</Button>
              <Button onClick={() => fileRef.current?.click()} loading={busy}><Upload className="w-4 h-4" /> Upload Excel</Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) runExcel(f) }} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Paste an array of posts. Required: <code className="text-xs">title</code>, <code className="text-xs">image</code>, and <code className="text-xs">blogStructure</code> or <code className="text-xs">content</code>.</p>
              <button type="button" onClick={() => setJson(JSON.stringify(SAMPLE_BLOGS, null, 2))} className="shrink-0 text-xs font-semibold text-bordeaux-700 hover:underline">Load sample</button>
            </div>
            <textarea rows={16} value={json} onChange={(e) => setJson(e.target.value)} placeholder='[ { "title": "…", "image": "https://…", "category": "Travel Tips", "blogStructure": [ { "type": "paragraph", "text": "…" } ] } ]' className={cx(inputClass, 'font-mono text-xs')} />
          </div>
        )}

        {result && (
          <div className="space-y-2">
            {result.success > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="w-4 h-4" /> Imported {result.success} post{result.success === 1 ? '' : 's'}.
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold mb-1">{result.errors.length} skipped</p>
                <ul className="list-disc pl-5 space-y-0.5 max-h-48 overflow-y-auto">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  )
}
