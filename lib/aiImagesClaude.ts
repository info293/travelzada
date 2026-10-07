import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export class AiImagesError extends Error {
  constructor(message: string, public status = 500) {
    super(message)
  }
}

/** Splits a data URL into what Claude's base64 image block needs. */
export function parseDataUrl(dataUrl: string): { mediaType: MediaType; data: string } {
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/.exec(dataUrl)
  if (!match) throw new AiImagesError('Images must be JPG, PNG, GIF or WEBP data URLs.', 400)
  return { mediaType: match[1] as MediaType, data: match[2] }
}

export function imageBlock(dataUrl: string): Anthropic.ImageBlockParam {
  const { mediaType, data } = parseDataUrl(dataUrl)
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } }
}

/**
 * One Claude call that must return JSON matching `schema`.
 * Uses structured outputs so the result is always parseable.
 */
export async function claudeJson<T>(opts: {
  system: string
  content: Anthropic.ContentBlockParam[]
  schema: Record<string, unknown>
  effort?: 'low' | 'medium' | 'high'
}): Promise<T> {
  const params = {
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: opts.system,
    messages: [{ role: 'user' as const, content: opts.content }],
    output_config: {
      effort: opts.effort ?? 'medium',
      format: { type: 'json_schema' as const, schema: opts.schema },
    },
    betas: ['server-side-fallback-2026-07-01'],
    // Re-runs on a fallback model if a safety classifier declines (not yet in this SDK version's types)
    fallbacks: 'default',
  }

  let response: Anthropic.Beta.BetaMessage
  try {
    response = await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming)
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new AiImagesError('Claude is busy right now. Please retry in a moment.', 429)
    if (err instanceof Anthropic.AuthenticationError) throw new AiImagesError('ANTHROPIC_API_KEY is invalid.', 500)
    if (err instanceof Anthropic.BadRequestError) throw new AiImagesError(`Claude rejected the request: ${err.message}`, 400)
    throw err
  }

  if (response.stop_reason === 'refusal') throw new AiImagesError('The AI declined to process these images.', 422)
  if (response.stop_reason === 'max_tokens') throw new AiImagesError('The AI response was cut off. Please try again.', 502)

  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text || ''
  try {
    return JSON.parse(text) as T
  } catch {
    throw new AiImagesError('The AI returned an unreadable response. Please try again.', 502)
  }
}
