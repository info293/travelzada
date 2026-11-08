'use client'

/**
 * Destination editor: essentials first, the package list as a picker, everything else in
 * collapsed "More" sections. Controlled — the page owns state and saving.
 */
import { useMemo } from 'react'
import ImageUploader from '@/components/admin/ImageUploader'
import { Button, inputClass } from '@/components/admin/ui'
import { Collapsible, FormField, LinesInput, RowsEditor, SectionTitle, Segmented, Toggle, errorInput } from './fields'
import PackagePicker from './PackagePicker'
import { autoMatches, slugify, slugTyping } from './packageUtils'
import type { DestinationRecord, FaqItem, PackageDraft } from './types'

export type DestinationErrors = Partial<Record<'name' | 'country' | 'slug', string>>

export function validateDestination(d: Partial<DestinationRecord>, others: DestinationRecord[], slug: string): DestinationErrors {
  const e: DestinationErrors = {}
  if (!String(d.name || '').trim()) e.name = 'Give the destination a name.'
  if (!String(d.country || '').trim()) e.country = 'Which country is it in?'
  if (!slug) e.slug = 'A web address is needed.'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) e.slug = 'Use only lowercase letters, numbers and dashes.'
  else if (others.some((o) => o.id !== d.id && String(o.slug || '').toLowerCase() === slug)) e.slug = 'Another destination already uses this web address.'
  return e
}

type City = { cityName: string; url: string }
type Guide = { title: string; description: string; url?: string }

