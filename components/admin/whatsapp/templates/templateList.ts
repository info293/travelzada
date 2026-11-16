import type { GetGabsTemplateListItem } from '@/lib/getgabsTemplates'
import {
  STAGE_FILTERS,
  STAGE_ORDER,
  TEMPLATE_CATALOG,
  reconcileWithLive,
  type CatalogTemplate,
  type TemplateStage,
} from '@/lib/whatsapp/templateCatalog'

/** Catalog + any live GetGabs templates the catalog doesn't know ("wording unknown") */
export function allTemplates(live: GetGabsTemplateListItem[]): CatalogTemplate[] {
  const known = new Set(TEMPLATE_CATALOG.map((t) => t.name))
  const extra = live
    .filter((t) => !known.has(t.name) && t.category !== 'AUTHENTICATION')
    .map((t) => reconcileWithLive(undefined, { ...t, headerTextParams: [], bodyParams: [], buttons: [], supported: true }))
  return [...TEMPLATE_CATALOG, ...extra]
}

export function searchTemplates(list: CatalogTemplate[], query: string, stageFilter: string): CatalogTemplate[] {
  const q = query.trim().toLowerCase()
  const stages = STAGE_FILTERS.find((f) => f.value === stageFilter)?.stages
  return list.filter(
    (t) =>
      (!stages || stages.includes(t.stage)) &&
      (!q ||
        [t.title, t.name, t.purpose, t.whenToUse, t.body, ...t.variables.map((v) => v.label)].some((s) => String(s || '').toLowerCase().includes(q)))
  )
}

export function groupByStage(list: CatalogTemplate[]): [TemplateStage, CatalogTemplate[]][] {
  return STAGE_ORDER.map((s) => [s, list.filter((t) => t.stage === s)] as [TemplateStage, CatalogTemplate[]]).filter(([, l]) => l.length)
}
