// Shared nodemailer utility — import this in API routes, never call from the browser.
// Requires: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local
// Gracefully no-ops when SMTP is not configured (dev / preview envs).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.travelzada.com'
const FROM    = process.env.SMTP_FROM || 'noreply@travelzada.com'

export interface MailPayload {
  to: string
  subject: string
  html: string
}

export async function sendMail(payload: MailPayload): Promise<void> {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.log('[Mailer] SMTP not configured — skipping:', payload.subject, '→', payload.to)
    return
  }

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({ from: `Travelzada <${FROM}>`, to: payload.to, subject: payload.subject, html: payload.html })
}

// ─── Email templates ──────────────────────────────────────────────────────────

function baseWrap(content: string) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#f9fafb;padding:32px 24px;border-radius:16px">
      <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        ${content}
      </div>
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px">
        Travelzada · <a href="${APP_URL}" style="color:#9ca3af">travelzada.com</a>
      </p>
    </div>
  `
}

function ctaButton(label: string, url: string, color = '#7c3aed') {
  return `
    <div style="text-align:center;margin:24px 0">
      <a href="${url}" style="background:${color};color:#fff;padding:11px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
        ${label}
      </a>
    </div>
  `
}

// ── New quotation message → Travel Agent ──────────────────────────────────────
export function buildMessageToAgentEmail(opts: {
  agentName: string          // Travel agent's name
  senderName: string         // DMC sender name
  quotationTitle: string     // Package / destination
  customerName: string
  messagePreview: string     // First ~200 chars of message
  dashboardUrl: string
}): MailPayload {
  return {
    to: '',   // caller sets .to
    subject: `💬 New message from ${opts.senderName} — ${opts.quotationTitle}`,
    html: baseWrap(`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <div style="width:40px;height:40px;border-radius:10px;background:#7c3aed;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="color:#fff;font-size:18px">✈️</span>
        </div>
        <div>
          <p style="margin:0;font-size:16px;font-weight:700;color:#111827">New Message</p>
          <p style="margin:0;font-size:12px;color:#6b7280">from your DMC</p>
        </div>
      </div>

      <p style="color:#374151;margin:0 0 4px">Hi <strong>${opts.agentName}</strong>,</p>
      <p style="color:#374151;margin:0 0 20px">
        <strong>${opts.senderName}</strong> sent you a message about quotation for
        <strong>${opts.customerName}</strong>.
      </p>

      <div style="background:#f5f3ff;border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px">
        <p style="color:#1f2937;font-size:14px;margin:0;line-height:1.6">${opts.messagePreview}</p>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin-bottom:20px">
        <p style="color:#6b7280;font-size:12px;margin:0 0 4px">Package / Quotation</p>
        <p style="color:#111827;font-size:14px;font-weight:600;margin:0">${opts.quotationTitle}</p>
      </div>

      ${ctaButton('Reply in Dashboard →', opts.dashboardUrl)}

      <p style="color:#9ca3af;font-size:12px;margin:0">
        You can reply directly in your Travel Agent Dashboard. This is an automated notification — do not reply to this email.
      </p>
    `),
  }
}

// ── New quotation message → DMC ───────────────────────────────────────────────
export function buildMessageToDmcEmail(opts: {
  dmcContactName: string
  senderName: string         // Travel agent's name
  quotationTitle: string
  customerName: string
  messagePreview: string
  dashboardUrl: string
}): MailPayload {
  return {
    to: '',   // caller sets .to
    subject: `💬 ${opts.senderName} replied on ${opts.quotationTitle}`,
    html: baseWrap(`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <div style="width:40px;height:40px;border-radius:10px;background:#0891b2;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="color:#fff;font-size:18px">💬</span>
        </div>
        <div>
          <p style="margin:0;font-size:16px;font-weight:700;color:#111827">Travel Agent Replied</p>
          <p style="margin:0;font-size:12px;color:#6b7280">on a quotation in your dashboard</p>
        </div>
      </div>

      <p style="color:#374151;margin:0 0 4px">Hi <strong>${opts.dmcContactName}</strong>,</p>
      <p style="color:#374151;margin:0 0 20px">
        <strong>${opts.senderName}</strong> sent a message on the quotation for
        <strong>${opts.customerName}</strong>.
      </p>

      <div style="background:#ecfeff;border-left:3px solid #0891b2;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px">
        <p style="color:#1f2937;font-size:14px;margin:0;line-height:1.6">${opts.messagePreview}</p>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin-bottom:20px">
        <p style="color:#6b7280;font-size:12px;margin:0 0 4px">Package / Quotation</p>
        <p style="color:#111827;font-size:14px;font-weight:600;margin:0">${opts.quotationTitle}</p>
      </div>

      ${ctaButton('Open in DMC Dashboard →', opts.dashboardUrl, '#0891b2')}

      <p style="color:#9ca3af;font-size:12px;margin:0">
        Reply from your DMC Dashboard → Quotations tab. Do not reply to this email.
      </p>
    `),
  }
}
