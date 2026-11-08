/**
 * POST /api/planner/itinerary/analyze — "Compare my itinerary".
 *
 * multipart/form-data:
 *   file       PDF / JPG / PNG / WEBP / GIF (≤ 10 MB; images ≤ 5 MB)   — or —
 *   text       pasted itinerary (≤ 30k chars)
 *   sessionId  browser session id (optional)
 *   company_website  honeypot (must be empty)
 *
 * Steps: extract (Claude reads the file) → match (catalog scoring) → compare (Claude classifies every item).
 * Every upload is logged to `planner_activity` (even anonymous / failed reads) so sales can see what people bring.
 * The file stays in memory; a copy goes to ImageKit (/itinerary-uploads) so sales can open the original.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { askJson, PlannerAIError } from '@/lib/planner/ai'
import { loadCatalog, packageBrief, scorePackages, type ScoredPackage, type TravellerPrefs } from '@/lib/planner/catalog'
import { clientIp, logPlannerActivity } from '@/lib/planner/records'
import { HONEYPOT_FIELD, isRateLimited } from '@/lib/spamGuard'
import {
  ACCEPTED_TYPES, COMPARISON_SCHEMA, COMPARISON_SYSTEM, EXTRACTION_SCHEMA, MAX_FILE_BYTES, MAX_IMAGE_BYTES, MAX_TEXT_CHARS,
  buildCompareItems, comparisonContent, extractionSummary, extractionSystem, normaliseExtraction,
  type AnalyzeResponse, type ClassifiedItem, type ItineraryComparison, type ItineraryExtraction, type PackageLite,
} from '@/lib/planner/itinerary'

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

function lite(p: ScoredPackage): PackageLite {
  return { id: p.id, name: p.name, destination: p.destination, nights: p.nights, pricePerPerson: p.pricePerPerson, starLabel: p.starLabel, image: p.image, url: p.url, score: p.score }
}

async function uploadToImageKit(bytes: Buffer, fileName: string): Promise<string | null> {
  const key = process.env.IMAGEKIT_PRIVATE_KEY
  if (!key) return null
  try {
    const body = new URLSearchParams()
    body.set('file', bytes.toString('base64'))
    body.set('fileName', fileName)
    body.set('folder', '/itinerary-uploads')
    body.set('useUniqueFileName', 'true')
    const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${key}:`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.warn('[itinerary] ImageKit upload failed:', data?.message || res.status)
      return null
    }
    return data.url || null
  } catch (err) {
    console.warn('[itinerary] ImageKit upload error:', (err as Error)?.message)
    return null
  }
}

/** Preferences for the catalog scorer, from what the itinerary says */
function prefsFrom(x: ItineraryExtraction): TravellerPrefs {
  const destinations = x.catalogDestinations.length ? x.catalogDestinations : x.destinations
  const isInr = !x.price.currency || x.price.currency === 'INR'
  const travellers = x.adults || 2
  const pp = isInr ? x.price.perPerson || (x.price.total ? Math.round(x.price.total / travellers) : null) : null
  const stars = Array.from(new Set(x.hotels.map((h) => h.stars).filter((s): s is number => !!s && s >= 3 && s <= 5)))
  const month = x.startDate ? Number(x.startDate.slice(5, 7)) || null : null
  return {
    destinations,
    nights: x.nights || (x.daysCount ? x.daysCount - 1 : null),
    budgetPerPerson: pp,
    stars,
    month,
    occasion: x.occasion ? x.occasion.toLowerCase().split(/\s+/)[0] : null,
    adults: x.adults,
  }
}

