/**
 * Must-have wishes offered in the trip game. Pure (no imports) so both the game-data API and the browser use it.
 *
 * `aliases` are tried against each package's full text on the server (lib/planner/scoring `mentions`). The alias
 * with the most catalog hits becomes the `phrase` we send to the scorer, so the live counter in the browser and
 * the final server-side ranking agree.
 */
export interface MustHaveDef {
  id: string
  label: string
  emoji: string
  aliases: string[]
}

export const MUST_HAVES: MustHaveDef[] = [
  { id: 'pool', label: 'Private pool villa', emoji: '🏊', aliases: ['private pool villa', 'pool villa', 'private pool'] },
  { id: 'candle', label: 'Candlelight dinner', emoji: '🕯️', aliases: ['candlelight dinner', 'candle light dinner', 'candlelit dinner', 'romantic dinner'] },
  { id: 'snow', label: 'Snow activities', emoji: '⛷️', aliases: ['snow', 'gondola', 'skiing'] },
  { id: 'water', label: 'Water sports', emoji: '🚤', aliases: ['water sports', 'water sport', 'parasailing', 'banana boat'] },
  { id: 'spa', label: 'Spa', emoji: '💆', aliases: ['spa', 'massage'] },
  { id: 'cruise', label: 'Cruise / houseboat', emoji: '🛳️', aliases: ['cruise', 'houseboat', 'shikara'] },
  { id: 'scuba', label: 'Scuba / snorkelling', emoji: '🤿', aliases: ['scuba', 'snorkelling', 'snorkeling', 'snorkel'] },
]
