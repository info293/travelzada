/**
 * Travelzada brand emails: customer-facing (welcome, OTP, voucher) and the team lead alert.
 * White-label agent/DMC emails in lib/mailer.ts keep their own layout.
 * Re-exported from lib/mailer.ts, so import from '@/lib/mailer' as before.
 */
import type { MailPayload } from '@/lib/mailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.travelzada.com'

const TZ = {
  brand: '#651926',
  ink: '#1A1014',
  text: '#4A3F44',
  muted: '#8A7F85',
  line: '#ECE6EA',
  bg: '#F4F1F3',
  soft: '#FAF7F8',
  gold: '#A9823A',
}
const TZ_SITE = 'https://www.travelzada.com' // assets must load in inboxes even when sent from dev
const TZ_LOGO = `${TZ_SITE}/images/logo/Travelzada%20Logo%20April%20(1).png`
const TZ_WHATSAPP = '919929962350'
const TZ_PHONE = '+91 99299 62350'
const TZ_EMAIL = 'info@travelzada.com'
const SERIF = "Georgia,'Times New Roman',Times,serif"
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const waLink = (text: string) => `https://wa.me/${TZ_WHATSAPP}?text=${encodeURIComponent(text)}`

// ─── Layout ───────────────────────────────────────────────────────────────────

