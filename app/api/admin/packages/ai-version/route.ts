/**
 * POST /api/admin/packages/ai-version — one new version of a Main package (not saved). Admins only.
 * Body: { mainId, nights, stars 3|4|5, occasion, season }   Reply: AiVersionResult (lib/packages/aiVersion.ts)
 */
import { authErrorResponse, requireStaff } from '@/lib/admin/serverAuth'
import { AiCreateError } from '@/lib/packages/aiCreate'
import { createVersion, validateSpec } from '@/lib/packages/aiVersion'
import { PlannerAIError } from '@/lib/planner/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function POST(request: Request) {
  try {
    const staff = await requireStaff(request, ['packages'])
    if (!staff.isAdmin) return Response.json({ error: 'Only admins can create versions.' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const mainId = String(body?.mainId || '').slice(0, 64)
    if (!mainId) return Response.json({ error: 'Missing main package.' }, { status: 400 })
    return Response.json(await createVersion(mainId, validateSpec(body)))
  } catch (err) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    if (err instanceof AiCreateError) return Response.json({ error: err.message }, { status: err.status })
    if (err instanceof PlannerAIError) return Response.json({ error: 'The AI is busy right now — please try again in a minute.' }, { status: 503 })
    console.error('[ai-version]', err)
    return Response.json({ error: 'Could not create the version. Please try again.' }, { status: 500 })
  }
}
