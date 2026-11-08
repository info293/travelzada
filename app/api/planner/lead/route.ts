/**
 * POST /api/planner/lead — "Get this plan on WhatsApp" from the AI Planner (smart search + wizard results).
 *
 * Body: { name, phone, email?, travelDate?, packageId?, packageName?, prefs?, query?, activityId?, sessionId?,
 *         shownMatches?: [{id,name,score}], source: 'AI Planner' | 'AI Planner – Smart search' | 'AI Planner – Game', honeypot?, startedAt? }
 * Reply: { ok: true, leadId } | { error } (400 invalid / 429 too many)
 */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { loadCatalog } from '@/lib/planner/catalog'
import { clientIp, normalisePhone, savePlannerLead } from '@/lib/planner/records'
import { isRateLimited, isSpamLead } from '@/lib/spamGuard'
import { buildLeadNotificationEmail, sendMail } from '@/lib/mailer'
import { sanitisePrefs, understoodLine } from '../../tailored-travel/_lib/plannerServer'

const SOURCES = ['AI Planner', 'AI Planner – Smart search', 'AI Planner – Game'] as const

const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max)

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const ip = clientIp(req)
  const name = str(body?.name, 80)
  const packageName = str(body?.packageName, 160)
  const startedAt = Number(body?.startedAt)
  const elapsedMs = Number.isFinite(startedAt) && startedAt > 0 ? Date.now() - startedAt : undefined

  if (isSpamLead({ name, packageName, honeypot: body?.honeypot, elapsedMs })) {
    console.warn('[planner-lead] blocked suspected spam', { ip, name })
    return NextResponse.json({ ok: true, leadId: null }) // pretend success so bots don't adapt
  }
  if (isRateLimited(`planner-lead:${ip}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'You have sent a few requests already — our team will call you shortly.' }, { status: 429 })
  }
  if (name.length < 2) return NextResponse.json({ error: 'Please tell us your name.' }, { status: 400 })
  const phone = normalisePhone(str(body?.phone, 30))
  if (!phone) return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 })

  const prefs = sanitisePrefs(body?.prefs)
  const source = (SOURCES as readonly string[]).includes(body?.source) ? body.source : 'AI Planner'
  const query = str(body?.query, 500)
  const travelDate = str(body?.travelDate, 40)
  const email = str(body?.email, 120)
  const activityId = body?.activityId ? str(body.activityId, 80) : null
  const sourceUrl = str(req.headers.get('referer'), 300)

  // Trust the catalog, not the browser, for package details
  let selectedPackage: Record<string, unknown> | null = null
  if (body?.packageId) {
    try {
      const { packages } = await loadCatalog()
      const p = packages.find((x) => x.id === String(body.packageId))
      if (p) {
        selectedPackage = { id: p.id, code: p.code, name: p.name, destination: p.destination, nights: p.nights, pricePerPerson: p.pricePerPerson, starLabel: p.starLabel, url: p.url }
      }
    } catch {
      /* catalog unavailable — keep what the browser sent */
    }
  }
  const finalPackageName = (selectedPackage?.name as string) || packageName || 'AI Planner enquiry'

  const shownMatches = Array.isArray(body?.shownMatches)
    ? body.shownMatches.slice(0, 12).map((m: any) => ({ id: str(m?.id, 80), name: str(m?.name, 160), score: Number(m?.score) || 0 }))
    : []

  const summary = understoodLine(prefs)
  const notes = [query ? `Asked: "${query}"` : '', summary ? `Looking for: ${summary}` : ''].filter(Boolean).join('\n')

  try {
    const leadId = await savePlannerLead({
      name,
      phone,
      email: email || undefined,
      destination: (selectedPackage?.destination as string) || prefs.destinations?.join(', ') || '',
      travelDate: travelDate || undefined,
      travellers: prefs.adults || undefined,
      budget: prefs.budgetPerPerson ? `Up to ₹${prefs.budgetPerPerson.toLocaleString('en-IN')} per person` : undefined,
      source,
      packageName: finalPackageName,
      sourceUrl,
      notes,
      planner: {
        prefs,
        query: query || null,
        selectedPackage: selectedPackage || (packageName ? { name: packageName } : null),
        shownMatches,
        sessionId: body?.sessionId ? str(body.sessionId, 80) : null,
      },
      activityId,
    })

    // Notify the team the same way other website leads do (best effort, bounded)
    try {
      const mail = buildLeadNotificationEmail({
        name,
        mobile: phone,
        packageName: finalPackageName,
        sourceUrl,
        email: email || undefined,
        message: [source, notes, travelDate ? `Travel date: ${travelDate}` : ''].filter(Boolean).join('\n'),
      })
      await Promise.race([sendMail(mail), new Promise((r) => setTimeout(r, 8000))])
    } catch (err) {
      console.warn('[planner-lead] notify email failed:', (err as Error)?.message)
    }

    return NextResponse.json({ ok: true, leadId })
  } catch (err) {
    console.error('[planner-lead] save failed:', (err as Error)?.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again, or message us on WhatsApp.' }, { status: 500 })
  }
}
