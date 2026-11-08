'use client'

/**
 * Package editor. Grouped into 5 short tabs; anything that can be computed is computed:
 *  - Nights → Duration ("5N / 6D"), Duration_Nights, Duration_Days
 *  - Price from / up to → Price_Min_INR, Price_Max_INR, Price_Range_INR (the site shows only the "from" price)
 *  - One structured day-by-day list → Day_Wise_Itinerary_Details + the old "Day 1: … | Day 2: …" text
 *  - Slug, SEO title/description, Meta_Image_URL, Last_Updated, Created_By are filled on save
 *
 * Controlled component: the parent owns `formData` and saving. Props stay compatible with the
 * old admin page (formData / setFormData / editingPackage / onSubmit / onCancel).
 */
import { FormEvent, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, ExternalLink, Image as ImageIcon, ListChecks, Search, Sparkles, Tag, Wand2 } from 'lucide-react'
import ImageUploader from './ImageUploader'
import { Button, cx, inputClass } from './ui'
import { ChipSelect, Collapsible, FormField, LinesInput, RowsEditor, SectionTitle, YesNo, errorInput } from './catalog/fields'
import {
  ERROR_TAB,
  TAGS,
  applyDerived,
  durationLabel,
  formatIN,
  itineraryRows,
  nextPackageCode,
  packageSiteUrl,
  prefixForDestination,
  slugify,
  slugTyping,
  splitList,
  suggestSeoDescription,
  suggestSeoTitle,
  tagValues,
  toNum,
  validatePackage,
  type FormErrors,
  type TagField,
  type TagSuggestions,
} from './catalog/packageUtils'
import type { DestinationRecord, FaqItem, GuestReview, ItineraryDay, PackageDraft, WhyBookItem } from './catalog/types'
import AiCreatePanel, { AiDraftBanner, type AiCreateResponse } from './catalog/ai/AiCreatePanel'
import { AiImagesPanel, GalleryEditor } from './catalog/ai/AiImagesPanel'
import SeoFixButton from '@/components/admin/seo/SeoFixButton'

type TabId = 'basics' | 'details' | 'tags' | 'extras' | 'seo'
const TABS: Array<{ id: TabId; label: string; icon: typeof Sparkles }> = [
  { id: 'basics', label: 'Basics', icon: Sparkles },
  { id: 'details', label: 'Trip details', icon: CalendarDays },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'extras', label: 'Page extras', icon: ListChecks },
  { id: 'seo', label: 'SEO & advanced', icon: Search },
]

export interface PackageFormProps {
  formData: PackageDraft
  /** Preferred: functional updater for the parent's state */
  setFormData?: (updater: (prev: any) => any) => void
  /** Legacy fallback when setFormData isn't provided */
  handleInputChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  editingPackage: { id?: string } | null
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
  saving?: boolean
  /** Tag values already used in the catalogue */
  suggestions?: TagSuggestions
  /** Every other package — used for unique code/slug checks and code generation */
  otherPackages?: PackageDraft[]
  /** When given, shows a destination picker that generates the package code and links the package */
  destinations?: DestinationRecord[]
  destinationId?: string
  onDestinationChange?: (id: string) => void
  /** Extra line under the destination picker (e.g. how that destination lists packages) */
  destinationNote?: React.ReactNode
  /** Save error from the parent, shown in the footer */
  error?: string
}

