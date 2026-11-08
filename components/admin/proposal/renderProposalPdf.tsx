'use client'

/**
 * Renders the proposal pages offscreen, captures each A4 page with html2canvas and assembles a PDF with jsPDF.
 * Clickable areas: every element with data-pdf-link="<url>" becomes a link annotation at the same spot.
 *
 * Images: remote photos are fetched and inlined as data URLs first (so html2canvas never hits CORS / taint
 * problems). If an image can't be fetched, the page falls back to the brand gradient.
 */
import type { ProposalData } from './types'
import { LOGO_URL, PAGE_H, PAGE_W } from './types'

export interface RenderOptions {
    onProgress?: (message: string, done: number, total: number) => void
    /** html2canvas scale (default 2) */
    scale?: number
    /** JPEG quality 0–1 (default 0.86) */
    quality?: number
}

const A4_W_MM = 210
const A4_H_MM = 297
const PX_TO_MM = A4_W_MM / PAGE_W

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    return new Promise((resolve) => {
        const t = setTimeout(() => resolve(fallback), ms)
        p.then((v) => { clearTimeout(t); resolve(v) }).catch(() => { clearTimeout(t); resolve(fallback) })
    })
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result || ''))
        r.onerror = reject
        r.readAsDataURL(blob)
    })
}

function loadImg(src: string, crossOrigin?: boolean): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new window.Image()
        if (crossOrigin) img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

/** Downscale big photos to keep the PDF light; returns a JPEG data URL */
function imgToJpegDataUrl(img: HTMLImageElement, maxW = 1700, quality = 0.88): string {
    const ratio = Math.min(1, maxW / (img.naturalWidth || maxW))
    const w = Math.max(1, Math.round((img.naturalWidth || maxW) * ratio))
    const h = Math.max(1, Math.round((img.naturalHeight || maxW) * ratio))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(img, 0, 0, w, h)
    return c.toDataURL('image/jpeg', quality)
}

/** Remote photo → data URL (JPEG, downscaled). '' when it cannot be loaded. */
export async function inlinePhoto(url?: string): Promise<string> {
    if (!url) return ''
    if (url.startsWith('data:')) return url
    const attempt = async () => {
        try {
            const res = await fetch(url, { mode: 'cors', cache: 'force-cache' })
            if (!res.ok) throw new Error(String(res.status))
            const blob = await res.blob()
            if (!blob.type.startsWith('image/')) throw new Error('not an image')
            const objectUrl = URL.createObjectURL(blob)
            try {
                const img = await loadImg(objectUrl)
                return imgToJpegDataUrl(img)
            } finally {
                URL.revokeObjectURL(objectUrl)
            }
        } catch {
            // Second chance: <img crossorigin> (works for CDNs that send CORS headers only to image requests)
            const img = await loadImg(url, true)
            return imgToJpegDataUrl(img)
        }
    }
    return withTimeout(attempt(), 12000, '')
}

/** Same-origin asset (logo) → data URL, keeping PNG transparency */
async function inlineAsset(url: string): Promise<string> {
    const attempt = async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(String(res.status))
        return blobToDataUrl(await res.blob())
    }
    return withTimeout(attempt(), 8000, '')
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Make sure the exact next/font faces + weights used on the pages are loaded before measuring/capturing */
async function preloadFonts() {
    const fonts = (document as any).fonts
    if (!fonts?.load) return
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    const familyOf = (cssVar: string, fallback: string) => {
        probe.style.fontFamily = `var(${cssVar}), ${fallback}`
        return getComputedStyle(probe).fontFamily || fallback
    }
    const sans = familyOf('--font-sans', 'Figtree, sans-serif')
    const display = familyOf('--font-display', "'Cormorant Garamond', serif")
    probe.remove()
    const loads: Promise<unknown>[] = []
    ;['400', '600', '700', '800'].forEach((w) => loads.push(fonts.load(`${w} 20px ${sans}`, 'Aa₹')))
    ;['600', '700'].forEach((w) => loads.push(fonts.load(`${w} 40px ${display}`, 'Aa')))
    await withTimeout(Promise.all(loads), 6000, [])
    await withTimeout(fonts.ready as Promise<unknown>, 4000, undefined)
}

export async function renderProposalPdf(data: ProposalData, opts: RenderOptions = {}): Promise<Blob> {
    const scale = opts.scale ?? 2
    const quality = opts.quality ?? 0.86
    const progress = opts.onProgress || (() => {})

    progress('Preparing images…', 0, 1)
    const [{ default: html2canvas }, { jsPDF }, { createRoot }, { default: ProposalDocument }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
        import('react-dom/client'),
        import('./ProposalDocument'),
    ])

    const [hero, logo] = await Promise.all([inlinePhoto(data.trip.heroImage), inlineAsset(data.logoUrl || LOGO_URL)])
    const resolved: ProposalData = { ...data, trip: { ...data.trip, heroImage: hero }, logoUrl: logo }

    await preloadFonts().catch(() => {})

    // Offscreen host. In html2canvas' cloned document we move it back to 0,0 (see onclone).
    const host = document.createElement('div')
    host.setAttribute('data-proposal-host', '')
    host.style.cssText = `position:absolute;left:-30000px;top:0;width:${PAGE_W}px;pointer-events:none;z-index:-1;`
    document.body.appendChild(host)
    const root = createRoot(host)

    try {
        const pageCount = await withTimeout(
            new Promise<number>((resolve) => {
                root.render(<ProposalDocument data={resolved} onReady={resolve} />)
            }),
            15000,
            -1,
        )
        if (pageCount < 0) throw new Error('Proposal layout timed out')

        // Make sure every <img> inside is decoded, then let the browser paint
        const imgs = Array.from(host.querySelectorAll('img'))
        await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : withTimeout(new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r() }), 8000, undefined))))
        await nextFrame()
        await nextFrame()

        const pages = Array.from(host.querySelectorAll<HTMLElement>('[data-proposal-page]'))
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })

        for (let i = 0; i < pages.length; i++) {
            progress(`Designing page ${i + 1} of ${pages.length}…`, i, pages.length)
            const page = pages[i]
            const canvas = await html2canvas(page, {
                scale,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false,
                width: PAGE_W,
                height: PAGE_H,
                imageTimeout: 15000,
                onclone: (doc: Document) => {
                    const h = doc.querySelector('[data-proposal-host]') as HTMLElement | null
                    if (h) { h.style.left = '0px'; h.style.top = '0px' }
                },
            })
            const jpeg = canvas.toDataURL('image/jpeg', quality)
            if (i > 0) pdf.addPage('a4', 'p')
            pdf.addImage(jpeg, 'JPEG', 0, 0, A4_W_MM, A4_H_MM, undefined, 'FAST')

            // Link annotations
            const pageRect = page.getBoundingClientRect()
            page.querySelectorAll<HTMLElement>('[data-pdf-link]').forEach((el) => {
                const url = el.getAttribute('data-pdf-link')
                if (!url) return
                const r = el.getBoundingClientRect()
                if (!r.width || !r.height) return
                pdf.link((r.left - pageRect.left) * PX_TO_MM, (r.top - pageRect.top) * PX_TO_MM, r.width * PX_TO_MM, r.height * PX_TO_MM, { url })
            })
            canvas.width = 0
            canvas.height = 0
            await nextFrame()
        }

        progress('Finishing up…', pages.length, pages.length)
        return pdf.output('blob') as Blob
    } finally {
        root.unmount()
        host.remove()
    }
}

export function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
