/**
 * POST /api/admin/packages/ai-complete — staff filled the main fields; AI writes the rest (not saved).
 * Body: { draft, destinationId?, overwrite? }   Reply: AiCompleteResult (lib/packages/aiComplete.ts)
 */
import { authErrorResponse, requireStaff } from '@/lib/admin/serverAuth'
import { AiCreateError } from '@/lib/packages/aiCreate'
import { completePackage } from '@/lib/packages/aiComplete'
import { PlannerAIError } from '@/lib/planner/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function POST(request: Request) {
  try {
    await requireStaff(request, ['packages'])
    const body = await request.json().catch(() => ({}))
    if (!body?.draft || typeof body.draft !== 'object') return Response.json({ error: 'Missing package.' }, { status: 400 })
    const result = await completePackage({
      draft: body.draft,
      destinationId: String(body.destinationId || '').slice(0, 64) || undefined,
      overwrite: !!body.overwrite,
    })
    return Response.json(result)
  } catch (err) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    if (err instanceof AiCreateError) return Response.json({ error: err.message }, { status: err.status })
    if (err instanceof PlannerAIError) return Response.json({ error: 'The AI is busy right now — please try again in a minute.' }, { status: 503 })
    console.error('[ai-complete]', err)
    return Response.json({ error: 'Could not fill the package. Please try again.' }, { status: 500 })
  }
}
