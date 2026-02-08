import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Interface for package data sent from frontend
interface ShownPackage {
  name: string
  duration: string
  price: string
  starCategory: string
  travelType?: string
  overview?: string
  inclusions?: string
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY' },
      { status: 500 }
    )
  }


  try {
    const { prompt, conversation = [], availableDestinations = [], shownPackages = [] } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Increase history to 12 messages for better context retention
    const history: ChatCompletionMessageParam[] = Array.isArray(conversation)
      ? conversation
        .filter(
          (msg: any) =>
            typeof msg?.content === 'string' &&
            (msg?.role === 'assistant' || msg?.role === 'user')
        )
        .slice(-12) // Keep last 12 messages for better context
        .map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content as string,
        }))
      : []

    // Build system prompt with available destinations context
    let systemPrompt = 'You are Travelzada, a warm and concise AI trip planner. Keep responses under 120 words, ask one question at a time, and use Indian English nuances when helpful.'

    // Add available destinations context if provided
    if (Array.isArray(availableDestinations) && availableDestinations.length > 0) {
      const destinationsList = availableDestinations.join(', ')
      systemPrompt += `\n\nIMPORTANT: Only mention destinations that are available in our database. Currently available destinations: ${destinationsList}. Do NOT suggest or mention any other destinations that are not in this list.`
    }

    // Add shown packages context for comparisons
    if (Array.isArray(shownPackages) && shownPackages.length > 0) {
      systemPrompt += `\n\n=== PACKAGES CONTEXT (CRITICAL - USE THESE FOR COMPARISONS) ===`
      shownPackages.forEach((pkg: ShownPackage, index: number) => {
        systemPrompt += `\n\nPackage ${index + 1}: "${pkg.name}"`
        systemPrompt += `\n  • Duration: ${pkg.duration}`
        systemPrompt += `\n  • Price: ${pkg.price}`
        systemPrompt += `\n  • Category: ${pkg.starCategory}`
        if (pkg.travelType) {
          systemPrompt += `\n  • Type: ${pkg.travelType}`
        }
        if (pkg.overview) {
          systemPrompt += `\n  • About: ${pkg.overview.substring(0, 150)}`
        }
      })
      systemPrompt += `\n\n=== MANDATORY COMPARISON RULES ===
When user asks to "compare", "which is best", "compare all", or asks about multiple packages:
YOU MUST DO ALL OF THE FOLLOWING:
1. MENTION ALL ${shownPackages.length} PACKAGES BY NAME in your response
2. Compare prices: List the exact price of each package
3. Compare durations: List the days/nights of each  
4. Highlight what makes each unique
5. If user mentions preferences (religious, spa, adventure, budget), match packages to those needs
6. END with a clear recommendation: "Based on your preferences, I recommend [Package Name] because..."

EXAMPLE FORMAT:
"Let me compare all 3 packages for you:
1. **Package A** (₹37,500, 6 days) - Best for X
2. **Package B** (₹43,000, 7 days) - Best for Y  
3. **Package C** (₹48,000, 7 days) - Best for Z
My recommendation: Package B suits you best because..."`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Upgraded for better instruction following
      temperature: 0.5, // Lowered for more consistent instruction following
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...history,
        {
          role: 'user',
          content: prompt,
        } satisfies ChatCompletionMessageParam,
      ],
    })

    const message =
      completion.choices[0]?.message?.content ??
      'I am here to help you plan your trip!'

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Chat API error', error)
    return NextResponse.json(
      { error: 'Failed to contact ChatGPT' },
      { status: 500 }
    )
  }
}