export async function POST(req: Request) {
  const ip = clientIp(req)
  const userAgent = req.headers.get('user-agent') || ''

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return fail('Please choose a file or paste your itinerary.')
  }
  if (String(form.get(HONEYPOT_FIELD) || '').trim()) return fail('Something went wrong. Please try again.')
  if (isRateLimited(`itinerary-analyze:${ip}`, 6, 60 * 60 * 1000)) {
    return fail("You've compared quite a few itineraries in the last hour. Please try again a little later, or WhatsApp us on +91 99299 62350.", 429)
  }

  const sessionId = String(form.get('sessionId') || '').slice(0, 80) || null
  const file = form.get('file')
  const pasted = String(form.get('text') || '').trim()

  // ---- Build the content blocks ------------------------------------------------------------------------------------
  let blocks: Anthropic.ContentBlockParam[] = []
  let fileName: string | null = null
  let fileBytes: Buffer | null = null

  if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as File).size > 0) {
    const f = file as File
    fileName = (f.name || 'itinerary').slice(0, 120)
    const lower = fileName.toLowerCase()
    const type = (f.type || '').toLowerCase() || (lower.endsWith('.pdf') ? 'application/pdf' : lower.match(/\.(jpe?g)$/) ? 'image/jpeg' : lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : '')
    const kind = ACCEPTED_TYPES[type]
    if (!kind) {
      if (/\.(docx?|pages|odt|rtf)$/.test(lower) || type.includes('word')) return fail('Word files can’t be read yet. Please save it as PDF or take a screenshot and upload that.', 415)
      if (/\.(heic|heif)$/.test(lower) || type.includes('heic')) return fail('iPhone HEIC photos can’t be read. Please take a screenshot (PNG/JPG) of the itinerary and upload that.', 415)
      return fail('Please upload a PDF, JPG, PNG or WEBP file — or paste the itinerary text.', 415)
    }
    if (f.size > MAX_FILE_BYTES) return fail('That file is over 10 MB. Please upload a smaller PDF or a screenshot.', 413)
    if (kind === 'image' && f.size > MAX_IMAGE_BYTES) return fail('That photo is over 5 MB. Please take a screenshot instead and upload that.', 413)
    fileBytes = Buffer.from(await f.arrayBuffer())
    const data = fileBytes.toString('base64')
    blocks =
      kind === 'pdf'
        ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }]
        : [{ type: 'image', source: { type: 'base64', media_type: type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data } }]
    blocks.push({ type: 'text', text: 'Extract this itinerary.' })
  } else if (pasted) {
    if (pasted.length < 40) return fail('That is a bit short — please paste the full itinerary (day-wise plan, hotels, price).')
    if (pasted.length > MAX_TEXT_CHARS) return fail('That text is very long. Please paste only the itinerary part (max 30,000 characters).', 413)
    blocks = [{ type: 'text', text: `Extract this itinerary (pasted by the traveller):\n\n<itinerary>\n${pasted}\n</itinerary>` }]
  } else {
    return fail('Please choose a file or paste your itinerary.')
  }

  // ---- Start the file copy + catalog load while Claude reads ------------------------------------------------------
  const safeName = (fileName || 'pasted').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80)
  const fileUrlPromise = fileBytes ? uploadToImageKit(fileBytes, `itin_${Date.now()}_${safeName}`) : Promise.resolve(null)
  const catalogPromise = loadCatalog().catch((err) => {
    console.error('[itinerary] catalog load failed', err)
    return { packages: [], destinations: [] as string[] }
  })

  const base = { fileName, sessionId, ip, userAgent }
  const logFailure = async (summary: string, extraction: ItineraryExtraction | null, error?: string) =>
    logPlannerActivity({ type: 'itinerary_upload', summary, details: { extraction, error: error || null, pastedText: pasted ? pasted.slice(0, 5000) : null }, matches: [], fileUrl: await fileUrlPromise, ...base })

  // ---- A. Extract ---------------------------------------------------------------------------------------------------
  const catalog = await catalogPromise
  let extraction: ItineraryExtraction
  try {
    const raw = await askJson<unknown>({ system: extractionSystem(catalog.destinations), content: blocks, schema: EXTRACTION_SCHEMA, effort: 'medium', maxTokens: 12000, label: 'itinerary-extract' })
    extraction = normaliseExtraction(raw)
  } catch (err) {
    await logFailure('Could not read the upload', null, (err as Error)?.message)
    const msg = err instanceof PlannerAIError ? 'Our AI is busy right now. Please try again in a minute, or send the itinerary to us on WhatsApp.' : 'We could not read that file. Please try a clearer PDF or screenshot.'
    return fail(msg, 503)
  }

  if (!extraction.isItinerary || (!extraction.days.length && !extraction.hotels.length && !extraction.destinations.length)) {
    const activityId = await logFailure(extractionSummary({ ...extraction, isItinerary: false }), extraction)
    return NextResponse.json(
      {
        error: extraction.notItineraryReason
          ? `${extraction.notItineraryReason} Please upload the itinerary or quote you received (day-wise plan, hotels, price).`
          : "This doesn't look like a travel itinerary. Please upload the itinerary or quote you received (day-wise plan, hotels, price).",
        notItinerary: true,
        activityId,
      },
      { status: 422 },
    )
  }

  // ---- B. Candidates ------------------------------------------------------------------------------------------------
  const prefs = prefsFrom(extraction)
  let sameDestination = true
  let ranked = prefs.destinations?.length ? scorePackages(catalog.packages, prefs) : []
  if (!ranked.length) {
    // We don't sell this destination: closest trips by length / budget / hotel category instead
    sameDestination = false
    ranked = scorePackages(catalog.packages, { ...prefs, destinations: [] })
  }
  const top = ranked.slice(0, 3)

  // ---- C. Compare ---------------------------------------------------------------------------------------------------
  const items = buildCompareItems(extraction)
  let comparison: ItineraryComparison
  try {
    if (!top.length) throw new Error('Catalog is empty')
    const raw = await askJson<ItineraryComparison>({
      system: COMPARISON_SYSTEM,
      content: comparisonContent(extraction, sameDestination ? items : [], top.map((p) => packageBrief(p, true)), sameDestination),
      schema: COMPARISON_SCHEMA,
      effort: 'medium',
      maxTokens: 12000,
      label: 'itinerary-compare',
    })
    comparison = mergeComparison(raw, items, top, sameDestination)
  } catch (err) {
    console.warn('[itinerary] compare failed:', (err as Error)?.message)
    comparison = fallbackComparison(top, sameDestination)
  }

  const best = top.find((p) => p.id === comparison.bestPackageId) || null
  const alternatives = (
    comparison.alternativeIds.length ? comparison.alternativeIds.map((id) => top.find((p) => p.id === id)).filter(Boolean) as ScoredPackage[] : top
  )
    .filter((p) => p.id !== best?.id)
    .slice(0, 2)
    .map(lite)

  const fileUrl = await fileUrlPromise
  const summary = `${extractionSummary(extraction)}${best ? ` → ${best.name} (${comparison.matchPercent}%)` : ' → no match'}`
  const activityId = await logPlannerActivity({
    type: 'itinerary_upload',
    summary,
    details: { extraction, comparison, prefs, pastedText: pasted ? pasted.slice(0, 5000) : null, sameDestination },
    matches: top.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    fileUrl,
    ...base,
  })

  const body: AnalyzeResponse = { activityId, extraction, comparison, bestPackage: best ? lite(best) : null, alternatives, fileUrl }
  return NextResponse.json(body)
}

