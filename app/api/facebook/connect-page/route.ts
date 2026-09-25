export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/facebook/connect-page?pageId=YOUR_PAGE_ID
 * Programmatically subscribes your Facebook Page to your Travelzada API App's Leadgen Webhooks.
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
          hint: 'Call /api/facebook/connect-page?pageId=YOUR_PAGE_ID or pass your Page ID.',
        },
        { status: 400 }
      )
    }

    // Call Meta Graph API to subscribe the page to the app for leadgen
    const url = `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        access_token: accessToken,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to connect Page to App', details: data },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully connected Facebook Page (${pageId}) to Travelzada API for Lead Ads!`,
      data,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
