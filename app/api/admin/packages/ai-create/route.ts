/**
 * POST /api/admin/packages/ai-create — design a new, unique package draft for a destination (not saved).
 * Body: { destinationId?, destinationName?, nights 3–9, occasion, stars 3|4|5, targetPrice?, angle? }
 * Reply: AiCreateResult (lib/packages/aiCreate.ts)
 */
import { authErrorResponse, requireStaff } from '@/lib/admin/serverAuth'
import { AiCreateError, createPackageDraft, validateInput } from '@/lib/packages/aiCreate'
import { PlannerAIError } from '@/lib/planner/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function POST(request: Request) {
  try {
    await requireStaff(request, ['packages'])
    const input = validateInput(await request.json().catch(() => ({})))
    const result = await createPackageDraft(input)
    return Response.json(result)
  } catch (err) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    if (err instanceof AiCreateError) return Response.json({ error: err.message }, { status: err.status })
    if (err instanceof PlannerAIError) return Response.json({ error: 'The AI is busy right now — please try again in a minute.' }, { status: 503 })
    console.error('[ai-create]', err)
    return Response.json({ error: 'Could not create the package. Please try again.' }, { status: 500 })
  }
}
