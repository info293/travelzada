export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/facebook/connect-page?pageId=YOUR_PAGE_ID
 * Automatically fetches the Page Access Token and subscribes your Facebook Page to Lead Ads webhooks.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pageId = searchParams.get('pageId')
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json(
        { error: 'WHATSAPP_ACCESS_TOKEN is missing in environment variables.' },
        { status: 400 }
      )
    }

    if (!pageId) {
      return NextResponse.json(
        {
          error: 'Facebook Page ID is required.',
          hint: 'Call /api/facebook/connect-page?pageId=YOUR_PAGE_ID',
        },
        { status: 400 }
      )
    }

    // 1. Fetch Page Access Token from Meta Graph API
    console.log(`[Connect Page] Fetching Page Access Token for Page ID: ${pageId}...`)
    const tokenUrl = `https://graph.facebook.com/v20.0/${pageId}?fields=access_token&access_token=${accessToken}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    let pageAccessToken = tokenData.access_token

    if (!pageAccessToken) {
      // Try fetching accounts list
      const accountsUrl = `https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`
      const accountsRes = await fetch(accountsUrl)
      const accountsData = await accountsRes.json()

      if (accountsData.data) {
        const match = accountsData.data.find((p: any) => p.id === pageId)
        if (match) {
          pageAccessToken = match.access_token
        }
      }
    }

    if (!pageAccessToken) {
      return NextResponse.json(
        {
          error: 'Could not fetch Page Access Token automatically.',
          metaDetails: tokenData,
          solution: 'Follow Method 1 below to connect your App directly in Meta Business Settings.',
        },
        { status: 400 }
      )
    }

    // 2. Subscribe Page to Travelzada API App using the Page Access Token
    console.log(`[Connect Page] Subscribing Page ${pageId} with Page Access Token...`)
    const subscribeUrl = `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`
    const subRes = await fetch(subscribeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        access_token: pageAccessToken,
      }),
    })

    const subData = await subRes.json()

    if (!subRes.ok) {
      return NextResponse.json(
        { error: subData.error?.message || 'Failed to subscribe Page to App', details: subData },
        { status: subRes.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: `🎉 Successfully connected Facebook Page (${pageId}) to Travelzada API for real-time Lead Ads!`,
      data: subData,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
