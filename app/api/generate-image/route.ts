import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  try {
    const { imageBase64, userPrompt } = await request.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }
    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    // Detect media type from original string
    const mediaTypeMatch = imageBase64.match(/^data:(image\/[a-z]+);base64,/)
    const mediaType = (mediaTypeMatch?.[1] ?? 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp'

    // ── Step 1: Claude analyzes image → creative prompt ──────────────────
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `You are a creative image prompt writer for DALL-E 3.
The user uploaded this image and wants: "${userPrompt}"

Write a single, vivid, detailed DALL-E 3 image generation prompt (max 250 words) that:
- Describes the scene with rich creative language and mood
- Incorporates the user's request naturally
- Focuses on emotion, color palette, and atmosphere
- Does NOT include any explanation — only the prompt itself`,
            },
          ],
        },
      ],
    })

    const claudePrompt =
      claudeResponse.content[0].type === 'text'
        ? claudeResponse.content[0].text.trim()
        : userPrompt

    // ── Step 2: GPT-4o analyzes image → technical/precise prompt ─────────
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `You are a precise image prompt writer for DALL-E 3.
Write a single DALL-E 3 generation prompt (max 250 words) that is photorealistic and technically accurate.
Focus on: lighting, composition, camera angle, fine details, and realism.
Do NOT include any explanation — only the prompt itself.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `The user uploaded this image and wants: "${userPrompt}". Write the DALL-E 3 prompt.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mediaType};base64,${base64Data}` },
            },
          ],
        },
      ],
    })

    const gptPrompt = gptResponse.choices[0]?.message?.content?.trim() ?? userPrompt

    // ── Step 3: Generate two images with DALL-E 3 in parallel ─────────────
    const [image1Result, image2Result] = await Promise.allSettled([
      openai.images.generate({
        model: 'dall-e-3',
        prompt: claudePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
      openai.images.generate({
        model: 'dall-e-3',
        prompt: gptPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    ])

    const image1Url =
      image1Result.status === 'fulfilled'
        ? image1Result.value.data[0]?.url ?? null
        : null

    const image2Url =
      image2Result.status === 'fulfilled'
        ? image2Result.value.data[0]?.url ?? null
        : null

    if (!image1Url && !image2Url) {
      return NextResponse.json({ error: 'Image generation failed for both results' }, { status: 500 })
    }

    return NextResponse.json({
      image1: { url: image1Url, prompt: claudePrompt, label: 'Creative (Claude)' },
      image2: { url: image2Url, prompt: gptPrompt, label: 'Realistic (GPT-4o)' },
    })
  } catch (error: any) {
    console.error('[generate-image] error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to generate images' }, { status: 500 })
  }
}
