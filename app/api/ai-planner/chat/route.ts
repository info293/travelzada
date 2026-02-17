import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { searchSimilarPackages } from '@/lib/pinecone'
import { detectUserIntent } from '@/lib/agent-brain'

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
    const { prompt, conversation = [], availableDestinations = [], shownPackages = [], currentDestination, availableDayOptions } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
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

    // 🧠 AGENT REASONING STEP
    // instead of blindly searching, we ask the Brain: "What does the user want?"
    let decision = {
      intent: 'GENERAL_CHAT',
      searchQuery: prompt,
      filters: {},
      reasoning: 'Default fallback'
    }

    try {
      // We only use the brain if Pinecone is configured, otherwise it's just a chat bot
      if (isSemanticSearchEnabled()) {
        console.log('[Agent] 🤔 Thinking about user intent...')
        // @ts-ignore
        decision = await detectUserIntent(prompt, history)
        console.log('[Agent] 💡 Decision:', JSON.stringify(decision, null, 2))
      }
    } catch (e) {
      console.error('[Agent] ❌ Brain freeze:', e)
    }

    // 🔍 EXECUTE SEARCH (Only if the Agent decided to search)
    let semanticResults: any[] = []
    // @ts-ignore
    if (decision.intent === 'SEARCH_PACKAGES' && isSemanticSearchEnabled()) {
      try {
        console.log('[Agent] 🔍 Searching Pinecone for:', decision.searchQuery)

        // Convert filters to Pinecone syntax if needed (e.g. price ranges)
        // For now, we pass the filters object. We will refine this in lib/pinecone.ts next.
        // @ts-ignore
        semanticResults = await searchSimilarPackages(decision.searchQuery, 4, decision.filters)

        console.log(`[Agent] ✅ Found ${semanticResults.length} relevant packages`)
      } catch (semanticError: any) {
        console.warn('[Agent] ⚠️ Search failed:', semanticError.message)
      }
    } else {
      // @ts-ignore
      console.log('[Agent] ⏭️ Skipping search (Intent: ' + decision.intent + ')')
    }



    // Build system prompt with date validation and available destinations context
    const today = new Date()
    const todayISO = today.toISOString().split('T')[0]

    // Calculate minimum booking date (1 week from today)
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() + 7)
    const minDateISO = minDate.toISOString().split('T')[0]

    let systemPrompt = `You are Travelzada, a smart AI travel planner.
    
    === AGENT CONTEXT ===
    User Intent: ${decision.intent}
    Reasoning: ${decision.reasoning}
    Active Filters: ${JSON.stringify(decision.filters)}
    
    === CRITICAL RULES ===
    1. Keep responses under 120 words.
    2. Ask ONE clarifying question at a time.
    3. Use Indian English nuances.
    4. TODAY: ${todayISO}. Bookings start after: ${minDateISO}.
    `

    // Inject Search Results
    if (semanticResults.length > 0) {
      systemPrompt += `\n\n=== RELEVANT PACKAGES FOUND ===`
      systemPrompt += `\nUse these to answer the user. Do NOT hallucinate prices or details.`
      semanticResults.forEach((pkg, index) => {
        systemPrompt += `\n\n${index + 1}. "${pkg.Destination_Name}"`
        if (pkg.Price_Range_INR) systemPrompt += ` | Price: ${pkg.Price_Range_INR}`
        if (pkg.Duration) systemPrompt += ` | Duration: ${pkg.Duration}`
        // Injecting the "Overview" or "Inclusions" gives the AI the "Small Things" it needs
        if (pkg.Overview) systemPrompt += `\n   Summary: ${pkg.Overview.slice(0, 300)}...`
        if (pkg.Inclusions && Array.isArray(pkg.Inclusions)) systemPrompt += `\n   Includes: ${pkg.Inclusions.slice(0, 5).join(', ')}`
      })
      systemPrompt += `\n\nGuidance: Recommend the best match. Mention strict price/inclusions if asked.`
    } else if (decision.intent === 'SEARCH_PACKAGES') {
      systemPrompt += `\n\n[SYSTEM NOTE]: You tried to search but found NO packages matching "${decision.searchQuery}" with filters ${JSON.stringify(decision.filters)}.
        Politely tell the user you couldn't find exactly that, and ask for broader criteria (e.g. different budget or location).`
    }

    // CRITICAL: Add current destination context to avoid confusion
    if (currentDestination) {
      systemPrompt += `\n\n🎯 CURRENT CONTEXT: The user is planning a trip to **${currentDestination}**. All your responses should be relevant to ${currentDestination}. Do not mention other destinations unless the user explicitly asks to change destinations.`
    }

    // CRITICAL: Add available day options for the destination
    if (availableDayOptions && availableDayOptions.length > 0) {
      systemPrompt += `\n\n📅 AVAILABLE DURATIONS for ${currentDestination || 'this destination'}: We only have packages for these durations: ${availableDayOptions.join(', ')} days. **IMPORTANT**: Only suggest these specific durations to the user. Do NOT mention other day counts that are not in this list.`
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

=== STYLE GUIDELINES ===
- Use markdown formatting: **bold** for emphasis, not **package names repeatedly**
- When referring to packages after first mention, use "this package" or "it" instead of repeating the full name
- Keep responses concise and avoid redundant phrasing
- Format options like: "Options: 3 days, 5 days, 7 days" (bold the word "Options")

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

        return NextResponse.json({ message, provider: 'claude', recommendations: semanticResults })
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

      return NextResponse.json({ message, provider: 'openai', recommendations: semanticResults })
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
