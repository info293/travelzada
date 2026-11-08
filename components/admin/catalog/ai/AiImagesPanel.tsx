'use client'

/**
 * "🎨 Generate images" for a package + the Gallery_Images editor.
 * Images are created from the package's own itinerary (server: lib/packages/aiImages.ts), uploaded to ImageKit,
 * and can be set as the cover (Primary_Image_URL + Image_Alt_Text) or added to the gallery.
 */
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ImagePlus, Palette, Plus, RefreshCw, Star, X } from 'lucide-react'
import { Button, cx, inputClass } from '../../ui'
import { SectionTitle } from '../fields'
import { cleanGallery, packageImage } from '../packageUtils'
import type { PackageDraft } from '../types'
import { staffFetch } from '@/lib/admin/staffFetch'

interface GenImage { url: string; prompt: string; alt: string; scene: string }

interface Props {
  draft: PackageDraft
  onChange: (patch: PackageDraft) => void
}

const gallery = (d: PackageDraft) => (Array.isArray(d.Gallery_Images) ? d.Gallery_Images.map(String) : [])

export function AiImagesPanel({ draft, onChange }: Props) {
  const [count, setCount] = useState(3)
  const [style, setStyle] = useState('')
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [results, setResults] = useState<GenImage[]>([])

  useEffect(() => {
    if (!busy) return
    const t0 = Date.now()
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(t)
  }, [busy])

  const cover = packageImage(draft.Primary_Image_URL)
  const g = gallery(draft)
  const canGenerate = !!(String(draft.Destination_Name || '').trim() && (draft.Overview || draft.Day_Wise_Itinerary_Details?.length || draft.Day_Wise_Itinerary))

  const generate = async () => {
    setBusy(true)
    setError('')
    setElapsed(0)
    try {
      const { Destination_Name, Destination_ID, Slug, Overview, Location_Breakup, Occasion, Star_Category, Stay_Type, Highlights, Day_Wise_Itinerary, Day_Wise_Itinerary_Details } = draft
      const res = await staffFetch<{ images: GenImage[]; failed: Array<{ scene: string; error: string }> }>('/api/admin/packages/ai-images', {
        package: { Destination_Name, Destination_ID, Slug, Overview, Location_Breakup, Occasion, Star_Category, Stay_Type, Highlights, Day_Wise_Itinerary, Day_Wise_Itinerary_Details },
        count,
        style: style.trim() || undefined,
      })
      setResults((r) => [...res.images, ...r])
      if (res.failed.length) setError(`${res.failed.length} image${res.failed.length > 1 ? 's' : ''} failed: ${res.failed.map((f) => `${f.scene} (${f.error})`).join('; ')}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const setCover = (img: GenImage) => onChange({ Primary_Image_URL: img.url, Image_Alt_Text: img.alt, Gallery_Images: g.filter((u) => u !== img.url) })
  const toggleGallery = (img: GenImage) => onChange({ Gallery_Images: g.includes(img.url) ? g.filter((u) => u !== img.url) : [...g, img.url] })

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <SectionTitle title="🎨 Generate images" description="Photorealistic photos made from this package's own itinerary (about 1–2 minutes). Pick a cover and gallery photos." />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-gray-700">
          How many
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={cx(inputClass, 'mt-1 w-24')} disabled={busy}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="min-w-[200px] flex-1 text-xs font-semibold text-gray-700">
          Style / focus <span className="font-normal text-gray-400">(optional)</span>
          <input value={style} onChange={(e) => setStyle(e.target.value)} maxLength={300} className={cx(inputClass, 'mt-1')} placeholder="e.g. snowy winter look, more scenery, sunset dinner" disabled={busy} />
        </label>
        <Button type="button" onClick={generate} loading={busy} disabled={busy || !canGenerate} title={canGenerate ? '' : 'Add the package name and itinerary first'}>
          {results.length ? <RefreshCw className="h-4 w-4" /> : <Palette className="h-4 w-4" />} {results.length ? 'Regenerate' : 'Generate images'}
        </Button>
      </div>
      {!canGenerate && <p className="text-xs text-gray-500">Add the package name and overview or itinerary first — the photos are based on them.</p>}
      {busy && <p className="text-xs text-gray-500">{elapsed}s — writing photo briefs and rendering {count} image{count > 1 ? 's' : ''}…</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((img) => {
            const isCover = cover === img.url
            const inGallery = g.includes(img.url)
            return (
              <div key={img.url} className={cx('overflow-hidden rounded-xl border bg-white', isCover ? 'border-bordeaux-500 ring-2 ring-bordeaux-200' : 'border-gray-200')}>
                <a href={img.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${img.url}?tr=w-640`} alt={img.alt} className="aspect-[3/2] w-full object-cover" loading="lazy" />
                </a>
                <div className="space-y-2 p-2.5">
                  <p className="truncate text-xs font-semibold text-gray-800" title={img.alt}>{img.scene}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" size="sm" variant={isCover ? 'primary' : 'secondary'} onClick={() => setCover(img)} disabled={isCover}>
                      <Star className="h-3.5 w-3.5" /> {isCover ? 'Cover' : 'Set as cover'}
                    </Button>
                    <Button type="button" size="sm" variant={inGallery ? 'primary' : 'secondary'} onClick={() => toggleGallery(img)} disabled={isCover}>
                      {inGallery ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {inGallery ? 'In gallery' : 'Add to gallery'}
                    </Button>
                  </div>
                  <details className="text-[11px] text-gray-500">
                    <summary className="cursor-pointer">Prompt</summary>
                    <p className="mt-1">{img.prompt}</p>
                  </details>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Edit Gallery_Images by hand: reorder, remove, paste a URL. */
export function GalleryEditor({ draft, onChange }: Props) {
  const [url, setUrl] = useState('')
  const g = gallery(draft)
  const cover = packageImage(draft.Primary_Image_URL)
  const save = (list: string[]) => onChange({ Gallery_Images: list })
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= g.length) return
    const n = [...g]
    ;[n[i], n[j]] = [n[j], n[i]]
    save(n)
  }
  const add = () => {
    const list = cleanGallery([...g, ...url.split(/\s+/)])
    save(list)
    setUrl('')
  }
  const validUrl = /^https?:\/\/\S+$/i.test(url.trim())

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <SectionTitle title="Photo gallery" description="Extra photos on the package page, after the main photo. Without any, the page shows generic photos." />
      {g.length === 0 ? (
        <p className="text-xs text-gray-500">No gallery photos yet.</p>
      ) : (
        <ul className="space-y-2">
          {g.map((u, i) => (
            <li key={u} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.includes('ik.imagekit.io') ? `${u}?tr=w-200` : u} alt="" className="h-12 w-[72px] shrink-0 rounded-md object-cover" loading="lazy" />
              <span className="min-w-0 flex-1 truncate text-xs text-gray-600" title={u}>{u}</span>
              {u === cover && <span className="text-[10px] font-semibold text-bordeaux-700">also cover</span>}
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === g.length - 1} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => save(g.filter((x) => x !== u))} className="rounded p-1 text-red-500 hover:bg-red-50" title="Remove"><X className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (validUrl) add() } }} className={cx(inputClass, 'text-xs')} placeholder="Paste an image link (https://…)" />
        <Button type="button" variant="secondary" size="sm" onClick={add} disabled={!validUrl}><ImagePlus className="h-3.5 w-3.5" /> Add</Button>
      </div>
    </div>
  )
}
