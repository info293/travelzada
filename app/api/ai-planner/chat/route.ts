import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { searchSimilarPackages } from '@/lib/pinecone'

// Initialize Anthropic (Claude) as primary
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// Initialize OpenAI as fallback
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

// Check if semantic search is available (Pinecone configured)
const isSemanticSearchEnabled = () => {
  return !!process.env.PINECONE_API_KEY && !!process.env.PINECONE_INDEX
}

export async function POST(request: Request) {
  // Check if at least one API is available
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'No AI API keys configured' },
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

    // 🔍 SEMANTIC SEARCH: Find relevant packages based on user query
    let semanticResults: any[] = []
    if (isSemanticSearchEnabled()) {
      try {
        console.log('[AI Planner] Running semantic search for:', prompt.slice(0, 50))
        semanticResults = await searchSimilarPackages(prompt, 5)
        console.log(`[AI Planner] Found ${semanticResults.length} semantically similar packages`)
      } catch (semanticError: any) {
        console.warn('[AI Planner] Semantic search failed (continuing without it):', semanticError.message)
      }
    }

    // Increase history to 12 messages for better context retention
    const history = Array.isArray(conversation)
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

    // 🔍 Add semantic search results context (most relevant packages based on query meaning)
    if (semanticResults.length > 0) {
      systemPrompt += `\n\n=== SEMANTIC SEARCH RESULTS (HIGHLY RELEVANT PACKAGES) ===`
      systemPrompt += `\nThese packages were found using AI semantic search and are highly relevant to the user's query:`
      semanticResults.forEach((pkg, index) => {
        systemPrompt += `\n\n${index + 1}. "${pkg.destinationName}" (${Math.round(pkg.score * 100)}% match)`
        if (pkg.duration) systemPrompt += `\n   • Duration: ${pkg.duration}`
        if (pkg.priceRange) systemPrompt += `\n   • Price: ${pkg.priceRange}`
        if (pkg.starCategory) systemPrompt += `\n   • Hotel: ${pkg.starCategory}`
        if (pkg.travelType) systemPrompt += `\n   • Type: ${pkg.travelType}`
        if (pkg.overview) systemPrompt += `\n   • About: ${pkg.overview.slice(0, 100)}...`
      })
      systemPrompt += `\n\nPRIORITIZE recommending these semantically matched packages when relevant to the conversation.`
    }

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

    let message: string

    // Try Claude first (primary)
    if (anthropic) {
      try {
        console.log('[AI Planner] Using Claude Sonnet 4.5')

        // Format messages for Claude
        const claudeMessages = [
          ...history.map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user' as const, content: prompt },
        ]

        const claudeResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929', // Claude Sonnet 4.5
          max_tokens: 1024,
          system: systemPrompt,
          messages: claudeMessages,
        })

        // Extract text from Claude response
        const textContent = claudeResponse.content.find(block => block.type === 'text') as any
        message = textContent?.text ?? 'I am here to help you plan your trip!'

        return NextResponse.json({ message, provider: 'claude' })
      } catch (claudeError: any) {
        console.error('[AI Planner] Claude failed, falling back to ChatGPT:', claudeError.message)
        // Fall through to OpenAI
      }
    }

    // Fallback to ChatGPT
    if (process.env.OPENAI_API_KEY) {
      console.log('[AI Planner] Using ChatGPT (fallback)')

      const openaiMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history as ChatCompletionMessageParam[],
        { role: 'user', content: prompt },
      ]

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.5,
        messages: openaiMessages,
      })

      message = completion.choices[0]?.message?.content ?? 'I am here to help you plan your trip!'

      return NextResponse.json({ message, provider: 'openai' })
    }

    // If we get here, no AI worked
    return NextResponse.json(
      { error: 'All AI providers failed' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Chat API error', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
