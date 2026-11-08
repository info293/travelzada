'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { Edit3, MessageSquareQuote, Plus, Star, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Button, Card, Drawer, EmptyState, Field, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow, Toolbar, cx, formatDate, inputClass,
} from '@/components/admin/ui'
import { Avatar, Stars, Toggle, fetchNewestFirst, useFlash } from '@/components/admin/content/shared'
import type { Testimonial } from '@/components/admin/content/types'

type Filter = 'all' | 'featured' | 'hidden'
type Form = { name: string; rating: number; quote: string; featured: boolean }
const EMPTY: Form = { name: '', rating: 5, quote: '', featured: true }

export default function AdminTestimonialsPage() {
  const { currentUser } = useAuth()
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { flash, Flash } = useFlash()

  const load = useCallback(async () => {
    try {
      const rows = await fetchNewestFirst<Testimonial>('testimonials', 'createdAt')
      setItems(rows.map((r) => ({ ...r, rating: Number(r.rating) || 5, featured: !!r.featured })))
    } catch (e) {
      console.error('Error loading testimonials:', e)
      flash('Could not load testimonials', 'error')
    } finally {
      setLoading(false)
    }
  }, [flash])

  useEffect(() => { if (currentUser) load() }, [currentUser, load])

  const counts = useMemo(() => {
    const featured = items.filter((t) => t.featured).length
    const avg = items.length ? items.reduce((s, t) => s + (t.rating || 0), 0) / items.length : 0
    return { all: items.length, featured, hidden: items.length - featured, avg }
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((t) => {
      if (filter === 'featured' && !t.featured) return false
      if (filter === 'hidden' && t.featured) return false
      return !q || `${t.name} ${t.quote}`.toLowerCase().includes(q)
    })
  }, [items, filter, search])

  const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true) }
  const openEdit = (t: Testimonial) => {
    setEditing(t)
    setForm({ name: t.name || '', rating: t.rating || 5, quote: t.quote || '', featured: !!t.featured })
    setError('')
    setOpen(true)
  }

  const toggleFeatured = async (t: Testimonial) => {
    if (!t.id) return
    const featured = !t.featured
    setItems((l) => l.map((x) => (x.id === t.id ? { ...x, featured } : x)))
    try {
      await updateDoc(doc(db, 'testimonials', t.id), { featured, updatedAt: new Date().toISOString() })
      flash(featured ? 'Now shown on the homepage' : 'Hidden from the homepage')
    } catch (e) {
      console.error(e)
      setItems((l) => l.map((x) => (x.id === t.id ? t : x)))
      flash('Could not update', 'error')
    }
  }

  const save = async () => {
    setError('')
    if (!form.name.trim()) return setError('Add the customer’s name.')
    if (!form.quote.trim()) return setError('Add what they said.')
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const data = { name: form.name.trim(), rating: form.rating, quote: form.quote.trim(), featured: form.featured, updatedAt: now }
      if (editing?.id) {
        await updateDoc(doc(db, 'testimonials', editing.id), data)
        setItems((l) => l.map((x) => (x.id === editing.id ? { ...x, ...data } : x)))
        flash('Testimonial saved')
      } else {
        const ref = await addDoc(collection(db, 'testimonials'), { ...data, createdAt: now })
        setItems((l) => [{ ...data, createdAt: now, id: ref.id }, ...l])
        flash('Testimonial added')
      }
      setOpen(false)
    } catch (e: any) {
      console.error('Error saving testimonial:', e)
      setError(e?.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: Testimonial) => {
    if (!t.id || !confirm(`Delete the review from ${t.name}?`)) return
    try {
      await deleteDoc(doc(db, 'testimonials', t.id))
      setItems((l) => l.filter((x) => x.id !== t.id))
      setOpen(false)
      flash('Testimonial deleted')
    } catch (e) {
      console.error(e)
      flash('Could not delete', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Testimonials"
        description="Customer reviews. Featured ones appear in the homepage carousel."
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> Add testimonial</Button>}
      />

      <StatRow>
        <StatCard label="All reviews" value={counts.all} icon={<MessageSquareQuote className="w-5 h-5" />} onClick={() => setFilter('all')} />
        <StatCard label="On homepage" value={counts.featured} tone="green" icon={<Star className="w-5 h-5" />} onClick={() => setFilter('featured')} />
        <StatCard label="Hidden" value={counts.hidden} tone="gray" icon={<Star className="w-5 h-5" />} onClick={() => setFilter('hidden')} />
        <StatCard label="Average rating" value={counts.avg ? counts.avg.toFixed(1) : '—'} tone="amber" icon={<Star className="w-5 h-5 fill-amber-400" />} />
      </StatRow>

      <Toolbar>
        <FilterChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'featured', label: 'On homepage', count: counts.featured },
            { value: 'hidden', label: 'Hidden', count: counts.hidden },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or text…" className="md:w-72" />
      </Toolbar>

      {counts.all > 0 && counts.featured === 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          No review is turned on for the homepage, so it may show built-in sample reviews instead. Switch on “Homepage” for the ones you want shown.
        </div>
      )}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageSquareQuote className="w-6 h-6" />}
            title={items.length ? 'Nothing matches' : 'No testimonials yet'}
            description={items.length ? undefined : 'Add a few happy-customer quotes to show on the homepage.'}
            action={!items.length && <Button onClick={openNew}><Plus className="w-4 h-4" /> Add testimonial</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className={cx('flex flex-col', !t.featured && 'bg-gray-50/60')}>
              <div className="flex items-center gap-3">
                <Avatar name={t.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                  <Stars value={t.rating} />
                </div>
              </div>
              <button type="button" onClick={() => openEdit(t)} className="mt-3 text-left text-sm text-gray-700 leading-relaxed line-clamp-4 hover:text-gray-900">
                “{t.quote}”
              </button>
              <div className="mt-auto pt-4">
                <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Toggle checked={!!t.featured} onChange={() => toggleFeatured(t)} />
                    <span className="text-xs font-medium text-gray-600">Homepage</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-gray-400 mr-1 hidden sm:inline">{formatDate(t.createdAt)}</span>
                    <button type="button" onClick={() => openEdit(t)} title="Edit" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"><Edit3 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => remove(t)} title="Delete" className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit testimonial' : 'Add testimonial'}
        width="max-w-lg"
        footer={
          <>
            {editing && <Button variant="ghost" className="mr-auto text-red-600 hover:bg-red-50" onClick={() => remove(editing)}><Trash2 className="w-4 h-4" /> Delete</Button>}
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing ? 'Save' : 'Add'}</Button>
          </>
        }
      >
        <div className="space-y-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Field label="Customer name" hint="e.g. “Aarav & Riya” or “Neha, Delhi”">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} autoFocus />
          </Field>
          <div>
            <span className="block text-xs font-semibold text-gray-700 mb-1">Rating</span>
            <Stars value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} size="lg" />
          </div>
          <Field label="What they said" hint={`${form.quote.length} characters · 1–3 sentences read best`}>
            <textarea rows={5} value={form.quote} onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))} className={cx(inputClass, 'resize-y')} />
          </Field>
          <Card className="!p-4">
            <Toggle checked={form.featured} onChange={(featured) => setForm((f) => ({ ...f, featured }))} label="Show on homepage" hint="Featured reviews appear in the homepage carousel" />
          </Card>
        </div>
      </Drawer>

      <Flash />
    </div>
  )
}
