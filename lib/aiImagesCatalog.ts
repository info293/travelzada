/**
 * Decor catalog for /ai-images.
 * Shared by the page (what the user can pick) and the API (turns ids into rich prompt phrases),
 * so the client only ever sends ids and the prompt wording stays server-controlled.
 */

export interface DecorItem {
  id: string
  label: string
  /** Detailed phrase handed to the prompt writer — describes what a premium version looks like */
  prompt: string
}

export interface DecorCategory {
  id: string
  label: string
  items: DecorItem[]
}

export interface DecorOption {
  id: string
  label: string
  prompt: string
}

export const DECOR_CATEGORIES: DecorCategory[] = [
  {
    id: 'stage',
    label: 'Stage & Backdrop',
    items: [
      { id: 'floral-stage', label: 'Floral stage backdrop', prompt: 'a raised stage with a lush layered floral backdrop of roses, orchids and hanging greenery, framed by soft fabric panels' },
      { id: 'mandap', label: 'Wedding mandap', prompt: 'an ornate four-pillar wedding mandap with carved gold-finished columns, a draped canopy and flower garlands on every pillar' },
      { id: 'throne-sofa', label: 'Royal couple sofa', prompt: 'a royal carved couple sofa (maharaja-style) upholstered in velvet, placed centre-stage on a carpeted platform' },
      { id: 'led-wall', label: 'LED video wall', prompt: 'a large seamless LED video wall behind the stage showing a soft elegant graphic, integrated cleanly into the backdrop' },
      { id: 'floral-arch', label: 'Floral arch', prompt: 'a tall circular or rectangular floral arch dense with fresh blooms and trailing greenery' },
    ],
  },
  {
    id: 'florals',
    label: 'Florals',
    items: [
      { id: 'centerpieces', label: 'Table centerpieces', prompt: 'tall statement floral centerpieces on every table — glass or gold stands with cascading roses and candles at the base' },
      { id: 'hanging-florals', label: 'Hanging ceiling florals', prompt: 'suspended floral installations hanging from the ceiling, clusters of flowers and greenery at varied heights' },
      { id: 'flower-wall', label: 'Flower wall', prompt: 'a full flower wall of densely packed roses and hydrangeas, perfect as a photo backdrop' },
      { id: 'aisle-petals', label: 'Aisle with petals & stands', prompt: 'a central aisle lined with floral stands and pillar candles, rose petals scattered along a runner' },
      { id: 'marigold', label: 'Marigold & genda strings', prompt: 'traditional marigold (genda) flower strings and torans in orange and yellow, hung along walls and the entrance' },
    ],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    items: [
      { id: 'chandeliers', label: 'Crystal chandeliers', prompt: 'grand crystal chandeliers hanging from the ceiling, sparkling and casting warm reflections' },
      { id: 'fairy-canopy', label: 'Fairy-light canopy', prompt: 'a canopy of thousands of warm-white fairy lights strung across the ceiling like a starry sky' },
      { id: 'uplighting', label: 'Ambient uplighting', prompt: 'coloured LED uplighting washing the walls and pillars with a soft glow that matches the colour palette' },
      { id: 'candles', label: 'Candles & lanterns', prompt: 'clusters of pillar candles, votives and decorative lanterns on tables and along edges, giving a warm flicker' },
      { id: 'spotlights', label: 'Stage spotlights', prompt: 'professional stage spotlights and soft beam lighting focused on the stage area' },
    ],
  },
  {
    id: 'drapery',
    label: 'Ceiling & Drapery',
    items: [
      { id: 'ceiling-draping', label: 'Ceiling fabric draping', prompt: 'flowing chiffon/satin fabric draped across the ceiling in elegant swags radiating from a central point' },
      { id: 'wall-draping', label: 'Wall draping', prompt: 'pleated fabric draping covering the walls, softening the space with rich colour' },
      { id: 'tent-canopy', label: 'Tent-style canopy', prompt: 'a tent-style fabric canopy over the main area with soft folds and hidden lighting' },
    ],
  },
  {
    id: 'seating',
    label: 'Seating & Tables',
    items: [
      { id: 'round-tables', label: 'Round banquet tables', prompt: 'round banquet tables with floor-length linen, charger plates, polished cutlery, glassware and folded napkins' },
      { id: 'chiavari', label: 'Chiavari chairs', prompt: 'gold or crystal chiavari chairs with cushion seats around every table' },
      { id: 'chair-covers', label: 'Chair covers & sashes', prompt: 'banquet chairs dressed in fitted covers with satin sashes tied in bows' },
      { id: 'long-tables', label: 'Long banquet tables', prompt: 'long imperial banquet tables with runners, candelabras and continuous floral garlands' },
      { id: 'lounge', label: 'Lounge seating', prompt: 'plush lounge seating clusters — sofas, armchairs, poufs and coffee tables on rugs' },
      { id: 'sweetheart', label: 'Sweetheart / head table', prompt: 'a decorated head table for the couple or hosts, with a floral front garland and backdrop' },
    ],
  },
  {
    id: 'food',
    label: 'Food & Bar',
    items: [
      { id: 'buffet', label: 'Buffet counter', prompt: 'an elegant buffet counter with silver chafing dishes, draped skirting and floral accents' },
      { id: 'live-stations', label: 'Live food stations', prompt: 'live food stations with chef counters, branded backdrops and warm display lighting' },
      { id: 'dessert-table', label: 'Dessert table', prompt: 'a styled dessert table with tiered stands, macarons, pastries and a floral backdrop' },
      { id: 'cake', label: 'Celebration cake', prompt: 'a multi-tier designer celebration cake on a decorated cake table as a focal point' },
      { id: 'bar', label: 'Bar counter', prompt: 'a stylish illuminated bar counter with back-lit shelves and glassware' },
    ],
  },
  {
    id: 'extras',
    label: 'Entrance & Extras',
    items: [
      { id: 'entrance', label: 'Grand entrance gate', prompt: 'a grand decorated entrance gate with florals, drapes and lighting framing the doorway' },
      { id: 'red-carpet', label: 'Red carpet walkway', prompt: 'a red carpet walkway with stanchions and floral stands leading to the stage' },
      { id: 'dance-floor', label: 'LED dance floor', prompt: 'a glossy LED or black-and-white checkered dance floor in front of the stage' },
      { id: 'dj', label: 'DJ console', prompt: 'a branded DJ console with truss lighting set at the side of the dance floor' },
      { id: 'photo-booth', label: 'Photo booth corner', prompt: 'a themed photo booth corner with a decorative frame, props and a ring light' },
      { id: 'balloons', label: 'Balloon decor', prompt: 'organic balloon garlands and arches in the colour palette, mixed sizes with a few metallic accents' },
      { id: 'signage', label: 'Welcome signage', prompt: 'an elegant welcome sign on an easel near the entrance (keep any lettering minimal and abstract)' },
    ],
  },
]

