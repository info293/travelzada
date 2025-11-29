import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface LocationAnalysisResult {
  detectedLocation: string | null // Matched destination from database
  rawDetectedLocation: string | null // Original detected location name (even if not in database)
  confidence: 'high' | 'medium' | 'low'
  landmarks?: string[]
  description?: string
  similarLocations?: string[]
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY' },
      { status: 500 }
    )
  }

  try {
    const { imageBase64, availableDestinations = [] } = await request.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')

    // Build system prompt with available destinations
    let systemPrompt = `You are a travel location detection expert. Analyze the uploaded image and identify:
1. The primary location/destination shown in the image (be specific - city, region, or country)
2. Any recognizable landmarks or features
3. The country or region

IMPORTANT: 
- First, identify what location is actually shown in the image (be specific, e.g., "Rajasthan, India", "Jodhpur", "Mehrangarh Fort")
- Then, match the detected location against these available destinations: ${availableDestinations.join(', ')}.
- If the location matches one of the available destinations, return the EXACT name from the list in "detectedLocation"
- If no exact match, return null for "detectedLocation" but still provide the actual location name in "rawDetectedLocation"
- Suggest similar locations from the available list based on:
  - Similar geography (beaches, mountains, cities)
  - Similar culture or climate
  - Similar tourist attractions

Return your response as JSON with this structure:
{
  "rawDetectedLocation": "actual location name detected in image (e.g., 'Rajasthan', 'Jodhpur', 'Mehrangarh Fort')",
  "detectedLocation": "exact destination name from available list or null",
  "confidence": "high" | "medium" | "low",
  "landmarks": ["landmark1", "landmark2"],
  "description": "brief description of what you see",
  "similarLocations": ["similar destination 1", "similar destination 2"]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Using GPT-4o for vision capabilities
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and identify the location. Match it against the available destinations provided.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    let analysisResult: LocationAnalysisResult

    try {
      analysisResult = JSON.parse(responseText)
      
      // Store raw detected location if not already set
      if (!analysisResult.rawDetectedLocation && analysisResult.detectedLocation) {
        analysisResult.rawDetectedLocation = analysisResult.detectedLocation
      }
      
      // Normalize detected location to match available destinations
      if (analysisResult.detectedLocation || analysisResult.rawDetectedLocation) {
        const locationToMatch = analysisResult.detectedLocation || analysisResult.rawDetectedLocation
        const detectedLower = locationToMatch?.toLowerCase().trim() || ''
        const matchedDest = availableDestinations.find((d: string) => {
          const destLower = d.toLowerCase()
          return destLower === detectedLower || 
                 destLower.includes(detectedLower) ||
                 detectedLower.includes(destLower)
        })
        
        if (matchedDest) {
          analysisResult.detectedLocation = matchedDest
          analysisResult.confidence = 'high'
        } else {
          // If no exact match, keep raw location but set detectedLocation to null
          if (!analysisResult.rawDetectedLocation && locationToMatch) {
            analysisResult.rawDetectedLocation = locationToMatch
          }
          analysisResult.detectedLocation = null
        }
      }

      // Filter similar locations to only include available destinations
      if (analysisResult.similarLocations) {
        analysisResult.similarLocations = analysisResult.similarLocations.filter((loc: string) =>
          availableDestinations.some((d: string) => 
            d.toLowerCase().includes(loc.toLowerCase()) || 
            loc.toLowerCase().includes(d.toLowerCase())
          )
        ).map((loc: string) => {
          // Return exact destination name
          const matched = availableDestinations.find((d: string) =>
            d.toLowerCase().includes(loc.toLowerCase()) || 
            loc.toLowerCase().includes(d.toLowerCase())
          )
          return matched || loc
        })
      }

    } catch (parseError) {
      console.error('Failed to parse AI analysis response:', responseText)
      analysisResult = {
        detectedLocation: null,
        rawDetectedLocation: null,
        confidence: 'low',
        similarLocations: [],
      }
    }

    console.log('[Image Analysis] Result:', analysisResult)

    return NextResponse.json(analysisResult)
  } catch (error: any) {
    console.error('Image analysis API error', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        detectedLocation: null,
        rawDetectedLocation: null,
        confidence: 'low' as const,
        similarLocations: []
      } as LocationAnalysisResult,
      { status: 500 }
    )
  }
}

