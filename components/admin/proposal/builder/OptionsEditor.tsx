'use client'

/**
 * Stay options editor: 1 option = a normal quote; 2 = "Your choice of stays" side by side; 3–4 = comparison table.
 * Exactly one option is "Your quote" — its price is the quote total (the Price card above edits the same number).
 */
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, BedDouble, ChevronDown, ChevronUp, Copy, Crown, Plus, Star, Trash2 } from 'lucide-react'
import { Button, Field, cx, formatINR, inputClass } from '../../ui'
import { addDays } from '../buildProposalData'
import { duplicateAsUpgrade, duplicateOption, newOption, newStay } from '../design'
import { formatShortDate, type ProposalStay, type StayOptionDraft } from '../types'
import ImagePicker from './ImagePicker'
import { ChipsInput, LinesInput } from './fields'
import HotelNameField from '../../library/HotelNameField'
import { useHotelLibrary } from '@/lib/library/cache'
import { findHotelByName, type LibraryHotel } from '@/lib/library/hotels'

const AMENITY_SUGGESTIONS = ['Infinity pool', 'Spa', 'Private beach', 'Kids club', 'Overwater dining', 'House reef', 'Gym', 'Mountain views', 'Lake view', 'Heated rooms', 'Room service', 'Free Wi-Fi']
const MEAL_SUGGESTIONS = ['Breakfast (CP)', 'Breakfast & dinner (MAP)', 'All meals (AP)', 'Full Board Plus', 'All inclusive']

export interface OptionsEditorProps {
    options: StayOptionDraft[]
    onChange: (next: StayOptionDraft[]) => void
    quotedPrice: number
    onQuotedPriceChange: (n: number) => void
    pax: number
    travelDate: string
    folder: string
    photoSuggestions: string[]
    hotelHint?: string
    /** Trip destination (e.g. "Kashmir") — library matches from it are shown first */
    destination?: string
}

