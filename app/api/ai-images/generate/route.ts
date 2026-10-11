export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { requireUser } from '@/lib/aiImagesAuth'
import { claudeJson, imageBlock, parseDataUrl, AiImagesError } from '@/lib/aiImagesClaude'
import { DECOR_STYLES, EVENT_TYPES, resolveItems, resolveOption } from '@/lib/aiImagesCatalog'
import { QUALITY, editImage, imageErrorMessage, loadCustomItems, pickSize, referencePreamble, verify, type ImageInput, type Item } from '@/lib/aiImagesRender'

const VARIANTS = [
  { title: 'Signature', direction: 'the selection executed flawlessly in the chosen style, with lighting that flatters the room as it is' },
  { title: 'Evening Glow', direction: 'the same setup at its most magical in the evening: warm practical lights, candle glow, uplighting, soft reflections on the floor — but still bright enough that every decor item reads clearly' },
  { title: "Designer's Twist", direction: 'a bolder editorial styling of the same setup: richer layering of fabrics and florals and one refined accent colour within the palette' },
]

type Placement = { itemId: string; placement: string; look: string }
type Plan = { title: string; concept: string; mood: string; placements: Placement[] }

const SYSTEM = `You are an award-winning luxury event designer planning decor for a real venue photo. Your plan will be turned into a gpt-image-1 photo-EDIT prompt that repaints the client's photo.

For each of the ${VARIANTS.length} variants you get, plan where EVERY selected decor item goes. All variants contain exactly the same items — they differ only in mood, lighting and styling, never in which items appear.

For every selected item give:
- "placement": a specific, physically plausible spot in THIS photo, using the placementZones and left/right/centre/foreground/background (e.g. "against the far wall, centred between the two gilt mirrors, replacing the back bar"). Large items (stage, mandap, flower wall, LED wall) need a big clear zone — say what they replace or cover. Ceiling items go on the ceiling, table items on the existing tables.
- "look": 1–2 sentences of concrete visual detail — materials, colours, scale relative to the room, quantity — so the item is instantly recognisable and large enough to see.

Items marked [HAS PRODUCT PHOTO] are the decorator's real products: the image model receives their photo. For those, "look" must NOT redesign the item — only state how many, how large relative to the room, and how it is arranged.

Items in "mustPreserve" are architecture that stays, but decor may stand IN FRONT of them (a stage in front of a back bar) or hang BELOW them (drapes under a ceiling). Say so explicitly in "placement" when that happens.

"mood": 2–3 sentences of lighting, colour temperature and atmosphere for that variant, physically consistent with the room's windows and fixtures. The mood must never darken, wash out or hide any selected item.
"concept": one sentence for the client.
Use the venue analysis heavily: the more specific to this exact room, the better.`

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
  /** How many product reference photos accompany the venue photo */
  referenceCount: number
}) {
  const { placements } = opts
  const names = placements.map((p) => p.item.label)
  const line = (p: (typeof placements)[number], i: number) => {
    const qty = p.item.qty && p.item.qty > 1 ? ` Quantity: ${p.item.qty}.` : ''
    const ref = p.item.ref !== undefined
      ? ` This is the decorator's real product: copy its exact design, colours and materials from image ${p.item.ref + 2}; do not substitute a different design.`
      : ''
    return `${i + 1}. ${p.item.label.toUpperCase()} — ${p.placement.replace(/[.\s]+$/, '')}. ${p.look}${qty}${ref}`
  }
  return [
    referencePreamble(opts.referenceCount),
    `Photorealistic edit of this exact photo of ${opts.venue}. Decorate it for ${opts.event}.`,
    `MANDATORY DECOR — all ${placements.length} items below MUST be added and be clearly visible, recognisable and correctly scaled in the final image. Do not skip, merge or shrink any of them:`,
    placements.map(line).join('\n'),
    opts.notes ? `CLIENT NOTES: ${opts.notes}` : '',
    `KEEP UNCHANGED: the camera position, angle, lens and framing (${opts.camera}). Preserve the venue architecture: ${opts.preserve.join('; ') || 'ceiling, walls, columns, windows, doors and floor'}. The structure stays, but the mandatory decor may stand in front of walls and fixtures and hang below the ceiling. Only remove clutter that would not be at a styled event.`,
    `STYLE: ${opts.style}.${opts.palette ? ` Colour palette: ${opts.palette}.` : ''}`,
    `MOOD & LIGHTING: ${opts.mood} Every mandatory item stays well lit and clearly readable. Realistic shadows, reflections and light falloff.`,
    `PHOTOGRAPHY: high-end event photography, sharp detail, natural textures (fabric weave, petals, crystal), true-to-life colour, no CGI look.`,
    `AVOID: changing the architecture or viewpoint, warped or floating objects, melted chairs, text, letters, logos, watermarks, ${opts.peopleRule}.`,
    `FINAL CHECK — the image must visibly contain every one of: ${names.join(', ')}.`,
  ].filter(Boolean).join('\n\n')
}

export async function POST(request: Request) {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Missing OPENAI_API_KEY or ANTHROPIC_API_KEY' }, { status: 500 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { image, imageSmall, analysis, itemIds, customItems, eventType, style, palette, notes, includeGuests, aspect } = body ?? {}
  let items: Item[]
  let references: ImageInput[]
  try {
    const custom = await loadCustomItems(customItems)
    // The vendor's real products come first: they are what the customer will actually get
    items = [...custom.items, ...resolveItems(itemIds)]
    references = custom.references
  } catch (err: any) {
    return Response.json({ error: err?.message ?? 'Could not load catalogue items' }, { status: err instanceof AiImagesError ? err.status : 500 })
  }
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
    `SELECTED DECOR ITEMS (every variant must place all ${items.length}):\n${items.map((i) => `- ${i.id} [${i.category}] ${i.label}${i.qty && i.qty > 1 ? ` ×${i.qty}` : ''}${i.ref !== undefined ? ' [HAS PRODUCT PHOTO]' : ''}: ${i.prompt}`).join('\n')}`,
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
          // The planner only needs to see the room, so it gets the downscaled copy when the client sent one
          content: [imageBlock(typeof imageSmall === 'string' && imageSmall ? imageSmall : image), { type: 'text', text: brief }],
          schema: planSchema(items.map((i) => i.id)),
          effort: 'medium',
        })

        const variants = VARIANTS.map((v) => {
          const plan = plans.find((p) => p.title === v.title)
          const prompt = buildPrompt({
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
            referenceCount: references.length,
          })
          return { title: v.title, concept: plan?.concept || v.direction, prompt }
        })
        send({ type: 'prompts', variants })

        // ── Step 2: draft-quality edit of the real photo per variant, then an item-by-item check.
        //    Missing items, HD upgrades and refinements are separate, user-triggered calls
        //    (/api/ai-images/render) so nothing expensive runs unless the user asks for it ──
        const original = { buffer: Buffer.from(base.data, 'base64'), mediaType: base.mediaType }
        await Promise.all(
          variants.map(async (variant, index) => {
            try {
              const b64 = await editImage(original, variant.prompt, size, QUALITY.draft, references)
              const url = `data:image/jpeg;base64,${b64}`
              send({ type: 'image', index, url, status: 'checking' })
              // A failed check must not cost the user the image
              const checks = await verify(b64, items).catch(() => undefined)
              send({ type: 'image', index, url, status: 'done', checks })
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
