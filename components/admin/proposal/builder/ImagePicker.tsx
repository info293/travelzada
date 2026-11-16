'use client'

/**
 * Multi-image picker for the quote builder.
 *  - drag & drop files, click to choose (multiple), Ctrl+V anywhere inside the box (screenshots!), "Paste" button,
 *    paste an image URL, or pick from the package's own photos
 *  - reorder (drag tiles or ← →), caption, remove
 *  - images are downscaled in the browser and uploaded to ImageKit (/quotes/<quoteRef>) with a progress bar
 */
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ClipboardPaste, ImagePlus, Link2, Loader2, Upload, X } from 'lucide-react'
import { cx } from '../../ui'
import type { ProposalImage } from '../types'
import { looksLikeImageUrl, prepareImage, uploadQuoteImage } from './uploadImage'

interface Pending { id: string; preview: string; progress: number; error?: string; name: string }

export interface ImagePickerProps {
    value: ProposalImage[]
    onChange: (next: ProposalImage[]) => void
    /** ImageKit folder, e.g. /quotes/TZ-261116-AB12 */
    folder: string
    max?: number
    captions?: boolean
    /** Existing photos to pick from (package cover + gallery …) */
    suggestions?: string[]
    suggestionsLabel?: string
    label?: string
    hint?: string
    aspect?: 'landscape' | 'portrait' | 'screenshot' | 'square'
    /** Shown in the empty drop zone */
    emptyText?: string
    captionPlaceholder?: string
}

const ASPECT: Record<NonNullable<ImagePickerProps['aspect']>, string> = {
    landscape: 'aspect-[4/3]',
    portrait: 'aspect-[3/4]',
    screenshot: 'aspect-[16/10]',
    square: 'aspect-square',
}

const rid = () => Math.random().toString(36).slice(2, 9)

