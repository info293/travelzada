export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { requireLeadsAccess } from '@/lib/metaServer'
import { AD_COACH_COLLECTION } from '@/lib/metaLeadsCrm'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a senior Meta (Facebook/Instagram) performance marketer coaching Travelzada, a travel agency in Jaipur, India that sells holiday packages (e.g. Bali couple packages) through Lead Ads. A sales team calls every lead and tracks the outcome in a CRM.

You receive one JSON document with:
- Meta Ads data: account, campaigns, ad sets (targeting, budget, optimisation goal), ads (quality/engagement/conversion rankings, frequency, video watch-through), and breakdowns by age×gender, region, placement, device, hour of day and day.
- CRM outcomes joined to it: per campaign, ad and platform (fb/ig) how many leads were contacted, connected on call, got a quote, booked (won) and revenue; leads and bookings by hour the lead arrived; how form answers convert; lost reasons; response times.

Your job: find what is actually driving bookings and what is wasting money, then give a prioritised, concrete action plan the owner can apply in Ads Manager and in the sales process.

Rules:
- Judge ads by cost per QUALIFIED lead / quote / booking, not cost per lead alone. Cheap leads that never book are waste.
- Be honest about sample size. With few leads or bookings, say a finding is directional and what data would confirm it. Don't invent numbers; cite the numbers you used.
- Breakdowns (age, gender, region, placement, device) only exist as Meta totals; booking outcomes only exist per campaign/ad/platform/form answer/hour. Never claim a booking rate for an age group.
- Each action must be specific enough to execute: which campaign/ad set/ad, what setting to change in Ads Manager and to what value, or what the sales team should do differently.
- Ad copy ideas: written for Indian travellers from Jaipur, matching what bookers said in the form (occasion, group size, timing). Primary text under 125 characters where possible; headline under 40.
- Recommend sending CRM stages back to Meta (Conversions API, conversion-leads optimisation) if the data suggests lead quality is the main problem.
- Use ₹ and Indian number formatting. Plain text only inside fields (no markdown).`

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'headline', 'healthScore', 'summary', 'keyFindings', 'actions', 'audienceInsights', 'creativeIdeas',
    'formImprovements', 'salesProcessTips', 'dataGaps',
  ],
  properties: {
    headline: { type: 'string' },
    healthScore: { type: 'integer' },
    summary: { type: 'string' },
    keyFindings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail', 'impact'],
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['priority', 'category', 'title', 'why', 'howToApply', 'expectedImpact', 'effort'],
        properties: {
          priority: { type: 'integer' },
          category: {
            type: 'string',
            enum: ['budget', 'audience', 'placement', 'creative', 'form', 'schedule', 'sales_process', 'tracking', 'campaign_structure'],
          },
          title: { type: 'string' },
          why: { type: 'string' },
          howToApply: { type: 'string' },
          expectedImpact: { type: 'string' },
          effort: { type: 'string', enum: ['quick', 'medium', 'big'] },
        },
      },
    },
    audienceInsights: { type: 'string' },
    creativeIdeas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['angle', 'format', 'primaryText', 'headline', 'description'],
        properties: {
          angle: { type: 'string' },
          format: { type: 'string' },
          primaryText: { type: 'string' },
          headline: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
    formImprovements: { type: 'array', items: { type: 'string' } },
    salesProcessTips: { type: 'array', items: { type: 'string' } },
    dataGaps: { type: 'array', items: { type: 'string' } },
  },
}

/**
 * POST /api/ai/ad-coach
 * Body: { data: <Meta insights + CRM outcomes>, preset: string, question?: string }
 * Analyses ad performance with Claude, saves the report to Firestore and returns it.
 */
export async function POST(req: NextRequest) {
  try {
    const authError = await requireLeadsAccess(req)
    if (authError) return authError
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is missing in environment variables.' }, { status: 500 })
    }

    const body = await req.json()
    const dataJson = JSON.stringify(body.data ?? {})
    if (dataJson.length > 400_000) {
      return NextResponse.json({ error: 'Too much data for one analysis. Pick a shorter date range.' }, { status: 413 })
    }
    const question = String(body.question || '').slice(0, 2000)
    const preset = String(body.preset || 'maximum')

    const params = {
      model: 'claude-opus-5-5',
      max_tokens: 32000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user' as const,
          content:
            `Date range: ${preset}. Today: ${new Date().toDateString()}.\n\nDATA:\n${dataJson}\n\n` +
            (question ? `The owner specifically asks: ${question}\n\n` : '') +
            'Analyse it and produce the report.',
        },
      ],
      output_config: {
        effort: 'high' as const,
        format: { type: 'json_schema' as const, schema: REPORT_SCHEMA },
      },
      betas: ['server-side-fallback-2026-07-01'],
      // Re-runs on a fallback model if a safety classifier declines (not yet in this SDK version's types)
      fallbacks: 'default',
    }

    const response = await client.beta.messages
      .stream(params as unknown as Parameters<typeof client.beta.messages.stream>[0])
      .finalMessage()

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'The AI declined this request.' }, { status: 422 })
    }
    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'The report was cut off. Try a shorter date range.' }, { status: 422 })
    }
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text || ''
    let report: any
    try {
      report = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'The AI returned an unreadable report. Please try again.' }, { status: 502 })
    }

    const createdBy = String(body.createdBy || '').slice(0, 120)
    const saved = await addDoc(collection(db, AD_COACH_COLLECTION), {
      createdAt: new Date().toISOString(),
      createdBy,
      preset,
      question,
      report,
    })

    return NextResponse.json({ success: true, id: saved.id, report })
  } catch (err: any) {
    console.error('[Ad Coach Error]:', err)
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'AI is busy right now. Please retry in a moment.' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI error (${err.status}): ${err.message}` }, { status: 502 })
    }
    return NextResponse.json({ error: err.message || 'Ad coach failed' }, { status: 500 })
  }
}
