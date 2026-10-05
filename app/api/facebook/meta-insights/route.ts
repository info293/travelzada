export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { GRAPH, leadCountFromActions, metaErrorBody, metaToken, requireLeadsAccess } from '@/lib/metaServer'

const DEFAULT_AD_ACCOUNT_ID = '1586616365514925' // Travelzada.official
const PRESETS = ['maximum', 'last_90d', 'last_30d', 'last_14d', 'last_7d', 'yesterday', 'today']
const BASE_FIELDS = 'spend,impressions,reach,clicks,ctr,cpm,cpc,frequency,actions'

type Row = Record<string, any>

/**
 * GET /api/facebook/meta-insights?preset=last_30d&scope=lead|all
 * Account-wide ad performance for the Ad Insights tab and the AI Ad Coach:
 * totals, age/gender, region, placement, device, hour-of-day, daily trend, ad quality and ad set targeting.
 */
export async function GET(req: NextRequest) {
  try {
    const authError = await requireLeadsAccess(req)
    if (authError) return authError

    const token = metaToken()
    if (!token) return NextResponse.json({ error: 'META_LEADS_ACCESS_TOKEN is missing in environment variables.' }, { status: 400 })

    const accountId = process.env.META_AD_ACCOUNT_ID || DEFAULT_AD_ACCOUNT_ID
    const preset = PRESETS.includes(req.nextUrl.searchParams.get('preset') || '') ? req.nextUrl.searchParams.get('preset')! : 'maximum'
    const scope = req.nextUrl.searchParams.get('scope') === 'all' ? 'all' : 'lead'
    const act = `act_${accountId}`

    const [account, campaignsRes] = await Promise.all([
      graph(`${act}?fields=name,currency,timezone_name,amount_spent,balance,spend_cap,account_status`, token),
      graphAll(`${act}/campaigns?fields=name,objective,effective_status,daily_budget,lifetime_budget,start_time,stop_time&limit=200`, token),
    ])
    if ('error' in account) return NextResponse.json(metaErrorBody(account.error), { status: 502 })
    if ('error' in campaignsRes) return NextResponse.json(metaErrorBody(campaignsRes.error), { status: 502 })

    const campaigns = campaignsRes.data
    const scoped = scope === 'all' ? campaigns : campaigns.filter((c) => ['OUTCOME_LEADS', 'LEAD_GENERATION'].includes(c.objective))
    const ids = scoped.map((c) => c.id)
    if (!ids.length) {
      return NextResponse.json({ success: true, account: normalizeAccount(account), campaigns, scope, preset, empty: true })
    }

    const filter = encodeURIComponent(JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: ids }]))
    const insights = (extra: string) =>
      graphAll(`${act}/insights?date_preset=${preset}&filtering=${filter}&limit=500&${extra}`, token)

    const [totals, byCampaign, ageGender, region, placement, device, hour, daily, ads, adsets] = await Promise.all([
      insights(`level=account&fields=${BASE_FIELDS}`),
      insights(`level=campaign&fields=campaign_id,campaign_name,${BASE_FIELDS}`),
      insights(`level=account&fields=${BASE_FIELDS}&breakdowns=age,gender`),
      insights(`level=account&fields=${BASE_FIELDS}&breakdowns=region`),
      insights(`level=account&fields=${BASE_FIELDS}&breakdowns=publisher_platform,platform_position`),
      insights(`level=account&fields=${BASE_FIELDS}&breakdowns=impression_device`),
      insights(`level=account&fields=${BASE_FIELDS}&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone`),
      insights(`level=account&fields=${BASE_FIELDS}&time_increment=1`),
      insights(
        `level=ad&fields=ad_id,ad_name,adset_name,campaign_name,${BASE_FIELDS},quality_ranking,engagement_rate_ranking,` +
          'conversion_rate_ranking,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'
      ),
      graphAll(
        `${act}/adsets?fields=name,campaign_id,effective_status,targeting,optimization_goal,billing_event,bid_strategy,daily_budget,lifetime_budget` +
          `&filtering=${filter}&limit=200`,
        token
      ),
    ])

    const errors: string[] = []
    const rows = (r: { data: Row[] } | { error: any }, label: string) => {
      if ('error' in r) {
        errors.push(`${label}: ${r.error.message}`)
        return []
      }
      return r.data.map(normalizeRow)
    }

    return NextResponse.json({
      success: true,
      account: normalizeAccount(account),
      campaigns: campaigns.map((c) => ({ ...c, inScope: ids.includes(c.id) })),
      scope,
      preset,
      totals: rows(totals, 'totals')[0] || null,
      byCampaign: rows(byCampaign, 'campaigns'),
      ageGender: rows(ageGender, 'age/gender'),
      region: rows(region, 'region'),
      placement: rows(placement, 'placement'),
      device: rows(device, 'device'),
      hour: rows(hour, 'hour'),
      daily: rows(daily, 'daily'),
      ads: rows(ads, 'ads').map((a) => ({
        ...a,
        video: {
          p25: videoCount(a.video_p25_watched_actions),
          p50: videoCount(a.video_p50_watched_actions),
          p75: videoCount(a.video_p75_watched_actions),
          p100: videoCount(a.video_p100_watched_actions),
        },
      })),
      adsets: 'error' in adsets ? (errors.push(`adsets: ${adsets.error.message}`), []) : adsets.data.map(summarizeAdset),
      errors,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Meta Insights Error]:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch Meta insights' }, { status: 500 })
  }
}

