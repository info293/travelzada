/**
 * POST /api/admin/seo/optimize — AI rewrite of one package page for SEO & GEO (nothing is saved).
 * Body: { packageId?: string, package?: Record<string, any> }  (package = current draft; if omitted, loaded by id)
 * Reply: OptimizeResult (lib/seo/types.ts) — { patch, audit_before, audit_after_estimate, similarity_before,
 *        similarity_after, warnings, notes, attempts, ms }
 */
import { authErrorResponse, requireStaff } from '@/lib/admin/serverAuth'
import { PlannerAIError } from '@/lib/planner/ai'
import { loadAllPackages, optimizePackage } from '@/lib/seo/optimizer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    await requireStaff(request, ['packages'])
    const body = await request.json().catch(() => ({}))
    const packageId = typeof body?.packageId === 'string' && body.packageId.trim() ? body.packageId.trim() : undefined
    const all = await loadAllPackages()
    let pkg = body?.package && typeof body.package === 'object' && !Array.isArray(body.package) ? (body.package as Record<string, any>) : null
    if (!pkg && packageId) pkg = all.find((p) => p.id === packageId) || null
    if (!pkg) return Response.json({ error: 'Package not found.' }, { status: 404 })
    if (!String(pkg.Destination_Name || '').trim()) return Response.json({ error: 'Give the package a name first.' }, { status: 400 })

    const result = await optimizePackage({ pkg, packageId, allPackages: all })
    if (!Object.keys(result.patch).length) return Response.json({ error: 'The AI did not return usable text. Please try again.' }, { status: 502 })
    return Response.json(result)
  } catch (err) {
    const auth = authErrorResponse(err)
    if (auth) return auth
    if (err instanceof PlannerAIError) return Response.json({ error: 'The AI is busy right now — please try again in a minute.' }, { status: 503 })
    console.error('[seo-optimize]', err)
    return Response.json({ error: 'Could not optimise this package. Please try again.' }, { status: 500 })
  }
}
