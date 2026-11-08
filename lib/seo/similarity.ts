/**
 * Duplicate-content check for package pages (pure; safe on client and server).
 *
 * Google treats pages that share most of their wording as duplicates and often leaves them out of the
 * index. We compare 5-word "shingles" of a package's main text with every other package (Jaccard index).
 *   ≥ 0.5  → duplicate (must be rewritten)
 *   ≥ 0.3  → too similar (should be rewritten)
 *   < 0.3  → unique enough
 */

export const DUPLICATE_AT = 0.5
export const SIMILAR_AT = 0.3

/** The wording that makes a package page unique. Field names are the Firestore package fields. */
export function packageText(p: Record<string, any>): string {
  const days = Array.isArray(p.Day_Wise_Itinerary_Details) && p.Day_Wise_Itinerary_Details.length
    ? p.Day_Wise_Itinerary_Details.map((d: any) => `${d?.title || ''} ${d?.description || ''} ${(d?.activities || []).join(' ')}`).join(' ')
    : String(p.Day_Wise_Itinerary || '')
  const faqs = Array.isArray(p.FAQ_Items) ? p.FAQ_Items.map((f: any) => `${f?.question || ''} ${f?.answer || ''}`).join(' ') : ''
  const highlights = Array.isArray(p.Highlights) ? p.Highlights.join(' ') : ''
  return [p.Overview, highlights, days, faqs].join(' ')
}

export function shingles(text: string, size = 5): Set<string> {
  const words = String(text || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + size <= words.length; i++) out.add(words.slice(i, i + size).join(' '))
  return out
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let shared = 0
  a.forEach((x) => { if (b.has(x)) shared++ })
  return shared / (a.size + b.size - shared)
}

export interface SimilarityHit { id: string; name: string; score: number }

/** Most similar other packages to `target` (sorted, highest first). `others` should exclude target itself. */
export function mostSimilar(target: Record<string, any>, others: Array<Record<string, any> & { id?: string }>, top = 3): SimilarityHit[] {
  const t = shingles(packageText(target))
  return others
    .map((o) => ({ id: String(o.id || ''), name: String(o.Destination_Name || o.name || ''), score: jaccard(t, shingles(packageText(o))) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top)
}

export const similarityLabel = (score: number) => (score >= DUPLICATE_AT ? 'duplicate' : score >= SIMILAR_AT ? 'too similar' : 'unique')
