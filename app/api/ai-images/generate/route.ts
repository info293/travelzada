export const dynamic = 'force-dynamic'
export const maxDuration = 300

import OpenAI, { toFile } from 'openai'
import { claudeJson, imageBlock, parseDataUrl, AiImagesError } from '@/lib/aiImagesClaude'
import { DECOR_STYLES, EVENT_TYPES, resolveItems, resolveOption } from '@/lib/aiImagesCatalog'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// gpt-image-1 is the OpenAI model that edits a real photo (DALL-E 3 can only generate from text)
const IMAGE_MODEL = process.env.AI_IMAGES_MODEL || 'gpt-image-1'
const IMAGE_QUALITY = (process.env.AI_IMAGES_QUALITY || 'high') as 'low' | 'medium' | 'high'

const VARIANTS = [
  { title: 'Signature', direction: 'the selection executed flawlessly in the chosen style, with lighting that flatters the room as it is' },
  { title: 'Evening Glow', direction: 'the same setup at its most magical in the evening: warm practical lights, candle glow, uplighting, soft reflections on the floor — but still bright enough that every decor item reads clearly' },
  { title: "Designer's Twist", direction: 'a bolder editorial styling of the same setup: richer layering of fabrics and florals and one refined accent colour within the palette' },
]

type Item = ReturnType<typeof resolveItems>[number]
type Placement = { itemId: string; placement: string; look: string }
type Plan = { title: string; concept: string; mood: string; placements: Placement[] }

const SYSTEM = `You are an award-winning luxury event designer planning decor for a real venue photo. Your plan will be turned into a gpt-image-1 photo-EDIT prompt that repaints the client's photo.

For each of the ${VARIANTS.length} variants you get, plan where EVERY selected decor item goes. All variants contain exactly the same items — they differ only in mood, lighting and styling, never in which items appear.

For every selected item give:
- "placement": a specific, physically plausible spot in THIS photo, using the placementZones and left/right/centre/foreground/background (e.g. "against the far wall, centred between the two gilt mirrors, replacing the back bar"). Large items (stage, mandap, flower wall, LED wall) need a big clear zone — say what they replace or cover. Ceiling items go on the ceiling, table items on the existing tables.
- "look": 1–2 sentences of concrete visual detail — materials, colours, scale relative to the room, quantity — so the item is instantly recognisable and large enough to see.

Items in "mustPreserve" are architecture that stays, but decor may stand IN FRONT of them (a stage in front of a back bar) or hang BELOW them (drapes under a ceiling). Say so explicitly in "placement" when that happens.

"mood": 2–3 sentences of lighting, colour temperature and atmosphere for that variant, physically consistent with the room's windows and fixtures. The mood must never darken, wash out or hide any selected item.
"concept": one sentence for the client.
Use the venue analysis heavily: the more specific to this exact room, the better.`

const VERIFY_SYSTEM = `You inspect AI-edited event venue photos for a decor client. For each requested item, decide whether a guest would recognise it in the image.
Count it as present when its defining feature is visible, even if it is blended with another item (e.g. fairy lights woven into ceiling drapes still count as a fairy-light canopy).
Count it as missing when it is absent, unrecognisable, or replaced by a different kind of item. Keep "note" under 15 words.`

function pickSize(aspect: number): '1536x1024' | '1024x1536' | '1024x1024' {
  if (aspect >= 1.2) return '1536x1024'
  if (aspect <= 0.83) return '1024x1536'
  return '1024x1024'
}

function planSchema(itemIds: string[]) {
  return {
    type: 'object',
    properties: {
      variants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', enum: VARIANTS.map((v) => v.title) },
            concept: { type: 'string' },
            mood: { type: 'string' },
            placements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  itemId: { type: 'string', enum: itemIds },
                  placement: { type: 'string' },
                  look: { type: 'string' },
                },
                required: ['itemId', 'placement', 'look'],
                additionalProperties: false,
              },
            },
          },
          required: ['title', 'concept', 'mood', 'placements'],
          additionalProperties: false,
        },
      },
    },
    required: ['variants'],
    additionalProperties: false,
  }
}

function verifySchema(itemIds: string[]) {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            itemId: { type: 'string', enum: itemIds },
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
  }
}

/** Guarantees one placement per selected item, in selection order, even if the plan skipped some. */
function completePlacements(items: Item[], placements: Placement[]): (Placement & { item: Item })[] {
  return items.map((item) => {
    const p = placements.find((x) => x.itemId === item.id)
    return {
      item,
      itemId: item.id,
      placement: p?.placement || 'in the most prominent suitable area of the room, clearly visible',
      look: p?.look || item.prompt,
    }
  })
}

/**
 * The final gpt-image-1 prompt is assembled here, not by the LLM, so the item checklist is always
 * first, numbered and repeated at the end — image models drop items buried mid-prompt.
 */
