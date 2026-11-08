/** Shapes shared by the game-data API and the trip game UI. Pure types only. */

export interface GamePackage {
  id: string
  name: string
  destination: string
  /** destination slug + country, used for destination/vibe matching */
  slug: string
  country: string
  nights: number
  pricePerPerson: number
  stars: number
  occasions: string[]
  /** ids of MUST_HAVES this package includes */
  kw: string[]
  image: string
  /** first ≤3 day titles, for the reveal teaser */
  days: string[]
}

export interface GameDestination {
  name: string
  slug: string
  country: string
  image: string
  packageCount: number
  priceFrom: number
}

export interface GameMustHave {
  id: string
  /** the phrase sent to the scorer (best-matching alias) */
  phrase: string
  /** how many packages include it */
  count: number
}

export interface GameData {
  packages: GamePackage[]
  destinations: GameDestination[]
  mustHaves: GameMustHave[]
}
