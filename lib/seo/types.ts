/** Shared (client + server) shapes for the SEO & GEO optimizer. */
import type { PackageAudit } from './packageAudit'
import type { SimilarityHit } from './similarity'

/** The only package fields the optimizer is allowed to write. Everything else (price, nights, hotels…) is never touched. */
export const SEO_FIELDS = [
  'SEO_Title',
  'SEO_Description',
  'SEO_Keywords',
  'Overview',
  'Highlights',
  'Day_Wise_Itinerary_Details',
  'FAQ_Items',
  'Why_Book_With_Us',
  'Image_Alt_Text',
] as const
export type SeoField = (typeof SEO_FIELDS)[number]

export const SEO_FIELD_LABELS: Record<SeoField, string> = {
  SEO_Title: 'SEO title',
  SEO_Description: 'SEO description',
  SEO_Keywords: 'SEO keywords',
  Overview: 'Overview',
  Highlights: 'Highlights',
  Day_Wise_Itinerary_Details: 'Day-wise plan',
  FAQ_Items: 'FAQs',
  Why_Book_With_Us: 'Why book with us',
  Image_Alt_Text: 'Image alt text',
}

export type SeoPatch = Partial<Record<SeoField, any>>

export interface OptimizeResult {
  patch: SeoPatch
  audit_before: PackageAudit
  audit_after_estimate: PackageAudit
  similarity_before: SimilarityHit[]
  similarity_after: SimilarityHit[]
  /** Fact-check problems the server could not fix (fields with them were removed from the patch) */
  warnings: string[]
  notes: string[]
  attempts: number
  ms: number
}
