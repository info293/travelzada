export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireLeadsAccess } from '@/lib/metaServer'
import { runWhatsAppDiagnostics } from '@/lib/whatsappDiagnostics'

/**
 * GET /api/whatsapp/diagnostics
 * For logged-in staff: checks the WhatsApp token and phone number this deployment is running with.
 */
export async function GET(req: NextRequest) {
  const authError = await requireLeadsAccess(req)
  if (authError) return authError
  try {
    return NextResponse.json(await runWhatsAppDiagnostics())
  } catch (err: any) {
    return NextResponse.json({ ok: false, problems: [err.message || 'Diagnostics failed'] }, { status: 500 })
  }
}
