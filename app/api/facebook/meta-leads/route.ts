export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GRAPH, metaErrorBody, requireLeadsAccess } from '@/lib/metaServer'

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

    // Single lead mode (CRM detail page): GET /api/facebook/meta-leads?leadId=...
    const leadId = req.nextUrl.searchParams.get('leadId')
    if (leadId) {
      if (!/^\d+$/.test(leadId)) return NextResponse.json({ error: 'Invalid lead ID.' }, { status: 400 })
      let leadRes = await fetch(`${GRAPH}/${leadId}?fields=${FULL_LEAD_FIELDS}&access_token=${pageAccessToken}`)
      let lead = await leadRes.json()
      if (!leadRes.ok || lead.error) {
        leadRes = await fetch(`${GRAPH}/${leadId}?fields=${BASIC_LEAD_FIELDS}&access_token=${pageAccessToken}`)
        lead = await leadRes.json()
      }
      if (!leadRes.ok || lead.error) {
        return NextResponse.json(metaErrorBody(lead.error), { status: 502 })
      }
      let form: any = null
      if (lead.form_id) {
        const formRes = await fetch(`${GRAPH}/${lead.form_id}?fields=${FORM_FIELDS}&access_token=${pageAccessToken}`)
        const formJson = await formRes.json()
        if (formRes.ok && !formJson.error) form = formJson
      }
      return NextResponse.json({ success: true, lead: { ...lead, form_name: form?.name }, form })
    }

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
