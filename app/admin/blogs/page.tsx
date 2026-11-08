'use client'

/* eslint-disable @next/next/no-img-element */
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { Copy, Edit3, ExternalLink, Eye, FileText, Globe, Image as ImageIcon, Plus, Star, Trash2, Upload } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Badge, Button, Card, EmptyState, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow, Table, Td, Th, Toolbar,
  cx, formatDate, inputClass,
} from '@/components/admin/ui'
import BlogEditor from '@/components/admin/content/BlogEditor'
import BlogImport from '@/components/admin/content/BlogImport'
import { Toggle, blogPath, fetchNewestFirst, legacyTitleSlug, slugify, useFlash } from '@/components/admin/content/shared'
import type { Author, BlogPost } from '@/components/admin/content/types'

type StatusFilter = 'all' | 'published' | 'draft' | 'featured'
const PAGE = 50

export default function AdminBlogsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BlogsInner />
    </Suspense>
  )
}

function BlogsInner() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const editId = params.get('edit')
  const isNew = params.get('new') === '1'

  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => params.get('q') || '')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [importOpen, setImportOpen] = useState(false)
  const { flash, Flash } = useFlash()

  const load = useCallback(async () => {
    try {
      const [b, a] = await Promise.all([
        fetchNewestFirst<BlogPost>('blogs', 'createdAt'),
        fetchNewestFirst<Author>('authors', 'createdAt').catch(() => [] as Author[]),
      ])
      setBlogs(b)
      setAuthors(a.sort((x, y) => (x.name || '').localeCompare(y.name || '')))
    } catch (e) {
      console.error('Error loading blogs:', e)
      flash('Could not load posts', 'error')
    } finally {
      setLoading(false)
    }
  }, [flash])

  useEffect(() => { if (currentUser) load() }, [currentUser, load])

  const go = (q: string) => router.push(q ? `${pathname}?${q}` : pathname)

  const patch = async (b: BlogPost, data: Partial<BlogPost>, msg: string) => {
    if (!b.id) return
    setBlogs((list) => list.map((x) => (x.id === b.id ? { ...x, ...data } : x)))
    try {
      await updateDoc(doc(db, 'blogs', b.id), { ...data, updatedAt: new Date().toISOString() })
      flash(msg)
    } catch (e) {
      console.error(e)
      setBlogs((list) => list.map((x) => (x.id === b.id ? b : x)))
      flash('Could not update the post', 'error')
    }
  }

  const togglePublished = (b: BlogPost) => {
    const next = b.published === false
    if (next && !b.image) { flash('Add a cover image before publishing', 'error'); return }
    patch(b, { published: next }, next ? 'Published' : 'Moved to drafts')
  }

  const toggleFeatured = (b: BlogPost) => patch(b, { isFeatured: !b.isFeatured }, b.isFeatured ? 'No longer the lead post' : 'Set as lead post of its section')

  const duplicate = async (b: BlogPost) => {
    const { id, ...rest } = b
    const taken = new Set(blogs.map((x) => x.slug || legacyTitleSlug(x.title)))
    const base = slugify(`${b.slug || legacyTitleSlug(b.title)}-copy`)
    let slug = base
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
    const now = new Date().toISOString()
    const copy = { ...rest, title: `${b.title} (copy)`, slug, published: false, isFeatured: false, views: 0, likes: 0, comments: 0, shares: 0, createdAt: now, updatedAt: now }
    try {
      const ref = await addDoc(collection(db, 'blogs'), JSON.parse(JSON.stringify(copy)))
      setBlogs((list) => [{ ...copy, id: ref.id } as BlogPost, ...list])
      flash('Duplicated as a draft')
    } catch (e) {
      console.error(e)
      flash('Could not duplicate', 'error')
    }
  }

  const remove = async (b: BlogPost) => {
    if (!b.id || !confirm(`Delete “${b.title}”? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'blogs', b.id))
      setBlogs((list) => list.filter((x) => x.id !== b.id))
      flash('Post deleted')
    } catch (e) {
      console.error(e)
      flash('Could not delete', 'error')
    }
  }

  const categories = useMemo(() => {
    const m = new Map<string, number>()
    blogs.forEach((b) => b.category && m.set(b.category, (m.get(b.category) || 0) + 1))
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [blogs])

  const counts = useMemo(() => ({
    all: blogs.length,
    published: blogs.filter((b) => b.published !== false).length,
    draft: blogs.filter((b) => b.published === false).length,
    featured: blogs.filter((b) => b.isFeatured).length,
    views: blogs.reduce((s, b) => s + (Number(b.views) || 0), 0),
  }), [blogs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return blogs.filter((b) => {
      if (status === 'published' && b.published === false) return false
      if (status === 'draft' && b.published !== false) return false
      if (status === 'featured' && !b.isFeatured) return false
      if (category && b.category !== category) return false
      if (q && ![b.title, b.subtitle, b.author, b.category, b.slug, b.sectionHeader].some((v) => String(v || '').toLowerCase().includes(q))) return false
      return true
    })
  }, [blogs, search, status, category])

  useEffect(() => setLimit(PAGE), [search, status, category])

  /* ── Editor mode ── */
  if (editId || isNew) {
    if (loading) return <Spinner />
    const blog = editId ? blogs.find((b) => b.id === editId) || null : null
    if (editId && !blog) {
      return (
        <Card><EmptyState title="Post not found" description="It may have been deleted." action={<Button onClick={() => go('')}>Back to posts</Button>} /></Card>
      )
    }
    return (
      <>
        <BlogEditor
          key={editId || 'new'}
          blog={blog}
          allBlogs={blogs}
          authors={authors}
          onCancel={() => go('')}
          onSaved={(saved) => {
            setBlogs((list) => {
              const exists = list.some((x) => x.id === saved.id)
              return exists ? list.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...list]
            })
            flash(saved.published === false ? 'Draft saved' : 'Post saved')
            go('')
          }}
        />
        <Flash />
      </>
    )
  }

  /* ── List mode ── */
  const visible = filtered.slice(0, limit)

  return (
    <div>
      <PageHeader
        title="Blog posts"
        description="Write and publish travel guides. Drafts stay hidden from the website."
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4" /> Import</Button>
            <Button onClick={() => go('new=1')}><Plus className="w-4 h-4" /> New post</Button>
          </>
        }
      />

      <StatRow>
        <StatCard label="All posts" value={counts.all} icon={<FileText className="w-5 h-5" />} onClick={() => setStatus('all')} />
        <StatCard label="Published" value={counts.published} tone="green" icon={<Globe className="w-5 h-5" />} onClick={() => setStatus('published')} />
        <StatCard label="Drafts" value={counts.draft} tone="blue" icon={<Edit3 className="w-5 h-5" />} onClick={() => setStatus('draft')} />
        <StatCard label="Total views" value={counts.views.toLocaleString('en-IN')} tone="amber" icon={<Eye className="w-5 h-5" />} />
      </StatRow>

      <Toolbar>
        <FilterChips<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'published', label: 'Published', count: counts.published },
            { value: 'draft', label: 'Drafts', count: counts.draft },
            { value: 'featured', label: 'Lead posts', count: counts.featured },
          ]}
        />
        <div className="flex flex-col sm:flex-row gap-2 md:w-auto">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={cx(inputClass, 'sm:w-48')}>
            <option value="">All categories</option>
            {categories.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
          </select>
          <SearchInput value={search} onChange={setSearch} placeholder="Search title, author…" className="sm:w-64" />
        </div>
      </Toolbar>

      <Card padded={false}>
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={blogs.length ? 'No posts match your filters' : 'No blog posts yet'}
            description={blogs.length ? 'Try a different search or filter.' : 'Write your first travel guide, or import several at once.'}
            action={blogs.length ? <Button variant="secondary" onClick={() => { setSearch(''); setStatus('all'); setCategory('') }}>Clear filters</Button> : <Button onClick={() => go('new=1')}><Plus className="w-4 h-4" /> New post</Button>}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Post</Th>
                    <Th>Category</Th>
                    <Th>Author</Th>
                    <Th>Date</Th>
                    <Th className="text-right">Views</Th>
                    <Th>Live</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/70">
                      <Td>
                        <button type="button" onClick={() => go(`edit=${b.id}`)} className="flex items-center gap-3 text-left group max-w-md">
                          <Thumb src={b.image} />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900 group-hover:text-bordeaux-700 line-clamp-1">{b.title || 'Untitled'}</span>
                            </span>
                            <span className="flex items-center gap-1.5 mt-0.5">
                              {b.published === false ? <Badge tone="blue">Draft</Badge> : <Badge tone="green">Published</Badge>}
                              {b.sectionHeader && <span className="text-xs text-gray-500 truncate">{b.sectionHeader}</span>}
                            </span>
                          </span>
                        </button>
                      </Td>
                      <Td className="whitespace-nowrap">{b.category || '—'}</Td>
                      <Td className="whitespace-nowrap">{b.author || '—'}</Td>
                      <Td className="whitespace-nowrap text-gray-500">{b.date || formatDate(b.createdAt)}</Td>
                      <Td className="text-right tabular-nums">{(Number(b.views) || 0).toLocaleString('en-IN')}</Td>
                      <Td><Toggle checked={b.published !== false} onChange={() => togglePublished(b)} /></Td>
                      <Td className="text-right whitespace-nowrap">
                        <RowActions b={b} onFeature={() => toggleFeatured(b)} onEdit={() => go(`edit=${b.id}`)} onDuplicate={() => duplicate(b)} onDelete={() => remove(b)} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-gray-100">
              {visible.map((b) => (
                <li key={b.id} className="p-4">
                  <button type="button" onClick={() => go(`edit=${b.id}`)} className="flex gap-3 text-left w-full">
                    <Thumb src={b.image} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-gray-900 line-clamp-2">{b.title || 'Untitled'}</span>
                      <span className="block text-xs text-gray-500 mt-1">{[b.category, b.author, b.date].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Toggle checked={b.published !== false} onChange={() => togglePublished(b)} />
                      <span className="text-xs font-medium text-gray-600">{b.published === false ? 'Draft' : 'Published'}</span>
                    </div>
                    <RowActions b={b} onFeature={() => toggleFeatured(b)} onEdit={() => go(`edit=${b.id}`)} onDuplicate={() => duplicate(b)} onDelete={() => remove(b)} />
                  </div>
                </li>
              ))}
            </ul>

            {filtered.length > limit && (
              <div className="p-4 text-center border-t border-gray-100">
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>Show more ({filtered.length - limit} left)</Button>
              </div>
            )}
          </>
        )}
      </Card>

      <BlogImport open={importOpen} onClose={() => setImportOpen(false)} existing={blogs} onImported={load} />
      <Flash />
    </div>
  )
}

function Thumb({ src, size = 'md' }: { src?: string; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-20 h-14' : 'w-14 h-10'
  return src ? (
    <img src={src} alt="" loading="lazy" className={cx(cls, 'rounded-lg object-cover bg-gray-100 shrink-0')} />
  ) : (
    <span className={cx(cls, 'rounded-lg bg-gray-100 text-gray-300 flex items-center justify-center shrink-0')}><ImageIcon className="w-4 h-4" /></span>
  )
}

function RowActions({ b, onFeature, onEdit, onDuplicate, onDelete }: { b: BlogPost; onFeature: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const live = b.published !== false
  const btn = 'p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors'
  return (
    <div className="inline-flex items-center gap-0.5">
      <button type="button" onClick={onFeature} title={b.isFeatured ? 'Lead post of its section (click to unset)' : 'Make lead post of its section'} className={cx(btn, b.isFeatured && 'text-amber-500 hover:text-amber-600')}>
        <Star className={cx('w-4 h-4', b.isFeatured && 'fill-amber-400')} />
      </button>
      <button type="button" onClick={onEdit} title="Edit" className={btn}><Edit3 className="w-4 h-4" /></button>
      {live ? (
        <a href={blogPath(b)} target="_blank" rel="noreferrer" title="View on site" className={btn}><ExternalLink className="w-4 h-4" /></a>
      ) : (
        <span title="Publish to view on the site" className={cx(btn, 'opacity-30 cursor-not-allowed hover:bg-transparent')}><ExternalLink className="w-4 h-4" /></span>
      )}
      <button type="button" onClick={onDuplicate} title="Duplicate as draft" className={btn}><Copy className="w-4 h-4" /></button>
      <button type="button" onClick={onDelete} title="Delete" className={cx(btn, 'hover:bg-red-50 hover:text-red-600')}><Trash2 className="w-4 h-4" /></button>
    </div>
  )
}
