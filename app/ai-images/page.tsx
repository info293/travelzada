'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Check, ChevronDown, Download, FolderOpen, Share2, Gem, ImagePlus, Loader2, Maximize2, RefreshCw, ScanSearch, Send, Sparkles, Star,
  Undo2, Wand2, Wrench, X,
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CompareSlider from '@/components/ai-images/CompareSlider'
import CatalogPanel from '@/components/ai-images/CatalogPanel'
import ShareDesign from '@/components/ai-images/ShareDesign'
import { useAuth } from '@/contexts/AuthContext'
import { ALL_ITEM_IDS, DECOR_CATEGORIES, DECOR_STYLES, EVENT_TYPES } from '@/lib/aiImagesCatalog'
import { designTotal, formatINR, listCatalog, type CatalogItem, type DesignItem } from '@/lib/decorStore'

const ITEM_LABELS = new Map(DECOR_CATEGORIES.flatMap((c) => c.items.map((i) => [i.id, { name: i.label, category: c.label }] as const)))

const MAX_IMAGES = 4
const MAX_EDGE = 2048
// Claude only needs to understand the room, so it gets a smaller copy (about 70% fewer image tokens)
const ANALYSIS_EDGE = 1024
// Wait for the user to finish adding photos before paying for an analysis
const ANALYSIS_DEBOUNCE_MS = 1200

interface UploadedImage {
  id: string
  name: string
  dataUrl: string
  smallUrl: string
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
  status?: 'checking' | 'done'
  checks?: Check[]
  hd?: boolean
  /** Label of the action running on this design */
  busy?: string
  notice?: string
  /** Snapshot taken before the last action, for Undo */
  previous?: Pick<Variant, 'url' | 'checks' | 'hd' | 'prompt'>
}

type Check = { itemId: string; label: string; present: boolean; note: string }
type Action = 'regenerate' | 'fix' | 'hd' | 'refine'

const presentCount = (checks?: Check[]) => checks?.filter((c) => c.present).length ?? 0

