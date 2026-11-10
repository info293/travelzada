export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { listApprovedWhatsAppTemplates, WhatsAppApiError, FALLBACK_WHATSAPP_TEMPLATES } from '@/lib/whatsapp'
import { whatsappErrorHint } from '@/lib/whatsappDiagnostics'
import { requireLeadsAccess } from '@/lib/metaServer'
import { inboxProvider, listGetGabsTemplates, getGetGabsTemplate, GetGabsApiError } from '@/lib/getgabs'

/**
 * GET /api/whatsapp/templates  (staff only)
 * Approved WhatsApp message templates, used to start / resume a chat outside the 24-hour window.
 *
 * Provider "getgabs" (default):
 *   GET                       → { provider: 'getgabs', templates: [{ name, language, category, templateId }] }
 *                               (AUTHENTICATION templates hidden; only templates submitted to Meta)
 *   GET ?name=tz_quote_sent   → { provider: 'getgabs', template: GetGabsTemplateSummary } — its variables, from
 *                               GetGabs' payload skeleton (header link, body params with sample values, URL buttons)
 * Provider "meta": Meta's approved templates (needs WHATSAPP_BUSINESS_ACCOUNT_ID; else the built-in sample).
 */
export async function GET(req: NextRequest) {
  const authError = await requireLeadsAccess(req)
  if (authError) return authError

  if (inboxProvider() === 'getgabs') {
    const name = req.nextUrl.searchParams.get('name')
    const language = req.nextUrl.searchParams.get('language') || undefined
    try {
      if (name) {
        if (!/^[a-z0-9_]{1,512}$/i.test(name)) return NextResponse.json({ error: 'Invalid template name.' }, { status: 400 })
        const template = await getGetGabsTemplate(name, language)
        if (!template) return NextResponse.json({ error: `Template "${name}" was not found in GetGabs.` }, { status: 404 })
        return NextResponse.json({ provider: 'getgabs', template })
      }
      const templates = (await listGetGabsTemplates()).filter((t) => t.category !== 'AUTHENTICATION')
      return NextResponse.json({ provider: 'getgabs', source: 'getgabs', templates })
    } catch (err: any) {
      console.error('[WhatsApp Templates] GetGabs failed:', err)
      const hint = err instanceof GetGabsApiError ? err.hint : undefined
      return NextResponse.json(
        { provider: 'getgabs', error: `Could not load templates from GetGabs (${err?.message || 'unknown error'}).`, hint },
        { status: 502 }
      )
    }
  }

  try {
    return NextResponse.json({ provider: 'meta', ...(await listApprovedWhatsAppTemplates()) })
  } catch (err: any) {
    console.error('[WhatsApp Templates] list failed:', err)
    const meta = err instanceof WhatsAppApiError ? err.meta : undefined
    // Still return the fallback so staff can at least send the sample template
    return NextResponse.json({
      provider: 'meta',
      templates: FALLBACK_WHATSAPP_TEMPLATES,
      source: 'fallback',
      note: `Could not load templates from Meta (${err?.message || 'unknown error'}).${
        whatsappErrorHint(meta?.code, meta?.error_subcode) ? ' ' + whatsappErrorHint(meta?.code, meta?.error_subcode) : ''
      } Showing the built-in sample template only.`,
    })
  }
}
