import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const LANGUAGE_NAMES: Record<string, string> = {
  'en-IN': 'English',
  'hi-IN': 'Hindi (हिंदी)',
  'bn-IN': 'Bengali (বাংলা)',
  'ta-IN': 'Tamil (தமிழ்)',
  'te-IN': 'Telugu (తెలుగు)',
  'mr-IN': 'Marathi (मराठी)',
  'kn-IN': 'Kannada (ಕನ್ನಡ)',
  'ml-IN': 'Malayalam (മലയാളം)',
  'gu-IN': 'Gujarati (ગુજરાતી)',
  'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
  'ur-IN': 'Urdu (اردو)',
  'or-IN': 'Odia (ଓଡ଼ିଆ)',
}

export async function POST(request: Request) {
  if (!anthropic) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  try {
    const { message, language = 'en-IN', packageDetails, conversation = [] } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const langName = LANGUAGE_NAMES[language] || 'English'
    const langCode = language.split('-')[0]

    let systemPrompt = `You are a knowledgeable and friendly travel assistant for Travelzada, a travel platform based in India. You help travel agents understand travel packages and answer questions about them.

CRITICAL LANGUAGE RULE: You MUST respond ONLY in ${langName}. No matter what language the user writes in, always reply in ${langName}.
- If the language is Hindi, write in Devanagari script (हिंदी).
- If the language is Bengali, write in Bengali script.
- If the language is Tamil, write in Tamil script.
- If the language is Telugu, write in Telugu script.
- If the language is Marathi, write in Devanagari script.
- If the language is Kannada, write in Kannada script.
- If the language is Malayalam, write in Malayalam script.
- If the language is Gujarati, write in Gujarati script.
- If the language is Punjabi, write in Gurmukhi script.
- If the language is Urdu, write in Urdu/Nastaliq script.
- If the language is Odia, write in Odia script.
- If the language is English, write in clear Indian English.

Your tone should be warm, professional, and helpful. Keep responses concise (under 150 words). You help travel agents learn about packages so they can sell them to customers.`

    if (packageDetails) {
      systemPrompt += `\n\n=== SELECTED PACKAGE ===
Title: ${packageDetails.title}
Destination: ${packageDetails.destination}
Duration: ${packageDetails.durationNights} nights / ${packageDetails.durationDays} days
Price: ₹${packageDetails.pricePerPerson?.toLocaleString('en-IN')} per person
Travel Type: ${packageDetails.travelType}
Star Category: ${packageDetails.starCategory}${packageDetails.overview ? `\nOverview: ${packageDetails.overview}` : ''}

Focus your answers on this specific package. Help the agent understand highlights, selling points, ideal customer profile, and how to pitch this package to clients.`
    } else {
      systemPrompt += `\n\nNo specific package is selected yet. Give general travel advice, answer questions about Travelzada's services, or help the agent with sales tips.`
    }

    const history = Array.isArray(conversation)
      ? conversation.slice(-20).map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content as string,
        }))
      : []

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
    })

    const textContent = response.content.find((b: any) => b.type === 'text') as any
    const reply = textContent?.text ?? 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply, langCode })
  } catch (error: any) {
    console.error('AI Assistant error:', error)
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
}
