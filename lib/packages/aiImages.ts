/**
 * "Generate images" for a package (server-side only).
 *
 * 1. Claude reads the package (title, route, day-by-day) and writes N distinct photo briefs: a hero shot of an
 *    Indian couple at an iconic spot of THIS itinerary, plus scenes from specific days.
 * 2. OpenAI gpt-image-1 renders them in parallel (landscape 1536x1024, JPEG). Partial failure is tolerated.
 * 3. Each JPEG is uploaded to ImageKit under /packages/ai/{slug}.
 */
import OpenAI from 'openai'
import { askJson, S } from '@/lib/planner/ai'
import { slugify } from '@/components/admin/catalog/packageUtils'

// gpt-image-1 has been retired on our OpenAI account ("model does not exist"), so newer models come first.
// The first model that works is remembered for the life of the server process.
const IMAGE_MODELS = Array.from(new Set([process.env.PACKAGE_IMAGES_MODEL, 'gpt-image-2', 'gpt-image-1.5', 'gpt-image-1'].filter(Boolean) as string[]))
let workingModel: string | null = null
export type ImageQuality = 'medium' | 'high'
export const DEFAULT_QUALITY: ImageQuality = (process.env.PACKAGE_IMAGES_QUALITY as ImageQuality) || 'high'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export class AiImagesError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export interface PackageImageInput {
  Destination_Name?: string
  Destination_ID?: string
  Slug?: string
  Overview?: string
  Location_Breakup?: string
  Occasion?: string
  Star_Category?: string
  Stay_Type?: string
  Highlights?: string[]
  Day_Wise_Itinerary?: string
  Day_Wise_Itinerary_Details?: Array<{ title?: string; description?: string; activities?: string[] }>
}

export interface ImageBrief { scene: string; prompt: string; alt: string }
export interface GeneratedImage { url: string; prompt: string; alt: string; scene: string; ms: number; bytes?: Buffer }
export interface AiImagesResult { images: Array<Omit<GeneratedImage, 'bytes'>>; failed: Array<{ scene: string; error: string }>; folder: string }

const clip = (s: unknown, n: number) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

export function cleanPackageInput(raw: any): PackageImageInput {
  const p = raw && typeof raw === 'object' ? raw : {}
  const days = Array.isArray(p.Day_Wise_Itinerary_Details) ? p.Day_Wise_Itinerary_Details.slice(0, 12) : []
  return {
    Destination_Name: clip(p.Destination_Name, 140),
    Destination_ID: clip(p.Destination_ID, 30),
    Slug: clip(p.Slug, 90),
    Overview: clip(p.Overview, 1800),
    Location_Breakup: clip(p.Location_Breakup, 240),
    Occasion: clip(p.Occasion, 60),
    Star_Category: clip(p.Star_Category, 20),
    Stay_Type: clip(p.Stay_Type, 30),
    Highlights: Array.isArray(p.Highlights) ? p.Highlights.slice(0, 10).map((h: unknown) => clip(h, 120)) : [],
    Day_Wise_Itinerary: clip(p.Day_Wise_Itinerary, 800),
    Day_Wise_Itinerary_Details: days.map((d: any) => ({
      title: clip(d?.title, 120),
      description: clip(d?.description, 400),
      activities: Array.isArray(d?.activities) ? d.activities.slice(0, 6).map((a: unknown) => clip(a, 80)) : [],
    })),
  }
}

const BRIEF_SYSTEM = `You are the photo director of a premium Indian travel magazine. You write prompts for a photorealistic image model to create the cover and gallery photos of ONE romantic travel package for Indian couples.

Every prompt must:
- Be specific to THIS itinerary: name the exact place (e.g. "Kelingking Beach cliff viewpoint on Nusa Penida", "a shikara on Dal Lake at dawn with the Zabarwan range behind", "a kettuvallam houseboat on the Alleppey backwaters") and describe what is really there — accurate landmark shapes, vegetation, architecture, weather and light for the season. No fantasy, no invented or distorted landmarks, no impossible combinations.
- Read like a real photograph: "photorealistic travel-magazine photograph, shot on a full-frame camera, 35mm or 50mm lens, natural light", landscape 3:2 composition with the subject off-centre and room for the place.
- When a couple appears: a romantic Indian couple in their late 20s–30s, natural skin tones and real proportions, candid and relaxed (walking, laughing, looking at the view — not posing for the camera), respectful modest clothing that suits the place and climate (e.g. pherans or warm jackets in Kashmir, light linen at the beach, covered shoulders at temples). Faces small or partially turned is fine.
- End with: "No text, no watermarks, no logos, no borders."

Image 1 is the HERO: the couple at the most iconic spot of this itinerary at golden hour. The others are distinct scenes from specific days of the itinerary (different places, times of day and framings: one may be a scenery-only wide shot or a detail of the stay/experience). Never repeat a location.
"alt" is SEO alt text (8–16 words) naming the place, e.g. "Couple on a shikara ride on Dal Lake, Srinagar at sunrise". "scene" is a 2–5 word label.`