async function graph(path: string, token: string): Promise<Row | { error: any }> {
  const res = await fetch(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${token}`)
  const json = await res.json()
  if (!res.ok || json.error) return { error: json.error || { message: `HTTP ${res.status}` } }
  return json
}

async function graphAll(path: string, token: string): Promise<{ data: Row[] } | { error: any }> {
  let next: string | undefined = `${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${token}`
  const data: Row[] = []
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

const num = (v: any) => (v === undefined || v === null || v === '' ? 0 : Number(v) || 0)
const videoCount = (v?: { value: string }[]) => num(v?.[0]?.value)

function normalizeRow(r: Row): Row {
  const leads = leadCountFromActions(r.actions)
  const spend = num(r.spend)
  const { actions, ...rest } = r
  return {
    ...rest,
    spend,
    impressions: num(r.impressions),
    reach: num(r.reach),
    clicks: num(r.clicks),
    ctr: num(r.ctr),
    cpm: num(r.cpm),
    cpc: num(r.cpc),
    frequency: num(r.frequency),
    leads,
    cpl: leads ? spend / leads : null,
  }
}

/** Meta returns account money values in the smallest currency unit (paise). */
function normalizeAccount(a: Row) {
  return {
    name: a.name,
    currency: a.currency,
    timezone: a.timezone_name,
    amountSpent: num(a.amount_spent) / 100,
    balance: num(a.balance) / 100,
    spendCap: num(a.spend_cap) / 100,
    status: a.account_status,
  }
}

/** Human-readable targeting so the UI and Claude don't need to parse Meta's targeting spec. */
function summarizeAdset(s: Row) {
  const t = s.targeting || {}
  const geo = t.geo_locations || {}
  const places = [
    ...(geo.cities || []).map((c: Row) => `${c.name}${c.radius ? ` +${c.radius}${c.distance_unit === 'mile' ? 'mi' : 'km'}` : ''}`),
    ...(geo.regions || []).map((r: Row) => r.name),
    ...(geo.countries || []),
  ]
  const interests = (t.flexible_spec || []).flatMap((spec: Row) =>
    ['interests', 'behaviors', 'life_events', 'family_statuses', 'work_positions', 'education_statuses']
      .flatMap((k) => (spec[k] || []).map((i: Row) => i.name))
  )
  const genders = t.genders?.length ? t.genders.map((g: number) => (g === 1 ? 'Men' : g === 2 ? 'Women' : 'All')).join(', ') : 'All'
  return {
    id: s.id,
    name: s.name,
    campaignId: s.campaign_id,
    status: s.effective_status,
    optimizationGoal: s.optimization_goal,
    billingEvent: s.billing_event,
    bidStrategy: s.bid_strategy,
    dailyBudget: s.daily_budget ? num(s.daily_budget) / 100 : null,
    lifetimeBudget: s.lifetime_budget ? num(s.lifetime_budget) / 100 : null,
    targeting: {
      age: `${t.age_min ?? 18}–${t.age_max ?? 65}${t.age_range ? ` (suggested ${t.age_range.join('–')})` : ''}`,
      genders,
      locations: places,
      locationTypes: geo.location_types || [],
      interests,
      advantageAudience: t.targeting_automation?.advantage_audience === 1,
      platforms: t.publisher_platforms || ['automatic'],
      positions: [...(t.facebook_positions || []), ...(t.instagram_positions || [])],
    },
  }
}
