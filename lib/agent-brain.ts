import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export interface AgentDecision {
    intent: 'SEARCH_PACKAGES' | 'GENERAL_CHAT' | 'CLARIFICATION'
    reasoning: string
    searchQuery: string // Optimized query for vector search
    filters: {
        budget?: { min?: number; max?: number }
        destination?: string
        theme?: string
        mood?: string
        duration?: { min: number; max: number }
        travelType?: string
        hotel?: { minStar?: number; category?: string }
    }
}

/**
 * The "Brain" of the Agent.
 * Decides WHAT the user wants and HOW to search for it.
 */
export async function detectUserIntent(
    lastMessage: string,
    history: any[]
): Promise<AgentDecision> {
    const systemPrompt = `
You are the "Brain" of a Travel Planner Agent.
Your job is to analyze the user's latest message and decide the next step.

AVAILABLE INTENTS:
1. SEARCH_PACKAGES: User is asking for a trip, destination, quote, or recommendation. **(DEFAULT if a destination is mentioned)**
2. GENERAL_CHAT: User is saying "Hi", "Thanks", or asking general questions like "Is Bali safe?".
3. CLARIFICATION: User provided vague info, but we shouldn't search yet (e.g. "I want to travel" -> Ask "Where?"). **DO NOT USE if a destination is already mentioned.**

RULES FOR SEARCH:
- **If user mentions a destination (e.g. "Bali", "Kerala"), ALWAYS choose SEARCH_PACKAGES.** (Even if dates/budget are missing - this is "Browsing Mode").
- Only use CLARIFICATION if the user hasn't specified WHERE they want to go.

EXTRACT FILTERS (If Intent is SEARCH_PACKAGES):
- Budget: Convert "under 50k" to { max: 50000 }. "Cheap" -> { max: 30000 }. "Luxury" -> { min: 100000 }.
- Destination: Normalized name (e.g. "Kerala").
- Theme/Mood: Honeymoon, Adventure, Relaxing.

OUTPUT FORMAT:
Return a PURE JSON object (no markdown):
{
  "intent": "SEARCH_PACKAGES",
  "reasoning": "User asked for a honeymoon trip to Bali under 1 lakh with 5 star hotel",
  "searchQuery": "Bali honeymoon premium resort private pool",
  "filters": {
    "destination": "Bali",
    "theme": "Honeymoon",
    "budget": { "max": 100000 },
    "duration": { "min": 6, "max": 8 },
    "hotel": { "minStar": 5, "category": "Luxury" }
  }
}
`

    const messages = [
        { role: 'system', content: systemPrompt },
        // Include last 2 turns for context
        ...history.slice(-2).map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.content,
        })),
        { role: 'user', content: lastMessage },
    ]

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Fast and smart
            messages: messages as any,
            response_format: { type: 'json_object' },
            temperature: 0, // Deterministic
        })

        const content = response.choices[0].message.content || '{}'
        return JSON.parse(content) as AgentDecision
    } catch (error) {
        console.error('Agent Brain Error:', error)
        // Fallback to basic search
        return {
            intent: 'SEARCH_PACKAGES',
            reasoning: 'Fallback due to error',
            searchQuery: lastMessage,
            filters: {},
        }
    }
}
