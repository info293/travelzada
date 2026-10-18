/**
 * Server-side "trip proposal" PDF for a Meta lead: cover page + one page per package option.
 * Uses jsPDF's built-in Helvetica, so text is limited to Latin characters (₹ is written as "Rs.").
 */
import { jsPDF } from 'jspdf'

export interface ProposalPackage {
  name: string
  duration: string
  price: string
  overview: string
  image?: string
  hotels?: string
  url: string
  inclusions?: string[]
  exclusions?: string[]
  dayWise?: { day: string; title: string; description: string }[]
}

export interface ProposalInput {
  leadId: string
  customerName: string
  destination: string
  facts: { label: string; value: string }[]
  options: ProposalPackage[]
  siteUrl: string
  phoneDisplay: string
  email: string
}

const NAVY: [number, number, number] = [19, 41, 75]
const RED: [number, number, number] = [226, 54, 63]
const INK: [number, number, number] = [31, 41, 55]
const MUTED: [number, number, number] = [107, 114, 128]
const SAND: [number, number, number] = [250, 248, 244]
const LINE: [number, number, number] = [231, 229, 228]

/** Helvetica can't draw ₹, emojis or other non-Latin characters */
const clean = (s: unknown) =>
  String(s ?? '')
    .replace(/₹\s*/g, 'Rs. ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()

async function loadImage(url?: string): Promise<{ data: string; format: 'JPEG' | 'PNG'; w: number; h: number } | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || ''
    const format = type.includes('png') ? 'PNG' : type.includes('jpeg') || type.includes('jpg') ? 'JPEG' : null
    if (!format) return null // webp/avif aren't supported by jsPDF
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 4_000_000) return null
    const { w, h } = imageSize(buf, format)
    return { data: `data:${type.split(';')[0]};base64,${buf.toString('base64')}`, format, w, h }
  } catch {
    return null
  }
}

/** Reads width/height from PNG/JPEG headers so images keep their aspect ratio */
function imageSize(buf: Buffer, format: 'JPEG' | 'PNG') {
  if (format === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) break
    const marker = buf[i + 1]
    const len = buf.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
    i += 2 + len
  }
  return { w: 1600, h: 1000 }
}

/** Draws an image cropped to fill the box (like CSS object-fit: cover) */
function coverImage(doc: jsPDF, img: NonNullable<Awaited<ReturnType<typeof loadImage>>>, x: number, y: number, w: number, h: number) {
  const ratio = img.w / img.h
  let dw = w
  let dh = w / ratio
  if (dh < h) {
    dh = h
    dw = h * ratio
  }
  doc.saveGraphicsState()
  doc.rect(x, y, w, h, null) // path only (no stroke), so it can be used as the clip region
  doc.clip()
  doc.discardPath()
  doc.addImage(img.data, img.format, x - (dw - w) / 2, y - (dh - h) / 2, dw, dh, undefined, 'FAST')
  doc.restoreGraphicsState()
}

