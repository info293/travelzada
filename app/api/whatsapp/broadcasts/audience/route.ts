export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { cleanFilters, describeAudience, isListSegment, isSegmentId, MAX_BROADCAST_RECIPIENTS } from '@/lib/whatsapp/broadcasts'
import { AudienceError, jsonError, loadAudience, loadUploadAudience, staffOr, type AudienceResult } from '../_lib/server'
import { dailyCapInfo } from '../_lib/lists'

/**
 * POST /api/whatsapp/broadcasts/audience   (staff: admin, "whatsapp" or "leads")
 * { segment, filters, contacts?, columns?, fileName? }     contacts/columns: segment "upload" only (parsed sheet rows)
 * → {
 *   count, found, skipped: { noNumber, invalid, duplicates, optedOut }, description, max, overLimit,
 *   people: [{ key, name, destination?, phone? }]   // phone ONLY for admins; key = source record path (admins)
 *   // uploaded lists only:
 *   list?: { id, name, fileName, columns, alreadyMessaged, createdAt }, columns?: [{ key, label }],
 *   optedOutRows?: number[], invalidRows?: number[]  // indexes into the request's `contacts` (no numbers)
 *   dailyCap?: { cap, usedToday, left, newInAudience }
 * }
 */
export async function POST(req: NextRequest) {
  const user = await staffOr(req)
  if (user instanceof Response) return user

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON body.')
  }
  if (!isSegmentId(body?.segment)) return jsonError(400, 'Pick who should get the message.')
  const filters = cleanFilters(body?.filters)
  const segment = body.segment

  try {
    let audience: AudienceResult
    let description = describeAudience(segment, filters)
    let columns = undefined as undefined | { key: string; label: string }[]
    if (segment === 'upload') {
      const up = await loadUploadAudience(body?.contacts, body?.columns)
      audience = up
      columns = up.columns
      description = `Uploaded list${body?.fileName ? ` “${String(body.fileName).slice(0, 80)}”` : ''}`
    } else {
      audience = await loadAudience(segment, filters)
      if (audience.list) {
        columns = audience.list.columns
        description = `Uploaded list “${audience.list.name}”${filters.notSentOnly ? ' · only people not messaged from it yet' : ''}`
      }
    }
    const { members, skipped, found } = audience
    const cap = isListSegment(segment) && members.length && members.length <= MAX_BROADCAST_RECIPIENTS ? await dailyCapInfo(members.map((m) => m.phone)) : null
    return NextResponse.json({
      count: members.length,
      found,
      skipped,
      description,
      max: MAX_BROADCAST_RECIPIENTS,
      overLimit: members.length > MAX_BROADCAST_RECIPIENTS,
      people: members.slice(0, 3000).map((m, i) => ({
        // whatsapp_chats ids ARE phone numbers, so staff get an opaque key (only admins can remove people anyway)
        key: user.isAdmin ? audience.keys?.[i] || m.refPath : `p${i}`,
        name: m.name,
        ...(m.destination ? { destination: m.destination } : {}),
        ...(m.package ? { package: m.package } : {}),
        ...(m.travelDate ? { travelDate: m.travelDate } : {}),
        ...(m.extra ? { extra: m.extra } : {}),
        ...(user.isAdmin ? { phone: m.phone } : {}),
      })),
      ...(audience.list ? { list: audience.list } : {}),
      ...(columns ? { columns } : {}),
      ...(audience.optedOutIndex ? { optedOutRows: audience.optedOutIndex } : {}),
      ...(audience.invalidIndex ? { invalidRows: audience.invalidIndex } : {}),
      ...(cap ? { dailyCap: { cap: cap.cap, usedToday: cap.usedToday, left: cap.left, newInAudience: cap.newInAudience } } : {}),
    })
  } catch (err: any) {
    if (err instanceof AudienceError) return jsonError(400, err.message)
    console.error('[Broadcast audience] failed:', err)
    return jsonError(500, `Could not load this audience (${err?.message || 'error'}).`)
  }
}