export default function OptionsEditor({ options, onChange, quotedPrice, onQuotedPriceChange, pax, travelDate, folder, photoSuggestions, hotelHint, destination }: OptionsEditorProps) {
    const [active, setActive] = useState(0)
    const { items: library, ready: libraryReady } = useHotelLibrary(true)
    const idx = Math.min(active, options.length - 1)
    const o = options[idx]
    const quotedIdx = Math.max(0, options.findIndex((x) => x.isQuoted))
    const priceOf = (x: StayOptionDraft) => (x.isQuoted ? quotedPrice : x.price)

    const update = (i: number, patch: Partial<StayOptionDraft>) => onChange(options.map((x, k) => (k === i ? { ...x, ...patch } : x)))
    const setHotels = (hotels: ProposalStay[]) => update(idx, { hotels })

    const add = (opt: StayOptionDraft) => {
        if (options.length >= 4) return
        onChange([...options, opt])
        setActive(options.length)
    }
    const removeAt = (i: number) => {
        if (options.length <= 1) return
        const wasQuoted = options[i].isQuoted
        let next = options.filter((_, k) => k !== i)
        if (wasQuoted) {
            next = next.map((x, k) => (k === 0 ? { ...x, isQuoted: true } : x))
            onQuotedPriceChange(next[0].price || 0)
        }
        onChange(next)
        setActive(Math.max(0, i - 1))
    }
    const markQuoted = (i: number) => {
        if (options[i].isQuoted) return
        const newPrice = options[i].price || quotedPrice
        onChange(options.map((x, k) => (k === i ? { ...x, isQuoted: true } : x.isQuoted ? { ...x, isQuoted: false, price: quotedPrice } : x)))
        onQuotedPriceChange(newPrice)
    }
    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir
        if (j < 0 || j >= options.length) return
        const next = [...options]
        ;[next[i], next[j]] = [next[j], next[i]]
        onChange(next)
        setActive(j)
    }

    // hotel helpers
    const updateHotel = (k: number, patch: Partial<ProposalStay>) => setHotels(o.hotels.map((h, j) => (j === k ? { ...h, ...patch } : h)))
    /** A library hotel was picked: fill only the blank fields of the row (and blank option stars / location / amenities) */
    const pickLibraryHotel = (k: number, lib: LibraryHotel) => {
        const h = o.hotels[k]
        const row: ProposalStay = {
            ...h,
            hotelName: lib.name,
            city: h.city.trim() ? h.city : lib.city,
            roomType: h.roomType.trim() ? h.roomType : lib.roomTypes[0] || '',
            mealPlan: h.mealPlan.trim() ? h.mealPlan : lib.mealPlans[0] || '',
            bullets: h.bullets.length ? h.bullets : lib.highlights.slice(0, 6),
            images: h.images.length ? h.images : lib.images.slice(0, 3).map((i) => (i.caption ? { url: i.url, caption: i.caption } : { url: i.url })),
        }
        const single = o.hotels.length === 1
        update(idx, {
            hotels: o.hotels.map((x, j) => (j === k ? row : x)),
            ...(!o.starRating && lib.starRating && lib.starRating >= 3 && lib.starRating <= 5 ? { starRating: lib.starRating } : {}),
            ...(single && !o.location.trim() && lib.area ? { location: lib.area } : {}),
            ...(single && !o.amenities.length && lib.amenities.length ? { amenities: lib.amenities.slice(0, 8) } : {}),
        })
    }
    const addHotel = () => {
        const last = o.hotels[o.hotels.length - 1]
        setHotels([...o.hotels, newStay({ mealPlan: last?.mealPlan || o.mealSummary || '', nights: 1 })])
    }
    const moveHotel = (k: number, dir: -1 | 1) => {
        const j = k + dir
        if (j < 0 || j >= o.hotels.length) return
        const next = [...o.hotels]
        ;[next[k], next[j]] = [next[j], next[k]]
        setHotels(next)
    }
    // dates shown next to each hotel (derived from the travel date + nights)
    let cursor = travelDate
    const hotelDates = o.hotels.map((h) => {
        const inD = h.checkIn || cursor
        const outD = h.checkOut || (inD && h.nights ? addDays(inD, h.nights) : '')
        cursor = outD || cursor
        return inD && outD ? `${formatShortDate(inD)} → ${formatShortDate(outD)}` : ''
    })
    const totalNights = o.hotels.reduce((s, h) => s + (Number(h.nights) || 0), 0)

    const layoutNote = options.length === 1
        ? 'Single quote layout. Add an option to offer an upgrade side by side.'
        : options.length === 2
            ? 'Two options → “Your choice of stays” page with both side by side.'
            : `${options.length} options → comparison table + “Choose this if” cards.`

    return (
        <div>
            {/* Option tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {options.map((x, i) => (
                    <button key={x.id} type="button" onClick={() => setActive(i)}
                        className={cx('inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors', i === idx ? 'border-bordeaux-500 bg-bordeaux-50 text-bordeaux-800' : 'border-gray-200 bg-white text-gray-700 hover:border-bordeaux-300')}>
                        <span className={cx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', i === idx ? 'bg-bordeaux-600 text-white' : 'bg-gray-100 text-gray-600')}>{i + 1}</span>
                        <span className="max-w-[11rem] truncate font-semibold">{x.label || `Option ${i + 1}`}</span>
                        {x.isQuoted && <span className="rounded-full bg-bordeaux-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Your quote</span>}
                        {priceOf(x) > 0 && <span className="text-xs text-gray-500">{formatINR(priceOf(x))}</span>}
                    </button>
                ))}
                {options.length < 4 && (
                    <Button variant="secondary" size="sm" onClick={() => add(newOption({ mealSummary: o?.mealSummary || '', transfer: o?.transfer || '', location: o?.location || '' }))}>
                        <Plus className="w-3.5 h-3.5" /> Add option
                    </Button>
                )}
            </div>
            <p className="mt-2 text-xs text-gray-500">{layoutNote}</p>

            {o && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                    {/* Option actions */}
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex flex-wrap gap-2">
                            {!o.isQuoted && <Button variant="secondary" size="sm" onClick={() => markQuoted(idx)}><Crown className="w-3.5 h-3.5" /> Make this “Your quote”</Button>}
                            {options.length < 4 && <Button variant="secondary" size="sm" onClick={() => add(duplicateAsUpgrade({ ...o, price: priceOf(o) }))}><Star className="w-3.5 h-3.5" /> Duplicate as upgrade</Button>}
                            {options.length < 4 && <Button variant="ghost" size="sm" onClick={() => add(duplicateOption({ ...o, price: priceOf(o) }))}><Copy className="w-3.5 h-3.5" /> Duplicate</Button>}
                        </div>
                        <div className="flex gap-1">
                            <IconBtn label="Move left" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="w-4 h-4 -rotate-90" /></IconBtn>
                            <IconBtn label="Move right" onClick={() => move(idx, 1)} disabled={idx === options.length - 1}><ArrowDown className="w-4 h-4 -rotate-90" /></IconBtn>
                            {options.length > 1 && <IconBtn label="Remove option" onClick={() => removeAt(idx)} danger><Trash2 className="w-4 h-4" /></IconBtn>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="Option name" className="md:col-span-2" hint="e.g. Premium · 4-star, or the resort name">
                            <input className={inputClass} value={o.label} placeholder={options.length > 1 ? `Option ${idx + 1}` : 'Premium · 4-star'} onChange={(e) => update(idx, { label: e.target.value })} />
                        </Field>
                        <Field label="Tier (header label)" hint="e.g. Premium">
                            <input className={inputClass} value={o.tier || ''} placeholder="Premium" onChange={(e) => update(idx, { tier: e.target.value })} />
                        </Field>
                        <Field label={o.isQuoted ? 'Price (₹ total) — the quote total' : 'Price (₹ total, all travellers)'} hint={priceOf(o) > 0 && pax > 0 ? `≈ ${formatINR(Math.round(priceOf(o) / pax))} per person` : undefined}>
                            <input className={inputClass} type="number" min={0} value={priceOf(o) || ''}
                                onChange={(e) => { const n = parseInt(e.target.value) || 0; if (o.isQuoted) onQuotedPriceChange(n); else update(idx, { price: n }) }} />
                        </Field>
                        <Field label="Price note" hint="e.g. Full Board Plus · 4 nights">
                            <input className={inputClass} value={o.priceNote} onChange={(e) => update(idx, { priceNote: e.target.value })} />
                        </Field>
                        <Field label="Hotel stars">
                            <select className={inputClass} value={o.starRating || 0} onChange={(e) => update(idx, { starRating: Number(e.target.value) })}>
                                <option value={0}>Auto / don&apos;t show</option>
                                {[3, 4, 5].map((n) => <option key={n} value={n}>{n}-star</option>)}
                            </select>
                        </Field>
                        <Field label="Meal plan (summary)">
                            <input className={inputClass} list="tz-meal-plans" value={o.mealSummary} placeholder="Breakfast & dinner" onChange={(e) => update(idx, { mealSummary: e.target.value })} />
                        </Field>
                        <Field label="Transfer / getting there" hint="e.g. Seaplane · 35 min">
                            <input className={inputClass} value={o.transfer} onChange={(e) => update(idx, { transfer: e.target.value })} />
                        </Field>
                        <Field label="Location" hint="e.g. Lhaviyani Atoll">
                            <input className={inputClass} value={o.location} onChange={(e) => update(idx, { location: e.target.value })} />
                        </Field>
                        <Field label="Description (why we picked it)" className="md:col-span-2">
                            <textarea className={inputClass} rows={2} value={o.description} onChange={(e) => update(idx, { description: e.target.value })} />
                        </Field>
                        <Field label="Choose this if…" hint="One line, e.g. you want lake views and a houseboat night">
                            <textarea className={inputClass} rows={2} value={o.chooseIf} onChange={(e) => update(idx, { chooseIf: e.target.value })} />
                        </Field>
                    </div>
                    <datalist id="tz-meal-plans">{MEAL_SUGGESTIONS.map((m) => <option key={m} value={m} />)}</datalist>

                    {/* Hotels */}
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div>
                                <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-bordeaux-600" /> Hotels / rooms</span>
                                <span className="text-xs text-gray-500">{totalNights ? `${totalNights} night${totalNights === 1 ? '' : 's'} in total` : 'Add each stay in order'}{hotelHint ? ` · Catalog suggests: ${hotelHint}` : ''}</span>
                            </div>
                            <Button variant="secondary" size="sm" onClick={addHotel}><Plus className="w-3.5 h-3.5" /> Add hotel</Button>
                        </div>
                        <div className="space-y-2">
                            {o.hotels.map((h, k) => (
                                <HotelRow key={h.id || k} h={h} dates={hotelDates[k]} folder={folder}
                                    library={library} libraryReady={libraryReady} destination={destination}
                                    onPick={(lib) => pickLibraryHotel(k, lib)}
                                    onChange={(patch) => updateHotel(k, patch)}
                                    onRemove={() => setHotels(o.hotels.filter((_, j) => j !== k))}
                                    onUp={k > 0 ? () => moveHotel(k, -1) : undefined}
                                    onDown={k < o.hotels.length - 1 ? () => moveHotel(k, 1) : undefined} />
                            ))}
                            {o.hotels.length === 0 && <p className="text-sm text-gray-400 italic">No hotels yet — add the first stay.</p>}
                        </div>
                    </div>

                    {/* Photos + amenities */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ImagePicker
                            label="Option photos (mosaic page)"
                            hint="Up to 6 · captions become tags"
                            value={o.images}
                            onChange={(images) => update(idx, { images })}
                            folder={folder}
                            max={6}
                            captions
                            captionPlaceholder="e.g. The overwater villas"
                            suggestions={photoSuggestions}
                        />
                        <div className="space-y-3">
                            <Field label="Highlights & amenities (chips)">
                                <ChipsInput value={o.amenities} onChange={(amenities) => update(idx, { amenities })} suggestions={AMENITY_SUGGESTIONS} />
                            </Field>
                            <Field label="Included with this stay" hint="One per line — shown on the rooms page">
                                <LinesInput value={o.included} onChange={(included) => update(idx, { included })} rows={4} placeholder={'Return seaplane transfers\nDaily breakfast & dinner\nOne sunset cruise'} />
                            </Field>
                            <p className="text-[11px] text-gray-500">Options with photos or amenities get their own showcase page; rooms with details/photos get a “Where you’ll sleep” page.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function HotelRow({ h, dates, folder, library, libraryReady, destination, onPick, onChange, onRemove, onUp, onDown }: {
    h: ProposalStay; dates: string; folder: string
    library: LibraryHotel[]; libraryReady: boolean; destination?: string; onPick: (lib: LibraryHotel) => void
    onChange: (p: Partial<ProposalStay>) => void; onRemove: () => void; onUp?: () => void; onDown?: () => void
}) {
    const hasDetails = h.bullets.length > 0 || h.images.length > 0 || !!h.sizeSqm
    const [open, setOpen] = useState(hasDetails)
    const matched = useMemo(() => (h.hotelName.trim() ? findHotelByName(library, h.hotelName, h.city) : null), [library, h.hotelName, h.city])
    const rowKey = h.id || 'row'
    const roomChoices = (matched?.roomTypes || []).filter((r) => r.toLowerCase() !== h.roomType.trim().toLowerCase())
    const mealChoices = Array.from(new Set([...(matched?.mealPlans || []), ...MEAL_SUGGESTIONS]))
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-[4.5rem_1fr] md:grid-cols-[4.5rem_9rem_1fr_1fr_1fr_auto] gap-2 items-center">
                <div className="relative">
                    <input className={cx(inputClass, 'pr-6 text-center font-semibold')} type="number" min={0} max={30} title="Nights" value={h.nights || ''} onChange={(e) => onChange({ nights: Math.max(0, parseInt(e.target.value) || 0), checkIn: '', checkOut: '' })} />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">N</span>
                </div>
                <input className={inputClass} placeholder="City" value={h.city} onChange={(e) => onChange({ city: e.target.value })} />
                <HotelNameField className="col-span-2 md:col-span-1" value={h.hotelName} onChange={(hotelName) => onChange({ hotelName })} onPick={onPick}
                    library={library} ready={libraryReady} city={h.city} destination={destination} />
                <input className={inputClass} list={`tz-rooms-${rowKey}`} placeholder="Room type" value={h.roomType} onChange={(e) => onChange({ roomType: e.target.value })} />
                <input className={inputClass} list={`tz-meals-${rowKey}`} placeholder="Meal plan" value={h.mealPlan} onChange={(e) => onChange({ mealPlan: e.target.value })} />
                <datalist id={`tz-rooms-${rowKey}`}>{(matched?.roomTypes || []).map((r) => <option key={r} value={r} />)}</datalist>
                <datalist id={`tz-meals-${rowKey}`}>{mealChoices.map((m) => <option key={m} value={m} />)}</datalist>
                <div className="flex justify-end col-span-2 md:col-span-1">
                    <IconBtn label="Move up" onClick={onUp || (() => {})} disabled={!onUp}><ArrowUp className="w-4 h-4" /></IconBtn>
                    <IconBtn label="Move down" onClick={onDown || (() => {})} disabled={!onDown}><ArrowDown className="w-4 h-4" /></IconBtn>
                    <IconBtn label="Remove hotel" onClick={onRemove} danger><Trash2 className="w-4 h-4" /></IconBtn>
                </div>
            </div>
            {matched && roomChoices.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="text-[11px] text-gray-500">Rooms on file:</span>
                    {roomChoices.slice(0, 6).map((r) => (
                        <button key={r} type="button" onClick={() => onChange({ roomType: r })} className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-[11px] text-gray-600 hover:border-bordeaux-300 hover:text-bordeaux-700">{r}</button>
                    ))}
                </div>
            )}
            <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-400">
                    {dates || 'Dates follow the travel date + nights'}
                    {h.hotelName.trim() && libraryReady && (matched
                        ? <span className="ml-2 text-emerald-700">· In the hotels library{matched.usageCount ? ` (used ${matched.usageCount}×)` : ''}</span>
                        : <span className="ml-2 text-gray-500">· New hotel — added to the library when you save</span>)}
                </span>
                <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-bordeaux-700 hover:underline">
                    {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Room details &amp; photos{hasDetails && !open ? ` (${h.images.length} photo${h.images.length === 1 ? '' : 's'})` : ''}
                </button>
            </div>
            {open && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Field label="Room size" hint="e.g. 85 m²">
                            <input className={inputClass} value={h.sizeSqm || ''} placeholder="85" onChange={(e) => onChange({ sizeSqm: e.target.value })} />
                        </Field>
                        <Field label="Room highlights" hint="One per line">
                            <LinesInput value={h.bullets} onChange={(bullets) => onChange({ bullets })} rows={3} placeholder={'Private plunge pool\nSunrise-facing deck'} />
                        </Field>
                    </div>
                    <ImagePicker label="Room photos" value={h.images} onChange={(images) => onChange({ images })} folder={folder} max={3} />
                </div>
            )}
        </div>
    )
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
    return (
        <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
            className={cx('p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed', danger ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')}>
            {children}
        </button>
    )
}
