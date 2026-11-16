'use client'

/**
 * Client side of quote image uploads: downscale in the browser (max 2000 px, JPEG 0.85 — small PNG screenshots
 * are kept as PNG so text stays crisp), then POST to the staff-only /api/admin/quotes/upload-image with progress.
 */
import { auth } from '@/lib/firebase'

export const UPLOAD_MAX_DIM = 2000
export const UPLOAD_QUALITY = 0.85
const KEEP_PNG_UNDER = 900 * 1024

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new window.Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('This file could not be read as an image (HEIC? try JPG/PNG).'))
        img.src = src
    })
}

/** Downscale + re-encode. Returns the original file when it is already small enough. */
export async function prepareImage(file: Blob, maxDim = UPLOAD_MAX_DIM, quality = UPLOAD_QUALITY): Promise<Blob> {
    const type = file.type || ''
    if (type === 'image/gif' || type === 'image/svg+xml') return file
    const url = URL.createObjectURL(file)
    try {
        const img = await loadImage(url)
        const w0 = img.naturalWidth || maxDim
        const h0 = img.naturalHeight || maxDim
        const ratio = Math.min(1, maxDim / Math.max(w0, h0))
        if (ratio === 1 && ((type === 'image/png' && file.size <= KEEP_PNG_UNDER) || (type === 'image/jpeg' && file.size <= 700 * 1024))) return file
        const w = Math.max(1, Math.round(w0 * ratio))
        const h = Math.max(1, Math.round(h0 * ratio))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return file
        ctx.fillStyle = '#ffffff' // transparent PNG → white, not black
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality))
        return blob && blob.size < file.size ? blob : file
    } finally {
        URL.revokeObjectURL(url)
    }
}

/** Upload one (already prepared) image. Resolves to the ImageKit URL. */
export async function uploadQuoteImage(blob: Blob, opts: { folder: string; fileName?: string; onProgress?: (pct: number) => void }): Promise<string> {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('Please log in again to upload images.')
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/gif' ? 'gif' : blob.type === 'image/svg+xml' ? 'svg' : 'jpg'
    const base = (opts.fileName || 'photo').replace(/\.[a-z0-9]+$/i, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 50) || 'photo'
    const form = new FormData()
    form.append('file', blob, `${base}.${ext}`)
    form.append('folder', opts.folder)
    form.append('fileName', `${base}.${ext}`)

    return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/admin/quotes/upload-image')
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100)) }
        xhr.onerror = () => reject(new Error('Network error while uploading.'))
        xhr.onload = () => {
            let data: any = {}
            try { data = JSON.parse(xhr.responseText || '{}') } catch { /* ignore */ }
            if (xhr.status >= 200 && xhr.status < 300 && data?.url) resolve(String(data.url))
            else reject(new Error(data?.error || `Upload failed (${xhr.status})`))
        }
        xhr.send(form)
    })
}

/** Is this pasted / typed text a usable image URL? */
export function looksLikeImageUrl(text: string) {
    const t = text.trim()
    return /^https?:\/\/\S+$/i.test(t) && (/\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(t) || /ik\.imagekit\.io|images\.unsplash\.com|googleusercontent|cloudinary|firebasestorage/i.test(t))
}