export const EVENT_TYPES: DecorOption[] = [
  { id: 'wedding', label: 'Wedding', prompt: 'a luxury Indian wedding ceremony' },
  { id: 'reception', label: 'Reception', prompt: 'a glamorous wedding reception evening' },
  { id: 'sangeet', label: 'Sangeet / Mehendi', prompt: 'a vibrant sangeet and mehendi celebration' },
  { id: 'engagement', label: 'Engagement', prompt: 'an elegant engagement ceremony' },
  { id: 'birthday', label: 'Birthday', prompt: 'a premium birthday party' },
  { id: 'corporate', label: 'Corporate event', prompt: 'a polished corporate gala / conference' },
  { id: 'baby-shower', label: 'Baby shower', prompt: 'a charming baby shower' },
]

export const DECOR_STYLES: DecorOption[] = [
  { id: 'royal', label: 'Royal Indian', prompt: 'royal Indian palace style — rich jewel tones, gold detailing, heritage motifs' },
  { id: 'luxury-gold', label: 'Luxury gold & white', prompt: 'luxury white-and-gold glamour — crisp whites, polished gold, crystal accents' },
  { id: 'pastel', label: 'Pastel romantic', prompt: 'soft pastel romance — blush, peach, lavender, airy and dreamy' },
  { id: 'modern', label: 'Modern minimal', prompt: 'modern minimal — clean lines, restrained palette, sculptural florals' },
  { id: 'boho', label: 'Rustic boho', prompt: 'rustic boho — pampas grass, wood, macramé, warm earthy tones' },
  { id: 'vibrant', label: 'Vibrant festive', prompt: 'vibrant festive — bold marigold orange, magenta and emerald, joyful energy' },
]

const ITEM_INDEX = new Map(DECOR_CATEGORIES.flatMap((c) => c.items.map((i) => [i.id, { ...i, category: c.label }] as const)))

export function resolveItems(ids: unknown): (DecorItem & { category: string })[] {
  if (!Array.isArray(ids)) return []
  return ids.map((id) => ITEM_INDEX.get(String(id))).filter((i): i is DecorItem & { category: string } => !!i)
}

export function resolveOption(list: DecorOption[], id: unknown): DecorOption | undefined {
  return list.find((o) => o.id === id)
}

export const ALL_ITEM_IDS = Array.from(ITEM_INDEX.keys())
