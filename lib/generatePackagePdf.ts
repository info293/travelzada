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
  agentContactName?: string
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
    brandName, agentContactName, termsVariant = 'brochure',
  } = opts

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST'

  const autoRefId = refId || `TZ-${now.getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`
  const durationLabel = durationNights ? `${durationNights}N / ${durationDays}D` : durationDays ? `${durationDays}D` : '—'
  const badgeLabel = badgeText || `HOLIDAY PACKAGE · ${(destinationCountry || destination).toUpperCase()}`
  const agentName = agentContactName || ''

  function renderStars(cat: string): string {
    const n = parseInt(cat.match(/\d/)?.[0] || '0')
    return n > 0 ? '★'.repeat(n) : esc(cat)
  }

  // Parse days from itinerary text
  const days: { title: string; desc: string }[] = []
  if (dayWiseItinerary) {
    let cur: { title: string; desc: string } | null = null
    for (const line of dayWiseItinerary.split('\n').filter(Boolean)) {
      if (/^day\s*\d+/i.test(line)) {
        if (cur) days.push(cur)
        cur = { title: line.trim(), desc: '' }
      } else if (cur) {
        cur.desc += (cur.desc ? '\n' : '') + line.trim()
      }
    }
    if (cur) days.push(cur)
  }

  function extractDayTags(desc: string): string[] {
    const tags: string[] = []
    const stayMatch = desc.match(/\bstay[\s:·–-]+([^\n,]+)/i)
    if (stayMatch) tags.push(`Stay · ${stayMatch[1].trim()}`)
    if (/\bbreakfast\b/i.test(desc)) tags.push('Breakfast')
    if (/\blunch\b/i.test(desc)) tags.push('Lunch')
    if (/\bdinner\b/i.test(desc)) tags.push('Dinner')
    if (/\bprivate transfer\b/i.test(desc)) tags.push('Private transfer')
    return tags
  }

  function cleanDayTitle(raw: string): string {
    return raw.replace(/^day\s*\d+[\s:·–\-]*/i, '').trim() || raw
  }

  function cleanDayDesc(desc: string): string {
    // Remove lines that are just meal/stay tags (already shown as pills)
    return desc
      .split('\n')
      .filter(l => !/^(breakfast|lunch|dinner|stay[\s:·]|private transfer)$/i.test(l.trim()))
      .join('\n')
      .trim()
  }

  const fullTerms = termsVariant === 'quotation'
    ? [
        'Rates are valid for travel on the specified dates only. Peak-season surcharges may apply for festival dates.',
        'This quotation is valid for 7 days from the download date. Hotel availability is confirmed only at the time of booking.',
        'A non-refundable advance of 30% of the package cost is required to confirm the booking; balance is due 21 days before travel.',
        'Cancellation 30+ days before travel: 25% deduction. 15–29 days: 50%. 7–14 days: 75%. Less than 7 days: 100% non-refundable.',
        'Standard check-in is 14:00 and check-out is 12:00. Early check-in / late check-out is subject to availability.',
        'Houseboat boarding is at 12:30 and disembarkation at 09:00 the next morning, per local regulations.',
        'Children below 5 years are complimentary without a bed. 5–11 years are charged at 60% of the adult rate with a shared bed.',
        'Itinerary may be re-sequenced due to weather, road conditions, or local events; inclusions remain unchanged.',
        'Any increase in government taxes, fuel surcharges or fees levied after booking will be passed on at actuals.',
        'Guests are responsible for carrying valid government-issued photo ID at all hotels and check-points.',
        'The travel agency acts as a booking facilitator; service operators (hotels, transport, activities) are independent contractors.',
        'All disputes are subject to the jurisdiction of courts as applicable under law.',
      ]
    : [
        'Package prices are for reference only and subject to change based on availability at the time of booking.',
        'This brochure is valid for the current season. Rates may vary for peak seasons and special events.',
        'A non-refundable advance is required to confirm the booking; balance is due before travel commences.',
        'Standard cancellation policy applies. Please consult your travel agent for specific terms before booking.',
        'Standard check-in is 14:00 and check-out is 12:00. Early check-in / late check-out is subject to availability.',
        'Houseboat boarding and disembarkation times are per local tourism authority regulations.',
        'Children below 5 years are complimentary without a bed. 5–11 years may be charged at 60% of the adult rate.',
        'Itinerary sequence may be adjusted due to weather, road conditions, or local events.',
        'Any increase in government taxes or fuel surcharges after booking will be passed on at actuals.',
        'Guests must carry valid government-issued photo ID at all hotels and check-points.',
        'The travel agency acts as a booking facilitator; all service operators are independent contractors.',
        'For queries or customisation, please contact your travel agent directly.',
      ]

  let sectionNum = 0
  function nextNum() { return String(++sectionNum).padStart(2, '0') }

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2937;background:#fff;font-size:13px}
@page{margin:0;size:A4}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}

