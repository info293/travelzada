export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { requireUser } from '@/lib/aiImagesAuth'
import { NextResponse } from 'next/server'
import { claudeJson, imageBlock, parseDataUrl, AiImagesError } from '@/lib/aiImagesClaude'
import { resolveItems } from '@/lib/aiImagesCatalog'
import { QUALITY, editImage, imageErrorMessage, loadCustomItems, pickSize, referencePreamble, verify, type ImageInput, type Item } from '@/lib/aiImagesRender'

type Mode = 'regenerate' | 'fix' | 'hd' | 'refine' | 'angle' | 'closeup'
const MODES: Mode[] = ['regenerate', 'fix', 'hd', 'refine', 'angle', 'closeup']

const ANGLE_SYSTEM = `You are an event designer. Photo 1 is an undecorated venue. Photo 2 is the SAME venue from a different camera position, already decorated in the design the client approved.
Describe how that same decor must appear in photo 1, from photo 1's camera position.
- "venue": a short description of photo 1 (what is where: left, right, centre, foreground, background).
- "decor": one entry per distinct decor element visible in photo 2 (include every item in the given list). "placement" is where it sits in PHOTO 1's frame, worked out from the room's layout (for example a stage on the far wall in photo 2 may be on the left side of photo 1, or out of frame — then say "not visible from this angle"). "look" is its exact appearance in photo 2: materials, colours, flowers, scale.
- "mood": the lighting and colour mood of photo 2 in two sentences.`

const ANGLE_SCHEMA = {
  type: 'object',
  properties: {
    venue: { type: 'string' },
    decor: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, placement: { type: 'string' }, look: { type: 'string' } },
        required: ['name', 'placement', 'look'],
        additionalProperties: false,
      },
    },
    mood: { type: 'string' },
  },
  required: ['venue', 'decor', 'mood'],
  additionalProperties: false,
}

/**
 * POST /api/ai-images/render — one user-triggered action on one design.
 * Body: { mode, image (original venue photo), source? (current design), prompt, aspect, itemIds, missingIds?, instruction?, hd? }
 *  - regenerate: a fresh draft of the same design from the original photo
 *  - fix:        a fresh draft with the missing items pushed to the top of the prompt
 *  - hd:         re-renders the current design at high quality
 *  - refine:     applies the user's typed change to the current design
 *  - angle:      decorates another photo of the same venue (`image`) to match the approved design (`source`)
 *  - closeup:    a table-level detail view of the current design
 */
