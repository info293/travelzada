'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check, ChevronDown, Download, Eye, ImagePlus, Loader2, RefreshCw, ScanSearch, Sparkles, Star, Wand2, X,
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { DECOR_CATEGORIES, DECOR_STYLES, EVENT_TYPES } from '@/lib/aiImagesCatalog'

const MAX_IMAGES = 4
const MAX_EDGE = 2048

interface UploadedImage {
  id: string
  name: string
  dataUrl: string
  aspect: number
}

interface VenueAnalysis {
  venueType: string
  summary: string
  setting: string
  estimatedSize: { dimensions: string; ceilingHeight: string; guestCapacity: string }
  camera: { angle: string; height: string; lens: string; framing: string }
  architecture: { ceiling: string; walls: string; floor: string; columns: string; windowsAndDoors: string; fixedFeatures: string[] }
  existingDecor: string[]
  lighting: { naturalLight: string; artificialLight: string; colorTemperature: string; mood: string }
  colorPalette: string[]
  materials: string[]
  currentStyle: string
  placementZones: { zone: string; location: string; bestFor: string }[]
  mustPreserve: string[]
  limitations: string[]
  suggestedItemIds: string[]
}

interface Variant {
  title: string
  concept: string
  prompt: string
  url?: string
  error?: string
  status?: 'checking' | 'fixing' | 'done'
  checks?: { itemId: string; label: string; present: boolean; note: string }[]
}

/** Downscale + re-encode so uploads stay small and every format becomes a JPEG both APIs accept. */
function loadImage(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error(`${file.name} is not a supported image`))
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          aspect: img.width / img.height,
        })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

