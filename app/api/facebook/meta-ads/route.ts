export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GRAPH, leadCountFromActions, metaErrorBody, requireLeadsAccess } from '@/lib/metaServer'

const CAMPAIGN_FIELDS = 'name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,account_id'
const AD_FIELDS = 'name,status,effective_status,campaign_id,creative{title,body,thumbnail_url,image_url}'
const INSIGHT_FIELDS = 'spend,impressions,clicks,reach,ctr,cpm,actions'

/**
 * GET /api/facebook/meta-ads?campaignIds=1,2&adIds=3,4
 * Campaign details, ad creatives and lifetime insights (spend, impressions, clicks, Meta-counted leads)
 * for the campaigns/ads that produced leads. Requires the same access as /api/facebook/meta-leads.
 */
export async function GET(req: NextRequest) {
  try {
    const authError = await requireLeadsAccess(req)
    if (authError) return authError

    const token = process.env.META_LEADS_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'META_LEADS_ACCESS_TOKEN is missing in environment variables.' }, { status: 400 })
    }

    const ids = (param: string) =>
      (req.nextUrl.searchParams.get(param) || '').split(',').filter((id) => /^\d+$/.test(id)).slice(0, 500)
    const campaignIds = ids('campaignIds')
    const adIds = ids('adIds')

    // 1. Campaign + ad details (Graph API allows 50 ids per request)
    const campaigns = await fetchByIds(campaignIds, CAMPAIGN_FIELDS, token)
    const ads = await fetchByIds(adIds, AD_FIELDS, token)
    if ('error' in campaigns) return NextResponse.json(metaErrorBody(campaigns.error), { status: 502 })
    if ('error' in ads) return NextResponse.json(metaErrorBody(ads.error), { status: 502 })

    // 2. Lifetime insights per ad account, at campaign and ad level
    const accountIds = Array.from(new Set(Object.values(campaigns.data).map((c: any) => c.account_id).filter(Boolean)))
    const insightErrors: string[] = []

    for (const accountId of accountIds) {
      const campaignInsights = await fetchInsights(accountId, 'campaign', campaignIds, token)
      if ('error' in campaignInsights) insightErrors.push(campaignInsights.error.message)
      else
        for (const row of campaignInsights.data) {
          if (campaigns.data[row.campaign_id]) campaigns.data[row.campaign_id].insights = toInsights(row)
        }

      const adInsights = await fetchInsights(accountId, 'ad', adIds, token)
      if ('error' in adInsights) insightErrors.push(adInsights.error.message)
      else
        for (const row of adInsights.data) {
          if (ads.data[row.ad_id]) ads.data[row.ad_id].insights = toInsights(row)
        }
    }

    return NextResponse.json({
      success: true,
      campaigns: campaigns.data,
      ads: ads.data,
      insightErrors,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Meta Ads Fetch Error]:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch Meta ads data' }, { status: 500 })
  }
}

/** Fetches each object individually (the `?ids=` batch parameter is deprecated for v26+ apps), 10 at a time. */
async function fetchByIds(ids: string[], fields: string, token: string): Promise<{ data: Record<string, any> } | { error: any }> {
  const data: Record<string, any> = {}
  for (let i = 0; i < ids.length; i += 10) {
    const results = await Promise.all(
      ids.slice(i, i + 10).map(async (id) => {
        const res = await fetch(`${GRAPH}/${id}?fields=${encodeURIComponent(fields)}&access_token=${token}`)
        return { id, ok: res.ok, json: await res.json() }
      })
    )
    for (const r of results) {
      // A deleted ad/campaign shouldn't break the whole report; only fail on permission/token errors
      if (!r.ok || r.json.error) {
        if (r.json.error?.code === 100) continue
        return { error: r.json.error || { message: 'Meta request failed' } }
      }
      data[r.id] = r.json
    }
  }
  return { data }
}

async function fetchInsights(
  accountId: string,
  level: 'campaign' | 'ad',
  ids: string[],
  token: string
): Promise<{ data: any[] } | { error: any }> {
  if (!ids.length) return { data: [] }
  const filtering = JSON.stringify([{ field: `${level}.id`, operator: 'IN', value: ids }])
  let next: string | undefined =
    `${GRAPH}/act_${accountId}/insights?level=${level}&date_preset=maximum` +
    `&fields=${level}_id,${INSIGHT_FIELDS}&filtering=${encodeURIComponent(filtering)}&limit=500&access_token=${token}`
  const data: any[] = []
  let pages = 0
  while (next && pages < 20) {
    const res: Response = await fetch(next)
    const json: any = await res.json()
    if (!res.ok || json.error) return { error: json.error || { message: `HTTP ${res.status}` } }
    data.push(...(json.data || []))
    next = json.paging?.next
    pages++
  }
  return { data }
}

function toInsights(row: any) {
  return {
    spend: Number(row.spend) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    reach: Number(row.reach) || 0,
    ctr: Number(row.ctr) || 0,
    cpm: Number(row.cpm) || 0,
    metaLeads: leadCountFromActions(row.actions),
  }
}