/* ── Page header ── */
.ph{display:flex;justify-content:space-between;align-items:center;padding:18px 32px;border-bottom:1px solid #e5e7eb}
.logo{display:flex;align-items:center;gap:10px}
.logo-icon{width:34px;height:34px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.logo-text{font-size:20px;font-weight:800;color:#111;letter-spacing:-0.3px}
.quot-wrap{text-align:right}
.quot-lbl{font-size:8px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.14em}
.quot-num{font-size:14px;font-weight:700;color:#111;margin-top:2px}

/* ── Hero ── */
.hero{position:relative;height:300px;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero-bg{width:100%;height:100%;background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)}
.overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.28) 55%,transparent 100%)}
.hero-top{position:absolute;top:24px;left:32px}
.hero-badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.28);color:#fff;font-size:9px;font-weight:700;letter-spacing:.1em;padding:5px 14px;border-radius:999px;display:inline-block}
.hero-bot{position:absolute;bottom:28px;left:32px;right:32px}
.hero-title{font-size:34px;font-weight:800;color:#fff;line-height:1.15;margin-bottom:10px}
.hero-dest{font-size:12px;color:rgba(255,255,255,.75);font-weight:500}

/* ── Stats strip ── */
.stats{display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border-bottom:2px solid #e5e7eb}
.sc{padding:14px 18px;border-right:1px solid #e5e7eb}
.sc:last-child{border-right:none}
.slbl{font-size:7.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.12em;margin-bottom:5px}
.sval{font-size:17px;font-weight:800;color:#111;line-height:1.15}
.ssub{font-size:10px;color:#6b7280;margin-top:3px}
.stars{color:#f59e0b;font-size:14px;letter-spacing:1px}

/* ── Body ── */
.body{padding:32px 36px 28px}

/* ── Section ── */
.section{margin-bottom:30px}
.sec-hdr{display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;margin-bottom:18px}
.sec-num{font-size:11px;font-weight:700;color:#7c3aed}
.sec-title{font-size:17px;font-weight:800;color:#111}

/* ── Overview ── */
.overview{font-size:13px;color:#374151;line-height:1.78}

/* ── Day items ── */
.day-item{display:flex;gap:18px;padding:16px 0;border-bottom:1px solid #f3f4f6}
.day-item:last-child{border-bottom:none}
.day-left{flex-shrink:0;width:50px;padding-top:2px}
.day-lbl{font-size:8px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em}
.day-num{font-size:26px;font-weight:800;color:#111;line-height:1}
.day-content{flex:1;min-width:0}
.day-title{font-size:13.5px;font-weight:700;color:#111;margin-bottom:6px;line-height:1.35}
.day-desc{font-size:12px;color:#6b7280;line-height:1.65;margin-bottom:10px}
.day-tags{display:flex;flex-wrap:wrap;gap:6px}
.day-tag{font-size:10px;font-weight:500;color:#374151;border:1px solid #d1d5db;border-radius:999px;padding:3px 10px;white-space:nowrap}

/* ── Inc / Exc ── */
.ie-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ie-box{border:1px solid #e5e7eb;border-radius:12px;padding:16px}
.ie-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.ie-htitle{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700}
.ie-count{font-size:10px;color:#9ca3af}
.ie-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px}
.ie-row:last-child{margin-bottom:0}
.ie-icon{flex-shrink:0;margin-top:2px}
.ie-text{font-size:11.5px;color:#374151;line-height:1.5}

/* ── Terms ── */
.terms-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}
.term-row{display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid #f9fafb}
.term-num{font-size:10px;font-weight:700;color:#7c3aed;flex-shrink:0;width:20px}
.term-text{font-size:11px;color:#6b7280;line-height:1.55}

/* ── Footer ── */
.footer{margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end}
.ft-lbl{font-size:8px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px}
.ft-name{font-size:15px;font-weight:800;color:#111;margin-bottom:4px}
.ft-sub{font-size:11px;color:#6b7280}
.ft-right{text-align:right}
.ft-powered{font-size:11px;font-weight:700;color:#111}
.ft-date{font-size:10px;color:#9ca3af;margin-top:4px}

/* ── Customer card (if quotation) ── */
.cust-banner{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
.cust-lbl{font-size:8px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.12em;margin-bottom:4px}
.cust-name{font-size:16px;font-weight:800;color:#111}
.cust-meta{font-size:11px;color:#6b7280;margin-top:3px}
.price-banner{background:#7c3aed;border-radius:12px;padding:16px 20px;text-align:right}
.price-lbl{font-size:8px;font-weight:700;color:#ddd6fe;text-transform:uppercase;letter-spacing:.12em;margin-bottom:4px}
.price-val{font-size:22px;font-weight:800;color:#fff}
.price-sub{font-size:10px;color:rgba(255,255,255,.7);margin-top:3px}
</style>
</head>
<body>

<!-- ── Page Header ── -->
<div class="ph">
  <div class="quot-wrap">
    <div class="quot-lbl">Quotation No.</div>
    <div class="quot-num">${esc(autoRefId)}</div>
  </div>
</div>

<!-- ── Hero ── -->
<div class="hero">
  ${heroImage ? `<img src="${esc(heroImage)}" alt="" crossorigin="anonymous" />` : '<div class="hero-bg"></div>'}
  <div class="overlay"></div>
  <div class="hero-top">
    <span class="hero-badge">${esc(badgeLabel)}</span>
  </div>
  <div class="hero-bot">
    <h1 class="hero-title">${esc(title)}</h1>
    <p class="hero-dest">${esc(destination)}${destinationCountry ? ` · ${esc(destinationCountry)}` : ''}</p>
  </div>
</div>

<!-- ── Stats Strip ── -->
<div class="stats">
  <div class="sc">
    <div class="slbl">Duration</div>
    <div class="sval">${durationLabel}</div>
    ${preferredDates ? `<div class="ssub">${esc(preferredDates)}</div>` : ''}
  </div>
  <div class="sc">
    <div class="slbl">Hotel Category</div>
    <div class="sval">${starCategory ? `<span class="stars">${renderStars(starCategory)}</span>` : '—'}</div>
    <div class="ssub">${starCategory ? esc(starCategory) : '—'}</div>
  </div>
  <div class="sc">
    <div class="slbl">Total Passengers</div>
    <div class="sval">${groupSize < 10 ? String(groupSize).padStart(2, '0') : groupSize} pax</div>
    <div class="ssub">${adults ?? groupSize} Adult${(adults ?? groupSize) !== 1 ? 's' : ''}${kids ? ` · ${kids} Child${kids !== 1 ? 'ren' : ''}` : ''}</div>
  </div>
  <div class="sc">
    <div class="slbl">Price Per Person</div>
    <div class="sval">${pricePerPerson ? `₹${Number(pricePerPerson).toLocaleString('en-IN')}` : '—'}</div>
    <div class="ssub">Twin sharing · ex-${esc(destination)}</div>
  </div>
</div>

<!-- ── Body ── -->
<div class="body">

  ${customerName ? `
  <div class="cust-banner">
    <div>
      <div class="cust-lbl">Prepared For</div>
      <div class="cust-name">${esc(customerName)}</div>
      ${customerEmail || customerPhone ? `<div class="cust-meta">${[customerPhone, customerEmail].filter((v): v is string => Boolean(v)).map(esc).join(' · ')}</div>` : ''}
    </div>
    ${quotedPriceTotal ? `
    <div class="price-banner">
      <div class="price-lbl">Quoted Price</div>
      <div class="price-val">₹${Number(quotedPriceTotal).toLocaleString('en-IN')}</div>
      <div class="price-sub">Total for ${groupSize} traveller${groupSize !== 1 ? 's' : ''}</div>
    </div>` : ''}
  </div>` : ''}

  ${overview ? `
  <div class="section">
    <div class="sec-hdr">
      <span class="sec-num">${nextNum()}</span>
      <span class="sec-title">Overview</span>
    </div>
    <p class="overview">${esc(overview)}</p>
  </div>` : ''}

  ${days.length ? `
  <div class="section">
    <div class="sec-hdr">
      <span class="sec-num">${nextNum()}</span>
      <span class="sec-title">Daywise Itinerary</span>
    </div>
    ${days.map((d, i) => {
      const cleanTitle = cleanDayTitle(d.title)
      const tags = extractDayTags(d.desc)
      const visibleDesc = cleanDayDesc(d.desc)
      return `<div class="day-item">
        <div class="day-left">
          <div class="day-lbl">DAY</div>
          <div class="day-num">${String(i + 1).padStart(2, '0')}</div>
        </div>
        <div class="day-content">
          <div class="day-title">${esc(cleanTitle)}</div>
          ${visibleDesc ? `<div class="day-desc">${esc(visibleDesc).replace(/\n/g, '<br>')}</div>` : ''}
          ${tags.length ? `<div class="day-tags">${tags.map(t => `<span class="day-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
      </div>`
    }).join('')}
  </div>` : ''}

  ${(inclusions.length || exclusions.length) ? `
  <div class="section">
    <div class="sec-hdr">
      <span class="sec-num">${nextNum()}</span>
      <span class="sec-title">What's Included &amp; What's Not</span>
    </div>
    <div class="ie-grid">
      <div class="ie-box">
        <div class="ie-hdr">
          <div class="ie-htitle" style="color:#059669">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="7" fill="#059669"/>
              <path d="M4 7.2l2.2 2.2 3.8-3.8" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Inclusions
          </div>
          <span class="ie-count">${inclusions.length} items</span>
        </div>
        ${inclusions.map(item => `
        <div class="ie-row">
          <svg class="ie-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect width="14" height="14" rx="3" fill="#f0fdf4"/>
            <path d="M3.5 7l2.5 2.5 4.5-4.5" stroke="#059669" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="ie-text">${esc(item)}</span>
        </div>`).join('')}
      </div>
      <div class="ie-box">
        <div class="ie-hdr">
          <div class="ie-htitle" style="color:#dc2626">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="7" fill="#dc2626"/>
              <path d="M5 5l4 4M9 5l-4 4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Exclusions
          </div>
          <span class="ie-count">${exclusions.length} items</span>
        </div>
        ${exclusions.map(item => `
        <div class="ie-row">
          <svg class="ie-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect width="14" height="14" rx="3" fill="#fff1f2"/>
            <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#dc2626" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span class="ie-text">${esc(item)}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>` : ''}

  <div class="section">
    <div class="sec-hdr">
      <span class="sec-num">${nextNum()}</span>
      <span class="sec-title">Terms &amp; Conditions</span>
    </div>
    <div class="terms-grid">
      ${fullTerms.map((t, i) => `
      <div class="term-row">
        <span class="term-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="term-text">${t}</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="footer">
    ${agentName ? `<div>
      <div class="ft-lbl">Prepared by your travel agent</div>
      <div class="ft-name">${esc(agentName)}</div>
    </div>` : '<div></div>'}
    <div class="ft-right">
      <div class="ft-date">Downloaded ${dateStr} · ${timeStr}</div>
    </div>
  </div>

</div>
</body></html>`

  const win = window.open('', '_blank', 'width=900,height=1200')
  if (!win) { alert('Please allow pop-ups to generate the PDF.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 900)
}