async function writeBriefs(pkg: PackageImageInput, count: number, style?: string): Promise<ImageBrief[]> {
  const days = (pkg.Day_Wise_Itinerary_Details || []).length
    ? pkg.Day_Wise_Itinerary_Details!.map((d, i) => `Day ${i + 1}: ${d.title}${d.description ? ` — ${d.description}` : ''}${d.activities?.length ? ` [${d.activities.join('; ')}]` : ''}`).join('\n')
    : pkg.Day_Wise_Itinerary || ''
  const content = [
    `Package: ${pkg.Destination_Name}`,
    pkg.Location_Breakup ? `Route: ${pkg.Location_Breakup}` : '',
    pkg.Occasion ? `Occasion: ${pkg.Occasion}` : '',
    pkg.Star_Category || pkg.Stay_Type ? `Stay: ${[pkg.Star_Category, pkg.Stay_Type].filter(Boolean).join(' ')}` : '',
    pkg.Overview ? `Overview: ${pkg.Overview}` : '',
    pkg.Highlights?.length ? `Highlights: ${pkg.Highlights.join('; ')}` : '',
    days ? `Itinerary:\n${days}` : '',
    style ? `Extra direction from our team: ${style}` : '',
    '',
    `Write exactly ${count} image brief${count > 1 ? 's' : ''}.`,
  ]
    .filter(Boolean)
    .join('\n')
  const { images } = await askJson<{ images: ImageBrief[] }>({
    system: BRIEF_SYSTEM,
    content,
    schema: S.obj({ images: S.arr(S.obj({ scene: S.str(), prompt: S.str('80–160 words'), alt: S.str() })) }),
    effort: 'medium',
    maxTokens: 6000,
    label: 'package-ai-images',
  })
  const out = (images || []).filter((b) => b?.prompt).slice(0, count)
  if (!out.length) throw new AiImagesError('Could not write image ideas for this package. Please try again.', 502)
  return out
}

async function render(prompt: string, quality: ImageQuality): Promise<Buffer> {
  if (!openai) throw new AiImagesError('Image generation is not configured (OPENAI_API_KEY).', 500)
  const models = workingModel ? [workingModel] : IMAGE_MODELS
  let lastErr: unknown
  for (const model of models) {
    try {
      const res = await openai.images.generate(
        { model, prompt, size: '1536x1024', quality, output_format: 'jpeg', output_compression: 88, n: 1 },
        { timeout: 170_000, maxRetries: 0 },
      )
      const b64 = res.data?.[0]?.b64_json
      if (!b64) throw new Error('No image returned')
      workingModel = model
      return Buffer.from(b64, 'base64')
    } catch (err) {
      lastErr = err
      // Only move on to the next model when this one is unavailable to us
      const unavailable = err instanceof OpenAI.APIError && (err.status === 404 || (err.status === 400 && /does not exist|not found|unsupported model|verified/i.test(err.message)))
      if (!unavailable) throw err
      console.warn(`[package-ai-images] ${model} unavailable, trying next model`)
    }
  }
  throw lastErr
}

export const imageModelInUse = () => workingModel

/** Same upload as app/api/imagekit/upload/route.ts, done server-side. */
export async function uploadToImageKit(bytes: Buffer, fileName: string, folder: string): Promise<string> {
  const key = process.env.IMAGEKIT_PRIVATE_KEY
  if (!key) throw new AiImagesError('Image upload is not configured (IMAGEKIT_PRIVATE_KEY).', 500)
  const body = new URLSearchParams()
  body.set('file', bytes.toString('base64'))
  body.set('fileName', fileName)
  body.set('folder', folder)
  body.set('useUniqueFileName', 'true')
  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${key}:`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.url) throw new Error(data?.message || `Upload failed (${res.status})`)
  return String(data.url)
}

function imageError(err: any): string {
  if (err instanceof OpenAI.APIError && err.code === 'moderation_blocked') return 'Blocked by the image safety filter.'
  if (err instanceof OpenAI.RateLimitError) return 'OpenAI rate limit — retry in a minute.'
  return clip(err?.message || 'Image generation failed', 200)
}

export interface GenerateOptions {
  count: number
  style?: string
  quality?: ImageQuality
  /** ImageKit folder override (tests) */
  folder?: string
  /** Keep the JPEG bytes in the result (tests) */
  keepBytes?: boolean
}

export async function generatePackageImages(pkg: PackageImageInput, opts: GenerateOptions): Promise<AiImagesResult & { images: GeneratedImage[] }> {
  if (!pkg.Destination_Name && !pkg.Overview && !(pkg.Day_Wise_Itinerary_Details || []).length)
    throw new AiImagesError('Add the package name and itinerary first — the images are based on them.')
  const count = Math.min(4, Math.max(1, Math.round(opts.count || 1)))
  const quality = opts.quality || DEFAULT_QUALITY
  const slug = slugify(pkg.Slug || pkg.Destination_Name || pkg.Destination_ID || 'package') || 'package'
  const folder = opts.folder || `/packages/ai/${slug}`

  const briefs = await writeBriefs(pkg, count, opts.style ? clip(opts.style, 300) : undefined)
  const settled = await Promise.allSettled(
    briefs.map(async (b, i) => {
      const t0 = Date.now()
      const bytes = await render(b.prompt, quality)
      const url = await uploadToImageKit(bytes, `${slug}-${slugify(b.scene) || i + 1}.jpg`, folder)
      return { url, prompt: b.prompt, alt: b.alt, scene: b.scene, ms: Date.now() - t0, ...(opts.keepBytes ? { bytes } : {}) } as GeneratedImage
    }),
  )
  const images: GeneratedImage[] = []
  const failed: AiImagesResult['failed'] = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') images.push(r.value)
    else {
      console.warn('[package-ai-images]', briefs[i].scene, r.reason?.message)
      failed.push({ scene: briefs[i].scene, error: imageError(r.reason) })
    }
  })
  if (!images.length) throw new AiImagesError(`No image could be created: ${failed[0]?.error || 'unknown error'}`, 502)
  return { images, failed, folder }
}
