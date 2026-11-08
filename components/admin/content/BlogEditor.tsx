'use client'

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, deleteField, doc, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Eye, ExternalLink, FileText, Layers, Wand2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import ImageUploader from '@/components/admin/ImageUploader'
import { Button, Card, Drawer, Field, PageHeader, cx, formatDate, inputClass } from '@/components/admin/ui'
import BlockEditor, { EditorBlock, fromEditorBlocks, toEditorBlocks } from './BlockEditor'
import BlogPreview from './BlogPreview'
import {
  ChipInput, Collapsible, SITE_URL, Toggle, blocksToText, blogPath, categorySegment, clean, dateToInput, displayDate,
  inputToDisplayDate, legacyTitleSlug, readTimeFor, slugify, textToBlocks, wordCount,
} from './shared'
import type { Author, BlogPost } from './types'

const DEFAULT_CATEGORY = 'Travel Tips'
const DEFAULT_SECTION = 'Travel Guides'

interface Props {
  blog: BlogPost | null
  allBlogs: BlogPost[]
  authors: Author[]
  onSaved: (saved: BlogPost) => void
  onCancel: () => void
}

export default function BlogEditor({ blog, allBlogs, authors, onSaved, onCancel }: Props) {
  const { currentUser } = useAuth()
  const isEdit = !!blog?.id

  const [title, setTitle] = useState(blog?.title || '')
  const [subtitle, setSubtitle] = useState(blog?.subtitle || '')
  const [description, setDescription] = useState(blog?.description || '')
  const [image, setImage] = useState(blog?.image || '')
  const [category, setCategory] = useState(blog?.category || DEFAULT_CATEGORY)
  const [sectionHeader, setSectionHeader] = useState(blog?.sectionHeader ?? (isEdit ? '' : DEFAULT_SECTION))
  const [isFeatured, setIsFeatured] = useState(!!blog?.isFeatured)
  const [sectionOrder, setSectionOrder] = useState<string>(blog?.sectionOrder !== undefined && blog.sectionOrder !== 999 ? String(blog.sectionOrder) : '')
  const [published, setPublished] = useState(blog ? blog.published !== false : false)
  const [dateInput, setDateInput] = useState(isEdit ? dateToInput(blog?.date) : dateToInput(displayDate()))

  // Author: either a linked profile (slug) or a free-typed name
  // (existing post → its linked profile, or the profile with the same name; new post → the current user's profile, else the first one)
  const [authorSlug, setAuthorSlug] = useState(() => {
    if (blog) {
      if (blog.authorSlug && authors.some((a) => a.slug === blog.authorSlug)) return blog.authorSlug
      return authors.find((a) => a.name === blog.author)?.slug || ''
    }
    return (authors.find((a) => a.name === currentUser?.displayName) || authors[0])?.slug || ''
  })
  const [authorName, setAuthorName] = useState(blog?.author || '')
  const [authorImage, setAuthorImage] = useState(blog?.authorImage || '')

  // Body
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => toEditorBlocks(blog?.blogStructure))
  const legacyOnly = !!(blog && !(blog.blogStructure && blog.blogStructure.length) && blog.content)
  const [plainMode, setPlainMode] = useState(legacyOnly)
  const [plainContent, setPlainContent] = useState(blog?.content || '')

  // SEO
  const [slug, setSlug] = useState(blog?.slug || '')
  const [slugTouched, setSlugTouched] = useState(!!blog?.slug)
  const [metaTitle, setMetaTitle] = useState(blog?.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(blog?.metaDescription || '')
  const [keywords, setKeywords] = useState<string[]>(
    Array.isArray(blog?.keywords) ? blog!.keywords! : typeof (blog as any)?.keywords === 'string' ? String((blog as any).keywords).split(',').map((s) => s.trim()).filter(Boolean) : [],
  )
  const [ogImage, setOgImage] = useState(blog?.ogImage || '')
  const [canonicalUrl, setCanonicalUrl] = useState(blog?.canonicalUrl || '')
  const [schemaType, setSchemaType] = useState<BlogPost['schemaType']>(blog?.schemaType || 'BlogPosting')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const dirty = useRef(false)
  const touch = useCallback(<T,>(setter: (v: T) => void) => (v: T) => { dirty.current = true; setter(v) }, [])

  // New posts: slug follows the title until the user edits it
  useEffect(() => {
    if (!isEdit && !slugTouched) setSlug(slugify(title))
  }, [title, isEdit, slugTouched])

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  const selectedAuthor = authors.find((a) => a.slug === authorSlug)
  const sections = useMemo(() => fromEditorBlocks(blocks), [blocks])
  const bodyText = plainMode ? plainContent : blocksToText(sections)
  const words = wordCount(bodyText)
  const readTime = readTimeFor(bodyText)

  /** URL slug that will actually be live */
  const effectiveSlug = (() => {
    const s = slug.trim()
    // Existing posts keep their current URL (stored slug, or the title-based URL the site already uses)
    if (!s) return isEdit ? blog!.slug || legacyTitleSlug(blog!.title) : slugify(title)
    if (blog?.slug && s === blog.slug) return s
    return slugify(s)
  })()
  const path = blogPath({ category, slug: effectiveSlug, title })
  const slugClash = useMemo(
    () => allBlogs.find((b) => b.id !== blog?.id && (b.slug || legacyTitleSlug(b.title)) === effectiveSlug),
    [allBlogs, blog?.id, effectiveSlug],
  )

  const categories = useMemo(() => Array.from(new Set(allBlogs.map((b) => b.category).filter(Boolean))).sort(), [allBlogs])
  const sectionHeaders = useMemo(() => Array.from(new Set(allBlogs.map((b) => b.sectionHeader).filter(Boolean) as string[])).sort(), [allBlogs])

  const autoSummary = useMemo(() => {
    const first = sections.find((s) => (s.type === 'intro' || s.type === 'paragraph') && s.text)?.text || plainContent.replace(/<[^>]+>/g, ' ').replace(/^#+\s.*$/gm, '')
    const t = String(first || '').replace(/\s+/g, ' ').trim()
    return t.length > 158 ? t.slice(0, 155).replace(/\s+\S*$/, '') + '…' : t
  }, [sections, plainContent])
  const summary = description.trim() || autoSummary

  const snippetTitle = `${metaTitle.trim() || title || 'Post title'} | Travelzada`
  const snippetDesc = metaDescription.trim() || summary || 'Add a short summary so Google can show a description.'

  const save = useCallback(async () => {
    setError('')
    if (!title.trim()) return setError('Give the post a title.')
    if (published && !image) return setError('Add a cover image before publishing (or switch the post to draft).')
    if (slugClash) return setError(`Another post already uses the URL “${effectiveSlug}”. Change the slug under SEO & advanced.`)
    if (!plainMode && sections.length === 0 && published) return setError('The post has no content yet.')

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const content = plainMode ? plainContent : blocksToText(sections)
      const name = selectedAuthor?.name || authorName.trim() || currentUser?.displayName || 'Travelzada Team'
      // Optional fields: omitted on create, removed on edit when cleared (so the site's fallbacks apply)
      const DEL = deleteField()
      const opt = (v: any) => (v === undefined || v === '' || (Array.isArray(v) && !v.length) ? (isEdit ? DEL : undefined) : v)

      const payload: Record<string, any> = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: summary,
        content,
        image,
        author: name,
        category: category.trim() || DEFAULT_CATEGORY,
        sectionHeader: sectionHeader.trim(),
        isFeatured,
        sectionOrder: sectionOrder.trim() ? Number(sectionOrder) || 0 : 999,
        readTime,
        published,
        date: dateInput ? inputToDisplayDate(dateInput) : blog?.date || displayDate(),
        schemaType: schemaType || 'BlogPosting',
        updatedAt: now,
        // Slug: always stored so the URL never changes when the title is edited later
        slug: effectiveSlug,
        authorSlug: opt(selectedAuthor?.slug),
        authorImage: opt(selectedAuthor ? selectedAuthor.photo || '' : authorImage),
        metaTitle: opt(metaTitle.trim()),
        metaDescription: opt(metaDescription.trim()),
        keywords: opt(keywords),
        canonicalUrl: opt(canonicalUrl.trim()),
        ogImage: opt(ogImage),
      }
      if (!plainMode) payload.blogStructure = opt(sections)

      let id = blog?.id
      if (isEdit && id) {
        await updateDoc(doc(db, 'blogs', id), clean(payload))
      } else {
        const created = clean({ ...payload, createdAt: now, likes: 0, views: 0, comments: 0, shares: 0, featured: false })
        id = (await addDoc(collection(db, 'blogs'), created)).id
      }
      dirty.current = false
      const saved: any = { ...(blog || {}), ...payload, id }
      Object.keys(saved).forEach((k) => { if (saved[k] === undefined || saved[k] === DEL) delete saved[k] })
      if (!isEdit) saved.createdAt = now
      onSaved(saved as BlogPost)
    } catch (e: any) {
      console.error('Error saving blog:', e)
      setError(e?.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [title, published, image, slugClash, effectiveSlug, plainMode, sections, plainContent, selectedAuthor, authorName, currentUser, isEdit, subtitle, summary, category, sectionHeader, isFeatured, sectionOrder, readTime, dateInput, blog, schemaType, authorImage, metaTitle, metaDescription, keywords, canonicalUrl, ogImage, onSaved])

  // Ctrl/Cmd + S saves
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saving) save() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [save, saving])

  const cancel = () => {
    if (dirty.current && !confirm('Discard unsaved changes?')) return
    dirty.current = false
    onCancel()
  }

  const saveLabel = published ? (isEdit && blog?.published !== false ? 'Update' : 'Publish') : 'Save draft'

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit post' : 'New post'}
        description={isEdit ? `Last updated ${formatDate(blog?.updatedAt || blog?.createdAt, true)}` : 'Write, add a cover photo, pick an author and publish.'}
        actions={
          <>
            <Button variant="ghost" onClick={cancel}><ArrowLeft className="w-4 h-4" /> All posts</Button>
            <Button variant="secondary" onClick={() => setPreview(true)}><Eye className="w-4 h-4" /> Preview</Button>
            <Button onClick={save} loading={saving}>{saveLabel}</Button>
          </>
        }
      />

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Main column ── */}
        <div className="space-y-5 min-w-0">
          <Card>
            <input
              value={title}
              onChange={(e) => touch(setTitle)(e.target.value)}
              placeholder="Post title"
              className="w-full border-0 p-0 text-2xl sm:text-3xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0"
            />
            <input
              value={subtitle}
              onChange={(e) => touch(setSubtitle)(e.target.value)}
              placeholder="Subtitle (optional)"
              className="mt-2 w-full border-0 p-0 text-base text-gray-600 placeholder:text-gray-300 focus:outline-none focus:ring-0"
            />
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Field label="Summary" hint={description.trim() ? `${description.trim().length} characters · shown on blog cards and in Google` : autoSummary ? 'Left empty — the first paragraph will be used.' : 'Shown on blog cards and in Google.'}>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => touch(setDescription)(e.target.value)}
                  placeholder={autoSummary || 'One or two sentences about this post'}
                  className={cx(inputClass, 'resize-none')}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Content</h2>
                <p className="text-xs text-gray-500">{words.toLocaleString()} words · {readTime}</p>
              </div>
              {plainMode ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!confirm('Convert this text into editable blocks? Headings (##), sub-headings (###) and bullet points (-) are detected automatically.')) return
                    dirty.current = true
                    setBlocks(toEditorBlocks(textToBlocks(plainContent)))
                    setPlainMode(false)
                  }}
                >
                  <Wand2 className="w-3.5 h-3.5" /> Convert to blocks
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500"><Layers className="w-3.5 h-3.5" /> {blocks.length} block{blocks.length === 1 ? '' : 's'}</span>
              )}
            </div>
            {plainMode ? (
              <div>
                <div className="mb-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <FileText className="w-4 h-4 shrink-0" />
                  This older post is plain text. Use “## ” for headings and “- ” for bullets, or convert it to blocks for images, FAQs and more.
                </div>
                <textarea rows={18} value={plainContent} onChange={(e) => touch(setPlainContent)(e.target.value)} className={cx(inputClass, 'font-mono text-[13px] leading-relaxed')} />
              </div>
            ) : (
              <BlockEditor blocks={blocks} onChange={touch(setBlocks)} />
            )}
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
          <Card className="space-y-4">
            <Toggle checked={published} onChange={touch(setPublished)} label={published ? 'Published' : 'Draft'} hint={published ? 'Visible on the website' : 'Only visible here'} />
            <Field label="Publish date">
              <input type="date" value={dateInput} onChange={(e) => touch(setDateInput)(e.target.value)} className={inputClass} />
              {!dateInput && blog?.date && <span className="block text-xs text-gray-500 mt-1">Currently shown as “{blog.date}”</span>}
            </Field>
            {isEdit && published && blog?.published !== false && (
              <a href={path} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-bordeaux-700 hover:underline break-all">
                <ExternalLink className="w-3.5 h-3.5 shrink-0" /> View on site
              </a>
            )}
          </Card>

          <Card className="space-y-4">
            <Field label="Cover image">
              <ImageUploader value={image} onChange={touch(setImage)} folder="/blogs" />
            </Field>
            <Field label="Category" hint="Also forms part of the URL">
              <input list="blog-categories" value={category} onChange={(e) => touch(setCategory)(e.target.value)} placeholder={DEFAULT_CATEGORY} className={inputClass} />
              <datalist id="blog-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Author">
              <select
                value={authorSlug || '__custom'}
                onChange={(e) => {
                  dirty.current = true
                  const v = e.target.value
                  if (v === '__custom') { setAuthorSlug(''); return }
                  const a = authors.find((x) => x.slug === v)
                  setAuthorSlug(v)
                  if (a) { setAuthorName(a.name); setAuthorImage(a.photo || '') }
                }}
                className={inputClass}
              >
                {authors.map((a) => <option key={a.id} value={a.slug}>{a.name}{a.role ? ` — ${a.role}` : ''}</option>)}
                <option value="__custom">{authors.length ? 'Someone else (type a name)' : 'Type a name'}</option>
              </select>
            </Field>
            {selectedAuthor ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2">
                {selectedAuthor.photo ? <img src={selectedAuthor.photo} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-bordeaux-100" />}
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-gray-900 truncate">{selectedAuthor.name}</p>
                  <p className="text-gray-500 truncate">Linked to /author/{selectedAuthor.slug}</p>
                </div>
              </div>
            ) : (
              <input value={authorName} onChange={(e) => touch(setAuthorName)(e.target.value)} placeholder={currentUser?.displayName || 'Travelzada Team'} className={inputClass} />
            )}
          </Card>

          <Card className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Blog page placement</h3>
              <p className="text-xs text-gray-500">Posts are grouped into rows by section on /blog.</p>
            </div>
            <Field label="Section">
              <input list="blog-sections" value={sectionHeader} onChange={(e) => touch(setSectionHeader)(e.target.value)} placeholder="General" className={inputClass} />
              <datalist id="blog-sections">{sectionHeaders.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Toggle checked={isFeatured} onChange={touch(setIsFeatured)} label="Lead post of the section" hint="Shown large on the left" />
            <Field label="Order in section" hint="Lower numbers first. Leave empty for automatic.">
              <input type="number" min={0} value={sectionOrder} onChange={(e) => touch(setSectionOrder)(e.target.value)} placeholder="Auto" className={inputClass} />
            </Field>
          </Card>

          <Collapsible title="SEO & advanced" hint="Optional — sensible defaults are used">
            <div className="rounded-xl border border-gray-200 p-3 bg-white">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400 mb-1.5">Google preview</p>
              <p className="text-xs text-gray-600 truncate">travelzada.com › blog › {categorySegment(category)} › {effectiveSlug || '…'}</p>
              <p className="text-[17px] leading-snug text-[#1a0dab] line-clamp-2 mt-0.5">{snippetTitle}</p>
              <p className="text-[13px] leading-snug text-gray-600 line-clamp-2 mt-0.5">{snippetDesc}</p>
            </div>
            <Field label="URL slug" hint={slugClash ? '⚠ Already used by another post' : `${SITE_URL}${path}`}>
              <input
                value={slug}
                onChange={(e) => { dirty.current = true; setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')) }}
                onBlur={() => setSlug((s) => (blog?.slug && s.trim() === blog.slug ? s : slugify(s)))}
                placeholder={isEdit ? legacyTitleSlug(blog!.title) : slugify(title) || 'auto-from-title'}
                className={cx(inputClass, 'font-mono text-xs', slugClash && 'border-red-400')}
              />
              {isEdit && blog?.published !== false && effectiveSlug !== (blog?.slug || legacyTitleSlug(blog!.title)) && (
                <span className="block text-xs text-amber-700 mt-1">Changing the slug of a live post breaks existing links to it.</span>
              )}
            </Field>
            <Field label={`Meta title · ${(metaTitle || title).length}/60`} hint="Leave empty to use the post title">
              <input value={metaTitle} onChange={(e) => touch(setMetaTitle)(e.target.value)} placeholder={title} maxLength={70} className={inputClass} />
            </Field>
            <Field label={`Meta description · ${(metaDescription || summary).length}/160`} hint="Leave empty to use the summary">
              <textarea rows={3} value={metaDescription} onChange={(e) => touch(setMetaDescription)(e.target.value)} placeholder={summary} maxLength={170} className={cx(inputClass, 'resize-none')} />
            </Field>
            <Field label="Keywords">
              <ChipInput value={keywords} onChange={touch(setKeywords)} placeholder="bali, honeymoon…" />
            </Field>
            <Field label="Social share image" hint="Leave empty to use the cover image">
              <ImageUploader value={ogImage} onChange={touch(setOgImage)} folder="/blogs/og" compact />
            </Field>
            <Field label="Canonical URL" hint="Only if this post was first published elsewhere">
              <input type="url" value={canonicalUrl} onChange={(e) => touch(setCanonicalUrl)(e.target.value)} placeholder={`${SITE_URL}${path}`} className={inputClass} />
            </Field>
            <Field label="Schema type">
              <select value={schemaType} onChange={(e) => touch(setSchemaType)(e.target.value as BlogPost['schemaType'])} className={inputClass}>
                <option value="BlogPosting">Blog post (default)</option>
                <option value="Article">Article</option>
                <option value="NewsArticle">News article</option>
              </select>
            </Field>
          </Collapsible>

          <div className="lg:hidden">
            <Button onClick={save} loading={saving} className="w-full">{saveLabel}</Button>
          </div>
        </div>
      </div>

      <Drawer open={preview} onClose={() => setPreview(false)} title="Preview" width="max-w-3xl">
        <BlogPreview
          title={title}
          subtitle={subtitle}
          image={image}
          author={selectedAuthor?.name || authorName}
          date={dateInput ? inputToDisplayDate(dateInput) : blog?.date}
          readTime={readTime}
          blocks={plainMode ? [] : sections}
          content={plainMode ? plainContent : ''}
        />
      </Drawer>
    </div>
  )
}