function layout(opts: {
  preheader: string
  eyebrow?: string
  accent?: string
  title: string
  subtitle?: string
  heroImage?: { src: string; alt: string; href?: string }
  content: string
  footerNote: string
  /** "Need help?" contact strip; off for internal emails */
  help?: boolean
}) {
  const accent = opts.accent || TZ.brand
  const hero = opts.heroImage
    ? `<tr><td style="padding:24px 24px 0">
        ${opts.heroImage.href ? `<a href="${opts.heroImage.href}" target="_blank" style="text-decoration:none">` : ''}
        <img src="${opts.heroImage.src}" alt="${esc(opts.heroImage.alt)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:14px">
        ${opts.heroImage.href ? '</a>' : ''}
      </td></tr>`
    : `<tr><td style="height:6px;background:${accent};font-size:0;line-height:0">&nbsp;</td></tr>`
  const pill = (href: string, label: string) =>
    `<a href="${href}" target="_blank" style="display:inline-block;margin:0 8px 6px 0;padding:9px 16px;border:1px solid ${TZ.line};border-radius:999px;font-size:13px;font-weight:600;color:${TZ.ink};text-decoration:none">${label}</a>`
  const footLink = (href: string, label: string) =>
    `<a href="${href}" target="_blank" style="color:${TZ.muted};font-weight:600;text-decoration:none">${label}</a>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(opts.title.replace(/<[^>]+>/g, ''))}</title>
<style>
  body{margin:0;padding:0;-webkit-text-size-adjust:100%}
  @media (max-width:620px){
    .tz-px{padding-left:22px!important;padding-right:22px!important}
    .tz-h1{font-size:27px!important;line-height:34px!important}
    .tz-stack{display:block!important;width:100%!important;padding:0 0 10px!important}
    .tz-code{font-size:24px!important;letter-spacing:3px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${TZ.bg};font-family:${SANS}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${TZ.bg}">${esc(opts.preheader)}${'&#8204;&nbsp;'.repeat(60)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${TZ.bg}">
    <tr><td align="center" style="padding:28px 12px 40px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">

        <tr><td style="padding:0 8px 18px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td><a href="${TZ_SITE}" target="_blank"><img src="${TZ_LOGO}" alt="Travelzada" height="30" style="display:block;height:30px;width:auto;border:0"></a></td>
            <td align="right" style="font-size:12px;color:${TZ.muted};letter-spacing:.4px">Journeys designed for two</td>
          </tr></table>
        </td></tr>

        <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(26,16,20,.04),0 8px 28px rgba(26,16,20,.06)">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${hero}
            <tr><td class="tz-px" style="padding:34px 40px 6px">
              ${opts.eyebrow ? `<p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:${accent}">${opts.eyebrow}</p>` : ''}
              <h1 class="tz-h1" style="margin:0;font-family:${SERIF};font-size:32px;line-height:40px;font-weight:700;color:${TZ.ink}">${opts.title}</h1>
              ${opts.subtitle ? `<p style="margin:12px 0 0;font-size:16px;line-height:26px;color:${TZ.text}">${opts.subtitle}</p>` : ''}
            </td></tr>
            <tr><td class="tz-px" style="padding:22px 40px 38px">${opts.content}</td></tr>
          </table>
        </td></tr>

        ${opts.help === false ? '' : `<tr><td style="padding:22px 8px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px">
            <tr><td class="tz-px" style="padding:20px 28px">
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${TZ.ink}">Need help?</p>
              <p style="margin:0 0 14px;font-size:13.5px;line-height:21px;color:${TZ.text}">Our travel designers are a message away.</p>
              ${pill(`https://wa.me/${TZ_WHATSAPP}`, 'WhatsApp')}${pill(`tel:${TZ_PHONE.replace(/\s/g, '')}`, `Call ${TZ_PHONE}`)}${pill(`mailto:${TZ_EMAIL}`, 'Email us')}
            </td></tr>
          </table>
        </td></tr>`}

        <tr><td align="center" style="padding:26px 16px 0;font-size:12px;line-height:20px;color:${TZ.muted}">
          <p style="margin:0 0 10px">${footLink(TZ_SITE, 'travelzada.com')} &nbsp;·&nbsp; ${footLink('https://facebook.com/travelzada', 'Facebook')} &nbsp;·&nbsp; ${footLink('https://linkedin.com/company/travelzada', 'LinkedIn')}</p>
          <p style="margin:0 0 6px">${opts.footerNote}</p>
          <p style="margin:0">Travelzada (Sadaya Trips LLP) · Malviya Nagar, Jaipur, Rajasthan 302017, India</p>
          <p style="margin:6px 0 0">© ${new Date().getFullYear()} Travelzada. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

function para(html: string) {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:25px;color:${TZ.text}">${html}</p>`
}

function button(label: string, href: string, variant: 'primary' | 'secondary', color: string) {
  const primary = variant === 'primary'
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" style="border-radius:999px;background:${primary ? color : '#ffffff'};${primary ? '' : `border:1.5px solid ${TZ.line};`}">
      <a href="${href}" target="_blank" style="display:block;padding:15px 22px;font-size:15px;font-weight:700;color:${primary ? '#ffffff' : TZ.ink};text-decoration:none;border-radius:999px">${label}</a>
    </td>
  </tr></table>`
}

/** Primary (filled) + optional secondary (outline) side by side; stacks on phones */
function buttons(primary: [string, string], secondary?: [string, string], color = TZ.brand) {
  if (!secondary) return `<div style="margin:6px 0 26px">${button(primary[0], primary[1], 'primary', color)}</div>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 26px"><tr>
    <td class="tz-stack" width="50%" style="padding-right:6px;vertical-align:top">${button(primary[0], primary[1], 'primary', color)}</td>
    <td class="tz-stack" width="50%" style="padding-left:6px;vertical-align:top">${button(secondary[0], secondary[1], 'secondary', color)}</td>
  </tr></table>`
}

/** Receipt-style summary card, like an order summary */
function summary(heading: string, rows: [string, string][]) {
  const cell = (i: number) => `padding:12px 0;${i ? `border-top:1px dashed ${TZ.line};` : ''}font-size:14px;vertical-align:top;`
  const body = rows
    .map(
      ([k, v], i) => `<tr>
      <td style="${cell(i)}color:${TZ.muted};width:42%">${k}</td>
      <td align="right" style="${cell(i)}font-weight:600;color:${TZ.ink}">${v}</td>
    </tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;border:1px solid ${TZ.line};border-radius:16px">
    <tr><td style="padding:16px 20px 4px"><p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${TZ.muted}">${heading}</p></td></tr>
    <tr><td style="padding:0 20px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table></td></tr>
  </table>`
}

function codeBox(label: string, code: string, sub: string | undefined, color: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px">
    <tr><td align="center" style="background:${TZ.soft};border:2px dashed ${TZ.gold};border-radius:16px;padding:22px 16px">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:${TZ.gold}">${label}</p>
      <p class="tz-code" style="margin:0;font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:30px;font-weight:700;letter-spacing:5px;color:${color}">${code}</p>
      ${sub ? `<p style="margin:10px 0 0;font-size:13.5px;color:${TZ.text}">${sub}</p>` : ''}
    </td></tr>
  </table>`
}

function steps(heading: string, items: { title: string; text: string }[], color = TZ.brand) {
  const last = items.length - 1
  const rows = items
    .map(
      (s, i) => `<tr>
      <td width="40" style="vertical-align:top;padding-bottom:${i === last ? 0 : 18}px">
        <div style="width:28px;height:28px;border-radius:50%;background:${color};color:#ffffff;font-size:13px;font-weight:700;line-height:28px;text-align:center">${i + 1}</div>
      </td>
      <td style="vertical-align:top;padding:3px 0 ${i === last ? 0 : 18}px">
        <p style="margin:0;font-size:15px;font-weight:700;color:${TZ.ink}">${s.title}</p>
        <p style="margin:3px 0 0;font-size:14px;line-height:22px;color:${TZ.text}">${s.text}</p>
      </td>
    </tr>`
    )
    .join('')
  return `<p style="margin:0 0 16px;font-family:${SERIF};font-size:21px;font-weight:700;color:${TZ.ink}">${heading}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px">${rows}</table>`
}

function note(html: string) {
  return `<p style="margin:0;padding-top:18px;border-top:1px solid ${TZ.line};font-size:12.5px;line-height:20px;color:${TZ.muted}">${html}</p>`
}

// ─── Builders ─────────────────────────────────────────────────────────────────

export function buildCustomerWelcomeEmail(opts: { name: string }): MailPayload {
  const name = esc(opts.name)
  return {
    to: '',
    fromName: 'Travelzada',
    subject: `Welcome to Travelzada, ${opts.name}`,
    html: layout({
      preheader: 'Your account is ready. Tell us the occasion and we will design the trip.',
      eyebrow: 'Welcome aboard',
      title: `Hi ${name}, let’s plan something for two`,
      subtitle: 'Honeymoons, anniversaries, proposals and quiet escapes, planned by a real travel designer.',
      content: `
        ${steps('What you can do', [
          { title: 'Plan with AI in minutes', text: 'Tell us where and when; get a day-by-day itinerary you can tweak.' },
          { title: 'Pick a handpicked package', text: 'Hotels, transfers, sightseeing and meals, priced upfront.' },
          { title: 'Talk to a travel designer', text: 'Free, personal help on WhatsApp. No payment until you love the plan.' },
        ])}
        ${buttons(['Start planning', APP_URL], ['Chat on WhatsApp', waLink(`Hi Travelzada! I just signed up as ${opts.name}.`)])}
        ${note('Didn’t create this account? You can ignore this email.')}
      `,
      footerNote: 'You’re receiving this because you created a Travelzada account.',
    }),
  }
}

export function buildOtpEmail(opts: { name?: string; otp: string }): MailPayload {
  return {
    to: '',
    fromName: 'Travelzada',
    subject: `${opts.otp} is your Travelzada verification code`,
    html: layout({
      preheader: `Your verification code is ${opts.otp}. It expires in 10 minutes.`,
      eyebrow: 'Verification',
      title: opts.name ? `${esc(opts.name)}, here’s your code` : 'Here’s your verification code',
      subtitle: 'Enter this code to continue. It expires in 10 minutes.',
      content: `
        ${codeBox('Verification code', esc(opts.otp), undefined, TZ.brand)}
        ${para('For your security, never share this code. Travelzada will never ask for it on a call, SMS or WhatsApp.')}
        ${note('Didn’t request this code? Someone may have typed your email by mistake. You can ignore this email.')}
      `,
      footerNote: 'This is an automated security email from Travelzada.',
    }),
  }
}

export function buildLeadNotificationEmail(opts: {
  name: string
  mobile: string
  packageName?: string
  sourceUrl?: string
  message?: string
  email?: string
}): MailPayload {
  const pkgName = opts.packageName || 'General Enquiry'
  const digits = opts.mobile.replace(/\D/g, '')
  const wa = digits.length === 10 ? `91${digits}` : digits
  const green = '#0F7A4D'
  const rows: [string, string][] = [
    ['Mobile', `<a href="tel:${esc(opts.mobile)}" style="color:${TZ.ink};text-decoration:none">${esc(opts.mobile)}</a>`],
    ...(opts.email ? [['Email', `<a href="mailto:${esc(opts.email)}" style="color:${TZ.ink}">${esc(opts.email)}</a>`] as [string, string]] : []),
    ['Enquiry', esc(pkgName)],
    ...(opts.sourceUrl ? [['Source', `<a href="${esc(opts.sourceUrl)}" target="_blank" style="color:${TZ.brand}">Open page</a>`] as [string, string]] : []),
    ['Received', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })],
  ]
  const message = opts.message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px"><tr><td style="background:${TZ.soft};border-radius:14px;padding:16px 18px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${TZ.muted}">Message</p>
        <p style="margin:0;font-size:14.5px;line-height:23px;color:${TZ.ink}">${esc(opts.message).replace(/\n/g, '<br>')}</p>
      </td></tr></table>`
    : ''

  return {
    to: 'info@travelzada.com, ravindra@travelzada.com',
    fromName: 'Travelzada Lead Desk',
    subject: `🚨 New Lead Received: ${opts.name} — ${pkgName}`,
    html: layout({
      preheader: `New lead from ${opts.name} (${opts.mobile}) for ${pkgName}`,
      eyebrow: 'New lead · reply within 15 minutes',
      accent: green,
      title: esc(opts.name),
      subtitle: esc(pkgName),
      content: `
        ${summary('Lead details', rows)}
        ${message}
        ${buttons([`Call ${esc(opts.name.split(' ')[0])}`, `tel:${esc(opts.mobile)}`], ['WhatsApp', `https://wa.me/${wa}`], green)}
        ${note('Sent automatically to info@travelzada.com and ravindra@travelzada.com.')}
      `,
      footerNote: 'Internal notification from the Travelzada website.',
      help: false,
    }),
  }
}

export function buildVoucherCodeEmail(opts: {
  name: string
  code: string
  typeLabel: string
  amount: string
  minSpend: string
  bookBy: string
  travelBy: string
  destinations: string
  viewUrl: string
  /** cid of an inline voucher image attachment */
  imageCid?: string
  /** voucher theme colour (maroon international / navy domestic) */
  accent?: string
}): MailPayload {
  const accent = opts.accent || TZ.brand
  return {
    to: '',
    fromName: 'Travelzada',
    subject: `${opts.name}, your ${opts.amount} Travelzada voucher is ready`,
    html: layout({
      preheader: `Code ${opts.code} · ${opts.amount} off your ${opts.typeLabel.toLowerCase()} holiday · Book by ${opts.bookBy}`,
      eyebrow: `${opts.typeLabel} voucher · Confirmed`,
      accent,
      title: `${esc(opts.name)}, your ${opts.amount} voucher is ready`,
      subtitle: 'Share this code with your Travelzada travel designer. It’s applied when your booking is confirmed.',
      ...(opts.imageCid ? { heroImage: { src: `cid:${opts.imageCid}`, alt: `Your Travelzada voucher ${opts.code}`, href: opts.viewUrl } } : {}),
      content: `
        ${codeBox('Your voucher code', opts.code, `${opts.amount} off · min. spend ${opts.minSpend} per couple`, accent)}
        ${buttons(['View my voucher', opts.viewUrl], ['Plan on WhatsApp', waLink(`Hi Travelzada! My voucher code is ${opts.code}. I'd like to plan my holiday.`)], accent)}
        ${summary('Voucher details', [
          ['Value', `${opts.amount} off`],
          ['Minimum spend', `${opts.minSpend} per couple<br><span style="font-weight:400;color:${TZ.muted};font-size:12.5px">excluding flights</span>`],
          ['Book by', opts.bookBy],
          ['Travel by', opts.travelBy],
          ['Valid for', `<span style="font-weight:500">${esc(opts.destinations)}</span>`],
        ])}
        ${steps('What happens next', [
          { title: 'We call you within 24 hours', text: 'A Travelzada travel designer gets in touch to understand your trip.' },
          { title: 'We design your holiday', text: 'Hotels, transfers, sightseeing and meals, built around your dates and budget.' },
          { title: `Book by ${opts.bookBy}`, text: 'Your voucher code is applied when your booking is confirmed.' },
        ], accent)}
        ${note(`${opts.imageCid ? 'Your voucher PDF with the full terms &amp; conditions is attached to this email. ' : ''}One voucher per booking; it can’t be combined with other offers or exchanged for cash. T&amp;C apply.`)}
      `,
      footerNote: 'You’re receiving this because you redeemed a Travelzada voucher.',
    }),
  }
}
