export interface PackagePdfOptions {
  title: string
  destination: string
  destinationCountry?: string
  heroImage?: string
  badgeText?: string
  refId?: string
  durationDays?: number
  durationNights?: number
  starCategory?: string
  travelType?: string
  theme?: string
  mood?: string
  pricePerPerson?: number | null
  quotedPriceTotal?: number | null
  groupSize?: number
  adults?: number
  kids?: number
  overview?: string
  highlights?: string[]
  inclusions?: string[]
  exclusions?: string[]
  dayWiseItinerary?: string
  specialRequests?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  preferredDates?: string
  brandName: string
  termsVariant?: 'brochure' | 'quotation'
}

export function openPackagePdfWindow(opts: PackagePdfOptions): void {
  const {
    title, destination, destinationCountry, heroImage = '',
    badgeText, refId,
    durationDays, durationNights, starCategory, travelType, theme, mood,
    pricePerPerson, quotedPriceTotal, groupSize = 1, adults, kids,
    overview, highlights = [], inclusions = [], exclusions = [],
    dayWiseItinerary, specialRequests,
    customerName, customerEmail, customerPhone, preferredDates,
    brandName, termsVariant = 'brochure',
  } = opts

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const days: { title: string; desc: string }[] = []
  if (dayWiseItinerary) {
    let cur: { title: string; desc: string } | null = null
    for (const line of dayWiseItinerary.split('\n').filter(Boolean)) {
      if (/^day\s*\d+/i.test(line)) {
        if (cur) days.push(cur)
        cur = { title: line, desc: '' }
      } else if (cur) {
        cur.desc += (cur.desc ? '\n' : '') + line
      }
    }
    if (cur) days.push(cur)
  }

  const badge = badgeText || (customerName ? brandName : 'Package Brochure')
  const durationLabel = durationNights ? `${durationNights}N / ${durationDays}D` : durationDays ? `${durationDays} Days` : '—'
  const themeLabel = theme || mood || '—'
  const statsCol4 = customerName
    ? ['👥', 'Travellers', `${groupSize} pax (${adults ?? groupSize}A${kids ? ` + ${kids}K` : ''})`] as const
    : ['🌿', 'Theme', themeLabel] as const

  const termsRows = termsVariant === 'quotation'
    ? ['This quotation is valid for 7 days from the date of issue.', 'Prices are subject to availability at the time of booking.', 'A deposit may be required to confirm the booking.', 'For queries, please contact your travel agent directly.']
    : ['This brochure is for reference only.', 'Prices are subject to availability at the time of booking.', 'A deposit may be required to confirm the booking.', 'Contact us for custom packages and group bookings.']

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${esc(title)} — ${customerName ? 'Quotation' : 'Package Brochure'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;background:#fff}
@page{margin:0;size:A4}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.hero{position:relative;height:280px;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:cover}
.hero-bg{width:100%;height:100%;background:linear-gradient(135deg,#7c3aed,#4f46e5)}
.overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.35) 55%,rgba(0,0,0,.1) 100%)}
.hero-top{position:absolute;top:20px;left:28px;right:28px;display:flex;justify-content:space-between;align-items:flex-start}
.hero-bot{position:absolute;bottom:24px;left:28px;right:28px}
.badge{background:#fff;color:#111;font-size:11px;font-weight:700;padding:5px 14px;border-radius:999px;display:inline-block}
.ref{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:10px;font-family:monospace;font-weight:700;padding:5px 12px;border-radius:999px}
.qlabel{font-size:9px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.15em;margin-bottom:8px}
.ptitle{font-size:28px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:4px}
.dest{font-size:13px;color:rgba(255,255,255,.75);margin-top:6px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);background:#7c3aed}
.sc{padding:12px 10px;text-align:center;border-left:1px solid rgba(255,255,255,.15)}.sc:first-child{border-left:none}
.sicon{font-size:18px;margin-bottom:2px}.slabel{font-size:8px;color:#ddd6fe;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
.sval{font-size:12px;font-weight:700;color:#fff;margin-top:3px;line-height:1.3}
.body{padding:32px 36px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
.precard{background:#f9fafb;border-radius:14px;padding:20px}
.slbl{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.cname{font-size:20px;font-weight:800;color:#111;margin-bottom:12px}
.irow{display:flex;align-items:center;gap:7px;font-size:12px;color:#6b7280;margin-bottom:6px}
.divhr{border:none;border-top:1px solid #e5e7eb;margin:12px 0}
.pcard{border-radius:14px;padding:20px;display:flex;flex-direction:column;justify-content:center}
.pamount{font-size:34px;font-weight:800;color:#fff;line-height:1;margin-bottom:5px}
.psub{font-size:12px;color:rgba(255,255,255,.75)}
.pper{font-size:12px;color:rgba(255,255,255,.6);margin-top:3px}
.phr{border:none;border-top:1px solid rgba(255,255,255,.2);margin:12px 0}
.pdlbl{font-size:9px;color:rgba(255,255,255,.5)}
.pdval{font-size:12px;font-weight:600;color:rgba(255,255,255,.85);margin-top:3px}
.pricebox{background:#7c3aed;border-radius:14px;padding:22px 28px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
.pricetag{font-size:9px;font-weight:700;color:#ddd6fe;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.pricelarge{font-size:38px;font-weight:800;color:#fff;line-height:1}
.pricesub{font-size:12px;color:rgba(255,255,255,.7);margin-top:5px}
.pricedate{text-align:right}
.pdlbl2{font-size:9px;color:rgba(255,255,255,.5)}
.pdval2{font-size:12px;font-weight:600;color:rgba(255,255,255,.85);margin-top:4px}
.sec{margin-bottom:24px}
.stitle{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}
.overview{font-size:13px;color:#374151;line-height:1.7}
.hgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.hpill{display:flex;align-items:flex-start;gap:10px;background:#ede9fe;border-radius:10px;padding:10px 14px}
.hstar{color:#7c3aed;font-size:14px;flex-shrink:0;margin-top:1px}
.htext{font-size:12px;color:#374151;line-height:1.45}
.iegrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.icard{background:#f0fdf4;border-radius:14px;padding:16px}.ecard{background:#fff1f2;border-radius:14px;padding:16px}
.ititle{font-size:10px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
.etitle{font-size:10px;font-weight:700;color:#be123c;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
.li{display:flex;align-items:flex-start;gap:9px;margin-bottom:8px}
.idot{width:17px;height:17px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;color:#fff;font-size:8px;font-weight:700}
.edot{width:17px;height:17px;border-radius:50%;background:#f87171;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;color:#fff;font-size:8px;font-weight:700}
.litext{font-size:12px;color:#374151;line-height:1.5}
.dayitem{display:flex;gap:14px;margin-bottom:4px}
.dayleft{display:flex;flex-direction:column;align-items:center}
.daynum{width:30px;height:30px;border-radius:50%;background:#7c3aed;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dayline{width:2px;background:#ede9fe;flex:1;margin-top:5px;min-height:18px}
.daycontent{padding-bottom:16px;flex:1}
.daytitle{font-size:13px;font-weight:700;color:#111;line-height:1.4}
.daydesc{font-size:12px;color:#6b7280;margin-top:4px;line-height:1.55}
.sreq{background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:18px;margin-bottom:24px}
.sreqt{font-size:9px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.sreqb{font-size:12px;color:#374151;line-height:1.55}
.terms{border-top:1px solid #f3f4f6;padding-top:20px;margin-bottom:20px}
.termrow{display:flex;gap:8px;font-size:11px;color:#9ca3af;margin-bottom:5px}
.footer{background:#7c3aed;border-radius:14px;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.ftname{font-size:14px;font-weight:700;color:#fff}.ftsub{font-size:10px;color:#ddd6fe;margin-top:3px}
.ftthanks{font-size:12px;color:#ddd6fe}
</style></head><body>
<div class="hero">
  ${heroImage ? `<img src="${esc(heroImage)}" alt="" />` : '<div class="hero-bg"></div>'}
  <div class="overlay"></div>
  <div class="hero-top">
    <span class="badge">${esc(badge)}</span>
    ${refId ? `<span class="ref">${esc(refId)}</span>` : ''}
  </div>
  <div class="hero-bot">
    <p class="qlabel">${customerName ? 'Travel Quotation' : 'Travel Package'}</p>
    <h1 class="ptitle">${esc(title)}</h1>
    <p class="dest">📍 ${esc(destination)}${destinationCountry ? ', ' + esc(destinationCountry) : ''}</p>
  </div>
</div>
<div class="stats">
  ${[
    ['🌙', 'Duration', durationLabel],
    ['⭐', 'Category', starCategory || '—'],
    ['✈️', 'Travel Type', travelType || '—'],
    statsCol4,
  ].map(([icon, label, val]) => `<div class="sc"><div class="sicon">${icon}</div><div class="slabel">${label}</div><div class="sval">${val}</div></div>`).join('')}
</div>
<div class="body">
  ${customerName ? `
  <div class="grid2">
    <div class="precard">
      <div class="slbl">Prepared For</div>
      <div class="cname">${esc(customerName)}</div>
      ${customerEmail ? `<div class="irow">✉️ ${esc(customerEmail)}</div>` : ''}
      ${customerPhone ? `<div class="irow">📞 ${esc(customerPhone)}</div>` : ''}
      ${preferredDates ? `<div class="irow">📅 ${esc(preferredDates)}</div>` : ''}
      <hr class="divhr"/>
      <div class="irow">✈️ via ${esc(brandName)}</div>
    </div>
    <div class="pcard" style="background:${quotedPriceTotal ? '#059669' : '#7c3aed'}">
      <div class="slbl" style="color:rgba(255,255,255,.6)">${quotedPriceTotal ? 'Quoted Price' : 'Price'}</div>
      ${quotedPriceTotal
        ? `<div class="pamount">₹${Number(quotedPriceTotal).toLocaleString('en-IN')}</div>
           <div class="psub">Total for ${groupSize} traveller${groupSize !== 1 ? 's' : ''}</div>
           ${pricePerPerson && groupSize > 1 ? `<div class="pper">₹${Number(pricePerPerson).toLocaleString('en-IN')} per person</div>` : ''}`
        : pricePerPerson
          ? `<div class="pamount">₹${Number(pricePerPerson).toLocaleString('en-IN')}</div><div class="psub">Per person</div>`
          : `<div class="pamount" style="font-size:18px">To be confirmed</div>`}
      <hr class="phr"/>
      <div class="pdlbl">Date issued</div>
      <div class="pdval">${dateStr}</div>
    </div>
  </div>` : `
  <div class="pricebox">
    <div>
      <div class="pricetag">Price per Person</div>
      ${pricePerPerson
        ? `<div class="pricelarge">₹${Number(pricePerPerson).toLocaleString('en-IN')}</div>`
        : `<div class="pricelarge" style="font-size:20px;margin-top:4px">To be confirmed</div>`}
    </div>
    <div class="pricedate">
      <div class="pdlbl2">Published on</div>
      <div class="pdval2">${dateStr}</div>
      <div class="pdlbl2" style="margin-top:8px">By</div>
      <div class="pdval2">${esc(brandName)}</div>
    </div>
  </div>`}
  ${overview ? `<div class="sec"><div class="stitle">Overview</div><p class="overview">${esc(overview)}</p></div>` : ''}
  ${highlights.length ? `<div class="sec"><div class="stitle">Highlights</div><div class="hgrid">${highlights.map(h => `<div class="hpill"><span class="hstar">✦</span><span class="htext">${esc(h)}</span></div>`).join('')}</div></div>` : ''}
  ${(inclusions.length || exclusions.length) ? `<div class="sec"><div class="iegrid">
    ${inclusions.length ? `<div class="icard"><div class="ititle">✓ Inclusions</div>${inclusions.map(i => `<div class="li"><div class="idot">✓</div><span class="litext">${esc(i)}</span></div>`).join('')}</div>` : ''}
    ${exclusions.length ? `<div class="ecard"><div class="etitle">✗ Exclusions</div>${exclusions.map(e => `<div class="li"><div class="edot">✗</div><span class="litext">${esc(e)}</span></div>`).join('')}</div>` : ''}
  </div></div>` : ''}
  ${days.length ? `<div class="sec"><div class="stitle">Day-Wise Itinerary</div>${days.map((d, i) => `<div class="dayitem"><div class="dayleft"><div class="daynum">${String(i + 1).padStart(2, '0')}</div>${i < days.length - 1 ? '<div class="dayline"></div>' : ''}</div><div class="daycontent"><div class="daytitle">${esc(d.title)}</div>${d.desc ? `<div class="daydesc">${esc(d.desc).replace(/\n/g, '<br>')}</div>` : ''}</div></div>`).join('')}</div>` : ''}
  ${specialRequests ? `<div class="sreq"><div class="sreqt">Special Requests</div><p class="sreqb">${esc(specialRequests)}</p></div>` : ''}
  <div class="terms">
    <div class="stitle">Terms &amp; Conditions</div>
    ${termsRows.map(t => `<div class="termrow"><span>•</span><span>${t}</span></div>`).join('')}
  </div>
  <div class="footer">
    <div><div class="ftname">${esc(brandName)}</div><div class="ftsub">Your trusted travel partner</div></div>
    <div class="ftthanks">Thank you for your interest ✈️</div>
  </div>
</div>
</body></html>`

  const win = window.open('', '_blank', 'width=850,height=1100')
  if (!win) { alert('Please allow pop-ups to generate the PDF.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 800)
}
