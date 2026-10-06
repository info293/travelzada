/**
 * Branded "your trip options" email for new Meta leads.
 * Table-based, inline-styled HTML so it renders consistently in Gmail, Outlook and Apple Mail.
 */

export interface EmailPackageOption {
  name: string
  duration: string
  price: string
  overview: string
  image?: string
  hotels?: string
  url: string
}

export interface OptionsEmailInput {
  leadId: string
  firstName: string
  destination: string
  platform?: string
  facts: { label: string; value: string }[]
  options: EmailPackageOption[]
  siteUrl: string
  replyTo: string
  whatsappNumber: string
  heroImage?: string
}

const BRAND = {
  navy: '#13294b',
  navySoft: '#1e3a6b',
  red: '#e2363f',
  gold: '#c9a227',
  ink: '#1f2937',
  body: '#4b5563',
  muted: '#6b7280',
  line: '#e7e5e4',
  page: '#f4f1ec',
  card: '#ffffff',
  sand: '#faf8f4',
}
const FONT = "'Outfit','Segoe UI',Helvetica,Arial,sans-serif"
const SERIF = "'Playfair Display',Georgia,'Times New Roman',serif"
const PHONE_DISPLAY = '+91 99299 62350'
const PHONE_TEL = '+919929962350'
const SUPPORT_EMAIL = 'info@travelzada.com'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const refTag = (leadId: string) => `[Ref TZ-${leadId}]`

const button = (href: string, label: string, bg: string, color = '#ffffff', border = bg) =>
  `<a href="${esc(href)}" target="_blank" style="display:inline-block;background:${bg};color:${color};border:1.5px solid ${border};font-family:${FONT};font-size:14px;font-weight:600;line-height:1;text-decoration:none;padding:13px 22px;border-radius:999px;mso-padding-alt:0">${label}</a>`