function buildPrompt(opts: {
  venue: string
  event: string
  style: string
  palette: string
  mood: string
  placements: ReturnType<typeof completePlacements>
  preserve: string[]
  camera: string
  peopleRule: string
  notes: string
  /** Items a previous attempt left out — listed first and called out */
  emphasize?: string[]
}) {
  const emphasize = new Set(opts.emphasize ?? [])
  const placements = [...opts.placements].sort((a, b) => Number(emphasize.has(b.itemId)) - Number(emphasize.has(a.itemId)))
  const names = placements.map((p) => p.item.label)
  const missed = placements.filter((p) => emphasize.has(p.itemId)).map((p) => p.item.label)
  return [
    `Photorealistic edit of this exact photo of ${opts.venue}. Decorate it for ${opts.event}.`,
    missed.length
      ? `MOST IMPORTANT: ${missed.join(', ')} ${missed.length > 1 ? 'were' : 'was'} left out last time. Make ${missed.length > 1 ? 'them' : 'it'} large, prominent and unmistakable.`
      : '',
    `MANDATORY DECOR — all ${placements.length} items below MUST be added and be clearly visible, recognisable and correctly scaled in the final image. Do not skip, merge or shrink any of them:`,
    placements.map((p, i) => `${i + 1}. ${p.item.label.toUpperCase()} — ${p.placement.replace(/[.\s]+$/, '')}. ${p.look}`).join('\n'),
    opts.notes ? `CLIENT NOTES: ${opts.notes}` : '',
    `KEEP UNCHANGED: the camera position, angle, lens and framing (${opts.camera}). Preserve the venue architecture: ${opts.preserve.join('; ') || 'ceiling, walls, columns, windows, doors and floor'}. The structure stays, but the mandatory decor may stand in front of walls and fixtures and hang below the ceiling. Only remove clutter that would not be at a styled event.`,
    `STYLE: ${opts.style}.${opts.palette ? ` Colour palette: ${opts.palette}.` : ''}`,
    `MOOD & LIGHTING: ${opts.mood} Every mandatory item stays well lit and clearly readable. Realistic shadows, reflections and light falloff.`,
    `PHOTOGRAPHY: high-end event photography, sharp detail, natural textures (fabric weave, petals, crystal), true-to-life colour, no CGI look.`,
    `AVOID: changing the architecture or viewpoint, warped or floating objects, melted chairs, text, letters, logos, watermarks, ${opts.peopleRule}.`,
    `FINAL CHECK — the image must visibly contain every one of: ${names.join(', ')}.`,
  ].filter(Boolean).join('\n\n')
}

async function editImage(image: { buffer: Buffer; mediaType: string }, prompt: string, size: ReturnType<typeof pickSize>) {
  const result = await openai.images.edit({
    model: IMAGE_MODEL,
    image: await toFile(image.buffer, `venue.${image.mediaType.split('/')[1]}`, { type: image.mediaType }),
    prompt,
    size,
    quality: IMAGE_QUALITY,
    input_fidelity: 'high',
    output_format: 'jpeg',
    output_compression: 92,
    n: 1,
  })
  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error('No image returned')
  return b64
}

async function verify(b64: string, items: Item[]) {
  const { items: checks } = await claudeJson<{ items: { itemId: string; present: boolean; note: string }[] }>({
    system: VERIFY_SYSTEM,
    content: [
      imageBlock(`data:image/jpeg;base64,${b64}`),
      { type: 'text', text: `Requested items:\n${items.map((i) => `- ${i.id}: ${i.label} (${i.prompt})`).join('\n')}` },
    ],
    schema: verifySchema(items.map((i) => i.id)),
    effort: 'low',
  })
  // Anything the checker forgot to mention counts as missing
  return items.map((item) => {
    const c = checks.find((x) => x.itemId === item.id)
    return { itemId: item.id, label: item.label, present: c?.present ?? false, note: c?.note ?? '' }
  })
}

