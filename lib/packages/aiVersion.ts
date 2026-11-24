/**
 * "Create versions" of a Main package (server-side only).
 *
 * A version keeps the Main package's core route and signature experiences but is a genuinely different product:
 * different nights, hotel category, occasion and/or season — so each page answers a different search
 * ("4 night Kashmir anniversary 3 star" vs "6 night Kashmir honeymoon 5 star in winter"). Days, stay, price,
 * inclusions, FAQs and SEO are rewritten for that version, in fresh wording.
 *
 * We do NOT make reworded copies of the same trip: Google treats those as scaled/doorway content and filters them
 * (and can demote the whole site); AI assistants ignore near-copies too. After generation the draft is compared
 * with every package (incl. the Main and its other versions); if it is still too similar we regenerate once.
 * Returns a draft — the admin page saves it.
 */
import { askJson } from '@/lib/planner/ai'
import { mostSimilar, similarityLabel, SIMILAR_AT, type SimilarityHit } from '@/lib/seo/similarity'
import { durationLabel, itineraryRows, nextPackageCode, packagesForDestination, prefixForDestination, codePrefix, toNum, uniqueSlug } from '@/components/admin/catalog/packageUtils'
import type { PackageDraft } from '@/components/admin/catalog/types'
import { AiCreateError, OCCASIONS, PACKAGE_SCHEMA, describeExisting, loadCatalog, priceOf, toDraft, type AiPackage, type Occasion } from './aiCreate'

export const SEASONS = ['Any', 'Summer', 'Winter', 'Spring', 'Autumn', 'Monsoon'] as const
export type Season = (typeof SEASONS)[number]

export interface VersionSpec {
  nights: number
  stars: 3 | 4 | 5
  occasion: Occasion
  season: Season
}

export interface AiVersionResult {
  draft: PackageDraft
  label: string
  similarity: { max: number; label: string; top: SimilarityHit[] }
  checks: string[]
}

export function validateSpec(raw: any): VersionSpec {
  const nights = Math.round(Number(raw?.nights))
  if (!Number.isFinite(nights) || nights < 2 || nights > 14) throw new AiCreateError('Nights must be 2–14.')
  const stars = Number(raw?.stars)
  if (![3, 4, 5].includes(stars)) throw new AiCreateError('Hotel category must be 3, 4 or 5 star.')
  const occasion = OCCASIONS.find((o) => o.toLowerCase() === String(raw?.occasion || '').toLowerCase())
  if (!occasion) throw new AiCreateError('Unknown occasion.')
  const season = SEASONS.find((s) => s.toLowerCase() === String(raw?.season || 'Any').toLowerCase()) || 'Any'
  return { nights, stars: stars as 3 | 4 | 5, occasion, season }
}

export const versionLabel = (v: VersionSpec) =>
  [durationLabel(v.nights), `${v.stars}-Star`, v.occasion, v.season !== 'Any' ? v.season : ''].filter(Boolean).join(' · ')

const SYSTEM = `You are the senior product designer at Travelzada, an Indian travel company selling romantic trips for Indian couples.
You create a VERSION of one of our existing packages (the "Main" package). A version keeps the Main package's core route and its signature experiences, but it is a different product for a different traveller search: the nights, hotel category, occasion and/or season differ.

Rules:
- Keep the same core route/region and the signature experiences of the Main package. Re-plan the days to fit the new number of nights: for more nights add a sensible extra stop or a slower day; for fewer nights drop the least important part. Realistic drive times, no backtracking.
- Make the occasion real: honeymoon/anniversary/proposal/birthday/babymoon touches that fit (a babymoon is gentle-paced with short drives; a proposal includes a planned private moment; etc.).
- Make the season real when one is given: season-specific activities, weather, what is open or closed (e.g. snow activities only in winter, roads/passes that close), and what to pack. Never claim something that is not available in that season.
- Hotel category changes the stay: name real hotels only when confident they exist in that category, otherwise describe the hotel type.
- The price is a land price per person on twin sharing, derived from the Main package's price and scaled for nights, hotel category and season.
- Everything is written fresh. Do NOT reuse sentences or distinctive phrases from the Main package or the other packages listed — the page must read as its own product. The title must name what makes this version different (e.g. nights, occasion, season, stay style) and must not repeat any existing title.
- Overview is GEO-friendly: the first sentence is a direct factual summary an AI answer engine could quote. Plain text, no markdown, no emojis.
- Clear, warm British/Indian English. No clichés like "nestled", "breathtaking", "paradise on earth", "unforgettable memories".`

