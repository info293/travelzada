/**
 * Saving AI Planner activity for the sales team (server-side).
 *
 * - `planner_activity`: EVERY search and itinerary upload, even anonymous ones (what people look for, what
 *   competitors quote). Shown in Admin → Sales & CRM → Planner Activity.
 * - `leads`: created when the traveller leaves a phone number. Uses the same fields as every other website
 *   lead so it appears in Admin → Website Leads, plus a `planner` object with the full context.
 */
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type PlannerActivityType = 'smart_search' | 'wizard_search' | 'itinerary_upload'

export interface PlannerActivity {
  type: PlannerActivityType
  /** What the traveller typed or uploaded, in short */
  summary: string
  /** Parsed preferences / extracted itinerary */
  details: Record<string, unknown>
  /** Top matches we showed: [{ id, name, score }] */
  matches?: Array<{ id: string; name: string; score: number }>
  fileUrl?: string | null
  fileName?: string | null
  sessionId?: string | null
  ip?: string | null
  userAgent?: string | null
  /** Set once the same session leaves contact details */
  leadId?: string | null
}

/** Firestore rejects `undefined`; strip it recursively */
export function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as unknown as T
  if (value && typeof value === 'object' && !(value instanceof Date) && (value as any).constructor === Object) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (v !== undefined) out[k] = clean(v)
    return out as T
  }
  return value
}

export async function logPlannerActivity(activity: PlannerActivity): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, 'planner_activity'), clean({ ...activity, createdAt: serverTimestamp(), createdAtIso: new Date().toISOString() }))
    return ref.id
  } catch (err) {
    console.warn('[planner] could not log activity:', (err as Error)?.message)
    return null
  }
}

export interface PlannerLeadInput {
  name: string
  phone: string
  email?: string
  destination?: string
  travelDate?: string
  travellers?: number
  budget?: string
  /** "AI Planner" | "AI Planner – Smart search" | "Itinerary Upload" */
  source: string
  packageName?: string
  sourceUrl?: string
  notes?: string
  /** Everything the sales person needs: preferences, matches, extracted itinerary, requested additions, file */
  planner: Record<string, unknown>
  activityId?: string | null
}

export async function savePlannerLead(input: PlannerLeadInput): Promise<string> {
  const ref = await addDoc(
    collection(db, 'leads'),
    clean({
      name: input.name,
      mobile: input.phone,
      email: input.email || '',
      destination: input.destination || '',
      travelDate: input.travelDate || '',
      travelersCount: input.travellers || undefined,
      budget: input.budget || '',
      packageName: input.packageName || '',
      sourceUrl: input.sourceUrl || '',
      notes: input.notes || '',
      source: input.source,
      planner: input.planner,
      plannerActivityId: input.activityId || null,
      status: 'new',
      read: false,
      createdAt: serverTimestamp(),
    }),
  )
  if (input.activityId) {
    updateDoc(doc(db, 'planner_activity', input.activityId), { leadId: ref.id }).catch(() => {})
  }
  return ref.id
}

/** Phone sanity check (Indian 10-digit or international with country code) */
export function normalisePhone(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]/.test(digits)) return '+91' + digits
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits
  if (digits.length >= 11 && digits.length <= 15) return '+' + digits
  return null
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}
