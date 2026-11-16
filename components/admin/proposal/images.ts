/**
 * Walks every photo a proposal renders, so renderProposalPdf can inline + downscale each one once.
 * Sizes are tuned per use (html2canvas captures pages at 2×, so a tile never needs more than ~2× its box).
 */
import type { ProposalData, ProposalImage } from './types'

export const IMAGE_MAX = {
    cover: 1600,
    mosaic: 1000,
    screenshot: 1400,
    day: 1000,
    room: 800,
} as const

export const IMAGE_QUALITY = 0.82

type Resolver = (url: string, maxW: number) => Promise<string>

/** Returns a copy of `d` with every image URL passed through `resolve` (same URL+size is only resolved once). */
export async function mapProposalImages(d: ProposalData, resolve: Resolver, concurrency = 4): Promise<ProposalData> {
    const jobs = new Map<string, { url: string; maxW: number; result?: string }>()
    const keyOf = (url: string, maxW: number) => `${maxW}|${url}`
    const want = (url: string | undefined, maxW: number) => {
        if (!url) return
        const k = keyOf(url, maxW)
        if (!jobs.has(k)) jobs.set(k, { url, maxW })
    }

    want(d.trip.heroImage, IMAGE_MAX.cover)
    d.stayOptions.forEach((o) => {
        o.images.slice(0, 6).forEach((im) => want(im.url, IMAGE_MAX.mosaic))
        o.hotels.forEach((h) => h.images.slice(0, 1).forEach((im) => want(im.url, IMAGE_MAX.room)))
    })
    want(d.flightInfo.outbound?.url, IMAGE_MAX.screenshot)
    want(d.flightInfo.inbound?.url, IMAGE_MAX.screenshot)
    d.dayPhotos.forEach((im) => want(im.url, IMAGE_MAX.day))
    // same size as dayPhotos so a featured photo and its day thumbnail resolve to the same data URL
    d.days.forEach((day) => (day.images || []).forEach((im) => want(im.url, IMAGE_MAX.day)))

    const list = Array.from(jobs.values())
    let next = 0
    const worker = async () => {
        while (next < list.length) {
            const job = list[next++]
            try { job.result = await resolve(job.url, job.maxW) } catch { job.result = '' }
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker))

    const get = (url: string | undefined, maxW: number) => (url ? jobs.get(keyOf(url, maxW))?.result ?? '' : '')
    const img = (im: ProposalImage | undefined, maxW: number): ProposalImage | undefined => (im ? { ...im, url: get(im.url, maxW) } : im)

    return {
        ...d,
        trip: { ...d.trip, heroImage: get(d.trip.heroImage, IMAGE_MAX.cover) },
        stayOptions: d.stayOptions.map((o) => ({
            ...o,
            images: o.images.slice(0, 6).map((im) => img(im, IMAGE_MAX.mosaic)!),
            hotels: o.hotels.map((h) => ({ ...h, images: h.images.slice(0, 1).map((im) => img(im, IMAGE_MAX.room)!) })),
        })),
        flightInfo: { ...d.flightInfo, outbound: img(d.flightInfo.outbound, IMAGE_MAX.screenshot), inbound: img(d.flightInfo.inbound, IMAGE_MAX.screenshot) },
        dayPhotos: d.dayPhotos.map((im) => img(im, IMAGE_MAX.day)!),
        days: d.days.map((day) => ({ ...day, images: (day.images || []).map((im) => img(im, IMAGE_MAX.day)!) })),
    }
}
