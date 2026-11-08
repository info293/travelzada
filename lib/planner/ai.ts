/**
 * One place for the AI Planner's model calls (server-side only).
 *
 * - Claude Opus 5.5 with structured outputs (`output_config.format`) so replies are always valid JSON.
 * - Server-side refusal fallback is enabled (`fallbacks: "default"`), so a safety decline is retried on a
 *   suitable model inside the same call.
 * - If Claude is unavailable (no key, outage), text-only tasks fall back to OpenAI GPT-4o in JSON mode.
 *   Documents (PDF / images) need Claude.
 */
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const PLANNER_MODEL = 'claude-opus-5-5'

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export type Effort = 'low' | 'medium' | 'high'

export interface AskJsonOptions {
  system: string
  /** Plain text, or full content blocks (e.g. a PDF `document` block followed by a text block) */
  content: string | Anthropic.ContentBlockParam[]
  /** JSON schema of the reply. Objects need `additionalProperties: false` and a full `required` list. */
  schema: Record<string, unknown>
  effort?: Effort
  maxTokens?: number
  /** Short label for logs */
  label?: string
}

export class PlannerAIError extends Error {}

function textOf(content: AskJsonOptions['content']): string | null {
  if (typeof content === 'string') return content
  if (content.every((b) => b.type === 'text')) return content.map((b) => (b as Anthropic.TextBlockParam).text).join('\n\n')
  return null // has documents / images
}

/** Ask for a JSON object that matches `schema`. Throws PlannerAIError if no model could answer. */
export async function askJson<T>({ system, content, schema, effort = 'low', maxTokens = 8000, label = 'planner' }: AskJsonOptions): Promise<T> {
  if (anthropic) {
    try {
      const params = {
        model: PLANNER_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content }],
        output_config: { effort, format: { type: 'json_schema', schema } },
        // Server-side refusal fallback (beta). Not in this SDK version's types, so passed through untyped.
        fallbacks: 'default',
      } as unknown as Anthropic.MessageCreateParamsNonStreaming
      const res = await anthropic.messages.create(params, {
        headers: { 'anthropic-beta': 'server-side-fallback-2026-07-01' },
        timeout: 120_000,
      })
      if (res.stop_reason === 'refusal') throw new PlannerAIError('The request was declined')
      const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
      return JSON.parse(text) as T
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) console.error(`[${label}] Claude auth failed — check ANTHROPIC_API_KEY`)
      else if (err instanceof Anthropic.RateLimitError) console.warn(`[${label}] Claude rate limited`)
      else if (err instanceof Anthropic.APIError) console.warn(`[${label}] Claude API error ${err.status}: ${err.message}`)
      else console.warn(`[${label}] Claude failed:`, (err as Error)?.message)
    }
  }

  const text = textOf(content)
  if (openai && text !== null) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: Math.min(maxTokens, 8000),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${system}\n\nReply with one JSON object that matches this JSON schema exactly:\n${JSON.stringify(schema)}` },
          { role: 'user', content: text },
        ],
      })
      return JSON.parse(res.choices[0]?.message?.content || '{}') as T
    } catch (err) {
      console.warn(`[${label}] OpenAI fallback failed:`, (err as Error)?.message)
    }
  }
  throw new PlannerAIError('AI is not available right now')
}

/** Helpers to keep schemas short and valid for structured outputs */
export const S = {
  str: (description?: string) => ({ type: 'string', ...(description ? { description } : {}) }),
  strOrNull: (description?: string) => ({ type: ['string', 'null'], ...(description ? { description } : {}) }),
  num: (description?: string) => ({ type: 'number', ...(description ? { description } : {}) }),
  numOrNull: (description?: string) => ({ type: ['number', 'null'], ...(description ? { description } : {}) }),
  bool: (description?: string) => ({ type: 'boolean', ...(description ? { description } : {}) }),
  arr: (items: Record<string, unknown>, description?: string) => ({ type: 'array', items, ...(description ? { description } : {}) }),
  enum: (values: string[], description?: string) => ({ type: 'string', enum: values, ...(description ? { description } : {}) }),
  obj: (properties: Record<string, unknown>, description?: string) => ({
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
    ...(description ? { description } : {}),
  }),
}
