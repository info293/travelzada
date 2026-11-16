export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getGetGabsTemplate, isGetGabsConfigured, listGetGabsTemplates, GetGabsApiError } from '@/lib/getgabs'
import { jsonError, staffOr } from '../_lib/server'

/**
 * GET /api/whatsapp/broadcasts/templates   (staff: admin, "whatsapp" or "leads")
 *   → { templates: [{ name, language, category, templateId }] }   approved (submitted) GetGabs templates that may
 *     be broadcast: MARKETING and UTILITY only (never AUTHENTICATION).
 *   ?name=tz_x → { template: GetGabsTemplateSummary }   the variables GetGabs expects for that template
 */
export async function GET(req: NextRequest) {
  const user = await staffOr(req)
  if (user instanceof Response) return user
  if (!isGetGabsConfigured()) return jsonError(503, 'WhatsApp (GetGabs) is not configured on this deployment.')

  const name = req.nextUrl.searchParams.get('name')
  try {
    if (name) {
      if (!/^[a-z0-9_]{1,512}$/i.test(name)) return jsonError(400, 'Invalid template name.')
      const template = await getGetGabsTemplate(name, req.nextUrl.searchParams.get('language') || undefined)
      if (!template) return jsonError(404, `Template "${name}" was not found in GetGabs.`)
      return NextResponse.json({ template })
    }
    const templates = (await listGetGabsTemplates({ fresh: req.nextUrl.searchParams.get('fresh') === '1' })).filter(
      (t) => t.category === 'MARKETING' || t.category === 'UTILITY'
    )
    return NextResponse.json({ templates })
  } catch (err: any) {
    console.error('[Broadcast templates] failed:', err)
    return jsonError(502, `Could not load templates from GetGabs (${err?.message || 'error'}).`, err instanceof GetGabsApiError && err.hint ? { hint: err.hint } : {})
  }
}
