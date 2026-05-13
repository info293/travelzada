export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export async function POST(req: Request) {
  try {
    const { itineraries } = await req.json()

    if (!Array.isArray(itineraries) || itineraries.length === 0) {
      return NextResponse.json({ pairs: [] })
    }

    if (!anthropic) {
      return NextResponse.json({ pairs: [] }, { status: 500 })
    }

    const combinedText = itineraries
      .filter(Boolean)
      .map((s: string, i: number) => `--- Package ${i + 1} ---\n${s}`)
      .join('\n\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 768,
      system: `You are a travel itinerary analyzer. For each numbered package itinerary given:
1. Find the PICKUP CITY: where the trip starts (Day 1 / first location the traveler reaches)
2. Find the DROP CITY: where the trip ends (last day / final departure point)

Rules:
- Use only real city or airport names (e.g. "Delhi", "Jaipur Airport", "Mumbai")
- Do NOT use activity names, meal names, or phrases like "Transfer to", "Check In", "Sightseeing"
- Each city must be a short standalone place name under 30 characters
- Return one JSON object per package in an array
- Format: [{"pickup": "CityName", "drop": "CityName"}, ...]
- Return ONLY the JSON array, nothing else`,
      messages: [{
        role: 'user',
        content: `For each package below, find the pickup (start) city and drop (end) city:\n\n${combinedText}`,
      }],
    })

    const raw = (response.content.find(b => b.type === 'text') as any)?.text?.trim() || '[]'
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    let pairs: { pickup: string; drop: string }[] = []

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        pairs = parsed
          .filter((p: any) => p && typeof p.pickup === 'string' && typeof p.drop === 'string')
          .map((p: any) => ({
            pickup: p.pickup.trim(),
            drop: p.drop.trim(),
          }))
          .filter((p: any) =>
            p.pickup.length > 1 && p.pickup.length < 50 &&
            p.drop.length > 1 && p.drop.length < 50 &&
            !p.pickup.includes(',') && !p.drop.includes(',') &&
            !/^(breakfast|lunch|dinner|departure|arrival|check|hotel|transfer|drive|fly|en route)/i.test(p.pickup) &&
            !/^(breakfast|lunch|dinner|departure|arrival|check|hotel|transfer|drive|fly|en route)/i.test(p.drop)
          )
      }
    }

    return NextResponse.json({ pairs })
  } catch (err: any) {
    console.error('[extract-pickup-drop] Error:', err?.message || err)
    return NextResponse.json({ pairs: [] }, { status: 500 })
  }
}
