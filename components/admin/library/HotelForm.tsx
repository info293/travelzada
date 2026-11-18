'use client'

/** Add / edit a hotel in the library (drawer). Staff-only fields are grouped in an amber "Only visible in admin" box. */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Drawer, Field, formatDate, inputClass } from '../ui'
import ImagePicker from '../proposal/builder/ImagePicker'
import { ChipsInput, LinesInput } from '../proposal/builder/fields'
import {
  createHotel, emptyHotelDraft, findDuplicateHotel, guessCategory, updateHotel, type HotelDraft, type LibraryHotel,
} from '@/lib/library/hotels'
import { slugify } from '@/lib/library/common'
import { FormSection, LIBRARY_IMAGE_FOLDER, QuoteLinks, SourceBadge, StaffOnlySection, selectClass } from './shared'

const CATEGORY_SUGGESTIONS = ['3-star', '4-star', '5-star', 'Resort', 'Boutique', 'Houseboat', 'Villa', 'Homestay', 'Camp', 'Heritage', 'Cruise']
const MEAL_SUGGESTIONS = ['Room only (EP)', 'Breakfast (CP)', 'Breakfast & dinner (MAP)', 'All meals (AP)', 'All inclusive']
const AMENITY_SUGGESTIONS = ['Pool', 'Spa', 'Free Wi-Fi', 'Gym', 'Restaurant', 'Bar', 'Lake view', 'Mountain view', 'Beach access', 'Heated rooms', 'Room service', 'Airport transfer']

function draftOf(h: LibraryHotel | null): HotelDraft {
  if (!h) return emptyHotelDraft()
  return {
    name: h.name, slug: h.slug, city: h.city, destination: h.destination, country: h.country, starRating: h.starRating, category: h.category,
    address: h.address || '', area: h.area || '', description: h.description || '', roomTypes: h.roomTypes, mealPlans: h.mealPlans,
    amenities: h.amenities, highlights: h.highlights, images: h.images, website: h.website || '', googleMapsUrl: h.googleMapsUrl || '',
    notes: h.notes || '', supplier: h.supplier || { name: '', phone: '', email: '' },
    typicalPricePerNight: h.typicalPricePerNight || { min: null, max: null, currency: 'INR', note: '' },
    tags: h.tags, publishable: h.publishable, seo: h.seo, source: h.source, staffEditedAt: h.staffEditedAt, updatedBy: h.updatedBy,
  }
}

