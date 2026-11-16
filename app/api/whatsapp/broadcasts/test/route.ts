export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { businessNumberFor, getGabsMessageId, sendGetGabsTemplate, GetGabsApiError } from '@/lib/getgabs'
import { COLUMN_KEY_RE, broadcastPhone, cleanMappings, fillComponents, fillTokens, mappingFallbacks, type RecipientFields } from '@/lib/whatsapp/broadcasts'
import { checkTemplate, jsonError, recordSentMessage, staffOr } from '../_lib/server'

/**
 * POST /api/whatsapp/broadcasts/test   (ADMINS only)
 * Sends ONE copy of a draft broadcast to a number the admin types (their own phone) — never to customers.
 * { to, templateName, language?, componentsTemplate, previewTemplate, variables, sample?: { name, destination, package, travelDate } }
 * Recorded in the inbox like any other send (flag `broadcastTest`). → { success, whatsappMessageId }
 */
export async function POST(req: NextRequest) {
  const user = await staffOr(req)
  if (user instanceof Response) return user
  if (!user.isAdmin) return jsonError(403, 'Only admins can send a test message.')

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON body.')
  }
  const to = broadcastPhone(body?.to)
  if (!to) return jsonError(400, 'Type your own WhatsApp number (10 digits, or with country code).')

  const componentsTemplate = Array.isArray(body?.componentsTemplate) ? body.componentsTemplate : []
  const check = await checkTemplate(String(body?.templateName || ''), body?.language ? String(body.language) : undefined, componentsTemplate)
  if (!check.ok) return jsonError(check.status, check.error, check.hint ? { hint: check.hint } : {})

  const s = body?.sample && typeof body.sample === 'object' ? body.sample : {}
  const sample: RecipientFields = {
    name: String(s.name || 'Test').slice(0, 80),
    destination: s.destination ? String(s.destination).slice(0, 80) : undefined,
    package: s.package ? String(s.package).slice(0, 120) : undefined,
    travelDate: s.travelDate ? String(s.travelDate).slice(0, 40) : undefined,
  }
  // Uploaded lists: extra sheet columns of the sample person (for {{tzc:column}} variables)
  if (s.extra && typeof s.extra === 'object' && !Array.isArray(s.extra)) {
    const extra: Record<string, string> = {}
    for (const [k, v] of Object.entries(s.extra as Record<string, unknown>).slice(0, 15)) if (COLUMN_KEY_RE.test(k)) extra[k] = String(v ?? '').slice(0, 200)
    sample.extra = extra
  }
  const fallbacks = mappingFallbacks(cleanMappings(body?.variables))
  const components = fillComponents(componentsTemplate, sample, fallbacks)
  const text = `[Test] ${fillTokens(String(body?.previewTemplate || `[Template: ${check.row.name}]`), sample, fallbacks)}`.slice(0, 4096)

  try {
    const res = await sendGetGabsTemplate(to, check.row.name, components, check.row.language)
    const whatsappMessageId = getGabsMessageId(res) || `outbound_${Date.now()}`
    await recordSentMessage({
      phone: to,
      whatsappMessageId,
      text,
      templateName: check.row.name,
      languageCode: check.row.language,
      components,
      businessNumber: businessNumberFor('getgabs'),
      broadcastId: null,
      test: true,
    }).catch((e) => console.error('[Broadcast test] could not record message:', e))
    return NextResponse.json({ success: true, whatsappMessageId })
  } catch (err: any) {
    const gg = err instanceof GetGabsApiError ? err : undefined
    return jsonError(gg?.kind === 'rate_limit' ? 429 : 502, err?.message || 'The test message failed.', { hint: gg?.hint, errorKind: gg?.kind })
  }
}
