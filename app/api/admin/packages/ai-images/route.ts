/**
 * POST /api/admin/packages/ai-images — create photos for a package with AI and upload them to ImageKit.
 * Body: { package: { Destination_Name, Slug, Overview, Location_Breakup, Day_Wise_Itinerary_Details, … }, count 1–4, style?, quality? }
 * Reply: { images: [{ url, prompt, alt, scene, ms }], failed: [{ scene, error }], folder }
 */
import { authErrorResponse, requireStaff } from '@/lib/admin/serverAuth'
import { AiImagesError, cleanPackageInput, generatePackageImages } from '@/lib/packages/aiImages'
import { PlannerAIError } from '@/lib/planner/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function POST(request: Request) {
  try {
    await requireStaff(request, ['packages'])
    const body = await request.json().catch(() => ({}))
    const result = await generatePackageImages(cleanPackageInput(body?.package), {
      count: Number(body?.count) || 1,
      style: typeof body?.style === 'string' ? body.style : undefined,
      quality: body?.quality === 'medium' || body?.quality === 'high' ? body.quality : undefined,
    })
    return Response.json(result)
  } catch (err) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    if (err instanceof AiImagesError) return Response.json({ error: err.message }, { status: err.status })
    if (err instanceof PlannerAIError) return Response.json({ error: 'The AI is busy right now — please try again in a minute.' }, { status: 503 })
    console.error('[ai-images]', err)
    return Response.json({ error: 'Could not create images. Please try again.' }, { status: 500 })
  }
}
