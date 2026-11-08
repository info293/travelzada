'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { Edit3, ExternalLink, FileText, MapPin, Plus, Trash2, UserRound } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import ImageUploader from '@/components/admin/ImageUploader'
import { Button, Card, Drawer, EmptyState, Field, PageHeader, SearchInput, Spinner, Toolbar, cx, inputClass } from '@/components/admin/ui'
import { Avatar, ChipInput, Collapsible, fetchNewestFirst, slugify, useFlash } from '@/components/admin/content/shared'
import type { Author, BlogPost } from '@/components/admin/content/types'

type Form = {
  name: string
  slug: string
  role: string
  shortBio: string
  bio: string
  photo: string
  location: string
  expertise: string[]
  twitter: string
  linkedin: string
  instagram: string
  website: string
}

const EMPTY: Form = { name: '', slug: '', role: '', shortBio: '', bio: '', photo: '', location: '', expertise: [], twitter: '', linkedin: '', instagram: '', website: '' }

export default function AdminAuthorsPage() {
  const { currentUser } = useAuth()
  const [authors, setAuthors] = useState<Author[]>([])
  const [blogs, setBlogs] = useState<Pick<BlogPost, 'id' | 'author' | 'authorSlug'>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Author | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { flash, Flash } = useFlash()

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetchNewestFirst<Author>('authors', 'createdAt'),
        fetchNewestFirst<BlogPost>('blogs', 'createdAt').catch(() => [] as BlogPost[]),
      ])
      setAuthors(a)
      setBlogs(b.map(({ id, author, authorSlug }) => ({ id, author, authorSlug })))
    } catch (e) {
      console.error('Error loading authors:', e)
      flash('Could not load authors', 'error')
    } finally {
      setLoading(false)
    }
  }, [flash])

  useEffect(() => { if (currentUser) load() }, [currentUser, load])

  /** Posts are linked by authorSlug; older posts only by matching name */
  const postsOf = useCallback(
    (a: Pick<Author, 'slug' | 'name'>) => blogs.filter((b) => (b.authorSlug ? b.authorSlug === a.slug : b.author === a.name)),
    [blogs],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return authors.filter((a) => !q || [a.name, a.role, a.slug, a.location, ...(a.expertise || [])].some((v) => String(v || '').toLowerCase().includes(q)))
  }, [authors, search])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setSlugTouched(false)
    setError('')
    setOpen(true)
  }

  const openEdit = (a: Author) => {
    setEditing(a)
    setForm({
      name: a.name || '', slug: a.slug || '', role: a.role || '', shortBio: a.shortBio || '', bio: a.bio || '', photo: a.photo || '',
      location: a.location || '', expertise: Array.isArray(a.expertise) ? a.expertise : [],
      twitter: a.socialLinks?.twitter || '', linkedin: a.socialLinks?.linkedin || '', instagram: a.socialLinks?.instagram || '', website: a.socialLinks?.website || '',
    })
    setSlugTouched(true)
    setError('')
    setOpen(true)
  }

  const effectiveSlug = slugify(form.slug || form.name)
  const slugClash = authors.some((a) => a.id !== editing?.id && a.slug === effectiveSlug)
  const linkedCount = editing ? postsOf(editing).length : 0

  const save = async () => {
    setError('')
    if (!form.name.trim()) return setError('Name is required.')
    if (!effectiveSlug) return setError('Slug is required.')
    if (slugClash) return setError(`Another author already uses “${effectiveSlug}”.`)
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const data: Omit<Author, 'id'> = {
        name: form.name.trim(),
        slug: effectiveSlug,
        role: form.role.trim(),
        shortBio: form.shortBio.trim(),
        bio: form.bio.trim(),
        photo: form.photo,
        location: form.location.trim(),
        expertise: form.expertise,
        socialLinks: { twitter: form.twitter.trim(), linkedin: form.linkedin.trim(), instagram: form.instagram.trim(), website: form.website.trim() },
        updatedAt: now,
      }
      if (editing?.id) {
        await updateDoc(doc(db, 'authors', editing.id), data as any)
        // Blog posts store a copy of the author's name/photo/slug — keep them in sync
        const changed = editing.name !== data.name || (editing.photo || '') !== data.photo || editing.slug !== data.slug
        const linked = postsOf(editing).filter((b) => b.id)
        if (changed && linked.length) {
          for (let i = 0; i < linked.length; i += 400) {
            const batch = writeBatch(db)
            linked.slice(i, i + 400).forEach((b) => batch.update(doc(db, 'blogs', b.id!), { author: data.name, authorSlug: data.slug, authorImage: data.photo || '' }))
            await batch.commit()
          }
          setBlogs((list) => list.map((b) => (linked.some((l) => l.id === b.id) ? { ...b, author: data.name, authorSlug: data.slug } : b)))
        }
        setAuthors((list) => list.map((a) => (a.id === editing.id ? { ...a, ...data } : a)))
        flash(changed && linked.length ? `Author saved · ${linked.length} post${linked.length === 1 ? '' : 's'} updated` : 'Author saved')
      } else {
        const ref = await addDoc(collection(db, 'authors'), { ...data, createdAt: now })
        setAuthors((list) => [{ ...data, createdAt: now, id: ref.id }, ...list])
        flash('Author created')
      }
      setOpen(false)
    } catch (e: any) {
      console.error('Error saving author:', e)
      setError(e?.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (a: Author) => {
    if (!a.id) return
    const n = postsOf(a).length
    const msg = n
      ? `Delete ${a.name}? ${n} post${n === 1 ? ' still shows' : 's still show'} this author's name, but the profile page and link will stop working.`
      : `Delete ${a.name}? This cannot be undone.`
    if (!confirm(msg)) return
    try {
      await deleteDoc(doc(db, 'authors', a.id))
      setAuthors((list) => list.filter((x) => x.id !== a.id))
      setOpen(false)
      flash('Author deleted')
    } catch (e) {
      console.error(e)
      flash('Could not delete', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Authors"
        description="Profiles shown on blog posts and on /author pages."
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> New author</Button>}
      />

      {authors.length > 6 && (
        <Toolbar>
          <span className="text-sm text-gray-500">{authors.length} authors</span>
          <SearchInput value={search} onChange={setSearch} placeholder="Search authors…" className="md:w-72" />
        </Toolbar>
      )}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserRound className="w-6 h-6" />}
            title={authors.length ? 'No authors match your search' : 'No authors yet'}
            description={authors.length ? undefined : 'Create author profiles so each post shows who wrote it and links to their page.'}
            action={!authors.length && <Button onClick={openNew}><Plus className="w-4 h-4" /> New author</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const n = postsOf(a).length
            return (
              <Card key={a.id} className="flex flex-col">
                <button type="button" onClick={() => openEdit(a)} className="flex items-start gap-3 text-left group">
                  <Avatar src={a.photo} name={a.name} size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 group-hover:text-bordeaux-700 truncate">{a.name}</p>
                    {a.role && <p className="text-sm text-gray-500 truncate">{a.role}</p>}
                    {a.location && <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{a.location}</p>}
                  </div>
                </button>
                {(a.shortBio || a.bio) && <p className="mt-3 text-sm text-gray-600 line-clamp-2">{a.shortBio || a.bio}</p>}
                {!!a.expertise?.length && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {a.expertise.slice(0, 4).map((e) => <span key={e} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{e}</span>)}
                    {a.expertise.length > 4 && <span className="text-xs text-gray-400 px-1">+{a.expertise.length - 4}</span>}
                  </div>
                )}
                <div className="flex-1 min-h-[1rem]" />
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                  <Link href={`/admin/blogs?q=${encodeURIComponent(a.name)}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-bordeaux-700">
                    <FileText className="w-3.5 h-3.5" /> {n} post{n === 1 ? '' : 's'}
                  </Link>
                  <div className="flex items-center gap-0.5">
                    <a href={`/author/${a.slug}`} target="_blank" rel="noreferrer" title="View profile" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"><ExternalLink className="w-4 h-4" /></a>
                    <button type="button" onClick={() => openEdit(a)} title="Edit" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"><Edit3 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => remove(a)} title="Delete" className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'New author'}
        footer={
          <>
            {editing && <Button variant="ghost" className="mr-auto text-red-600 hover:bg-red-50" onClick={() => remove(editing)}><Trash2 className="w-4 h-4" /> Delete</Button>}
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing ? 'Save' : 'Create author'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex items-start gap-4">
            <div className="w-28 shrink-0">
              <ImageUploader value={form.photo} onChange={(url) => set('photo', url)} folder="/authors" compact placeholder="Photo" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <Field label="Name *">
                <input
                  value={form.name}
                  onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', '') }}
                  placeholder="Priya Sharma"
                  className={inputClass}
                  autoFocus
                />
              </Field>
              <Field label="Role">
                <input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Senior Travel Writer" className={inputClass} />
              </Field>
            </div>
          </div>
          <Field label="Short bio" hint={`${form.shortBio.length}/160 · shown under posts and in Google`}>
            <input value={form.shortBio} onChange={(e) => set('shortBio', e.target.value)} maxLength={200} placeholder="One line about the author" className={inputClass} />
          </Field>
          <Field label="Full bio" hint="Shown on the author's profile page">
            <textarea rows={5} value={form.bio} onChange={(e) => set('bio', e.target.value)} className={cx(inputClass, 'resize-y')} />
          </Field>
          <Field label="Expertise" hint="Press Enter after each topic">
            <ChipInput value={form.expertise} onChange={(v) => set('expertise', v)} placeholder="Honeymoons, Bali, Budget travel…" />
          </Field>

          <Collapsible title="Profile link, location & social" hint={`travelzada.com/author/${effectiveSlug || '…'}`}>
            <Field label="Profile URL slug" hint={slugClash ? '⚠ Already used by another author' : editing && linkedCount ? `Changing it also updates ${linkedCount} linked post${linkedCount === 1 ? '' : 's'}.` : 'Auto-created from the name'}>
              <input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-')) }}
                onBlur={() => form.slug && set('slug', slugify(form.slug))}
                placeholder={slugify(form.name) || 'priya-sharma'}
                className={cx(inputClass, 'font-mono text-xs', slugClash && 'border-red-400')}
              />
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Mumbai, India" className={inputClass} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Instagram"><input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/…" className={inputClass} /></Field>
              <Field label="LinkedIn"><input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/…" className={inputClass} /></Field>
              <Field label="X / Twitter"><input value={form.twitter} onChange={(e) => set('twitter', e.target.value)} placeholder="https://x.com/…" className={inputClass} /></Field>
              <Field label="Website"><input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" className={inputClass} /></Field>
            </div>
          </Collapsible>
        </div>
      </Drawer>

      <Flash />
    </div>
  )
}
