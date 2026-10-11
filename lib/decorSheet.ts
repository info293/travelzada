import { designTotal, formatINR, toDataUrl, type DesignDoc } from '@/lib/decorStore'

// jsPDF's built-in fonts have no rupee glyph
const money = (n: number) => formatINR(n).replace('₹', 'Rs. ')

/** The image CDN may serve WebP, which jsPDF cannot embed, so the image is redrawn as a JPEG. */
async function toJpeg(url: string): Promise<string> {
  const src = await toDataUrl(url)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Could not load the design image'))
    img.src = src
  })
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.9)
}

/**
 * The signed design sheet: the approved image, every item with quantity and price, the total and the
 * advance. This is the document both sides refer to if there is a dispute on the event day.
 */
export async function downloadDesignSheet(design: DesignDoc, pageUrl: string) {
  const approval = design.approval
  if (!approval) throw new Error('The design has not been approved yet.')
  const option = design.options[approval.optionIndex]
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 15
  let y = 18

  pdf.setFont('helvetica', 'bold').setFontSize(18).text('Approved Decor Design', M, y)
  pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(110)
  pdf.text(design.vendorName, W - M, y, { align: 'right' })
  y += 7
  pdf.text(`${design.title}  |  ${[design.eventLabel, design.styleLabel].filter(Boolean).join(' · ')}`, M, y)
  y += 5
  pdf.text(`Approved by ${approval.name} (${approval.phone}) on ${new Date(approval.at).toLocaleString('en-IN')}`, M, y)
  y += 6
  pdf.setTextColor(0)

  // Approved image (falls back to text-only if the image cannot be fetched)
  try {
    const img = await toJpeg(option.url)
    const w = W - 2 * M
    const h = Math.min(120, w / (design.aspect || 1.5))
    pdf.addImage(img, 'JPEG', M, y, w, h)
    y += h + 4
  } catch {
    pdf.setFontSize(9).text(`Design image: ${option.url}`, M, y + 4)
    y += 10
  }
  pdf.setFont('helvetica', 'bold').setFontSize(11).text(`Design: ${option.title}`, M, y + 2)
  y += 9

  // Items
  pdf.setFontSize(9).setFillColor(245, 243, 255).rect(M, y - 4, W - 2 * M, 7, 'F')
  pdf.text('Item', M + 2, y)
  pdf.text('Qty', 128, y, { align: 'right' })
  pdf.text('Price', 158, y, { align: 'right' })
  pdf.text('Amount', W - M - 2, y, { align: 'right' })
  y += 7
  pdf.setFont('helvetica', 'normal')
  for (const item of design.items) {
    if (y > 262) { pdf.addPage(); y = 20 }
    pdf.text(pdf.splitTextToSize(item.name, 95)[0], M + 2, y)
    pdf.text(String(item.qty), 128, y, { align: 'right' })
    pdf.text(item.price === null ? 'To be quoted' : money(item.price), 158, y, { align: 'right' })
    pdf.text(item.price === null ? '-' : money(item.price * item.qty), W - M - 2, y, { align: 'right' })
    y += 6
  }
  const { total, unpriced } = designTotal(design.items)
  pdf.setDrawColor(200).line(M, y - 2, W - M, y - 2)
  y += 4
  pdf.setFont('helvetica', 'bold').setFontSize(11)
  pdf.text('Decor total', M + 2, y)
  pdf.text(money(total) + (unpriced ? ' + items to be quoted' : ''), W - M - 2, y, { align: 'right' })
  y += 6
  pdf.setFont('helvetica', 'normal').setFontSize(10)
  pdf.text(`Booking advance (${design.advancePercent}%)`, M + 2, y)
  pdf.text(money((total * design.advancePercent) / 100), W - M - 2, y, { align: 'right' })
  y += 9
  if (design.booking) {
    pdf.text(`Event date: ${design.booking.eventDate}   Guests: ${design.booking.guests || '-'}`, M + 2, y)
    y += 8
  }

  if (y > 255) { pdf.addPage(); y = 20 }
  pdf.setFontSize(8).setTextColor(110)
  const note = 'This image is an AI-generated preview of the agreed decor. The real setup will match the listed items, colours and overall arrangement, but exact flower counts, fabric folds and lighting may differ slightly from the picture. Any change after approval must be agreed by both sides in the comments on the design page.'
  pdf.text(pdf.splitTextToSize(note, W - 2 * M), M, y)
  y += 14
  pdf.text(`Design page: ${pageUrl}`, M, y)

  pdf.save(`decor-design-${design.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || design.id}.pdf`)
}