function Chip({ active, onClick, children, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; badge?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
        active
          ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
          : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5'
      }`}
    >
      {active && <Check className="h-3.5 w-3.5" />}
      {children}
      {badge && !active && <Sparkles className="h-3.5 w-3.5 text-accent" aria-label="AI suggested" />}
    </button>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-700">{value}</dd>
    </div>
  )
}

export default function AiImagesPage() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [baseId, setBaseId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [analysis, setAnalysis] = useState<VenueAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(true)
  const analysisRun = useRef(0)

  const [selected, setSelected] = useState<string[]>([])
  const [eventType, setEventType] = useState('wedding')
  const [style, setStyle] = useState('luxury-gold')
  const [palette, setPalette] = useState('')
  const [notes, setNotes] = useState('')
  const [includeGuests, setIncludeGuests] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [stage, setStage] = useState<'idle' | 'prompts' | 'images'>('idle')
  const [variants, setVariants] = useState<Variant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [openPrompt, setOpenPrompt] = useState<number | null>(null)
  const [compare, setCompare] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const baseImage = images.find((i) => i.id === baseId) ?? images[0]
  const suggested = new Set(analysis?.suggestedItemIds ?? [])

  // Re-analyse whenever the photo set or the base photo changes; stale runs are discarded.
  const orderedKey = baseImage ? [baseImage.id, ...images.filter((i) => i.id !== baseImage.id).map((i) => i.id)].join('|') : ''
  useEffect(() => {
    if (!baseImage) {
      setAnalysis(null)
      return
    }
    const run = ++analysisRun.current
    const ordered = [baseImage, ...images.filter((i) => i.id !== baseImage.id)]
    setAnalyzing(true)
    setAnalysis(null)
    setError(null)
    fetch('/api/ai-images/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: ordered.map((i) => i.dataUrl) }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (run !== analysisRun.current) return
        if (!res.ok) throw new Error(data.error || 'Analysis failed')
        setAnalysis(data.analysis)
        setAnalysisOpen(true)
      })
      .catch((err) => run === analysisRun.current && setError(err.message))
      .finally(() => run === analysisRun.current && setAnalyzing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedKey])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) {
      setError('Please upload image files (JPG, PNG, WEBP).')
      return
    }
    if (list.some((f) => f.size > 20 * 1024 * 1024)) {
      setError('Each image must be smaller than 20MB.')
      return
    }
    try {
      const loaded = await Promise.all(list.map(loadImage))
      setImages((prev) => {
        const merged = [...prev, ...loaded.filter((l) => !prev.some((p) => p.id === l.id))]
        if (merged.length > MAX_IMAGES) setError(`Only the first ${MAX_IMAGES} photos are used.`)
        return merged.slice(0, MAX_IMAGES)
      })
      setVariants([])
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id))
    if (baseId === id) setBaseId(null)
    setVariants([])
  }

  const toggleItem = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const applySuggestions = () => setSelected((prev) => Array.from(new Set([...prev, ...suggested])))

  const canApply = !!baseImage && !!analysis && selected.length > 0 && !generating && !analyzing

  const handleApply = async () => {
    if (!canApply || !baseImage) return
    setGenerating(true)
    setStage('prompts')
    setError(null)
    setVariants([])
    setOpenPrompt(null)
    setCompare(null)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)

    try {
      const res = await fetch('/api/ai-images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: baseImage.dataUrl,
          aspect: baseImage.aspect,
          analysis,
          itemIds: selected,
          eventType,
          style,
          palette,
          notes,
          includeGuests,
        }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Generation failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line)
          if (event.type === 'prompts') {
            setVariants(event.variants)
            setStage('images')
          } else if (event.type === 'image') {
            setVariants((prev) => prev.map((v, i) => (i === event.index ? { ...v, url: event.url, status: event.status, checks: event.checks ?? v.checks } : v)))
          } else if (event.type === 'prompt') {
            setVariants((prev) => prev.map((v, i) => (i === event.index ? { ...v, prompt: event.prompt } : v)))
          } else if (event.type === 'image-error') {
            setVariants((prev) => prev.map((v, i) => (i === event.index ? { ...v, error: event.error } : v)))
          } else if (event.type === 'error') {
            throw new Error(event.error)
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed')
    } finally {
      setGenerating(false)
      setStage('idle')
    }
  }

  const download = (url: string, title: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `travelzada-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`
    a.click()
  }

  const placeholderCount = stage === 'prompts' ? 3 : 0

  return (
    <main className="min-h-screen bg-cream">
      <Header />

      <div className="px-4 pb-16 pt-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero */}
          <div className="mb-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white px-4 py-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-ink">Venue analysis by Claude · Photo styling by GPT Image</span>
            </div>
            <h1 className="mb-3 font-display text-4xl leading-tight text-ink md:text-5xl">AI Venue Decor Studio</h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              Upload your banquet hall or venue, choose the decor, and see your actual space styled in three designer looks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* ── Left: photos + analysis ── */}
            <section className="flex flex-col gap-6 lg:col-span-7">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-primary/5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-ink">1. Upload venue photos</h2>
                  <span className="text-xs text-gray-400">{images.length}/{MAX_IMAGES} · up to 4 angles of the same venue</span>
                </div>

                {baseImage ? (
                  <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    <img src={baseImage.dataUrl} alt="Venue to style" className="max-h-[420px] w-full object-contain" />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" /> Photo to style
                    </div>
                  </div>
                ) : (
                  <div
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-primary/5'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <ImagePlus className="h-7 w-7 text-primary" />
                    </div>
                    <p className="mb-1 text-sm font-medium text-gray-700">
                      Drop photos of your hall here, or <span className="text-primary">click to browse</span>
                    </p>
                    <p className="text-xs text-gray-400">Wide, well-lit shots work best · JPG, PNG, WEBP</p>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {images.map((img) => {
                      const isBase = img.id === baseImage?.id
                      return (
                        <div key={img.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => setBaseId(img.id)}
                            title={isBase ? 'This photo will be styled' : 'Style this photo instead'}
                            className={`block h-20 w-24 overflow-hidden rounded-xl border-2 transition ${
                              isBase ? 'border-accent ring-2 ring-accent/30' : 'border-transparent opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-gray-500 shadow hover:text-red-500"
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                    {images.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-20 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-primary/50 hover:text-primary"
                      >
                        <ImagePlus className="mb-1 h-5 w-5" /> Add angle
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
                />
              </div>

              {/* Analysis */}
              {(analyzing || analysis) && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-primary/5">
                  <button
                    type="button"
                    onClick={() => setAnalysisOpen((o) => !o)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                      <ScanSearch className="h-5 w-5 text-primary" /> Venue analysis
                    </h2>
                    {analyzing ? (
                      <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Reading your space…
                      </span>
                    ) : (
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition ${analysisOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {analyzing && (
                    <div className="mt-4 space-y-2">
                      {[80, 95, 60].map((w) => (
                        <div key={w} className="h-3 animate-pulse rounded bg-gray-100" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  )}

                  {analysis && analysisOpen && (
                    <div className="mt-4 space-y-5">
                      <div>
                        <p className="text-sm font-semibold text-primary">{analysis.venueType}</p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-600">{analysis.summary}</p>
                      </div>

                      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        <Fact label="Size" value={analysis.estimatedSize.dimensions} />
                        <Fact label="Ceiling" value={analysis.estimatedSize.ceilingHeight} />
                        <Fact label="Capacity" value={analysis.estimatedSize.guestCapacity} />
                        <Fact label="Camera" value={analysis.camera.angle} />
                        <Fact label="Lighting" value={analysis.lighting.mood} />
                        <Fact label="Current style" value={analysis.currentStyle} />
                      </dl>

                      {analysis.colorPalette.length > 0 && (
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Existing colours & materials</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[...analysis.colorPalette, ...analysis.materials].map((c) => (
                              <span key={c} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysis.placementZones.length > 0 && (
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Where decor can go</p>
                          <ul className="space-y-1.5">
                            {analysis.placementZones.map((z) => (
                              <li key={z.zone + z.location} className="text-sm text-gray-600">
                                <span className="font-medium text-ink">{z.zone}</span> — {z.location}
                                <span className="text-gray-400"> · {z.bestFor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysis.mustPreserve.length > 0 && (
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Kept exactly as-is</p>
                          <p className="text-sm text-gray-600">{analysis.mustPreserve.join(' · ')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Right: decor selection ── */}
            <section className="lg:col-span-5">
              <div className="flex flex-col gap-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-primary/5 lg:sticky lg:top-24">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-ink">2. Choose your decor</h2>
                  <span className={`text-xs ${selected.length > 8 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {selected.length} selected{selected.length > 8 ? ' · fewer items = more accurate' : ''}
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Event</p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((e) => (
                      <Chip key={e.id} active={eventType === e.id} onClick={() => setEventType(e.id)}>{e.label}</Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Style</p>
                  <div className="flex flex-wrap gap-2">
                    {DECOR_STYLES.map((s) => (
                      <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>{s.label}</Chip>
                    ))}
                  </div>
                </div>

                {suggested.size > 0 && (
                  <button
                    type="button"
                    onClick={applySuggestions}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-medium text-ink hover:bg-accent/20"
                  >
                    <Sparkles className="h-4 w-4 text-accent" /> Add AI picks for this venue ({suggested.size})
                  </button>
                )}

                <div className="-mr-2 max-h-[420px] space-y-4 overflow-y-auto pr-2">
                  {DECOR_CATEGORIES.map((cat) => (
                    <div key={cat.id}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{cat.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {cat.items.map((item) => (
                          <Chip
                            key={item.id}
                            active={selected.includes(item.id)}
                            onClick={() => toggleItem(item.id)}
                            badge={suggested.has(item.id)}
                          >
                            {item.label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <input
                    value={palette}
                    onChange={(e) => setPalette(e.target.value)}
                    placeholder="Colour palette (optional) — e.g. ivory, blush pink & gold"
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Anything else? e.g. stage on the left wall, 20 tables, peacock theme"
                    className="resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={includeGuests}
                      onChange={(e) => setIncludeGuests(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    Show a few guests in the scene
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!canApply}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3.5 font-semibold text-white shadow-lg shadow-primary/30 transition hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none"
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                  {generating ? 'Designing your venue…' : 'Apply & create 3 designs'}
                </button>
                {!canApply && !generating && (
                  <p className="-mt-2 text-center text-xs text-gray-400">
                    {!baseImage ? 'Upload a venue photo to start' : analyzing ? 'Waiting for the venue analysis…' : !analysis ? 'Venue analysis is needed — re-upload to retry' : 'Pick at least one decor item'}
                  </p>
                )}
              </div>
            </section>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <X className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* ── Results ── */}
          <div ref={resultsRef} className="scroll-mt-24">
            {(variants.length > 0 || placeholderCount > 0) && (
              <div className="mt-12">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-3xl text-ink">Your designs</h2>
                    <p className="text-sm text-gray-500">
                      {stage === 'prompts'
                        ? 'Our AI designer is planning three looks for your space…'
                        : generating
                          ? 'Styling your venue — each design takes about a minute.'
                          : 'Tap a design to view full size. Hold “Before” to compare with the original.'}
                    </p>
                  </div>
                  {!generating && variants.length > 0 && (
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={!canApply}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-primary/40 disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" /> Regenerate
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {(variants.length ? variants : Array.from({ length: placeholderCount }, () => null)).map((v, i) => (
                    <article key={i} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-primary/5">
                      <div className="relative aspect-[4/3] bg-gray-100">
                        {v?.url ? (
                          <button type="button" className="block h-full w-full" onClick={() => setLightbox(v.url!)}>
                            <img
                              src={compare === i && baseImage ? baseImage.dataUrl : v.url}
                              alt={v.title}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ) : v?.error ? (
                          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-red-600">
                            <X className="mb-2 h-6 w-6" /> {v.error}
                          </div>
                        ) : (
                          <div className="flex h-full animate-pulse flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 via-white to-accent/10 text-sm text-gray-500">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            {v ? 'Styling…' : 'Planning…'}
                          </div>
                        )}
                        {v?.url && v.status && v.status !== 'done' && (
                          <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {v.status === 'checking' ? 'Checking every item…' : 'Adding missing items…'}
                          </div>
                        )}
                        {v?.url && (
                          <button
                            type="button"
                            onPointerDown={() => setCompare(i)}
                            onPointerUp={() => setCompare(null)}
                            onPointerLeave={() => setCompare(null)}
                            className="absolute bottom-3 left-3 inline-flex select-none items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink shadow backdrop-blur"
                          >
                            <Eye className="h-3.5 w-3.5" /> {compare === i ? 'Original' : 'Hold: Before'}
                          </button>
                        )}
                      </div>

                      <div className="p-5">
                        <h3 className="font-display text-xl text-ink">{v?.title ?? `Design ${i + 1}`}</h3>
                        <p className="mt-1 min-h-[40px] text-sm text-gray-500">{v?.concept ?? ''}</p>
                        {v?.checks && v.status === 'done' && (
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {v.checks.map((c) => (
                              <li
                                key={c.itemId}
                                title={c.note}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                  c.present ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                }`}
                              >
                                {c.present ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {c.label}
                              </li>
                            ))}
                          </ul>
                        )}
                        {v && (
                          <div className="mt-4 flex items-center gap-2">
                            {v.url && (
                              <button
                                type="button"
                                onClick={() => download(v.url!, v.title)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-medium text-white hover:bg-ink/90"
                              >
                                <Download className="h-3.5 w-3.5" /> Download
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setOpenPrompt(openPrompt === i ? null : i)}
                              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-primary/40"
                            >
                              {openPrompt === i ? 'Hide prompt' : 'View prompt'}
                            </button>
                          </div>
                        )}
                        {v && openPrompt === i && (
                          <p className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                            {v.prompt}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
          <img src={lightbox} alt="Design full size" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}

      <Footer />
    </main>
  )
}
