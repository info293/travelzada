import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
            { error: 'No AI API keys configured' },
            { status: 500 }
        )
    }

    try {
        const { mainDestination, itinerary } = await request.json()

        if (!itinerary || !Array.isArray(itinerary)) {
            return NextResponse.json({ error: 'Itinerary is required' }, { status: 400 })
        }

        // Prepare prompt
        const prompt = `You are a geographic coordinate extractor.
Given the main destination of a trip and a list of daily itinerary descriptions, extract the most specific, plotable real-world location from each day's description.
Return exactly the latitude and longitude for that place.

Main Destination: ${mainDestination}

Itinerary Items:
${itinerary.map((i, idx) => `${idx + 1}. Day: ${i.day || ''} | Description: ${i.title}`).join('\n')}

If you cannot find a specific location, fallback to the main destination's coordinates. Format your response strictly as JSON matching the schema.`

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a precise geocoding AI." },
                { role: "user", content: prompt }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "geocoded_itinerary",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            locations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        lat: { type: "number" },
                                        lng: { type: "number" }
                                    },
                                    required: ["id", "lat", "lng"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["locations"],
                        additionalProperties: false
                    }
                }
            },
            temperature: 0.1
        })

        const responseContent = completion.choices[0].message.content

        if (!responseContent) {
            throw new Error("No content returned from AI")
        }

        const data = JSON.parse(responseContent)

        // Convert array to Record matching the requested IDs
        const coordinatesMap: Record<string, [number, number]> = {}

        data.locations.forEach((loc: any, index: number) => {
            // We match by the index of the incoming itinerary array for safety
            const originalItem = itinerary[index]
            if (originalItem && originalItem.title) {
                coordinatesMap[originalItem.title] = [loc.lat, loc.lng]
            }
        })

        return NextResponse.json({ coordinates: coordinatesMap })

    } catch (error: any) {
        console.error('Error in geocode-itinerary API:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to geocode itinerary' },
            { status: 500 }
        )
    }
}
