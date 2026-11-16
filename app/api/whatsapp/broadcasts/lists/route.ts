export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { jsonError, staffOr } from '../_lib/server'
import { listContactLists } from '../_lib/lists'

/**
 * GET /api/whatsapp/broadcasts/lists   (staff: admin, "whatsapp" or "leads")
 * Uploaded contact lists, newest first → { lists: [{ id, name, fileName, createdAt, uploadedBy, count, messaged, columns, lastUsedAt }] }
 * No phone numbers.
 */
export async function GET(req: NextRequest) {
  const user = await staffOr(req)
  if (user instanceof Response) return user
  try {
    return NextResponse.json({ lists: await listContactLists() })
  } catch (err: any) {
    console.error('[Broadcast lists] failed:', err)
    return jsonError(500, `Could not load your uploaded lists (${err?.message || 'error'}).`)
  }
}
