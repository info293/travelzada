import { NextResponse } from 'next/server'

// Generic email sender — uses nodemailer with SMTP env vars.
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env.local
// Falls back to a no-op log if not configured (so the app doesn't crash).

type EmailPayload = {
  to: string
  subject: string
  html: string
}

async function sendEmail(payload: EmailPayload) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || 'noreply@travelzada.com'

  if (!host || !user || !pass) {
    console.log('[Email] SMTP not configured — would have sent:', payload.subject, 'to', payload.to)
    return { ok: true, skipped: true }
  }

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from: `Travelzada <${from}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  })

  return { ok: true }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    let payload: EmailPayload | null = null

    switch (type) {
      // ── DMC registered (pending approval) ─────────────────────────────
      case 'dmc_signup': {
        const { companyName, contactName, email } = data
        payload = {
          to: email,
          subject: `Application Received – ${companyName} | Travelzada`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
              <h2 style="color:#7c3aed;margin-bottom:8px">Application Received 🎉</h2>
              <p style="color:#374151">Hi <strong>${contactName}</strong>,</p>
              <p style="color:#374151">
                Thank you for registering <strong>${companyName}</strong> as a Travelzada Partner Agent (DMC).
                Our team is reviewing your application and will get back to you within 1–2 business days.
              </p>
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:24px 0">
                <p style="color:#6b7280;font-size:14px;margin:0"><strong>What happens next?</strong></p>
                <ul style="color:#6b7280;font-size:14px;margin-top:8px;padding-left:20px">
                  <li>Travelzada team reviews your application</li>
                  <li>You'll receive an approval email with your dashboard access</li>
                  <li>Start adding packages and inviting your travel agents</li>
                </ul>
              </div>
              <p style="color:#9ca3af;font-size:12px">If you have questions, reply to this email or contact support@travelzada.com</p>
            </div>
          `,
        }
        break
      }

      // ── Travel Agent self-registered (pending DMC approval) ────────────
      case 'travel_agent_signup': {
        const { name, email, agentCompanyName } = data
        payload = {
          to: email,
          subject: `Registration Received – ${agentCompanyName} Travel Team | Travelzada`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
              <h2 style="color:#7c3aed;margin-bottom:8px">Welcome to the Team! ✈️</h2>
              <p style="color:#374151">Hi <strong>${name}</strong>,</p>
              <p style="color:#374151">
                Your registration request to join <strong>${agentCompanyName}</strong>'s travel team has been received.
                The agency manager will review and approve your account shortly.
              </p>
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:24px 0">
                <p style="color:#6b7280;font-size:14px;margin:0">Once approved you can:</p>
                <ul style="color:#6b7280;font-size:14px;margin-top:8px;padding-left:20px">
                  <li>Access the AI Travel Planner with your credentials</li>
                  <li>Send quotations to customers</li>
                  <li>Track your bookings and commissions</li>
                </ul>
              </div>
              <p style="color:#9ca3af;font-size:12px">This email was sent because you registered at a Travelzada partner link.</p>
            </div>
          `,
        }
        break
      }

      // ── DMC notified of new travel agent signup ─────────────────────────
      case 'travel_agent_signup_notify_dmc': {
        const { agentEmail, agentCompanyName, travelAgentName, travelAgentEmail } = data
        payload = {
          to: agentEmail,
          subject: `New Travel Agent Registration – ${travelAgentName} | ${agentCompanyName}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
              <h2 style="color:#7c3aed;margin-bottom:8px">New Team Member Registration</h2>
              <p style="color:#374151">Hi,</p>
              <p style="color:#374151">
                <strong>${travelAgentName}</strong> (${travelAgentEmail}) has requested to join your travel team on Travelzada.
              </p>
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:24px 0">
                <p style="color:#6b7280;font-size:14px;">
                  Log in to your dashboard → <strong>Travel Agents</strong> tab to approve or reject this request.
                </p>
              </div>
              <p style="color:#9ca3af;font-size:12px">Travelzada Partner Dashboard</p>
            </div>
          `,
        }
        break
      }

      // ── Travel agent approved by DMC ───────────────────────────────────
      case 'travel_agent_approved': {
        const { name, email, agentCompanyName, plannerUrl } = data
        payload = {
          to: email,
          subject: `You're Approved! Access Your Dashboard – ${agentCompanyName}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
              <h2 style="color:#10b981;margin-bottom:8px">You're Approved! 🎉</h2>
              <p style="color:#374151">Hi <strong>${name}</strong>,</p>
              <p style="color:#374151">
                Great news! <strong>${agentCompanyName}</strong> has approved your travel agent account.
                You can now log in and start using the AI Travel Planner.
              </p>
              <div style="text-align:center;margin:24px 0">
                <a href="${plannerUrl}" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
                  Open Travel Planner →
                </a>
              </div>
              <p style="color:#9ca3af;font-size:12px">Use the email and password you registered with to log in.</p>
            </div>
          `,
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    if (payload) {
      const result = await sendEmail(payload)
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ success: false, error: 'No payload' })
  } catch (error: any) {
    console.error('[Email send]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