/** Downscale + re-encode so uploads stay small and every format becomes a JPEG both APIs accept. */
function loadImage(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error(`${file.name} is not a supported image`))
      img.onload = () => {
        const encode = (maxEdge: number, quality: number) => {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          return canvas.toDataURL('image/jpeg', quality)
        }
        resolve({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          dataUrl: encode(MAX_EDGE, 0.9),
          smallUrl: encode(ANALYSIS_EDGE, 0.85),
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
  const analysisCache = useRef(new Map<string, VenueAnalysis>())

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
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [refineText, setRefineText] = useState<Record<number, string>>({})
  // The items the current designs were generated with (the picker may change afterwards)
  const [appliedItems, setAppliedItems] = useState<string[]>([])

  const { currentUser, loading: authLoading } = useAuth()
  // The vendor's own catalogue and which of its items are in this design (id → quantity)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [customSelected, setCustomSelected] = useState<Record<string, number>>({})
  const [appliedCustom, setAppliedCustom] = useState<Record<string, number>>({})
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    setCatalogLoading(true)
    listCatalog(currentUser.uid)
      .then(setCatalog)
      .catch(() => setError('Could not load your catalogue.'))
      .finally(() => setCatalogLoading(false))
  }, [currentUser])

  /** Every decor-studio API call costs money, so each one carries the signed-in user's token. */
  const authFetch = async (url: string, init: RequestInit) =>
    fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await currentUser?.getIdToken()}` } })

  const customPayload = (picked: Record<string, number>) =>
    catalog
      .filter((c) => picked[c.id])
      .map((c) => ({ id: c.id, name: c.name, category: c.category, description: c.description, imageUrl: c.imageUrl, qty: picked[c.id] }))

  /** The priced item list for a selection: real catalogue items first, then unpriced generic ideas. */
  const designItems = (picked: Record<string, number>, builtIn: string[]): DesignItem[] => [
    ...catalog
      .filter((c) => picked[c.id])
      .map((c) => ({ id: `c-${c.id}`, name: c.name, category: c.category, qty: picked[c.id], price: c.price || null, imageUrl: c.imageUrl })),
    ...builtIn
      .filter((id) => ALL_ITEM_IDS.includes(id))
      .map((id) => ({ id, name: ITEM_LABELS.get(id)!.name, category: ITEM_LABELS.get(id)!.category, qty: 1, price: null })),
  ]
  const customCount = Object.keys(customSelected).length
  const itemCount = selected.length + customCount
  const liveTotal = designTotal(designItems(customSelected, selected))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const baseImage = images.find((i) => i.id === baseId) ?? images[0]
  const suggested = new Set(analysis?.suggestedItemIds ?? [])

  // Analyse when the photo set or the base photo changes. Results are cached per photo set, and the
  // call waits until the user stops adding photos, so each set is only ever paid for once.
  const orderedKey = baseImage ? [baseImage.id, ...images.filter((i) => i.id !== baseImage.id).map((i) => i.id)].join('|') : ''
  useEffect(() => {
    const run = ++analysisRun.current
    setError(null)
    if (!baseImage || !currentUser) {
      setAnalysis(null)
      setAnalyzing(false)
      return
    }
    const cached = analysisCache.current.get(orderedKey)
    if (cached) {
      setAnalysis(cached)
      setAnalyzing(false)
      return
    }
    const ordered = [baseImage, ...images.filter((i) => i.id !== baseImage.id)]
    setAnalyzing(true)
    setAnalysis(null)
    const timer = setTimeout(() => {
      authFetch('/api/ai-images/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: ordered.map((i) => i.smallUrl) }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error || 'Analysis failed')
          analysisCache.current.set(orderedKey, data.analysis)
          if (run !== analysisRun.current) return
          setAnalysis(data.analysis)
          setAnalysisOpen(true)
        })
        .catch((err) => run === analysisRun.current && setError(err.message))
        .finally(() => run === analysisRun.current && setAnalyzing(false))
    }, ANALYSIS_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedKey, currentUser])

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

  // Designs belong to the photo they were made from
  const chooseBase = (id: string) => {
    if (id === baseImage?.id) return
    setBaseId(id)
    setVariants([])
  }

  const toggleItem = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const applySuggestions = () => setSelected((prev) => Array.from(new Set([...prev, ...suggested])))

  const canApply = !!baseImage && !!analysis && itemCount > 0 && !generating && !analyzing

  const handleApply = async () => {
    if (!canApply || !baseImage) return
    setGenerating(true)
    setStage('prompts')
    setError(null)
    setVariants([])
    setOpenPrompt(null)
    setLightbox(null)
    setRefineText({})
    setAppliedItems(selected)
    setAppliedCustom(customSelected)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)

    try {
      const res = await authFetch('/api/ai-images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: baseImage.dataUrl,
          imageSmall: baseImage.smallUrl,
          aspect: baseImage.aspect,
          analysis,
          itemIds: selected,
          customItems: customPayload(customSelected),
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

  const patchVariant = (i: number, patch: Partial<Variant>) =>
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))

  /** One paid action on one design: regenerate, fix missing items, upgrade to HD, or apply a typed change. */
  const runAction = async (i: number, mode: Action, label: string) => {
    const v = variants[i]
    if (!v || !baseImage || v.busy || generating) return
    const instruction = (refineText[i] ?? '').trim()
    if (mode === 'refine' && !instruction) return
    const missingIds = v.checks?.filter((c) => !c.present).map((c) => c.itemId) ?? []
    const fromDesign = mode === 'hd' || mode === 'refine'

    patchVariant(i, { busy: label, notice: undefined })
    try {
      const res = await authFetch('/api/ai-images/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          image: fromDesign ? undefined : baseImage.dataUrl,
          source: fromDesign ? v.url : undefined,
          prompt: v.prompt,
          aspect: baseImage.aspect,
          itemIds: appliedItems,
          customItems: customPayload(appliedCustom),
          missingIds,
          instruction,
          hd: v.hd,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'That did not work. Please try again.')

      // A fix is only kept when it actually shows more of the selected items
      if (mode === 'fix' && presentCount(data.checks) <= presentCount(v.checks)) {
        patchVariant(i, { busy: undefined, notice: 'The new attempt was not better, so the current design was kept.' })
        return
      }
      patchVariant(i, {
        busy: undefined,
        url: data.url,
        checks: data.checks ?? v.checks,
        prompt: data.prompt ?? v.prompt,
        hd: !!data.hd,
        error: undefined,
        previous: v.url ? { url: v.url, checks: v.checks, hd: v.hd, prompt: v.prompt } : undefined,
      })
      if (mode === 'refine') setRefineText((prev) => ({ ...prev, [i]: '' }))
    } catch (err: any) {
      patchVariant(i, { busy: undefined, notice: err.message })
    }
  }

  const undo = (i: number) => {
    const v = variants[i]
    if (v?.previous) patchVariant(i, { ...v.previous, previous: undefined, notice: undefined })
  }

  const download = (url: string, title: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `travelzada-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`
    a.click()
  }

  const placeholderCount = stage === 'prompts' ? 3 : 0
  const shareOptions = variants.filter((v) => v.url && !v.busy).map((v) => ({ title: v.title, concept: v.concept, url: v.url!, hd: !!v.hd }))

  if (authLoading || !currentUser) {
    return (
      <main className="min-h-screen bg-cream">
        <Header />
        <div className="flex min-h-[70vh] items-center justify-center px-4 pt-24">
          {authLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <div className="max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl shadow-primary/5">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h1 className="mb-2 font-display text-3xl text-ink">AI Venue Decor Studio</h1>
              <p className="mb-6 text-sm text-gray-500">
                Log in to design a venue with your own decor catalogue and share it with your customer for approval.
              </p>
              <Link href="/login" className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 font-semibold text-white shadow-lg shadow-primary/30">
                Log in to continue
              </Link>
            </div>
          )}
        </div>
        <Footer />
      </main>
    )
  }

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
            <Link href="/ai-images/designs" className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm hover:border-primary/40">
              <FolderOpen className="h-4 w-4 text-primary" /> My designs
            </Link>
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
                            onClick={() => chooseBase(img.id)}
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
                  <span className={`text-xs ${itemCount > 8 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {itemCount} selected{itemCount > 8 ? ' · fewer items = more accurate' : ''}
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

                <CatalogPanel
                  vendorId={currentUser.uid}
                  catalog={catalog}
                  setCatalog={setCatalog}
                  selected={customSelected}
                  setSelected={setCustomSelected}
                  loading={catalogLoading}
                />

                <p className="-mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Generic ideas (no price)</p>

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

                {itemCount > 0 && (
                  <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Decor total</span>
                      <span className="font-semibold text-ink">{formatINR(liveTotal.total)}</span>
                    </div>
                    {liveTotal.unpriced > 0 && (
                      <p className="mt-0.5 text-xs text-gray-400">+ {liveTotal.unpriced} generic item{liveTotal.unpriced > 1 ? 's' : ''} to be quoted</p>
                    )}
                  </div>
                )}

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
                          ? 'Styling your venue — each design takes under a minute.'
                          : 'Drag the slider on any design to compare with your original. These are fast drafts — use “Make HD” on the one you love.'}
                    </p>
                  </div>
                  {!generating && shareOptions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSharing(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
                    >
                      <Share2 className="h-4 w-4" /> Share with customer
                    </button>
                  )}
                  {!generating && variants.length > 0 && (
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={!canApply}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-primary/40 disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" /> Regenerate all
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {(variants.length ? variants : Array.from({ length: placeholderCount }, () => null)).map((v, i) => (
                    <article key={i} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-primary/5">
                      <div className="relative aspect-[4/3] bg-gray-100">
                        {v?.url && baseImage ? (
                          <CompareSlider before={baseImage.dataUrl} after={v.url} alt={v.title} fill />
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
                        {v?.url && (
                          <div className="absolute left-3 top-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLightbox(i)}
                              title="View full size"
                              className="rounded-full bg-white/90 p-1.5 text-ink shadow backdrop-blur hover:bg-white"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </button>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow backdrop-blur ${v.hd ? 'bg-accent text-ink' : 'bg-white/90 text-gray-600'}`}>
                              {v.hd ? 'HD' : 'Draft'}
                            </span>
                          </div>
                        )}
                        {v?.url && (v.busy || v.status === 'checking') && (
                          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {v.busy ?? 'Checking every item…'}
                            </span>
                          </div>
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
                        {v?.notice && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{v.notice}</p>}

                        {v && v.status === 'done' && (
                          <>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              {v.url && !v.hd && (
                                <button
                                  type="button"
                                  disabled={!!v.busy || generating}
                                  onClick={() => runAction(i, 'hd', 'Rendering in HD…')}
                                  title="Re-render this design at full quality"
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-3 py-2 text-xs font-semibold text-white shadow hover:shadow-md disabled:opacity-50"
                                >
                                  <Gem className="h-3.5 w-3.5" /> Make HD
                                </button>
                              )}
                              {v.url && (
                                <button
                                  type="button"
                                  onClick={() => download(v.url!, v.title)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-medium text-white hover:bg-ink/90"
                                >
                                  <Download className="h-3.5 w-3.5" /> Download
                                </button>
                              )}
                              {v.checks?.some((c) => !c.present) && (
                                <button
                                  type="button"
                                  disabled={!!v.busy || generating}
                                  onClick={() => runAction(i, 'fix', 'Adding missing items…')}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                                >
                                  <Wrench className="h-3.5 w-3.5" /> Fix missing
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={!!v.busy || generating}
                                onClick={() => runAction(i, 'regenerate', 'Creating a new version…')}
                                title="Create a new version of this design"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-primary/40 disabled:opacity-50"
                              >
                                <RefreshCw className="h-3.5 w-3.5" /> Redo
                              </button>
                              {v.previous && (
                                <button
                                  type="button"
                                  disabled={!!v.busy}
                                  onClick={() => undo(i)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-primary/40 disabled:opacity-50"
                                >
                                  <Undo2 className="h-3.5 w-3.5" /> Undo
                                </button>
                              )}
                            </div>

                            {v.url && (
                              <form
                                className="mt-3 flex items-center gap-2"
                                onSubmit={(e) => { e.preventDefault(); runAction(i, 'refine', 'Applying your change…') }}
                              >
                                <input
                                  value={refineText[i] ?? ''}
                                  onChange={(e) => setRefineText((prev) => ({ ...prev, [i]: e.target.value }))}
                                  disabled={!!v.busy || generating}
                                  maxLength={500}
                                  placeholder="Change something — e.g. make the flowers red"
                                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50"
                                />
                                <button
                                  type="submit"
                                  disabled={!!v.busy || generating || !(refineText[i] ?? '').trim()}
                                  title="Apply this change"
                                  className="rounded-xl bg-primary p-2 text-white hover:bg-primary-dark disabled:bg-gray-300"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            )}

                            <button
                              type="button"
                              onClick={() => setOpenPrompt(openPrompt === i ? null : i)}
                              className="mt-3 text-xs text-gray-400 underline-offset-2 hover:text-primary hover:underline"
                            >
                              {openPrompt === i ? 'Hide prompt' : 'View prompt'}
                            </button>
                          </>
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

      {lightbox !== null && variants[lightbox]?.url && baseImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
          <CompareSlider before={baseImage.dataUrl} after={variants[lightbox].url!} alt={variants[lightbox].title} />
        </div>
      )}

      {sharing && baseImage && (
        <ShareDesign
          vendorId={currentUser.uid}
          defaultVendorName={currentUser.displayName || ''}
          hallDataUrl={baseImage.dataUrl}
          aspect={baseImage.aspect}
          options={shareOptions}
          items={designItems(appliedCustom, appliedItems)}
          eventLabel={EVENT_TYPES.find((e) => e.id === eventType)?.label ?? ''}
          styleLabel={DECOR_STYLES.find((d) => d.id === style)?.label ?? ''}
          onClose={() => setSharing(false)}
        />
      )}

      <Footer />
    </main>
  )
}
