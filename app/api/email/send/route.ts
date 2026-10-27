export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import {
  sendMail,
  buildCustomerWelcomeEmail,
  buildDmcSignupEmail,
  buildTravelAgentSignupEmail,
  buildTravelAgentSignupNotifyDmcEmail,
  buildTravelAgentApprovedEmail,
  buildLeadNotificationEmail,
} from '@/lib/mailer'
import { isSpamLead, isRateLimited, HONEYPOT_FIELD } from '@/lib/spamGuard'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://www.travelzada.com'

export async function POST(request: Request) {
  try {
    const { type, data } = await request.json()

    switch (type) {
      case 'lead_notification': {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
        if (
          isSpamLead({
            name: data?.name,
            packageName: data?.packageName,
            message: data?.message,
            honeypot: data?.[HONEYPOT_FIELD],
            elapsedMs: data?.elapsedMs,
          }) ||
          isRateLimited(`lead:${ip}`)
        ) {
          console.warn('[Email send] Blocked suspected spam lead', { ip, name: data?.name })
          // Pretend success so bots don't adapt
          return NextResponse.json({ success: true })
        }
        const mail = buildLeadNotificationEmail({
          name: data.name,
          mobile: data.mobile || data.phone,
          packageName: data.packageName,
          sourceUrl: data.sourceUrl,
          message: data.message,
          email: data.email,
        })
        await sendMail(mail)
        break
      }

      case 'customer_signup': {
        const mail = buildCustomerWelcomeEmail({ name: data.name })
        mail.to = data.email
        await sendMail(mail)
        break
      }

      case 'dmc_signup': {
        const mail = buildDmcSignupEmail({ contactName: data.contactName, companyName: data.companyName })
        mail.to = data.email
        await sendMail(mail)
        break
      }

      case 'travel_agent_signup': {
        const mail = buildTravelAgentSignupEmail({ name: data.name, agentCompanyName: data.agentCompanyName })
        mail.to = data.email
        await sendMail(mail)
        break
      }

      case 'travel_agent_signup_notify_dmc': {
        const mail = buildTravelAgentSignupNotifyDmcEmail({
          agentCompanyName: data.agentCompanyName,
          dmcContactName: data.dmcContactName,
          travelAgentName: data.travelAgentName,
          travelAgentEmail: data.travelAgentEmail,
          dashboardUrl: data.dashboardUrl || `${BASE}/dmc-dashboard`,
        })
        mail.to = data.agentEmail
        await sendMail(mail)
        break
      }

      case 'travel_agent_approved': {
        const mail = buildTravelAgentApprovedEmail({
          name: data.name,
          agentCompanyName: data.agentCompanyName,
          plannerUrl: data.plannerUrl,
        })
        mail.to = data.email
        await sendMail(mail)
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Email send]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
