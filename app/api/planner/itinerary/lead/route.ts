/**
 * POST /api/planner/itinerary/lead — "Get my matched quote" after comparing an uploaded itinerary.
 *
 * JSON body:
 *   { activityId, sessionId?, name, phone, email?, travelDate?, travellers?, note?,
 *     additions: [{ id, item, kind, day, status, ourOffer }], bestPackageId?,
 *     context?: { extraction, comparison, bestPackage, fileUrl }   // what the page was shown (fallback only)
 *     company_website (honeypot), startedAt (ms) }
 *
 * Saves to `leads` (source "Itinerary Upload") with a rich `planner` object, and links the planner activity.
 * The extraction / comparison are read from the logged `planner_activity` doc when possible; the page's copy is
 * only a fallback (e.g. if the activity could not be logged or read).
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { clientIp, normalisePhone, savePlannerLead } from '@/lib/planner/records'
import { HONEYPOT_FIELD, isRateLimited, isSpamLead } from '@/lib/spamGuard'
import { formatPrice, type Addition, type ItineraryComparison, type ItineraryExtraction, type PackageLite } from '@/lib/planner/itinerary'

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const STATUS_WORD: Record<string, string> = { not_included: 'not in our package', similar: 'we have something similar', included: 'already included' }

export async function POST(req: Request) {
  const ip = clientIp(req)
  let body: any
  try {
    body = await req.json()
  } catch {
    return fail('Please fill in your details.')
  }

  const name = str(body.name, 80)
  const phoneRaw = str(body.phone, 30)
  const email = str(body.email, 120)
  const travelDate = str(body.travelDate, 40)
  const note = str(body.note, 1000)
  const activityId = str(body.activityId, 60) || null
  const startedAt = Number(body.startedAt)
  const elapsedMs = Number.isFinite(startedAt) && startedAt > 0 ? Date.now() - startedAt : undefined

  if (!name) return fail('Please tell us your name.')
  const phone = normalisePhone(phoneRaw)
  if (!phone) return fail('Please enter a valid mobile number (10 digits, or with country code).')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('That email doesn’t look right — you can leave it empty.')

  if (isRateLimited(`itinerary-lead:${ip}`, 5, 10 * 60 * 1000)) return fail('Too many requests. Please try again in a few minutes.', 429)

  // ---- Context: prefer the server-side activity log, fall back to what the page sent ------------------------------
  let extraction: ItineraryExtraction | null = null
  let comparison: ItineraryComparison | null = null
  let fileUrl: string | null = null
  let fileName: string | null = null
  if (activityId) {
    try {
      const snap = await getDoc(doc(db, 'planner_activity', activityId))
      if (snap.exists()) {
        const a = snap.data() as any
        extraction = a.details?.extraction || null
        comparison = a.details?.comparison || null
        fileUrl = a.fileUrl || null
        fileName = a.fileName || null
      }
    } catch {
      /* rules may not allow public reads — use the page's copy */
    }
  }
  const rawCtx = body.context && typeof body.context === 'object' ? body.context : {}
  const ctx = JSON.stringify(rawCtx).length < 150_000 ? rawCtx : {} // Firestore docs max out at 1 MB
  if (!extraction && ctx.extraction && typeof ctx.extraction === 'object') extraction = ctx.extraction
  if (!comparison && ctx.comparison && typeof ctx.comparison === 'object') comparison = ctx.comparison
  if (!fileUrl && typeof ctx.fileUrl === 'string' && /^https:\/\/ik\.imagekit\.io\//.test(ctx.fileUrl)) fileUrl = ctx.fileUrl
  const bestPackage: PackageLite | null = ctx.bestPackage && typeof ctx.bestPackage === 'object' ? ctx.bestPackage : null

  const destination = (extraction?.destinations || []).slice(0, 4).join(', ') || extraction?.country || bestPackage?.destination || ''

  const honeypot = str(body[HONEYPOT_FIELD], 200)
  if (isSpamLead({ name, destination, message: note, honeypot, elapsedMs })) {
    // Pretend success so bots don't learn; nothing is saved
    return NextResponse.json({ ok: true, leadId: null })
  }

  // ---- Additions --------------------------------------------------------------------------------------------------
  const additions: Addition[] = (Array.isArray(body.additions) ? body.additions : [])
    .slice(0, 60)
    .map((a: any) => ({
      id: str(a?.id, 20),
      item: str(a?.item, 200),
      kind: ['day', 'hotel', 'inclusion', 'flight', 'visa'].includes(a?.kind) ? a.kind : 'day',
      day: Number.isFinite(Number(a?.day)) && Number(a.day) > 0 ? Number(a.day) : null,
      status: ['not_included', 'similar', 'included'].includes(a?.status) ? a.status : 'not_included',
      ourOffer: str(a?.ourOffer, 200) || null,
    }))
    .filter((a: Addition) => a.item)

  const competitorPrice = extraction?.price ? formatPrice(extraction.price) || null : null
  const travellers = Number(body.travellers) > 0 ? Math.min(20, Number(body.travellers)) : extraction?.adults ? extraction.adults + (extraction.children || 0) : undefined

  const noteLines: string[] = []
  if (additions.length) {
    noteLines.push(`Wants these added to the trip (${additions.length}):`)
    additions.forEach((a) => noteLines.push(`• ${a.day ? `Day ${a.day}: ` : ''}${a.item} — ${STATUS_WORD[a.status]}${a.status === 'similar' && a.ourOffer ? ` (we offer: ${a.ourOffer})` : ''}`))
  } else {
    noteLines.push('No extra items picked — wants a quote for the matched trip.')
  }
  if (competitorPrice) noteLines.push(`Their quote: ${competitorPrice}${extraction?.agency ? ` from ${extraction.agency}` : ''}`)
  if (bestPackage?.name) noteLines.push(`Our best match: ${bestPackage.name}${comparison?.matchPercent ? ` (${comparison.matchPercent}% match)` : ''}`)
  if (fileUrl) noteLines.push(`Their file: ${fileUrl}`)
  if (note) noteLines.push(`Customer note: ${note}`)

  try {
    const leadId = await savePlannerLead({
      name,
      phone,
      email,
      destination,
      travelDate: travelDate || extraction?.startDate || extraction?.travelDatesText || '',
      travellers,
      source: 'Itinerary Upload',
      packageName: bestPackage?.name || '',
      sourceUrl: bestPackage?.url || '',
      notes: noteLines.join('\n'),
      planner: {
        kind: 'itinerary_upload',
        extraction,
        comparison: comparison
          ? {
              status: comparison.status,
              matchPercent: comparison.matchPercent,
              summary: comparison.summary,
              highlights: comparison.highlights,
              counts: countStatuses(comparison),
            }
          : null,
        additions,
        bestPackage,
        bestPackageId: str(body.bestPackageId, 60) || bestPackage?.id || null,
        competitorPrice,
        agency: extraction?.agency || null,
        fileUrl,
        fileName,
        activityId,
        customerNote: note || null,
        sessionId: str(body.sessionId, 80) || null,
      },
      activityId,
    })
    return NextResponse.json({ ok: true, leadId })
  } catch (err) {
    console.error('[itinerary-lead] save failed', err)
    return fail('We could not save your request. Please WhatsApp us on +91 99299 62350.', 500)
  }
}

function countStatuses(c: ItineraryComparison) {
  const out = { included: 0, similar: 0, not_included: 0 }
  for (const i of c.items || []) if (i.status in out) out[i.status as keyof typeof out]++
  return out
}