export function renderOptionsEmail(i: OptionsEmailInput) {
  const logo = `${i.siteUrl}/images/logo/Travelzada%20Logo%20April%20(1).png`
  const subject = `${i.firstName}, your ${i.destination} holiday options are ready ${refTag(i.leadId)}`
  const preheader = `${i.options.length || 'A few'} handpicked ${i.destination} itineraries, chosen for you by our travel experts.`
  const waText = encodeURIComponent(`Hi Travelzada, I'd like to know more about the ${i.destination} options you emailed me. ${refTag(i.leadId)}`)
  const waLink = `https://wa.me/${i.whatsappNumber}?text=${waText}`
  const choose = (n: number, name: string) =>
    `mailto:${i.replyTo}?subject=${encodeURIComponent(`I'd like Option ${n}: ${name} ${refTag(i.leadId)}`)}&body=${encodeURIComponent(
      `Hi Travelzada,\n\nI'm interested in Option ${n} (${name}).\n\nPreferred travel dates:\nNumber of travellers:\nAnything you'd like to change:\n\nThanks,\n${i.firstName}`
    )}`
  const hero = i.options.some((o) => o.image) ? undefined : i.heroImage

  const facts = i.facts.length
    ? `
    <tr><td style="padding:0 40px 8px" class="px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.sand};border:1px solid ${BRAND.line};border-radius:14px">
        <tr><td style="padding:18px 22px 6px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${BRAND.muted}">What you told us</td></tr>
        <tr><td style="padding:0 22px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${i.facts
              .map(
                (f) => `<tr>
              <td style="padding:6px 0;font-family:${FONT};font-size:14px;color:${BRAND.muted};width:48%;vertical-align:top">${esc(f.label)}</td>
              <td style="padding:6px 0;font-family:${FONT};font-size:14px;color:${BRAND.ink};font-weight:600;vertical-align:top">${esc(f.value)}</td>
            </tr>`
              )
              .join('')}
          </table>
        </td></tr>
      </table>
    </td></tr>`
    : ''

  const cards = i.options
    .map(
      (o, idx) => `
    <tr><td style="padding:0 40px 24px" class="px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden">
        ${
          o.image
            ? `<tr><td style="padding:0;line-height:0"><a href="${esc(o.url)}" target="_blank"><img src="${esc(o.image)}" alt="${esc(o.name)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;max-height:240px;object-fit:cover;border:0;border-radius:16px 16px 0 0"></a></td></tr>`
            : ''
        }
        <tr><td style="padding:22px 24px 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${BRAND.red}">Option ${idx + 1}${idx === 0 ? ' &nbsp;·&nbsp; Best match' : ''}</td>
            ${o.duration ? `<td align="right" style="font-family:${FONT};font-size:12px;color:${BRAND.muted};white-space:nowrap">${esc(o.duration)}</td>` : ''}
          </tr></table>
          <div style="font-family:${SERIF};font-size:22px;line-height:1.3;color:${BRAND.navy};font-weight:700;margin:8px 0 6px">${esc(o.name)}</div>
          ${o.hotels ? `<div style="font-family:${FONT};font-size:13px;color:${BRAND.muted};margin-bottom:10px">${esc(o.hotels)}</div>` : ''}
          ${
            o.overview
              ? `<p style="margin:0 0 18px;font-family:${FONT};font-size:14px;line-height:1.65;color:${BRAND.body}">${esc(o.overview)}${o.overview.length >= 220 ? '…' : ''}</p>`
              : ''
          }
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.line}"><tr>
            <td style="padding-top:16px;font-family:${FONT}">
              <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.muted}">Starting from</div>
              <div style="font-size:20px;font-weight:700;color:${BRAND.navy}">${esc(o.price.replace(/^Starting\s+/i, ''))}</div>
            </td>
            <td align="right" style="padding-top:16px;white-space:nowrap" class="stack">
              ${button(o.url, 'View itinerary', BRAND.navy)}
            </td>
          </tr></table>
          <div style="padding-top:12px;font-family:${FONT};font-size:13px">
            <a href="${esc(choose(idx + 1, o.name))}" style="color:${BRAND.red};font-weight:600;text-decoration:none">I like this one &rarr;</a>
          </div>
        </td></tr>
      </table>
    </td></tr>`
    )
    .join('')

  const noOptions = `
    <tr><td style="padding:0 40px 24px;font-family:${FONT};font-size:15px;line-height:1.7;color:${BRAND.body}" class="px">
      Our travel experts are putting together a personalised ${esc(i.destination)} itinerary for you and will share it shortly.
    </td></tr>`

  const trust = [
    ['Fully customisable', 'Change dates, hotels or activities. Every trip is built around you.'],
    ['Local experts', 'Itineraries planned by specialists who know the destination.'],
    ['Support on the trip', 'A real person on WhatsApp from booking until you are home.'],
  ]

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Playfair+Display:wght@700&display=swap');
  a { text-decoration: none; }
  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; border-radius: 0 !important; }
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .stack { display: block !important; width: 100% !important; text-align: left !important; padding-top: 14px !important; }
    .h1 { font-size: 28px !important; }
    .trust td { display: block !important; width: 100% !important; padding: 0 0 14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.page}">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.page}" style="background:${BRAND.page}">
<tr><td align="center" style="padding:28px 12px">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(19,41,75,.06)">

    <!-- Brand bar -->
    <tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND.navy}">&nbsp;</td></tr>

    <!-- Logo -->
    <tr><td align="center" style="padding:28px 40px 22px" class="px">
      <a href="${i.siteUrl}" target="_blank"><img src="${logo}" alt="Travelzada" width="170" style="display:block;width:170px;height:auto;border:0"></a>
    </td></tr>

    ${
      hero
        ? `<!-- Hero -->
    <tr><td style="padding:0 24px" class="px"><img src="${esc(hero)}" alt="${esc(i.destination)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;max-height:280px;object-fit:cover;border-radius:16px;border:0"></td></tr>`
        : ''
    }

    <!-- Intro -->
    <tr><td style="padding:32px 40px 8px" class="px">
      <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND.red}">Curated for you</div>
      <h1 class="h1" style="margin:10px 0 14px;font-family:${SERIF};font-size:32px;line-height:1.2;color:${BRAND.navy};font-weight:700">${esc(i.firstName)}, your ${esc(i.destination)} holiday starts here</h1>
      <p style="margin:0 0 22px;font-family:${FONT};font-size:16px;line-height:1.7;color:${BRAND.body}">
        Thank you for reaching out to Travelzada. Based on what you shared, our travel experts have handpicked a few ${esc(i.destination)} itineraries for you. Have a look, and simply reply with the one you like. Everything can be tailored to your dates and budget.
      </p>
    </td></tr>

    ${facts}

    <!-- Options -->
    <tr><td style="padding:24px 40px 16px" class="px">
      <div style="font-family:${SERIF};font-size:22px;color:${BRAND.navy};font-weight:700">${i.options.length ? `${i.options.length} handpicked ${i.options.length === 1 ? 'option' : 'options'}` : 'Your itinerary'}</div>
      <div style="width:44px;height:3px;background:${BRAND.red};border-radius:2px;margin-top:10px;font-size:0;line-height:0">&nbsp;</div>
    </td></tr>
    ${cards || noOptions}

    <!-- Expert CTA -->
    <tr><td style="padding:8px 40px 32px" class="px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:16px">
        <tr><td align="center" style="padding:30px 28px">
          <div style="font-family:${SERIF};font-size:22px;color:#ffffff;font-weight:700">Talk to your travel expert</div>
          <p style="margin:10px 0 22px;font-family:${FONT};font-size:14px;line-height:1.6;color:#cbd5e1">Prefer a quick chat? Message us on WhatsApp or call, and we'll tailor the trip with you in minutes.</p>
          ${button(waLink, 'Chat on WhatsApp', '#25d366')}
          &nbsp;
          ${button(`tel:${PHONE_TEL}`, `Call ${PHONE_DISPLAY}`, 'transparent', '#ffffff', '#ffffff')}
        </td></tr>
      </table>
    </td></tr>

    <!-- Why Travelzada -->
    <tr><td style="padding:0 40px 32px" class="px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="trust"><tr>
        ${trust
          .map(
            ([t, d]) => `<td width="33%" valign="top" style="padding:0 8px">
          <div style="font-family:${FONT};font-size:18px;color:${BRAND.gold};line-height:1">&#10022;</div>
          <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${BRAND.ink};margin:8px 0 4px">${t}</div>
          <div style="font-family:${FONT};font-size:13px;line-height:1.55;color:${BRAND.muted}">${d}</div>
        </td>`
          )
          .join('')}
      </tr></table>
    </td></tr>

    <!-- Sign-off -->
    <tr><td style="padding:0 40px 32px;font-family:${FONT};font-size:15px;line-height:1.7;color:${BRAND.body}" class="px">
      Warm regards,<br>
      <span style="color:${BRAND.navy};font-weight:700">Team Travelzada</span>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:${BRAND.sand};border-top:1px solid ${BRAND.line};padding:26px 40px;text-align:center" class="px">
      <img src="${logo}" alt="Travelzada" width="110" style="display:inline-block;width:110px;height:auto;border:0;opacity:.9">
      <p style="margin:12px 0 6px;font-family:${FONT};font-size:12px;line-height:1.7;color:${BRAND.muted}">
        Plot No. 18, Friends Colony, Malviya Nagar, Jaipur<br>
        <a href="tel:${PHONE_TEL}" style="color:${BRAND.muted}">${PHONE_DISPLAY}</a> &nbsp;·&nbsp;
        <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.muted}">${SUPPORT_EMAIL}</a> &nbsp;·&nbsp;
        <a href="${i.siteUrl}" style="color:${BRAND.muted}">travelzada.com</a>
      </p>
      <p style="margin:0;font-family:${FONT};font-size:12px">
        <a href="https://facebook.com/travelzada" style="color:${BRAND.navySoft};font-weight:600">Facebook</a> &nbsp;·&nbsp;
        <a href="https://linkedin.com/company/travelzada" style="color:${BRAND.navySoft};font-weight:600">LinkedIn</a>
      </p>
      <p style="margin:14px 0 0;font-family:${FONT};font-size:11px;line-height:1.6;color:#9ca3af">
        You are receiving this because you requested holiday information from Travelzada on ${i.platform === 'ig' ? 'Instagram' : 'Facebook'}.
        Not interested? Just reply &ldquo;stop&rdquo;. &nbsp;${esc(refTag(i.leadId))}
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`

  const text = [
    `Hi ${i.firstName},`,
    '',
    `Thank you for reaching out to Travelzada. Here are a few ${i.destination} itineraries our experts picked for you:`,
    '',
    ...i.options.map((o, n) => `Option ${n + 1}: ${o.name}${o.duration ? ` (${o.duration})` : ''} - ${o.price}\n${o.url}`),
    '',
    'Reply to this email with the option you like, or chat with us on WhatsApp:',
    waLink,
    `Call: ${PHONE_DISPLAY}`,
    '',
    'Warm regards,',
    'Team Travelzada',
    refTag(i.leadId),
  ].join('\n')

  return { subject, html, text }
}
