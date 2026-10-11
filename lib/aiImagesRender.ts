import OpenAI, { toFile } from 'openai'
import { claudeJson, imageBlock, parseDataUrl, AiImagesError } from '@/lib/aiImagesClaude'
import type { DecorItem } from '@/lib/aiImagesCatalog'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// gpt-image-1 is the OpenAI model that edits a real photo (DALL-E 3 can only generate from text)
const IMAGE_MODEL = process.env.AI_IMAGES_MODEL || 'gpt-image-1'

type Quality = 'low' | 'medium' | 'high'
// Drafts are ~4x cheaper than HD; the user upgrades only the design they like
export const QUALITY: Record<'draft' | 'hd', Quality> = {
  draft: (process.env.AI_IMAGES_DRAFT_QUALITY || 'medium') as Quality,
  hd: (process.env.AI_IMAGES_HD_QUALITY || 'high') as Quality,
}

/** A decor item to render: a built-in catalogue idea, or a vendor's own product (optionally with a reference photo). */
export type Item = DecorItem & {
  category: string
  qty?: number
  /** 0-based index into the reference photos sent to the image model, when the vendor supplied a product photo */
  ref?: number
}
export type ImageInput = { buffer: Buffer; mediaType: string }

// Each reference photo adds input cost and dilutes the others, so only the first few are sent
const MAX_REFERENCES = 4
const MAX_CUSTOM_ITEMS = 12
const REFERENCE_HOSTS = ['ik.imagekit.io']

async function loadReference(src: string): Promise<ImageInput> {
  if (src.startsWith('data:')) {
    const { mediaType, data } = parseDataUrl(src)
    return { buffer: Buffer.from(data, 'base64'), mediaType }
  }
  // Only fetch from our own image CDN — never an arbitrary URL supplied by the client
  const url = new URL(src)
  if (url.protocol !== 'https:' || !REFERENCE_HOSTS.includes(url.hostname)) throw new AiImagesError('Item photos must be uploaded to the catalogue first.', 400)
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  const mediaType = (res.headers.get('content-type') || '').split(';')[0]
  if (!res.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) throw new AiImagesError('Could not load an item photo from the catalogue.', 400)
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length > 8 * 1024 * 1024) throw new AiImagesError('An item photo is too large.', 400)
  return { buffer, mediaType }
}

/** Turns the vendor's own catalogue items sent by the client into render items + their reference photos. */
export async function loadCustomItems(raw: unknown): Promise<{ items: Item[]; references: ImageInput[] }> {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_CUSTOM_ITEMS) : []
  const items: Item[] = []
  const sources: string[] = []
  for (const r of list) {
    const name = String(r?.name || '').trim().slice(0, 80)
    const id = String(r?.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
    if (!name || !id) continue
    const item: Item = {
      id: `c-${id}`,
      label: name,
      prompt: String(r?.description || name).trim().slice(0, 300),
      category: String(r?.category || 'Vendor catalogue').slice(0, 40),
      qty: Math.min(500, Math.max(1, Math.round(Number(r?.qty) || 1))),
    }
    if (typeof r?.imageUrl === 'string' && r.imageUrl && sources.length < MAX_REFERENCES) {
      item.ref = sources.length
      sources.push(r.imageUrl)
    }
    items.push(item)
  }
  return { items, references: await Promise.all(sources.map(loadReference)) }
}

/** Opening paragraph that tells the image model which input is the scene and which are product photos. */
export function referencePreamble(count: number): string {
  if (count === 0) return ''
  const range = count === 1 ? 'Image 2 is a REFERENCE photo' : `Images 2–${count + 1} are REFERENCE photos`
  return `Image 1 is the venue photo to edit. ${range} of the decorator's real products; they are not part of the scene. Copy the products from them faithfully, but never copy their rooms, backgrounds or furniture.`
}
export type Size = '1536x1024' | '1024x1536' | '1024x1024'
export type Check = { itemId: string; label: string; present: boolean; note: string }

export function pickSize(aspect: number): Size {
  if (aspect >= 1.2) return '1536x1024'
  if (aspect <= 0.83) return '1024x1536'
  return '1024x1024'
}

/** Edits `image`. Any `references` are sent after it as extra inputs (product photos, or a design to match). */
export async function editImage(image: ImageInput, prompt: string, size: Size, quality: Quality, references: ImageInput[] = []) {
  const file = (input: ImageInput, name: string) => toFile(input.buffer, `${name}.${input.mediaType.split('/')[1]}`, { type: input.mediaType })
  const result = await openai.images.edit({
    model: IMAGE_MODEL,
    image: references.length
      ? await Promise.all([file(image, 'venue'), ...references.map((r, i) => file(r, `reference-${i + 1}`))])
      : await file(image, 'venue'),
    prompt,
    size,
    quality,
    input_fidelity: 'high',
    output_format: 'jpeg',
    output_compression: 92,
    n: 1,
  })
  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error('No image returned')
  return b64
}

const VERIFY_SYSTEM = `You inspect AI-edited event venue photos for a decor client. For each requested item, decide whether a guest would recognise it in the image.
Count it as present when its defining feature is visible, even if it is blended with another item (e.g. fairy lights woven into ceiling drapes still count as a fairy-light canopy).
Count it as missing when it is absent, unrecognisable, or replaced by a different kind of item. Keep "note" under 15 words.`

export async function verify(b64: string, items: Item[]): Promise<Check[]> {
  const { items: checks } = await claudeJson<{ items: { itemId: string; present: boolean; note: string }[] }>({
    system: VERIFY_SYSTEM,
    content: [
      imageBlock(`data:image/jpeg;base64,${b64}`),
      { type: 'text', text: `Requested items:\n${items.map((i) => `- ${i.id}: ${i.label} (${i.prompt})`).join('\n')}` },
    ],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string', enum: items.map((i) => i.id) },
              present: { type: 'boolean' },
              note: { type: 'string' },
            },
            required: ['itemId', 'present', 'note'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
    effort: 'low',
  })
  // Anything the checker forgot to mention counts as missing
  return items.map((item) => {
    const c = checks.find((x) => x.itemId === item.id)
    return { itemId: item.id, label: item.label, present: c?.present ?? false, note: c?.note ?? '' }
  })
}

export function imageErrorMessage(err: any): string {
  if (err instanceof OpenAI.APIError && err.code === 'moderation_blocked') return 'Blocked by the image safety filter. Try different items or notes.'
  if (err instanceof OpenAI.RateLimitError) return 'OpenAI rate limit hit. Retry in a minute.'
  return err?.message ?? 'Image generation failed'
}
