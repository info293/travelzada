import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY' },
      { status: 500 }
    )
  }

  try {
    const { prompt, conversation = [] } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const history = Array.isArray(conversation)
      ? conversation
          .filter(
            (msg: any) =>
              msg?.role &&
              typeof msg.role === 'string' &&
              msg?.content &&
              typeof msg.content === 'string'
          )
          .map((msg: any) => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          }))
      : []

    console.log('\n[AI Planner] Incoming prompt:', prompt)
    if (history.length) {
      console.log('[AI Planner] Conversation tail:', history)
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content:
            'You are Travelzada, a warm and concise AI trip planner. Keep responses under 120 words, ask one question at a time, and use Indian English nuances when helpful.',
        },
        ...history,
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const message =
      completion.choices[0]?.message?.content ??
      'I am here to help you plan your trip!'

    console.log('[AI Planner] Response:', message)

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Chat API error', error)
    return NextResponse.json(
      { error: 'Failed to contact ChatGPT' },
      { status: 500 }
    )
  }
}

