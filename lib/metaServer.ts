/**
 * Server-only helpers shared by the Meta Leads API routes.
 */
import { NextRequest, NextResponse } from 'next/server'

export const GRAPH = 'https://graph.facebook.com/v20.0'

/** Turns a Meta permission error into an actionable message for the admin UI. */
export function metaErrorBody(error: any) {
  const message: string = error?.message || 'Unknown Meta API error'
  const missingPermission = /pages_manage_ads|leads_retrieval|pages_read_engagement|permission/i.test(message)
  return {
    error: message,
    code: error?.code,
    hint: missingPermission
      ? 'The access token is missing lead permissions. Generate a System User token with leads_retrieval, pages_manage_ads, pages_read_engagement, pages_show_list and ads_read, and set it as META_LEADS_ACCESS_TOKEN in .env.'
      : undefined,
  }
}

/**
 * Verifies the caller's Firebase ID token and checks they are an admin or have the "leads" permission,
 * mirroring the role logic in contexts/AuthContext.tsx.
 */
export async function requireLeadsAccess(req: NextRequest): Promise<NextResponse | null> {
  const unauthorized = (msg: string, status = 401) => NextResponse.json({ error: msg }, { status })

  const idToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travelzada'
  if (!idToken) return unauthorized('Missing authorization token.')
  if (!apiKey) return unauthorized('Server auth is not configured.', 500)

  const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const lookup = await lookupRes.json()
  const user = lookup.users?.[0]
  if (!lookupRes.ok || !user) return unauthorized('Invalid or expired session. Please log in again.')

  const userDocRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.localId}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  )

  if (userDocRes.ok) {
    const fields = (await userDocRes.json()).fields || {}
    const role = fields.role?.stringValue || 'user'
    const permissions: string[] = (fields.permissions?.arrayValue?.values || []).map((v: any) => v.stringValue)
    if (role === 'admin' || permissions.includes('leads')) return null
    return unauthorized('You do not have permission to view leads.', 403)
  }

  // No user profile document: same email-based fallback as AuthContext
  const email = String(user.email || '').toLowerCase()
  const isAdminEmail =
    ['admin@travelzada.com', 'admin@example.com'].includes(email) || email.split('@')[0].includes('admin')
  return isAdminEmail ? null : unauthorized('You do not have permission to view leads.', 403)
}