export default function DestinationForm({
  draft,
  set,
  packages,
  errors,
  suggestedSlug,
}: {
  draft: Partial<DestinationRecord>
  set: (patch: Partial<DestinationRecord>) => void
  packages: PackageDraft[]
  errors: DestinationErrors
  suggestedSlug: string
}) {
  const d = draft
  const linked = d.packageIds || []
  const autoList = useMemo(() => (d.name || d.slug ? packages.filter((p) => autoMatches({ ...(d as DestinationRecord), slug: d.slug || suggestedSlug }, p)) : []), [packages, d, suggestedSlug])

  return (
    <div className="space-y-6">
      {/* Essentials */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Name" required error={errors.name}>
          <input value={d.name || ''} onChange={(e) => set({ name: e.target.value })} className={errorInput(errors.name)} placeholder="Bali" autoFocus={!d.id} />
        </FormField>
        <FormField label="Country" required error={errors.country}>
          <input value={d.country || ''} onChange={(e) => set({ country: e.target.value })} className={errorInput(errors.country)} placeholder="Indonesia" />
        </FormField>
        <FormField label="Region" hint="Decides the India / International rails on the homepage">
          <Segmented value={d.region || 'International'} onChange={(v) => set({ region: v })} options={[{ value: 'India', label: 'India' }, { value: 'International', label: 'International' }]} />
        </FormField>
        <div className="flex items-end">
          <Toggle checked={!!d.featured} onChange={(v) => set({ featured: v })} label="Featured" hint="Highlight this destination" />
        </div>
      </div>

      <ImageUploader label="Cover photo" value={d.image || ''} onChange={(url) => set({ image: url })} folder="/destinations" />

      <FormField label="Description" hint="Shown at the top of the destination page and in Google results.">
        <textarea rows={4} value={d.description || ''} onChange={(e) => set({ description: e.target.value })} className={inputClass} placeholder="Island of temples, rice terraces and sunsets…" />
      </FormField>

      {/* Packages */}
      <div className="rounded-xl border border-gray-200 p-4">
        <SectionTitle
          title={`Packages on this page (${linked.length || autoList.length})`}
          description={
            linked.length
              ? 'Only the packages selected below are shown on the destination page.'
              : `Automatic: the site shows packages whose name or code contains “${d.slug || suggestedSlug || d.name || '…'}”. Select packages to choose them yourself.`
          }
          right={
            linked.length ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => set({ packageIds: [] })}>Switch to automatic</Button>
            ) : autoList.length ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => set({ packageIds: autoList.map((p) => String(p.Destination_ID)).filter(Boolean) })}>
                Pick these {autoList.length} manually
              </Button>
            ) : undefined
          }
        />
        {!linked.length && autoList.length > 0 && (
          <p className="mb-3 line-clamp-2 text-xs text-gray-500">Currently matched: {autoList.map((p) => p.Destination_Name).join(', ')}</p>
        )}
        <PackagePicker value={linked} onChange={(ids) => set({ packageIds: ids })} packages={packages} />
      </div>

      {/* Rarely used */}
      <div className="space-y-3">
        <Collapsible title="Web address" description={`travelzada.com/destinations/${d.slug || suggestedSlug || '…'}`}>
          <FormField label="Slug" error={errors.slug} auto={!d.slug} hint={d.id ? 'Changing this breaks existing links to the page.' : 'Made from the name — change only if needed.'}>
            <input value={d.slug || ''} onChange={(e) => set({ slug: slugTyping(e.target.value) })} onBlur={() => d.slug && set({ slug: slugify(d.slug) })} className={errorInput(errors.slug)} placeholder={suggestedSlug} />
          </FormField>
        </Collapsible>

        <Collapsible title="FAQs" count={d.faqs?.length} description="Shown on the destination page">
          <RowsEditor<FaqItem>
            rows={d.faqs || []}
            onChange={(rows) => set({ faqs: rows })}
            empty={() => ({ question: '', answer: '' })}
            addLabel="Add question"
            rowTitle={(r, i) => r.question || `Question ${i + 1}`}
            fields={[
              { key: 'question', label: 'Question', placeholder: 'Do I need a visa?' },
              { key: 'answer', label: 'Answer', type: 'textarea' },
            ]}
          />
        </Collapsible>

        <Collapsible title="Quick facts" description="Best time, trip length, currency, language, rating">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Best time to visit"><input value={d.bestTimeToVisit || ''} onChange={(e) => set({ bestTimeToVisit: e.target.value })} className={inputClass} placeholder="April – October" /></FormField>
            <FormField label="Ideal trip length"><input value={d.duration || ''} onChange={(e) => set({ duration: e.target.value })} className={inputClass} placeholder="5–7 days" /></FormField>
            <FormField label="Currency"><input value={d.currency || ''} onChange={(e) => set({ currency: e.target.value })} className={inputClass} placeholder="Indonesian Rupiah (IDR)" /></FormField>
            <FormField label="Language"><input value={d.language || ''} onChange={(e) => set({ language: e.target.value })} className={inputClass} placeholder="Bahasa Indonesia, English" /></FormField>
            <FormField label="Rating" hint="4.0 – 5.0">
              <input type="number" step="0.1" min={0} max={5} value={d.rating ?? ''} onChange={(e) => set({ rating: e.target.value === '' ? null : Number(e.target.value) })} className={inputClass} placeholder="4.8" />
            </FormField>
          </div>
        </Collapsible>

        <Collapsible title="Highlights & activities" count={(d.highlights?.length || 0) + (d.activities?.length || 0)}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Highlights" hint="One per line"><LinesInput value={d.highlights || []} onChange={(v) => set({ highlights: v })} rows={5} placeholder={'Uluwatu temple sunset\nUbud rice terraces'} /></FormField>
            <FormField label="Activities" hint="One per line"><LinesInput value={d.activities || []} onChange={(v) => set({ activities: v })} rows={5} placeholder={'Snorkelling\nWhite-water rafting'} /></FormField>
          </div>
        </Collapsible>

        <Collapsible title="More sections" description="Budget guide, hotel types, city landing links, travel guides">
          <div>
            <SectionTitle title="Budget guide" description="Typical price per person" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(['budget', 'midRange', 'luxury'] as const).map((k) => (
                <FormField key={k} label={k === 'budget' ? 'Budget' : k === 'midRange' ? 'Mid-range' : 'Luxury'}>
                  <input value={d.budgetRange?.[k] || ''} onChange={(e) => set({ budgetRange: { ...(d.budgetRange || {}), [k]: e.target.value } })} className={inputClass} placeholder={k === 'budget' ? '₹40,000' : k === 'midRange' ? '₹70,000' : '₹1,50,000'} />
                </FormField>
              ))}
            </div>
          </div>
          <FormField label="Hotel types" hint="One per line"><LinesInput value={d.hotelTypes || []} onChange={(v) => set({ hotelTypes: v })} rows={3} placeholder={'Beach resorts\nPool villas'} /></FormField>
          <div>
            <SectionTitle title="“From airport” city links" />
            <RowsEditor<City> rows={d.airportCities || []} onChange={(rows) => set({ airportCities: rows })} empty={() => ({ cityName: '', url: '' })} addLabel="Add city" rowTitle={(r, i) => r.cityName || `City ${i + 1}`}
              fields={[{ key: 'cityName', label: 'City', span: 2, placeholder: 'Delhi' }, { key: 'url', label: 'Link', span: 4, placeholder: '/destinations/bali/tours/from-delhi' }]} />
          </div>
          <div>
            <SectionTitle title="“From India” city links" />
            <RowsEditor<City> rows={d.fromIndiaCities || []} onChange={(rows) => set({ fromIndiaCities: rows })} empty={() => ({ cityName: '', url: '' })} addLabel="Add city" rowTitle={(r, i) => r.cityName || `City ${i + 1}`}
              fields={[{ key: 'cityName', label: 'City', span: 2, placeholder: 'Bangalore' }, { key: 'url', label: 'Link', span: 4, placeholder: '/destinations/bali/tours/from-bangalore' }]} />
          </div>
          <div>
            <SectionTitle title="Travel guides" />
            <RowsEditor<Guide> rows={d.travelGuides || []} onChange={(rows) => set({ travelGuides: rows })} empty={() => ({ title: '', description: '', url: '' })} addLabel="Add guide" rowTitle={(r, i) => r.title || `Guide ${i + 1}`}
              fields={[{ key: 'title', label: 'Title', span: 3, placeholder: 'Best time to visit' }, { key: 'url', label: 'Link (optional)', span: 3, placeholder: '/blog/bali-weather-guide' }, { key: 'description', label: 'Description', type: 'textarea' }]} />
          </div>
        </Collapsible>
      </div>
    </div>
  )
}