function mainDescription(m: PackageDraft) {
  const days = itineraryRows(m)
  return [
    `Title: ${m.Destination_Name}`,
    `Nights: ${toNum(m.Duration_Nights) ?? m.Duration ?? '?'} · Hotels: ${m.Star_Category || '?'} · Meal plan: ${m.Meal_Plan || '?'} · Occasion: ${m.Occasion || '-'}`,
    priceOf(m) ? `Price from: ₹${priceOf(m)} per person` : '',
    m.Location_Breakup ? `Route: ${m.Location_Breakup}` : '',
    m.Hotel_Examples ? `Hotels: ${m.Hotel_Examples}` : '',
    days.length ? `Days:\n${days.map((d, i) => `  Day ${i + 1}: ${d.title}${d.activities?.length ? ` — ${d.activities.join('; ')}` : ''}`).join('\n')}` : '',
    m.Highlights ? `Highlights: ${(Array.isArray(m.Highlights) ? m.Highlights : String(m.Highlights).split(/\r?\n/)).slice(0, 8).join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Generate one version of a Main package. Does NOT write to Firestore. */
export async function createVersion(mainId: string, spec: VersionSpec): Promise<AiVersionResult> {
  const { packages, destinations } = await loadCatalog()
  const main = packages.find((p) => p.id === mainId)
  if (!main) throw new AiCreateError('Main package not found.', 404)

  const dest = destinations.find((d) => packagesForDestination(d, [main]).length > 0)
  const destName = dest?.name || String(main.Destination_Name || '')
  const siblings = packages.filter((p) => p.id !== main.id && (p as any).Parent_Package_ID === main.id)
  const sameDest = dest ? packagesForDestination(dest, packages).filter((p) => p.id !== main.id && !siblings.some((s) => s.id === p.id)) : []

  const prefix = codePrefix(String(main.Destination_ID || '')) || prefixForDestination(dest, packages) || 'PKG'
  const code = nextPackageCode(prefix, packages)
  const label = versionLabel(spec)

  let feedback: string | undefined
  let best: { draft: PackageDraft; ai: AiPackage; top: SimilarityHit[] } | null = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    const content = [
      `Destination: ${destName}${dest?.country && dest.country !== destName ? `, ${dest.country}` : ''}`,
      '',
      `MAIN package (keep its core route and signature experiences, but write everything fresh):\n${mainDescription(main)}`,
      '',
      `THIS VERSION: ${spec.nights} nights (${spec.nights + 1} days) · ${spec.stars}-star hotels · occasion: ${spec.occasion} · season: ${spec.season === 'Any' ? 'all year (no season focus)' : spec.season}`,
      dest?.bestTimeToVisit ? `Best time to visit (our destination page): ${dest.bestTimeToVisit}` : '',
      '',
      siblings.length ? `Versions we ALREADY made of this Main package — be different from these too:\n${siblings.map(describeExisting).join('\n')}` : '',
      sameDest.length ? `Other ${destName} packages (do not copy their titles or wording):\n${sameDest.slice(0, 15).map(describeExisting).join('\n')}` : '',
      feedback ? `\nIMPORTANT — your previous draft was rejected: ${feedback}` : '',
      '',
      `"days" must have exactly ${spec.nights + 1} entries.`,
    ]
      .filter((x) => x !== '')
      .join('\n')

    const ai = await askJson<AiPackage>({ system: SYSTEM, content, schema: PACKAGE_SCHEMA, effort: 'medium', maxTokens: 16000, label: 'package-ai-version' })
    if (!ai?.title || !ai?.overview || !Array.isArray(ai.days) || !ai.days.length) throw new AiCreateError('The AI returned an incomplete package. Please try again.', 502)

    const slug = uniqueSlug(ai.seo?.slug || `${destName} ${ai.title} ${spec.nights}n${spec.nights + 1}d`, packages)
    const draft: PackageDraft = {
      ...toDraft(ai, { nights: spec.nights, occasion: spec.occasion, stars: spec.stars, destinationId: dest?.id }, code, slug),
      Is_Main: false,
      Parent_Package_ID: main.id,
      Parent_Package_Code: String(main.Destination_ID || ''),
      Parent_Package_Name: String(main.Destination_Name || ''),
      Version_Label: label,
      ...(spec.season !== 'Any' ? { Seasonality: `${spec.season}${ai.tags?.best_months ? ` (${ai.tags.best_months})` : ''}` } : {}),
    } as PackageDraft
    const top = mostSimilar(draft, packages, 3)
    if (!best || (top[0]?.score ?? 0) < (best.top[0]?.score ?? 0)) best = { draft, ai, top }
    const max = top[0]?.score ?? 0
    const titleClash = packages.some((p) => String(p.Destination_Name || '').trim().toLowerCase() === String(draft.Destination_Name).toLowerCase())
    if (max < SIMILAR_AT && !titleClash) break
    feedback = titleClash
      ? `the title "${draft.Destination_Name}" is already used. Use a new title.`
      : `it overlaps ${Math.round(max * 100)}% in wording with "${top[0].name}". Rewrite every sentence in new words and make the days clearly fit this version.`
  }

  const { draft, ai, top } = best!
  const max = top[0]?.score ?? 0
  return {
    draft,
    label,
    similarity: { max, label: similarityLabel(max), top },
    checks: [ai.price_reasoning ? `Price: ${ai.price_reasoning}` : '', ...(ai.checks || [])].filter(Boolean),
  }
}
