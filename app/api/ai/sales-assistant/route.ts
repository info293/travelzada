export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { requireLeadsAccess } from '@/lib/metaServer'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are the AI sales assistant for Travelzada, a travel agency in Jaipur, India that sells holiday packages to leads coming from Meta (Facebook/Instagram) ads.

You help a salesperson work ONE lead. You are given the lead's form answers, the CRM history (calls, notes, previous proposals) and Travelzada's package catalog.

What you do:
- Recommend the best-fitting package from the catalog for this customer (destination, group size, occasion, travel date, budget, previous feedback). Prefer real catalog packages and reference them by their packageDocId. Only design a fully custom trip if nothing fits, and say so.
- Draft proposals: day-wise plan, hotel category, inclusions/exclusions, price per person and total for the group, and a short WhatsApp message the salesperson can send.
- Revise proposals when asked ("version 2", "make it cheaper", "add a day", "change hotel to 5 star"): start from the latest proposal in the CRM history, apply the change, and explain what changed in changesFromPrevious.
- Answer sales questions: objection handling, follow-up messages, what to ask next.

Proposal fields:
- overview: 2-3 sentences describing the trip for the customer (goes on the itinerary PDF).
- hotels: one entry per stay in trip order; nights across hotels must add up to the trip nights. Prefer hotels from the package's Hotel_Examples; otherwise suggest well-known hotels of the requested category.
- travelDate: the trip start date as YYYY-MM-DD only if an exact date is known from the lead or conversation, otherwise "".
- dayWisePlan: one entry per day ("Day 1", "Day 2", ...), covering nights + 1 days.

Pricing rules:
- Base prices on the catalog's listed prices (Price_Min_INR / Price_Max_INR / Price_Range_INR). If the catalog price basis (per person vs per package) is unclear, state your assumption in priceNote.
- totalPrice = pricePerPerson × (adults + children) unless you explain a different child price in priceNote.
- Never invent discounts the salesperson didn't ask for. Round prices to the nearest ₹500.

