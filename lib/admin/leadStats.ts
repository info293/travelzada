/**
 * Shared lead rules used by the admin Overview. They mirror app/admin/leads/page.tsx exactly (toStage,
 * isFollowUpDue, the Facebook-copy rule) so the Overview numbers match what the Website Leads page shows.
 * Pure functions — no Firebase imports.
 */

export type WebsiteStage = 'new' | 'contacted' | 'quoted' | 'follow-up' | 'converted' | 'lost'

/** Read any historical website-lead status value into one of the pipeline stages (same as the Leads page). */
export function websiteStage(raw?: string): WebsiteStage {
  const s = String(raw || '').trim().toLowerCase().replace(/[_\s]+/g, '-')
  if (!s || s === 'new' || s === 'unread' || s === 'pending') return 'new'
  if (['contacted', 'read', 'in-progress', 'interested'].includes(s)) return 'contacted'
  if (['quoted', 'quote-sent', 'proposal-sent', 'sent'].includes(s)) return 'quoted'
  if (['follow-up', 'followup', 'follow-up-due', 'callback'].includes(s)) return 'follow-up'
  if (['converted', 'booked', 'confirmed', 'won', 'closed-won'].includes(s)) return 'converted'
  if (['lost', 'closed', 'not-interested', 'spam', 'junk', 'rejected'].includes(s)) return 'lost'
  return 'contacted'
}

/** Local date as 'YYYY-MM-DD' (follow-up dates are stored in that format). */
export function isoDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const startOfToday = () => new Date().setHours(0, 0, 0, 0)
export const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime() }

export const isWebsiteOpen = (status?: string) => { const s = websiteStage(status); return s !== 'converted' && s !== 'lost' }

/** Same rule as the Leads page: open lead whose followUpAt is today or earlier, or stage "follow-up" with no date. */
export function isWebsiteFollowUpDue(status?: string, followUpAt?: string): boolean {
  if (!isWebsiteOpen(status)) return false
  if (followUpAt) return followUpAt <= isoDay()
  return websiteStage(status) === 'follow-up'
}

/**
 * Old Facebook lead-ad copies the previous sync wrote into `leads`. They are worked on the Meta Leads page, so they
 * never count as website leads (that would double count them with the live Meta list).
 */
export function isFacebookCopy(data: { source?: unknown; leadgenId?: unknown }): boolean {
  return !!data.leadgenId || data.source === 'Facebook Lead Ad' || /facebook/i.test(String(data.source || ''))
}

/** Last 10 digits — used to spot the same customer across sources. */
export const phoneKey = (p?: string | null) => {
  const d = String(p || '').replace(/\D/g, '')
  return d.length >= 10 ? d.slice(-10) : ''
}

/** "today", "1d", "3d" — how long ago a YYYY-MM-DD / ISO date was. */
export function daysSince(value?: string | number | null): number {
  if (!value) return 0
  const t = typeof value === 'number' ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((startOfToday() - new Date(t).setHours(0, 0, 0, 0)) / 86400000))
}
