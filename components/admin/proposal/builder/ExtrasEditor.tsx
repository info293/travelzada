'use client'

/**
 * Cover text, featured day photos and the closing page copy. Every field is optional:
 * empty = the automatic value (shown as the placeholder).
 */
import { Wand2 } from 'lucide-react'
import { Field, inputClass } from '../../ui'
import type { ProposalData, QuoteDesign } from '../types'
import ImagePicker from './ImagePicker'
import { LinesInput } from './fields'

export interface ExtrasEditorProps {
    design: QuoteDesign
    onDesign: (patch: Partial<QuoteDesign>) => void
    preview: ProposalData | null
    folder: string
    photoSuggestions: string[]
}

export default function ExtrasEditor({ design, onDesign, preview, folder, photoSuggestions }: ExtrasEditorProps) {
    const auto = preview
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Cover title" hint="Big word on the cover">
                    <input className={inputClass} value={design.coverTitle} placeholder={auto?.cover.title || 'Kashmir'} onChange={(e) => onDesign({ coverTitle: e.target.value })} />
                </Field>
                <Field label="Script line" hint="Handwritten words next to the title">
                    <input className={inputClass} value={design.coverScript} placeholder={auto?.cover.script || 'for two'} onChange={(e) => onDesign({ coverScript: e.target.value })} />
                </Field>
                <Field label="Cover subtitle" className="md:col-span-2">
                    <input className={inputClass} value={design.coverSubtitle} placeholder={auto?.cover.subtitle || 'Srinagar, Gulmarg & Pahalgam · hand-picked 4-star stays'} onChange={(e) => onDesign({ coverSubtitle: e.target.value })} />
                </Field>
                <Field label="Room (cover facts)">
                    <input className={inputClass} value={design.roomsLabel} placeholder={auto?.cover.roomsLabel || '1 double'} onChange={(e) => onDesign({ roomsLabel: e.target.value })} />
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
                    <input type="checkbox" className="rounded border-gray-300 text-bordeaux-600 focus:ring-bordeaux-200" checked={design.showcase} onChange={(e) => onDesign({ showcase: e.target.checked })} />
                    Add a photo showcase page for options with photos
                </label>
            </div>

            <ImagePicker
                label="Featured photos on the day-by-day page"
                hint="Up to 2 · empty = first day photos / package gallery"
                value={design.dayPhotos}
                onChange={(dayPhotos) => onDesign({ dayPhotos })}
                folder={folder}
                max={2}
                captions
                suggestions={photoSuggestions}
                suggestionsLabel="Package & quote photos"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="At a glance (one per line)" hint={design.atAGlance.length ? 'Custom' : 'Empty = automatic'}>
                    <LinesInput value={design.atAGlance} onChange={(atAGlance) => onDesign({ atAGlance })} rows={6} placeholder={(auto?.extras.atAGlance || []).join('\n')} />
                    {!design.atAGlance.length && (auto?.extras.atAGlance.length || 0) > 0 && (
                        <button type="button" onClick={() => onDesign({ atAGlance: auto!.extras.atAGlance })} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-bordeaux-700 hover:underline">
                            <Wand2 className="w-3.5 h-3.5" /> Use the suggestions and edit
                        </button>
                    )}
                </Field>
                <div className="space-y-3">
                    <Field label="Price chips (one per line)" hint="e.g. Flights included">
                        <LinesInput value={design.chips} onChange={(chips) => onDesign({ chips })} rows={3} placeholder={(auto?.extras.chips || []).join('\n') || 'Flights included\nTaxes included'} />
                    </Field>
                    <Field label="Line under “price held until”">
                        <input className={inputClass} value={design.peakLine} placeholder={auto?.extras.peakLine} onChange={(e) => onDesign({ peakLine: e.target.value })} />
                    </Field>
                </div>
                <Field label="Payment (closing page)">
                    <textarea className={inputClass} rows={3} value={design.paymentText} placeholder={auto?.extras.paymentText} onChange={(e) => onDesign({ paymentText: e.target.value })} />
                </Field>
                <Field label="Cancellation (closing page)">
                    <textarea className={inputClass} rows={3} value={design.cancellationText} placeholder={auto?.extras.cancellationText} onChange={(e) => onDesign({ cancellationText: e.target.value })} />
                </Field>
                <Field label="Rating line (closing footer)" className="md:col-span-2">
                    <input className={inputClass} value={design.ratingLine} placeholder={auto?.extras.ratingLine} onChange={(e) => onDesign({ ratingLine: e.target.value })} />
                </Field>
            </div>
        </div>
    )
}
