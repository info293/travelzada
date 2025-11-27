import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ExtractionResult {
  destination?: string | null
  travelDate?: string | null // ISO format: YYYY-MM-DD
  days?: string | null
  hotelType?: string | null // "3 Star", "4 Star", "5 Star"
  travelType?: string | null // "solo", "family", "couple", "friends"
  budget?: string | null
  feedback?: string | null
  confidence: 'high' | 'medium' | 'low'
  understood: boolean
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY' },
      { status: 500 }
    )
  }

  try {
    const { userInput, currentQuestion, existingTripInfo, availableDestinations } = await request.json()

    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json(
        { error: 'User input is required' },
        { status: 400 }
      )
    }

    // Build context about what we're looking for
    const contextPrompt = buildContextPrompt(currentQuestion, existingTripInfo, availableDestinations)

    const systemPrompt = `You are a data extraction assistant for a travel planning system. Your job is to understand user responses and extract structured trip information.

${contextPrompt}

IMPORTANT RULES:
1. Return ONLY valid JSON, no other text
2. For destinations: Normalize typos (e.g., "bli" → "Bali", "goa" → "Goa"). Match against available destinations exactly.
3. For dates: Convert to ISO format (YYYY-MM-DD). If only month/year given, use the 15th of that month
4. For hotelType: Return "3 Star", "4 Star", or "5 Star" only
5. For travelType: Return "solo", "family", "couple", or "friends" only
6. For days: Return number as string (e.g., "5")
7. Set "understood" to true if you can extract the requested information (even with typos - normalize them!)
8. Set "confidence" based on how clear the user's answer is
9. For destination extraction: If user says something like "bli", "bali", "BALI" → normalize to exact destination name from available list

Return JSON in this exact format:
{
  "destination": "Bali" or null (must match available destinations exactly, normalized from typos),
  "travelDate": "2025-03-15" or null,
  "days": "5" or null,
  "hotelType": "3 Star" or "4 Star" or "5 Star" or null,
  "travelType": "solo" or "family" or "couple" or "friends" or null,
  "budget": "50000" or null,
  "feedback": "user's activity preferences" or null,
  "confidence": "high" or "medium" or "low",
  "understood": true or false
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: 'json_object' }, // Force JSON response
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `User said: "${userInput}"\n\nExtract the relevant information and return JSON.`,
        } satisfies ChatCompletionMessageParam,
      ],
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    let extractedData: ExtractionResult

    try {
      extractedData = JSON.parse(responseText)
      
      // Normalize destination to match available destinations
      if (extractedData.destination) {
        const destLower = extractedData.destination.toLowerCase().trim()
        // Check against available destinations (case-insensitive)
        const matchedDest = availableDestinations.find((d: string) => 
          d.toLowerCase() === destLower || 
          destLower.includes(d.toLowerCase()) ||
          d.toLowerCase().includes(destLower)
        )
        
        if (matchedDest) {
          // Use the exact name from available destinations
          extractedData.destination = matchedDest
          // If destination was extracted, mark as understood
          if (!extractedData.understood) {
            extractedData.understood = true
            extractedData.confidence = extractedData.confidence || 'high'
          }
        } else if (destLower === 'bli' || destLower === 'bali' || destLower.includes('bali') || destLower.includes('bli')) {
          // Special handling for "bli" typo - normalize to "Bali"
          const baliDest = availableDestinations.find((d: string) => d.toLowerCase() === 'bali')
          if (baliDest) {
            extractedData.destination = baliDest
            extractedData.understood = true
            extractedData.confidence = 'high'
          }
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI extraction response:', responseText)
      // Fallback: return empty extraction
      extractedData = {
        confidence: 'low',
        understood: false,
      }
    }

    console.log('[AI Extraction] Input:', userInput)
    console.log('[AI Extraction] Result:', extractedData)

    return NextResponse.json(extractedData)
  } catch (error: any) {
    console.error('Extraction API error', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract data',
        confidence: 'low',
        understood: false
      } as ExtractionResult,
      { status: 500 }
    )
  }
}

function buildContextPrompt(
  currentQuestion: string,
  existingTripInfo: any,
  availableDestinations: string[] = []
): string {
  let prompt = ''

  // Add context about what question we're asking
  switch (currentQuestion) {
    case 'destination':
      prompt = `CURRENT QUESTION: "Which destination do you want to plan?"
AVAILABLE DESTINATIONS: ${availableDestinations.length > 0 ? availableDestinations.join(', ') : 'Bali'}
EXTRACT: destination name (must match available destinations exactly, case-insensitive)
- If user says "bli", "bali", "BALI" → return "Bali"
- If user says something similar to an available destination, normalize it to the exact destination name
- Return the EXACT destination name from the available destinations list
- Set "understood: true" if you can identify a destination, even with typos`
      break

    case 'date':
      prompt = `CURRENT QUESTION: "When do you plan to travel?"
EXISTING INFO: ${existingTripInfo.destination ? `Destination: ${existingTripInfo.destination}` : 'None'}
EXTRACT: travelDate (convert to ISO format YYYY-MM-DD)
- If user says "March" or "March 2025", use 15th of that month
- If user says "next month", calculate next month
- If user says "in 2 weeks", calculate 2 weeks from today`
      break

    case 'days':
      prompt = `CURRENT QUESTION: "How many days do you want?"
EXISTING INFO: Destination: ${existingTripInfo.destination || 'None'}, Date: ${existingTripInfo.travelDate || 'None'}
EXTRACT: days (number as string, e.g., "5", "7")`
      break

    case 'hotel':
      prompt = `CURRENT QUESTION: "What hotel type do you prefer: 3-star, 4-star, or 5-star?"
EXISTING INFO: ${existingTripInfo.destination ? `Destination: ${existingTripInfo.destination}` : 'None'}
EXTRACT: hotelType ("3 Star", "4 Star", or "5 Star")
- "budget", "cheap", "economy" → "3 Star"
- "mid-range", "moderate", "standard" → "4 Star"
- "luxury", "premium", "5 star" → "5 Star"`
      break

    case 'travelType':
      prompt = `CURRENT QUESTION: "Who are you traveling with?"
EXISTING INFO: ${existingTripInfo.destination ? `Destination: ${existingTripInfo.destination}` : 'None'}
EXTRACT: travelType ("solo", "family", "couple", or "friends")
- "alone", "myself", "solo" → "solo"
- "with kids", "family", "children" → "family"
- "with partner", "romantic", "honeymoon" → "couple"
- "with friends", "group" → "friends"`
      break

    case 'feedback':
      prompt = `CURRENT QUESTION: "Any specific activities or preferences?"
EXISTING INFO: Destination: ${existingTripInfo.destination || 'None'}
EXTRACT: feedback (user's activity preferences, suggestions, or questions as text)
- If user says "skip" or "no", return null for feedback and understood: true
- Otherwise, extract their preferences as text`
      break

    default:
      prompt = `CURRENT QUESTION: General conversation
EXTRACT: Any trip information you can find (destination, date, days, hotelType, travelType, budget, feedback)`
  }

  return prompt
}