export default function ImagePicker({
    value, onChange, folder, max = 12, captions = false, suggestions = [], suggestionsLabel = 'From the package',
    label, hint, aspect = 'landscape', emptyText, captionPlaceholder = 'Caption (optional)',
}: ImagePickerProps) {
    const [pending, setPending] = useState<Pending[]>([])
    const [dragOver, setDragOver] = useState(false)
    const [showUrl, setShowUrl] = useState(false)
    const [urlText, setUrlText] = useState('')
    const [error, setError] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)
    const boxRef = useRef<HTMLDivElement>(null)
    const dragIndex = useRef<number | null>(null)
    // Latest value for async upload completions (several can finish in the same tick)
    const valueRef = useRef(value)
    useEffect(() => { valueRef.current = value }, [value])

    const single = max === 1
    const full = !single && value.length + pending.filter((p) => !p.error).length >= max

    const commit = (img: ProposalImage) => {
        const cur = valueRef.current
        let next: ProposalImage[]
        if (single) next = [img]
        else if (cur.some((c) => c.url === img.url)) return
        else if (cur.length >= max) return
        else next = [...cur, img]
        valueRef.current = next
        onChange(next)
    }

    const addFiles = (files: File[]) => {
        setError('')
        const images = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name))
        if (!images.length) { if (files.length) setError('Only image files can be added.'); return }
        const room = single ? 1 : Math.max(0, max - valueRef.current.length - pending.filter((p) => !p.error).length)
        const take = images.slice(0, room)
        if (images.length > take.length) setError(`Only ${max} photo${max === 1 ? '' : 's'} here — extra files were skipped.`)
        take.forEach((file) => {
            const id = rid()
            const preview = URL.createObjectURL(file)
            setPending((p) => [...p, { id, preview, progress: 0, name: file.name || 'pasted image' }])
            ;(async () => {
                try {
                    const prepared = await prepareImage(file)
                    const url = await uploadQuoteImage(prepared, {
                        folder,
                        fileName: file.name || `pasted_${Date.now()}`,
                        onProgress: (pct) => setPending((p) => p.map((x) => (x.id === id ? { ...x, progress: pct } : x))),
                    })
                    commit({ url, caption: '' })
                    setPending((p) => p.filter((x) => x.id !== id))
                    URL.revokeObjectURL(preview)
                } catch (e) {
                    setPending((p) => p.map((x) => (x.id === id ? { ...x, error: e instanceof Error ? e.message : 'Upload failed' } : x)))
                }
            })()
        })
    }

    const dismissPending = (id: string) => setPending((p) => {
        const hit = p.find((x) => x.id === id)
        if (hit) URL.revokeObjectURL(hit.preview)
        return p.filter((x) => x.id !== id)
    })

    const addUrl = (raw: string) => {
        const url = raw.trim()
        if (!/^https?:\/\//i.test(url)) { setError('Paste a full image link starting with https://'); return }
        setError('')
        commit({ url, caption: '' })
        setUrlText('')
        setShowUrl(false)
    }

    const remove = (i: number) => onChange(value.filter((_, k) => k !== i))
    const move = (i: number, j: number) => {
        if (j < 0 || j >= value.length || i === j) return
        const next = [...value]
        const [it] = next.splice(i, 1)
        next.splice(j, 0, it)
        onChange(next)
    }
    const setCaption = (i: number, caption: string) => onChange(value.map((im, k) => (k === i ? { ...im, caption } : im)))
    const toggleSuggestion = (url: string) => {
        const idx = value.findIndex((v) => v.url === url)
        if (idx >= 0) remove(idx)
        else commit({ url, caption: '' })
    }

    const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
        const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'))
        if (files.length) {
            e.preventDefault()
            addFiles(files)
            return
        }
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return // normal text paste into a caption
        const text = e.clipboardData?.getData('text') || ''
        if (looksLikeImageUrl(text) || /^https?:\/\/\S+$/.test(text.trim())) {
            e.preventDefault()
            addUrl(text)
        }
    }

    const pasteFromClipboard = async () => {
        setError('')
        try {
            const clip: any = (navigator as any).clipboard
            if (!clip?.read) throw new Error('no api')
            const items = await clip.read()
            const files: File[] = []
            for (const item of items) {
                const type = (item.types as string[]).find((t) => t.startsWith('image/'))
                if (type) {
                    const blob: Blob = await item.getType(type)
                    files.push(new File([blob], `pasted_${Date.now()}.${type.split('/')[1] || 'png'}`, { type }))
                }
            }
            if (files.length) addFiles(files)
            else {
                const text = (await clip.readText?.()) || ''
                if (/^https?:\/\//.test(text.trim())) addUrl(text)
                else setError('No image on the clipboard. Copy a screenshot first (Win+Shift+S), then paste.')
            }
        } catch {
            boxRef.current?.focus()
            setError('Click inside this box and press Ctrl+V to paste.')
        }
    }

    const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files')

    const uniqueSuggestions = Array.from(new Set(suggestions.filter(Boolean)))

    return (
        <div>
            {(label || hint) && (
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    {label && <span className="text-xs font-semibold text-gray-700">{label}{!single && <span className="ml-1 font-normal text-gray-400">({value.length}/{max})</span>}</span>}
                    {hint && <span className="text-[11px] text-gray-400 text-right">{hint}</span>}
                </div>
            )}
            <div
                ref={boxRef}
                tabIndex={0}
                onPaste={onPaste}
                onDragOver={(e) => { if (isFileDrag(e)) { e.preventDefault(); setDragOver(true) } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
                onDrop={(e) => {
                    if (!isFileDrag(e)) return
                    e.preventDefault()
                    setDragOver(false)
                    addFiles(Array.from(e.dataTransfer.files || []))
                }}
                className={cx(
                    'rounded-2xl border-2 border-dashed p-3 outline-none transition-colors focus:border-bordeaux-400 focus:ring-2 focus:ring-bordeaux-100',
                    dragOver ? 'border-bordeaux-500 bg-bordeaux-50' : 'border-gray-200 bg-white',
                )}
            >
                {(value.length > 0 || pending.length > 0) && (
                    <div className={cx('grid gap-2.5', single ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3')}>
                        {value.map((im, i) => (
                            <div
                                key={im.url + i}
                                draggable={!single}
                                onDragStart={(e) => { dragIndex.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-tz-index', String(i)) }}
                                onDragOver={(e) => { if (dragIndex.current !== null) e.preventDefault() }}
                                onDrop={(e) => {
                                    if (dragIndex.current === null) return
                                    e.preventDefault()
                                    e.stopPropagation()
                                    move(dragIndex.current, i)
                                    dragIndex.current = null
                                }}
                                onDragEnd={() => { dragIndex.current = null }}
                                className="group"
                            >
                                <div
                                    className={cx('relative rounded-xl overflow-hidden bg-gray-100 bg-center bg-no-repeat ring-1 ring-gray-200', ASPECT[aspect], aspect === 'screenshot' ? 'bg-contain bg-[#F8F2EA]' : 'bg-cover', !single && 'cursor-move')}
                                    style={{ backgroundImage: `url("${im.url}")` }}
                                >
                                    {!single && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>}
                                    <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {!single && i > 0 && <TileBtn label="Move left" onClick={() => move(i, i - 1)}><ArrowLeft className="w-3.5 h-3.5" /></TileBtn>}
                                        {!single && i < value.length - 1 && <TileBtn label="Move right" onClick={() => move(i, i + 1)}><ArrowRight className="w-3.5 h-3.5" /></TileBtn>}
                                        <TileBtn label="Remove" onClick={() => remove(i)} danger><X className="w-3.5 h-3.5" /></TileBtn>
                                    </div>
                                </div>
                                {captions && (
                                    <input
                                        className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-bordeaux-100 focus:border-bordeaux-300"
                                        placeholder={captionPlaceholder}
                                        value={im.caption || ''}
                                        onChange={(e) => setCaption(i, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                        {pending.map((p) => (
                            <div key={p.id}>
                                <div className={cx('relative rounded-xl overflow-hidden bg-gray-100 bg-cover bg-center ring-1', ASPECT[aspect], p.error ? 'ring-red-300' : 'ring-gray-200')} style={{ backgroundImage: `url("${p.preview}")` }}>
                                    <div className={cx('absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 text-center', p.error ? 'bg-red-50/90' : 'bg-white/60')}>
                                        {p.error ? (
                                            <>
                                                <span className="text-[11px] font-semibold text-red-700 leading-tight">{p.error}</span>
                                                <button type="button" onClick={() => dismissPending(p.id)} className="text-[11px] font-semibold text-red-700 underline">Dismiss</button>
                                            </>
                                        ) : (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin text-bordeaux-700" />
                                                <div className="h-1.5 w-3/4 rounded-full bg-white overflow-hidden"><div className="h-full bg-bordeaux-600 transition-all" style={{ width: `${Math.max(6, p.progress)}%` }} /></div>
                                                <span className="text-[10px] font-semibold text-gray-700">{p.progress < 100 ? `Uploading ${p.progress}%` : 'Saving…'}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {(value.length === 0 && pending.length === 0) || (!full && !single) ? (
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className={cx('w-full rounded-xl text-center text-gray-500 hover:bg-gray-50 hover:text-bordeaux-700 transition-colors', value.length || pending.length ? 'mt-2.5 py-2.5 border border-gray-200 text-xs' : 'py-6')}
                    >
                        <ImagePlus className={cx('mx-auto', value.length || pending.length ? 'hidden' : 'w-6 h-6 mb-1.5 text-gray-400')} />
                        <span className="block text-sm font-semibold">{value.length || pending.length ? '+ Add more photos' : emptyText || (single ? 'Drop a photo here or click to choose' : 'Drop photos here or click to choose')}</span>
                        {!(value.length || pending.length) && <span className="block text-[11px] mt-0.5 text-gray-400">…or click this box and press <kbd className="rounded border border-gray-300 bg-gray-50 px-1">Ctrl</kbd>+<kbd className="rounded border border-gray-300 bg-gray-50 px-1">V</kbd> to paste a screenshot</span>}
                    </button>
                ) : single ? (
                    <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 w-full rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">Replace photo · or paste a new one</button>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <SmallBtn onClick={() => fileRef.current?.click()} disabled={full}><Upload className="w-3.5 h-3.5" /> Upload</SmallBtn>
                    <SmallBtn onClick={pasteFromClipboard} disabled={full}><ClipboardPaste className="w-3.5 h-3.5" /> Paste</SmallBtn>
                    <SmallBtn onClick={() => setShowUrl((s) => !s)} disabled={full}><Link2 className="w-3.5 h-3.5" /> Image link</SmallBtn>
                </div>
                {showUrl && (
                    <div className="mt-2 flex gap-1.5">
                        <input
                            className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-bordeaux-100"
                            placeholder="https://…/photo.jpg"
                            value={urlText}
                            autoFocus
                            onChange={(e) => setUrlText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(urlText) } }}
                        />
                        <SmallBtn onClick={() => addUrl(urlText)}>Add</SmallBtn>
                    </div>
                )}

                {uniqueSuggestions.length > 0 && (
                    <div className="mt-2.5 border-t border-gray-100 pt-2">
                        <div className="text-[11px] font-semibold text-gray-500 mb-1.5">{suggestionsLabel} · click to {single ? 'use' : 'add'}</div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {uniqueSuggestions.slice(0, 24).map((url) => {
                                const on = value.some((v) => v.url === url)
                                return (
                                    <button
                                        key={url}
                                        type="button"
                                        title={on ? 'Remove' : 'Add'}
                                        onClick={() => toggleSuggestion(url)}
                                        disabled={!on && full}
                                        className={cx('relative h-14 w-14 shrink-0 rounded-lg bg-gray-100 bg-cover bg-center ring-2 transition disabled:opacity-40', on ? 'ring-bordeaux-500' : 'ring-transparent hover:ring-bordeaux-200')}
                                        style={{ backgroundImage: `url("${url}")` }}
                                    >
                                        {on && <span className="absolute inset-0 flex items-center justify-center bg-bordeaux-900/40"><Check className="w-5 h-5 text-white" /></span>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {error && <p className="mt-2 text-[11px] font-semibold text-red-600">{error}</p>}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple={!single}
                    className="hidden"
                    onChange={(e) => {
                        addFiles(Array.from(e.target.files || []))
                        e.target.value = ''
                    }}
                />
            </div>
        </div>
    )
}

function TileBtn({ children, label, onClick, danger }: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
    return (
        <button type="button" title={label} aria-label={label} onClick={(e) => { e.stopPropagation(); onClick() }}
            className={cx('w-6 h-6 rounded-full flex items-center justify-center shadow bg-white/95 text-gray-700', danger ? 'hover:bg-red-600 hover:text-white' : 'hover:bg-bordeaux-600 hover:text-white')}>
            {children}
        </button>
    )
}

function SmallBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 hover:border-bordeaux-300 hover:text-bordeaux-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {children}
        </button>
    )
}
