export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextResponse } from 'next/server'
import { claudeJson, imageBlock, AiImagesError } from '@/lib/aiImagesClaude'
import { ALL_ITEM_IDS } from '@/lib/aiImagesCatalog'

const str = { type: 'string' }
const strList = { type: 'array', items: { type: 'string' } }
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
})

const VENUE_SCHEMA = obj({
  venueType: str,
  summary: str,
  setting: str,
  estimatedSize: obj({ dimensions: str, ceilingHeight: str, guestCapacity: str }),
  camera: obj({ angle: str, height: str, lens: str, framing: str }),
  architecture: obj({ ceiling: str, walls: str, floor: str, columns: str, windowsAndDoors: str, fixedFeatures: strList }),
  existingDecor: strList,
  lighting: obj({ naturalLight: str, artificialLight: str, colorTemperature: str, mood: str }),
  colorPalette: strList,
  materials: strList,
  currentStyle: str,
  placementZones: {
    type: 'array',
    items: obj({ zone: str, location: str, bestFor: str }),
  },
  mustPreserve: strList,
  limitations: strList,
  suggestedItemIds: { type: 'array', items: { type: 'string', enum: ALL_ITEM_IDS } },
})

const SYSTEM = `You are a senior event designer and architectural photographer auditing a venue (banquet hall, ballroom, lawn, terrace or similar) from photos.
Your analysis will be used to write image-editing prompts that add event decor to the FIRST photo while keeping the venue itself recognisably identical — so precision about the existing space matters more than flattery.

Rules:
- Describe only what is visible; when you estimate (size, capacity, ceiling height) say "approx." and give a range.
- If several photos are given, treat them as the same venue from different angles. Describe the camera only for photo 1.
- "camera": exact viewpoint of photo 1 — eye-level/elevated, where it stands (e.g. "from the entrance looking toward the far wall"), wide/normal lens feel, what is in the foreground/background.
- "placementZones": concrete areas in photo 1 where decor can physically go (e.g. "far wall centre — ideal for stage", "open floor in the middle third — table layout"), using left/right/centre/foreground/background.
- "mustPreserve": architectural elements that must stay unchanged in edits (ceiling shape, pillars, windows, flooring pattern, fixed chandeliers, doors).
- "limitations": anything restricting decor (low ceiling, narrow space, harsh daylight, cluttered items that should be cleared).
- "suggestedItemIds": up to 8 decor ids that would suit this space best.
- If the photo is not a venue, still fill every field honestly and say so in "summary".`

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }
  try {
    const { images } = await request.json()
    if (!Array.isArray(images) || images.length === 0 || images.length > 4) {
      return NextResponse.json({ error: 'Upload between 1 and 4 images.' }, { status: 400 })
    }

    const content = [
      ...images.flatMap((img: string, i: number) => [
        { type: 'text' as const, text: `Photo ${i + 1}${i === 0 ? ' (the photo that will be edited)' : ''}:` },
        imageBlock(String(img)),
      ]),
      { type: 'text' as const, text: 'Analyse this venue in full detail.' },
    ]

    const analysis = await claudeJson({ system: SYSTEM, content, schema: VENUE_SCHEMA, effort: 'medium' })
    return NextResponse.json({ analysis })
  } catch (err: any) {
    console.error('[ai-images/analyze] error:', err)
    const status = err instanceof AiImagesError ? err.status : 500
    return NextResponse.json({ error: err?.message ?? 'Failed to analyse images' }, { status })
  }
}
