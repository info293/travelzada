export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const GRAPH = 'https://graph.facebook.com/v20.0'
const DEFAULT_PAGE_ID = '341298722393022' // Travelzada.Official Page ID
const MAX_PAGES_PER_FORM = 50 // 50 x 100 = up to 5,000 leads per form

// Every lead field Meta exposes. Ad/campaign names need the token to also have ads_read on the ad account,
// so we fall back to BASIC_LEAD_FIELDS if Meta rejects the full set.
const FULL_LEAD_FIELDS =
  'id,created_time,field_data,form_id,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform,is_organic,partner_name,custom_disclaimer_responses'
const BASIC_LEAD_FIELDS = 'id,created_time,field_data,form_id,ad_id,adset_id,campaign_id,platform,is_organic'
const FORM_FIELDS = 'id,name,status,locale,created_time,leads_count,questions'

/**
 * GET /api/facebook/meta-leads
 * Fetches all Lead Ad forms and their leads live from the Meta Graph API.
 * Requires a Firebase ID token (Authorization: Bearer <token>) of an admin or a user with the "leads" permission.
 */
export async function GET(req: NextRequest) {
  try {
    const authError = await requireLeadsAccess(req)
    if (authError) return authError

    const accessToken = process.env.META_LEADS_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN
    const pageId = process.env.META_PAGE_ID || DEFAULT_PAGE_ID

    if (!accessToken) {
      return NextResponse.json(
        { error: 'META_LEADS_ACCESS_TOKEN is missing in environment variables.' },
        { status: 400 }
      )
    }

    // 1. Exchange for a Page Access Token (needed for leadgen endpoints)
    let pageAccessToken = accessToken
    let pageName = ''
    const pageRes = await fetch(`${GRAPH}/${pageId}?fields=access_token,name&access_token=${accessToken}`)
    const pageData = await pageRes.json()
    if (pageData.access_token) pageAccessToken = pageData.access_token
    if (pageData.name) pageName = pageData.name

    // 2. Fetch all lead forms on the Page
    const forms = await fetchAllPages(
      `${GRAPH}/${pageId}/leadgen_forms?fields=${FORM_FIELDS}&limit=100&access_token=${pageAccessToken}`
    )
    if ('error' in forms) {
      return NextResponse.json(metaErrorBody(forms.error), { status: 502 })
    }

    // 3. Fetch every lead of every form
    const leads: any[] = []
    const formErrors: { formId: string; formName: string; error: string }[] = []

    for (const form of forms.data) {
      let result = await fetchAllPages(
        `${GRAPH}/${form.id}/leads?fields=${FULL_LEAD_FIELDS}&limit=100&access_token=${pageAccessToken}`
      )
      if ('error' in result) {
        result = await fetchAllPages(
          `${GRAPH}/${form.id}/leads?fields=${BASIC_LEAD_FIELDS}&limit=100&access_token=${pageAccessToken}`
        )
      }
      if ('error' in result) {
        formErrors.push({ formId: form.id, formName: form.name, error: result.error.message })
        continue
      }
      for (const lead of result.data) {
        leads.push({ ...lead, form_id: lead.form_id || form.id, form_name: form.name })
      }
    }

    leads.sort((a, b) => String(b.created_time).localeCompare(String(a.created_time)))

    return NextResponse.json({
      success: true,
      page: { id: pageId, name: pageName },
      forms: forms.data,
      leads,
      formErrors,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Meta Leads Fetch Error]:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch Meta leads' }, { status: 500 })
  }
}

/** Follows Graph API `paging.next` links and concatenates every page of results. */
async function fetchAllPages(url: string): Promise<{ data: any[] } | { error: any }> {
  const data: any[] = []
  let next: string | undefined = url
  let pages = 0

  while (next && pages < MAX_PAGES_PER_FORM) {
    const res: Response = await fetch(next)
    const json: any = await res.json()
    if (!res.ok || json.error) return { error: json.error || { message: `HTTP ${res.status}` } }
    data.push(...(json.data || []))
    next = json.paging?.next
    pages++
  }

  return { data }
}

/** Turns a Meta permission error into an actionable message for the admin UI. */
function metaErrorBody(error: any) {
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
async function requireLeadsAccess(req: NextRequest): Promise<NextResponse | null> {
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
