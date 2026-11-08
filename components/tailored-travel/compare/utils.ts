// Only `import type` from lib/planner/* here — those modules pull in server SDKs.
import type { ItemStatus, ItineraryExtraction } from '@/lib/planner/itinerary'

/** Same as formatPrice in lib/planner/itinerary.ts (kept client-side to avoid bundling server code) */
export function priceText(p?: ItineraryExtraction['price'] | null): string {
  if (!p) return ''
  const cur = (p.currency || 'INR').toUpperCase()
  const fmt = (n: number) => (cur === 'INR' ? '₹' + Math.round(n).toLocaleString('en-IN') : `${cur} ${Math.round(n).toLocaleString('en-IN')}`)
  if (p.total) return `${fmt(p.total)} total${p.perPerson ? ` · ${fmt(p.perPerson)} per person` : ''}`
  if (p.perPerson) return `${fmt(p.perPerson)} per person`
  return p.text || ''
}

export const WHATSAPP_NUMBER = '919929962350'

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

export const inr = (n?: number | null) => (n ? '₹' + Math.round(n).toLocaleString('en-IN') : '')

export function getSessionId(): string {
  const make = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  try {
    const key = 'tz_planner_sid'
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    const id = make()
    window.localStorage.setItem(key, id)
    return id
  } catch {
    return make()
  }
}

/**
 * Phone photos are often 4–8 MB; Claude accepts images up to 5 MB. Shrink big photos to ≤ 2200 px JPEG in the
 * browser (this also converts HEIC on Safari). PDFs and small images pass through untouched.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const needs = file.size > 1.5 * 1024 * 1024 || /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  if (!needs) return file
  try {
    const url = URL.createObjectURL(file)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    const max = 2200
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export const STATUS_META: Record<ItemStatus, { label: string; chip: string; dot: string }> = {
  included: { label: 'Included', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  similar: { label: 'Similar', chip: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  not_included: { label: 'Not in our package', chip: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400' },
}