/** Keep the model's answer honest and complete: every item gets exactly one status, ids must be real. */
function mergeComparison(raw: ItineraryComparison, items: ReturnType<typeof buildCompareItems>, top: ScoredPackage[], sameDestination: boolean): ItineraryComparison {
  const byId = new Map((raw.items || []).map((i) => [String(i.id), i]))
  const validIds = new Set(top.map((p) => p.id))
  const noMatch = !sameDestination || raw.status === 'no_match'
  const classified: ClassifiedItem[] = noMatch
    ? []
    : items.map((it) => {
        const r = byId.get(it.id)
        const status = r && ['included', 'similar', 'not_included'].includes(r.status) ? r.status : 'not_included'
        return {
          ...it,
          status,
          ourOffer: status === 'not_included' ? null : r?.ourOffer || null,
          estimatedExtras: status === 'not_included' ? r?.estimatedExtras || null : null,
        }
      })
  const bestPackageId = noMatch ? null : validIds.has(String(raw.bestPackageId)) ? String(raw.bestPackageId) : top[0]?.id || null
  let matchPercent = Math.round(Number(raw.matchPercent) || 0)
  if (classified.length) {
    const computed = Math.round((classified.reduce((s, i) => s + (i.status === 'included' ? 1 : i.status === 'similar' ? 0.5 : 0), 0) / classified.length) * 100)
    matchPercent = matchPercent ? Math.round((matchPercent + computed) / 2) : computed
  }
  return {
    status: noMatch ? 'no_match' : raw.status === 'match' ? 'match' : 'partial',
    bestPackageId,
    matchPercent: noMatch ? 0 : Math.max(0, Math.min(100, matchPercent)),
    summary: String(raw.summary || '').trim(),
    highlights: noMatch ? [] : (raw.highlights || []).map(String).filter(Boolean).slice(0, 5),
    items: classified,
    alternativesNote: raw.alternativesNote || null,
    alternativeIds: (raw.alternativeIds || []).map(String).filter((id) => validIds.has(id) && id !== bestPackageId).slice(0, 2),
  }
}

/** If the comparison call fails we still show what we read and our best candidate — nothing claimed as included. */
function fallbackComparison(top: ScoredPackage[], sameDestination: boolean): ItineraryComparison {
  if (!sameDestination || !top.length) {
    return {
      status: 'no_match', bestPackageId: null, matchPercent: 0,
      summary: "We don't have a ready-made trip for this destination yet, but our travel designers can still help you plan it.",
      highlights: [], items: [], alternativesNote: top.length ? 'Here are a few similar romantic trips we do plan.' : null, alternativeIds: top.slice(0, 2).map((p) => p.id),
    }
  }
  return {
    status: 'partial', bestPackageId: top[0].id, matchPercent: top[0].score,
    summary: `Our closest trip is ${top[0].name}. Our travel designer will check each item of your itinerary against it and send you an exact comparison.`,
    highlights: top[0].reasons.slice(0, 3),
    items: [], // unknown — don't claim anything either way
    alternativesNote: null, alternativeIds: top.slice(1, 3).map((p) => p.id),
  }
}