export async function POST(request: Request) {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY or ANTHROPIC_API_KEY' }, { status: 500 })
  }
  try {
    const { mode, image, source, prompt, aspect, itemIds, customItems, missingIds, instruction, hd } = await request.json()
    const custom = await loadCustomItems(customItems)
    const items: Item[] = [...custom.items, ...resolveItems(itemIds)]
    const size = pickSize(Number(aspect) || 1)
    if (!MODES.includes(mode)) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    const needsPrompt = mode === 'regenerate' || mode === 'fix'
    if (needsPrompt && (typeof prompt !== 'string' || !prompt)) return NextResponse.json({ error: 'Design prompt is required' }, { status: 400 })

    // hd/refine build on the design the user is looking at; regenerate/fix start again from the real photo,
    // because re-editing an AI output more than necessary degrades it
    const fromDesign = mode === 'hd' || mode === 'refine' || mode === 'closeup'
    const toInput = (dataUrl: unknown): ImageInput => {
      const parsed = parseDataUrl(String(dataUrl || ''))
      return { buffer: Buffer.from(parsed.data, 'base64'), mediaType: parsed.mediaType }
    }
    const buffer = toInput(fromDesign ? source : image)
    // regenerate/fix repaint the real photo, so they need the product photos again (same order as the prompt)
    let references: ImageInput[] = needsPrompt ? custom.references : []

    let finalPrompt = String(prompt || '').slice(0, 20000)
    let quality = QUALITY.draft

    if ((mode as Mode) === 'fix') {
      const missingSet = new Set(Array.isArray(missingIds) ? missingIds.map(String) : [])
      const missing = items.filter((i) => missingSet.has(i.id)).map((i) => i.label)
      if (missing.length === 0) return NextResponse.json({ error: 'Nothing to fix' }, { status: 400 })
      const [first, ...rest] = finalPrompt.split('\n\n')
      const emphasis = `MOST IMPORTANT: ${missing.join(', ')} ${missing.length > 1 ? 'were' : 'was'} left out last time. Make ${missing.length > 1 ? 'them' : 'it'} large, prominent and unmistakable.`
      // Drop the emphasis line from an earlier fix so repeated fixes do not stack
      finalPrompt = [first, emphasis, ...rest.filter((p) => !p.startsWith('MOST IMPORTANT:'))].join('\n\n')
    } else if (mode === 'hd') {
      quality = QUALITY.hd
      finalPrompt = [
        'Re-render this exact decorated venue image as a flawless high-end event photograph.',
        'Keep the composition, camera angle, architecture, every decor item, its position, the colours and the lighting exactly as they are. Do not add, remove or move anything.',
        'Only raise the quality: crisp fine detail, realistic textures (fabric weave, petals, crystal, wood grain), clean straight chair and table lines, natural light falloff and reflections. Repair any warped, smeared or melted objects. No text, logos or watermarks.',
        items.length ? `The image must still clearly contain: ${items.map((i) => i.label).join(', ')}.` : '',
      ].filter(Boolean).join('\n\n')
    } else if (mode === 'refine') {
      const change = String(instruction || '').trim().slice(0, 500)
      if (!change) return NextResponse.json({ error: 'Type what you want to change' }, { status: 400 })
      if (hd) quality = QUALITY.hd
      finalPrompt = [
        `Edit this decorated event venue photo. Make ONLY this change: ${change}`,
        'Keep everything else exactly as it is: the camera angle, the architecture, all other decor and its placement, the colours and the lighting. The change must blend in naturally and stay photorealistic. No text, logos or watermarks.',
      ].join('\n\n')
    }

    else if (mode === 'angle') {
      // image = another photo of the same venue, source = the design the customer chose.
      // Handing both photos to the image model makes it redraw the design's composition, so Claude first
      // works out where each piece of decor sits from the new camera position and only the new photo is edited.
      const plan = await claudeJson<{ venue: string; decor: { name: string; placement: string; look: string }[]; mood: string }>({
        system: ANGLE_SYSTEM,
        content: [
          { type: 'text', text: 'Photo 1 (undecorated, to be edited):' },
          imageBlock(String(image)),
          { type: 'text', text: 'Photo 2 (approved decorated design):' },
          imageBlock(String(source)),
          { type: 'text', text: `Decor items in the design: ${items.map((i) => i.label).join(', ') || 'see photo 2'}` },
        ],
        schema: ANGLE_SCHEMA,
        effort: 'medium',
      })
      const visible = plan.decor.filter((d) => !/not visible/i.test(d.placement))
      references = custom.references
      const refNote = (name: string) => {
        const item = items.find((i) => i.ref !== undefined && i.label.toLowerCase() === name.toLowerCase())
        return item ? ` Copy this product's exact design from image ${item.ref! + 2}.` : ''
      }
      finalPrompt = [
        referencePreamble(references.length),
        `Photorealistic edit of this exact photo of ${plan.venue}`,
        'Keep the camera position, angle, framing and architecture of this photo exactly as they are.',
        `ADD THIS DECOR — every item must be clearly visible:\n${visible.map((d, i) => `${i + 1}. ${d.name.toUpperCase()} — ${d.placement.replace(/[.\s]+$/, '')}. ${d.look}${refNote(d.name)}`).join('\n')}`,
        `MOOD & LIGHTING: ${plan.mood}`,
        'High-end event photography, realistic textures, shadows and reflections. No people, text, logos or watermarks.',
      ].filter(Boolean).join('\n\n')
    } else if (mode === 'closeup') {
      finalPrompt = [
        'Create a close-up detail photograph from inside this exact decorated venue: a guest-eye view of one dining table, about one metre away.',
        'Show the table setting and centerpiece in sharp detail using exactly the same decor, flowers, colours, linen, chairs and lighting as in this image, with the rest of the decorated room softly blurred in the background.',
        'It must be unmistakably the same event and the same room. High-end event photography, shallow depth of field. No people, text, logos or watermarks.',
      ].join('\n\n')
    }

    let b64: string
    try {
      b64 = await editImage(buffer, finalPrompt, size, quality, references)
    } catch (err) {
      console.error(`[ai-images/render] ${mode} failed:`, err)
      return NextResponse.json({ error: imageErrorMessage(err) }, { status: 502 })
    }
    // A failed check must not cost the user the image
    // Extra views are not expected to show every item, so they are not checked
    const isView = mode === 'angle' || mode === 'closeup'
    const checks = items.length && !isView ? await verify(b64, items).catch(() => undefined) : undefined

    return NextResponse.json({
      url: `data:image/jpeg;base64,${b64}`,
      checks,
      // regenerate/fix prompts replace the design's prompt; hd/refine prompts are one-off instructions
      prompt: needsPrompt ? finalPrompt : undefined,
      hd: quality === QUALITY.hd && (mode === 'hd' || mode === 'refine'),
    })
  } catch (err: any) {
    console.error('[ai-images/render] error:', err)
    const status = err instanceof AiImagesError ? err.status : 500
    return NextResponse.json({ error: err?.message ?? 'Failed to render image' }, { status })
  }
}
