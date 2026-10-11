'use client'

import { useRef, useState } from 'react'
import { Check, ImagePlus, Loader2, Minus, Plus, Trash2, X } from 'lucide-react'
import { DECOR_CATEGORIES } from '@/lib/aiImagesCatalog'
import { addCatalogItem, deleteCatalogItem, formatINR, uploadImage, type CatalogItem } from '@/lib/decorStore'

// Product photos are sent to the image model on every render, so they are kept small
const ITEM_PHOTO_EDGE = 900

function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('That file is not a supported image'))
    img.onload = () => {
      const scale = Math.min(1, ITEM_PHOTO_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * The vendor's own items: real photo + real price. Selected items are placed in the hall exactly as
 * photographed, so the customer only ever sees what can actually be delivered.
 */
export default function CatalogPanel({
  vendorId, catalog, setCatalog, selected, setSelected, loading,
}: {
  vendorId: string
  catalog: CatalogItem[]
  setCatalog: (items: CatalogItem[]) => void
  /** catalogue item id → quantity */
  selected: Record<string, number>
  setSelected: (next: Record<string, number>) => void
  loading: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(DECOR_CATEGORIES[0].label)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const toggle = (id: string) => {
    const next = { ...selected }
    if (next[id]) delete next[id]
    else next[id] = 1
    setSelected(next)
  }
  const setQty = (id: string, qty: number) => setSelected({ ...selected, [id]: Math.min(500, Math.max(1, qty)) })

  const save = async () => {
    if (!name.trim()) return setFormError('Give the item a name.')
    if (!photo) return setFormError('Add a photo of the real item.')
    setSaving(true)
    setFormError(null)
    try {
      const imageUrl = await uploadImage(photo, '/decor-catalog', `item_${Date.now()}`)
      const item = await addCatalogItem({
        vendorId,
        name: name.trim(),
        category,
        description: description.trim(),
        price: Math.max(0, Number(price) || 0),
        imageUrl,
      })
      setCatalog([item, ...catalog])
      setSelected({ ...selected, [item.id]: 1 })
      setName(''); setPrice(''); setDescription(''); setPhoto(null); setAdding(false)
    } catch (err: any) {
      setFormError(err.message || 'Could not save the item')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item: CatalogItem) => {
    if (!window.confirm(`Remove "${item.name}" from your catalogue?`)) return
    await deleteCatalogItem(item.id)
    setCatalog(catalog.filter((c) => c.id !== item.id))
    if (selected[item.id]) {
      const next = { ...selected }
      delete next[item.id]
      setSelected(next)
    }
  }

  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">My catalogue</p>
          <p className="text-xs text-gray-500">Your real items, placed exactly as photographed</p>
        </div>
        <button
          type="button"
          onClick={() => { setAdding((a) => !a); setFormError(null) }}
          className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white hover:bg-ink/90"
        >
          {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {adding ? 'Close' : 'Add item'}
        </button>
      </div>

      {adding && (
        <div className="mb-3 space-y-2 rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary/50"
              title="Add a photo of the item"
            >
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
            </button>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Item name — e.g. Royal gold mandap"
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  {DECOR_CATEGORIES.map((c) => <option key={c.id}>{c.label}</option>)}
                </select>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  placeholder="Price ₹ each"
                  className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            placeholder="Short description (helps the AI) — e.g. 4-pillar gold mandap with red drapes"
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) setPhoto(await shrink(file).catch((err) => { setFormError(err.message); return null }))
            }}
          />
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save to catalogue
          </button>
        </div>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your catalogue…</p>
      ) : catalog.length === 0 && !adding ? (
        <p className="text-xs text-gray-500">
          No items yet. Add your stages, mandaps, centerpieces and chairs with a photo and price — customers will then see exactly what you deliver, with a live total.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {catalog.map((item) => {
            const qty = selected[item.id]
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border bg-white p-2 transition ${qty ? 'border-primary ring-1 ring-primary/30' : 'border-gray-200'}`}
              >
                <button type="button" onClick={() => toggle(item.id)} className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  {qty && (
                    <span className="absolute inset-0 flex items-center justify-center bg-primary/60 text-white"><Check className="h-5 w-5" /></span>
                  )}
                </button>
                <button type="button" onClick={() => toggle(item.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.category} · {item.price ? `${formatINR(item.price)} each` : 'No price set'}</p>
                </button>
                {qty ? (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setQty(item.id, qty - 1)} className="rounded-md border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"><Minus className="h-3 w-3" /></button>
                    <input
                      value={qty}
                      onChange={(e) => setQty(item.id, Number(e.target.value.replace(/[^0-9]/g, '')) || 1)}
                      inputMode="numeric"
                      className="w-10 rounded-md border border-gray-200 py-0.5 text-center text-sm"
                      aria-label={`Quantity of ${item.name}`}
                    />
                    <button type="button" onClick={() => setQty(item.id, qty + 1)} className="rounded-md border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"><Plus className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => remove(item)} title="Remove from catalogue" className="rounded-md p-1.5 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