function imageErrorMessage(err: any) {
  if (err instanceof OpenAI.APIError && err.code === 'moderation_blocked') return 'Blocked by the image safety filter. Try different items or notes.'
  if (err instanceof OpenAI.RateLimitError) return 'OpenAI rate limit hit. Retry in a minute.'
  return err?.message ?? 'Image generation failed'
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Missing OPENAI_API_KEY or ANTHROPIC_API_KEY' }, { status: 500 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { image, analysis, itemIds, eventType, style, palette, notes, includeGuests, aspect } = body ?? {}
  const items = resolveItems(itemIds)
  if (typeof image !== 'string' || !image) return Response.json({ error: 'Base image is required' }, { status: 400 })
  if (!analysis || typeof analysis !== 'object') return Response.json({ error: 'Analyse the images first' }, { status: 400 })
  if (items.length === 0) return Response.json({ error: 'Select at least one decor item' }, { status: 400 })

  let base: { mediaType: string; data: string }
  try {
    base = parseDataUrl(image)
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 })
  }

  const event = resolveOption(EVENT_TYPES, eventType)?.prompt ?? 'a premium celebration'
  const decorStyle = resolveOption(DECOR_STYLES, style)?.prompt ?? 'luxury, elegant, cohesive with the venue'
  const paletteText = palette ? String(palette).slice(0, 200) : ''
  const notesText = notes ? String(notes).slice(0, 1000) : ''
  const size = pickSize(Number(aspect) || 1)
  const peopleRule = includeGuests
    ? 'crowds that hide the decor (a few elegantly dressed guests in natural poses are fine)'
    : 'people of any kind (the room is fully set but empty)'

  const brief = [
    `EVENT: ${event}`,
    `STYLE: ${decorStyle}`,
    paletteText ? `COLOUR PALETTE REQUESTED: ${paletteText}` : 'COLOUR PALETTE: choose one that suits the style and the room',
    `SELECTED DECOR ITEMS (every variant must place all ${items.length}):\n${items.map((i) => `- ${i.id} [${i.category}] ${i.label}: ${i.prompt}`).join('\n')}`,
    notesText ? `CLIENT NOTES: ${notesText}` : '',
    `VARIANTS TO PLAN:\n${VARIANTS.map((v) => `- ${v.title}: ${v.direction}`).join('\n')}`,
    `VENUE ANALYSIS (JSON):\n${JSON.stringify(analysis).slice(0, 20000)}`,
  ].filter(Boolean).join('\n\n')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        // ── Step 1: Claude plans where every item goes in this room, per variant ──
        const { variants: plans } = await claudeJson<{ variants: Plan[] }>({
          system: SYSTEM,
          content: [imageBlock(image), { type: 'text', text: brief }],
          schema: planSchema(items.map((i) => i.id)),
          effort: 'high',
        })

        const variants = VARIANTS.map((v) => {
          const plan = plans.find((p) => p.title === v.title)
          const promptArgs = {
            venue: String(analysis.venueType || 'an event venue'),
            event,
            style: decorStyle,
            palette: paletteText,
            mood: plan?.mood || v.direction + '.',
            placements: completePlacements(items, plan?.placements ?? []),
            preserve: Array.isArray(analysis.mustPreserve) ? analysis.mustPreserve.map(String) : [],
            camera: String(analysis.camera?.angle || 'as in the photo'),
            peopleRule,
            notes: notesText,
          }
          return { title: v.title, concept: plan?.concept || v.direction, prompt: buildPrompt(promptArgs), promptArgs }
        })
        send({ type: 'prompts', variants: variants.map(({ title, concept, prompt }) => ({ title, concept, prompt })) })

        // ── Step 2: per variant: edit the real photo → verify every item → if any are missing,
        //    retry from the ORIGINAL photo with those items emphasised (re-editing an AI output degrades it)
        //    and keep whichever attempt contains more of the selected items ──
        const original = { buffer: Buffer.from(base.data, 'base64'), mediaType: base.mediaType }
        const presentCount = (checks: Awaited<ReturnType<typeof verify>>) => checks.filter((c) => c.present).length
        await Promise.all(
          variants.map(async (variant, index) => {
            try {
              let b64 = await editImage(original, variant.prompt, size)
              send({ type: 'image', index, url: `data:image/jpeg;base64,${b64}`, status: 'checking' })

              let checks = await verify(b64, items)
              const missing = checks.filter((c) => !c.present).map((c) => c.itemId)
              if (missing.length > 0) {
                send({ type: 'image', index, url: `data:image/jpeg;base64,${b64}`, status: 'fixing', checks })
                try {
                  const retryPrompt = buildPrompt({ ...variant.promptArgs, emphasize: missing })
                  const retryB64 = await editImage(original, retryPrompt, size)
                  const retryChecks = await verify(retryB64, items)
                  if (presentCount(retryChecks) > presentCount(checks)) {
                    b64 = retryB64
                    checks = retryChecks
                    send({ type: 'prompt', index, prompt: retryPrompt })
                  }
                } catch (err) {
                  // Keep the first image if the retry fails — it is still a usable design
                  console.error(`[ai-images/generate] retry for variant ${index} failed:`, err)
                }
              }
              send({ type: 'image', index, url: `data:image/jpeg;base64,${b64}`, status: 'done', checks })
            } catch (err: any) {
              console.error(`[ai-images/generate] variant ${index} failed:`, err)
              send({ type: 'image-error', index, error: imageErrorMessage(err) })
            }
          })
        )
        send({ type: 'done' })
      } catch (err: any) {
        console.error('[ai-images/generate] error:', err)
        const message = err instanceof AiImagesError ? err.message : err?.message ?? 'Failed to generate images'
        send({ type: 'error', error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  })
}
