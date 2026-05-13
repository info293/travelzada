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
      return NextResponse.json({ cities: [] })
    }

    if (!anthropic) {
      return NextResponse.json({ cities: [], error: 'AI not configured' }, { status: 500 })
    }

    const combinedText = itineraries
      .filter(Boolean)
      .map((s: string, i: number) => `Package ${i + 1}:\n${s}`)
      .join('\n\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `You are a travel data extractor. Your only job is to extract city and town names from travel itinerary text.
Rules:
- Return ONLY real city/town/place names (e.g. Jaipur, Jodhpur, Jaisalmer, Pushkar, Udaipur)
- Do NOT include: activities, meal types (Breakfast, Lunch, Dinner), hotel check-in/out, route descriptions, directions, or any non-place text
- Do NOT include phrases like "Transfer to", "Drive to", "Sightseeing", "En route", "Departure", "Arrival"
- Each entry must be a single standalone city or town name only
- Remove duplicates
- Return a JSON array of strings, nothing else`,
      messages: [{
        role: 'user',
        content: `Extract only the city/town names from these itineraries:\n\n${combinedText}`,
      }],
    })

    const raw = (response.content.find(b => b.type === 'text') as any)?.text?.trim() || '[]'

    // Parse JSON array from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    const cities: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    // Final sanitization: remove entries with commas, too short, or too long
    const clean = cities
      .filter((c: string) => typeof c === 'string')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 1 && c.length < 50 && !c.includes(','))
      .filter((c: string) => !/^(breakfast|lunch|dinner|departure|arrival|check|hotel|transfer|drive|fly|en route)/i.test(c))

    const unique = Array.from(new Set(clean)).sort()

    return NextResponse.json({ cities: unique })
  } catch (err: any) {
    console.error('[extract-cities] Error:', err?.message || err)
    return NextResponse.json({ cities: [], error: 'Extraction failed' }, { status: 500 })
  }
}