export async function generateProposalPdf(input: ProposalInput): Promise<ArrayBuffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const M = 18
  const first = clean(input.customerName.split(' ')[0]) || 'Traveller'
  const destination = clean(input.destination)

  const [logo, ...images] = await Promise.all([
    loadImage(`${input.siteUrl}/images/logo/Travelzada%20Logo%20April%20(1).png`),
    ...input.options.map((o) => loadImage(o.image)),
  ])

  const footer = (page: number) => {
    doc.setDrawColor(...LINE)
    doc.line(M, H - 16, W - M, H - 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`Travelzada  |  ${input.phoneDisplay}  |  ${input.email}  |  ${input.siteUrl.replace(/^https?:\/\//, '')}`, M, H - 10)
    doc.text(`Ref TZ-${input.leadId}  |  Page ${page}`, W - M, H - 10, { align: 'right' })
  }

  // ---------- Cover ----------
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 4, 'F')
  if (logo) {
    const lw = 52
    doc.addImage(logo.data, logo.format, (W - lw) / 2, 14, lw, (lw * logo.h) / logo.w)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...NAVY)
    doc.text('Travelzada', W / 2, 26, { align: 'center' })
  }

  const hero = images.find(Boolean)
  let y = 42
  if (hero) {
    coverImage(doc, hero, M, y, W - 2 * M, 92)
    // The cover photo belongs to the first option that has one
    const heroOption = input.options[images.indexOf(hero)]
    if (heroOption?.url) doc.link(M, y, W - 2 * M, 92, { url: heroOption.url })
    y += 92 + 12
  } else {
    y += 8
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...RED)
  doc.text('YOUR PERSONALISED HOLIDAY PROPOSAL', M, y)
  y += 10
  doc.setFontSize(24)
  doc.setTextColor(...NAVY)
  doc.text(doc.splitTextToSize(`${first}'s ${destination} holiday`, W - 2 * M), M, y)
  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  const intro = doc.splitTextToSize(
    `Thank you for choosing Travelzada. Based on what you shared with us, our travel experts have handpicked ${input.options.length || 'a few'} ${destination} options for you. Every itinerary is fully customisable to your dates, hotels and budget.`,
    W - 2 * M
  )
  doc.text(intro, M, y)
  y += intro.length * 5.5 + 6

  if (input.facts.length) {
    const boxH = 10 + input.facts.length * 7
    doc.setFillColor(...SAND)
    doc.setDrawColor(...LINE)
    doc.roundedRect(M, y, W - 2 * M, boxH, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('WHAT YOU TOLD US', M + 6, y + 7)
    input.facts.forEach((f, i) => {
      const fy = y + 14 + i * 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...MUTED)
      doc.text(clean(f.label), M + 6, fy)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...INK)
      doc.text(clean(f.value) || '-', M + 80, fy)
    })
    y += boxH + 8
  }

  // Options summary on the cover
  if (input.options.length && y < H - 60) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...NAVY)
    doc.text('Your options at a glance', M, y)
    y += 7
    input.options.forEach((o, i) => {
      if (y > H - 30) return
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...RED)
      doc.text(`OPTION ${i + 1}`, M, y)
      doc.setTextColor(...INK)
      doc.text(clean(o.name), M + 22, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MUTED)
      doc.text(`${clean(o.duration)}  |  ${clean(o.price)}`, W - M, y, { align: 'right' })
      // Whole row opens the package page
      if (o.url) doc.link(M, y - 4.5, W - 2 * M, 6.5, { url: o.url })
      y += 7
    })
  }
  footer(1)

  // ---------- One page per option ----------
  input.options.forEach((o, i) => {
    doc.addPage()
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 4, 'F')
    let py = 16
    const img = images[i]
    if (img) {
      coverImage(doc, img, M, py, W - 2 * M, 72)
      if (o.url) doc.link(M, py, W - 2 * M, 72, { url: o.url })
      py += 72 + 10
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...RED)
    doc.text(`OPTION ${i + 1}${i === 0 ? '  -  BEST MATCH' : ''}`, M, py)
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.text(clean(o.duration), W - M, py, { align: 'right' })
    py += 9
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(19)
    doc.setTextColor(...NAVY)
    const title = doc.splitTextToSize(clean(o.name), W - 2 * M)
    doc.text(title, M, py)
    if (o.url) doc.link(M, py - 7, W - 2 * M, title.length * 8, { url: o.url })
    py += title.length * 8
    if (o.hotels) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...MUTED)
      doc.text(clean(o.hotels), M, py)
      py += 7
    }

    // Price band
    doc.setFillColor(...SAND)
    doc.setDrawColor(...LINE)
    doc.roundedRect(M, py, W - 2 * M, 16, 3, 3, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('STARTING FROM', M + 6, py + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...NAVY)
    doc.text(clean(o.price.replace(/^Starting\s+/i, '')), M + 6, py + 12.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...RED)
    doc.textWithLink('View full itinerary online >', W - M - 6, py + 10, { url: o.url, align: 'right' } as any)
    py += 24

    if (o.overview) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      doc.setTextColor(...INK)
      const ov = doc.splitTextToSize(clean(o.overview), W - 2 * M)
      doc.text(ov, M, py)
      py += ov.length * 5 + 5
    }

    const list = (heading: string, items: string[] | undefined, x: number, width: number, startY: number) => {
      if (!items?.length) return startY
      let ly = startY
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...NAVY)
      doc.text(heading, x, ly)
      ly += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...INK)
      for (const it of items.slice(0, 8)) {
        const lines = doc.splitTextToSize(`- ${clean(it)}`, width)
        if (ly + lines.length * 4.5 > H - 22) break
        doc.text(lines, x, ly)
        ly += lines.length * 4.5
      }
      return ly
    }
    const colW = (W - 2 * M - 8) / 2
    const endIn = list('Inclusions', o.inclusions, M, colW, py)
    const endEx = list('Exclusions', o.exclusions, M + colW + 8, colW, py)
    py = Math.max(endIn, endEx, py) + 6

    if (o.dayWise?.length && py < H - 40) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...NAVY)
      doc.text('Day-wise plan', M, py)
      py += 7
      for (const d of o.dayWise) {
        const head = `${clean(d.day)}: ${clean(d.title)}`
        const body = doc.splitTextToSize(clean(d.description), W - 2 * M - 4)
        const needed = 5 + Math.min(body.length, 3) * 4.3
        if (py + needed > H - 22) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(9)
          doc.setTextColor(...MUTED)
          doc.text('Full day-by-day plan available on request or online.', M, py)
          break
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(...INK)
        doc.text(head, M, py)
        py += 4.6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...MUTED)
        doc.text(body.slice(0, 3), M + 4, py)
        py += Math.min(body.length, 3) * 4.3 + 2.5
      }
    }
    footer(i + 2)
  })

  // ---------- Closing page ----------
  doc.addPage()
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, H, 'F')
  if (logo) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(W / 2 - 34, 60, 68, 26, 4, 4, 'F')
    const lw = 52
    doc.addImage(logo.data, logo.format, W / 2 - lw / 2, 65, lw, (lw * logo.h) / logo.w)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text("Let's plan your trip together", W / 2, 115, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(203, 213, 225)
  doc.text(
    doc.splitTextToSize(
      'Reply on WhatsApp with the option you like, or tell us what to change. Dates, hotels, activities and budget are all customisable.',
      140
    ),
    W / 2,
    127,
    { align: 'center' }
  )
  const contacts = [`WhatsApp / Call: ${input.phoneDisplay}`, `Email: ${input.email}`, input.siteUrl.replace(/^https?:\/\//, '')]
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  contacts.forEach((c, i) => doc.text(c, W / 2, 158 + i * 9, { align: 'center' }))
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.text('Plot No. 18, Friends Colony, Malviya Nagar, Jaipur', W / 2, 196, { align: 'center' })
  doc.text(`Prices are indicative and subject to availability at the time of booking.  Ref TZ-${input.leadId}`, W / 2, H - 14, {
    align: 'center',
  })

  return doc.output('arraybuffer')
}
