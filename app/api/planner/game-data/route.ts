/**
 * GET /api/planner/game-data — compact catalog for the "Find your perfect trip" game.
 *
 * The browser scores these packages itself (lib/planner/scoring) to animate the "trips still in the game"
 * counter and the per-answer reactions; the final pick still comes from /api/tailored-travel/smart-search.
 * Reply: { packages: GamePackage[], destinations: GameDestination[], mustHaves: GameMustHave[] } (~30-50 KB)
 */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { loadCatalog, mentions, type CatalogPackage } from '@/lib/planner/catalog'
import { MUST_HAVES } from '@/components/tailored-travel/game/mustHaves'
import type { GameData, GameDestination, GameMustHave, GamePackage } from '@/components/tailored-travel/game/types'

const TTL = 5 * 60 * 1000
let cache: { at: number; data: GameData } | null = null

/** "Day 2: Ubud tour — long description" → "Ubud tour" */
const dayTitle = (s: string) =>
  s
    .replace(/^day\s*\d+\s*[:.\-–]\s*/i, '')
    .split(' — ')[0]
    .trim()
    .slice(0, 60)

async function build(): Promise<GameData> {
  const [{ packages }, destSnap] = await Promise.all([loadCatalog(), getDocs(collection(db, 'destinations'))])
  const destDocs = destSnap.docs.map((d) => d.data() as any)

  // Pick, per must-have, the alias that most packages mention → that is the phrase the scorer gets
  const mustHaves: GameMustHave[] = []
  const kwById = new Map<string, string[]>()
  for (const def of MUST_HAVES) {
    let best = { phrase: def.aliases[0], hits: [] as CatalogPackage[] }
    for (const alias of def.aliases) {
      const hits = packages.filter((p) => mentions(p.searchText, alias))
      if (hits.length > best.hits.length) best = { phrase: alias, hits }
    }
    // Tag a trip if it mentions ANY alias (e.g. "scuba" or "snorkeling"), not just the most common one
    const tagged = packages.filter((p) => def.aliases.some((alias) => mentions(p.searchText, alias)))
    mustHaves.push({ id: def.id, phrase: best.phrase, count: tagged.length })
    for (const p of tagged) kwById.set(p.id, [...(kwById.get(p.id) || []), def.id])
  }

  const gamePackages: GamePackage[] = packages
    .filter((p) => p.destination && p.nights > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      destination: p.destination,
      slug: p.destinationSlug,
      country: p.country,
      nights: p.nights,
      pricePerPerson: p.pricePerPerson,
      stars: p.stars,
      occasions: p.occasions.slice(0, 4),
      kw: kwById.get(p.id) || [],
      image: p.image,
      days: p.dayTitles.slice(0, 3).map(dayTitle).filter(Boolean),
    }))

  const byDest = new Map<string, GamePackage[]>()
  for (const p of gamePackages) byDest.set(p.destination, [...(byDest.get(p.destination) || []), p])

  const destinations: GameDestination[] = Array.from(byDest.entries())
    .map(([name, list]) => {
      const doc = destDocs.find((d) => String(d.name || '').toLowerCase() === name.toLowerCase())
      const priced = list.filter((p) => p.pricePerPerson > 0)
      const cheapest = priced.reduce<GamePackage | null>((a, p) => (!a || p.pricePerPerson < a.pricePerPerson ? p : a), null)
      return {
        name,
        slug: String(doc?.slug || list[0].slug || ''),
        country: String(doc?.country || list[0].country || ''),
        image: String(doc?.image || list.find((p) => p.image)?.image || ''),
        packageCount: list.length,
        priceFrom: cheapest?.pricePerPerson || 0,
      }
    })
    .sort((a, b) => b.packageCount - a.packageCount)

  return { packages: gamePackages, destinations, mustHaves }
}

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > TTL) cache = { at: Date.now(), data: await build() }
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error('[game-data] failed:', (err as Error)?.message)
    return NextResponse.json({ error: 'Could not load trips right now.' }, { status: 500 })
  }
}