export default function PackageForm({
  formData,
  setFormData,
  handleInputChange,
  editingPackage,
  onSubmit,
  onCancel,
  saving,
  suggestions,
  otherPackages = [],
  destinations,
  destinationId = '',
  onDestinationChange,
  destinationNote,
  error,
}: PackageFormProps) {
  const [tab, setTab] = useState<TabId>('basics')
  const [errors, setErrors] = useState<FormErrors>({})
  const [aiResult, setAiResult] = useState<AiCreateResponse | null>(null)
  const isNew = !editingPackage?.id
  const f = formData

  const set = (patch: PackageDraft) => {
    if (setFormData) setFormData((prev: PackageDraft) => applyDerived(prev, patch))
    else if (handleInputChange) {
      const next = applyDerived(f, patch)
      Object.keys(next).forEach((name) => {
        const value = (next as any)[name]
        if (value !== (f as any)[name]) handleInputChange({ target: { name, value, type: 'text' } } as any)
      })
    }
    const keys = Object.keys(patch)
    if (keys.some((k) => (errors as any)[k])) setErrors((e) => { const n = { ...e }; keys.forEach((k) => delete (n as any)[k]); return n })
  }

  const str = (k: keyof PackageDraft) => String((f as any)[k] ?? '')
  const tagOpts = (field: TagField) => suggestions?.[field] || TAGS[field].defaults
  const tagValue = (field: TagField) => tagValues(TAGS[field], f[field])
  const setTag = (field: TagField, v: string[]) => set({ [field]: v.join(TAGS[field].joiner || '') } as PackageDraft)

  const nights = toNum(f.Duration_Nights)
  const minPrice = toNum(f.Price_Min_INR)
  const maxPrice = toNum(f.Price_Max_INR)
  const days = useMemo(() => itineraryRows(f), [f.Day_Wise_Itinerary_Details, f.Day_Wise_Itinerary]) // eslint-disable-line react-hooks/exhaustive-deps
  const errorCount = (t: TabId) => Object.keys(errors).filter((k) => (ERROR_TAB[k] || 'basics') === t).length

  const generateCode = (destId = destinationId) => {
    const dest = destinations?.find((d) => d.id === destId)
    const prefix = prefixForDestination(dest, otherPackages) || String(f.Destination_Name || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'PKG'
    set({ Destination_ID: nextPackageCode(prefix, otherPackages) })
  }

  const pickDestination = (id: string) => {
    onDestinationChange?.(id)
    if (isNew && id) generateCode(id)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validatePackage(f, otherPackages)
    setErrors(errs)
    const first = Object.keys(errs)[0]
    if (first) {
      setTab((ERROR_TAB[first] as TabId) || 'basics')
      return
    }
    onSubmit(e)
  }

  /** Fill the form with an AI draft (keeps any photo already added). Not saved until the admin clicks Create. */
  const applyAiDraft = (res: AiCreateResponse) => {
    const { Gallery_Images, ...draft } = res.draft
    set({ ...draft, ...(Array.isArray(f.Gallery_Images) && f.Gallery_Images.length ? {} : { Gallery_Images: Gallery_Images || [] }) })
    if (res.destinationId && res.destinationId !== destinationId) onDestinationChange?.(res.destinationId)
    setErrors({})
    setAiResult(res)
  }

  const setDays = (rows: ItineraryDay[]) => set({ Day_Wise_Itinerary_Details: rows.map((r, i) => ({ ...r, day: i + 1 })) })
  const hasErrors = Object.keys(errors).length > 0
  const seoTitleSuggestion = suggestSeoTitle(f)
  const slugSuggestion = slugify(str('Destination_Name'))

  return (
    <form onSubmit={submit} noValidate className="relative flex min-h-full flex-col">
      {/* Tabs */}
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 border-b border-gray-200 bg-white/95 px-3 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto py-2">
          {TABS.map((t) => {
            const n = errorCount(t.id)
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cx(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  tab === t.id ? 'bg-bordeaux-50 text-bordeaux-700' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {n > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[10px] text-white">{n}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 space-y-6 pb-6">
        {!isNew && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-600">Make this page unique for Google (rewrites duplicate wording, fills SEO fields).</span>
            <SeoFixButton draft={f as Record<string, any>} packageId={editingPackage?.id} onApply={(patch) => set(patch as PackageDraft)} />
          </div>
        )}
        {aiResult && <AiDraftBanner res={aiResult} onDismiss={() => setAiResult(null)} />}

        {/* ---------------- BASICS ---------------- */}
        {tab === 'basics' && (
          <>
            {isNew && !aiResult && (
              <AiCreatePanel destinations={destinations} otherPackages={otherPackages} destinationId={destinationId} onDraft={applyAiDraft} />
            )}
            <FormField label="Package name" required error={errors.Destination_Name} hint="The title customers see, e.g. “Romantic Bali Escape with Private Pool Villa”.">
              <input value={str('Destination_Name')} onChange={(e) => set({ Destination_Name: e.target.value })} className={errorInput(errors.Destination_Name)} placeholder="Romantic Bali Escape" autoFocus={isNew} />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {destinations && (
                <FormField label="Destination" hint={destinationId ? destinationNote : 'Pick where this trip goes — we create the package code and add it to that destination page.'}>
                  <select value={destinationId} onChange={(e) => pickDestination(e.target.value)} className={inputClass}>
                    <option value="">— Choose destination —</option>
                    {[...destinations].sort((a, b) => String(a.name).localeCompare(String(b.name))).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.country && d.country !== d.name ? `, ${d.country}` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
              <FormField
                label="Package code"
                required
                error={errors.Destination_ID}
                hint={isNew ? 'Unique code like BAL_007. Destinations link packages by this code.' : 'Destination pages link to this code — change it only if you know why.'}
              >
                <div className="flex gap-2">
                  <input value={str('Destination_ID')} onChange={(e) => set({ Destination_ID: e.target.value.toUpperCase().replace(/\s+/g, '_') })} className={cx(errorInput(errors.Destination_ID), 'font-mono')} placeholder="BAL_007" />
                  {isNew && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => generateCode()} title="Generate next free code">
                      <Wand2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Nights" required error={errors.Duration_Nights} hint={nights ? `Shown as ${durationLabel(nights)}` : 'Days are worked out for you'}>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={nights ?? ''}
                  onChange={(e) => set({ Duration_Nights: e.target.value === '' ? (undefined as any) : Number(e.target.value) })}
                  className={errorInput(errors.Duration_Nights)}
                  placeholder="5"
                />
              </FormField>
              <FormField label="Price from (₹)" required error={errors.Price_Min_INR} hint={minPrice ? `Site shows “₹${formatIN(minPrice)}”` : 'Per couple / per person, as you sell it'}>
                <input type="number" min={0} inputMode="numeric" value={minPrice ?? ''} onChange={(e) => set({ Price_Min_INR: e.target.value === '' ? (undefined as any) : Number(e.target.value) })} className={errorInput(errors.Price_Min_INR)} placeholder="48500" />
              </FormField>
              <FormField label="Price up to (₹)" error={errors.Price_Max_INR} hint="Optional — used by the AI planner">
                <input type="number" min={0} inputMode="numeric" value={maxPrice ?? ''} onChange={(e) => set({ Price_Max_INR: e.target.value === '' ? (undefined as any) : Number(e.target.value) })} className={errorInput(errors.Price_Max_INR)} placeholder="65000" />
              </FormField>
            </div>

            <FormField label="Overview" hint="2–3 sentences. Also used as the Google description if you don't write one.">
              <textarea rows={4} value={str('Overview')} onChange={(e) => set({ Overview: e.target.value })} className={inputClass} placeholder="Romantic island escape with beaches, temples and a private pool villa." />
            </FormField>

            <div>
              <ImageUploader label="Main photo" value={str('Primary_Image_URL')} onChange={(url) => set({ Primary_Image_URL: url })} folder="/packages" required />
              <input
                value={str('Primary_Image_URL').startsWith('data:') ? '' : str('Primary_Image_URL')}
                onChange={(e) => set({ Primary_Image_URL: e.target.value.trim() })}
                className={cx(errorInput(errors.Primary_Image_URL), 'mt-2 text-xs')}
                placeholder="…or paste an image link (https://…)"
              />
              {errors.Primary_Image_URL && (
                <span className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600"><AlertCircle className="h-3.5 w-3.5" />{errors.Primary_Image_URL}</span>
              )}
            </div>

            <AiImagesPanel draft={f} onChange={set} />
            <GalleryEditor draft={f} onChange={set} />
          </>
        )}

        {/* ---------------- TRIP DETAILS ---------------- */}
        {tab === 'details' && (
          <>
            <div>
              <SectionTitle title="Highlights" description="One per line. Shown as the “Highlights” list on the package page." />
              <LinesInput value={Array.isArray(f.Highlights) ? f.Highlights : splitList(f.Highlights)} onChange={(v) => set({ Highlights: v })} rows={5} placeholder={'Sunset dinner cruise\nPrivate pool villa\nUbud temple tour'} />
            </div>

            <div>
              <SectionTitle
                title="Day-by-day itinerary"
                description="Title is required for each day; description and activities make the page richer."
                right={
                  !days.length && nights ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => setDays(Array.from({ length: nights + 1 }, (_, i) => ({ day: i + 1, title: i === 0 ? 'Arrival' : i === nights ? 'Departure' : '', description: '', activities: [] })))}>
                      Add {nights + 1} days
                    </Button>
                  ) : undefined
                }
              />
              <RowsEditor<ItineraryDay>
                rows={days}
                onChange={setDays}
                empty={() => ({ day: days.length + 1, title: '', description: '', activities: [] })}
                rowTitle={(r, i) => `Day ${i + 1}${r.title ? ` · ${r.title}` : ''}`}
                addLabel="Add day"
                emptyText="No days yet."
                fields={[
                  { key: 'title', label: 'Title', placeholder: 'Arrive in Bali & check in' },
                  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What happens on this day…' },
                  { key: 'activities', label: 'Activities (one per line)', type: 'lines', placeholder: 'Airport pickup\nHotel check-in' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Inclusions" hint="One per line">
                <LinesInput value={splitList(f.Inclusions)} onChange={(v) => set({ Inclusions: v })} rows={6} placeholder={'4★ stay with breakfast\nPrivate airport transfers'} />
              </FormField>
              <FormField label="Exclusions" hint="One per line">
                <LinesInput value={splitList(f.Exclusions)} onChange={(v) => set({ Exclusions: v })} rows={6} placeholder={'Flights\nVisa\nPersonal expenses'} />
              </FormField>
            </div>

            <div className="space-y-4 rounded-xl border border-gray-200 p-4">
              <SectionTitle title="Stay" />
              <FormField label="Hotel category">
                <ChipSelect value={tagValue('Star_Category')} onChange={(v) => setTag('Star_Category', v)} options={tagOpts('Star_Category')} />
              </FormField>
              <FormField label="Meal plan">
                <ChipSelect value={tagValue('Meal_Plan')} onChange={(v) => setTag('Meal_Plan', v)} options={tagOpts('Meal_Plan')} />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Hotels (examples)">
                  <input value={str('Hotel_Examples')} onChange={(e) => set({ Hotel_Examples: e.target.value })} className={inputClass} placeholder="The Anvaya Beach Resort, Amadea Resort" />
                </FormField>
                <FormField label="Route / nights split" hint="Shown under the package title">
                  <input value={str('Location_Breakup')} onChange={(e) => set({ Location_Breakup: e.target.value })} className={inputClass} placeholder="3N Seminyak + 2N Ubud" />
                </FormField>
              </div>
            </div>
          </>
        )}

        {/* ---------------- TAGS ---------------- */}
        {tab === 'tags' && (
          <>
            <p className="rounded-xl bg-bordeaux-50/60 px-4 py-3 text-xs text-bordeaux-800">
              Tags decide where this package appears: homepage occasion rails, filters and the AI trip planner's matches.
            </p>
            {(['Occasion', 'Travel_Type', 'Mood', 'Theme', 'Budget_Category'] as TagField[]).map((field) => (
              <FormField key={field} label={TAGS[field].label} hint={TAGS[field].hint || (TAGS[field].multi ? 'Pick one or more' : 'Pick one')}>
                <ChipSelect value={tagValue(field)} onChange={(v) => setTag(field, v)} options={tagOpts(field)} multi={TAGS[field].multi} />
              </FormField>
            ))}

            <Collapsible title="More details for the AI planner" description="Optional. Helps the AI match the right travellers.">
              <FormField label="Adventure level">
                <ChipSelect value={tagValue('Adventure_Level')} onChange={(v) => setTag('Adventure_Level', v)} options={tagOpts('Adventure_Level')} allowCustom={false} />
              </FormField>
              <FormField label="Stay type">
                <ChipSelect value={tagValue('Stay_Type')} onChange={(v) => setTag('Stay_Type', v)} options={tagOpts('Stay_Type')} />
              </FormField>
              <div className="flex flex-wrap gap-6">
                <FormField label="Good for kids"><YesNo value={f.Child_Friendly} onChange={(v) => set({ Child_Friendly: v })} /></FormField>
                <FormField label="Good for elderly"><YesNo value={f.Elderly_Friendly} onChange={(v) => set({ Elderly_Friendly: v })} /></FormField>
                <FormField label="Transfers">
                  <ChipSelect value={str('Transfer_Type') ? [str('Transfer_Type')] : []} onChange={(v) => set({ Transfer_Type: v[0] || '' })} options={['Private', 'Shared']} allowCustom={false} />
                </FormField>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Best season"><input value={str('Seasonality')} onChange={(e) => set({ Seasonality: e.target.value })} className={inputClass} placeholder="April–October" /></FormField>
                <FormField label="Group size"><input value={str('Group_Size')} onChange={(e) => set({ Group_Size: e.target.value })} className={inputClass} placeholder="2 Adults" /></FormField>
                <FormField label="Ideal traveller" className="sm:col-span-2"><input value={str('Ideal_Traveler_Persona')} onChange={(e) => set({ Ideal_Traveler_Persona: e.target.value })} className={inputClass} placeholder="Couples aged 25–35 wanting a private romantic escape" /></FormField>
                <FormField label="Airport code"><input value={str('Airport_Code')} onChange={(e) => set({ Airport_Code: e.target.value.toUpperCase() })} className={inputClass} placeholder="DPS" /></FormField>
                <FormField label="Local currency"><input value={str('Currency')} onChange={(e) => set({ Currency: e.target.value.toUpperCase() })} className={inputClass} placeholder="IDR" /></FormField>
                <FormField label="Language"><input value={str('Language_Preference')} onChange={(e) => set({ Language_Preference: e.target.value })} className={inputClass} placeholder="English" /></FormField>
                <FormField label="Climate"><input value={str('Climate_Type')} onChange={(e) => set({ Climate_Type: e.target.value })} className={inputClass} placeholder="Tropical" /></FormField>
                <FormField label="Safety score"><input value={str('Safety_Score')} onChange={(e) => set({ Safety_Score: e.target.value })} className={inputClass} placeholder="8.5/10" /></FormField>
                <FormField label="Sustainability score"><input value={str('Sustainability_Score')} onChange={(e) => set({ Sustainability_Score: e.target.value })} className={inputClass} placeholder="7/10" /></FormField>
              </div>
            </Collapsible>
          </>
        )}

        {/* ---------------- PAGE EXTRAS ---------------- */}
        {tab === 'extras' && (
          <>
            <p className="text-xs text-gray-500">All optional. When a section is empty the package page shows our standard text.</p>
            <Collapsible title="FAQs" count={f.FAQ_Items?.length} defaultOpen={!!f.FAQ_Items?.length}>
              <RowsEditor<FaqItem>
                rows={f.FAQ_Items || []}
                onChange={(rows) => set({ FAQ_Items: rows })}
                empty={() => ({ question: '', answer: '' })}
                addLabel="Add question"
                rowTitle={(r, i) => r.question || `Question ${i + 1}`}
                fields={[
                  { key: 'question', label: 'Question', placeholder: 'Is breakfast included?' },
                  { key: 'answer', label: 'Answer', type: 'textarea' },
                ]}
              />
            </Collapsible>
            <Collapsible title="Guest reviews" count={f.Guest_Reviews?.length}>
              <RowsEditor<GuestReview>
                rows={f.Guest_Reviews || []}
                onChange={(rows) => set({ Guest_Reviews: rows })}
                empty={() => ({ name: '', content: '', date: '', rating: '5/5' })}
                addLabel="Add review"
                rowTitle={(r, i) => r.name || `Review ${i + 1}`}
                fields={[
                  { key: 'name', label: 'Name', span: 3, placeholder: 'Anjali Mehta' },
                  { key: 'date', label: 'Date', span: 2, placeholder: '14 November 2025' },
                  { key: 'rating', label: 'Rating', span: 1, placeholder: '5/5' },
                  { key: 'content', label: 'Review', type: 'textarea' },
                ]}
              />
            </Collapsible>
            <Collapsible title="Booking, payment & cancellation policy" count={['booking', 'payment', 'cancellation'].filter((k) => (f.Booking_Policies as any)?.[k]?.length).length}>
              {(['booking', 'payment', 'cancellation'] as const).map((k) => (
                <FormField key={k} label={k === 'booking' ? 'Booking terms' : k === 'payment' ? 'Payment' : 'Cancellation'} hint="One per line">
                  <LinesInput
                    rows={3}
                    value={splitList(f.Booking_Policies?.[k], /\r?\n/)}
                    onChange={(v) => set({ Booking_Policies: { ...(f.Booking_Policies || {}), [k]: v } })}
                    placeholder={k === 'booking' ? 'Instant confirmation\nFlexible dates' : k === 'payment' ? 'Pay in 2 instalments\nZero cost EMI' : 'Free cancellation up to 7 days'}
                  />
                </FormField>
              ))}
            </Collapsible>
            <Collapsible title="Why book with us" count={f.Why_Book_With_Us?.length}>
              <RowsEditor<WhyBookItem>
                rows={f.Why_Book_With_Us || []}
                onChange={(rows) => set({ Why_Book_With_Us: rows })}
                empty={() => ({ label: '', description: '' })}
                addLabel="Add reason"
                rowTitle={(r, i) => r.label || `Reason ${i + 1}`}
                fields={[
                  { key: 'label', label: 'Heading', placeholder: 'Best price guarantee' },
                  { key: 'description', label: 'Description', type: 'textarea' },
                ]}
              />
            </Collapsible>
          </>
        )}

        {/* ---------------- SEO & ADVANCED ---------------- */}
        {tab === 'seo' && (
          <>
            <FormField
              label="Web address (slug)"
              error={errors.Slug}
              auto={isNew && !str('Slug')}
              hint={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate">travelzada.com{packageSiteUrl({ ...f, Slug: str('Slug') || (isNew ? slugSuggestion : '') })}</span>
                  {!str('Slug') && slugSuggestion && (
                    <button type="button" className="font-semibold text-bordeaux-700 hover:underline" onClick={() => set({ Slug: slugSuggestion })}>Use “{slugSuggestion}”</button>
                  )}
                </span>
              }
            >
              <input value={str('Slug')} onChange={(e) => set({ Slug: slugTyping(e.target.value) })}
                onBlur={() => str('Slug') && set({ Slug: slugify(str('Slug')) })} className={errorInput(errors.Slug)} placeholder={isNew ? `${slugSuggestion || 'made-from-the-name'} (automatic)` : 'Uses the package code if empty'} />
            </FormField>
            <FormField label="Google title" auto={!str('SEO_Title')} hint={!str('SEO_Title') && seoTitleSuggestion ? `If empty we use: “${seoTitleSuggestion}”` : `${str('SEO_Title').length}/60 characters`}>
              <input value={str('SEO_Title')} onChange={(e) => set({ SEO_Title: e.target.value })} className={inputClass} placeholder={seoTitleSuggestion} />
            </FormField>
            <FormField label="Google description" auto={!str('SEO_Description')} hint={!str('SEO_Description') ? 'If empty we use the first lines of the overview.' : `${str('SEO_Description').length}/155 characters`}>
              <textarea rows={3} value={str('SEO_Description')} onChange={(e) => set({ SEO_Description: e.target.value })} className={inputClass} placeholder={suggestSeoDescription(f)} />
            </FormField>
            <FormField label="Keywords" hint="Comma separated">
              <input value={str('SEO_Keywords')} onChange={(e) => set({ SEO_Keywords: e.target.value })} className={inputClass} placeholder="bali honeymoon package, romantic bali holiday" />
            </FormField>

            <Collapsible title="Advanced" description="Rarely needed">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Photo caption / alt text" className="sm:col-span-2" hint="Shown under the main photo and read by Google Images">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 shrink-0 text-gray-400" />
                    <input value={str('Image_Alt_Text')} onChange={(e) => set({ Image_Alt_Text: e.target.value })} className={inputClass} placeholder="Couple at Tanah Lot temple at sunset" />
                  </div>
                </FormField>
                <FormField label="Rating"><input value={str('Rating')} onChange={(e) => set({ Rating: e.target.value })} className={inputClass} placeholder="4.8/5" /></FormField>
                <FormField label="External booking URL"><input value={str('Booking_URL')} onChange={(e) => set({ Booking_URL: e.target.value })} className={inputClass} placeholder="https://…" /></FormField>
              </div>
              <p className="text-xs text-gray-500">
                Duration text, price label, social-share image, “last updated” and “created by” are filled in automatically when you save.
              </p>
            </Collapsible>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-3">
        <div className="min-w-0 text-xs">
          {error && !hasErrors ? (
            <span className="flex items-center gap-1 font-medium text-red-600"><AlertCircle className="h-3.5 w-3.5" />{error}</span>
          ) : hasErrors ? (
            <span className="flex items-center gap-1 font-medium text-red-600"><AlertCircle className="h-3.5 w-3.5" />Fix {Object.keys(errors).length} thing{Object.keys(errors).length > 1 ? 's' : ''} before saving</span>
          ) : !isNew && (f.Slug || f.Destination_ID) ? (
            <a href={packageSiteUrl(f)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-bordeaux-700">
              <ExternalLink className="h-3.5 w-3.5" /> View on site
            </a>
          ) : (
            <span className="text-gray-500">Fields marked * are required</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{isNew ? 'Create package' : 'Save changes'}</Button>
        </div>
      </div>
    </form>
  )
}
