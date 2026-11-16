'use client'

/**
 * Client calls for the WhatsApp broadcast routes (attaches the staff ID token like lib/admin/staffFetch.ts,
 * but keeps the server's `hint` and HTTP status so the UI can explain what went wrong).
 */
import { auth } from '@/lib/firebase'
import type { AudienceFilters, AudienceSkipped, BroadcastCounts, BroadcastHeaderMedia, BroadcastStatus, RecipientStatus, SegmentId, VariableMapping } from '@/lib/whatsapp/broadcasts'
import type { SheetColumn, UploadContact } from '@/lib/whatsapp/contactLists'

export class BroadcastApiError extends Error {
  constructor(message: string, public status: number, public hint?: string, public data?: any) {
    super(message)
  }
}

export async function bcFetch<T = any>(url: string, body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new BroadcastApiError('Please log in again.', 401)
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new BroadcastApiError((data as any)?.error || `Request failed (${res.status})`, res.status, (data as any)?.hint, data)
  return data as T
}

export interface AudiencePerson {
  key: string
  name: string
  destination?: string
  package?: string
  travelDate?: string
  /** Uploaded lists: extra sheet columns */
  extra?: Record<string, string>
  /** Admins only */
  phone?: string
}

export interface DailyCap {
  cap: number
  usedToday: number
  left: number
  newInAudience: number
}

export interface AudiencePreview {
  count: number
  found: number
  skipped: AudienceSkipped
  description: string
  max: number
  overLimit: boolean
  people: AudiencePerson[]
  /** Uploaded lists */
  list?: { id: string; name: string; fileName: string; columns: SheetColumn[]; alreadyMessaged: number; createdAt: string }
  columns?: SheetColumn[]
  /** Upload: indexes (into the contacts sent) the server dropped */
  optedOutRows?: number[]
  invalidRows?: number[]
  dailyCap?: DailyCap
}

/** Segment "upload": the parsed sheet goes along with the preview / create request */
export interface UploadPayload {
  fileName: string
  contacts: UploadContact[]
  columns: SheetColumn[]
}

export const previewAudience = (segment: SegmentId, filters: AudienceFilters, upload?: UploadPayload | null) =>
  bcFetch<AudiencePreview>('/api/whatsapp/broadcasts/audience', { segment, filters, ...(segment === 'upload' && upload ? upload : {}) })

export interface SavedContactList {
  id: string
  name: string
  fileName: string
  createdAt: string
  uploadedBy: string
  count: number
  messaged: number
  columns: SheetColumn[]
  lastUsedAt: string | null
}

export const listContactLists = () => bcFetch<{ lists: SavedContactList[] }>('/api/whatsapp/broadcasts/lists')

export interface ApprovedTemplate {
  name: string
  language: string
  category: string
  templateId: string
}

export const listApprovedTemplates = (fresh = false) => bcFetch<{ templates: ApprovedTemplate[] }>(`/api/whatsapp/broadcasts/templates${fresh ? '?fresh=1' : ''}`)
export const getLiveTemplate = (name: string, language?: string) =>
  bcFetch<{ template: import('@/lib/getgabsTemplates').GetGabsTemplateSummary }>(
    `/api/whatsapp/broadcasts/templates?${new URLSearchParams({ name, ...(language ? { language } : {}) })}`
  )

export interface DraftTemplatePayload {
  templateName: string
  language?: string
  templateTitle?: string
  variables: Record<string, VariableMapping>
  componentsTemplate: any[]
  previewTemplate: string
  headerMedia?: BroadcastHeaderMedia | null
}

export const createBroadcast = (
  body: DraftTemplatePayload & {
    name: string
    segment: SegmentId
    filters: AudienceFilters
    excludeKeys?: string[]
    scheduledAt?: string | null
    marketingConsent?: boolean
    /** Uploaded lists */
    listConsent?: boolean
    acceptDailyCap?: boolean
  } & Partial<UploadPayload>
) => bcFetch<{ id: string; total: number; heldBack?: number; listId?: string }>('/api/whatsapp/broadcasts', body)

export const sendTest = (body: DraftTemplatePayload & { to: string; sample?: Partial<AudiencePerson> }) => bcFetch<{ success: boolean }>('/api/whatsapp/broadcasts/test', body)

export interface BroadcastSummary {
  id: string
  name: string
  templateName: string
  templateTitle?: string
  language: string
  category: string
  previewTemplate?: string
  headerMedia?: BroadcastHeaderMedia | null
  variables?: Record<string, VariableMapping>
  audience: { segment: SegmentId; filters: AudienceFilters; description: string; skipped?: AudienceSkipped; removed?: number; listId?: string; listName?: string; heldBack?: number }
  consentConfirmedBy?: { uid: string; email: string } | null
  consentConfirmedAt?: string | null
  newContacts?: number
  createdBy: { uid: string; email: string }
  createdAt: string
  scheduledAt?: string | null
  status: BroadcastStatus
  counts: BroadcastCounts
  startedAt?: string | null
  finishedAt?: string | null
  pausedReason?: string | null
  lockUntil?: number | null
  preparing?: boolean
}

export interface RecipientRow {
  id: string
  order: number
  name: string
  refPath: string | null
  status: RecipientStatus
  phone?: string
  messageId?: string | null
  hasMessage?: boolean
  error: string | null
  errorKind: string | null
  errorHint: string | null
  interrupted: boolean
  skipReason: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  repliedAt: string | null
  destination: string | null
}

export const getBroadcast = (id: string) => bcFetch<{ broadcast: BroadcastSummary; recipients: RecipientRow[]; isAdmin: boolean }>(`/api/whatsapp/broadcasts/${id}`)
export const broadcastAction = (id: string, action: string, extra: Record<string, any> = {}) => bcFetch<{ ok: boolean; status?: BroadcastStatus; requeued?: number }>(`/api/whatsapp/broadcasts/${id}`, { action, ...extra })

export interface SendBatchResult {
  status: BroadcastStatus
  processed: number
  sent: number
  failed: number
  skipped: number
  remaining: number
  done: boolean
  stopped?: boolean
  backoffMs?: number
  error?: string
  hint?: string
}

export const sendBatch = (id: string, runId: string) => bcFetch<SendBatchResult>(`/api/whatsapp/broadcasts/${id}/send`, { runId })
export const pollStatus = (id: string) => bcFetch<{ checked: number; updated: number; busy?: boolean }>(`/api/whatsapp/broadcasts/${id}/status`, {})