export default function HotelForm({ open, hotel, all, by, onClose, onSaved, onOpenExisting, destinations }: {
  open: boolean
  hotel: LibraryHotel | null
  all: LibraryHotel[]
  by: string
  onClose: () => void
  onSaved: () => void
  onOpenExisting: (h: LibraryHotel) => void
  destinations: string[]
}) {
  const [d, setD] = useState<HotelDraft>(() => draftOf(hotel))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setD(draftOf(hotel)); setError('') } }, [open, hotel])

  const set = <K extends keyof HotelDraft>(k: K, v: HotelDraft[K]) => setD((p) => ({ ...p, [k]: v }))
  const dup = useMemo(() => (d.name.trim() ? findDuplicateHotel(all, d.name, d.city, hotel?.id) : null), [all, d.name, d.city, hotel?.id])
  const price = d.typicalPricePerNight || { min: null, max: null, currency: 'INR' as const, note: '' }
  const supplier = d.supplier || { name: '', phone: '', email: '' }

  const save = async () => {
    if (!d.name.trim()) { setError('Hotel name is required.'); return }
    if (dup) { setError('This hotel is already in the library — open it instead, or change the name / city.'); return }
    setSaving(true)
    setError('')
    try {
      if (hotel) await updateHotel(hotel, d, by)
      else await createHotel({ ...d, source: 'admin' }, by)
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Could not save the hotel.')
    } finally {
      setSaving(false)
    }
  }

  const folder = `${LIBRARY_IMAGE_FOLDER}/hotels/${slugify(d.slug || `${d.name} ${d.city}`).slice(0, 40)}`

  return (
    <Drawer open={open} onClose={onClose} width="max-w-2xl"
      title={hotel ? <span className="flex items-center gap-2">Edit hotel <SourceBadge source={hotel.source} /></span> : 'Add a hotel'}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>{hotel ? 'Save changes' : 'Add hotel'}</Button>
      </>}>
      <div className="space-y-6">
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {dup && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <b>{dup.name}</b>{dup.city ? ` (${dup.city})` : ''} is already in the library{dup.usageCount ? ` — used ${dup.usageCount}×` : ''}.{' '}
              <button type="button" className="font-semibold underline" onClick={() => onOpenExisting(dup)}>Open it</button>
            </div>
          </div>
        )}

        <FormSection title="Basics">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Hotel name *" className="sm:col-span-2"><input className={inputClass} value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="The Lalit Grand Palace" /></Field>
            <Field label="City"><input className={inputClass} value={d.city} onChange={(e) => set('city', e.target.value)} placeholder="Srinagar" /></Field>
            <Field label="Destination" hint="The trip it belongs to, e.g. Kashmir">
              <input className={inputClass} list="tz-lib-dests" value={d.destination} onChange={(e) => set('destination', e.target.value)} placeholder="Kashmir" />
              <datalist id="tz-lib-dests">{destinations.map((x) => <option key={x} value={x} />)}</datalist>
            </Field>
            <Field label="Country"><input className={inputClass} value={d.country} onChange={(e) => set('country', e.target.value)} placeholder="India" /></Field>
            <Field label="Area / locality"><input className={inputClass} value={d.area || ''} onChange={(e) => set('area', e.target.value)} placeholder="Dal Lake, Boulevard Road" /></Field>
            <Field label="Stars">
              <select className={selectClass + ' w-full'} value={d.starRating ?? 0} onChange={(e) => set('starRating', Number(e.target.value) || null)}>
                <option value={0}>Not rated</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}-star</option>)}
              </select>
            </Field>
            <Field label="Category" hint="e.g. 4-star, Resort, Houseboat">
              <input className={inputClass} list="tz-lib-cats" value={d.category} placeholder={guessCategory(d.name, d.starRating) || '4-star'} onChange={(e) => set('category', e.target.value)} />
              <datalist id="tz-lib-cats">{CATEGORY_SUGGESTIONS.map((x) => <option key={x} value={x} />)}</datalist>
            </Field>
            <Field label="Address" className="sm:col-span-2"><input className={inputClass} value={d.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Description" className="sm:col-span-2" hint="Why we like it — reused in quotes, and later on public pages">
              <textarea className={inputClass} rows={3} value={d.description || ''} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Rooms, meals & highlights">
          <Field label="Room types"><ChipsInput value={d.roomTypes} onChange={(v) => set('roomTypes', v)} placeholder="Deluxe Lake View, Suite…" /></Field>
          <Field label="Meal plans"><ChipsInput value={d.mealPlans} onChange={(v) => set('mealPlans', v)} suggestions={MEAL_SUGGESTIONS} /></Field>
          <Field label="Amenities"><ChipsInput value={d.amenities} onChange={(v) => set('amenities', v)} suggestions={AMENITY_SUGGESTIONS} /></Field>
          <Field label="Highlights" hint="One per line — filled into the room highlights of a quote">
            <LinesInput value={d.highlights} onChange={(v) => set('highlights', v)} rows={3} placeholder={'Private balcony over the lake\nWalking distance to the Boulevard'} />
          </Field>
          <Field label="Tags" hint="Free labels, e.g. honeymoon, family, lake-view"><ChipsInput value={d.tags} onChange={(v) => set('tags', v)} /></Field>
        </FormSection>

        <FormSection title="Photos" hint="Paste (Ctrl+V), drop or pick files — the first 3 are filled into a quote's room photos">
          <ImagePicker value={d.images} onChange={(v) => set('images', v)} folder={folder} max={12} captions />
        </FormSection>

        <FormSection title="Links">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Website"><input className={inputClass} value={d.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
            <Field label="Google Maps link"><input className={inputClass} value={d.googleMapsUrl || ''} onChange={(e) => set('googleMapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/…" /></Field>
          </div>
        </FormSection>

        <StaffOnlySection title="Supplier, rates & notes">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Supplier / sales contact"><input className={inputClass} value={supplier.name} onChange={(e) => set('supplier', { ...supplier, name: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputClass} value={supplier.phone} onChange={(e) => set('supplier', { ...supplier, phone: e.target.value })} inputMode="tel" /></Field>
            <Field label="Email"><input className={inputClass} value={supplier.email} onChange={(e) => set('supplier', { ...supplier, email: e.target.value })} type="email" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Price / night from (₹)"><input className={inputClass} type="number" min={0} value={price.min ?? ''} onChange={(e) => set('typicalPricePerNight', { ...price, min: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            <Field label="to (₹)"><input className={inputClass} type="number" min={0} value={price.max ?? ''} onChange={(e) => set('typicalPricePerNight', { ...price, max: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            <Field label="Rate note" className="col-span-2"><input className={inputClass} value={price.note} placeholder="Net, double room, CP, off-season" onChange={(e) => set('typicalPricePerNight', { ...price, note: e.target.value })} /></Field>
          </div>
          <Field label="Internal notes"><textarea className={inputClass} rows={3} value={d.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Ask for lake-facing rooms; early check-in usually OK…" /></Field>
        </StaffOnlySection>

        <FormSection title="Website (later)" hint="Nothing is published yet. These fields prepare the hotel for future public pages.">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={d.publishable} onChange={(e) => set('publishable', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-bordeaux-600" />
            OK to show on the public website later
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="URL slug" hint="Unique; made from name + city"><input className={inputClass} value={d.slug || ''} placeholder={slugify(`${d.name} ${d.city}`)} onChange={(e) => set('slug', e.target.value)} /></Field>
            <Field label="SEO title"><input className={inputClass} value={d.seo.title} onChange={(e) => set('seo', { ...d.seo, title: e.target.value })} /></Field>
            <Field label="SEO description" className="sm:col-span-2"><textarea className={inputClass} rows={2} value={d.seo.description} onChange={(e) => set('seo', { ...d.seo, description: e.target.value })} /></Field>
          </div>
        </FormSection>

        {hotel && (
          <FormSection title="Usage">
            <p className="text-sm text-gray-600">Used in <b>{hotel.usageCount}</b> quote{hotel.usageCount === 1 ? '' : 's'}{hotel.lastUsedAt ? ` · last on ${formatDate(hotel.lastUsedAt)}` : ''} · added {formatDate(hotel.createdAt)}{hotel.createdBy ? ` by ${hotel.createdBy}` : ''}</p>
            <QuoteLinks ids={hotel.quoteIds} refs={hotel.quoteRefs} />
          </FormSection>
        )}
      </div>
    </Drawer>
  )
}