Writing rules:
- reply is what the salesperson reads: short, practical, Indian English. Use ₹ and Indian number formatting (1,25,000). It is shown as plain text, so don't use markdown (no **bold** or # headings); simple lines starting with "- " are fine.
- whatsappMessage is written TO the customer, warm and concise, ready to paste, addressed by first name, no placeholders.
- Set proposal to null when the salesperson only asked a question or wanted a message, not a proposal.`

const PROPOSAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title', 'overview', 'destination', 'packageDocId', 'packageName', 'travelDate', 'nights', 'adults', 'children', 'hotelCategory', 'hotels',
    'pricePerPerson', 'totalPrice', 'priceNote', 'inclusions', 'exclusions', 'dayWisePlan', 'whatsappMessage',
    'changesFromPrevious',
  ],
  properties: {
    title: { type: 'string' },
    overview: { type: 'string' },
    destination: { type: 'string' },
    packageDocId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    packageName: { type: 'string' },
    travelDate: { type: 'string' },
    nights: { type: 'integer' },
    adults: { type: 'integer' },
    children: { type: 'integer' },
    hotelCategory: { type: 'string' },
    hotels: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['city', 'hotelName', 'nights', 'roomType', 'mealPlan'],
        properties: {
          city: { type: 'string' },
          hotelName: { type: 'string' },
          nights: { type: 'integer' },
          roomType: { type: 'string' },
          mealPlan: { type: 'string' },
        },
      },
    },
    pricePerPerson: { type: 'number' },
    totalPrice: { type: 'number' },
    priceNote: { type: 'string' },
    inclusions: { type: 'array', items: { type: 'string' } },
    exclusions: { type: 'array', items: { type: 'string' } },
    dayWisePlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'title', 'description'],
        properties: { day: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } },
      },
    },
    whatsappMessage: { type: 'string' },
    changesFromPrevious: { type: 'string' },
  },
}

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'proposal', 'suggestedNextSteps'],
  properties: {
    reply: { type: 'string' },
    proposal: { anyOf: [PROPOSAL_SCHEMA, { type: 'null' }] },
    suggestedNextSteps: { type: 'array', items: { type: 'string' } },
  },
}

const DETAIL_FIELDS = [
  'Destination_Name', 'Overview', 'Duration', 'Duration_Nights', 'Price_Range_INR', 'Price_Min_INR', 'Price_Max_INR',
  'Budget_Category', 'Star_Category', 'Meal_Plan', 'Hotel_Examples', 'Occasion', 'Travel_Type', 'Group_Size',
  'Child_Friendly', 'Inclusions', 'Exclusions', 'Day_Wise_Itinerary', 'Seasonality',
]

/**
 * POST /api/ai/sales-assistant
 * Body: { leadContext: string, destinationHint?: string, messages: { role: 'user' | 'assistant', content: string }[] }
 */
export async function POST(req: NextRequest) {
  try {
    const authError = await requireLeadsAccess(req)
    if (authError) return authError
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is missing in environment variables.' }, { status: 500 })
    }

    const body = await req.json()
    const leadContext: string = String(body.leadContext || '').slice(0, 30000)
    const destinationHint: string = String(body.destinationHint || '')
    const messages: Anthropic.MessageParam[] = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: any) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 8000) }))

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 })
    }

    const catalog = await buildCatalog(destinationHint)

    const params = {
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: [
        { type: 'text' as const, text: SYSTEM_PROMPT },
        { type: 'text' as const, text: `PACKAGE CATALOG\n${catalog}`, cache_control: { type: 'ephemeral' as const } },
        { type: 'text' as const, text: `THIS LEAD\n${leadContext}\n\nToday's date: ${new Date().toDateString()}` },
      ],
      messages,
      output_config: {
        effort: 'medium' as const,
        format: { type: 'json_schema' as const, schema: RESPONSE_SCHEMA },
      },
      betas: ['server-side-fallback-2026-07-01'],
      // Re-runs on a fallback model if a safety classifier declines (not yet in this SDK version's types)
      fallbacks: 'default',
    }

    const response = await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming)

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'The AI declined this request. Try rephrasing it.' }, { status: 422 })
    }
    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'The AI response was too long. Try a narrower request.' }, { status: 422 })
    }

    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text || ''
    let result: any
    try {
      result = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'The AI returned an unreadable response. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ success: true, ...result, usage: response.usage })
  } catch (err: any) {
    console.error('[Sales Assistant Error]:', err)
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'AI is busy right now. Please retry in a moment.' }, { status: 429 })
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'The Anthropic API key is invalid.' }, { status: 500 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI error (${err.status}): ${err.message}` }, { status: 502 })
    }
    return NextResponse.json({ error: err.message || 'AI assistant failed' }, { status: 500 })
  }
}

/** Full details for packages matching the lead's destination, plus a one-line index of everything else. */
async function buildCatalog(destinationHint: string): Promise<string> {
  const snap = await getDocs(collection(db, 'packages'))
  const all: Record<string, any>[] = snap.docs.map((d) => ({ docId: d.id, ...d.data() }))

  const tokens = destinationHint
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 2 && !['package', 'couple', 'leads', 'lead', 'jaipur', 'copy', 'sept', 'the'].includes(t))
  const matches = tokens.length
    ? all.filter((p) => {
        const hay = `${p.Destination_Name || ''} ${p.Destination_ID || ''} ${p.Location_Breakup || ''}`.toLowerCase()
        return tokens.some((t) => hay.includes(t))
      })
    : []

  const detailed = matches.slice(0, 25).map((p) => {
    const lines = [`packageDocId: ${p.docId}`]
    for (const f of DETAIL_FIELDS) {
      const v = p[f]
      if (v !== undefined && v !== null && String(v).trim()) lines.push(`${f}: ${String(v).slice(0, 1500)}`)
    }
    return lines.join('\n')
  })

  const matchedIds = new Set(matches.map((m) => m.docId))
  const index = all
    .filter((p) => !matchedIds.has(p.docId))
    .slice(0, 300)
    .map((p) => `- ${p.docId} | ${p.Destination_Name || '?'} | ${p.Duration || ''} | ${p.Price_Range_INR || p.Price_Min_INR || ''}`)

  return [
    detailed.length
      ? `Packages matching "${destinationHint}" (full details):\n\n${detailed.join('\n\n---\n\n')}`
      : `No package matched "${destinationHint || 'the lead'}" directly.`,
    `Other packages (index: packageDocId | name | duration | price):\n${index.join('\n')}`,
  ].join('\n\n====\n\n')
}
