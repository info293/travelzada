/**
 * Firestore + image storage for the decor studio (client-side, same pattern as the rest of the app).
 *  - decor_catalog: a vendor's real items with photo and price
 *  - decor_designs: a design shared with a customer — options, items, comments, approval, booking, delivery
 */
import {
  addDoc, arrayUnion, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface CatalogItem {
  id: string
  vendorId: string
  name: string
  category: string
  description: string
  price: number
  imageUrl: string
  createdAt: number
}

export interface DesignItem {
  id: string
  name: string
  category: string
  qty: number
  /** null = generic idea with no price yet; the vendor quotes it separately */
  price: number | null
  imageUrl?: string
}

export interface DesignOption {
  title: string
  concept: string
  url: string
  hd: boolean
}

export interface DesignComment {
  id: string
  optionIndex: number
  /** Pin position as a fraction of the image (0–1) */
  x: number
  y: number
  text: string
  author: 'customer' | 'vendor'
  name: string
  at: number
  resolved: boolean
  replies: { text: string; author: 'customer' | 'vendor'; name: string; at: number }[]
}

export interface DesignDoc {
  id: string
  vendorId: string
  vendorName: string
  vendorPhone: string
  title: string
  eventLabel: string
  styleLabel: string
  hallUrl: string
  aspect: number
  options: DesignOption[]
  items: DesignItem[]
  advancePercent: number
  status: 'shared' | 'approved' | 'booked' | 'delivered'
  approval?: { optionIndex: number; name: string; phone: string; at: number }
  booking?: { eventDate: string; guests: string; note: string; advanceAmount: number; status: 'requested' | 'advance_received'; at: number }
  comments: DesignComment[]
  views: { label: string; url: string }[]
  delivered: { url: string; at: number }[]
  createdAt: number
  updatedAt: number
}

export const formatINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export function designTotal(items: DesignItem[]) {
  const priced = items.filter((i) => i.price !== null)
  return {
    total: priced.reduce((sum, i) => sum + (i.price as number) * i.qty, 0),
    unpriced: items.length - priced.length,
  }
}

/** Uploads a data URL (or File) to ImageKit through the existing upload route and returns its public URL. */
export async function uploadImage(source: string | File, folder: string, fileName: string): Promise<string> {
  const file = typeof source === 'string' ? await (await fetch(source)).blob() : source
  const form = new FormData()
  form.append('file', file, `${fileName}.jpg`)
  form.append('folder', folder)
  form.append('fileName', fileName)
  const res = await fetch('/api/imagekit/upload', { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || 'Image upload failed')
  return data.url as string
}

/** Fetches a remote image as a data URL (needed to send a saved design back to the render API, or into a PDF). */
export async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(blob)
  })
}

/** Shrinks a photo from the user's device to a JPEG data URL the AI routes accept. */
export function fileToJpeg(file: File, maxEdge = 2048): Promise<{ dataUrl: string; aspect: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('That file is not a supported image'))
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), aspect: img.width / img.height })
    }
    img.src = URL.createObjectURL(file)
  })
}

// ── Catalogue ──

export async function listCatalog(vendorId: string): Promise<CatalogItem[]> {
  const snap = await getDocs(query(collection(db, 'decor_catalog'), where('vendorId', '==', vendorId)))
  return snap.docs.map((d) => ({ ...(d.data() as Omit<CatalogItem, 'id'>), id: d.id })).sort((a, b) => b.createdAt - a.createdAt)
}

export async function addCatalogItem(item: Omit<CatalogItem, 'id' | 'createdAt'>): Promise<CatalogItem> {
  const data = { ...item, createdAt: Date.now() }
  const ref = await addDoc(collection(db, 'decor_catalog'), data)
  return { ...data, id: ref.id }
}

export const deleteCatalogItem = (id: string) => deleteDoc(doc(db, 'decor_catalog', id))

// ── Designs ──

export async function createDesign(design: Omit<DesignDoc, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'views' | 'delivered' | 'status'>): Promise<string> {
  const now = Date.now()
  const ref = await addDoc(collection(db, 'decor_designs'), {
    ...design, status: 'shared', comments: [], views: [], delivered: [], createdAt: now, updatedAt: now,
  })
  return ref.id
}

export async function listDesigns(vendorId: string): Promise<DesignDoc[]> {
  const snap = await getDocs(query(collection(db, 'decor_designs'), where('vendorId', '==', vendorId)))
  return snap.docs.map((d) => ({ ...(d.data() as Omit<DesignDoc, 'id'>), id: d.id })).sort((a, b) => b.createdAt - a.createdAt)
}

export function watchDesign(id: string, onChange: (design: DesignDoc | null) => void, onError: (err: Error) => void) {
  return onSnapshot(
    doc(db, 'decor_designs', id),
    (snap) => onChange(snap.exists() ? { ...(snap.data() as Omit<DesignDoc, 'id'>), id: snap.id } : null),
    onError
  )
}

export const updateDesign = (id: string, patch: Record<string, unknown>) =>
  updateDoc(doc(db, 'decor_designs', id), { ...patch, updatedAt: Date.now() })

export const appendToDesign = (id: string, field: 'views' | 'delivered', value: unknown) =>
  updateDoc(doc(db, 'decor_designs', id), { [field]: arrayUnion(value), updatedAt: Date.now() })

export const deleteDesign = (id: string) => deleteDoc(doc(db, 'decor_designs', id))
